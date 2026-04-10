import { useState, useEffect } from "react";
import { collection, deleteDoc, doc, getDocs, setDoc, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { ACCENT, BG_CARD, BORDER } from "../../constants";
import Avatar from "../shared/Avatar";

export default function CoachManageTab({ userProfile }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nameQuery, setNameQuery] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [confirm, setConfirm] = useState(null); // { uid, action: "appoint"|"demote"|"remove" }
  const [processing, setProcessing] = useState(false);

  const loadMembers = async () => {
    setLoading(true);
    const snap = await getDocs(query(collection(db, "users"), where("role", "in", ["athlete", "coach"])));
    setMembers(snap.docs.map(d => d.data()));
    setLoading(false);
  };

  useEffect(() => { loadMembers(); }, []);

  const filtered = members.filter(m => {
    const fullName = [m.lastNameKanji, m.firstNameKanji].filter(Boolean).join("");
    const fullKana = [m.lastNameKana, m.firstNameKana].filter(Boolean).join("");
    const q = nameQuery.replace(/\s/g, "");
    if (q && !fullName.includes(q) && !fullKana.includes(q) && !(m.name || "").includes(q)) return false;
    if (filterRole && m.role !== filterRole) return false;
    return true;
  });

  const handleConfirm = async () => {
    if (!confirm || processing) return;
    setProcessing(true);
    const { uid, action } = confirm;
    try {
      if (action === "appoint") {
        await setDoc(doc(db, "users", uid), { role: "coach" }, { merge: true });
      } else if (action === "demote") {
        await setDoc(doc(db, "users", uid), { role: "athlete" }, { merge: true });
      } else if (action === "remove") {
        await deleteDoc(doc(db, "users", uid));
      }
      await loadMembers();
    } finally {
      setProcessing(false);
      setConfirm(null);
    }
  };

  const filterBtnStyle = (active) => ({
    padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
    cursor: "pointer", whiteSpace: "nowrap",
    border: `1px solid ${active ? ACCENT : BORDER}`,
    background: active ? ACCENT + "22" : BG_CARD,
    color: active ? ACCENT : "#666",
  });

  const displayName = (m) =>
    [m.lastNameKanji, m.firstNameKanji].filter(Boolean).join(" ") || m.name || "未設定";

  return (
    <div style={{ padding: "20px 20px 60px" }}>

      {/* 検索 */}
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

      {/* フィルター */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        <button style={filterBtnStyle(filterRole === "")} onClick={() => setFilterRole("")}>全員</button>
        <button style={filterBtnStyle(filterRole === "athlete")} onClick={() => setFilterRole(filterRole === "athlete" ? "" : "athlete")}>選手</button>
        <button style={filterBtnStyle(filterRole === "coach")} onClick={() => setFilterRole(filterRole === "coach" ? "" : "coach")}>コーチ</button>
      </div>

      <div style={{ fontSize: 12, color: "#555", marginBottom: 12 }}>
        {filtered.length}件 / {members.length}人
      </div>

      {/* リスト */}
      {loading ? (
        <div style={{ color: "#555", textAlign: "center", padding: 40 }}>読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "#555", textAlign: "center", padding: 40 }}>該当するメンバーがいません</div>
      ) : filtered.map(m => {
        const isConfirming = confirm?.uid === m.uid;
        const isDanger = isConfirming && confirm.action === "remove";

        return (
          <div key={m.uid} style={{
            background: BG_CARD, borderRadius: 16,
            border: `1px solid ${isDanger ? "#ef444440" : BORDER}`,
            padding: 16, marginBottom: 12,
          }}>
            {/* メンバー行 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isConfirming ? 14 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar user={m} size={40} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{displayName(m)}</div>
                  <div style={{ fontSize: 11, color: m.role === "coach" ? "#60a5fa" : "#888" }}>
                    {m.role === "coach" ? "👔 コーチ" : "🏃 選手"}
                  </div>
                </div>
              </div>

              {!isConfirming && (
                <div style={{ display: "flex", gap: 6 }}>
                  {m.role === "athlete" && (<>
                    <button onClick={() => setConfirm({ uid: m.uid, action: "appoint" })} style={{
                      padding: "7px 11px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      background: "#60a5fa22", border: "1px solid #60a5fa44",
                      color: "#60a5fa", cursor: "pointer",
                    }}>任命</button>
                    <button onClick={() => setConfirm({ uid: m.uid, action: "remove" })} style={{
                      padding: "7px 11px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      background: "#ef444418", border: "1px solid #ef444440",
                      color: "#ef4444", cursor: "pointer",
                    }}>除名</button>
                  </>)}
                  {m.role === "coach" && (
                    <button onClick={() => setConfirm({ uid: m.uid, action: "demote" })} style={{
                      padding: "7px 11px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      background: "#f9731618", border: "1px solid #f9731640",
                      color: "#f97316", cursor: "pointer",
                    }}>解任</button>
                  )}
                </div>
              )}
            </div>

            {/* 確認UI（インライン） */}
            {isConfirming && (
              <div style={{
                background: isDanger ? "#ef444412" : "#252535",
                border: `1px solid ${isDanger ? "#ef444440" : BORDER}`,
                borderRadius: 12, padding: 14,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: isDanger ? "#ef4444" : "#fff" }}>
                  {confirm.action === "appoint" && `${displayName(m)} をコーチに任命しますか？`}
                  {confirm.action === "demote"  && `${displayName(m)} を選手に解任しますか？`}
                  {confirm.action === "remove"  && `${displayName(m)} を除名しますか？`}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleConfirm} disabled={processing} style={{
                    flex: 1, padding: 10,
                    background: isDanger ? "#ef4444" : ACCENT,
                    border: "none", borderRadius: 10,
                    color: isDanger ? "#fff" : "#000",
                    fontSize: 13, fontWeight: 700,
                    cursor: processing ? "not-allowed" : "pointer",
                  }}>
                    {processing ? "処理中..." : "実行する"}
                  </button>
                  <button onClick={() => setConfirm(null)} disabled={processing} style={{
                    flex: 1, padding: 10,
                    background: "#1a1a2e", border: "1px solid " + BORDER,
                    borderRadius: 10, color: "#888",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}>キャンセル</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
