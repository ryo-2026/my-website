import { useState, useEffect } from "react";

// ============ CONSTANTS ============

const ACCENT = "#e0ff4f";
const BG = "#0d0d1a";
const BG_CARD = "#1a1a2e";
const BORDER = "#2a2a3e";

const ATHLETES = [
  { id: 1, name: "田中 翼", sport: "陸上", avatar: "🏃" },
  { id: 2, name: "山本 海斗", sport: "水泳", avatar: "🏊" },
  { id: 3, name: "佐藤 凛", sport: "体操", avatar: "🤸" },
];

const USERS = [
  { id: "coach1", role: "coach", name: "鈴木 コーチ", password: "coach123" },
  { id: "a1", role: "athlete", athleteId: 1, name: "田中 翼", password: "pass1" },
  { id: "a2", role: "athlete", athleteId: 2, name: "山本 海斗", password: "pass2" },
  { id: "a3", role: "athlete", athleteId: 3, name: "佐藤 凛", password: "pass3" },
];

const MOOD_LEVELS = [
  { value: 1, label: "最悪", emoji: "😞", color: "#ef4444" },
  { value: 2, label: "悪い", emoji: "😕", color: "#f97316" },
  { value: 3, label: "普通", emoji: "😐", color: "#eab308" },
  { value: 4, label: "良い", emoji: "🙂", color: "#84cc16" },
  { value: 5, label: "最高", emoji: "😄", color: "#22c55e" },
];

const BODY_LEVELS = [
  { value: 1, label: "動けない", color: "#ef4444" },
  { value: 2, label: "重い",     color: "#f97316" },
  { value: 3, label: "普通",     color: "#eab308" },
  { value: 4, label: "好調",     color: "#84cc16" },
  { value: 5, label: "絶好調",   color: "#22c55e" },
];

// ============ HELPERS ============

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function dateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });
}

function todayLabel() {
  return new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" });
}

function loadData(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch { return def; }
}

function saveData(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function initDemo() {
  if (loadData("demo_init_v2", false)) return;
  const reports = {};
  const now = new Date();
  ATHLETES.forEach(({ id }) => {
    reports[id] = {};
    for (let i = 13; i >= 1; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      if (d.getDay() === 0) continue;
      const ds = d.toISOString().split("T")[0];
      // 佐藤 凛 (id=3) has lower scores to trigger alerts
      const moodBase = id === 3 ? 2 : 3;
      const mood = Math.max(1, Math.min(5, moodBase + Math.floor(Math.random() * 3) - 1));
      const body = Math.max(1, Math.min(5, 3 + Math.floor(Math.random() * 3) - 1));
      const trainings = [
        "スクワット 80kg×5×3set / ベンチプレス 60kg×8×3set",
        "インターバル走 400m×10本 / コアトレーニング30分",
        "テクニカルドリル / ウェイトトレーニング全身",
        "軽めのジョグ5km / ストレッチ重点",
      ];
      reports[id][ds] = {
        training: trainings[i % trainings.length],
        mood,
        body,
        concern: mood <= 2 ? "疲労感が強い。回復を優先したい" : "",
        message: "",
        submittedAt: d.toISOString(),
      };
    }
  });
  saveData("athlete_reports", reports);
  saveData("demo_init_v2", true);
}

// ============ SHARED COMPONENTS ============

function Badge({ color, children }) {
  return (
    <span style={{
      background: color + "22",
      color,
      padding: "3px 9px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function ScaleSelector({ levels, value, onChange, label }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 12,
        color: "#888",
        marginBottom: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}>
        {label}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {levels.map((l) => (
          <button
            key={l.value}
            onClick={() => onChange(l.value)}
            style={{
              flex: 1,
              padding: "10px 4px",
              borderRadius: 10,
              border: `2px solid ${value === l.value ? l.color : "transparent"}`,
              background: value === l.value ? l.color + "22" : BG_CARD,
              color: value === l.value ? l.color : "#555",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              transition: "all 0.15s",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            {l.emoji && <span style={{ fontSize: 18 }}>{l.emoji}</span>}
            <span>{l.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TrendGraph({ athleteId, reports }) {
  const W = 340, H = 130;
  const PL = 28, PR = 12, PT = 10, PB = 28;
  const IW = W - PL - PR;
  const IH = H - PT - PB;

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const ds = d.toISOString().split("T")[0];
    const rep = reports[athleteId]?.[ds];
    return {
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      mood: rep?.mood ?? null,
      body: rep?.body ?? null,
    };
  });

  const xOf = (i) => PL + (i / 13) * IW;
  const yOf = (v) => PT + IH - ((v - 1) / 4) * IH;

  const toPath = (pts) => {
    const valid = pts
      .map((p, i) => p != null ? { x: xOf(i), y: yOf(p) } : null)
      .filter(Boolean);
    if (valid.length < 2) return null;
    return valid.map((p, j) => `${j === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  };

  const moodPath = toPath(days.map(d => d.mood));
  const bodyPath = toPath(days.map(d => d.body));

  const moodDots = days.map((d, i) => d.mood != null ? { x: xOf(i), y: yOf(d.mood) } : null);
  const bodyDots = days.map((d, i) => d.body != null ? { x: xOf(i), y: yOf(d.body) } : null);

  const hasData = days.some(d => d.mood != null);

  if (!hasData) {
    return (
      <div style={{ color: "#555", textAlign: "center", padding: "20px 0", fontSize: 13 }}>
        データがありません
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 8, paddingLeft: PL }}>
        <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700 }}>● メンタル</span>
        <span style={{ fontSize: 11, color: "#60a5fa", fontWeight: 700 }}>● 体調</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        {[1, 2, 3, 4, 5].map(v => (
          <line
            key={v}
            x1={PL} y1={yOf(v)}
            x2={W - PR} y2={yOf(v)}
            stroke="#252535" strokeWidth={1}
          />
        ))}
        {[1, 3, 5].map(v => (
          <text key={v} x={PL - 5} y={yOf(v) + 4} textAnchor="end" fontSize={9} fill="#555">{v}</text>
        ))}
        {moodPath && (
          <path d={moodPath} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" />
        )}
        {bodyPath && (
          <path d={bodyPath} fill="none" stroke="#60a5fa" strokeWidth={2} strokeLinejoin="round" />
        )}
        {moodDots.map((p, i) =>
          p ? <circle key={i} cx={p.x} cy={p.y} r={3} fill={ACCENT} /> : null
        )}
        {bodyDots.map((p, i) =>
          p ? <circle key={i} cx={p.x} cy={p.y} r={3} fill="#60a5fa" /> : null
        )}
        {days.filter((_, i) => i % 2 === 0).map((d, idx) => {
          const i = idx * 2;
          return (
            <text key={i} x={xOf(i).toFixed(1)} y={H - 6} textAnchor="middle" fontSize={8} fill="#555">
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ============ LOGIN ============

function LoginScreen({ onLogin }) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (uid, pw) => {
    const user = USERS.find(u => u.id === uid && u.password === pw);
    if (user) {
      onLogin(user);
    } else {
      setError("IDまたはパスワードが正しくありません");
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "14px 16px",
    background: BG_CARD,
    border: "1px solid " + BORDER,
    borderRadius: 12,
    color: "#fff",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: BG,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: "#fff",
    }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 44 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>⚡</div>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "0.12em" }}>ATHLETE</div>
        <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700, letterSpacing: "0.25em", marginTop: 4 }}>MANAGEMENT</div>
      </div>

      <div style={{ width: "100%", maxWidth: 360 }}>
        {/* Form */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: "#888", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: "0.12em" }}>
            USER ID
          </label>
          <input
            value={userId}
            onChange={e => { setUserId(e.target.value); setError(""); }}
            placeholder="例: coach1"
            autoComplete="username"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, color: "#888", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: "0.12em" }}>
            PASSWORD
          </label>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            placeholder="パスワード"
            autoComplete="current-password"
            onKeyDown={e => e.key === "Enter" && handleLogin(userId, password)}
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 16, textAlign: "center" }}>
            {error}
          </div>
        )}

        <button
          onClick={() => handleLogin(userId, password)}
          style={{
            width: "100%",
            padding: 16,
            background: ACCENT,
            border: "none",
            borderRadius: 14,
            color: BG,
            fontSize: 16,
            fontWeight: 900,
            cursor: "pointer",
            letterSpacing: "0.05em",
            marginBottom: 36,
          }}
        >
          ログイン
        </button>

        {/* Quick login */}
        <div style={{ borderTop: "1px solid " + BORDER, paddingTop: 24 }}>
          <div style={{ fontSize: 11, color: "#555", textAlign: "center", marginBottom: 14, fontWeight: 700, letterSpacing: "0.12em" }}>
            DEMO QUICK LOGIN
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {USERS.map(u => {
              const av = u.role === "coach" ? "👔" : ATHLETES.find(a => a.id === u.athleteId)?.avatar;
              return (
                <button
                  key={u.id}
                  onClick={() => onLogin(u)}
                  style={{
                    padding: "12px 16px",
                    background: BG_CARD,
                    border: "1px solid " + BORDER,
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    textAlign: "left",
                  }}
                >
                  <span>{av} {u.name}</span>
                  <span style={{
                    color: u.role === "coach" ? ACCENT : "#60a5fa",
                    fontSize: 11,
                    fontWeight: 700,
                    background: (u.role === "coach" ? ACCENT : "#60a5fa") + "22",
                    padding: "2px 8px",
                    borderRadius: 10,
                  }}>
                    {u.role === "coach" ? "コーチ" : "選手"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ ATHLETE SCREEN ============

function AthleteScreen({ user, reports, onSubmitReport, onLogout }) {
  const [tab, setTab] = useState("report");
  const athlete = ATHLETES.find(a => a.id === user.athleteId);
  const athleteReports = reports[user.athleteId] || {};
  const todayReport = athleteReports[todayStr()];

  const TABS = [
    { id: "report", label: "今日の日報", icon: "📝" },
    { id: "history", label: "履歴・グラフ", icon: "📊" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: BG,
      color: "#fff",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Sticky Header */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: BG,
        borderBottom: "1px solid " + BORDER,
        padding: "13px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 26 }}>{athlete?.avatar}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{athlete?.name}</div>
            <div style={{ fontSize: 11, color: "#888" }}>{athlete?.sport}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            background: "transparent",
            border: "1px solid " + BORDER,
            borderRadius: 8,
            color: "#888",
            fontSize: 12,
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          ログアウト
        </button>
      </div>

      {/* Sticky Tab Nav */}
      <div style={{
        position: "sticky",
        top: 62,
        zIndex: 99,
        background: BG,
        borderBottom: "1px solid " + BORDER,
        display: "flex",
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: "12px",
              background: "transparent",
              border: "none",
              borderBottom: `3px solid ${tab === t.id ? ACCENT : "transparent"}`,
              color: tab === t.id ? ACCENT : "#555",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Page content — natural scroll */}
      {tab === "report" ? (
        <AthleteReportTab
          todayReport={todayReport}
          onSubmit={(data) => onSubmitReport(user.athleteId, data)}
        />
      ) : (
        <AthleteHistoryTab
          athlete={athlete}
          athleteReports={athleteReports}
          reports={reports}
        />
      )}
    </div>
  );
}

function AthleteReportTab({ todayReport, onSubmit }) {
  const [training, setTraining] = useState("");
  const [mood, setMood] = useState(null);
  const [body, setBody] = useState(null);
  const [concern, setConcern] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = training.trim() && mood && body;

  const handleSubmit = () => {
    onSubmit({ training, mood, body, concern, message });
    setSubmitted(true);
  };

  // Show confirmation if already submitted today
  const displayReport = submitted ? { training, mood, body, concern, message } : todayReport;
  if (displayReport && (submitted || todayReport)) {
    const m = MOOD_LEVELS.find(l => l.value === displayReport.mood);
    const b = BODY_LEVELS.find(l => l.value === displayReport.body);
    return (
      <div style={{ padding: "40px 20px 60px", textAlign: "center" }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>日報を送信しました</div>
        <div style={{ fontSize: 14, color: "#888", marginBottom: 32 }}>コーチが確認します。お疲れ様でした！</div>

        <div style={{
          background: BG_CARD,
          borderRadius: 16,
          border: "1px solid " + BORDER,
          padding: 20,
          textAlign: "left",
          maxWidth: 380,
          margin: "0 auto",
        }}>
          <div style={{ color: ACCENT, fontWeight: 700, marginBottom: 12, fontSize: 13, letterSpacing: "0.05em" }}>
            📋 本日の記録
          </div>
          <div style={{ fontSize: 13, color: "#aaa", lineHeight: 2 }}>
            <div>📅 {todayLabel()}</div>
            <div style={{ marginTop: 4 }}>💪 {displayReport.training}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <Badge color={m?.color}>{m?.emoji} メンタル: {m?.label}</Badge>
              <Badge color={b?.color}>💪 体調: {b?.label}</Badge>
            </div>
            {displayReport.concern && (
              <div style={{ color: "#f97316", marginTop: 8 }}>⚠️ {displayReport.concern}</div>
            )}
            {displayReport.message && (
              <div style={{ color: "#60a5fa", marginTop: 4 }}>💬 {displayReport.message}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const textareaStyle = {
    width: "100%",
    background: BG_CARD,
    border: "1px solid " + BORDER,
    borderRadius: 14,
    padding: "14px 16px",
    color: "#fff",
    fontSize: 14,
    resize: "none",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: 1.7,
    boxSizing: "border-box",
  };

  const labelStyle = {
    fontSize: 12,
    color: "#888",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    display: "block",
    marginBottom: 10,
  };

  return (
    <div style={{ padding: "24px 20px 60px" }}>
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid " + BORDER }}>
        <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 4 }}>
          TODAY'S REPORT
        </div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>{todayLabel()}</div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>
          💪 トレーニング内容 <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <textarea
          value={training}
          onChange={e => setTraining(e.target.value)}
          placeholder={"例：\n・スクワット 80kg × 5 × 3set\n・ベンチプレス 60kg × 8 × 3set\n・ランニング 5km"}
          rows={5}
          style={textareaStyle}
        />
      </div>

      <ScaleSelector
        levels={MOOD_LEVELS}
        value={mood}
        onChange={setMood}
        label="😊 メンタル状態 *"
      />
      <ScaleSelector
        levels={BODY_LEVELS}
        value={body}
        onChange={setBody}
        label="🏋️ 身体の状態 *"
      />

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>⚠️ 気になること・課題（任意）</label>
        <textarea
          value={concern}
          onChange={e => setConcern(e.target.value)}
          placeholder="例：右膝に違和感がある、フォームが安定しない..."
          rows={3}
          style={textareaStyle}
        />
      </div>

      <div style={{ marginBottom: 32 }}>
        <label style={labelStyle}>💬 コーチへのメッセージ（任意）</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="例：次回のセッションで確認したいことがあります..."
          rows={3}
          style={textareaStyle}
        />
      </div>

      <button
        disabled={!canSubmit}
        onClick={handleSubmit}
        style={{
          width: "100%",
          padding: 18,
          borderRadius: 16,
          border: "none",
          background: canSubmit ? ACCENT : "#252535",
          color: canSubmit ? BG : "#555",
          fontSize: 16,
          fontWeight: 900,
          cursor: canSubmit ? "pointer" : "not-allowed",
          transition: "all 0.2s",
          letterSpacing: "0.05em",
        }}
      >
        日報を送信する →
      </button>
    </div>
  );
}

function AthleteHistoryTab({ athlete, athleteReports, reports }) {
  const sortedDates = Object.keys(athleteReports).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ padding: "24px 20px 60px" }}>
      {/* Graph card */}
      <div style={{
        background: BG_CARD,
        borderRadius: 16,
        border: "1px solid " + BORDER,
        padding: 16,
        marginBottom: 28,
      }}>
        <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700, marginBottom: 12, letterSpacing: "0.08em" }}>
          📊 14日間のトレンド
        </div>
        <TrendGraph athleteId={athlete.id} reports={reports} />
      </div>

      {/* History list */}
      <div style={{ fontSize: 12, color: "#888", fontWeight: 700, marginBottom: 12, letterSpacing: "0.08em" }}>
        📅 過去の日報 ({sortedDates.length}件)
      </div>

      {sortedDates.length === 0 ? (
        <div style={{ color: "#555", textAlign: "center", padding: 40 }}>記録がありません</div>
      ) : (
        sortedDates.map(dateStr => {
          const r = athleteReports[dateStr];
          const m = MOOD_LEVELS.find(l => l.value === r.mood);
          const b = BODY_LEVELS.find(l => l.value === r.body);
          return (
            <div key={dateStr} style={{
              background: BG_CARD,
              borderRadius: 14,
              border: "1px solid " + BORDER,
              padding: 16,
              marginBottom: 10,
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 10,
                gap: 8,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{dateLabel(dateStr)}</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <Badge color={m?.color}>{m?.emoji} {m?.label}</Badge>
                  <Badge color={b?.color}>💪 {b?.label}</Badge>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.7 }}>
                <div>🏋️ {r.training}</div>
                {r.concern && (
                  <div style={{ color: "#f97316", marginTop: 6 }}>⚠️ {r.concern}</div>
                )}
                {r.message && (
                  <div style={{ color: "#60a5fa", marginTop: 4 }}>💬 {r.message}</div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ============ COACH SCREEN ============

function CoachScreen({ user, reports, onLogout }) {
  const [tab, setTab] = useState("athletes");

  const alertCount = ATHLETES.filter(a => {
    const r = reports[a.id]?.[todayStr()];
    return r && (r.mood <= 2 || r.body <= 2);
  }).length;

  const noReportCount = ATHLETES.filter(a => !reports[a.id]?.[todayStr()]).length;
  const badgeCount = alertCount + noReportCount;

  const TABS = [
    { id: "athletes", label: "選手一覧", icon: "👥" },
    { id: "alerts", label: "要チェック", icon: "🚨", badge: badgeCount },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: BG,
      color: "#fff",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Sticky Header */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: BG,
        borderBottom: "1px solid " + BORDER,
        padding: "13px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 10, color: ACCENT, fontWeight: 700, letterSpacing: "0.2em", marginBottom: 2 }}>
            COACH DASHBOARD
          </div>
          <div style={{ fontSize: 16, fontWeight: 900 }}>{user.name}</div>
        </div>
        <button
          onClick={onLogout}
          style={{
            background: "transparent",
            border: "1px solid " + BORDER,
            borderRadius: 8,
            color: "#888",
            fontSize: 12,
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          ログアウト
        </button>
      </div>

      {/* Sticky Tab Nav */}
      <div style={{
        position: "sticky",
        top: 62,
        zIndex: 99,
        background: BG,
        borderBottom: "1px solid " + BORDER,
        display: "flex",
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: "12px",
              background: "transparent",
              border: "none",
              borderBottom: `3px solid ${tab === t.id ? ACCENT : "transparent"}`,
              color: tab === t.id ? ACCENT : "#555",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {t.icon} {t.label}
            {t.badge > 0 && (
              <span style={{
                background: "#ef4444",
                color: "#fff",
                fontSize: 10,
                fontWeight: 900,
                borderRadius: 10,
                padding: "1px 6px",
                minWidth: 18,
                textAlign: "center",
                lineHeight: "16px",
              }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Page content — natural scroll */}
      {tab === "athletes" ? (
        <CoachAthletesTab reports={reports} />
      ) : (
        <CoachAlertsTab reports={reports} />
      )}
    </div>
  );
}

function CoachAthletesTab({ reports }) {
  const [selected, setSelected] = useState(null);

  if (selected !== null) {
    const athlete = ATHLETES.find(a => a.id === selected);
    const athleteReports = reports[selected] || {};
    const sortedDates = Object.keys(athleteReports).sort((a, b) => b.localeCompare(a));

    return (
      <div style={{ padding: "20px 20px 60px" }}>
        <button
          onClick={() => setSelected(null)}
          style={{
            background: BG_CARD,
            border: "1px solid " + BORDER,
            borderRadius: 10,
            color: "#aaa",
            fontSize: 13,
            padding: "8px 14px",
            cursor: "pointer",
            marginBottom: 20,
          }}
        >
          ← 一覧に戻る
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <span style={{ fontSize: 36 }}>{athlete?.avatar}</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{athlete?.name}</div>
            <div style={{ fontSize: 12, color: "#888" }}>{athlete?.sport} · {sortedDates.length}件の記録</div>
          </div>
        </div>

        <div style={{
          background: BG_CARD,
          borderRadius: 16,
          border: "1px solid " + BORDER,
          padding: 16,
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700, marginBottom: 12, letterSpacing: "0.08em" }}>
            📊 14日間のトレンド
          </div>
          <TrendGraph athleteId={selected} reports={reports} />
        </div>

        <div style={{ fontSize: 12, color: "#888", fontWeight: 700, marginBottom: 12 }}>📋 日報履歴</div>
        {sortedDates.map(dateStr => {
          const r = athleteReports[dateStr];
          const m = MOOD_LEVELS.find(l => l.value === r.mood);
          const b = BODY_LEVELS.find(l => l.value === r.body);
          const isAlert = r.mood <= 2 || r.body <= 2;
          return (
            <div key={dateStr} style={{
              background: BG_CARD,
              borderRadius: 14,
              border: `1px solid ${isAlert ? "#ef444440" : BORDER}`,
              padding: 16,
              marginBottom: 10,
            }}>
              {isAlert && (
                <div style={{ color: "#ef4444", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                  ⚠️ 要チェック
                </div>
              )}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 10,
                gap: 8,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{dateLabel(dateStr)}</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <Badge color={m?.color}>{m?.emoji} {m?.label}</Badge>
                  <Badge color={b?.color}>💪 {b?.label}</Badge>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.7 }}>
                <div>🏋️ {r.training}</div>
                {r.concern && <div style={{ color: "#f97316", marginTop: 6 }}>⚠️ {r.concern}</div>}
                {r.message && <div style={{ color: "#60a5fa", marginTop: 4 }}>💬 {r.message}</div>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 20px 60px" }}>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>{todayLabel()}</div>

      {ATHLETES.map(athlete => {
        const todayRep = reports[athlete.id]?.[todayStr()];
        const totalReports = Object.keys(reports[athlete.id] || {}).length;
        const isAlert = todayRep && (todayRep.mood <= 2 || todayRep.body <= 2);
        const m = todayRep ? MOOD_LEVELS.find(l => l.value === todayRep.mood) : null;
        const b = todayRep ? BODY_LEVELS.find(l => l.value === todayRep.body) : null;

        return (
          <div
            key={athlete.id}
            onClick={() => setSelected(athlete.id)}
            style={{
              background: BG_CARD,
              borderRadius: 16,
              border: `1px solid ${isAlert ? "#ef444440" : BORDER}`,
              padding: 16,
              marginBottom: 12,
              cursor: "pointer",
            }}
          >
            {isAlert && (
              <div style={{
                background: "#ef444418",
                border: "1px solid #ef444440",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12,
                color: "#ef4444",
                fontWeight: 700,
                marginBottom: 12,
              }}>
                🚨 要チェック — メンタル/体調が低下
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 30 }}>{athlete.avatar}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{athlete.name}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{athlete.sport} · {totalReports}件の記録</div>
                </div>
              </div>
              <span style={{ color: "#444", fontSize: 22, lineHeight: 1 }}>›</span>
            </div>

            {todayRep ? (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid " + BORDER }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Badge color={m?.color}>{m?.emoji} メンタル: {m?.label}</Badge>
                  <Badge color={b?.color}>💪 体調: {b?.label}</Badge>
                </div>
                {todayRep.concern && (
                  <div style={{ fontSize: 12, color: "#f97316", marginTop: 8 }}>⚠️ {todayRep.concern}</div>
                )}
                {todayRep.message && (
                  <div style={{ fontSize: 12, color: "#60a5fa", marginTop: 4 }}>💬 {todayRep.message}</div>
                )}
              </div>
            ) : (
              <div style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid " + BORDER,
                fontSize: 12,
                color: "#555",
              }}>
                本日の日報 未提出
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CoachAlertsTab({ reports }) {
  const alertAthletes = ATHLETES.filter(a => {
    const r = reports[a.id]?.[todayStr()];
    return r && (r.mood <= 2 || r.body <= 2);
  });

  const noReportAthletes = ATHLETES.filter(a => !reports[a.id]?.[todayStr()]);

  const allClear = alertAthletes.length === 0 && noReportAthletes.length === 0;

  return (
    <div style={{ padding: "20px 20px 60px" }}>
      {allClear && (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>アラートなし</div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 8 }}>全選手の状態は良好です</div>
        </div>
      )}

      {alertAthletes.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 700, marginBottom: 12, letterSpacing: "0.05em" }}>
            🚨 メンタル / 体調アラート ({alertAthletes.length}件)
          </div>
          {alertAthletes.map(athlete => {
            const r = reports[athlete.id][todayStr()];
            const m = MOOD_LEVELS.find(l => l.value === r.mood);
            const b = BODY_LEVELS.find(l => l.value === r.body);
            return (
              <div key={athlete.id} style={{
                background: "#ef444410",
                borderRadius: 14,
                border: "1px solid #ef444440",
                padding: 16,
                marginBottom: 12,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 26 }}>{athlete.avatar}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{athlete.name}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{athlete.sport}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  <Badge color={m?.color}>{m?.emoji} メンタル: {m?.label}</Badge>
                  <Badge color={b?.color}>💪 体調: {b?.label}</Badge>
                </div>
                {r.concern && <div style={{ fontSize: 13, color: "#f97316" }}>⚠️ {r.concern}</div>}
                {r.message && <div style={{ fontSize: 13, color: "#60a5fa", marginTop: 4 }}>💬 {r.message}</div>}
              </div>
            );
          })}
        </>
      )}

      {noReportAthletes.length > 0 && (
        <div style={{ marginTop: alertAthletes.length > 0 ? 24 : 0 }}>
          <div style={{ fontSize: 12, color: "#f97316", fontWeight: 700, marginBottom: 12, letterSpacing: "0.05em" }}>
            📋 本日 未提出 ({noReportAthletes.length}件)
          </div>
          {noReportAthletes.map(athlete => (
            <div key={athlete.id} style={{
              background: BG_CARD,
              borderRadius: 14,
              border: "1px solid #f9731640",
              padding: 16,
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}>
              <span style={{ fontSize: 26 }}>{athlete.avatar}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{athlete.name}</div>
                <div style={{ fontSize: 12, color: "#f97316" }}>日報未提出</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ ROOT ============

export default function App() {
  const [user, setUser] = useState(() => loadData("current_user", null));
  const [reports, setReports] = useState(() => loadData("athlete_reports", {}));

  useEffect(() => {
    initDemo();
    // reload reports after demo seed
    const seeded = loadData("athlete_reports", {});
    setReports(seeded);
  }, []);

  const handleLogin = (u) => {
    setUser(u);
    saveData("current_user", u);
  };

  const handleLogout = () => {
    setUser(null);
    saveData("current_user", null);
  };

  const handleSubmitReport = (athleteId, data) => {
    const ds = todayStr();
    const updated = {
      ...reports,
      [athleteId]: {
        ...(reports[athleteId] || {}),
        [ds]: { ...data, submittedAt: new Date().toISOString() },
      },
    };
    setReports(updated);
    saveData("athlete_reports", updated);
  };

  if (!user) return <LoginScreen onLogin={handleLogin} />;
  if (user.role === "coach") {
    return <CoachScreen user={user} reports={reports} onLogout={handleLogout} />;
  }
  return (
    <AthleteScreen
      user={user}
      reports={reports}
      onSubmitReport={handleSubmitReport}
      onLogout={handleLogout}
    />
  );
}
