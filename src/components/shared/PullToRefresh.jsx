import { useState, useRef, useEffect } from "react";
import { ACCENT } from "../../constants";

const THRESHOLD = 72;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const state = useRef({ pulling: false, startY: 0, pullY: 0, refreshing: false });

  useEffect(() => {
    const s = state.current;

    const onTouchStart = (e) => {
      if (window.scrollY <= 0) {
        s.startY = e.touches[0].clientY;
        s.pulling = true;
      }
    };

    const onTouchMove = (e) => {
      if (!s.pulling) return;
      const deltaY = e.touches[0].clientY - s.startY;
      if (deltaY > 0) {
        e.preventDefault();
        s.pullY = Math.min(deltaY * 0.45, THRESHOLD + 24);
        setPullY(s.pullY);
      } else {
        s.pulling = false;
        s.pullY = 0;
        setPullY(0);
      }
    };

    const onTouchEnd = async () => {
      if (!s.pulling) return;
      const dist = s.pullY;
      s.pulling = false;
      s.pullY = 0;
      setPullY(0);
      if (dist >= THRESHOLD && !s.refreshing) {
        s.refreshing = true;
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          s.refreshing = false;
          setRefreshing(false);
        }
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh]);

  const indicatorH = refreshing ? 52 : pullY;
  const progress = Math.min(pullY / THRESHOLD, 1);
  const rotation = pullY * 3.5;

  return (
    <div>
      <div style={{
        height: indicatorH,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: (pullY === 0 && !refreshing) ? "height 0.22s ease" : "none",
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: `2px solid ${ACCENT}`,
          borderTopColor: "transparent",
          opacity: refreshing ? 1 : progress,
          transform: refreshing ? undefined : `rotate(${rotation}deg)`,
          animation: refreshing ? "ptr-spin 0.7s linear infinite" : "none",
          transition: refreshing ? "none" : "opacity 0.1s",
        }} />
      </div>
      {children}
    </div>
  );
}
