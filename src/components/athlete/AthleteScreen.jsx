import { useState, useEffect } from "react";
import { doc, setDoc, collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { ACCENT, BG, BORDER } from "../../constants";
import { todayStr } from "../../utils";
import Avatar from "../shared/Avatar";
import AthleteReportTab from "./AthleteReportTab";
import AthleteHistoryTab from "./AthleteHistoryTab";
import ProfileEditTab from "./ProfileEditTab";

const TABS = [
  { id: "report",  label: "今日の日報",  icon: "📝" },
  { id: "history", label: "履歴・グラフ", icon: "📊" },
  { id: "profile", label: "プロフィール", icon: "👤" },
];

export default function AthleteScreen({ userProfile, onLogout, onProfileUpdate }) {
  const [tab, setTab] = useState("report");
  const [myReports, setMyReports] = useState({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reports", userProfile.uid, "daily"), (snap) => {
      const data = {};
      snap.forEach(d => { data[d.id] = d.data(); });
      setMyReports(data);
    });
    return unsub;
  }, [userProfile.uid]);

  const handleSubmitReport = async (data) => {
    await setDoc(doc(db, "reports", userProfile.uid, "daily", todayStr()), {
      ...data,
      submittedAt: new Date().toISOString(),
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: BG, borderBottom: "1px solid " + BORDER,
        padding: "13px 20px 13px",
        paddingTop: "calc(13px + env(safe-area-inset-top))",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar user={userProfile} size={32} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>
              {(userProfile.lastNameKanji || userProfile.firstNameKanji)
                ? `${userProfile.lastNameKanji} ${userProfile.firstNameKanji}`.trim()
                : userProfile.name}
            </div>
            {userProfile.profileEditRequest ? (
              <div style={{ fontSize: 11, color: "#60a5fa" }}>📨 変更申請中</div>
            ) : (userProfile.grade || userProfile.sport || userProfile.isPersonal) ? (
              <div style={{ fontSize: 11, color: "#888" }}>
                {[userProfile.grade, userProfile.sport, userProfile.isPersonal ? "パーソナル" : ""].filter(Boolean).join(" · ")}
              </div>
            ) : null}
          </div>
        </div>
        <button onClick={onLogout} style={{
          background: "transparent", border: "1px solid " + BORDER,
          borderRadius: 8, color: "#888", fontSize: 12, padding: "6px 12px", cursor: "pointer",
        }}>ログアウト</button>
      </div>

      <div style={{
        position: "sticky", top: "calc(62px + env(safe-area-inset-top))", zIndex: 99,
        background: BG, borderBottom: "1px solid " + BORDER, display: "flex",
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "12px", background: "transparent", border: "none",
            borderBottom: `3px solid ${tab === t.id ? ACCENT : "transparent"}`,
            color: tab === t.id ? ACCENT : "#555",
            fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {tab === "report"  && <AthleteReportTab todayReport={myReports[todayStr()]} onSubmit={handleSubmitReport} />}
      {tab === "history" && <AthleteHistoryTab athleteReports={myReports} />}
      {tab === "profile" && <ProfileEditTab userProfile={userProfile} onProfileUpdate={onProfileUpdate} />}
    </div>
  );
}
