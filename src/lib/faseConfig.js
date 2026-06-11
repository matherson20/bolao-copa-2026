// Controles de fase do bolão.
//
// FORÇAR_TRAVA_GRUPOS: quando true, a edição dos palpites da fase de grupos
// fica travada para todos, INDEPENDENTE do timestamp configurado no Admin.
// Útil quando a Copa já começou e queremos garantir o bloqueio imediato.
// Coloque false para voltar a depender só da data de trava (travaGruposTimestamp).
export const FORCAR_TRAVA_GRUPOS = true;

// Decide se a fase de grupos está travada, combinando o override acima com a
// data de trava vinda da config (cfg.travaGruposTimestamp).
export function gruposTravados(travaGruposTimestamp) {
  if (FORCAR_TRAVA_GRUPOS) return true;
  if (!travaGruposTimestamp) return false;
  return Date.now() >= new Date(travaGruposTimestamp).getTime();
}
