import { useState, useEffect } from "react";
import { signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "firebase/auth";
import {
  doc, getDoc, setDoc, collection,
  query, where, onSnapshot, getDocs,
} from "firebase/firestore";
import { auth, provider, db } from "./firebase";

// ============ CONSTANTS ============
const ACCENT = "#e0ff4f";
const BG = "#0d0d1a";
const BG_CARD = "#1a1a2e";
const BORDER = "#2a2a3e";

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

// ============ SHARED COMPONENTS ============
function Badge({ color, children }) {
  return (
    <span style={{
      background: color + "22", color,
      padding: "3px 9px", borderRadius: 20,
      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function ScaleSelector({ levels, value, onChange, label }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {levels.map((l) => (
          <button key={l.value} onClick={() => onChange(l.value)} style={{
            flex: 1, padding: "10px 4px", borderRadius: 10,
            border: `2px solid ${value === l.value ? l.color : "transparent"}`,
            background: value === l.value ? l.color + "22" : BG_CARD,
            color: value === l.value ? l.color : "#555",
            cursor: "pointer", fontSize: 11, fontWeight: 700,
            transition: "all 0.15s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          }}>
            {l.emoji && <span style={{ fontSize: 18 }}>{l.emoji}</span>}
            <span>{l.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Avatar({ user, size = 32 }) {
  if (user?.photoURL) {
    return <img src={user.photoURL} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  }
  return <span style={{ fontSize: size * 0.8 }}>{user?.avatar || "🏃"}</span>;
}

function TrendGraph({ athleteReports }) {
  const W = 340, H = 130;
  const PL = 28, PR = 12, PT = 10, PB = 28;
  const IW = W - PL - PR, IH = H - PT - PB;

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const ds = d.toISOString().split("T")[0];
    const rep = athleteReports[ds];
    return { label: `${d.getMonth() + 1}/${d.getDate()}`, mood: rep?.mood ?? null, body: rep?.body ?? null };
  });

  const xOf = (i) => PL + (i / 13) * IW;
  const yOf = (v) => PT + IH - ((v - 1) / 4) * IH;

  const toPath = (pts) => {
    const valid = pts.map((p, i) => p != null ? { x: xOf(i), y: yOf(p) } : null).filter(Boolean);
    if (valid.length < 2) return null;
    return valid.map((p, j) => `${j === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  };

  const moodPath = toPath(days.map(d => d.mood));
  const bodyPath = toPath(days.map(d => d.body));

  if (!days.some(d => d.mood != null)) {
    return <div style={{ color: "#555", textAlign: "center", padding: "20px 0", fontSize: 13 }}>データがありません</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 8, paddingLeft: PL }}>
        <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700 }}>● メンタル</span>
        <span style={{ fontSize: 11, color: "#60a5fa", fontWeight: 700 }}>● 体調</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        {[1,2,3,4,5].map(v => <line key={v} x1={PL} y1={yOf(v)} x2={W-PR} y2={yOf(v)} stroke="#252535" strokeWidth={1} />)}
        {[1,3,5].map(v => <text key={v} x={PL-5} y={yOf(v)+4} textAnchor="end" fontSize={9} fill="#555">{v}</text>)}
        {moodPath && <path d={moodPath} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" />}
        {bodyPath && <path d={bodyPath} fill="none" stroke="#60a5fa" strokeWidth={2} strokeLinejoin="round" />}
        {days.map((d, i) => d.mood != null && <circle key={`m${i}`} cx={xOf(i)} cy={yOf(d.mood)} r={3} fill={ACCENT} />)}
        {days.map((d, i) => d.body != null && <circle key={`b${i}`} cx={xOf(i)} cy={yOf(d.body)} r={3} fill="#60a5fa" />)}
        {days.filter((_, i) => i % 2 === 0).map((d, idx) => (
          <text key={idx} x={xOf(idx*2).toFixed(1)} y={H-6} textAnchor="middle" fontSize={8} fill="#555">{d.label}</text>
        ))}
      </svg>
    </div>
  );
}

// ============ LOGIN ============
function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithRedirect(auth, provider);
    } catch {
      setError("ログインに失敗しました。もう一度お試しください。");
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: BG,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 24, color: "#fff",
    }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>⚡</div>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "0.12em" }}>ATHLETE</div>
        <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700, letterSpacing: "0.25em", marginTop: 4 }}>MANAGEMENT</div>
      </div>

      <div style={{ width: "100%", maxWidth: 360 }}>
        <button onClick={handleGoogleLogin} disabled={loading} style={{
          width: "100%", padding: 16,
          background: loading ? "#252535" : "#fff",
          border: "none", borderRadius: 14,
          color: loading ? "#555" : "#000",
          fontSize: 15, fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
        }}>
          {!loading && (
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.2 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8.9 20-20 0-1.3-.1-2.7-.4-4z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.6 5.1C9.8 39.7 16.4 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.3 35.9 44 30.4 44 24c0-1.3-.1-2.7-.4-4z"/>
            </svg>
          )}
          {loading ? "ログイン中..." : "Googleでログイン"}
        </button>
        {error && <div style={{ color: "#ef4444", fontSize: 13, marginTop: 16, textAlign: "center" }}>{error}</div>}
      </div>
    </div>
  );
}

// ============ ATHLETE SCREEN ============
function AthleteScreen({ userProfile, onLogout }) {
  const [tab, setTab] = useState("report");
  const [myReports, setMyReports] = useState({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reports", userProfile.uid, "daily"), (snap) => {
      const data = {};
      snap.forEach(d => { data[d.id] = d.data(); });
      setMyReports(data);
    });
    return unsub;
  }, [userProfile.uid]);

  const handleSubmitReport = async (data) => {
    await setDoc(doc(db, "reports", userProfile.uid, "daily", todayStr()), {
      ...data,
      submittedAt: new Date().toISOString(),
    });
  };

  const TABS = [
    { id: "report",  label: "今日の日報",  icon: "📝" },
    { id: "history", label: "履歴・グラフ", icon: "📊" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: BG, borderBottom: "1px solid " + BORDER,
        padding: "13px 20px 13px",
        paddingTop: "calc(13px + env(safe-area-inset-top))",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar user={userProfile} size={32} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{userProfile.name}</div>
            {userProfile.sport && <div style={{ fontSize: 11, color: "#888" }}>{userProfile.sport}</div>}
          </div>
        </div>
        <button onClick={onLogout} style={{
          background: "transparent", border: "1px solid " + BORDER,
          borderRadius: 8, color: "#888", fontSize: 12, padding: "6px 12px", cursor: "pointer",
        }}>ログアウト</button>
      </div>

      <div style={{
        position: "sticky", top: "calc(62px + env(safe-area-inset-top))", zIndex: 99,
        background: BG, borderBottom: "1px solid " + BORDER, display: "flex",
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "12px", background: "transparent", border: "none",
            borderBottom: `3px solid ${tab === t.id ? ACCENT : "transparent"}`,
            color: tab === t.id ? ACCENT : "#555",
            fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {tab === "report"
        ? <AthleteReportTab todayReport={myReports[todayStr()]} onSubmit={handleSubmitReport} />
        : <AthleteHistoryTab athleteReports={myReports} />
      }
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
  const [saving, setSaving] = useState(false);

  const canSubmit = training.trim() && mood && body;

  const handleSubmit = async () => {
    setSaving(true);
    await onSubmit({ training, mood, body, concern, message });
    setSubmitted(true);
    setSaving(false);
  };

  const displayReport = submitted ? { training, mood, body, concern, message } : todayReport;

  if (displayReport && (submitted || todayReport)) {
    const m = MOOD_LEVELS.find(l => l.value === displayReport.mood);
    const b = BODY_LEVELS.find(l => l.value === displayReport.body);
    return (
      <div style={{ padding: "40px 20px 60px", textAlign: "center" }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>日報を送信しました</div>
        <div style={{ fontSize: 14, color: "#888", marginBottom: 32 }}>コーチが確認します。お疲れ様でした！</div>
        <div style={{ background: BG_CARD, borderRadius: 16, border: "1px solid " + BORDER, padding: 20, textAlign: "left", maxWidth: 380, margin: "0 auto" }}>
          <div style={{ color: ACCENT, fontWeight: 700, marginBottom: 12, fontSize: 13 }}>📋 本日の記録</div>
          <div style={{ fontSize: 13, color: "#aaa", lineHeight: 2 }}>
            <div>📅 {todayLabel()}</div>
            <div style={{ marginTop: 4 }}>💪 {displayReport.training}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <Badge color={m?.color}>{m?.emoji} メンタル: {m?.label}</Badge>
              <Badge color={b?.color}>💪 体調: {b?.label}</Badge>
            </div>
            {displayReport.concern && <div style={{ color: "#f97316", marginTop: 8 }}>⚠️ {displayReport.concern}</div>}
            {displayReport.message && <div style={{ color: "#60a5fa", marginTop: 4 }}>💬 {displayReport.message}</div>}
          </div>
        </div>
      </div>
    );
  }

  const textareaStyle = {
    width: "100%", background: BG_CARD, border: "1px solid " + BORDER,
    borderRadius: 14, padding: "14px 16px", color: "#fff", fontSize: 14,
    resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.7, boxSizing: "border-box",
  };
  const labelStyle = {
    fontSize: 12, color: "#888", fontWeight: 700, letterSpacing: "0.08em",
    textTransform: "uppercase", display: "block", marginBottom: 10,
  };

  return (
    <div style={{ padding: "24px 20px 60px" }}>
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid " + BORDER }}>
        <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 4 }}>TODAY'S REPORT</div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>{todayLabel()}</div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>💪 トレーニング内容 <span style={{ color: "#ef4444" }}>*</span></label>
        <textarea value={training} onChange={e => setTraining(e.target.value)} rows={5}
          placeholder={"例：\n・スクワット 80kg × 5 × 3set\n・ベンチプレス 60kg × 8 × 3set\n・ランニング 5km"}
          style={textareaStyle} />
      </div>

      <ScaleSelector levels={MOOD_LEVELS} value={mood} onChange={setMood} label="😊 メンタル状態 *" />
      <ScaleSelector levels={BODY_LEVELS} value={body} onChange={setBody} label="🏋️ 身体の状態 *" />

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>⚠️ 気になること・課題（任意）</label>
        <textarea value={concern} onChange={e => setConcern(e.target.value)} rows={3}
          placeholder="例：右膝に違和感がある、フォームが安定しない..." style={textareaStyle} />
      </div>

      <div style={{ marginBottom: 32 }}>
        <label style={labelStyle}>💬 コーチへのメッセージ（任意）</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
          placeholder="例：次回のセッションで確認したいことがあります..." style={textareaStyle} />
      </div>

      <button disabled={!canSubmit || saving} onClick={handleSubmit} style={{
        width: "100%", padding: 18, borderRadius: 16, border: "none",
        background: canSubmit ? ACCENT : "#252535",
        color: canSubmit ? BG : "#555",
        fontSize: 16, fontWeight: 900,
        cursor: canSubmit ? "pointer" : "not-allowed",
        transition: "all 0.2s", letterSpacing: "0.05em",
      }}>
        {saving ? "送信中..." : "日報を送信する →"}
      </button>
    </div>
  );
}

function AthleteHistoryTab({ athleteReports }) {
  const sortedDates = Object.keys(athleteReports).sort((a, b) => b.localeCompare(a));
  return (
    <div style={{ padding: "24px 20px 60px" }}>
      <div style={{ background: BG_CARD, borderRadius: 16, border: "1px solid " + BORDER, padding: 16, marginBottom: 28 }}>
        <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700, marginBottom: 12, letterSpacing: "0.08em" }}>📊 14日間のトレンド</div>
        <TrendGraph athleteReports={athleteReports} />
      </div>
      <div style={{ fontSize: 12, color: "#888", fontWeight: 700, marginBottom: 12, letterSpacing: "0.08em" }}>
        📅 過去の日報 ({sortedDates.length}件)
      </div>
      {sortedDates.length === 0 ? (
        <div style={{ color: "#555", textAlign: "center", padding: 40 }}>記録がありません</div>
      ) : sortedDates.map(dateStr => {
        const r = athleteReports[dateStr];
        const m = MOOD_LEVELS.find(l => l.value === r.mood);
        const b = BODY_LEVELS.find(l => l.value === r.body);
        return (
          <div key={dateStr} style={{ background: BG_CARD, borderRadius: 14, border: "1px solid " + BORDER, padding: 16, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 }}>
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

// ============ COACH SCREEN ============
function CoachScreen({ userProfile, onLogout }) {
  const [tab, setTab] = useState("athletes");
  const [athletes, setAthletes] = useState([]);
  const [allReports, setAllReports] = useState({});

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "athlete"));
    const unsub = onSnapshot(q, async (snap) => {
      const list = snap.docs.map(d => d.data());
      setAthletes(list);
      const reportsObj = {};
      await Promise.all(list.map(async (a) => {
        const snap2 = await getDocs(collection(db, "reports", a.uid, "daily"));
        reportsObj[a.uid] = {};
        snap2.forEach(d => { reportsObj[a.uid][d.id] = d.data(); });
      }));
      setAllReports(reportsObj);
    });
    return unsub;
  }, []);

  const alertCount = athletes.filter(a => {
    const r = allReports[a.uid]?.[todayStr()];
    return r && (r.mood <= 2 || r.body <= 2);
  }).length;
  const noReportCount = athletes.filter(a => !allReports[a.uid]?.[todayStr()]).length;
  const badgeCount = alertCount + noReportCount;

  const TABS = [
    { id: "athletes", label: "選手一覧",   icon: "👥" },
    { id: "alerts",   label: "要チェック", icon: "🚨", badge: badgeCount },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: BG, borderBottom: "1px solid " + BORDER,
        padding: "13px 20px 13px",
        paddingTop: "calc(13px + env(safe-area-inset-top))",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 10, color: ACCENT, fontWeight: 700, letterSpacing: "0.2em", marginBottom: 2 }}>COACH DASHBOARD</div>
          <div style={{ fontSize: 16, fontWeight: 900 }}>{userProfile.name}</div>
        </div>
        <button onClick={onLogout} style={{
          background: "transparent", border: "1px solid " + BORDER,
          borderRadius: 8, color: "#888", fontSize: 12, padding: "6px 12px", cursor: "pointer",
        }}>ログアウト</button>
      </div>

      <div style={{
        position: "sticky", top: "calc(62px + env(safe-area-inset-top))", zIndex: 99,
        background: BG, borderBottom: "1px solid " + BORDER, display: "flex",
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "12px", background: "transparent", border: "none",
            borderBottom: `3px solid ${tab === t.id ? ACCENT : "transparent"}`,
            color: tab === t.id ? ACCENT : "#555",
            fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            {t.icon} {t.label}
            {t.badge > 0 && (
              <span style={{
                background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 900,
                borderRadius: 10, padding: "1px 6px", minWidth: 18, textAlign: "center", lineHeight: "16px",
              }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "athletes"
        ? <CoachAthletesTab athletes={athletes} allReports={allReports} />
        : <CoachAlertsTab athletes={athletes} allReports={allReports} />
      }
    </div>
  );
}

function CoachAthletesTab({ athletes, allReports }) {
  const [selected, setSelected] = useState(null);

  if (selected !== null) {
    const athlete = athletes.find(a => a.uid === selected);
    const athleteReports = allReports[selected] || {};
    const sortedDates = Object.keys(athleteReports).sort((a, b) => b.localeCompare(a));
    return (
      <div style={{ padding: "20px 20px 60px" }}>
        <button onClick={() => setSelected(null)} style={{
          background: BG_CARD, border: "1px solid " + BORDER, borderRadius: 10,
          color: "#aaa", fontSize: 13, padding: "8px 14px", cursor: "pointer", marginBottom: 20,
        }}>← 一覧に戻る</button>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <Avatar user={athlete} size={44} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{athlete?.name}</div>
            <div style={{ fontSize: 12, color: "#888" }}>{athlete?.sport || "未設定"} · {sortedDates.length}件の記録</div>
          </div>
        </div>

        <div style={{ background: BG_CARD, borderRadius: 16, border: "1px solid " + BORDER, padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700, marginBottom: 12, letterSpacing: "0.08em" }}>📊 14日間のトレンド</div>
          <TrendGraph athleteReports={athleteReports} />
        </div>

        <div style={{ fontSize: 12, color: "#888", fontWeight: 700, marginBottom: 12 }}>📋 日報履歴</div>
        {sortedDates.map(dateStr => {
          const r = athleteReports[dateStr];
          const m = MOOD_LEVELS.find(l => l.value === r.mood);
          const b = BODY_LEVELS.find(l => l.value === r.body);
          const isAlert = r.mood <= 2 || r.body <= 2;
          return (
            <div key={dateStr} style={{
              background: BG_CARD, borderRadius: 14,
              border: `1px solid ${isAlert ? "#ef444440" : BORDER}`,
              padding: 16, marginBottom: 10,
            }}>
              {isAlert && <div style={{ color: "#ef4444", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>⚠️ 要チェック</div>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 }}>
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
      {athletes.length === 0 ? (
        <div style={{ color: "#555", textAlign: "center", padding: 40 }}>選手が登録されていません</div>
      ) : athletes.map(athlete => {
        const todayRep = allReports[athlete.uid]?.[todayStr()];
        const totalReports = Object.keys(allReports[athlete.uid] || {}).length;
        const isAlert = todayRep && (todayRep.mood <= 2 || todayRep.body <= 2);
        const m = todayRep ? MOOD_LEVELS.find(l => l.value === todayRep.mood) : null;
        const b = todayRep ? BODY_LEVELS.find(l => l.value === todayRep.body) : null;
        return (
          <div key={athlete.uid} onClick={() => setSelected(athlete.uid)} style={{
            background: BG_CARD, borderRadius: 16,
            border: `1px solid ${isAlert ? "#ef444440" : BORDER}`,
            padding: 16, marginBottom: 12, cursor: "pointer",
          }}>
            {isAlert && (
              <div style={{
                background: "#ef444418", border: "1px solid #ef444440",
                borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#ef4444", fontWeight: 700, marginBottom: 12,
              }}>🚨 要チェック — メンタル/体調が低下</div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar user={athlete} size={40} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{athlete.name}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{athlete.sport || "未設定"} · {totalReports}件の記録</div>
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
                {todayRep.concern && <div style={{ fontSize: 12, color: "#f97316", marginTop: 8 }}>⚠️ {todayRep.concern}</div>}
                {todayRep.message && <div style={{ fontSize: 12, color: "#60a5fa", marginTop: 4 }}>💬 {todayRep.message}</div>}
              </div>
            ) : (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid " + BORDER, fontSize: 12, color: "#555" }}>
                本日の日報 未提出
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CoachAlertsTab({ athletes, allReports }) {
  const alertAthletes = athletes.filter(a => {
    const r = allReports[a.uid]?.[todayStr()];
    return r && (r.mood <= 2 || r.body <= 2);
  });
  const noReportAthletes = athletes.filter(a => !allReports[a.uid]?.[todayStr()]);

  return (
    <div style={{ padding: "20px 20px 60px" }}>
      {alertAthletes.length === 0 && noReportAthletes.length === 0 && (
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
            const r = allReports[athlete.uid][todayStr()];
            const m = MOOD_LEVELS.find(l => l.value === r.mood);
            const b = BODY_LEVELS.find(l => l.value === r.body);
            return (
              <div key={athlete.uid} style={{
                background: "#ef444410", borderRadius: 14, border: "1px solid #ef444440", padding: 16, marginBottom: 12,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <Avatar user={athlete} size={36} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{athlete.name}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{athlete.sport || "未設定"}</div>
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
            <div key={athlete.uid} style={{
              background: BG_CARD, borderRadius: 14, border: "1px solid #f9731640",
              padding: 16, marginBottom: 10, display: "flex", alignItems: "center", gap: 12,
            }}>
              <Avatar user={athlete} size={36} />
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
  const [authLoading, setAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    getRedirectResult(auth).catch(() => {});
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserProfile(userSnap.data());
        } else {
          const newProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || "Unknown",
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL || "",
            role: "athlete",
            sport: "",
            avatar: "🏃",
            createdAt: new Date().toISOString(),
          };
          await setDoc(userRef, newProfile);
          setUserProfile(newProfile);
        }
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: ACCENT, fontSize: 40 }}>⚡</div>
      </div>
    );
  }

  if (!userProfile) return <LoginScreen />;
  if (userProfile.role === "coach") return <CoachScreen userProfile={userProfile} onLogout={handleLogout} />;
  return <AthleteScreen userProfile={userProfile} onLogout={handleLogout} />;
}
