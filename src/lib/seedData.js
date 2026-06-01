/**
 * Copa do Mundo 2026 — Calendário oficial
 * Fonte: SofaScore / ESPN — horários em BRT (UTC-3)
 * 12 grupos × 6 jogos = 72 partidas na fase de grupos
 */

export const GRUPOS_2026 = {
  A: ["México", "Coreia do Sul", "República Tcheca", "África do Sul"],
  B: ["Canadá", "Suíça", "Catar", "Bósnia e Herzegovina"],
  C: ["Brasil", "Marrocos", "Haiti", "Escócia"],
  D: ["Estados Unidos", "Paraguai", "Austrália", "Turquia"],
  E: ["Alemanha", "Curaçau", "Costa do Marfim", "Equador"],
  F: ["Holanda", "Japão", "Suécia", "Tunísia"],
  G: ["Bélgica", "Egito", "Irã", "Nova Zelândia"],
  H: ["Espanha", "Cabo Verde", "Arábia Saudita", "Uruguai"],
  I: ["França", "Senegal", "Iraque", "Noruega"],
  J: ["Argentina", "Argélia", "Áustria", "Jordânia"],
  K: ["Portugal", "Colômbia", "Rep. Democrática do Congo", "Uzbequistão"],
  L: ["Inglaterra", "Croácia", "Gana", "Panamá"],
};

// Calendário oficial — cada item: [timeCasa, timeFora, "DD/MM HH:MM"]
// Rodada 3 de cada grupo é simultânea (mesmo dia/hora para os 2 jogos)
const JOGOS_OFICIAIS = [
  // ── GRUPO A ──────────────────────────────────────────────────
  { grupo: "A", rodada: 1, casa: "México",           fora: "África do Sul",    dt: "2026-06-11T16:00" },
  { grupo: "A", rodada: 1, casa: "Coreia do Sul",    fora: "República Tcheca", dt: "2026-06-11T23:00" },
  { grupo: "A", rodada: 2, casa: "República Tcheca", fora: "África do Sul",    dt: "2026-06-18T13:00" },
  { grupo: "A", rodada: 2, casa: "México",           fora: "Coreia do Sul",    dt: "2026-06-18T22:00" },
  { grupo: "A", rodada: 3, casa: "República Tcheca", fora: "México",           dt: "2026-06-24T22:00" },
  { grupo: "A", rodada: 3, casa: "África do Sul",    fora: "Coreia do Sul",    dt: "2026-06-24T22:00" },

  // ── GRUPO B ──────────────────────────────────────────────────
  { grupo: "B", rodada: 1, casa: "Canadá",              fora: "Bósnia e Herzegovina", dt: "2026-06-12T16:00" },
  { grupo: "B", rodada: 1, casa: "Catar",               fora: "Suíça",                dt: "2026-06-13T16:00" },
  { grupo: "B", rodada: 2, casa: "Suíça",               fora: "Bósnia e Herzegovina", dt: "2026-06-18T16:00" },
  { grupo: "B", rodada: 2, casa: "Canadá",              fora: "Catar",                dt: "2026-06-18T19:00" },
  { grupo: "B", rodada: 3, casa: "Bósnia e Herzegovina",fora: "Catar",                dt: "2026-06-24T16:00" },
  { grupo: "B", rodada: 3, casa: "Suíça",               fora: "Canadá",               dt: "2026-06-24T16:00" },

  // ── GRUPO C ──────────────────────────────────────────────────
  { grupo: "C", rodada: 1, casa: "Brasil",   fora: "Marrocos", dt: "2026-06-13T19:00" },
  { grupo: "C", rodada: 1, casa: "Haiti",    fora: "Escócia",  dt: "2026-06-13T22:00" },
  { grupo: "C", rodada: 2, casa: "Escócia",  fora: "Marrocos", dt: "2026-06-19T19:00" },
  { grupo: "C", rodada: 2, casa: "Brasil",   fora: "Haiti",    dt: "2026-06-19T21:30" },
  { grupo: "C", rodada: 3, casa: "Marrocos", fora: "Haiti",    dt: "2026-06-24T19:00" },
  { grupo: "C", rodada: 3, casa: "Escócia",  fora: "Brasil",   dt: "2026-06-24T19:00" },

  // ── GRUPO D ──────────────────────────────────────────────────
  { grupo: "D", rodada: 1, casa: "Estados Unidos", fora: "Paraguai",  dt: "2026-06-12T22:00" },
  { grupo: "D", rodada: 1, casa: "Austrália",      fora: "Turquia",   dt: "2026-06-14T01:00" },
  { grupo: "D", rodada: 2, casa: "Estados Unidos", fora: "Austrália", dt: "2026-06-19T16:00" },
  { grupo: "D", rodada: 2, casa: "Turquia",        fora: "Paraguai",  dt: "2026-06-20T00:00" },
  { grupo: "D", rodada: 3, casa: "Paraguai",       fora: "Austrália", dt: "2026-06-25T23:00" },
  { grupo: "D", rodada: 3, casa: "Turquia",        fora: "Estados Unidos", dt: "2026-06-25T23:00" },

  // ── GRUPO E ──────────────────────────────────────────────────
  { grupo: "E", rodada: 1, casa: "Alemanha",       fora: "Curaçau",        dt: "2026-06-14T14:00" },
  { grupo: "E", rodada: 1, casa: "Costa do Marfim",fora: "Equador",        dt: "2026-06-14T20:00" },
  { grupo: "E", rodada: 2, casa: "Alemanha",       fora: "Costa do Marfim",dt: "2026-06-20T17:00" },
  { grupo: "E", rodada: 2, casa: "Equador",        fora: "Curaçau",        dt: "2026-06-20T21:00" },
  { grupo: "E", rodada: 3, casa: "Curaçau",        fora: "Costa do Marfim",dt: "2026-06-25T17:00" },
  { grupo: "E", rodada: 3, casa: "Equador",        fora: "Alemanha",       dt: "2026-06-25T17:00" },

  // ── GRUPO F ──────────────────────────────────────────────────
  { grupo: "F", rodada: 1, casa: "Holanda", fora: "Japão",   dt: "2026-06-14T17:00" },
  { grupo: "F", rodada: 1, casa: "Suécia",  fora: "Tunísia", dt: "2026-06-14T23:00" },
  { grupo: "F", rodada: 2, casa: "Holanda", fora: "Suécia",  dt: "2026-06-20T14:00" },
  { grupo: "F", rodada: 2, casa: "Tunísia", fora: "Japão",   dt: "2026-06-21T01:00" },
  { grupo: "F", rodada: 3, casa: "Japão",   fora: "Suécia",  dt: "2026-06-25T20:00" },
  { grupo: "F", rodada: 3, casa: "Tunísia", fora: "Holanda", dt: "2026-06-25T20:00" },

  // ── GRUPO G ──────────────────────────────────────────────────
  { grupo: "G", rodada: 1, casa: "Bélgica",      fora: "Egito",        dt: "2026-06-15T16:00" },
  { grupo: "G", rodada: 1, casa: "Irã",           fora: "Nova Zelândia",dt: "2026-06-15T22:00" },
  { grupo: "G", rodada: 2, casa: "Bélgica",      fora: "Irã",          dt: "2026-06-21T16:00" },
  { grupo: "G", rodada: 2, casa: "Nova Zelândia", fora: "Egito",        dt: "2026-06-21T22:00" },
  { grupo: "G", rodada: 3, casa: "Egito",         fora: "Irã",          dt: "2026-06-27T00:00" },
  { grupo: "G", rodada: 3, casa: "Nova Zelândia", fora: "Bélgica",      dt: "2026-06-27T00:00" },

  // ── GRUPO H ──────────────────────────────────────────────────
  { grupo: "H", rodada: 1, casa: "Espanha",      fora: "Cabo Verde",    dt: "2026-06-15T13:00" },
  { grupo: "H", rodada: 1, casa: "Arábia Saudita",fora: "Uruguai",      dt: "2026-06-15T19:00" },
  { grupo: "H", rodada: 2, casa: "Espanha",      fora: "Arábia Saudita",dt: "2026-06-21T13:00" },
  { grupo: "H", rodada: 2, casa: "Uruguai",      fora: "Cabo Verde",    dt: "2026-06-21T19:00" },
  { grupo: "H", rodada: 3, casa: "Cabo Verde",   fora: "Arábia Saudita",dt: "2026-06-26T21:00" },
  { grupo: "H", rodada: 3, casa: "Uruguai",      fora: "Espanha",       dt: "2026-06-26T21:00" },

  // ── GRUPO I ──────────────────────────────────────────────────
  { grupo: "I", rodada: 1, casa: "França",  fora: "Senegal", dt: "2026-06-16T16:00" },
  { grupo: "I", rodada: 1, casa: "Iraque",  fora: "Noruega", dt: "2026-06-16T19:00" },
  { grupo: "I", rodada: 2, casa: "França",  fora: "Iraque",  dt: "2026-06-22T18:00" },
  { grupo: "I", rodada: 2, casa: "Noruega", fora: "Senegal", dt: "2026-06-22T21:00" },
  { grupo: "I", rodada: 3, casa: "Noruega", fora: "França",  dt: "2026-06-26T16:00" },
  { grupo: "I", rodada: 3, casa: "Senegal", fora: "Iraque",  dt: "2026-06-26T16:00" },

  // ── GRUPO J ──────────────────────────────────────────────────
  { grupo: "J", rodada: 1, casa: "Argentina", fora: "Argélia",  dt: "2026-06-16T22:00" },
  { grupo: "J", rodada: 1, casa: "Áustria",   fora: "Jordânia", dt: "2026-06-17T01:00" },
  { grupo: "J", rodada: 2, casa: "Argentina", fora: "Áustria",  dt: "2026-06-22T14:00" },
  { grupo: "J", rodada: 2, casa: "Jordânia",  fora: "Argélia",  dt: "2026-06-23T00:00" },
  { grupo: "J", rodada: 3, casa: "Argélia",   fora: "Áustria",  dt: "2026-06-27T23:00" },
  { grupo: "J", rodada: 3, casa: "Jordânia",  fora: "Argentina",dt: "2026-06-27T23:00" },

  // ── GRUPO K ──────────────────────────────────────────────────
  { grupo: "K", rodada: 1, casa: "Portugal",                    fora: "Rep. Democrática do Congo", dt: "2026-06-17T14:00" },
  { grupo: "K", rodada: 1, casa: "Uzbequistão",                 fora: "Colômbia",                  dt: "2026-06-17T23:00" },
  { grupo: "K", rodada: 2, casa: "Portugal",                    fora: "Uzbequistão",               dt: "2026-06-23T14:00" },
  { grupo: "K", rodada: 2, casa: "Colômbia",                    fora: "Rep. Democrática do Congo", dt: "2026-06-23T23:00" },
  { grupo: "K", rodada: 3, casa: "Colômbia",                    fora: "Portugal",                  dt: "2026-06-27T20:30" },
  { grupo: "K", rodada: 3, casa: "Rep. Democrática do Congo",   fora: "Uzbequistão",               dt: "2026-06-27T20:30" },

  // ── GRUPO L ──────────────────────────────────────────────────
  { grupo: "L", rodada: 1, casa: "Inglaterra", fora: "Croácia", dt: "2026-06-17T17:00" },
  { grupo: "L", rodada: 1, casa: "Gana",       fora: "Panamá",  dt: "2026-06-17T20:00" },
  { grupo: "L", rodada: 2, casa: "Inglaterra", fora: "Gana",    dt: "2026-06-23T17:00" },
  { grupo: "L", rodada: 2, casa: "Panamá",     fora: "Croácia", dt: "2026-06-23T20:00" },
  { grupo: "L", rodada: 3, casa: "Croácia",    fora: "Gana",    dt: "2026-06-27T18:00" },
  { grupo: "L", rodada: 3, casa: "Panamá",     fora: "Inglaterra",dt: "2026-06-27T18:00" },
];

function slug(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
}

export function gerarJogosFaseGrupos() {
  return JOGOS_OFICIAIS.map((j) => ({
    id: `g-${slug(j.grupo)}-r${j.rodada}-${slug(j.casa)}-${slug(j.fora)}`,
    fase: "grupos",
    grupo: j.grupo,
    rodada: j.rodada,
    timeCasa: j.casa,
    timeFora: j.fora,
    dataHora: `${j.dt}:00`,
  }));
}

export function getDadosSeed() {
  return {
    jogos: gerarJogosFaseGrupos(),
    travaGruposTimestamp: new Date("2026-06-11T16:00:00").getTime(),
  };
}
