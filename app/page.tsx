import { Suspense } from "react"
import { redirect } from "next/navigation"
import { ProBillSplitter } from "@/components/ProBillSplitter"
import { buildSharedBillPath, getSharedBillIdFromSearch, stripSharedBillParams } from "@/lib/sharing"

interface HomePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getFirstParamValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const legacyBillId =
    getFirstParamValue(resolvedSearchParams.bill) ||
    getFirstParamValue(resolvedSearchParams.share)

  if (legacyBillId) {
    const rawSearch = new URLSearchParams()

    for (const [key, value] of Object.entries(resolvedSearchParams)) {
      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry !== undefined) {
            rawSearch.append(key, entry)
          }
        })
        continue
      }

      if (value !== undefined) {
        rawSearch.set(key, value)
      }
    }

    const nextSearch = stripSharedBillParams(`?${rawSearch.toString()}`)
    redirect(`${buildSharedBillPath(legacyBillId)}${nextSearch}`)
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense>
        <ProBillSplitter />
      </Suspense>
    </>
  )
}

// WebApplication structured data for the homepage — helps Google rich results
// and AI answer engines understand what SplitSimple is and that it's free.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "SplitSimple",
  url: "https://splitsimple.anuragd.me",
  description:
    "Split restaurant bills, rent, and group expenses by item, share, or exact amount. Free with no signup — see everyone's share instantly and share a link.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
}
