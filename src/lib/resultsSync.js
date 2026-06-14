/**
 * Sincronização automática de resultados — duas fontes públicas, gratuitas e
 * sem chave: OpenFootball (PRIMÁRIA) + TheSportsDB (reforço).
 *
 * Sem backend: o front busca os placares da Copa 2026 nas duas fontes, mescla
 * (OpenFootball prevalece) e grava no Firestore (coleção `results`) apenas o que
 * mudou. Roda quando alguém abre as abas Hoje / Ranking / Grupos.
 *
 * Por que duas fontes?
 *  - A TheSportsDB (liga 4429, chave de teste "3") tem placares, mas a base é
 *    incompleta: no 1º dia faltaram jogos inteiros (Grupos D e F), que nunca
 *    eram gravados.
 *  - O OpenFootball publica a Copa 2026 num único JSON, com `score.ft` só quando
 *    o jogo acaba, e cobriu justamente os jogos que faltavam — então virou a
 *    fonte primária. A TheSportsDB fica como reforço/redundância.
 *  - API-Football foi descartada: só libera a temporada 2026 nos planos pagos.
 *
 * Quando as duas discordam de um placar, vale a primária e registramos a
 * divergência (retorno `conflitos`) pro Admin conferir.
 *
 * As duas fontes usam nomes de seleções em inglês; nosso app usa português.
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
 * Busca os eventos da Copa 2026 nos últimos dias na TheSportsDB e devolve um mapa
 *   { [chaveConfronto]: { casaTime, foraTime, placar } }
 * apenas para jogos finalizados COM placar.
 */
async function carregarResultadosTheSportsDB() {
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
      porConfronto[chaveConfronto(casaTime, foraTime)] = {
        casaTime,
        foraTime,
        placar,
        origem: "thesportsdb",
      };
    }
  }

  return porConfronto;
}

// Fonte de fallback: OpenFootball (domínio público, sem chave). Publica a Copa
// 2026 completa em um único JSON, com placar final em `score.ft` SÓ quando o jogo
// termina (nunca preenche jogo futuro — verificado). No teste do 1º dia ela cobriu
// jogos que a TheSportsDB não tinha (Grupos D e F), por isso é a fonte PRIMÁRIA.
const OPENFOOTBALL_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

/**
 * Busca o JSON do OpenFootball e devolve o mesmo formato de mapa por confronto,
 * só com jogos que já têm placar final (`score.ft`). Usa os mesmos nomes em inglês
 * da TheSportsDB, então o mapa EN→PT (pt()) serve para os dois.
 */
async function carregarResultadosOpenFootball() {
  const porConfronto = {};

  const data = await fetch(OPENFOOTBALL_URL, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  for (const m of data?.matches || []) {
    const ft = m?.score?.ft;
    if (!Array.isArray(ft) || ft.length < 2) continue; // só jogo finalizado
    const casa = Number(ft[0]);
    const fora = Number(ft[1]);
    if (!Number.isFinite(casa) || !Number.isFinite(fora)) continue;
    const casaTime = pt(m.team1);
    const foraTime = pt(m.team2);
    if (!casaTime || !foraTime) continue;
    porConfronto[chaveConfronto(casaTime, foraTime)] = {
      casaTime,
      foraTime,
      placar: { casa, fora },
      origem: "openfootball",
    };
  }

  return porConfronto;
}

/**
 * Carrega as duas fontes e mescla: OpenFootball é PRIMÁRIA (prevalece), a
 * TheSportsDB só preenche confrontos que a primária não tiver.
 *
 * Devolve { fonte, conflitos } onde:
 *  - fonte: mapa final por confronto usado para gravar.
 *  - conflitos: lista dos confrontos em que as duas fontes deram placares
 *    diferentes (vale a primária, mas o Admin avisa pra conferência manual).
 */
async function carregarResultadosFonte() {
  const [primaria, reforco] = await Promise.all([
    carregarResultadosOpenFootball().catch(() => ({})),
    carregarResultadosTheSportsDB().catch(() => ({})),
  ]);

  const fonte = { ...reforco, ...primaria }; // primária sobrescreve o reforço
  const conflitos = [];

  for (const chave of Object.keys(primaria)) {
    const b = reforco[chave];
    if (!b) continue;
    const a = primaria[chave];
    // Compara já na mesma orientação (casa/fora) que cada fonte reportou.
    const igual =
      a.casaTime.toLowerCase().trim() === b.casaTime.toLowerCase().trim()
        ? a.placar.casa === b.placar.casa && a.placar.fora === b.placar.fora
        : a.placar.casa === b.placar.fora && a.placar.fora === b.placar.casa;
    if (!igual) {
      conflitos.push({
        casaTime: a.casaTime,
        foraTime: a.foraTime,
        openfootball: a.placar,
        thesportsdb: b.placar,
      });
    }
  }

  return { fonte, conflitos };
}

/**
 * Sincroniza resultados da fase de grupos (jogos locais, IDs determinísticos)
 * e, quando os jogos do mata-mata existirem no Firestore, também os do KO.
 *
 * Grava em `results/{matchId}` apenas o que mudou. Retorna { atualizados, total }.
 */
export async function sincronizarResultados() {
  const [{ fonte, conflitos }, matchesFirestore, { resultados }] = await Promise.all([
    carregarResultadosFonte().catch(() => ({ fonte: {}, conflitos: [] })),
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
        fonte: info.origem || "automatica",
        atualizadoEm: new Date().toISOString(),
      });
      atualizados++;
    } catch (e) {
      // As regras do Firestore só permitem admin gravar em `results`.
      // Quando um usuário comum abre o app, a escrita é negada — tudo bem,
      // um admin (ou a próxima visita de admin) sincroniza. Não derruba o loop.
      if (e?.code === "permission-denied") {
        return { atualizados, total: jogos.length, conflitos, semPermissao: true };
      }
      console.warn("Falha ao gravar resultado", jogo.id, e?.message);
    }
  }

  return { atualizados, total: jogos.length, conflitos };
}

// Alias retrocompatível: os componentes ainda importam este nome.
export const sincronizarResultadosOpenFootball = sincronizarResultados;
