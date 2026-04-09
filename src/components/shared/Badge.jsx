export default function Badge({ color, children }) {
  return (
    <span style={{
      background: color + "22", color,
      padding: "3px 9px", borderRadius: 20,
      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}
