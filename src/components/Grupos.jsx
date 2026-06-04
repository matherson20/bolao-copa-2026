import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/useAuth.jsx";
import { getBets, saveBets, getConfig } from "../lib/db";
import { bandeira } from "../lib/teams";
import { ESPECIAIS_LABEL, PONTOS_ESPECIAIS } from "../lib/scoring";
import { gerarJogosFaseGrupos, getTodasSelecoes } from "../lib/seedData";
import { calcularClassificacaoGrupo } from "../lib/classificacao";
import SelectBusca from "./SelectBusca.jsx";
import { soDigitosKeyDown, soDigitosPaste } from "../lib/inputs";
import { JOGADORES_2026 } from "../lib/players2026";

const JOGOS_GRUPOS = gerarJogosFaseGrupos();
const SELECOES = getTodasSelecoes();

// Opções de jogador para os dropdowns de artilheiro/melhor jogador.
// value único e auto-descritivo: "Nome (Seleção)". É exatamente o que é salvo
// e comparado com o gabarito, garantindo validação sem divergência.
const JOGADORES_OPCOES = JOGADORES_2026.map((j) => ({
  value: `${j.nome} (${j.selecao})`,
  label: j.nome,
  sub: j.selecao,
}));

// Quais especiais usam lista de jogador (resto usa lista de seleção)
const ESPECIAIS_DE_JOGADOR = new Set(["artilheiro", "melhorJogador"]);

// Dica curta por palpite especial (texto auxiliar)
const ESPECIAIS_PLACEHOLDER = {
  campeao: "Escolha a seleção campeã",
  artilheiro: "Busque o jogador artilheiro",
  melhorJogador: "Busque o melhor jogador",
  surpresa: "Seleção que vai mais longe que o esperado",
  decepcao: "Seleção forte que vai decepcionar",
};

// Ícone de cada palpite especial
const ESPECIAIS_ICONE = {
  campeao: "🏆",
  artilheiro: "⚽",
  melhorJogador: "⭐",
  surpresa: "🚀",
  decepcao: "💤",
};

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
                <div className="tab-time-inner">
                  <span className="tab-bandeira">{bandeira(time.time)}</span>
                  <span className="tab-nome">{time.time}</span>
                </div>
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
          type="number" min="0" inputMode="numeric" maxLength={2}
          onKeyDown={soDigitosKeyDown} onPaste={soDigitosPaste}
          value={p.casa ?? ""} disabled={travado}
          onChange={(e) => onChange("casa", e.target.value)}
        />
        <span className="jr-x">×</span>
        <input
          type="number" min="0" inputMode="numeric" maxLength={2}
          onKeyDown={soDigitosKeyDown} onPaste={soDigitosPaste}
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
  const [sujo, setSujo] = useState(false); // há alterações não salvas?

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

  // Avisa o usuário se ele tentar sair com palpites não salvos
  useEffect(() => {
    if (!sujo) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [sujo]);

  const GRUPOS_LISTA = useMemo(() => {
    const map = {};
    JOGOS_GRUPOS.forEach((m) => { (map[m.grupo] = map[m.grupo] || []).push(m); });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

  const travado = travaTs ? Date.now() >= new Date(travaTs).getTime() : false;

  function setGol(id, lado, valor) {
    const v = valor === "" ? null : Math.max(0, parseInt(valor, 10) || 0);
    setPalpites((p) => ({ ...p, [id]: { ...(p[id] || {}), [lado]: v } }));
    setSujo(true);
  }

  function setEspecial(chave, valor) {
    setEspeciais((p) => ({ ...p, [chave]: valor }));
    setSujo(true);
  }

  async function salvar() {
    if (travado) return;
    setSalvando(true);
    try {
      await saveBets(user.uid, { jogos: palpites, especiais });
      setSujo(false);
      setToast("Palpites salvos!");
      setTimeout(() => setToast(""), 2200);
    } catch (e) {
      console.error(e);
      setToast("Erro ao salvar. Tente de novo.");
      setTimeout(() => setToast(""), 2600);
    } finally { setSalvando(false); }
  }

  const ESPECIAIS_CHAVES = Object.keys(ESPECIAIS_LABEL);
  const totalEspeciais = ESPECIAIS_CHAVES.length;
  const preenchidosEspeciais = ESPECIAIS_CHAVES.filter(
    (c) => (especiais[c] || "").trim() !== ""
  ).length;

  const totalJogos = JOGOS_GRUPOS.length;
  const preenchidos = JOGOS_GRUPOS.filter((m) => {
    const p = palpites[m.id];
    return p && p.casa != null && p.fora != null;
  }).length;

  const totalGeral = totalJogos + totalEspeciais;
  const feitoGeral = preenchidos + preenchidosEspeciais;
  const pctGeral = totalGeral ? Math.round((feitoGeral / totalGeral) * 100) : 0;

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

      {/* PROGRESSO GERAL */}
      <div className="progresso-geral">
        <div className="pg-topo">
          <span className="pg-label">Seu progresso</span>
          <span className="pg-num">{feitoGeral}/{totalGeral} · {pctGeral}%</span>
        </div>
        <div className="pg-barra">
          <div className="pg-preenchido" style={{ width: `${pctGeral}%` }} />
        </div>
      </div>

      {/* ESPECIAIS */}
      <div className="secao">
        <SecaoHeader icone="🌟" titulo="Palpites Especiais"
          subtitulo="Campeão, artilheiro, surpresa e mais — pontos bônus"
          aberta={secoes.especiais} onToggle={() => setSecoes(s => ({ ...s, especiais: !s.especiais }))}
          badge={`${preenchidosEspeciais}/${totalEspeciais}`} />
        {secoes.especiais && (
          <div className="secao-corpo">
            <div className="especiais-grid">
              {Object.keys(ESPECIAIS_LABEL).map((chave) => {
                const preenchido = (especiais[chave] || "").trim() !== "";
                return (
                  <div className={`especial-card${preenchido ? " preenchido" : ""}`} key={chave}>
                    <div className="especial-topo">
                      <span className="especial-icone">{ESPECIAIS_ICONE[chave] || "🌟"}</span>
                      <div className="especial-info">
                        <span className="especial-nome">{ESPECIAIS_LABEL[chave]}</span>
                        <span className="especial-pts">+{PONTOS_ESPECIAIS[chave]} pts</span>
                      </div>
                    </div>
                    {ESPECIAIS_DE_JOGADOR.has(chave) ? (
                      <SelectBusca
                        value={especiais[chave] || ""}
                        options={JOGADORES_OPCOES}
                        disabled={travado}
                        placeholder={ESPECIAIS_PLACEHOLDER[chave] || "Selecione o jogador"}
                        onChange={(v) => setEspecial(chave, v)}
                      />
                    ) : (
                      <SelectBusca
                        value={especiais[chave] || ""}
                        options={SELECOES}
                        disabled={travado}
                        placeholder={ESPECIAIS_PLACEHOLDER[chave] || "Selecione a seleção"}
                        renderIcon={(t) => bandeira(t)}
                        onChange={(v) => setEspecial(chave, v)}
                      />
                    )}
                  </div>
                );
              })}
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
