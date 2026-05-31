import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/useAuth.jsx";
import { getBets, saveBets, getConfig } from "../lib/db";
import { bandeira } from "../lib/teams";
import { ESPECIAIS_LABEL, PONTOS_ESPECIAIS } from "../lib/scoring";
import { gerarJogosFaseGrupos } from "../lib/seedData";
import { calcularClassificacaoGrupo } from "../lib/classificacao";

const JOGOS_GRUPOS = gerarJogosFaseGrupos();

function fmtData(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

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

function TabelaClassificacao({ classificacao }) {
  return (
    <div className="tabela-classificacao">
      <table>
        <thead>
          <tr>
            <th className="col-pos">#</th>
            <th className="col-time">Seleção</th>
            <th>Pts</th>
            <th>J</th>
            <th className="col-hide-sm">V</th>
            <th className="col-hide-sm">E</th>
            <th className="col-hide-sm">D</th>
            <th>GP</th>
            <th>GC</th>
            <th>SG</th>
          </tr>
        </thead>
        <tbody>
          {classificacao.map((time, idx) => (
            <tr key={time.time} className={
              idx < 2 ? "classificado" : idx === 2 ? "terceiro-pot" : "eliminado"
            }>
              <td className="col-pos">{idx + 1}</td>
              <td className="col-time">
                <span className="tab-bandeira">{bandeira(time.time)}</span>
                <span className="tab-nome">{time.time}</span>
              </td>
              <td className="col-pts">{time.pontos}</td>
              <td>{time.jogos}</td>
              <td className="col-hide-sm">{time.vitorias}</td>
              <td className="col-hide-sm">{time.empates}</td>
              <td className="col-hide-sm">{time.derrotas}</td>
              <td>{time.golsPro}</td>
              <td>{time.golsContra}</td>
              <td className="col-sg">{time.saldoGols > 0 ? `+${time.saldoGols}` : time.saldoGols}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="tabela-legenda">
        <span>🟢 Top 2</span>
        <span>🟡 3º pot.</span>
        <span>🔴 Eliminado</span>
      </div>
    </div>
  );
}

function JogoRow({ jogo, palpite, travado, onChange }) {
  const p = palpite || {};
  const preenchido = p.casa != null && p.fora != null;
  return (
    <div className={`jogo-row${preenchido ? " preenchido" : ""}`}>
      <div className="jr-time jr-casa">
        <span className="jr-bandeira">{bandeira(jogo.timeCasa)}</span>
        <span className="jr-nome">{jogo.timeCasa}</span>
      </div>
      <div className="jr-placar">
        <input
          type="number" min="0" inputMode="numeric"
          value={p.casa ?? ""} disabled={travado}
          onChange={(e) => onChange("casa", e.target.value)}
        />
        <span className="jr-x">×</span>
        <input
          type="number" min="0" inputMode="numeric"
          value={p.fora ?? ""} disabled={travado}
          onChange={(e) => onChange("fora", e.target.value)}
        />
      </div>
      <div className="jr-time jr-fora">
        <span className="jr-nome">{jogo.timeFora}</span>
        <span className="jr-bandeira">{bandeira(jogo.timeFora)}</span>
      </div>
      <div className="jr-data">{fmtData(jogo.dataHora)}</div>
    </div>
  );
}

export default function Grupos() {
  const { user } = useAuth();
  const [palpites, setPalpites] = useState({});
  const [especiais, setEspeciais] = useState({});
  const [travaTs, setTravaTs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState("");
  const [secoes, setSecoes] = useState({ especiais: true, grupos: true });
  const [gruposAbertos, setGruposAbertos] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const [bets, cfg] = await Promise.all([getBets(user.uid), getConfig()]);
        setPalpites(bets.jogos || {});
        setEspeciais(bets.especiais || {});
        setTravaTs(cfg?.travaGruposTimestamp || null);
        // todos os grupos abertos por padrão
        const init = {};
        GRUPOS_LISTA.forEach(([g]) => { init[g] = true; });
        setGruposAbertos(init);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [user.uid]);

  const GRUPOS_LISTA = useMemo(() => {
    const map = {};
    JOGOS_GRUPOS.forEach((m) => { (map[m.grupo] = map[m.grupo] || []).push(m); });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

  const travado = travaTs ? Date.now() >= new Date(travaTs).getTime() : false;

  function setGol(id, lado, valor) {
    const v = valor === "" ? null : Math.max(0, parseInt(valor, 10) || 0);
    setPalpites((p) => ({ ...p, [id]: { ...(p[id] || {}), [lado]: v } }));
  }

  async function salvar() {
    if (travado) return;
    setSalvando(true);
    try {
      await saveBets(user.uid, { jogos: palpites, especiais });
      setToast("Palpites salvos!");
      setTimeout(() => setToast(""), 2200);
    } catch (e) {
      console.error(e);
      setToast("Erro ao salvar. Tente de novo.");
      setTimeout(() => setToast(""), 2600);
    } finally { setSalvando(false); }
  }

  const totalJogos = JOGOS_GRUPOS.length;
  const preenchidos = JOGOS_GRUPOS.filter((m) => {
    const p = palpites[m.id];
    return p && p.casa != null && p.fora != null;
  }).length;

  if (loading) return <div className="centro"><div className="spinner" />Carregando…</div>;

  return (
    <>
      {travado ? (
        <div className="aviso aviso-travado">
          <span>🔒</span>
          <span><b>Fase de grupos encerrada.</b> Seus palpites foram registrados.</span>
        </div>
      ) : (
        <div className="aviso">
          <span>✏️</span>
          <span>Preencha todos os palpites antes de {travaTs ? fmtData(travaTs) : "11/06/2026 às 13h"}.</span>
        </div>
      )}

      {/* ESPECIAIS */}
      <div className="secao">
        <SecaoHeader icone="🌟" titulo="Palpites Especiais"
          subtitulo="Campeão, artilheiro e surpresa — pontos bônus"
          aberta={secoes.especiais} onToggle={() => setSecoes(s => ({ ...s, especiais: !s.especiais }))} />
        {secoes.especiais && (
          <div className="secao-corpo">
            <div className="especiais-grid">
              {Object.keys(ESPECIAIS_LABEL).map((chave) => (
                <div className="campo" key={chave}>
                  <label>
                    {ESPECIAIS_LABEL[chave]}
                    <span className="pts-label"> +{PONTOS_ESPECIAIS[chave]}pts</span>
                  </label>
                  <input type="text" value={especiais[chave] || ""} disabled={travado}
                    placeholder={
                      chave === "campeao" ? "Ex.: Brasil" :
                      chave === "artilheiro" ? "Nome do jogador" :
                      chave === "melhorJogador" ? "Nome do jogador" : "Seleção surpresa"
                    }
                    onChange={(e) => setEspeciais(p => ({ ...p, [chave]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* GRUPOS */}
      <div className="secao">
        <SecaoHeader icone="⚽" titulo="Fase de Grupos"
          subtitulo="12 grupos · 72 jogos · top 2 + 8 melhores 3ºs avançam"
          aberta={secoes.grupos} onToggle={() => setSecoes(s => ({ ...s, grupos: !s.grupos }))}
          badge={`${preenchidos}/${totalJogos}`} />
        {secoes.grupos && (
          <div className="secao-corpo">
            <div className="grupos-grid">
              {GRUPOS_LISTA.map(([nome, lista]) => {
                const classificacao = calcularClassificacaoGrupo(lista, palpites);
                const aberto = gruposAbertos[nome] !== false;
                const nPreench = lista.filter(m => { const p = palpites[m.id]; return p && p.casa != null && p.fora != null; }).length;
                const completo = nPreench === lista.length;
                const timesUnicos = [...new Set(lista.flatMap(m => [m.timeCasa, m.timeFora]))];

                return (
                  <div key={nome} className="grupo-card">
                    {/* Header do grupo */}
                    <button className="grupo-header" onClick={() => setGruposAbertos(p => ({ ...p, [nome]: !aberto }))}>
                      <div className="grupo-header-esq">
                        <span className="grupo-label">Grupo {nome}</span>
                        <span className="grupo-flags">{timesUnicos.map(t => bandeira(t)).join(" ")}</span>
                      </div>
                      <div className="grupo-header-dir">
                        {completo
                          ? <span className="badge-completo">✓ OK</span>
                          : <span className="badge-progresso">{nPreench}/{lista.length}</span>}
                        <span className="grupo-chevron" style={{ transform: aberto ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                      </div>
                    </button>

                    {aberto && (
                      <>
                        {/* Tabela de classificação */}
                        <TabelaClassificacao classificacao={classificacao} />

                        {/* Jogos por rodada */}
                        {[1, 2, 3].map((rodada) => {
                          const jogosR = lista.filter(m => m.rodada === rodada);
                          if (!jogosR.length) return null;
                          return (
                            <div key={rodada}>
                              <div className="rodada-label">Rodada {rodada}</div>
                              {jogosR.map(m => (
                                <JogoRow key={m.id} jogo={m} palpite={palpites[m.id]}
                                  travado={travado}
                                  onChange={(lado, val) => setGol(m.id, lado, val)} />
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

      {!travado && (
        <button className="btn-salvar" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando…" : "💾 Salvar palpites"}
        </button>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
