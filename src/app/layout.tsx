import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniRoute — AI Gateway & Smart Fallback Router",
  description: "High-performance AI Router with automatic fallback, multi-provider load balancing, and Edge streaming for Vercel and Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-[#07090e] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
