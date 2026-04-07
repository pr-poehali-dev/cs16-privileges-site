import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAuth, apiCall, getToken } from "@/hooks/useAuth";

const API = "https://functions.poehali.dev/38bb9bf3-757f-4249-a2d5-9154b2397cf9";

type Order = { id: number; player_id: string; privilege: string; amount: number; status: string; created_at: string; activated_at: string | null };
type ChatMsg = { id: number; username: string; message: string; created_at: string; role: string };

const PRIV_COLOR: Record<string, string> = { VIP: "var(--neon-cyan)", PREMIUM: "var(--neon-magenta)", ELITE: "#ffd700" };
const STATUS_COLOR: Record<string, string> = { succeeded: "var(--neon-green)", pending: "#ffd700", failed: "#ff6b6b" };
const STATUS_LABEL: Record<string, string> = { succeeded: "Активна", pending: "Ожидает", failed: "Ошибка" };

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"profile" | "orders" | "chat">("profile");

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (tab === "orders" && orders.length === 0) loadOrders();
    if (tab === "chat") loadChat();
  }, [tab]);

  useEffect(() => {
    if (tab === "chat") {
      const t = setInterval(loadChat, 5000);
      return () => clearInterval(t);
    }
  }, [tab]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const loadOrders = async () => {
    setOrdersLoading(true);
    const res = await fetch(`${API}?action=orders_get`, { headers: { "X-Session-Token": getToken() } });
    const data = await res.json();
    setOrders(data.orders || []);
    setOrdersLoading(false);
  };

  const loadChat = async () => {
    setChatLoading(true);
    const res = await fetch(`${API}?action=chat_get`, { headers: { "X-Session-Token": getToken() } });
    const data = await res.json();
    if (Array.isArray(data)) setMessages(data);
    setChatLoading(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput("");
    const res = await apiCall("chat_send", { message: msg });
    const data = await res.json();
    if (data.id) setMessages(prev => [...prev, data]);
  };

  const handleLogout = async () => { await logout(); navigate("/"); };

  if (loading) return (
    <div className="min-h-screen grid-bg flex items-center justify-center" style={{ backgroundColor: "var(--dark-bg)" }}>
      <Icon name="Loader" size={32} className="animate-spin" style={{ color: "var(--neon-cyan)" }} />
    </div>
  );

  if (!user) return null;

  const lastPrivilege = orders.find(o => o.status === "succeeded");

  return (
    <div className="min-h-screen grid-bg" style={{ backgroundColor: "var(--dark-bg)", color: "#e0f7fa" }}>
      {/* NAV */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 py-3"
        style={{ background: "rgba(6,10,15,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,245,255,0.12)" }}>
        <Link to="/" className="font-orbitron font-bold text-lg" style={{ color: "var(--neon-cyan)" }}>
          CS<span style={{ color: "var(--neon-magenta)" }}>STORE</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="font-exo text-sm" style={{ color: "rgba(200,240,255,0.6)" }}>{user.username}</span>
          {user.role === "admin" && (
            <Link to="/cp" className="font-orbitron text-xs px-3 py-1.5 rounded-sm"
              style={{ border: "1px solid rgba(255,0,170,0.3)", color: "var(--neon-magenta)" }}>АДМИН</Link>
          )}
          <button onClick={handleLogout} className="font-exo text-xs px-3 py-1.5 rounded-sm transition-opacity hover:opacity-70"
            style={{ border: "1px solid rgba(200,240,255,0.12)", color: "rgba(200,240,255,0.4)" }}>Выйти</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* PROFILE HEADER */}
        <div className="cyber-card p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 flex items-center justify-center flex-shrink-0"
            style={{ border: "1px solid var(--neon-cyan)", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", background: "rgba(0,245,255,0.06)" }}>
            <Icon name="User" size={28} style={{ color: "var(--neon-cyan)" }} />
          </div>
          <div className="flex-1">
            <div className="font-orbitron font-bold text-2xl" style={{ color: "var(--neon-cyan)" }}>{user.username}</div>
            <div className="font-exo text-sm mt-0.5" style={{ color: "rgba(200,240,255,0.45)" }}>{user.email}</div>
            {user.steam_id && <div className="font-exo text-xs mt-1" style={{ color: "rgba(200,240,255,0.3)" }}>Steam: {user.steam_id}</div>}
          </div>
          {lastPrivilege && (
            <div className="flex items-center gap-2 px-4 py-2"
              style={{ border: `1px solid ${PRIV_COLOR[lastPrivilege.privilege.toUpperCase()] || "rgba(200,240,255,0.2)"}40`, borderRadius: 2 }}>
              <Icon name="Star" size={14} style={{ color: PRIV_COLOR[lastPrivilege.privilege.toUpperCase()] || "var(--neon-cyan)" }} />
              <span className="font-orbitron text-sm" style={{ color: PRIV_COLOR[lastPrivilege.privilege.toUpperCase()] || "var(--neon-cyan)" }}>
                {lastPrivilege.privilege.toUpperCase()}
              </span>
            </div>
          )}
          <Link to="/" className="neon-btn-magenta font-orbitron text-xs px-4 py-2 rounded-sm whitespace-nowrap">
            КУПИТЬ ПРИВИЛЕГИЮ
          </Link>
        </div>

        {/* TABS */}
        <div className="flex gap-1 mb-6" style={{ borderBottom: "1px solid rgba(0,245,255,0.1)" }}>
          {([["profile", "Профиль", "User"], ["orders", "История", "ShoppingBag"], ["chat", "Чат", "MessageCircle"]] as const).map(([id, label, icon]) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex items-center gap-2 px-5 pb-3 font-exo text-sm transition-all"
              style={{
                color: tab === id ? "var(--neon-cyan)" : "rgba(200,240,255,0.4)",
                borderBottom: tab === id ? "2px solid var(--neon-cyan)" : "2px solid transparent",
                marginBottom: "-1px",
              }}>
              <Icon name={icon} size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* PROFILE TAB */}
        {tab === "profile" && (
          <div className="space-y-4">
            <div className="cyber-card p-5">
              <div className="font-orbitron text-xs mb-4" style={{ color: "rgba(200,240,255,0.35)", letterSpacing: 2 }}>ДАННЫЕ АККАУНТА</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ["Email", user.email, "Mail"],
                  ["Ник", user.username, "User"],
                  ["Steam ID", user.steam_id || "Не указан", "Gamepad2"],
                  ["Роль", user.role === "admin" ? "Администратор" : "Игрок", "Shield"],
                ].map(([label, value, icon]) => (
                  <div key={label as string} className="flex items-center gap-3 p-3" style={{ background: "rgba(0,245,255,0.03)", border: "1px solid rgba(0,245,255,0.08)", borderRadius: 2 }}>
                    <Icon name={icon as string} fallback="User" size={14} style={{ color: "var(--neon-cyan)", flexShrink: 0 }} />
                    <div>
                      <div className="font-exo text-xs" style={{ color: "rgba(200,240,255,0.35)" }}>{label}</div>
                      <div className="font-exo text-sm" style={{ color: "rgba(200,240,255,0.8)" }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="cyber-card p-5">
              <div className="font-orbitron text-xs mb-4" style={{ color: "rgba(200,240,255,0.35)", letterSpacing: 2 }}>МОИ ПРИВИЛЕГИИ</div>
              <Link to="/profile" className="flex items-center gap-2 font-exo text-sm" style={{ color: "var(--neon-cyan)" }}>
                <Icon name="ExternalLink" size={13} />
                Проверить привилегию на сервере CS 1.6
              </Link>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {tab === "orders" && (
          <div className="cyber-card overflow-hidden">
            {ordersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Icon name="Loader" size={24} className="animate-spin" style={{ color: "var(--neon-cyan)" }} />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 font-exo text-sm" style={{ color: "rgba(200,240,255,0.3)" }}>
                Покупок пока нет
                <div className="mt-3"><Link to="/" className="neon-btn-cyan font-orbitron text-xs px-4 py-2 rounded-sm inline-block">КУПИТЬ ПРИВИЛЕГИЮ</Link></div>
              </div>
            ) : (
              <table className="w-full font-exo text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(0,245,255,0.1)" }}>
                    {["Привилегия", "Steam ID", "Сумма", "Статус", "Дата"].map(h => (
                      <th key={h} className="text-left px-5 py-3 font-orbitron text-xs" style={{ color: "rgba(200,240,255,0.3)", letterSpacing: 1 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={o.id} style={{ borderBottom: "1px solid rgba(0,245,255,0.05)", background: i % 2 === 0 ? "transparent" : "rgba(0,245,255,0.01)" }}>
                      <td className="px-5 py-3">
                        <span className="font-orbitron text-xs px-2 py-1" style={{ border: `1px solid ${PRIV_COLOR[o.privilege.toUpperCase()] || "rgba(200,240,255,0.2)"}40`, color: PRIV_COLOR[o.privilege.toUpperCase()] || "var(--neon-cyan)", borderRadius: 2 }}>
                          {o.privilege.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3" style={{ color: "rgba(200,240,255,0.6)" }}>{o.player_id}</td>
                      <td className="px-5 py-3 font-orbitron text-xs" style={{ color: "var(--neon-cyan)" }}>{o.amount}₽</td>
                      <td className="px-5 py-3">
                        <span className="font-exo text-xs" style={{ color: STATUS_COLOR[o.status] || "rgba(200,240,255,0.4)" }}>
                          {STATUS_LABEL[o.status] || o.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-exo text-xs" style={{ color: "rgba(200,240,255,0.35)" }}>
                        {new Date(o.created_at).toLocaleDateString("ru")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* CHAT TAB */}
        {tab === "chat" && (
          <div className="cyber-card flex flex-col" style={{ height: "500px" }}>
            <div className="px-5 py-3 font-orbitron text-xs" style={{ borderBottom: "1px solid rgba(0,245,255,0.1)", color: "rgba(200,240,255,0.35)", letterSpacing: 2 }}>
              ЧАТ ИГРОКОВ
            </div>
            <div ref={chatRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {chatLoading && messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <Icon name="Loader" size={20} className="animate-spin" style={{ color: "var(--neon-cyan)" }} />
                </div>
              )}
              {messages.map(m => (
                <div key={m.id} className={`flex gap-2 ${m.username === user.username ? "flex-row-reverse" : ""}`}>
                  <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center font-orbitron text-xs"
                    style={{ border: `1px solid ${m.role === "admin" ? "var(--neon-magenta)" : "rgba(0,245,255,0.3)"}`, color: m.role === "admin" ? "var(--neon-magenta)" : "var(--neon-cyan)", borderRadius: "50%", fontSize: 10 }}>
                    {m.username[0].toUpperCase()}
                  </div>
                  <div className={`max-w-xs ${m.username === user.username ? "items-end" : "items-start"} flex flex-col`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-exo text-xs font-medium" style={{ color: m.role === "admin" ? "var(--neon-magenta)" : "var(--neon-cyan)" }}>
                        {m.username}
                      </span>
                      {m.role === "admin" && <span className="font-orbitron text-[9px] px-1" style={{ border: "1px solid var(--neon-magenta)", color: "var(--neon-magenta)", borderRadius: 2 }}>ADMIN</span>}
                      <span className="font-exo text-[10px]" style={{ color: "rgba(200,240,255,0.25)" }}>
                        {new Date(m.created_at).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="px-3 py-2 font-exo text-sm"
                      style={{
                        background: m.username === user.username ? "rgba(0,245,255,0.08)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${m.username === user.username ? "rgba(0,245,255,0.15)" : "rgba(200,240,255,0.08)"}`,
                        borderRadius: 4,
                        color: "rgba(200,240,255,0.85)",
                        wordBreak: "break-word",
                      }}>
                      {m.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="flex gap-2 p-4" style={{ borderTop: "1px solid rgba(0,245,255,0.1)" }}>
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Напиши сообщение..."
                maxLength={500}
                className="flex-1 px-4 py-2.5 font-exo text-sm rounded-sm outline-none"
                style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.2)", color: "rgba(200,240,255,0.9)", caretColor: "var(--neon-cyan)" }}
              />
              <button type="submit" className="neon-btn-cyan font-orbitron text-xs px-4 py-2.5 rounded-sm">
                <Icon name="Send" size={15} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
