import { useAuth } from "../lib/useAuth.jsx";

export default function Login() {
  const { login } = useAuth();
  return (
    <div className="login-tela">
      <div className="logo">🏆⚽</div>
      <h1>Bolão Copa 2026</h1>
      <p>Dê seus palpites, acerte os placares e dispute o ranking com a galera.</p>
      <button className="btn-google" onClick={login}>
        <span>🔑</span> Entrar com Google
      </button>
    </div>
  );
}
