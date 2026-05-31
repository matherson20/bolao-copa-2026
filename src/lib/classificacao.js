/**
 * Classificação da fase de grupos — Copa 2026
 * 4 times por grupo, round-robin, top 2 garantidos + 8 melhores 3ºs
 */

export function calcularClassificacaoGrupo(jogosDoGrupo, palpites) {
  const times = new Set();
  jogosDoGrupo.forEach((j) => {
    times.add(j.timeCasa);
    times.add(j.timeFora);
  });

  const tabela = Array.from(times).map((time) => ({
    time,
    pontos: 0,
    jogos: 0,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
    golsPro: 0,
    golsContra: 0,
    saldoGols: 0,
  }));

  jogosDoGrupo.forEach((jogo) => {
    const p = palpites[jogo.id];
    if (!p || p.casa == null || p.fora == null) return;

    const gc = Number(p.casa);
    const gf = Number(p.fora);
    const casa = tabela.find((t) => t.time === jogo.timeCasa);
    const fora = tabela.find((t) => t.time === jogo.timeFora);
    if (!casa || !fora) return;

    casa.jogos++;
    fora.jogos++;
    casa.golsPro += gc;
    casa.golsContra += gf;
    fora.golsPro += gf;
    fora.golsContra += gc;

    if (gc > gf) {
      casa.vitorias++;
      casa.pontos += 3;
      fora.derrotas++;
    } else if (gf > gc) {
      fora.vitorias++;
      fora.pontos += 3;
      casa.derrotas++;
    } else {
      casa.empates++;
      fora.empates++;
      casa.pontos += 1;
      fora.pontos += 1;
    }

    casa.saldoGols = casa.golsPro - casa.golsContra;
    fora.saldoGols = fora.golsPro - fora.golsContra;
  });

  tabela.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (b.saldoGols !== a.saldoGols) return b.saldoGols - a.saldoGols;
    return b.golsPro - a.golsPro;
  });

  return tabela;
}

/** Verifica se todos os palpites do grupo estão preenchidos */
export function grupoCompleto(jogosDoGrupo, palpites) {
  return jogosDoGrupo.every((j) => {
    const p = palpites[j.id];
    return p && p.casa != null && p.fora != null;
  });
}

/**
 * Identifica os 8 melhores terceiros colocados entre todos os grupos.
 * Recebe um array de { grupo, time, ...stats } dos terceiros de cada grupo.
 * Critério FIFA: pontos > SG > GP > resultado entre si (simplificado: sorteio)
 */
export function getMelhoresTerceiros(todosOsTerceiros) {
  const ordenados = [...todosOsTerceiros].sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (b.saldoGols !== a.saldoGols) return b.saldoGols - a.saldoGols;
    if (b.golsPro !== a.golsPro) return b.golsPro - a.golsPro;
    return 0;
  });
  return ordenados.slice(0, 8);
}
