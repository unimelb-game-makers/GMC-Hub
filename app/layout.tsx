import type { Metadata } from "next";
import { Jost, Work_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const jost = Jost({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const workSans = Work_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "GMC Reimbursement Tracker",
  description:
    "Internal reimbursement tracker for the University of Melbourne Game Maker Club committee",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jost.variable} ${workSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink">
        {children}
      </body>
    </html>
  );
}
