// Regras de pontuacao do bolao. Ponto unico de verdade para o calculo.
// Alterar aqui muda o calculo em todo o app.

export const FASES = ["grupos", "r32", "oitavas", "quartas", "semi", "terceiro", "final"];

export const FASE_LABEL = {
  grupos: "Fase de grupos",
  r32: "32-avos de final",
  oitavas: "Oitavas de final",
  quartas: "Quartas de final",
  semi: "Semifinal",
  terceiro: "Disputa de 3º lugar",
  final: "Final",
};

export const PONTOS = {
  grupos:   { exato: 5,  resultado: 2 },
  r32:      { exato: 6,  resultado: 3 },
  oitavas:  { exato: 8,  resultado: 4 },
  quartas:  { exato: 11, resultado: 5 },
  semi:     { exato: 14, resultado: 6 },
  terceiro: { exato: 9,  resultado: 4 },
  final:    { exato: 20, resultado: 8 },
};

export const PONTOS_AVANCA = 3; // acertar quem avanca no mata-mata (independe do placar)

export const PONTOS_ESPECIAIS = {
  campeao: 20,
  artilheiro: 12,
  melhorJogador: 12,
  surpresa: 10,
  decepcao: 10,
};

export const ESPECIAIS_LABEL = {
  campeao: "Seleção campeã",
  artilheiro: "Artilheiro",
  melhorJogador: "Melhor jogador",
  surpresa: "Seleção surpresa",
  decepcao: "Seleção decepção da Copa",
};

const KNOCKOUT = new Set(["r32", "oitavas", "quartas", "semi", "terceiro", "final"]);

// Retorna "C" (casa), "E" (empate) ou "F" (fora) a partir de um placar.
export function resultadoDoPlacar(casa, fora) {
  if (casa == null || fora == null) return null;
  if (casa > fora) return "C";
  if (casa < fora) return "F";
  return "E";
}

// Pontos de um unico jogo, comparando palpite x resultado oficial.
export function pontosDoJogo(palpite, resultado, fase) {
  if (!palpite || !resultado) return 0;
  if (palpite.casa == null || palpite.fora == null) return 0;
  if (resultado.casa == null || resultado.fora == null) return 0;

  const tabela = PONTOS[fase] || PONTOS.grupos;
  let pts = 0;

  const placarExato =
    Number(palpite.casa) === Number(resultado.casa) &&
    Number(palpite.fora) === Number(resultado.fora);

  if (placarExato) {
    pts += tabela.exato;
  } else if (
    resultadoDoPlacar(Number(palpite.casa), Number(palpite.fora)) ===
    resultadoDoPlacar(Number(resultado.casa), Number(resultado.fora))
  ) {
    pts += tabela.resultado;
  }

  // Bonus de "quem avanca" no mata-mata (resultado final do jogo: 90min, prorrogacao ou penaltis).
  if (KNOCKOUT.has(fase) && palpite.avanca && resultado.avanca) {
    if (palpite.avanca === resultado.avanca) pts += PONTOS_AVANCA;
  }

  return pts;
}

// Classifica um palpite contra o resultado oficial de um jogo.
// Retorna { status, pts } onde status ∈ "exato" | "resultado" | "errado" | "pendente".
// "pendente" = ainda não há resultado oficial ou o palpite está incompleto.
export function statusDoPalpite(palpite, resultado, fase = "grupos") {
  const semPalpite = !palpite || palpite.casa == null || palpite.fora == null;
  const semResultado = !resultado || resultado.casa == null || resultado.fora == null;
  if (semPalpite || semResultado) return { status: "pendente", pts: 0 };

  const pts = pontosDoJogo(palpite, resultado, fase);
  const exato =
    Number(palpite.casa) === Number(resultado.casa) &&
    Number(palpite.fora) === Number(resultado.fora);
  if (exato) return { status: "exato", pts };

  const mesmoResultado =
    resultadoDoPlacar(Number(palpite.casa), Number(palpite.fora)) ===
    resultadoDoPlacar(Number(resultado.casa), Number(resultado.fora));
  if (mesmoResultado) return { status: "resultado", pts };

  return { status: "errado", pts: 0 };
}

// Pontos dos palpites especiais. gabarito = respostas oficiais (doc results/_especiais).
export function pontosEspeciais(especiais, gabarito) {
  if (!especiais || !gabarito) return 0;
  let pts = 0;
  for (const chave of Object.keys(PONTOS_ESPECIAIS)) {
    const palpite = (especiais[chave] || "").trim().toLowerCase();
    const oficial = (gabarito[chave] || "").trim().toLowerCase();
    if (palpite && oficial && palpite === oficial) {
      pts += PONTOS_ESPECIAIS[chave];
    }
  }
  return pts;
}

// Total de um usuario: soma de todos os jogos + especiais.
// Retorna { total, placaresExatos, resultadosCertos } para ranking e desempate.
export function totalDoUsuario({ palpites, matches, resultados, gabaritoEspeciais }) {
  let total = 0;
  let placaresExatos = 0;
  let resultadosCertos = 0;

  const jogos = (palpites && palpites.jogos) || {};

  for (const match of matches) {
    const palpite = jogos[match.id];
    const resultado = resultados[match.id];
    if (!palpite || !resultado) continue;
    if (palpite.casa == null || resultado.casa == null) continue;

    const placarExato =
      Number(palpite.casa) === Number(resultado.casa) &&
      Number(palpite.fora) === Number(resultado.fora);

    if (placarExato) {
      placaresExatos += 1;
    } else if (
      resultadoDoPlacar(Number(palpite.casa), Number(palpite.fora)) ===
      resultadoDoPlacar(Number(resultado.casa), Number(resultado.fora))
    ) {
      resultadosCertos += 1;
    }

    total += pontosDoJogo(palpite, resultado, match.fase);
  }

  total += pontosEspeciais(palpites && palpites.especiais, gabaritoEspeciais);

  return { total, placaresExatos, resultadosCertos };
}

// Ordenacao do ranking com criterio de desempate:
// 1) maior total, 2) mais placares exatos, 3) mais resultados certos.
export function ordenarRanking(linhas) {
  return [...linhas].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.placaresExatos !== a.placaresExatos) return b.placaresExatos - a.placaresExatos;
    return b.resultadosCertos - a.resultadosCertos;
  });
}
