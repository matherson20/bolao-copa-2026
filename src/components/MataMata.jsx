import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/useAuth.jsx";
import { getBets, saveBets, getConfig } from "../lib/db";
import { bandeira } from "../lib/teams";
import { gerarJogosFaseGrupos } from "../lib/seedData";
import { calcularClassificacaoGrupo } from "../lib/classificacao";
import {
  getClassificados, gerarTrintaEDois, gerarOitavas,
  gerarQuartas, gerarSemis, gerarFinal, faseCompleta,
} from "../lib/playoffs";

const JOGOS_GRUPOS = gerarJogosFaseGrupos();

function fmtData(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

function JogoMata({ jogo, palpite, travado, bloqueado, onChange }) {
  const p = palpite || {};
  const semTimes = !jogo?.timeCasa || !jogo?.timeFora;
  const off = bloqueado || semTimes;
  return (
    <div className={`jogo-mata${off ? " jogo-bloqueado" : ""}`}>
      <div className="jm-time jm-casa">
        <span className="jm-bandeira">{bandeira(jogo?.timeCasa)}</span>
        <span className="jm-nome">{jogo?.timeCasa || "A definir"}</span>
      </div>
      <div className="jm-placar">
        <input type="number" min="0" inputMode="numeric"
          value={p.casa ?? ""} disabled={travado || off}
          onChange={(e) => onChange("casa", e.target.value)} />
        <span className="jm-x">×</span>
        <input type="number" min="0" inputMode="numeric"
          value={p.fora ?? ""} disabled={travado || off}
          onChange={(e) => onChange("fora", e.target.value)} />
      </div>
      <div className="jm-time jm-fora">
        <span className="jm-nome">{jogo?.timeFora || "A definir"}</span>
        <span className="jm-bandeira">{bandeira(jogo?.timeFora)}</span>
      </div>
      {jogo?.label && <div className="jm-label">{jogo.label}</div>}
    </div>
  );
}

function FaseBloco({ titulo, icone, jogos, palpites, travado, bloqueado, dica, onGol, colunas = 4 }) {
  return (
    <div className="mata-fase">
      <div className="mata-fase-titulo">
        <span>{icone}</span> {titulo}
      </div>
      {bloqueado && dica && (
        <div className="mata-dica">{dica}</div>
      )}
      <div className={`jm-grid jm-grid-${Math.min(jogos.length, colunas)}`}>
        {jogos.map((m) => (
          <JogoMata key={m.id} jogo={m} palpite={palpites[m.id]}
            travado={travado} bloqueado={bloqueado}
            onChange={(lado, val) => onGol(m.id, lado, val)} />
        ))}
      </div>
    </div>
  );
}

export default function MataMata() {
  const { user } = useAuth();
  const [palpites, setPalpites] = useState({});
  const [travaGrupos, setTravaGrupos] = useState(null);
  const [travaMataMata, setTravaMataMata] = useState(null);
  const [faseAberta, setFaseAberta] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [bets, cfg] = await Promise.all([getBets(user.uid), getConfig()]);
        setPalpites(bets.jogos || {});
        setTravaGrupos(cfg?.travaGruposTimestamp || null);
        setTravaMataMata(cfg?.travaMataMataTimestamp || null);
        // Fase de mata-mata aberta se o admin liberou explicitamente
        setFaseAberta(!!cfg?.mataMataAberto);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [user.uid]);

  // Derivações do chaveamento baseadas nos palpites da fase de grupos
  const gruposMap = useMemo(() => {
    const map = {};
    JOGOS_GRUPOS.forEach((m) => { (map[m.grupo] = map[m.grupo] || []).push(m); });
    return map;
  }, []);

  const classificados = useMemo(
    () => getClassificados(gruposMap, palpites, calcularClassificacaoGrupo),
    [gruposMap, palpites]
  );

  const r32     = useMemo(() => gerarTrintaEDois(classificados), [classificados]);
  const oitavas = useMemo(() => gerarOitavas(r32, palpites), [r32, palpites]);
  const quartas = useMemo(() => gerarQuartas(oitavas, palpites), [oitavas, palpites]);
  const semis   = useMemo(() => gerarSemis(quartas, palpites), [quartas, palpites]);
  const { terceiro, final } = useMemo(() => gerarFinal(semis, palpites), [semis, palpites]);

  const r32Completo      = useMemo(() => faseCompleta(r32, palpites), [r32, palpites]);
  const oitavasCompletas = useMemo(() => faseCompleta(oitavas, palpites), [oitavas, palpites]);
  const quartasCompletas = useMemo(() => faseCompleta(quartas, palpites), [quartas, palpites]);
  const semisCompletas   = useMemo(() => faseCompleta(semis, palpites), [semis, palpites]);

  const travado = travaMataMata ? Date.now() >= new Date(travaMataMata).getTime() : false;

  function setGol(id, lado, valor) {
    const v = valor === "" ? null : Math.max(0, parseInt(valor, 10) || 0);
    setPalpites((p) => ({ ...p, [id]: { ...(p[id] || {}), [lado]: v } }));
  }

  async function salvar() {
    if (travado) return;
    setSalvando(true);
    try {
      await saveBets(user.uid, { jogos: palpites });
      setToast("Palpites salvos!");
      setTimeout(() => setToast(""), 2200);
    } catch (e) {
      console.error(e);
      setToast("Erro ao salvar. Tente de novo.");
      setTimeout(() => setToast(""), 2600);
    } finally { setSalvando(false); }
  }

  if (loading) return <div className="centro"><div className="spinner" />Carregando…</div>;

  // Fase ainda não aberta pelo admin
  if (!faseAberta) {
    return (
      <div className="fase-bloqueada">
        <div className="fb-icone">🔒</div>
        <h2>Mata-mata ainda não liberado</h2>
        <p>
          Os palpites do mata-mata abrem após a fase de grupos terminar.<br />
          O admin vai liberar quando os grupos estiverem definidos.
        </p>
        {travaGrupos && (
          <div className="fb-data">
            Fase de grupos encerra em: <b>{fmtData(travaGrupos)}</b>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {travado ? (
        <div className="aviso aviso-travado">
          <span>🔒</span>
          <span><b>Mata-mata encerrado.</b> Seus palpites foram registrados.</span>
        </div>
      ) : (
        <div className="aviso">
          <span>🏆</span>
          <span>Preencha o chaveamento completo. Os times são gerados pelos seus palpites da fase de grupos.</span>
        </div>
      )}

      <div className="secao">
        <div className="secao-corpo mata-corpo">

          <FaseBloco titulo="32-avos de Final" icone="⚡" jogos={r32}
            palpites={palpites} travado={travado} bloqueado={false}
            onGol={setGol} colunas={4} />

          <FaseBloco titulo="Oitavas de Final" icone="⚡" jogos={oitavas}
            palpites={palpites} travado={travado} bloqueado={!r32Completo}
            dica="Preencha todos os 32-avos para desbloquear."
            onGol={setGol} colunas={4} />

          <FaseBloco titulo="Quartas de Final" icone="⚡" jogos={quartas}
            palpites={palpites} travado={travado} bloqueado={!oitavasCompletas}
            dica="Preencha todas as oitavas para desbloquear."
            onGol={setGol} colunas={4} />

          <FaseBloco titulo="Semifinais" icone="⚡" jogos={semis}
            palpites={palpites} travado={travado} bloqueado={!quartasCompletas}
            dica="Preencha todas as quartas para desbloquear."
            onGol={setGol} colunas={2} />

          <div className="mata-fase">
            <div className="mata-fase-titulo"><span>🏅</span> Decisões Finais</div>
            {!semisCompletas && <div className="mata-dica">Preencha as semifinais para desbloquear.</div>}
            <div className="jm-grid jm-grid-2">
              <div>
                <div className="jm-sub-label">🥉 3º Lugar</div>
                <JogoMata jogo={terceiro} palpite={palpites[terceiro?.id]}
                  travado={travado} bloqueado={!semisCompletas}
                  onChange={(lado, val) => setGol(terceiro.id, lado, val)} />
              </div>
              <div>
                <div className="jm-sub-label">🏆 Final</div>
                <JogoMata jogo={final} palpite={palpites[final?.id]}
                  travado={travado} bloqueado={!semisCompletas}
                  onChange={(lado, val) => setGol(final.id, lado, val)} />
              </div>
            </div>
          </div>

        </div>
      </div>

      {!travado && (
        <button className="btn-salvar" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando…" : "💾 Salvar palpites"}
        </button>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
