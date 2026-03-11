import { useState, useEffect, useCallback } from "react";

// ── Config ────────────────────────────────────────────────────────────────────
const API = process.env.REACT_APP_API_URL || "";
const ROLES = ["Demote", "Support", "Moderator", "Admin"];
const ROLE_COLORS = { Demote: "#ff5555", Support: "#60a5fa", Moderator: "#a8b2c0", Admin: "#f5c542" };
const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD || "Jac098!";
const STAFF_POINTS = [3, 2, 1];
const ADMIN_POINTS = [3, 2];
const RANK_COLORS  = ["#f5c542", "#a8b2c0", "#cd7f32"];

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return res.json();
}

// ── Tooltip component ─────────────────────────────────────────────────────────
function Tooltip({ children, lines }) {
  const [show, setShow] = useState(false);
  if (!lines || lines.length === 0) return <span>{children}</span>;
  return (
    <span
      style={{ position: "relative", display: "inline-block", cursor: "help" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{ borderBottom: "1px dotted #555", color: "#888", fontSize: 11 }}>{children}</span>
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", right: 0,
          background: "#1a1610", border: "1px solid rgba(255,215,0,0.2)",
          borderRadius: 8, padding: "8px 12px", zIndex: 99,
          minWidth: 140, boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
          whiteSpace: "nowrap",
        }}>
          {lines.map((l, i) => (
            <div key={i} style={{ fontSize: 12, color: "#ccc", lineHeight: 1.7 }}>{l}</div>
          ))}
          <div style={{
            position: "absolute", bottom: -5, right: 10,
            width: 8, height: 8, background: "#1a1610",
            border: "1px solid rgba(255,215,0,0.2)",
            borderTop: "none", borderLeft: "none",
            transform: "rotate(45deg)",
          }} />
        </div>
      )}
    </span>
  );
}

// ── Small components ──────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 4,
      fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
      background: `${ROLE_COLORS[role] || "#888"}22`, color: ROLE_COLORS[role] || "#888",
      border: `1px solid ${ROLE_COLORS[role] || "#888"}55`,
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
        <input
          value={value}
          onChange={e => !locked && onChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !locked && value.trim()) onLock(); }}
          placeholder="e.g. K o o k i e"
          disabled={locked}
          style={{
            ...inputStyle, flex: 1,
            opacity: locked ? 0.7 : 1,
            borderColor: locked ? "rgba(245,197,66,0.4)" : "rgba(255,255,255,0.13)",
          }}
        />
        <button
          onClick={locked ? onUnlock : onLock}
          disabled={!locked && !value.trim()}
          style={{
            padding: "9px 16px", borderRadius: 8, cursor: "pointer",
            background: locked ? "rgba(245,197,66,0.2)" : "rgba(255,255,255,0.07)",
            color: locked ? "#f5c542" : "#888", fontWeight: 700, fontSize: 16, flexShrink: 0,
            border: locked ? "1px solid rgba(245,197,66,0.4)" : "1px solid rgba(255,255,255,0.1)",
            transition: "all 0.2s",
          }}
          title={locked ? "Click to change username" : "Lock in username"}
        >
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

// ── Voting Form (Staff Poll) ───────────────────────────────────────────────────
function VotingForm({ pollData, onRefresh }) {
  const [voterName, setVoterName] = useState("");
  const [locked, setLocked]       = useState(false);
  const [picks, setPicks]         = useState({});
  const [feedback, setFeedback]   = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  const isSelfFn = (username) =>
    voterName.trim().toLowerCase() === username.toLowerCase() && voterName.trim() !== "";

  const pick = (username, role) => {
    if (isSelfFn(username)) return;
    setPicks(p => ({ ...p, [username]: role }));
  };

  const allPicked = pollData.staff.every(m => isSelfFn(m.username) || picks[m.username]);

  const handleSubmit = async () => {
    if (!voterName.trim()) { setError("Please enter your username."); return; }
    if (!locked) { setError("Please lock in your username first (click ⏎)."); return; }
    if (!allPicked) { setError("Please cast a vote for every staff member."); return; }
    if (!feedback.trim()) { setError("Please fill in the feedback box before submitting."); return; }
    setLoading(true); setError("");
    const res = await apiFetch("/api/vote", {
      method: "POST",
      body: { voterName: voterName.trim(), votes: picks, feedback: feedback.trim() },
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
      <p style={{ color: "#888", fontSize: 14 }}>Your vote for Staff Poll #{pollData.pollNumber} has been saved.</p>
    </div>
  );

  return (
    <div>
      <UsernameInput
        value={voterName} locked={locked}
        onChange={v => { setVoterName(v); setPicks(p => { const n = {...p}; delete n[v]; return n; }); }}
        onLock={() => voterName.trim() && setLocked(true)}
        onUnlock={() => setLocked(false)}
      />
      <p style={{ color: "#666", fontSize: 13, marginBottom: 18 }}>
        Select one choice per staff member.
      </p>

      {pollData.staff.map(m => {
        const isSelf = isSelfFn(m.username);
        return (
          <div key={m.username} style={{ ...cardStyle, position: "relative" }}>
            {isSelf && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center",
                justifyContent: "center", borderRadius: 10, zIndex: 2,
                background: "rgba(0,0,0,0.6)", fontSize: 12, color: "#666", letterSpacing: 1,
              }}>
                You cannot vote for yourself
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, opacity: isSelf ? 0.3 : 1 }}>
              <span style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 15, color: "#e8d5a3" }}>
                {m.username}
              </span>
              <RoleBadge role={m.currentRole} />
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", opacity: isSelf ? 0.3 : 1 }}>
              {ROLES.map(role => {
                const selected = picks[m.username] === role;
                return (
                  <button key={role} onClick={() => pick(m.username, role)}
                    disabled={isSelf}
                    style={{
                      padding: "8px 18px", borderRadius: 8,
                      border: `2px solid ${selected ? ROLE_COLORS[role] : "rgba(255,255,255,0.1)"}`,
                      background: selected ? `${ROLE_COLORS[role]}22` : "rgba(255,255,255,0.03)",
                      color: selected ? ROLE_COLORS[role] : "#888",
                      fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 12,
                      cursor: isSelf ? "not-allowed" : "pointer", letterSpacing: 1,
                      transition: "all 0.15s",
                      boxShadow: selected ? `0 0 12px ${ROLE_COLORS[role]}44` : "none",
                    }}>{role}</button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── Feedback box ── */}
      <div style={{ marginTop: 8, marginBottom: 20 }}>
        <label style={labelStyle}>Vote Feedback <span style={{ color: "#ff8888", fontSize: 10 }}>* required</span></label>
        <textarea
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          rows={4}
          placeholder="Explain any vote results here. Your message will be reworded if the player wishes to receive this feedback. Type N/A if not applicable."
          style={{
            ...inputStyle, resize: "vertical", fontFamily: "'Crimson Pro', serif", fontSize: 13,
            lineHeight: 1.6,
            borderColor: !feedback.trim() ? "rgba(255,100,100,0.25)" : "rgba(255,255,255,0.13)",
          }}
        />
      </div>

      {error && <div style={errorStyle}>⚠ {error}</div>}
      <button onClick={handleSubmit} disabled={loading} style={submitBtnStyle}>
        {loading ? "Submitting…" : "Submit Vote"}
      </button>
    </div>
  );
}

// ── Staff Applicants Form ─────────────────────────────────────────────────────
function ApplicantsForm({ pollData, onRefresh }) {
  const [voterName, setVoterName] = useState("");
  const [locked, setLocked]       = useState(false);
  const [picks, setPicks]         = useState([]); // up to 3 names
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  const applicants = (pollData.applicants || {}).candidates || [];
  const MAX_PICKS = 3;

  const isSelfFn = (name) =>
    voterName.trim().toLowerCase() === name.toLowerCase() && voterName.trim() !== "";

  const handleNameChange = (v) => {
    setVoterName(v);
    const lower = v.trim().toLowerCase();
    setPicks(p => p.filter(n => n.toLowerCase() !== lower));
  };

  const togglePick = (name) => {
    if (isSelfFn(name)) return;
    setPicks(p => {
      if (p.includes(name)) return p.filter(n => n !== name);
      if (p.length >= MAX_PICKS) return p;
      return [...p, name];
    });
  };

  const handleSubmit = async () => {
    if (!voterName.trim()) { setError("Please enter your username."); return; }
    if (!locked) { setError("Please lock in your username first (press Enter or click ⏎)."); return; }
    if (picks.length === 0) { setError("Please select at least one applicant."); return; }
    setLoading(true); setError("");
    const res = await apiFetch("/api/applicant-vote", {
      method: "POST",
      body: { voterName: voterName.trim(), picks },
    });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setSubmitted(true);
    onRefresh();
  };

  if (submitted) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>📋</div>
      <h2 style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontSize: 22, marginBottom: 8 }}>Applicant Vote Recorded</h2>
      <p style={{ color: "#888", fontSize: 14 }}>Thanks for your input!</p>
    </div>
  );

  if (applicants.length === 0) return (
    <div style={{ textAlign: "center", padding: "50px 20px", color: "#555", fontSize: 14 }}>
      No applicants are currently listed for voting.
    </div>
  );

  return (
    <div>
      <UsernameInput
        value={voterName} locked={locked}
        onChange={handleNameChange}
        onLock={() => voterName.trim() && setLocked(true)}
        onUnlock={() => { setLocked(false); setPicks([]); }}
      />

      <div style={{ marginBottom: 16 }}>
        <div style={sectionHeaderStyle}>📋 Staff Applicants</div>
        <p style={{ color: "#666", fontSize: 13, marginBottom: 14 }}>
          Select up to <strong style={{ color: "#ccc" }}>3 applicants</strong> you think should be considered for staff.
          At least one selection is required.
        </p>

        {/* pick count summary */}
        <div style={{ marginBottom: 14, fontSize: 12, color: picks.length > 0 ? "#f5c542" : "#555" }}>
          {picks.length === 0 ? "No selections yet" : `${picks.length} / ${MAX_PICKS} selected`}
          {picks.length > 0 && <span style={{ color: "#666" }}> — {picks.join(", ")}</span>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {applicants.map(name => {
            const isSelf    = isSelfFn(name);
            const selected  = picks.includes(name);
            const full      = !selected && picks.length >= MAX_PICKS;
            return (
              <button
                key={name}
                onClick={() => togglePick(name)}
                disabled={isSelf || full}
                style={{
                  padding: "11px 18px", borderRadius: 9, textAlign: "left",
                  border: `2px solid ${selected ? "#60a5fa" : isSelf || full ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.1)"}`,
                  background: selected ? "rgba(96,165,250,0.12)" : isSelf || full ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)",
                  color: isSelf ? "#444" : full ? "#555" : selected ? "#60a5fa" : "#ccc",
                  fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 13,
                  cursor: isSelf || full ? "not-allowed" : "pointer", letterSpacing: 0.5,
                  transition: "all 0.15s",
                  boxShadow: selected ? "0 0 14px rgba(96,165,250,0.2)" : "none",
                  display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
                }}
              >
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

// ── MVP Poll Form ─────────────────────────────────────────────────────────────
function MvpForm({ pollData, onRefresh }) {
  const [voterName, setVoterName]   = useState("");
  const [locked, setLocked]         = useState(false);
  const [staffRanks, setStaffRanks] = useState([]);
  const [adminRanks, setAdminRanks] = useState([]);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);

  const mvp        = pollData.mvp || {};
  const monthLabel = mvp.month ? `${mvp.month} ` : "";

  const isSelfFn = (name) =>
    voterName.trim().toLowerCase() === name.toLowerCase() && voterName.trim() !== "";

  const handleRankClick = (name, ranks, setRanks, maxPicks) => {
    if (isSelfFn(name)) return;
    const idx = ranks.indexOf(name);
    if (idx !== -1) setRanks(ranks.filter((_, i) => i !== idx));
    else if (ranks.length < maxPicks) setRanks([...ranks, name]);
  };

  const handleNameChange = (v) => {
    setVoterName(v);
    const lower = v.trim().toLowerCase();
    setStaffRanks(r => r.filter(n => n.toLowerCase() !== lower));
    setAdminRanks(r => r.filter(n => n.toLowerCase() !== lower));
  };

  const handleSubmit = async () => {
    if (!voterName.trim()) { setError("Please enter your username."); return; }
    if (!locked) { setError("Please lock in your username first (press Enter or click ⏎)."); return; }
    if (mvp.staffEnabled && staffRanks.length === 0) { setError("Please pick at least one Staff MVP."); return; }
    if (mvp.adminEnabled && adminRanks.length === 0) { setError("Please pick at least one Admin MVP."); return; }
    setLoading(true); setError("");
    const res = await apiFetch("/api/mvp-vote", {
      method: "POST",
      body: { voterName: voterName.trim(), staffRanks, adminRanks },
    });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setSubmitted(true);
    onRefresh();
  };

  if (submitted) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>🏆</div>
      <h2 style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontSize: 22, marginBottom: 8 }}>MVP Vote Recorded</h2>
      <p style={{ color: "#888", fontSize: 14 }}>Thanks for voting!</p>
    </div>
  );

  const RankBtn = ({ name, ranks, setRanks, maxPicks, pointsArr }) => {
    const isSelf  = isSelfFn(name);
    const rankIdx = ranks.indexOf(name);
    const picked  = rankIdx !== -1;
    const rank    = rankIdx + 1;
    const full    = !picked && ranks.length >= maxPicks;
    const color   = picked ? RANK_COLORS[rankIdx] : null;
    return (
      <button
        onClick={() => handleRankClick(name, ranks, setRanks, maxPicks)}
        disabled={isSelf || full}
        style={{
          padding: "11px 18px", borderRadius: 9, textAlign: "left",
          border: `2px solid ${picked ? color : isSelf || full ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.1)"}`,
          background: picked ? `${color}18` : isSelf || full ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)",
          color: isSelf ? "#444" : full ? "#555" : picked ? color : "#ccc",
          fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 13,
          cursor: isSelf || full ? "not-allowed" : "pointer", letterSpacing: 0.5,
          transition: "all 0.15s",
          boxShadow: picked ? `0 0 14px ${color}33` : "none",
          display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
        }}
      >
        <span>{name}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isSelf && <span style={{ fontSize: 11, color: "#555", fontWeight: 400 }}>yourself</span>}
          {full && !isSelf && <span style={{ fontSize: 11, color: "#555", fontWeight: 400 }}>max reached</span>}
          {picked && (
            <span style={{
              background: color, color: "#1a1200", borderRadius: 6,
              padding: "2px 10px", fontSize: 12, fontWeight: 900, minWidth: 28, textAlign: "center",
            }}>
              #{rank} · {pointsArr[rankIdx]}pt{pointsArr[rankIdx] !== 1 ? "s" : ""}
            </span>
          )}
        </span>
      </button>
    );
  };

  return (
    <div>
      <UsernameInput
        value={voterName} locked={locked}
        onChange={handleNameChange}
        onLock={() => voterName.trim() && setLocked(true)}
        onUnlock={() => { setLocked(false); setStaffRanks([]); setAdminRanks([]); }}
      />

      {mvp.staffEnabled && (
        <div style={{ marginBottom: 28 }}>
          <div style={sectionHeaderStyle}>⭐ {monthLabel}Staff MVP</div>
          <p style={{ color: "#666", fontSize: 13, marginBottom: 14 }}>
            Rank up to <strong style={{ color: "#ccc" }}>3 staff members</strong>. #1 = 3pts, #2 = 2pts, #3 = 1pt.
            Click a selected name again to deselect.
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, minHeight: 28 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                padding: "3px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                border: `1px solid ${staffRanks[i] ? RANK_COLORS[i] : "rgba(255,255,255,0.08)"}`,
                color: staffRanks[i] ? RANK_COLORS[i] : "#444",
                background: staffRanks[i] ? `${RANK_COLORS[i]}15` : "transparent",
              }}>
                {staffRanks[i] ? `#${i+1} ${staffRanks[i]}` : `#${i+1} —`}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(mvp.staffCandidates || []).map(name => (
              <RankBtn key={name} name={name} ranks={staffRanks} setRanks={setStaffRanks} maxPicks={3} pointsArr={STAFF_POINTS} />
            ))}
          </div>
        </div>
      )}

      {mvp.adminEnabled && (
        <div style={{ marginBottom: 28 }}>
          <div style={sectionHeaderStyle}>👑 {monthLabel}Admin MVP</div>
          <p style={{ color: "#666", fontSize: 13, marginBottom: 14 }}>
            Rank up to <strong style={{ color: "#ccc" }}>2 admins</strong>. #1 = 3pts, #2 = 2pts.
            Click a selected name again to deselect.
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, minHeight: 28 }}>
            {[0,1].map(i => (
              <div key={i} style={{
                padding: "3px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                border: `1px solid ${adminRanks[i] ? RANK_COLORS[i] : "rgba(255,255,255,0.08)"}`,
                color: adminRanks[i] ? RANK_COLORS[i] : "#444",
                background: adminRanks[i] ? `${RANK_COLORS[i]}15` : "transparent",
              }}>
                {adminRanks[i] ? `#${i+1} ${adminRanks[i]}` : `#${i+1} —`}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(mvp.adminCandidates || []).map(name => (
              <RankBtn key={name} name={name} ranks={adminRanks} setRanks={setAdminRanks} maxPicks={2} pointsArr={ADMIN_POINTS} />
            ))}
          </div>
        </div>
      )}

      {!mvp.staffEnabled && !mvp.adminEnabled && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#555", fontSize: 14 }}>
          MVP voting is not currently active.
        </div>
      )}

      {(mvp.staffEnabled || mvp.adminEnabled) && (
        <>
          {error && <div style={errorStyle}>⚠ {error}</div>}
          <button onClick={handleSubmit} disabled={loading} style={submitBtnStyle}>
            {loading ? "Submitting…" : `Submit ${monthLabel}MVP Vote`}
          </button>
        </>
      )}
    </div>
  );
}

// ── Tally helpers ─────────────────────────────────────────────────────────────
function tally(staff, votes) {
  return staff.map(m => {
    const totals = {};
    const votersByRole = {};
    let count = 0;
    for (const [voter, v] of Object.entries(votes)) {
      const role = v[m.username];
      if (!role) continue;
      count++;
      totals[role] = (totals[role] || 0) + 1;
      if (!votersByRole[role]) votersByRole[role] = [];
      votersByRole[role].push(voter);
    }
    const pcts = {};
    for (const [r, n] of Object.entries(totals)) pcts[r] = Math.round((n / count) * 100);
    return { ...m, pcts, count, votersByRole };
  });
}

function tallyMvp(candidates, votes, ranksKey, pointsArr) {
  const points = {};
  const voteCounts = {};
  const voterDetails = {};
  for (const name of candidates) { points[name] = 0; voteCounts[name] = 0; voterDetails[name] = []; }
  for (const [voter, v] of Object.entries(votes)) {
    const ranks = v[ranksKey] || [];
    ranks.forEach((name, idx) => {
      if (points[name] !== undefined) {
        points[name] += pointsArr[idx] || 0;
        voteCounts[name]++;
        voterDetails[name].push(`${voter} (#${idx+1} · ${pointsArr[idx]}pt${pointsArr[idx]!==1?"s":""})`);
      }
    });
  }
  const totalPts = Object.values(points).reduce((a, b) => a + b, 0);
  return Object.entries(points)
    .map(([name, pts]) => ({ name, pts, votes: voteCounts[name], voterDetails: voterDetails[name], pct: totalPts ? Math.round((pts / totalPts) * 100) : 0 }))
    .sort((a, b) => b.pts - a.pts);
}

function tallyApplicants(candidates, votes) {
  const counts = {};
  const voters = {};
  for (const name of candidates) { counts[name] = 0; voters[name] = []; }
  for (const [voter, v] of Object.entries(votes)) {
    for (const name of (v.picks || [])) {
      if (counts[name] !== undefined) { counts[name]++; voters[name].push(voter); }
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return Object.entries(counts)
    .map(([name, n]) => ({ name, count: n, voters: voters[name], pct: total ? Math.round((n / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
}

// ── Results Panel ─────────────────────────────────────────────────────────────
function ResultsPanel({ pollData }) {
  const [copied, setCopied] = useState(false);
  const [changes, setChanges] = useState("");
  const [expandedFeedback, setExpandedFeedback] = useState(false);
  const tallied = tally(pollData.staff, pollData.votes);
  const allVoters = Object.keys(pollData.votes);

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
          .filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
          .map(([r, v]) => `${v}% ${r}`).join("  ");
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

  // Collect feedback entries: { voter, feedback }[]
  const feedbackEntries = Object.entries(pollData.votes)
    .map(([voter, v]) => ({ voter, feedback: v.__feedback__ }))
    .filter(e => e.feedback && e.feedback.trim() && e.feedback.trim().toUpperCase() !== "N/A");

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <Tooltip lines={allVoters.length ? allVoters.map(v => `• ${v}`) : ["No votes yet"]}>
          {allVoters.length} vote(s) recorded
        </Tooltip>
      </div>

      {tallied.map(m => (
        <div key={m.username} style={{ ...cardStyle, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontWeight: 700 }}>@{m.username}</span>
            <RoleBadge role={m.currentRole} />
            <span style={{ marginLeft: "auto" }}>
              <Tooltip lines={m.count ? allVoters.map(v => {
                const role = (pollData.votes[v] || {})[m.username];
                return role ? `${v} → ${role}` : null;
              }).filter(Boolean) : ["No votes yet"]}>
                {m.count} vote(s)
              </Tooltip>
            </span>
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

      {/* ── Feedback section ── */}
      {feedbackEntries.length > 0 && (
        <div style={{ marginTop: 20, marginBottom: 20 }}>
          <button
            onClick={() => setExpandedFeedback(e => !e)}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 8, cursor: "pointer",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#aaa", fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 12,
              letterSpacing: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <span>💬 Voter Feedback ({feedbackEntries.length})</span>
            <span>{expandedFeedback ? "▲" : "▼"}</span>
          </button>
          {expandedFeedback && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {feedbackEntries.map(({ voter, feedback }) => (
                <div key={voter} style={{
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 8, padding: "10px 14px",
                }}>
                  <div style={{ fontSize: 11, color: "#f5c542", fontFamily: "'Cinzel',serif", marginBottom: 5 }}>
                    {voter}
                  </div>
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
      <button onClick={copy} style={{
        ...submitBtnStyle,
        background: copied ? "linear-gradient(135deg,#166534,#4ade80)" : "linear-gradient(135deg,#b8860b,#ffd700)",
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

// ── Applicant Results Panel ────────────────────────────────────────────────────
function ApplicantResultsPanel({ pollData }) {
  const applicants  = pollData.applicants || {};
  const candidates  = applicants.candidates || [];
  const appVotes    = pollData.applicantVotes || {};
  const totalVoters = Object.keys(appVotes).length;
  const results     = tallyApplicants(candidates, appVotes);

  if (candidates.length === 0) return (
    <div style={{ textAlign: "center", padding: "30px 0", color: "#555", fontSize: 14 }}>
      No applicant candidates configured.
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Tooltip lines={totalVoters ? Object.keys(appVotes).map(v => `• ${v}`) : ["No votes yet"]}>
          {totalVoters} vote(s) recorded
        </Tooltip>
      </div>
      {results.map((r, i) => (
        <div key={r.name} style={{ ...cardStyle, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontFamily: "'Cinzel',serif", fontSize: 18,
            color: i === 0 ? "#60a5fa" : "#555", width: 24, flexShrink: 0,
          }}>
            {i === 0 ? "★" : `${i + 1}`}
          </span>
          <span style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontWeight: 700, flex: 1 }}>{r.name}</span>
          <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: 14, marginRight: 8 }}>{r.pct}%</span>
          <Tooltip lines={r.voters.length ? r.voters.map(v => `• ${v}`) : ["No votes yet"]}>
            {r.count} vote(s)
          </Tooltip>
        </div>
      ))}
    </div>
  );
}

// ── MVP Results Panel ─────────────────────────────────────────────────────────
function MvpResultsPanel({ pollData }) {
  const mvp         = pollData.mvp || {};
  const mvpVotes    = pollData.mvpVotes || {};
  const totalVoters = Object.keys(mvpVotes).length;
  const monthLabel  = mvp.month ? `${mvp.month} ` : "";
  const staffResults = tallyMvp(mvp.staffCandidates || [], mvpVotes, "staffRanks", STAFF_POINTS);
  const adminResults = tallyMvp(mvp.adminCandidates || [], mvpVotes, "adminRanks", ADMIN_POINTS);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Tooltip lines={totalVoters ? Object.keys(mvpVotes).map(v => `• ${v}`) : ["No votes yet"]}>
          {totalVoters} MVP vote(s) recorded
        </Tooltip>
      </div>
      {mvp.staffEnabled && (
        <div style={{ marginBottom: 24 }}>
          <div style={sectionHeaderStyle}>⭐ {monthLabel}Staff MVP</div>
          {staffResults.map((r, i) => (
            <div key={r.name} style={{ ...cardStyle, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color: RANK_COLORS[i] || "#555", width: 24, flexShrink: 0 }}>
                {i === 0 ? "★" : `${i + 1}`}
              </span>
              <span style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontWeight: 700, flex: 1 }}>{r.name}</span>
              <span style={{ color: "#f5c542", fontWeight: 700, fontSize: 14, marginRight: 8 }}>{r.pts} pts</span>
              <Tooltip lines={r.voterDetails.length ? r.voterDetails.map(d => `• ${d}`) : ["No votes yet"]}>
                {r.votes} vote(s)
              </Tooltip>
            </div>
          ))}
        </div>
      )}
      {mvp.adminEnabled && (
        <div style={{ marginBottom: 24 }}>
          <div style={sectionHeaderStyle}>👑 {monthLabel}Admin MVP</div>
          {adminResults.map((r, i) => (
            <div key={r.name} style={{ ...cardStyle, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color: RANK_COLORS[i] || "#555", width: 24, flexShrink: 0 }}>
                {i === 0 ? "★" : `${i + 1}`}
              </span>
              <span style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontWeight: 700, flex: 1 }}>{r.name}</span>
              <span style={{ color: "#f5c542", fontWeight: 700, fontSize: 14, marginRight: 8 }}>{r.pts} pts</span>
              <Tooltip lines={r.voterDetails.length ? r.voterDetails.map(d => `• ${d}`) : ["No votes yet"]}>
                {r.votes} vote(s)
              </Tooltip>
            </div>
          ))}
        </div>
      )}
      {!mvp.staffEnabled && !mvp.adminEnabled && (
        <div style={{ textAlign: "center", padding: "30px 0", color: "#555", fontSize: 14 }}>MVP voting is not enabled.</div>
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
      <div style={{
        position: "absolute", top: 3, left: value ? 22 : 3,
        width: 16, height: 16, borderRadius: "50%",
        background: value ? "#f5c542" : "#666", transition: "all 0.2s",
      }} />
    </div>
  );
}

// ── Admin Settings Panel ──────────────────────────────────────────────────────
function SettingsPanel({ pollData, adminPassword, onRefresh }) {
  const [pollNumber, setPollNumber]           = useState(pollData.pollNumber);
  const [staff, setStaff]                     = useState(pollData.staff.map(m => ({ ...m })));
  const [newUser, setNewUser]                 = useState("");
  const [newRole, setNewRole]                 = useState("Support");
  const mvp0 = pollData.mvp || {};
  const app0 = pollData.applicants || {};
  const [mvpMonth, setMvpMonth]               = useState(mvp0.month || "");
  const [staffEnabled, setStaffEnabled]       = useState(!!mvp0.staffEnabled);
  const [adminEnabled, setAdminEnabled]       = useState(!!mvp0.adminEnabled);
  const [staffCandidates, setStaffCandidates] = useState(mvp0.staffCandidates || []);
  const [adminCandidates, setAdminCandidates] = useState(mvp0.adminCandidates || []);
  const [newStaffName, setNewStaffName]       = useState("");
  const [newAdminName, setNewAdminName]       = useState("");
  // Applicant settings
  const [appCandidates, setAppCandidates]     = useState(app0.candidates || []);
  const [newAppName, setNewAppName]           = useState("");
  const [saving, setSaving]                   = useState(false);
  const [msg, setMsg]                         = useState("");

  const monthPreview = mvpMonth.trim() ? `${mvpMonth.trim()} ` : "";

  const save = async () => {
    setSaving(true); setMsg("");
    const res = await apiFetch("/api/admin/settings", {
      method: "PUT",
      body: {
        adminPassword, pollNumber: Number(pollNumber), staff,
        mvp: { month: mvpMonth.trim(), staffEnabled, adminEnabled, staffCandidates, adminCandidates },
        applicants: { candidates: appCandidates },
      },
    });
    setSaving(false);
    if (res.error) { setMsg("❌ " + res.error); return; }
    setMsg("✓ Saved!"); onRefresh(); setTimeout(() => setMsg(""), 2000);
  };

  const addMember       = () => { if (!newUser.trim()) return; setStaff(s => [...s, { username: newUser.trim(), currentRole: newRole }]); setNewUser(""); };
  const removeMember    = i  => setStaff(s => s.filter((_, idx) => idx !== i));
  const updateMember    = (i, f, v) => setStaff(s => s.map((m, idx) => idx === i ? { ...m, [f]: v } : m));
  const addStaffCand    = () => { if (!newStaffName.trim()) return; setStaffCandidates(c => [...c, newStaffName.trim()]); setNewStaffName(""); };
  const removeStaffCand = i  => setStaffCandidates(c => c.filter((_, idx) => idx !== i));
  const addAdminCand    = () => { if (!newAdminName.trim()) return; setAdminCandidates(c => [...c, newAdminName.trim()]); setNewAdminName(""); };
  const removeAdminCand = i  => setAdminCandidates(c => c.filter((_, idx) => idx !== i));
  const addAppCand      = () => { if (!newAppName.trim()) return; setAppCandidates(c => [...c, newAppName.trim()]); setNewAppName(""); };
  const removeAppCand   = i  => setAppCandidates(c => c.filter((_, idx) => idx !== i));

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <label style={labelStyle}>Poll Number</label>
        <input type="number" value={pollNumber} onChange={e => setPollNumber(e.target.value)} style={{ ...inputStyle, width: 100 }} />
      </div>

      <label style={labelStyle}>Staff Members</label>
      <div style={{ marginBottom: 16 }}>
        {staff.map((m, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <input value={m.username} onChange={e => updateMember(i, "username", e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            <select value={m.currentRole} onChange={e => updateMember(i, "currentRole", e.target.value)} style={{ ...inputStyle, width: 130 }}>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
            <button onClick={() => removeMember(i)} style={removeBtnStyle}>✕</button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        <input value={newUser} onChange={e => setNewUser(e.target.value)} placeholder="New username"
          style={{ ...inputStyle, flex: 1 }} onKeyDown={e => e.key === "Enter" && addMember()} />
        <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ ...inputStyle, width: 130 }}>
          {ROLES.map(r => <option key={r}>{r}</option>)}
        </select>
        <button onClick={addMember} style={addBtnStyle}>+ Add</button>
      </div>

      {/* ── Applicants Settings ── */}
      <div style={{ borderTop: "1px solid rgba(255,215,0,0.12)", paddingTop: 24, marginBottom: 8 }}>
        <div style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontSize: 15, fontWeight: 700, marginBottom: 18, letterSpacing: 1 }}>
          📋 Staff Applicants
        </div>
        <div style={{ marginBottom: 10 }}>
          {appCandidates.map((name, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ flex: 1, color: "#ccc", fontSize: 14, paddingLeft: 4 }}>{name}</span>
              <button onClick={() => removeAppCand(i)} style={removeBtnStyle}>✕</button>
            </div>
          ))}
          {appCandidates.length === 0 && (
            <div style={{ color: "#555", fontSize: 13, paddingLeft: 4, marginBottom: 8 }}>No applicants listed yet.</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
          <input value={newAppName} onChange={e => setNewAppName(e.target.value)} placeholder="Add applicant name"
            style={{ ...inputStyle, flex: 1 }} onKeyDown={e => e.key === "Enter" && addAppCand()} />
          <button onClick={addAppCand} style={addBtnStyle}>+ Add</button>
        </div>
      </div>

      {/* ── MVP Settings ── */}
      <div style={{ borderTop: "1px solid rgba(255,215,0,0.12)", paddingTop: 24, marginBottom: 8 }}>
        <div style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontSize: 15, fontWeight: 700, marginBottom: 18, letterSpacing: 1 }}>
          🏆 MVP Poll Settings
        </div>
        <div style={{ marginBottom: 22 }}>
          <label style={labelStyle}>Month</label>
          <input value={mvpMonth} onChange={e => setMvpMonth(e.target.value)} placeholder="e.g. March"
            style={{ ...inputStyle, width: "100%" }} />
          {mvpMonth.trim() && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#888" }}>
              Preview: <span style={{ color: "#f5c542" }}>{monthPreview}MVP Poll</span>
              {" · "}<span style={{ color: "#a8b2c0" }}>{monthPreview}Staff MVP</span>
              {" · "}<span style={{ color: "#a8b2c0" }}>{monthPreview}Admin MVP</span>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Staff MVP Section</label>
            <ToggleSwitch value={staffEnabled} onChange={setStaffEnabled} />
            <span style={{ fontSize: 11, color: staffEnabled ? "#4ade80" : "#666" }}>{staffEnabled ? "ON" : "OFF"}</span>
          </div>
          {staffEnabled && (
            <>
              <div style={{ marginBottom: 10 }}>
                {staffCandidates.map((name, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ flex: 1, color: "#ccc", fontSize: 14, paddingLeft: 4 }}>{name}</span>
                    <button onClick={() => removeStaffCand(i)} style={removeBtnStyle}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={newStaffName} onChange={e => setNewStaffName(e.target.value)}
                  placeholder="Add candidate name" style={{ ...inputStyle, flex: 1 }}
                  onKeyDown={e => e.key === "Enter" && addStaffCand()} />
                <button onClick={addStaffCand} style={addBtnStyle}>+ Add</button>
              </div>
            </>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Admin MVP Section</label>
            <ToggleSwitch value={adminEnabled} onChange={setAdminEnabled} />
            <span style={{ fontSize: 11, color: adminEnabled ? "#4ade80" : "#666" }}>{adminEnabled ? "ON" : "OFF"}</span>
          </div>
          {adminEnabled && (
            <>
              <div style={{ marginBottom: 10 }}>
                {adminCandidates.map((name, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ flex: 1, color: "#ccc", fontSize: 14, paddingLeft: 4 }}>{name}</span>
                    <button onClick={() => removeAdminCand(i)} style={removeBtnStyle}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={newAdminName} onChange={e => setNewAdminName(e.target.value)}
                  placeholder="Add candidate name" style={{ ...inputStyle, flex: 1 }}
                  onKeyDown={e => e.key === "Enter" && addAdminCand()} />
                <button onClick={addAdminCand} style={addBtnStyle}>+ Add</button>
              </div>
            </>
          )}
        </div>
      </div>

      <button onClick={save} disabled={saving} style={submitBtnStyle}>{saving ? "Saving…" : "Save Settings"}</button>
      {msg && <div style={{ marginTop: 10, color: msg.startsWith("✓") ? "#4ade80" : "#f87171", fontSize: 13 }}>{msg}</div>}
    </div>
  );
}

// ── Admin Login Gate ──────────────────────────────────────────────────────────
function AdminPanel({ pollData, onRefresh }) {
  const [pw, setPw]               = useState("");
  const [unlocked, setUnlocked]   = useState(false);
  const [subTab, setSubTab]       = useState("results");
  const [resetting, setResetting] = useState(false);

  const unlock = () => { if (pw === ADMIN_PASSWORD) setUnlocked(true); else alert("Wrong password."); };

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
      <p style={{ color: "#888", marginBottom: 14, fontSize: 14 }}>Tyler access required</p>
      <input type="password" value={pw} onChange={e => setPw(e.target.value)}
        onKeyDown={e => e.key === "Enter" && unlock()}
        placeholder="Password" style={{ ...inputStyle, width: "100%", textAlign: "center", marginBottom: 12 }} />
      <button onClick={unlock} style={submitBtnStyle}>Unlock</button>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {[["results", "📊 Results"], ["applicants", "📋 Applicants"], ["mvp", "🏆 MVP"], ["settings", "⚙️ Settings"]].map(([k, label]) => (
          <button key={k} onClick={() => setSubTab(k)} style={{
            flex: 1, padding: "9px", borderRadius: 8, border: "none",
            background: subTab === k ? "rgba(184,134,11,0.25)" : "rgba(255,255,255,0.04)",
            color: subTab === k ? "#ffd700" : "#777",
            fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 11,
            cursor: "pointer", borderBottom: subTab === k ? "2px solid #b8860b" : "2px solid transparent",
            minWidth: 70,
          }}>{label}</button>
        ))}
        <button onClick={reset} disabled={resetting} style={{
          padding: "9px 12px", borderRadius: 8, border: "1px solid #ff4444",
          background: "#ff444415", color: "#ff8888",
          fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 11, cursor: "pointer", flexShrink: 0,
        }}>{resetting ? "…" : "🔄"}</button>
      </div>
      {subTab === "results"    && <ResultsPanel          pollData={pollData} />}
      {subTab === "applicants" && <ApplicantResultsPanel pollData={pollData} />}
      {subTab === "mvp"        && <MvpResultsPanel       pollData={pollData} />}
      {subTab === "settings"   && <SettingsPanel         pollData={pollData} adminPassword={pw} onRefresh={onRefresh} />}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const labelStyle      = { display: "block", color: "#aaa", fontSize: 11, marginBottom: 6, letterSpacing: 1.5, textTransform: "uppercase" };
const inputStyle      = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.13)", borderRadius: 8, color: "#e0e0e0", padding: "9px 13px", fontSize: 14 };
const cardStyle       = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 16px", marginBottom: 12 };
const errorStyle      = { background: "#ff444418", border: "1px solid #ff4444", borderRadius: 8, padding: "10px 14px", color: "#ff8888", fontSize: 13, marginBottom: 14 };
const submitBtnStyle  = { width: "100%", padding: "13px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#b8860b,#ffd700)", color: "#1a1200", fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 15, cursor: "pointer", letterSpacing: 1, transition: "all 0.3s" };
const removeBtnStyle  = { background: "#ff444422", border: "1px solid #ff4444", color: "#ff8888", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 13, flexShrink: 0 };
const addBtnStyle     = { background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)", color: "#ffd700", borderRadius: 8, padding: "8px 16px", fontFamily: "'Cinzel',serif", fontWeight: 700, cursor: "pointer", fontSize: 13, flexShrink: 0 };
const sectionHeaderStyle = { fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontSize: 14, fontWeight: 700, letterSpacing: 1, marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.07)" };

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

  const mvp = pollData.mvp || {};
  const applicants = pollData.applicants || {};
  const showMvpTab  = mvp.staffEnabled || mvp.adminEnabled;
  const showAppTab  = (applicants.candidates || []).length > 0;
  const monthLabel  = mvp.month ? `${mvp.month} ` : "";
  const mvpTabLabel = `🏆 ${monthLabel}MVP Poll`;

  const tabs = [
    ["vote",       "⚔ Cast Vote"],
    ...(showAppTab  ? [["applicants", "📋 Applicants"]] : []),
    ...(showMvpTab  ? [["mvp",        mvpTabLabel]]     : []),
    ["admin",      "👑 Admin"],
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Crimson+Pro:wght@300;400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d0b08; }
        input, textarea, select, button { font-family: 'Crimson Pro', serif; outline: none; }
        select option { background: #1a1610; }
        @keyframes float { 0%,100% { transform:translateY(0) translateX(0);opacity:.35; } 33% { transform:translateY(-28px) translateX(14px);opacity:.65; } 66% { transform:translateY(14px) translateX(-10px);opacity:.25; } }
        @keyframes fadeIn { from { opacity:0;transform:translateY(10px); } to { opacity:1;transform:translateY(0); } }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-thumb { background:rgba(255,215,0,.25);border-radius:3px; }
      `}</style>
      <Particles />
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", background: "radial-gradient(ellipse at 20% 10%, rgba(184,134,11,.07) 0%, transparent 60%), radial-gradient(ellipse at 80% 90%, rgba(59,130,246,.05) 0%, transparent 60%)", padding: "32px 16px 70px", fontFamily: "'Crimson Pro', serif", color: "#ccc" }}>
        <div style={{ maxWidth: 660, margin: "0 auto", animation: "fadeIn 0.55s ease" }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 30 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ position: "relative", display: "inline-block", flexShrink: 0 }}>
              <img
                src="data:image/png;base64,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"
                alt="Reason PS"
                style={{
                  width: 110, height: 110,
                  objectFit: "contain",
                  filter: "drop-shadow(0 0 18px rgba(184,60,20,0.55)) drop-shadow(0 0 6px rgba(255,140,0,0.3))",
                  mixBlendMode: "lighten",
                  opacity: 0.92,
                }}
              />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 11, letterSpacing: 4, color: "#b8860b", textTransform: "uppercase", marginBottom: 6 }}>Reason Private Server</div>
              <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 27, fontWeight: 900, color: "#e8d5a3", letterSpacing: 2, lineHeight: 1.2 }}>Staff Polls</h1>
              <div style={{ width: 60, height: 2, background: "linear-gradient(90deg,transparent,#b8860b,transparent)", marginTop: 10 }} />
            </div>
            </div>
          </div>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 4, marginBottom: 22, border: "1px solid rgba(255,255,255,0.07)" }}>
            {tabs.map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                flex: 1, padding: "10px", borderRadius: 7, border: "none",
                background: tab === key ? "rgba(184,134,11,.22)" : "transparent",
                color: tab === key ? "#ffd700" : "#777",
                fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 12,
                cursor: "pointer", borderBottom: tab === key ? "2px solid #b8860b" : "2px solid transparent",
                transition: "all .2s",
              }}>{label}</button>
            ))}
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,215,0,.1)", borderRadius: 16, padding: "24px 20px", boxShadow: "0 20px 60px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,215,0,.07)" }}>
            {tab === "vote"       && <VotingForm    pollData={pollData} onRefresh={load} />}
            {tab === "applicants" && <ApplicantsForm pollData={pollData} onRefresh={load} />}
            {tab === "mvp"        && <MvpForm        pollData={pollData} onRefresh={load} />}
            {tab === "admin"      && <AdminPanel     pollData={pollData} onRefresh={load} />}
          </div>
        </div>
      </div>
    </>
  );
}
