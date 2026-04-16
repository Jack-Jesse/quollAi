import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quoll Classifier",
  description: "Upload images to classify quolls using a FastAI model",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen">{children}</body>
    </html>
  );
}
