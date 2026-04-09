import { BG_CARD } from "../../constants";

export default function ScaleSelector({ levels, value, onChange, label }) {
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
