import type { Metadata } from "next";
import { Inter, Playfair_Display, DM_Sans } from "next/font/google";
import "../styles/globals.css";
import Navbar from "../components/Navbar";
import { ThemeProvider } from "../components/ThemeProvider";
import { CommandPalette } from "../components/CommandPalette";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "NeuralFlix — Global Cinema Discovery & AI Recommendations",
    template: "%s | NeuralFlix",
  },
  description:
    "The world's first truly global movie discovery platform. Bollywood, Korean, Japanese, French & 50+ cinema traditions — all powered by AI recommendations. Free forever.",
  keywords: [
    "movie recommendations", "bollywood movies", "korean movies", "world cinema",
    "movie database", "AI recommendations", "Indian cinema", "NeuralFlix",
    "best movies", "movie discovery", "watch movies online", "TMDB",
  ],
  openGraph: {
    title: "NeuralFlix — Global Cinema Discovery",
    description: "Discover cinema from 50+ countries with AI-powered recommendations.",
    type: "website",
    siteName: "NeuralFlix",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "NeuralFlix — Global Cinema Discovery",
    description: "Discover cinema from 50+ countries with AI-powered recommendations.",
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0a0a0f" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "NeuralFlix",
              url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
              description: "Global Cinema Discovery & AI Recommendation Platform",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/search?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${playfair.variable} ${dmSans.variable} min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar />
          <CommandPalette />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
