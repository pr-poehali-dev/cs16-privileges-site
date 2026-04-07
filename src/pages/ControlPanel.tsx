import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { useAuth, apiCall, getToken } from "@/hooks/useAuth";

const API = "https://functions.poehali.dev/38bb9bf3-757f-4249-a2d5-9154b2397cf9";

type SiteUser = { id: number; email: string; username: string; steam_id: string | null; role: string; is_banned: boolean; ban_reason: string | null; created_at: string; last_login: string | null };
type Order = { id: number; player_id: string; privilege: string; amount: number; status: string; created_at: string; username: string | null };
type CSAdmin = { id: number; username: string; access: string; privilege: string };
type ChatMsg = { id: number; username: string; message: string; created_at: string; role: string };
type Stats = { total_users: number; total_orders: number; total_revenue: number; by_privilege: Record<string, number>; active_week: number };
type Settings = Record<string, string>;

const PRIV_COLOR: Record<string, string> = { VIP: "var(--neon-cyan)", PREMIUM: "var(--neon-magenta)", ELITE: "#ffd700" };

function apiFetch(action: string, params?: Record<string, string>) {
  const url = new URL(API);
  url.searchParams.set("action", action);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return fetch(url.toString(), { headers: { "X-Session-Token": getToken() } });
}

export default function ControlPanel() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"stats" | "users" | "orders" | "cs" | "chat" | "settings">("stats");

  const [stats, setStats] = useState<Stats | null>(null);
  const [siteUsers, setSiteUsers] = useState<SiteUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersSearch, setUsersSearch] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [csAdmins, setCsAdmins] = useState<CSAdmin[]>([]);
  const [csTotal, setCsTotal] = useState(0);
  const [csSearch, setCsSearch] = useState("");
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [settingsDraft, setSettingsDraft] = useState<Settings>({});
  const [tableLoading, setTableLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const [banModal, setBanModal] = useState<SiteUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [grantModal, setGrantModal] = useState(false);
  const [grantUsername, setGrantUsername] = useState("");
  const [grantPrivilege, setGrantPrivilege] = useState("vip");

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (tab === "stats") loadStats();
    else if (tab === "users") loadUsers();
    else if (tab === "orders") loadOrders();
    else if (tab === "cs") loadCS();
    else if (tab === "chat") loadChat();
    else if (tab === "settings") loadSettings();
  }, [tab]);

  const loadStats = async () => {
    setTableLoading(true);
    const res = await apiFetch("stats");
    const d = await res.json();
    setStats(d);
    setTableLoading(false);
  };

  const loadUsers = async (search = usersSearch) => {
    setTableLoading(true);
    const res = await apiFetch("users_get", search ? { search } : {});
    const d = await res.json();
    setSiteUsers(d.users || []);
    setUsersTotal(d.total || 0);
    setTableLoading(false);
  };

  const loadOrders = async () => {
    setTableLoading(true);
    const res = await apiFetch("orders_get");
    const d = await res.json();
    setOrders(d.orders || []);
    setOrdersTotal(d.total || 0);
    setTableLoading(false);
  };

  const loadCS = async (search = csSearch) => {
    setTableLoading(true);
    const res = await apiFetch("cs_list", search ? { search } : {});
    const d = await res.json();
    setCsAdmins(d.admins || []);
    setCsTotal(d.total || 0);
    setTableLoading(false);
  };

  const loadChat = async () => {
    setTableLoading(true);
    const res = await apiFetch("chat_get", { limit: "100" });
    const d = await res.json();
    if (Array.isArray(d)) setChatMsgs(d.reverse());
    setTableLoading(false);
  };

  const loadSettings = async () => {
    setTableLoading(true);
    const res = await apiFetch("settings_get");
    const d = await res.json();
    setSettings(d);
    setSettingsDraft(d);
    setTableLoading(false);
  };

  const banUser = async () => {
    if (!banModal) return;
    const res = await apiCall("user_ban", { user_id: banModal.id, reason: banReason || "нарушение правил" });
    const d = await res.json();
    if (d.ok) { showToast(`${banModal.username} заблокирован`); setBanModal(null); loadUsers(); }
    else showToast(d.error, "err");
  };

  const unbanUser = async (u: SiteUser) => {
    const res = await apiCall("user_unban", { user_id: u.id });
    const d = await res.json();
    if (d.ok) { showToast(`${u.username} разблокирован`); loadUsers(); }
  };

  const setRole = async (u: SiteUser, role: string) => {
    const res = await apiCall("user_role", { user_id: u.id, role });
    const d = await res.json();
    if (d.ok) { showToast("Роль изменена"); loadUsers(); }
  };

  const grantCS = async () => {
    if (!grantUsername.trim()) return;
    const res = await apiCall("cs_grant", { username: grantUsername.trim(), privilege: grantPrivilege });
    const d = await res.json();
    if (d.ok) { showToast(`Привилегия выдана — ${grantUsername}`); setGrantModal(false); setGrantUsername(""); loadCS(); }
    else showToast(d.error, "err");
  };

  const revokeCS = async (id: number, name: string) => {
    const res = await apiCall("cs_revoke", { id });
    const d = await res.json();
    if (d.ok) { showToast(`Привилегия ${name} отозвана`); loadCS(); }
  };

  const hideMsg = async (id: number) => {
    const res = await apiCall("chat_hide", { id });
    const d = await res.json();
    if (d.ok) { showToast("Сообщение скрыто"); setChatMsgs(prev => prev.filter(m => m.id !== id)); }
  };

  const saveSettings = async () => {
    const res = await apiCall("settings_set", settingsDraft);
    const d = await res.json();
    if (d.ok) showToast("Настройки сохранены");
    else showToast(d.error, "err");
  };

  if (loading) return (
    <div className="min-h-screen grid-bg flex items-center justify-center" style={{ backgroundColor: "var(--dark-bg)" }}>
      <Icon name="Loader" size={32} className="animate-spin" style={{ color: "var(--neon-cyan)" }} />
    </div>
  );

  const TABS = [
    ["stats", "Статистика", "BarChart2"],
    ["users", "Игроки", "Users"],
    ["orders", "Заказы", "ShoppingBag"],
    ["cs", "CS Привилегии", "Shield"],
    ["chat", "Чат", "MessageCircle"],
    ["settings", "Настройки", "Settings"],
  ] as const;

  return (
    <div className="min-h-screen grid-bg" style={{ backgroundColor: "var(--dark-bg)", color: "#e0f7fa" }}>
      {/* NAV */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 py-3"
        style={{ background: "rgba(6,10,15,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,0,170,0.15)" }}>
        <div className="flex items-center gap-3">
          <Link to="/" className="font-orbitron font-bold text-lg" style={{ color: "var(--neon-cyan)" }}>
            CS<span style={{ color: "var(--neon-magenta)" }}>STORE</span>
          </Link>
          <span className="font-exo text-xs px-2 py-0.5" style={{ border: "1px solid rgba(255,0,170,0.3)", color: "var(--neon-magenta)", borderRadius: 2 }}>ADMIN CP</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-exo text-sm hidden sm:block" style={{ color: "rgba(200,240,255,0.5)" }}>{user?.username}</span>
          <Link to="/dashboard" className="font-exo text-xs px-3 py-1.5 rounded-sm" style={{ border: "1px solid rgba(0,245,255,0.2)", color: "rgba(0,245,255,0.6)" }}>Профиль</Link>
          <button onClick={async () => { await logout(); navigate("/"); }}
            className="font-exo text-xs px-3 py-1.5 rounded-sm transition-opacity hover:opacity-70"
            style={{ border: "1px solid rgba(200,240,255,0.12)", color: "rgba(200,240,255,0.4)" }}>Выйти</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* TABS */}
        <div className="flex gap-1 mb-7 overflow-x-auto" style={{ borderBottom: "1px solid rgba(0,245,255,0.1)" }}>
          {TABS.map(([id, label, icon]) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex items-center gap-2 px-4 pb-3 font-exo text-sm whitespace-nowrap transition-all"
              style={{
                color: tab === id ? "var(--neon-magenta)" : "rgba(200,240,255,0.4)",
                borderBottom: tab === id ? "2px solid var(--neon-magenta)" : "2px solid transparent",
                marginBottom: "-1px",
              }}>
              <Icon name={icon} fallback="Star" size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* STATS */}
        {tab === "stats" && (
          <div className="space-y-6">
            {tableLoading ? <div className="flex justify-center py-12"><Icon name="Loader" size={28} className="animate-spin" style={{ color: "var(--neon-cyan)" }} /></div> : stats && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Игроков", value: stats.total_users, icon: "Users", color: "var(--neon-cyan)" },
                    { label: "Заказов", value: stats.total_orders, icon: "ShoppingBag", color: "var(--neon-magenta)" },
                    { label: "Выручка", value: `${stats.total_revenue.toFixed(0)}₽`, icon: "TrendingUp", color: "#ffd700" },
                    { label: "Активны (7д)", value: stats.active_week, icon: "Activity", color: "var(--neon-green)" },
                  ].map(s => (
                    <div key={s.label} className="cyber-card p-5 flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                        style={{ border: `1px solid ${s.color}30`, background: `${s.color}08`, clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)" }}>
                        <Icon name={s.icon} fallback="Star" size={16} style={{ color: s.color }} />
                      </div>
                      <div>
                        <div className="font-orbitron font-bold text-xl" style={{ color: s.color }}>{s.value}</div>
                        <div className="font-exo text-xs" style={{ color: "rgba(200,240,255,0.4)" }}>{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="cyber-card p-5">
                  <div className="font-orbitron text-xs mb-4" style={{ color: "rgba(200,240,255,0.35)", letterSpacing: 2 }}>ПРОДАЖИ ПО ТАРИФАМ</div>
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(stats.by_privilege).map(([priv, count]) => (
                      <div key={priv} className="flex items-center gap-2 px-4 py-2"
                        style={{ border: `1px solid ${PRIV_COLOR[priv.toUpperCase()] || "rgba(200,240,255,0.15)"}30`, borderRadius: 2 }}>
                        <span className="font-orbitron text-sm" style={{ color: PRIV_COLOR[priv.toUpperCase()] || "var(--neon-cyan)" }}>{priv.toUpperCase()}</span>
                        <span className="font-exo text-lg font-bold" style={{ color: "rgba(200,240,255,0.8)" }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* USERS */}
        {tab === "users" && (
          <div>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(0,245,255,0.4)" }} />
                <input value={usersSearch} onChange={e => { setUsersSearch(e.target.value); loadUsers(e.target.value); }}
                  placeholder="Поиск по нику или email..."
                  className="w-full pl-9 pr-4 py-2.5 font-exo text-sm rounded-sm outline-none"
                  style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.2)", color: "rgba(200,240,255,0.9)" }} />
              </div>
              <span className="font-exo text-xs flex items-center px-3" style={{ color: "rgba(200,240,255,0.35)" }}>Всего: {usersTotal}</span>
            </div>
            <div className="cyber-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full font-exo text-sm">
                  <thead><tr style={{ borderBottom: "1px solid rgba(0,245,255,0.1)" }}>
                    {["ID", "Ник", "Email", "Steam ID", "Роль", "Статус", "Действия"].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-orbitron text-xs" style={{ color: "rgba(200,240,255,0.3)", letterSpacing: 1 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {tableLoading && <tr><td colSpan={7} className="text-center py-10"><Icon name="Loader" size={22} className="animate-spin inline" style={{ color: "var(--neon-cyan)" }} /></td></tr>}
                    {!tableLoading && siteUsers.map((u, i) => (
                      <tr key={u.id} style={{ borderBottom: "1px solid rgba(0,245,255,0.05)", background: i % 2 === 0 ? "transparent" : "rgba(0,245,255,0.01)" }}>
                        <td className="px-4 py-2.5" style={{ color: "rgba(200,240,255,0.3)", fontFamily: "monospace", fontSize: 12 }}>#{u.id}</td>
                        <td className="px-4 py-2.5 font-medium" style={{ color: "rgba(200,240,255,0.85)" }}>{u.username}</td>
                        <td className="px-4 py-2.5" style={{ color: "rgba(200,240,255,0.5)", fontSize: 12 }}>{u.email}</td>
                        <td className="px-4 py-2.5" style={{ color: "rgba(200,240,255,0.4)", fontSize: 11, fontFamily: "monospace" }}>{u.steam_id || "—"}</td>
                        <td className="px-4 py-2.5">
                          <select value={u.role} onChange={e => setRole(u, e.target.value)}
                            className="font-exo text-xs px-2 py-1 rounded-sm outline-none"
                            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(0,245,255,0.2)", color: u.role === "admin" ? "var(--neon-magenta)" : "rgba(200,240,255,0.6)" }}>
                            <option value="player">Игрок</option>
                            <option value="admin">Админ</option>
                          </select>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-exo text-xs" style={{ color: u.is_banned ? "#ff6b6b" : "var(--neon-green)" }}>
                            {u.is_banned ? "Заблокирован" : "Активен"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {u.is_banned
                            ? <button onClick={() => unbanUser(u)} className="font-exo text-xs px-2.5 py-1 rounded-sm" style={{ border: "1px solid rgba(0,255,136,0.3)", color: "var(--neon-green)" }}>Разбан</button>
                            : <button onClick={() => { setBanModal(u); setBanReason(""); }} className="font-exo text-xs px-2.5 py-1 rounded-sm" style={{ border: "1px solid rgba(255,107,107,0.3)", color: "#ff6b6b" }}>Бан</button>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ORDERS */}
        {tab === "orders" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="font-exo text-xs" style={{ color: "rgba(200,240,255,0.35)" }}>Всего заказов: {ordersTotal}</span>
            </div>
            <div className="cyber-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full font-exo text-sm">
                  <thead><tr style={{ borderBottom: "1px solid rgba(0,245,255,0.1)" }}>
                    {["#", "Игрок сайта", "Steam ID / Ник", "Тариф", "Сумма", "Статус", "Дата"].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-orbitron text-xs" style={{ color: "rgba(200,240,255,0.3)", letterSpacing: 1 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {tableLoading && <tr><td colSpan={7} className="text-center py-10"><Icon name="Loader" size={22} className="animate-spin inline" style={{ color: "var(--neon-cyan)" }} /></td></tr>}
                    {!tableLoading && orders.map((o, i) => (
                      <tr key={o.id} style={{ borderBottom: "1px solid rgba(0,245,255,0.05)", background: i % 2 === 0 ? "transparent" : "rgba(0,245,255,0.01)" }}>
                        <td className="px-4 py-2.5" style={{ color: "rgba(200,240,255,0.3)", fontFamily: "monospace", fontSize: 11 }}>#{o.id}</td>
                        <td className="px-4 py-2.5" style={{ color: "rgba(200,240,255,0.5)", fontSize: 12 }}>{o.username || "—"}</td>
                        <td className="px-4 py-2.5" style={{ color: "rgba(200,240,255,0.7)" }}>{o.player_id}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-orbitron text-xs px-2 py-0.5" style={{ border: `1px solid ${PRIV_COLOR[o.privilege.toUpperCase()] || "rgba(200,240,255,0.15)"}40`, color: PRIV_COLOR[o.privilege.toUpperCase()] || "var(--neon-cyan)", borderRadius: 2 }}>
                            {o.privilege.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-orbitron text-xs" style={{ color: "var(--neon-cyan)" }}>{o.amount}₽</td>
                        <td className="px-4 py-2.5 font-exo text-xs" style={{ color: o.status === "succeeded" ? "var(--neon-green)" : "#ffd700" }}>
                          {o.status === "succeeded" ? "Оплачен" : o.status}
                        </td>
                        <td className="px-4 py-2.5 font-exo text-xs" style={{ color: "rgba(200,240,255,0.35)" }}>
                          {new Date(o.created_at).toLocaleString("ru")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CS PRIVILEGES */}
        {tab === "cs" && (
          <div>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(0,245,255,0.4)" }} />
                <input value={csSearch} onChange={e => { setCsSearch(e.target.value); loadCS(e.target.value); }}
                  placeholder="Поиск по Steam ID / нику..."
                  className="w-full pl-9 pr-4 py-2.5 font-exo text-sm rounded-sm outline-none"
                  style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.2)", color: "rgba(200,240,255,0.9)" }} />
              </div>
              <button onClick={() => { setGrantModal(true); setGrantUsername(""); setGrantPrivilege("vip"); }}
                className="neon-btn-magenta font-orbitron text-xs px-4 py-2.5 rounded-sm flex items-center gap-2">
                <Icon name="Plus" size={13} />ВЫДАТЬ
              </button>
              <span className="font-exo text-xs flex items-center px-3" style={{ color: "rgba(200,240,255,0.35)" }}>Всего: {csTotal}</span>
            </div>
            <div className="cyber-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full font-exo text-sm">
                  <thead><tr style={{ borderBottom: "1px solid rgba(0,245,255,0.1)" }}>
                    {["ID", "Ник / Steam ID", "Привилегия", "Флаги доступа", "Действия"].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-orbitron text-xs" style={{ color: "rgba(200,240,255,0.3)", letterSpacing: 1 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {tableLoading && <tr><td colSpan={5} className="text-center py-10"><Icon name="Loader" size={22} className="animate-spin inline" style={{ color: "var(--neon-cyan)" }} /></td></tr>}
                    {!tableLoading && csAdmins.map((a, i) => (
                      <tr key={a.id} style={{ borderBottom: "1px solid rgba(0,245,255,0.05)", background: i % 2 === 0 ? "transparent" : "rgba(0,245,255,0.01)" }}>
                        <td className="px-4 py-2.5" style={{ color: "rgba(200,240,255,0.3)", fontFamily: "monospace", fontSize: 11 }}>#{a.id}</td>
                        <td className="px-4 py-2.5 font-medium" style={{ color: "rgba(200,240,255,0.85)" }}>{a.username}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-orbitron text-xs px-2 py-0.5" style={{ border: `1px solid ${PRIV_COLOR[a.privilege] || "rgba(200,240,255,0.15)"}40`, color: PRIV_COLOR[a.privilege] || "rgba(200,240,255,0.4)", borderRadius: 2 }}>
                            {a.privilege}
                          </span>
                        </td>
                        <td className="px-4 py-2.5" style={{ color: "rgba(200,240,255,0.35)", fontFamily: "monospace", fontSize: 11 }}>
                          {(a.access || "").slice(0, 12)}{(a.access || "").length > 12 ? "…" : ""}
                        </td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => revokeCS(a.id, a.username)}
                            className="font-exo text-xs px-2.5 py-1 rounded-sm" style={{ border: "1px solid rgba(255,107,107,0.3)", color: "#ff6b6b" }}>
                            Отозвать
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CHAT */}
        {tab === "chat" && (
          <div className="cyber-card overflow-hidden" style={{ maxHeight: 600 }}>
            <div className="px-5 py-3 font-orbitron text-xs flex items-center justify-between" style={{ borderBottom: "1px solid rgba(0,245,255,0.1)", color: "rgba(200,240,255,0.35)", letterSpacing: 2 }}>
              ЧАТ — МОДЕРАЦИЯ
              <button onClick={loadChat} className="font-exo text-xs flex items-center gap-1" style={{ color: "var(--neon-cyan)" }}>
                <Icon name="RefreshCw" size={12} />Обновить
              </button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
              {tableLoading && <div className="flex justify-center py-8"><Icon name="Loader" size={22} className="animate-spin" style={{ color: "var(--neon-cyan)" }} /></div>}
              {!tableLoading && chatMsgs.map(m => (
                <div key={m.id} className="flex items-start justify-between gap-3 px-5 py-3" style={{ borderBottom: "1px solid rgba(0,245,255,0.05)" }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 font-orbitron text-[10px] w-6 h-6 flex items-center justify-center"
                      style={{ border: `1px solid ${m.role === "admin" ? "var(--neon-magenta)" : "rgba(0,245,255,0.3)"}`, color: m.role === "admin" ? "var(--neon-magenta)" : "var(--neon-cyan)", borderRadius: "50%" }}>
                      {m.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-exo text-xs font-medium" style={{ color: m.role === "admin" ? "var(--neon-magenta)" : "var(--neon-cyan)" }}>{m.username}</span>
                        <span className="font-exo text-[10px]" style={{ color: "rgba(200,240,255,0.25)" }}>{new Date(m.created_at).toLocaleString("ru")}</span>
                      </div>
                      <div className="font-exo text-sm mt-0.5" style={{ color: "rgba(200,240,255,0.75)" }}>{m.message}</div>
                    </div>
                  </div>
                  <button onClick={() => hideMsg(m.id)} className="flex-shrink-0 p-1 transition-opacity hover:opacity-100" style={{ color: "#ff6b6b", opacity: 0.5 }}>
                    <Icon name="EyeOff" size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {tab === "settings" && (
          <div className="space-y-4">
            <div className="cyber-card p-6">
              <div className="font-orbitron text-xs mb-5" style={{ color: "rgba(200,240,255,0.35)", letterSpacing: 2 }}>СЕРВЕР CS 1.6</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                {["cs_server_host", "cs_server_port", "cs_server_name"].map(key => (
                  <div key={key}>
                    <div className="font-exo text-xs mb-1.5" style={{ color: "rgba(200,240,255,0.4)", letterSpacing: 1 }}>{key.replace("cs_server_", "").toUpperCase()}</div>
                    <input value={settingsDraft[key] || ""} onChange={e => setSettingsDraft(d => ({ ...d, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 font-exo text-sm rounded-sm outline-none"
                      style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.2)", color: "rgba(200,240,255,0.9)" }} />
                  </div>
                ))}
              </div>
              <div className="font-orbitron text-xs mb-4 mt-6" style={{ color: "rgba(200,240,255,0.35)", letterSpacing: 2 }}>ЦЕНЫ (₽)</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {["vip_price", "premium_price", "elite_price"].map(key => (
                  <div key={key}>
                    <div className="font-exo text-xs mb-1.5" style={{ color: "rgba(200,240,255,0.4)", letterSpacing: 1 }}>{key.replace("_price", "").toUpperCase()}</div>
                    <input type="number" value={settingsDraft[key] || ""} onChange={e => setSettingsDraft(d => ({ ...d, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 font-exo text-sm rounded-sm outline-none"
                      style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.2)", color: "rgba(200,240,255,0.9)" }} />
                  </div>
                ))}
              </div>
            </div>
            <button onClick={saveSettings} className="neon-btn-magenta font-orbitron text-sm px-6 py-3 rounded-sm flex items-center gap-2">
              <Icon name="Save" size={15} />СОХРАНИТЬ НАСТРОЙКИ
            </button>
          </div>
        )}
      </div>

      {/* BAN MODAL */}
      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(6,10,15,0.85)", backdropFilter: "blur(8px)" }}
          onClick={e => { if (e.target === e.currentTarget) setBanModal(null); }}>
          <div className="cyber-card w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-5">
              <div className="font-orbitron font-bold text-base" style={{ color: "#ff6b6b" }}>ЗАБЛОКИРОВАТЬ</div>
              <button onClick={() => setBanModal(null)} style={{ color: "rgba(200,240,255,0.4)" }}><Icon name="X" size={18} /></button>
            </div>
            <div className="font-exo text-sm mb-4" style={{ color: "rgba(200,240,255,0.6)" }}>
              Игрок: <span style={{ color: "var(--neon-cyan)" }}>{banModal.username}</span>
            </div>
            <input value={banReason} onChange={e => setBanReason(e.target.value)}
              placeholder="Причина (необязательно)"
              className="w-full px-3 py-2.5 font-exo text-sm rounded-sm outline-none mb-4"
              style={{ background: "rgba(255,0,0,0.05)", border: "1px solid rgba(255,107,107,0.25)", color: "rgba(200,240,255,0.9)" }} />
            <div className="flex gap-3">
              <button onClick={() => setBanModal(null)} className="flex-1 py-2.5 font-orbitron text-xs rounded-sm" style={{ border: "1px solid rgba(200,240,255,0.15)", color: "rgba(200,240,255,0.5)" }}>ОТМЕНА</button>
              <button onClick={banUser} className="flex-1 py-2.5 font-orbitron text-xs rounded-sm" style={{ border: "1px solid #ff6b6b", color: "#ff6b6b", background: "rgba(255,107,107,0.08)" }}>ЗАБЛОКИРОВАТЬ</button>
            </div>
          </div>
        </div>
      )}

      {/* GRANT MODAL */}
      {grantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(6,10,15,0.85)", backdropFilter: "blur(8px)" }}
          onClick={e => { if (e.target === e.currentTarget) setGrantModal(false); }}>
          <div className="cyber-card w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-5">
              <div className="font-orbitron font-bold text-base" style={{ color: "var(--neon-magenta)" }}>ВЫДАТЬ ПРИВИЛЕГИЮ CS</div>
              <button onClick={() => setGrantModal(false)} style={{ color: "rgba(200,240,255,0.4)" }}><Icon name="X" size={18} /></button>
            </div>
            <input value={grantUsername} onChange={e => setGrantUsername(e.target.value)}
              placeholder="Steam ID или ник"
              className="w-full px-3 py-2.5 font-exo text-sm rounded-sm outline-none mb-4"
              style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.2)", color: "rgba(200,240,255,0.9)" }} />
            <div className="flex gap-2 mb-5">
              {["vip", "premium", "elite"].map(p => (
                <button key={p} onClick={() => setGrantPrivilege(p)}
                  className="flex-1 py-2 font-orbitron text-xs rounded-sm transition-all"
                  style={{ border: `1px solid ${grantPrivilege === p ? "var(--neon-cyan)" : "rgba(0,245,255,0.15)"}`, background: grantPrivilege === p ? "rgba(0,245,255,0.1)" : "transparent", color: grantPrivilege === p ? "var(--neon-cyan)" : "rgba(200,240,255,0.35)" }}>
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={grantCS} className="neon-btn-magenta w-full py-3 font-orbitron text-sm rounded-sm flex items-center justify-center gap-2">
              <Icon name="Plus" size={14} />ВЫДАТЬ
            </button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 font-exo text-sm"
          style={{
            border: `1px solid ${toast.type === "ok" ? "var(--neon-green)" : "#ff6b6b"}`,
            background: toast.type === "ok" ? "rgba(0,255,136,0.08)" : "rgba(255,107,107,0.08)",
            color: toast.type === "ok" ? "var(--neon-green)" : "#ff6b6b",
            backdropFilter: "blur(8px)",
            clipPath: "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
          }}>
          <Icon name={toast.type === "ok" ? "CheckCircle" : "AlertCircle"} size={15} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}
