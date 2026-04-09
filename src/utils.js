export function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function dateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });
}

export function todayLabel() {
  return new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" });
}

export function profileNameStr(p) {
  return [p?.lastNameKanji, p?.firstNameKanji].filter(Boolean).join(" ") || "—";
}

export function profileKanaStr(p) {
  return [p?.lastNameKana, p?.firstNameKana].filter(Boolean).join(" ") || "—";
}

export function profileSportStr(p) {
  return [p?.sport, p?.isPersonal ? "パーソナル" : ""].filter(Boolean).join(" · ") || "—";
}
