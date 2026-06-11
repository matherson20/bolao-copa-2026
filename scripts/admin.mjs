/**
 * Ferramenta de administração do Firestore via Firebase Admin SDK.
 *
 * Usa a chave de service account em ./serviceAccount.json (ignorada pelo git).
 * Acesso de admin — ignora as regras do Firestore. Uso LOCAL apenas.
 *
 * Uso:
 *   node scripts/admin.mjs results:list
 *   node scripts/admin.mjs results:del <id> [<id> ...]
 *   node scripts/admin.mjs results:clear            (apaga TODOS os placares,
 *                                                    preserva o gabarito _especiais)
 *   node scripts/admin.mjs config:get
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(__dirname, "..");
const KEY_PATH = resolve(RAIZ, "serviceAccount.json");

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(KEY_PATH, "utf8"));
} catch {
  console.error(`❌ Não encontrei/li ${KEY_PATH}. Gere a chave no Firebase Console (Configurações > Contas de serviço) e salve como serviceAccount.json na raiz.`);
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const [cmd, ...args] = process.argv.slice(2);

async function resultsList() {
  const snap = await db.collection("results").get();
  if (snap.empty) {
    console.log("(coleção 'results' vazia)");
    return;
  }
  console.log(`results — ${snap.size} documento(s):`);
  snap.docs.forEach((d) => {
    const v = d.data();
    const placar = v.casa != null && v.fora != null ? `${v.casa}×${v.fora}` : JSON.stringify(v);
    console.log(`  • ${d.id}  →  ${placar}${v.fonte ? ` (${v.fonte})` : ""}`);
  });
}

async function resultsDel(ids) {
  if (!ids.length) {
    console.error("Informe ao menos um id: node scripts/admin.mjs results:del <id> ...");
    process.exit(1);
  }
  for (const id of ids) {
    await db.collection("results").doc(id).delete();
    console.log(`🗑️  apagado results/${id}`);
  }
}

async function resultsClear() {
  const snap = await db.collection("results").get();
  let n = 0;
  for (const d of snap.docs) {
    if (d.id === "_especiais") continue; // preserva o gabarito dos especiais
    await d.ref.delete();
    n++;
  }
  console.log(`🗑️  ${n} placar(es) apagado(s). Gabarito _especiais preservado.`);
}

async function configGet() {
  const d = await db.collection("config").doc("global").get();
  console.log(d.exists ? d.data() : "(config/global não existe)");
}

const COMANDOS = {
  "results:list": () => resultsList(),
  "results:del": () => resultsDel(args),
  "results:clear": () => resultsClear(),
  "config:get": () => configGet(),
};

const fn = COMANDOS[cmd];
if (!fn) {
  console.error("Comando desconhecido. Disponíveis:\n  " + Object.keys(COMANDOS).join("\n  "));
  process.exit(1);
}

fn()
  .then(() => process.exit(0))
  .catch((e) => { console.error("Erro:", e.message); process.exit(1); });
