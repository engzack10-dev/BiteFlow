import type { ReactNode } from 'react'
import {
  DashboardIcon,
  OrdersIcon,
  DeliveryIcon,
  PaymentsIcon,
  ProductsIcon,
  CategoriesIcon,
  CustomersIcon,
  ReportsIcon,
  FeedbackIcon,
  SettingsIcon,
  UsersIcon,
} from '../common/AdminIcons.js'

export type AdminSubTab =
  | 'dashboard'
  | 'orders'
  | 'delivery'
  | 'payments'
  | 'products'
  | 'categories'
  | 'customers'
  | 'reports'
  | 'feedback'
  | 'settings'
  | 'users'

interface AdminTabNavProps {
  activeSubTab: AdminSubTab
  onSelectSubTab: (tab: AdminSubTab) => void
  productsCount: number
  categoriesCount: number
  pendingPaymentsCount?: number
  activeOrdersCount?: number
  readyForDeliveryCount?: number
  pendingFeedbackCount?: number
  customersCount?: number
}

export function AdminTabNav({
  activeSubTab,
  onSelectSubTab,
  productsCount,
  categoriesCount,
  pendingPaymentsCount = 0,
  activeOrdersCount = 0,
  readyForDeliveryCount = 0,
  pendingFeedbackCount = 0,
  customersCount = 0,
}: AdminTabNavProps) {
  const tabs: Array<{
    id: AdminSubTab
    label: string
    icon: ReactNode
    badge?: number
    badgeColor?: string
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: <OrdersIcon />,
      badge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
      badgeColor: '#3b82f6',
    },
    {
      id: 'delivery',
      label: 'Delivery',
      icon: <DeliveryIcon />,
      badge: readyForDeliveryCount > 0 ? readyForDeliveryCount : undefined,
      badgeColor: '#10b981',
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: <PaymentsIcon />,
      badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : undefined,
      badgeColor: '#f59e0b',
    },
    {
      id: 'products',
      label: `Products (${productsCount})`,
      icon: <ProductsIcon />,
    },
    {
      id: 'categories',
      label: `Categories (${categoriesCount})`,
      icon: <CategoriesIcon />,
    },
    {
      id: 'customers',
      label: customersCount > 0 ? `Customers (${customersCount})` : 'Customers',
      icon: <CustomersIcon />,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <ReportsIcon />,
    },
    {
      id: 'feedback',
      label: 'Feedback',
      icon: <FeedbackIcon />,
      badge: pendingFeedbackCount > 0 ? pendingFeedbackCount : undefined,
      badgeColor: '#ec4899',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <SettingsIcon />,
    },
    {
      id: 'users',
      label: 'Roles',
      icon: <UsersIcon />,
    },
  ]

  return (
    <nav className="admin-tab-nav" aria-label="Admin Navigation Areas">
      <div className="admin-tabs-scroll-container">
        {tabs.map((tab) => {
          const isActive = activeSubTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              className={`admin-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectSubTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="tab-icon" aria-hidden="true">
                {tab.icon}
              </span>
              <span className="tab-label">{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className="pending-counter-badge"
                  style={tab.badgeColor ? { background: tab.badgeColor } : undefined}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
