import { useState, useEffect, useCallback } from "react";

// ── Config ────────────────────────────────────────────────────────────────────
const API = process.env.REACT_APP_API_URL || "";
const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD || "Jac098!";
const RANK_COLORS  = ["#f5c542", "#a8b2c0", "#cd7f32"];

function getRoleColor(role) {
  const colours = ["#c084fc", "#34d399", "#fb923c", "#f472b6", "#38bdf8", "#a3e635", "#e879f9"];
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

// ── Username input with lock ──────────────────────────────────────────────────
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

// ── Voting Form (Staff Feedback) ──────────────────────────────────────────────
function VotingForm({ pollData, onRefresh }) {
  const [voterName, setVoterName] = useState("");
  const [locked, setLocked]       = useState(false);
  // feedbacks: { [username]: string }
  const [feedbacks, setFeedbacks] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  const isSelfFn = u => voterName.trim().toLowerCase() === u.toLowerCase() && voterName.trim() !== "";

  const setFeedback = (username, val) => setFeedbacks(f => ({ ...f, [username]: val }));

  // All non-self members must have feedback filled in
  const allFilled = pollData.staff.every(m => isSelfFn(m.username) || (feedbacks[m.username] || "").trim() !== "");

  const handleSubmit = async () => {
    if (!voterName.trim()) { setError("Please enter your username."); return; }
    if (!locked)           { setError("Please lock in your username first (click ⏎)."); return; }
    if (!allFilled)        { setError("Please fill in feedback for every staff member."); return; }
    setLoading(true); setError("");
    const res = await apiFetch("/api/vote", {
      method: "POST",
      body: { voterName: voterName.trim(), feedbacks },
    });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setSubmitted(true); onRefresh();
  };

  if (submitted) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>⚔️</div>
      <h2 style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontSize: 22, marginBottom: 8 }}>Feedback Recorded</h2>
      <p style={{ color: "#888", fontSize: 14 }}>Your feedback for Staff Poll #{pollData.pollNumber} has been saved.</p>
    </div>
  );

  return (
    <div>
      <UsernameInput value={voterName} locked={locked}
        onChange={v => setVoterName(v)}
        onLock={() => voterName.trim() && setLocked(true)}
        onUnlock={() => setLocked(false)} />
      <p style={{ color: "#666", fontSize: 13, marginBottom: 18 }}>Leave feedback for each staff member below.</p>

      {pollData.staff.map(m => {
        const isSelf = isSelfFn(m.username);
        return (
          <div key={m.username} style={{ ...cardStyle, position: "relative" }}>
            {isSelf && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center",
                justifyContent: "center", borderRadius: 10, zIndex: 2,
                background: "rgba(0,0,0,0.6)", fontSize: 12, color: "#666", letterSpacing: 1,
              }}>You cannot leave feedback for yourself</div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, opacity: isSelf ? 0.3 : 1 }}>
              <span style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 15, color: "#e8d5a3" }}>{m.username}</span>
              <RoleBadge role={m.currentRole} />
            </div>
            <textarea
              disabled={isSelf}
              value={feedbacks[m.username] || ""}
              onChange={e => setFeedback(m.username, e.target.value)}
              rows={3}
              placeholder={`Feedback for ${m.username}…`}
              style={{
                ...inputStyle, resize: "vertical", fontFamily: "'Crimson Pro', serif",
                fontSize: 13, lineHeight: 1.6, opacity: isSelf ? 0.3 : 1,
                borderColor: !isSelf && !(feedbacks[m.username] || "").trim()
                  ? "rgba(255,100,100,0.3)" : "rgba(255,255,255,0.13)",
              }}
            />
          </div>
        );
      })}

      {error && <div style={errorStyle}>⚠ {error}</div>}
      <button onClick={handleSubmit} disabled={loading} style={submitBtnStyle}>
        {loading ? "Submitting…" : "Submit Feedback"}
      </button>
    </div>
  );
}

// ── Applicants Form ───────────────────────────────────────────────────────────
// Staff write in up to 3 names, each with a feedback box.
// Admin-set candidates (from settings) are shown as a reference / can be pre-filled.
function ApplicantsForm({ pollData, onRefresh }) {
  const [voterName, setVoterName] = useState("");
  const [locked, setLocked]       = useState(false);
  // entries: [{ name: string, feedback: string }]
  const [entries, setEntries]     = useState([
    { name: "", feedback: "" },
    { name: "", feedback: "" },
    { name: "", feedback: "" },
  ]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  const MAX = 3;
  // Admin-provided candidate names shown as hints
  const hints = (pollData.applicants || {}).candidates || [];

  const updateEntry = (i, field, val) =>
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));

  const handleSubmit = async () => {
    if (!voterName.trim()) { setError("Please enter your username."); return; }
    if (!locked)           { setError("Please lock in your username first."); return; }

    const filled = entries.filter(e => e.name.trim() !== "");
    if (filled.length === 0) { setError("Please enter at least one applicant name."); return; }

    const missingFeedback = filled.find(e => !e.feedback.trim());
    if (missingFeedback) { setError(`Please fill in feedback for "${missingFeedback.name}".`); return; }

    setLoading(true); setError("");
    const res = await apiFetch("/api/applicant-vote", {
      method: "POST",
      body: { voterName: voterName.trim(), picks: filled.map(e => ({ name: e.name.trim(), feedback: e.feedback.trim() })) },
    });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setSubmitted(true); onRefresh();
  };

  if (submitted) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>📋</div>
      <h2 style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontSize: 22, marginBottom: 8 }}>Applicant Feedback Recorded</h2>
      <p style={{ color: "#888", fontSize: 14 }}>Thanks for your input!</p>
    </div>
  );

  return (
    <div>
      <UsernameInput value={voterName} locked={locked}
        onChange={v => setVoterName(v)}
        onLock={() => voterName.trim() && setLocked(true)}
        onUnlock={() => { setLocked(false); }} />

      <div style={sectionHeaderStyle}>📋 Staff Applicants</div>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 6 }}>
        Write in up to <strong style={{ color: "#ccc" }}>3 applicant names</strong> and leave feedback for each.
      </p>

      {hints.length > 0 && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.15)", fontSize: 12, color: "#666" }}>
          <span style={{ color: "#888", letterSpacing: 1 }}>CURRENT APPLICANTS: </span>
          {hints.map((h, i) => (
            <span key={h}>
              <span style={{ color: "#60a5fa", fontWeight: 700 }}>{h}</span>
              {i < hints.length - 1 && <span style={{ color: "#444" }}>, </span>}
            </span>
          ))}
        </div>
      )}

      {entries.map((entry, i) => (
        <div key={i} style={{ ...cardStyle, marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#888", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
            Applicant {i + 1} {i === 0 && <span style={{ color: "#555" }}>(required)</span>}
            {i > 0 && <span style={{ color: "#555" }}>(optional)</span>}
          </div>
          <input
            value={entry.name}
            onChange={e => updateEntry(i, "name", e.target.value)}
            placeholder={`Applicant name${hints[i] ? ` (e.g. ${hints[i]})` : ""}`}
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
              placeholder={`Why are you supporting ${entry.name.trim()}?`}
              style={{
                ...inputStyle, resize: "vertical", fontFamily: "'Crimson Pro', serif",
                fontSize: 13, lineHeight: 1.6,
                borderColor: !entry.feedback.trim() ? "rgba(255,100,100,0.3)" : "rgba(255,255,255,0.13)",
              }}
            />
          )}
        </div>
      ))}

      {error && <div style={errorStyle}>⚠ {error}</div>}
      <button onClick={handleSubmit} disabled={loading} style={submitBtnStyle}>
        {loading ? "Submitting…" : "Submit Applicant Feedback"}
      </button>
    </div>
  );
}

// ── MVP Form ──────────────────────────────────────────────────────────────────
// Write in names with required feedback per name.
function MvpForm({ pollData, onRefresh }) {
  const [voterName, setVoterName] = useState("");
  const [locked, setLocked]       = useState(false);
  // staffEntries / adminEntries: [{ name, feedback }]
  const [staffEntries, setStaffEntries] = useState([
    { name: "", feedback: "" },
    { name: "", feedback: "" },
    { name: "", feedback: "" },
  ]);
  const [adminEntries, setAdminEntries] = useState([
    { name: "", feedback: "" },
    { name: "", feedback: "" },
  ]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  const mvp = pollData.mvp || {};
  const monthLabel = mvp.month ? `${mvp.month} ` : "";

  const updateEntry = (setter, i, field, val) =>
    setter(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));

  const handleSubmit = async () => {
    if (!voterName.trim()) { setError("Please enter your username."); return; }
    if (!locked)           { setError("Please lock in your username first."); return; }

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

  const EntryBlock = ({ label, entries, setter, maxSlots, hints }) => (
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
            onChange={e => updateEntry(setter, i, "name", e.target.value)}
            placeholder="Name…"
            style={{
              ...inputStyle, marginBottom: 10,
              borderColor: i === 0 && !entry.name.trim() ? "rgba(255,100,100,0.3)" : "rgba(255,255,255,0.13)",
            }}
          />
          {entry.name.trim() && (
            <textarea
              value={entry.feedback}
              onChange={e => updateEntry(setter, i, "feedback", e.target.value)}
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

  return (
    <div>
      {mvp.image && (
        <div style={{ marginBottom: 20 }}>
          <img src={mvp.image} alt="MVP banner" style={{
            width: "100%", borderRadius: 10, display: "block",
            border: "1px solid rgba(255,215,0,0.15)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            maxHeight: 220, objectFit: "cover",
          }} />
        </div>
      )}

      <UsernameInput value={voterName} locked={locked}
        onChange={v => setVoterName(v)}
        onLock={() => voterName.trim() && setLocked(true)}
        onUnlock={() => { setLocked(false); }} />

      {mvp.staffEnabled && (
        <EntryBlock
          label={`⭐ ${monthLabel}Staff MVP`}
          entries={staffEntries}
          setter={setStaffEntries}
          maxSlots={3}
          hints={mvp.staffCandidates}
        />
      )}
      {mvp.adminEnabled && (
        <EntryBlock
          label={`👑 ${monthLabel}Admin MVP`}
          entries={adminEntries}
          setter={setAdminEntries}
          maxSlots={2}
          hints={mvp.adminCandidates}
        />
      )}
      {!mvp.staffEnabled && !mvp.adminEnabled && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#555", fontSize: 14 }}>MVP voting is not currently active.</div>
      )}
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

// ── Results Panel ─────────────────────────────────────────────────────────────
function ResultsPanel({ pollData }) {
  const [copied, setCopied]         = useState(false);
  const [changes, setChanges]       = useState("");
  const [expanded, setExpanded]     = useState({});

  const allVoters = Object.keys(pollData.votes);

  const toggleExpand = key => setExpanded(e => ({ ...e, [key]: !e[key] }));

  const buildDiscord = () => {
    const lines = [`@here :AU_downvote: **Staff Feedback Results #${pollData.pollNumber}** :AU_greencheckmark:`];
    for (const m of pollData.staff) {
      lines.push(`\n**${m.username}** (${m.currentRole})`);
      let hasFeedback = false;
      for (const [voter, v] of Object.entries(pollData.votes)) {
        const fb = (v.feedbacks || {})[m.username];
        if (fb && fb.trim()) {
          lines.push(`• ${voter}: ${fb.trim()}`);
          hasFeedback = true;
        }
      }
      if (!hasFeedback) lines.push("• No feedback yet");
    }
    if (changes.trim()) lines.push(`\n**Changes**\n:AU_upwardstrend: \n\`\`\`\n${changes.trim()}\n\`\`\``);
    return lines.join("\n");
  };

  const copy = () => { navigator.clipboard.writeText(buildDiscord()); setCopied(true); setTimeout(() => setCopied(false), 2200); };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Tooltip lines={allVoters.length ? allVoters.map(v => `• ${v}`) : ["No submissions yet"]}>
          {allVoters.length} submission(s) recorded
        </Tooltip>
      </div>

      {pollData.staff.map(m => {
        const feedbackEntries = Object.entries(pollData.votes)
          .map(([voter, v]) => ({ voter, feedback: (v.feedbacks || {})[m.username] }))
          .filter(e => e.feedback && e.feedback.trim());

        return (
          <div key={m.username} style={{ ...cardStyle, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontWeight: 700 }}>@{m.username}</span>
              <RoleBadge role={m.currentRole} />
              <span style={{ marginLeft: "auto", fontSize: 12, color: "#666" }}>{feedbackEntries.length} feedback</span>
            </div>
            {feedbackEntries.length > 0 && (
              <>
                <button onClick={() => toggleExpand(m.username)} style={{
                  width: "100%", padding: "7px 12px", borderRadius: 7, cursor: "pointer",
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#888", fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 11,
                  letterSpacing: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span>💬 View Feedback</span>
                  <span>{expanded[m.username] ? "▲" : "▼"}</span>
                </button>
                {expanded[m.username] && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    {feedbackEntries.map(({ voter, feedback }) => (
                      <div key={voter} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "10px 14px" }}>
                        <div style={{ fontSize: 11, color: "#f5c542", fontFamily: "'Cinzel',serif", marginBottom: 5 }}>{voter}</div>
                        <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{feedback}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {feedbackEntries.length === 0 && <span style={{ color: "#555", fontSize: 12 }}>No feedback yet</span>}
          </div>
        );
      })}

      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <label style={labelStyle}>Changes (one per line)</label>
        <textarea value={changes} onChange={e => setChanges(e.target.value)} rows={4}
          placeholder={"C4rdZ to Support\nBaekhyeon to Support"}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: 13 }} />
      </div>
      <button onClick={copy} style={{ ...submitBtnStyle,
        background: copied ? "linear-gradient(135deg,#166534,#4ade80)" : "linear-gradient(135deg,#b8860b,#ffd700)",
        color: copied ? "#fff" : "#1a1200" }}>
        {copied ? "✓ Copied!" : "Generate & Copy Discord Message"}
      </button>
      <div style={{ marginTop: 16, background: "rgba(0,0,0,0.45)", borderRadius: 10, padding: 14, fontFamily: "monospace", fontSize: 11, color: "#777", whiteSpace: "pre-wrap", lineHeight: 1.75, border: "1px solid rgba(255,255,255,0.06)" }}>
        {buildDiscord()}
      </div>
    </div>
  );
}

// ── Applicant Results Panel ───────────────────────────────────────────────────
function ApplicantResultsPanel({ pollData }) {
  const appVotes = pollData.applicantVotes || {};
  const [expanded, setExpanded] = useState({});

  // Aggregate: name -> [{ voter, feedback }]
  const nameMap = {};
  for (const [voter, v] of Object.entries(appVotes)) {
    for (const pick of (v.picks || [])) {
      const name = pick.name || pick; // support legacy plain-string picks
      if (!nameMap[name]) nameMap[name] = [];
      nameMap[name].push({ voter, feedback: pick.feedback || "" });
    }
  }
  const results = Object.entries(nameMap)
    .map(([name, entries]) => ({ name, count: entries.length, entries }))
    .sort((a, b) => b.count - a.count);

  if (results.length === 0) return (
    <div style={{ textAlign: "center", padding: "30px 0", color: "#555", fontSize: 14 }}>No applicant submissions yet.</div>
  );

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Tooltip lines={Object.keys(appVotes).map(v => `• ${v}`)}>
          {Object.keys(appVotes).length} submission(s) recorded
        </Tooltip>
      </div>
      {results.map((r, i) => (
        <div key={r.name} style={{ ...cardStyle, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color: i === 0 ? "#60a5fa" : "#555", width: 24, flexShrink: 0 }}>{i === 0 ? "★" : `${i + 1}`}</span>
            <span style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontWeight: 700, flex: 1 }}>{r.name}</span>
            <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: 13 }}>{r.count} vote{r.count !== 1 ? "s" : ""}</span>
          </div>
          {r.entries.length > 0 && (
            <>
              <button onClick={() => setExpanded(e => ({ ...e, [r.name]: !e[r.name] }))} style={{
                width: "100%", padding: "7px 12px", borderRadius: 7, cursor: "pointer",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#888", fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 11,
                letterSpacing: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span>💬 View Feedback</span>
                <span>{expanded[r.name] ? "▲" : "▼"}</span>
              </button>
              {expanded[r.name] && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {r.entries.map(({ voter, feedback }) => (
                    <div key={voter} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ fontSize: 11, color: "#60a5fa", fontFamily: "'Cinzel',serif", marginBottom: 5 }}>{voter}</div>
                      {feedback && <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{feedback}</div>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ── MVP Results Panel ─────────────────────────────────────────────────────────
function MvpResultsPanel({ pollData }) {
  const mvp = pollData.mvp || {}, mvpVotes = pollData.mvpVotes || {};
  const monthLabel = mvp.month ? `${mvp.month} ` : "";
  const [expanded, setExpanded] = useState({});

  // Aggregate picks: { name -> [{ voter, feedback }] }
  const aggregatePicks = (key) => {
    const map = {};
    for (const [voter, v] of Object.entries(mvpVotes)) {
      for (const pick of (v[key] || [])) {
        const name = pick.name || pick;
        if (!map[name]) map[name] = [];
        map[name].push({ voter, feedback: pick.feedback || "" });
      }
    }
    return Object.entries(map)
      .map(([name, entries]) => ({ name, count: entries.length, entries }))
      .sort((a, b) => b.count - a.count);
  };

  const staffResults = aggregatePicks("staffPicks");
  const adminResults = aggregatePicks("adminPicks");

  const ResultList = ({ results, colorKey }) => results.map((r, i) => (
    <div key={r.name} style={{ ...cardStyle, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <span style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color: RANK_COLORS[i] || "#555", width: 24, flexShrink: 0 }}>{i === 0 ? "★" : `${i + 1}`}</span>
        <span style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontWeight: 700, flex: 1 }}>{r.name}</span>
        <span style={{ color: "#f5c542", fontWeight: 700, fontSize: 13 }}>{r.count} vote{r.count !== 1 ? "s" : ""}</span>
      </div>
      {r.entries.length > 0 && (
        <>
          <button onClick={() => setExpanded(e => ({ ...e, [`${colorKey}-${r.name}`]: !e[`${colorKey}-${r.name}`] }))} style={{
            width: "100%", padding: "7px 12px", borderRadius: 7, cursor: "pointer",
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
            color: "#888", fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 11,
            letterSpacing: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>💬 View Feedback</span>
            <span>{expanded[`${colorKey}-${r.name}`] ? "▲" : "▼"}</span>
          </button>
          {expanded[`${colorKey}-${r.name}`] && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {r.entries.map(({ voter, feedback }) => (
                <div key={voter} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, color: "#f5c542", fontFamily: "'Cinzel',serif", marginBottom: 5 }}>{voter}</div>
                  {feedback && <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{feedback}</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  ));

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Tooltip lines={Object.keys(mvpVotes).map(v => `• ${v}`)}>
          {Object.keys(mvpVotes).length} MVP submission(s) recorded
        </Tooltip>
      </div>
      {mvp.staffEnabled && (
        <div style={{ marginBottom: 24 }}>
          <div style={sectionHeaderStyle}>⭐ {monthLabel}Staff MVP</div>
          {staffResults.length === 0
            ? <div style={{ color: "#555", fontSize: 13 }}>No picks yet.</div>
            : <ResultList results={staffResults} colorKey="staff" />}
        </div>
      )}
      {mvp.adminEnabled && (
        <div style={{ marginBottom: 24 }}>
          <div style={sectionHeaderStyle}>👑 {monthLabel}Admin MVP</div>
          {adminResults.length === 0
            ? <div style={{ color: "#555", fontSize: 13 }}>No picks yet.</div>
            : <ResultList results={adminResults} colorKey="admin" />}
        </div>
      )}
      {!mvp.staffEnabled && !mvp.adminEnabled && (
        <div style={{ textAlign: "center", padding: "30px 0", color: "#555", fontSize: 14 }}>MVP voting is not enabled.</div>
      )}
    </div>
  );
}

// ── Vote Editor Panel ─────────────────────────────────────────────────────────
function VoteEditorPanel({ pollData, adminPassword, onRefresh }) {
  const [voteType, setVoteType]     = useState("staff");
  const [editingKey, setEditingKey] = useState(null);
  const [editData, setEditData]     = useState(null);
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState("");

  const votes = voteType === "staff"     ? pollData.votes
              : voteType === "mvp"       ? (pollData.mvpVotes || {})
              :                            (pollData.applicantVotes || {});

  const voterKeys = Object.keys(votes);

  const startEdit = key => { setEditingKey(key); setEditData(JSON.parse(JSON.stringify(votes[key]))); setMsg(""); };
  const cancelEdit = () => { setEditingKey(null); setEditData(null); };

  const saveEdit = async () => {
    setSaving(true); setMsg("");
    const res = await apiFetch("/api/admin/vote", {
      method: "PUT",
      body: { adminPassword, voteType, voterKey: editingKey, voteData: editData },
    });
    setSaving(false);
    if (res.error) { setMsg("❌ " + res.error); return; }
    setMsg("✓ Saved!"); setEditingKey(null); setEditData(null);
    onRefresh(); setTimeout(() => setMsg(""), 2000);
  };

  const deleteVote = async key => {
    if (!window.confirm(`Delete ${key}'s submission?`)) return;
    setSaving(true);
    await apiFetch("/api/admin/vote", { method: "DELETE", body: { adminPassword, voteType, voterKey: key } });
    setSaving(false); onRefresh();
  };

  const renderEditor = () => {
    if (!editData) return null;

    if (voteType === "staff") {
      return (
        <div>
          <div style={{ marginBottom: 12, fontSize: 12, color: "#888" }}>
            Editing feedback by <strong style={{ color: "#f5c542" }}>{editingKey}</strong>
          </div>
          {pollData.staff.map(m => (
            <div key={m.username} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontSize: 13, minWidth: 120 }}>{m.username}</span>
                <RoleBadge role={m.currentRole} />
              </div>
              <textarea
                value={(editData.feedbacks || {})[m.username] || ""}
                onChange={e => setEditData(d => ({ ...d, feedbacks: { ...(d.feedbacks || {}), [m.username]: e.target.value } }))}
                rows={2}
                style={{ ...inputStyle, resize: "vertical", fontSize: 12, fontFamily: "'Crimson Pro',serif" }}
              />
            </div>
          ))}
        </div>
      );
    }

    if (voteType === "applicant") {
      const picks = editData.picks || [];
      return (
        <div>
          <div style={{ marginBottom: 12, fontSize: 12, color: "#888" }}>
            Editing applicant submission by <strong style={{ color: "#f5c542" }}>{editingKey}</strong>
          </div>
          {picks.map((pick, i) => (
            <div key={i} style={{ ...cardStyle, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>Pick {i + 1}</div>
              <input
                value={pick.name || ""}
                onChange={e => setEditData(d => { const p = [...d.picks]; p[i] = { ...p[i], name: e.target.value }; return { ...d, picks: p }; })}
                placeholder="Name"
                style={{ ...inputStyle, marginBottom: 8, fontSize: 12 }}
              />
              <textarea
                value={pick.feedback || ""}
                onChange={e => setEditData(d => { const p = [...d.picks]; p[i] = { ...p[i], feedback: e.target.value }; return { ...d, picks: p }; })}
                rows={2}
                placeholder="Feedback"
                style={{ ...inputStyle, resize: "vertical", fontSize: 12, fontFamily: "'Crimson Pro',serif" }}
              />
              <button onClick={() => setEditData(d => ({ ...d, picks: d.picks.filter((_, idx) => idx !== i) }))}
                style={{ ...removeBtnStyle, marginTop: 6, fontSize: 11 }}>✕ Remove</button>
            </div>
          ))}
          {picks.length < 3 && (
            <button onClick={() => setEditData(d => ({ ...d, picks: [...(d.picks || []), { name: "", feedback: "" }] }))}
              style={{ ...addBtnStyle, fontSize: 12, padding: "7px 14px" }}>+ Add Pick</button>
          )}
        </div>
      );
    }

    if (voteType === "mvp") {
      const renderPickList = (key, label) => {
        const picks = editData[key] || [];
        return (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{label}</label>
            {picks.map((pick, i) => (
              <div key={i} style={{ ...cardStyle, marginBottom: 8 }}>
                <input
                  value={pick.name || ""}
                  onChange={e => setEditData(d => { const p = [...(d[key] || [])]; p[i] = { ...p[i], name: e.target.value }; return { ...d, [key]: p }; })}
                  placeholder="Name"
                  style={{ ...inputStyle, marginBottom: 8, fontSize: 12 }}
                />
                <textarea
                  value={pick.feedback || ""}
                  onChange={e => setEditData(d => { const p = [...(d[key] || [])]; p[i] = { ...p[i], feedback: e.target.value }; return { ...d, [key]: p }; })}
                  rows={2}
                  placeholder="Feedback"
                  style={{ ...inputStyle, resize: "vertical", fontSize: 12, fontFamily: "'Crimson Pro',serif" }}
                />
                <button onClick={() => setEditData(d => ({ ...d, [key]: (d[key] || []).filter((_, idx) => idx !== i) }))}
                  style={{ ...removeBtnStyle, marginTop: 6, fontSize: 11 }}>✕ Remove</button>
              </div>
            ))}
            <button onClick={() => setEditData(d => ({ ...d, [key]: [...(d[key] || []), { name: "", feedback: "" }] }))}
              style={{ ...addBtnStyle, fontSize: 12, padding: "7px 14px" }}>+ Add</button>
          </div>
        );
      };
      return (
        <div>
          <div style={{ marginBottom: 12, fontSize: 12, color: "#888" }}>
            Editing MVP submission by <strong style={{ color: "#f5c542" }}>{editingKey}</strong>
          </div>
          {renderPickList("staffPicks", "Staff Picks")}
          {renderPickList("adminPicks", "Admin Picks")}
        </div>
      );
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[["staff","⚔ Staff"],["mvp","🏆 MVP"],["applicant","📋 Applicants"]].map(([k,label]) => (
          <button key={k} onClick={() => { setVoteType(k); cancelEdit(); }} style={{
            flex: 1, padding: "8px", borderRadius: 7, border: "none", cursor: "pointer",
            background: voteType===k ? "rgba(184,134,11,0.22)" : "rgba(255,255,255,0.04)",
            color: voteType===k ? "#ffd700" : "#666",
            fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 11,
            borderBottom: voteType===k ? "2px solid #b8860b" : "2px solid transparent",
          }}>{label}</button>
        ))}
      </div>

      {msg && <div style={{ marginBottom: 12, color: msg.startsWith("✓") ? "#4ade80" : "#f87171", fontSize: 13 }}>{msg}</div>}

      {voterKeys.length === 0 && (
        <div style={{ textAlign: "center", padding: "30px 0", color: "#555", fontSize: 14 }}>No submissions recorded yet.</div>
      )}

      {!editingKey && voterKeys.map(key => (
        <div key={key} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontSize: 13, flex: 1 }}>{key}</span>
          {voteType === "staff" && (
            <span style={{ fontSize: 11, color: "#666", flex: 2 }}>
              {Object.keys(votes[key]?.feedbacks || {}).length} feedback entries
            </span>
          )}
          {voteType === "mvp" && (
            <span style={{ fontSize: 11, color: "#666", flex: 2 }}>
              S: {(votes[key]?.staffPicks||[]).map(p=>p.name||p).join(", ")||"—"} | A: {(votes[key]?.adminPicks||[]).map(p=>p.name||p).join(", ")||"—"}
            </span>
          )}
          {voteType === "applicant" && (
            <span style={{ fontSize: 11, color: "#666", flex: 2 }}>
              {(votes[key]?.picks||[]).map(p=>p.name||p).join(", ")||"—"}
            </span>
          )}
          <button onClick={() => startEdit(key)} style={{
            padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12,
            background: "rgba(245,197,66,0.1)", border: "1px solid rgba(245,197,66,0.3)", color: "#f5c542",
          }}>✏ Edit</button>
          <button onClick={() => deleteVote(key)} disabled={saving} style={{
            padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12,
            background: "#ff444418", border: "1px solid #ff4444", color: "#ff8888",
          }}>✕</button>
        </div>
      ))}

      {editingKey && (
        <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,215,0,0.15)", borderRadius: 12, padding: "18px 16px", marginBottom: 12 }}>
          {renderEditor()}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={saveEdit} disabled={saving} style={{ ...submitBtnStyle, flex: 1 }}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button onClick={cancelEdit} style={{
              flex: 1, padding: "13px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)", color: "#888", cursor: "pointer",
              fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 13,
            }}>Cancel</button>
          </div>
          {msg && <div style={{ marginTop: 8, color: msg.startsWith("✓") ? "#4ade80" : "#f87171", fontSize: 13 }}>{msg}</div>}
        </div>
      )}
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function ToggleSwitch({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12, cursor: "pointer", position: "relative",
      background: value ? "rgba(245,197,66,0.4)" : "rgba(255,255,255,0.1)",
      border: value ? "1px solid rgba(245,197,66,0.6)" : "1px solid rgba(255,255,255,0.15)",
      transition: "all 0.2s", flexShrink: 0,
    }}>
      <div style={{ position: "absolute", top: 3, left: value ? 22 : 3, width: 16, height: 16, borderRadius: "50%", background: value ? "#f5c542" : "#666", transition: "all 0.2s" }} />
    </div>
  );
}

// ── Admin Settings Panel ──────────────────────────────────────────────────────
function SettingsPanel({ pollData, adminPassword, onRefresh }) {
  const [pollNumber, setPollNumber]           = useState(pollData.pollNumber);
  const [staff, setStaff]                     = useState(pollData.staff.map(m => ({ ...m })));
  const [newUser, setNewUser]                 = useState("");
  const [newRole, setNewRole]                 = useState("Support");
  const mvp0 = pollData.mvp || {}, app0 = pollData.applicants || {};
  const [mvpMonth, setMvpMonth]               = useState(mvp0.month || "");
  const [mvpImage, setMvpImage]               = useState(mvp0.image || "");
  const [staffEnabled, setStaffEnabled]       = useState(!!mvp0.staffEnabled);
  const [adminEnabled, setAdminEnabled]       = useState(!!mvp0.adminEnabled);
  const [staffCandidates, setStaffCandidates] = useState(mvp0.staffCandidates || []);
  const [adminCandidates, setAdminCandidates] = useState(mvp0.adminCandidates || []);
  const [newStaffName, setNewStaffName]       = useState("");
  const [newAdminName, setNewAdminName]       = useState("");
  const [appCandidates, setAppCandidates]     = useState(app0.candidates || []);
  const [newAppName, setNewAppName]           = useState("");
  const [saving, setSaving]                   = useState(false);
  const [msg, setMsg]                         = useState("");

  const ROLES = ["Support", "Moderator", "Admin"];
  const monthPreview = mvpMonth.trim() ? `${mvpMonth.trim()} ` : "";

  const save = async () => {
    setSaving(true); setMsg("");
    const res = await apiFetch("/api/admin/settings", {
      method: "PUT",
      body: { adminPassword, pollNumber: Number(pollNumber), staff,
        mvp: { month: mvpMonth.trim(), image: mvpImage, staffEnabled, adminEnabled, staffCandidates, adminCandidates },
        applicants: { candidates: appCandidates } },
    });
    setSaving(false);
    if (res.error) { setMsg("❌ " + res.error); return; }
    setMsg("✓ Saved!"); onRefresh(); setTimeout(() => setMsg(""), 2000);
  };

  const addMember = () => {
    if (!newUser.trim()) return;
    setStaff(s => [...s, { username: newUser.trim(), currentRole: newRole }]);
    setNewUser("");
  };
  const removeMember = i => setStaff(s => s.filter((_,idx)=>idx!==i));
  const updateMember = (i,f,v) => setStaff(s => s.map((m,idx)=>idx===i?{...m,[f]:v}:m));

  const addStaffCand    = () => { if(!newStaffName.trim())return; setStaffCandidates(c=>[...c,newStaffName.trim()]); setNewStaffName(""); };
  const removeStaffCand = i  => setStaffCandidates(c=>c.filter((_,idx)=>idx!==i));
  const addAdminCand    = () => { if(!newAdminName.trim())return; setAdminCandidates(c=>[...c,newAdminName.trim()]); setNewAdminName(""); };
  const removeAdminCand = i  => setAdminCandidates(c=>c.filter((_,idx)=>idx!==i));
  const addAppCand      = () => { if(!newAppName.trim())return; setAppCandidates(c=>[...c,newAppName.trim()]); setNewAppName(""); };
  const removeAppCand   = i  => setAppCandidates(c=>c.filter((_,idx)=>idx!==i));

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <label style={labelStyle}>Poll Number</label>
        <input type="number" value={pollNumber} onChange={e=>setPollNumber(e.target.value)} style={{ ...inputStyle, width: 100 }} />
      </div>

      {/* Staff Members */}
      <label style={labelStyle}>Staff Members (Username Boxes)</label>
      <p style={{ color: "#555", fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>
        These are the usernames that appear as feedback boxes on the Cast Vote tab.
      </p>
      <div style={{ marginBottom: 8 }}>
        {staff.map((m,i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <input value={m.username} onChange={e=>updateMember(i,"username",e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            <select value={m.currentRole} onChange={e=>updateMember(i,"currentRole",e.target.value)} style={{ ...inputStyle, width: 130 }}>
              {ROLES.map(r=><option key={r}>{r}</option>)}
            </select>
            <button onClick={()=>removeMember(i)} style={removeBtnStyle}>✕</button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        <input value={newUser} onChange={e=>setNewUser(e.target.value)} placeholder="New username"
          style={{ ...inputStyle, flex: 1 }} onKeyDown={e=>e.key==="Enter"&&addMember()} />
        <select value={newRole} onChange={e=>setNewRole(e.target.value)} style={{ ...inputStyle, width: 130 }}>
          {ROLES.map(r=><option key={r}>{r}</option>)}
        </select>
        <button onClick={addMember} style={addBtnStyle}>+ Add</button>
      </div>

      {/* Applicants */}
      <div style={{ borderTop: "1px solid rgba(255,215,0,0.12)", paddingTop: 24, marginBottom: 8 }}>
        <div style={{ fontFamily:"'Cinzel',serif", color:"#e8d5a3", fontSize:15, fontWeight:700, marginBottom:6, letterSpacing:1 }}>📋 Staff Applicants</div>
        <p style={{ color: "#555", fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>
          These names appear as hints on the Applicants tab. Staff can still write in any name.
        </p>
        <div style={{ marginBottom: 10 }}>
          {appCandidates.map((name,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <span style={{ flex:1, color:"#ccc", fontSize:14, paddingLeft:4 }}>{name}</span>
              <button onClick={()=>removeAppCand(i)} style={removeBtnStyle}>✕</button>
            </div>
          ))}
          {appCandidates.length===0&&<div style={{ color:"#555", fontSize:13, paddingLeft:4, marginBottom:8 }}>No applicants listed yet.</div>}
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:32 }}>
          <input value={newAppName} onChange={e=>setNewAppName(e.target.value)} placeholder="Add applicant name"
            style={{ ...inputStyle, flex:1 }} onKeyDown={e=>e.key==="Enter"&&addAppCand()} />
          <button onClick={addAppCand} style={addBtnStyle}>+ Add</button>
        </div>
      </div>

      {/* MVP */}
      <div style={{ borderTop: "1px solid rgba(255,215,0,0.12)", paddingTop: 24, marginBottom: 8 }}>
        <div style={{ fontFamily:"'Cinzel',serif", color:"#e8d5a3", fontSize:15, fontWeight:700, marginBottom:18, letterSpacing:1 }}>🏆 MVP Poll Settings</div>
        <div style={{ marginBottom: 22 }}>
          <label style={labelStyle}>Month</label>
          <input value={mvpMonth} onChange={e=>setMvpMonth(e.target.value)} placeholder="e.g. March" style={{ ...inputStyle, width:"100%" }} />
          {mvpMonth.trim()&&<div style={{ marginTop:8, fontSize:12, color:"#888" }}>Preview: <span style={{color:"#f5c542"}}>{monthPreview}MVP Poll</span></div>}
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Banner Image</label>
          {mvpImage ? (
            <div style={{ marginBottom: 10 }}>
              <img src={mvpImage} alt="MVP banner preview" style={{ width:"100%", maxHeight:180, objectFit:"cover", borderRadius:8, border:"1px solid rgba(255,215,0,0.15)", display:"block" }} />
              <button onClick={() => setMvpImage("")} style={{ marginTop:8, padding:"6px 16px", borderRadius:6, cursor:"pointer", fontSize:12, background:"#ff444418", border:"1px solid #ff4444", color:"#ff8888" }}>✕ Remove Image</button>
            </div>
          ) : (
            <div style={{ marginBottom: 10, padding:"18px", borderRadius:8, border:"2px dashed rgba(255,255,255,0.1)", textAlign:"center", color:"#555", fontSize:13 }}>No image set</div>
          )}
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"9px 14px", borderRadius:8, background:"rgba(255,215,0,0.08)", border:"1px solid rgba(255,215,0,0.25)", color:"#ffd700", fontFamily:"'Cinzel',serif", fontWeight:700, fontSize:12, letterSpacing:0.5, width:"fit-content" }}>
            📁 {mvpImage ? "Change Image" : "Upload Image"}
            <input type="file" accept="image/*" style={{ display:"none" }} onChange={e => { const file=e.target.files?.[0]; if(!file)return; const reader=new FileReader(); reader.onload=ev=>setMvpImage(ev.target.result); reader.readAsDataURL(file); e.target.value=""; }} />
          </label>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <label style={{ ...labelStyle, marginBottom:0 }}>Staff MVP Section</label>
            <ToggleSwitch value={staffEnabled} onChange={setStaffEnabled} />
            <span style={{ fontSize:11, color:staffEnabled?"#4ade80":"#666" }}>{staffEnabled?"ON":"OFF"}</span>
          </div>
          <p style={{ color: "#555", fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>
            These names appear as reference candidates on the MVP tab. Staff write in any name.
          </p>
          {staffEnabled&&(<>
            <div style={{ marginBottom:10 }}>{staffCandidates.map((name,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span style={{ flex:1, color:"#ccc", fontSize:14, paddingLeft:4 }}>{name}</span>
                <button onClick={()=>removeStaffCand(i)} style={removeBtnStyle}>✕</button>
              </div>
            ))}</div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={newStaffName} onChange={e=>setNewStaffName(e.target.value)} placeholder="Add candidate name"
                style={{ ...inputStyle, flex:1 }} onKeyDown={e=>e.key==="Enter"&&addStaffCand()} />
              <button onClick={addStaffCand} style={addBtnStyle}>+ Add</button>
            </div>
          </>)}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <label style={{ ...labelStyle, marginBottom:0 }}>Admin MVP Section</label>
            <ToggleSwitch value={adminEnabled} onChange={setAdminEnabled} />
            <span style={{ fontSize:11, color:adminEnabled?"#4ade80":"#666" }}>{adminEnabled?"ON":"OFF"}</span>
          </div>
          {adminEnabled&&(<>
            <div style={{ marginBottom:10 }}>{adminCandidates.map((name,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span style={{ flex:1, color:"#ccc", fontSize:14, paddingLeft:4 }}>{name}</span>
                <button onClick={()=>removeAdminCand(i)} style={removeBtnStyle}>✕</button>
              </div>
            ))}</div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={newAdminName} onChange={e=>setNewAdminName(e.target.value)} placeholder="Add candidate name"
                style={{ ...inputStyle, flex:1 }} onKeyDown={e=>e.key==="Enter"&&addAdminCand()} />
              <button onClick={addAdminCand} style={addBtnStyle}>+ Add</button>
            </div>
          </>)}
        </div>
      </div>

      <button onClick={save} disabled={saving} style={submitBtnStyle}>{saving?"Saving…":"Save Settings"}</button>
      {msg&&<div style={{ marginTop:10, color:msg.startsWith("✓")?"#4ade80":"#f87171", fontSize:13 }}>{msg}</div>}
    </div>
  );
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
function AdminPanel({ pollData, onRefresh }) {
  const [pw, setPw]               = useState("");
  const [unlocked, setUnlocked]   = useState(false);
  const [subTab, setSubTab]       = useState("results");
  const [resetting, setResetting] = useState(false);

  const unlock = () => { if (pw === ADMIN_PASSWORD) setUnlocked(true); else alert("Wrong password."); };
  const reset  = async () => {
    if (!window.confirm("Reset all votes and advance to the next poll number?")) return;
    setResetting(true);
    await apiFetch("/api/admin/reset", { method: "DELETE", body: { adminPassword: pw } });
    setResetting(false); onRefresh();
  };

  if (!unlocked) return (
    <div style={{ textAlign: "center", padding: "28px 0" }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>🔒</div>
      <p style={{ color: "#888", marginBottom: 14, fontSize: 14 }}>Admin access required</p>
      <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&unlock()}
        placeholder="Password" style={{ ...inputStyle, width:"100%", textAlign:"center", marginBottom:12 }} />
      <button onClick={unlock} style={submitBtnStyle}>Unlock</button>
    </div>
  );

  const subTabs = [["results","📊 Results"],["applicants","📋 Applicants"],["mvp","🏆 MVP"],["edit","✏ Edit"],["settings","⚙️ Settings"]];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {subTabs.map(([k,label]) => (
          <button key={k} onClick={()=>setSubTab(k)} style={{
            flex:1, padding:"9px", borderRadius:8, border:"none", cursor:"pointer", minWidth:60,
            background: subTab===k?"rgba(184,134,11,0.25)":"rgba(255,255,255,0.04)",
            color: subTab===k?"#ffd700":"#777",
            fontFamily:"'Cinzel',serif", fontWeight:700, fontSize:11,
            borderBottom: subTab===k?"2px solid #b8860b":"2px solid transparent",
          }}>{label}</button>
        ))}
        <button onClick={reset} disabled={resetting} style={{
          padding:"9px 12px", borderRadius:8, border:"1px solid #ff4444",
          background:"#ff444415", color:"#ff8888",
          fontFamily:"'Cinzel',serif", fontWeight:700, fontSize:11, cursor:"pointer", flexShrink:0,
        }}>{resetting?"…":"🔄"}</button>
      </div>
      {subTab==="results"    && <ResultsPanel          pollData={pollData} />}
      {subTab==="applicants" && <ApplicantResultsPanel pollData={pollData} />}
      {subTab==="mvp"        && <MvpResultsPanel       pollData={pollData} />}
      {subTab==="edit"       && <VoteEditorPanel       pollData={pollData} adminPassword={pw} onRefresh={onRefresh} />}
      {subTab==="settings"   && <SettingsPanel         pollData={pollData} adminPassword={pw} onRefresh={onRefresh} />}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const labelStyle      = { display:"block", color:"#aaa", fontSize:11, marginBottom:6, letterSpacing:1.5, textTransform:"uppercase" };
const inputStyle      = { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.13)", borderRadius:8, color:"#e0e0e0", padding:"9px 13px", fontSize:14, boxSizing:"border-box" };
const cardStyle       = { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:"14px 16px", marginBottom:12 };
const errorStyle      = { background:"#ff444418", border:"1px solid #ff4444", borderRadius:8, padding:"10px 14px", color:"#ff8888", fontSize:13, marginBottom:14 };
const submitBtnStyle  = { width:"100%", padding:"13px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#b8860b,#ffd700)", color:"#1a1200", fontFamily:"'Cinzel',serif", fontWeight:700, fontSize:15, cursor:"pointer", letterSpacing:1, transition:"all 0.3s" };
const removeBtnStyle  = { background:"#ff444422", border:"1px solid #ff4444", color:"#ff8888", borderRadius:6, padding:"6px 12px", cursor:"pointer", fontSize:13, flexShrink:0 };
const addBtnStyle     = { background:"rgba(255,215,0,0.1)", border:"1px solid rgba(255,215,0,0.3)", color:"#ffd700", borderRadius:8, padding:"8px 16px", fontFamily:"'Cinzel',serif", fontWeight:700, cursor:"pointer", fontSize:13, flexShrink:0 };
const sectionHeaderStyle = { fontFamily:"'Cinzel',serif", color:"#e8d5a3", fontSize:14, fontWeight:700, letterSpacing:1, marginBottom:12, paddingBottom:8, borderBottom:"1px solid rgba(255,255,255,0.07)" };

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [pollData, setPollData] = useState(null);
  const [tab, setTab]           = useState("vote");

  const load = useCallback(async () => { const d = await apiFetch("/api/poll"); setPollData(d); }, []);
  useEffect(() => { load(); }, [load]);

  if (!pollData) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0d0b08", color:"#888", fontFamily:"serif", fontSize:16 }}>
      Loading…
    </div>
  );

  const mvp = pollData.mvp || {}, applicants = pollData.applicants || {};
  const showMvpTab  = mvp.staffEnabled || mvp.adminEnabled;
  const showAppTab  = (applicants.candidates || []).length > 0 || true; // always show if you want write-ins
  const monthLabel  = mvp.month ? `${mvp.month} ` : "";

  const tabs = [
    ["vote",       "⚔ Cast Vote"],
    ...(showAppTab  ? [["applicants","📋 Applicants"]] : []),
    ...(showMvpTab  ? [["mvp",`🏆 ${monthLabel}MVP Poll`]] : []),
    ["admin",      "👑 Admin"],
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Crimson+Pro:wght@300;400;600&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:#0d0b08; }
        input,textarea,select,button { font-family:'Crimson Pro',serif; outline:none; }
        select option { background:#1a1610; }
        @keyframes float { 0%,100%{transform:translateY(0) translateX(0);opacity:.35;}33%{transform:translateY(-28px) translateX(14px);opacity:.65;}66%{transform:translateY(14px) translateX(-10px);opacity:.25;} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
        ::-webkit-scrollbar{width:6px;}
        ::-webkit-scrollbar-thumb{background:rgba(255,215,0,.25);border-radius:3px;}
      `}</style>
      <Particles />
      <div style={{ position:"relative", zIndex:1, minHeight:"100vh", background:"radial-gradient(ellipse at 20% 10%,rgba(184,134,11,.07) 0%,transparent 60%),radial-gradient(ellipse at 80% 90%,rgba(59,130,246,.05) 0%,transparent 60%)", padding:"32px 16px 70px", fontFamily:"'Crimson Pro',serif", color:"#ccc" }}>
        <div style={{ maxWidth:660, margin:"0 auto", animation:"fadeIn 0.55s ease" }}>
          <div style={{ textAlign:"center", marginBottom:30 }}>
            <div style={{ fontSize:11, letterSpacing:4, color:"#b8860b", textTransform:"uppercase", marginBottom:8 }}>Reason Private Server</div>
            <h1 style={{ fontFamily:"'Cinzel',serif", fontSize:27, fontWeight:900, color:"#e8d5a3", letterSpacing:2, lineHeight:1.2 }}>Staff Polls</h1>
            <div style={{ width:60, height:2, background:"linear-gradient(90deg,transparent,#b8860b,transparent)", margin:"12px auto 0" }} />
          </div>

          <div style={{ display:"flex", background:"rgba(255,255,255,0.04)", borderRadius:10, padding:4, marginBottom:22, border:"1px solid rgba(255,255,255,0.07)" }}>
            {tabs.map(([key,label]) => (
              <button key={key} onClick={()=>setTab(key)} style={{
                flex:1, padding:"10px", borderRadius:7, border:"none",
                background: tab===key?"rgba(184,134,11,.22)":"transparent",
                color: tab===key?"#ffd700":"#777",
                fontFamily:"'Cinzel',serif", fontWeight:700, fontSize:12,
                cursor:"pointer", borderBottom: tab===key?"2px solid #b8860b":"2px solid transparent",
                transition:"all .2s",
              }}>{label}</button>
            ))}
          </div>

          <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,215,0,.1)", borderRadius:16, padding:"24px 20px", boxShadow:"0 20px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,215,0,.07)" }}>
            {tab==="vote"       && <VotingForm     pollData={pollData} onRefresh={load} />}
            {tab==="applicants" && <ApplicantsForm pollData={pollData} onRefresh={load} />}
            {tab==="mvp"        && <MvpForm        pollData={pollData} onRefresh={load} />}
            {tab==="admin"      && <AdminPanel     pollData={pollData} onRefresh={load} />}
          </div>
        </div>
      </div>
    </>
  );
}
