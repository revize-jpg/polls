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
          placeholder="e.g. Kookie"
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
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  const pick = (username, role) => setPicks(p => ({ ...p, [username]: role }));
  const allPicked = pollData.staff.every(m => {
    const isSelf = locked && voterName.trim().toLowerCase() === m.username.toLowerCase();
    return isSelf || picks[m.username];
  });

  const handleSubmit = async () => {
    if (!voterName.trim()) { setError("Please enter your username."); return; }
    if (!locked) { setError("Please lock in your username first (click ⏎)."); return; }
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
      <UsernameInput
        value={voterName} locked={locked}
        onChange={setVoterName}
        onLock={() => voterName.trim() && setLocked(true)}
        onUnlock={() => setLocked(false)}
      />
      <p style={{ color: "#666", fontSize: 13, marginBottom: 18 }}>
        Select one role per staff member — your pick counts as their 100%.
      </p>

      {pollData.staff.map(m => {
        const isSelf = locked && voterName.trim().toLowerCase() === m.username.toLowerCase();
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
                  <button key={role} onClick={() => !isSelf && pick(m.username, role)}
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

      {error && <div style={errorStyle}>⚠ {error}</div>}
      <button onClick={handleSubmit} disabled={loading} style={submitBtnStyle}>
        {loading ? "Submitting…" : "Submit Vote"}
      </button>
    </div>
  );
}

// ── MVP Poll Form ─────────────────────────────────────────────────────────────
// staffRanks: ["Name1", "Name2", "Name3"]  (index 0 = #1 pick = 3pts)
// adminRanks: ["Name1", "Name2"]           (index 0 = #1 pick = 3pts)
const STAFF_POINTS = [3, 2, 1];
const ADMIN_POINTS = [3, 2];
const RANK_COLORS  = ["#f5c542", "#a8b2c0", "#cd7f32"]; // gold, silver, bronze

function MvpForm({ pollData, onRefresh }) {
  const [voterName, setVoterName] = useState("");
  const [locked, setLocked]       = useState(false);
  const [staffRanks, setStaffRanks] = useState([]); // ordered array of names
  const [adminRanks, setAdminRanks] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  const lowerVoter = voterName.trim().toLowerCase();
  const mvp = pollData.mvp || {};

  const handleRankClick = (name, ranks, setRanks, maxPicks) => {
    const idx = ranks.indexOf(name);
    if (idx !== -1) {
      // already picked — remove it and shift everything after it up
      setRanks(ranks.filter((_, i) => i !== idx));
    } else if (ranks.length < maxPicks) {
      // not yet picked and slots remain — add to end
      setRanks([...ranks, name]);
    }
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
    const isSelf  = locked && lowerVoter === name.toLowerCase();
    const rankIdx = ranks.indexOf(name);
    const picked  = rankIdx !== -1;
    const rank    = rankIdx + 1; // 1-based display
    const full    = !picked && ranks.length >= maxPicks;
    const color   = picked ? RANK_COLORS[rankIdx] : null;

    return (
      <button
        onClick={() => !isSelf && handleRankClick(name, ranks, setRanks, maxPicks)}
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
        onChange={setVoterName}
        onLock={() => voterName.trim() && setLocked(true)}
        onUnlock={() => { setLocked(false); setStaffRanks([]); setAdminRanks([]); }}
      />

      {mvp.staffEnabled && (
        <div style={{ marginBottom: 28 }}>
          <div style={sectionHeaderStyle}>⭐ Staff MVP</div>
          <p style={{ color: "#666", fontSize: 13, marginBottom: 14 }}>
            Rank up to <strong style={{ color: "#ccc" }}>3 staff members</strong>. #1 = 3pts, #2 = 2pts, #3 = 1pt.
            Click a selected name again to deselect.
          </p>
          {/* rank summary chips */}
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
          <div style={sectionHeaderStyle}>👑 Admin MVP</div>
          <p style={{ color: "#666", fontSize: 13, marginBottom: 14 }}>
            Rank up to <strong style={{ color: "#ccc" }}>2 admins</strong>. #1 = 3pts, #2 = 2pts.
            Click a selected name again to deselect.
          </p>
          {/* rank summary chips */}
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
            {loading ? "Submitting…" : "Submit MVP Vote"}
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

function tallyMvp(candidates, votes, ranksKey, pointsArr) {
  const points = {};
  const voteCounts = {};
  for (const name of candidates) { points[name] = 0; voteCounts[name] = 0; }
  for (const v of Object.values(votes)) {
    const ranks = v[ranksKey] || [];
    ranks.forEach((name, idx) => {
      if (points[name] !== undefined) {
        points[name] += pointsArr[idx] || 0;
        voteCounts[name]++;
      }
    });
  }
  const totalPts = Object.values(points).reduce((a, b) => a + b, 0);
  return Object.entries(points)
    .map(([name, pts]) => ({ name, pts, votes: voteCounts[name], pct: totalPts ? Math.round((pts / totalPts) * 100) : 0 }))
    .sort((a, b) => b.pts - a.pts);
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

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <span style={{ color: "#888", fontSize: 13 }}>{Object.keys(pollData.votes).length} vote(s) recorded</span>
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

// ── MVP Results Panel ─────────────────────────────────────────────────────────
function MvpResultsPanel({ pollData }) {
  const mvp = pollData.mvp || {};
  const mvpVotes = pollData.mvpVotes || {};
  const totalVoters = Object.keys(mvpVotes).length;
  const staffResults = tallyMvp(mvp.staffCandidates || [], mvpVotes, "staffRanks", STAFF_POINTS);
  const adminResults = tallyMvp(mvp.adminCandidates || [], mvpVotes, "adminRanks", ADMIN_POINTS);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <span style={{ color: "#888", fontSize: 13 }}>{totalVoters} MVP vote(s) recorded</span>
      </div>
      {mvp.staffEnabled && (
        <div style={{ marginBottom: 24 }}>
          <div style={sectionHeaderStyle}>⭐ Staff MVP</div>
          {staffResults.map((r, i) => (
            <div key={r.name} style={{ ...cardStyle, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color: RANK_COLORS[i] || "#555", width: 24, flexShrink: 0 }}>
                {i === 0 ? "★" : `${i + 1}`}
              </span>
              <span style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontWeight: 700, flex: 1 }}>{r.name}</span>
              <span style={{ color: "#f5c542", fontWeight: 700, fontSize: 14 }}>{r.pts} pts</span>
              <span style={{ color: "#555", fontSize: 11 }}>{r.votes} vote(s)</span>
            </div>
          ))}
        </div>
      )}
      {mvp.adminEnabled && (
        <div style={{ marginBottom: 24 }}>
          <div style={sectionHeaderStyle}>👑 Admin MVP</div>
          {adminResults.map((r, i) => (
            <div key={r.name} style={{ ...cardStyle, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color: RANK_COLORS[i] || "#555", width: 24, flexShrink: 0 }}>
                {i === 0 ? "★" : `${i + 1}`}
              </span>
              <span style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontWeight: 700, flex: 1 }}>{r.name}</span>
              <span style={{ color: "#f5c542", fontWeight: 700, fontSize: 14 }}>{r.pts} pts</span>
              <span style={{ color: "#555", fontSize: 11 }}>{r.votes} vote(s)</span>
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
  const [pollNumber, setPollNumber]             = useState(pollData.pollNumber);
  const [staff, setStaff]                       = useState(pollData.staff.map(m => ({ ...m })));
  const [newUser, setNewUser]                   = useState("");
  const [newRole, setNewRole]                   = useState("Support");
  const mvp0 = pollData.mvp || {};
  const [staffEnabled, setStaffEnabled]         = useState(!!mvp0.staffEnabled);
  const [adminEnabled, setAdminEnabled]         = useState(!!mvp0.adminEnabled);
  const [staffCandidates, setStaffCandidates]   = useState(mvp0.staffCandidates || []);
  const [adminCandidates, setAdminCandidates]   = useState(mvp0.adminCandidates || []);
  const [newStaffName, setNewStaffName]         = useState("");
  const [newAdminName, setNewAdminName]         = useState("");
  const [saving, setSaving]                     = useState(false);
  const [msg, setMsg]                           = useState("");

  const save = async () => {
    setSaving(true); setMsg("");
    const res = await apiFetch("/api/admin/settings", {
      method: "PUT",
      body: { adminPassword, pollNumber: Number(pollNumber), staff, mvp: { staffEnabled, adminEnabled, staffCandidates, adminCandidates } },
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

      {/* MVP Settings */}
      <div style={{ borderTop: "1px solid rgba(255,215,0,0.12)", paddingTop: 24, marginBottom: 8 }}>
        <div style={{ fontFamily: "'Cinzel',serif", color: "#e8d5a3", fontSize: 15, fontWeight: 700, marginBottom: 18, letterSpacing: 1 }}>
          🏆 MVP Poll Settings
        </div>

        {/* Staff MVP toggle + candidates */}
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

        {/* Admin MVP toggle + candidates */}
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
      <p style={{ color: "#888", marginBottom: 14, fontSize: 14 }}>Admin access required</p>
      <input type="password" value={pw} onChange={e => setPw(e.target.value)}
        onKeyDown={e => e.key === "Enter" && unlock()}
        placeholder="Password" style={{ ...inputStyle, width: "100%", textAlign: "center", marginBottom: 12 }} />
      <button onClick={unlock} style={submitBtnStyle}>Unlock</button>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[["results", "📊 Results"], ["mvp", "🏆 MVP"], ["settings", "⚙️ Settings"]].map(([k, label]) => (
          <button key={k} onClick={() => setSubTab(k)} style={{
            flex: 1, padding: "9px", borderRadius: 8, border: "none",
            background: subTab === k ? "rgba(184,134,11,0.25)" : "rgba(255,255,255,0.04)",
            color: subTab === k ? "#ffd700" : "#777",
            fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 11,
            cursor: "pointer", borderBottom: subTab === k ? "2px solid #b8860b" : "2px solid transparent",
          }}>{label}</button>
        ))}
        <button onClick={reset} disabled={resetting} style={{
          padding: "9px 12px", borderRadius: 8, border: "1px solid #ff4444",
          background: "#ff444415", color: "#ff8888",
          fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 11, cursor: "pointer", flexShrink: 0,
        }}>{resetting ? "…" : "🔄"}</button>
      </div>
      {subTab === "results"  && <ResultsPanel    pollData={pollData} />}
      {subTab === "mvp"      && <MvpResultsPanel pollData={pollData} />}
      {subTab === "settings" && <SettingsPanel   pollData={pollData} adminPassword={pw} onRefresh={onRefresh} />}
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
  const showMvpTab = mvp.staffEnabled || mvp.adminEnabled;
  const tabs = [["vote", "⚔ Cast Vote"], ...(showMvpTab ? [["mvp", "🏆 MVP Poll"]] : []), ["admin", "👑 Admin"]];

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
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <div style={{ fontSize: 11, letterSpacing: 4, color: "#b8860b", textTransform: "uppercase", marginBottom: 8 }}>Reason Private Server</div>
            <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 27, fontWeight: 900, color: "#e8d5a3", letterSpacing: 2, lineHeight: 1.2 }}>Staff Results #{pollData.pollNumber}</h1>
            <div style={{ width: 60, height: 2, background: "linear-gradient(90deg,transparent,#b8860b,transparent)", margin: "12px auto 0" }} />
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
            {tab === "vote"  && <VotingForm pollData={pollData} onRefresh={load} />}
            {tab === "mvp"   && <MvpForm   pollData={pollData} onRefresh={load} />}
            {tab === "admin" && <AdminPanel pollData={pollData} onRefresh={load} />}
          </div>
        </div>
      </div>
    </>
  );
}


