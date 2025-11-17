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
        return { error: 'Bill not found or expired' }
      }
      
      let errorMessage = 'Failed to retrieve bill'
      
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
      } catch (parseError) {
        // Handle non-JSON error responses
        if (response.status === 429) {
          errorMessage = 'Too many requests, please try again later'
        } else if (response.status >= 500) {
          errorMessage = 'Server error, please try again later'
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
      }
      
      throw new Error(errorMessage)
    }

    let data
    try {
      data = await response.json()
    } catch (parseError) {
      throw new Error('Invalid response format from server')
    }
    
    if (!data.bill) {
      throw new Error('Bill data is missing from response')
    }
    
    return { bill: data.bill }
  } catch (error) {
    console.error('Error retrieving bill from cloud:', error)
    return { 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Generate shareable URL
export function generateCloudShareUrl(billId: string): string {
  // Ensure we always use the root path for sharing
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  return `${baseUrl}/?bill=${billId}`
}
