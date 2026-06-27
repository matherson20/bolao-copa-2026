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

// Fuso de Brasília (UTC-3). A trava dos palpites usa 00:00 BRT do dia do jogo.
const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;

// Instante (ms) da meia-noite (00:00) em BRT do dia em que o jogo acontece.
// O palpite trava nesse momento — antes de o Hoje revelar os palpites daquele
// dia — para ninguém ver as apostas alheias e ainda poder mudar a sua.
// Ex.: jogo às 16:00 BRT de 28/06 → trava em 28/06 00:00 BRT.
//      jogo às 22:00 BRT de 28/06 (01:00Z do dia 29) → ainda 28/06 00:00 BRT.
export function meiaNoiteBRTdoJogo(dataHoraISO) {
  const t = dataHoraISO ? new Date(dataHoraISO).getTime() : null;
  if (t == null || Number.isNaN(t)) return null;
  // Desloca pra "hora BRT", zera para o início do dia BRT e volta pra UTC.
  const brt = new Date(t - BRT_OFFSET_MS);
  const inicioDiaBRTutc = Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate());
  return inicioDiaBRTutc + BRT_OFFSET_MS; // 00:00 BRT em instante absoluto (UTC ms)
}

// Estado de um único jogo do mata-mata: "definir" | "aberto" | "encerrado".
export function estadoJogoMata(jogo, cfg, agora = Date.now()) {
  const definido = !!jogo?.timeCasa && !!jogo?.timeFora;
  if (!definido) return "definir";
  if (cfg?.travarFase?.[jogo.fase]) return "encerrado";
  if (cfg?.liberarFase?.[jogo.fase]) return "aberto"; // admin forçou ignorar horário
  // Trava em 00:00 BRT do dia do jogo (mesma proteção da fase de grupos: quando
  // o Hoje revela os palpites do dia, eles já estão todos travados).
  const trava = meiaNoiteBRTdoJogo(jogo?.dataHora);
  if (trava != null && agora >= trava) return "encerrado";
  return "aberto";
}

// true = o jogo pode ser editado pelo usuário agora.
export function jogoMataEditavel(jogo, cfg, agora = Date.now()) {
  return estadoJogoMata(jogo, cfg, agora) === "aberto";
}
