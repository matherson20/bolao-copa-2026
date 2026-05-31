/**
 * Copa do Mundo 2026 — Dados oficiais
 * 48 seleções, 12 grupos de 4, 3 jogos por time na fase de grupos
 * Fase de grupos: 72 jogos (12 × 6 jogos/grupo)
 * Classificam: 1º e 2º de cada grupo + 8 melhores 3ºs = 32 times
 */

export const GRUPOS_2026 = {
  A: ["México", "Coreia do Sul", "República Tcheca", "África do Sul"],
  B: ["Canadá", "Suíça", "Catar", "Bósnia e Herzegovina"],
  C: ["Brasil", "Marrocos", "Haiti", "Escócia"],
  D: ["Estados Unidos", "Austrália", "Paraguai", "Turquia"],
  E: ["Alemanha", "Curaçau", "Costa do Marfim", "Equador"],
  F: ["Holanda", "Japão", "Suécia", "Tunísia"],
  G: ["Bélgica", "Egito", "Irã", "Nova Zelândia"],
  H: ["Espanha", "Cabo Verde", "Arábia Saudita", "Uruguai"],
  I: ["França", "Senegal", "Iraque", "Noruega"],
  J: ["Argentina", "Argélia", "Áustria", "Jordânia"],
  K: ["Portugal", "Colômbia", "Rep. Democrática do Congo", "Uzbequistão"],
  L: ["Inglaterra", "Croácia", "Gana", "Panamá"],
};

// Datas dos jogos do Brasil (referência para calibrar o calendário)
// Brasil x Marrocos: 13/06 | Brasil x Haiti: 19/06 | Brasil x Escócia: 24/06
// Abertura: México x África do Sul em 11/06/2026

// Calendário real da fase de grupos (11 jun – 27 jun 2026)
// 3 rodadas por grupo, 4 jogos/dia distribuídos entre grupos diferentes
// Rodada 1: 11–17 jun | Rodada 2: 18–23 jun | Rodada 3: 24–27 jun

const CALENDARIO = {
  // Rodada 1
  A: { 1: "2026-06-11", 2: "2026-06-18", 3: "2026-06-24" },
  B: { 1: "2026-06-12", 2: "2026-06-18", 3: "2026-06-25" },
  C: { 1: "2026-06-13", 2: "2026-06-19", 3: "2026-06-24" },
  D: { 1: "2026-06-14", 2: "2026-06-20", 3: "2026-06-25" },
  E: { 1: "2026-06-14", 2: "2026-06-20", 3: "2026-06-25" },
  F: { 1: "2026-06-15", 2: "2026-06-21", 3: "2026-06-26" },
  G: { 1: "2026-06-15", 2: "2026-06-21", 3: "2026-06-26" },
  H: { 1: "2026-06-16", 2: "2026-06-22", 3: "2026-06-27" },
  I: { 1: "2026-06-16", 2: "2026-06-22", 3: "2026-06-27" },
  J: { 1: "2026-06-17", 2: "2026-06-23", 3: "2026-06-27" },
  K: { 1: "2026-06-17", 2: "2026-06-23", 3: "2026-06-26" },
  L: { 1: "2026-06-12", 2: "2026-06-19", 3: "2026-06-24" },
};

const HORARIOS = ["13:00", "16:00", "19:00", "22:00"];

function slug(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
}

function toISO(data, hora) {
  return `${data}T${hora}:00`;
}

/**
 * Round-robin de 4 times: 6 confrontos (cada time joga 3x)
 * Rodadas:
 *   R1: 0v1, 2v3
 *   R2: 0v2, 1v3
 *   R3: 0v3, 1v2
 */
export function gerarJogosFaseGrupos() {
  const jogos = [];

  Object.entries(GRUPOS_2026).forEach(([grupo, times]) => {
    const rodadas = [
      { rodada: 1, pares: [[0, 1], [2, 3]] },
      { rodada: 2, pares: [[0, 2], [1, 3]] },
      { rodada: 3, pares: [[0, 3], [1, 2]] },
    ];

    rodadas.forEach(({ rodada, pares }) => {
      const dataBase = CALENDARIO[grupo][rodada];
      pares.forEach(([i, j], jogoIdx) => {
        const hora = HORARIOS[jogoIdx % HORARIOS.length];
        jogos.push({
          id: `g-${slug(grupo)}-r${rodada}-${slug(times[i])}-${slug(times[j])}`,
          fase: "grupos",
          grupo,
          rodada,
          timeCasa: times[i],
          timeFora: times[j],
          dataHora: toISO(dataBase, hora),
        });
      });
    });
  });

  return jogos;
}

export function getDadosSeed() {
  return {
    jogos: gerarJogosFaseGrupos(),
    travaGruposTimestamp: new Date("2026-06-11T13:00:00").getTime(),
  };
}
