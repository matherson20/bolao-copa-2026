import { useEffect, useMemo, useState } from "react";
import { getAllUsers, getAllBets, getConfig, getMatches, getResults } from "../lib/db";
import { gerarJogosFaseGrupos } from "../lib/seedData";
import { bandeira } from "../lib/teams";
import { statusDoPalpite } from "../lib/scoring";
import { sincronizarResultadosOpenFootball } from "../lib/resultsSync";

const JOGOS_GRUPOS = gerarJogosFaseGrupos();
const FASES_MATA = ["r32", "oitavas", "quartas", "semi", "terceiro", "final"];

function fmtHora(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function mesmodia(isoA, isoB) {
  if (!isoA || !isoB) return false;
  const a = new Date(isoA);
  const b = new Date(isoB);
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function dataLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

const STATUS_INFO = {
  exato:     { icone: "🎯", classe: "st-exato",     texto: "Placar exato" },
  resultado: { icone: "✓",  classe: "st-resultado", texto: "Resultado certo" },
  errado:    { icone: "✗",  classe: "st-errado",    texto: "Errou" },
  pendente:  { icone: "•",  classe: "st-pendente",  texto: "" },
};

export default function Hoje() {
  const [users, setUsers] = useState([]);
  const [allBets, setAllBets] = useState({});
  const [resultados, setResultados] = useState({});
  const [jogosMata, setJogosMata] = useState([]);
  const [travado, setTravado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [diaOffset, setDiaOffset] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        // 1) Tenta atualizar resultados pela fonte pública (grava só se for admin).
        setSincronizando(true);
        try { await sincronizarResultadosOpenFootball(); } catch { /* offline/sem permissão: ignora */ }
        setSincronizando(false);

        // 2) Carrega tudo já com resultados frescos.
        const [us, bets, cfg, matches, res] = await Promise.all([
          getAllUsers(), getAllBets(), getConfig(), getMatches(), getResults(),
        ]);
        setUsers(us);
        setAllBets(bets);
        setResultados(res.resultados || {});
        setJogosMata((matches || []).filter((m) => FASES_MATA.includes(m.fase) && m.timeCasa && m.timeFora));
        const ts = cfg?.travaGruposTimestamp;
        setTravado(ts ? Date.now() >= new Date(ts).getTime() : false);
      } catch (e) { console.error(e); }
      finally { setLoading(false); setSincronizando(false); }
    })();
  }, []);

  const dataAlvoISO = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + diaOffset);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [diaOffset]);

  // Jogos do dia = fase de grupos (local) + mata-mata (Firestore)
  const jogosDoDia = useMemo(() => {
    const todos = [...JOGOS_GRUPOS, ...jogosMata];
    return todos
      .filter((j) => mesmodia(j.dataHora, dataAlvoISO))
      .sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));
  }, [dataAlvoISO, jogosMata]);

  // Mini-ranking do dia: soma de pontos de cada participante nos jogos do dia
  const liderancaDoDia = useMemo(() => {
    const linhas = users.map((u) => {
      let pts = 0, exatos = 0;
      for (const jogo of jogosDoDia) {
        const palpite = allBets[u.uid]?.jogos?.[jogo.id];
        const { status, pts: p } = statusDoPalpite(palpite, resultados[jogo.id], jogo.fase || "grupos");
        pts += p;
        if (status === "exato") exatos++;
      }
      return { uid: u.uid, nome: (u.nome || "").split(" ")[0], foto: u.foto, pts, exatos };
    });
    const comPontos = linhas.filter((l) => l.pts > 0);
    comPontos.sort((a, b) => b.pts - a.pts || b.exatos - a.exatos);
    return comPontos;
  }, [users, jogosDoDia, allBets, resultados]);

  if (loading) return <div className="centro"><div className="spinner" />Carregando…</div>;

  const nenhum = jogosDoDia.length === 0;

  return (
    <>
      {/* Navegação de dias */}
      <div className="hoje-nav">
        <button className="hoje-nav-btn" onClick={() => setDiaOffset(d => d - 1)}>‹ Anterior</button>
        <div className="hoje-nav-data">
          {diaOffset === 0 ? "Hoje" : diaOffset === -1 ? "Ontem" : diaOffset === 1 ? "Amanhã" : ""}
          <span className="hoje-nav-sub">{dataLabel(dataAlvoISO)}</span>
        </div>
        <button className="hoje-nav-btn" onClick={() => setDiaOffset(d => d + 1)}>Próximo ›</button>
      </div>

      {sincronizando && (
        <div className="aviso" style={{ marginBottom: 12 }}>
          <span className="btn-spinner" style={{ borderTopColor: "#1d4ed8", borderColor: "rgba(29,78,216,0.3)" }} />
          <span>Buscando resultados atualizados…</span>
        </div>
      )}

      {/* Líder do dia */}
      {liderancaDoDia.length > 0 && (
        <div className="lider-dia">
          <div className="lider-dia-titulo">🏅 Quem pontuou hoje</div>
          <div className="lider-dia-lista">
            {liderancaDoDia.slice(0, 5).map((l, i) => (
              <div key={l.uid} className={`lider-item${i === 0 ? " topo" : ""}`}>
                <span className="lider-pos">{i + 1}º</span>
                {l.foto
                  ? <img src={l.foto} alt="" className="lider-avatar" />
                  : <span className="lider-avatar-fb">{(l.nome || "?")[0]}</span>}
                <span className="lider-nome">{l.nome}</span>
                <span className="lider-pts">+{l.pts}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {nenhum ? (
        <div className="hoje-vazio">
          <div style={{ fontSize: "2.5rem" }}>📅</div>
          <p>Nenhum jogo neste dia.</p>
          <p style={{ fontSize: "0.8rem", opacity: 0.6 }}>
            Use ‹ Anterior / Próximo › para navegar pelos dias da Copa.
          </p>
        </div>
      ) : (
        <>
          {!travado && (
            <div className="aviso" style={{ marginBottom: 12 }}>
              <span>🙈</span>
              <span>Os palpites de todos ficam visíveis após o início da Copa.</span>
            </div>
          )}

          <div className="hoje-jogos">
            {jogosDoDia.map((jogo) => {
              const res = resultados[jogo.id];
              const temResultado = res && res.casa != null && res.fora != null;
              return (
                <div key={jogo.id} className="hoje-card">
                  {/* Cabeçalho do jogo */}
                  <div className="hoje-jogo-header">
                    <span className="hoje-grupo">
                      {jogo.fase && jogo.fase !== "grupos"
                        ? (jogo.label || jogo.fase)
                        : `Grupo ${jogo.grupo}`}
                    </span>
                    <span className="hoje-hora">
                      {temResultado ? "ENCERRADO" : fmtHora(jogo.dataHora)}
                    </span>
                  </div>

                  {/* Times + placar oficial */}
                  <div className="hoje-times">
                    <div className="hoje-time">
                      <span className="hoje-bandeira">{bandeira(jogo.timeCasa)}</span>
                      <span className="hoje-time-nome">{jogo.timeCasa}</span>
                    </div>
                    {temResultado ? (
                      <span className="hoje-placar-oficial">{res.casa} <span>×</span> {res.fora}</span>
                    ) : (
                      <span className="hoje-vs">×</span>
                    )}
                    <div className="hoje-time hoje-time-fora">
                      <span className="hoje-time-nome">{jogo.timeFora}</span>
                      <span className="hoje-bandeira">{bandeira(jogo.timeFora)}</span>
                    </div>
                  </div>

                  {/* Palpites de todos */}
                  {travado && users.length > 0 ? (
                    <div className="hoje-palpites">
                      <div className="hoje-palpites-label">Palpites</div>
                      <div className="hoje-palpites-lista">
                        {users.map((u) => {
                          const p = allBets[u.uid]?.jogos?.[jogo.id];
                          const tem = p && p.casa != null && p.fora != null;
                          const { status, pts } = statusDoPalpite(p, res, jogo.fase || "grupos");
                          const info = STATUS_INFO[status] || STATUS_INFO.pendente;
                          return (
                            <div key={u.uid} className="hoje-palpite-item">
                              {u.foto
                                ? <img src={u.foto} alt="" className="hoje-avatar" />
                                : <div className="hoje-avatar-fb">{(u.nome || "?")[0]}</div>
                              }
                              <span className="hoje-participante">{(u.nome || "").split(" ")[0]}</span>
                              <span className={`hoje-placar${!tem ? " hoje-placar-vazio" : ""}`}>
                                {tem ? `${p.casa}×${p.fora}` : "—"}
                              </span>
                              {temResultado && tem && (
                                <span className={`hoje-status ${info.classe}`} title={info.texto}>
                                  {info.icone}{pts > 0 ? ` +${pts}` : ""}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="hoje-antes-trava">
                      🙈 Palpites ocultos até a Copa começar
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
