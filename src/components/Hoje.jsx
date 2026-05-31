import { useEffect, useMemo, useState } from "react";
import { getAllUsers, getAllBets, getConfig } from "../lib/db";
import { gerarJogosFaseGrupos } from "../lib/seedData";
import { bandeira } from "../lib/teams";

const TODOS_JOGOS = gerarJogosFaseGrupos();

function fmtHora(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function fmtDiaMes(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
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

export default function Hoje() {
  const [users, setUsers] = useState([]);
  const [allBets, setAllBets] = useState({});
  const [travado, setTravado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [diaOffset, setDiaOffset] = useState(0); // 0 = hoje, -1 = ontem, +1 = amanhã

  useEffect(() => {
    (async () => {
      try {
        const [us, bets, cfg] = await Promise.all([
          getAllUsers(), getAllBets(), getConfig(),
        ]);
        setUsers(us);
        setAllBets(bets);
        const ts = cfg?.travaGruposTimestamp;
        setTravado(ts ? Date.now() >= new Date(ts).getTime() : false);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  // Data alvo navegada pelo usuário
  const dataAlvo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + diaOffset);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [diaOffset]);

  const dataAlvoISO = useMemo(() => dataAlvo.toISOString(), [dataAlvo]);

  // Jogos do dia alvo
  const jogosDoDia = useMemo(() => {
    return TODOS_JOGOS.filter((j) => mesmodia(j.dataHora, dataAlvoISO))
      .sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));
  }, [dataAlvoISO]);

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

      {nenhum ? (
        <div className="hoje-vazio">
          <div style={{ fontSize: "2.5rem" }}>📅</div>
          <p>Nenhum jogo neste dia.</p>
          <p style={{ fontSize: "0.8rem", opacity: 0.6 }}>
            A Copa vai de 11/06 a 27/06 na fase de grupos.
          </p>
        </div>
      ) : (
        <>
          {!travado && (
            <div className="aviso" style={{ marginBottom: 12 }}>
              <span>🙈</span>
              <span>Os palpites ficam visíveis após o início da Copa.</span>
            </div>
          )}

          <div className="hoje-jogos">
            {jogosDoDia.map((jogo) => {
              return (
                <div key={jogo.id} className="hoje-card">
                  {/* Cabeçalho do jogo */}
                  <div className="hoje-jogo-header">
                    <span className="hoje-grupo">Grupo {jogo.grupo}</span>
                    <span className="hoje-hora">{fmtHora(jogo.dataHora)}</span>
                  </div>

                  {/* Times */}
                  <div className="hoje-times">
                    <div className="hoje-time">
                      <span className="hoje-bandeira">{bandeira(jogo.timeCasa)}</span>
                      <span className="hoje-time-nome">{jogo.timeCasa}</span>
                    </div>
                    <span className="hoje-vs">×</span>
                    <div className="hoje-time hoje-time-fora">
                      <span className="hoje-time-nome">{jogo.timeFora}</span>
                      <span className="hoje-bandeira">{bandeira(jogo.timeFora)}</span>
                    </div>
                  </div>

                  {/* Palpites de todos */}
                  {travado && users.length > 0 && (
                    <div className="hoje-palpites">
                      <div className="hoje-palpites-label">Palpites</div>
                      <div className="hoje-palpites-lista">
                        {users.map((u) => {
                          const p = allBets[u.uid]?.jogos?.[jogo.id];
                          const tem = p && p.casa != null && p.fora != null;
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
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!travado && (
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
