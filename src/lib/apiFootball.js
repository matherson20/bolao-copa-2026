/**
 * Integração com API-Football para buscar resultados em tempo real
 * Docs: https://www.api-football.com/documentation-v3
 *
 * Copa 2026: league=1, season=2026
 * Atualização: a cada 15 segundos durante jogos
 */

const API_KEY = import.meta.env.VITE_API_FOOTBALL_KEY;
const BASE_URL = "https://v3.football.api-sports.io";

/**
 * Faz requisição para a API-Football
 */
async function apiFetch(endpoint) {
  if (!API_KEY) {
    throw new Error("VITE_API_FOOTBALL_KEY não configurada no .env");
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      "x-apisports-key": API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`API-Football error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API-Football error: ${JSON.stringify(data.errors)}`);
  }

  return data;
}

/**
 * Busca todos os jogos da Copa 2026
 * @returns {Promise<Array>} Lista de fixtures
 */
export async function getWorldCupFixtures() {
  const data = await apiFetch("/fixtures?league=1&season=2026");
  return data.response || [];
}

/**
 * Busca jogos ao vivo da Copa 2026
 * @returns {Promise<Array>} Lista de jogos ao vivo
 */
export async function getLiveMatches() {
  const data = await apiFetch("/fixtures?live=1-2026");
  return data.response || [];
}

/**
 * Busca um jogo específico por ID
 * @param {number} fixtureId - ID do jogo na API-Football
 * @returns {Promise<Object>} Dados do jogo
 */
export async function getFixtureById(fixtureId) {
  const data = await apiFetch(`/fixtures?id=${fixtureId}`);
  return data.response?.[0] || null;
}

/**
 * Busca jogos finalizados da Copa 2026
 * @returns {Promise<Array>} Lista de jogos finalizados
 */
export async function getFinishedMatches() {
  const data = await apiFetch("/fixtures?league=1&season=2026&status=FT");
  return data.response || [];
}

/**
 * Converte fixture da API-Football para o formato do nosso app
 * @param {Object} fixture - Fixture da API-Football
 * @returns {Object|null} Resultado no formato do app ou null se jogo não finalizado
 */
export function convertFixtureToResult(fixture) {
  // Só retorna resultado se o jogo estiver finalizado
  if (fixture.fixture.status.short !== "FT") {
    return null;
  }

  const homeGoals = fixture.goals.home;
  const awayGoals = fixture.goals.away;

  if (homeGoals === null || awayGoals === null) {
    return null;
  }

  return {
    golsCasa: homeGoals,
    golsFora: awayGoals,
    status: "finalizado",
    apiFixtureId: fixture.fixture.id,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Mapeia nome do time da API-Football para o nome usado no app
 * (A API pode usar nomes diferentes do OpenFootball)
 */
const TEAM_NAME_MAP = {
  "Mexico": "México",
  "United States": "Estados Unidos",
  "England": "Inglaterra",
  "Brazil": "Brasil",
  "Argentina": "Argentina",
  "Germany": "Alemanha",
  "France": "França",
  "Spain": "Espanha",
  "Portugal": "Portugal",
  "Netherlands": "Holanda",
  "Belgium": "Bélgica",
  "Italy": "Itália",
  "Uruguay": "Uruguai",
  "Colombia": "Colômbia",
  "Croatia": "Croácia",
  "Denmark": "Dinamarca",
  "Switzerland": "Suíça",
  "Poland": "Polônia",
  "Serbia": "Sérvia",
  "Wales": "País de Gales",
  "South Korea": "Coreia do Sul",
  "Japan": "Japão",
  "Australia": "Austrália",
  "Morocco": "Marrocos",
  "Senegal": "Senegal",
  "Ghana": "Gana",
  "Cameroon": "Camarões",
  "Tunisia": "Tunísia",
  "Ecuador": "Equador",
  "Peru": "Peru",
  "Chile": "Chile",
  "Costa Rica": "Costa Rica",
  "Canada": "Canadá",
  // Adicione mais mapeamentos conforme necessário
};

/**
 * Normaliza nome do time para comparação
 */
export function normalizeTeamName(apiName) {
  return TEAM_NAME_MAP[apiName] || apiName;
}

/**
 * Busca o match ID do nosso app baseado nos times e data do fixture da API
 * @param {Object} fixture - Fixture da API-Football
 * @param {Array} ourMatches - Lista de jogos do nosso Firestore
 * @returns {string|null} ID do jogo no nosso app ou null se não encontrado
 */
export function findMatchId(fixture, ourMatches) {
  const homeTeam = normalizeTeamName(fixture.teams.home.name);
  const awayTeam = normalizeTeamName(fixture.teams.away.name);
  const fixtureDate = new Date(fixture.fixture.date).toISOString().split("T")[0];

  const match = ourMatches.find((m) => {
    const matchDate = new Date(m.dataHora).toISOString().split("T")[0];
    return (
      matchDate === fixtureDate &&
      (m.casa === homeTeam || m.casa.includes(homeTeam.split(" ")[0])) &&
      (m.fora === awayTeam || m.fora.includes(awayTeam.split(" ")[0]))
    );
  });

  return match?.id || null;
}
