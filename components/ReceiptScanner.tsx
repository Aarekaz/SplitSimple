"use client"

import React, { useState, useCallback, useRef } from "react"
import {
  Camera,
  Upload,
  X,
  Check,
  Loader2,
  Image as ImageIcon,
  FileText,
  ScanLine,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Trash2,
  Plus,
  Minus
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { scanReceiptImage, parseReceiptText, OCRResult } from "@/lib/mock-ocr"
import { Item } from "@/contexts/BillContext"
import { useToast } from "@/hooks/use-toast"

type ScannerState = 'idle' | 'uploading' | 'processing' | 'reviewing'

interface ReceiptScannerProps {
  onImport: (items: Omit<Item, 'id' | 'splitWith' | 'method'>[]) => void
  trigger?: React.ReactNode
}

export function ReceiptScanner({ onImport, trigger }: ReceiptScannerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [state, setState] = useState<ScannerState>('idle')
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const [scannedItems, setScannedItems] = useState<OCRResult['items']>([])
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotate] = useState(0)
  const [activeTab, setActiveTab] = useState('image')
  const { toast } = useToast()

  const handleReset = useCallback(() => {
    setState('idle')
    setReceiptImage(null)
    setScannedItems([])
    setZoom(1)
    setRotate(0)
  }, [])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setTimeout(handleReset, 300) // Reset after animation
    }
  }

  const processImage = async (file: File) => {
    setState('processing')

    try {
      // Call the API - it will handle preview generation (skips for HEIC)
      const result = await scanReceiptImage(file)
      setScannedItems(result.items)

      // Use the preview from API if available
      if (result.preview) {
        setReceiptImage(result.preview)
      } else {
        // No preview available (e.g., HEIC files)
        // Set to null so ReviewView shows only items list
        setReceiptImage(null)
      }

      setState('reviewing')
    } catch (error) {
      console.error('Receipt scanning error:', error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      // Provide more specific error messages
      let title = "Scan Failed"
      let description = "Could not process receipt. Please try again."

      if (errorMessage.includes("No items detected")) {
        title = "No Items Found"
        description = "We couldn't detect any items in this receipt. Try a clearer image or add items manually."
      } else if (errorMessage.includes("HEIC") || errorMessage.includes("conversion")) {
        title = "Image Format Issue"
        description = "Could not convert HEIC image. Try uploading a JPG or PNG instead."
      } else if (errorMessage.includes("API_KEY")) {
        title = "Configuration Error"
        description = "Receipt scanning is not configured. Please check your environment variables."
      } else if (errorMessage.includes("API")) {
        title = "Service Unavailable"
        description = "The receipt scanning service is temporarily unavailable. Please try again later or add items manually."
      } else if (errorMessage.includes("file") || errorMessage.includes("size")) {
        title = "Invalid File"
        description = errorMessage
      } else {
        // Show actual error message for debugging
        description = `${errorMessage}\n\nCheck browser console for details.`
      }

      toast({
        title,
        description,
        variant: "destructive"
      })
      setState('idle')
    }
  }

  const handlePasteText = (text: string) => {
    if (!text.trim()) return
    const items = parseReceiptText(text)
    if (items.length > 0) {
      setScannedItems(items)
      setState('reviewing')
      setReceiptImage(null) // No image in text mode
    } else {
      toast({
        title: "No items found",
        description: "Try pasting text with prices (e.g., 'Burger 12.00')",
        variant: "destructive"
      })
    }
  }

  const handleImport = () => {
    onImport(scannedItems)
    setIsOpen(false)
    toast({
      title: "Items Imported",
      description: `Successfully added ${scannedItems.length} items from receipt.`
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Camera size={16} /> Scan Receipt
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={cn(
        "max-w-4xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden transition-all duration-300",
        state === 'reviewing' ? "sm:max-w-5xl" : "sm:max-w-xl h-auto"
      )}>
        {state === 'idle' && (
          <UploadView onUpload={processImage} onPaste={handlePasteText} />
        )}

        {state === 'processing' && (
          <ProcessingView />
        )}

        {state === 'reviewing' && (
          <ReviewView 
            image={receiptImage}
            items={scannedItems}
            onUpdateItems={setScannedItems}
            onCancel={handleReset}
            onImport={handleImport}
            zoom={zoom}
            setZoom={setZoom}
            rotation={rotation}
            setRotate={setRotate}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

// --- Sub-Components ---

function UploadView({ onUpload, onPaste }: { onUpload: (file: File) => void, onPaste: (text: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [pasteText, setPasteText] = useState("")

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="flex flex-col h-full">
      <DialogHeader className="p-6 pb-2 border-b border-slate-100">
        <DialogTitle>Add Receipt</DialogTitle>
      </DialogHeader>
      
      <Tabs defaultValue="image" className="flex-1 flex flex-col">
        <div className="px-6 pt-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="image"><ImageIcon className="w-4 h-4 mr-2" /> Upload Image</TabsTrigger>
            <TabsTrigger value="text"><FileText className="w-4 h-4 mr-2" /> Paste Text</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="image" className="flex-1 p-6 pt-4">
          <div 
            className={cn(
              "border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center text-center p-6 transition-all cursor-pointer bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-400",
              dragActive ? "border-indigo-500 bg-indigo-50/30" : "border-slate-200"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
            />
            <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Click to upload or drag & drop</h3>
            <p className="text-xs text-slate-500">Supports JPG, PNG, HEIC (Max 5MB) • Preview unavailable for HEIC</p>
          </div>
        </TabsContent>

        <TabsContent value="text" className="flex-1 p-6 pt-4 flex flex-col gap-4">
          <textarea 
            className="flex-1 w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="Paste receipt text here...
Example:
Garlic Naan 4.50
2x Butter Chicken 32.00"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <Button onClick={() => onPaste(pasteText)} disabled={!pasteText.trim()} className="w-full">
            Process Text
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ProcessingView() {
  return (
    <div className="h-[400px] flex flex-col items-center justify-center text-center p-6 space-y-6">
      <div className="relative">
        <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
        <div className="relative bg-white p-6 rounded-2xl shadow-xl border border-indigo-100">
          <ScanLine className="w-12 h-12 text-indigo-600 animate-pulse" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-slate-900">Scanning Receipt...</h3>
        <p className="text-sm text-slate-500 max-w-xs mx-auto">
          Our AI is analyzing the items and prices. This usually takes a few seconds.
        </p>
      </div>
    </div>
  )
}

interface ReviewViewProps {
  image: string | null
  items: OCRResult['items']
  onUpdateItems: (items: OCRResult['items']) => void
  onCancel: () => void
  onImport: () => void
  zoom: number
  setZoom: (z: number) => void
  rotation: number
  setRotate: (r: number) => void
}

function ReviewView({
  image,
  items,
  onUpdateItems,
  onCancel,
  onImport,
  zoom,
  setZoom,
  rotation,
  setRotate
}: ReviewViewProps) {
  const [activeTab, setActiveTab] = useState<"split" | "list">("split") // 'split' is desktop default, mobile handles via CSS

  const handleItemChange = (index: number, field: keyof typeof items[0], value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    onUpdateItems(newItems)
  }

  const handleDelete = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    onUpdateItems(newItems)
  }

  const handleAddItem = () => {
    onUpdateItems([...items, { name: "", price: "0.00", quantity: 1 }])
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200">
        <h2 className="font-bold text-slate-900">Verify Items</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-slate-500 hover:text-slate-700">
            Cancel
          </Button>
          <Button onClick={onImport} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
            Import {items.length} Items
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Image Pane (Hidden on Mobile unless toggled, but we use split layout for simplicity on desktop) */}
        {image && (
          <div className="flex-1 bg-slate-900 relative overflow-hidden md:block hidden">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-slate-800/90 p-1.5 rounded-lg backdrop-blur-sm border border-slate-700">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-slate-700" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>
                <Minus size={14} />
              </Button>
              <span className="text-xs font-mono text-white w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-slate-700" onClick={() => setZoom(Math.min(3, zoom + 0.25))}>
                <Plus size={14} />
              </Button>
              <div className="w-px h-4 bg-slate-700 mx-1"></div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-slate-700" onClick={() => setRotate((rotation + 90) % 360)}>
                <RotateCw size={14} />
              </Button>
            </div>
            
            <div className="w-full h-full flex items-center justify-center overflow-auto p-8">
              <img
                src={image}
                alt="Receipt"
                className="transition-transform duration-200 ease-out max-w-none"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                }}
                onError={(e) => {
                  console.error('Image failed to load:', e)
                }}
              />
            </div>
          </div>
        )}

        {/* Items List Pane */}
        <div className="flex-1 md:w-1/2 flex flex-col h-full bg-white border-l border-slate-200 shadow-xl z-10">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detected Items</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-500 hover:text-red-600" onClick={() => onUpdateItems([])}>
              Clear All
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="w-16 pt-1">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">QTY</label>
                  <input 
                    type="number" 
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm font-mono text-center focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="flex-1 pt-1">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">ITEM</label>
                  <input 
                    type="text" 
                    value={item.name}
                    onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-sm font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="w-24 pt-1">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">PRICE</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                    <input 
                      type="number" 
                      value={item.price}
                      onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded pl-5 pr-2 py-1.5 text-sm font-mono text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div className="pt-6">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50"
                    onClick={() => handleDelete(idx)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}

            <Button 
              variant="outline" 
              className="w-full border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 h-12"
              onClick={handleAddItem}
            >
              <Plus size={16} className="mr-2" /> Add Missing Item
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

