import { useEffect, useState } from "react";
import {
  getAllUsers,
  getAllBets,
  getMatches,
  getResults,
} from "../lib/db";
import { totalDoUsuario, ordenarRanking, comColocacoes } from "../lib/scoring";
import { sincronizarResultadosOpenFootball } from "../lib/resultsSync";
import { gerarJogosFaseGrupos } from "../lib/seedData";

// Jogos da fase de grupos são dados locais (seed), não vivem na coleção
// `matches` do Firestore — só o mata-mata vive lá. O ranking precisa somar os
// dois universos, senão os resultados dos grupos nunca pontuam.
const JOGOS_GRUPOS = gerarJogosFaseGrupos();

export default function Ranking() {
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Atualiza resultados pela fonte pública antes de calcular (grava só se admin).
        try { await sincronizarResultadosOpenFootball(); } catch { /* ignora */ }

        const [users, allBets, matches, res] = await Promise.all([
          getAllUsers(),
          getAllBets(),
          getMatches(),
          getResults(),
        ]);
        // Mata-mata (Firestore) só conta quando os times já estão definidos.
        const jogosMata = (matches || []).filter(
          (m) => m.fase && m.fase !== "grupos" && m.timeCasa && m.timeFora
        );
        const todosJogos = [...JOGOS_GRUPOS, ...jogosMata];

        const calc = users.map((u) => {
          const palpites = allBets[u.uid] || { jogos: {}, especiais: {} };
          const { total, placaresExatos, resultadosCertos } = totalDoUsuario({
            palpites,
            matches: todosJogos,
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
        setLinhas(comColocacoes(ordenarRanking(calc)));
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
        Desempate: mais placares exatos, depois mais resultados certos. Empate
        total divide a mesma colocação.
      </p>
      {linhas.map((l) => (
        <div className={`rank-linha ${l.posicao === 1 ? "top1" : ""}`} key={l.uid}>
          <div className="pos">
            {l.empatado && <span className="pos-igual" title="Empatado">=</span>}
            {l.posicao}º
          </div>
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
