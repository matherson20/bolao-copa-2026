/**
 * Sincronização automática de resultados — fonte OpenFootball (domínio público).
 *
 * Sem API key, sem backend: o front busca o JSON público da Copa 2026 e grava
 * no Firestore (coleção `results`) apenas os placares que ainda não estavam lá
 * ou que mudaram. Roda quando alguém abre as abas Hoje / Ranking.
 *
 * O OpenFootball usa nomes de seleções em inglês; nosso app usa português.
 * O mapa EN→PT abaixo cobre as 48 seleções da Copa 2026.
 */

import { getMatches, getResults, saveResult } from "./db";
import { gerarJogosFaseGrupos } from "./seedData";

const FONTE =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

// Nome OpenFootball (inglês) → nome usado no app (português)
const EN_PT = {
  "Mexico": "México",
  "South Korea": "Coreia do Sul",
  "Czech Republic": "República Tcheca",
  "South Africa": "África do Sul",
  "Canada": "Canadá",
  "Switzerland": "Suíça",
  "Qatar": "Catar",
  "Bosnia & Herzegovina": "Bósnia e Herzegovina",
  "Bosnia and Herzegovina": "Bósnia e Herzegovina",
  "Brazil": "Brasil",
  "Morocco": "Marrocos",
  "Haiti": "Haiti",
  "Scotland": "Escócia",
  "United States": "Estados Unidos",
  "USA": "Estados Unidos",
  "Paraguay": "Paraguai",
  "Australia": "Austrália",
  "Turkey": "Turquia",
  "Türkiye": "Turquia",
  "Germany": "Alemanha",
  "Curaçao": "Curaçau",
  "Curacao": "Curaçau",
  "Ivory Coast": "Costa do Marfim",
  "Côte d'Ivoire": "Costa do Marfim",
  "Cote d'Ivoire": "Costa do Marfim",
  "Ecuador": "Equador",
  "Netherlands": "Holanda",
  "Japan": "Japão",
  "Sweden": "Suécia",
  "Tunisia": "Tunísia",
  "Belgium": "Bélgica",
  "Egypt": "Egito",
  "Iran": "Irã",
  "IR Iran": "Irã",
  "New Zealand": "Nova Zelândia",
  "Spain": "Espanha",
  "Cape Verde": "Cabo Verde",
  "Cabo Verde": "Cabo Verde",
  "Saudi Arabia": "Arábia Saudita",
  "Uruguay": "Uruguai",
  "France": "França",
  "Senegal": "Senegal",
  "Iraq": "Iraque",
  "Norway": "Noruega",
  "Argentina": "Argentina",
  "Algeria": "Argélia",
  "Austria": "Áustria",
  "Jordan": "Jordânia",
  "Portugal": "Portugal",
  "Colombia": "Colômbia",
  "DR Congo": "Rep. Democrática do Congo",
  "Congo DR": "Rep. Democrática do Congo",
  "Uzbekistan": "Uzbequistão",
  "England": "Inglaterra",
  "Croatia": "Croácia",
  "Ghana": "Gana",
  "Panama": "Panamá",
};

// Rodadas de mata-mata do OpenFootball → fase interna do app
const FASE_KO = {
  "Round of 32": "r32",
  "Round of 16": "oitavas",
  "Quarter-finals": "quartas",
  "Quarter-final": "quartas",
  "Semi-finals": "semi",
  "Semi-final": "semi",
  "Match for third place": "terceiro",
  "Third place": "terceiro",
  "Play-off for third place": "terceiro",
  "Final": "final",
};

function pt(nomeEn) {
  if (!nomeEn) return null;
  const t = nomeEn.trim();
  return EN_PT[t] || t;
}

// Chave canônica de um confronto: par de times ordenado (ignora mando/ordem)
function chaveConfronto(a, b) {
  return [a, b].map((s) => (s || "").toLowerCase().trim()).sort().join("__vs__");
}

// Extrai o placar de tempo normal (ft) de um match OpenFootball, se houver.
function placarFt(m) {
  const ft = m?.score?.ft;
  if (!Array.isArray(ft) || ft.length < 2) return null;
  const [casa, fora] = ft;
  if (casa == null || fora == null) return null;
  return { casa: Number(casa), fora: Number(fora) };
}

/**
 * Busca o JSON do OpenFootball e devolve um mapa
 *   { [chaveConfronto]: { casaTime, foraTime, placar, fase, round } }
 * apenas para jogos COM placar definido.
 */
async function carregarResultadosFonte() {
  const resp = await fetch(FONTE, { cache: "no-store" });
  if (!resp.ok) throw new Error(`OpenFootball HTTP ${resp.status}`);
  const data = await resp.json();
  const lista = data.matches || [];

  const porConfronto = {};
  for (const m of lista) {
    const placar = placarFt(m);
    if (!placar) continue; // só jogos já finalizados/com placar
    const casaTime = pt(m.team1?.name || m.team1);
    const foraTime = pt(m.team2?.name || m.team2);
    if (!casaTime || !foraTime) continue;

    const fase = m.group ? "grupos" : (FASE_KO[m.round] || null);
    porConfronto[chaveConfronto(casaTime, foraTime)] = {
      casaTime, foraTime, placar, fase, round: m.round,
    };
  }
  return porConfronto;
}

/**
 * Sincroniza resultados da fase de grupos (jogos locais, IDs determinísticos)
 * e, quando os jogos do mata-mata existirem no Firestore, também os do KO.
 *
 * Grava em `results/{matchId}` apenas o que mudou. Retorna { atualizados, total }.
 */
export async function sincronizarResultadosOpenFootball() {
  const [fonte, matchesFirestore, { resultados }] = await Promise.all([
    carregarResultadosFonte(),
    getMatches().catch(() => []),
    getResults().catch(() => ({ resultados: {} })),
  ]);

  // Universo de jogos a casar: fase de grupos (local) + jogos do mata-mata
  // que o admin tenha cadastrado no Firestore com times reais já definidos.
  const jogosGrupos = gerarJogosFaseGrupos();
  const jogosKO = matchesFirestore.filter(
    (m) => m.fase && m.fase !== "grupos" && m.timeCasa && m.timeFora
  );
  const jogos = [...jogosGrupos, ...jogosKO];

  let atualizados = 0;
  for (const jogo of jogos) {
    const info = fonte[chaveConfronto(jogo.timeCasa, jogo.timeFora)];
    if (!info) continue;

    // O OpenFootball pode listar o confronto em ordem invertida (mando trocado).
    // Reorienta o placar para a ordem casa/fora do nosso jogo.
    const mesmaOrdem =
      info.casaTime.toLowerCase().trim() === jogo.timeCasa.toLowerCase().trim();
    const placar = mesmaOrdem
      ? { casa: info.placar.casa, fora: info.placar.fora }
      : { casa: info.placar.fora, fora: info.placar.casa };

    const atual = resultados[jogo.id];
    if (atual && Number(atual.casa) === placar.casa && Number(atual.fora) === placar.fora) {
      continue; // já está igual — não regrava
    }

    try {
      await saveResult(jogo.id, {
        casa: placar.casa,
        fora: placar.fora,
        fonte: "openfootball",
        atualizadoEm: new Date().toISOString(),
      });
      atualizados++;
    } catch (e) {
      // As regras do Firestore só permitem admin gravar em `results`.
      // Quando um usuário comum abre o app, a escrita é negada — tudo bem,
      // um admin (ou a próxima visita de admin) sincroniza. Não derruba o loop.
      if (e?.code === "permission-denied") {
        return { atualizados, total: jogos.length, semPermissao: true };
      }
      console.warn("Falha ao gravar resultado", jogo.id, e?.message);
    }
  }

  return { atualizados, total: jogos.length };
}
