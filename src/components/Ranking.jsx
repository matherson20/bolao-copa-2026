import { useEffect, useState } from "react";
import {
  getAllUsers,
  getAllBets,
  getMatches,
  getResults,
} from "../lib/db";
import { totalDoUsuario, ordenarRanking } from "../lib/scoring";

export default function Ranking() {
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [users, allBets, matches, res] = await Promise.all([
          getAllUsers(),
          getAllBets(),
          getMatches(),
          getResults(),
        ]);
        const calc = users.map((u) => {
          const palpites = allBets[u.uid] || { jogos: {}, especiais: {} };
          const { total, placaresExatos, resultadosCertos } = totalDoUsuario({
            palpites,
            matches,
            resultados: res.resultados,
            gabaritoEspeciais: res.gabaritoEspeciais,
          });
          return {
            uid: u.uid,
            nome: u.nome,
            foto: u.foto,
            total,
            placaresExatos,
            resultadosCertos,
          };
        });
        setLinhas(ordenarRanking(calc));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="centro">
        <div className="spinner" />
        Calculando ranking…
      </div>
    );
  }

  return (
    <div className="bloco">
      <h2>Ranking</h2>
      <p style={{ color: "var(--texto-suave)", fontSize: "0.82rem", marginBottom: 6 }}>
        Atualiza conforme os resultados são lançados. Desempate: placares exatos.
      </p>
      {linhas.map((l, i) => (
        <div className={`rank-linha ${i === 0 ? "top1" : ""}`} key={l.uid}>
          <div className="pos">{i + 1}º</div>
          <div className="quem">
            {l.foto ? (
              <img src={l.foto} alt="" />
            ) : (
              <span style={{ fontSize: "1.6rem" }}>👤</span>
            )}
            <div>
              <div style={{ fontWeight: 600 }}>{l.nome}</div>
              <div className="det">
                {l.placaresExatos} placares exatos · {l.resultadosCertos} resultados
              </div>
            </div>
          </div>
          <div className="pts">{l.total}</div>
        </div>
      ))}
    </div>
  );
}
