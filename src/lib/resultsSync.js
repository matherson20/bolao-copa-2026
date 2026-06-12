/**
 * Sincronização automática de resultados — fonte TheSportsDB (gratuita, sem key).
 *
 * Sem backend: o front busca os jogos da Copa 2026 na TheSportsDB e grava no
 * Firestore (coleção `results`) apenas os placares que ainda não estavam lá ou
 * que mudaram. Roda quando alguém abre as abas Hoje / Ranking / Grupos.
 *
 * Por que TheSportsDB e não OpenFootball/API-Football?
 *  - OpenFootball (fonte antiga) publica só o calendário; os placares ficam
 *    vazios por dias — então nada atualizava na prática.
 *  - API-Football só libera a temporada 2026 nos planos pagos.
 *  - TheSportsDB tem a Copa 2026 (liga 4429) COM placares, é grátis e usa a
 *    chave de teste pública "3" (sem cadastro).
 *
 * A TheSportsDB usa nomes de seleções em inglês; nosso app usa português.
 * O mapa EN→PT abaixo cobre as 48 seleções da Copa 2026.
 */

import { getMatches, getResults, saveResult } from "./db";
import { gerarJogosFaseGrupos } from "./seedData";

// Liga "FIFA World Cup" na TheSportsDB. Chave de teste pública gratuita: "3".
const LEAGUE_ID = "4429";
const API_KEY = "3";
const BASE = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;

// Nome TheSportsDB (inglês) → nome usado no app (português)
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
  "Bosnia-Herzegovina": "Bósnia e Herzegovina",
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

function pt(nomeEn) {
  if (!nomeEn) return null;
  const t = String(nomeEn).trim();
  return EN_PT[t] || t;
}

// Chave canônica de um confronto: par de times ordenado (ignora mando/ordem)
function chaveConfronto(a, b) {
  return [a, b].map((s) => (s || "").toLowerCase().trim()).sort().join("__vs__");
}

// Status que indicam jogo finalizado na TheSportsDB.
const STATUS_FINALIZADO = new Set(["FT", "AET", "PEN", "Match Finished"]);

// Extrai o placar de um evento da TheSportsDB, se o jogo estiver finalizado.
function placarDoEvento(ev) {
  const status = (ev?.strStatus || "").trim();
  // Só conta jogo finalizado. Evita gravar placar parcial de jogo ao vivo.
  if (!STATUS_FINALIZADO.has(status)) return null;
  const casa = ev?.intHomeScore;
  const fora = ev?.intAwayScore;
  if (casa == null || casa === "" || fora == null || fora === "") return null;
  return { casa: Number(casa), fora: Number(fora) };
}

// Datas a varrer: hoje e os 2 dias anteriores (UTC). Cobre jogos que viraram a
// meia-noite por causa de fuso e pega placares lançados com algum atraso.
function diasParaBuscar() {
  const dias = [];
  const hoje = new Date();
  for (let i = 0; i <= 2; i++) {
    const d = new Date(hoje);
    d.setUTCDate(d.getUTCDate() - i);
    dias.push(d.toISOString().slice(0, 10)); // YYYY-MM-DD
  }
  return dias;
}

/**
 * Busca os eventos da Copa 2026 nos últimos dias e devolve um mapa
 *   { [chaveConfronto]: { casaTime, foraTime, placar } }
 * apenas para jogos finalizados COM placar.
 */
async function carregarResultadosFonte() {
  const porConfronto = {};

  const respostas = await Promise.all(
    diasParaBuscar().map((dia) =>
      fetch(`${BASE}/eventsday.php?d=${dia}&l=${LEAGUE_ID}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    )
  );

  for (const data of respostas) {
    const lista = data?.events || [];
    for (const ev of lista) {
      const placar = placarDoEvento(ev);
      if (!placar) continue;
      const casaTime = pt(ev.strHomeTeam);
      const foraTime = pt(ev.strAwayTeam);
      if (!casaTime || !foraTime) continue;
      porConfronto[chaveConfronto(casaTime, foraTime)] = { casaTime, foraTime, placar };
    }
  }

  return porConfronto;
}

/**
 * Sincroniza resultados da fase de grupos (jogos locais, IDs determinísticos)
 * e, quando os jogos do mata-mata existirem no Firestore, também os do KO.
 *
 * Grava em `results/{matchId}` apenas o que mudou. Retorna { atualizados, total }.
 */
export async function sincronizarResultados() {
  const [fonte, matchesFirestore, { resultados }] = await Promise.all([
    carregarResultadosFonte().catch(() => ({})),
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

    // A fonte pode listar o confronto em ordem invertida (mando trocado).
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
        fonte: "thesportsdb",
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

// Alias retrocompatível: os componentes ainda importam este nome.
export const sincronizarResultadosOpenFootball = sincronizarResultados;
