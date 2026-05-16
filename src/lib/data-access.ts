import { Session } from 'next-auth'
import { parsePermissions } from './permissions'

export type DataScope = {
  isRestricted: boolean
  cities: string[] // List of allowed cities
  areas: string[]  // List of allowed deliveryArea Ids
}

export function getUserDataScope(session: Session | null | any): DataScope {
  const restrictedFallback = { isRestricted: false, cities: [], areas: [] }
  if (!session?.user) return restrictedFallback
  
  if (session.user.role === 'ADMIN') return restrictedFallback // Admins always unrestricted

  const perms = parsePermissions(session.user.permissions)
  
  // Backward compatibility: if no scoping object exists in JSON, grant full global access by default.
  // OR maybe restricted if a special rule? Let's say default is global unless `permissions.dataScope.isRestricted` is explicitly true.
  const dataScopeRaw = (perms as any)?._dataScope
  
  if (dataScopeRaw?.isRestricted) {
    return {
      isRestricted: true,
      cities: Array.isArray(dataScopeRaw.cities) ? dataScopeRaw.cities : [],
      areas: Array.isArray(dataScopeRaw.areas) ? dataScopeRaw.areas : []
    }
  }
  
  return restrictedFallback
}

/**
 * Merges geographical restrictions into an existing Prisma Order `where` clause.
 */
export function applyOrderDataScope(session: Session | null | any, existingWhere: any = {}): any {
  const scope = getUserDataScope(session)
  if (!scope.isRestricted) return existingWhere

  // If restricted, the user can ONLY see orders where the city matches one of their allowed cities,
  // OR the deliveryAreaId matches one of their allowed areas.
  // We use `OR` for these conditions wrapped inside an `AND` with the existing query.
  
  const scopeConditions: any[] = []
  
  if (scope.cities.length > 0) {
    scopeConditions.push({ city: { in: scope.cities } })
  }
  if (scope.areas.length > 0) {
    scopeConditions.push({ deliveryAreaId: { in: scope.areas } })
  }

  // If restricted but explicitly NO regions were selected in the UI, they see absolutely nothing.
  if (scopeConditions.length === 0) {
     return { ...existingWhere, AND: [{ id: 'FORCE_EMPTY_NO_REGIONS_ALLOWED' }] }
  }

  return {
    ...existingWhere,
    AND: [
      ...(existingWhere.AND || []),
      { OR: scopeConditions }
    ]
  }
}

/**
 * Merges geographical restrictions into an existing Prisma Customer `where` clause.
 */
export function applyCustomerDataScope(session: Session | null | any, existingWhere: any = {}): any {
  const scope = getUserDataScope(session)
  if (!scope.isRestricted) return existingWhere

  const scopeConditions: any[] = []
  
  if (scope.cities.length > 0) {
    scopeConditions.push({ city: { in: scope.cities } })
  }
  if (scope.areas.length > 0) {
    scopeConditions.push({ defaultDeliveryAreaId: { in: scope.areas } })
  }

  // Note: the user requested that "if a customer is not assigned a specific city/area, a restricted user CANNOT see them."
  // Which naturally happens since we do `city { in }` and `defaultDeliveryAreaId { in }`.
  // If both are empty or null for a customer, they won't match.
  // One edge case: what if a restricted user needs to manage customers who don't have regions yet?
  // User explicitly said: "אם הוא לא משויך אז שלא יוכל לראות אותו". Exact match.

  if (scopeConditions.length === 0) {
     return { ...existingWhere, AND: [{ id: 'FORCE_EMPTY_NO_REGIONS_ALLOWED' }] }
  }

  return {
    ...existingWhere,
    AND: [
      ...(existingWhere.AND || []),
      { OR: scopeConditions }
    ]
  }
}
