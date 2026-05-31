/**
 * Playoffs Copa 2026
 *
 * Formato:
 *   Fase de grupos → 32-avos (16 jogos) → Oitavas (8) → Quartas (4) → Semis (2) → 3º + Final
 *
 * Classificados da fase de grupos:
 *   - 1º e 2º de cada grupo (24 times)
 *   - 8 melhores 3ºs colocados (de 12 grupos)
 *   Total: 32 times
 *
 * Chaveamento dos 32-avos (baseado no formato oficial FIFA 2026):
 * Os grupos são pareados para que 1ºs e 2ºs de grupos diferentes se enfrentem,
 * e os melhores 3ºs são encaixados nos slots pré-definidos pela FIFA.
 *
 * Simplificação do bolão: os confrontos dos 32-avos são pré-definidos por posição.
 * O usuário palpita quem vence cada confronto (placar).
 */

import { getMelhoresTerceiros } from "./classificacao";

/** Extrai pos 1, 2 e 3 de cada grupo */
export function getClassificados(grupos, jogos, classificacaoFn) {
  const result = {};
  Object.entries(grupos).forEach(([nome, lista]) => {
    const tabela = classificacaoFn(lista, jogos);
    result[nome] = {
      primeiro: tabela[0]?.time || null,
      segundo: tabela[1]?.time || null,
      terceiro: tabela[2]?.time || null,
      terceiro_stats: tabela[2] ? { ...tabela[2], grupo: nome } : null,
    };
  });
  return result;
}

/**
 * Chaveamento dos 32-avos de final (Copa 2026 — formato oficial FIFA)
 *
 * Os confrontos seguem o pareamento de grupos:
 * Jogo 1:  1ºA × 2ºB
 * Jogo 2:  1ºC × 2ºD
 * Jogo 3:  1ºE × 3º(melhor)
 * Jogo 4:  1ºG × 2ºH
 * Jogo 5:  1ºI × 2ºJ
 * Jogo 6:  1ºK × 3º(melhor)
 * Jogo 7:  1ºL × 2ºK  ← lado direito
 * Jogo 8:  2ºA × 3º(melhor)
 * --- espelho ---
 * Jogo 9:  1ºB × 2ºA  ← lado esquerdo
 * Jogo 10: 1ºD × 2ºC
 * Jogo 11: 1ºF × 3º(melhor)
 * Jogo 12: 1ºH × 2ºG
 * Jogo 13: 1ºJ × 2ºI
 * Jogo 14: 1ºL × 3º(melhor)  (nota: L tem dois confrontos no chaveamento)
 * Jogo 15: 2ºE × 3º(melhor)
 * Jogo 16: 2ºF × 3º(melhor)  (ou variação — depende dos 8 melhores 3ºs)
 *
 * Como o chaveamento exato dos 3ºs depende de QUAIS grupos eles vieram
 * (há 495 combinações possíveis na FIFA), usamos a simplificação padrão de bolão:
 * os 8 melhores 3ºs são encaixados nos 8 slots de terceiro por ordem de classificação.
 */
export function gerarTrintaEDois(classificados) {
  // Extraindo times por posição
  const p = (grupo, pos) => classificados[grupo]?.[pos] || null;

  // 8 melhores terceiros ordenados por pontos/SG/GP
  const terceiros = Object.values(classificados)
    .map((c) => c.terceiro_stats)
    .filter(Boolean);
  const melhoresTerceiros = getMelhoresTerceiros(terceiros);
  const t = (idx) => melhoresTerceiros[idx]?.time || null;

  return [
    // Lado esquerdo do chaveamento (jogos 1–8)
    { id: "r32-1",  fase: "r32", label: "1ºA × 2ºB", timeCasa: p("A","primeiro"), timeFora: p("B","segundo"),  dataHora: "2026-06-28T13:00:00" },
    { id: "r32-2",  fase: "r32", label: "1ºC × 2ºD", timeCasa: p("C","primeiro"), timeFora: p("D","segundo"),  dataHora: "2026-06-28T16:00:00" },
    { id: "r32-3",  fase: "r32", label: "1ºE × 3º",  timeCasa: p("E","primeiro"), timeFora: t(0),              dataHora: "2026-06-28T19:00:00" },
    { id: "r32-4",  fase: "r32", label: "1ºG × 2ºH", timeCasa: p("G","primeiro"), timeFora: p("H","segundo"),  dataHora: "2026-06-28T22:00:00" },
    { id: "r32-5",  fase: "r32", label: "1ºI × 2ºJ", timeCasa: p("I","primeiro"), timeFora: p("J","segundo"),  dataHora: "2026-06-29T13:00:00" },
    { id: "r32-6",  fase: "r32", label: "1ºK × 3º",  timeCasa: p("K","primeiro"), timeFora: t(1),              dataHora: "2026-06-29T16:00:00" },
    { id: "r32-7",  fase: "r32", label: "2ºL × 3º",  timeCasa: p("L","segundo"),  timeFora: t(2),              dataHora: "2026-06-29T19:00:00" },
    { id: "r32-8",  fase: "r32", label: "2ºA × 3º",  timeCasa: p("A","segundo"),  timeFora: t(3),              dataHora: "2026-06-29T22:00:00" },
    // Lado direito do chaveamento (jogos 9–16)
    { id: "r32-9",  fase: "r32", label: "1ºB × 2ºA", timeCasa: p("B","primeiro"), timeFora: p("A","segundo"),  dataHora: "2026-06-30T13:00:00" },
    { id: "r32-10", fase: "r32", label: "1ºD × 2ºC", timeCasa: p("D","primeiro"), timeFora: p("C","segundo"),  dataHora: "2026-06-30T16:00:00" },
    { id: "r32-11", fase: "r32", label: "1ºF × 3º",  timeCasa: p("F","primeiro"), timeFora: t(4),              dataHora: "2026-06-30T19:00:00" },
    { id: "r32-12", fase: "r32", label: "1ºH × 2ºG", timeCasa: p("H","primeiro"), timeFora: p("G","segundo"),  dataHora: "2026-06-30T22:00:00" },
    { id: "r32-13", fase: "r32", label: "1ºJ × 2ºI", timeCasa: p("J","primeiro"), timeFora: p("I","segundo"),  dataHora: "2026-07-01T13:00:00" },
    { id: "r32-14", fase: "r32", label: "1ºL × 3º",  timeCasa: p("L","primeiro"), timeFora: t(5),              dataHora: "2026-07-01T16:00:00" },
    { id: "r32-15", fase: "r32", label: "2ºE × 3º",  timeCasa: p("E","segundo"),  timeFora: t(6),              dataHora: "2026-07-01T19:00:00" },
    { id: "r32-16", fase: "r32", label: "2ºF × 3º",  timeCasa: p("F","segundo"),  timeFora: t(7),              dataHora: "2026-07-01T22:00:00" },
  ];
}

/** Resolve o vencedor de um jogo pelo palpite */
function vencedor(jogo, palpites) {
  const p = palpites[jogo?.id];
  if (!p || p.casa == null || p.fora == null) return null;
  if (Number(p.casa) > Number(p.fora)) return jogo.timeCasa;
  if (Number(p.fora) > Number(p.casa)) return jogo.timeFora;
  return p.avanca || null; // empate: campo avanca indica quem passou nos pênaltis
}

/**
 * Gera as oitavas de final (8 jogos) a partir dos vencedores dos 32-avos.
 * Chaveamento: vencedor do jogo N enfrenta vencedor do jogo N+1 (par/ímpar)
 * 1v2, 3v4, 5v6, 7v8 | 9v10, 11v12, 13v14, 15v16
 */
export function gerarOitavas(r32, palpites) {
  const pares = [[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]];
  return pares.map(([i, j], idx) => ({
    id: `oitavas-${idx + 1}`,
    fase: "oitavas",
    label: `Oitavas ${idx + 1}`,
    timeCasa: vencedor(r32[i], palpites),
    timeFora: vencedor(r32[j], palpites),
    dataHora: `2026-07-0${4 + Math.floor(idx / 4)}T${13 + (idx % 4) * 3}:00:00`,
  }));
}

/** Gera as quartas de final (4 jogos) */
export function gerarQuartas(oitavas, palpites) {
  const pares = [[0,1],[2,3],[4,5],[6,7]];
  return pares.map(([i, j], idx) => ({
    id: `quartas-${idx + 1}`,
    fase: "quartas",
    label: `Quartas ${idx + 1}`,
    timeCasa: vencedor(oitavas[i], palpites),
    timeFora: vencedor(oitavas[j], palpites),
    dataHora: `2026-07-0${9 + Math.floor(idx / 2)}T${idx % 2 === 0 ? 16 : 20}:00:00`,
  }));
}

/** Gera as semifinais (2 jogos) */
export function gerarSemis(quartas, palpites) {
  return [
    {
      id: "semi-1",
      fase: "semi",
      label: "Semifinal 1",
      timeCasa: vencedor(quartas[0], palpites),
      timeFora: vencedor(quartas[1], palpites),
      dataHora: "2026-07-14T20:00:00",
    },
    {
      id: "semi-2",
      fase: "semi",
      label: "Semifinal 2",
      timeCasa: vencedor(quartas[2], palpites),
      timeFora: vencedor(quartas[3], palpites),
      dataHora: "2026-07-15T20:00:00",
    },
  ];
}

/** Gera 3º lugar e Final */
export function gerarFinal(semis, palpites) {
  const perdedor = (jogo) => {
    const p = palpites[jogo?.id];
    if (!p || p.casa == null || p.fora == null) return null;
    if (Number(p.casa) > Number(p.fora)) return jogo.timeFora;
    if (Number(p.fora) > Number(p.casa)) return jogo.timeCasa;
    const avanc = p.avanca;
    if (!avanc) return null;
    return avanc === jogo.timeCasa ? jogo.timeFora : jogo.timeCasa;
  };

  return {
    terceiro: {
      id: "terceiro-lugar",
      fase: "terceiro",
      label: "3º Lugar",
      timeCasa: perdedor(semis[0]),
      timeFora: perdedor(semis[1]),
      dataHora: "2026-07-18T16:00:00",
    },
    final: {
      id: "final",
      fase: "final",
      label: "Final",
      timeCasa: vencedor(semis[0], palpites),
      timeFora: vencedor(semis[1], palpites),
      dataHora: "2026-07-19T16:00:00",
    },
  };
}

/** Verifica se todos os grupos estão completos */
export function todosGruposCompletos(grupos, jogos, grupoCompletoFn) {
  return Object.entries(grupos).every(([, lista]) => grupoCompletoFn(lista, jogos));
}

/** Verifica se todos os jogos de uma fase têm palpites com placar preenchido */
export function faseCompleta(jogosDaFase, palpites) {
  return jogosDaFase.every((j) => {
    if (!j.timeCasa || !j.timeFora) return false;
    const p = palpites[j.id];
    return p && p.casa != null && p.fora != null;
  });
}
