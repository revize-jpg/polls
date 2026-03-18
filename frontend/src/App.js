import { useState, useEffect, useCallback } from "react";

// ── Config ────────────────────────────────────────────────────────────────────
const API = process.env.REACT_APP_API_URL || "";
const ROLES = ["Demote", "Support", "Moderator", "Admin"];
const ROLE_COLORS = { Demote: "#ff5555", Support: "#60a5fa", Moderator: "#a8b2c0", Admin: "#f5c542" };
const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD || "Jac098!";
const STAFF_POINTS = [3, 2, 1];
const ADMIN_POINTS = [3, 2];
const RANK_COLORS  = ["#f5c542", "#a8b2c0", "#cd7f32"];

function getRoleColor(role) {
  if (ROLE_COLORS[role]) return ROLE_COLORS[role];
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
          Voting as <strong>{value}</strong> — click ✓ to change
        </div>
      )}
    </div>
  );
}

// ── Voting Form ───────────────────────────────────────────────────────────────
function VotingForm({ pollData, onRefresh }) {
  const [voterName, setVoterName] = useState("");
  const [locked, setLocked]       = useState(false);
  const [picks, setPicks]         = useState({});
  const [feedback, setFeedback]   = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  const isSelfFn = u => voterName.trim().toLowerCase() === u.toLowerCase() && voterName.trim() !== "";
  const pick = (u, role) => { if (!isSelfFn(u)) setPicks(p => ({ ...p, [u]: role })); };
  const allPicked = pollData.staff.every(m => isSelfFn(m.username) || picks[m.username]);

  const handleSubmit = async () => {
    if (!voterName.trim())   { setError("Please enter your username."); return; }
    if (!locked)             { setError("Please lock in your username first (click ⏎)."); return; }
    if (!allPicked)          { setError("Please cast a vote for every staff member."); return; }
    if (!feedback.trim())    { setError("Please fill in the feedback box before submitting."); return; }
    setLoading(true); setError("");
    const res = await apiFetch("/api/vote", {
      method: "POST",
      body: { voterName: voterName.trim(), votes: picks, feedback: feedback.trim() },
    });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setSubmitted(true); onRefresh();
  };

  if (submitted) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>⚔️</div>
      <h2 style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontSize: 22, marginBottom: 8 }}>Vote Recorded</h2>
      <p style={{ color: "#888", fontSize: 14 }}>Your vote for Staff Poll #{pollData.pollNumber} has been saved.</p>
    </div>
  );

  return (
    <div>
      <UsernameInput value={voterName} locked={locked}
        onChange={v => { setVoterName(v); setPicks(p => { const n = {...p}; delete n[v]; return n; }); }}
        onLock={() => voterName.trim() && setLocked(true)} onUnlock={() => setLocked(false)} />
      <p style={{ color: "#666", fontSize: 13, marginBottom: 18 }}>Select one choice per staff member.</p>

      {pollData.staff.map(m => {
        const isSelf = isSelfFn(m.username);
        const voteOptions = (m.voteOptions && m.voteOptions.length > 0) ? m.voteOptions : ROLES;
        return (
          <div key={m.username} style={{ ...cardStyle, position: "relative" }}>
            {isSelf && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center",
                justifyContent: "center", borderRadius: 10, zIndex: 2,
                background: "rgba(0,0,0,0.6)", fontSize: 12, color: "#666", letterSpacing: 1,
              }}>You cannot vote for yourself</div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, opacity: isSelf ? 0.3 : 1 }}>
              <span style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 15, color: "#e8d5a3" }}>{m.username}</span>
              <RoleBadge role={m.currentRole} />
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", opacity: isSelf ? 0.3 : 1 }}>
              {voteOptions.map(role => {
                const selected = picks[m.username] === role;
                const color = getRoleColor(role);
                return (
                  <button key={role} onClick={() => pick(m.username, role)} disabled={isSelf} style={{
                    padding: "8px 18px", borderRadius: 8, fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 12,
                    border: `2px solid ${selected ? color : "rgba(255,255,255,0.1)"}`,
                    background: selected ? `${color}22` : "rgba(255,255,255,0.03)",
                    color: selected ? color : "#888",
                    cursor: isSelf ? "not-allowed" : "pointer", letterSpacing: 1, transition: "all 0.15s",
                    boxShadow: selected ? `0 0 12px ${color}44` : "none",
                  }}>{role}</button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 8, marginBottom: 20 }}>
        <label style={labelStyle}>Vote Feedback <span style={{ color: "#ff8888", fontSize: 10 }}>* required</span></label>
        <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={4}
          placeholder="Explain any vote results here. Your message will be reworded if the player wishes to receive this feedback. Type N/A if not applicable."
          style={{ ...inputStyle, resize: "vertical", fontFamily: "'Crimson Pro', serif", fontSize: 13, lineHeight: 1.6,
            borderColor: !feedback.trim() ? "rgba(255,100,100,0.25)" : "rgba(255,255,255,0.13)" }} />
      </div>

      {error && <div style={errorStyle}>⚠ {error}</div>}
      <button onClick={handleSubmit} disabled={loading} style={submitBtnStyle}>
        {loading ? "Submitting…" : "Submit Vote"}
      </button>
    </div>
  );
}

// ── Applicants Form ───────────────────────────────────────────────────────────
function ApplicantsForm({ pollData, onRefresh }) {
  const [voterName, setVoterName] = useState("");
  const [locked, setLocked]       = useState(false);
  const [picks, setPicks]         = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  const applicants = (pollData.applicants || {}).candidates || [];
  const MAX_PICKS = 3;
  const isSelfFn = n => voterName.trim().toLowerCase() === n.toLowerCase() && voterName.trim() !== "";

  const handleNameChange = v => {
    setVoterName(v);
    setPicks(p => p.filter(n => n.toLowerCase() !== v.trim().toLowerCase()));
  };
  const togglePick = name => {
    if (isSelfFn(name)) return;
    setPicks(p => p.includes(name) ? p.filter(n => n !== name) : p.length >= MAX_PICKS ? p : [...p, name]);
  };
  const handleSubmit = async () => {
    if (!voterName.trim()) { setError("Please enter your username."); return; }
    if (!locked)           { setError("Please lock in your username first (press Enter or click ⏎)."); return; }
    if (picks.length === 0) { setError("Please select at least one applicant."); return; }
    setLoading(true); setError("");
    const res = await apiFetch("/api/applicant-vote", { method: "POST", body: { voterName: voterName.trim(), picks } });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setSubmitted(true); onRefresh();
  };

  if (submitted) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>📋</div>
      <h2 style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontSize: 22, marginBottom: 8 }}>Applicant Vote Recorded</h2>
      <p style={{ color: "#888", fontSize: 14 }}>Thanks for your input!</p>
    </div>
  );
  if (applicants.length === 0) return (
    <div style={{ textAlign: "center", padding: "50px 20px", color: "#555", fontSize: 14 }}>No applicants are currently listed.</div>
  );

  return (
    <div>
      <UsernameInput value={voterName} locked={locked} onChange={handleNameChange}
        onLock={() => voterName.trim() && setLocked(true)} onUnlock={() => { setLocked(false); setPicks([]); }} />
      <div style={{ marginBottom: 16 }}>
        <div style={sectionHeaderStyle}>📋 Staff Applicants</div>
        <p style={{ color: "#666", fontSize: 13, marginBottom: 14 }}>
          Select up to <strong style={{ color: "#ccc" }}>3 applicants</strong>. At least one selection required.
        </p>
        <div style={{ marginBottom: 14, fontSize: 12, color: picks.length > 0 ? "#f5c542" : "#555" }}>
          {picks.length === 0 ? "No selections yet" : `${picks.length} / ${MAX_PICKS} selected`}
          {picks.length > 0 && <span style={{ color: "#666" }}> — {picks.join(", ")}</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {applicants.map(name => {
            const isSelf = isSelfFn(name), selected = picks.includes(name), full = !selected && picks.length >= MAX_PICKS;
            return (
              <button key={name} onClick={() => togglePick(name)} disabled={isSelf || full} style={{
                padding: "11px 18px", borderRadius: 9, textAlign: "left", width: "100%",
                border: `2px solid ${selected ? "#60a5fa" : isSelf || full ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.1)"}`,
                background: selected ? "rgba(96,165,250,0.12)" : isSelf || full ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)",
                color: isSelf ? "#444" : full ? "#555" : selected ? "#60a5fa" : "#ccc",
                fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 13,
                cursor: isSelf || full ? "not-allowed" : "pointer", letterSpacing: 0.5, transition: "all 0.15s",
                boxShadow: selected ? "0 0 14px rgba(96,165,250,0.2)" : "none",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span>{name}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {isSelf && <span style={{ fontSize: 11, color: "#555", fontWeight: 400 }}>yourself</span>}
                  {full && !isSelf && <span style={{ fontSize: 11, color: "#555", fontWeight: 400 }}>max reached</span>}
                  {selected && <span style={{ fontSize: 15 }}>✓</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {error && <div style={errorStyle}>⚠ {error}</div>}
      <button onClick={handleSubmit} disabled={loading} style={submitBtnStyle}>
        {loading ? "Submitting…" : "Submit Applicant Vote"}
      </button>
    </div>
  );
}

// ── MVP Form ──────────────────────────────────────────────────────────────────
function MvpForm({ pollData, onRefresh }) {
  const [voterName, setVoterName]   = useState("");
  const [locked, setLocked]         = useState(false);
  const [staffRanks, setStaffRanks] = useState([]);
  const [adminRanks, setAdminRanks] = useState([]);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);

  const mvp = pollData.mvp || {};
  const monthLabel = mvp.month ? `${mvp.month} ` : "";
  const isSelfFn = n => voterName.trim().toLowerCase() === n.toLowerCase() && voterName.trim() !== "";

  const handleRankClick = (name, ranks, setRanks, maxPicks) => {
    if (isSelfFn(name)) return;
    const idx = ranks.indexOf(name);
    if (idx !== -1) setRanks(ranks.filter((_, i) => i !== idx));
    else if (ranks.length < maxPicks) setRanks([...ranks, name]);
  };
  const handleNameChange = v => {
    setVoterName(v);
    const lower = v.trim().toLowerCase();
    setStaffRanks(r => r.filter(n => n.toLowerCase() !== lower));
    setAdminRanks(r => r.filter(n => n.toLowerCase() !== lower));
  };
  const handleSubmit = async () => {
    if (!voterName.trim()) { setError("Please enter your username."); return; }
    if (!locked)           { setError("Please lock in your username first."); return; }
    if (mvp.staffEnabled && staffRanks.length === 0) { setError("Please pick at least one Staff MVP."); return; }
    if (mvp.adminEnabled && adminRanks.length === 0) { setError("Please pick at least one Admin MVP."); return; }
    setLoading(true); setError("");
    const res = await apiFetch("/api/mvp-vote", { method: "POST", body: { voterName: voterName.trim(), staffRanks, adminRanks } });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setSubmitted(true); onRefresh();
  };

  if (submitted) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>🏆</div>
      <h2 style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontSize: 22, marginBottom: 8 }}>MVP Vote Recorded</h2>
      <p style={{ color: "#888", fontSize: 14 }}>Thanks for voting!</p>
    </div>
  );

  const RankBtn = ({ name, ranks, setRanks, maxPicks, pointsArr }) => {
    const isSelf = isSelfFn(name), rankIdx = ranks.indexOf(name), picked = rankIdx !== -1;
    const full = !picked && ranks.length >= maxPicks, color = picked ? RANK_COLORS[rankIdx] : null;
    return (
      <button onClick={() => handleRankClick(name, ranks, setRanks, maxPicks)} disabled={isSelf || full} style={{
        padding: "11px 18px", borderRadius: 9, textAlign: "left", width: "100%",
        border: `2px solid ${picked ? color : isSelf || full ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.1)"}`,
        background: picked ? `${color}18` : isSelf || full ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)",
        color: isSelf ? "#444" : full ? "#555" : picked ? color : "#ccc",
        fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 13,
        cursor: isSelf || full ? "not-allowed" : "pointer", letterSpacing: 0.5, transition: "all 0.15s",
        boxShadow: picked ? `0 0 14px ${color}33` : "none",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span>{name}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isSelf && <span style={{ fontSize: 11, color: "#555", fontWeight: 400 }}>yourself</span>}
          {full && !isSelf && <span style={{ fontSize: 11, color: "#555", fontWeight: 400 }}>max reached</span>}
          {picked && <span style={{ background: color, color: "#1a1200", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 900, minWidth: 28, textAlign: "center" }}>
            #{rankIdx + 1} · {pointsArr[rankIdx]}pt{pointsArr[rankIdx] !== 1 ? "s" : ""}
          </span>}
        </span>
      </button>
    );
  };

  return (
    <div>
      <UsernameInput value={voterName} locked={locked} onChange={handleNameChange}
        onLock={() => voterName.trim() && setLocked(true)}
        onUnlock={() => { setLocked(false); setStaffRanks([]); setAdminRanks([]); }} />

      {mvp.staffEnabled && (
        <div style={{ marginBottom: 28 }}>
          <div style={sectionHeaderStyle}>⭐ {monthLabel}Staff MVP</div>
          <p style={{ color: "#666", fontSize: 13, marginBottom: 14 }}>Rank up to <strong style={{ color: "#ccc" }}>3</strong>. #1=3pts, #2=2pts, #3=1pt.</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ padding: "3px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                border: `1px solid ${staffRanks[i] ? RANK_COLORS[i] : "rgba(255,255,255,0.08)"}`,
                color: staffRanks[i] ? RANK_COLORS[i] : "#444",
                background: staffRanks[i] ? `${RANK_COLORS[i]}15` : "transparent" }}>
                {staffRanks[i] ? `#${i+1} ${staffRanks[i]}` : `#${i+1} —`}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(mvp.staffCandidates || []).map(n => <RankBtn key={n} name={n} ranks={staffRanks} setRanks={setStaffRanks} maxPicks={3} pointsArr={STAFF_POINTS} />)}
          </div>
        </div>
      )}
      {mvp.adminEnabled && (
        <div style={{ marginBottom: 28 }}>
          <div style={sectionHeaderStyle}>👑 {monthLabel}Admin MVP</div>
          <p style={{ color: "#666", fontSize: 13, marginBottom: 14 }}>Rank up to <strong style={{ color: "#ccc" }}>2</strong>. #1=3pts, #2=2pts.</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[0,1].map(i => (
              <div key={i} style={{ padding: "3px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                border: `1px solid ${adminRanks[i] ? RANK_COLORS[i] : "rgba(255,255,255,0.08)"}`,
                color: adminRanks[i] ? RANK_COLORS[i] : "#444",
                background: adminRanks[i] ? `${RANK_COLORS[i]}15` : "transparent" }}>
                {adminRanks[i] ? `#${i+1} ${adminRanks[i]}` : `#${i+1} —`}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(mvp.adminCandidates || []).map(n => <RankBtn key={n} name={n} ranks={adminRanks} setRanks={setAdminRanks} maxPicks={2} pointsArr={ADMIN_POINTS} />)}
          </div>
        </div>
      )}
      {!mvp.staffEnabled && !mvp.adminEnabled && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#555", fontSize: 14 }}>MVP voting is not currently active.</div>
      )}
      {(mvp.staffEnabled || mvp.adminEnabled) && (
        <>{error && <div style={errorStyle}>⚠ {error}</div>}
          <button onClick={handleSubmit} disabled={loading} style={submitBtnStyle}>
            {loading ? "Submitting…" : `Submit ${monthLabel}MVP Vote`}
          </button></>
      )}
    </div>
  );
}

// ── Tally helpers ─────────────────────────────────────────────────────────────
function tally(staff, votes) {
  return staff.map(m => {
    const totals = {}, votersByRole = {};
    let count = 0;
    for (const [voter, v] of Object.entries(votes)) {
      const role = v[m.username]; if (!role) continue;
      count++; totals[role] = (totals[role] || 0) + 1;
      if (!votersByRole[role]) votersByRole[role] = [];
      votersByRole[role].push(voter);
    }
    const pcts = {};
    for (const [r, n] of Object.entries(totals)) pcts[r] = Math.round((n / count) * 100);
    return { ...m, pcts, count, votersByRole };
  });
}
function tallyMvp(candidates, votes, ranksKey, pointsArr) {
  const points = {}, voteCounts = {}, voterDetails = {};
  for (const n of candidates) { points[n] = 0; voteCounts[n] = 0; voterDetails[n] = []; }
  for (const [voter, v] of Object.entries(votes)) {
    (v[ranksKey] || []).forEach((name, idx) => {
      if (points[name] !== undefined) {
        points[name] += pointsArr[idx] || 0; voteCounts[name]++;
        voterDetails[name].push(`${voter} (#${idx+1} · ${pointsArr[idx]}pt${pointsArr[idx]!==1?"s":""})`);
      }
    });
  }
  const totalPts = Object.values(points).reduce((a, b) => a + b, 0);
  return Object.entries(points)
    .map(([name, pts]) => ({ name, pts, votes: voteCounts[name], voterDetails: voterDetails[name], pct: totalPts ? Math.round((pts/totalPts)*100) : 0 }))
    .sort((a, b) => b.pts - a.pts);
}
function tallyApplicants(candidates, votes) {
  const counts = {}, voters = {};
  for (const n of candidates) { counts[n] = 0; voters[n] = []; }
  for (const [voter, v] of Object.entries(votes))
    for (const name of (v.picks || []))
      if (counts[name] !== undefined) { counts[name]++; voters[name].push(voter); }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return Object.entries(counts)
    .map(([name, n]) => ({ name, count: n, voters: voters[name], pct: total ? Math.round((n/total)*100) : 0 }))
    .sort((a, b) => b.count - a.count);
}

// ── Results Panel ─────────────────────────────────────────────────────────────
function ResultsPanel({ pollData }) {
  const [copied, setCopied]               = useState(false);
  const [changes, setChanges]             = useState("");
  const [expandedFeedback, setExpandedFeedback] = useState(false);
  const tallied  = tally(pollData.staff, pollData.votes);
  const allVoters = Object.keys(pollData.votes);

  const byRole = {};
  for (const m of tallied) { if (!byRole[m.currentRole]) byRole[m.currentRole] = []; byRole[m.currentRole].push(m); }
  const allPresentRoles = [...new Set(pollData.staff.map(m => m.currentRole))];
  const roleOrder = [...ROLES, ...allPresentRoles.filter(r => !ROLES.includes(r))];

  const buildDiscord = () => {
    const lines = [`@here :AU_downvote: **Staff Results #${pollData.pollNumber}** :AU_greencheckmark:`];
    for (const role of roleOrder) {
      const members = byRole[role] || []; if (!members.length) continue;
      const icon = role === "Support" ? ":555ss:" : role === "Moderator" ? ":55Mod:" : ":5Admin:";
      lines.push(`\n${icon} **${role}s** -----------------------`);
      for (const m of members) {
        const parts = Object.entries(m.pcts).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([r,v])=>`${v}% ${r}`).join("  ");
        lines.push(`@${m.username}  ${parts || "No votes yet"}`);
      }
    }
    if (changes.trim()) lines.push(`\n**Changes**\n:AU_upwardstrend: \n\`\`\`\n${changes.trim()}\n\`\`\``);
    return lines.join("\n");
  };

  const copy = () => { navigator.clipboard.writeText(buildDiscord()); setCopied(true); setTimeout(() => setCopied(false), 2200); };

  const feedbackEntries = Object.entries(pollData.votes)
    .map(([voter, v]) => ({ voter, feedback: v.__feedback__ }))
    .filter(e => e.feedback && e.feedback.trim() && e.feedback.trim().toUpperCase() !== "N/A");

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Tooltip lines={allVoters.length ? allVoters.map(v => `• ${v}`) : ["No votes yet"]}>
          {allVoters.length} vote(s) recorded
        </Tooltip>
      </div>
      {tallied.map(m => (
        <div key={m.username} style={{ ...cardStyle, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontWeight: 700 }}>@{m.username}</span>
            <RoleBadge role={m.currentRole} />
            {(m.voteOptions && m.voteOptions.length > 0) && <span style={{ fontSize: 10, color: "#555" }}>custom options</span>}
            <span style={{ marginLeft: "auto" }}>
              <Tooltip lines={m.count ? allVoters.map(v => { const role=(pollData.votes[v]||{})[m.username]; return role ? `${v} → ${role}` : null; }).filter(Boolean) : ["No votes yet"]}>
                {m.count} vote(s)
              </Tooltip>
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {Object.entries(m.pcts).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([role, pct]) => {
              const color = getRoleColor(role);
              return <span key={role} style={{ background:`${color}22`, color, border:`1px solid ${color}55`, borderRadius:6, padding:"3px 12px", fontSize:13, fontWeight:700 }}>{pct}% {role}</span>;
            })}
            {!Object.keys(m.pcts).length && <span style={{ color: "#555", fontSize: 12 }}>No votes yet</span>}
          </div>
        </div>
      ))}

      {feedbackEntries.length > 0 && (
        <div style={{ marginTop: 20, marginBottom: 20 }}>
          <button onClick={() => setExpandedFeedback(e => !e)} style={{
            width: "100%", padding: "10px 14px", borderRadius: 8, cursor: "pointer",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#aaa", fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 12,
            letterSpacing: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>💬 Voter Feedback ({feedbackEntries.length})</span>
            <span>{expandedFeedback ? "▲" : "▼"}</span>
          </button>
          {expandedFeedback && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {feedbackEntries.map(({ voter, feedback }) => (
                <div key={voter} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, color: "#f5c542", fontFamily: "'Cinzel',serif", marginBottom: 5 }}>{voter}</div>
                  <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{feedback}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 8, marginBottom: 16 }}>
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
  const candidates = (pollData.applicants || {}).candidates || [];
  const appVotes   = pollData.applicantVotes || {};
  const results    = tallyApplicants(candidates, appVotes);
  if (candidates.length === 0) return <div style={{ textAlign: "center", padding: "30px 0", color: "#555", fontSize: 14 }}>No applicant candidates configured.</div>;
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Tooltip lines={Object.keys(appVotes).length ? Object.keys(appVotes).map(v => `• ${v}`) : ["No votes yet"]}>
          {Object.keys(appVotes).length} vote(s) recorded
        </Tooltip>
      </div>
      {results.map((r, i) => (
        <div key={r.name} style={{ ...cardStyle, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color: i===0?"#60a5fa":"#555", width: 24, flexShrink: 0 }}>{i===0?"★":`${i+1}`}</span>
          <span style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontWeight: 700, flex: 1 }}>{r.name}</span>
          <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: 14, marginRight: 8 }}>{r.pct}%</span>
          <Tooltip lines={r.voters.length ? r.voters.map(v=>`• ${v}`) : ["No votes yet"]}>{r.count} vote(s)</Tooltip>
        </div>
      ))}
    </div>
  );
}

// ── MVP Results Panel ─────────────────────────────────────────────────────────
function MvpResultsPanel({ pollData }) {
  const mvp = pollData.mvp || {}, mvpVotes = pollData.mvpVotes || {};
  const monthLabel = mvp.month ? `${mvp.month} ` : "";
  const staffResults = tallyMvp(mvp.staffCandidates||[], mvpVotes, "staffRanks", STAFF_POINTS);
  const adminResults = tallyMvp(mvp.adminCandidates||[], mvpVotes, "adminRanks", ADMIN_POINTS);
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Tooltip lines={Object.keys(mvpVotes).length ? Object.keys(mvpVotes).map(v=>`• ${v}`) : ["No votes yet"]}>
          {Object.keys(mvpVotes).length} MVP vote(s) recorded
        </Tooltip>
      </div>
      {mvp.staffEnabled && <div style={{ marginBottom: 24 }}>
        <div style={sectionHeaderStyle}>⭐ {monthLabel}Staff MVP</div>
        {staffResults.map((r,i) => (
          <div key={r.name} style={{ ...cardStyle, marginBottom: 8, display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontFamily:"'Cinzel',serif", fontSize:18, color:RANK_COLORS[i]||"#555", width:24, flexShrink:0 }}>{i===0?"★":`${i+1}`}</span>
            <span style={{ fontFamily:"'Cinzel',serif", color:"#e8d5a3", fontWeight:700, flex:1 }}>{r.name}</span>
            <span style={{ color:"#f5c542", fontWeight:700, fontSize:14, marginRight:8 }}>{r.pts} pts</span>
            <Tooltip lines={r.voterDetails.length?r.voterDetails.map(d=>`• ${d}`):["No votes yet"]}>{r.votes} vote(s)</Tooltip>
          </div>
        ))}
      </div>}
      {mvp.adminEnabled && <div style={{ marginBottom: 24 }}>
        <div style={sectionHeaderStyle}>👑 {monthLabel}Admin MVP</div>
        {adminResults.map((r,i) => (
          <div key={r.name} style={{ ...cardStyle, marginBottom: 8, display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontFamily:"'Cinzel',serif", fontSize:18, color:RANK_COLORS[i]||"#555", width:24, flexShrink:0 }}>{i===0?"★":`${i+1}`}</span>
            <span style={{ fontFamily:"'Cinzel',serif", color:"#e8d5a3", fontWeight:700, flex:1 }}>{r.name}</span>
            <span style={{ color:"#f5c542", fontWeight:700, fontSize:14, marginRight:8 }}>{r.pts} pts</span>
            <Tooltip lines={r.voterDetails.length?r.voterDetails.map(d=>`• ${d}`):["No votes yet"]}>{r.votes} vote(s)</Tooltip>
          </div>
        ))}
      </div>}
      {!mvp.staffEnabled && !mvp.adminEnabled && <div style={{ textAlign:"center", padding:"30px 0", color:"#555", fontSize:14 }}>MVP voting is not enabled.</div>}
    </div>
  );
}

// ── Vote Editor Panel ─────────────────────────────────────────────────────────
function VoteEditorPanel({ pollData, adminPassword, onRefresh }) {
  const [voteType, setVoteType]       = useState("staff");
  const [editingKey, setEditingKey]   = useState(null);   // voter key being edited
  const [editData, setEditData]       = useState(null);   // draft copy of their vote
  const [saving, setSaving]           = useState(false);
  const [msg, setMsg]                 = useState("");

  const votes = voteType === "staff"     ? pollData.votes
              : voteType === "mvp"       ? (pollData.mvpVotes || {})
              :                            (pollData.applicantVotes || {});

  const voterKeys = Object.keys(votes);

  const startEdit = (key) => {
    setEditingKey(key);
    setEditData(JSON.parse(JSON.stringify(votes[key]))); // deep clone
    setMsg("");
  };
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

  const deleteVote = async (key) => {
    if (!window.confirm(`Delete ${key}'s vote?`)) return;
    setSaving(true);
    await apiFetch("/api/admin/vote", {
      method: "DELETE",
      body: { adminPassword, voteType, voterKey: key },
    });
    setSaving(false); onRefresh();
  };

  // ── Render the editable fields depending on vote type ──
  const renderEditor = () => {
    if (!editData) return null;

    if (voteType === "staff") {
      return (
        <div>
          <div style={{ marginBottom: 12, fontSize: 12, color: "#888" }}>
            Editing votes cast by <strong style={{ color: "#f5c542" }}>{editingKey}</strong>
          </div>
          {pollData.staff.map(m => {
            const voteOptions = (m.voteOptions && m.voteOptions.length > 0) ? m.voteOptions : ROLES;
            const current = editData[m.username];
            return (
              <div key={m.username} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontSize: 13, minWidth: 120 }}>{m.username}</span>
                  <RoleBadge role={m.currentRole} />
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    onClick={() => setEditData(d => { const n={...d}; delete n[m.username]; return n; })}
                    style={{
                      padding: "5px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                      border: `1px solid ${!current ? "#f5c542" : "rgba(255,255,255,0.1)"}`,
                      background: !current ? "rgba(245,197,66,0.15)" : "rgba(255,255,255,0.03)",
                      color: !current ? "#f5c542" : "#555",
                    }}
                  >— no vote</button>
                  {voteOptions.map(role => {
                    const sel = current === role;
                    const color = getRoleColor(role);
                    return (
                      <button key={role}
                        onClick={() => setEditData(d => ({ ...d, [m.username]: role }))}
                        style={{
                          padding: "5px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                          border: `1px solid ${sel ? color : "rgba(255,255,255,0.1)"}`,
                          background: sel ? `${color}22` : "rgba(255,255,255,0.03)",
                          color: sel ? color : "#777",
                          fontWeight: sel ? 700 : 400,
                        }}>{role}</button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {/* Feedback */}
          <div style={{ marginTop: 14 }}>
            <label style={labelStyle}>Feedback</label>
            <textarea value={editData.__feedback__ || ""} rows={3}
              onChange={e => setEditData(d => ({ ...d, __feedback__: e.target.value }))}
              style={{ ...inputStyle, resize: "vertical", fontSize: 12, fontFamily: "'Crimson Pro',serif" }} />
          </div>
        </div>
      );
    }

    if (voteType === "mvp") {
      const mvp = pollData.mvp || {};
      const updateRanks = (key, newRanks) => setEditData(d => ({ ...d, [key]: newRanks }));
      return (
        <div>
          <div style={{ marginBottom: 12, fontSize: 12, color: "#888" }}>
            Editing MVP vote by <strong style={{ color: "#f5c542" }}>{editingKey}</strong>
          </div>
          {mvp.staffEnabled && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Staff Rankings (drag order = rank)</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(mvp.staffCandidates || []).map(name => {
                  const ranks = editData.staffRanks || [];
                  const idx = ranks.indexOf(name);
                  const picked = idx !== -1;
                  const color = picked ? RANK_COLORS[idx] : null;
                  return (
                    <div key={name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => {
                        const r = editData.staffRanks || [];
                        const i = r.indexOf(name);
                        if (i !== -1) updateRanks("staffRanks", r.filter((_,x)=>x!==i));
                        else if (r.length < 3) updateRanks("staffRanks", [...r, name]);
                      }} style={{
                        flex: 1, padding: "7px 12px", borderRadius: 7, textAlign: "left", cursor: "pointer",
                        border: `1px solid ${picked ? color : "rgba(255,255,255,0.1)"}`,
                        background: picked ? `${color}18` : "rgba(255,255,255,0.03)",
                        color: picked ? color : "#aaa", fontSize: 12, fontWeight: picked ? 700 : 400,
                      }}>
                        {picked ? `#${idx+1} ` : ""}{name}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {mvp.adminEnabled && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Admin Rankings</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(mvp.adminCandidates || []).map(name => {
                  const ranks = editData.adminRanks || [];
                  const idx = ranks.indexOf(name);
                  const picked = idx !== -1;
                  const color = picked ? RANK_COLORS[idx] : null;
                  return (
                    <div key={name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => {
                        const r = editData.adminRanks || [];
                        const i = r.indexOf(name);
                        if (i !== -1) updateRanks("adminRanks", r.filter((_,x)=>x!==i));
                        else if (r.length < 2) updateRanks("adminRanks", [...r, name]);
                      }} style={{
                        flex: 1, padding: "7px 12px", borderRadius: 7, textAlign: "left", cursor: "pointer",
                        border: `1px solid ${picked ? color : "rgba(255,255,255,0.1)"}`,
                        background: picked ? `${color}18` : "rgba(255,255,255,0.03)",
                        color: picked ? color : "#aaa", fontSize: 12, fontWeight: picked ? 700 : 400,
                      }}>
                        {picked ? `#${idx+1} ` : ""}{name}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (voteType === "applicant") {
      const candidates = (pollData.applicants || {}).candidates || [];
      const currentPicks = editData.picks || [];
      return (
        <div>
          <div style={{ marginBottom: 12, fontSize: 12, color: "#888" }}>
            Editing applicant vote by <strong style={{ color: "#f5c542" }}>{editingKey}</strong>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {candidates.map(name => {
              const sel = currentPicks.includes(name);
              return (
                <button key={name} onClick={() => {
                  setEditData(d => {
                    const p = d.picks || [];
                    return { ...d, picks: sel ? p.filter(n=>n!==name) : p.length < 3 ? [...p, name] : p };
                  });
                }} style={{
                  padding: "8px 14px", borderRadius: 7, textAlign: "left", cursor: "pointer",
                  border: `2px solid ${sel ? "#60a5fa" : "rgba(255,255,255,0.1)"}`,
                  background: sel ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.03)",
                  color: sel ? "#60a5fa" : "#aaa", fontSize: 12, fontWeight: sel ? 700 : 400,
                  display: "flex", justifyContent: "space-between",
                }}>
                  <span>{name}</span>
                  {sel && <span>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
  };

  return (
    <div>
      {/* Vote type selector */}
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
        <div style={{ textAlign: "center", padding: "30px 0", color: "#555", fontSize: 14 }}>No votes recorded yet.</div>
      )}

      {/* Voter list */}
      {!editingKey && voterKeys.map(key => (
        <div key={key} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontSize: 13, flex: 1 }}>{key}</span>
          {/* Quick summary */}
          {voteType === "staff" && (
            <span style={{ fontSize: 11, color: "#666", flex: 2 }}>
              {pollData.staff.map(m => votes[key]?.[m.username]).filter(Boolean).join(", ") || "—"}
            </span>
          )}
          {voteType === "mvp" && (
            <span style={{ fontSize: 11, color: "#666", flex: 2 }}>
              S: {(votes[key]?.staffRanks||[]).join(", ")||"—"} | A: {(votes[key]?.adminRanks||[]).join(", ")||"—"}
            </span>
          )}
          {voteType === "applicant" && (
            <span style={{ fontSize: 11, color: "#666", flex: 2 }}>{(votes[key]?.picks||[]).join(", ")||"—"}</span>
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

      {/* Edit modal */}
      {editingKey && (
        <div style={{
          background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,215,0,0.15)",
          borderRadius: 12, padding: "18px 16px", marginBottom: 12,
        }}>
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

// ── Vote Options Editor ───────────────────────────────────────────────────────
function VoteOptionsEditor({ options, onChange }) {
  const [newOpt, setNewOpt] = useState("");
  const usingCustom = options !== null && options !== undefined;
  const displayOpts = usingCustom ? options : [...ROLES];

  const activate = () => { if (!usingCustom) onChange([...ROLES]); };
  const addOpt = () => {
    const v = newOpt.trim(); if (!v) return;
    const base = usingCustom ? displayOpts : [...ROLES];
    onChange([...base, v]); setNewOpt("");
  };
  const removeOpt = i => onChange(displayOpts.filter((_, idx) => idx !== i));
  const resetToDefault = () => onChange(null);

  return (
    <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "#888", letterSpacing: 1, textTransform: "uppercase" }}>
          Vote Options{" "}
          {!usingCustom ? <span style={{ color: "#555" }}>(using defaults)</span> : <span style={{ color: "#c084fc" }}>(custom)</span>}
        </span>
        {usingCustom && <button onClick={resetToDefault} style={{ fontSize: 10, color: "#888", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>Reset to defaults</button>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {displayOpts.map((opt, i) => {
          const color = getRoleColor(opt);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, background: `${color}18`, border: `1px solid ${color}55`, borderRadius: 6, padding: "3px 8px 3px 10px" }}>
              <span style={{ fontSize: 12, color, fontWeight: 700 }}>{opt}</span>
              <button onClick={() => { activate(); removeOpt(i); }} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 12, padding: "0 2px", lineHeight: 1 }}>✕</button>
            </div>
          );
        })}
        {displayOpts.length === 0 && <span style={{ fontSize: 11, color: "#555" }}>No options — add some below</span>}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={newOpt} onChange={e => setNewOpt(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { activate(); addOpt(); } }}
          placeholder="Add option (e.g. Head Mod)"
          style={{ ...inputStyle, flex: 1, fontSize: 12, padding: "6px 10px" }} />
        <button onClick={() => { activate(); addOpt(); }} style={{ ...addBtnStyle, fontSize: 12, padding: "6px 12px" }}>+ Add</button>
      </div>
    </div>
  );
}

// ── Admin Settings Panel ──────────────────────────────────────────────────────
function SettingsPanel({ pollData, adminPassword, onRefresh }) {
  const [pollNumber, setPollNumber]           = useState(pollData.pollNumber);
  const [staff, setStaff]                     = useState(pollData.staff.map(m => ({ ...m })));
  const [newUser, setNewUser]                 = useState("");
  const [newRole, setNewRole]                 = useState("Support");
  const [expandedMember, setExpandedMember]   = useState(null);
  const mvp0 = pollData.mvp || {}, app0 = pollData.applicants || {};
  const [mvpMonth, setMvpMonth]               = useState(mvp0.month || "");
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

  const monthPreview = mvpMonth.trim() ? `${mvpMonth.trim()} ` : "";

  const save = async () => {
    setSaving(true); setMsg("");
    const res = await apiFetch("/api/admin/settings", {
      method: "PUT",
      body: { adminPassword, pollNumber: Number(pollNumber), staff,
        mvp: { month: mvpMonth.trim(), staffEnabled, adminEnabled, staffCandidates, adminCandidates },
        applicants: { candidates: appCandidates } },
    });
    setSaving(false);
    if (res.error) { setMsg("❌ " + res.error); return; }
    setMsg("✓ Saved!"); onRefresh(); setTimeout(() => setMsg(""), 2000);
  };

  const addMember = () => {
    if (!newUser.trim()) return;
    setStaff(s => [...s, { username: newUser.trim(), currentRole: newRole, voteOptions: null }]);
    setNewUser("");
  };
  const removeMember = i => { setStaff(s => s.filter((_,idx)=>idx!==i)); if (expandedMember===i) setExpandedMember(null); };
  const updateMember = (i,f,v) => setStaff(s => s.map((m,idx)=>idx===i?{...m,[f]:v}:m));
  const setMemberVoteOptions = (i,opts) => setStaff(s => s.map((m,idx)=>idx===i?{...m,voteOptions:opts}:m));

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

      <label style={labelStyle}>Staff Members</label>
      <div style={{ marginBottom: 8 }}>
        {staff.map((m,i) => {
          const isExpanded = expandedMember===i, hasCustom = m.voteOptions!==null && m.voteOptions!==undefined;
          const roleDropdownOpts = [...new Set([...ROLES, ...(m.voteOptions||[])])];
          return (
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input value={m.username} onChange={e=>updateMember(i,"username",e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <select value={m.currentRole} onChange={e=>updateMember(i,"currentRole",e.target.value)} style={{ ...inputStyle, width: 130 }}>
                  {roleDropdownOpts.map(r=><option key={r}>{r}</option>)}
                </select>
                <button onClick={()=>setExpandedMember(isExpanded?null:i)} title="Customise vote options" style={{
                  padding:"6px 10px", borderRadius:6, cursor:"pointer", fontSize:13, flexShrink:0, transition:"all 0.15s",
                  background: hasCustom?"rgba(192,132,252,0.15)":"rgba(255,255,255,0.05)",
                  border: hasCustom?"1px solid rgba(192,132,252,0.4)":"1px solid rgba(255,255,255,0.1)",
                  color: hasCustom?"#c084fc":"#666",
                }}>{isExpanded?"▲":"⚙"}</button>
                <button onClick={()=>removeMember(i)} style={removeBtnStyle}>✕</button>
              </div>
              {isExpanded && <VoteOptionsEditor options={m.voteOptions??null} onChange={opts=>setMemberVoteOptions(i,opts)} />}
            </div>
          );
        })}
      </div>

      <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(255,215,0,0.04)", border: "1px solid rgba(255,215,0,0.1)", fontSize: 12, color: "#666", lineHeight: 1.6 }}>
        <span style={{ color: "#888" }}>Default options:</span>{" "}
        {ROLES.map((r,i)=>{const color=getRoleColor(r);return(<span key={r}><span style={{color}}>{r}</span>{i<ROLES.length-1&&<span style={{color:"#444"}}>, </span>}</span>);})}
        <span style={{ color: "#555" }}> — click ⚙ to override per member.</span>
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
        <div style={{ fontFamily:"'Cinzel',serif", color:"#e8d5a3", fontSize:15, fontWeight:700, marginBottom:18, letterSpacing:1 }}>📋 Staff Applicants</div>
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
          {mvpMonth.trim()&&<div style={{ marginTop:8, fontSize:12, color:"#888" }}>Preview: <span style={{color:"#f5c542"}}>{monthPreview}MVP Poll</span>{" · "}<span style={{color:"#a8b2c0"}}>{monthPreview}Staff MVP</span>{" · "}<span style={{color:"#a8b2c0"}}>{monthPreview}Admin MVP</span></div>}
        </div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <label style={{ ...labelStyle, marginBottom:0 }}>Staff MVP Section</label>
            <ToggleSwitch value={staffEnabled} onChange={setStaffEnabled} />
            <span style={{ fontSize:11, color:staffEnabled?"#4ade80":"#666" }}>{staffEnabled?"ON":"OFF"}</span>
          </div>
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
      <p style={{ color: "#888", marginBottom: 14, fontSize: 14 }}>Tyler access required</p>
      <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&unlock()}
        placeholder="Password" style={{ ...inputStyle, width:"100%", textAlign:"center", marginBottom:12 }} />
      <button onClick={unlock} style={submitBtnStyle}>Unlock</button>
    </div>
  );

  const subTabs = [["results","📊 Results"],["applicants","📋 Applicants"],["mvp","🏆 MVP"],["edit","✏ Edit Votes"],["settings","⚙️ Settings"]];

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
      {subTab==="edit"       && <VoteEditorPanel        pollData={pollData} adminPassword={pw} onRefresh={onRefresh} />}
      {subTab==="settings"   && <SettingsPanel         pollData={pollData} adminPassword={pw} onRefresh={onRefresh} />}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const labelStyle      = { display:"block", color:"#aaa", fontSize:11, marginBottom:6, letterSpacing:1.5, textTransform:"uppercase" };
const inputStyle      = { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.13)", borderRadius:8, color:"#e0e0e0", padding:"9px 13px", fontSize:14 };
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
  const showAppTab  = (applicants.candidates || []).length > 0;
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
