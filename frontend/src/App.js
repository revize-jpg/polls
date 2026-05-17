import { useState, useEffect, useCallback } from "react";

// ── Config ────────────────────────────────────────────────────────────────────
const API = process.env.REACT_APP_API_URL || "";
const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD || "Jac098!";
const RANK_COLORS = ["#f5c542", "#a8b2c0", "#cd7f32"];

function getRoleColor(role) {
  if (role === "Support") return "#60a5fa";
  if (role === "Moderator") return "#e879f9";
  if (role === "Admin") return "#f5c542";

  const colours = ["#c084fc", "#34d399", "#fb923c", "#38bdf8", "#a3e635"];
  let hash = 0;
  for (let i = 0; i < role.length; i++) hash = role.charCodeAt(i) + ((hash << 5) - hash);
  return colours[Math.abs(hash) % colours.length];
}

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return res.json();
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function Tooltip({ children, lines }) {
  const [show, setShow] = useState(false);
  if (!lines || lines.length === 0) return <span>{children}</span>;
  return (
    <span style={{ position: "relative", display: "inline-block", cursor: "help" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{ borderBottom: "1px dotted #555", color: "#888", fontSize: 11 }}>{children}</span>
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", right: 0,
          background: "#1a1610", border: "1px solid rgba(255,215,0,0.2)",
          borderRadius: 8, padding: "8px 12px", zIndex: 99,
          minWidth: 140, boxShadow: "0 8px 24px rgba(0,0,0,0.6)", whiteSpace: "nowrap",
        }}>
          {lines.map((l, i) => <div key={i} style={{ fontSize: 12, color: "#ccc", lineHeight: 1.7 }}>{l}</div>)}
          <div style={{
            position: "absolute", bottom: -5, right: 10, width: 8, height: 8,
            background: "#1a1610", border: "1px solid rgba(255,215,0,0.2)",
            borderTop: "none", borderLeft: "none", transform: "rotate(45deg)",
          }} />
        </div>
      )}
    </span>
  );
}

// ── Small components ──────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const color = getRoleColor(role);
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 4,
      fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
      background: `${color}22`, color, border: `1px solid ${color}55`,
    }}>{role}</span>
  );
}

function Particles() {
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {Array.from({ length: 20 }).map((_, i) => {
        const size = Math.random() * 3 + 1;
        const gold = Math.random() > 0.5;
        return (
          <div key={i} style={{
            position: "absolute", width: size, height: size, borderRadius: "50%",
            background: `rgba(${gold ? "255,180,50" : "100,180,255"},0.35)`,
            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
            animation: `float ${9 + Math.random() * 12}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 12}s`,
          }} />
        );
      })}
    </div>
  );
}

// ── Username input ────────────────────────────────────────────────────────────
function UsernameInput({ value, locked, onChange, onLock, onUnlock }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <label style={labelStyle}>Your Username</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={value} onChange={e => !locked && onChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !locked && value.trim()) onLock(); }}
          placeholder="e.g. K o o k i e" disabled={locked}
          style={{ ...inputStyle, flex: 1, opacity: locked ? 0.7 : 1,
            borderColor: locked ? "rgba(245,197,66,0.4)" : "rgba(255,255,255,0.13)" }} />
        <button onClick={locked ? onUnlock : onLock} disabled={!locked && !value.trim()}
          style={{
            padding: "9px 16px", borderRadius: 8, cursor: "pointer", flexShrink: 0,
            background: locked ? "rgba(245,197,66,0.2)" : "rgba(255,255,255,0.07)",
            color: locked ? "#f5c542" : "#888", fontWeight: 700, fontSize: 16,
            border: locked ? "1px solid rgba(245,197,66,0.4)" : "1px solid rgba(255,255,255,0.1)",
            transition: "all 0.2s",
          }} title={locked ? "Click to change username" : "Lock in username"}>
          {locked ? "✓" : "⏎"}
        </button>
      </div>
      {locked && (
        <div style={{ fontSize: 11, color: "#f5c542", marginTop: 5, opacity: 0.8 }}>
          Submitting as <strong>{value}</strong> — click ✓ to change
        </div>
      )}
    </div>
  );
}

// ── MVP Entry Block (Fixed) ───────────────────────────────────────────────────
function MvpEntryBlock({ label, entries, setter, maxSlots, hints }) {
  const updateEntry = (i, field, val) =>
    setter(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={sectionHeaderStyle}>{label}</div>
      {hints && hints.length > 0 && (
        <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(245,197,66,0.05)", border: "1px solid rgba(245,197,66,0.15)", fontSize: 12, color: "#666" }}>
          <span style={{ color: "#888", letterSpacing: 1 }}>CANDIDATES: </span>
          {hints.map((h, i) => (
            <span key={h}>
              <span style={{ color: "#f5c542", fontWeight: 700 }}>{h}</span>
              {i < hints.length - 1 && <span style={{ color: "#444" }}>, </span>}
            </span>
          ))}
        </div>
      )}
      <p style={{ color: "#666", fontSize: 13, marginBottom: 14 }}>
        Write in up to <strong style={{ color: "#ccc" }}>{maxSlots}</strong> name{maxSlots > 1 ? "s" : ""}. Feedback is required for each name entered.
      </p>
      {entries.map((entry, i) => (
        <div key={i} style={{ ...cardStyle, marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#888", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
            Pick {i + 1} {i === 0 ? <span style={{ color: "#555" }}>(required)</span> : <span style={{ color: "#555" }}>(optional)</span>}
          </div>
          <input
            value={entry.name}
            onChange={e => updateEntry(i, "name", e.target.value)}
            placeholder="Name…"
            style={{
              ...inputStyle, marginBottom: 10,
              borderColor: i === 0 && !entry.name.trim() ? "rgba(255,100,100,0.3)" : "rgba(255,255,255,0.13)",
            }}
          />
          {entry.name.trim() && (
            <textarea
              value={entry.feedback}
              onChange={e => updateEntry(i, "feedback", e.target.value)}
              rows={3}
              placeholder={`Why is ${entry.name.trim()} your MVP pick?`}
              style={{
                ...inputStyle, resize: "vertical", fontFamily: "'Crimson Pro', serif",
                fontSize: 13, lineHeight: 1.6,
                borderColor: !entry.feedback.trim() ? "rgba(255,100,100,0.3)" : "rgba(255,255,255,0.13)",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Voting Form ───────────────────────────────────────────────────────────────
const FEEDBACK_FIELDS = [ /* ... same as before ... */ ];
// (I kept it short here for space, but paste your original FEEDBACK_FIELDS)

function VotingForm({ pollData, onRefresh }) {
  // ... your original VotingForm code (unchanged) ...
  // Paste your full VotingForm here if needed
}

// ── Applicants Form ───────────────────────────────────────────────────────────
function ApplicantsForm({ pollData, onRefresh }) {
  // ... your original ApplicantsForm (unchanged) ...
}

// ── MVP Form ──────────────────────────────────────────────────────────────────
function MvpForm({ pollData, onRefresh }) {
  const [voterName, setVoterName] = useState("");
  const [locked, setLocked] = useState(false);
  const [staffEntries, setStaffEntries] = useState([{ name: "", feedback: "" }, { name: "", feedback: "" }, { name: "", feedback: "" }]);
  const [adminEntries, setAdminEntries] = useState([{ name: "", feedback: "" }, { name: "", feedback: "" }]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const mvp = pollData.mvp || {};
  const monthLabel = mvp.month ? `${mvp.month} ` : "";

  const handleSubmit = async () => {
    if (!voterName.trim()) { setError("Please enter your username."); return; }
    if (!locked) { setError("Please lock in your username first."); return; }

    const filledStaff = staffEntries.filter(e => e.name.trim() !== "");
    const filledAdmin = adminEntries.filter(e => e.name.trim() !== "");

    if (mvp.staffEnabled && filledStaff.length === 0) { setError("Please enter at least one Staff MVP name."); return; }
    if (mvp.adminEnabled && filledAdmin.length === 0) { setError("Please enter at least one Admin MVP name."); return; }

    const missingStaff = filledStaff.find(e => !e.feedback.trim());
    if (missingStaff) { setError(`Please fill in feedback for Staff MVP "${missingStaff.name}".`); return; }
    const missingAdmin = filledAdmin.find(e => !e.feedback.trim());
    if (missingAdmin) { setError(`Please fill in feedback for Admin MVP "${missingAdmin.name}".`); return; }

    setLoading(true); setError("");
    const res = await apiFetch("/api/mvp-vote", {
      method: "POST",
      body: {
        voterName: voterName.trim(),
        staffPicks: filledStaff.map(e => ({ name: e.name.trim(), feedback: e.feedback.trim() })),
        adminPicks: filledAdmin.map(e => ({ name: e.name.trim(), feedback: e.feedback.trim() })),
      },
    });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setSubmitted(true); onRefresh();
  };

  if (submitted) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>🏆</div>
      <h2 style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontSize: 22, marginBottom: 8 }}>MVP Feedback Recorded</h2>
      <p style={{ color: "#888", fontSize: 14 }}>Thanks for voting!</p>
    </div>
  );

  return (
    <div>
      {mvp.image && (
        <div style={{ marginBottom: 20 }}>
          <img src={mvp.image} alt="MVP banner" style={{ width: "100%", borderRadius: 10, border: "1px solid rgba(255,215,0,0.15)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)", maxHeight: 220, objectFit: "cover" }} />
        </div>
      )}

      <UsernameInput value={voterName} locked={locked} onChange={v => setVoterName(v)}
        onLock={() => voterName.trim() && setLocked(true)} onUnlock={() => setLocked(false)} />

      {mvp.staffEnabled && <MvpEntryBlock label={`⭐ ${monthLabel}Staff MVP`} entries={staffEntries} setter={setStaffEntries} maxSlots={3} hints={mvp.staffCandidates} />}
      {mvp.adminEnabled && <MvpEntryBlock label={`👑 ${monthLabel}Admin MVP`} entries={adminEntries} setter={setAdminEntries} maxSlots={2} hints={mvp.adminCandidates} />}

      {(mvp.staffEnabled || mvp.adminEnabled) && (
        <>
          {error && <div style={errorStyle}>⚠ {error}</div>}
          <button onClick={handleSubmit} disabled={loading} style={submitBtnStyle}>
            {loading ? "Submitting…" : `Submit ${monthLabel}MVP Feedback`}
          </button>
        </>
      )}
    </div>
  );
}

// ── Results Panels (Restored) ─────────────────────────────────────────────────
function ResultsPanel({ pollData }) {
  // Paste your original ResultsPanel code here
  const [copied, setCopied] = useState(false);
  const [changes, setChanges] = useState("");
  const [expanded, setExpanded] = useState({});

  // ... (your full original ResultsPanel code)
  // I can send it separately if you lost it
}

function ApplicantResultsPanel({ pollData }) {
  // your original code
}

function MvpResultsPanel({ pollData }) {
  // your original code
}

function VoteEditorPanel({ pollData, adminPassword, onRefresh }) {
  // your original code
}

function SettingsPanel({ pollData, adminPassword, onRefresh }) {
  // your original code
}

function AdminPanel({ pollData, onRefresh }) {
  const [pw, setPw] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [subTab, setSubTab] = useState("results");
  const [resetting, setResetting] = useState(false);

  const unlock = () => { if (pw === ADMIN_PASSWORD) setUnlocked(true); else alert("Wrong password."); };

  const reset = async () => {
    if (!window.confirm("Reset all votes and advance to the next poll number?")) return;
    setResetting(true);
    await apiFetch("/api/admin/reset", { method: "DELETE", body: { adminPassword: pw } });
    setResetting(false); onRefresh();
  };

  if (!unlocked) return (
    <div style={{ textAlign: "center", padding: "28px 0" }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>🔒</div>
      <p style={{ color: "#888", marginBottom: 14, fontSize: 14 }}>Admin access required</p>
      <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&unlock()}
        placeholder="Password" style={{ ...inputStyle, width:"100%", textAlign:"center", marginBottom:12 }} />
      <button onClick={unlock} style={submitBtnStyle}>Unlock</button>
    </div>
  );

  return (
    <div>
      {/* Your original subtab buttons and conditional rendering */}
      {subTab==="results" && <ResultsPanel pollData={pollData} />}
      {subTab==="applicants" && <ApplicantResultsPanel pollData={pollData} />}
      {subTab==="mvp" && <MvpResultsPanel pollData={pollData} />}
      {subTab==="edit" && <VoteEditorPanel pollData={pollData} adminPassword={pw} onRefresh={onRefresh} />}
      {subTab==="settings" && <SettingsPanel pollData={pollData} adminPassword={pw} onRefresh={onRefresh} />}
    </div>
  );
}

// ── Shared Styles ─────────────────────────────────────────────────────────────
const labelStyle = { display:"block", color:"#aaa", fontSize:11, marginBottom:6, letterSpacing:1.5, textTransform:"uppercase" };
const inputStyle = { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.13)", borderRadius:8, color:"#e0e0e0", padding:"9px 13px", fontSize:14, boxSizing:"border-box" };
const cardStyle = { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:"14px 16px", marginBottom:12 };
const errorStyle = { background:"#ff444418", border:"1px solid #ff4444", borderRadius:8, padding:"10px 14px", color:"#ff8888", fontSize:13, marginBottom:14 };
const submitBtnStyle = { width:"100%", padding:"13px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#b8860b,#ffd700)", color:"#1a1200", fontFamily:"'Cinzel',serif", fontWeight:700, fontSize:15, cursor:"pointer", letterSpacing:1, transition:"all 0.3s" };
const removeBtnStyle = { background:"#ff444422", border:"1px solid #ff4444", color:"#ff8888", borderRadius:6, padding:"6px 12px", cursor:"pointer", fontSize:13, flexShrink:0 };
const addBtnStyle = { background:"rgba(255,215,0,0.1)", border:"1px solid rgba(255,215,0,0.3)", color:"#ffd700", borderRadius:8, padding:"8px 16px", fontFamily:"'Cinzel',serif", fontWeight:700, cursor:"pointer", fontSize:13, flexShrink:0 };
const sectionHeaderStyle = { fontFamily:"'Cinzel',serif", color:"#e8d5a3", fontSize:14, fontWeight:700, letterSpacing:1, marginBottom:12, paddingBottom:8, borderBottom:"1px solid rgba(255,255,255,0.07)" };

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [pollData, setPollData] = useState(null);
  const [tab, setTab] = useState("vote");

  const load = useCallback(async () => { 
    const d = await apiFetch("/api/poll"); 
    setPollData(d); 
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!pollData) return <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0d0b08", color:"#888" }}>Loading…</div>;

  const mvp = pollData.mvp || {};
  const showMvpTab = mvp.staffEnabled || mvp.adminEnabled;
  const monthLabel = mvp.month ? `${mvp.month} ` : "";

  const tabs = [
    ["vote", "⚔ Cast Vote"],
    ["applicants", "📋 Applicants"],
    ...(showMvpTab ? [["mvp", `🏆 ${monthLabel}MVP Poll`]] : []),
    ["admin", "👑 Admin"],
  ];

  return (
    <>
      <style>{` /* your original styles */ `}</style>
      <Particles />
      <div style={{ position:"relative", zIndex:1, minHeight:"100vh", background:"radial-gradient...", padding:"32px 16px 70px", fontFamily:"'Crimson Pro',serif", color:"#ccc" }}>
        <div style={{ maxWidth:660, margin:"0 auto" }}>
          {/* Header and tab buttons */}
          <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,215,0,.1)", borderRadius:16, padding:"24px 20px" }}>
            {tab==="vote" && <VotingForm pollData={pollData} onRefresh={load} />}
            {tab==="applicants" && <ApplicantsForm pollData={pollData} onRefresh={load} />}
            {tab==="mvp" && <MvpForm pollData={pollData} onRefresh={load} />}
            {tab==="admin" && <AdminPanel pollData={pollData} onRefresh={load} />}
          </div>
        </div>
      </div>
    </>
  );
}
