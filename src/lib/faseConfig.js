// Controles de fase do bolão.
//
// FORÇAR_TRAVA_GRUPOS: quando true, a edição dos palpites da fase de grupos
// fica travada para todos, INDEPENDENTE do timestamp configurado no Admin.
// Útil como botão de pânico para travar na marra. Em operação normal fica
// FALSE: a trava passa a valer sozinha pela data salva (travaGruposTimestamp
// em config/global), que é o comportamento automático desejado.
export const FORCAR_TRAVA_GRUPOS = false;

// Decide se a fase de grupos está travada, combinando o override acima com a
// data de trava vinda da config (cfg.travaGruposTimestamp).
export function gruposTravados(travaGruposTimestamp) {
  if (FORCAR_TRAVA_GRUPOS) return true;
  if (!travaGruposTimestamp) return false;
  return Date.now() >= new Date(travaGruposTimestamp).getTime();
}

// ---- Trava do mata-mata (por JOGO, não por fase) ----
//
// No mata-mata não existe "abrir/fechar a fase inteira de uma vez". O que vale é
// o estado de CADA jogo:
//   - "definir":  ainda não tem os dois times → readonly, mostrando o provável
//                 confronto. Vira palpitável sozinho quando os times saírem.
//   - "aberto":   os dois times definidos e o jogo ainda não começou → palpitável.
//   - "encerrado": o jogo já começou (passou do dataHora) → travado.
//
// Cada jogo trava no seu PRÓPRIO horário (você pode palpitar um jogo da rodada
// até o apito dele, mesmo que outro jogo da mesma rodada já tenha começado).
//
// Overrides manuais opcionais do admin (config/global), por fase:
//   - travarFase[fase] = true  → força todos os jogos da fase travados (pânico).
//   - liberarFase[fase] = true → ignora o horário (mas ainda exige times definidos).

// Início (ms) do primeiro jogo de uma fase — usado só para exibição no Admin.
export function inicioDaFase(jogosDaFase) {
  const tempos = (jogosDaFase || [])
    .map((j) => (j.dataHora ? new Date(j.dataHora).getTime() : null))
    .filter((t) => t != null && !Number.isNaN(t));
  return tempos.length ? Math.min(...tempos) : null;
}

// Fuso de Brasília (UTC-3).
const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;

// Instante (ms) da trava do palpite de um jogo: 23:59 BRT do dia ANTERIOR ao
// jogo — ou seja, a virada para o dia do jogo. O palpite fica aberto até a noite
// da véspera; trava quando o dia do jogo começa, exatamente quando o Hoje passa
// a revelar os palpites daquele dia. Sem vazamento e sem travar cedo demais.
// Ex.: jogo em 28/06 (qualquer hora BRT) → trava em 27/06 23:59 BRT.
export function travaDoJogo(dataHoraISO) {
  const t = dataHoraISO ? new Date(dataHoraISO).getTime() : null;
  if (t == null || Number.isNaN(t)) return null;
  // Início do dia BRT do jogo (00:00) menos 1 segundo = 23:59:59 da véspera.
  const brt = new Date(t - BRT_OFFSET_MS);
  const inicioDiaBRTutc = Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate());
  const meiaNoiteDoDiaDoJogo = inicioDiaBRTutc + BRT_OFFSET_MS; // 00:00 BRT do dia do jogo
  return meiaNoiteDoDiaDoJogo - 1000; // 23:59:59 BRT da véspera
}

// Estado de um único jogo do mata-mata: "definir" | "aberto" | "encerrado".
export function estadoJogoMata(jogo, cfg, agora = Date.now()) {
  const definido = !!jogo?.timeCasa && !!jogo?.timeFora;
  if (!definido) return "definir";
  if (cfg?.travarFase?.[jogo.fase]) return "encerrado";
  if (cfg?.liberarFase?.[jogo.fase]) return "aberto"; // admin forçou ignorar horário
  // Trava em 00:00 BRT do dia ANTERIOR ao jogo (folga de 24h+ antes de o Hoje
  // revelar os palpites do dia do jogo — sem vazamento).
  const trava = travaDoJogo(jogo?.dataHora);
  if (trava != null && agora >= trava) return "encerrado";
  return "aberto";
}

// true = o jogo pode ser editado pelo usuário agora.
export function jogoMataEditavel(jogo, cfg, agora = Date.now()) {
  return estadoJogoMata(jogo, cfg, agora) === "aberto";
}
