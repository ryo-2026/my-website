import { useState } from "react";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { ACCENT, BG, BG_CARD, BORDER } from "../../constants";

export default function PinEntryScreen({ firebaseUser, onSuccess }) {
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
