"use client";

import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/Header"; // Header with centered title
import "./globals.css";
import { AuthProvider } from "@descope/react-sdk"; // ✅ Import AuthProvider

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900 flex flex-col min-h-screen`}
      >
        {/* Wrap the app with AuthProvider */}
        <AuthProvider projectId={process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID!}>
          {/* Header always present */}
          <Header />

          {/* Main content (chat page or others) */}
          <main className="flex-1 flex flex-col">{children}</main>

          {/* Footer with mailto link */}
          <footer className="bg-white shadow-inner py-4 px-6 text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} All rights reserved. Application
            developed by{" "}
            <a
              href="mailto:gouthamcharan0608@gmail.com"
              className="text-blue-600 hover:underline"
            >
              Goutham
            </a>
            .
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
