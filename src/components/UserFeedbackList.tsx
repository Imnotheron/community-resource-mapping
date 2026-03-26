'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, MessageSquare, CheckCircle, XCircle, Eye, Trash2, Reply } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Feedback {
  id: string
  userId: string
  type: string
  subject: string | null
  message: string
  status: string
  adminResponse: string | null
  adminResponseDate: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface FeedbackListProps {
  userId: string
  isAdmin?: boolean
  isWorker?: boolean
}

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
  SUBMITTED: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200', icon: MessageSquare },
  REVIEWED: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-200', icon: Eye },
  RESOLVED: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', icon: CheckCircle },
  DISMISSED: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', icon: XCircle },
}

const TYPE_LABELS: Record<string, string> = {
  MESSAGE: 'Message',
  FEEDBACK: 'Feedback',
  REPORT: 'Report',
  BUG_REPORT: 'Bug Report',
  FEATURE_REQUEST: 'Feature Request',
  COMPLIMENT: 'Compliment',
  SUGGESTION: 'Suggestion',
  SERVICE_COMPLAINT: 'Service Complaint',
  OTHER: 'Other',
}

export function UserFeedbackList({ userId, isAdmin = false, isWorker = false }: FeedbackListProps) {
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [responseText, setResponseText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const fetchFeedback = async (page: number = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        status: statusFilter,
        type: typeFilter,
        userId,
        ...(isAdmin && { adminView: 'true' }),
      })

      const response = await fetch(`/api/feedback?${params}`)
      const data = await response.json()

      if (response.ok) {
        setFeedback(data.feedback)
        setTotalPages(data.pagination.totalPages)
        setCurrentPage(data.pagination.currentPage)
      } else {
        throw new Error(data.error || 'Failed to fetch feedback')
      }
    } catch (error) {
      console.error('Error fetching feedback:', error)
      toast({
        title: 'Error',
        description: 'Failed to load feedback',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeedback(1)
  }, [statusFilter, typeFilter, userId, isAdmin])

  const handleResponse = async () => {
    if (!selectedFeedback || !responseText.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/feedback/${selectedFeedback.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response: responseText,
          status: 'REVIEWED',
          userId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit response')
      }

      toast({
        title: 'Success',
        description: 'Response submitted successfully',
      })

      setSelectedFeedback(null)
      setResponseText('')
      fetchFeedback(currentPage)
    } catch (error) {
      console.error('Error responding to feedback:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit response',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/feedback/${id}?userId=${userId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete feedback')
      }

      toast({
        title: 'Success',
        description: 'Feedback deleted successfully',
      })

      fetchFeedback(currentPage)
    } catch (error) {
      console.error('Error deleting feedback:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete feedback',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const StatusIcon = ({ status }: { status: string }) => {
    const Icon = STATUS_COLORS[status]?.icon || MessageSquare
    return <Icon className="h-4 w-4" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feedback List</CardTitle>
        <CardDescription>
          {isAdmin ? 'View and manage all user feedback' : 'View your submitted feedback'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="REVIEWED">Reviewed</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="DISMISSED">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Type</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : feedback.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No feedback found
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  {isAdmin && <TableHead>User</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedback.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline">{TYPE_LABELS[item.type] || item.type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.subject || item.message.substring(0, 50)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.user.name}</div>
                          <div className="text-xs text-muted-foreground">{item.user.email}</div>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge
                        className={`${STATUS_COLORS[item.status]?.bg} ${STATUS_COLORS[item.status]?.text}`}
                      >
                        <span className="flex items-center gap-1">
                          <StatusIcon status={item.status} />
                          {item.status}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedFeedback(item)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                {item.subject || TYPE_LABELS[item.type]}
                              </DialogTitle>
                              <DialogDescription>
                                Submitted {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2">Message:</h4>
                                <p className="text-sm whitespace-pre-wrap">{item.message}</p>
                              </div>

                              {item.adminResponse && (
                                <div className="bg-muted p-4 rounded-lg">
                                  <h4 className="font-medium mb-2 flex items-center gap-2">
                                    <Reply className="h-4 w-4" />
                                    Admin Response:
                                  </h4>
                                  <p className="text-sm whitespace-pre-wrap">{item.adminResponse}</p>
                                  {item.adminResponseDate && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Responded {formatDistanceToNow(new Date(item.adminResponseDate), { addSuffix: true })}
                                    </p>
                                  )}
                                </div>
                              )}

                              {(isAdmin || isWorker) && !item.adminResponse && (
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Your Response:</label>
                                  <Textarea
                                    placeholder="Type your response..."
                                    value={responseText}
                                    onChange={(e) => setResponseText(e.target.value)}
                                    rows={4}
                                  />
                                  <Button onClick={handleResponse} disabled={isSubmitting || !responseText.trim()}>
                                    {isSubmitting ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Submitting...
                                      </>
                                    ) : (
                                      'Submit Response'
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => fetchFeedback(currentPage - 1)}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => fetchFeedback(page)}
                      isActive={page === currentPage}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => fetchFeedback(currentPage + 1)}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
