// src/App.jsx
//
// Phase 6 adds accounts: a user must sign up or log in before they can
// upload a resume or run an analysis. We store the login "token" we get
// back so the browser can prove who's making each request afterward.

import { useState } from "react";
import "./App.css";

const BACKEND_URL = "http://127.0.0.1:5000";

function App() {
  // --- Auth state ---
  // localStorage keeps this token saved even if the page is refreshed or
  // closed and reopened — that's why we initialize state FROM it here,
  // instead of always starting as null. (For a real production app,
  // storing tokens in an httpOnly cookie is more secure than localStorage,
  // but localStorage is simpler to understand while learning.)
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [authMode, setAuthMode] = useState("login"); // "login" or "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // --- Resume/analysis state (same as Phase 5) ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [resumeId, setResumeId] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  // --- History view state ---
  const [view, setView] = useState("analyze"); // "analyze" or "history"
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // --- Auth handlers ---

  async function handleAuthSubmit() {
    setAuthError("");
    const endpoint = authMode === "login" ? "/login" : "/signup";

    try {
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      // Save the token both in React state (so the page updates right
      // away) AND in localStorage (so it survives a page refresh).
      setToken(data.token);
      localStorage.setItem("token", data.token);
    } catch (err) {
      setAuthError(err.message);
    }
  }

  function handleLogout() {
    setToken(null);
    localStorage.removeItem("token");
    // Also clear any resume/analysis state so the next person who logs
    // in on this browser doesn't see the previous person's data.
    setResumeId(null);
    setAnalysis(null);
  }

  // --- Resume/analysis handlers (same logic as before, now with a token) ---

  function handleFileChange(event) {
    setSelectedFile(event.target.files[0]);
  }

  async function handleUpload() {
    if (!selectedFile) {
      setError("Please choose a PDF or DOCX file first.");
      return;
    }
    setError("");
    setStatus("Uploading and extracting text from your resume...");

    const formData = new FormData();
    formData.append("resume", selectedFile);

    try {
      const response = await fetch(`${BACKEND_URL}/upload-resume`, {
        method: "POST",
        headers: {
          // This is how the backend's requireAuth middleware knows who
          // is making this request. Without this header, it gets
          // rejected with a 401 before reaching our route logic at all.
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setResumeId(data.id);
      setStatus(`Resume uploaded successfully (${data.fileName}). Now paste a job description and click Analyze.`);
    } catch (err) {
      setError(err.message);
      setStatus("");
    }
  }

  async function handleAnalyze() {
    if (!resumeId) {
      setError("Please upload a resume first.");
      return;
    }
    if (!jobDescription.trim()) {
      setError("Please paste a job description.");
      return;
    }
    setError("");
    setStatus("Analyzing your resume against the job description...");
    setAnalysis(null);

    try {
      const response = await fetch(`${BACKEND_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resumeId, jobDescription }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setAnalysis(data);
      setStatus("");
    } catch (err) {
      setError(err.message);
      setStatus("");
    }
  }

  // --- History handler ---

  // Runs whenever the user clicks "History". We fetch fresh every time
  // rather than caching, so a brand-new analysis always shows up.
  async function handleShowHistory() {
    setView("history");
    setHistoryLoading(true);
    setError("");

    try {
      const response = await fetch(`${BACKEND_URL}/my-analyses`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load history");
      }

      setHistory(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  // --- If there's no token, show the login/signup form instead of the app ---
  if (!token) {
    return (
      <div className="container">
        <h1>Resume Roast &amp; Job Match Engine</h1>

        <div className="card">
          <h2>{authMode === "login" ? "Log in" : "Sign up"}</h2>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button onClick={handleAuthSubmit}>
            {authMode === "login" ? "Log in" : "Sign up"}
          </button>

          {authError && <p className="error">{authError}</p>}

          <p className="switch-mode">
            {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              className="link-button"
              onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(""); }}
            >
              {authMode === "login" ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // --- Logged in: show the actual app ---
  return (
    <div className="container">
      <div className="header-row">
        <h1>Resume Roast &amp; Job Match Engine</h1>
        <button className="logout-button" onClick={handleLogout}>
          Log out
        </button>
      </div>

      <div className="nav-row">
        <button
          className={view === "analyze" ? "nav-button active" : "nav-button"}
          onClick={() => setView("analyze")}
        >
          Analyze
        </button>
        <button
          className={view === "history" ? "nav-button active" : "nav-button"}
          onClick={handleShowHistory}
        >
          History
        </button>
      </div>

      {view === "history" ? (
        <div className="card">
          <h2>Your past analyses</h2>

          {historyLoading && <p className="status">Loading your history...</p>}
          {error && <p className="error">{error}</p>}

          {!historyLoading && history.length === 0 && (
            <p>You haven't analyzed any resumes yet.</p>
          )}

          {history.map((item) => (
            <div key={item._id} className="history-item">
              <div className="history-item-header">
                <span className="history-score">{item.matchScore}/100</span>
                <span className="history-file">
                  {item.resumeId?.originalFileName || "Resume"}
                </span>
                <span className="history-date">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="history-jd">{item.jobDescription.slice(0, 150)}...</p>
              <p className="history-label">Missing Keywords:</p>
              <p>{item.missingKeywords.join(", ")}</p>
            </div>
          ))}
        </div>
      ) : (
        <>
          <p className="subtitle">
            Upload your resume and a job description to get an AI-generated match
            score and improvement suggestions.
          </p>

          <div className="card">
            <h2>1. Upload your resume</h2>
            <input type="file" accept=".pdf,.docx" onChange={handleFileChange} />
            <button onClick={handleUpload}>Upload</button>
          </div>

          <div className="card">
            <h2>2. Paste the job description</h2>
            <textarea
              rows={8}
              placeholder="Paste the full job description here..."
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
            />
            <button onClick={handleAnalyze}>Analyze</button>
          </div>

          {status && <p className="status">{status}</p>}
          {error && <p className="error">{error}</p>}

          {analysis && (
            <div className="card results">
              <h2>Results</h2>
              <p className="score">Match Score: {analysis.matchScore}/100</p>

              <h3>Missing Keywords</h3>
              <ul>
                {analysis.missingKeywords.map((keyword, index) => (
                  <li key={index}>{keyword}</li>
                ))}
              </ul>

              <h3>Suggestions</h3>
              <ul>
                {analysis.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;