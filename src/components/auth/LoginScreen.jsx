import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../../firebase";
import { ACCENT, BG } from "../../constants";

export default function LoginScreen() {
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
