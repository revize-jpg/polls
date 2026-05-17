const express = require("express");
const cors    = require("cors");
const path    = require("path");
const { Pool } = require("pg");

const app  = express();
const PORT = process.env.PORT || 3001;

// ── PostgreSQL connection ─────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// ── Serve frontend build in production ───────────────────────────────────────
const FRONTEND_BUILD = path.join(__dirname, "../frontend/build");
const fs = require("fs");
if (fs.existsSync(FRONTEND_BUILD)) {
  app.use(express.static(FRONTEND_BUILD));
}

app.use(cors());
app.use(express.json());

// ── Default data ──────────────────────────────────────────────────────────────
const DEFAULT_DATA = {
  pollNumber: 29,
  staff: [
    { username: "I D C",       currentRole: "Support" },
    { username: "C4rdZ",       currentRole: "Support" },
    { username: "Baekhyeon",   currentRole: "Support" },
    { username: "Rg A",        currentRole: "Moderator" },
    { username: "Roadblock",   currentRole: "Moderator" },
    { username: "Rutte 95",    currentRole: "Moderator" },
    { username: "Sky H",       currentRole: "Moderator" },
    { username: "K o o k i e", currentRole: "Admin" },
    { username: "Bustable",    currentRole: "Admin" },
    { username: "Nois",        currentRole: "Admin" },
    { username: "Pinecone",    currentRole: "Admin" },
  ],
  // votes[voterKey] = { feedbacks: { [username]: string } }
  votes: {},
  voterNames: [],
  mvp: { staffEnabled: false, adminEnabled: false, staffCandidates: [], adminCandidates: [] },
  // mvpVotes[voterKey] = { staffPicks: [{name, feedback}], adminPicks: [{name, feedback}] }
  mvpVotes: {},
  mvpVoterNames: [],
  applicants: { candidates: [] },
  // applicantVotes[voterKey] = { picks: [{name, feedback}] }
  applicantVotes: {},
  applicantVoterNames: [],
};

// ── DB helpers ────────────────────────────────────────────────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS poll_state (
      id      INTEGER PRIMARY KEY DEFAULT 1,
      data    JSONB NOT NULL,
      updated TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  const { rowCount } = await pool.query("SELECT id FROM poll_state WHERE id = 1");
  if (rowCount === 0) {
    await pool.query(
      "INSERT INTO poll_state (id, data) VALUES (1, $1)",
      [JSON.stringify(DEFAULT_DATA)]
    );
    console.log("✅  Database seeded with default data");
  }
}

async function readData() {
  const { rows } = await pool.query("SELECT data FROM poll_state WHERE id = 1");
  if (!rows.length) return { ...DEFAULT_DATA };
  return rows[0].data;
}

async function writeData(data) {
  await pool.query(
    "UPDATE poll_state SET data = $1, updated = NOW() WHERE id = 1",
    [JSON.stringify(data)]
  );
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/poll — full state
app.get("/api/poll", async (req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /api/vote — submit staff feedback
// body: { voterName, feedbacks: { [username]: string } }
app.post("/api/vote", async (req, res) => {
  try {
    const { voterName, feedbacks } = req.body;
    if (!voterName || !feedbacks) return res.status(400).json({ error: "Missing fields" });

    const data = await readData();
    const key  = voterName.trim().toLowerCase();

    if (data.voterNames.includes(key))
      return res.status(409).json({ error: "You have already submitted feedback." });

    // Validate feedback for every staff member except self
    const REQUIRED_FIELDS = ["strengths", "weaknesses", "rank"];
    for (const m of data.staff) {
      if (m.username.toLowerCase() === key) continue;
      const fb = feedbacks[m.username] || {};
      for (const field of REQUIRED_FIELDS) {
        if (!fb[field] || !fb[field].trim())
          return res.status(400).json({ error: `Missing "${field}" feedback for ${m.username}` });
      }
    }

    data.votes[key] = { feedbacks };
    data.voterNames.push(key);
    await writeData(data);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /api/mvp-vote — submit MVP feedback
// body: { voterName, staffPicks: [{name, feedback}], adminPicks: [{name, feedback}] }
app.post("/api/mvp-vote", async (req, res) => {
  try {
    const { voterName, staffPicks, adminPicks } = req.body;
    if (!voterName) return res.status(400).json({ error: "Missing voterName" });

    const data = await readData();
    const key  = voterName.trim().toLowerCase();

    if ((data.mvpVoterNames || []).includes(key))
      return res.status(409).json({ error: "You have already submitted an MVP vote." });

    const mvp = data.mvp || {};

    // Validate: if section enabled, at least one pick with feedback
    if (mvp.staffEnabled) {
      const filled = (staffPicks || []).filter(p => p.name && p.name.trim());
      if (filled.length === 0) return res.status(400).json({ error: "Please enter at least one Staff MVP name." });
      const missing = filled.find(p => !p.feedback || !p.feedback.trim());
      if (missing) return res.status(400).json({ error: `Feedback required for Staff MVP "${missing.name}".` });
    }
    if (mvp.adminEnabled) {
      const filled = (adminPicks || []).filter(p => p.name && p.name.trim());
      if (filled.length === 0) return res.status(400).json({ error: "Please enter at least one Admin MVP name." });
      const missing = filled.find(p => !p.feedback || !p.feedback.trim());
      if (missing) return res.status(400).json({ error: `Feedback required for Admin MVP "${missing.name}".` });
    }

    if (!data.mvpVotes)      data.mvpVotes      = {};
    if (!data.mvpVoterNames) data.mvpVoterNames = [];

    data.mvpVotes[key] = {
      staffPicks: (staffPicks || []).filter(p => p.name && p.name.trim()).map(p => ({ name: p.name.trim(), feedback: (p.feedback || "").trim() })),
      adminPicks: (adminPicks || []).filter(p => p.name && p.name.trim()).map(p => ({ name: p.name.trim(), feedback: (p.feedback || "").trim() })),
    };
    data.mvpVoterNames.push(key);
    await writeData(data);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /api/applicant-vote — submit applicant feedback
// body: { voterName, picks: [{name, feedback}] }
app.post("/api/applicant-vote", async (req, res) => {
  try {
    const { voterName, picks } = req.body;
    if (!voterName || !Array.isArray(picks) || picks.length === 0)
      return res.status(400).json({ error: "Missing voterName or picks" });

    const data = await readData();
    const key  = voterName.trim().toLowerCase();

    if ((data.applicantVoterNames || []).includes(key))
      return res.status(409).json({ error: "You have already submitted an applicant vote." });

    // Validate each pick has a name and feedback
    const filled = picks.filter(p => p.name && p.name.trim());
    if (filled.length === 0) return res.status(400).json({ error: "Please enter at least one applicant name." });
    const missing = filled.find(p => !p.feedback || !p.feedback.trim());
    if (missing) return res.status(400).json({ error: `Feedback required for "${missing.name}".` });
    if (filled.length > 3) return res.status(400).json({ error: "Maximum 3 applicant picks allowed." });

    if (!data.applicantVotes)      data.applicantVotes      = {};
    if (!data.applicantVoterNames) data.applicantVoterNames = [];

    data.applicantVotes[key] = {
      picks: filled.map(p => ({ name: p.name.trim(), feedback: p.feedback.trim() })),
    };
    data.applicantVoterNames.push(key);
    await writeData(data);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

// PUT /api/admin/settings — update poll settings
app.put("/api/admin/settings", async (req, res) => {
  try {
    const { adminPassword, pollNumber, staff, mvp, applicants } = req.body;
    if (adminPassword !== (process.env.ADMIN_PASSWORD || "Jac098!"))
      return res.status(403).json({ error: "Forbidden" });

    const data = await readData();
    if (pollNumber  !== undefined) data.pollNumber  = pollNumber;
    if (staff       !== undefined) data.staff       = staff;
    if (mvp         !== undefined) data.mvp         = mvp;
    if (applicants  !== undefined) data.applicants  = applicants;
    await writeData(data);
    res.json({ ok: true, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

// PUT /api/admin/vote — admin edits a specific submission
app.put("/api/admin/vote", async (req, res) => {
  try {
    const { adminPassword, voteType, voterKey, voteData } = req.body;
    if (adminPassword !== (process.env.ADMIN_PASSWORD || "Jac098!"))
      return res.status(403).json({ error: "Forbidden" });
    if (!voteType || !voterKey)
      return res.status(400).json({ error: "Missing voteType or voterKey" });

    const data = await readData();
    const key  = voterKey.trim().toLowerCase();

    if (voteType === "staff") {
      if (!data.votes[key]) return res.status(404).json({ error: "Submission not found" });
      data.votes[key] = voteData;
    } else if (voteType === "mvp") {
      if (!data.mvpVotes[key]) return res.status(404).json({ error: "Submission not found" });
      data.mvpVotes[key] = voteData;
    } else if (voteType === "applicant") {
      if (!data.applicantVotes[key]) return res.status(404).json({ error: "Submission not found" });
      data.applicantVotes[key] = voteData;
    } else {
      return res.status(400).json({ error: "Invalid voteType" });
    }

    await writeData(data);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE /api/admin/vote — admin deletes a specific submission
app.delete("/api/admin/vote", async (req, res) => {
  try {
    const { adminPassword, voteType, voterKey } = req.body;
    if (adminPassword !== (process.env.ADMIN_PASSWORD || "Jac098!"))
      return res.status(403).json({ error: "Forbidden" });

    const data = await readData();
    const key  = voterKey.trim().toLowerCase();

    if (voteType === "staff") {
      delete data.votes[key];
      data.voterNames = data.voterNames.filter(n => n !== key);
    } else if (voteType === "mvp") {
      delete data.mvpVotes[key];
      data.mvpVoterNames = (data.mvpVoterNames || []).filter(n => n !== key);
    } else if (voteType === "applicant") {
      delete data.applicantVotes[key];
      data.applicantVoterNames = (data.applicantVoterNames || []).filter(n => n !== key);
    } else {
      return res.status(400).json({ error: "Invalid voteType" });
    }

    await writeData(data);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE /api/admin/reset — wipe all votes and bump poll number
app.delete("/api/admin/reset", async (req, res) => {
  try {
    const { adminPassword } = req.body;
    if (adminPassword !== (process.env.ADMIN_PASSWORD || "Jac098!"))
      return res.status(403).json({ error: "Forbidden" });

    const data = await readData();
    data.pollNumber          += 1;
    data.votes                = {};
    data.voterNames           = [];
    data.mvpVotes             = {};
    data.mvpVoterNames        = [];
    data.applicantVotes       = {};
    data.applicantVoterNames  = [];
    await writeData(data);
    res.json({ ok: true, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

// Fallback to frontend SPA
app.get("*", (req, res) => {
  const index = path.join(FRONTEND_BUILD, "index.html");
  if (fs.existsSync(index)) res.sendFile(index);
  else res.status(404).send("Frontend not built yet.");
});

// ── Start ─────────────────────────────────────────────────────────────────────
initDB()
  .then(() => {
    app.listen(PORT, () => console.log(`✅  Reason Poll server running on :${PORT}`));
  })
  .catch(err => {
    console.error("❌  Failed to initialise database:", err);
    process.exit(1);
  });
