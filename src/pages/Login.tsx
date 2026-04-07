import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { apiCall, setToken } from "@/hooks/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [loginForm, setLoginForm] = useState({ login: "", password: "" });
  const [regForm, setRegForm] = useState({ email: "", username: "", password: "", steam_id: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await apiCall("login", loginForm);
    const data = await res.json();
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    setToken(data.token);
    navigate(data.role === "admin" ? "/cp" : "/dashboard");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await apiCall("register", regForm);
    const data = await res.json();
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    setToken(data.token);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center px-4" style={{ backgroundColor: "var(--dark-bg)" }}>
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <span className="font-orbitron font-bold text-xl" style={{ color: "var(--neon-cyan)" }}>
            CS<span style={{ color: "var(--neon-magenta)" }}>STORE</span>
          </span>
        </Link>

        <div className="cyber-card p-7">
          {/* TABS */}
          <div className="flex mb-6 gap-1" style={{ borderBottom: "1px solid rgba(0,245,255,0.1)", paddingBottom: "0" }}>
            {(["login", "register"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setError(""); }}
                className="flex-1 pb-3 font-orbitron text-xs transition-all"
                style={{
                  color: tab === t ? "var(--neon-cyan)" : "rgba(200,240,255,0.35)",
                  borderBottom: tab === t ? "2px solid var(--neon-cyan)" : "2px solid transparent",
                  marginBottom: "-1px",
                }}>
                {t === "login" ? "ВОЙТИ" : "РЕГИСТРАЦИЯ"}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <div className="font-exo text-xs mb-1.5" style={{ color: "rgba(200,240,255,0.4)", letterSpacing: 2 }}>EMAIL ИЛИ НИК</div>
                <input type="text" value={loginForm.login} onChange={e => setLoginForm(f => ({ ...f, login: e.target.value }))}
                  placeholder="player@mail.ru" required
                  className="w-full px-4 py-2.5 font-exo text-sm rounded-sm outline-none"
                  style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.2)", color: "rgba(200,240,255,0.9)", caretColor: "var(--neon-cyan)" }} />
              </div>
              <div>
                <div className="font-exo text-xs mb-1.5" style={{ color: "rgba(200,240,255,0.4)", letterSpacing: 2 }}>ПАРОЛЬ</div>
                <input type="password" value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••" required
                  className="w-full px-4 py-2.5 font-exo text-sm rounded-sm outline-none"
                  style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.2)", color: "rgba(200,240,255,0.9)", caretColor: "var(--neon-cyan)" }} />
              </div>
              {error && <div className="px-3 py-2 font-exo text-xs" style={{ background: "rgba(255,0,0,0.07)", border: "1px solid rgba(255,0,0,0.25)", color: "#ff6b6b", borderRadius: 2 }}>{error}</div>}
              <button type="submit" disabled={loading}
                className="neon-btn-cyan w-full py-3 font-orbitron text-sm rounded-sm flex items-center justify-center gap-2 mt-2"
                style={{ opacity: loading ? 0.7 : 1 }}>
                {loading ? <Icon name="Loader" size={15} className="animate-spin" /> : <Icon name="LogIn" size={15} />}
                ВОЙТИ
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <div className="font-exo text-xs mb-1.5" style={{ color: "rgba(200,240,255,0.4)", letterSpacing: 2 }}>EMAIL</div>
                <input type="email" value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="player@mail.ru" required
                  className="w-full px-4 py-2.5 font-exo text-sm rounded-sm outline-none"
                  style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.2)", color: "rgba(200,240,255,0.9)", caretColor: "var(--neon-cyan)" }} />
              </div>
              <div>
                <div className="font-exo text-xs mb-1.5" style={{ color: "rgba(200,240,255,0.4)", letterSpacing: 2 }}>НИК</div>
                <input type="text" value={regForm.username} onChange={e => setRegForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="CoolPlayer" required
                  className="w-full px-4 py-2.5 font-exo text-sm rounded-sm outline-none"
                  style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.2)", color: "rgba(200,240,255,0.9)", caretColor: "var(--neon-cyan)" }} />
              </div>
              <div>
                <div className="font-exo text-xs mb-1.5" style={{ color: "rgba(200,240,255,0.4)", letterSpacing: 2 }}>STEAM ID <span style={{ opacity: 0.4 }}>(необязательно)</span></div>
                <input type="text" value={regForm.steam_id} onChange={e => setRegForm(f => ({ ...f, steam_id: e.target.value }))}
                  placeholder="STEAM_0:0:12345678"
                  className="w-full px-4 py-2.5 font-exo text-sm rounded-sm outline-none"
                  style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.2)", color: "rgba(200,240,255,0.9)", caretColor: "var(--neon-cyan)" }} />
              </div>
              <div>
                <div className="font-exo text-xs mb-1.5" style={{ color: "rgba(200,240,255,0.4)", letterSpacing: 2 }}>ПАРОЛЬ</div>
                <input type="password" value={regForm.password} onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Минимум 6 символов" required
                  className="w-full px-4 py-2.5 font-exo text-sm rounded-sm outline-none"
                  style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.2)", color: "rgba(200,240,255,0.9)", caretColor: "var(--neon-cyan)" }} />
              </div>
              {error && <div className="px-3 py-2 font-exo text-xs" style={{ background: "rgba(255,0,0,0.07)", border: "1px solid rgba(255,0,0,0.25)", color: "#ff6b6b", borderRadius: 2 }}>{error}</div>}
              <button type="submit" disabled={loading}
                className="neon-btn-magenta w-full py-3 font-orbitron text-sm rounded-sm flex items-center justify-center gap-2 mt-2"
                style={{ opacity: loading ? 0.7 : 1 }}>
                {loading ? <Icon name="Loader" size={15} className="animate-spin" /> : <Icon name="UserPlus" size={15} />}
                ЗАРЕГИСТРИРОВАТЬСЯ
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-5 font-exo text-xs" style={{ color: "rgba(200,240,255,0.25)" }}>
          <Link to="/" className="hover:opacity-60 transition-opacity">← Вернуться в магазин</Link>
        </div>
      </div>
    </div>
  );
}
