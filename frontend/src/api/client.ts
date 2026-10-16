import type {
  UserRole,
  UserProfile,
  AdminStats,
  AdminOverviewResponse,
  Category,
  Product,
  OrderItem,
  OrderResponse,
  DeliveryInfo,
  OrderReviewResponse,
  OrderStatus,
  OrderStatusHistoryEvent,
  OrderRecord,
  AdminOrdersResponse,
  PaymentStatus,
  PaymentAuditEvent,
  PaymentRecord,
  AdminPaymentsResponse,
  CustomerRecord,
  CustomerDetailResponse,
  AdminReportData,
  FeedbackRecord,
  RestaurantSettingsData,
  ProductReportResponse,
  SellingReportResponse,
  OrderReportResponse,
  FeedbackReportResponse,
} from '../types/index.js'

export type {
  UserRole,
  UserProfile,
  AdminStats,
  AdminOverviewResponse,
  Category,
  Product,
  OrderItem,
  OrderResponse,
  DeliveryInfo,
  OrderReviewResponse,
  OrderStatus,
  OrderStatusHistoryEvent,
  OrderRecord,
  AdminOrdersResponse,
  PaymentStatus,
  PaymentAuditEvent,
  PaymentRecord,
  AdminPaymentsResponse,
  CustomerRecord,
  CustomerDetailResponse,
  AdminReportData,
  FeedbackRecord,
  RestaurantSettingsData,
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  getToken?: () => Promise<string | null>
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (getToken) {
    const token = await getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const errorMsg = data.error || `Request failed with status ${response.status}`
    const error = new Error(errorMsg) as Error & { status?: number; data?: unknown }
    error.status = response.status
    error.data = data
    throw error
  }

  return data as T
}

export const api = {
  getHealth: () => request<{ status: string }>('/api/health'),

  // Auth
  getCurrentUser: (getToken: () => Promise<string | null>) =>
    request<{ user: UserProfile }>('/api/auth/me', { method: 'GET' }, getToken),

  syncUser: (getToken: () => Promise<string | null>) =>
    request<{ success: boolean; user: UserProfile }>('/api/auth/sync', { method: 'POST' }, getToken),

  // Admin Overview & Users
  getAdminOverview: (getToken: () => Promise<string | null>) =>
    request<AdminOverviewResponse>('/api/admin/overview', { method: 'GET' }, getToken),

  getAdminUsers: (getToken: () => Promise<string | null>) =>
    request<{ users: UserProfile[] }>('/api/admin/users', { method: 'GET' }, getToken),

  updateUserRole: (
    getToken: () => Promise<string | null>,
    clerkId: string,
    role: UserRole
  ) =>
    request<{ success: boolean; message: string; user: UserProfile }>(
      `/api/admin/users/${clerkId}/role`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      },
      getToken
    ),

  // Categories (FS-02)
  getCategories: () =>
    request<{ categories: Category[] }>('/api/categories', { method: 'GET' }),

  getCategory: (id: string) =>
    request<{ category: Category }>(`/api/categories/${id}`, { method: 'GET' }),

  createCategory: (
    getToken: () => Promise<string | null>,
    data: { name: string; description?: string; isActive?: boolean }
  ) =>
    request<{ success: boolean; category: Category }>(
      '/api/categories',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      getToken
    ),

  updateCategory: (
    getToken: () => Promise<string | null>,
    id: string,
    data: { name?: string; description?: string; isActive?: boolean }
  ) =>
    request<{ success: boolean; category: Category }>(
      `/api/categories/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      getToken
    ),

  deleteCategory: (getToken: () => Promise<string | null>, id: string) =>
    request<{ success: boolean; message: string }>(
      `/api/categories/${id}`,
      {
        method: 'DELETE',
      },
      getToken
    ),

  // Products (FS-02)
  getProducts: (params?: { category?: string; availableOnly?: boolean }) => {
    const query = new URLSearchParams()
    if (params?.category) query.set('category', params.category)
    if (params?.availableOnly) query.set('availableOnly', 'true')
    const qs = query.toString() ? `?${query.toString()}` : ''
    return request<{ products: Product[] }>(`/api/products${qs}`, { method: 'GET' })
  },

  getProduct: (id: string) =>
    request<{ product: Product }>(`/api/products/${id}`, { method: 'GET' }),

  createProduct: (
    getToken: () => Promise<string | null>,
    data: {
      name: string
      description: string
      price: number
      image?: string
      category: string
      isAvailable?: boolean
    }
  ) =>
    request<{ success: boolean; product: Product }>(
      '/api/products',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      getToken
    ),

  updateProduct: (
    getToken: () => Promise<string | null>,
    id: string,
    data: {
      name?: string
      description?: string
      price?: number
      image?: string
      category?: string
      isAvailable?: boolean
    }
  ) =>
    request<{ success: boolean; product: Product }>(
      `/api/products/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      getToken
    ),

  toggleProductAvailability: (
    getToken: () => Promise<string | null>,
    id: string,
    isAvailable: boolean
  ) =>
    request<{ success: boolean; message: string; product: Product }>(
      `/api/products/${id}/availability`,
      {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable }),
      },
      getToken
    ),

  deleteProduct: (getToken: () => Promise<string | null>, id: string) =>
    request<{ success: boolean; message: string }>(
      `/api/products/${id}`,
      {
        method: 'DELETE',
      },
      getToken
    ),

  // Orders (FS-05)
  reviewOrder: (
    getToken: () => Promise<string | null>,
    items: Array<{ id: string; quantity: number }>
  ) =>
    request<OrderReviewResponse>(
      '/api/orders/review',
      {
        method: 'POST',
        body: JSON.stringify({ items }),
      },
      getToken
    ),

  submitOrder: (
    getToken: () => Promise<string | null>,
    orderData: {
      items: Array<{ id: string; quantity: number }>
      delivery: DeliveryInfo
      reviewedTotalAmount?: number
    }
  ) =>
    request<OrderResponse>(
      '/api/orders',
      {
        method: 'POST',
        body: JSON.stringify(orderData),
      },
      getToken
    ),

  getOrder: (getToken: () => Promise<string | null>, id: string) =>
    request<{ success: boolean; order: OrderRecord }>(
      `/api/orders/${id}`,
      { method: 'GET' },
      getToken
    ),

  getMyOrders: (getToken: () => Promise<string | null>) =>
    request<{ success: boolean; orders: OrderRecord[] }>(
      '/api/orders/my-orders',
      { method: 'GET' },
      getToken
    ),

  getAdminOrders: (
    getToken: () => Promise<string | null>,
    filters?: {
      status?: string
      startDate?: string
      endDate?: string
      search?: string
    }
  ) => {
    const params = new URLSearchParams()
    if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status)
    if (filters?.startDate) params.set('startDate', filters.startDate)
    if (filters?.endDate) params.set('endDate', filters.endDate)
    if (filters?.search) params.set('search', filters.search)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<AdminOrdersResponse>(`/api/orders${qs}`, { method: 'GET' }, getToken)
  },

  updateOrderStatus: (
    getToken: () => Promise<string | null>,
    orderId: string,
    status: OrderStatus,
    note?: string
  ) =>
    request<{ success: boolean; message: string; order: OrderRecord }>(
      `/api/orders/${orderId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, note }),
      },
      getToken
    ),

  // Payments (FS-06)
  submitPayment: (
    getToken: () => Promise<string | null>,
    data: {
      orderId: string
      paymentMethod?: string
      customerNote?: string
    }
  ) =>
    request<{ success: boolean; message: string; payment: PaymentRecord; order: OrderRecord }>(
      '/api/payments',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      getToken
    ),

  getMyPayments: (getToken: () => Promise<string | null>) =>
    request<{ success: boolean; payments: PaymentRecord[] }>(
      '/api/payments/my-payments',
      { method: 'GET' },
      getToken
    ),

  getOrderPayment: (getToken: () => Promise<string | null>, orderId: string) =>
    request<{ success: boolean; payment: PaymentRecord | null; order: Partial<OrderRecord> }>(
      `/api/payments/order/${orderId}`,
      { method: 'GET' },
      getToken
    ),

  getPayments: (
    getToken: () => Promise<string | null>,
    status?: PaymentStatus
  ) => {
    const qs = status ? `?status=${status}` : ''
    return request<AdminPaymentsResponse>(
      `/api/payments${qs}`,
      { method: 'GET' },
      getToken
    )
  },

  getPayment: (getToken: () => Promise<string | null>, id: string) =>
    request<{ success: boolean; payment: PaymentRecord; order: OrderRecord }>(
      `/api/payments/${id}`,
      { method: 'GET' },
      getToken
    ),

  verifyPayment: (getToken: () => Promise<string | null>, id: string) =>
    request<{
      success: boolean
      message: string
      payment: PaymentRecord
      order: OrderRecord
    }>(
      `/api/payments/${id}/verify`,
      {
        method: 'POST',
      },
      getToken
    ),

  rejectPayment: (
    getToken: () => Promise<string | null>,
    id: string,
    reason: string
  ) =>
    request<{
      success: boolean
      message: string
      payment: PaymentRecord
      order: OrderRecord
    }>(
      `/api/payments/${id}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      },
      getToken
    ),

  // Customers (FS-09)
  getAdminCustomers: (
    getToken: () => Promise<string | null>,
    search?: string
  ) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : ''
    return request<{ success: boolean; customers: CustomerRecord[]; totalCount: number }>(
      `/api/admin/customers${qs}`,
      { method: 'GET' },
      getToken
    )
  },

  getAdminCustomerDetail: (
    getToken: () => Promise<string | null>,
    id: string
  ) =>
    request<CustomerDetailResponse>(
      `/api/admin/customers/${id}`,
      { method: 'GET' },
      getToken
    ),

  // Reports (FS-09 / FS-10)
  getAdminReports: (
    getToken: () => Promise<string | null>,
    filters?: { startDate?: string; endDate?: string }
  ) => {
    const params = new URLSearchParams()
    if (filters?.startDate) params.set('startDate', filters.startDate)
    if (filters?.endDate) params.set('endDate', filters.endDate)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<{ success: boolean; report: AdminReportData }>(
      `/api/admin/reports${qs}`,
      { method: 'GET' },
      getToken
    )
  },

  getAdminProductReport: (
    getToken: () => Promise<string | null>,
    filters?: { category?: string; availability?: string; search?: string }
  ) => {
    const params = new URLSearchParams()
    if (filters?.category && filters.category !== 'ALL') params.set('category', filters.category)
    if (filters?.availability && filters.availability !== 'ALL') params.set('availability', filters.availability)
    if (filters?.search) params.set('search', filters.search)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<ProductReportResponse>(
      `/api/admin/reports/products${qs}`,
      { method: 'GET' },
      getToken
    )
  },

  getAdminSellingReport: (
    getToken: () => Promise<string | null>,
    filters?: { startDate?: string; endDate?: string; search?: string }
  ) => {
    const params = new URLSearchParams()
    if (filters?.startDate) params.set('startDate', filters.startDate)
    if (filters?.endDate) params.set('endDate', filters.endDate)
    if (filters?.search && filters.search.trim()) params.set('search', filters.search.trim())
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<SellingReportResponse>(
      `/api/admin/reports/selling${qs}`,
      { method: 'GET' },
      getToken
    )
  },

  getAdminOrderReport: (
    getToken: () => Promise<string | null>,
    filters?: { startDate?: string; endDate?: string; status?: string; paymentStatus?: string; search?: string }
  ) => {
    const params = new URLSearchParams()
    if (filters?.startDate) params.set('startDate', filters.startDate)
    if (filters?.endDate) params.set('endDate', filters.endDate)
    if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status)
    if (filters?.paymentStatus && filters.paymentStatus !== 'ALL') params.set('paymentStatus', filters.paymentStatus)
    if (filters?.search && filters.search.trim()) params.set('search', filters.search.trim())
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<OrderReportResponse>(
      `/api/admin/reports/orders${qs}`,
      { method: 'GET' },
      getToken
    )
  },

  getAdminFeedbackReport: (
    getToken: () => Promise<string | null>,
    filters?: { startDate?: string; endDate?: string; status?: string }
  ) => {
    const params = new URLSearchParams()
    if (filters?.startDate) params.set('startDate', filters.startDate)
    if (filters?.endDate) params.set('endDate', filters.endDate)
    if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<FeedbackReportResponse>(
      `/api/admin/reports/feedback${qs}`,
      { method: 'GET' },
      getToken
    )
  },

  // Feedback (FS-09 / FS-11)
  getAdminFeedback: (
    getToken: () => Promise<string | null>,
    status?: string,
    search?: string
  ) => {
    const params = new URLSearchParams()
    if (status && status !== 'ALL') params.set('status', status)
    if (search && search.trim()) params.set('search', search.trim())
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<{
      success: boolean
      feedback: FeedbackRecord[]
      pendingCount: number
      totalCount: number
    }>(`/api/admin/feedback${qs}`, { method: 'GET' }, getToken)
  },

  updateFeedbackStatus: (
    getToken: () => Promise<string | null>,
    id: string,
    status: 'PENDING' | 'REVIEWED' | 'ARCHIVED'
  ) =>
    request<{ success: boolean; message: string; feedback: FeedbackRecord }>(
      `/api/admin/feedback/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
      getToken
    ),

  submitCustomerFeedback: (data: {
    name: string
    email: string
    phone?: string
    subject: string
    message: string
  }) =>
    request<{ success: boolean; message: string; feedbackId: string }>(
      '/api/feedback',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  // Restaurant Settings (FS-09 / FS-12)
  getAdminSettings: (getToken: () => Promise<string | null>) =>
    request<{ success: boolean; settings: RestaurantSettingsData }>(
      '/api/admin/settings',
      { method: 'GET' },
      getToken
    ),

  updateAdminSettings: (
    getToken: () => Promise<string | null>,
    settings: Partial<RestaurantSettingsData>
  ) =>
    request<{ success: boolean; message: string; settings: RestaurantSettingsData }>(
      '/api/admin/settings',
      {
        method: 'PATCH',
        body: JSON.stringify(settings),
      },
      getToken
    ),

  getPublicSettings: () =>
    request<{ success: boolean; settings: RestaurantSettingsData }>(
      '/api/settings',
      { method: 'GET' }
    ),
}
