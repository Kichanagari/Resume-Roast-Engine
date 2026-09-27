// routes/analyzeRoute.js

const express = require("express");
const Resume = require("../models/Resume");
const Analysis = require("../models/Analysis");
const { analyzeResumeWithGemini } = require("../utils/geminiClient");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

// POST /analyze
// Expects a JSON body like: { "resumeId": "...", "jobDescription": "..." }
// requireAuth runs first, so req.userId is guaranteed to exist below.
router.post("/analyze", requireAuth, async (req, res) => {
  try {
    const { resumeId, jobDescription } = req.body;

    // 1. Validate input early, before doing any real work.
    if (!resumeId || !jobDescription) {
      return res.status(400).json({
        error: "Both resumeId and jobDescription are required",
      });
    }

    // 2. Look up the resume, and make sure it actually belongs to the
    //    person making this request — not just anyone's resume ID.
    //    This is what "protecting" data really means in practice.
    const resume = await Resume.findOne({ _id: resumeId, userId: req.userId });
    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    // 3. Call Gemini with the resume text + job description.
    const result = await analyzeResumeWithGemini(
      resume.extractedText,
      jobDescription
    );

    // 4. Save this analysis, tagged with who ran it.
    const analysis = await Analysis.create({
      userId: req.userId,
      resumeId: resume._id,
      jobDescription,
      matchScore: result.matchScore,
      missingKeywords: result.missingKeywords,
      suggestions: result.suggestions,
    });

    // 5. Send the result back to whoever called this endpoint.
    res.status(201).json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /my-analyses — fetch only the logged-in user's own past analyses,
// most recent first.
router.get("/my-analyses", requireAuth, async (req, res) => {
  try {
    // .populate("resumeId", "originalFileName") replaces the raw resumeId
    // (just an ObjectId like "6ab...") with the actual Resume document's
    // originalFileName field — so the frontend can show "resume.pdf"
    // instead of a meaningless ID. This is a real Mongoose feature for
    // pulling in related data across collections.
    const analyses = await Analysis.find({ userId: req.userId })
      .populate("resumeId", "originalFileName")
      .sort({ createdAt: -1 });
    res.json(analyses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;