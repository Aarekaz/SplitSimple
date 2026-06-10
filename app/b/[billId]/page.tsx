import { Suspense } from "react"
import type { Metadata } from "next"
import { ProBillSplitter } from "@/components/ProBillSplitter"
import { loadSharedBill } from "@/lib/load-shared-bill"
import { buildSharedBillOgModel } from "@/lib/shared-bill-og"

interface SharedBillPageProps {
  params: Promise<{ billId: string }>
}

// Reflect the shared bill's title/total in the link preview text. The colocated
// opengraph-image route supplies the image; here we only override the title and
// description, falling back to generic copy when the bill can't be loaded.
export async function generateMetadata({ params }: SharedBillPageProps): Promise<Metadata> {
  const { billId } = await params

  // Shared bills are random-ID utility pages that carry user financial data and
  // near-identical structure — never index them. Social scrapers ignore robots,
  // so the rich OG preview still works.
  const noindex = { index: false, follow: false } as const

  const bill = await loadSharedBill(billId)
  if (!bill) return { robots: noindex }

  const { title, peopleLabel, totalLabel } = buildSharedBillOgModel(bill)
  const pageTitle = `${title} · SplitSimple`
  const description = `Split ${totalLabel} across ${peopleLabel}. Open to see your share.`

  // Next.js shallow-merges metadata, so the openGraph/twitter objects replace the
  // layout's wholesale. Restate the inherited fields we care about — notably
  // twitter.card, so the large image card isn't downgraded to a small summary.
  return {
    title: pageTitle,
    description,
    robots: noindex,
    openGraph: { title: pageTitle, description, type: "website", siteName: "SplitSimple" },
    twitter: { card: "summary_large_image", title: pageTitle, description },
  }
}

export default function SharedBillPage() {
  return (
    <Suspense>
      <ProBillSplitter />
    </Suspense>
  )
}
