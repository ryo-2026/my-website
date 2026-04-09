import { BG_CARD, MOOD_LEVELS, BODY_LEVELS } from "../../constants";
import { todayStr } from "../../utils";
import Avatar from "../shared/Avatar";
import Badge from "../shared/Badge";

export default function CoachAlertsTab({ athletes, allReports }) {
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
