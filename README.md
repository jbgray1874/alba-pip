# Alba Portfolio Intelligence Platform (PIP)
## Setup Guide — Windows PowerShell or Mac/Linux Terminal

---

## What you need first (one-time installs)

### 1. Node.js
Download and install from: **https://nodejs.org**
Choose the "LTS" version (the recommended one).

To check it installed correctly, open PowerShell or Terminal and type:
```
node --version
```
You should see something like `v20.11.0`

### 2. VS Code (optional but recommended)
Download from: **https://code.visualstudio.com**

---

## Running the app

### Step 1 — Open the project folder

**Windows PowerShell:**
```powershell
cd C:\path\to\alba-pip
```

**Mac / Linux Terminal:**
```bash
cd /path/to/alba-pip
```

Or in VS Code: File → Open Folder → select the `alba-pip` folder, then open the terminal with `Ctrl+\`` (backtick)

---

### Step 2 — Install dependencies (first time only, takes ~30 seconds)
```
npm install
```

---

### Step 3 — Start the app
```
npm run dev
```

You'll see:
```
  VITE v5.x.x  ready in 300ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

Open **http://localhost:5173** in your browser. That's it.

---

### Step 4 — Stop the app
Press `Ctrl + C` in the terminal.

---

## The three views (use the icon bar on the left)

| Icon | View | What it shows |
|------|------|---------------|
| ⬡ | GP Dashboard | Fund manager view — all 5 portfolio companies, health scores, RAG, all 9 modules per company, AI analysis |
| ◈ | Client Portal | Portfolio company view — switch roles (CEO, CFO, Sales, HR, COO) to see each person's dashboard. Configurable widgets. |
| ◉ | Live Data | Real-time feeds — market data updates every 3 seconds, simulated backend streams, activity feed, live forms |

---

## Optional: Enable AI narratives

The AI analysis panel works with pre-written mock text by default.
To enable real AI-generated narratives:

1. Copy `.env.example` to `.env`:
   ```
   copy .env.example .env        # Windows
   cp .env.example .env          # Mac/Linux
   ```

2. Get a free API key at **console.anthropic.com**

3. Open `.env` and add your key:
   ```
   VITE_ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

4. Restart the app (`Ctrl+C` then `npm run dev`)

---

## Optional: Share with someone on the same network

When the app is running, the terminal shows a Network URL like:
```
http://192.168.1.45:5173/
```
Anyone on the same WiFi can open that URL on their phone or laptop.

---

## Optional: Deploy to a public URL (free, permanent)

Install Vercel CLI (one time):
```
npm install -g vercel
```

Deploy:
```
vercel
```

Follow the prompts. You get a public URL like `alba-pip-abc123.vercel.app` that anyone can open from anywhere, no setup needed.

---

## Troubleshooting

**"npm is not recognised"** → Node.js is not installed. Go back to Step 1.

**Port already in use** → Change the port: `npm run dev -- --port 3001`

**Blank screen in browser** → Check the terminal for errors. Most common fix: `npm install` again.

**AI panel shows mock text** → That's normal without an API key. See "Enable AI narratives" above.

---

## Project structure (for developers)

```
alba-pip/
├── src/
│   ├── App.jsx                  ← Top-level navigation
│   ├── main.jsx                 ← React entry point
│   ├── index.css                ← Global styles
│   └── views/
│       ├── GPDashboard.jsx      ← Fund manager view
│       ├── ClientPortal.jsx     ← Portfolio company view
│       └── RealTime.jsx         ← Live data feeds
├── index.html
├── package.json
├── vite.config.js
└── .env.example
```

---

*Alba Portfolio Intelligence Platform · Caledonia Alba · May 2026*
