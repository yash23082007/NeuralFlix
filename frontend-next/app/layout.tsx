import type { Metadata } from "next";
import "../styles/globals.css";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
  title: "NeuralFlix — ML-Powered Movie & Series Recommendations",
  description:
    "Explore a massive library of movies and TV shows with state-of-the-art Neural Collaborative Filtering recommendations. Personalized picks, trending cinema, and deep metadata integration.",
  keywords: ["movies", "recommendations", "AI", "ML", "Netflix clone", "NeuralFlix", "cinema", "TV shows"],
  authors: [{ name: "NeuralFlix Team" }],
  openGraph: {
    title: "NeuralFlix — The Future of Movie Discovery",
    description: "Discover your next favorite movie using our advanced ML recommendation engine.",
    url: "https://neuralflix.io",
    siteName: "NeuralFlix",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "NeuralFlix Recommender",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NeuralFlix — ML-Powered Recommendations",
    description: "Personalized movie picks driven by Neural Collaborative Filtering.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="min-h-screen flex flex-col bg-background">
          <Navbar />

          <main className="flex-grow">{children}</main>

          {/* Footer */}
          <footer className="border-t border-border bg-[#1a1a1a]">
            <div className="max-w-7xl mx-auto px-4 py-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 group cursor-pointer">
                  <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-700 text-black font-black text-sm px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(234,179,8,0.3)] group-hover:scale-105 transition-transform duration-300">
                    NF
                  </div>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 to-yellow-500 font-bold text-sm tracking-wider uppercase">
                    NeuralFlix
                  </span>
                </div>

                <div className="flex items-center gap-6 text-xs text-text-muted">
                  <span>ML-Powered Recommendations</span>
                  <span>·</span>
                  <span>TMDB Data</span>
                  <span>·</span>
                  <span>OMDB Ratings</span>
                </div>

                <p className="text-text-muted text-xs">
                  © {new Date().getFullYear()} NeuralFlix. Built with Next.js &
                  FastAPI.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
