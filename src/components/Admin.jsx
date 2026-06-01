import { useEffect, useState } from "react";
import {
  getMatches,
  saveMatch,
  getResults,
  saveResult,
  saveGabaritoEspeciais,
  getConfig,
  setConfig,
} from "../lib/db";
import { bandeira } from "../lib/teams";
import { ESPECIAIS_LABEL } from "../lib/scoring";
import {
  getFinishedMatches,
  convertFixtureToResult,
  findMatchId,
} from "../lib/apiFootball";
import { getDadosSeed } from "../lib/seedData";

// Fonte publica e gratuita do calendario (openfootball, dominio publico, sem API key).
const FONTE_CALENDARIO =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

function slug(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
}

export default function Admin() {
  const [matches, setMatches] = useState([]);
  const [resultados, setResultados] = useState({});
  const [gabarito, setGabarito] = useState({});
  const [travaTs, setTravaTs] = useState("");
  const [travaMataMataTs, setTravaMataMataTs] = useState("");
  const [mataMataAberto, setMataMataAberto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [importando, setImportando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [apiDisponivel, setApiDisponivel] = useState(false);

  async function carregar() {
    const [ms, res, cfg] = await Promise.all([
      getMatches(),
      getResults(),
      getConfig(),
    ]);
    setMatches(ms.filter((m) => m.fase === "grupos"));
    setResultados(res.resultados || {});
    setGabarito(res.gabaritoEspeciais || {});
    if (cfg?.travaGruposTimestamp) {
      const d = new Date(cfg.travaGruposTimestamp);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setTravaTs(local);
    }
    if (cfg?.travaMataMataTimestamp) {
      const d = new Date(cfg.travaMataMataTimestamp);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setTravaMataMataTs(local);
    }
    setMataMataAberto(cfg?.mataMataAberto === true);
  }

  useEffect(() => {
    (async () => {
      try {
        await carregar();
        // Verifica se a API key está configurada
        setApiDisponivel(!!import.meta.env.VITE_API_FOOTBALL_KEY);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function flash(t) {
    setMsg(t);
    setTimeout(() => setMsg(""), 2600);
  }

  // ---- Popular com dados de teste (seed) ----
  async function popularDadosTeste() {
    if (
      !confirm(
        "Popular o bolão com dados de TESTE da Copa 2026?\n\n" +
        "Isso vai criar 48 jogos da fase de grupos com times realistas.\n" +
        "Use isso para testar o app antes da Copa começar."
      )
    )
      return;
    setImportando(true);
    try {
      const seed = getDadosSeed();

      // Salvar jogos
      for (const jogo of seed.jogos) {
        await saveMatch(jogo.id, {
          fase: jogo.fase,
          grupo: jogo.grupo,
          timeCasa: jogo.timeCasa,
          timeFora: jogo.timeFora,
          dataHora: jogo.dataHora,
        });
      }

      // Salvar trava
      await setConfig({ travaGruposTimestamp: seed.travaGruposTimestamp });

      await carregar();
      flash(`${seed.jogos.length} jogos de teste criados! Trava configurada para 11/06/2026.`);
    } catch (e) {
      console.error(e);
      flash("Erro ao popular dados de teste.");
    } finally {
      setImportando(false);
    }
  }

  // ---- Importar calendario da fase de grupos ----
  async function importarCalendario() {
    if (
      !confirm(
        "Importar/atualizar os jogos da fase de grupos a partir da base pública openfootball?"
      )
    )
      return;
    setImportando(true);
    try {
      const resp = await fetch(FONTE_CALENDARIO);
      const data = await resp.json();
      const lista = data.matches || [];
      let n = 0;
      for (const m of lista) {
        if (!m.group) continue; // apenas fase de grupos nesta versao (Fase 1)
        const t1 = m.team1?.name || m.team1;
        const t2 = m.team2?.name || m.team2;
        if (!t1 || !t2) continue;
        const dataHora = m.date
          ? `${m.date}T${(m.time || "12:00").replace(" UTC", "")}:00`
          : null;
        const id = `g-${slug(m.date)}-${slug(t1)}-${slug(t2)}`;
        await saveMatch(id, {
          fase: "grupos",
          grupo: (m.group || "").replace(/^Group\s*/i, ""),
          timeCasa: t1,
          timeFora: t2,
          dataHora,
        });
        n++;
      }
      await carregar();
      flash(`${n} jogos importados/atualizados.`);
    } catch (e) {
      console.error(e);
      flash("Falha ao importar. Verifique a conexão.");
    } finally {
      setImportando(false);
    }
  }

  // ---- Trava ----
  async function salvarTrava() {
    if (!travaTs) return;
    const millis = new Date(travaTs).getTime();
    await setConfig({ travaGruposTimestamp: millis });
    flash("Data de trava salva.");
  }

  // ---- Liberar / fechar mata-mata ----
  async function liberarMataMata() {
    if (!confirm("Liberar os palpites do mata-mata para todos os participantes?")) return;
    await setConfig({ mataMataAberto: true });
    setMataMataAberto(true);
    flash("Mata-mata liberado!");
  }

  async function fecharMataMata() {
    if (!confirm("Fechar os palpites do mata-mata?")) return;
    await setConfig({ mataMataAberto: false });
    setMataMataAberto(false);
    flash("Mata-mata fechado.");
  }

  async function salvarTravaMataMata() {
    if (!travaMataMataTs) return;
    const millis = new Date(travaMataMataTs).getTime();
    await setConfig({ travaMataMataTimestamp: millis });
    flash("Trava do mata-mata salva.");
  }

  // ---- Resultados ----
  function setResLocal(id, lado, valor) {
    const v = valor === "" ? null : Math.max(0, parseInt(valor, 10) || 0);
    setResultados((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [lado]: v },
    }));
  }
  async function salvarResultado(id) {
    const r = resultados[id];
    if (!r || r.casa == null || r.fora == null) {
      flash("Preencha os dois placares.");
      return;
    }
    await saveResult(id, { casa: r.casa, fora: r.fora });
    flash("Resultado salvo.");
  }

  // ---- Sincronizar resultados da API-Football ----
  async function sincronizarResultados() {
    if (!confirm(
      "Sincronizar resultados finalizados da API-Football?\n\n" +
      "Isso vai buscar todos os jogos finalizados e atualizar automaticamente."
    )) return;

    setSincronizando(true);
    try {
      const fixtures = await getFinishedMatches();
      let atualizados = 0;

      for (const fixture of fixtures) {
        const resultado = convertFixtureToResult(fixture);
        if (!resultado) continue;

        const matchId = findMatchId(fixture, matches);
        if (!matchId) {
          console.warn("Jogo não encontrado no Firestore:", fixture.teams.home.name, "vs", fixture.teams.away.name);
          continue;
        }

        await saveResult(matchId, {
          casa: resultado.golsCasa,
          fora: resultado.golsFora,
        });
        atualizados++;
      }

      await carregar();
      flash(`${atualizados} resultado(s) sincronizado(s) da API-Football.`);
    } catch (e) {
      console.error("Erro ao sincronizar:", e);
      flash("Erro ao sincronizar: " + e.message);
    } finally {
      setSincronizando(false);
    }
  }

  // ---- Gabarito especiais ----
  function setGab(chave, valor) {
    setGabarito((prev) => ({ ...prev, [chave]: valor }));
  }
  async function salvarGabarito() {
    await saveGabaritoEspeciais(gabarito);
    flash("Gabarito dos especiais salvo.");
  }

  if (loading) {
    return (
      <div className="centro">
        <div className="spinner" />
        Carregando painel…
      </div>
    );
  }

  return (
    <>
      <div className="bloco">
        <h2>Configuração</h2>
        <div className="campo">
          <label>Data e hora de trava (1º jogo da Copa)</label>
          <input
            type="datetime-local"
            value={travaTs}
            onChange={(e) => setTravaTs(e.target.value)}
          />
        </div>
        <button className="btn azul" style={{ marginTop: 10 }} onClick={salvarTrava}>
          Salvar trava
        </button>

        <div style={{ marginTop: 20, borderTop: "1px solid var(--borda)", paddingTop: 16 }}>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 8 }}>
            Fase Mata-mata —{" "}
            <span style={{ color: mataMataAberto ? "var(--verde)" : "var(--texto-suave)" }}>
              {mataMataAberto ? "🟢 Aberto" : "🔴 Fechado"}
            </span>
          </label>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <button className="btn primario" style={{ flex: 1 }} onClick={liberarMataMata} disabled={mataMataAberto}>
              🔓 Liberar mata-mata
            </button>
            <button className="btn contorno" style={{ flex: 1 }} onClick={fecharMataMata} disabled={!mataMataAberto}>
              🔒 Fechar mata-mata
            </button>
          </div>
          <div className="campo">
            <label>Trava dos palpites do mata-mata (início do 1º jogo)</label>
            <input
              type="datetime-local"
              value={travaMataMataTs}
              onChange={(e) => setTravaMataMataTs(e.target.value)}
            />
          </div>
          <button className="btn azul" style={{ marginTop: 6 }} onClick={salvarTravaMataMata}>
            Salvar trava do mata-mata
          </button>
          <p style={{ fontSize: "0.75rem", color: "var(--texto-suave)", marginTop: 6 }}>
            Libere após a fase de grupos terminar. Os jogos do mata-mata devem estar cadastrados no Firestore (matches) com a fase correta (r32, oitavas, etc.) antes de liberar.
          </p>
        </div>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            className="btn primario"
            onClick={popularDadosTeste}
            disabled={importando}
          >
            {importando ? "Criando…" : "🎲 Popular com dados de TESTE (recomendado)"}
          </button>

          <button
            className="btn contorno"
            onClick={importarCalendario}
            disabled={importando}
          >
            {importando ? "Importando…" : "⬇️ Importar calendário oficial (OpenFootball)"}
          </button>

          <p style={{ fontSize: "0.75rem", color: "var(--texto-suave)", marginTop: -4 }}>
            Use "dados de teste" para testar o app agora. Use "calendário oficial" quando a FIFA divulgar os jogos oficiais.
          </p>
        </div>
      </div>

      <div className="bloco">
        <h2>Lançar resultados oficiais</h2>
        <p style={{ color: "var(--texto-suave)", fontSize: "0.82rem", marginBottom: 6 }}>
          Digite o placar final de cada jogo. O ranking recalcula sozinho.
        </p>

        {apiDisponivel && matches.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <button
              className="btn azul"
              onClick={sincronizarResultados}
              disabled={sincronizando}
            >
              {sincronizando ? "Sincronizando…" : "🔄 Sincronizar resultados (API-Football)"}
            </button>
            <p style={{ color: "var(--texto-suave)", fontSize: "0.75rem", marginTop: 6 }}>
              Atualiza automaticamente todos os jogos finalizados da API.
            </p>
          </div>
        )}

        {!apiDisponivel && (
          <div className="aviso" style={{ marginBottom: 16 }}>
            <span>ℹ️</span>
            <div>
              <strong>Sincronização automática desabilitada</strong><br />
              Configure VITE_API_FOOTBALL_KEY no .env para habilitar a sincronização automática de resultados.
            </div>
          </div>
        )}

        {matches.length === 0 && (
          <p style={{ color: "var(--texto-suave)" }}>
            Importe o calendário primeiro.
          </p>
        )}
        {matches.map((m) => {
          const r = resultados[m.id] || {};
          return (
            <div className="jogo" key={m.id}>
              <div className="time casa">
                <span className="escudo">{bandeira(m.timeCasa)}</span>
                <span className="nome">{m.timeCasa}</span>
              </div>
              <div className="placar">
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={r.casa ?? ""}
                  onChange={(e) => setResLocal(m.id, "casa", e.target.value)}
                />
                <span className="x">×</span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={r.fora ?? ""}
                  onChange={(e) => setResLocal(m.id, "fora", e.target.value)}
                />
              </div>
              <div className="time fora">
                <span className="nome">{m.timeFora}</span>
                <span className="escudo">{bandeira(m.timeFora)}</span>
              </div>
              <div className="data">
                <button
                  className="btn primario"
                  style={{ width: "auto", padding: "6px 14px", fontSize: "0.8rem" }}
                  onClick={() => salvarResultado(m.id)}
                >
                  Salvar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bloco">
        <h2>Gabarito dos especiais</h2>
        <p style={{ color: "var(--texto-suave)", fontSize: "0.82rem", marginBottom: 6 }}>
          Preencha ao fim da competição. Deve bater (sem diferenciar maiúsculas)
          com o que os participantes escreveram.
        </p>
        {Object.keys(ESPECIAIS_LABEL).map((chave) => (
          <div className="campo" key={chave}>
            <label>{ESPECIAIS_LABEL[chave]}</label>
            <input
              type="text"
              value={gabarito[chave] || ""}
              onChange={(e) => setGab(chave, e.target.value)}
            />
          </div>
        ))}
        <button className="btn azul" style={{ marginTop: 12 }} onClick={salvarGabarito}>
          Salvar gabarito
        </button>
      </div>

      {msg && <div className="toast">{msg}</div>}
    </>
  );
}
