import { BG_CARD, BORDER, ACCENT, MOOD_LEVELS, BODY_LEVELS } from "../../constants";
import { dateLabel } from "../../utils";
import Badge from "../shared/Badge";
import TrendGraph from "../shared/TrendGraph";

export default function AthleteHistoryTab({ athleteReports }) {
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
