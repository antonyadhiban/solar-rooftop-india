import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Solar Rooftop Analysis Results | SuryaScope",
  description:
    "View detailed solar rooftop analysis including system size, annual generation, PM Surya Ghar subsidy, tariff savings, and ROI projections.",
  openGraph: {
    title: "Solar Rooftop Analysis Results | SuryaScope",
    description:
      "See how much you can save with rooftop solar. Detailed analysis with PM Surya Ghar subsidy and state-specific tariff calculations.",
    type: "website",
    locale: "en_IN",
  },
};

export default function ResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
