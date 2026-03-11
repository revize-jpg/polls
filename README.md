# Reason PS — Staff Poll

A self-hosted staff voting app for your RuneScape private server.

---

## 🚀 Deploy to Railway (Free, ~5 minutes)

### Step 1 — Put the code on GitHub
1. Go to https://github.com/new and create a **new private repo** (e.g. `reason-poll`)
2. Upload all the files from this folder into it (drag & drop works on GitHub)

### Step 2 — Deploy on Railway
1. Go to https://railway.app and sign up with GitHub (free, no credit card)
2. Click **New Project → Deploy from GitHub repo**
3. Select your `reason-poll` repo
4. Railway will auto-detect everything. Click **Deploy**

### Step 3 — Build the frontend first (one-time)
Railway needs the React build. In Railway's dashboard:
1. Open your service → **Settings → Build Command**
2. Set it to: `npm run build && node backend/server.js`  
   *(This builds the React app and then starts the server)*
3. Or: use Railway's shell to run `cd frontend && npm install && npm run build` once

### Step 4 — Set environment variables
In Railway → your service → **Variables**, add:
```
ADMIN_PASSWORD=yourchosenpassword
PORT=3001
```

### Step 5 — Get your URL
Railway gives you a free URL like `https://reason-poll-production.up.railway.app`
Share that with your staff — they open it and vote!

---

## 🏃 Run Locally (for testing)

```bash
# Install backend deps
cd backend && npm install && cd ..

# Install & build frontend
cd frontend && npm install && npm run build && cd ..

# Start the server
node backend/server.js
```

Then open http://localhost:3001

---

## 📁 File Structure

```
reason-poll/
├── backend/
│   ├── server.js        ← Express API + serves frontend
│   ├── package.json
│   └── data.json        ← Auto-created, stores all votes
├── frontend/
│   ├── src/
│   │   ├── App.js       ← Full React app
│   │   └── index.js
│   ├── public/
│   │   └── index.html
│   └── package.json
├── package.json         ← Root (Railway entry point)
├── railway.toml
└── Procfile
```

---

## 🔧 Admin Panel Features

- **Results tab** — live tallied vote percentages per staff member
- **Settings tab** — edit poll number, add/remove/rename staff members and their current roles
- **Reset button** — wipes votes and auto-increments the poll number for the next round
- **Generate & Copy** — one click to get the full Discord-formatted message

---

## 🔐 Security Notes

- Change the default admin password (`staffpoll`) via the `ADMIN_PASSWORD` env variable
- The voter form prevents duplicate submissions by username within a poll round
- Data is stored in `data.json` on the server — Railway's disk persists between deploys

---

## ✏️ Customizing Roles

Open `frontend/src/App.js` and edit line 5:
```js
const ROLES = ["Support", "Moderator", "Admin"];
```
Add or rename roles as needed, then redeploy.
