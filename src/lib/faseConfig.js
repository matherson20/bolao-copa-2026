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
