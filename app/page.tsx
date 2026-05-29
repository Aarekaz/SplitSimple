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
    <Suspense>
      <ProBillSplitter />
    </Suspense>
  )
}
