/**
 * BOLÃO COPA 2026 — Script de preenchimento para testes
 *
 * Como usar:
 *   1. Abra o app no navegador e faça login
 *   2. Abra o DevTools (F12) → aba Console
 *   3. Cole este script inteiro e pressione Enter
 *
 * O que ele faz:
 *   - Gera placares aleatórios para todos os 72 jogos da fase de grupos
 *   - Preenche 1×0 para todos os jogos do mata-mata (32-avos até a final)
 *   - Salva direto no Firestore usando o Firebase já carregado pela app
 *   - Recarrega a página automaticamente
 */
(async () => {
  // ── Localiza o Firestore já inicializado pela app ─────────────────────────
  // O Vite expõe os módulos ES via import() dinâmico. Mas o Firebase SDK
  // também registra a instância globalmente em window.__FIREBASE_DEFAULTS__
  // e no registry interno. Usamos a referência que a própria app já criou.

  // Estratégia: acessar via o registry público do Firebase SDK v10
  let db, uid;
  try {
    // O SDK Firebase v10 registra apps em globalThis[Symbol.for("firebase-apps")]
    const appsSymbol = Object.getOwnPropertySymbols(globalThis)
      .find(s => s.toString().includes("firebase-apps"));
    const appsMap = appsSymbol ? globalThis[appsSymbol] : null;
    const app = appsMap ? [...appsMap.values()][0] : null;

    if (!app) throw new Error("App não encontrado no registry");

    // Pega as instâncias de serviço registradas
    const servicesSymbol = Object.getOwnPropertySymbols(app)
      .find(s => s.toString().includes("services") || s.toString().includes("_services"));

    // Fallback: tentar via _delegate
    const appDelegate = app._delegate || app;

    // Tenta via containers do modular SDK
    const container = appDelegate._container || appDelegate.container;
    if (container) {
      const firestoreProvider = container._providers?.get("firestore/lite") ||
                                container._providers?.get("firestore");
      if (firestoreProvider) {
        db = firestoreProvider.getImmediate?.() || firestoreProvider._instance;
      }
    }

    if (!db) throw new Error("Firestore não encontrado via container");

    // Auth
    const authProvider = container?._providers?.get("auth");
    const auth = authProvider?.getImmediate?.();
    uid = auth?.currentUser?.uid;
    if (!uid) throw new Error("Usuário não autenticado");

    console.log("✅ Firebase conectado. Usuário:", auth.currentUser?.displayName || uid);
  } catch (e) {
    console.warn("⚠️ Não consegui pegar o Firebase pelo registry interno:", e.message);
    console.warn("👉 Tente a estratégia alternativa abaixo (fetch direto via REST API).");
    return;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function slug(s) {
    return (s || "").normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .toLowerCase();
  }

  function rnd(max) { return Math.floor(Math.random() * (max + 1)); }
  function placar() { return { casa: rnd(3), fora: rnd(2) }; }

  // ── Dados dos grupos ───────────────────────────────────────────────────────
  const GRUPOS = {
    A: ["México", "Coreia do Sul", "República Tcheca", "África do Sul"],
    B: ["Canadá", "Suíça", "Catar", "Bósnia e Herzegovina"],
    C: ["Brasil", "Marrocos", "Haiti", "Escócia"],
    D: ["Estados Unidos", "Austrália", "Paraguai", "Turquia"],
    E: ["Alemanha", "Curaçau", "Costa do Marfim", "Equador"],
    F: ["Holanda", "Japão", "Suécia", "Tunísia"],
    G: ["Bélgica", "Egito", "Irã", "Nova Zelândia"],
    H: ["Espanha", "Cabo Verde", "Arábia Saudita", "Uruguai"],
    I: ["França", "Senegal", "Iraque", "Noruega"],
    J: ["Argentina", "Argélia", "Áustria", "Jordânia"],
    K: ["Portugal", "Colômbia", "Rep. Democrática do Congo", "Uzbequistão"],
    L: ["Inglaterra", "Croácia", "Gana", "Panamá"],
  };

  const RODADAS_PARES = [
    { r: 1, pares: [[0,1],[2,3]] },
    { r: 2, pares: [[0,2],[1,3]] },
    { r: 3, pares: [[0,3],[1,2]] },
  ];

  // ── Monta palpites ─────────────────────────────────────────────────────────
  const jogos = {};

  // Fase de grupos: placares aleatórios
  Object.entries(GRUPOS).forEach(([grupo, times]) => {
    RODADAS_PARES.forEach(({ r, pares }) => {
      pares.forEach(([i, j]) => {
        const id = `g-${slug(grupo)}-r${r}-${slug(times[i])}-${slug(times[j])}`;
        jogos[id] = placar();
      });
    });
  });

  // Mata-mata: todos 1×0 (casa vence — garante que próximas fases se gerem)
  const MATA_IDS = [
    ...Array.from({length: 16}, (_, i) => `r32-${i+1}`),
    ...Array.from({length:  8}, (_, i) => `oitavas-${i+1}`),
    ...Array.from({length:  4}, (_, i) => `quartas-${i+1}`),
    "semi-1", "semi-2", "terceiro-lugar", "final",
  ];
  MATA_IDS.forEach(id => { jogos[id] = { casa: 1, fora: 0 }; });

  const especiais = {
    campeao: "Brasil",
    artilheiro: "Vinicius Jr",
    melhorJogador: "Vinicius Jr",
    surpresa: "Marrocos",
  };

  // ── Salva no Firestore ─────────────────────────────────────────────────────
  // Usando a API interna do Firestore SDK já carregado
  const total = Object.keys(jogos).length;
  console.log(`📝 Salvando ${total} palpites…`);

  try {
    // Firestore modular v10 — usa as funções já no escopo do SDK carregado
    // Acessa o _firestoreClient interno para executar uma escrita
    const docRef = db._databaseId
      ? { firestore: db, path: `bets/${uid}` }
      : null;

    // Tenta via método interno _setDoc ou usa workaround via fetch REST
    // Como o SDK já está no bundle da app, tentamos importar do mesmo módulo
    const firestoreModule = await import("/src/lib/db.js").catch(() => null);
    if (firestoreModule?.saveBets) {
      await firestoreModule.saveBets(uid, { jogos, especiais });
      console.log(`✅ Salvo via saveBets! ${total} jogos + especiais`);
    } else {
      throw new Error("saveBets não disponível via import");
    }
  } catch (err) {
    console.warn("Import direto falhou, tentando via REST Firestore API:", err.message);

    // Fallback REST: usa o token do usuário autenticado
    try {
      const tokenResult = await (await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"))
        .getAuth(getApps()[0]).currentUser?.getIdToken();

      if (!tokenResult) throw new Error("Sem token");

      const projectId = db._databaseId?.projectId;
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/bets/${uid}`;

      // Converte para formato Firestore REST
      function toFirestoreValue(v) {
        if (v === null || v === undefined) return { nullValue: null };
        if (typeof v === "number") return { integerValue: String(v) };
        if (typeof v === "string") return { stringValue: v };
        if (typeof v === "boolean") return { booleanValue: v };
        if (typeof v === "object" && !Array.isArray(v)) {
          return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, val]) => [k, toFirestoreValue(val)])) } };
        }
        return { stringValue: String(v) };
      }

      const body = {
        fields: {
          jogos: toFirestoreValue(jogos),
          especiais: toFirestoreValue(especiais),
        }
      };

      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${tokenResult}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      console.log(`✅ Salvo via REST API! ${total} jogos + especiais`);
    } catch (restErr) {
      console.error("❌ Falha no REST também:", restErr.message);
      console.log("💡 Tente recarregar a página e rodar o script novamente.");
      return;
    }
  }

  console.log("─────────────────────────────────────");
  console.log(`  Jogos grupos:   72`);
  console.log(`  Jogos mata-mata: ${MATA_IDS.length}`);
  console.log(`  Total:          ${total}`);
  console.log(`  Campeão:        ${especiais.campeao}`);
  console.log("─────────────────────────────────────");
  console.log("🔄 Recarregando página em 2s…");
  setTimeout(() => location.reload(), 2000);
})();
