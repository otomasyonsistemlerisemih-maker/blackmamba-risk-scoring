import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MambaScore | Yapay Zekâ Destekli Dinamik Çek Skorlama & B2B Risk Analizi",
  description: "MambaScore, çoklu ajanlı (multi-agent) yapay zekâ teknolojisi kullanarak şirketlerin banka verilerini analiz eder, 45 günlük nakit projeksiyonları oluşturur ve vadeli çek risklerini anlık hesaplar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${outfit.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
