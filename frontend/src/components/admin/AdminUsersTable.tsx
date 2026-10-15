import type { UserProfile, UserRole } from '../../types/index.js'

interface AdminUsersTableProps {
  users: UserProfile[]
  onRoleChange: (clerkId: string, role: UserRole) => void
}

export function AdminUsersTable({ users, onRoleChange }: AdminUsersTableProps) {
  return (
    <div className="admin-section">
      <h2 className="admin-section-title">User Accounts & Roles (MongoDB)</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>User / Email</th>
              <th>Clerk ID</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.clerkId}>
                <td>
                  <strong>{u.name || 'Unnamed'}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{u.email}</div>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{u.clerkId}</td>
                <td>
                  <span className={`role-badge ${u.role}`}>{u.role}</span>
                </td>
                <td>
                  {u.role === 'customer' ? (
                    <button
                      className="btn-action btn-update"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      onClick={() => onRoleChange(u.clerkId, 'admin')}
                    >
                      Promote to Admin
                    </button>
                  ) : (
                    <button
                      className="btn-action btn-continue"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      onClick={() => onRoleChange(u.clerkId, 'customer')}
                    >
                      Demote to Customer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
