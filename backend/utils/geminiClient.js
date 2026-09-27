async function analyzeResumeWithGemini(resumeText, jobDescription) {
  const prompt = `You are a strict technical recruiter. Compare the RESUME below against the JOB DESCRIPTION.

Respond with ONLY a valid JSON object (no markdown, no code fences, no extra text) in exactly this shape:
{
  "matchScore": <a number from 0 to 100>,
  "missingKeywords": [<up to 6 important skills/keywords from the job description that are missing or weak in the resume>],
  "suggestions": [<2 to 4 short, specific, actionable suggestions to improve the resume for this job>]
}

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}`;

 const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const rawText = data.candidates[0].content.parts[0].text;

  const jsonStart = rawText.indexOf("{");
  const jsonEnd = rawText.lastIndexOf("}");
  const jsonString = rawText.slice(jsonStart, jsonEnd + 1);

  return JSON.parse(jsonString);
}

module.exports = { analyzeResumeWithGemini };