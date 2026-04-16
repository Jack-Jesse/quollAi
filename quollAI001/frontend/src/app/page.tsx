"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

interface ClassificationResult {
  prediction: string;
  confidence: number;
  probabilities: Record<string, number>;
  filename: string;
  preview: string;
}

export default function Home() {
  const [results, setResults] = useState<ClassificationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");

  // Check backend health on mount
  useState(() => {
    fetch(`${API_URL}/health`)
      .then((r) => r.json())
      .then(() => setBackendStatus("online"))
      .catch(() => setBackendStatus("offline"));
  });

  const classifyImage = async (file: File): Promise<ClassificationResult> => {
    const formData = new FormData();
    formData.append("image", file);

    const preview = URL.createObjectURL(file);

    const res = await fetch(`${API_URL}/classify`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Classification failed");
    }

    const data = await res.json();
    return { ...data, preview };
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setLoading(true);
    setError(null);

    try {
      const newResults = await Promise.all(
        acceptedFiles.map(async (file) => {
          try {
            return await classifyImage(file);
          } catch (e) {
            return {
              prediction: "error",
              confidence: 0,
              probabilities: {},
              filename: file.name,
              preview: URL.createObjectURL(file),
            } as ClassificationResult;
          }
        })
      );
      setResults((prev) => [...newResults, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"] },
    multiple: true,
  });

  const isQuoll = (r: ClassificationResult) =>
    r.prediction.toLowerCase().includes("quoll") &&
    !r.prediction.toLowerCase().includes("not");

  return (
    <main className="max-w-4xl mx-auto px-4 py-12 bg-gray-900 border-t-4 border-b-4 border-gray-700">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="mb-6">
          <div className="inline-block p-4 bg-gray-900 border-4 border-gray-700 rounded-lg shadow-lg transform hover:scale-105 transition-transform">
            <img 
              src="/logo.png" 
              alt="Quoll Classifier Logo" 
              className="mx-auto h-32 w-auto pixelated"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>
        <h1 className="text-5xl font-bold mb-2 tracking-wider text-green-400 font-mono">
          <span className="text-yellow-400">🦔</span> QUOLL CLASSIFIER
        </h1>
        <p className="text-gray-300 text-lg font-mono">
          UPLOAD & CLASSIFY PIXELATED
        </p>

        {/* Backend status */}
        <div className="mt-3 inline-flex items-center gap-2 text-sm game-button px-4 py-2">
          <span
            className={`w-2 h-2 rounded-full ${
              backendStatus === "online"
                ? "bg-green-400"
                : backendStatus === "offline"
                ? "bg-red-400"
                : "bg-yellow-400 animate-pulse"
            }`}
          />
          <span className="text-gray-300 font-mono">
            {backendStatus === "online"
              ? "▶ BACK ONLINE ⚡"
              : backendStatus === "offline"
              ? "⚠ BACK OFFLINE 🔄"
              : "● SCANNING..."}
          </span>
        </div>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`retro-border rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? "border-green-400 bg-green-400/20 scale-[1.01] shadow-lg"
            : "border-gray-600 hover:border-yellow-400 hover:bg-gray-900/50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 game-button rounded-lg flex items-center justify-center">
            <svg className="w-12 h-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xl text-yellow-400 font-bold font-mono tracking-wider">
            {isDragActive ? "DROP HERE!" : "UPLOAD IMAGES!"}
          </p>
          <p className="text-sm text-gray-400 font-mono uppercase tracking-wider">
            PNG JPG GIF WEBP • MULTIPLE FILES
          </p>
          <div className="flex gap-2 mt-2">
            <span className="px-3 py-1 bg-gray-800 text-gray-300 text-xs font-mono rounded game-button">CTRL+V</span>
            <span className="px-3 py-1 bg-gray-800 text-gray-300 text-xs font-mono rounded game-button">DRAG</span>
            <span className="px-3 py-1 bg-gray-800 text-gray-300 text-xs font-mono rounded game-button">CLICK</span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-6 p-4 bg-red-900/50 border-4 border-red-700 rounded-xl text-red-300 text-sm font-mono retro-border">
          ⚠ ERROR: {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <span className="text-green-400 font-mono text-lg font-bold">PROCESSING...</span>
        </div>
      )}

      {/* Results Grid */}
      {results.length > 0 && (
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-6 text-green-400 font-mono tracking-wider uppercase">
            RESULTS [{results.length}]
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r, i) => (
              <div
                key={i}
                className={`retro-border bg-gray-900 transition-all transform hover:scale-105 ${
                  r.prediction === "error"
                    ? "border-red-600"
                    : isQuoll(r)
                    ? "border-green-600 ring-2 ring-green-500/50"
                    : "border-gray-600"
                }`}
              >
                {/* Image */}
                <div className="relative aspect-square bg-gray-800">
                  <img
                    src={r.preview}
                    alt={r.filename}
                    className="w-full h-full object-cover pixelated"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  {/* Badge */}
                  <div
                    className={`absolute top-2 right-2 px-2 py-1 text-xs font-bold font-mono tracking-wider uppercase ${
                      r.prediction === "error"
                        ? "bg-red-600 text-white"
                        : isQuoll(r)
                        ? "bg-green-600 text-white"
                        : "bg-gray-700 text-gray-300"
                    } border border-gray-500`}
                  >
                    {r.prediction === "error" ? "ERROR" : r.prediction}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 bg-gray-900 border-t border-gray-800">
                  <p className="text-xs text-gray-300 font-mono truncate mb-2">{r.filename}</p>
                  {r.prediction !== "error" && (
                    <>
                      {/* Confidence bar */}
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-1 font-mono">
                          <span>CONFIDENCE</span>
                          <span>{(r.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isQuoll(r) ? "bg-green-500" : "bg-yellow-500"
                            }`}
                            style={{ width: `${r.confidence * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* All probabilities */}
                      <div className="space-y-1">
                        {Object.entries(r.probabilities).map(([cls, prob]) => (
                          <div key={cls} className="flex justify-between text-xs font-mono">
                            <span className="text-gray-400">{cls.toUpperCase()}</span>
                            <span className="text-gray-300">{(prob * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Retro Footer */}
      <div className="mt-16 text-center border-t-4 border-gray-700 pt-8">
        <div className="scanline inline-block px-6 py-3 game-button rounded-lg mb-4">
          <p className="text-green-400 font-mono text-sm uppercase tracking-wider">
            ⚡ AI POWERED ⚡ | 8-BIT ENGINE ⚡ | CLASSIFY LIKE A PRO ⚡
          </p>
        </div>
        <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">
          QUOLL CLASSIFIER v2.0 • MADE WITH 🚀 • PIXEL PERFECT
        </p>
      </div>
    </main>
  );
}
