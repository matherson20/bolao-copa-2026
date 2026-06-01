import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/useAuth.jsx";
import { getBets, saveBets, getConfig, getMatches } from "../lib/db";
import { bandeira } from "../lib/teams";
import { ESPECIAIS_LABEL, PONTOS_ESPECIAIS, FASE_LABEL } from "../lib/scoring";
import { gerarJogosFaseGrupos } from "../lib/seedData";
import { calcularClassificacaoGrupo } from "../lib/classificacao";

// Jogos da fase de grupos são dados fixos — vêm do seed local, não do Firestore
const JOGOS_GRUPOS = gerarJogosFaseGrupos();

const FASES_MATA = ["r32", "oitavas", "quartas", "semi", "terceiro", "final"];

function fmtData(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function SecaoHeader({ icone, titulo, subtitulo, aberta, onToggle, badge }) {
  return (
    <button className="secao-header" onClick={onToggle} aria-expanded={aberta}>
      <div className="secao-header-esq">
        <span className="secao-icone">{icone}</span>
        <div>
          <div className="secao-titulo">{titulo}</div>
          {subtitulo && <div className="secao-subtitulo">{subtitulo}</div>}
        </div>
      </div>
      <div className="secao-header-dir">
        {badge != null && <span className="secao-badge">{badge}</span>}
        <span className="secao-chevron" style={{ transform: aberta ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
      </div>
    </button>
  );
}

function JogoCard({ jogo, palpite, travado, bloqueado, onChange }) {
  const p = palpite || {};
  const semTimes = !jogo.timeCasa || !jogo.timeFora;
  const disabled = travado || bloqueado || semTimes;
  return (
    <div className={`jogo${bloqueado ? " jogo-bloqueado" : ""}`}>
      <div className="time casa">
        <span className="escudo">{bandeira(jogo.timeCasa)}</span>
        <span className="nome">{jogo.timeCasa || "A definir"}</span>
      </div>
      <div className="placar">
        <input type="number" min="0" inputMode="numeric"
          value={p.casa ?? ""} disabled={disabled}
          onChange={(e) => onChange("casa", e.target.value)} />
        <span className="x">×</span>
        <input type="number" min="0" inputMode="numeric"
          value={p.fora ?? ""} disabled={disabled}
          onChange={(e) => onChange("fora", e.target.value)} />
      </div>
      <div className="time fora">
        <span className="nome">{jogo.timeFora || "A definir"}</span>
        <span className="escudo">{bandeira(jogo.timeFora)}</span>
      </div>
      {jogo.dataHora && <div className="data">{fmtData(jogo.dataHora)}</div>}
    </div>
  );
}

function TabelaClassificacao({ classificacao }) {
  return (
    <div className="tabela-classificacao">
      <table>
        <thead>
          <tr>
            <th style={{ textAlign: "left", paddingLeft: 10 }}>#</th>
            <th style={{ textAlign: "left" }}>Seleção</th>
            <th>Pts</th><th>J</th><th>V</th><th>E</th><th>D</th>
            <th>GP</th><th>GC</th><th>SG</th>
          </tr>
        </thead>
        <tbody>
          {classificacao.map((time, idx) => (
            <tr key={time.time} className={
              idx < 2 ? "classificado" : idx === 2 ? "terceiro-pot" : "eliminado"
            }>
              <td style={{ fontWeight: 700, paddingLeft: 10, textAlign: "left" }}>{idx + 1}</td>
              <td style={{ display: "flex", alignItems: "center", gap: 6, textAlign: "left" }}>
                <span>{bandeira(time.time)}</span>
                <span style={{ fontWeight: 600 }}>{time.time}</span>
              </td>
              <td style={{ fontWeight: 800, color: "var(--verde-escuro)" }}>{time.pontos}</td>
              <td>{time.jogos}</td><td>{time.vitorias}</td>
              <td>{time.empates}</td><td>{time.derrotas}</td>
              <td>{time.golsPro}</td><td>{time.golsContra}</td>
              <td style={{ fontWeight: 600 }}>
                {time.saldoGols > 0 ? `+${time.saldoGols}` : time.saldoGols}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="tabela-legenda">
        <span>🟢 Top 2: classificados</span>
        <span>🟡 3º: pode avançar</span>
        <span>🔴 4º: eliminado</span>
      </div>
    </div>
  );
}

function MataFase({ titulo, jogos, palpites, travado, bloqueado, onGol, dica }) {
  return (
    <div className="mata-fase">
      <div className="mata-fase-titulo">{titulo}</div>
      {bloqueado && dica && <p className="mata-dica">{dica}</p>}
      <div className={`mata-grid mata-grid-${Math.min(jogos.length, 4)}`}>
        {jogos.map((m) => (
          <JogoCard key={m.id} jogo={m} palpite={palpites[m.id]}
            travado={travado} bloqueado={bloqueado}
            onChange={(lado, valor) => onGol(m.id, lado, valor)} />
        ))}
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function Palpites() {
  const { user } = useAuth();
  const [palpites, setPalpites] = useState({});    // jogos: { [matchId]: {casa, fora} }
  const [especiais, setEspeciais] = useState({});
  const [travaTs, setTravaTs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState("");

  const [mataMataAberto, setMataMataAberto] = useState(false);
  const [travaMataMataTs, setTravaMataMataTs] = useState(null);
  const [jogosMataMata, setJogosMataMata] = useState([]);
  const [secoes, setSecoes] = useState({ especiais: true, grupos: true, matamata: true });
  const [gruposAbertos, setGruposAbertos] = useState({});

  function toggleSecao(k) { setSecoes((p) => ({ ...p, [k]: !p[k] })); }
  function toggleGrupo(g) { setGruposAbertos((p) => ({ ...p, [g]: !p[g] })); }

  useEffect(() => {
    (async () => {
      try {
        const [bets, cfg, allMatches] = await Promise.all([
          getBets(user.uid),
          getConfig(),
          getMatches(),
        ]);
        setPalpites(bets.jogos || {});
        setEspeciais(bets.especiais || {});
        setTravaTs(cfg?.travaGruposTimestamp || null);
        setMataMataAberto(cfg?.mataMataAberto === true);
        setTravaMataMataTs(cfg?.travaMataMataTimestamp || null);

        const mata = allMatches.filter((m) => FASES_MATA.includes(m.fase));
        setJogosMataMata(mata);

        const init = {};
        GRUPOS_LISTA.forEach(([nome]) => { init[nome] = true; });
        setGruposAbertos(init);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user.uid]);

  // ── Estrutura de grupos (local, sempre disponível) ───────────────────────────

  const GRUPOS_LISTA = useMemo(() => {
    const map = {};
    for (const m of JOGOS_GRUPOS) {
      (map[m.grupo] = map[m.grupo] || []).push(m);
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

  const travado = travaTs ? Date.now() >= new Date(travaTs).getTime() : false;
  const mataTravado = travaMataMataTs ? Date.now() >= new Date(travaMataMataTs).getTime() : false;

  // ── Handlers ────────────────────────────────────────────────────────────────

  function setGol(matchId, lado, valor) {
    const v = valor === "" ? null : Math.max(0, parseInt(valor, 10) || 0);
    setPalpites((prev) => ({ ...prev, [matchId]: { ...(prev[matchId] || {}), [lado]: v } }));
  }

  function setEspecial(chave, valor) {
    setEspeciais((prev) => ({ ...prev, [chave]: valor }));
  }

  async function salvar() {
    if (travado && (!mataMataAberto || mataTravado)) return;
    setSalvando(true);
    try {
      await saveBets(user.uid, { jogos: palpites, especiais });
      setToast("Palpites salvos!");
      setTimeout(() => setToast(""), 2200);
    } catch (e) {
      console.error(e);
      setToast("Erro ao salvar. Tente de novo.");
      setTimeout(() => setToast(""), 2600);
    } finally {
      setSalvando(false);
    }
  }

  // ── Contador de progresso ────────────────────────────────────────────────────

  const totalGrupos = JOGOS_GRUPOS.length;
  const preenchidosGrupos = JOGOS_GRUPOS.filter((m) => {
    const p = palpites[m.id];
    return p && p.casa != null && p.fora != null;
  }).length;

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="centro"><div className="spinner" />Carregando…</div>;
  }

  return (
    <>
      {travado ? (
        <div className="aviso travado">
          <span>🔒</span>
          <span><b>Palpites travados!</b> A Copa já começou ({travaTs ? fmtData(travaTs) : ""}).</span>
        </div>
      ) : (
        <div className="aviso">
          <span>✏️</span>
          <span>
            <b>Palpites liberados!</b> Edite à vontade até
            {travaTs ? ` ${fmtData(travaTs)}` : " o início da Copa"}.
          </span>
        </div>
      )}

      {/* ── ESPECIAIS ── */}
      <div className="secao">
        <SecaoHeader icone="🌟" titulo="Palpites Especiais"
          subtitulo="Campeão, artilheiro e mais — pontos bônus!"
          aberta={secoes.especiais} onToggle={() => toggleSecao("especiais")} />
        {secoes.especiais && (
          <div className="secao-corpo">
            <div className="bloco">
              {Object.keys(ESPECIAIS_LABEL).map((chave) => (
                <div className="campo" key={chave}>
                  <label>
                    {ESPECIAIS_LABEL[chave]}{" "}
                    <span style={{ color: "var(--verde)" }}>· {PONTOS_ESPECIAIS[chave]} pts</span>
                  </label>
                  <input type="text" value={especiais[chave] || ""} disabled={travado}
                    placeholder={
                      chave === "campeao" ? "Ex.: Brasil" :
                      chave === "artilheiro" ? "Nome do jogador" :
                      chave === "melhorJogador" ? "Nome do jogador" : "Seleção surpresa"
                    }
                    onChange={(e) => setEspecial(chave, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── FASE DE GRUPOS ── */}
      <div className="secao">
        <SecaoHeader icone="⚽" titulo="Fase de Grupos"
          subtitulo="12 grupos · 48 seleções · top 2 + 8 melhores 3ºs avançam"
          aberta={secoes.grupos} onToggle={() => toggleSecao("grupos")}
          badge={`${preenchidosGrupos}/${totalGrupos}`} />
        {secoes.grupos && (
          <div className="secao-corpo">
            <div className="grupos-grid">
              {GRUPOS_LISTA.map(([nome, lista]) => {
                const classificacao = calcularClassificacaoGrupo(lista, palpites);
                const aberto_ = gruposAbertos[nome] !== false;
                const preenchidos = lista.filter((m) => {
                  const p = palpites[m.id];
                  return p && p.casa != null && p.fora != null;
                }).length;
                const completo = preenchidos === lista.length;

                // Times únicos do grupo para preview
                const timesUnicos = [...new Set(lista.flatMap((m) => [m.timeCasa, m.timeFora]))];

                return (
                  <div key={nome} className="bloco grupo-card">
                    <button className="grupo-header" onClick={() => toggleGrupo(nome)} aria-expanded={aberto_}>
                      <div className="grupo-header-esq">
                        <span className="grupo-label">Grupo {nome}</span>
                        <div className="grupo-times-preview">
                          {timesUnicos.map((t) => bandeira(t)).join(" ")}
                        </div>
                      </div>
                      <div className="grupo-header-dir">
                        {completo
                          ? <span className="badge-completo">✓</span>
                          : <span className="badge-progresso">{preenchidos}/{lista.length}</span>}
                        <span className="grupo-chevron" style={{ transform: aberto_ ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                      </div>
                    </button>

                    {aberto_ && (
                      <>
                        <TabelaClassificacao classificacao={classificacao} />
                        {[1, 2, 3].map((rodada) => {
                          const jogosRodada = lista.filter((m) => m.rodada === rodada);
                          if (!jogosRodada.length) return null;
                          return (
                            <div key={rodada}>
                              <div className="rodada-label">Rodada {rodada}</div>
                              {jogosRodada.map((m) => (
                                <JogoCard key={m.id} jogo={m} palpite={palpites[m.id]}
                                  travado={travado}
                                  onChange={(lado, valor) => setGol(m.id, lado, valor)} />
                              ))}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── MATA-MATA ── */}
      <div className="secao">
        <SecaoHeader icone="🏆" titulo="Mata-mata"
          subtitulo="32-avos → Oitavas → Quartas → Semis → Final"
          aberta={secoes.matamata} onToggle={() => toggleSecao("matamata")} />
        {secoes.matamata && (
          <div className="secao-corpo">
            {!mataMataAberto ? (
              <div className="aviso">
                <span>⏳</span>
                <span>Os palpites do mata-mata serão liberados após o fim da fase de grupos.</span>
              </div>
            ) : (
              <>
                {mataTravado && (
                  <div className="aviso travado">
                    <span>🔒</span>
                    <span><b>Palpites do mata-mata travados!</b>{travaMataMataTs ? ` (${fmtData(travaMataMataTs)})` : ""}</span>
                  </div>
                )}
                {FASES_MATA.map((fase) => {
                  const jogosDaFase = jogosMataMata.filter((j) => j.fase === fase);
                  if (!jogosDaFase.length) return null;
                  return (
                    <MataFase
                      key={fase}
                      titulo={FASE_LABEL[fase]}
                      jogos={jogosDaFase}
                      palpites={palpites}
                      travado={mataTravado}
                      bloqueado={false}
                      onGol={setGol}
                    />
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {(!travado || (mataMataAberto && !mataTravado)) && (
        <button className="btn-salvar" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando…" : "💾 Salvar palpites"}
        </button>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
