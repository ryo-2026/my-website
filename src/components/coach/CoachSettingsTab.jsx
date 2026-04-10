import { useState, useEffect } from "react";
import { collection, doc, getDoc, getDocs, query, setDoc, where, writeBatch } from "firebase/firestore";
import { db } from "../../firebase";
import { ACCENT, BG_CARD, BORDER, GRADES } from "../../constants";
import { generateSalt, hashPin } from "../../utils/pinHash";

export default function CoachSettingsTab({ userProfile }) {
  const [hasPinSet, setHasPinSet] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingPin, setLoadingPin] = useState(true);

  const [lastNameKanji, setLastNameKanji] = useState(userProfile?.lastNameKanji || "");
  const [firstNameKanji, setFirstNameKanji] = useState(userProfile?.firstNameKanji || "");
  const [lastNameKana, setLastNameKana] = useState(userProfile?.lastNameKana || "");
  const [firstNameKana, setFirstNameKana] = useState(userProfile?.firstNameKana || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [gradeAdvancing, setGradeAdvancing] = useState(false);
  const [gradeAdvanced, setGradeAdvanced] = useState(null); // 更新人数
  const [gradeConfirm, setGradeConfirm] = useState(false);
  const [gradeError, setGradeError] = useState("");

  const inputStyle = {
    flex: 1, background: "#1a1a2e", border: "1px solid " + BORDER,
    borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14,
    outline: "none", fontFamily: "inherit", boxSizing: "border-box", minWidth: 0,
  };

  useEffect(() => {
    getDoc(doc(db, "config", "teamSettings")).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setHasPinSet(!!data.pinHash);
      }
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

  const handleAdvanceGrades = async () => {
    setGradeAdvancing(true);
    setGradeConfirm(false);
    setGradeError("");
    try {
      const snap = await getDocs(query(collection(db, "users"), where("role", "==", "athlete")));
      const batch = writeBatch(db);
      let count = 0;
      snap.docs.forEach(docSnap => {
        const idx = GRADES.indexOf(docSnap.data().grade);
        if (idx === -1 || idx === GRADES.length - 1) return;
        batch.update(docSnap.ref, { grade: GRADES[idx + 1] });
        count++;
      });
      if (count > 0) await batch.commit();
      setGradeAdvanced(count);
      setTimeout(() => setGradeAdvanced(null), 4000);
    } catch (e) {
      setGradeError("エラー: " + e.message);
    } finally {
      setGradeAdvancing(false);
    }
  };

  const handleSave = async () => {
    if (!newPin) return;
    setSaving(true);
    const salt = generateSalt();
    const hash = await hashPin(newPin, salt);
    await setDoc(doc(db, "config", "teamSettings"), { pinHash: hash, pinSalt: salt }, { merge: true });
    setHasPinSet(true);
    setNewPin("");
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ padding: 20 }}>
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

      <div style={{ fontSize: 13, color: ACCENT, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 16 }}>
        学年管理
      </div>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 12, lineHeight: 1.7 }}>
        全選手の学年を1年繰り上げます。中3はそのままです。毎年4月に1回実行してください。
      </div>
      {gradeError && (
        <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 10 }}>{gradeError}</div>
      )}
      {!gradeConfirm ? (
        <button
          onClick={() => { setGradeConfirm(true); setGradeError(""); }}
          disabled={gradeAdvancing}
          style={{
            width: "100%", marginBottom: 32, padding: 14,
            background: "#252535", border: "1px solid #ef444440",
            borderRadius: 14, color: gradeAdvanced !== null ? "#22c55e" : "#ef4444",
            fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}
        >
          {gradeAdvancing ? "処理中..." : gradeAdvanced !== null ? `✓ ${gradeAdvanced}人を更新しました` : "学年を一括繰り上げる"}
        </button>
      ) : (
        <div style={{
          background: "#ef444418", border: "1px solid #ef444440",
          borderRadius: 14, padding: 16, marginBottom: 32,
        }}>
          <div style={{ fontSize: 13, color: "#ef4444", fontWeight: 700, marginBottom: 12 }}>
            本当に実行しますか？全選手の学年が繰り上がります。
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleAdvanceGrades}
              disabled={gradeAdvancing}
              style={{
                flex: 1, padding: 12, background: "#ef4444",
                border: "none", borderRadius: 10, color: "#fff",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}
            >
              {gradeAdvancing ? "処理中..." : "実行する"}
            </button>
            <button
              onClick={() => setGradeConfirm(false)}
              style={{
                flex: 1, padding: 12, background: "#252535",
                border: "1px solid " + BORDER, borderRadius: 10, color: "#888",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

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
        ) : hasPinSet ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 20, color: ACCENT, fontWeight: 700 }}>設定済み</div>
            <div style={{ fontSize: 11, color: "#555" }}>（セキュリティのため表示不可）</div>
          </div>
        ) : (
          <div style={{ color: "#555", fontSize: 13 }}>未設定</div>
        )}
      </div>

      <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>
        {hasPinSet ? "PINを変更" : "PINを設定"}
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
