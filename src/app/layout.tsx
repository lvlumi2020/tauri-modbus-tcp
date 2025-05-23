import { Inter } from 'next/font/google'
import './globals.css'
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "demo",
  description: "",
};

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
