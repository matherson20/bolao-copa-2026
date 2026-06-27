/**
 * Tradução dos nomes de seleções: inglês (fontes públicas OpenFootball /
 * TheSportsDB) → português (nomes usados no app). Cobre as 48 seleções da
 * Copa 2026. Extraído do resultsSync para ser reutilizado também pelo
 * importador do mata-mata e pela aba de mata-mata.
 */

// Nome em inglês (fonte) → nome usado no app (português)
export const EN_PT = {
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

// Conjunto dos nomes em português que reconhecemos como seleção (valores do mapa).
const NOMES_PT = new Set(Object.values(EN_PT));

/** Traduz um nome em inglês para o português do app; devolve o original se já estiver em PT/desconhecido. */
export function pt(nomeEn) {
  if (!nomeEn) return null;
  const t = String(nomeEn).trim();
  return EN_PT[t] || t;
}

/** true quando a string é o nome de uma seleção (e não um placeholder tipo "1I", "W74"). */
export function ehSelecao(nome) {
  if (!nome) return false;
  const t = String(nome).trim();
  return NOMES_PT.has(t) || NOMES_PT.has(EN_PT[t] || "");
}
