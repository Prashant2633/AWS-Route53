import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "../components/Providers";

const inter = Inter({ subsets: ["latin"], fallback: ["sans-serif"] });

export const metadata: Metadata = {
  title: "AWS Route 53 Console",
  description: "Production-grade AWS Route53 Console Clone - Scaler SDE Fullstack Assignment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-[#1A2332] text-[#E8EDF2] antialiased transition-colors duration-200`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
