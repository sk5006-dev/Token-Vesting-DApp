import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { VestingProvider } from "@/context/VestingContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AetherVesting - Premium AI-Powered Web3 Token Vesting Dashboard",
  description: "Next-generation institutional token vesting, locked capital management, and automated release analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full dark antialiased`}
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-full bg-[#030303] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
        <Providers>
          <VestingProvider>
            {children}
          </VestingProvider>
        </Providers>
      </body>
    </html>
  );
}
