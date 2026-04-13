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
      let errorMessage = 'Failed to store bill'
      
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
      } catch (parseError) {
        // Handle non-JSON error responses
        if (response.status === 413) {
          errorMessage = 'Bill is too large to store'
        } else if (response.status === 429) {
          errorMessage = 'Too many requests, please try again later'
        } else if (response.status >= 500) {
          errorMessage = 'Server error, please try again later'
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
      }
      
      throw new Error(errorMessage)
    }

    return { success: true }
  } catch (error) {
    console.error('Error storing bill in cloud:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
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
        return { error: "We couldn't find that bill. Bills expire after 6 months — ask the owner for a fresh link, or double-check the ID." }
      }

      let errorMessage = 'Something went wrong loading this bill. Please try again.'

      try {
        const errorData = await response.json()
        if (errorData.error) errorMessage = errorData.error
      } catch {
        // Handle non-JSON error responses
        if (response.status === 429) {
          errorMessage = "You've made too many requests. Wait a moment and try again."
        } else if (response.status >= 500) {
          errorMessage = "Our servers are having trouble. Please try again in a minute."
        }
      }

      throw new Error(errorMessage)
    }

    let data
    try {
      data = await response.json()
    } catch {
      throw new Error("We got an unexpected response from the server. Please try again.")
    }

    if (!data.bill) {
      throw new Error("This bill link is missing its data. Ask the owner to share a new link.")
    }

    return { bill: data.bill }
  } catch (error) {
    console.error('Error retrieving bill from cloud:', error)
    // Network failures (fetch itself throws) land here
    if (error instanceof TypeError) {
      return { error: "Couldn't reach the server. Check your connection and try again." }
    }
    return {
      error: error instanceof Error ? error.message : "Something unexpected happened. Please try again."
    }
  }
}

// Generate shareable URL
export function generateCloudShareUrl(billId: string): string {
  // Ensure we always use the root path for sharing
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  return `${baseUrl}/?bill=${billId}`
}
