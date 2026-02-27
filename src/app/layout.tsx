import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SuryaScope - India's Solar Rooftop Calculator",
  description:
    "India's fastest and most accurate free solar calculator. Check your roof's solar potential, calculate savings with state-specific tariffs, PM Surya Ghar subsidy, and get your ROI in under 60 seconds.",
  keywords: [
    "solar calculator India",
    "rooftop solar cost",
    "PM Surya Ghar subsidy calculator",
    "solar panel savings India",
    "BESCOM solar calculator",
    "rooftop solar ROI",
  ],
  openGraph: {
    title: "SuryaScope - India's Solar Rooftop Calculator",
    description:
      "Check your roof's solar potential and calculate savings in under 60 seconds.",
    type: "website",
    locale: "en_IN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white antialiased">
        <nav className="sticky top-0 z-50 border-b border-solar-100 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <a href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-solar-400 to-energy-500">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">
                Surya<span className="text-solar-600">Scope</span>
              </span>
            </a>
            <div className="flex items-center gap-4">
              <a
                href="/calculator"
                className="rounded-lg bg-gradient-to-r from-solar-500 to-energy-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-solar-600 hover:to-energy-600"
              >
                Calculate Now
              </a>
            </div>
          </div>
        </nav>
        <main>{children}</main>
        <footer className="border-t border-gray-100 bg-gray-50 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-gray-500">
                &copy; 2026 SuryaScope. Built for India&apos;s solar future.
              </p>
              <div className="flex gap-6 text-sm text-gray-500">
                <span>Data: NASA POWER &middot; OpenStreetMap</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
