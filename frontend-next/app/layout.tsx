import type { Metadata } from "next";
import { Inter, Outfit, Playfair_Display } from "next/font/google";
import "../styles/globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { ThemeProvider } from "../components/ThemeProvider";
import { CommandPalette } from "../components/CommandPalette";
import Providers from "../components/Providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: {
    default: "NeuralFlix ML | Movie Recommendation System",
    template: "%s | NeuralFlix ML",
  },
  description:
    "An advanced machine learning web app for movie discovery, hybrid recommendations, and global cinema exploration.",
  keywords: [
    "machine learning",
    "movie recommendations",
    "recommender system",
    "collaborative filtering",
    "content based filtering",
    "world cinema",
    "NeuralFlix",
  ],
  openGraph: {
    title: "NeuralFlix ML",
    description: "Hybrid ML recommendations for global cinema.",
    type: "website",
    siteName: "NeuralFlix ML",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "NeuralFlix ML",
    description: "Hybrid ML recommendations for global cinema.",
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
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${outfit.variable} ${playfair.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#F7F9FC" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "NeuralFlix ML",
              url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
              description: "Machine learning movie recommendation platform",
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
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Providers>
            <div className="app-shell">
              <Navbar />
              <CommandPalette />
              {children}
              <Footer />
            </div>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
