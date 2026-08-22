import type { Metadata } from "next";
import "./globals.css";
import "./local-fonts.css";
import "./chapter-actions.css";

export const metadata: Metadata = {
  title: "QSound — Your private audiobook library",
  description: "Create books, upload chapters, and listen without interruption."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
