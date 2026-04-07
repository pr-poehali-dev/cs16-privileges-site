import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

const ADMIN_URL = "https://functions.poehali.dev/b0afc24c-f985-488f-9662-70cf5b58e654";

type AdminRow = {
  id: number;
  username: string;
  access: string;
  flags: string;
  privilege: string;
};

const PRIV_COLOR: Record<string, string> = {
  VIP: "var(--neon-cyan)",
  PREMIUM: "var(--neon-magenta)",
  ELITE: "#ffd700",
  "Нет": "rgba(200,240,255,0.3)",
};

const PRIV_OPTIONS = ["vip", "premium", "elite"];

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem("admin_token") || "");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [addPrivilege, setAddPrivilege] = useState("vip");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const [editRow, setEditRow] = useState<AdminRow | null>(null);
  const [editPrivilege, setEditPrivilege] = useState("vip");
  const [editLoading, setEditLoading] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const apiFetch = useCallback(
    (method: string, body?: object, params?: string) =>
      fetch(`${ADMIN_URL}${params ? "?" + params : ""}`, {
        method,
        headers: { "Content-Type": "application/json", "X-Admin-Token": token },
        body: body ? JSON.stringify(body) : undefined,
      }),
    [token]
  );

  const loadAdmins = useCallback(async (q = search, off = offset) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
      if (q) params.set("search", q);
      const res = await apiFetch("GET", undefined, params.toString());
      const data = await res.json();
      setAdmins(data.admins || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, search, offset]);

  const handleLogin = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch(ADMIN_URL, {
        headers: { "X-Admin-Token": token },
      });
      if (res.status === 401) { setAuthError("Неверный пароль"); return; }
      sessionStorage.setItem("admin_token", token);
      setAuthed(true);
    } catch {
      setAuthError("Ошибка соединения");
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (authed) loadAdmins();
  }, [authed]);

  const handleSearch = (v: string) => {
    setSearch(v);
    setOffset(0);
    loadAdmins(v, 0);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await apiFetch("DELETE", { id: deleteId });
      setAdmins((prev) => prev.filter((a) => a.id !== deleteId));
      setTotal((t) => t - 1);
      setDeleteId(null);
      showToast("Привилегия удалена");
    } catch {
      showToast("Ошибка удаления", "err");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!addUsername.trim()) { setAddError("Введи Steam ID или ник"); return; }
    setAddLoading(true);
    setAddError("");
    try {
      const res = await apiFetch("POST", { username: addUsername.trim(), privilege: addPrivilege });
      const data = await res.json();
      if (!data.ok) { setAddError(data.error || "Ошибка"); return; }
      setAddOpen(false);
      setAddUsername("");
      loadAdmins();
      showToast(`Привилегия ${addPrivilege.toUpperCase()} выдана — ${addUsername}`);
    } catch {
      setAddError("Ошибка соединения");
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editRow) return;
    setEditLoading(true);
    try {
      const res = await apiFetch("POST", { username: editRow.username, privilege: editPrivilege });
      const data = await res.json();
      if (data.ok) {
        setAdmins((prev) =>
          prev.map((a) =>
            a.id === editRow.id ? { ...a, privilege: editPrivilege.toUpperCase() } : a
          )
        );
        setEditRow(null);
        showToast("Привилегия изменена");
      }
    } finally {
      setEditLoading(false);
    }
  };

  // LOGIN SCREEN
  if (!authed) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center px-4" style={{ backgroundColor: "var(--dark-bg)" }}>
        <div className="cyber-card w-full max-w-sm p-8 text-center">
          <div
            className="w-16 h-16 mx-auto mb-6 flex items-center justify-center"
            style={{ border: "1px solid var(--neon-magenta)", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", color: "var(--neon-magenta)" }}
          >
            <Icon name="Shield" size={28} />
          </div>
          <div className="font-orbitron font-bold text-xl mb-1" style={{ color: "var(--neon-cyan)" }}>ADMIN</div>
          <div className="font-exo text-xs mb-6" style={{ color: "rgba(200,240,255,0.35)", letterSpacing: 2 }}>ПАНЕЛЬ УПРАВЛЕНИЯ</div>

          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Введи пароль"
            className="w-full px-4 py-3 font-exo text-sm rounded-sm outline-none mb-3"
            style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.2)", color: "rgba(200,240,255,0.9)", caretColor: "var(--neon-cyan)" }}
          />
          {authError && (
            <div className="mb-3 px-3 py-2 font-exo text-xs" style={{ background: "rgba(255,0,0,0.07)", border: "1px solid rgba(255,0,0,0.25)", color: "#ff6b6b", borderRadius: 2 }}>
              {authError}
            </div>
          )}
          <button
            onClick={handleLogin}
            disabled={authLoading}
            className="neon-btn-magenta w-full py-3 font-orbitron text-sm rounded-sm flex items-center justify-center gap-2"
          >
            {authLoading ? <Icon name="Loader" size={15} className="animate-spin" /> : <Icon name="LogIn" size={15} />}
            ВОЙТИ
          </button>
          <Link to="/" className="block mt-4 font-exo text-xs" style={{ color: "rgba(200,240,255,0.25)" }}>← На сайт</Link>
        </div>
      </div>
    );
  }

  // ADMIN PANEL
  return (
    <div className="min-h-screen grid-bg" style={{ backgroundColor: "var(--dark-bg)", color: "#e0f7fa" }}>

      {/* NAV */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 py-3"
        style={{ background: "rgba(6,10,15,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,245,255,0.12)" }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 flex items-center justify-center" style={{ border: "1px solid var(--neon-magenta)", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", color: "var(--neon-magenta)" }}>
            <Icon name="Shield" size={13} />
          </div>
          <span className="font-orbitron font-bold" style={{ color: "var(--neon-cyan)" }}>
            CS<span style={{ color: "var(--neon-magenta)" }}>STORE</span>
            <span className="text-xs ml-2" style={{ color: "rgba(200,240,255,0.4)" }}>ADMIN</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-exo text-xs" style={{ color: "rgba(200,240,255,0.35)" }}>
            Всего: <span style={{ color: "var(--neon-cyan)" }}>{total}</span>
          </span>
          <button
            onClick={() => { sessionStorage.removeItem("admin_token"); setAuthed(false); setToken(""); }}
            className="font-exo text-xs px-3 py-1.5 rounded-sm transition-opacity hover:opacity-70"
            style={{ border: "1px solid rgba(200,240,255,0.15)", color: "rgba(200,240,255,0.4)" }}
          >
            Выйти
          </button>
          <Link to="/" className="font-exo text-xs px-3 py-1.5 rounded-sm" style={{ border: "1px solid rgba(0,245,255,0.2)", color: "rgba(0,245,255,0.6)" }}>
            На сайт
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* STATS */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Всего игроков", value: total, icon: "Users", color: "var(--neon-cyan)" },
            { label: "С привилегиями", value: admins.filter(a => a.privilege !== "Нет").length, icon: "Star", color: "var(--neon-magenta)" },
            { label: "ELITE", value: admins.filter(a => a.privilege === "ELITE").length, icon: "Crown", color: "#ffd700" },
          ].map((s) => (
            <div key={s.label} className="cyber-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                style={{ border: `1px solid ${s.color}30`, background: `${s.color}08`, clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}>
                <Icon name={s.icon} fallback="Star" size={16} style={{ color: s.color }} />
              </div>
              <div>
                <div className="font-orbitron font-bold text-xl" style={{ color: s.color }}>{s.value}</div>
                <div className="font-exo text-xs" style={{ color: "rgba(200,240,255,0.4)" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* TOOLBAR */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(0,245,255,0.4)" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Поиск по Steam ID или нику..."
              className="w-full pl-9 pr-4 py-2.5 font-exo text-sm rounded-sm outline-none"
              style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.2)", color: "rgba(200,240,255,0.9)", caretColor: "var(--neon-cyan)" }}
            />
          </div>
          <button
            onClick={() => loadAdmins()}
            className="neon-btn-cyan font-orbitron text-xs px-4 py-2.5 rounded-sm flex items-center gap-2"
          >
            <Icon name="RefreshCw" size={13} />
            ОБНОВИТЬ
          </button>
          <button
            onClick={() => { setAddOpen(true); setAddError(""); setAddUsername(""); setAddPrivilege("vip"); }}
            className="neon-btn-magenta font-orbitron text-xs px-4 py-2.5 rounded-sm flex items-center gap-2"
          >
            <Icon name="Plus" size={13} />
            ДОБАВИТЬ
          </button>
        </div>

        {/* TABLE */}
        <div className="cyber-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full font-exo text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,245,255,0.12)" }}>
                  {["ID", "ИГРОК", "ПРИВИЛЕГИЯ", "ФЛАГИ", "ДЕЙСТВИЯ"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 font-orbitron text-xs" style={{ color: "rgba(200,240,255,0.35)", letterSpacing: 1 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={5} className="text-center py-12">
                    <Icon name="Loader" size={24} className="animate-spin inline" style={{ color: "var(--neon-cyan)" }} />
                  </td></tr>
                )}
                {!loading && admins.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 font-exo text-sm" style={{ color: "rgba(200,240,255,0.3)" }}>
                    Ничего не найдено
                  </td></tr>
                )}
                {!loading && admins.map((row, i) => (
                  <tr
                    key={row.id}
                    style={{ borderBottom: "1px solid rgba(0,245,255,0.06)", background: i % 2 === 0 ? "transparent" : "rgba(0,245,255,0.015)" }}
                  >
                    <td className="px-5 py-3" style={{ color: "rgba(200,240,255,0.3)", fontFamily: "monospace", fontSize: 12 }}>
                      #{row.id}
                    </td>
                    <td className="px-5 py-3 font-medium" style={{ color: "rgba(200,240,255,0.85)" }}>
                      {row.username}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="px-2.5 py-1 font-orbitron text-xs"
                        style={{
                          border: `1px solid ${PRIV_COLOR[row.privilege] || "rgba(200,240,255,0.2)"}40`,
                          color: PRIV_COLOR[row.privilege] || "rgba(200,240,255,0.4)",
                          background: `${PRIV_COLOR[row.privilege] || "transparent"}10`,
                          borderRadius: 2,
                        }}
                      >
                        {row.privilege}
                      </span>
                    </td>
                    <td className="px-5 py-3" style={{ color: "rgba(200,240,255,0.35)", fontFamily: "monospace", fontSize: 11 }}>
                      {(row.access || "").slice(0, 10)}{(row.access || "").length > 10 ? "…" : ""}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditRow(row); setEditPrivilege(row.privilege.toLowerCase()); }}
                          className="p-1.5 rounded-sm transition-opacity hover:opacity-100"
                          style={{ border: "1px solid rgba(0,245,255,0.2)", color: "var(--neon-cyan)", opacity: 0.7 }}
                          title="Изменить"
                        >
                          <Icon name="Edit" size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteId(row.id)}
                          className="p-1.5 rounded-sm transition-opacity hover:opacity-100"
                          style={{ border: "1px solid rgba(255,80,80,0.25)", color: "#ff6b6b", opacity: 0.7 }}
                          title="Удалить"
                        >
                          <Icon name="Trash2" size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {total > LIMIT && (
            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid rgba(0,245,255,0.08)" }}>
              <span className="font-exo text-xs" style={{ color: "rgba(200,240,255,0.35)" }}>
                {offset + 1}–{Math.min(offset + LIMIT, total)} из {total}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={offset === 0}
                  onClick={() => { const o = Math.max(0, offset - LIMIT); setOffset(o); loadAdmins(search, o); }}
                  className="neon-btn-cyan font-orbitron text-xs px-3 py-1.5 rounded-sm"
                  style={{ opacity: offset === 0 ? 0.3 : 1 }}
                >
                  <Icon name="ChevronLeft" size={13} />
                </button>
                <button
                  disabled={offset + LIMIT >= total}
                  onClick={() => { const o = offset + LIMIT; setOffset(o); loadAdmins(search, o); }}
                  className="neon-btn-cyan font-orbitron text-xs px-3 py-1.5 rounded-sm"
                  style={{ opacity: offset + LIMIT >= total ? 0.3 : 1 }}
                >
                  <Icon name="ChevronRight" size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ADD MODAL */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(6,10,15,0.85)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setAddOpen(false); }}>
          <div className="cyber-card w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="font-orbitron font-bold text-base" style={{ color: "var(--neon-magenta)" }}>ВЫДАТЬ ПРИВИЛЕГИЮ</div>
              <button onClick={() => setAddOpen(false)} style={{ color: "rgba(200,240,255,0.4)" }}><Icon name="X" size={18} /></button>
            </div>
            <div className="font-exo text-xs mb-2" style={{ color: "rgba(200,240,255,0.4)", letterSpacing: 2 }}>STEAM ID / НИК</div>
            <input
              type="text"
              value={addUsername}
              onChange={(e) => setAddUsername(e.target.value)}
              placeholder="STEAM_0:0:12345678"
              className="w-full px-4 py-2.5 font-exo text-sm rounded-sm outline-none mb-4"
              style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.2)", color: "rgba(200,240,255,0.9)", caretColor: "var(--neon-cyan)" }}
            />
            <div className="font-exo text-xs mb-2" style={{ color: "rgba(200,240,255,0.4)", letterSpacing: 2 }}>ТАРИФ</div>
            <div className="flex gap-2 mb-5">
              {PRIV_OPTIONS.map((p) => (
                <button key={p} onClick={() => setAddPrivilege(p)}
                  className="flex-1 py-2 font-orbitron text-xs rounded-sm transition-all"
                  style={{
                    border: `1px solid ${addPrivilege === p ? "var(--neon-cyan)" : "rgba(0,245,255,0.15)"}`,
                    background: addPrivilege === p ? "rgba(0,245,255,0.1)" : "transparent",
                    color: addPrivilege === p ? "var(--neon-cyan)" : "rgba(200,240,255,0.35)",
                  }}>
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
            {addError && <div className="mb-3 px-3 py-2 font-exo text-xs" style={{ background: "rgba(255,0,0,0.07)", border: "1px solid rgba(255,0,0,0.25)", color: "#ff6b6b", borderRadius: 2 }}>{addError}</div>}
            <button onClick={handleAdd} disabled={addLoading}
              className="neon-btn-magenta w-full py-3 font-orbitron text-sm rounded-sm flex items-center justify-center gap-2">
              {addLoading ? <Icon name="Loader" size={14} className="animate-spin" /> : <Icon name="Plus" size={14} />}
              ВЫДАТЬ
            </button>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(6,10,15,0.85)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditRow(null); }}>
          <div className="cyber-card w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="font-orbitron font-bold text-base" style={{ color: "var(--neon-cyan)" }}>ИЗМЕНИТЬ ТАРИФ</div>
              <button onClick={() => setEditRow(null)} style={{ color: "rgba(200,240,255,0.4)" }}><Icon name="X" size={18} /></button>
            </div>
            <div className="font-exo text-sm mb-4" style={{ color: "rgba(200,240,255,0.6)" }}>
              Игрок: <span style={{ color: "var(--neon-cyan)" }}>{editRow.username}</span>
            </div>
            <div className="flex gap-2 mb-5">
              {PRIV_OPTIONS.map((p) => (
                <button key={p} onClick={() => setEditPrivilege(p)}
                  className="flex-1 py-2 font-orbitron text-xs rounded-sm transition-all"
                  style={{
                    border: `1px solid ${editPrivilege === p ? "var(--neon-cyan)" : "rgba(0,245,255,0.15)"}`,
                    background: editPrivilege === p ? "rgba(0,245,255,0.1)" : "transparent",
                    color: editPrivilege === p ? "var(--neon-cyan)" : "rgba(200,240,255,0.35)",
                  }}>
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={handleEdit} disabled={editLoading}
              className="neon-btn-cyan w-full py-3 font-orbitron text-sm rounded-sm flex items-center justify-center gap-2">
              {editLoading ? <Icon name="Loader" size={14} className="animate-spin" /> : <Icon name="Save" size={14} />}
              СОХРАНИТЬ
            </button>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(6,10,15,0.85)", backdropFilter: "blur(8px)" }}>
          <div className="cyber-card w-full max-w-sm p-6 text-center">
            <Icon name="AlertTriangle" size={32} className="mx-auto mb-4" style={{ color: "#ff6b6b" }} />
            <div className="font-orbitron font-bold text-base mb-2" style={{ color: "#ff6b6b" }}>УДАЛИТЬ ПРИВИЛЕГИЮ?</div>
            <p className="font-exo text-sm mb-6" style={{ color: "rgba(200,240,255,0.5)" }}>
              Игрок потеряет все права на сервере. Это действие нельзя отменить.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 font-orbitron text-xs rounded-sm"
                style={{ border: "1px solid rgba(200,240,255,0.15)", color: "rgba(200,240,255,0.5)" }}>
                ОТМЕНА
              </button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 py-2.5 font-orbitron text-xs rounded-sm flex items-center justify-center gap-2"
                style={{ border: "1px solid #ff6b6b", color: "#ff6b6b", background: "rgba(255,107,107,0.08)" }}>
                {deleteLoading ? <Icon name="Loader" size={13} className="animate-spin" /> : <Icon name="Trash2" size={13} />}
                УДАЛИТЬ
              </button>
            </div>
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
            clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
          }}>
          <Icon name={toast.type === "ok" ? "CheckCircle" : "AlertCircle"} size={15} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}
