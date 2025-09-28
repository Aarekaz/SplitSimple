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
  Package
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

interface BillMetadata {
  id: string
  bill: any
  createdAt: string
  lastModified: string
  expiresAt: string
  accessCount: number
  size: number
  shareUrl: string
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
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Bill Management System</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalBills}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.activeBills} active, {stats.closedBills} closed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalItems}</div>
                <p className="text-xs text-muted-foreground">
                  Across all bills
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total People</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPeople}</div>
                <p className="text-xs text-muted-foreground">
                  Unique participants
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatBytes(stats.totalStorageSize)}</div>
                <p className="text-xs text-muted-foreground">
                  Avg: {formatBytes(stats.averageBillSize)} per bill
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Bills Management</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchBills()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('json')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('csv')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search bills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lastModified">Last Modified</SelectItem>
                  <SelectItem value="createdAt">Created Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="size">Size</SelectItem>
                  <SelectItem value="items">Items Count</SelectItem>
                  <SelectItem value="people">People Count</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
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