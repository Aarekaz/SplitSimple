"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Share2, Copy, Check, ExternalLink, FileText, Download, Receipt } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useBill } from "@/contexts/BillContext"
import { copyToClipboard, generateItemBreakdownText, downloadCSV } from "@/lib/export"
import { useToast } from "@/hooks/use-toast"
import { storeBillInCloud, generateCloudShareUrl } from "@/lib/sharing"
import { ReceiptView } from "./ReceiptView"

interface ShareBillProps {
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
  showText?: boolean
}

export function ShareBill({ variant = "outline", size = "sm", showText = true }: ShareBillProps) {
  const { state } = useBill()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isStoring, setIsStoring] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [storeError, setStoreError] = useState<string | null>(null)

  // Generate share URL when dialog opens
  const handleOpenDialog = async (open: boolean) => {
    setIsOpen(open)
    if (open) {
      const url = generateCloudShareUrl(state.currentBill.id)
      setShareUrl(url)
      
      // Store bill in Redis when dialog opens
      setIsStoring(true)
      setStoreError(null)
      const result = await storeBillInCloud(state.currentBill)
      setIsStoring(false)
      
      if (!result.success) {
        setStoreError(result.error || "Failed to store bill for sharing")
        toast({
          title: "Storage failed",
          description: "Could not prepare bill for sharing. The link may not work for others.",
          variant: "destructive",
        })
      }
    }
  }

  const handleCopyUrl = async () => {
    const success = await copyToClipboard(shareUrl)
    if (success) {
      setCopied(true)
      toast({
        title: "Link copied!",
        description: "The shareable link has been copied to your clipboard.",
      })
      setTimeout(() => setCopied(false), 2000)
    } else {
      toast({
        title: "Failed to copy",
        description: "Could not copy the link. Please copy it manually.",
        variant: "destructive",
      })
    }
  }

  const handleOpenInNewTab = () => {
    window.open(shareUrl, '_blank')
  }

  const handleCopyBreakdown = async () => {
    if (state.currentBill.items.length === 0) {
      toast({
        title: "No items to copy",
        description: "Add items to generate a breakdown",
        variant: "destructive",
      })
      return
    }

    const breakdownText = generateItemBreakdownText(state.currentBill)
    const success = await copyToClipboard(breakdownText)

    if (success) {
      toast({
        title: "Breakdown copied!",
        description: "Item breakdown has been copied to your clipboard",
      })
    } else {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleExportCSV = async () => {
    if (state.currentBill.items.length === 0) {
      toast({
        title: "No data to export",
        description: "Add items to export CSV files",
        variant: "destructive",
      })
      return
    }

    try {
      downloadCSV(state.currentBill)
      toast({
        title: "CSV exported!",
        description: "Items and totals CSV files have been downloaded",
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Unable to export CSV files. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenDialog}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="flex items-center gap-1.5">
          <Share2 className="h-4 w-4" />
          {showText && <span>Share</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share & Export "{state.currentBill.title}"
          </DialogTitle>
          <DialogDescription>
            Share a link with anyone or export your bill data. Bills are stored securely and expire after 30 days.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 p-2 sm:p-0">
          {isStoring && (
            <Alert>
              <AlertDescription className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                Preparing bill for sharing...
              </AlertDescription>
            </Alert>
          )}

          {storeError && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">
                <strong>Error:</strong> {storeError}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="share-url" className="text-sm font-medium">
              Shareable Link
            </Label>
            <div className="space-y-2 sm:space-y-0 sm:flex sm:gap-2">
              <Input
                id="share-url"
                value={shareUrl}
                readOnly
                disabled={isStoring}
                className="flex-1 font-mono text-sm"
                onClick={(e) => (e.target as HTMLInputElement).select()}
                placeholder={isStoring ? "Generating link..." : ""}
              />
              <div className="flex gap-2 justify-center sm:justify-start">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyUrl}
                  disabled={isStoring || !shareUrl}
                  className="flex-shrink-0"
                  title="Copy link"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleOpenInNewTab}
                  disabled={isStoring || !shareUrl}
                  className="flex-shrink-0"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>✅ Universal sharing:</strong> This link works for anyone and expires after 30 days. 
              Bills are stored securely in the cloud.
            </AlertDescription>
          </Alert>

          {/* Export Options */}
          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm font-medium">Export Options</Label>
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <ReceiptView 
                  variant="outline" 
                  size="sm" 
                  showText={true}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyBreakdown}
                  disabled={state.currentBill.items.length === 0}
                  className="flex items-center gap-2 text-xs"
                >
                  <FileText className="h-4 w-4" />
                  Copy Breakdown
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={state.currentBill.items.length === 0}
                  className="flex items-center gap-2 text-xs"
                >
                  <Download className="h-4 w-4" />
                  Download CSV
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => handleOpenDialog(false)} className="w-full sm:w-auto">
              Close
            </Button>
            <Button 
              onClick={handleCopyUrl} 
              disabled={isStoring || !shareUrl}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <Share2 className="h-4 w-4" />
              {isStoring ? "Preparing..." : "Copy & Share"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
