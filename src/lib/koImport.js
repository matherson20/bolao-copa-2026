/**
 * Importador do mata-mata (KO) a partir da base pública OpenFootball.
 *
 * A OpenFootball publica TODO o bracket das fases finais no mesmo JSON dos
 * grupos, com `round`, `date`, `time` (com fuso, ex. "12:00 UTC-7"), `team1`,
 * `team2` e `num`. Os confrontos já definidos vêm com o nome real da seleção
 * (em inglês); os indefinidos vêm como placeholder textual:
 *   - "1I", "2K"            → 1º/2º colocado do grupo I/K
 *   - "3A/B/C/D/F"          → melhor 3º vindo de um destes grupos
 *   - "W74", "L101"         → vencedor / perdedor do jogo nº 74 / 101
 *
 * Este módulo lê esse JSON e devolve os 32 jogos KO prontos para gravar em
 * `matches` no Firestore, com IDs determinísticos (pelo `num` da partida) para
 * que palpites e sincronização de placar batam entre reimportações.
 */

import { pt, ehSelecao } from "./traducaoTimes";
import { getMatches, saveMatch } from "./db";

export const OPENFOOTBALL_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

// round (OpenFootball) → fase (nossa) e ordem para ordenação/agrupamento.
const ROUND_FASE = {
  "Round of 32": "r32",
  "Round of 16": "oitavas",
  "Quarter-final": "quartas",
  "Semi-final": "semi",
  "Match for third place": "terceiro",
  "Final": "final",
};

export const FASE_ORDEM = ["r32", "oitavas", "quartas", "semi", "terceiro", "final"];

export const FASE_TITULO = {
  r32: "16-avos de Final",
  oitavas: "Oitavas de Final",
  quartas: "Quartas de Final",
  semi: "Semifinais",
  terceiro: "Disputa de 3º Lugar",
  final: "Final",
};

/**
 * Converte o par (date, time) da OpenFootball num ISO absoluto.
 * `time` vem como "12:00 UTC-7" (offset explícito). Montamos um ISO com esse
 * offset, que representa um instante absoluto — independente do fuso de quem
 * abre o app. Ex.: "2026-06-28" + "12:00 UTC-7" → "2026-06-28T12:00:00-07:00".
 */
export function isoDeDataHora(date, time) {
  if (!date) return null;
  const m = /^(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})(?::?(\d{2}))?/.exec((time || "").trim());
  if (!m) {
    // Sem fuso reconhecível: assume meio-dia UTC para não cair em dia errado.
    return `${date}T12:00:00Z`;
  }
  const hh = m[1].padStart(2, "0");
  const mm = m[2];
  const offH = String(Math.abs(parseInt(m[3], 10))).padStart(2, "0");
  const offM = (m[4] || "00").padStart(2, "0");
  const sinal = parseInt(m[3], 10) < 0 ? "-" : "+";
  return `${date}T${hh}:${mm}:00${sinal}${offH}:${offM}`;
}

/**
 * Interpreta um placeholder de confronto da OpenFootball e devolve um objeto
 * estruturado que a UI usa para mostrar o "provável confronto".
 *   "Brazil"        → { tipo: "time", time: "Brasil" }
 *   "1I"            → { tipo: "pos", pos: 1, grupo: "I" }
 *   "2K"            → { tipo: "pos", pos: 2, grupo: "K" }
 *   "3A/B/C/D/F"    → { tipo: "terceiro", grupos: ["A","B","C","D","F"] }
 *   "W74" / "L101"  → { tipo: "vencedor"|"perdedor", num: 74 }
 */
export function parseSlot(raw) {
  if (!raw) return { tipo: "indefinido" };
  const s = String(raw).trim();

  // Time real (nome de seleção)
  if (ehSelecao(s)) return { tipo: "time", time: pt(s) };

  // Vencedor/Perdedor de um jogo: W74 / L101
  let m = /^([WL])\s*0*(\d+)$/i.exec(s);
  if (m) {
    return { tipo: m[1].toUpperCase() === "W" ? "vencedor" : "perdedor", num: Number(m[2]) };
  }

  // Melhor 3º colocado: 3A/B/C/D/F
  m = /^3([A-L](?:\/[A-L])+)$/i.exec(s);
  if (m) {
    return { tipo: "terceiro", grupos: m[1].toUpperCase().split("/") };
  }

  // 1º/2º de um grupo: 1I, 2K
  m = /^([12])\s*([A-L])$/i.exec(s);
  if (m) {
    return { tipo: "pos", pos: Number(m[1]), grupo: m[2].toUpperCase() };
  }

  // Algo que não soubemos parsear: guarda o cru pra exibir como veio.
  return { tipo: "cru", texto: s };
}

/**
 * Recebe o JSON cru da OpenFootball e devolve a lista de jogos KO prontos para
 * o Firestore. Cada item:
 *   { id, fase, num, ordem, dataHora,
 *     timeCasa, timeFora,          // nome PT quando definido; null se placeholder
 *     slotCasa, slotFora,          // placeholder cru ("1I", "W74"…) sempre presente
 *     slotCasaInfo, slotForaInfo } // parseSlot() do placeholder, para a UI
 */
export function parseKnockout(data) {
  const jogos = [];
  for (const m of data?.matches || []) {
    const fase = ROUND_FASE[m.round];
    if (!fase) continue;

    const slotCasaInfo = parseSlot(m.team1);
    const slotForaInfo = parseSlot(m.team2);

    jogos.push({
      id: `ko-${fase}-${m.num}`,
      fase,
      num: m.num,
      ordem: FASE_ORDEM.indexOf(fase),
      dataHora: isoDeDataHora(m.date, m.time),
      timeCasa: slotCasaInfo.tipo === "time" ? slotCasaInfo.time : null,
      timeFora: slotForaInfo.tipo === "time" ? slotForaInfo.time : null,
      slotCasa: String(m.team1 || "").trim(),
      slotFora: String(m.team2 || "").trim(),
      slotCasaInfo,
      slotForaInfo,
    });
  }
  jogos.sort((a, b) => a.ordem - b.ordem || a.num - b.num);
  return jogos;
}

/** Busca o JSON da OpenFootball e devolve os jogos KO já parseados. */
export async function carregarKnockoutOpenFootball(url = OPENFOOTBALL_URL) {
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) throw new Error(`Falha ao baixar calendário (${resp.status})`);
  const data = await resp.json();
  return parseKnockout(data);
}

// ---- TheSportsDB: fonte PRIMÁRIA dos confrontos do mata-mata ----
//
// A TheSportsDB crava os confrontos KO mais cedo e mais corretamente que a
// OpenFootball (que demora a trocar os slots "3A/B/..." pelo time real e ainda
// depende da tabela FIFA dos 3ºs). Por isso ela é a primária para DEFINIR os
// times de cada jogo. A OpenFootball segue como base estrutural (numeração
// `num`, slots e datas) e reforço.
//
// `intRound` na TheSportsDB: 32, 16, 8, 4, 2, 1 (round of N) → nossa fase.
const TSDB_BASE = "https://www.thesportsdb.com/api/v1/json/3";
const TSDB_LEAGUE = "4429"; // FIFA World Cup
const TSDB_ROUND_FASE = { 32: "r32", 16: "oitavas", 8: "quartas", 4: "semi", 1: "final" };
// Obs.: round=2 (semis) e a disputa de 3º não são distinguíveis só por intRound;
// usamos só os que dão pra mapear com segurança (32/16/8/4/1).

// Dias do mata-mata a varrer na TheSportsDB (cobre todo o KO da Copa 2026).
const TSDB_DIAS_KO = [
  "2026-06-28","2026-06-29","2026-06-30","2026-07-01","2026-07-02","2026-07-03",
  "2026-07-04","2026-07-05","2026-07-06","2026-07-07",
  "2026-07-09","2026-07-10","2026-07-11",
  "2026-07-14","2026-07-15","2026-07-18","2026-07-19",
];

// Minuto UTC (YYYY-MM-DDTHH:MM) de um instante ISO — chave de casamento entre fontes.
function minutoUTC(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 16);
}

/**
 * Busca os confrontos KO na TheSportsDB e devolve um mapa
 *   { [minutoUTC]: { fase, timeCasa, timeFora } }
 * só com jogos cujos DOIS lados são seleções reais (ignora placeholders).
 */
async function carregarConfrontosTheSportsDB() {
  const porMinuto = {};
  const respostas = await Promise.all(
    TSDB_DIAS_KO.map((dia) =>
      fetch(`${TSDB_BASE}/eventsday.php?d=${dia}&l=${TSDB_LEAGUE}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    )
  );
  for (const data of respostas) {
    for (const ev of data?.events || []) {
      const fase = TSDB_ROUND_FASE[Number(ev?.intRound)];
      if (!fase) continue;
      const casa = pt(ev.strHomeTeam);
      const fora = pt(ev.strAwayTeam);
      // Só confrontos com os dois times reais (não placeholders/TBD).
      if (!ehSelecao(ev.strHomeTeam) || !ehSelecao(ev.strAwayTeam)) continue;
      const ts = ev.strTimestamp
        ? `${ev.strTimestamp.replace(" ", "T")}Z`
        : (ev.dateEvent && ev.strTime ? `${ev.dateEvent}T${ev.strTime}Z` : null);
      const chave = minutoUTC(ts);
      if (!chave) continue;
      porMinuto[chave] = { fase, timeCasa: casa, timeFora: fora };
    }
  }
  return porMinuto;
}

/**
 * Carrega o bracket KO: estrutura/numeração da OpenFootball, com os CONFRONTOS
 * preenchidos pela TheSportsDB (primária) quando ela já tiver cravado o jogo.
 *
 * Casa os dois pela data/hora em UTC (mesmo instante = mesmo jogo). Quando a
 * TheSportsDB define os times de um jogo, eles SUBSTITUEM os slots — assim o
 * jogo vira "definido" (palpitável) pela fonte oficial, sem depender de cálculo.
 */
export async function carregarKnockout(url = OPENFOOTBALL_URL) {
  const [jogos, tsdb] = await Promise.all([
    carregarKnockoutOpenFootball(url),
    carregarConfrontosTheSportsDB().catch(() => ({})),
  ]);

  for (const j of jogos) {
    // Já definido pela OpenFootball? mantém.
    if (j.timeCasa && j.timeFora) continue;
    const conf = tsdb[minutoUTC(j.dataHora)];
    if (!conf || conf.fase !== j.fase) continue;
    // A TheSportsDB pode reportar o mando invertido em relação ao slot da OF.
    // Mantemos a ordem casa/fora da TheSportsDB (fonte primária do confronto).
    j.timeCasa = conf.timeCasa;
    j.timeFora = conf.timeFora;
    j.fonteConfronto = "thesportsdb";
  }
  return jogos;
}

// Campos que a gente persiste de cada jogo KO no Firestore.
function docDoJogo(j) {
  return {
    fase: j.fase,
    num: j.num,
    dataHora: j.dataHora,
    timeCasa: j.timeCasa,   // null enquanto for placeholder
    timeFora: j.timeFora,
    slotCasa: j.slotCasa,
    slotFora: j.slotFora,
    slotCasaInfo: j.slotCasaInfo,
    slotForaInfo: j.slotForaInfo,
  };
}

// Houve mudança digna de regravar? (evita escrita desnecessária no Firestore)
function mudou(jogo, existente) {
  if (!existente) return true;
  const a = docDoJogo(jogo);
  return (
    a.timeCasa !== (existente.timeCasa ?? null) ||
    a.timeFora !== (existente.timeFora ?? null) ||
    a.slotCasa !== (existente.slotCasa ?? "") ||
    a.slotFora !== (existente.slotFora ?? "") ||
    a.dataHora !== (existente.dataHora ?? null)
  );
}

/**
 * Sincroniza o bracket do mata-mata: busca da OpenFootball e devolve a lista de
 * jogos KO para a UI usar imediatamente (sempre fresca, vinda da API). Em
 * paralelo, grava no Firestore só o que mudou — mas isso depende de permissão de
 * admin (regras: matches só admin escreve). Para usuário comum a escrita é
 * negada e seguimos em frente (a UI já tem os dados da API).
 *
 * Retorna { jogos, atualizados, semPermissao } onde:
 *  - jogos: lista parseada da API (fonte de verdade para a tela).
 *  - atualizados: quantos docs foram gravados no Firestore.
 *  - semPermissao: true se a escrita foi barrada (usuário não-admin).
 */
export async function sincronizarMataMata(url = OPENFOOTBALL_URL) {
  const jogos = await carregarKnockout(url);

  let existentes = {};
  try {
    const ms = await getMatches();
    for (const m of ms) if (FASE_ORDEM.includes(m.fase)) existentes[m.id] = m;
  } catch {
    // Sem rede / sem leitura: ainda devolvemos os jogos da API para a tela.
  }

  let atualizados = 0;
  for (const j of jogos) {
    if (!mudou(j, existentes[j.id])) continue;
    try {
      await saveMatch(j.id, docDoJogo(j));
      atualizados++;
    } catch (e) {
      if (e?.code === "permission-denied") {
        return { jogos, atualizados, semPermissao: true };
      }
      console.warn("Falha ao gravar jogo KO", j.id, e?.message);
    }
  }
  return { jogos, atualizados, semPermissao: false };
}
