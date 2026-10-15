export type UserRole = 'customer' | 'admin'

export interface UserProfile {
  clerkId: string
  email: string
  name: string
  role: UserRole
  createdAt?: string
}

export interface AdminStats {
  totalUsers: number
  totalAdmins: number
  totalCustomers: number
  restaurantStatus: string
  paymentVerificationQueue: number
  activeOrdersCount?: number
  orders?: {
    total: number
    pendingPayment: number
    confirmed: number
    preparing: number
    ready: number
    dispatched: number
    delivered: number
    active: number
  }
  payments?: {
    pending: number
    verified: number
    rejected: number
  }
  financial?: {
    verifiedRevenue: number
    pendingRevenue: number
    currency: string
  }
  catalog?: {
    totalProducts: number
    availableProducts: number
    totalCategories: number
  }
  feedback?: {
    pending: number
    total: number
  }
}

export interface AdminOverviewResponse {
  success: boolean
  message: string
  adminUser: {
    clerkId: string
    email: string
    role: UserRole
  }
  stats: AdminStats
  recentOrders?: OrderRecord[]
  recentPayments?: PaymentRecord[]
  recentFeedback?: Array<{
    _id?: string
    name: string
    subject: string
    status: string
    createdAt: string
  }>
}

export interface Category {
  _id: string
  name: string
  description?: string
  isActive: boolean
  productCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface Product {
  _id: string
  name: string
  description: string
  price: number
  image: string
  category: Category | { _id: string; name: string }
  isAvailable: boolean
  createdAt?: string
  updatedAt?: string
}

export interface OrderItem {
  id: string
  name: string
  unitPrice: number
  quantity: number
}

export interface CartItem extends OrderItem {
  image: string
  isAvailable?: boolean
}

export interface DeliveryInfo {
  recipientName: string
  phone: string
  deliveryAddress: string
  deliveryArea: string
  deliveryInstructions?: string
}

export interface OrderReviewItem {
  productId: string
  name: string
  image: string
  unitPrice: number
  quantity: number
  subtotal: number
}

export interface OrderReviewResponse {
  success: boolean
  items: OrderReviewItem[]
  subtotal: number
  deliveryFee: number
  totalAmount: number
}

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DISPATCHED'
  | 'DELIVERED'

export interface OrderStatusHistoryEvent {
  previousStatus: OrderStatus | null
  newStatus: OrderStatus
  timestamp: string
  actorId: string
  actorRole: 'admin' | 'customer' | 'system'
  actorEmail?: string
  note?: string
}

export interface OrderRecord {
  id: string
  _id?: string
  orderNumber: string
  clerkId: string
  customerName: string
  customerEmail?: string
  customerPhone: string
  deliveryAddress: string
  deliveryArea: string
  deliveryInstructions?: string
  items: Array<{
    productId: string
    name: string
    image: string
    unitPrice: number
    quantity: number
    subtotal: number
  }>
  subtotal: number
  deliveryFee: number
  totalAmount: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentId?:
    | string
    | {
        _id?: string
        paymentNumber?: string
        status?: PaymentStatus
        amount?: number
        currency?: string
        submittedAt?: string
        verifiedAt?: string
        verifiedBy?: string
        rejectedAt?: string
        rejectionReason?: string
      }
  paymentNumber?: string
  paymentRejectionReason?: string
  dispatchedAt?: string
  deliveredAt?: string
  dispatchedBy?: string
  deliveredBy?: string
  statusHistory?: OrderStatusHistoryEvent[]
  createdAt: string
  updatedAt?: string
}

export interface AdminOrdersResponse {
  success: boolean
  counts: {
    pendingPayment: number
    confirmed: number
    preparing: number
    ready: number
    dispatched: number
    delivered: number
    active: number
    total: number
  }
  orders: OrderRecord[]
}

export interface OrderResponse {
  success: boolean
  message?: string
  order: OrderRecord
}

export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export interface PaymentAuditEvent {
  action: 'SUBMITTED' | 'VERIFIED' | 'REJECTED'
  previousStatus: PaymentStatus | null
  newStatus: PaymentStatus
  actorId: string
  actorRole: 'customer' | 'admin'
  actorEmail?: string
  timestamp: string
  note?: string
}

export interface PaymentRecord {
  _id?: string
  id?: string
  paymentNumber: string
  orderId:
    | string
    | {
        _id: string
        orderNumber: string
        customerName: string
        customerPhone: string
        deliveryAddress: string
        deliveryArea: string
        totalAmount: number
        items: Array<{
          name: string
          quantity: number
          unitPrice: number
          subtotal: number
        }>
        status: string
        paymentStatus: PaymentStatus
      }
  orderNumber: string
  clerkId: string
  customerName: string
  customerEmail?: string
  amount: number
  currency: string
  status: PaymentStatus
  paymentMethod: string
  customerNote?: string
  submittedAt: string
  verifiedAt?: string
  verifiedBy?: string
  rejectedAt?: string
  rejectedBy?: string
  rejectionReason?: string
  auditHistory: PaymentAuditEvent[]
  createdAt?: string
  updatedAt?: string
}

export interface AdminPaymentsResponse {
  success: boolean
  counts: {
    pending: number
    verified: number
    rejected: number
    total: number
  }
  payments: PaymentRecord[]
}

export interface CustomerRecord {
  id: string
  clerkId: string
  name: string
  email: string
  phone: string
  deliveryAddress: string
  deliveryArea: string
  totalOrders: number
  verifiedSpent: number
  lastOrderDate?: string | null
  latestOrderNumber?: string | null
  createdAt?: string
}

export interface CustomerDetailResponse {
  success: boolean
  customer: CustomerRecord & {
    orders: OrderRecord[]
  }
}

export interface AdminReportData {
  period: {
    startDate?: string | null
    endDate?: string | null
  }
  summary: {
    totalOrders: number
    verifiedOrdersCount: number
    verifiedRevenue: number
    pendingPaymentsAmount: number
    averageOrderValue: number
    currency: string
  }
  statusBreakdown: Array<{
    status: OrderStatus
    label: string
    count: number
    percentage: number
  }>
  paymentBreakdown: Array<{
    paymentStatus: string
    label: string
    count: number
    amount: number
  }>
  topProducts: Array<{
    productId?: string
    name: string
    unitsSold: number
    revenueGenerated: number
  }>
  deliverySummary: {
    readyCount: number
    dispatchedCount: number
    deliveredCount: number
  }
  generatedAt: string
}

export interface FeedbackRecord {
  _id: string
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  status: 'PENDING' | 'REVIEWED' | 'ARCHIVED'
  reviewedBy?: string
  reviewedAt?: string
  createdAt: string
  updatedAt?: string
}

export interface RestaurantSettingsData {
  restaurantName: string
  contactPhone: string
  contactEmail: string
  operatingHours: string
  restaurantStatus: 'OPEN' | 'CLOSED' | 'BUSY'
  deliveryNotice: string
  isDeliveryActive: boolean
  currency?: string
  updatedBy?: string
  updatedAt?: string
}

// FS-10 Reports & Exports Types
export interface ProductReportItem {
  _id: string
  name: string
  price: number
  quantity: string
  category: string
  status: 'Available' | 'Unavailable'
  isAvailable: boolean
  unitsSold: number
  revenueGenerated: number
}

export interface ProductReportResponse {
  success: boolean
  products: ProductReportItem[]
  totalCount: number
  availableCount: number
  unavailableCount: number
  generatedAt: string
}

export interface SellingReportItem {
  productId: string
  productName: string
  quantitySold: number
  historicalUnitPrice: number
  revenue: number
}

export interface SellingReportResponse {
  success: boolean
  period: {
    startDate: string | null
    endDate: string | null
  }
  summary: {
    totalVerifiedRevenue: number
    totalItemCount: number
    totalVerifiedOrders: number
    productsSoldCount: number
    currency: string
  }
  products: SellingReportItem[]
  generatedAt: string
}

export interface OrderReportItem {
  _id: string
  orderNumber: string
  createdAt: string
  customerName: string
  customerPhone: string
  deliveryAddress: string
  deliveryArea: string
  status: OrderStatus
  statusLabel: string
  paymentStatus: PaymentStatus
  paymentStatusLabel: string
  deliveryStatus: string
  itemCount: number
  totalAmount: number
}

export interface OrderReportResponse {
  success: boolean
  period: {
    startDate: string | null
    endDate: string | null
  }
  summary: {
    totalOrders: number
    totalAmount: number
    statusCounts: Record<string, number>
    paymentCounts: Record<string, number>
    currency: string
  }
  orders: OrderReportItem[]
  generatedAt: string
}

export interface FeedbackReportItem {
  _id: string
  customer: string
  email: string
  phone: string
  subject: string
  message: string
  status: 'PENDING' | 'REVIEWED' | 'ARCHIVED'
  createdAt: string
  reviewedBy?: string | null
  reviewedAt?: string | null
}

export interface FeedbackReportResponse {
  success: boolean
  period: {
    startDate: string | null
    endDate: string | null
  }
  summary: {
    totalCount: number
    pendingCount: number
    reviewedCount: number
    archivedCount: number
  }
  feedback: FeedbackReportItem[]
  generatedAt: string
}


