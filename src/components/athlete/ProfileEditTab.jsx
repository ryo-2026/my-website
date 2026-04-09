import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { ACCENT, BG, BG_CARD, BORDER, GRADES, SPORTS, GENDERS } from "../../constants";
import { profileNameStr, profileKanaStr, profileSportStr } from "../../utils";

export default function ProfileEditTab({ userProfile, onProfileUpdate }) {
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
              background: BG, border: "1px solid " + BORDER,
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
