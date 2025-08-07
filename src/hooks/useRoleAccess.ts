import { useSupabase } from '@/components/supabase-provider';
import { useEffect, useState } from 'react';

type Permission = {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
};

type Role = 'admin' | 'manager' | 'technician' | 'receptionist' | 'customer';

// Default permissions for each role
const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    { resource: '*', action: 'manage' } // Admin can do everything
  ],
  manager: [
    { resource: 'customers', action: 'manage' },
    { resource: 'technicians', action: 'manage' },
    { resource: 'repair_tickets', action: 'manage' },
    { resource: 'buyback_tickets', action: 'manage' },
    { resource: 'refurbishing_tickets', action: 'manage' },
    { resource: 'invoices', action: 'manage' },
    { resource: 'reports', action: 'read' },
  ],
  technician: [
    { resource: 'repair_tickets', action: 'update' },
    { resource: 'repair_tickets', action: 'read' },
    { resource: 'customers', action: 'read' },
    { resource: 'buyback_tickets', action: 'read' },
    { resource: 'refurbishing_tickets', action: 'update' },
    { resource: 'refurbishing_tickets', action: 'read' },
  ],
  receptionist: [
    { resource: 'customers', action: 'create' },
    { resource: 'customers', action: 'read' },
    { resource: 'customers', action: 'update' },
    { resource: 'repair_tickets', action: 'create' },
    { resource: 'repair_tickets', action: 'read' },
    { resource: 'buyback_tickets', action: 'create' },
    { resource: 'buyback_tickets', action: 'read' },
    { resource: 'invoices', action: 'read' },
  ],
  customer: [
    { resource: 'repair_tickets', action: 'read' },
    { resource: 'buyback_tickets', action: 'read' },
    { resource: 'invoices', action: 'read' },
  ]
};

export const useRoleAccess = () => {
  const { session, supabase } = useSupabase();
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!session) {
        setLoading(false);
        return;
      }

      try {
        // First check if user has a company profile
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id, owner_role')
          .eq('user_id', session.user.id)
          .single();

        if (companyError && companyError.code !== 'PGRST116') {
          console.error('Error fetching company:', companyError);
          setLoading(false);
          return;
        }

        // If company exists, check for specific role
        if (company) {
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role, permissions')
            .eq('user_id', session.user.id)
            .eq('company_id', company.id)
            .single();

          if (roleError && roleError.code !== 'PGRST116') {
            console.error('Error fetching role:', roleError);
          }

          // If specific role exists, use it; otherwise use owner_role from company
          if (roleData) {
            setUserRole(roleData.role as Role);
            // Use custom permissions if available, otherwise use default for the role
            setPermissions(roleData.permissions || DEFAULT_ROLE_PERMISSIONS[roleData.role as Role] || []);
          } else {
            // Use the owner_role from company (usually 'admin' for the company owner)
            const role = (company.owner_role || 'admin') as Role;
            setUserRole(role);
            setPermissions(DEFAULT_ROLE_PERMISSIONS[role] || []);
          }
        } else {
          // No company profile found - user might be a customer or not registered
          setUserRole('customer');
          setPermissions(DEFAULT_ROLE_PERMISSIONS.customer);
        }
      } catch (error) {
        console.error('Error in useRoleAccess:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [session, supabase]);

  // Check if user has permission for a specific action on a resource
  const hasPermission = (resource: string, action: Permission['action']) => {
    if (!userRole || loading) return false;
    
    // Admin has all permissions
    if (userRole === 'admin') return true;
    
    // Check specific permissions
    return permissions.some(permission => 
      (permission.resource === '*' || permission.resource === resource) && 
      (permission.action === 'manage' || permission.action === action)
    );
  };

  return {
    role: userRole,
    permissions,
    loading,
    hasPermission,
    isAdmin: userRole === 'admin',
    isManager: userRole === 'manager' || userRole === 'admin',
    isTechnician: userRole === 'technician',
    isReceptionist: userRole === 'receptionist',
    isCustomer: userRole === 'customer',
  };
};