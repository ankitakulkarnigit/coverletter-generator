# Resume & Cover Letter Generator

<video src="linkedin_video.mp4" controls width="100%"></video>

An AI-powered web app that takes your resume and a job description, then generates:

- **ATS-optimized resume** tailored to the job
- **Cover letter** that sounds human, not like a template
- **"Why this company?"** answer for interviews
- **LinkedIn message** to the hiring manager

Built with React + Vite (frontend) and Express + Claude API (backend). Your resume is saved in your browser's local storage — it's never stored on a server.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- An [Anthropic API key](https://console.anthropic.com/) (separate from Claude Pro — requires API billing)

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/ankitakulkarnigit/coverletter-generator.git
cd coverletter-generator
```

### 2. Install dependencies

Install dependencies for both the backend and frontend:

```bash
npm install --prefix backend
npm install --prefix frontend
```

### 3. Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PORT=3001
```

Get your API key from [console.anthropic.com](https://console.anthropic.com/).

### 4. Run the app

```bash
npm run dev
```

This starts both servers concurrently:
- **Backend** → http://localhost:3001
- **Frontend** → http://localhost:5173

Open http://localhost:5173 in your browser.

> **Note:** If you see a blank page, try opening the app in an incognito window. Some browser extensions (like MetaMask) can interfere with the Vite dev server.

---

## How to use

1. **Upload your resume** — drag and drop a PDF or paste plain text. It's saved in your browser and only needs to be uploaded once.
2. **Paste the job description** — include the full JD with company name, role, and requirements.
3. **Click Generate** — Claude reads both and produces all four outputs (~20–40 seconds).
4. **Edit if needed** — all output tabs are editable directly in the browser.
5. **Download** — grab the resume or cover letter as a formatted PDF.

---

## Project structure

```
coverletter-generator/
├── backend/
│   ├── server.js          # Express API — PDF parsing + Claude generation
│   ├── .env.example       # Environment variable template
│   └── package.json
├── frontend/
│   ├── src/
│   │   └── App.jsx        # React app — UI + PDF generation (jsPDF)
│   └── package.json
└── package.json           # Root — runs both servers with concurrently
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| PDF generation | jsPDF (client-side) |
| Backend | Express.js, Node.js |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| PDF parsing | pdf-parse |
| Dev tooling | nodemon, concurrently |
