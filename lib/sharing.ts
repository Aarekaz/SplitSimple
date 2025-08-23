import type { Bill } from "@/contexts/BillContext"

// Store bill in Redis via API
export async function storeBillInCloud(bill: Bill): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/bills/${bill.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bill }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to store bill')
    }

    return { success: true }
  } catch (error) {
    console.error('Error storing bill in cloud:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Retrieve bill from Redis via API
export async function getBillFromCloud(billId: string): Promise<{ bill?: Bill; error?: string }> {
  try {
    const response = await fetch(`/api/bills/${billId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return { error: 'Bill not found or expired' }
      }
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to retrieve bill')
    }

    const data = await response.json()
    return { bill: data.bill }
  } catch (error) {
    console.error('Error retrieving bill from cloud:', error)
    return { 
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Generate shareable URL
export function generateCloudShareUrl(billId: string): string {
  return `${window.location.origin}${window.location.pathname}?bill=${billId}`
}
