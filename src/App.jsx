import { useState, useEffect, useRef } from "react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";
import { BG, ACCENT } from "./constants";
import LoginScreen from "./components/auth/LoginScreen";
import PinEntryScreen from "./components/auth/PinEntryScreen";
import AthleteScreen from "./components/athlete/AthleteScreen";
import CoachScreen from "./components/coach/CoachScreen";

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [pendingFirebaseUser, setPendingFirebaseUser] = useState(null);
  const profileUnsubRef = useRef(null);

  const setupProfileListener = (firebaseUser) => {
    if (profileUnsubRef.current) profileUnsubRef.current();
    const userRef = doc(db, "users", firebaseUser.uid);
    profileUnsubRef.current = onSnapshot(userRef, (snap) => {
      if (snap.exists()) setUserProfile(snap.data());
    });
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (profileUnsubRef.current) { profileUnsubRef.current(); profileUnsubRef.current = null; }

      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          setPendingFirebaseUser(firebaseUser);
          setAuthLoading(false);
          return;
        }
        setAuthLoading(false);
        setupProfileListener(firebaseUser);
      } else {
        setPendingFirebaseUser(null);
        setUserProfile(null);
        setAuthLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (profileUnsubRef.current) profileUnsubRef.current();
    };
  }, []);

  const handlePinSuccess = (firebaseUser) => {
    setPendingFirebaseUser(null);
    setupProfileListener(firebaseUser);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setPendingFirebaseUser(null);
    setUserProfile(null);
  };

  const handleProfileUpdate = (updatedProfile) => {
    setUserProfile(updatedProfile);
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: ACCENT, fontSize: 40 }}>⚡</div>
      </div>
    );
  }

  if (pendingFirebaseUser) return <PinEntryScreen firebaseUser={pendingFirebaseUser} onSuccess={handlePinSuccess} />;
  if (!userProfile) return <LoginScreen />;
  if (userProfile.role === "coach" || userProfile.role === "master") return <CoachScreen userProfile={userProfile} onLogout={handleLogout} />;
  return <AthleteScreen userProfile={userProfile} onLogout={handleLogout} onProfileUpdate={handleProfileUpdate} />;
}
