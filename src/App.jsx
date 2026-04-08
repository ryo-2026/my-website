import { useState, useEffect, useRef } from "react";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
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
      await signInWithPopup(auth, provider);
    } catch {
      setError("ログインに失敗しました。もう一度お試しください。");
    } finally {
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

// ============ PIN ENTRY SCREEN ============
function PinEntryScreen({ firebaseUser, onSuccess }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!pin) return;
    setLoading(true);
    setError("");
    try {
      const settingsSnap = await getDoc(doc(db, "config", "teamSettings"));
      const teamPin = settingsSnap.data()?.pin;
      if (!teamPin) {
        setError("PINがまだ設定されていません。コーチに確認してください。");
        return;
      }
      if (pin !== teamPin) {
        setError("PINが違います。コーチに確認してください。");
        return;
      }
      const userRef = doc(db, "users", firebaseUser.uid);
      await setDoc(userRef, {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || "Unknown",
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL || "",
        role: "athlete",
        sport: "",
        avatar: "🏃",
        createdAt: new Date().toISOString(),
      });
      onSuccess(firebaseUser);
    } catch {
      setError("エラーが発生しました。もう一度お試しください。");
    } finally {
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
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🔑</div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>チームPINを入力</div>
        <div style={{ fontSize: 13, color: "#888", marginTop: 8 }}>
          コーチから共有されたPINコードを入力してください
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 320 }}>
        <input
          type="tel"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          placeholder="PINコード"
          style={{
            width: "100%", padding: "16px", boxSizing: "border-box",
            background: BG_CARD, border: `2px solid ${error ? "#ef4444" : BORDER}`,
            borderRadius: 14, color: "#fff",
            fontSize: 24, fontWeight: 700, letterSpacing: "0.3em",
            textAlign: "center", outline: "none",
          }}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
        />
        {error && (
          <div style={{ color: "#ef4444", fontSize: 13, marginTop: 10, textAlign: "center" }}>
            {error}
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading || !pin}
          style={{
            width: "100%", marginTop: 16, padding: 16,
            background: pin && !loading ? ACCENT : "#252535",
            border: "none", borderRadius: 14,
            color: pin && !loading ? "#000" : "#555",
            fontSize: 15, fontWeight: 700,
            cursor: pin && !loading ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "確認中..." : "参加する"}
        </button>
        <button
          onClick={() => signOut(auth)}
          style={{
            width: "100%", marginTop: 10, padding: 12,
            background: "transparent", border: "none",
            color: "#555", fontSize: 13, cursor: "pointer",
          }}
        >
          別のアカウントでログイン
        </button>
      </div>
    </div>
  );
}

// ============ PROFILE HELPERS ============
const GRADES = ["小1","小2","小3","小4","小5","小6","中1","中2","中3"];
const SPORTS = ["サッカー","テニス","バスケ"];
const GENDERS = ["男","女","その他"];

function profileSportStr(p) {
  return [p?.sport, p?.isPersonal ? "パーソナル" : ""].filter(Boolean).join(" · ") || "—";
}
function profileNameStr(p) {
  return [p?.lastNameKanji, p?.firstNameKanji].filter(Boolean).join(" ") || "—";
}
function profileKanaStr(p) {
  return [p?.lastNameKana, p?.firstNameKana].filter(Boolean).join(" ") || "—";
}
// （比較テーブル・申請フォームは不使用）

// ============ PROFILE EDIT TAB ============
function ProfileEditTab({ userProfile, onProfileUpdate }) {
  const [lastNameKanji, setLastNameKanji] = useState(userProfile.lastNameKanji || "");
  const [firstNameKanji, setFirstNameKanji] = useState(userProfile.firstNameKanji || "");
  const [lastNameKana, setLastNameKana] = useState(userProfile.lastNameKana || "");
  const [firstNameKana, setFirstNameKana] = useState(userProfile.firstNameKana || "");
  const [gender, setGender] = useState(userProfile.gender || "");
  const [grade, setGrade] = useState(userProfile.grade || "");
  const [sport, setSport] = useState(userProfile.sport || "");
  const [isPersonal, setIsPersonal] = useState(userProfile.isPersonal || false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const isLocked = !!userProfile.profileLocked;
  const hasRequested = !!userProfile.profileEditRequest;

  const inputStyle = {
    width: "100%", background: BG_CARD, border: "1px solid " + BORDER,
    borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14,
    outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 12, color: "#888", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 10 };
  const sectionStyle = { marginBottom: 24 };
  const optionBtn = (active) => ({
    padding: "10px 4px", borderRadius: 10,
    border: `2px solid ${active ? ACCENT : BORDER}`,
    background: active ? ACCENT + "22" : BG_CARD,
    color: active ? ACCENT : "#888",
    cursor: "pointer", fontSize: 13, fontWeight: 700,
  });

  const handleSave = async () => {
    setSaving(true);
    const updates = {
      lastNameKanji, firstNameKanji, lastNameKana, firstNameKana,
      gender, grade, sport, isPersonal,
      profileLocked: true, profileEditRequest: false,
    };
    await setDoc(doc(db, "users", userProfile.uid), updates, { merge: true });
    onProfileUpdate({ ...userProfile, ...updates });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleRequest = async () => {
    setRequesting(true);
    await setDoc(doc(db, "users", userProfile.uid), { profileEditRequest: true }, { merge: true });
    onProfileUpdate({ ...userProfile, profileEditRequest: true });
    setRequesting(false);
  };

  // ---- ロック中の表示 ----
  if (isLocked) {
    const rows = [
      { label: "お名前",   value: profileNameStr(userProfile) },
      { label: "フリガナ", value: profileKanaStr(userProfile) },
      { label: "性別",     value: userProfile.gender || "—" },
      { label: "学年",     value: userProfile.grade  || "—" },
      { label: "競技種目", value: profileSportStr(userProfile) },
    ];
    return (
      <div style={{ padding: "24px 20px 60px" }}>
        <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid " + BORDER }}>
          <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 4 }}>PROFILE</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>プロフィール</div>
        </div>

        <div style={{ background: BG_CARD, borderRadius: 16, border: "1px solid " + BORDER, overflow: "hidden", marginBottom: 20 }}>
          {rows.map((r, i, arr) => (
            <div key={r.label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 16px",
              borderBottom: i < arr.length - 1 ? "1px solid " + BORDER : "none",
            }}>
              <span style={{ fontSize: 12, color: "#888", fontWeight: 700 }}>{r.label}</span>
              <span style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>{r.value}</span>
            </div>
          ))}
        </div>

        {hasRequested ? (
          <div style={{
            background: "#60a5fa0f", border: "1px solid #60a5fa33",
            borderRadius: 14, padding: 20, textAlign: "center",
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📨</div>
            <div style={{ fontSize: 14, color: "#60a5fa", fontWeight: 700, marginBottom: 6 }}>変更申請中</div>
            <div style={{ fontSize: 12, color: "#888" }}>コーチの承認をお待ちください</div>
          </div>
        ) : (
          <>
            <div style={{
              background: "#1a1a2e", border: "1px solid #2a2a3e",
              borderRadius: 12, padding: "12px 16px", marginBottom: 16,
              fontSize: 12, color: "#888", lineHeight: 1.7,
            }}>
              🔒 プロフィールはロックされています。<br />変更が必要な場合はコーチに申請してください。
            </div>
            <button onClick={handleRequest} disabled={requesting} style={{
              width: "100%", padding: 18, borderRadius: 16,
              background: "#60a5fa22", color: "#60a5fa",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              border: "1px solid #60a5fa44",
            }}>
              {requesting ? "申請中..." : "✏️ 変更を申請する"}
            </button>
          </>
        )}
      </div>
    );
  }

  // ---- 編集フォーム（初回 or アンロック後） ----
  return (
    <div style={{ padding: "24px 20px 60px" }}>
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid " + BORDER }}>
        <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 4 }}>PROFILE</div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>プロフィール編集</div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>👤 お名前</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={lastNameKanji} onChange={e => setLastNameKanji(e.target.value)} placeholder="姓（田中）" style={{ ...inputStyle, flex: 1 }} />
          <input value={firstNameKanji} onChange={e => setFirstNameKanji(e.target.value)} placeholder="名（翼）" style={{ ...inputStyle, flex: 1 }} />
        </div>
      </div>
      <div style={sectionStyle}>
        <label style={labelStyle}>👤 フリガナ</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={lastNameKana} onChange={e => setLastNameKana(e.target.value)} placeholder="セイ（タナカ）" style={{ ...inputStyle, flex: 1 }} />
          <input value={firstNameKana} onChange={e => setFirstNameKana(e.target.value)} placeholder="メイ（ツバサ）" style={{ ...inputStyle, flex: 1 }} />
        </div>
      </div>
      <div style={sectionStyle}>
        <label style={labelStyle}>⚥ 性別</label>
        <div style={{ display: "flex", gap: 8 }}>
          {GENDERS.map(g => <button key={g} onClick={() => setGender(g)} style={{ flex: 1, ...optionBtn(gender === g) }}>{g}</button>)}
        </div>
      </div>
      <div style={sectionStyle}>
        <label style={labelStyle}>🎓 学年</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {GRADES.map(g => <button key={g} onClick={() => setGrade(g)} style={optionBtn(grade === g)}>{g}</button>)}
        </div>
      </div>
      <div style={sectionStyle}>
        <label style={labelStyle}>🏆 競技種目</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {SPORTS.map(s => <button key={s} onClick={() => setSport(sport === s ? "" : s)} style={{ flex: 1, ...optionBtn(sport === s) }}>{s}</button>)}
        </div>
        <button onClick={() => setIsPersonal(!isPersonal)} style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          background: isPersonal ? ACCENT + "22" : BG_CARD,
          border: `2px solid ${isPersonal ? ACCENT : BORDER}`,
          borderRadius: 10, padding: "10px 14px", cursor: "pointer",
          color: isPersonal ? ACCENT : "#888", fontSize: 13, fontWeight: 700,
        }}>
          <span style={{
            width: 18, height: 18, borderRadius: 4, flexShrink: 0,
            background: isPersonal ? ACCENT : "transparent",
            border: `2px solid ${isPersonal ? ACCENT : "#555"}`,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, color: BG,
          }}>{isPersonal ? "✓" : ""}</span>
          パーソナル
        </button>
      </div>

      <button onClick={handleSave} disabled={saving} style={{
        width: "100%", padding: 18, borderRadius: 16, border: "none",
        background: saved ? "#22c55e" : ACCENT,
        color: BG, fontSize: 16, fontWeight: 900,
        cursor: saving ? "not-allowed" : "pointer",
        transition: "all 0.2s", letterSpacing: "0.05em",
      }}>
        {saving ? "保存中..." : saved ? "✓ 保存しました" : "プロフィールを保存する"}
      </button>
    </div>
  );
}

// ============ ATHLETE SCREEN ============
function AthleteScreen({ userProfile, onLogout, onProfileUpdate }) {
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
    { id: "profile", label: "プロフィール", icon: "👤" },
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
            <div style={{ fontSize: 15, fontWeight: 800 }}>
              {(userProfile.lastNameKanji || userProfile.firstNameKanji)
                ? `${userProfile.lastNameKanji} ${userProfile.firstNameKanji}`.trim()
                : userProfile.name}
            </div>
            {userProfile.profileEditRequest ? (
              <div style={{ fontSize: 11, color: "#60a5fa" }}>📨 変更申請中</div>
            ) : (userProfile.grade || userProfile.sport || userProfile.isPersonal) ? (
              <div style={{ fontSize: 11, color: "#888" }}>
                {[userProfile.grade, userProfile.sport, userProfile.isPersonal ? "パーソナル" : ""].filter(Boolean).join(" · ")}
              </div>
            ) : null}
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

      {tab === "report" && <AthleteReportTab todayReport={myReports[todayStr()]} onSubmit={handleSubmitReport} />}
      {tab === "history" && <AthleteHistoryTab athleteReports={myReports} />}
      {tab === "profile" && <ProfileEditTab userProfile={userProfile} onProfileUpdate={onProfileUpdate} />}
    </div>
  );
}

function AthleteReportTab({ todayReport, onSubmit }) {
  const [training, setTraining] = useState("");
  const [mood, setMood] = useState(null);
  const [body, setBody] = useState(null);
  const [concern, setConcern] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = training.trim() && mood && body;

  const handleSubmit = async () => {
    setSaving(true);
    await onSubmit({ training, mood, body, concern, message });
    setSaving(false);
  };

  if (todayReport) {
    const displayReport = todayReport;
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
    { id: "settings", label: "設定",       icon: "⚙️" },
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
          <div style={{ fontSize: 16, fontWeight: 900 }}>
            {(userProfile.lastNameKanji || userProfile.firstNameKanji)
              ? `${userProfile.lastNameKanji || ""} ${userProfile.firstNameKanji || ""}`.trim()
              : userProfile.name}
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

      {tab === "athletes" && <CoachAthletesTab athletes={athletes} allReports={allReports} />}
      {tab === "alerts"   && <CoachAlertsTab athletes={athletes} allReports={allReports} />}
      {tab === "settings" && <CoachSettingsTab userProfile={userProfile} />}
    </div>
  );
}

function CoachAthletesTab({ athletes, allReports }) {
  const [selected, setSelected] = useState(null);
  const [unlocking, setUnlocking] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const [filterSport, setFilterSport] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterPersonal, setFilterPersonal] = useState("");

  const handleUnlock = async (athleteUid) => {
    setUnlocking(true);
    await setDoc(doc(db, "users", athleteUid), {
      profileLocked: false,
      profileEditRequest: false,
    }, { merge: true });
    setUnlocking(false);
  };

  if (selected !== null) {
    const athlete = athletes.find(a => a.uid === selected);
    const athleteReports = allReports[selected] || {};
    const sortedDates = Object.keys(athleteReports).sort((a, b) => b.localeCompare(a));
    const fullName = [athlete?.lastNameKanji, athlete?.firstNameKanji].filter(Boolean).join(" ");
    const fullKana = [athlete?.lastNameKana, athlete?.firstNameKana].filter(Boolean).join(" ");
    return (
      <div style={{ padding: "20px 20px 60px" }}>
        <button onClick={() => setSelected(null)} style={{
          background: BG_CARD, border: "1px solid " + BORDER, borderRadius: 10,
          color: "#aaa", fontSize: 13, padding: "8px 14px", cursor: "pointer", marginBottom: 20,
        }}>← 一覧に戻る</button>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <Avatar user={athlete} size={44} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{fullName || athlete?.name}</div>
            {fullKana && <div style={{ fontSize: 12, color: "#888" }}>{fullKana}</div>}
            <div style={{ fontSize: 12, color: "#888" }}>{athlete?.sport || "未設定"} · {sortedDates.length}件の記録</div>
          </div>
        </div>

        {athlete?.profileEditRequest && (
          <div style={{
            background: "#60a5fa18", border: "1px solid #60a5fa44",
            borderRadius: 12, padding: 16, marginBottom: 20,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 13, color: "#60a5fa", fontWeight: 700 }}>📨 プロフィール変更申請あり</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>許可すると選手が1回だけ編集できます</div>
            </div>
            <button onClick={() => handleUnlock(athlete.uid)} disabled={unlocking} style={{
              background: "#60a5fa", color: "#fff", border: "none",
              borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 700,
              cursor: unlocking ? "not-allowed" : "pointer", whiteSpace: "nowrap",
            }}>
              {unlocking ? "処理中..." : "🔓 編集を許可"}
            </button>
          </div>
        )}

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

  const filteredAthletes = athletes.filter(a => {
    const fullName = [a.lastNameKanji, a.firstNameKanji].filter(Boolean).join("");
    const fullKana = [a.lastNameKana, a.firstNameKana].filter(Boolean).join("");
    const q = nameQuery.replace(/\s/g, "");
    if (q && !fullName.includes(q) && !fullKana.includes(q)) return false;
    if (filterSport && a.sport !== filterSport) return false;
    if (filterGrade && a.grade !== filterGrade) return false;
    if (filterGender && a.gender !== filterGender) return false;
    if (filterPersonal === "パーソナル" && !a.isPersonal) return false;
    return true;
  });

  const filterBtnStyle = (active) => ({
    padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
    cursor: "pointer", whiteSpace: "nowrap",
    border: `1px solid ${active ? ACCENT : BORDER}`,
    background: active ? ACCENT + "22" : BG_CARD,
    color: active ? ACCENT : "#666",
  });

  return (
    <div style={{ padding: "20px 20px 60px" }}>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>{todayLabel()}</div>

      {/* 名前検索 */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "#555" }}>🔍</span>
        <input
          value={nameQuery}
          onChange={e => setNameQuery(e.target.value)}
          placeholder="名前で検索..."
          style={{
            width: "100%", boxSizing: "border-box",
            background: BG_CARD, border: "1px solid " + BORDER,
            borderRadius: 12, padding: "11px 14px 11px 36px",
            color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit",
          }}
        />
        {nameQuery && (
          <button onClick={() => setNameQuery("")} style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer", lineHeight: 1,
          }}>×</button>
        )}
      </div>

      {/* 競技フィルター */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "#666", fontWeight: 700, marginBottom: 6 }}>競技</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={filterBtnStyle(filterSport === "")} onClick={() => setFilterSport("")}>全て</button>
          {SPORTS.map(s => (
            <button key={s} style={filterBtnStyle(filterSport === s)} onClick={() => setFilterSport(filterSport === s ? "" : s)}>{s}</button>
          ))}
        </div>
      </div>

      {/* 学年フィルター */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "#666", fontWeight: 700, marginBottom: 6 }}>学年</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={filterBtnStyle(filterGrade === "")} onClick={() => setFilterGrade("")}>全て</button>
          {GRADES.map(g => (
            <button key={g} style={filterBtnStyle(filterGrade === g)} onClick={() => setFilterGrade(filterGrade === g ? "" : g)}>{g}</button>
          ))}
        </div>
      </div>

      {/* 性別フィルター */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "#666", fontWeight: 700, marginBottom: 6 }}>性別</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={filterBtnStyle(filterGender === "")} onClick={() => setFilterGender("")}>全て</button>
          {GENDERS.map(g => (
            <button key={g} style={filterBtnStyle(filterGender === g)} onClick={() => setFilterGender(filterGender === g ? "" : g)}>{g}</button>
          ))}
        </div>
      </div>

      {/* パーソナルフィルター */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#666", fontWeight: 700, marginBottom: 6 }}>パーソナル</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={filterBtnStyle(filterPersonal === "")} onClick={() => setFilterPersonal("")}>全て</button>
          <button style={filterBtnStyle(filterPersonal === "パーソナル")} onClick={() => setFilterPersonal(filterPersonal === "パーソナル" ? "" : "パーソナル")}>パーソナル</button>
        </div>
      </div>

      {/* 件数表示 */}
      <div style={{ fontSize: 12, color: "#555", marginBottom: 12 }}>
        {filteredAthletes.length}件 / {athletes.length}人
      </div>

      {athletes.length === 0 ? (
        <div style={{ color: "#555", textAlign: "center", padding: 40 }}>選手が登録されていません</div>
      ) : filteredAthletes.length === 0 ? (
        <div style={{ color: "#555", textAlign: "center", padding: 40 }}>条件に一致する選手がいません</div>
      ) : filteredAthletes.map(athlete => {
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
                borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#ef4444", fontWeight: 700, marginBottom: 8,
              }}>🚨 要チェック — メンタル/体調が低下</div>
            )}
            {athlete.profileEditRequest && (
              <div style={{
                background: "#60a5fa18", border: "1px solid #60a5fa44",
                borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#60a5fa", fontWeight: 700, marginBottom: 8,
              }}>📨 プロフィール変更申請あり</div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar user={athlete} size={40} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>
                    {[athlete.lastNameKanji, athlete.firstNameKanji].filter(Boolean).join(" ") || athlete.name}
                  </div>
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
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{[athlete.lastNameKanji, athlete.firstNameKanji].filter(Boolean).join(" ") || athlete.name}</div>
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
                <div style={{ fontSize: 14, fontWeight: 700 }}>{[athlete.lastNameKanji, athlete.firstNameKanji].filter(Boolean).join(" ") || athlete.name}</div>
                <div style={{ fontSize: 12, color: "#f97316" }}>日報未提出</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ COACH SETTINGS TAB ============
function CoachSettingsTab({ userProfile }) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingPin, setLoadingPin] = useState(true);

  const [lastNameKanji, setLastNameKanji] = useState(userProfile?.lastNameKanji || "");
  const [firstNameKanji, setFirstNameKanji] = useState(userProfile?.firstNameKanji || "");
  const [lastNameKana, setLastNameKana] = useState(userProfile?.lastNameKana || "");
  const [firstNameKana, setFirstNameKana] = useState(userProfile?.firstNameKana || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const inputStyle = {
    flex: 1, background: "#1a1a2e", border: "1px solid " + BORDER,
    borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14,
    outline: "none", fontFamily: "inherit", boxSizing: "border-box", minWidth: 0,
  };

  useEffect(() => {
    getDoc(doc(db, "config", "teamSettings")).then(snap => {
      if (snap.exists()) setCurrentPin(snap.data().pin || "");
      setLoadingPin(false);
    });
  }, []);

  const handleProfileSave = async () => {
    if (!lastNameKanji && !firstNameKanji) return;
    setProfileSaving(true);
    await setDoc(doc(db, "users", userProfile.uid), {
      lastNameKanji, firstNameKanji, lastNameKana, firstNameKana,
    }, { merge: true });
    setProfileSaving(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleSave = async () => {
    if (!newPin) return;
    setSaving(true);
    await setDoc(doc(db, "config", "teamSettings"), { pin: newPin });
    setCurrentPin(newPin);
    setNewPin("");
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ padding: 20 }}>
      {/* プロフィール */}
      <div style={{ fontSize: 13, color: ACCENT, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 16 }}>
        プロフィール
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>お名前</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={lastNameKanji} onChange={e => setLastNameKanji(e.target.value)} placeholder="姓（田中）" style={inputStyle} />
          <input value={firstNameKanji} onChange={e => setFirstNameKanji(e.target.value)} placeholder="名（翼）" style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>フリガナ</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={lastNameKana} onChange={e => setLastNameKana(e.target.value)} placeholder="セイ（タナカ）" style={inputStyle} />
          <input value={firstNameKana} onChange={e => setFirstNameKana(e.target.value)} placeholder="メイ（ツバサ）" style={inputStyle} />
        </div>
      </div>
      <button
        onClick={handleProfileSave}
        disabled={(!lastNameKanji && !firstNameKanji) || profileSaving}
        style={{
          width: "100%", marginBottom: 32, padding: 14,
          background: (lastNameKanji || firstNameKanji) && !profileSaving ? ACCENT : "#252535",
          border: "none", borderRadius: 14,
          color: (lastNameKanji || firstNameKanji) && !profileSaving ? "#000" : "#555",
          fontSize: 14, fontWeight: 700,
          cursor: (lastNameKanji || firstNameKanji) && !profileSaving ? "pointer" : "not-allowed",
        }}
      >
        {profileSaving ? "保存中..." : profileSaved ? "✓ 保存しました" : "プロフィールを保存"}
      </button>

      <div style={{ fontSize: 13, color: ACCENT, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 20 }}>
        チーム参加PIN
      </div>

      <div style={{
        background: BG_CARD, border: "1px solid " + BORDER,
        borderRadius: 14, padding: 16, marginBottom: 24,
      }}>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>現在のPIN</div>
        {loadingPin ? (
          <div style={{ color: "#555", fontSize: 13 }}>読み込み中...</div>
        ) : currentPin ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "0.3em", color: ACCENT, flex: 1 }}>
              {showPin ? currentPin : "●".repeat(currentPin.length)}
            </div>
            <button
              onClick={() => setShowPin(!showPin)}
              style={{
                background: "transparent", border: "1px solid " + BORDER,
                borderRadius: 8, color: "#888", fontSize: 12, padding: "4px 10px", cursor: "pointer",
              }}
            >
              {showPin ? "隠す" : "表示"}
            </button>
          </div>
        ) : (
          <div style={{ color: "#555", fontSize: 13 }}>未設定</div>
        )}
      </div>

      <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>
        {currentPin ? "PINを変更" : "PINを設定"}
      </div>
      <input
        type="tel"
        value={newPin}
        onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
        placeholder="新しいPINコード（数字）"
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "14px", background: BG_CARD,
          border: "1px solid " + BORDER, borderRadius: 14,
          color: "#fff", fontSize: 22, fontWeight: 700,
          letterSpacing: "0.3em", textAlign: "center", outline: "none",
        }}
        onKeyDown={e => e.key === "Enter" && handleSave()}
      />
      <div style={{ fontSize: 11, color: "#555", marginTop: 6, textAlign: "center" }}>
        選手に口頭またはLINEで共有してください
      </div>
      <button
        onClick={handleSave}
        disabled={!newPin || saving}
        style={{
          width: "100%", marginTop: 16, padding: 14,
          background: newPin && !saving ? ACCENT : "#252535",
          border: "none", borderRadius: 14,
          color: newPin && !saving ? "#000" : "#555",
          fontSize: 14, fontWeight: 700,
          cursor: newPin && !saving ? "pointer" : "not-allowed",
        }}
      >
        {saving ? "保存中..." : saved ? "✓ 保存しました" : "PINを保存"}
      </button>
    </div>
  );
}

// ============ ROOT ============
export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [pendingFirebaseUser, setPendingFirebaseUser] = useState(null);
  const profileUnsubRef = useRef(null);

  const setupProfileListener = (firebaseUser) => {
    if (profileUnsubRef.current) profileUnsubRef.current();
    const userRef = doc(db, "users", firebaseUser.uid);
    profileUnsubRef.current = onSnapshot(userRef, (snap) => {
      if (snap.exists()) setUserProfile(snap.data());
    });
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (profileUnsubRef.current) { profileUnsubRef.current(); profileUnsubRef.current = null; }

      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          // 新規ユーザー → PIN入力画面へ
          setPendingFirebaseUser(firebaseUser);
          setAuthLoading(false);
          return;
        }
        setAuthLoading(false);
        // リアルタイムでユーザードキュメントを監視（コーチのアンロックが即反映される）
        setupProfileListener(firebaseUser);
      } else {
        setPendingFirebaseUser(null);
        setUserProfile(null);
        setAuthLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (profileUnsubRef.current) profileUnsubRef.current();
    };
  }, []);

  const handlePinSuccess = (firebaseUser) => {
    setPendingFirebaseUser(null);
    setupProfileListener(firebaseUser);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setPendingFirebaseUser(null);
    setUserProfile(null);
  };

  const handleProfileUpdate = (updatedProfile) => {
    setUserProfile(updatedProfile);
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: ACCENT, fontSize: 40 }}>⚡</div>
      </div>
    );
  }

  if (pendingFirebaseUser) return <PinEntryScreen firebaseUser={pendingFirebaseUser} onSuccess={handlePinSuccess} />;
  if (!userProfile) return <LoginScreen />;
  if (userProfile.role === "coach") return <CoachScreen userProfile={userProfile} onLogout={handleLogout} />;
  return <AthleteScreen userProfile={userProfile} onLogout={handleLogout} onProfileUpdate={handleProfileUpdate} />;
}
