import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./lib/useAuth.jsx";
import "./styles.css";
import { getAuth } from "firebase/auth";
import { saveBets } from "./lib/db";
import { gerarJogosFaseGrupos } from "./lib/seedData";

// ── Helper de teste acessível via console do DevTools ──────────────────────
// Uso: await bolao.seedPalpites()   → preenche tudo e salva
//      await bolao.limparPalpites() → apaga tudo
window.bolao = {
  async seedPalpites(opcoes = {}) {
    const uid = getAuth().currentUser?.uid;
    if (!uid) { console.error("❌ Faça login primeiro"); return; }

    function rnd(max) { return Math.floor(Math.random() * (max + 1)); }

    const jogos = {};

    // Fase de grupos — placar aleatório (0–3 × 0–2)
    gerarJogosFaseGrupos().forEach((j) => {
      jogos[j.id] = { casa: rnd(3), fora: rnd(2) };
    });

    // Mata-mata — 1×0 casa vence (garante propagação de todos os times)
    [
      ...Array.from({ length: 16 }, (_, i) => `r32-${i + 1}`),
      ...Array.from({ length:  8 }, (_, i) => `oitavas-${i + 1}`),
      ...Array.from({ length:  4 }, (_, i) => `quartas-${i + 1}`),
      "semi-1", "semi-2", "terceiro-lugar", "final",
    ].forEach((id) => { jogos[id] = { casa: 1, fora: 0 }; });

    const especiais = opcoes.especiais ?? {
      campeao: "Brasil",
      artilheiro: "Vinicius Jr",
      melhorJogador: "Vinicius Jr",
      surpresa: "Marrocos",
    };

    console.log(`📝 Salvando ${Object.keys(jogos).length} palpites…`);
    await saveBets(uid, { jogos, especiais });
    console.log("✅ Palpites salvos! Recarregando em 1s…");
    setTimeout(() => location.reload(), 1000);
  },

  async limparPalpites() {
    const uid = getAuth().currentUser?.uid;
    if (!uid) { console.error("❌ Faça login primeiro"); return; }
    await saveBets(uid, { jogos: {}, especiais: {} });
    console.log("🧹 Palpites limpos! Recarregando em 1s…");
    setTimeout(() => location.reload(), 1000);
  },
};

// HashRouter: funciona em GitHub Pages sem configuracao de servidor.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);
