import { useState, useEffect, useCallback } from "react";

// ── Config ────────────────────────────────────────────────────────────────────
const API = process.env.REACT_APP_API_URL || "";
const ROLES = ["Demote", "Support", "Moderator", "Admin"];
const ROLE_COLORS = { Demote: "#ff5555", Support: "#60a5fa", Moderator: "#a8b2c0", Admin: "#f5c542" };
const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD || "Jac098!";

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return res.json();
}

// ── Small components ──────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 4,
      fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
      background: `${ROLE_COLORS[role]}22`, color: ROLE_COLORS[role],
      border: `1px solid ${ROLE_COLORS[role]}55`,
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
            position: "absolute",
            width: size, height: size, borderRadius: "50%",
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

// ── Voting Form ───────────────────────────────────────────────────────────────
function VotingForm({ pollData, onRefresh }) {
  const [voterName, setVoterName] = useState("");
  const [picks, setPicks] = useState({});   // { username: "Role" }
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const pick = (username, role) => setPicks(p => ({ ...p, [username]: role }));

  const allPicked = pollData.staff.every(m => picks[m.username]);

  const handleSubmit = async () => {
    if (!voterName.trim()) { setError("Please enter your username."); return; }
    if (!allPicked) { setError("Please cast a vote for every staff member."); return; }
    setLoading(true); setError("");
    const res = await apiFetch("/api/vote", {
      method: "POST",
      body: { voterName: voterName.trim(), votes: picks },
    });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setSubmitted(true);
    onRefresh();
  };

  if (submitted) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>⚔️</div>
      <h2 style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontSize: 22, marginBottom: 8 }}>Vote Recorded</h2>
      <p style={{ color: "#888", fontSize: 14 }}>Your vote for Staff Results #{pollData.pollNumber} has been saved.</p>
    </div>
  );

  return (
    <div>
      {/* Voter name */}
      <div style={{ marginBottom: 22 }}>
        <label style={labelStyle}>Your Username</label>
        <input value={voterName} onChange={e => setVoterName(e.target.value)}
          placeholder="e.g. K o o k i e" style={inputStyle} />
      </div>

      <p style={{ color: "#666", fontSize: 13, marginBottom: 18 }}>
        Select one role per staff member. Please be aware of each user's current position.
      </p>

      {/* Staff rows */}
      {pollData.staff.map(m => (
        <div key={m.username} style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 15, color: "#e8d5a3" }}>
              {m.username}
            </span>
            <RoleBadge role={m.currentRole} />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {ROLES.map(role => {
              const selected = picks[m.username] === role;
              return (
                <button key={role} onClick={() => pick(m.username, role)} style={{
                  padding: "8px 18px", borderRadius: 8,
                  border: `2px solid ${selected ? ROLE_COLORS[role] : "rgba(255,255,255,0.1)"}`,
                  background: selected ? `${ROLE_COLORS[role]}22` : "rgba(255,255,255,0.03)",
                  color: selected ? ROLE_COLORS[role] : "#888",
                  fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 12,
                  cursor: "pointer", letterSpacing: 1,
                  transition: "all 0.15s",
                  boxShadow: selected ? `0 0 12px ${ROLE_COLORS[role]}44` : "none",
                }}>{role}</button>
              );
            })}
          </div>
        </div>
      ))}

      {error && <div style={errorStyle}>⚠ {error}</div>}

      <button onClick={handleSubmit} disabled={loading} style={submitBtnStyle}>
        {loading ? "Submitting…" : "Submit Vote"}
      </button>
    </div>
  );
}

// ── Tally helper ──────────────────────────────────────────────────────────────
function tally(staff, votes) {
  return staff.map(m => {
    const totals = {};
    let count = 0;
    for (const v of Object.values(votes)) {
      const role = v[m.username];
      if (!role) continue;
      count++;
      totals[role] = (totals[role] || 0) + 1;
    }
    const pcts = {};
    for (const [r, n] of Object.entries(totals)) pcts[r] = Math.round((n / count) * 100);
    return { ...m, pcts, count };
  });
}

// ── Results Panel ─────────────────────────────────────────────────────────────
function ResultsPanel({ pollData }) {
  const [copied, setCopied] = useState(false);
  const [changes, setChanges] = useState("");
  const tallied = tally(pollData.staff, pollData.votes);

  const byRole = {};
  for (const m of tallied) {
    if (!byRole[m.currentRole]) byRole[m.currentRole] = [];
    byRole[m.currentRole].push(m);
  }

  const buildDiscord = () => {
    const lines = [`@here :AU_downvote: **Staff Results #${pollData.pollNumber}** :AU_greencheckmark:`];
    for (const role of ROLES) {
      const members = byRole[role] || [];
      if (!members.length) continue;
      const icon = role === "Support" ? ":555ss:" : role === "Moderator" ? ":55Mod:" : ":5Admin:";
      lines.push(`\n${icon} **${role}s** -----------------------`);
      for (const m of members) {
        const parts = Object.entries(m.pcts)
          .filter(([, v]) => v > 0)
          .sort((a, b) => b[1] - a[1])
          .map(([r, v]) => `${v}% ${r}`)
          .join("  ");
        lines.push(`@${m.username}  ${parts || "No votes yet"}`);
      }
    }
    if (changes.trim()) {
      lines.push(`\n**Changes**\n:AU_upwardstrend: \n\`\`\`\n${changes.trim()}\n\`\`\``);
    }
    return lines.join("\n");
  };

  const copy = () => {
    navigator.clipboard.writeText(buildDiscord());
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ color: "#888", fontSize: 13 }}>
          {Object.keys(pollData.votes).length} vote(s) recorded
        </span>
      </div>

      {tallied.map(m => (
        <div key={m.username} style={{ ...cardStyle, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontWeight: 700 }}>@{m.username}</span>
            <RoleBadge role={m.currentRole} />
            <span style={{ marginLeft: "auto", color: "#555", fontSize: 11 }}>{m.count} vote(s)</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {Object.entries(m.pcts).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([role, pct]) => (
              <span key={role} style={{
                background: `${ROLE_COLORS[role]}22`, color: ROLE_COLORS[role],
                border: `1px solid ${ROLE_COLORS[role]}55`,
                borderRadius: 6, padding: "3px 12px", fontSize: 13, fontWeight: 700,
              }}>{pct}% {role}</span>
            ))}
            {!Object.keys(m.pcts).length && <span style={{ color: "#555", fontSize: 12 }}>No votes yet</span>}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 20, marginBottom: 16 }}>
        <label style={labelStyle}>Changes (one per line)</label>
        <textarea value={changes} onChange={e => setChanges(e.target.value)} rows={4}
          placeholder={"Username to Support\nUsername2 to Support"}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: 13 }} />
      </div>

      <button onClick={copy} style={{
        ...submitBtnStyle,
        background: copied
          ? "linear-gradient(135deg,#166534,#4ade80)"
          : "linear-gradient(135deg,#b8860b,#ffd700)",
        color: copied ? "#fff" : "#1a1200",
      }}>
        {copied ? "✓ Copied!" : "Generate & Copy Discord Message"}
      </button>

      <div style={{
        marginTop: 16, background: "rgba(0,0,0,0.45)", borderRadius: 10,
        padding: 14, fontFamily: "monospace", fontSize: 11, color: "#777",
        whiteSpace: "pre-wrap", lineHeight: 1.75, border: "1px solid rgba(255,255,255,0.06)",
      }}>{buildDiscord()}</div>
    </div>
  );
}

// ── Admin Settings Panel ──────────────────────────────────────────────────────
function SettingsPanel({ pollData, adminPassword, onRefresh }) {
  const [pollNumber, setPollNumber] = useState(pollData.pollNumber);
  const [staff, setStaff] = useState(pollData.staff.map(m => ({ ...m })));
  const [newUser, setNewUser] = useState("");
  const [newRole, setNewRole] = useState("Support");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const save = async () => {
    setSaving(true); setMsg("");
    const res = await apiFetch("/api/admin/settings", {
      method: "PUT",
      body: { adminPassword, pollNumber: Number(pollNumber), staff },
    });
    setSaving(false);
    if (res.error) { setMsg("❌ " + res.error); return; }
    setMsg("✓ Saved!");
    onRefresh();
    setTimeout(() => setMsg(""), 2000);
  };

  const addMember = () => {
    if (!newUser.trim()) return;
    setStaff(s => [...s, { username: newUser.trim(), currentRole: newRole }]);
    setNewUser("");
  };

  const removeMember = (idx) => setStaff(s => s.filter((_, i) => i !== idx));

  const updateMember = (idx, field, val) =>
    setStaff(s => s.map((m, i) => i === idx ? { ...m, [field]: val } : m));

  return (
    <div>
      {/* Poll number */}
      <div style={{ marginBottom: 22 }}>
        <label style={labelStyle}>Poll Number</label>
        <input type="number" value={pollNumber} onChange={e => setPollNumber(e.target.value)}
          style={{ ...inputStyle, width: 100 }} />
      </div>

      {/* Staff list */}
      <label style={labelStyle}>Staff Members</label>
      <div style={{ marginBottom: 16 }}>
        {staff.map((m, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <input value={m.username} onChange={e => updateMember(i, "username", e.target.value)}
              style={{ ...inputStyle, flex: 1 }} />
            <select value={m.currentRole} onChange={e => updateMember(i, "currentRole", e.target.value)}
              style={{ ...inputStyle, width: 130 }}>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
            <button onClick={() => removeMember(i)} style={{
              background: "#ff444422", border: "1px solid #ff4444",
              color: "#ff8888", borderRadius: 6, padding: "6px 12px",
              cursor: "pointer", fontSize: 13, flexShrink: 0,
            }}>✕</button>
          </div>
        ))}
      </div>

      {/* Add new */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input value={newUser} onChange={e => setNewUser(e.target.value)}
          placeholder="New username" style={{ ...inputStyle, flex: 1 }}
          onKeyDown={e => e.key === "Enter" && addMember()} />
        <select value={newRole} onChange={e => setNewRole(e.target.value)}
          style={{ ...inputStyle, width: 130 }}>
          {ROLES.map(r => <option key={r}>{r}</option>)}
        </select>
        <button onClick={addMember} style={{
          background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)",
          color: "#ffd700", borderRadius: 8, padding: "8px 16px",
          fontFamily: "'Cinzel',serif", fontWeight: 700, cursor: "pointer", fontSize: 13,
        }}>+ Add</button>
      </div>

      <button onClick={save} disabled={saving} style={submitBtnStyle}>
        {saving ? "Saving…" : "Save Settings"}
      </button>
      {msg && <div style={{ marginTop: 10, color: msg.startsWith("✓") ? "#4ade80" : "#f87171", fontSize: 13 }}>{msg}</div>}
    </div>
  );
}

// ── Admin Login Gate ──────────────────────────────────────────────────────────
function AdminPanel({ pollData, onRefresh }) {
  const [pw, setPw] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [subTab, setSubTab] = useState("results");
  const [resetting, setResetting] = useState(false);

  const unlock = () => {
    if (pw === ADMIN_PASSWORD) setUnlocked(true);
    else alert("Wrong password.");
  };

  const reset = async () => {
    if (!window.confirm("Reset all votes and advance to the next poll number?")) return;
    setResetting(true);
    await apiFetch("/api/admin/reset", { method: "DELETE", body: { adminPassword: pw } });
    setResetting(false);
    onRefresh();
  };

  if (!unlocked) return (
    <div style={{ textAlign: "center", padding: "28px 0" }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>🔒</div>
      <p style={{ color: "#888", marginBottom: 14, fontSize: 14 }}>Admin access required</p>
      <input type="password" value={pw} onChange={e => setPw(e.target.value)}
        onKeyDown={e => e.key === "Enter" && unlock()}
        placeholder="Password" style={{ ...inputStyle, width: "100%", textAlign: "center", marginBottom: 12 }} />
      <button onClick={unlock} style={submitBtnStyle}>Unlock</button>
      <p style={{ color: "#444", fontSize: 11, marginTop: 10 }}>Default: staffpoll</p>
    </div>
  );

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[["results", "📊 Results"], ["settings", "⚙️ Settings"]].map(([k, label]) => (
          <button key={k} onClick={() => setSubTab(k)} style={{
            flex: 1, padding: "9px", borderRadius: 8, border: "none",
            background: subTab === k ? "rgba(184,134,11,0.25)" : "rgba(255,255,255,0.04)",
            color: subTab === k ? "#ffd700" : "#777",
            fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 12,
            cursor: "pointer", borderBottom: subTab === k ? "2px solid #b8860b" : "2px solid transparent",
          }}>{label}</button>
        ))}
        <button onClick={reset} disabled={resetting} style={{
          padding: "9px 14px", borderRadius: 8, border: "1px solid #ff4444",
          background: "#ff444415", color: "#ff8888",
          fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 12,
          cursor: "pointer", flexShrink: 0,
        }}>{resetting ? "…" : "🔄 Reset"}</button>
      </div>

      {subTab === "results" && <ResultsPanel pollData={pollData} />}
      {subTab === "settings" && <SettingsPanel pollData={pollData} adminPassword={pw} onRefresh={onRefresh} />}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const labelStyle = {
  display: "block", color: "#aaa", fontSize: 11,
  marginBottom: 6, letterSpacing: 1.5, textTransform: "uppercase",
};
const inputStyle = {
  width: "100%", background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.13)", borderRadius: 8,
  color: "#e0e0e0", padding: "9px 13px", fontSize: 14,
};
const cardStyle = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10, padding: "14px 16px", marginBottom: 12,
};
const errorStyle = {
  background: "#ff444418", border: "1px solid #ff4444",
  borderRadius: 8, padding: "10px 14px",
  color: "#ff8888", fontSize: 13, marginBottom: 14,
};
const submitBtnStyle = {
  width: "100%", padding: "13px", borderRadius: 10, border: "none",
  background: "linear-gradient(135deg,#b8860b,#ffd700)",
  color: "#1a1200", fontFamily: "'Cinzel',serif",
  fontWeight: 700, fontSize: 15, cursor: "pointer", letterSpacing: 1,
  transition: "all 0.3s",
};

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [pollData, setPollData] = useState(null);
  const [tab, setTab] = useState("vote");

  const load = useCallback(async () => {
    const d = await apiFetch("/api/poll");
    setPollData(d);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!pollData) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0b08", color: "#888", fontFamily: "serif", fontSize: 16 }}>
      Loading…
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Crimson+Pro:wght@300;400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d0b08; }
        input, textarea, select, button { font-family: 'Crimson Pro', serif; outline: none; }
        select option { background: #1a1610; }
        @keyframes float {
          0%,100% { transform: translateY(0) translateX(0); opacity: .35; }
          33%      { transform: translateY(-28px) translateX(14px); opacity: .65; }
          66%      { transform: translateY(14px) translateX(-10px); opacity: .25; }
        }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,215,0,.25); border-radius: 3px; }
      `}</style>

      <Particles />

      <div style={{
        position: "relative", zIndex: 1, minHeight: "100vh",
        background: "radial-gradient(ellipse at 20% 10%, rgba(184,134,11,.07) 0%, transparent 60%), radial-gradient(ellipse at 80% 90%, rgba(59,130,246,.05) 0%, transparent 60%)",
        padding: "32px 16px 70px",
        fontFamily: "'Crimson Pro', serif", color: "#ccc",
      }}>
        <div style={{ maxWidth: 660, margin: "0 auto", animation: "fadeIn 0.55s ease" }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <div style={{ fontSize: 11, letterSpacing: 4, color: "#b8860b", textTransform: "uppercase", marginBottom: 8 }}>
              Reason Private Server
            </div>
            <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 27, fontWeight: 900, color: "#e8d5a3", letterSpacing: 2, lineHeight: 1.2 }}>
              Staff Results #{pollData.pollNumber}
            </h1>
            <div style={{ width: 60, height: 2, background: "linear-gradient(90deg,transparent,#b8860b,transparent)", margin: "12px auto 0" }} />
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 4, marginBottom: 22, border: "1px solid rgba(255,255,255,0.07)" }}>
            {[["vote", "⚔ Cast Vote"], ["admin", "👑 Admin"]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                flex: 1, padding: "10px", borderRadius: 7, border: "none",
                background: tab === key ? "rgba(184,134,11,.22)" : "transparent",
                color: tab === key ? "#ffd700" : "#777",
                fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 13,
                cursor: "pointer", borderBottom: tab === key ? "2px solid #b8860b" : "2px solid transparent",
                transition: "all .2s",
              }}>{label}</button>
            ))}
          </div>

          {/* Card */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,215,0,.1)",
            borderRadius: 16, padding: "24px 20px",
            boxShadow: "0 20px 60px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,215,0,.07)",
          }}>
            {tab === "vote"  && <VotingForm  pollData={pollData} onRefresh={load} />}
            {tab === "admin" && <AdminPanel  pollData={pollData} onRefresh={load} />}
          </div>
        </div>
      </div>
    </>
  );
}
