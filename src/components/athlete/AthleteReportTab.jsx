import { useState } from "react";
import { ACCENT, BG, BG_CARD, BORDER, MOOD_LEVELS, BODY_LEVELS } from "../../constants";
import { todayLabel } from "../../utils";
import Badge from "../shared/Badge";
import ScaleSelector from "../shared/ScaleSelector";

export default function AthleteReportTab({ todayReport, onSubmit }) {
  const [training, setTraining] = useState("");
  const [mood, setMood] = useState(null);
  const [body, setBody] = useState(null);
  const [concern, setConcern] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = training.trim() && mood && body;

  const handleSubmit = async () => {
    setSaving(true);
    await onSubmit({ training, mood, body, concern, message });
    setSaving(false);
  };

  if (todayReport) {
    const m = MOOD_LEVELS.find(l => l.value === todayReport.mood);
    const b = BODY_LEVELS.find(l => l.value === todayReport.body);
    return (
      <div style={{ padding: "40px 20px 60px", textAlign: "center" }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>日報を送信しました</div>
        <div style={{ fontSize: 14, color: "#888", marginBottom: 32 }}>コーチが確認します。お疲れ様でした！</div>
        <div style={{ background: BG_CARD, borderRadius: 16, border: "1px solid " + BORDER, padding: 20, textAlign: "left", maxWidth: 380, margin: "0 auto" }}>
          <div style={{ color: ACCENT, fontWeight: 700, marginBottom: 12, fontSize: 13 }}>📋 本日の記録</div>
          <div style={{ fontSize: 13, color: "#aaa", lineHeight: 2 }}>
            <div>📅 {todayLabel()}</div>
            <div style={{ marginTop: 4 }}>💪 {todayReport.training}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <Badge color={m?.color}>{m?.emoji} メンタル: {m?.label}</Badge>
              <Badge color={b?.color}>💪 体調: {b?.label}</Badge>
            </div>
            {todayReport.concern && <div style={{ color: "#f97316", marginTop: 8 }}>⚠️ {todayReport.concern}</div>}
            {todayReport.message && <div style={{ color: "#60a5fa", marginTop: 4 }}>💬 {todayReport.message}</div>}
          </div>
        </div>
      </div>
    );
  }

  const textareaStyle = {
    width: "100%", background: BG_CARD, border: "1px solid " + BORDER,
    borderRadius: 14, padding: "14px 16px", color: "#fff", fontSize: 14,
    resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.7, boxSizing: "border-box",
  };
  const labelStyle = {
    fontSize: 12, color: "#888", fontWeight: 700, letterSpacing: "0.08em",
    textTransform: "uppercase", display: "block", marginBottom: 10,
  };

  return (
    <div style={{ padding: "24px 20px 60px" }}>
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid " + BORDER }}>
        <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 4 }}>TODAY'S REPORT</div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>{todayLabel()}</div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>💪 トレーニング内容 <span style={{ color: "#ef4444" }}>*</span></label>
        <textarea value={training} onChange={e => setTraining(e.target.value)} rows={5}
          placeholder={"例：\n・スクワット 80kg × 5 × 3set\n・ベンチプレス 60kg × 8 × 3set\n・ランニング 5km"}
          style={textareaStyle} />
      </div>

      <ScaleSelector levels={MOOD_LEVELS} value={mood} onChange={setMood} label="😊 メンタル状態 *" />
      <ScaleSelector levels={BODY_LEVELS} value={body} onChange={setBody} label="🏋️ 身体の状態 *" />

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>⚠️ 気になること・課題（任意）</label>
        <textarea value={concern} onChange={e => setConcern(e.target.value)} rows={3}
          placeholder="例：右膝に違和感がある、フォームが安定しない..." style={textareaStyle} />
      </div>

      <div style={{ marginBottom: 32 }}>
        <label style={labelStyle}>💬 コーチへのメッセージ（任意）</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
          placeholder="例：次回のセッションで確認したいことがあります..." style={textareaStyle} />
      </div>

      <button disabled={!canSubmit || saving} onClick={handleSubmit} style={{
        width: "100%", padding: 18, borderRadius: 16, border: "none",
        background: canSubmit ? ACCENT : "#252535",
        color: canSubmit ? BG : "#555",
        fontSize: 16, fontWeight: 900,
        cursor: canSubmit ? "pointer" : "not-allowed",
        transition: "all 0.2s", letterSpacing: "0.05em",
      }}>
        {saving ? "送信中..." : "日報を送信する →"}
      </button>
    </div>
  );
}
