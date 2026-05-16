import { User } from '@prisma/client'

export type ModulePermission = 'NONE' | 'READ' | 'FULL'

export type PermissionNode = {
  id: string
  label: string
  children?: PermissionNode[]
}

// New Nested Permissions Structure
export const PERMISSION_TREE: PermissionNode[] = [
  {
    id: 'dashboard', label: 'לוח בקרה',
    children: [
      { id: 'dash_midweek', label: 'סיכום אמצע השבוע' },
      { id: 'dash_shabbat', label: 'סיכום שבת' },
      { id: 'dash_purim', label: 'סיכום תאריכים מיוחדים (פורים)' },
      { id: 'dash_stats', label: 'סטטיסטיקות (קופה/חובות)' }
    ]
  },
  {
    id: 'customers', label: 'לקוחות',
    children: [
      { id: 'customers_manage', label: 'ניהול לקוחות', children: [
        { id: 'customers_edit', label: 'הוספת ועריכת לקוחות' },
        { id: 'customers_delete', label: 'מחיקת לקוחות' },
        { id: 'customers_financial', label: 'ניהול חובות ומאזן' }
      ]}
    ]
  },
  {
    id: 'kitchen_drivers', label: 'מטבח ונהגים',
    children: [
      { id: 'kitchen_events', label: 'כל האירועים' },
      { id: 'kitchen_production', label: 'ייצור' },
      { id: 'kitchen_routes', label: 'ניהול רכבים ומסלולים' },
      { id: 'kitchen_driver_assign', label: 'נהגים וחלוקה (חדש)', children: [
        { id: 'kitchen_drivers_view', label: 'צפייה ברשימת הנהגים הכללית' },
        { id: 'kitchen_drivers_edit', label: 'הוספה, עריכה ומחיקת נהגים' },
        { id: 'kitchen_drivers_link', label: 'קישור נהג לפרופיל משתמש' },
        { id: 'kitchen_drivers_areas', label: 'שיוך אזורי חלוקה לנהגים' },
        { id: 'kitchen_my_route', label: 'גישה למסך "המסלול שלי" (לנהגים)' }
      ]}
    ]
  },
  {
    id: 'orders', label: 'הזמנות',
    children: [
      { id: 'orders_create', label: 'הכנסת הזמנה חדשה (כפתור +)' },
      { id: 'orders_edit', label: 'עריכה וביטול הזמנות' },
      { id: 'orders_fixed', label: 'הזמנות קבועות' },
      {
        id: 'orders_bs', label: 'בית שמש',
        children: [
          { id: 'orders_bs_midweek', label: 'אמצע השבוע' },
          { id: 'orders_bs_shabbat', label: 'שבת' },
          { id: 'orders_bs_wednesday', label: 'חנויות יום רביעי' }
        ]
      },
      {
        id: 'orders_jlm', label: 'ירושלים',
        children: [
          { id: 'orders_jlm_midweek', label: 'אמצע השבוע' },
          { id: 'orders_jlm_shabbat', label: 'שבת' },
          { id: 'orders_jlm_wednesday', label: 'חנויות יום רביעי' }
        ]
      }
    ]
  },
  {
    id: 'reports', label: 'דוחות ומעקב',
    children: [] // Placeholder for future
  },
  {
    id: 'management', label: 'ניהול ותחזוקה',
    children: [
      { id: 'manage_products', label: 'תפריט ומוצרים' },
      { id: 'manage_areas', label: 'אזורי חלוקה' },
      { id: 'manage_customers', label: 'סוגי לקוחות (מחירונים)' },
      { id: 'manage_dates', label: 'לוח שנה ותאריכים מיוחדים' },
      { id: 'manage_users', label: 'צוות משתמשים' },
      { id: 'manage_notifications', label: 'התראות' }
    ]
  },
  {
    id: 'communication', label: 'תקשורת וכלים',
    children: [
      { id: 'chat', label: "צ'אט הצוות (קבוצתי)" },
      { id: 'ai_chat', label: 'עוזר חכם (AI Copilot)' }
    ]
  }
]

export function getPermissionTree(deliveryAreas: { id: string; name: string }[] = []): PermissionNode[] {
  const tree = JSON.parse(JSON.stringify(PERMISSION_TREE)) as PermissionNode[]
  
  if (deliveryAreas.length > 0) {
    const ordersNode = tree.find(n => n.id === 'orders')
    if (ordersNode && ordersNode.children) {
      ordersNode.children.push({
        id: 'orders_areas',
        label: 'לפי אזורי חלוקה שבת',
        children: deliveryAreas.map(area => ({
          id: `area_${area.id}`,
          label: area.name
        }))
      })
    }
  }

  return tree
}

// Extract all valid Module IDs for strict typing
function extractAllIds(nodes: PermissionNode[]): string[] {
  let ids: string[] = []
  for (const node of nodes) {
    ids.push(node.id)
    if (node.children) {
      ids = ids.concat(extractAllIds(node.children))
    }
  }
  return ids
}

const _allIds = extractAllIds(PERMISSION_TREE)
export type ModuleId = typeof _allIds[number] | string

// Type wrapper since permissions is stored as Json in Prisma
export type UserPermissions = Partial<Record<ModuleId, ModulePermission>> | null

/**
 * Helper to get all child IDs of a given node
 */
export function getAllChildIds(node: PermissionNode): string[] {
  let ids: string[] = []
  if (node.children) {
    for (const child of node.children) {
      ids.push(child.id)
      ids = ids.concat(getAllChildIds(child))
    }
  }
  return ids
}

/**
 * Helper to find a node by ID in the tree
 */
export function findNodeById(nodes: PermissionNode[], id: string): PermissionNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

/**
 * Parses user permissions from JSON.
 */
export function parsePermissions(rawPermissions: any): UserPermissions {
  if (!rawPermissions) return null
  if (typeof rawPermissions === 'string') {
    try {
      return JSON.parse(rawPermissions) as UserPermissions
    } catch (e) {
      return null
    }
  }
  return rawPermissions as UserPermissions
}

/**
 * Checks if the user has AT LEAST the required permission level for a specific module.
 * If user role is ADMIN, they always have FULL access to everything.
 */
export function hasPermission(
  userRole: string, 
  rawPermissions: any, 
  moduleId: ModuleId, 
  requiredLevel: ModulePermission
): boolean {
  if (userRole === 'ADMIN') return true

  const perms = parsePermissions(rawPermissions)
  
  // Default to NONE if no permissions object exists
  const userLevel = perms?.[moduleId] || 'NONE'

  if (requiredLevel === 'NONE') return true 
  if (requiredLevel === 'READ') return userLevel === 'READ' || userLevel === 'FULL'
  if (requiredLevel === 'FULL') return userLevel === 'FULL'

  return false
}
