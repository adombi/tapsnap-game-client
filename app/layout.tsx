import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import PlayerProvider from "@/app/player-provider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "TapSnap Game",
  description: "TapSnap a reflex game",
  icons: [
    {
      type: "icon",
      url: "/tapsnap-real-logo-color.ico"
    }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-dvh">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-dvh`}
      >
        <PlayerProvider>{children}</PlayerProvider>
      </body>
    </html>
  );
}
