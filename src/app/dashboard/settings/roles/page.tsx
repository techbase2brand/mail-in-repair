'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/components/supabase-provider'
import { useRoleAccess } from '@/hooks/useRoleAccess'
import { PlusIcon, TrashIcon, SaveIcon } from '@/components/icons'
import Link from 'next/link'

export default function RolesManagementPage() {
  const { supabase, session } = useSupabase()
  const { isAdmin, hasPermission } = useRoleAccess()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState('technician')
  const [addingUser, setAddingUser] = useState(false)

  useEffect(() => {
    if (!session) return

    const fetchCompanyAndUsers = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get company ID
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', session.user.id)
          .single()

        if (companyError) {
          throw new Error(`Error fetching company: ${companyError.message}`)
        }

        if (!company) {
          throw new Error('Company not found')
        }

        setCompanyId(company.id)

        // Get all users with roles in this company
        const { data: userRoles, error: userRolesError } = await supabase
          .from('user_roles')
          .select(`
            id,
            user_id,
            role,
            permissions,
            created_at,
            updated_at,
            auth_users:user_id(email)
          `)
          .eq('company_id', company.id)

        if (userRolesError) {
          throw new Error(`Error fetching user roles: ${userRolesError.message}`)
        }

        // Also get company owner
        const { data: companyDetails, error: companyDetailsError } = await supabase
          .from('companies')
          .select(`
            user_id,
            owner_role,
            auth_users:user_id(email)
          `)
          .eq('id', company.id)
          .single()

        if (companyDetailsError) {
          throw new Error(`Error fetching company details: ${companyDetailsError.message}`)
        }

        // Combine the data
        const allUsers = [
          // Company owner
          {
            id: 'owner',
            user_id: companyDetails.user_id,
            role: companyDetails.owner_role,
            email: companyDetails.auth_users && companyDetails.auth_users[0]?.email,
            isOwner: true
          },
          // Other users with roles
          ...userRoles.map((userRole: any) => ({
            id: userRole.id,
            user_id: userRole.user_id,
            role: userRole.role,
            permissions: userRole.permissions,
            email: userRole.auth_users?.email,
            isOwner: false
          }))
        ]

        setUsers(allUsers)
      } catch (err: any) {
        console.error('Error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchCompanyAndUsers()
  }, [session, supabase])

  const handleRoleChange = async (userId: string, newRole: string, isOwner: boolean) => {
    if (!companyId) return

    try {
      if (isOwner) {
        // Update company owner role
        const { error } = await supabase
          .from('companies')
          .update({ owner_role: newRole })
          .eq('id', companyId)

        if (error) throw error

        // Update local state
        setUsers(users.map(user => 
          user.isOwner ? { ...user, role: newRole } : user
        ))
      } else {
        // Update user role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('id', userId)

        if (error) throw error

        // Update local state
        setUsers(users.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        ))
      }
    } catch (err: any) {
      console.error('Error updating role:', err)
      setError(`Failed to update role: ${err.message}`)
    }
  }

  const handleRemoveUser = async (userId: string, isOwner: boolean) => {
    if (isOwner) {
      setError("You cannot remove the company owner")
      return
    }

    if (!companyId) return

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', userId)

      if (error) throw error

      // Update local state
      setUsers(users.filter(user => user.id !== userId))
    } catch (err: any) {
      console.error('Error removing user:', err)
      setError(`Failed to remove user: ${err.message}`)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId || !newUserEmail || !newUserRole) return

    try {
      setAddingUser(true)
      setError(null)

      // First, check if the user exists in auth
      const { data: userData, error: userError } = await supabase
        .rpc('get_user_id_by_email', { email_input: newUserEmail })

      if (userError) {
        throw new Error(`Error finding user: ${userError.message}`)
      }

      if (!userData) {
        throw new Error(`User with email ${newUserEmail} not found`)
      }

      // Check if user already has a role in this company
      const { data: existingRole, error: roleCheckError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('company_id', companyId)
        .eq('user_id', userData)

      if (roleCheckError) {
        throw new Error(`Error checking existing role: ${roleCheckError.message}`)
      }

      if (existingRole && existingRole.length > 0) {
        throw new Error(`User already has a role in this company`)
      }

      // Add the user role
      const { data: newRole, error: addError } = await supabase
        .from('user_roles')
        .insert({
          company_id: companyId,
          user_id: userData,
          role: newUserRole
        })
        .select()

      if (addError) {
        throw new Error(`Error adding user role: ${addError.message}`)
      }

      // Add to local state
      setUsers([
        ...users,
        {
          id: newRole[0].id,
          user_id: userData,
          role: newUserRole,
          email: newUserEmail,
          isOwner: false
        }
      ])

      // Reset form
      setNewUserEmail('')
      setNewUserRole('technician')
    } catch (err: any) {
      console.error('Error adding user:', err)
      setError(err.message)
    } finally {
      setAddingUser(false)
    }
  }

  if (!hasPermission('settings', 'manage') && !isAdmin) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">You don't have permission to manage user roles.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">User Role Management</h1>
        <Link 
          href="/dashboard/settings/roles/test"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Test RBAC
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add new user form */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Add New User</h2>
        <form onSubmit={handleAddUser} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="col-span-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                id="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
              <select
                id="role"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="technician">Technician</option>
                <option value="receptionist">Receptionist</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={addingUser || !newUserEmail}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              {addingUser ? 'Adding...' : 'Add User'}
            </button>
          </div>
        </form>
      </div>

      {/* User list */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Company Users</h2>
          <p className="mt-1 text-sm text-gray-500">Manage roles for users in your company</p>
        </div>
        <div className="border-t border-gray-200">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No users found
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value, user.isOwner)}
                        disabled={!isAdmin}
                        className="border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="technician">Technician</option>
                        <option value="receptionist">Receptionist</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.isOwner ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Company Owner
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          Team Member
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {!user.isOwner && (
                        <button
                          onClick={() => handleRemoveUser(user.id, user.isOwner)}
                          className="text-red-600 hover:text-red-900 ml-2"
                          disabled={!isAdmin}
                          title="Remove user"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}