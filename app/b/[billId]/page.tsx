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
  const bill = await loadSharedBill(billId)
  if (!bill) return {}

  const { title, peopleLabel, totalLabel } = buildSharedBillOgModel(bill)
  const pageTitle = `${title} · SplitSimple`
  const description = `Split ${totalLabel} across ${peopleLabel}. Open to see your share.`

  // Next.js shallow-merges metadata, so the openGraph/twitter objects replace the
  // layout's wholesale. Restate the inherited fields we care about — notably
  // twitter.card, so the large image card isn't downgraded to a small summary.
  return {
    title: pageTitle,
    description,
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
