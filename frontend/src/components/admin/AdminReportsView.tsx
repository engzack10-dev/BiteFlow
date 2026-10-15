import { useState, useEffect, useCallback } from 'react'
import type {
  AdminReportData,
  ProductReportItem,
  SellingReportItem,
  OrderReportItem,
  FeedbackReportItem,
  Category,
} from '../../types/index.js'
import { api } from '../../api/client.js'
import {
  exportToCSV,
  exportToPrintablePDF,
  type ExportColumn,
} from '../../utils/exportUtils.js'
import {
  ShoppingCartIcon,
  TrendingUpIcon,
  ClipboardListIcon,
  MessageSquareIcon,
  BarChart3Icon,
  FileSpreadsheetIcon,
  PrinterIcon,
  ShieldCheckIcon,
  ClockIcon,
  DeliveryIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '../common/AdminIcons.js'

interface AdminReportsViewProps {
  getToken: () => Promise<string | null>
}

type ReportSubTab = 'products' | 'selling' | 'orders' | 'feedback' | 'overview'

export function AdminReportsView({ getToken }: AdminReportsViewProps) {
  const [activeTab, setActiveTab] = useState<ReportSubTab>('products')

  // Categories for product filtering
  const [categories, setCategories] = useState<Category[]>([])

  // 1. Product Report State
  const [productData, setProductData] = useState<{
    items: ProductReportItem[]
    totalCount: number
    availableCount: number
    unavailableCount: number
  }>({ items: [], totalCount: 0, availableCount: 0, unavailableCount: 0 })
  const [prodCategoryFilter, setProdCategoryFilter] = useState('ALL')
  const [prodAvailabilityFilter, setProdAvailabilityFilter] = useState('ALL')
  const [prodSearchFilter, setProdSearchFilter] = useState('')

  // 2. Selling Report State
  const [sellingData, setSellingData] = useState<{
    items: SellingReportItem[]
    summary: {
      totalVerifiedRevenue: number
      totalItemCount: number
      totalVerifiedOrders: number
      productsSoldCount: number
      currency: string
    }
    period: { startDate: string | null; endDate: string | null }
  }>({
    items: [],
    summary: {
      totalVerifiedRevenue: 0,
      totalItemCount: 0,
      totalVerifiedOrders: 0,
      productsSoldCount: 0,
      currency: 'USD',
    },
    period: { startDate: null, endDate: null },
  })
  const [sellingStartDate, setSellingStartDate] = useState('')
  const [sellingEndDate, setSellingEndDate] = useState('')

  // 3. Order Report State
  const [orderData, setOrderData] = useState<{
    items: OrderReportItem[]
    summary: {
      totalOrders: number
      totalAmount: number
      statusCounts: Record<string, number>
      paymentCounts: Record<string, number>
    }
    period: { startDate: string | null; endDate: string | null }
  }>({
    items: [],
    summary: {
      totalOrders: 0,
      totalAmount: 0,
      statusCounts: {},
      paymentCounts: {},
    },
    period: { startDate: null, endDate: null },
  })
  const [orderStartDate, setOrderStartDate] = useState('')
  const [orderEndDate, setOrderEndDate] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL')
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('ALL')

  // 4. Feedback Report State
  const [feedbackData, setFeedbackData] = useState<{
    items: FeedbackReportItem[]
    summary: {
      totalCount: number
      pendingCount: number
      reviewedCount: number
      archivedCount: number
    }
    period: { startDate: string | null; endDate: string | null }
  }>({
    items: [],
    summary: {
      totalCount: 0,
      pendingCount: 0,
      reviewedCount: 0,
      archivedCount: 0,
    },
    period: { startDate: null, endDate: null },
  })
  const [feedbackStartDate, setFeedbackStartDate] = useState('')
  const [feedbackEndDate, setFeedbackEndDate] = useState('')
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState('ALL')

  // 5. Operational Overview State (FS-09)
  const [overviewReport, setOverviewReport] = useState<AdminReportData | null>(null)
  const [overviewStartDate, setOverviewStartDate] = useState('')
  const [overviewEndDate, setOverviewEndDate] = useState('')

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exportNotice, setExportNotice] = useState<string | null>(null)

  // Load Categories on mount
  useEffect(() => {
    let isCancelled = false
    api.getCategories()
      .then((res) => {
        if (!isCancelled && res.categories) {
          setCategories(res.categories)
        }
      })
      .catch((err) => {
        console.warn('Failed to load categories for report filtering:', err)
      })
    return () => {
      isCancelled = true
    }
  }, [])

  // Show temporary export feedback toast
  const triggerExportNotice = (msg: string) => {
    setExportNotice(msg)
    setTimeout(() => setExportNotice(null), 4000)
  }

  // Fetch Product Report
  const loadProductReport = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.getAdminProductReport(getToken, {
        category: prodCategoryFilter,
        availability: prodAvailabilityFilter,
        search: prodSearchFilter.trim() || undefined,
      })
      setProductData({
        items: res.products,
        totalCount: res.totalCount,
        availableCount: res.availableCount,
        unavailableCount: res.unavailableCount,
      })
    } catch (err) {
      const e = err as Error
      setError(e.message || 'Failed to load product report')
    } finally {
      setIsLoading(false)
    }
  }, [getToken, prodCategoryFilter, prodAvailabilityFilter, prodSearchFilter])

  // Fetch Selling Report
  const loadSellingReport = useCallback(async (start?: string, end?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.getAdminSellingReport(getToken, {
        startDate: start || undefined,
        endDate: end || undefined,
      })
      setSellingData({
        items: res.products,
        summary: res.summary,
        period: res.period,
      })
    } catch (err) {
      const e = err as Error
      setError(e.message || 'Failed to load selling report')
    } finally {
      setIsLoading(false)
    }
  }, [getToken])

  // Fetch Order Report
  const loadOrderReport = useCallback(
    async (start?: string, end?: string, status?: string, payment?: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await api.getAdminOrderReport(getToken, {
          startDate: start || undefined,
          endDate: end || undefined,
          status: status || undefined,
          paymentStatus: payment || undefined,
        })
        setOrderData({
          items: res.orders,
          summary: res.summary,
          period: res.period,
        })
      } catch (err) {
        const e = err as Error
        setError(e.message || 'Failed to load order report')
      } finally {
        setIsLoading(false)
      }
    },
    [getToken]
  )

  // Fetch Feedback Report
  const loadFeedbackReport = useCallback(
    async (start?: string, end?: string, status?: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await api.getAdminFeedbackReport(getToken, {
          startDate: start || undefined,
          endDate: end || undefined,
          status: status || undefined,
        })
        setFeedbackData({
          items: res.feedback,
          summary: res.summary,
          period: res.period,
        })
      } catch (err) {
        const e = err as Error
        setError(e.message || 'Failed to load feedback report')
      } finally {
        setIsLoading(false)
      }
    },
    [getToken]
  )

  // Fetch Operational Overview
  const loadOverviewReport = useCallback(
    async (start?: string, end?: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await api.getAdminReports(getToken, {
          startDate: start || undefined,
          endDate: end || undefined,
        })
        setOverviewReport(res.report)
      } catch (err) {
        const e = err as Error
        setError(e.message || 'Failed to generate operational report')
      } finally {
        setIsLoading(false)
      }
    },
    [getToken]
  )

  // Load report data when active subtab changes
  useEffect(() => {
    let isCancelled = false
    Promise.resolve().then(() => {
      if (isCancelled) return
      if (activeTab === 'products') void loadProductReport()
      else if (activeTab === 'selling') void loadSellingReport(sellingStartDate, sellingEndDate)
      else if (activeTab === 'orders')
        void loadOrderReport(orderStartDate, orderEndDate, orderStatusFilter, orderPaymentFilter)
      else if (activeTab === 'feedback')
        void loadFeedbackReport(feedbackStartDate, feedbackEndDate, feedbackStatusFilter)
      else if (activeTab === 'overview') void loadOverviewReport(overviewStartDate, overviewEndDate)
    })
    return () => {
      isCancelled = true
    }
  }, [
    activeTab,
    loadProductReport,
    loadSellingReport,
    loadOrderReport,
    loadFeedbackReport,
    loadOverviewReport,
    sellingStartDate,
    sellingEndDate,
    orderStartDate,
    orderEndDate,
    orderStatusFilter,
    orderPaymentFilter,
    feedbackStartDate,
    feedbackEndDate,
    feedbackStatusFilter,
    overviewStartDate,
    overviewEndDate,
  ])

  // ==========================================
  // EXPORT HANDLERS (CSV & PDF)
  // ==========================================

  // Product Report: CSV Export
  const handleExportProductCSV = () => {
    if (productData.items.length === 0) {
      triggerExportNotice('No product records available to export.')
      return
    }

    const columns: ExportColumn<ProductReportItem>[] = [
      { header: 'Product Name', accessor: (p) => p.name },
      { header: 'Price ($)', accessor: (p) => p.price.toFixed(2) },
      { header: 'Quantity (Stock)', accessor: (p) => p.quantity },
      { header: 'Category', accessor: (p) => p.category },
      { header: 'Status', accessor: (p) => p.status },
      { header: 'Units Sold (Verified)', accessor: (p) => p.unitsSold },
      { header: 'Total Revenue ($)', accessor: (p) => p.revenueGenerated.toFixed(2) },
    ]

    const todayStr = new Date().toISOString().slice(0, 10)
    const filename = `biteflow-product-report-${todayStr}`

    exportToCSV(columns, productData.items, filename, [
      { label: 'Report', value: 'BiteFlow Product Catalog & Inventory Status' },
      { label: 'Category Filter', value: prodCategoryFilter },
      { label: 'Availability Filter', value: prodAvailabilityFilter },
      { label: 'Generated Date', value: new Date().toLocaleString() },
      { label: 'Inventory Note', value: 'Dishes are prepared fresh to order; warehouse stock count is N/A.' },
    ])

    triggerExportNotice(`Product report exported to ${filename}.csv`)
  }

  // Product Report: PDF Export
  const handleExportProductPDF = () => {
    if (productData.items.length === 0) {
      triggerExportNotice('No product records available to export.')
      return
    }

    const columns: ExportColumn<ProductReportItem>[] = [
      { header: 'Product Name', accessor: (p) => p.name },
      { header: 'Category', accessor: (p) => p.category },
      { header: 'Price', accessor: (p) => `$${p.price.toFixed(2)}` },
      { header: 'Quantity', accessor: (p) => p.quantity },
      { header: 'Status', accessor: (p) => p.status },
      { header: 'Units Sold', accessor: (p) => `${p.unitsSold} units` },
      { header: 'Revenue', accessor: (p) => `$${p.revenueGenerated.toFixed(2)}` },
    ]

    exportToPrintablePDF({
      title: 'Product Catalog & Status Report',
      subtitle: 'Complete menu catalog, availability state, and historical verified units sold',
      metadata: [
        { label: 'Category Filter', value: prodCategoryFilter },
        { label: 'Availability Filter', value: prodAvailabilityFilter },
        { label: 'Search Query', value: prodSearchFilter || 'None' },
        { label: 'Total Products', value: String(productData.totalCount) },
      ],
      summaryMetrics: [
        { label: 'Total Catalog Dishes', value: productData.totalCount, highlight: true },
        { label: 'Available to Order', value: productData.availableCount },
        { label: 'Unavailable / Sold Out', value: productData.unavailableCount },
      ],
      columns,
      data: productData.items,
      footerNotice:
        'BiteFlow Restaurant Operations • Menu dishes are made to order; stock count tracking is not applicable.',
    })

    triggerExportNotice('PDF print document generated. Select "Save as PDF" in the print window.')
  }

  // Selling Report: CSV Export
  const handleExportSellingCSV = () => {
    if (sellingData.items.length === 0) {
      triggerExportNotice('No sales records to export for this date range.')
      return
    }

    const columns: ExportColumn<SellingReportItem>[] = [
      { header: 'Product Name', accessor: (p) => p.productName },
      { header: 'Units Sold', accessor: (p) => p.quantitySold },
      { header: 'Historical Unit Price ($)', accessor: (p) => p.historicalUnitPrice.toFixed(2) },
      { header: 'Attributable Revenue ($)', accessor: (p) => p.revenue.toFixed(2) },
    ]

    const rangeLabel =
      sellingData.period.startDate || sellingData.period.endDate
        ? `${sellingData.period.startDate || 'start'}_to_${sellingData.period.endDate || 'end'}`
        : 'all_time'
    const filename = `biteflow-selling-report-${rangeLabel}`

    exportToCSV(columns, sellingData.items, filename, [
      { label: 'Report', value: 'BiteFlow Historical Selling & Verified Revenue Report' },
      { label: 'Reporting Period', value: `${sellingData.period.startDate || 'Beginning'} through ${sellingData.period.endDate || 'Present'}` },
      { label: 'Total Verified Revenue', value: `$${sellingData.summary.totalVerifiedRevenue.toFixed(2)}` },
      { label: 'Total Items Sold', value: String(sellingData.summary.totalItemCount) },
      { label: 'Qualifying Orders', value: String(sellingData.summary.totalVerifiedOrders) },
      { label: 'Financial Invariant', value: 'Only orders with paymentStatus === VERIFIED contribute to recognized revenue.' },
    ])

    triggerExportNotice(`Selling report exported to ${filename}.csv`)
  }

  // Selling Report: PDF Export
  const handleExportSellingPDF = () => {
    if (sellingData.items.length === 0) {
      triggerExportNotice('No sales records to export for this date range.')
      return
    }

    const columns: ExportColumn<SellingReportItem>[] = [
      { header: 'Menu Product', accessor: (p) => p.productName },
      { header: 'Units Sold', accessor: (p) => `${p.quantitySold} units` },
      { header: 'Historical Unit Price', accessor: (p) => `$${p.historicalUnitPrice.toFixed(2)}` },
      { header: 'Recognized Revenue', accessor: (p) => `$${p.revenue.toFixed(2)}` },
    ]

    exportToPrintablePDF({
      title: 'Historical Selling & Revenue Report',
      subtitle: 'Product demand volume and recognized revenue strictly from verified payment transactions',
      metadata: [
        {
          label: 'Reporting Period',
          value:
            sellingData.period.startDate || sellingData.period.endDate
              ? `${sellingData.period.startDate || 'Earliest'} — ${sellingData.period.endDate || 'Latest'}`
              : 'All-Time Persisted Records',
        },
        { label: 'Unique Products Sold', value: String(sellingData.summary.productsSoldCount) },
        { label: 'Qualifying Orders', value: String(sellingData.summary.totalVerifiedOrders) },
      ],
      summaryMetrics: [
        {
          label: 'Total Verified Revenue',
          value: `$${sellingData.summary.totalVerifiedRevenue.toFixed(2)}`,
          highlight: true,
        },
        { label: 'Total Items Sold', value: `${sellingData.summary.totalItemCount} units` },
        { label: 'Qualifying Verified Orders', value: sellingData.summary.totalVerifiedOrders },
        { label: 'Products Sold', value: sellingData.summary.productsSoldCount },
      ],
      columns,
      data: sellingData.items,
      footerNotice:
        'BiteFlow Financial Audit • Revenue strictly reflects verified payments; pending claims and unverified orders excluded.',
    })

    triggerExportNotice('Selling PDF document generated. Select "Save as PDF" in the print window.')
  }

  // Order Report: PDF Export
  const handleExportOrderPDF = () => {
    if (orderData.items.length === 0) {
      triggerExportNotice('No order records available to export for this criteria.')
      return
    }

    const columns: ExportColumn<OrderReportItem>[] = [
      { header: 'Order Ref', accessor: (o) => o.orderNumber },
      { header: 'Date & Time', accessor: (o) => new Date(o.createdAt).toLocaleString() },
      { header: 'Customer', accessor: (o) => o.customerName },
      { header: 'Items', accessor: (o) => `${o.itemCount} items` },
      { header: 'Order Status', accessor: (o) => o.statusLabel },
      { header: 'Payment Status', accessor: (o) => o.paymentStatusLabel },
      { header: 'Delivery Status', accessor: (o) => o.deliveryStatus },
      { header: 'Total ($)', accessor: (o) => `$${o.totalAmount.toFixed(2)}` },
    ]

    exportToPrintablePDF({
      title: 'Orders Lifecycle & Fulfillment Report',
      subtitle: 'Complete authoritative order history, payment status, and derived delivery status',
      metadata: [
        {
          label: 'Reporting Period',
          value:
            orderData.period.startDate || orderData.period.endDate
              ? `${orderData.period.startDate || 'Beginning'} — ${orderData.period.endDate || 'Present'}`
              : 'All Orders Placed',
        },
        { label: 'Order Status Filter', value: orderStatusFilter },
        { label: 'Payment Status Filter', value: orderPaymentFilter },
        { label: 'Total Matching Orders', value: String(orderData.summary.totalOrders) },
      ],
      summaryMetrics: [
        { label: 'Total Orders', value: orderData.summary.totalOrders, highlight: true },
        { label: 'Gross Orders Amount', value: `$${orderData.summary.totalAmount.toFixed(2)}` },
        { label: 'Verified Payments', value: orderData.summary.paymentCounts['VERIFIED'] || 0 },
        { label: 'Delivered Orders', value: orderData.summary.statusCounts['DELIVERED'] || 0 },
      ],
      columns,
      data: orderData.items,
      footerNotice:
        'BiteFlow Fulfillment Audit • Includes all records matching administrator filter criteria.',
    })

    triggerExportNotice('Order Report PDF document generated. Select "Save as PDF" in the print window.')
  }

  // Feedback Report: CSV Export
  const handleExportFeedbackCSV = () => {
    if (feedbackData.items.length === 0) {
      triggerExportNotice('No feedback records available to export.')
      return
    }

    const columns: ExportColumn<FeedbackReportItem>[] = [
      { header: 'Customer Name', accessor: (f) => f.customer },
      { header: 'Email', accessor: (f) => f.email },
      { header: 'Phone', accessor: (f) => f.phone },
      { header: 'Subject', accessor: (f) => f.subject },
      { header: 'Message', accessor: (f) => f.message },
      { header: 'Status', accessor: (f) => f.status },
      { header: 'Date', accessor: (f) => new Date(f.createdAt).toLocaleString() },
      { header: 'Reviewed By', accessor: (f) => f.reviewedBy || '—' },
    ]

    const filename = `biteflow-feedback-report-${new Date().toISOString().slice(0, 10)}`

    exportToCSV(columns, feedbackData.items, filename, [
      { label: 'Report', value: 'BiteFlow Customer Feedback & Inquiries Report' },
      { label: 'Generated Date', value: new Date().toLocaleString() },
      { label: 'Total Inquiries', value: String(feedbackData.summary.totalCount) },
      { label: 'Pending Review', value: String(feedbackData.summary.pendingCount) },
    ])

    triggerExportNotice(`Feedback report exported to ${filename}.csv`)
  }

  return (
    <div className="admin-reports-view">
      {/* Main Section Header */}
      <div className="admin-section-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h2 className="admin-section-heading">Operational & Business Reports (FS-10)</h2>
          <p className="admin-section-sub">
            Authoritative menu, selling performance, order lifecycle fulfillment, and customer inquiries with safe CSV and PDF exports.
          </p>
        </div>
      </div>

      {/* Export Toast Notice */}
      {exportNotice && (
        <div
          className="dashboard-alert-card alert-success"
          style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <CheckCircleIcon size={16} />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Sub-Tab Navigation Bar */}
      <div
        className="reports-subtab-bar"
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          background: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-light, #e5e7eb)',
          borderRadius: '12px',
          padding: '0.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <button
          type="button"
          style={{
            padding: '0.6rem 1.15rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            borderRadius: '8px',
            border: activeTab === 'products' ? '1px solid #0d9488' : '1px solid var(--border-light, #e5e7eb)',
            background: activeTab === 'products' ? '#0d9488' : 'var(--bg-card, #ffffff)',
            color: activeTab === 'products' ? '#ffffff' : 'var(--text-dark, #374151)',
            boxShadow: activeTab === 'products' ? '0 2px 4px rgba(13, 148, 136, 0.25)' : 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.55rem',
            transition: 'all 0.15s ease',
          }}
          onClick={() => setActiveTab('products')}
        >
          <ShoppingCartIcon size={16} />
          <span>Product Report</span>
        </button>

        <button
          type="button"
          style={{
            padding: '0.6rem 1.15rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            borderRadius: '8px',
            border: activeTab === 'selling' ? '1px solid #0d9488' : '1px solid var(--border-light, #e5e7eb)',
            background: activeTab === 'selling' ? '#0d9488' : 'var(--bg-card, #ffffff)',
            color: activeTab === 'selling' ? '#ffffff' : 'var(--text-dark, #374151)',
            boxShadow: activeTab === 'selling' ? '0 2px 4px rgba(13, 148, 136, 0.25)' : 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.55rem',
            transition: 'all 0.15s ease',
          }}
          onClick={() => setActiveTab('selling')}
        >
          <TrendingUpIcon size={16} />
          <span>Selling Report</span>
        </button>

        <button
          type="button"
          style={{
            padding: '0.6rem 1.15rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            borderRadius: '8px',
            border: activeTab === 'orders' ? '1px solid #0d9488' : '1px solid var(--border-light, #e5e7eb)',
            background: activeTab === 'orders' ? '#0d9488' : 'var(--bg-card, #ffffff)',
            color: activeTab === 'orders' ? '#ffffff' : 'var(--text-dark, #374151)',
            boxShadow: activeTab === 'orders' ? '0 2px 4px rgba(13, 148, 136, 0.25)' : 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.55rem',
            transition: 'all 0.15s ease',
          }}
          onClick={() => setActiveTab('orders')}
        >
          <ClipboardListIcon size={16} />
          <span>Order Report</span>
        </button>

        <button
          type="button"
          style={{
            padding: '0.6rem 1.15rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            borderRadius: '8px',
            border: activeTab === 'feedback' ? '1px solid #0d9488' : '1px solid var(--border-light, #e5e7eb)',
            background: activeTab === 'feedback' ? '#0d9488' : 'var(--bg-card, #ffffff)',
            color: activeTab === 'feedback' ? '#ffffff' : 'var(--text-dark, #374151)',
            boxShadow: activeTab === 'feedback' ? '0 2px 4px rgba(13, 148, 136, 0.25)' : 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.55rem',
            transition: 'all 0.15s ease',
          }}
          onClick={() => setActiveTab('feedback')}
        >
          <MessageSquareIcon size={16} />
          <span>Feedback Report</span>
        </button>

        <button
          type="button"
          style={{
            padding: '0.6rem 1.15rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            borderRadius: '8px',
            border: activeTab === 'overview' ? '1px solid #0d9488' : '1px solid var(--border-light, #e5e7eb)',
            background: activeTab === 'overview' ? '#0d9488' : 'var(--bg-card, #ffffff)',
            color: activeTab === 'overview' ? '#ffffff' : 'var(--text-dark, #374151)',
            boxShadow: activeTab === 'overview' ? '0 2px 4px rgba(13, 148, 136, 0.25)' : 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.55rem',
            transition: 'all 0.15s ease',
          }}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3Icon size={16} />
          <span>Operational Overview</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner" style={{ margin: '1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangleIcon size={16} />
          <span>{error}</span>
          <button
            type="button"
            className="btn-retry"
            onClick={() => {
              if (activeTab === 'products') void loadProductReport()
              else if (activeTab === 'selling') void loadSellingReport(sellingStartDate, sellingEndDate)
              else if (activeTab === 'orders')
                void loadOrderReport(orderStartDate, orderEndDate, orderStatusFilter, orderPaymentFilter)
              else if (activeTab === 'feedback')
                void loadFeedbackReport(feedbackStartDate, feedbackEndDate, feedbackStatusFilter)
              else if (activeTab === 'overview') void loadOverviewReport(overviewStartDate, overviewEndDate)
            }}
            style={{ marginLeft: '1rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. PRODUCT REPORT TAB                                        */}
      {/* ============================================================ */}
      {activeTab === 'products' && (
        <div className="product-report-section">
          {/* Controls & Filter Bar */}
          <div
            className="reports-filter-panel"
            style={{
              background: 'var(--bg-card, #ffffff)',
              border: '1px solid var(--border-light, #e5e7eb)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', flex: '1 1 500px' }}>
              <div style={{ flex: '1 1 180px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #6b7280)', marginBottom: '0.35rem' }}>
                  Search Product:
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="Filter by dish name..."
                  value={prodSearchFilter}
                  onChange={(e) => setProdSearchFilter(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void loadProductReport()}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ flex: '1 1 160px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #6b7280)', marginBottom: '0.35rem' }}>
                  Category:
                </label>
                <select
                  className="input-text"
                  value={prodCategoryFilter}
                  onChange={(e) => setProdCategoryFilter(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c._id || c.name} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: '1 1 150px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #6b7280)', marginBottom: '0.35rem' }}>
                  Availability:
                </label>
                <select
                  className="input-text"
                  value={prodAvailabilityFilter}
                  onChange={(e) => setProdAvailabilityFilter(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="ALL">All Availability</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="UNAVAILABLE">Unavailable</option>
                </select>
              </div>

              <button
                type="button"
                className="btn-action btn-inspect"
                onClick={() => void loadProductReport()}
                disabled={isLoading}
              >
                Apply Filters
              </button>
            </div>

            {/* Export Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-action btn-continue"
                onClick={handleExportProductCSV}
                disabled={isLoading || productData.items.length === 0}
                title="Export current product catalog dataset to safe RFC-4180 CSV"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <FileSpreadsheetIcon size={15} />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                className="btn-action btn-inspect"
                onClick={handleExportProductPDF}
                disabled={isLoading || productData.items.length === 0}
                title="Print or export current product catalog dataset to PDF"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <PrinterIcon size={15} />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="reports-summary-cards" style={{ marginBottom: '1.5rem' }}>
            <div className="report-metric-card metric-primary">
              <span className="metric-label">Total Catalog Products</span>
              <span className="metric-large-value">{productData.totalCount}</span>
              <span className="metric-footnote">Dishes in restaurant catalog</span>
            </div>
            <div className="report-metric-card">
              <span className="metric-label">Active / Available</span>
              <span className="metric-large-value" style={{ color: '#059669' }}>
                {productData.availableCount}
              </span>
              <span className="metric-footnote">Visible for customer order</span>
            </div>
            <div className="report-metric-card metric-warning">
              <span className="metric-label">Unavailable / Sold Out</span>
              <span className="metric-large-value">{productData.unavailableCount}</span>
              <span className="metric-footnote">Blocked from customer checkout</span>
            </div>
          </div>

          {/* Footnote on Inventory Stock vs Made-to-order */}
          <div
            style={{
              padding: '0.85rem 1rem',
              background: 'var(--bg-card, #ffffff)',
              border: '1px solid var(--border-light, #e5e7eb)',
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: 'var(--text-muted, #6b7280)',
              marginBottom: '1rem',
            }}
          >
            ℹ️ <strong>Inventory Note:</strong> BiteFlow menu dishes are freshly prepared to order upon verified customer purchase. Warehouse physical stock counting is not applicable; availability status directly governs orderability.
          </div>

          {/* Product Report Table */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
              Loading persisted product catalog records...
            </div>
          ) : productData.items.length === 0 ? (
            <div className="customer-orders-empty">
              <p>No products match the selected catalog criteria.</p>
            </div>
          ) : (
            <div className="dashboard-section-box">
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Category</th>
                      <th>Price ($)</th>
                      <th>Quantity (Inventory)</th>
                      <th>Status</th>
                      <th>Units Sold (Verified)</th>
                      <th>Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productData.items.map((prod) => (
                      <tr key={prod._id}>
                        <td>
                          <strong>{prod.name}</strong>
                        </td>
                        <td>
                          <span style={{ color: '#4b5563', fontSize: '0.9rem' }}>
                            {prod.category}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          ${prod.price.toFixed(2)}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic' }}>
                            {prod.quantity}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-badge ${
                              prod.isAvailable ? 'status-delivered' : 'status-pending_payment'
                            }`}
                          >
                            {prod.status}
                          </span>
                        </td>
                        <td>
                          <span className="items-count-badge">{prod.unitsSold} units</span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#059669' }}>
                          ${prod.revenueGenerated.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. SELLING REPORT TAB                                        */}
      {/* ============================================================ */}
      {activeTab === 'selling' && (
        <div className="selling-report-section">
          {/* Date Filter & Export Bar */}
          <div
            className="reports-filter-panel"
            style={{
              background: 'var(--bg-card, #ffffff)',
              border: '1px solid var(--border-light, #e5e7eb)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="date-input-group">
                <label htmlFor="selling-start-date" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Start Date:
                </label>
                <input
                  id="selling-start-date"
                  type="date"
                  className="input-text"
                  value={sellingStartDate}
                  onChange={(e) => setSellingStartDate(e.target.value)}
                />
              </div>
              <div className="date-input-group">
                <label htmlFor="selling-end-date" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  End Date:
                </label>
                <input
                  id="selling-end-date"
                  type="date"
                  className="input-text"
                  value={sellingEndDate}
                  onChange={(e) => setSellingEndDate(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn-action btn-inspect"
                onClick={() => void loadSellingReport(sellingStartDate, sellingEndDate)}
                disabled={isLoading}
              >
                Apply Range
              </button>
              {(sellingStartDate || sellingEndDate) && (
                <button
                  type="button"
                  className="btn-action btn-continue"
                  onClick={() => {
                    setSellingStartDate('')
                    setSellingEndDate('')
                    void loadSellingReport('', '')
                  }}
                  disabled={isLoading}
                >
                  Reset
                </button>
              )}
            </div>

            {/* Export Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-action btn-continue"
                onClick={handleExportSellingCSV}
                disabled={isLoading || sellingData.items.length === 0}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <FileSpreadsheetIcon size={15} />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                className="btn-action btn-inspect"
                onClick={handleExportSellingPDF}
                disabled={isLoading || sellingData.items.length === 0}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <PrinterIcon size={15} />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* Selected Period Badge */}
          <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <ClockIcon size={15} />
            <strong>Selected Reporting Period:</strong>{' '}
            {sellingData.period.startDate || sellingData.period.endDate ? (
              <span className="timestamp-pill" style={{ marginLeft: '0.35rem' }}>
                {sellingData.period.startDate || 'Earliest'} &rarr; {sellingData.period.endDate || 'Latest'}
              </span>
            ) : (
              <em>All-Time Historical Sales</em>
            )}
          </div>

          {/* Financial Summary Cards */}
          <div className="reports-summary-cards" style={{ marginBottom: '1.5rem' }}>
            <div className="report-metric-card metric-primary">
              <span className="metric-label">Total Verified Revenue</span>
              <span className="metric-large-value">
                ${sellingData.summary.totalVerifiedRevenue.toFixed(2)}
              </span>
              <span className="metric-footnote">
                Strictly from verified payment transactions ({sellingData.summary.totalVerifiedOrders} orders)
              </span>
            </div>
            <div className="report-metric-card">
              <span className="metric-label">Total Items Sold</span>
              <span className="metric-large-value">{sellingData.summary.totalItemCount}</span>
              <span className="metric-footnote">Cumulative items prepared & served</span>
            </div>
            <div className="report-metric-card">
              <span className="metric-label">Products with Sales</span>
              <span className="metric-large-value">{sellingData.summary.productsSoldCount}</span>
              <span className="metric-footnote">Distinct menu dishes purchased</span>
            </div>
            <div className="report-metric-card">
              <span className="metric-label">Qualifying Orders</span>
              <span className="metric-large-value">{sellingData.summary.totalVerifiedOrders}</span>
              <span className="metric-footnote">Verified fulfilled purchases</span>
            </div>
          </div>

          {/* Financial Invariant Notice */}
          <div
            style={{
              padding: '0.85rem 1rem',
              background: 'var(--bg-card, #ffffff)',
              border: '1px solid var(--border-light, #e5e7eb)',
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: 'var(--text-muted, #6b7280)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
            }}
          >
            <ShieldCheckIcon size={16} style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Financial Accuracy Invariant (FS-06 / FS-10):</strong> Revenue reflects historical persisted item unit prices from confirmed orders with verified payment status. Unverified customer claims and pending payment submissions are strictly segregated.
            </div>
          </div>

          {/* Selling Products Table */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
              Calculating authoritative sales totals and item demand...
            </div>
          ) : sellingData.items.length === 0 ? (
            <div className="customer-orders-empty">
              <p>No verified product sales recorded for this date range.</p>
            </div>
          ) : (
            <div className="dashboard-section-box">
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Product Name</th>
                      <th>Units Sold</th>
                      <th>Historical Unit Price</th>
                      <th>Attributable Revenue</th>
                      <th>Revenue Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sellingData.items.map((item, idx) => {
                      const share =
                        sellingData.summary.totalVerifiedRevenue > 0
                          ? ((item.revenue / sellingData.summary.totalVerifiedRevenue) * 100).toFixed(1)
                          : '0.0'
                      return (
                        <tr key={item.productName}>
                          <td>
                            <strong style={{ color: idx === 0 ? '#ea580c' : 'inherit' }}>
                              #{idx + 1}
                            </strong>
                          </td>
                          <td>
                            <strong>{item.productName}</strong>
                          </td>
                          <td>
                            <span className="items-count-badge">{item.quantitySold} units</span>
                          </td>
                          <td>${item.historicalUnitPrice.toFixed(2)}</td>
                          <td style={{ fontWeight: 700, color: '#059669' }}>
                            ${item.revenue.toFixed(2)}
                          </td>
                          <td>
                            <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{share}%</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. ORDER REPORT TAB                                          */}
      {/* ============================================================ */}
      {activeTab === 'orders' && (
        <div className="orders-report-section">
          {/* Date & Status Filter Bar */}
          <div
            className="reports-filter-panel"
            style={{
              background: 'var(--bg-card, #ffffff)',
              border: '1px solid var(--border-light, #e5e7eb)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', flex: '1 1 500px' }}>
              <div className="date-input-group">
                <label htmlFor="order-start-date" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Start Date:
                </label>
                <input
                  id="order-start-date"
                  type="date"
                  className="input-text"
                  value={orderStartDate}
                  onChange={(e) => setOrderStartDate(e.target.value)}
                />
              </div>
              <div className="date-input-group">
                <label htmlFor="order-end-date" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  End Date:
                </label>
                <input
                  id="order-end-date"
                  type="date"
                  className="input-text"
                  value={orderEndDate}
                  onChange={(e) => setOrderEndDate(e.target.value)}
                />
              </div>
              <div style={{ minWidth: '150px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Order Status:
                </label>
                <select
                  className="input-text"
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING_PAYMENT">Awaiting Payment</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PREPARING">Preparing</option>
                  <option value="READY">Ready</option>
                  <option value="DISPATCHED">Dispatched</option>
                  <option value="DELIVERED">Delivered</option>
                </select>
              </div>
              <div style={{ minWidth: '150px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Payment Status:
                </label>
                <select
                  className="input-text"
                  value={orderPaymentFilter}
                  onChange={(e) => setOrderPaymentFilter(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="ALL">All Payments</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="PENDING">Pending</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <button
                type="button"
                className="btn-action btn-inspect"
                onClick={() =>
                  void loadOrderReport(orderStartDate, orderEndDate, orderStatusFilter, orderPaymentFilter)
                }
                disabled={isLoading}
              >
                Filter Orders
              </button>
              {(orderStartDate || orderEndDate || orderStatusFilter !== 'ALL' || orderPaymentFilter !== 'ALL') && (
                <button
                  type="button"
                  className="btn-action btn-continue"
                  onClick={() => {
                    setOrderStartDate('')
                    setOrderEndDate('')
                    setOrderStatusFilter('ALL')
                    setOrderPaymentFilter('ALL')
                    void loadOrderReport('', '', 'ALL', 'ALL')
                  }}
                  disabled={isLoading}
                >
                  Reset
                </button>
              )}
            </div>

            {/* PDF Export Action */}
            <div>
              <button
                type="button"
                className="btn-action btn-inspect"
                onClick={handleExportOrderPDF}
                disabled={isLoading || orderData.items.length === 0}
                title="Export complete filtered orders dataset to PDF"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <PrinterIcon size={15} />
                <span>Export PDF (All Matching)</span>
              </button>
            </div>
          </div>

          {/* Orders Summary Cards */}
          <div className="reports-summary-cards" style={{ marginBottom: '1.5rem' }}>
            <div className="report-metric-card metric-primary">
              <span className="metric-label">Matching Orders Placed</span>
              <span className="metric-large-value">{orderData.summary.totalOrders}</span>
              <span className="metric-footnote">Across selected date boundaries</span>
            </div>
            <div className="report-metric-card">
              <span className="metric-label">Gross Orders Amount</span>
              <span className="metric-large-value">
                ${orderData.summary.totalAmount.toFixed(2)}
              </span>
              <span className="metric-footnote">Sum of order totals</span>
            </div>
            <div className="report-metric-card">
              <span className="metric-label">Verified Payments</span>
              <span className="metric-large-value" style={{ color: '#059669' }}>
                {orderData.summary.paymentCounts['VERIFIED'] || 0}
              </span>
              <span className="metric-footnote">Transactions confirmed</span>
            </div>
            <div className="report-metric-card">
              <span className="metric-label">Delivered Orders</span>
              <span className="metric-large-value" style={{ color: '#2563eb' }}>
                {orderData.summary.statusCounts['DELIVERED'] || 0}
              </span>
              <span className="metric-footnote">Completed customer deliveries</span>
            </div>
          </div>

          {/* Orders Report Table */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
              Querying order lifecycle records...
            </div>
          ) : orderData.items.length === 0 ? (
            <div className="customer-orders-empty">
              <p>No orders match the selected filters and date range.</p>
            </div>
          ) : (
            <div className="dashboard-section-box">
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Order Reference</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Order Status</th>
                      <th>Payment Status</th>
                      <th>Delivery Status</th>
                      <th>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderData.items.map((ord) => (
                      <tr key={ord._id}>
                        <td>
                          <strong>{ord.orderNumber}</strong>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: '#4b5563' }}>
                            {new Date(ord.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td>
                          <div>
                            <strong>{ord.customerName}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {ord.deliveryArea}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="items-count-badge">{ord.itemCount} items</span>
                        </td>
                        <td>
                          <span className={`status-badge status-${ord.status.toLowerCase()}`}>
                            {ord.statusLabel}
                          </span>
                        </td>
                        <td>
                          <span className={`payment-badge payment-${ord.paymentStatus.toLowerCase()}`}>
                            {ord.paymentStatusLabel}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              background:
                                ord.deliveryStatus === 'Delivered'
                                  ? '#dcfce7'
                                  : ord.deliveryStatus === 'Out for Delivery'
                                    ? '#e0e7ff'
                                    : '#f3f4f6',
                              color:
                                ord.deliveryStatus === 'Delivered'
                                  ? '#166534'
                                  : ord.deliveryStatus === 'Out for Delivery'
                                    ? '#3730a3'
                                    : '#4b5563',
                            }}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <DeliveryIcon size={13} />
                              <span>{ord.deliveryStatus}</span>
                            </span>
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          ${ord.totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. FEEDBACK / CONTACT REPORT TAB                             */}
      {/* ============================================================ */}
      {activeTab === 'feedback' && (
        <div className="feedback-report-section">
          {/* Controls Bar */}
          <div
            className="reports-filter-panel"
            style={{
              background: 'var(--bg-card, #ffffff)',
              border: '1px solid var(--border-light, #e5e7eb)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="date-input-group">
                <label htmlFor="fb-start-date" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Start Date:
                </label>
                <input
                  id="fb-start-date"
                  type="date"
                  className="input-text"
                  value={feedbackStartDate}
                  onChange={(e) => setFeedbackStartDate(e.target.value)}
                />
              </div>
              <div className="date-input-group">
                <label htmlFor="fb-end-date" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  End Date:
                </label>
                <input
                  id="fb-end-date"
                  type="date"
                  className="input-text"
                  value={feedbackEndDate}
                  onChange={(e) => setFeedbackEndDate(e.target.value)}
                />
              </div>
              <div style={{ minWidth: '150px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Review Status:
                </label>
                <select
                  className="input-text"
                  value={feedbackStatusFilter}
                  onChange={(e) => setFeedbackStatusFilter(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="ALL">All Feedback</option>
                  <option value="PENDING">Pending Review</option>
                  <option value="REVIEWED">Reviewed</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <button
                type="button"
                className="btn-action btn-inspect"
                onClick={() =>
                  void loadFeedbackReport(feedbackStartDate, feedbackEndDate, feedbackStatusFilter)
                }
                disabled={isLoading}
              >
                Apply Range
              </button>
            </div>

            {/* Export Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-action btn-continue"
                onClick={handleExportFeedbackCSV}
                disabled={isLoading || feedbackData.items.length === 0}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <FileSpreadsheetIcon size={15} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Feedback Summary Cards */}
          <div className="reports-summary-cards" style={{ marginBottom: '1.5rem' }}>
            <div className="report-metric-card metric-primary">
              <span className="metric-label">Total Inquiries Received</span>
              <span className="metric-large-value">{feedbackData.summary.totalCount}</span>
              <span className="metric-footnote">Customer messages submitted</span>
            </div>
            <div className="report-metric-card metric-warning">
              <span className="metric-label">Pending Action</span>
              <span className="metric-large-value">{feedbackData.summary.pendingCount}</span>
              <span className="metric-footnote">Awaiting administrative response</span>
            </div>
            <div className="report-metric-card">
              <span className="metric-label">Reviewed Messages</span>
              <span className="metric-large-value" style={{ color: '#059669' }}>
                {feedbackData.summary.reviewedCount}
              </span>
              <span className="metric-footnote">Handled inquiries</span>
            </div>
          </div>

          {/* Feedback Table */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
              Retrieving persisted customer feedback...
            </div>
          ) : feedbackData.items.length === 0 ? (
            <div className="customer-orders-empty">
              <p>No customer feedback recorded for the specified criteria.</p>
            </div>
          ) : (
            <div className="dashboard-section-box">
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Contact Details</th>
                      <th>Subject</th>
                      <th>Message</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackData.items.map((fb) => (
                      <tr key={fb._id}>
                        <td>
                          <strong>{fb.customer}</strong>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem' }}>{fb.email}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{fb.phone}</div>
                        </td>
                        <td>
                          <strong style={{ fontSize: '0.9rem' }}>{fb.subject}</strong>
                        </td>
                        <td>
                          <p style={{ margin: 0, fontSize: '0.85rem', maxWidth: '300px', whiteSpace: 'pre-wrap' }}>
                            {fb.message}
                          </p>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: '#4b5563' }}>
                            {new Date(fb.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-badge ${
                              fb.status === 'REVIEWED'
                                ? 'status-delivered'
                                : fb.status === 'PENDING'
                                  ? 'status-pending_payment'
                                  : 'status-ready'
                            }`}
                          >
                            {fb.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. OPERATIONAL OVERVIEW TAB (FS-09)                          */}
      {/* ============================================================ */}
      {activeTab === 'overview' && overviewReport && (
        <div className="overview-report-section">
          <div
            className="reports-filter-panel"
            style={{
              background: 'var(--bg-card, #ffffff)',
              border: '1px solid var(--border-light, #e5e7eb)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
            }}
          >
            <div className="date-input-group">
              <label htmlFor="overview-start-date" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Start Date:
              </label>
              <input
                id="overview-start-date"
                type="date"
                className="input-text"
                value={overviewStartDate}
                onChange={(e) => setOverviewStartDate(e.target.value)}
              />
            </div>
            <div className="date-input-group">
              <label htmlFor="overview-end-date" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                End Date:
              </label>
              <input
                id="overview-end-date"
                type="date"
                className="input-text"
                value={overviewEndDate}
                onChange={(e) => setOverviewEndDate(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn-action btn-inspect"
              onClick={() => void loadOverviewReport(overviewStartDate, overviewEndDate)}
              disabled={isLoading}
            >
              Filter Range
            </button>
            {(overviewStartDate || overviewEndDate) && (
              <button
                type="button"
                className="btn-action btn-continue"
                onClick={() => {
                  setOverviewStartDate('')
                  setOverviewEndDate('')
                  void loadOverviewReport('', '')
                }}
                disabled={isLoading}
              >
                Reset
              </button>
            )}
          </div>

          <div className="reports-content-stack">
            {/* Summary Cards */}
            <div className="reports-summary-cards">
              <div className="report-metric-card metric-primary">
                <span className="metric-label">Verified Revenue</span>
                <span className="metric-large-value">
                  ${overviewReport.summary.verifiedRevenue.toFixed(2)}
                </span>
                <span className="metric-footnote">
                  Strictly from verified transactions ({overviewReport.summary.verifiedOrdersCount} orders)
                </span>
              </div>
              <div className="report-metric-card">
                <span className="metric-label">Average Order Value</span>
                <span className="metric-large-value">
                  ${overviewReport.summary.averageOrderValue.toFixed(2)}
                </span>
                <span className="metric-footnote">Per verified fulfilled purchase</span>
              </div>
              <div className="report-metric-card metric-warning">
                <span className="metric-label">Pending Verification</span>
                <span className="metric-large-value">
                  ${overviewReport.summary.pendingPaymentsAmount.toFixed(2)}
                </span>
                <span className="metric-footnote">Submitted claims awaiting manual verification</span>
              </div>
              <div className="report-metric-card">
                <span className="metric-label">Total Orders Placed</span>
                <span className="metric-large-value">{overviewReport.summary.totalOrders}</span>
                <span className="metric-footnote">Across all lifecycle stages</span>
              </div>
            </div>

            {/* Two Columns Grid */}
            <div className="reports-two-col-grid">
              <div className="dashboard-section-box">
                <h3 className="section-box-title" style={{ marginBottom: '1rem' }}>
                  Order Lifecycle Distribution
                </h3>
                <table className="admin-data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Count</th>
                      <th>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewReport.statusBreakdown.map((row) => (
                      <tr key={row.status}>
                        <td>
                          <span className={`status-badge status-${row.status.toLowerCase()}`}>
                            {row.label}
                          </span>
                        </td>
                        <td>
                          <strong>{row.count}</strong>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                            {row.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="dashboard-section-box">
                <h3 className="section-box-title" style={{ marginBottom: '1rem' }}>
                  Payment Verification Breakdown
                </h3>
                <table className="admin-data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Payment Status</th>
                      <th>Transactions</th>
                      <th>Amount ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewReport.paymentBreakdown.map((row) => (
                      <tr key={row.paymentStatus}>
                        <td>
                          <span className={`payment-badge payment-${row.paymentStatus.toLowerCase()}`}>
                            {row.label}
                          </span>
                        </td>
                        <td>
                          <strong>{row.count}</strong>
                        </td>
                        <td style={{ fontWeight: 700 }}>${row.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
