"use client";

import { useState, useCallback, useEffect } from "react";
import { FileUpload } from "@ark-ui/react/file-upload";
import LinearBasic from "@/components/ui/progress-1";
import {
  FileText,
  Upload,
  X,
  CheckCircle2,
  Sparkles,
  Loader2,
  Wrench,
  Briefcase,
  Trophy,
  Lightbulb,
  Target,
  TrendingUp,
} from "lucide-react";

interface ResumeAnalysis {
  full_name: string;
  interesting_fact: string;
  summary: string;
  skills: string[];
  experience_level: string;
  experience_years: number;
  job_titles: string[];
  strengths: string[];
  improvements: string[];
  match_score: number;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return { stroke: "#22c55e", text: "text-green-600 dark:text-green-400", bg: "bg-green-500" };
    if (s >= 60) return { stroke: "#f59e0b", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500" };
    return { stroke: "#ef4444", text: "text-red-600 dark:text-red-400", bg: "bg-red-500" };
  };

  const color = getColor(score);

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" className="text-muted/30" strokeWidth={6} />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color.stroke} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{score}</span>
        <span className="text-[10px] text-muted-foreground font-medium">SCORE</span>
      </div>
    </div>
  );
}

function SkeletonPulse() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-3 w-48 rounded bg-muted" />
        </div>
      </div>
      <div className="h-px bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-3 rounded bg-muted" style={{ width: `${60 + Math.random() * 40}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function HeroSection() {
  const [status, setStatus] = useState<"idle" | "analyzing" | "done" | "error">("idle");
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentNotes, setCurrentNotes] = useState<string[]>([]);

  const analyzeResume = useCallback(async (file: File) => {
    setStatus("analyzing");
    setCurrentNotes([]);
    setError(null);
    setProgress(2); // Initial progress

    // Start a simulated micro-progress interval while waiting for network/LLM to kick in
    const microInterval = setInterval(() => {
      setProgress((prev) => {
        // Slow down the fake progress as it gets higher, capping at around 45%
        if (prev >= 45) return prev;
        const increment = Math.random() * 2; // small random micro adjustments
        return prev + increment;
      });
    }, 300);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const res = await fetch("/api/analyze-resume", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        clearInterval(microInterval);
        let errData;
        try { errData = await res.json(); } catch { /* ignore */ }
        throw new Error(errData?.error || "Analysis failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let content = "";

      if (reader) {
        let firstTokenReceived = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (!firstTokenReceived) {
            firstTokenReceived = true;
            clearInterval(microInterval); // Stop fake progress once stream starts
          }

          const chunk = decoder.decode(value, { stream: true });
          content += chunk;
          
          // Estimate progress based on expected response length (approx 800 characters)
          setProgress((prev) => {
            // Using content.length against an expected total length to calculate percentage
            const expectedTotalLength = 800;
            const textProgress = Math.min(98, (content.length / expectedTotalLength) * 100);
            
            // If the text comes in fast, make sure we only go up from our micro-adjusted point
            return Math.max(prev, textProgress);
          });
        }
      }

      clearInterval(microInterval);

      // We have the full response content, now parse the JSON
      let finalAnalysis;
      try {
        const cleaned = content
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        finalAnalysis = JSON.parse(cleaned);
      } catch {
        finalAnalysis = {
          full_name: "Candidate",
          interesting_fact: "You have a solid professional background.",
          summary: "There was a problem formatting your resume analysis. Please try again.",
          skills: [],
          experience_level: "Unknown",
          experience_years: 0,
          job_titles: [],
          strengths: [],
          improvements: [],
          match_score: 0,
        };
      }

      setAnalysis(finalAnalysis);
      setProgress(100);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
      setCurrentNotes([]);
      setProgress(0);
    }
  }, []);

  const learningNotes = [
    "Scanning your contact details...",
    "Reading professional summary...",
    "Extracting work experience...",
    "Identifying core skills...",
    "Analyzing education background...",
    "Evaluating achievements...",
    "Synthesizing insights...",
  ];

  useEffect(() => {
    if (status !== "analyzing") {
      setCurrentNotes([]);
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      if (index < learningNotes.length) {
        setCurrentNotes((prev) => [...prev, learningNotes[index]]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 700);

    return () => clearInterval(interval);
  }, [status, learningNotes]);

  return (
    <section className="relative overflow-hidden border-b">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
      <div className="relative mx-auto max-w-7xl px-6 py-12 md:py-20">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted/50 text-xs font-medium text-muted-foreground mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            AI-powered resume analysis
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-[1.15]">
            Upload your resume, get{" "}
            <span className="text-muted-foreground">instant insights.</span>
          </h1>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto text-sm">
            Drop your resume and our AI will analyze your skills, suggest job matches, and score your profile.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left — Upload */}
          <div className="order-2 lg:order-1">
            <FileUpload.Root
              maxFiles={1}
              accept=".pdf,.doc,.docx"
              className="w-full"
              onFileAccept={(details) => {
                if (details.files.length > 0) {
                  analyzeResume(details.files[0]);
                }
              }}
            >
              <FileUpload.Context>
                {({ acceptedFiles }) => (
                  <div className="space-y-4">
                    {/* Dropzone */}
                    <FileUpload.Dropzone className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center py-14 px-6 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer group">
                      <div className="w-16 h-16 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                        <Upload className="w-7 h-7 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                      </div>
                      <div className="text-center space-y-1.5">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          Drop your resume here
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          or{" "}
                          <span className="text-gray-900 dark:text-gray-100 font-medium underline underline-offset-2">
                            browse files
                          </span>
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          Supports PDF, DOC, DOCX
                        </p>
                      </div>
                    </FileUpload.Dropzone>

                    {/* Uploaded File Card */}
                    {acceptedFiles.length > 0 && (
                      <FileUpload.ItemGroup>
                        <FileUpload.Item file={acceptedFiles[0]} className="w-full">
                          <div className="flex flex-col gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
                            <div className="flex items-center gap-4">
                              <div className="relative w-10 h-10 flex items-center justify-center shrink-0 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50">
                                <FileText className="w-5 h-5 text-red-500 dark:text-red-400" />
                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                                  <CheckCircle2 className="w-3 h-3 text-white" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                  <FileUpload.ItemName />
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <FileUpload.ItemSizeText className="text-xs text-gray-400 dark:text-gray-500" />
                                  {status === "analyzing" && (
                                    <span className="text-xs text-primary font-medium flex items-center gap-1">
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      Analyzing...
                                    </span>
                                  )}
                                  {status === "done" && (
                                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                      Analysis complete
                                    </span>
                                  )}
                                  {status === "error" && (
                                    <span className="text-xs text-red-500 font-medium">
                                      Failed — try again
                                    </span>
                                  )}
                                </div>
                              </div>
                              <FileUpload.ItemDeleteTrigger className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0">
                                <X className="w-4 h-4" />
                              </FileUpload.ItemDeleteTrigger>
                            </div>
                            
                            {/* Loading Bar inside the file item card */}
                            {status === "analyzing" && (
                              <div className="w-full flex items-center gap-3 mt-2">
                                <div className="flex-1">
                                  <LinearBasic value={progress} className="!max-w-full" />
                                </div>
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-8 text-right">
                                  {Math.round(progress)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </FileUpload.Item>
                      </FileUpload.ItemGroup>
                    )}
                  </div>
                )}
              </FileUpload.Context>
              <FileUpload.HiddenInput />
            </FileUpload.Root>

            {/* Error message */}
            {status === "error" && error && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* Right — Analysis Results */}
          <div className="order-1 lg:order-2">
            {status === "idle" && (
              <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-8 flex flex-col items-center justify-center min-h-[380px] text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Resume insights will appear here</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                  Upload a resume to see your skills analysis, experience score, and job recommendations.
                </p>
              </div>
            )}

            {status === "analyzing" && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6 min-h-[380px]">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-foreground">AI is learning your resume</h3>
                  <p className="text-sm text-muted-foreground">Discovering your experience and skills in real-time</p>
                </div>
                <div className="space-y-3 max-w-md mx-auto">
                  {currentNotes.map((note, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/30 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-100"
                      style={{ animationDelay: `${i * 150}ms` }}
                    >
                      <div className="w-2 h-2 bg-primary rounded-full mt-2.5 flex-shrink-0" />
                      <span className="text-sm text-foreground leading-relaxed flex-1">{note}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {status === "done" && analysis && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5 animate-in fade-in-0 slide-in-from-right-4 duration-500">
                {/* Personalized Greeting */}
                <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Well done, {analysis.full_name}! 👋
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {analysis.interesting_fact}
                  </p>
                </div>

                {/* Score + Summary row */}
                <div className="flex items-start gap-5">
                  <ScoreRing score={analysis.match_score} />
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {analysis.experience_level}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ~{analysis.experience_years} yrs experience
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {analysis.summary}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Skills */}
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold mb-2.5">
                    <Wrench className="w-4 h-4 text-muted-foreground" />
                    Top Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recommended Job Titles */}
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold mb-2.5">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    Recommended Roles
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.job_titles.map((title) => (
                      <span
                        key={title}
                        className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium"
                      >
                        {title}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Strengths */}
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <Trophy className="w-4 h-4 text-muted-foreground" />
                    Strengths
                  </h4>
                  <ul className="space-y-1">
                    {analysis.strengths.map((s) => (
                      <li key={s} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-green-500 mt-1 shrink-0">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Improvements */}
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <Lightbulb className="w-4 h-4 text-muted-foreground" />
                    Suggestions
                  </h4>
                  <ul className="space-y-1">
                    {analysis.improvements.map((s) => (
                      <li key={s} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-amber-500 mt-1 shrink-0">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Powered by badge */}
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">Powered by</span>
                  <span className="text-[10px] font-semibold text-muted-foreground/60">GLM-4.5 Flash</span>
                </div>
              </div>
            )}

            {status === "error" && !error && (
              <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-8 flex flex-col items-center justify-center min-h-[200px] text-center">
                <Target className="w-8 h-8 text-red-400 mb-3" />
                <h3 className="text-base font-semibold text-red-700 dark:text-red-400">Analysis failed</h3>
                <p className="mt-1 text-sm text-red-600/70 dark:text-red-400/70">
                  Please check your API key and try again.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
