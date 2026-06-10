import { ImageResponse } from "next/og"
import { loadSharedBill } from "@/lib/load-shared-bill"
import { buildSharedBillOgModel } from "@/lib/shared-bill-og"

// Render on the Node.js runtime (Fluid Compute), not the Edge runtime.
export const runtime = "nodejs"
// Regenerate at most every 5 minutes so edits surface without hammering the
// backend on every social-scraper request. Route-segment config must be a
// static literal, so this mirrors SHARED_BILL_REVALIDATE_SECONDS by value.
export const revalidate = 300

export const alt = "Shared bill on SplitSimple"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

interface CardFields {
  title: string
  meta: string | null
  footer: string
}

function OgCard({ title, meta, footer }: CardFields) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        backgroundColor: "#0F172A",
        backgroundImage:
          "radial-gradient(900px 450px at 100% 0%, rgba(79,70,229,0.35), rgba(79,70,229,0) 60%), radial-gradient(700px 400px at 0% 100%, rgba(16,185,129,0.22), rgba(16,185,129,0) 60%)",
        color: "#F8FAFC",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{ width: "16px", height: "16px", borderRadius: "9999px", backgroundColor: "#16A34A" }} />
        <div style={{ fontSize: "24px", letterSpacing: "6px", color: "#94A3B8", fontWeight: 600 }}>
          SPLITSIMPLE · SHARED BILL
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ fontSize: "76px", fontWeight: 800, lineHeight: 1.05, color: "#FFFFFF" }}>{title}</div>
        {meta ? (
          <div style={{ fontSize: "36px", fontWeight: 600, color: "#C7D2FE" }}>{meta}</div>
        ) : null}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ fontSize: "28px", color: "#E2E8F0", fontWeight: 600 }}>{footer}</div>
        <div style={{ fontSize: "24px", color: "#64748B" }}>splitsimple.anuragd.me</div>
      </div>
    </div>
  )
}

export default async function Image({ params }: { params: Promise<{ billId: string }> }) {
  const { billId } = await params
  const bill = await loadSharedBill(billId)

  const fields: CardFields = bill
    ? (() => {
        const model = buildSharedBillOgModel(bill)
        return {
          title: model.title,
          meta: `${model.peopleLabel} · ${model.totalLabel} total`,
          footer: "Tap to view your share →",
        }
      })()
    : {
        title: "Split bills in seconds.",
        meta: null,
        footer: "Open to split this bill →",
      }

  return new ImageResponse(<OgCard {...fields} />, { ...size })
}
