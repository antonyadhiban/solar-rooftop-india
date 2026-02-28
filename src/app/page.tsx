export default function Home() {
  return (
    <div>
      {/* Hero Section - Sarvam-inspired gradient */}
      <section className="relative overflow-hidden bg-gradient-to-br from-accent-blue-50 via-white to-energy-50">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-accent-blue-300 blur-3xl" />
          <div className="absolute right-10 bottom-20 h-96 w-96 rounded-full bg-energy-300 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent-blue-200 bg-accent-blue-50 px-4 py-1.5 text-sm font-medium text-accent-blue-700">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
              </svg>
              PM Surya Ghar Subsidy Calculator Included
            </div>
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
              Solar for all from India
            </h1>
            <p className="mb-6 text-lg leading-relaxed text-gray-600 sm:text-xl">
              Built on real data. Powered by NASA irradiance. Delivering accurate savings.
            </p>
            <p className="mb-10 text-base text-gray-500 sm:text-lg">
              India&apos;s most accurate free solar rooftop calculator. Click your roof on the map,
              get real irradiance data, state-specific tariff savings, and PM Surya Ghar subsidy
              calculations &mdash; all instantly.
            </p>
            <a
              href="/calculator"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue-500 via-indigo-500 to-energy-500 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-accent-blue-500/25 transition opacity-90 hover:opacity-100 hover:shadow-xl"
            >
              Experience opensolar
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Stats Section - compact */}
      <section className="border-y border-gray-100 bg-white py-10">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 sm:grid-cols-4 sm:px-6">
          {[
            { value: "4.5-6.5", label: "kWh/m²/day Solar Irradiance", sub: "Across India" },
            { value: "₹30K", label: "Per kW Subsidy", sub: "PM Surya Ghar (up to 3kW)" },
            { value: "3-5 yr", label: "Typical Payback", sub: "With subsidy" },
            { value: "25 yr", label: "Panel Lifespan", sub: "With warranty" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-extrabold gradient-text sm:text-3xl">{stat.value}</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{stat.label}</div>
              <div className="text-xs text-gray-500">{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Powering India's solar future */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
              Powering India&apos;s solar future
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                title: "Accurate by design",
                description:
                  "We use OpenStreetMap building footprints and NASA irradiance data. No guessing required.",
              },
              {
                title: "Real data",
                description:
                  "Location-specific solar irradiance from NASA POWER API for your exact latitude and longitude.",
              },
              {
                title: "Built for India",
                description:
                  "State-specific tariffs, PM Surya Ghar subsidy, and ROI projections for Indian homeowners.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="relative rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition hover:border-accent-blue-200 hover:shadow-md"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue-100 to-energy-100 text-accent-blue-600">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">{item.title}</h3>
                <p className="leading-relaxed text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-gray-500">
            For Homeowners | Installers | Developers
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
              India&apos;s full-stack solar calculator
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              Three simple steps to discover your solar savings potential
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Find Your Roof",
                description:
                  "Search for your address or click directly on the map. We automatically detect your building footprint using satellite data.",
                icon: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z",
              },
              {
                step: "2",
                title: "Get Solar Data",
                description:
                  "We fetch real solar irradiance data from NASA for your exact location and calculate optimal system size for your roof.",
                icon: "M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z",
              },
              {
                step: "3",
                title: "See Your Savings",
                description:
                  "View your complete financial analysis including state-specific tariff savings, PM Surya Ghar subsidy, and ROI projections.",
                icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition hover:border-accent-blue-200 hover:shadow-md"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue-100 to-energy-100 text-accent-blue-600">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                </div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-accent-blue-500">
                  Step {item.step}
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">{item.title}</h3>
                <p className="leading-relaxed text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
              Why opensolar?
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              Built specifically for Indian homeowners with real data, not guesswork
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Real Building Data",
                description: "We use OpenStreetMap building footprints to calculate your actual roof area — no guessing required.",
              },
              {
                title: "NASA Solar Data",
                description: "Location-specific solar irradiance from NASA POWER API for your exact latitude and longitude.",
              },
              {
                title: "State-Specific Tariffs",
                description: "Accurate savings based on your DISCOM's actual slab rates — BESCOM, TANGEDCO, MSEDCL, BYPL.",
              },
              {
                title: "PM Surya Ghar Subsidy",
                description: "Automatic calculation of your eligible subsidy under the PM Surya Ghar: Muft Bijli Yojana scheme.",
              },
              {
                title: "Complete ROI Analysis",
                description: "Payback period, 10-year and 25-year projections with tariff escalation and panel degradation.",
              },
              {
                title: "Shareable Results",
                description: "Get a unique URL for your results that you can share with family or on social media.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-gray-100 bg-white p-6 transition hover:border-accent-blue-200 hover:shadow-sm"
              >
                <h3 className="mb-2 font-bold text-gray-900">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Sarvam-style */}
      <section className="gradient-bg py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Build the future of India&apos;s solar
          </h2>
          <p className="mb-4 text-xl text-white/90">
            with opensolar.
          </p>
          <a
            href="/calculator"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-bold text-accent-blue-600 shadow-lg transition hover:bg-accent-blue-50 hover:shadow-xl"
          >
            Get Started Now
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </section>
    </div>
  );
}
