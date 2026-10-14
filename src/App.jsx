import { useEffect, useState } from "react";

const API_BASE_URL = "http://localhost:8080";

function App() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [cvText, setCvText] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);

  const [loadingJobs, setLoadingJobs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/jobs`);

        if (!response.ok) {
          throw new Error("Failed to load jobs.");
        }

        const data = await response.json();
        setJobs(data);
      } catch (err) {
        setError(err.message || "Could not connect to the backend.");
      } finally {
        setLoadingJobs(false);
      }
    };

    fetchJobs();
  }, []);

  const handleSelectJob = (job) => {
    setSelectedJob(job);
    setSelectedFile(null);
    setCvText("");
    setAnalysisResult(null);
    setError("");
  };

  const closePopup = () => {
    if (uploading || analyzing) return;

    setSelectedJob(null);
    setSelectedFile(null);
    setCvText("");
    setAnalysisResult(null);
    setError("");
  };

  const handlePdfUpload = async () => {
    if (!selectedFile) {
      setError("Please choose a PDF file first.");
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("The PDF must be smaller than 5 MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setUploading(true);
    setError("");
    setAnalysisResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/cv/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "PDF upload failed.");
      }

      const data = await response.json();

      if (!data.cvText || !data.cvText.trim()) {
        throw new Error("No readable text was found in the PDF.");
      }

      setCvText(data.cvText);
    } catch (err) {
      setError(err.message || "Could not upload the PDF.");
    } finally {
      setUploading(false);
    }
  };

  const handleCompareCV = async () => {
    if (!selectedJob) {
      setError("Please select a job first.");
      return;
    }

    if (!cvText.trim()) {
      setError("Please upload a PDF or enter your CV text.");
      return;
    }

    setAnalyzing(true);
    setError("");
    setAnalysisResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: selectedJob.id,
          cvText: cvText,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "CV analysis failed.");
      }

      const result = await response.json();
      setAnalysisResult(result);
    } catch (err) {
      setError(
        err.message ||
          "Could not analyze the CV. Check that the backend is running."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const matchScore = Math.max(
    0,
    Math.min(100, Number(analysisResult?.matchScore) || 0)
  );

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>AI Job Assistant</h1>
            <p style={styles.subtitle}>
              Analyze your CV against job requirements using AI.
            </p>
          </div>

          <span style={styles.headerBadge}>AI POWERED</span>
        </header>

        {/* Jobs section */}
        <section>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Available Jobs</h2>
              <p style={styles.sectionSubtitle}>
                Select a position to compare your CV.
              </p>
            </div>

            <span style={styles.jobCount}>
              {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
            </span>
          </div>

          {loadingJobs && (
            <div style={styles.infoCard}>Loading available jobs...</div>
          )}

          {!loadingJobs && error && !selectedJob && (
            <div style={styles.error}>{error}</div>
          )}

          {!loadingJobs && jobs.length === 0 && !error && (
            <div style={styles.infoCard}>
              <h3>No jobs available</h3>
              <p>
                Add a job to your database using the backend API, then refresh
                this page.
              </p>
            </div>
          )}

          <div style={styles.jobGrid}>
            {jobs.map((job) => (
              <article key={job.id} style={styles.jobCard}>
                <div style={styles.jobCardTop}>
                  <div style={styles.jobIcon}>
                    {job.title?.charAt(0)?.toUpperCase() || "J"}
                  </div>

                  <span style={styles.jobId}>JOB #{job.id}</span>
                </div>

                <h3 style={styles.jobTitle}>{job.title}</h3>

                <p style={styles.company}>
                  <span style={styles.companyLabel}>Company</span>
                  {job.company}
                </p>

                <p style={styles.description}>{job.description}</p>

                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() => handleSelectJob(job)}
                >
                  Compare My CV
                  <span aria-hidden="true"> →</span>
                </button>
              </article>
            ))}
          </div>
        </section>

        {/* CV comparison modal */}
        {selectedJob && (
          <div
            style={styles.overlay}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closePopup();
              }
            }}
          >
            <div
              style={styles.modal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modalTitle"
            >
              <div style={styles.modalHeader}>
                <div>
                  <span style={styles.modalEyebrow}>CV ANALYSIS</span>
                  <h2 id="modalTitle" style={styles.modalTitle}>
                    Compare Your CV
                  </h2>
                  <p style={styles.modalSubtitle}>
                    Review the job details and provide your CV.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closePopup}
                  disabled={uploading || analyzing}
                  style={styles.closeButton}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {/* Selected job details */}
              <div style={styles.selectedJobCard}>
                <span style={styles.detailLabel}>SELECTED POSITION</span>
                <h3 style={styles.selectedJobTitle}>{selectedJob.title}</h3>
                <p style={styles.selectedCompany}>{selectedJob.company}</p>

                <p style={styles.selectedDescription}>
                  {selectedJob.description}
                </p>
              </div>

              {/* PDF upload */}
              <div style={styles.formSection}>
                <label htmlFor="cvFile" style={styles.label}>
                  Upload your CV
                </label>

                <p style={styles.helperText}>
                  Choose a text-based PDF file (maximum 5 MB).
                </p>

                <input
                  id="cvFile"
                  type="file"
                  accept=".pdf,application/pdf"
                  style={styles.fileInput}
                  onChange={(event) => {
                    setSelectedFile(event.target.files?.[0] || null);
                    setError("");
                    setAnalysisResult(null);
                  }}
                />

                <button
                  type="button"
                  onClick={handlePdfUpload}
                  disabled={uploading || analyzing || !selectedFile}
                  style={{
                    ...styles.secondaryButton,
                    opacity:
                      uploading || analyzing || !selectedFile ? 0.6 : 1,
                    cursor:
                      uploading || analyzing || !selectedFile
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {uploading ? "Extracting text..." : "Upload and Extract Text"}
                </button>
              </div>

              {/* Editable CV text */}
              <div style={styles.formSection}>
                <label htmlFor="cvText" style={styles.label}>
                  Your CV text
                </label>

                <p style={styles.helperText}>
                  You can edit the extracted text or paste your CV directly.
                </p>

                <textarea
                  id="cvText"
                  value={cvText}
                  onChange={(event) => {
                    setCvText(event.target.value);
                    setAnalysisResult(null);
                    setError("");
                  }}
                  placeholder="Paste your CV text here, or upload a PDF above..."
                  rows={8}
                  style={styles.textarea}
                />
              </div>

              {error && <div style={styles.error}>{error}</div>}

              {/* Actions */}
              <div style={styles.actions}>
                <button
                  type="button"
                  onClick={handleCompareCV}
                  disabled={analyzing || uploading || !cvText.trim()}
                  style={{
                    ...styles.primaryButton,
                    flex: 1,
                    opacity:
                      analyzing || uploading || !cvText.trim() ? 0.6 : 1,
                    cursor:
                      analyzing || uploading || !cvText.trim()
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {analyzing ? "Analyzing CV..." : "Analyze CV with AI"}
                </button>

                <button
                  type="button"
                  onClick={closePopup}
                  disabled={analyzing || uploading}
                  style={styles.cancelButton}
                >
                  Close
                </button>
              </div>

              {/* Analysis results */}
              {analysisResult && (
                <section style={styles.results}>
                  <div style={styles.resultsHeader}>
                    <span style={styles.modalEyebrow}>YOUR RESULTS</span>
                    <h2 style={styles.resultsTitle}>CV Analysis Results</h2>
                    <p style={styles.helperText}>
                      AI-generated feedback based on your CV and the selected
                      job description.
                    </p>
                  </div>

                  <div style={styles.scoreCard}>
                    <div style={styles.scoreHeader}>
                      <span style={styles.scoreLabel}>Overall Match</span>
                      <strong style={styles.scoreValue}>
                        {matchScore}%
                      </strong>
                    </div>

                    <div
                      style={styles.progressTrack}
                      role="progressbar"
                      aria-label="CV match score"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={matchScore}
                    >
                      <div
                        style={{
                          ...styles.progressBar,
                          width: `${matchScore}%`,
                        }}
                      />
                    </div>

                    <p style={styles.scoreNote}>
                      This score is an AI estimate, not a guarantee of hiring
                      success.
                    </p>
                  </div>

                  <div style={styles.skillsGrid}>
                    <div style={styles.skillCard}>
                      <h3 style={styles.skillTitle}>Matching Skills</h3>

                      {analysisResult.matchingSkills?.length > 0 ? (
                        <ul style={styles.skillList}>
                          {analysisResult.matchingSkills.map(
                            (skill, index) => (
                              <li key={`${skill}-${index}`}>{skill}</li>
                            )
                          )}
                        </ul>
                      ) : (
                        <p style={styles.emptyText}>
                          No matching skills were returned.
                        </p>
                      )}
                    </div>

                    <div style={styles.skillCard}>
                      <h3 style={styles.skillTitle}>Missing Skills</h3>

                      {analysisResult.missingSkills?.length > 0 ? (
                        <ul style={styles.skillList}>
                          {analysisResult.missingSkills.map(
                            (skill, index) => (
                              <li key={`${skill}-${index}`}>{skill}</li>
                            )
                          )}
                        </ul>
                      ) : (
                        <p style={styles.emptyText}>
                          No missing skills were returned.
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={styles.summaryCard}>
                    <h3 style={styles.skillTitle}>AI Summary</h3>
                    <p style={styles.summaryText}>
                      {analysisResult.summary ||
                        "No summary was returned by the AI."}
                    </p>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        <footer style={styles.footer}>
          <p>AI Job Assistant · Built with React, Spring Boot and Spring AI</p>
        </footer>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px 24px",
    boxSizing: "border-box",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    backgroundColor: "#f5f7fb",
    color: "#1f2937",
  },

  container: {
    maxWidth: "1120px",
    width: "100%",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "40px",
    gap: "20px",
    flexWrap: "wrap",
  },

  title: {
    margin: 0,
    fontSize: "36px",
    fontWeight: 750,
    letterSpacing: "-1px",
    color: "#172554",
  },

  subtitle: {
    marginTop: "10px",
    marginBottom: 0,
    color: "#64748b",
    fontSize: "16px",
    lineHeight: 1.6,
  },

  headerBadge: {
    display: "inline-block",
    backgroundColor: "#e8f2ff",
    color: "#2475d0",
    padding: "9px 15px",
    borderRadius: "20px",
    fontWeight: 700,
    fontSize: "12px",
    letterSpacing: "0.5px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "22px",
    flexWrap: "wrap",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "25px",
    color: "#172554",
  },

  sectionSubtitle: {
    marginTop: "7px",
    marginBottom: 0,
    color: "#64748b",
    fontSize: "14px",
  },

  jobCount: {
    backgroundColor: "#e9eef8",
    color: "#334155",
    borderRadius: "20px",
    padding: "7px 12px",
    fontSize: "13px",
    fontWeight: 600,
  },

  jobGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 290px), 1fr))",
    gap: "22px",
  },

  jobCard: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: "24px",
    border: "1px solid #e5eaf2",
    borderRadius: "14px",
    boxShadow: "0 5px 18px rgba(15, 23, 42, 0.04)",
    minWidth: 0,
  },

  jobCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    gap: "10px",
  },

  jobIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    backgroundColor: "#e8f2ff",
    color: "#2475d0",
    fontSize: "20px",
    fontWeight: 700,
  },

  jobId: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#94a3b8",
    letterSpacing: "0.6px",
  },

  jobTitle: {
    fontSize: "20px",
    lineHeight: 1.35,
    margin: "0 0 16px",
    color: "#172554",
    overflowWrap: "anywhere",
  },

  company: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    margin: "0 0 16px",
    fontWeight: 600,
    color: "#334155",
  },

  companyLabel: {
    color: "#94a3b8",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.6px",
  },

  description: {
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    flex: 1,
    margin: "0 0 24px",
  },

  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px 18px",
    backgroundColor: "#2475d0",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontWeight: 650,
    fontSize: "14px",
    cursor: "pointer",
  },

  secondaryButton: {
    display: "inline-flex",
    justifyContent: "center",
    padding: "11px 16px",
    backgroundColor: "#edf4ff",
    color: "#1d5fae",
    border: "1px solid #d3e4fc",
    borderRadius: "8px",
    fontWeight: 650,
    fontSize: "14px",
    cursor: "pointer",
  },

  cancelButton: {
    padding: "12px 18px",
    backgroundColor: "#ffffff",
    color: "#475569",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },

  infoCard: {
    backgroundColor: "#ffffff",
    padding: "24px",
    marginBottom: "20px",
    border: "1px solid #e5eaf2",
    borderRadius: "12px",
    color: "#64748b",
    lineHeight: 1.6,
  },

  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "24px 16px",
    overflowY: "auto",
    zIndex: 1000,
    boxSizing: "border-box",
  },

  modal: {
    backgroundColor: "#ffffff",
    padding: "28px",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "720px",
    margin: "auto",
    boxSizing: "border-box",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "24px",
  },

  modalEyebrow: {
    color: "#2475d0",
    fontSize: "11px",
    fontWeight: 750,
    letterSpacing: "1px",
  },

  modalTitle: {
    fontSize: "27px",
    color: "#172554",
    margin: "7px 0",
  },

  modalSubtitle: {
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.6,
    margin: 0,
  },

  closeButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    flexShrink: 0,
    backgroundColor: "#f1f5f9",
    color: "#475569",
    border: "none",
    borderRadius: "8px",
    fontSize: "25px",
    cursor: "pointer",
  },

  selectedJobCard: {
    backgroundColor: "#f6f9ff",
    border: "1px solid #dce8fb",
    borderRadius: "10px",
    padding: "18px",
    marginBottom: "26px",
  },

  detailLabel: {
    fontSize: "10px",
    color: "#64748b",
    fontWeight: 750,
    letterSpacing: "0.8px",
  },

  selectedJobTitle: {
    fontSize: "20px",
    margin: "8px 0 4px",
    color: "#172554",
    overflowWrap: "anywhere",
  },

  selectedCompany: {
    color: "#2475d0",
    fontWeight: 600,
    margin: "0 0 12px",
  },

  selectedDescription: {
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    margin: 0,
  },

  formSection: {
    marginBottom: "24px",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    fontSize: "14px",
    fontWeight: 700,
    color: "#334155",
  },

  helperText: {
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.6,
    margin: "0 0 12px",
  },

  fileInput: {
    display: "block",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    marginBottom: "14px",
    padding: "12px",
    backgroundColor: "#f8fafc",
    border: "1px dashed #cbd5e1",
    borderRadius: "8px",
    fontSize: "13px",
  },

  textarea: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontFamily: "inherit",
    fontSize: "14px",
    lineHeight: 1.7,
    resize: "vertical",
    outlineColor: "#2475d0",
  },

  error: {
    backgroundColor: "#fff1f2",
    color: "#b42332",
    border: "1px solid #fecdd3",
    borderRadius: "8px",
    padding: "12px 14px",
    margin: "16px 0",
    fontSize: "14px",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },

  actions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginTop: "20px",
    flexWrap: "wrap",
  },

  results: {
    marginTop: "30px",
    paddingTop: "26px",
    borderTop: "1px solid #e2e8f0",
  },

  resultsHeader: {
    marginBottom: "20px",
  },

  resultsTitle: {
    color: "#172554",
    fontSize: "23px",
    margin: "7px 0",
  },

  scoreCard: {
    backgroundColor: "#f6f9ff",
    border: "1px solid #dce8fb",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px",
  },

  scoreHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "14px",
  },

  scoreLabel: {
    fontSize: "15px",
    fontWeight: 650,
    color: "#334155",
  },

  scoreValue: {
    color: "#2475d0",
    fontSize: "32px",
  },

  progressTrack: {
    width: "100%",
    height: "12px",
    backgroundColor: "#dbe4f0",
    borderRadius: "20px",
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    backgroundColor: "#2475d0",
    borderRadius: "20px",
    transition: "width 0.4s ease",
  },

  scoreNote: {
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.6,
    margin: "12px 0 0",
  },

  skillsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
    gap: "16px",
    marginBottom: "16px",
  },

  skillCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "18px",
    minWidth: 0,
  },

  skillTitle: {
    fontSize: "16px",
    color: "#172554",
    margin: "0 0 14px",
  },

  skillList: {
    paddingLeft: "20px",
    margin: 0,
    color: "#475569",
    fontSize: "14px",
    lineHeight: 1.9,
    overflowWrap: "anywhere",
  },

  emptyText: {
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  summaryCard: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "18px",
  },

  summaryText: {
    color: "#475569",
    fontSize: "14px",
    lineHeight: 1.8,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    margin: 0,
  },

  footer: {
    marginTop: "48px",
    padding: "20px 0",
    borderTop: "1px solid #e2e8f0",
    textAlign: "center",
    color: "#94a3b8",
    fontSize: "12px",
    lineHeight: 1.6,
  },
};

export default App;