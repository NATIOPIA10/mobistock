import type { Metadata } from "next";
// Manrope import removed (handled via Google Fonts link)
import "./globals.css";

import AuthWrapper from "@/components/AuthWrapper";

// const manrope = Manrope({ subsets: ["latin"], display: 'swap' });

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
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;400;600;800&display=swap"
        />
      </head>
      <body
        className="bg-surface text-on-surface antialiased min-h-screen flex flex-col md:flex-row"
        suppressHydrationWarning
      >
        <AuthWrapper>
          {children}
        </AuthWrapper>
      </body>
    </html>
  );
}
