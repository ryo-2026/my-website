import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { ACCENT, BG_CARD, BORDER, MOOD_LEVELS, BODY_LEVELS, SPORTS, GRADES, GENDERS } from "../../constants";
import { todayStr, dateLabel } from "../../utils";
import Avatar from "../shared/Avatar";
import Badge from "../shared/Badge";
import TrendGraph from "../shared/TrendGraph";

export default function CoachAthletesTab({ athletes, allReports }) {
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

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "#666", fontWeight: 700, marginBottom: 6 }}>競技</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={filterBtnStyle(filterSport === "")} onClick={() => setFilterSport("")}>全て</button>
          {SPORTS.map(s => (
            <button key={s} style={filterBtnStyle(filterSport === s)} onClick={() => setFilterSport(filterSport === s ? "" : s)}>{s}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "#666", fontWeight: 700, marginBottom: 6 }}>学年</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={filterBtnStyle(filterGrade === "")} onClick={() => setFilterGrade("")}>全て</button>
          {GRADES.map(g => (
            <button key={g} style={filterBtnStyle(filterGrade === g)} onClick={() => setFilterGrade(filterGrade === g ? "" : g)}>{g}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "#666", fontWeight: 700, marginBottom: 6 }}>性別</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={filterBtnStyle(filterGender === "")} onClick={() => setFilterGender("")}>全て</button>
          {GENDERS.map(g => (
            <button key={g} style={filterBtnStyle(filterGender === g)} onClick={() => setFilterGender(filterGender === g ? "" : g)}>{g}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#666", fontWeight: 700, marginBottom: 6 }}>パーソナル</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={filterBtnStyle(filterPersonal === "")} onClick={() => setFilterPersonal("")}>全て</button>
          <button style={filterBtnStyle(filterPersonal === "パーソナル")} onClick={() => setFilterPersonal(filterPersonal === "パーソナル" ? "" : "パーソナル")}>パーソナル</button>
        </div>
      </div>

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
