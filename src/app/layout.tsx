import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "I'm Cooked - Your AI Cooking Coach",
  description:
    "Hands-free voice guidance that walks you through every step. Your AI cooking coach with smart timers, real-time help, and recipe customization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${outfit.variable} antialiased`}
        style={{ fontFamily: "var(--font-outfit)" }}
      >
        {children}
      </body>
    </html>
  );
}
