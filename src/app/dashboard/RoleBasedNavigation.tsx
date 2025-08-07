'use client'

import { useRoleAccess } from '@/hooks/useRoleAccess'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavigationItem = {
  name: string
  href: string
  icon: React.ComponentType<any>
  requiredPermission?: {
    resource: string
    action: 'create' | 'read' | 'update' | 'delete' | 'manage'
  }
}

type NavigationProps = {
  items: NavigationItem[]
  isMobile?: boolean
}

export default function RoleBasedNavigation({ items, isMobile = false }: NavigationProps) {
  const pathname = usePathname()
  const { hasPermission, isAdmin } = useRoleAccess()

  // Filter navigation items based on user permissions
  const filteredItems = items.filter(item => {
    // If no required permission is specified, show to everyone
    if (!item.requiredPermission) return true
    
    // Admin can see everything
    if (isAdmin) return true
    
    // Check specific permission
    return hasPermission(item.requiredPermission.resource, item.requiredPermission.action)
  })

  return (
    <nav className={isMobile ? "mt-5 px-2 space-y-1" : "mt-5 flex-1 px-2 space-y-1"}>
      {filteredItems.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`group flex items-center px-2 py-2 ${isMobile ? 'text-base' : 'text-sm'} font-medium rounded-md ${
              isActive 
                ? 'bg-primary-900 text-white' 
                : 'text-primary-100 hover:bg-primary-700'
            }`}
          >
            <item.icon 
              className={`${isMobile ? 'mr-4 h-6 w-6' : 'mr-3 h-5 w-5'} flex-shrink-0 ${
                isActive ? 'text-primary-300' : 'text-primary-200'
              }`} 
            />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}