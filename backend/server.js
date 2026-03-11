const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, "data.json");

app.use(cors());
app.use(express.json());

// ── Serve frontend build in production ──────────────────────────────────────
const FRONTEND_BUILD = path.join(__dirname, "../frontend/build");
if (fs.existsSync(FRONTEND_BUILD)) {
  app.use(express.static(FRONTEND_BUILD));
}

// ── Default data ─────────────────────────────────────────────────────────────
const DEFAULT_DATA = {
  pollNumber: 29,
  staff: [
    { username: "I D C", currentRole: "Support" },
    { username: "C4rdZ",   currentRole: "Support" },
    { username: "Baekhyeon",   currentRole: "Support" },
    { username: "Rg A",    currentRole: "Moderator" },
    { username: "Roadblock",  currentRole: "Moderator" },
    { username: "Rutte 95", currentRole: "Moderator" },
    { username: "Sky H",    currentRole: "Moderator" },
    { username: "K o o k i e",     currentRole: "Admin" },
    { username: "Bustable",     currentRole: "Admin" },
    { username: "Nois",     currentRole: "Admin" },
    { username: "Pinecone",    currentRole: "Admin" },
  ],
  votes: {},       // { voterName: { staffUsername: "Role" } }
  voterNames: [],  // lowercase list for dupe detection
  mvp: { staffEnabled: false, adminEnabled: false, staffCandidates: [], adminCandidates: [] },
  mvpVotes: {},    // { voterName: { staffPick, adminPick } }
  mvpVoterNames: [],
};

// ── Read / write helpers ──────────────────────────────────────────────────────
async function readData() {
  try {
    await fs.ensureFile(DATA_FILE);
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return raw.trim() ? JSON.parse(raw) : { ...DEFAULT_DATA };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

async function writeData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/poll  — full state
app.get("/api/poll", async (req, res) => {
  const data = await readData();
  res.json(data);
});

// POST /api/vote  — submit a vote
// body: { voterName: string, votes: { staffUsername: "Role" } }
app.post("/api/vote", async (req, res) => {
  const { voterName, votes } = req.body;
  if (!voterName || !votes) return res.status(400).json({ error: "Missing fields" });

  const data = await readData();
  const key = voterName.trim().toLowerCase();

  if (data.voterNames.includes(key)) {
    return res.status(409).json({ error: "Already voted" });
  }

  // Validate every staff member has a vote
  for (const m of data.staff) {
    if (!votes[m.username]) {
      return res.status(400).json({ error: `Missing vote for ${m.username}` });
    }
  }

  data.votes[key] = votes;
  data.voterNames.push(key);
  await writeData(data);
  res.json({ ok: true });
});

// PUT /api/admin/settings  — update poll number and/or staff list
// body: { adminPassword, pollNumber?, staff?, mvp? }
app.put("/api/admin/settings", async (req, res) => {
  const { adminPassword, pollNumber, staff, mvp } = req.body;
  if (adminPassword !== (process.env.ADMIN_PASSWORD || "staffpoll")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const data = await readData();
  if (pollNumber !== undefined) data.pollNumber = pollNumber;
  if (staff !== undefined) data.staff = staff;
  if (mvp !== undefined) data.mvp = mvp;
  await writeData(data);
  res.json({ ok: true, data });
});

// POST /api/mvp-vote  — submit an MVP vote
app.post("/api/mvp-vote", async (req, res) => {
  const { voterName, staffPick, adminPick } = req.body;
  if (!voterName) return res.status(400).json({ error: "Missing voterName" });
  const data = await readData();
  const key = voterName.trim().toLowerCase();
  if ((data.mvpVoterNames || []).includes(key)) {
    return res.status(409).json({ error: "You have already submitted an MVP vote." });
  }
  if (!data.mvpVotes) data.mvpVotes = {};
  if (!data.mvpVoterNames) data.mvpVoterNames = [];
  data.mvpVotes[key] = { staffPick: staffPick || null, adminPick: adminPick || null };
  data.mvpVoterNames.push(key);
  await writeData(data);
  res.json({ ok: true });
});

// DELETE /api/admin/reset  — wipe votes and bump poll number
app.delete("/api/admin/reset", async (req, res) => {
  const { adminPassword } = req.body;
  if (adminPassword !== (process.env.ADMIN_PASSWORD || "Jac098!")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const data = await readData();
  data.pollNumber += 1;
  data.votes = {};
  data.voterNames = [];
  await writeData(data);
  res.json({ ok: true, data });
});

// Fallback to frontend for SPA
app.get("*", (req, res) => {
  const index = path.join(FRONTEND_BUILD, "index.html");
  if (fs.existsSync(index)) res.sendFile(index);
  else res.status(404).send("Frontend not built yet.");
});

app.listen(PORT, () => console.log(`✅  Reason Poll server running on :${PORT}`));
