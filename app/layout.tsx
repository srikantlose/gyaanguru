import type React from "react"
import type { Metadata } from "next"
import { Baloo_2, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Header } from "@/components/header"
import { Suspense } from "react"

const balooSans = Baloo_2({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700"], // rounded weights for headings/body
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "GyaanGuru - Personalized Learning Roadmaps",
  description: "Generate AI-powered personalized learning roadmaps tailored to your goals and experience level",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${balooSans.variable} ${geistMono.variable}`}>
      <body className="font-sans">
        {/* Make sure Header is a client component */}
        <Suspense fallback={<div>Loading...</div>}>
          <Header />
        </Suspense>

        {/* Render the page content */}
        {children}

        {/* Analytics */}
        <Analytics />
      </body>
    </html>
  )
}
