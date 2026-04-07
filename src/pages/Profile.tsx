import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Link } from "react-router-dom";

const PROFILE_URL = "https://functions.poehali.dev/65b13c6f-75da-4555-a9de-74772ea504d5";
const CREATE_PAYMENT_URL = "https://functions.poehali.dev/2157a038-a9a8-42cb-8b80-cba2a58fd4a1";

type ProfileData = {
  found: boolean;
  player_id?: string;
  privilege?: string;
  color?: string;
  access?: string;
  flags?: { flag: string; label: string }[];
};

const PRIVILEGE_ORDER: Record<string, number> = { VIP: 1, PREMIUM: 2, ELITE: 3 };

const UPGRADE_MAP: Record<string, { id: string; name: string; price: string } | null> = {
  VIP: { id: "premium", name: "PREMIUM", price: "299" },
  PREMIUM: { id: "elite", name: "ELITE", price: "499" },
  ELITE: null,
};

const colorVar: Record<string, string> = {
  cyan: "var(--neon-cyan)",
  magenta: "var(--neon-magenta)",
  gold: "#ffd700",
  none: "rgba(200,240,255,0.4)",
};

export default function Profile() {
  const [playerId, setPlayerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState("");
  const [buyLoading, setBuyLoading] = useState(false);

  const handleSearch = async () => {
    if (!playerId.trim()) { setError("Введи Steam ID или ник"); return; }
    setLoading(true);
    setError("");
    setProfile(null);
    try {
      const res = await fetch(`${PROFILE_URL}?player_id=${encodeURIComponent(playerId.trim())}`);
      const data = await res.json();
      setProfile(data);
    } catch {
      setError("Ошибка соединения. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (privilegeId: string, privilegeName: string, price: string) => {
    setBuyLoading(true);
    try {
      const res = await fetch(CREATE_PAYMENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privilege: privilegeId, player_id: playerId.trim(), auth_type: "steamid" }),
      });
      const data = await res.json();
      if (data.confirmation_url) {
        window.location.href = data.confirmation_url;
      } else {
        setError(data.error || "Ошибка создания платежа");
      }
    } catch {
      setError("Ошибка соединения.");
    } finally {
      setBuyLoading(false);
    }
  };

  const accentColor = profile?.found ? colorVar[profile.color || "cyan"] : "var(--neon-cyan)";

  return (
    <div className="min-h-screen grid-bg" style={{ backgroundColor: "var(--dark-bg)", color: "#e0f7fa" }}>

      {/* NAV */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
        style={{ background: "rgba(6,10,15,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,245,255,0.15)" }}
      >
        <Link to="/" className="flex items-center gap-3">
          <div
            className="w-8 h-8 flex items-center justify-center"
            style={{ border: "1px solid var(--neon-cyan)", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
          >
            <Icon name="Crosshair" size={14} style={{ color: "var(--neon-cyan)" }} />
          </div>
          <span className="font-orbitron font-bold text-lg" style={{ color: "var(--neon-cyan)" }}>
            CS<span style={{ color: "var(--neon-magenta)" }}>STORE</span>
          </span>
        </Link>
        <Link
          to="/"
          className="font-exo text-sm flex items-center gap-2 transition-opacity hover:opacity-70"
          style={{ color: "rgba(200,240,255,0.5)" }}
        >
          <Icon name="ArrowLeft" size={14} />
          Назад в магазин
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 pt-32 pb-20">

        {/* HEADER */}
        <div className="text-center mb-12">
          <p className="font-exo text-xs mb-3" style={{ color: "var(--neon-magenta)", letterSpacing: "4px" }}>ПРОФИЛЬ</p>
          <h1 className="font-orbitron font-bold text-3xl md:text-4xl mb-3" style={{ color: "var(--neon-cyan)" }}>
            ЛИЧНЫЙ КАБИНЕТ
          </h1>
          <p className="font-exo text-sm" style={{ color: "rgba(200,240,255,0.45)" }}>
            Проверь статус привилегии по Steam ID или нику
          </p>
          <div className="mt-5 h-px max-w-xs mx-auto" style={{ background: "linear-gradient(90deg, transparent, var(--neon-cyan), var(--neon-magenta), var(--neon-cyan), transparent)", opacity: 0.4 }} />
        </div>

        {/* SEARCH */}
        <div className="cyber-card p-6 mb-8">
          <div className="font-exo text-xs mb-3" style={{ color: "rgba(200,240,255,0.5)", letterSpacing: "2px" }}>
            STEAM ID ИЛИ НИК
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="STEAM_0:0:12345678 или ник"
              className="flex-1 px-4 py-3 font-exo text-sm rounded-sm outline-none"
              style={{
                background: "rgba(0,245,255,0.04)",
                border: "1px solid rgba(0,245,255,0.2)",
                color: "rgba(200,240,255,0.9)",
                caretColor: "var(--neon-cyan)",
              }}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="neon-btn-cyan font-orbitron text-xs px-5 py-3 rounded-sm flex items-center gap-2"
              style={{ opacity: loading ? 0.7 : 1, whiteSpace: "nowrap" }}
            >
              {loading
                ? <Icon name="Loader" size={15} className="animate-spin" />
                : <Icon name="Search" size={15} />}
              {loading ? "ПОИСК..." : "НАЙТИ"}
            </button>
          </div>
          {error && (
            <div className="mt-3 px-3 py-2 font-exo text-xs" style={{ background: "rgba(255,0,0,0.07)", border: "1px solid rgba(255,0,0,0.25)", color: "#ff6b6b", borderRadius: 2 }}>
              {error}
            </div>
          )}
          <div className="mt-3 font-exo text-xs" style={{ color: "rgba(200,240,255,0.3)" }}>
            <Icon name="Info" size={11} className="inline mr-1" />
            Узнать Steam ID: введи <span style={{ color: "var(--neon-cyan)" }}>status</span> в консоли CS 1.6
          </div>
        </div>

        {/* RESULT — NOT FOUND */}
        {profile && !profile.found && (
          <div className="cyber-card p-8 text-center mb-8 fade-in-up">
            <div
              className="w-16 h-16 mx-auto mb-4 flex items-center justify-center"
              style={{ border: "1px solid rgba(200,240,255,0.15)", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
            >
              <Icon name="UserX" size={28} style={{ color: "rgba(200,240,255,0.3)" }} />
            </div>
            <div className="font-orbitron font-bold text-lg mb-2" style={{ color: "rgba(200,240,255,0.5)" }}>
              ИГРОК НЕ НАЙДЕН
            </div>
            <p className="font-exo text-sm mb-6" style={{ color: "rgba(200,240,255,0.35)" }}>
              Привилегий для <span style={{ color: "var(--neon-cyan)" }}>{profile.player_id}</span> нет. Хочешь купить?
            </p>
            <Link
              to="/#privileges"
              className="neon-btn-magenta font-orbitron text-xs px-6 py-3 rounded-sm inline-block"
            >
              ВЫБРАТЬ ПРИВИЛЕГИЮ
            </Link>
          </div>
        )}

        {/* RESULT — FOUND */}
        {profile && profile.found && (
          <div className="fade-in-up space-y-5">

            {/* PRIVILEGE CARD */}
            <div
              className="cyber-card p-6"
              style={{ borderColor: `${accentColor}40` }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 flex items-center justify-center"
                    style={{
                      border: `1px solid ${accentColor}`,
                      boxShadow: `0 0 15px ${accentColor}40`,
                      clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                      background: `${accentColor}10`,
                    }}
                  >
                    <Icon
                      name={profile.privilege === "ELITE" ? "Crown" : profile.privilege === "PREMIUM" ? "Zap" : "Star"}
                      fallback="Star"
                      size={24}
                      style={{ color: accentColor }}
                    />
                  </div>
                  <div>
                    <div className="font-orbitron font-black text-2xl" style={{ color: accentColor }}>
                      {profile.privilege}
                    </div>
                    <div className="font-exo text-xs mt-0.5" style={{ color: "rgba(200,240,255,0.4)" }}>
                      {profile.player_id}
                    </div>
                  </div>
                </div>
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 font-exo text-xs"
                  style={{ border: "1px solid rgba(0,255,136,0.4)", color: "var(--neon-green)", borderRadius: 2 }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                  АКТИВНА
                </div>
              </div>

              <div className="h-px mb-5" style={{ background: `linear-gradient(90deg, ${accentColor}30, transparent)` }} />

              {/* FLAGS */}
              {profile.flags && profile.flags.length > 0 && (
                <div>
                  <div className="font-exo text-xs mb-3" style={{ color: "rgba(200,240,255,0.4)", letterSpacing: 2 }}>
                    ДОСТУПНЫЕ ПРАВА
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.flags.map((f) => (
                      <div
                        key={f.flag}
                        className="flex items-center gap-1.5 px-2.5 py-1 font-exo text-xs"
                        style={{
                          border: `1px solid ${accentColor}30`,
                          background: `${accentColor}08`,
                          color: "rgba(200,240,255,0.65)",
                          borderRadius: 2,
                        }}
                      >
                        <span style={{ color: accentColor, fontFamily: "monospace" }}>{f.flag}</span>
                        {f.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* UPGRADE BLOCK */}
            {UPGRADE_MAP[profile.privilege || ""] && (() => {
              const upgrade = UPGRADE_MAP[profile.privilege || ""]!;
              return (
                <div
                  className="cyber-card cyber-card-magenta p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-orbitron text-sm font-bold mb-1" style={{ color: "var(--neon-magenta)" }}>
                      УЛУЧШИ ДО {upgrade.name}
                    </div>
                    <div className="font-exo text-xs" style={{ color: "rgba(200,240,255,0.45)" }}>
                      Получи больше прав и возможностей за {upgrade.price}₽/мес
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpgrade(upgrade.id, upgrade.name, upgrade.price)}
                    disabled={buyLoading}
                    className="neon-btn-magenta font-orbitron text-xs px-5 py-2.5 rounded-sm flex items-center gap-2 whitespace-nowrap"
                  >
                    {buyLoading
                      ? <Icon name="Loader" size={13} className="animate-spin" />
                      : <Icon name="ArrowUp" size={13} />}
                    УЛУЧШИТЬ · {upgrade.price}₽
                  </button>
                </div>
              );
            })()}

            {/* ALREADY ELITE */}
            {profile.privilege === "ELITE" && (
              <div
                className="cyber-card cyber-card-gold p-5 text-center"
              >
                <Icon name="Crown" size={20} className="inline mb-2" style={{ color: "#ffd700" }} />
                <div className="font-orbitron text-sm font-bold" style={{ color: "#ffd700" }}>
                  У тебя максимальная привилегия!
                </div>
                <div className="font-exo text-xs mt-1" style={{ color: "rgba(200,240,255,0.4)" }}>
                  Наслаждайся полными правами на всех серверах
                </div>
              </div>
            )}

            {/* BACK TO STORE */}
            <div className="text-center pt-2">
              <Link
                to="/"
                className="font-exo text-sm transition-opacity hover:opacity-70"
                style={{ color: "rgba(200,240,255,0.35)" }}
              >
                <Icon name="ArrowLeft" size={13} className="inline mr-1" />
                Вернуться в магазин
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
