import { useState, useEffect, useCallback } from "react";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { ACCENT, BG, BORDER } from "../../constants";
import { todayStr } from "../../utils";
import CoachAthletesTab from "./CoachAthletesTab";
import CoachAlertsTab from "./CoachAlertsTab";
import CoachSettingsTab from "./CoachSettingsTab";
import CoachManageTab from "./CoachManageTab";
import PullToRefresh from "../shared/PullToRefresh";

export default function CoachScreen({ userProfile, onLogout }) {
  const [tab, setTab] = useState("athletes");
  const [athletes, setAthletes] = useState([]);
  const [allReports, setAllReports] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "athlete"));
    const unsub = onSnapshot(q, async (snap) => {
      const list = snap.docs.map(d => d.data());
      setAthletes(list);
      const reportsObj = {};
      await Promise.all(list.map(async (a) => {
        const snap2 = await getDocs(collection(db, "reports", a.uid, "daily"));
        reportsObj[a.uid] = {};
        snap2.forEach(d => { reportsObj[a.uid][d.id] = d.data(); });
      }));
      setAllReports(reportsObj);
    });
    return unsub;
  }, [refreshKey]);

  const handleRefresh = useCallback(() => new Promise(resolve => {
    setRefreshKey(k => k + 1);
    setTimeout(resolve, 1000);
  }), []);

  const alertCount = athletes.filter(a => {
    const r = allReports[a.uid]?.[todayStr()];
    return r && (r.mood <= 2 || r.body <= 2);
  }).length;
  const noReportCount = athletes.filter(a => !allReports[a.uid]?.[todayStr()]).length;
  const badgeCount = alertCount + noReportCount;

  const isMaster = userProfile.role === "master";

  const TABS = [
    { id: "athletes", label: "選手一覧",   icon: "👥" },
    { id: "alerts",   label: "要チェック", icon: "🚨", badge: badgeCount },
    ...(isMaster ? [{ id: "manage", label: "管理", icon: "👑" }] : []),
    { id: "settings", label: "設定",       icon: "⚙️" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff" }}>
      <PullToRefresh onRefresh={handleRefresh}>
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: BG, borderBottom: "1px solid " + BORDER,
        padding: "13px 20px 13px",
        paddingTop: "calc(13px + env(safe-area-inset-top))",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 10, color: ACCENT, fontWeight: 700, letterSpacing: "0.2em", marginBottom: 2 }}>COACH DASHBOARD</div>
          <div style={{ fontSize: 16, fontWeight: 900 }}>
            {(userProfile.lastNameKanji || userProfile.firstNameKanji)
              ? `${userProfile.lastNameKanji || ""} ${userProfile.firstNameKanji || ""}`.trim()
              : userProfile.name}
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
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            {t.icon} {t.label}
            {t.badge > 0 && (
              <span style={{
                background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 900,
                borderRadius: 10, padding: "1px 6px", minWidth: 18, textAlign: "center", lineHeight: "16px",
              }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "athletes" && <CoachAthletesTab athletes={athletes} allReports={allReports} />}
      {tab === "alerts"   && <CoachAlertsTab athletes={athletes} allReports={allReports} />}
      {tab === "manage"   && <CoachManageTab userProfile={userProfile} />}
      {tab === "settings" && <CoachSettingsTab userProfile={userProfile} />}
      </PullToRefresh>
    </div>
  );
}
