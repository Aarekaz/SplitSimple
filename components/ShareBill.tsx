"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Share2, Copy, Check, ExternalLink } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useBill } from "@/contexts/BillContext"
import { copyToClipboard } from "@/lib/export"
import { useToast } from "@/hooks/use-toast"
import { storeBillInCloud, generateCloudShareUrl } from "@/lib/sharing"

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

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenDialog}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="flex items-center gap-1.5">
          <Share2 className="h-4 w-4" />
          {showText && <span>Share</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share "{state.currentBill.title}"
          </DialogTitle>
          <DialogDescription>
            Anyone with this link can view your bill. Bills are stored securely and expire after 30 days.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
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
            <div className="flex gap-2">
              <Input
                id="share-url"
                value={shareUrl}
                readOnly
                disabled={isStoring}
                className="flex-1 font-mono text-sm"
                onClick={(e) => (e.target as HTMLInputElement).select()}
                placeholder={isStoring ? "Generating link..." : ""}
              />
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

          <Alert>
            <AlertDescription className="text-sm">
              <strong>✅ Universal sharing:</strong> This link works for anyone and expires after 30 days. 
              Bills are stored securely in the cloud.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => handleOpenDialog(false)}>
              Close
            </Button>
            <Button 
              onClick={handleCopyUrl} 
              disabled={isStoring || !shareUrl}
              className="flex items-center gap-2"
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
