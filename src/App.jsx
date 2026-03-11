import { useState, useEffect, useRef } from "react";

// ==================== DATA & STATE ====================
const initialPractice = [
  { id: 1, type: "dribble", label: "ドリブル", duration: 20, reps: null, color: "#3b82f6" },
  { id: 2, type: "shoot", label: "3Pシュート", duration: null, reps: 50, color: "#f97316" },
  { id: 3, type: "move", label: "フットワーク", duration: 10, reps: null, color: "#8b5cf6" },
];

const initialGames = [
  { id: 1, date: "2026-03-08", playTime: 28, shots: 12, shotsMade: 6, assists: 3, blocks: 1, rebounds: 5, steals: 2, passMiss: 1, playMiss: 2 },
  { id: 2, date: "2026-03-05", playTime: 32, shots: 15, shotsMade: 7, assists: 4, blocks: 0, rebounds: 7, steals: 1, passMiss: 2, playMiss: 1 },
];

const weeklyData = [
  { day: "月", minutes: 45 },
  { day: "火", minutes: 0 },
  { day: "水", minutes: 60 },
  { day: "木", minutes: 30 },
  { day: "金", minutes: 75 },
  { day: "土", minutes: 90 },
  { day: "日", minutes: 50 },
];

const typeColors = {
  shoot: "#f97316",
  dribble: "#3b82f6",
  move: "#8b5cf6",
  defense: "#10b981",
  conditioning: "#ef4444",
};

const typeLabels = {
  shoot: "シュート",
  dribble: "ドリブル",
  move: "ムーブ",
  defense: "ディフェンス",
  conditioning: "コンディション",
};

// ==================== AI CALL ====================
async function callAI(systemPrompt, userPrompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const data = await response.json();
  return data.content?.[0]?.text || "分析中にエラーが発生しました。";
}

// ==================== ICONS ====================
const Icon = ({ path, size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={path} />
  </svg>
);

const ICONS = {
  home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  dashboard: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  practice: "M13 10V3L4 14h7v7l9-11h-7z",
  game: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  analysis: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  growth: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  plus: "M12 5v14M5 12h14",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  ai: "M12 2a10 10 0 100 20A10 10 0 0012 2zM8 12h8M12 8v8",
  ball: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  check: "M20 6L9 17l-5-5",
  arrow: "M5 12h14M12 5l7 7-7 7",
};

// ==================== COMPONENTS ====================
function Ball() {
  return (
    <div style={{ position: "relative", width: 40, height: 40 }}>
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="#f97316" stroke="#ea580c" strokeWidth="1.5" />
        <path d="M20 2C20 2 20 38 20 38" stroke="#ea580c" strokeWidth="1.5" fill="none" />
        <path d="M2 20C2 20 38 20 38 20" stroke="#ea580c" strokeWidth="1.5" fill="none" />
        <path d="M5 8C12 14 28 14 35 8" stroke="#ea580c" strokeWidth="1.5" fill="none" />
        <path d="M5 32C12 26 28 26 35 32" stroke="#ea580c" strokeWidth="1.5" fill="none" />
      </svg>
    </div>
  );
}

function LoadingDots() {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "8px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%", background: "#f97316",
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`@keyframes bounce { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(1.4);opacity:1} }`}</style>
    </div>
  );
}

function AIComment({ comment, loading }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
      borderRadius: 16, padding: "16px 20px", color: "white",
      border: "1px solid rgba(249,115,22,0.3)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: -20, right: -20, width: 80, height: 80,
        background: "radial-gradient(circle, rgba(249,115,22,0.2) 0%, transparent 70%)",
      }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "linear-gradient(135deg, #f97316, #ea580c)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 14 }}>🤖</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#f97316", letterSpacing: "0.08em" }}>AI コーチ</span>
      </div>
      {loading ? <LoadingDots /> : (
        <p style={{ fontSize: 13, lineHeight: 1.7, color: "#e2e8f0", whiteSpace: "pre-wrap" }}>{comment}</p>
      )}
    </div>
  );
}

function StatBar({ label, value, max, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#64748b" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{value}</span>
      </div>
      <div style={{ height: 8, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: 999,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          transition: "width 0.8s ease",
        }} />
      </div>
    </div>
  );
}

// ==================== HOME TAB ====================
function HomeTab({ practices }) {
  const [sessionActive, setSessionActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [aiComment, setAiComment] = useState("練習を開始してAIコーチからアドバイスをもらいましょう！");
  const [aiLoading, setAiLoading] = useState(false);
  const intervalRef = useRef(null);

  const totalMin = practices.reduce((a, p) => a + (p.duration || 0), 0);

  const start = async () => {
    setSessionActive(true);
    setElapsed(0);
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    setAiLoading(true);
    const menu = practices.map(p => `${p.label}: ${p.duration ? p.duration + "分" : p.reps + "本"}`).join(", ");
    const comment = await callAI(
      "あなたはバスケットボールのプロコーチです。選手の練習メニューを見て、モチベーションを上げる激励のメッセージと具体的なアドバイスを日本語で100文字以内で答えてください。",
      `今日の練習メニュー: ${menu}`
    );
    setAiComment(comment);
    setAiLoading(false);
  };

  const stop = () => {
    setSessionActive(false);
    clearInterval(intervalRef.current);
  };

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      {/* Today's menu */}
      <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>📋</span> 今日のメニュー
          </h2>
          <span style={{ fontSize: 11, background: "#fff7ed", color: "#f97316", padding: "4px 10px", borderRadius: 999, fontWeight: 700 }}>
            {practices.length}項目 / {totalMin}分
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {practices.map((p, i) => (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", background: "#f8fafc", borderRadius: 14,
              border: "1px solid #e2e8f0",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: `linear-gradient(135deg, ${p.color}, ${p.color}bb)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontWeight: 800, fontSize: 14,
              }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>{p.label}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{typeLabels[p.type]}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#f97316" }}>
                  {p.duration || p.reps}
                </span>
                <span style={{ fontSize: 12, color: "#64748b", marginLeft: 2 }}>{p.duration ? "分" : "本"}</span>
              </div>
            </div>
          ))}
        </div>

        {sessionActive && (
          <div style={{
            margin: "16px 0 0", padding: 14, background: "linear-gradient(135deg, #1e293b, #0f172a)",
            borderRadius: 14, textAlign: "center",
          }}>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>⏱ 練習中</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#f97316", fontVariantNumeric: "tabular-nums" }}>
              {fmt(elapsed)}
            </div>
          </div>
        )}

        <button
          onClick={sessionActive ? stop : start}
          style={{
            width: "100%", marginTop: 16, padding: "14px 0",
            background: sessionActive
              ? "linear-gradient(135deg, #ef4444, #dc2626)"
              : "linear-gradient(135deg, #f97316, #ea580c)",
            border: "none", borderRadius: 14, color: "white",
            fontWeight: 800, fontSize: 16, cursor: "pointer",
            boxShadow: "0 6px 20px rgba(249,115,22,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {sessionActive ? "⏹ 練習終了" : "▶ 練習を開始"}
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          { label: "今週の練習", value: "12", unit: "時間", icon: "🔥" },
          { label: "今月の練習", value: "48", unit: "時間", icon: "📊" },
        ].map(s => (
          <div key={s.label} style={{
            background: "white", borderRadius: 16, padding: 16,
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            borderLeft: "4px solid #f97316",
          }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b" }}>
              {s.value}<span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500, marginLeft: 2 }}>{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* AI Comment */}
      <AIComment comment={aiComment} loading={aiLoading} />
    </div>
  );
}

// ==================== DASHBOARD TAB ====================
function DashboardTab({ practices, games }) {
  const [aiComment, setAiComment] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const typeBreakdown = practices.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + (p.duration || 5);
    return acc;
  }, {});
  const totalMin = Object.values(typeBreakdown).reduce((a, b) => a + b, 0);

  const latestGame = games[0];
  const shootRate = latestGame ? Math.round((latestGame.shotsMade / latestGame.shots) * 100) : 0;

  const analyze = async () => {
    setAiLoading(true);
    const summary = `練習内訳: ${Object.entries(typeBreakdown).map(([k, v]) => `${typeLabels[k]}${v}分`).join(", ")}。最新試合: シュート成功率${shootRate}%, アシスト${latestGame?.assists}, リバウンド${latestGame?.rebounds}`;
    const comment = await callAI(
      "あなたはバスケットボールのプロコーチです。選手のデータを分析し、今週の評価と改善点を日本語で150文字以内で答えてください。",
      summary
    );
    setAiComment(comment);
    setAiLoading(false);
  };

  useEffect(() => { analyze(); }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      {/* Today */}
      <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 16 }}>📊 今日の練習時間</h2>
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ fontSize: 48, fontWeight: 900, color: "#f97316" }}>{totalMin}</div>
          <div style={{ fontSize: 14, color: "#94a3b8" }}>分</div>
        </div>
      </div>

      {/* Practice balance */}
      <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 16 }}>⚖️ 練習バランス</h2>
        {Object.entries(typeBreakdown).map(([type, min]) => (
          <StatBar key={type} label={typeLabels[type]} value={min} max={totalMin} color={typeColors[type]} />
        ))}
      </div>

      {/* Weekly chart */}
      <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 16 }}>📅 今週の練習</h2>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100, justifyContent: "space-around" }}>
          {weeklyData.map(d => {
            const maxH = 90;
            const h = d.minutes ? Math.max(8, (d.minutes / 90) * maxH) : 0;
            return (
              <div key={d.day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#f97316" }}>{d.minutes ? d.minutes + "m" : ""}</div>
                <div style={{
                  width: 28, height: h || 6, borderRadius: d.minutes ? "6px 6px 0 0" : 6,
                  background: d.minutes ? "linear-gradient(180deg, #f97316, #ea580c)" : "#e2e8f0",
                  transition: "height 0.5s ease",
                }} />
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{d.day}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>今週の合計</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>6時間20分</span>
        </div>
      </div>

      {/* AI */}
      <AIComment comment={aiComment || "分析中..."} loading={aiLoading} />

      <button onClick={analyze} style={{
        padding: "12px 0", background: "linear-gradient(135deg, #f97316, #ea580c)",
        border: "none", borderRadius: 14, color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer",
      }}>
        🔄 AI再分析
      </button>
    </div>
  );
}

// ==================== PRACTICE TAB ====================
function PracticeTab({ practices, setPractices }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: "shoot", label: "", duration: "", reps: "" });
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const add = () => {
    if (!form.label) return;
    setPractices(prev => [...prev, {
      id: Date.now(),
      type: form.type,
      label: form.label,
      duration: form.duration ? parseInt(form.duration) : null,
      reps: form.reps ? parseInt(form.reps) : null,
      color: typeColors[form.type],
    }]);
    setForm({ type: "shoot", label: "", duration: "", reps: "" });
    setShowAdd(false);
  };

  const remove = (id) => setPractices(prev => prev.filter(p => p.id !== id));

  const analyze = async () => {
    setAiLoading(true);
    const menu = practices.map(p => `${p.label}: ${p.duration ? p.duration + "分" : p.reps + "本"}`).join(", ");
    const comment = await callAI(
      "あなたはバスケットボールのプロコーチです。練習内容を分析して、バランスの評価と改善提案を日本語で200文字以内で答えてください。",
      `練習記録: ${menu}`
    );
    setAiAnalysis(comment);
    setAiLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>⚡ 練習メニュー</h2>
          <button onClick={() => setShowAdd(!showAdd)} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", background: "#fff7ed", border: "1px solid #fed7aa",
            borderRadius: 10, color: "#f97316", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>
            + 追加
          </button>
        </div>

        {showAdd && (
          <div style={{ background: "#f8fafc", borderRadius: 14, padding: 16, marginBottom: 16, border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, width: "100%", minWidth: 0 }}>
                {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input placeholder="練習名" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, width: "100%", minWidth: 0 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input placeholder="時間 (分)" type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, width: "100%", minWidth: 0 }} />
                <input placeholder="本数 (本)" type="number" value={form.reps} onChange={e => setForm(f => ({ ...f, reps: e.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, width: "100%", minWidth: 0 }} />
              </div>
              <button onClick={add} style={{
                padding: "10px 0", background: "linear-gradient(135deg, #f97316, #ea580c)",
                border: "none", borderRadius: 10, color: "white", fontWeight: 700, cursor: "pointer",
              }}>
                保存
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {practices.map(p => (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", background: "#f8fafc", borderRadius: 14, border: "1px solid #e2e8f0",
            }}>
              <div style={{
                width: 10, height: 40, borderRadius: 999,
                background: `linear-gradient(180deg, ${p.color}, ${p.color}88)`,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>{p.label}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{typeLabels[p.type]}</div>
              </div>
              <span style={{ fontWeight: 800, color: "#f97316", fontSize: 16 }}>
                {p.duration ? `${p.duration}分` : `${p.reps}本`}
              </span>
              <button onClick={() => remove(p.id)} style={{
                background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, padding: 4,
              }}>✕</button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={analyze} style={{
        padding: "14px 0", background: "linear-gradient(135deg, #1e293b, #0f172a)",
        border: "none", borderRadius: 14, color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        🤖 AI分析
      </button>

      {(aiAnalysis || aiLoading) && <AIComment comment={aiAnalysis} loading={aiLoading} />}
    </div>
  );
}

// ==================== GAME TAB ====================
function GameTab({ games, setGames }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], playTime: "", shots: "", shotsMade: "", assists: "", blocks: "", rebounds: "", steals: "", passMiss: "", playMiss: "" });
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [activeGame, setActiveGame] = useState(null);

  const fields = [
    { key: "playTime", label: "出場時間", unit: "分" },
    { key: "shots", label: "シュート数", unit: "本" },
    { key: "shotsMade", label: "成功数", unit: "本" },
    { key: "assists", label: "アシスト", unit: "" },
    { key: "blocks", label: "ブロック", unit: "" },
    { key: "rebounds", label: "リバウンド", unit: "" },
    { key: "steals", label: "スティール", unit: "" },
    { key: "passMiss", label: "パスミス", unit: "" },
    { key: "playMiss", label: "プレイミス", unit: "" },
  ];

  const save = () => {
    const game = { id: Date.now(), ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, k === "date" ? v : parseInt(v) || 0])) };
    setGames(prev => [game, ...prev]);
    setShowAdd(false);
  };

  const analyze = async (game) => {
    setActiveGame(game.id);
    setAiLoading(true);
    const rate = Math.round((game.shotsMade / (game.shots || 1)) * 100);
    const comment = await callAI(
      "あなたはバスケットボールのプロコーチです。試合スタッツを分析して、パフォーマンス評価と改善点を日本語で200文字以内で答えてください。",
      `試合スタッツ: 出場${game.playTime}分, シュート成功率${rate}%(${game.shotsMade}/${game.shots}), アシスト${game.assists}, ブロック${game.blocks}, リバウンド${game.rebounds}, スティール${game.steals}, パスミス${game.passMiss}, プレイミス${game.playMiss}`
    );
    setAiAnalysis(comment);
    setAiLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b" }}>🏀 試合記録</h2>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          padding: "8px 16px", background: "linear-gradient(135deg, #f97316, #ea580c)",
          border: "none", borderRadius: 10, color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>
          + 記録する
        </button>
      </div>

      {showAdd && (
        <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: "#1e293b" }}>試合データ入力</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, width: "100%", minWidth: 0 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {fields.map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, display: "block" }}>{f.label}{f.unit ? ` (${f.unit})` : ""}</label>
                  <input type="number" value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
            <button onClick={save} style={{
              padding: "12px 0", background: "linear-gradient(135deg, #f97316, #ea580c)",
              border: "none", borderRadius: 10, color: "white", fontWeight: 700, cursor: "pointer", marginTop: 6,
            }}>
              保存
            </button>
          </div>
        </div>
      )}

      {games.map(game => {
        const rate = Math.round((game.shotsMade / (game.shots || 1)) * 100);
        return (
          <div key={game.id} style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>📅 {game.date}</span>
              <span style={{ fontSize: 11, background: "#fff7ed", color: "#f97316", padding: "4px 10px", borderRadius: 999, fontWeight: 700 }}>
                {game.playTime}分出場
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[
                { label: "シュート率", value: `${rate}%` },
                { label: "アシスト", value: game.assists },
                { label: "リバウンド", value: game.rebounds },
                { label: "ブロック", value: game.blocks },
                { label: "スティール", value: game.steals },
                { label: "ミス", value: game.passMiss + game.playMiss },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center", padding: 10, background: "#f8fafc", borderRadius: 10 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#f97316" }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <button onClick={() => analyze(game)} style={{
              width: "100%", padding: "10px 0", background: "linear-gradient(135deg, #1e293b, #0f172a)",
              border: "none", borderRadius: 10, color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}>
              🤖 この試合をAI分析
            </button>
            {activeGame === game.id && (aiAnalysis || aiLoading) && (
              <div style={{ marginTop: 12 }}>
                <AIComment comment={aiAnalysis} loading={aiLoading} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ==================== ANALYSIS TAB ====================
function AnalysisTab() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const suggestions = [
    { icon: "🎯", label: "シュートフォーム改善", prompt: "シュートフォームを改善するための具体的な練習方法を教えてください" },
    { icon: "⚡", label: "ドリブル強化", prompt: "ドリブルスキルを向上させる練習メニューを提案してください" },
    { icon: "🛡️", label: "ディフェンス向上", prompt: "ディフェンス力を上げるための練習方法と心構えを教えてください" },
    { icon: "💪", label: "体力強化", prompt: "バスケに必要な体力・フィジカルを強化するトレーニングを教えてください" },
  ];

  const ask = async (q = prompt) => {
    if (!q) return;
    setLoading(true);
    setResponse("");
    const answer = await callAI(
      "あなたはバスケットボールのプロコーチです。選手の質問に対して、具体的で実践的なアドバイスを日本語で300文字以内で答えてください。",
      q
    );
    setResponse(answer);
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>🧠 AIコーチに質問</h2>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>練習・フォーム・戦術など何でも聞いてください</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {suggestions.map(s => (
            <button key={s.label} onClick={() => { setSelected(s.label); ask(s.prompt); }}
              style={{
                padding: "12px 10px", background: selected === s.label ? "#fff7ed" : "#f8fafc",
                border: `1px solid ${selected === s.label ? "#fed7aa" : "#e2e8f0"}`,
                borderRadius: 12, cursor: "pointer", textAlign: "left",
              }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1e293b" }}>{s.label}</div>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="自由に質問してください..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === "Enter" && ask()}
            style={{
              flex: 1, padding: "12px 14px", borderRadius: 12,
              border: "1px solid #e2e8f0", fontSize: 13, outline: "none",
            }}
          />
          <button onClick={() => ask()} style={{
            padding: "12px 16px", background: "linear-gradient(135deg, #f97316, #ea580c)",
            border: "none", borderRadius: 12, color: "white", fontWeight: 700, cursor: "pointer", fontSize: 16,
          }}>→</button>
        </div>
      </div>

      {(response || loading) && <AIComment comment={response} loading={loading} />}
    </div>
  );
}

// ==================== GROWTH TAB ====================
function GrowthTab({ games }) {
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const rates = games.map(g => ({
    date: g.date.slice(5),
    rate: Math.round((g.shotsMade / (g.shots || 1)) * 100),
  })).reverse();

  const maxRate = Math.max(...rates.map(r => r.rate), 100);

  const analyze = async () => {
    setAiLoading(true);
    const trend = rates.map(r => `${r.date}: ${r.rate}%`).join(", ");
    const insight = await callAI(
      "あなたはバスケットボールのプロコーチです。成長データを見て、トレンド分析と今後の目標を日本語で150文字以内で答えてください。",
      `シュート成功率の推移: ${trend}`
    );
    setAiInsight(insight);
    setAiLoading(false);
  };

  useEffect(() => { analyze(); }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      {/* Shoot rate chart */}
      <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>📈 シュート成功率</h2>
        {rates.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{rates[0].rate}%</span>
            <span style={{ fontSize: 18, color: "#10b981" }}>→</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#f97316" }}>{rates[rates.length - 1].rate}%</span>
            <span style={{ fontSize: 11, background: "#dcfce7", color: "#16a34a", padding: "3px 8px", borderRadius: 999, fontWeight: 700 }}>
              +{rates[rates.length - 1].rate - rates[0].rate}%
            </span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 100 }}>
          {rates.map((r, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#f97316" }}>{r.rate}%</div>
              <div style={{
                width: "100%", height: `${(r.rate / maxRate) * 80}px`, minHeight: 8,
                borderRadius: "6px 6px 0 0",
                background: `linear-gradient(180deg, #f97316, #ea580c)`,
              }} />
              <div style={{ fontSize: 10, color: "#94a3b8" }}>{r.date}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 16 }}>🏆 平均スタッツ</h2>
        {games.length > 0 && (() => {
          const avg = (key) => Math.round(games.reduce((a, g) => a + g[key], 0) / games.length * 10) / 10;
          return (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "出場時間", value: avg("playTime"), unit: "分" },
                { label: "シュート率", value: `${Math.round(games.reduce((a, g) => a + g.shotsMade / (g.shots || 1), 0) / games.length * 100)}%`, unit: "" },
                { label: "アシスト", value: avg("assists"), unit: "" },
                { label: "リバウンド", value: avg("rebounds"), unit: "" },
                { label: "ブロック", value: avg("blocks"), unit: "" },
                { label: "スティール", value: avg("steals"), unit: "" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center", padding: "12px 8px", background: "#f8fafc", borderRadius: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#f97316" }}>{s.value}{s.unit}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      <AIComment comment={aiInsight || "成長データを分析中..."} loading={aiLoading} />

      <button onClick={analyze} style={{
        padding: "12px 0", background: "linear-gradient(135deg, #1e293b, #0f172a)",
        border: "none", borderRadius: 14, color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer",
      }}>
        🔄 成長レポートを更新
      </button>
    </div>
  );
}

// ==================== MAIN APP ====================
const TABS = [
  { id: "home", label: "ホーム", icon: "🏠" },
  { id: "dashboard", label: "ダッシュ", icon: "📊" },
  { id: "practice", label: "練習", icon: "⚡" },
  { id: "game", label: "試合", icon: "🏀" },
  { id: "analysis", label: "解析", icon: "🧠" },
  { id: "growth", label: "成長", icon: "📈" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [practices, setPractices] = useState(initialPractice);
  const [games, setGames] = useState(initialGames);

  const renderTab = () => {
    switch (activeTab) {
      case "home": return <HomeTab practices={practices} />;
      case "dashboard": return <DashboardTab practices={practices} games={games} />;
      case "practice": return <PracticeTab practices={practices} setPractices={setPractices} />;
      case "game": return <GameTab games={games} setGames={setGames} />;
      case "analysis": return <AnalysisTab />;
      case "growth": return <GrowthTab games={games} />;
      default: return null;
    }
  };

  return (
    <div style={{
      fontFamily: "'Noto Sans JP', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { width: 100%; height: 100dvh; overflow: hidden; }
        .app-container { height: 100vh; height: 100dvh; }
        .nav-bar { padding-bottom: calc(8px + env(safe-area-inset-bottom)); }
        input, select, textarea { min-width: 0; font-family: inherit; }
        button { font-family: inherit; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
      `}</style>
    <div style={{
      width: "100vw", height: "100dvh",
      // dvh fallback handled via CSS
      display: "flex", flexDirection: "column", overflow: "hidden",
      background: "linear-gradient(135deg, #fff7ed 0%, #f8fafc 50%, #fff7ed 100%)",
      position: "fixed", top: 0, left: 0,
    }}>

      {/* Header */}
      <header style={{
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)",
        padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(226,232,240,0.6)", flexShrink: 0,
        boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(249,115,22,0.4)",
          }}>
            <span style={{ fontSize: 20 }}>🏀</span>
          </div>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 900, color: "#1e293b", lineHeight: 1.2 }}>Basketball Tracker</h1>
            <p style={{ fontSize: 11, color: "#94a3b8" }}>AI バスケ練習管理</p>
          </div>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg, #1e293b, #334155)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontWeight: 800, fontSize: 14,
        }}>Y</div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: 16, width: "100%", minHeight: 0 }}>
        {renderTab()}
      </main>

      {/* Bottom Nav */}
      <nav className="nav-bar" style={{
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(226,232,240,0.6)", padding: "8px 4px",
        flexShrink: 0, boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-around", maxWidth: 500, margin: "0 auto" }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              padding: "6px 10px", borderRadius: 12, border: "none", cursor: "pointer",
              background: activeTab === tab.id
                ? "linear-gradient(135deg, #f97316, #ea580c)"
                : "transparent",
              color: activeTab === tab.id ? "white" : "#94a3b8",
              transition: "all 0.25s ease",
              transform: activeTab === tab.id ? "translateY(-2px)" : "none",
              boxShadow: activeTab === tab.id ? "0 4px 12px rgba(249,115,22,0.35)" : "none",
              minWidth: 48,
            }}>
              <span style={{ fontSize: 18 }}>{tab.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 700 }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
    </div>
  );
}