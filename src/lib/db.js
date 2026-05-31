import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";

// ---- Config global (data de trava) ----
export async function getConfig() {
  const snap = await getDoc(doc(db, "config", "global"));
  return snap.exists() ? snap.data() : null;
}

export async function setConfig(data) {
  // Garante que travaGruposTimestamp seja inteiro (Firestore distingue int de float)
  const normalized = { ...data };
  if (normalized.travaGruposTimestamp != null) {
    normalized.travaGruposTimestamp = Math.floor(normalized.travaGruposTimestamp);
  }
  await setDoc(doc(db, "config", "global"), normalized, { merge: true });
}

// ---- Usuario ----
const ADMIN_EMAILS = ["mathersonvieira20@gmail.com"];

export async function ensureUser(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const isAdmin = ADMIN_EMAILS.includes(user.email);

  if (!snap.exists()) {
    await setDoc(ref, {
      nome: user.displayName || "Sem nome",
      foto: user.photoURL || "",
      email: user.email || "",
      isAdmin: isAdmin,
    });
    return { nome: user.displayName, foto: user.photoURL, email: user.email, isAdmin: isAdmin };
  }

  // Atualiza isAdmin se o email estiver na lista de admins
  const userData = snap.data();
  if (userData.isAdmin !== isAdmin) {
    await setDoc(ref, { isAdmin: isAdmin }, { merge: true });
    userData.isAdmin = isAdmin;
  }

  return userData;
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

// ---- Jogos ----
export async function getMatches() {
  const q = query(collection(db, "matches"), orderBy("dataHora", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveMatch(id, data) {
  await setDoc(doc(db, "matches", id), data, { merge: true });
}

// ---- Palpites ----
export async function getBets(uid) {
  const snap = await getDoc(doc(db, "bets", uid));
  return snap.exists() ? snap.data() : { jogos: {}, especiais: {} };
}

export async function getAllBets() {
  const snap = await getDocs(collection(db, "bets"));
  const out = {};
  snap.docs.forEach((d) => {
    out[d.id] = d.data();
  });
  return out;
}

export async function saveBets(uid, data) {
  await setDoc(doc(db, "bets", uid), data, { merge: true });
}

// ---- Resultados oficiais ----
export async function getResults() {
  const snap = await getDocs(collection(db, "results"));
  const out = {};
  let gabaritoEspeciais = null;
  snap.docs.forEach((d) => {
    if (d.id === "_especiais") gabaritoEspeciais = d.data();
    else out[d.id] = d.data();
  });
  return { resultados: out, gabaritoEspeciais };
}

export async function saveResult(matchId, data) {
  await setDoc(doc(db, "results", matchId), data, { merge: true });
}

export async function saveGabaritoEspeciais(data) {
  await setDoc(doc(db, "results", "_especiais"), data, { merge: true });
}
