import type { Metadata } from "next";
import { Inter, Playfair_Display, Outfit } from "next/font/google";
import "../styles/globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { ThemeProvider } from "../components/ThemeProvider";
import { CommandPalette } from "../components/CommandPalette";
import Providers from "../components/Providers";
import AmbientBackground from "../components/AmbientBackground";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NeuralFlix — Cinema Discovery & ML Recommendations",
    template: "%s — NeuralFlix",
  },
  description:
    "Discover films from every corner of the world with ML-driven recommendations, multi-source ratings, and global cinema exploration.",
  keywords: [
    "movie recommendations",
    "cinema discovery",
    "film ratings",
    "world cinema",
    "collaborative filtering",
    "content based filtering",
    "streaming guide",
    "NeuralFlix",
  ],
  openGraph: {
    title: "NeuralFlix",
    description: "Global cinema discovery with ML-driven recommendations.",
    type: "website",
    siteName: "NeuralFlix",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "NeuralFlix",
    description: "Global cinema discovery with ML-driven recommendations.",
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable} ${outfit.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0E0E10" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "NeuralFlix",
              url:
                process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
              description:
                "Intelligent cinema discovery powered by machine learning",
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
        <ThemeProvider>
          <Providers>
            <div className="app-shell relative min-h-screen flex flex-col">
              <AmbientBackground />
              <Navbar />
              <CommandPalette />
              <main className="flex-grow z-10 relative">
                {children}
              </main>
              <Footer />
            </div>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
