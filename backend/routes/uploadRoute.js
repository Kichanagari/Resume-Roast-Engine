const express = require("express");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");
const Resume = require("../models/Resume");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload-resume", requireAuth, upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file was uploaded" });
    }

    const { originalname, mimetype, buffer } = req.file;
    let extractedText = "";

    if (mimetype === "application/pdf") {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      extractedText = result.text;
    } else if (
      mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else {
      return res.status(400).json({
        error: "Unsupported file type. Please upload a PDF or DOCX file.",
      });
    }

    const resume = await Resume.create({
      userId: req.userId,
      originalFileName: originalname,
      extractedText,
    });

    res.status(201).json({
      id: resume._id,
      fileName: resume.originalFileName,
      preview: extractedText.slice(0, 200),
      fullLength: extractedText.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;