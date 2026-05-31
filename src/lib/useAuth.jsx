import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { ensureUser } from "./db";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Importação dinâmica do Firebase para capturar erros de configuração
  const [auth, setAuth] = useState(null);
  const [googleProvider, setGoogleProvider] = useState(null);

  useEffect(() => {
    import("../firebase")
      .then((firebase) => {
        setAuth(firebase.auth);
        setGoogleProvider(firebase.googleProvider);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!auth) return;

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const p = await ensureUser(u);
          setPerfil(p);
        } catch (e) {
          console.error("Erro ao carregar perfil:", e);
        }
      } else {
        setPerfil(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [auth]);

  const login = () => {
    if (!auth || !googleProvider) {
      throw new Error("Firebase não inicializado");
    }
    return signInWithPopup(auth, googleProvider);
  };

  const logout = () => {
    if (!auth) return;
    return fbSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, perfil, loading, login, logout, error }}>
      {error ? (
        <div style={{
          padding: "40px",
          maxWidth: "600px",
          margin: "80px auto",
          backgroundColor: "#fee",
          border: "2px solid #c33",
          borderRadius: "8px",
          fontFamily: "monospace",
          fontSize: "14px",
          lineHeight: "1.6",
          whiteSpace: "pre-wrap"
        }}>
          {error}
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
