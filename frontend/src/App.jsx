import { useState, useRef, useCallback } from 'react'

const API = 'http://localhost:3001'

// ── Icons ────────────────────────────────────────────────────────────────────

const Icon = ({ d, size = 'w-5 h-5', ...props }) => (
  <svg className={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
  </svg>
)

const Icons = {
  upload: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
  check: 'M5 13l4 4L19 7',
  copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
  doc: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  download: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
}

// ── Hooks ────────────────────────────────────────────────────────────────────

function useCopy() {
  const [copied, setCopied] = useState({})
  const copy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(p => ({ ...p, [id]: true }))
      setTimeout(() => setCopied(p => ({ ...p, [id]: false })), 2000)
    })
  }
  return { copied, copy }
}

// ── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'updatedResume',    label: 'Updated Resume',     emoji: '📄', mono: true  },
  { id: 'coverLetter',      label: 'Cover Letter',       emoji: '✉️', mono: false },
  { id: 'whyThisCompany',   label: 'Why This Company?',  emoji: '🎯', mono: false },
  { id: 'linkedinMessage',  label: 'LinkedIn Message',   emoji: '💼', mono: false },
]

// ── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ size = 'w-5 h-5', color = 'border-indigo-600' }) {
  return (
    <div
      className={`${size} border-2 ${color} border-t-transparent rounded-full animate-spin`}
    />
  )
}

// ── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  // Resume persisted in localStorage
  const [resume, setResume] = useState(() => {
    try {
      const s = localStorage.getItem('rcl_resume')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })

  const [jd, setJd] = useState('')
  const [results, setResults] = useState(null)
  const [activeTab, setActiveTab] = useState('updatedResume')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Upload UI state
  const [inputMode, setInputMode] = useState('upload') // 'upload' | 'paste'
  const [pasteText, setPasteText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const fileRef = useRef(null)
  const resultsRef = useRef(null)
  const { copied, copy } = useCopy()

  // ── Resume helpers ──────────────────────────────────────────────────────

  const saveResume = (data) => {
    setResume(data)
    localStorage.setItem('rcl_resume', JSON.stringify(data))
    setError('')
  }

  const clearResume = () => {
    setResume(null)
    localStorage.removeItem('rcl_resume')
    setPasteText('')
    setResults(null)
  }

  const handleFile = async (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.')
      return
    }
    setPdfLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('resume', file)
      const res = await fetch(`${API}/api/parse-pdf`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      saveResume({ filename: file.name, text: data.text })
    } catch (e) {
      setError(e.message)
    } finally {
      setPdfLoading(false)
    }
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const handlePasteSave = () => {
    if (!pasteText.trim()) { setError('Please paste your resume text.'); return }
    saveResume({ filename: 'Pasted Resume', text: pasteText.trim() })
  }

  // ── Generate ────────────────────────────────────────────────────────────

  const generate = async () => {
    if (!resume) { setError('Upload or paste your resume first.'); return }
    if (!jd.trim()) { setError('Paste the job description first.'); return }
    setLoading(true)
    setError('')
    setResults(null)
    try {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 150_000)
      const res = await fetch(`${API}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: resume.text, jobDescription: jd.trim() }),
        signal: controller.signal,
      })
      clearTimeout(t)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResults(data)
      setActiveTab('updatedResume')
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (e) {
      if (e.name === 'AbortError') setError('Request timed out. Please try again.')
      else setError(e.message || 'Generation failed.')
    } finally {
      setLoading(false)
    }
  }

  const downloadTxt = (text, name) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    a.download = name
    a.click()
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const canGenerate = !!resume && jd.trim().length > 0 && !loading

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">Resume & Cover Letter Generator</h1>
            <p className="text-xs text-slate-400 mt-0.5">Powered by Claude · Upload once, generate for any job</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-5">

        {/* ── Step 1: Resume ──────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <StepBadge n={1} />
              <span className="font-semibold text-slate-800 text-sm">Your Resume</span>
              <span className="text-[11px] bg-indigo-50 text-indigo-600 font-medium px-2 py-0.5 rounded-full">
                Saved in browser
              </span>
            </div>
            {resume && (
              <button
                onClick={clearResume}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors"
              >
                <Icon d={Icons.trash} size="w-3.5 h-3.5" />
                Remove
              </button>
            )}
          </div>

          <div className="p-5">
            {resume ? (
              <ResumeLoaded resume={resume} onReplace={clearResume} />
            ) : (
              <div>
                {/* Mode toggle */}
                <div className="flex border border-slate-200 rounded-lg w-fit mb-4 overflow-hidden text-sm">
                  {['upload', 'paste'].map(m => (
                    <button
                      key={m}
                      onClick={() => setInputMode(m)}
                      className={`px-4 py-1.5 font-medium transition-colors capitalize ${
                        inputMode === m
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {m === 'upload' ? 'Upload PDF' : 'Paste Text'}
                    </button>
                  ))}
                </div>

                {inputMode === 'upload' ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => !pdfLoading && fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all select-none ${
                      isDragging
                        ? 'border-indigo-400 bg-indigo-50 drop-zone-active'
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={e => handleFile(e.target.files[0])}
                    />
                    {pdfLoading ? (
                      <div className="flex flex-col items-center gap-2 text-indigo-600">
                        <Spinner />
                        <span className="text-sm font-medium">Parsing PDF…</span>
                      </div>
                    ) : (
                      <>
                        <Icon d={Icons.upload} size="w-9 h-9 mx-auto mb-2 text-slate-300" />
                        <p className="font-medium text-slate-600 text-sm">Drop your PDF here or click to browse</p>
                        <p className="text-xs text-slate-400 mt-1">Saved locally — never sent to a server without your action</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={pasteText}
                      onChange={e => setPasteText(e.target.value)}
                      rows={9}
                      placeholder="Paste your resume text here…"
                      className="w-full px-3.5 py-3 text-xs border border-slate-200 rounded-xl font-mono text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none leading-relaxed"
                    />
                    <button
                      onClick={handlePasteSave}
                      disabled={!pasteText.trim()}
                      className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Save Resume
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Step 2: Job Description ─────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
            <StepBadge n={2} />
            <span className="font-semibold text-slate-800 text-sm">Job Description</span>
            <span className="text-[11px] text-slate-400 ml-auto">
              {jd.length > 0 && `${jd.length.toLocaleString()} chars`}
            </span>
          </div>
          <div className="p-5">
            <textarea
              value={jd}
              onChange={e => setJd(e.target.value)}
              rows={11}
              placeholder="Paste the full job description here — include the company name, role title, responsibilities, and requirements. The more detail, the better the output."
              className="w-full px-3.5 py-3 text-sm border border-slate-200 rounded-xl text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none leading-relaxed"
            />
          </div>
        </section>

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl animate-fade-in">
            <Icon d={Icons.warning} size="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            {error}
          </div>
        )}

        {/* ── Generate Button ─────────────────────────────────────────────── */}
        <button
          onClick={generate}
          disabled={!canGenerate}
          className="w-full py-4 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2.5 shadow-sm
            bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md
            disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {loading ? (
            <>
              <Spinner color="border-white" />
              <span>
                Generating with Claude
                <span className="loading-dots ml-0.5">
                  <span>.</span><span>.</span><span>.</span>
                </span>
              </span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
              </svg>
              Generate Resume, Cover Letter & More
            </>
          )}
        </button>

        {loading && (
          <p className="text-center text-xs text-slate-400 -mt-2">
            Claude is reading your resume and tailoring everything to the job description · usually 20–40 sec
          </p>
        )}

        {/* ── Results ────────────────────────────────────────────────────── */}
        {results && (
          <section
            ref={resultsRef}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in"
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800 text-sm">Generated Content</h2>
                <p className="text-xs text-slate-400 mt-0.5">Tailored to the job description · Click a tab to view</p>
              </div>
              <button
                onClick={generate}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors font-medium"
              >
                <Icon d={Icons.refresh} size="w-3.5 h-3.5" />
                Regenerate
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-slate-100 px-2 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span>{tab.emoji}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {TABS.map(tab => {
              if (activeTab !== tab.id) return null
              const content = results[tab.id] || ''
              return (
                <div key={tab.id} className="p-5 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                      <span>{tab.emoji}</span> {tab.label}
                    </h3>
                    <div className="flex items-center gap-2">
                      {tab.id === 'updatedResume' && (
                        <button
                          onClick={() => downloadTxt(content, 'updated-resume.txt')}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          <Icon d={Icons.download} size="w-3.5 h-3.5" />
                          Download
                        </button>
                      )}
                      <button
                        onClick={() => copy(content, tab.id)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          copied[tab.id]
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                        }`}
                      >
                        <Icon
                          d={copied[tab.id] ? Icons.check : Icons.copy}
                          size="w-3.5 h-3.5"
                        />
                        {copied[tab.id] ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div
                    className={`rounded-xl border border-slate-100 bg-slate-50 p-4 overflow-y-auto ${
                      tab.id === 'linkedinMessage' ? 'max-h-48' :
                      tab.id === 'whyThisCompany' ? 'max-h-48' : 'max-h-[480px]'
                    } ${tab.mono ? 'resume-content' : 'text-sm text-slate-700 whitespace-pre-wrap leading-relaxed'}`}
                  >
                    {content}
                  </div>

                  {tab.id === 'linkedinMessage' && (
                    <p className="text-[11px] text-slate-400">
                      Tip: Personalize with the manager's name and send with a connection request.
                    </p>
                  )}
                  {tab.id === 'whyThisCompany' && (
                    <p className="text-[11px] text-slate-400">
                      Use this in interviews or your cover letter opening. Make it your own words.
                    </p>
                  )}
                </div>
              )
            })}
          </section>
        )}
      </main>

      <footer className="text-center py-8 text-[11px] text-slate-400 space-y-1">
        <p>Your resume lives in your browser's local storage — it's never sent to any server except when generating.</p>
        <p>Generated content uses Claude · Each generation uses your Anthropic API key.</p>
      </footer>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StepBadge({ n }) {
  return (
    <div className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
      {n}
    </div>
  )
}

function ResumeLoaded({ resume }) {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5 bg-emerald-50 rounded-xl border border-emerald-200 animate-fade-in">
      <div className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-emerald-800 text-sm truncate">{resume.filename}</p>
        <p className="text-xs text-emerald-600 mt-0.5">
          {resume.text.length.toLocaleString()} characters · Ready to use
        </p>
      </div>
      <div className="flex items-center gap-1 text-emerald-600 shrink-0">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-xs font-medium">Saved</span>
      </div>
    </div>
  )
}
