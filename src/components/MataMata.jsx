import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/useAuth.jsx";
import { getBets, saveBets, getConfig, getResults } from "../lib/db";
import { bandeira } from "../lib/teams";
import { soDigitosKeyDown, soDigitosPaste } from "../lib/inputs";
import { FASE_ORDEM, FASE_TITULO, sincronizarMataMata } from "../lib/koImport";
import { estadoJogoMata } from "../lib/faseConfig";
import { classificacaoReal, resolverSlot, atribuicaoTerceiros } from "../lib/koProvavel";

const FASE_ICONE = {
  r32: "⚡", oitavas: "⚡", quartas: "⚡", semi: "🔥", terceiro: "🥉", final: "🏆",
};

function fmtData(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch { return ""; }
}

// Lado de um jogo (casa ou fora): nome definido OU rótulo do provável confronto.
function ladoJogo(jogo, lado, ctx) {
  const time = lado === "casa" ? jogo.timeCasa : jogo.timeFora;
  if (time) return { nome: time, time, provavel: false };
  const info = lado === "casa" ? jogo.slotCasaInfo : jogo.slotForaInfo;
  const r = resolverSlot(info, ctx, jogo.num);
  return { nome: r.rotulo, time: r.time, provavel: !!r.provavel };
}

// Tag de status de UM jogo (canto do card).
const STATUS_JOGO = {
  definir:   { classe: "tag-definir",   texto: "A definir" },
  aberto:    { classe: "tag-aberta",    texto: "🔓 Aberto" },
  encerrado: { classe: "tag-travada",   texto: "🔒 Palpites fechados" },
};

function JogoMata({ jogo, palpite, ctx }) {
  const casa = ladoJogo(jogo, "casa", ctx);
  const fora = ladoJogo(jogo, "fora", ctx);
  const definido = !!jogo.timeCasa && !!jogo.timeFora;
  // Estado do confronto, para o rótulo do rodapé:
  //  - "estimativa": há um time provável calculado (3º colocado) sendo exibido.
  //  - "provavel":   algum lado já tem time provável (ex.: 1º/2º de grupo).
  //  - "aguardando": nenhum time ainda (ex.: oitavas dependendo dos 16-avos).
  // Texto do selo de "previsão" no topo de um confronto ainda não definido.
  // Refere-se ao CONFRONTO/times — nunca ao horário (que é fixo).
  const temProvavel = (casa.time && casa.provavel) || (fora.time && fora.provavel);
  const seloPrevisao = temProvavel ? "PREVISÃO · estimativa" : "PREVISÃO · a definir";
  const estado = estadoJogoMata(jogo, ctx.cfg);
  const editavel = estado === "aberto";
  const info = STATUS_JOGO[estado] || STATUS_JOGO.definir;
  const p = palpite || {};

  // Nome de um lado: itálico/slot quando não há time; itálico leve quando é estimativa.
  const nomeClasse = (l) => (!l.time ? "jm-nome jm-nome-slot" : l.provavel ? "jm-nome jm-nome-estimativa" : "jm-nome");

  return (
    <div className={`jogo-mata${!definido ? " jogo-indefinido" : ""}`}>
      {!definido && <span className="jm-selo-previsao">{seloPrevisao}</span>}
      <div className="jm-time jm-casa">
        <span className="jm-bandeira">{casa.time ? bandeira(casa.time) : "⚽"}</span>
        <span className={nomeClasse(casa)}>{casa.nome}</span>
      </div>
      <div className="jm-placar">
        <input type="number" min="0" inputMode="numeric" maxLength={2}
          onKeyDown={soDigitosKeyDown} onPaste={soDigitosPaste}
          value={p.casa ?? ""} disabled={!editavel}
          onChange={(e) => ctx.onGol(jogo.id, "casa", e.target.value)} />
        <span className="jm-x">×</span>
        <input type="number" min="0" inputMode="numeric" maxLength={2}
          onKeyDown={soDigitosKeyDown} onPaste={soDigitosPaste}
          value={p.fora ?? ""} disabled={!editavel}
          onChange={(e) => ctx.onGol(jogo.id, "fora", e.target.value)} />
      </div>
      <div className="jm-time jm-fora">
        <span className={nomeClasse(fora)}>{fora.nome}</span>
        <span className="jm-bandeira">{fora.time ? bandeira(fora.time) : "⚽"}</span>
      </div>
      <div className="jm-label">
        <span className="jm-hora-label">{jogo.dataHora ? fmtData(jogo.dataHora) : ""}</span>
        {/* Status só para confrontos definidos (aberto/encerrado). Os não
            definidos já têm o selo "PREVISÃO" no topo do card — sem tag aqui,
            para não dar a impressão de que o HORÁRIO (que é fixo) é estimado. */}
        {definido && (
          <span className={`jm-status ${info.classe}`}>{info.texto}</span>
        )}
      </div>
    </div>
  );
}

function FaseBloco({ fase, jogos, palpites, ctx }) {
  const abertos = jogos.filter((j) => estadoJogoMata(j, ctx.cfg) === "aberto").length;
  const aDefinir = jogos.filter((j) => !j.timeCasa || !j.timeFora).length;
  const encerrados = jogos.filter((j) => estadoJogoMata(j, ctx.cfg) === "encerrado").length;

  const partes = [];
  if (abertos) partes.push(`${abertos} aberto${abertos > 1 ? "s" : ""}`);
  if (aDefinir) partes.push(`${aDefinir} a definir`);
  if (encerrados) partes.push(`${encerrados} fechado${encerrados > 1 ? "s" : ""}`);

  return (
    <div className="mata-fase">
      <div className="mata-fase-titulo">
        <span>{FASE_ICONE[fase] || "⚡"}</span> {FASE_TITULO[fase] || fase}
        {partes.length > 0 && (
          <span className="mata-fase-resumo">{partes.join(" · ")}</span>
        )}
      </div>
      {aDefinir > 0 && abertos === 0 && encerrados === 0 && (
        <div className="mata-dica">
          Confrontos ainda não definidos — mostrando o provável com base na classificação atual.
          Liberam para palpite assim que os times saírem.
        </div>
      )}
      <div className={`jm-grid jm-grid-${Math.min(jogos.length, 4)}`}>
        {jogos.map((j) => (
          <JogoMata key={j.id} jogo={j} palpite={palpites[j.id]} ctx={ctx} />
        ))}
      </div>
    </div>
  );
}

export default function MataMata() {
  const { user } = useAuth();
  const [palpites, setPalpites] = useState({});
  const [cfg, setCfg] = useState(null);
  const [jogosKO, setJogosKO] = useState([]);
  const [resultados, setResultados] = useState({});
  const [faseAberta, setFaseAberta] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState("");
  const [sujo, setSujo] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Confrontos vêm direto da API (sempre frescos). Se for admin, a própria
        // chamada grava/atualiza os jogos no Firestore (pro Hoje e o sync de placar).
        const [bets, config, res, ko] = await Promise.all([
          getBets(user.uid),
          getConfig(),
          getResults(),
          sincronizarMataMata().catch((e) => { console.error(e); return { jogos: [] }; }),
        ]);
        setPalpites(bets.jogos || {});
        setCfg(config || {});
        // Mata-mata fica ABERTO por padrão. Só fica oculto se a config disser
        // explicitamente mataMataAberto === false (rede de segurança via Firestore).
        setFaseAberta(config?.mataMataAberto !== false);
        setResultados(res.resultados || {});
        setJogosKO(ko.jogos || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [user.uid]);

  useEffect(() => {
    if (!sujo) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [sujo]);

  // Jogos agrupados por fase, na ordem oficial.
  const porFase = useMemo(() => {
    const map = {};
    for (const f of FASE_ORDEM) map[f] = [];
    for (const j of jogosKO) (map[j.fase] = map[j.fase] || []).push(j);
    for (const f of Object.keys(map)) map[f].sort((a, b) => (a.num || 0) - (b.num || 0));
    return map;
  }, [jogosKO]);

  // Contexto para resolver "provável confronto" (classificação real + lookup por num).
  const koPorNum = useMemo(() => {
    const m = {};
    for (const j of jogosKO) if (j.num != null) m[j.num] = j;
    return m;
  }, [jogosKO]);

  const tabelaPorGrupo = useMemo(() => classificacaoReal(resultados), [resultados]);
  const terceiros = useMemo(() => atribuicaoTerceiros(tabelaPorGrupo), [tabelaPorGrupo]);

  function setGol(id, lado, valor) {
    const v = valor === "" ? null : Math.max(0, parseInt(valor, 10) || 0);
    setPalpites((p) => ({ ...p, [id]: { ...(p[id] || {}), [lado]: v } }));
    setSujo(true);
  }

  const ctx = useMemo(
    () => ({ tabelaPorGrupo, terceiros, resultados, koPorNum, cfg, onGol: setGol }),
    [tabelaPorGrupo, terceiros, resultados, koPorNum, cfg]
  );

  async function salvar() {
    setSalvando(true);
    try {
      await saveBets(user.uid, { jogos: palpites });
      setSujo(false);
      setToast("Palpites salvos!");
      setTimeout(() => setToast(""), 2200);
    } catch (e) {
      console.error(e);
      setToast("Erro ao salvar. Tente de novo.");
      setTimeout(() => setToast(""), 2600);
    } finally { setSalvando(false); }
  }

  if (loading) return <div className="centro"><div className="spinner" />Carregando…</div>;

  // Fase de mata-mata ainda não liberada pelo admin.
  if (!faseAberta) {
    return (
      <div className="fase-bloqueada">
        <div className="fb-icone">🔒</div>
        <h2>Mata-mata ainda não liberado</h2>
        <p>
          Os palpites do mata-mata abrem após a fase de grupos terminar.<br />
          O admin vai liberar quando os confrontos estiverem definidos.
        </p>
      </div>
    );
  }

  // A API não retornou nenhum jogo do bracket (rede caiu / fonte fora do ar).
  if (jogosKO.length === 0) {
    return (
      <div className="fase-bloqueada">
        <div className="fb-icone">📡</div>
        <h2>Confrontos indisponíveis no momento</h2>
        <p>Não consegui buscar os jogos do mata-mata agora. Tente recarregar em instantes.</p>
      </div>
    );
  }

  const algumEditavel = jogosKO.some((j) => estadoJogoMata(j, cfg) === "aberto");

  return (
    <>
      <div className="aviso">
        <span>🏆</span>
        <span>
          Palpite o placar de cada confronto. Cada rodada libera conforme os jogos
          se aproximam; o que ainda não tem confronto definido mostra o provável.
        </span>
      </div>

      <div className="secao">
        <div className="secao-corpo mata-corpo">
          {FASE_ORDEM.map((fase) => {
            const jogos = porFase[fase];
            if (!jogos || jogos.length === 0) return null;
            return (
              <FaseBloco key={fase} fase={fase} jogos={jogos}
                palpites={palpites} ctx={ctx} />
            );
          })}
        </div>
      </div>

      {algumEditavel && (
        <button
          className={`btn-salvar${sujo ? " sujo" : ""}`}
          onClick={salvar}
          disabled={salvando || !sujo}
        >
          {salvando
            ? <><span className="btn-spinner" /> Salvando…</>
            : "💾 Salvar palpites"}
        </button>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
