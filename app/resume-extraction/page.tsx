"use client";

import Navbar from "@/components/navbar";
import { useState } from "react";
import toast from "react-hot-toast";

interface Contact {
  name?: string;
  email?: string;
  phone?: string;
}

interface Experience {
  title?: string;
  company?: string;
  years?: string | number;
}

interface Education {
  degree?: string;
  school?: string;
  year?: string | number;
}

interface ParsedResume {
  contact?: Contact;
  skills?: string[];
  experience?: Experience[];
  education?: Education[];
}

export default function ResumeExtraction() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleExtract = async () => {
    if (!resumeFile) {
      toast.error("Please upload a resume file");
      return;
    }

    setIsLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("resume", resumeFile);

    const token = localStorage.getItem("token");
    try {
      const res = await fetch("https://hiring-platform-beta.onrender.com/api/resume/extract", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.msg || "Extraction failed");
      setParsedData(data.parsedData);
      toast.success("Resume parsed and added to your profile!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      console.error("Error extracting resume:", message);
      setError(message);
      toast.error(`Error: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!jobId || !parsedData) {
      toast.error("Please enter a job ID and extract a resume first.");
      return;
    }

    const resumeJson = JSON.stringify(parsedData);
    const base64Resume = Buffer.from(resumeJson).toString("base64");

    const token = localStorage.getItem("token");
    try {
      const res = await fetch("https://hiring-platform-beta.onrender.com/api/resume/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jobId, resume: base64Resume }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast.success("Resume analyzed successfully!");
      console.log("Analysis result:", data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      console.error("Analysis failed:", message);
      toast.error(`Analysis failed: ${message}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 p-6">
        <div className="bg-accent p-6 rounded-lg mb-8 shadow-md">
          <h1 className="text-3xl font-semibold text-center uppercase text-foreground">Resume Extraction</h1>
        </div>
        <div className="bg-secondary p-8 rounded-lg shadow-md text-dark-contrast">
          <label htmlFor="resume" className="block font-semibold mb-2">
            Upload Resume (PDF)
          </label>
          <input
            type="file"
            id="resume"
            accept=".pdf"
            onChange={handleFileChange}
            className="input-field"
            disabled={isLoading}
          />
          <button
            onClick={handleExtract}
            className="btn-primary mt-4"
            disabled={isLoading}
          >
            {isLoading ? "Extracting..." : "Extract"}
          </button>
          {error && <p className="text-danger mt-4">{error}</p>}
        </div>
        {parsedData && (
          <div className="mt-8 bg-secondary p-6 rounded-lg shadow-md text-dark-contrast">
            <h2 className="text-xl font-bold text-text-dark mb-4">Parsed Resume</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-bold">Contact</h3>
                <p>
                  {parsedData.contact?.name || "N/A"}<br />
                  {parsedData.contact?.email || "N/A"}<br />
                  {parsedData.contact?.phone || "N/A"}
                </p>
              </div>
              <div>
                <h3 className="font-bold">Skills</h3>
                <ul className="list-disc pl-4">
                  {parsedData.skills && parsedData.skills.length > 0
                    ? parsedData.skills.map((s, i) => <li key={i}>{s || "N/A"}</li>)
                    : <li>N/A</li>}
                </ul>
              </div>
              <div>
                <h3 className="font-bold">Experience</h3>
                {parsedData.experience && parsedData.experience.length > 0
                  ? parsedData.experience.map((e, i) => (
                      <p key={i}>
                        {e.title || "N/A"} at {e.company || "N/A"} ({e.years || "N/A"})
                      </p>
                    ))
                  : <p>N/A</p>}
              </div>
              <div>
                <h3 className="font-bold">Education</h3>
                {parsedData.education && parsedData.education.length > 0
                  ? parsedData.education.map((e, i) => (
                      <p key={i}>
                        {e.degree || "N/A"}, {e.school || "N/A"} ({e.year || "N/A"})
                      </p>
                    ))
                  : <p>N/A</p>}
              </div>
            </div>
            <div className="mt-4">
              <input
                type="text"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                placeholder="Enter Job ID to Analyze"
                className="input-field mb-2"
              />
              <button
                onClick={handleAnalyze}
                className="btn-primary mt-2"
                disabled={isLoading}
              >
                Analyze Resume
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}