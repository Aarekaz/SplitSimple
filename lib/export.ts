import type { Bill } from "@/contexts/BillContext"
import { getBillSummary, getItemBreakdowns } from "./calculations"

// Generate text summary for copying
export function generateSummaryText(bill: Bill): string {
  const summary = getBillSummary(bill)
  const itemBreakdowns = getItemBreakdowns(bill)
  const currencySymbol = getCurrencySymbol(bill.currency)

  let text = `${bill.title}\n`
  text += "=".repeat(bill.title.length) + "\n\n"

  // Person totals
  if (summary.personTotals.length > 0) {
    text += "INDIVIDUAL BREAKDOWN:\n"
    summary.personTotals.forEach((personTotal) => {
      const person = bill.people.find((p) => p.id === personTotal.personId)
      if (person) {
        text += `\n${person.name}:\n`

        // Show items this person is splitting
        itemBreakdowns.forEach((breakdown) => {
          const personShare = breakdown.splits[person.id]
          if (personShare && personShare > 0) {
            text += `  • ${breakdown.itemName}: ${currencySymbol}${personShare.toFixed(2)}\n`
          }
        })

        // Show totals breakdown
        text += `  Subtotal: ${currencySymbol}${personTotal.subtotal.toFixed(2)}\n`
        if (personTotal.tax > 0) {
          text += `  Tax: ${currencySymbol}${personTotal.tax.toFixed(2)}\n`
        }
        if (personTotal.tip > 0) {
          text += `  Tip: ${currencySymbol}${personTotal.tip.toFixed(2)}\n`
        }
        text += `  Total: ${currencySymbol}${personTotal.total.toFixed(2)}\n`
      }
    })
    text += "\n"
  }

  // Bill summary
  text += "BILL SUMMARY:\n"
  text += `Subtotal: ${currencySymbol}${summary.subtotal.toFixed(2)}\n`

  if (summary.tax > 0) {
    text += `Tax: ${currencySymbol}${summary.tax.toFixed(2)}\n`
  }

  if (summary.tip > 0) {
    text += `Tip: ${currencySymbol}${summary.tip.toFixed(2)}\n`
  }

  text += `Grand Total: ${currencySymbol}${summary.total.toFixed(2)}\n`

  return text
}

// Generate per-item breakdown text
export function generateItemBreakdownText(bill: Bill): string {
  const itemBreakdowns = getItemBreakdowns(bill)
  const currencySymbol = getCurrencySymbol(bill.currency)

  let text = `${bill.title} - Item Breakdown\n`
  text += "=".repeat(`${bill.title} - Item Breakdown`.length) + "\n\n"

  itemBreakdowns.forEach((breakdown) => {
    text += `${breakdown.itemName} ${currencySymbol}${breakdown.itemPrice.toFixed(2)} → `

    const splits = Object.entries(breakdown.splits)
      .map(([personId, amount]) => {
        const person = bill.people.find((p) => p.id === personId)
        return person ? `${person.name} ${currencySymbol}${amount.toFixed(2)}` : ""
      })
      .filter(Boolean)

    text += splits.join(", ") + "\n"
  })

  return text
}

// Generate CSV data
export function generateCSV(bill: Bill): { itemsCSV: string; totalsCSV: string } {
  const summary = getBillSummary(bill)
  const itemBreakdowns = getItemBreakdowns(bill)

  // Items CSV
  let itemsCSV = "Item,Price,Method"
  bill.people.forEach((person) => {
    itemsCSV += `,${person.name}`
  })
  itemsCSV += "\n"

  itemBreakdowns.forEach((breakdown) => {
    const item = bill.items.find((i) => i.id === breakdown.itemId)
    itemsCSV += `"${breakdown.itemName}",${breakdown.itemPrice.toFixed(2)},${item?.method || "even"}`

    bill.people.forEach((person) => {
      const amount = breakdown.splits[person.id] || 0
      itemsCSV += `,${amount.toFixed(2)}`
    })
    itemsCSV += "\n"
  })

  // Totals CSV
  let totalsCSV = "Person,Subtotal,Tax,Tip,Total\n"
  summary.personTotals.forEach((personTotal) => {
    const person = bill.people.find((p) => p.id === personTotal.personId)
    if (person) {
      totalsCSV += `"${person.name}",${personTotal.subtotal.toFixed(2)},${personTotal.tax.toFixed(2)},${personTotal.tip.toFixed(2)},${personTotal.total.toFixed(2)}\n`
    }
  })

  return { itemsCSV, totalsCSV }
}

// Download CSV files
export function downloadCSV(bill: Bill) {
  const { itemsCSV, totalsCSV } = generateCSV(bill)

  // Download items CSV
  const itemsBlob = new Blob([itemsCSV], { type: "text/csv" })
  const itemsUrl = URL.createObjectURL(itemsBlob)
  const itemsLink = document.createElement("a")
  itemsLink.href = itemsUrl
  itemsLink.download = `${bill.title.replace(/[^a-z0-9]/gi, "_")}_items.csv`
  itemsLink.click()
  URL.revokeObjectURL(itemsUrl)

  // Download totals CSV
  setTimeout(() => {
    const totalsBlob = new Blob([totalsCSV], { type: "text/csv" })
    const totalsUrl = URL.createObjectURL(totalsBlob)
    const totalsLink = document.createElement("a")
    totalsLink.href = totalsUrl
    totalsLink.download = `${bill.title.replace(/[^a-z0-9]/gi, "_")}_totals.csv`
    totalsLink.click()
    URL.revokeObjectURL(totalsUrl)
  }, 100)
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = text
      textArea.style.position = "fixed"
      textArea.style.left = "-999999px"
      textArea.style.top = "-999999px"
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const result = document.execCommand("copy")
      textArea.remove()
      return result
    }
  } catch (error) {
    console.error("Failed to copy to clipboard:", error)
    return false
  }
}

// Get currency symbol
function getCurrencySymbol(currency: string): string {
  switch (currency) {
    case "USD":
    case "CAD":
      return "$"
    case "EUR":
      return "€"
    case "GBP":
      return "£"
    default:
      return "$"
  }
}
