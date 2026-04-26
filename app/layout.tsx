import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

const manrope = Manrope({ subsets: ["latin"], display: 'swap' });

export const metadata: Metadata = {
  title: "Precision Atelier",
  description: "MobiStock Pro - The Digital Concierge",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body
        className={`${manrope.className} bg-surface text-on-surface antialiased min-h-screen flex flex-col md:flex-row`}
        suppressHydrationWarning
      >
        <Sidebar />
        <Header />
        {children}
      </body>
    </html>
  );
}
