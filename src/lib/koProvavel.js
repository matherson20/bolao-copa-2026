/**
 * Resolve o "provável confronto" de um jogo do mata-mata ainda indefinido,
 * usando a classificação REAL da fase de grupos (resultados oficiais já
 * sincronizados em `results`), não os palpites de ninguém.
 *
 * Para cada slot da OpenFootball devolvemos um rótulo legível e, quando dá pra
 * cravar, o time provável:
 *   - 1º/2º de grupo  → time na 1ª/2ª posição da classificação real do grupo.
 *   - melhor 3º       → depende de combinar os 8 melhores 3ºs entre 12 grupos
 *                       (tabela FIFA, 495 combinações). Não cravamos: mostramos
 *                       os grupos candidatos. Se já só restar 1 grupo candidato
 *                       com 3º definido, mostramos esse time como provável.
 *   - vencedor/perdedor de jogo N → resolve recursivamente o jogo N.
 */

import { calcularClassificacaoGrupo, getMelhoresTerceiros } from "./classificacao";
import { gerarJogosFaseGrupos } from "./seedData";
import { atribuirTerceiros } from "./terceirosFifa";

const JOGOS_GRUPOS = gerarJogosFaseGrupos();

const GRUPOS_MAP = (() => {
  const map = {};
  JOGOS_GRUPOS.forEach((j) => { (map[j.grupo] = map[j.grupo] || []).push(j); });
  return map;
})();

/**
 * Classificação real de cada grupo a partir dos resultados oficiais.
 * `resultados` é o mapa results[matchId] = { casa, fora }.
 * Reaproveita calcularClassificacaoGrupo, que já lê { [id]: {casa,fora} }.
 */
export function classificacaoReal(resultados) {
  const out = {};
  for (const [grupo, jogos] of Object.entries(GRUPOS_MAP)) {
    out[grupo] = calcularClassificacaoGrupo(jogos, resultados || {});
  }
  return out;
}

/** Os 8 melhores 3ºs colocados (entre os 12 grupos), pela classificação real. */
function melhoresTerceiros(tabelaPorGrupo) {
  const terceiros = Object.entries(tabelaPorGrupo)
    .map(([grupo, tabela]) => (tabela[2] ? { ...tabela[2], grupo } : null))
    .filter(Boolean);
  return getMelhoresTerceiros(terceiros);
}

/**
 * Mapa { num-do-slot → time } com a atribuição dos 8 melhores 3ºs aos slots,
 * calculada pela elegibilidade FIFA (ver terceirosFifa.js). Só preenche quando
 * já há 8 terceiros ranqueados (senão a combinação ainda está incompleta).
 *
 * É uma ESTIMATIVA: sempre elegível, mas pode divergir do oficial num caso raro.
 */
export function atribuicaoTerceiros(tabelaPorGrupo) {
  const top8 = melhoresTerceiros(tabelaPorGrupo);
  if (top8.length < 8) return {};
  const gruposRankeados = top8.map((t) => t.grupo);
  const porSlot = atribuirTerceiros(gruposRankeados); // { num: grupo }
  const out = {};
  for (const [num, grupo] of Object.entries(porSlot)) {
    const time = tabelaPorGrupo[grupo]?.[2]?.time || null;
    if (time) out[num] = { time, grupo };
  }
  return out;
}

/** Um grupo está "fechado" quando todos os seus 6 jogos já têm resultado. */
function grupoFechado(grupo, resultados) {
  return (GRUPOS_MAP[grupo] || []).every((j) => {
    const r = resultados?.[j.id];
    return r && r.casa != null && r.fora != null;
  });
}

/** Todos os 12 grupos já fecharam? (define se o 3º atribuído é certo ou estimativa) */
function todosGruposFechados(resultados) {
  return Object.keys(GRUPOS_MAP).every((g) => grupoFechado(g, resultados));
}

/**
 * Resolve um slotInfo (de parseSlot) para um rótulo e, quando possível, o time
 * provável. Devolve { rotulo, time, provavel } onde:
 *   - time: nome do time se já é certo/provável (ou null).
 *   - provavel: true quando o time é só uma estimativa (grupo ainda aberto).
 *   - rotulo: texto a exibir quando não há time (ex.: "Melhor 3º (A/B/C/D/F)").
 *
 * `num` é o número do jogo KO atual — usado para resolver o slot de 3º colocado
 * via a atribuição FIFA (atribuicaoTerceiros), pré-computada em ctx.terceiros.
 */
export function resolverSlot(info, ctx, num) {
  const { tabelaPorGrupo, resultados, koPorNum, terceiros } = ctx;

  if (!info || info.tipo === "indefinido") return { rotulo: "A definir", time: null };
  if (info.tipo === "time") return { rotulo: info.time, time: info.time, provavel: false };
  if (info.tipo === "cru") return { rotulo: info.texto, time: null };

  if (info.tipo === "pos") {
    const tabela = tabelaPorGrupo[info.grupo] || [];
    const linha = tabela[info.pos - 1];
    const time = linha?.time || null;
    const fechado = grupoFechado(info.grupo, resultados);
    const ordinal = info.pos === 1 ? "1º" : "2º";
    return {
      rotulo: time ? time : `${ordinal} do Grupo ${info.grupo}`,
      time,
      provavel: !!time && !fechado,
    };
  }

  if (info.tipo === "terceiro") {
    const candidatos = info.grupos || [];
    // Atribuição FIFA (estimativa) já calculada para todos os slots de 3º.
    const atrib = (terceiros || {})[num];
    if (atrib?.time) {
      // Certo só se TODOS os grupos fecharam; senão é estimativa (provavel).
      const certo = todosGruposFechados(resultados);
      return { rotulo: atrib.time, time: atrib.time, provavel: !certo };
    }
    return { rotulo: `Melhor 3º (${candidatos.join("/")})`, time: null };
  }

  if (info.tipo === "vencedor" || info.tipo === "perdedor") {
    const jogoRef = koPorNum?.[info.num];
    const r = resultados?.[jogoRef?.id];
    const temPlacar = r && r.casa != null && r.fora != null;
    if (jogoRef && temPlacar && jogoRef.timeCasa && jogoRef.timeFora) {
      const venceCasa = Number(r.casa) > Number(r.fora);
      const empate = Number(r.casa) === Number(r.fora);
      // Empate (decidido nos pênaltis): a fonte não diz quem passou aqui;
      // results[].avanca cobre isso quando o admin/sync preencher.
      const avanca = r.avanca || null;
      const vencedor = empate ? avanca : (venceCasa ? jogoRef.timeCasa : jogoRef.timeFora);
      const perdedor = empate
        ? (avanca ? (avanca === jogoRef.timeCasa ? jogoRef.timeFora : jogoRef.timeCasa) : null)
        : (venceCasa ? jogoRef.timeFora : jogoRef.timeCasa);
      const time = info.tipo === "vencedor" ? vencedor : perdedor;
      if (time) return { rotulo: time, time, provavel: true };
    }
    const verbo = info.tipo === "vencedor" ? "Vencedor" : "Perdedor";
    return { rotulo: `${verbo} do Jogo ${info.num}`, time: null };
  }

  return { rotulo: "A definir", time: null };
}
