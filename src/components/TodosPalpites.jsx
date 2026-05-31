import { useEffect, useMemo, useState } from "react";
import { getAllUsers, getAllBets, getMatches, getConfig } from "../lib/db";
import { ESPECIAIS_LABEL } from "../lib/scoring";

export default function TodosPalpites() {
  const [users, setUsers] = useState([]);
  const [allBets, setAllBets] = useState({});
  const [matches, setMatches] = useState([]);
  const [travado, setTravado] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [us, bets, ms, cfg] = await Promise.all([
          getAllUsers(),
          getAllBets(),
          getMatches(),
          getConfig(),
        ]);
        setUsers(us);
        setAllBets(bets);
        setMatches(ms.filter((m) => m.fase === "grupos"));
        const ts = cfg?.travaGruposTimestamp;
        setTravado(ts ? Date.now() >= new Date(ts).getTime() : false);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cel = (uid, matchId) => {
    const p = allBets[uid]?.jogos?.[matchId];
    if (!p || p.casa == null || p.fora == null) return "—";
    return `${p.casa}×${p.fora}`;
  };

  if (loading) {
    return (
      <div className="centro">
        <div className="spinner" />
        Carregando palpites…
      </div>
    );
  }

  if (!travado) {
    return (
      <div className="bloco">
        <h2>Palpites de todos</h2>
        <div className="aviso">
          <span>🙈</span>
          <span>
            Os palpites de cada um ficam visíveis aqui <b>após o início da Copa</b>
            , quando tudo travar. Antes disso, ninguém vê o palpite dos outros.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bloco">
      <h2>Palpites de todos</h2>

      <div className="tabela-scroll">
        <table className="palpites">
          <thead>
            <tr>
              <th className="jogo-col">Jogo</th>
              {users.map((u) => (
                <th key={u.uid}>{(u.nome || "").split(" ")[0]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.id}>
                <td className="jogo-col">
                  {m.timeCasa} × {m.timeFora}
                </td>
                {users.map((u) => (
                  <td key={u.uid}>{cel(u.uid, m.id)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 22 }}>Especiais</h2>
      <div className="tabela-scroll">
        <table className="palpites">
          <thead>
            <tr>
              <th className="jogo-col">Palpite</th>
              {users.map((u) => (
                <th key={u.uid}>{(u.nome || "").split(" ")[0]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(ESPECIAIS_LABEL).map((chave) => (
              <tr key={chave}>
                <td className="jogo-col">{ESPECIAIS_LABEL[chave]}</td>
                {users.map((u) => (
                  <td key={u.uid}>{allBets[u.uid]?.especiais?.[chave] || "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
