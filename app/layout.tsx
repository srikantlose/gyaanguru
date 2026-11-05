import type React from "react"
import type { Metadata, Viewport } from "next"
import { Archivo, Figtree, Geist_Mono, Kalam } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Header } from "@/components/header"
import { SiteFooter } from "@/components/site-footer"
import { InteractiveBackground } from "@/components/interactive-background"

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
})

const kalam = Kalam({
  variable: "--font-kalam",
  subsets: ["latin", "devanagari"],
  weight: ["400", "700"],
  display: "swap",
})

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "GyaanGuru - Personalized Learning Roadmaps",
  description: "Personalized, NSQF-aligned learning roadmaps with lessons, quizzes, progress tracking and live jobs.",
}

export const viewport: Viewport = {
  themeColor: "#fff8e8",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${archivo.variable} ${figtree.variable} ${kalam.variable} ${geistMono.variable}`}
    >
      <body className="flex min-h-screen flex-col font-sans">
        <InteractiveBackground />
        <Header />
        <div className="flex-1 overflow-x-clip">{children}</div>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  )
}
