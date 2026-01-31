import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "OG Image - SplitSimple",
  alternates: {
    canonical: "/og-image",
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function OgImagePage() {
  return (
    <div id="main-content" className="w-[1200px] h-[630px] bg-slate-50 text-slate-900 relative overflow-hidden">
      <style>{`
        [data-nextjs-dialog-overlay],
        [data-nextjs-dialog],
        nextjs-portal,
        #__next-build-indicator {
          display: none !important;
        }
      `}</style>

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 450px at 90% 0%, rgba(59, 130, 246, 0.16), transparent 60%), radial-gradient(700px 400px at 0% 100%, rgba(16, 185, 129, 0.14), transparent 60%), linear-gradient(180deg, #F8FAFC 0%, #EEF2FF 100%)",
        }}
      />

      <div className="absolute inset-0 opacity-25">
        <div className="absolute -top-20 -left-24 h-72 w-72 rounded-full border border-slate-200" />
        <div className="absolute top-20 right-12 h-56 w-56 rounded-full border border-slate-200" />
        <div className="absolute bottom-12 left-40 h-40 w-40 rounded-full border border-slate-200" />
      </div>

      <div className="relative h-full w-full p-16 flex items-center">
        <div className="bg-white/90 backdrop-blur rounded-3xl border border-slate-200 shadow-xl w-full h-full flex items-center px-16">
          <div className="flex-1 space-y-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1Z" fill="#16a34a" />
                  <path d="M16 8h-6a2 2 0 1 0 0 4h6" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 17.5v-11" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-xs uppercase tracking-[0.35em] text-slate-500 font-semibold">
                SplitSimple
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-6xl font-bold tracking-tight text-slate-900 font-inter">
                Split bills in seconds.
              </h1>
              <p className="text-xl text-slate-600 max-w-2xl font-inter">
                Split expenses with friends and colleagues effortlessly. Assign items, tips, and taxes with a clean
                spreadsheet workflow.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-600">
              <span className="px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm">
                Real-time totals
              </span>
              <span className="px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm">
                Receipt scan
              </span>
              <span className="px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm">
                Shareable links
              </span>
            </div>

            <div className="text-sm text-slate-500 font-space-mono">
              splitsimple.anuragd.me
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
