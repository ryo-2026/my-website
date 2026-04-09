import { ACCENT } from "../../constants";

export default function TrendGraph({ athleteReports }) {
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
