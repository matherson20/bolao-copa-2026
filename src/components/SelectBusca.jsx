import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Dropdown com busca, controlado, com renderização preguiçosa (carrega mais
 * itens conforme rola). Garante que o valor salvo é sempre uma das opções
 * (ou vazio) — evita divergência de texto livre na validação.
 *
 * O painel é renderizado num portal (document.body) com posição fixa calculada
 * a partir do botão. Isso evita que ancestrais com `overflow: hidden` (como as
 * seções) recortem a lista, e resolve problemas de empilhamento (z-index).
 *
 * options: array de strings OU de objetos { value, label, sub, icon }.
 * Props: value, options, onChange, placeholder, disabled, renderIcon
 */
const PAGINA = 40;

function normaliza(o, renderIcon) {
  if (typeof o === "string") {
    return { value: o, label: o, sub: "", icon: renderIcon ? renderIcon(o) : null };
  }
  return { value: o.value, label: o.label ?? o.value, sub: o.sub ?? "", icon: o.icon ?? null };
}

export default function SelectBusca({
  value, options, onChange, placeholder = "Selecione…", disabled = false, renderIcon,
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [destaque, setDestaque] = useState(0);
  const [limite, setLimite] = useState(PAGINA);
  const [pos, setPos] = useState(null); // { left, top, width, maxHeight, acima }
  const botaoRef = useRef(null);
  const painelRef = useRef(null);

  const itens = useMemo(
    () => options.map((o) => normaliza(o, renderIcon)),
    [options, renderIcon]
  );
  const selecionado = useMemo(
    () => itens.find((i) => i.value === value) || null,
    [itens, value]
  );

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return itens;
    return itens.filter(
      (i) => i.label.toLowerCase().includes(q) || (i.sub && i.sub.toLowerCase().includes(q))
    );
  }, [busca, itens]);

  const visiveis = filtradas.slice(0, limite);

  // Calcula a posição do painel a partir do botão.
  function recalcular() {
    const el = botaoRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const espacoAbaixo = vh - r.bottom;
    const espacoAcima = r.top;
    const acima = espacoAbaixo < 260 && espacoAcima > espacoAbaixo;
    const maxHeight = Math.min(320, Math.max(160, (acima ? espacoAcima : espacoAbaixo) - 12));
    setPos({
      left: r.left,
      width: r.width,
      top: acima ? r.top : r.bottom,
      maxHeight,
      acima,
    });
  }

  useLayoutEffect(() => {
    if (!aberto) return;
    recalcular();
    const onMove = () => recalcular();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [aberto]);

  // Fecha ao clicar fora (botão ou painel)
  useEffect(() => {
    if (!aberto) return;
    function onDoc(e) {
      if (botaoRef.current?.contains(e.target)) return;
      if (painelRef.current?.contains(e.target)) return;
      fechar();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [aberto]);

  useEffect(() => { setDestaque(0); setLimite(PAGINA); }, [busca, aberto]);

  function abrir() { if (!disabled) setAberto(true); }
  function fechar() { setAberto(false); setBusca(""); }

  function onScroll(e) {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
      setLimite((l) => (l < filtradas.length ? l + PAGINA : l));
    }
  }

  function escolher(v) { onChange(v); fechar(); }

  function onKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDestaque((d) => {
        const n = Math.min(d + 1, filtradas.length - 1);
        if (n >= limite) setLimite((l) => l + PAGINA);
        return n;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDestaque((d) => Math.max(d - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtradas[destaque]) escolher(filtradas[destaque].value);
    } else if (e.key === "Escape") {
      fechar();
    }
  }

  const painel = aberto && pos && createPortal(
    <div
      ref={painelRef}
      className={`sb-painel sb-portal${pos.acima ? " sb-acima" : ""}`}
      style={{
        position: "fixed",
        left: pos.left,
        width: pos.width,
        ...(pos.acima
          ? { bottom: window.innerHeight - pos.top }
          : { top: pos.top }),
        maxHeight: pos.maxHeight,
      }}
    >
      <input
        autoFocus
        className="sb-busca"
        type="text"
        value={busca}
        placeholder="Buscar…"
        onChange={(e) => setBusca(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <ul className="sb-lista" role="listbox" onScroll={onScroll}
        style={{ maxHeight: pos.maxHeight - 44 }}>
        {value && (
          <li className="sb-opcao sb-limpar" onClick={() => escolher("")}>
            ✕ Limpar seleção
          </li>
        )}
        {filtradas.length === 0 && <li className="sb-vazio">Nada encontrado</li>}
        {visiveis.map((it, i) => (
          <li
            key={it.value}
            className={`sb-opcao${i === destaque ? " destaque" : ""}${it.value === value ? " atual" : ""}`}
            role="option"
            aria-selected={it.value === value}
            onMouseEnter={() => setDestaque(i)}
            onClick={() => escolher(it.value)}
          >
            {it.icon && <span className="sb-icone">{it.icon}</span>}
            <span className="sb-opcao-txt">
              {it.label}
              {it.sub && <span className="sb-sub"> — {it.sub}</span>}
            </span>
            {it.value === value && <span className="sb-check">✓</span>}
          </li>
        ))}
        {filtradas.length > visiveis.length && (
          <li className="sb-mais">… role para ver mais ({filtradas.length - visiveis.length})</li>
        )}
      </ul>
    </div>,
    document.body
  );

  return (
    <div className={`sb${disabled ? " sb-disabled" : ""}`}>
      <button
        type="button"
        ref={botaoRef}
        className={`sb-controle${value ? " preenchido" : ""}`}
        disabled={disabled}
        onClick={() => (aberto ? fechar() : abrir())}
        aria-haspopup="listbox"
        aria-expanded={aberto}
      >
        <span className="sb-valor">
          {selecionado ? (
            <>
              {selecionado.icon && <span className="sb-icone">{selecionado.icon}</span>}
              <span className="sb-label-txt">{selecionado.label}</span>
              {selecionado.sub && <span className="sb-sub"> — {selecionado.sub}</span>}
            </>
          ) : (
            <span className="sb-placeholder">{placeholder}</span>
          )}
        </span>
        <span className="sb-chevron" style={{ transform: aberto ? "rotate(180deg)" : "" }}>▼</span>
      </button>
      {painel}
    </div>
  );
}
