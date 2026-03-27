const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── PDF Parser ──────────────────────────────────────────────────────────────
app.post('/api/parse-pdf', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const data = await pdfParse(req.file.buffer);
    const text = data.text?.trim();

    if (!text || text.length < 50) {
      return res.status(400).json({
        error:
          'Could not extract text from this PDF (it may be a scanned image). Please paste your resume as text instead.',
      });
    }

    res.json({ text });
  } catch (err) {
    console.error('PDF parse error:', err.message);
    res.status(500).json({ error: 'Failed to parse PDF: ' + err.message });
  }
});

// ── Generator ───────────────────────────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ error: 'Both resume and job description are required' });
    }
    if (resumeText.length > 25000) {
      return res.status(400).json({ error: 'Resume is too long (max 25,000 characters)' });
    }
    if (jobDescription.length > 12000) {
      return res.status(400).json({ error: 'Job description is too long (max 12,000 characters)' });
    }

    const prompt = `You are an expert career coach, ATS optimization specialist, and professional writer with 20+ years of experience helping candidates land interviews.

Carefully analyze the resume and job description below, then produce 4 pieces of content.

════════════════════════
RESUME:
${resumeText}

════════════════════════
JOB DESCRIPTION:
${jobDescription}
════════════════════════

Generate the following 4 items:

1. updatedResume
   — Rewrite the resume to pass ATS filters for this specific role.
   — Keep ALL facts intact: companies, dates, titles, degrees, GPA, metrics. Do NOT fabricate anything.
   — Incorporate high-frequency keywords from the JD naturally into bullet points.
   — Rewrite the professional summary/objective to speak directly to this role.
   — Reprioritize the skills section to front-load relevant skills.
   — Use ALL CAPS section headers (EXPERIENCE, EDUCATION, SKILLS, SUMMARY, PROJECTS, etc.).
   — Preserve the original structure and formatting conventions.

2. coverLetter
   — Opening paragraph: hook the reader, name the exact role and company, show genuine excitement.
   — 2 body paragraphs: connect 2–3 specific achievements from the resume to the JD requirements. Be concrete, use numbers where possible.
   — Closing paragraph: express enthusiasm, mention you'd love to discuss further, thank them.
   — Tone: confident and personable, not stiff or generic. No hollow phrases like "I am writing to apply…"

3. whyThisCompany
   — 2–3 sentences answering "Why specifically this company?"
   — Draw from details in the JD: company mission, product, culture, values, market position.
   — Make it specific — avoid anything that could apply to any company.
   — Connect to something genuine in the candidate's background.

4. linkedinMessage
   — A short LinkedIn connection/message to a hiring manager. Max 4 sentences.
   — Friendly, professional, human — not a copy-paste template.
   — Name the specific role you applied for.
   — Include one hook: something specific that excites you about the role or company.
   — End with a low-pressure call to action ("Happy to connect!" or "Would love to learn more about the team.")

Return ONLY a valid JSON object — no markdown code fences, no explanation, no text outside the JSON.
Exact keys required: updatedResume, coverLetter, whyThisCompany, linkedinMessage.`;

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: prompt }],
    });

    const response = await stream.finalMessage();

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock) {
      return res.status(500).json({ error: 'No text in AI response. Please try again.' });
    }

    let result;
    try {
      result = JSON.parse(textBlock.text);
    } catch {
      // Attempt to extract JSON if Claude wrapped it in something
      const match = textBlock.text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          result = JSON.parse(match[0]);
        } catch {
          return res.status(500).json({ error: 'Could not parse AI response. Please try again.' });
        }
      } else {
        return res.status(500).json({ error: 'Unexpected AI response format. Please try again.' });
      }
    }

    // Validate expected keys
    const required = ['updatedResume', 'coverLetter', 'whyThisCompany', 'linkedinMessage'];
    for (const key of required) {
      if (!result[key]) result[key] = '(No content generated for this section)';
    }

    res.json(result);
  } catch (err) {
    console.error('Generation error:', err.message);
    res.status(500).json({ error: err.message || 'Generation failed. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`✓ Backend running on http://localhost:${PORT}`);
});
