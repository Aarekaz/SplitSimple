'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield,
  FileText,
  Users,
  TrendingUp,
  Search,
  Filter,
  Download,
  RefreshCw,
  Trash2,
  Edit,
  Eye,
  Calendar,
  Clock,
  Database,
  LogOut,
  Copy,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  BarChart3,
  Package,
  DollarSign,
  Target,
  Activity,
  Percent,
  Share2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'

interface BillMetadata {
  id: string
  bill: any
  createdAt: string
  lastModified: string
  expiresAt: string
  accessCount: number
  size: number
  shareUrl: string
  totalAmount: number
  lastAccessed?: string
}

interface AdminStats {
  totalBills: number
  activeBills: number
  draftBills: number
  closedBills: number
  totalItems: number
  totalPeople: number
  totalStorageSize: number
  averageBillSize: number
  // Phase 1 enhancements
  totalMoneyProcessed: number
  averageBillValue: number
  largestBill: number
  billsCreatedToday: number
  billsCreatedThisWeek: number
  billsCreatedThisMonth: number
  completionRate: number
  shareRate: number
  averageItemsPerBill: number
  averagePeoplePerBill: number
  popularSplitMethods: Array<{method: string, count: number, percentage: number}>
  totalTaxCollected: number
  totalTipsProcessed: number
  totalDiscountsGiven: number
}

export default function AdminPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [bills, setBills] = useState<BillMetadata[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('lastModified')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedBill, setSelectedBill] = useState<BillMetadata | null>(null)
  const [showBillDialog, setShowBillDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [billToDelete, setBillToDelete] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchBills()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentPage, searchQuery, statusFilter, sortBy, sortOrder])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/bills?limit=1')
      setIsAuthenticated(response.ok)
    } catch (error) {
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      if (response.ok) {
        setIsAuthenticated(true)
        setPassword('')
        toast({
          title: 'Success',
          description: 'Logged in successfully'
        })
      } else {
        toast({
          title: 'Error',
          description: 'Invalid password',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to login',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      setIsAuthenticated(false)
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const fetchBills = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        search: searchQuery,
        status: statusFilter,
        sortBy,
        sortOrder
      })

      const response = await fetch(`/api/admin/bills?${params}`)

      if (response.ok) {
        const data = await response.json()
        setBills(data.bills)
        setStats(data.stats)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Error fetching bills:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch bills',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteBill = async (billId: string) => {
    try {
      const response = await fetch(`/api/admin/bills/${billId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Bill deleted successfully'
        })
        fetchBills()
      } else {
        throw new Error('Failed to delete bill')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete bill',
        variant: 'destructive'
      })
    }

    setShowDeleteDialog(false)
    setBillToDelete(null)
  }

  const handleExtendBill = async (billId: string, days: number = 30) => {
    try {
      const response = await fetch(`/api/admin/bills/${billId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days })
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Bill expiration extended by ${days} days`
        })
        fetchBills()
      } else {
        throw new Error('Failed to extend bill')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to extend bill expiration',
        variant: 'destructive'
      })
    }
  }

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/admin/export?format=${format}`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `bills_export_${new Date().toISOString()}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({
          title: 'Success',
          description: 'Bills exported successfully'
        })
      } else {
        throw new Error('Failed to export bills')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export bills',
        variant: 'destructive'
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied',
      description: 'Share URL copied to clipboard'
    })
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      draft: 'secondary',
      closed: 'outline'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl text-center">Admin Access</CardTitle>
            <CardDescription className="text-center">
              Enter your admin password to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Clean, Minimal Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Real-time system overview</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-700">Live</span>
              </div>
              
              <Button variant="outline" onClick={handleLogout} className="gap-2">
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Revolutionary Flowing Dashboard */}
        {stats && (
          <div className="space-y-6 mb-6">
            
            {/* Hero Revenue Section - Full Width, Breathing */}
            <Card className="bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 border border-emerald-200/50 shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Cash Flow</h2>
                        <p className="text-sm text-gray-600">{stats.totalBills} bills processed</p>
                      </div>
                      <div className={`ml-auto flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                        stats.weeklyGrowth > 0 ? 'bg-green-100 text-green-700' : 
                        stats.weeklyGrowth < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        <TrendingUp className="w-4 h-4" />
                        {stats.weeklyGrowth > 0 ? '+' : ''}{stats.weeklyGrowth.toFixed(1)}% this week
                      </div>
                    </div>
                    
                    <div className="text-4xl font-bold text-gray-900 mb-2">
                      {formatCurrency(stats.totalMoneyProcessed)}
                    </div>
                    <p className="text-gray-600">
                      {formatCurrency(stats.averageBillValue)} average • {formatCurrency(stats.largestBill)} highest bill
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 lg:gap-6">
                    <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                      <div className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalTaxCollected)}</div>
                      <div className="text-sm text-gray-500">Tax</div>
                      <div className="text-xs text-emerald-600 mt-1">{stats.billsWithTax || 0} bills</div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                      <div className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalTipsProcessed)}</div>
                      <div className="text-sm text-gray-500">Tips</div>
                      <div className="text-xs text-blue-600 mt-1">{stats.billsWithTips || 0} bills</div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                      <div className="text-xl font-bold text-gray-900">{formatCurrency(stats.medianBillValue || 0)}</div>
                      <div className="text-sm text-gray-500">Median</div>
                      <div className="text-xs text-purple-600 mt-1">vs avg</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Flexible Grid - Adapts to Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              
              {/* Activity Card */}
              <Card className="bg-blue-50 border border-blue-200/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Activity</h3>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-auto" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Today</span>
                      <span className="text-2xl font-bold text-gray-900">{stats.billsCreatedToday}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">This Week</span>
                      <span className="text-lg font-semibold text-gray-800">{stats.billsCreatedThisWeek}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">This Month</span>
                      <span className="text-base font-medium text-gray-700">{stats.billsCreatedThisMonth}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Engagement Card */}
              <Card className="bg-purple-50 border border-purple-200/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-gray-900">Engagement</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">Completion Rate</span>
                        <span className="text-sm font-semibold text-gray-900">{Math.round(stats.completionRate)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full transition-all duration-700" 
                          style={{ width: `${Math.round(stats.completionRate)}%` }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">Share Rate</span>
                        <span className="text-sm font-semibold text-gray-900">{Math.round(stats.shareRate)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-700" 
                          style={{ width: `${Math.round(stats.shareRate)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Items Card */}
              <Card className="bg-indigo-50 border border-indigo-200/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-indigo-600" />
                      <h3 className="font-semibold text-gray-900">Items</h3>
                    </div>
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                      {stats.averageItemsPerBill.toFixed(1)} avg
                    </span>
                  </div>
                  
                  <div className="text-3xl font-bold text-gray-900 mb-2">{stats.totalItems}</div>
                  <p className="text-sm text-gray-600">Total items across all bills</p>
                  
                  <div className="flex items-center gap-1 mt-3">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`w-1.5 h-3 rounded ${
                          i < Math.min(5, Math.floor(stats.averageItemsPerBill)) ? 'bg-indigo-400' : 'bg-indigo-200'
                        }`} />
                      ))}
                    </div>
                    <span className="text-xs text-indigo-600 ml-2">items per bill</span>
                  </div>
                </CardContent>
              </Card>

              {/* People Card */}
              <Card className="bg-pink-50 border border-pink-200/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-pink-600" />
                    <h3 className="font-semibold text-gray-900">People</h3>
                  </div>
                  
                  <div className="text-3xl font-bold text-gray-900 mb-2">{stats.totalPeople}</div>
                  <p className="text-sm text-gray-600">{stats.averagePeoplePerBill.toFixed(1)} average collaboration</p>
                  
                  <div className="mt-3 flex items-center gap-2">
                    <div className="w-8 h-8 relative">
                      <div className="absolute inset-0 rounded-full border-2 border-pink-200" />
                      <div className="absolute inset-0 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" style={{animationDuration: '3s'}} />
                    </div>
                    <span className="text-xs text-pink-600">Active collaboration</span>
                  </div>
                </CardContent>
              </Card>

              {/* Split Method Card */}
              <Card className="bg-amber-50 border border-amber-200/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-amber-600" />
                      <h3 className="font-semibold text-gray-900">Split Method</h3>
                    </div>
                    <div className="w-6 h-6 bg-amber-500 rounded-full relative">
                      <div className="absolute inset-1 bg-amber-300 rounded-full" />
                    </div>
                  </div>
                  
                  <div className="text-2xl font-bold text-gray-900 capitalize mb-1">
                    {stats.popularSplitMethods && stats.popularSplitMethods[0]?.method || 'Even'}
                  </div>
                  <p className="text-sm text-gray-600">
                    {stats.popularSplitMethods && stats.popularSplitMethods[0]?.percentage.toFixed(0) || '0'}% of users prefer this method
                  </p>
                </CardContent>
              </Card>

              {/* Storage Card */}
              <Card className="bg-gray-50 border border-gray-200/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-gray-600" />
                      <h3 className="font-semibold text-gray-900">Storage</h3>
                    </div>
                    <span className="text-xs text-gray-500">KB</span>
                  </div>
                  
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {(stats.totalStorageSize / 1024).toFixed(1)} KB
                  </div>
                  <p className="text-sm text-gray-600">
                    {(stats.averageBillSize / 1024).toFixed(1)} KB average per bill
                  </p>
                  
                  <div className="flex items-end gap-1 mt-3 h-4">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className={`w-2 bg-gray-400 rounded-t ${
                        i < 6 ? 'h-full' : i < 7 ? 'h-3/4' : 'h-1/2'
                      }`} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Active Bills Card */}
              <Card className="bg-green-50 border border-green-200/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-gray-900">Active Bills</h3>
                    </div>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  </div>
                  
                  <div className="text-3xl font-bold text-gray-900 mb-2">{stats.activeBills}</div>
                  <p className="text-sm text-gray-600">Currently active</p>
                  
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex-1 bg-green-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{
                        width: `${Math.min(100, (stats.activeBills / stats.totalBills) * 100)}%`
                      }} />
                    </div>
                    <span className="text-xs text-green-600">of {stats.totalBills} total</span>
                  </div>
                </CardContent>
              </Card>

              {/* Shared Bills Card */}
              <Card className="bg-cyan-50 border border-cyan-200/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Share2 className="w-5 h-5 text-cyan-600" />
                      <h3 className="font-semibold text-gray-900">Shared Bills</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                      <div className="w-1 h-3 bg-cyan-300" />
                      <div className="w-2 h-2 bg-cyan-500 rounded-full" />
                    </div>
                  </div>
                  
                  <div className="text-3xl font-bold text-gray-900 mb-2">{stats.sharedBills}</div>
                  <p className="text-sm text-gray-600">
                    {Math.round((stats.sharedBills / stats.totalBills) * 100)}% collaboration rate
                  </p>
                </CardContent>
              </Card>

            </div>
          </div>
        )}

        {/* Enhanced Bills Management Section */}
        <Card className="border-slate-200 bg-gradient-to-r from-white to-slate-50">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-slate-600" />
                  Bills Command Center
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Complete control and monitoring of all system bills
                </CardDescription>
              </div>
              
              {/* Enhanced Action Bar */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-slate-700">Live</span>
                  <span className="text-xs text-slate-500">• {bills.length} total</span>
                </div>
                
                <Button 
                  onClick={() => fetchBills()} 
                  variant="outline" 
                  size="sm"
                  className="gap-1 btn-smooth border-slate-200 hover:border-slate-300"
                >
                  <RefreshCw className="h-4 w-4" />
                  Sync
                </Button>
                
                <div className="flex items-center">
                  <Button 
                    onClick={() => handleExport('json')} 
                    variant="outline" 
                    size="sm"
                    className="gap-1 btn-smooth border-slate-200 hover:border-slate-300 rounded-r-none"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                  <Button 
                    onClick={() => handleExport('csv')} 
                    variant="outline" 
                    size="sm"
                    className="gap-1 btn-smooth border-slate-200 hover:border-slate-300 rounded-l-none border-l-0"
                  >
                    CSV
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Enhanced Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search bills by title, ID, or amount..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="closed">Closed</option>
                </select>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="lastModified">Last Modified</option>
                  <option value="createdAt">Created</option>
                  <option value="totalAmount">Amount</option>
                  <option value="accessCount">Access Count</option>
                </select>
                
                <Button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  variant="outline"
                  size="sm"
                  className="px-2 btn-smooth border-slate-200 hover:border-slate-300"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2 text-slate-500 hover:text-slate-700"
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('all')
                    setSortBy('lastModified')
                    setSortOrder('desc')
                  }}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>

          </CardHeader>

          <CardContent>
            {/* Bills Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>People</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Last Modified</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">
                        {bill.bill.title || 'Untitled'}
                      </TableCell>
                      <TableCell>{getStatusBadge(bill.bill.status)}</TableCell>
                      <TableCell>{bill.bill.people?.length || 0}</TableCell>
                      <TableCell>{bill.bill.items?.length || 0}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(bill.totalAmount)}</TableCell>
                      <TableCell>{formatDate(bill.lastModified)}</TableCell>
                      <TableCell>
                        {bill.expiresAt === 'Never' ? (
                          <Badge variant="secondary">Never</Badge>
                        ) : (
                          <span className="text-sm">{formatDate(bill.expiresAt)}</span>
                        )}
                      </TableCell>
                      <TableCell>{formatBytes(bill.size)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedBill(bill)
                              setShowBillDialog(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(bill.shareUrl)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleExtendBill(bill.id)}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setBillToDelete(bill.id)
                              setShowDeleteDialog(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bill Details Dialog */}
      <Dialog open={showBillDialog} onOpenChange={setShowBillDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill Details</DialogTitle>
            <DialogDescription>
              Complete information and metadata for bill {selectedBill?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-4">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ID</Label>
                  <p className="text-sm font-mono">{selectedBill.id}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <p>{getStatusBadge(selectedBill.bill.status)}</p>
                </div>
                <div>
                  <Label>Created</Label>
                  <p className="text-sm">{formatDate(selectedBill.createdAt)}</p>
                </div>
                <div>
                  <Label>Last Modified</Label>
                  <p className="text-sm">{formatDate(selectedBill.lastModified)}</p>
                </div>
                <div>
                  <Label>Expires</Label>
                  <p className="text-sm">{selectedBill.expiresAt === 'Never' ? 'Never' : formatDate(selectedBill.expiresAt)}</p>
                </div>
                <div>
                  <Label>Size</Label>
                  <p className="text-sm">{formatBytes(selectedBill.size)}</p>
                </div>
              </div>

              {/* Share URL */}
              <div>
                <Label>Share URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={selectedBill.shareUrl} readOnly />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(selectedBill.shareUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Bill Content */}
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="people">People</TabsTrigger>
                  <TabsTrigger value="items">Items</TabsTrigger>
                  <TabsTrigger value="raw">Raw Data</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Title</Label>
                      <p>{selectedBill.bill.title || 'Untitled'}</p>
                    </div>
                    <div>
                      <Label>Total Amount</Label>
                      <p className="font-medium text-lg">{formatCurrency(selectedBill.totalAmount)}</p>
                    </div>
                    <div>
                      <Label>Tax/Tip Allocation</Label>
                      <p>{selectedBill.bill.taxTipAllocation || 'proportional'}</p>
                    </div>
                    <div>
                      <Label>Tax</Label>
                      <p>${selectedBill.bill.tax || '0'}</p>
                    </div>
                    <div>
                      <Label>Tip</Label>
                      <p>${selectedBill.bill.tip || '0'}</p>
                    </div>
                    <div>
                      <Label>Discount</Label>
                      <p>${selectedBill.bill.discount || '0'}</p>
                    </div>
                  </div>
                  {selectedBill.bill.notes && (
                    <div>
                      <Label>Notes</Label>
                      <p className="text-sm mt-1">{selectedBill.bill.notes}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="people">
                  <div className="space-y-2">
                    {selectedBill.bill.people?.map((person: any) => (
                      <div
                        key={person.id}
                        className="flex items-center gap-2 p-2 rounded border"
                      >
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: person.color }}
                        />
                        <span>{person.name}</span>
                        <span className="text-sm text-muted-foreground">ID: {person.id}</span>
                      </div>
                    )) || <p className="text-muted-foreground">No people added</p>}
                  </div>
                </TabsContent>

                <TabsContent value="items">
                  <div className="space-y-2">
                    {selectedBill.bill.items?.map((item: any) => (
                      <div key={item.id} className="p-3 border rounded space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{item.name}</span>
                          <span>${item.price} × {item.quantity}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>Split Method: {item.method}</p>
                          <p>Split With: {item.splitWith?.length || 0} people</p>
                        </div>
                      </div>
                    )) || <p className="text-muted-foreground">No items added</p>}
                  </div>
                </TabsContent>

                <TabsContent value="raw">
                  <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-96">
                    {JSON.stringify(selectedBill.bill, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bill</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this bill? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => billToDelete && handleDeleteBill(billToDelete)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}