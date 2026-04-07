import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

const CREATE_PAYMENT_URL = "https://functions.poehali.dev/2157a038-a9a8-42cb-8b80-cba2a58fd4a1";

const privileges = [
  {
    id: "vip",
    name: "VIP",
    price: "149",
    period: "30 дней",
    color: "cyan",
    icon: "Star",
    features: [
      "Резервное место на сервере",
      "Защита от авто-кика (AFK)",
      "Доступ к !ws — скины оружий",
      "Кастомный тег [VIP] в чате",
      "Приоритет в очереди",
    ],
    popular: false,
  },
  {
    id: "premium",
    name: "PREMIUM",
    price: "299",
    period: "30 дней",
    color: "magenta",
    icon: "Zap",
    features: [
      "Всё из VIP",
      "Иммунитет от кика голосованием",
      "Скины ножей (!knife)",
      "Уникальный тег [PREMIUM]",
      "Увеличенный урон +10%",
      "Доступ к VIP-картам",
    ],
    popular: true,
  },
  {
    id: "elite",
    name: "ELITE",
    price: "499",
    period: "30 дней",
    color: "gold",
    icon: "Crown",
    features: [
      "Всё из PREMIUM",
      "Права администратора",
      "Кик / мут игроков",
      "Смена карты голосованием",
      "Персональный тег на выбор",
      "Доступ ко всем серверам",
      "Поддержка 24/7",
    ],
    popular: false,
  },
];

const steps = [
  { icon: "ShoppingCart", title: "Выбери привилегию", desc: "Нажми «Купить» на понравившемся тарифе" },
  { icon: "CreditCard", title: "Оплати удобным способом", desc: "Карта, СБП, криптовалюта — любой способ" },
  { icon: "Zap", title: "Мгновенная активация", desc: "Привилегия активируется автоматически сразу после оплаты" },
  { icon: "Gamepad2", title: "Играй!", desc: "Заходи на сервер и наслаждайся преимуществами" },
];

const faqs = [
  {
    q: "Как быстро активируется привилегия?",
    a: "Мгновенно — сразу после подтверждения оплаты. Не нужно ждать или писать администратору.",
  },
  {
    q: "На каких серверах работает привилегия?",
    a: "VIP и PREMIUM работают на основном сервере. ELITE даёт доступ ко всем серверам проекта.",
  },
  {
    q: "Что делать, если привилегия не активировалась?",
    a: "Напишите нам в Discord или VK — разберёмся в течение 15 минут.",
  },
  {
    q: "Можно ли продлить привилегию заранее?",
    a: "Да, при продлении срок суммируется к текущему — дни не теряются.",
  },
  {
    q: "Какие способы оплаты принимаете?",
    a: "Банковские карты (Visa/MasterCard/МИР), СБП, ЮMoney, QIWI, Bitcoin, USDT.",
  },
];

const servers = [
  { name: "PUBLIC #1", map: "de_dust2", players: "18/24", ping: "12 мс", status: "online" },
  { name: "PUBLIC #2", map: "de_inferno", players: "21/24", ping: "8 мс", status: "online" },
  { name: "DM #1", map: "aim_map", players: "14/20", ping: "10 мс", status: "online" },
];

export default function Index() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState("home");
  const [buyModal, setBuyModal] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [authType, setAuthType] = useState<"steamid" | "nick">("steamid");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(
    typeof window !== "undefined" && window.location.search.includes("payment=success")
  );

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setActiveSection(id);
  };

  const openBuy = (privilegeId: string) => {
    setError("");
    setPlayerId("");
    setBuyModal(privilegeId);
  };

  const handleBuy = async () => {
    if (!playerId.trim()) {
      setError("Введи Steam ID или ник");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(CREATE_PAYMENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privilege: buyModal, player_id: playerId.trim(), auth_type: authType }),
      });
      const data = await res.json();
      if (data.confirmation_url) {
        window.location.href = data.confirmation_url;
      } else {
        setError(data.error || "Ошибка создания платежа");
      }
    } catch {
      setError("Ошибка соединения. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const selectedPrivilege = privileges.find((p) => p.id === buyModal);

  const cardClass = (color: string) => {
    if (color === "magenta") return "cyber-card cyber-card-magenta";
    if (color === "gold") return "cyber-card cyber-card-gold";
    return "cyber-card";
  };

  const badgeColor = (color: string) => {
    if (color === "magenta") return "var(--neon-magenta)";
    if (color === "gold") return "#ffd700";
    return "var(--neon-cyan)";
  };

  const btnClass = (color: string) => {
    if (color === "magenta") return "neon-btn-magenta";
    if (color === "gold")
      return "border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition-all duration-300";
    return "neon-btn-cyan";
  };

  return (
    <div className="min-h-screen grid-bg" style={{ backgroundColor: "var(--dark-bg)", color: "#e0f7fa" }}>

      {/* NAV */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
        style={{
          background: "rgba(6, 10, 15, 0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0,245,255,0.15)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 flex items-center justify-center pulse-cyan"
            style={{ border: "1px solid var(--neon-cyan)", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
          >
            <Icon name="Crosshair" size={14} style={{ color: "var(--neon-cyan)" }} />
          </div>
          <span className="font-orbitron font-bold text-lg" style={{ color: "var(--neon-cyan)" }}>
            CS<span style={{ color: "var(--neon-magenta)" }}>STORE</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-6 font-exo text-sm">
          {[["home", "Главная"], ["privileges", "Привилегии"], ["how", "Как купить"], ["servers", "Серверы"], ["faq", "FAQ"]].map(
            ([id, label]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="transition-all duration-200 hover:opacity-100"
                style={{ color: activeSection === id ? "var(--neon-cyan)" : "rgba(200,240,255,0.6)" }}
              >
                {label}
              </button>
            )
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="font-orbitron text-xs px-4 py-2 rounded-sm transition-all duration-200 hidden sm:block"
            style={{ border: "1px solid rgba(0,245,255,0.25)", color: "rgba(0,245,255,0.7)" }}
          >
            ВОЙТИ
          </Link>
          <Link
            to="/dashboard"
            className="font-orbitron text-xs px-4 py-2 rounded-sm transition-all duration-200 hidden sm:block"
            style={{ border: "1px solid rgba(200,240,255,0.12)", color: "rgba(200,240,255,0.45)" }}
          >
            КАБИНЕТ
          </Link>
          <button
            onClick={() => scrollTo("privileges")}
            className="neon-btn-magenta font-orbitron text-xs px-4 py-2 rounded-sm"
          >
            КУПИТЬ
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section
        id="home"
        className="relative min-h-screen flex items-center justify-center overflow-hidden scanlines"
        style={{ paddingTop: "80px" }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(https://cdn.poehali.dev/projects/111fc9cb-7666-4843-aee6-1d9f078e2a63/files/304ceeaa-32ae-411b-baa2-c9ca41edb4b4.jpg)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.3,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 30% 50%, rgba(0,245,255,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(255,0,170,0.08) 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 text-xs font-exo fade-in-up stagger-1"
            style={{ border: "1px solid rgba(0,255,136,0.4)", color: "var(--neon-green)", borderRadius: "2px" }}
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            СЕРВЕРЫ ОНЛАЙН · 53/68 ИГРОКОВ
          </div>
          <h1
            className="font-orbitron font-black mb-4 fade-in-up stagger-2 glitch-text"
            style={{ fontSize: "clamp(2.5rem, 8vw, 5rem)", lineHeight: 1.1, color: "var(--neon-cyan)" }}
          >
            МАГАЗИН<br />
            <span style={{ color: "var(--neon-magenta)" }}>ПРИВИЛЕГИЙ</span>
          </h1>
          <p className="font-exo text-lg mb-3 fade-in-up stagger-2" style={{ color: "rgba(200,240,255,0.7)" }}>
            Counter-Strike 1.6 · Мгновенная активация
          </p>
          <p className="font-exo mb-10 fade-in-up stagger-3" style={{ color: "rgba(200,240,255,0.5)", fontSize: "0.95rem" }}>
            Получи преимущества на сервере сразу после оплаты — без ожидания, без ручной активации
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 fade-in-up stagger-4">
            <button
              onClick={() => scrollTo("privileges")}
              className="neon-btn-cyan font-orbitron text-sm px-8 py-3 rounded-sm w-full sm:w-auto"
            >
              ВЫБРАТЬ ПРИВИЛЕГИЮ
            </button>
            <button
              onClick={() => scrollTo("how")}
              className="font-exo text-sm px-8 py-3 rounded-sm w-full sm:w-auto transition-all duration-300"
              style={{ border: "1px solid rgba(200,240,255,0.2)", color: "rgba(200,240,255,0.6)" }}
            >
              Как это работает?
            </button>
          </div>
          <div className="flex items-center justify-center gap-8 mt-12 fade-in-up stagger-4">
            {[["500+", "Довольных игроков"], ["3", "Игровых сервера"], ["< 1 мин", "Активация"]].map(([num, label]) => (
              <div key={label} className="text-center">
                <div className="font-orbitron font-bold text-2xl" style={{ color: "var(--neon-cyan)" }}>{num}</div>
                <div className="font-exo text-xs mt-1" style={{ color: "rgba(200,240,255,0.45)" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float" style={{ color: "rgba(0,245,255,0.4)" }}>
          <Icon name="ChevronDown" size={24} />
        </div>
      </section>

      {/* PRIVILEGES */}
      <section id="privileges" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-exo text-xs mb-3" style={{ color: "var(--neon-magenta)", letterSpacing: "4px" }}>КАТАЛОГ</p>
            <h2 className="font-orbitron font-bold text-3xl md:text-4xl" style={{ color: "var(--neon-cyan)" }}>
              ВЫБЕРИ ПРИВИЛЕГИЮ
            </h2>
            <div className="divider-cyber mt-6 max-w-xs mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {privileges.map((priv, i) => (
              <div key={priv.id} className={`${cardClass(priv.color)} p-6 relative`} style={{ animationDelay: `${i * 0.15}s` }}>
                {priv.popular && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 font-orbitron text-xs px-4 py-1"
                    style={{
                      background: "var(--neon-magenta)",
                      color: "#060a0f",
                      clipPath: "polygon(8px 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 8px 100%, 0% 50%)",
                    }}
                  >
                    ПОПУЛЯРНЫЙ
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 flex items-center justify-center"
                    style={{
                      border: `1px solid ${badgeColor(priv.color)}`,
                      color: badgeColor(priv.color),
                      clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                    }}
                  >
                    <Icon name={priv.icon} fallback="Star" size={18} />
                  </div>
                  <div>
                    <div className="font-orbitron font-bold text-lg" style={{ color: badgeColor(priv.color) }}>
                      {priv.name}
                    </div>
                    <div className="font-exo text-xs" style={{ color: "rgba(200,240,255,0.4)" }}>
                      {priv.period}
                    </div>
                  </div>
                </div>

                <div className="mb-5">
                  <span className="font-orbitron font-black text-4xl" style={{ color: badgeColor(priv.color) }}>
                    {priv.price}₽
                  </span>
                  <span className="font-exo text-sm ml-2" style={{ color: "rgba(200,240,255,0.4)" }}>/ месяц</span>
                </div>

                <ul className="space-y-2.5 mb-8">
                  {priv.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 font-exo text-sm" style={{ color: "rgba(200,240,255,0.75)" }}>
                      <Icon name="Check" size={14} className="mt-0.5 flex-shrink-0" style={{ color: badgeColor(priv.color) }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => openBuy(priv.id)}
                  className={`${btnClass(priv.color)} w-full py-3 font-orbitron text-sm rounded-sm`}
                >
                  КУПИТЬ {priv.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider-cyber mx-6" />

      {/* HOW TO BUY */}
      <section id="how" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-exo text-xs mb-3" style={{ color: "var(--neon-cyan)", letterSpacing: "4px" }}>ИНСТРУКЦИЯ</p>
            <h2 className="font-orbitron font-bold text-3xl md:text-4xl" style={{ color: "var(--neon-magenta)" }}>
              КАК КУПИТЬ
            </h2>
            <div className="divider-cyber mt-6 max-w-xs mx-auto" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="text-center relative">
                {i < steps.length - 1 && (
                  <div
                    className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-px"
                    style={{ background: "linear-gradient(90deg, rgba(0,245,255,0.4), transparent)" }}
                  />
                )}
                <div
                  className="w-16 h-16 mx-auto mb-4 flex items-center justify-center relative"
                  style={{
                    border: "1px solid var(--neon-cyan)",
                    background: "rgba(0,245,255,0.05)",
                    clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                  }}
                >
                  <Icon name={step.icon} fallback="Star" size={24} style={{ color: "var(--neon-cyan)" }} />
                  <div
                    className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center font-orbitron text-xs"
                    style={{ background: "var(--neon-magenta)", color: "#060a0f", borderRadius: "50%" }}
                  >
                    {i + 1}
                  </div>
                </div>
                <h3 className="font-russo text-sm mb-2" style={{ color: "rgba(200,240,255,0.9)" }}>
                  {step.title}
                </h3>
                <p className="font-exo text-xs" style={{ color: "rgba(200,240,255,0.45)", lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
          <div
            className="mt-12 p-4 text-center font-exo text-sm rounded-sm"
            style={{
              border: "1px solid rgba(0,255,136,0.3)",
              background: "rgba(0,255,136,0.05)",
              color: "var(--neon-green)",
            }}
          >
            <Icon name="Zap" size={14} className="inline mr-2" />
            Среднее время активации привилегии — <strong>менее 60 секунд</strong> после оплаты
          </div>
        </div>
      </section>

      <div className="divider-cyber mx-6" />

      {/* SERVERS */}
      <section id="servers" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-exo text-xs mb-3" style={{ color: "var(--neon-magenta)", letterSpacing: "4px" }}>МОНИТОРИНГ</p>
            <h2 className="font-orbitron font-bold text-3xl md:text-4xl" style={{ color: "var(--neon-cyan)" }}>
              НАШИ СЕРВЕРЫ
            </h2>
            <div className="divider-cyber mt-6 max-w-xs mx-auto" />
          </div>
          <div className="space-y-4">
            {servers.map((srv, i) => (
              <div
                key={i}
                className="cyber-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="font-orbitron font-bold text-sm" style={{ color: "var(--neon-cyan)" }}>
                      {srv.name}
                    </span>
                  </div>
                  <span
                    className="font-exo text-xs px-2 py-0.5"
                    style={{ border: "1px solid rgba(0,245,255,0.2)", color: "rgba(200,240,255,0.5)", borderRadius: "2px" }}
                  >
                    {srv.map}
                  </span>
                </div>
                <div className="flex items-center gap-6 font-exo text-sm">
                  <div className="flex items-center gap-2">
                    <Icon name="Users" size={14} style={{ color: "var(--neon-magenta)" }} />
                    <span style={{ color: "rgba(200,240,255,0.7)" }}>{srv.players}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="Wifi" size={14} style={{ color: "var(--neon-cyan)" }} />
                    <span style={{ color: "rgba(200,240,255,0.7)" }}>{srv.ping}</span>
                  </div>
                  <button
                    className="neon-btn-cyan font-orbitron text-xs px-4 py-1.5 rounded-sm"
                  >
                    ПОДКЛЮЧИТЬСЯ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider-cyber mx-6" />

      {/* FAQ */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-exo text-xs mb-3" style={{ color: "var(--neon-cyan)", letterSpacing: "4px" }}>ВОПРОСЫ</p>
            <h2 className="font-orbitron font-bold text-3xl md:text-4xl" style={{ color: "var(--neon-magenta)" }}>
              FAQ
            </h2>
            <div className="divider-cyber mt-6 max-w-xs mx-auto" />
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="cyber-card overflow-hidden">
                <button
                  className="w-full text-left p-5 flex items-center justify-between gap-4 font-exo"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-medium" style={{ color: "rgba(200,240,255,0.9)" }}>
                    {faq.q}
                  </span>
                  <Icon
                    name={openFaq === i ? "ChevronUp" : "ChevronDown"}
                    size={16}
                    style={{ color: "var(--neon-cyan)", flexShrink: 0 }}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 font-exo text-sm" style={{ color: "rgba(200,240,255,0.55)", lineHeight: 1.7, borderTop: "1px solid rgba(0,245,255,0.1)" }}>
                    <p className="pt-4">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-20 px-6 text-center relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(0,245,255,0.05) 0%, rgba(255,0,170,0.05) 100%)" }}
      >
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, rgba(0,245,255,0.06) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="font-orbitron font-bold text-2xl md:text-3xl mb-4" style={{ color: "var(--neon-cyan)" }}>
            ГОТОВ К ИГРЕ?
          </h2>
          <p className="font-exo mb-8" style={{ color: "rgba(200,240,255,0.55)" }}>
            Присоединяйся к сотням игроков — получи преимущество прямо сейчас
          </p>
          <button
            onClick={() => scrollTo("privileges")}
            className="neon-btn-magenta font-orbitron text-sm px-10 py-4 rounded-sm"
          >
            ВЫБРАТЬ ПРИВИЛЕГИЮ
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="py-8 px-6 text-center font-exo text-xs"
        style={{ borderTop: "1px solid rgba(0,245,255,0.1)", color: "rgba(200,240,255,0.3)" }}
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <Icon name="Crosshair" size={14} style={{ color: "var(--neon-cyan)" }} />
          <span className="font-orbitron text-sm" style={{ color: "var(--neon-cyan)" }}>
            CS<span style={{ color: "var(--neon-magenta)" }}>STORE</span>
          </span>
        </div>
        <p>© 2024 CSSTORE · Counter-Strike 1.6 · Все права защищены</p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <a href="#" className="hover:opacity-70 transition-opacity">Discord</a>
          <span>·</span>
          <a href="#" className="hover:opacity-70 transition-opacity">VK</a>
          <span>·</span>
          <a href="#" className="hover:opacity-70 transition-opacity">Telegram</a>
        </div>
      </footer>

      {/* SUCCESS BANNER */}
      {paymentSuccess && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 font-exo text-sm"
          style={{
            background: "rgba(0,255,136,0.1)",
            border: "1px solid var(--neon-green)",
            color: "var(--neon-green)",
            backdropFilter: "blur(12px)",
            clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
          }}
        >
          <Icon name="CheckCircle" size={18} />
          <span>Оплата прошла успешно! Привилегия активирована — заходи на сервер.</span>
          <button onClick={() => setPaymentSuccess(false)} style={{ marginLeft: 8, opacity: 0.6 }}>
            <Icon name="X" size={14} />
          </button>
        </div>
      )}

      {/* BUY MODAL */}
      {buyModal && selectedPrivilege && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(6,10,15,0.85)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setBuyModal(null); }}
        >
          <div
            className={`cyber-card ${buyModal === "magenta" ? "cyber-card-magenta" : buyModal === "elite" ? "cyber-card-gold" : ""} w-full max-w-md p-7`}
            style={{ animation: "fadeInUp 0.3s ease forwards" }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="font-orbitron font-bold text-xl" style={{ color: badgeColor(selectedPrivilege.color) }}>
                  {selectedPrivilege.name}
                </div>
                <div className="font-exo text-xs mt-0.5" style={{ color: "rgba(200,240,255,0.4)" }}>
                  {selectedPrivilege.price}₽ / 30 дней
                </div>
              </div>
              <button onClick={() => setBuyModal(null)} style={{ color: "rgba(200,240,255,0.4)" }}>
                <Icon name="X" size={20} />
              </button>
            </div>

            <div className="mb-4">
              <div className="font-exo text-xs mb-2" style={{ color: "rgba(200,240,255,0.5)", letterSpacing: 2 }}>
                КАК ИДЕНТИФИЦИРОВАТЬ?
              </div>
              <div className="flex gap-2">
                {(["steamid", "nick"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setAuthType(t)}
                    className="flex-1 py-2 font-orbitron text-xs rounded-sm transition-all duration-200"
                    style={{
                      border: `1px solid ${authType === t ? "var(--neon-cyan)" : "rgba(0,245,255,0.2)"}`,
                      background: authType === t ? "rgba(0,245,255,0.1)" : "transparent",
                      color: authType === t ? "var(--neon-cyan)" : "rgba(200,240,255,0.4)",
                    }}
                  >
                    {t === "steamid" ? "STEAM ID" : "НИК"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <div className="font-exo text-xs mb-2" style={{ color: "rgba(200,240,255,0.5)", letterSpacing: 2 }}>
                {authType === "steamid" ? "ТВОЙ STEAM ID" : "НИК НА СЕРВЕРЕ"}
              </div>
              <input
                type="text"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBuy()}
                placeholder={authType === "steamid" ? "STEAM_0:0:12345678" : "Твой ник"}
                className="w-full px-4 py-3 font-exo text-sm rounded-sm outline-none transition-all duration-200"
                style={{
                  background: "rgba(0,245,255,0.04)",
                  border: "1px solid rgba(0,245,255,0.25)",
                  color: "rgba(200,240,255,0.9)",
                  caretColor: "var(--neon-cyan)",
                }}
              />
              {authType === "steamid" && (
                <div className="mt-1.5 font-exo text-xs" style={{ color: "rgba(200,240,255,0.3)" }}>
                  Узнать Steam ID: напиши в консоли CS — <span style={{ color: "var(--neon-cyan)" }}>status</span>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 px-3 py-2 font-exo text-xs" style={{ background: "rgba(255,0,0,0.08)", border: "1px solid rgba(255,0,0,0.3)", color: "#ff6b6b", borderRadius: 2 }}>
                {error}
              </div>
            )}

            <button
              onClick={handleBuy}
              disabled={loading}
              className={`${btnClass(selectedPrivilege.color)} w-full py-3.5 font-orbitron text-sm rounded-sm flex items-center justify-center gap-2`}
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <>
                  <Icon name="Loader" size={16} className="animate-spin" />
                  СОЗДАЁМ ПЛАТЁЖ...
                </>
              ) : (
                <>
                  <Icon name="CreditCard" size={16} />
                  ОПЛАТИТЬ {selectedPrivilege.price}₽
                </>
              )}
            </button>

            <div className="mt-4 text-center font-exo text-xs" style={{ color: "rgba(200,240,255,0.3)" }}>
              <Icon name="Shield" size={12} className="inline mr-1" />
              Безопасная оплата через ЮKassa · Активация сразу после оплаты
            </div>
          </div>
        </div>
      )}
    </div>
  );
}