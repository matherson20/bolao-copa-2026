// Helpers para inputs de placar — só permitem dígitos (0-9).

// Teclas de controle/navegação sempre liberadas.
const TECLAS_OK = new Set([
  "Backspace", "Delete", "Tab", "Enter", "Escape",
  "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End",
]);

// Bloqueia tudo que não for dígito num input numérico (e, +, -, ., etc.).
export function soDigitosKeyDown(e) {
  if (TECLAS_OK.has(e.key)) return;
  if (e.ctrlKey || e.metaKey) return; // copiar/colar/atalhos
  if (!/^\d$/.test(e.key)) e.preventDefault();
}

// Garante que valor colado vire apenas dígitos.
export function soDigitosPaste(e) {
  const texto = (e.clipboardData || window.clipboardData).getData("text");
  if (!/^\d*$/.test(texto)) e.preventDefault();
}
