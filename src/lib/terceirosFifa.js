/**
 * Atribuição dos 8 melhores terceiros aos slots dos 16-avos (Copa 2026).
 *
 * A FIFA publica essa atribuição na "Annexe C" das regras (495 combinações). Não
 * temos essa tabela de forma verificável aqui, então a REPRODUZIMOS por cálculo:
 * cada slot de 3º do bracket só aceita 3ºs de um conjunto fixo de grupos
 * (elegibilidade), e atribuímos os 8 melhores 3ºs (ranqueados pelos resultados
 * reais) aos slots respeitando essa elegibilidade.
 *
 * IMPORTANTE: o resultado é sempre um confronto ELEGÍVEL e plausível, mas pode,
 * num caso raro de ambiguidade, divergir do pareamento oficial da FIFA. Por isso
 * a UI marca esse time como ESTIMATIVA. Quando a fonte (OpenFootball) cravar o
 * confronto oficial, ele substitui a estimativa.
 *
 * As elegibilidades abaixo são as do bracket 2026, indexadas pelo `num` do jogo
 * (mesmo esquema da OpenFootball), e foram conferidas contra a Wikipedia:
 *   74: A/B/C/D/F   77: C/D/F/G/H   79: C/E/F/H/I   80: E/H/I/J/K
 *   81: B/E/F/I/J   82: A/E/H/I/J   85: E/F/G/I/J   87: D/E/I/J/L
 */

// num do jogo → grupos elegíveis para o 3º colocado naquele slot.
export const ELEGIBILIDADE_TERCEIRO = {
  74: ["A", "B", "C", "D", "F"],
  77: ["C", "D", "F", "G", "H"],
  79: ["C", "E", "F", "H", "I"],
  80: ["E", "H", "I", "J", "K"],
  81: ["B", "E", "F", "I", "J"],
  82: ["A", "E", "H", "I", "J"],
  85: ["E", "F", "G", "I", "J"],
  87: ["D", "E", "I", "J", "L"],
};

// Slots processados em ordem crescente de num (determinístico).
const SLOTS_ORDENADOS = Object.keys(ELEGIBILIDADE_TERCEIRO).map(Number).sort((a, b) => a - b);

/**
 * Atribui os 8 melhores 3ºs (já ranqueados, melhor → pior) aos slots de 3º.
 *
 * @param {string[]} gruposRankeados - letras dos grupos dos 8 melhores 3ºs,
 *   na ordem de ranking (índice 0 = melhor 3º).
 * @returns {{ [num: number]: string }} mapa num-do-slot → letra do grupo atribuído.
 *   Vazio se não houver matching completo possível (combinação incompleta).
 *
 * Estratégia: backtracking determinístico. Para cada slot (ordem de num), tenta o
 * 3º elegível de melhor ranking ainda livre; recua se travar. Garante matching
 * completo sempre que os 8 grupos formam uma combinação válida.
 */
export function atribuirTerceiros(gruposRankeados) {
  const usado = {};
  const res = {};

  function bt(i) {
    if (i === SLOTS_ORDENADOS.length) return true;
    const slot = SLOTS_ORDENADOS[i];
    const eleg = ELEGIBILIDADE_TERCEIRO[slot];
    for (const g of gruposRankeados) {
      if (!usado[g] && eleg.includes(g)) {
        usado[g] = true;
        res[slot] = g;
        if (bt(i + 1)) return true;
        usado[g] = false;
        delete res[slot];
      }
    }
    return false;
  }

  return bt(0) ? res : {};
}
