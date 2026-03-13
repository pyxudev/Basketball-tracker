import { useState, useEffect, useRef, useCallback } from "react";

// ==================== CONSTANTS ====================
const typeColors = {
  shoot: "#f97316", dribble: "#3b82f6", move: "#8b5cf6",
  defense: "#10b981", conditioning: "#ef4444",
};
const typeLabels = {
  shoot: "シュート", dribble: "ドリブル", move: "ムーブ",
  defense: "ディフェンス", conditioning: "コンディション",
};
const TABS = [
  { id: "home",     label: "ホーム",  icon: "🏠" },
  { id: "dashboard",label: "ダッシュ",icon: "📊" },
  { id: "practice", label: "練習",    icon: "⚡" },
  { id: "game",     label: "試合",    icon: "🏀" },
  { id: "analysis", label: "解析",    icon: "🧠" },
  { id: "growth",   label: "成長",    icon: "📈" },
  { id: "manage",   label: "管理",    icon: "⚙️" },
];

// ==================== STORAGE (localStorage) ====================
const STORAGE_PREFIX = "basketball_tracker_";
const DB = {
  async get(key) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  async set(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) { console.error("localStorage.set error", e); }
  },
};

// ==================== AI ====================
// グローバルAI設定（ManageTabから更新される）
window._aiConfig = window._aiConfig || { mode: "anthropic", apiKey: "", ollamaUrl: "http://localhost:11434", ollamaModel: "llama3" };

async function callAI(systemPrompt, userPrompt) {
  const cfg = window._aiConfig;

  // APIキー未設定チェック
  if (cfg.mode === "anthropic" && !cfg.apiKey) {
    return "⚙️ 管理タブでAnthropicのAPIキーを設定してください。";
  }
  if (cfg.mode === "ollama" && !cfg.ollamaUrl) {
    return "⚙️ 管理タブでOllamaのURLを設定してください。";
  }

  try {
    if (cfg.mode === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": cfg.apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      const data = await res.json();
      if (data.error) return `APIエラー: ${data.error.message}`;
      return data.content?.[0]?.text || "エラーが発生しました。";

    } else {
      // Ollama: /api/chat エンドポイント
      const res = await fetch(`${cfg.ollamaUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: cfg.ollamaModel,
          stream: false,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: userPrompt },
          ],
        }),
      });
      const data = await res.json();
      if (data.error) return `Ollamaエラー: ${data.error}`;
      return data.message?.content || "エラーが発生しました。";
    }
  } catch (e) {
    if (cfg.mode === "ollama") return `Ollama接続エラー: ${e.message}\nOllamaが起動しているか確認してください。`;
    return `通信エラー: ${e.message}`;
  }
}

// ==================== SHARED UI ====================
function LoadingDots() {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "8px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%", background: "#f97316",
          animation: `bdot 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`@keyframes bdot{0%,100%{transform:scale(1);opacity:.4}50%{transform:scale(1.4);opacity:1}}`}</style>
    </div>
  );
}

function AIBox({ comment, loading }) {
  return (
    <div style={{
      background: "linear-gradient(135deg,#1e293b,#0f172a)", borderRadius: 16,
      padding: "16px 20px", color: "white", border: "1px solid rgba(249,115,22,0.3)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: -20, right: -20, width: 80, height: 80,
        background: "radial-gradient(circle,rgba(249,115,22,0.2) 0%,transparent 70%)",
      }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "linear-gradient(135deg,#f97316,#ea580c)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
        }}>🤖</div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#f97316", letterSpacing: "0.08em" }}>AI コーチ</span>
      </div>
      {loading ? <LoadingDots /> : (
        <p style={{ fontSize: 13, lineHeight: 1.7, color: "#e2e8f0", whiteSpace: "pre-wrap" }}>{comment}</p>
      )}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.07)", ...style }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", disabled = false, style = {} }) {
  const bg = variant === "primary" ? "linear-gradient(135deg,#f97316,#ea580c)"
    : variant === "dark" ? "linear-gradient(135deg,#1e293b,#0f172a)"
    : "#fff7ed";
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "13px 0", background: disabled ? "#e2e8f0" : bg,
      border: variant === "ghost" ? "1px solid #fed7aa" : "none",
      borderRadius: 14, color: variant === "ghost" ? "#f97316" : "white",
      fontWeight: 700, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      opacity: disabled ? 0.6 : 1, ...style,
    }}>{children}</button>
  );
}

function StatBar({ label, value, max, color }) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#64748b" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{value}分</span>
      </div>
      <div style={{ height: 8, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: 999,
          background: `linear-gradient(90deg,${color},${color}cc)`, transition: "width 0.8s ease",
        }} />
      </div>
    </div>
  );
}

function Empty({ icon, text }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 20px", color: "#94a3b8" }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
      <p style={{ fontSize: 13 }}>{text}</p>
    </div>
  );
}

const INP = {
  padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0",
  fontSize: 13, width: "100%", minWidth: 0, outline: "none", background: "white",
};

// ==================== HOME TAB ====================
function HomeTab({ practices, onSessionSave }) {
  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [aiComment, setAiComment] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const startTimeRef = useRef(null); // 開始時刻をDate.now()で記録
  const tickRef = useRef(null);

  const totalMin = practices.reduce((a, p) => a + (p.duration || 0), 0);
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // visibilitychange: 画面ロック復帰時に経過時間を再計算
  useEffect(() => {
    const onVisible = () => {
      if (active && startTimeRef.current) {
        const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(secs);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [active]);

  const start = async () => {
    setSaved(false);
    startTimeRef.current = Date.now();
    setActive(true);
    setElapsed(0);
    // setIntervalはUI更新用。止まっても復帰時にvisibilitychangeで補正される
    tickRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    if (practices.length > 0) {
      setAiLoading(true);
      const menu = practices.map(p => `${p.label}: ${p.duration ? p.duration + "分" : p.reps + "本"}`).join(", ");
      const c = await callAI(
        "あなたはバスケットボールのプロコーチです。練習メニューを見てモチベーションを上げる激励と具体的アドバイスを日本語で100文字以内で。",
        `今日の練習メニュー: ${menu}`
      );
      setAiComment(c);
      setAiLoading(false);
    }
  };

  const stop = async () => {
    clearInterval(tickRef.current);
    // 停止時も開始時刻から正確に計算
    const finalSecs = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : elapsed;
    setActive(false);
    if (finalSecs > 0) {
      await onSessionSave({ duration: Math.round(finalSecs / 60), date: new Date().toISOString().split("T")[0] });
      setElapsed(finalSecs);
      setSaved(true);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b" }}>📋 今日のメニュー</h2>
          <span style={{ fontSize: 11, background: "#fff7ed", color: "#f97316", padding: "4px 10px", borderRadius: 999, fontWeight: 700 }}>
            {practices.length}項目 / {totalMin}分
          </span>
        </div>

        {practices.length === 0
          ? <Empty icon="📝" text="練習タブでメニューを追加してください" />
          : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {practices.map((p, i) => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", background: "#f8fafc", borderRadius: 14, border: "1px solid #e2e8f0",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: `linear-gradient(135deg,${p.color},${p.color}bb)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontWeight: 800, fontSize: 14,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{typeLabels[p.type]}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: "#f97316" }}>{p.duration || p.reps}</span>
                    <span style={{ fontSize: 12, color: "#64748b", marginLeft: 2 }}>{p.duration ? "分" : "本"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

        {active && (
          <div style={{ marginTop: 16, padding: 14, background: "linear-gradient(135deg,#1e293b,#0f172a)", borderRadius: 14, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>⏱ 練習中</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#f97316", fontVariantNumeric: "tabular-nums" }}>{fmt(elapsed)}</div>
          </div>
        )}

        {saved && !active && (
          <div style={{ marginTop: 12, padding: 10, background: "#dcfce7", borderRadius: 10, textAlign: "center", fontSize: 13, color: "#16a34a", fontWeight: 700 }}>
            ✅ 練習を保存しました（{Math.round(elapsed / 60)}分）
          </div>
        )}

        <Btn onClick={active ? stop : start} variant={active ? "dark" : "primary"} style={{ marginTop: 14 }}>
          {active ? "⏹ 練習終了・保存" : "▶ 練習を開始"}
        </Btn>
      </Card>

      {(aiComment || aiLoading) && <AIBox comment={aiComment} loading={aiLoading} />}
    </div>
  );
}

// ==================== DASHBOARD TAB ====================
function DashboardTab({ practices, games, sessions }) {
  const [aiComment, setAiComment] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // 過去7日
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 6 + i);
    const dateStr = d.toISOString().split("T")[0];
    const dayLabel = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
    const mins = sessions.filter(s => s.date === dateStr).reduce((a, s) => a + (s.duration || 0), 0);
    return { day: dayLabel, minutes: mins, date: dateStr };
  });
  const weekTotal = weekDays.reduce((a, d) => a + d.minutes, 0);
  const maxBar = Math.max(...weekDays.map(d => d.minutes), 1);

  // 今日の練習
  const todayMin = sessions.filter(s => s.date === todayStr).reduce((a, s) => a + (s.duration || 0), 0);

  // 練習タイプ内訳（メニュー登録から）
  const typeBreakdown = practices.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + (p.duration || 5);
    return acc;
  }, {});
  const totalPMin = Object.values(typeBreakdown).reduce((a, b) => a + b, 0);

  const analyze = async () => {
    setAiLoading(true);
    const latestGame = games[0];
    const shootRate = latestGame ? Math.round((latestGame.shotsMade / (latestGame.shots || 1)) * 100) : null;
    const summary = [
      `今日の練習時間: ${todayMin}分`,
      `今週の練習時間: ${weekTotal}分`,
      `練習メニュー内訳: ${Object.entries(typeBreakdown).map(([k, v]) => `${typeLabels[k]}${v}分`).join(", ") || "なし"}`,
      latestGame ? `最新試合: シュート成功率${shootRate}%, アシスト${latestGame.assists}, リバウンド${latestGame.rebounds}` : "試合記録なし",
    ].join("。");
    const c = await callAI(
      "あなたはバスケットボールのプロコーチです。選手のデータを分析し、今週の評価と改善点を日本語で150文字以内で。",
      summary
    );
    setAiComment(c);
    setAiLoading(false);
  };

  useEffect(() => {
    if (games.length > 0 || sessions.length > 0 || practices.length > 0) analyze();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      {/* Today + week summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          { icon: "☀️", label: "今日の練習", value: todayMin, unit: "分" },
          { icon: "📅", label: "今週の練習", value: weekTotal, unit: "分" },
        ].map(s => (
          <Card key={s.label} style={{ padding: 16 }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#f97316" }}>
              {s.value}<span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, marginLeft: 2 }}>{s.unit}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Weekly chart */}
      <Card>
        <h2 style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", marginBottom: 14 }}>📅 今週の練習時間</h2>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 90, justifyContent: "space-around" }}>
          {weekDays.map(d => {
            const h = d.minutes > 0 ? Math.max(10, (d.minutes / maxBar) * 75) : 0;
            const isToday = d.date === todayStr;
            return (
              <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#f97316" }}>{d.minutes > 0 ? `${d.minutes}m` : ""}</div>
                <div style={{
                  width: "100%", height: h || 4, borderRadius: h ? "4px 4px 0 0" : 4,
                  background: h ? (isToday ? "linear-gradient(180deg,#fb923c,#f97316)" : "linear-gradient(180deg,#f97316,#ea580c)") : "#e2e8f0",
                  outline: isToday ? "2px solid #fb923c" : "none", outlineOffset: 1,
                }} />
                <div style={{ fontSize: 10, color: isToday ? "#f97316" : "#94a3b8", fontWeight: isToday ? 800 : 400 }}>{d.day}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Practice balance */}
      {totalPMin > 0 && (
        <Card>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", marginBottom: 14 }}>⚖️ 練習バランス</h2>
          {Object.entries(typeBreakdown).map(([type, min]) => (
            <StatBar key={type} label={typeLabels[type]} value={min} max={totalPMin} color={typeColors[type]} />
          ))}
        </Card>
      )}

      {/* Latest game */}
      {games.length > 0 && (() => {
        const g = games[0];
        const rate = Math.round((g.shotsMade / (g.shots || 1)) * 100);
        return (
          <Card>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", marginBottom: 12 }}>🏀 直近の試合（{g.date}）</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: "シュート率", value: `${rate}%` },
                { label: "アシスト", value: g.assists },
                { label: "リバウンド", value: g.rebounds },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center", padding: 10, background: "#f8fafc", borderRadius: 10 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#f97316" }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}

      {(aiComment || aiLoading) && <AIBox comment={aiComment} loading={aiLoading} />}
      <Btn onClick={analyze} variant="primary">🔄 AI再分析</Btn>
    </div>
  );
}

// ==================== PRACTICE TAB ====================
// ==================== PRACTICE FORM FIELDS (must be top-level to avoid remount) ====================
function PracticeFormFields({ values, onChange, onSave, onCancel, saveLabel }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <select value={values.type} onChange={e => onChange(f => ({ ...f, type: e.target.value }))} style={INP}>
        {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <input placeholder="練習名（例: ドリブル基礎）" value={values.label}
        onChange={e => onChange(f => ({ ...f, label: e.target.value }))} style={INP} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input placeholder="時間（分）" type="number" min="0" value={values.duration}
          onChange={e => onChange(f => ({ ...f, duration: e.target.value }))} style={INP} />
        <input placeholder="本数（本）" type="number" min="0" value={values.reps}
          onChange={e => onChange(f => ({ ...f, reps: e.target.value }))} style={INP} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Btn onClick={onSave} disabled={!values.label.trim()}>{saveLabel}</Btn>
        <Btn onClick={onCancel} variant="ghost">キャンセル</Btn>
      </div>
    </div>
  );
}

function PracticeTab({ practices, setPractices }) {
  const emptyForm = { type: "shoot", label: "", duration: "", reps: "" };
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null); // 編集中のアイテムID
  const [editForm, setEditForm] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const add = async () => {
    if (!form.label.trim()) return;
    const item = {
      id: Date.now(), type: form.type, label: form.label.trim(),
      duration: form.duration ? parseInt(form.duration) : null,
      reps: form.reps ? parseInt(form.reps) : null,
      color: typeColors[form.type],
    };
    const next = [...practices, item];
    setPractices(next);
    await DB.set("practices", next);
    setForm(emptyForm);
    setShowAdd(false);
  };

  const startEdit = (p) => {
    setEditId(p.id);
    setEditForm({
      type: p.type,
      label: p.label,
      duration: p.duration != null ? String(p.duration) : "",
      reps: p.reps != null ? String(p.reps) : "",
    });
    setShowAdd(false);
  };

  const saveEdit = async () => {
    if (!editForm.label.trim()) return;
    const next = practices.map(p =>
      p.id === editId
        ? {
            ...p,
            type: editForm.type,
            label: editForm.label.trim(),
            duration: editForm.duration ? parseInt(editForm.duration) : null,
            reps: editForm.reps ? parseInt(editForm.reps) : null,
            color: typeColors[editForm.type],
          }
        : p
    );
    setPractices(next);
    await DB.set("practices", next);
    setEditId(null);
    setEditForm(null);
  };

  const cancelEdit = () => { setEditId(null); setEditForm(null); };

  const remove = async (id) => {
    const next = practices.filter(p => p.id !== id);
    setPractices(next);
    await DB.set("practices", next);
    if (editId === id) cancelEdit();
  };

  const analyze = async () => {
    if (!practices.length) return;
    setAiLoading(true);
    const menu = practices.map(p => `${p.label}: ${p.duration ? p.duration + "分" : p.reps + "本"}`).join(", ");
    const c = await callAI(
      "あなたはバスケットボールのプロコーチです。練習内容を分析しバランス評価と改善提案を日本語で200文字以内で。",
      `練習メニュー: ${menu}`
    );
    setAiAnalysis(c);
    setAiLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>⚡ 練習メニュー</h2>
          <button onClick={() => { setShowAdd(!showAdd); cancelEdit(); }} style={{
            padding: "8px 14px", background: showAdd ? "#f1f5f9" : "#fff7ed",
            border: `1px solid ${showAdd ? "#e2e8f0" : "#fed7aa"}`,
            borderRadius: 10, color: showAdd ? "#64748b" : "#f97316", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>
            {showAdd ? "✕ 閉じる" : "+ 追加"}
          </button>
        </div>

        {/* 追加フォーム */}
        {showAdd && (
          <div style={{ background: "#f8fafc", borderRadius: 14, padding: 16, marginBottom: 16, border: "1px solid #e2e8f0" }}>
            <PracticeFormFields
              values={form} onChange={setForm}
              onSave={add} onCancel={() => setShowAdd(false)}
              saveLabel="💾 追加"
            />
          </div>
        )}

        {practices.length === 0
          ? <Empty icon="⚡" text="メニューを追加して練習を管理しましょう" />
          : practices.map(p => (
            <div key={p.id} style={{ marginBottom: 10 }}>
              {/* 編集フォーム（展開表示） */}
              {editId === p.id ? (
                <div style={{ background: "#fff7ed", borderRadius: 14, padding: 16, border: "1px solid #fed7aa" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#f97316", marginBottom: 10 }}>✏️ 編集中: {p.label}</div>
                  <PracticeFormFields
                    values={editForm} onChange={setEditForm}
                    onSave={saveEdit} onCancel={cancelEdit}
                    saveLabel="✅ 保存"
                  />
                  <button onClick={() => remove(p.id)} style={{
                    marginTop: 10, width: "100%", padding: "8px 0", background: "none",
                    border: "1px solid #fecaca", borderRadius: 10,
                    color: "#ef4444", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}>🗑 削除</button>
                </div>
              ) : (
                /* 通常表示 */
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", background: "#f8fafc", borderRadius: 14, border: "1px solid #e2e8f0",
                }}>
                  <div style={{ width: 10, height: 40, borderRadius: 999, flexShrink: 0, background: `linear-gradient(180deg,${p.color},${p.color}88)` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{typeLabels[p.type]}</div>
                  </div>
                  <span style={{ fontWeight: 800, color: "#f97316", fontSize: 16, flexShrink: 0 }}>
                    {p.duration ? `${p.duration}分` : `${p.reps}本`}
                  </span>
                  {/* 編集ボタン */}
                  <button onClick={() => startEdit(p)} style={{
                    background: "none", border: "1px solid #e2e8f0", borderRadius: 8,
                    color: "#64748b", cursor: "pointer", fontSize: 13, padding: "4px 8px", flexShrink: 0,
                  }}>✏️</button>
                </div>
              )}
            </div>
          ))
        }
      </Card>

      {practices.length > 0 && <Btn onClick={analyze} variant="dark">🤖 AI分析</Btn>}
      {(aiAnalysis || aiLoading) && <AIBox comment={aiAnalysis} loading={aiLoading} />}
    </div>
  );
}

// ==================== GAME TAB ====================
function GameTab({ games, setGames }) {
  const emptyForm = {
    date: new Date().toISOString().split("T")[0],
    playTime: "", shots: "", shotsMade: "", assists: "",
    blocks: "", rebounds: "", steals: "", passMiss: "", playMiss: "",
  };
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [aiMap, setAiMap] = useState({});
  const [loadingId, setLoadingId] = useState(null);

  const fields = [
    { key: "playTime", label: "出場時間", unit: "分" },
    { key: "shots",    label: "シュート数", unit: "本" },
    { key: "shotsMade",label: "成功数",    unit: "本" },
    { key: "assists",  label: "アシスト",  unit: "" },
    { key: "blocks",   label: "ブロック",  unit: "" },
    { key: "rebounds", label: "リバウンド",unit: "" },
    { key: "steals",   label: "スティール",unit: "" },
    { key: "passMiss", label: "パスミス",  unit: "" },
    { key: "playMiss", label: "プレイミス",unit: "" },
  ];

  const save = async () => {
    const game = {
      id: Date.now(),
      ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, k === "date" ? v : parseInt(v) || 0])),
    };
    const next = [game, ...games];
    setGames(next);
    await DB.set("games", next);
    setForm(emptyForm);
    setShowAdd(false);
  };

  const removeGame = async (id) => {
    const next = games.filter(g => g.id !== id);
    setGames(next);
    await DB.set("games", next);
  };

  const analyze = async (game) => {
    setLoadingId(game.id);
    const rate = Math.round((game.shotsMade / (game.shots || 1)) * 100);
    const c = await callAI(
      "あなたはバスケットボールのプロコーチです。試合スタッツを分析してパフォーマンス評価と改善点を日本語で200文字以内で。",
      `出場${game.playTime}分, シュート成功率${rate}%(${game.shotsMade}/${game.shots}), アシスト${game.assists}, ブロック${game.blocks}, リバウンド${game.rebounds}, スティール${game.steals}, パスミス${game.passMiss}, プレイミス${game.playMiss}`
    );
    setAiMap(prev => ({ ...prev, [game.id]: c }));
    setLoadingId(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b" }}>🏀 試合記録</h2>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          padding: "8px 16px",
          background: showAdd ? "#f1f5f9" : "linear-gradient(135deg,#f97316,#ea580c)",
          border: "none", borderRadius: 10,
          color: showAdd ? "#64748b" : "white", fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>
          {showAdd ? "✕ 閉じる" : "+ 記録する"}
        </button>
      </div>

      {showAdd && (
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: "#1e293b" }}>試合データ入力</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={INP} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {fields.map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, display: "block" }}>
                    {f.label}{f.unit ? `（${f.unit}）` : ""}
                  </label>
                  <input type="number" min="0" value={form[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} style={INP} />
                </div>
              ))}
            </div>
            <Btn onClick={save}>💾 保存</Btn>
          </div>
        </Card>
      )}

      {games.length === 0 && !showAdd && <Empty icon="🏀" text="試合記録がまだありません" />}

      {games.map(game => {
        const rate = Math.round((game.shotsMade / (game.shots || 1)) * 100);
        return (
          <Card key={game.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>📅 {game.date}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 11, background: "#fff7ed", color: "#f97316", padding: "4px 10px", borderRadius: 999, fontWeight: 700 }}>
                  {game.playTime}分出場
                </span>
                <button onClick={() => removeGame(game.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, padding: 2 }}>🗑</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[
                { label: "シュート率",  value: `${rate}%` },
                { label: "アシスト",   value: game.assists },
                { label: "リバウンド", value: game.rebounds },
                { label: "ブロック",   value: game.blocks },
                { label: "スティール", value: game.steals },
                { label: "ミス合計",   value: (game.passMiss || 0) + (game.playMiss || 0) },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center", padding: 10, background: "#f8fafc", borderRadius: 10 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#f97316" }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <Btn onClick={() => analyze(game)} variant="dark" style={{ fontSize: 13, padding: "10px 0" }}>
              🤖 この試合をAI分析
            </Btn>
            {(aiMap[game.id] || loadingId === game.id) && (
              <div style={{ marginTop: 12 }}>
                <AIBox comment={aiMap[game.id] || ""} loading={loadingId === game.id} />
              </div>
            )}
          </Card>
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
    { icon: "🎯", label: "シュートフォーム改善", q: "シュートフォームを改善するための具体的な練習方法を教えてください" },
    { icon: "⚡", label: "ドリブル強化",          q: "ドリブルスキルを向上させる練習メニューを提案してください" },
    { icon: "🛡️", label: "ディフェンス向上",      q: "ディフェンス力を上げるための練習方法と心構えを教えてください" },
    { icon: "💪", label: "体力強化",               q: "バスケに必要な体力・フィジカルを強化するトレーニングを教えてください" },
  ];

  const ask = async (q) => {
    const question = (q || prompt).trim();
    if (!question) return;
    setLoading(true);
    setResponse("");
    const a = await callAI(
      "あなたはバスケットボールのプロコーチです。選手の質問に具体的で実践的なアドバイスを日本語で300文字以内で。",
      question
    );
    setResponse(a);
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      <Card>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>🧠 AIコーチに質問</h2>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>練習・フォーム・戦術など何でも聞いてください</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {suggestions.map(s => (
            <button key={s.label} onClick={() => { setSelected(s.label); ask(s.q); }} style={{
              padding: "12px 10px", textAlign: "left", cursor: "pointer", borderRadius: 12,
              background: selected === s.label ? "#fff7ed" : "#f8fafc",
              border: `1px solid ${selected === s.label ? "#fed7aa" : "#e2e8f0"}`,
            }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1e293b" }}>{s.label}</div>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input placeholder="自由に質問してください..." value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === "Enter" && ask()}
            style={{ ...INP, flex: 1 }} />
          <button onClick={() => ask()} style={{
            padding: "12px 16px", background: "linear-gradient(135deg,#f97316,#ea580c)",
            border: "none", borderRadius: 12, color: "white", fontWeight: 700, cursor: "pointer", fontSize: 16, flexShrink: 0,
          }}>→</button>
        </div>
      </Card>
      {(response || loading) && <AIBox comment={response} loading={loading} />}
    </div>
  );
}

// ==================== GROWTH TAB ====================
function GrowthTab({ games, sessions }) {
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const rates = [...games].reverse().map(g => ({
    date: g.date.slice(5),
    rate: Math.round((g.shotsMade / (g.shots || 1)) * 100),
  }));
  const maxRate = Math.max(...rates.map(r => r.rate), 1);

  const now = new Date();
  const monthTotal = sessions
    .filter(s => (now - new Date(s.date)) / 86400000 <= 30)
    .reduce((a, s) => a + (s.duration || 0), 0);
  const totalSessions = sessions.length;

  const avgShootRate = games.length > 0
    ? Math.round(games.reduce((a, g) => a + g.shotsMade / (g.shots || 1), 0) / games.length * 100) : null;

  const analyze = async () => {
    setAiLoading(true);
    const trend = rates.length > 0 ? rates.map(r => `${r.date}:${r.rate}%`).join(", ") : "データなし";
    const c = await callAI(
      "あなたはバスケットボールのプロコーチです。成長データを見てトレンド分析と今後の目標を日本語で150文字以内で。",
      `シュート成功率の推移: ${trend}。今月の練習時間: ${monthTotal}分、練習回数: ${totalSessions}回`
    );
    setAiInsight(c);
    setAiLoading(false);
  };

  useEffect(() => {
    if (games.length > 0 || sessions.length > 0) analyze();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          { icon: "⏱", label: "今月の練習時間", value: monthTotal, unit: "分" },
          { icon: "🔢", label: "総練習回数",     value: totalSessions, unit: "回" },
          { icon: "🎯", label: "平均シュート率", value: avgShootRate !== null ? `${avgShootRate}%` : "—", unit: "" },
          { icon: "🏀", label: "試合数",         value: games.length, unit: "試合" },
        ].map(s => (
          <Card key={s.label} style={{ padding: 16 }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#f97316" }}>
              {s.value}<span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, marginLeft: 2 }}>{s.unit}</span>
            </div>
          </Card>
        ))}
      </div>

      {rates.length > 0 ? (
        <Card>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", marginBottom: 12 }}>📈 シュート成功率の推移</h2>
          {rates.length >= 2 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>{rates[0].rate}%</span>
              <span style={{ fontSize: 16, color: "#10b981" }}>→</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: "#f97316" }}>{rates[rates.length - 1].rate}%</span>
              {(() => {
                const diff = rates[rates.length - 1].rate - rates[0].rate;
                return diff !== 0 ? (
                  <span style={{
                    fontSize: 11, padding: "3px 8px", borderRadius: 999, fontWeight: 700,
                    background: diff > 0 ? "#dcfce7" : "#fee2e2",
                    color: diff > 0 ? "#16a34a" : "#dc2626",
                  }}>{diff > 0 ? `+${diff}` : diff}%</span>
                ) : null;
              })()}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 90 }}>
            {rates.map((r, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#f97316" }}>{r.rate}%</div>
                <div style={{
                  width: "100%", height: `${(r.rate / maxRate) * 72}px`, minHeight: 6,
                  borderRadius: "4px 4px 0 0", background: "linear-gradient(180deg,#f97316,#ea580c)",
                }} />
                <div style={{ fontSize: 9, color: "#94a3b8" }}>{r.date}</div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card><Empty icon="📈" text="試合を記録すると成長グラフが表示されます" /></Card>
      )}

      {games.length > 0 && (() => {
        const avg = key => Math.round(games.reduce((a, g) => a + (g[key] || 0), 0) / games.length * 10) / 10;
        return (
          <Card>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", marginBottom: 14 }}>🏆 平均スタッツ（{games.length}試合）</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "出場時間",   value: avg("playTime"), unit: "分" },
                { label: "シュート率", value: `${avgShootRate}%`, unit: "" },
                { label: "アシスト",   value: avg("assists"), unit: "" },
                { label: "リバウンド", value: avg("rebounds"), unit: "" },
                { label: "ブロック",   value: avg("blocks"), unit: "" },
                { label: "スティール", value: avg("steals"), unit: "" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center", padding: "12px 8px", background: "#f8fafc", borderRadius: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#f97316" }}>{s.value}{s.unit}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}

      {(aiInsight || aiLoading) && <AIBox comment={aiInsight} loading={aiLoading} />}
      <Btn onClick={analyze} variant="dark">🔄 成長レポートを更新</Btn>
    </div>
  );
}

// ==================== MANAGE TAB ====================
// CSV・PDF出力はすべてブラウザ内で完結（サーバー不要）
// PDF は新規ウィンドウで日本語HTMLを生成 → ブラウザのPDF印刷を使用（文字化けなし）

function downloadFile(filename, blobContent, mimeType) {
  const blob = new Blob([blobContent], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toCSV(rows, headers) {
  const escape = v => `"${String(v ?? "").replace(/"/g, '""')}"`; 
  return [headers.map(escape), ...rows.map(r => r.map(escape))].join("\n");
}

function buildPdfHtml(practices, games, sessions) {
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  const avgShootRate = games.length
    ? Math.round(games.reduce((a, g) => a + g.shotsMade / (g.shots || 1), 0) / games.length * 100) : null;
  const avg = key => games.length
    ? (games.reduce((a, g) => a + (g[key] || 0), 0) / games.length).toFixed(1) : "-";
  const monthTotal = sessions
    .filter(s => (Date.now() - new Date(s.date)) / 86400000 <= 30)
    .reduce((a, s) => a + (s.duration || 0), 0);

  const th = s => `<th>${s}</th>`;
  const td = s => `<td>${s ?? "-"}</td>`;
  const tr = cols => `<tr>${cols.map(td).join("")}</tr>`;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Basketball Tracker レポート</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Noto Sans JP", sans-serif; font-size: 11pt; color: #1e293b; background: white; padding: 0; }
  .page { max-width: 210mm; margin: 0 auto; padding: 12mm 14mm; }

  /* ヘッダー */
  .header { background: linear-gradient(135deg,#f97316,#ea580c); color: white; padding: 12px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .header h1 { font-size: 16pt; font-weight: 900; }
  .header .date { font-size: 9pt; opacity: 0.9; }

  /* サマリーカード */
  .summary { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 20px; }
  .summary-card { background: #f8fafc; border-radius: 8px; padding: 10px 12px; text-align: center; border: 1px solid #e2e8f0; }
  .summary-card .val { font-size: 18pt; font-weight: 900; color: #f97316; }
  .summary-card .lbl { font-size: 8pt; color: #94a3b8; margin-top: 2px; }

  /* セクション */
  .section { margin-bottom: 20px; }
  .section-title { background: #f1f5f9; padding: 6px 12px; border-left: 4px solid #f97316; font-size: 11pt; font-weight: 700; margin-bottom: 10px; border-radius: 0 6px 6px 0; }

  /* テーブル */
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  thead tr { background: #f97316; color: white; }
  th { padding: 6px 8px; text-align: left; font-weight: 700; }
  td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
  tr:nth-child(even) td { background: #f8fafc; }

  /* フッター */
  .footer { text-align: center; font-size: 8pt; color: #94a3b8; margin-top: 24px; padding-top: 10px; border-top: 1px solid #e2e8f0; }

  /* 印刷用 */
  @media print {
    body { padding: 0; }
    .page { padding: 8mm 10mm; }
    .no-print { display: none !important; }
  }

  /* 印刷ボタン */
  .print-bar { position: fixed; bottom: 20px; right: 20px; display: flex; gap: 10px; z-index: 999; }
  .print-btn { padding: 12px 24px; background: linear-gradient(135deg,#f97316,#ea580c); color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: "Noto Sans JP",sans-serif; box-shadow: 0 4px 16px rgba(249,115,22,0.4); }
  .close-btn { padding: 12px 20px; background: #1e293b; color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: "Noto Sans JP",sans-serif; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>🏀 Basketball Tracker レポート</h1>
    <div class="date">${today}</div>
  </div>

  <!-- サマリー -->
  <div class="summary">
    <div class="summary-card"><div class="val">${games.length}</div><div class="lbl">試合数</div></div>
    <div class="summary-card"><div class="val">${avgShootRate !== null ? avgShootRate + "%" : "—"}</div><div class="lbl">平均シュート率</div></div>
    <div class="summary-card"><div class="val">${sessions.length}</div><div class="lbl">総練習回数</div></div>
    <div class="summary-card"><div class="val">${monthTotal}</div><div class="lbl">今月の練習(分)</div></div>
  </div>

  ${practices.length ? `
  <!-- 練習メニュー -->
  <div class="section">
    <div class="section-title">⚡ 練習メニュー</div>
    <table>
      <thead><tr>${["練習名","カテゴリ","時間","本数"].map(th).join("")}</tr></thead>
      <tbody>
        ${practices.map(p => tr([p.label, typeLabels[p.type], p.duration ? p.duration + "分" : "-", p.reps ? p.reps + "本" : "-"])).join("")}
      </tbody>
    </table>
  </div>` : ""}

  ${games.length ? `
  <!-- 試合記録 -->
  <div class="section">
    <div class="section-title">🏀 試合記録</div>
    <table>
      <thead><tr>${["日付","出場時間","シュート数","成功数","成功率","アシスト","ブロック","リバウンド","スティール"].map(th).join("")}</tr></thead>
      <tbody>
        ${games.map(g => {
          const rate = Math.round((g.shotsMade / (g.shots || 1)) * 100);
          return tr([g.date, g.playTime + "分", g.shots, g.shotsMade, rate + "%", g.assists, g.blocks, g.rebounds, g.steals]);
        }).join("")}
      </tbody>
    </table>
    <div style="margin-top:10px;padding:8px 12px;background:#fff7ed;border-radius:6px;font-size:9pt;">
      <strong style="color:#f97316">平均スタッツ：</strong>
      出場 ${avg("playTime")}分 ／ シュート率 ${avgShootRate}% ／ アシスト ${avg("assists")} ／ リバウンド ${avg("rebounds")} ／ ブロック ${avg("blocks")} ／ スティール ${avg("steals")}
    </div>
  </div>` : ""}

  ${sessions.length ? `
  <!-- 練習セッション -->
  <div class="section">
    <div class="section-title">⏱ 練習セッション（直近30件）</div>
    <table>
      <thead><tr>${["日付","練習時間"].map(th).join("")}</tr></thead>
      <tbody>
        ${sessions.slice(0, 30).map(s => tr([s.date, s.duration + "分"])).join("")}
      </tbody>
    </table>
    <div style="margin-top:8px;padding:6px 12px;background:#fff7ed;border-radius:6px;font-size:9pt;">
      <strong style="color:#f97316">合計：</strong>${sessions.reduce((a,s)=>a+(s.duration||0),0)}分 ／ ${sessions.length}回
    </div>
  </div>` : ""}

  <div class="footer">Basketball Tracker &nbsp;|&nbsp; ${today} 出力</div>
</div>

<div class="print-bar no-print">
  <button class="close-btn" onclick="window.close()">✕ 閉じる</button>
  <button class="print-btn" onclick="window.print()">🖨 PDFとして保存</button>
</div>
</body>
</html>`;
}

function ManageTab({ practices, games, sessions, setPractices, setGames, setSessions }) {
  const [exporting, setExporting] = useState(null);
  const [confirmClear, setConfirmClear] = useState(null); // "games"|"sessions"|"practices"|"all"

  // ── AI設定 state（localStorageから復元） ──
  const [aiMode, setAiMode] = useState(() => localStorage.getItem("bt_ai_mode") || "anthropic");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("bt_api_key") || "");
  const [ollamaUrl, setOllamaUrl] = useState(() => localStorage.getItem("bt_ollama_url") || "http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState(() => localStorage.getItem("bt_ollama_model") || "llama3");
  const [showKey, setShowKey] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const [testing, setTesting] = useState(false);

  // マウント時にグローバルへ反映
  useEffect(() => {
    window._aiConfig = { mode: aiMode, apiKey, ollamaUrl, ollamaModel };
  }, []);

  const saveAiConfig = () => {
    localStorage.setItem("bt_ai_mode", aiMode);
    localStorage.setItem("bt_api_key", apiKey);
    localStorage.setItem("bt_ollama_url", ollamaUrl);
    localStorage.setItem("bt_ollama_model", ollamaModel);
    window._aiConfig = { mode: aiMode, apiKey, ollamaUrl, ollamaModel };
    setTestMsg("✅ 設定を保存しました");
    setTimeout(() => setTestMsg(""), 10000);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestMsg("");
    window._aiConfig = { mode: aiMode, apiKey, ollamaUrl, ollamaModel };
    const result = await callAI(
      "あなたはバスケットボールコーチです。",
      "接続テスト：「接続OK」とだけ返してください。"
    );
    setTesting(false);
    if (result.includes("エラー") || result.includes("設定")) {
      setTestMsg("❌ " + result);
    } else {
      setTestMsg("✅ 接続成功: " + result.slice(0, 40));
    }
  };

  // ---- CSV エクスポート ----
  const exportCSV = (type) => {
    const today = new Date().toISOString().split("T")[0];
    if (type === "games") {
      if (!games.length) return alert("試合記録がありません");
      const headers = ["日付","出場時間(分)","シュート数","成功数","成功率(%)","アシスト","ブロック","リバウンド","スティール","パスミス","プレイミス"];
      const rows = games.map(g => [
        g.date, g.playTime, g.shots, g.shotsMade,
        Math.round((g.shotsMade / (g.shots || 1)) * 100),
        g.assists, g.blocks, g.rebounds, g.steals, g.passMiss, g.playMiss,
      ]);
      downloadFile(`games_${today}.csv`, "\uFEFF" + toCSV(rows, headers), "text/csv;charset=utf-8");
    }
    if (type === "sessions") {
      if (!sessions.length) return alert("練習セッションがありません");
      const headers = ["日付","練習時間(分)"];
      const rows = sessions.map(s => [s.date, s.duration]);
      downloadFile(`sessions_${today}.csv`, "\uFEFF" + toCSV(rows, headers), "text/csv;charset=utf-8");
    }
    if (type === "practices") {
      if (!practices.length) return alert("練習メニューがありません");
      const headers = ["練習名","カテゴリ","時間(分)","本数"];
      const rows = practices.map(p => [p.label, typeLabels[p.type], p.duration ?? "", p.reps ?? ""]);
      downloadFile(`menu_${today}.csv`, "\uFEFF" + toCSV(rows, headers), "text/csv;charset=utf-8");
    }
  };

  // ---- PDF エクスポート（新規ウィンドウでHTML生成 → ブラウザのPDF印刷）----
  const exportPDF = () => {
    if (!games.length && !sessions.length && !practices.length) {
      return alert("出力するデータがありません");
    }
    const html = buildPdfHtml(practices, games, sessions);
    const win = window.open("", "_blank");
    if (!win) return alert("ポップアップがブロックされています。許可してから再試行してください。");
    win.document.write(html);
    win.document.close();
  };

  // ---- データ削除 ----
  const clearData = async (type) => {
    if (type === "games" || type === "all") { setGames([]); await DB.set("games", []); }
    if (type === "sessions" || type === "all") { setSessions([]); await DB.set("sessions", []); }
    if (type === "practices" || type === "all") { setPractices([]); await DB.set("practices", []); }
    setConfirmClear(null);
  };

  const ActionBtn = ({ icon, label, sub, onClick, color = "orange", disabled = false }) => {
    const bg = color === "red"
      ? "linear-gradient(135deg,#ef4444,#dc2626)"
      : "linear-gradient(135deg,#f97316,#ea580c)";
    return (
      <button onClick={onClick} disabled={disabled} style={{
        display: "flex", alignItems: "center", gap: 14, width: "100%",
        padding: "14px 16px", background: disabled ? "#f1f5f9" : "white",
        border: `1px solid ${color === "red" ? "#fecaca" : "#e2e8f0"}`,
        borderRadius: 14, cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "left", opacity: disabled ? 0.6 : 1,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: disabled ? "#e2e8f0" : bg,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: color === "red" ? "#ef4444" : "#1e293b" }}>{label}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{sub}</div>
        </div>
      </button>
    );
  };

  // 確認ダイアログ
  const ConfirmDialog = ({ type, label, onConfirm, onCancel }) => (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{ background: "white", borderRadius: 20, padding: 24, maxWidth: 320, width: "100%" }}>
        <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>⚠️</div>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", textAlign: "center", marginBottom: 8 }}>
          本当に削除しますか？
        </h3>
        <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", marginBottom: 20 }}>
          「{label}」を削除します。<br />この操作は元に戻せません。
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button onClick={onCancel} style={{
            padding: "12px 0", background: "#f1f5f9", border: "none", borderRadius: 12,
            fontWeight: 700, fontSize: 14, cursor: "pointer", color: "#64748b",
          }}>キャンセル</button>
          <button onClick={onConfirm} style={{
            padding: "12px 0", background: "linear-gradient(135deg,#ef4444,#dc2626)",
            border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14,
            cursor: "pointer", color: "white",
          }}>削除する</button>
        </div>
      </div>
    </div>
  );

  const clearLabels = {
    games: "試合記録", sessions: "練習セッション", practices: "練習メニュー", all: "全データ",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>

      {/* ── AI設定カード ── */}
      <Card>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>🤖 AI設定</h2>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>
          AIコーチ機能に使用するLLMを設定します
        </p>

        {/* モード切り替え */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {[
            { id: "anthropic", icon: "☁️", label: "Anthropic API", sub: "Claude（クラウド）" },
            { id: "ollama",    icon: "🖥️", label: "Ollama",        sub: "ローカルLLM" },
          ].map(m => (
            <button key={m.id} onClick={() => setAiMode(m.id)} style={{
              padding: "12px 10px", borderRadius: 12, border: "none", cursor: "pointer",
              background: aiMode === m.id ? "linear-gradient(135deg,#f97316,#ea580c)" : "#f8fafc",
              color: aiMode === m.id ? "white" : "#64748b",
              outline: aiMode === m.id ? "none" : "1px solid #e2e8f0",
              transition: "all 0.2s",
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{m.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{m.label}</div>
              <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{m.sub}</div>
            </button>
          ))}
        </div>

        {/* Anthropic設定 */}
        {aiMode === "anthropic" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
              Anthropic APIキー
              <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer"
                style={{ marginLeft: 8, fontSize: 11, color: "#f97316" }}>取得 →</a>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type={showKey ? "text" : "password"}
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                style={{ ...INP, flex: 1, fontFamily: "monospace", fontSize: 12 }}
              />
              <button onClick={() => setShowKey(v => !v)} style={{
                padding: "0 12px", background: "#f1f5f9", border: "1px solid #e2e8f0",
                borderRadius: 10, cursor: "pointer", fontSize: 14, flexShrink: 0,
              }}>{showKey ? "🙈" : "👁"}</button>
            </div>
            <p style={{ fontSize: 11, color: "#94a3b8" }}>
              APIキーはlocalStorageに保存されます。本番利用ではバックエンドProxy推奨。
            </p>
          </div>
        )}

        {/* Ollama設定 */}
        {aiMode === "ollama" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>OllamaサーバーURL</label>
            <input
              placeholder="http://localhost:11434"
              value={ollamaUrl}
              onChange={e => setOllamaUrl(e.target.value)}
              style={{ ...INP, fontFamily: "monospace", fontSize: 12 }}
            />
            <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>モデル名</label>
            <input
              placeholder="llama3 / gemma3 / mistral など"
              value={ollamaModel}
              onChange={e => setOllamaModel(e.target.value)}
              style={{ ...INP, fontFamily: "monospace", fontSize: 12 }}
            />
            <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 10, fontSize: 11, color: "#64748b", lineHeight: 1.7 }}>
              <strong>Ollama起動手順：</strong><br />
              1. <code style={{ background: "#e2e8f0", padding: "1px 4px", borderRadius: 4 }}>ollama serve</code> を実行<br />
              2. <code style={{ background: "#e2e8f0", padding: "1px 4px", borderRadius: 4 }}>ollama pull {ollamaModel || "モデル名"}</code> でモデル取得<br />
              3. CORSが必要な場合：環境変数に<code style={{ background: "#e2e8f0", padding: "1px 4px", borderRadius: 4 }}>OLLAMA_ORIGINS="*"</code>を追加
            </div>
          </div>
        )}

        {/* 保存・テストボタン */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
          <button onClick={saveAiConfig} style={{
            padding: "12px 0", background: "linear-gradient(135deg,#f97316,#ea580c)",
            border: "none", borderRadius: 12, color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>💾 保存</button>
          <button onClick={testConnection} disabled={testing} style={{
            padding: "12px 0", background: testing ? "#f1f5f9" : "linear-gradient(135deg,#1e293b,#0f172a)",
            border: "none", borderRadius: 12, color: testing ? "#94a3b8" : "white",
            fontWeight: 700, fontSize: 13, cursor: testing ? "not-allowed" : "pointer",
          }}>{testing ? "テスト中..." : "🔌 接続テスト"}</button>
        </div>

        {testMsg && (
          <div style={{
            marginTop: 10, padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: testMsg.startsWith("✅") ? "#dcfce7" : "#fee2e2",
            color: testMsg.startsWith("✅") ? "#16a34a" : "#dc2626",
          }}>{testMsg}</div>
        )}
      </Card>

      {confirmClear && (
        <ConfirmDialog
          type={confirmClear}
          label={clearLabels[confirmClear]}
          onConfirm={() => clearData(confirmClear)}
          onCancel={() => setConfirmClear(null)}
        />
      )}

      {/* PDF */}
      <Card>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>📄 PDF レポート</h2>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>
          新規タブでレポートを開き、ブラウザの「PDFとして保存」で保存。日本語も正しく表示されます。
        </p>
        <ActionBtn icon="📄" label="PDFプレビューを開く" sub="全データをA4レポートで表示 → 印刷ダイアログからPDF保存" onClick={exportPDF} />
      </Card>

      {/* CSV */}
      <Card>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>📊 CSV エクスポート</h2>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>
          Excel・スプレッドシートで開けるCSV形式（UTF-8 BOM付き）
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <ActionBtn icon="🏀" label="試合記録 CSV" sub={`${games.length}件`} onClick={() => exportCSV("games")} disabled={!games.length} />
          <ActionBtn icon="⚡" label="練習セッション CSV" sub={`${sessions.length}件`} onClick={() => exportCSV("sessions")} disabled={!sessions.length} />
          <ActionBtn icon="📋" label="練習メニュー CSV" sub={`${practices.length}件`} onClick={() => exportCSV("practices")} disabled={!practices.length} />
        </div>
      </Card>

      {/* データ削除 */}
      <Card>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#ef4444", marginBottom: 4 }}>🗑 データ削除</h2>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>
          削除したデータは復元できません。CSVでバックアップしてから実行してください。
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <ActionBtn icon="🏀" label="試合記録を削除" sub={`${games.length}件を削除`} onClick={() => setConfirmClear("games")} color="red" disabled={!games.length} />
          <ActionBtn icon="⚡" label="練習セッションを削除" sub={`${sessions.length}件を削除`} onClick={() => setConfirmClear("sessions")} color="red" disabled={!sessions.length} />
          <ActionBtn icon="📋" label="練習メニューを削除" sub={`${practices.length}件を削除`} onClick={() => setConfirmClear("practices")} color="red" disabled={!practices.length} />
          <ActionBtn icon="💥" label="全データを削除" sub="すべてリセット" onClick={() => setConfirmClear("all")} color="red" disabled={!games.length && !sessions.length && !practices.length} />
        </div>
      </Card>
    </div>
  );
}

// ==================== MAIN APP ====================
export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [practices, setPractices] = useState([]);
  const [games, setGames]         = useState([]);
  const [sessions, setSessions]   = useState([]);
  const [booting, setBooting]     = useState(true);

  // 起動時に全データをDBから復元 + AI設定をグローバルに反映
  useEffect(() => {
    // AI設定をlocalStorageから即時反映（ManageTabより先に読む）
    window._aiConfig = {
      mode:        localStorage.getItem("bt_ai_mode")      || "anthropic",
      apiKey:      localStorage.getItem("bt_api_key")      || "",
      ollamaUrl:   localStorage.getItem("bt_ollama_url")   || "http://localhost:11434",
      ollamaModel: localStorage.getItem("bt_ollama_model") || "llama3",
    };
    (async () => {
      const [p, g, s] = await Promise.all([
        DB.get("practices"),
        DB.get("games"),
        DB.get("sessions"),
      ]);
      if (p) setPractices(p);
      if (g) setGames(g);
      if (s) setSessions(s);
      setBooting(false);
    })();
  }, []);

  const handleSessionSave = useCallback(async (session) => {
    setSessions(prev => {
      const next = [{ id: Date.now(), ...session }, ...prev];
      DB.set("sessions", next);
      return next;
    });
  }, []);

  if (booting) {
    return (
      <div style={{
        width: "100vw", height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg,#fff7ed,#f8fafc)", fontFamily: "'Noto Sans JP', sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🏀</div>
          <LoadingDots />
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 8 }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case "home":      return <HomeTab practices={practices} onSessionSave={handleSessionSave} />;
      case "dashboard": return <DashboardTab practices={practices} games={games} sessions={sessions} />;
      case "practice":  return <PracticeTab practices={practices} setPractices={setPractices} />;
      case "game":      return <GameTab games={games} setGames={setGames} />;
      case "analysis":  return <AnalysisTab />;
      case "growth":    return <GrowthTab games={games} sessions={sessions} />;
      case "manage":    return <ManageTab practices={practices} games={games} sessions={sessions} setPractices={setPractices} setGames={setGames} setSessions={setSessions} />;
      default: return null;
    }
  };

  return (
    <div style={{ fontFamily: "'Noto Sans JP', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { width: 100%; height: 100dvh; overflow: hidden; }
        input, select, textarea { min-width: 0; font-family: inherit; }
        button { font-family: inherit; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
      `}</style>

      <div style={{
        width: "100vw", height: "100dvh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        background: "linear-gradient(135deg,#fff7ed 0%,#f8fafc 50%,#fff7ed 100%)",
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
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: "linear-gradient(135deg,#f97316,#ea580c)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><img src="/icon.svg" alt="Basketball" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 900, color: "#1e293b", lineHeight: 1.2 }}>Basketball Tracker</h1>
              <p style={{ fontSize: 11, color: "#94a3b8" }}>AI バスケ練習管理</p>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: 16, width: "100%", minHeight: 0 }}>
          {renderTab()}
          <div style={{ height: 12 }} />
        </main>

        {/* Bottom Nav — safe-area-inset-bottom handles iPhone home bar */}
        <nav style={{
          background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(226,232,240,0.6)",
          padding: "8px 4px",
          paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))",
          flexShrink: 0, boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                padding: "6px 8px", borderRadius: 12, border: "none", cursor: "pointer",
                background: activeTab === tab.id ? "linear-gradient(135deg,#f97316,#ea580c)" : "transparent",
                color: activeTab === tab.id ? "white" : "#94a3b8",
                transition: "all 0.2s ease",
                transform: activeTab === tab.id ? "translateY(-2px)" : "none",
                boxShadow: activeTab === tab.id ? "0 4px 12px rgba(249,115,22,0.35)" : "none",
                flex: 1, minWidth: 0,
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