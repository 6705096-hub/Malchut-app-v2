'use client'

import { useState } from 'react'
import { X, Shield, ChevronDown } from 'lucide-react'
import { getPermissionTree, getAllChildIds, ModuleId, ModulePermission, parsePermissions, UserPermissions, PermissionNode } from '@/lib/permissions'

type User = {
  id: string
  name: string | null
  email: string | null
  role: string
  permissions?: any
  isActive: boolean
}

type Props = {
  user: User
  deliveryAreas: { id: string; name: string }[]
  onClose: () => void
  onSave: (userId: string, newRole: string, newPermissions: UserPermissions) => Promise<void>
}

const ROLES = [
  { value: 'ADMIN', label: 'מנהל מערכת' },
  { value: 'ORDERS_MANAGER', label: 'מנהל הזמנות' },
  { value: 'KITCHEN', label: 'מטבח' },
  { value: 'DRIVER', label: 'נהג' }
]

export function UserPermissionsModal({ user, deliveryAreas, onClose, onSave }: Props) {
  // If the user is currently pending approval, we force the initial dropdown state to ORDERS_MANAGER to let admin start there
  const [role, setRole] = useState(user.role === 'PENDING' || !ROLES.find(r => r.value === user.role) ? 'ORDERS_MANAGER' : user.role)
  const [permissions, setPermissions] = useState<UserPermissions>(() => {
    let parsed = parsePermissions(user.permissions) || {} as Record<string, ModulePermission>;
    
    // If it's a known role but JSON is empty, backfill visually
    if (Object.keys(parsed).length === 0) {
      const tree = getPermissionTree(deliveryAreas);
      const newPerms: Record<string, ModulePermission> = {};
      
      const r = user.role === 'PENDING' ? 'ORDERS_MANAGER' : user.role;
      if (r === 'ADMIN') {
        tree.forEach(cat => {
          newPerms[cat.id] = 'FULL';
          getAllChildIds(cat).forEach(id => newPerms[id] = 'FULL');
        });
      } else if (r === 'KITCHEN') {
        newPerms['kitchen_drivers'] = 'FULL';
        newPerms['kitchen_events'] = 'FULL';
        newPerms['kitchen_production'] = 'FULL';
        newPerms['kitchen_routes'] = 'FULL';
        newPerms['kitchen_driver_assign'] = 'FULL';
      } else if (r === 'DRIVER') {
        newPerms['kitchen_drivers'] = 'FULL';
        newPerms['kitchen_routes'] = 'FULL';
        newPerms['kitchen_driver_assign'] = 'FULL';
        newPerms['kitchen_my_route'] = 'FULL';
        newPerms['orders_areas'] = 'FULL';
        // Note: Driver areas are handled via dataScope now
      } else if (r === 'ORDERS_MANAGER') {
        tree.forEach(cat => {
          if (cat.id !== 'management') {
             newPerms[cat.id] = 'FULL';
             getAllChildIds(cat).forEach(id => newPerms[id] = 'FULL');
          } else {
             // Orders manager gets access to management EXCEPT team/users
             newPerms['management'] = 'FULL';
             getAllChildIds(cat).forEach(id => {
               if (id !== 'manage_users') {
                 newPerms[id] = 'FULL';
               }
             });
          }
        });
      }
      
      if (Object.keys(newPerms).length > 0) {
        parsed = newPerms;
      }
    }
    
    return parsed as UserPermissions;
  })
  
  const [dataScope, setDataScope] = useState<{ isRestricted: boolean; cities: string[]; areas: string[] }>(() => {
    let scopeConfig = { isRestricted: false, cities: [] as string[], areas: [] as string[] }
    const raw = parsePermissions(user.permissions) as any
    if (raw && raw._dataScope) {
       scopeConfig = {
         isRestricted: !!raw._dataScope.isRestricted,
         cities: Array.isArray(raw._dataScope.cities) ? raw._dataScope.cities : [],
         areas: Array.isArray(raw._dataScope.areas) ? raw._dataScope.areas : []
       }
    }
    return scopeConfig
  })

  const [chatSettings, setChatSettings] = useState<{ isBanned: boolean; isAdmin: boolean }>(() => {
    const raw = parsePermissions(user.permissions) as any
    return {
      isBanned: !!raw._chat?.isBanned,
      isAdmin: !!raw._chat?.isAdmin
    }
  })

  const CITIES = ['ירושלים', 'בית שמש'];

  const [isSaving, setIsSaving] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const handlePermissionChange = (moduleId: ModuleId, level: ModulePermission) => {
    setPermissions(prev => ({
      ...prev,
      [moduleId]: level
    }))
  }

  const handleRoleChange = (newRole: string) => {
    setRole(newRole)
    const tree = getPermissionTree(deliveryAreas)
    const newPerms: any = { ...permissions }

    // Clear previous generic perms if switching to a template
    if (['ADMIN', 'KITCHEN', 'DRIVER', 'ORDERS_MANAGER'].includes(newRole)) {
      Object.keys(newPerms).forEach(k => delete newPerms[k])
    }

    if (newRole === 'ADMIN') {
      tree.forEach(cat => {
        newPerms[cat.id] = 'FULL'
        getAllChildIds(cat).forEach(id => newPerms[id] = 'FULL')
      })
      setDataScope(s => ({ ...s, isRestricted: false }))
    } else if (newRole === 'KITCHEN') {
      newPerms['kitchen_drivers'] = 'FULL'
      newPerms['kitchen_events'] = 'FULL'
      newPerms['kitchen_production'] = 'FULL'
      newPerms['kitchen_routes'] = 'FULL'
      newPerms['kitchen_driver_assign'] = 'FULL'
      setDataScope(s => ({ ...s, isRestricted: false }))
    } else if (newRole === 'DRIVER') {
      newPerms['kitchen_drivers'] = 'FULL'
      newPerms['kitchen_routes'] = 'FULL'
      newPerms['kitchen_driver_assign'] = 'FULL'
      newPerms['kitchen_my_route'] = 'FULL'
      newPerms['orders_areas'] = 'FULL'
      setDataScope(s => ({ ...s, isRestricted: true })) // Force restricted data scope for drivers
    } else if (newRole === 'ORDERS_MANAGER') {
      tree.forEach(cat => {
        if (cat.id !== 'management') {
           newPerms[cat.id] = 'FULL'
           getAllChildIds(cat).forEach(id => newPerms[id] = 'FULL')
        } else {
           newPerms['management'] = 'FULL'
           getAllChildIds(cat).forEach(id => {
             if (id !== 'manage_users') newPerms[id] = 'FULL'
           })
        }
      })
      setDataScope(s => ({ ...s, isRestricted: false }))
    }
    
    if (Object.keys(newPerms).length > 0 || ['ADMIN', 'KITCHEN', 'DRIVER', 'ORDERS_MANAGER'].includes(newRole)) {
      setPermissions(newPerms)
    }
  }

  // Recursive toggle handler
  const toggleNode = (node: PermissionNode, newLevel: ModulePermission) => {
    setPermissions(prev => {
      const next = { ...prev }
      
      // Toggle self
      next[node.id] = newLevel
      
      // Toggle all children recursively
      const childIds = getAllChildIds(node)
      childIds.forEach(id => {
        next[id] = newLevel
      })

      return next
    })
  }

  // Check state of a node - if all children and itself share exactly the SAME level, return it.
  // Otherwise, return null (meaning mixed state).
  const getNodeLevel = (node: PermissionNode): ModulePermission | null => {
    const myLevel = permissions?.[node.id] || 'NONE'
    const childIds = getAllChildIds(node)
    
    // If no children, my level is the absolute truth
    if (childIds.length === 0) return myLevel

    // Check if ALL children have the EXACT same level as me
    for (const id of childIds) {
      if ((permissions?.[id] || 'NONE') !== myLevel) {
        return null // Mixed state!
      }
    }
    
    return myLevel
  }

  // Recursive component to render the tree
  const renderTree = (nodes: PermissionNode[], depth: number = 0) => {
    return (
      <div className={`flex flex-col gap-3 sm:gap-4 ${depth > 0 ? 'mt-3 sm:mt-4 border-r-2 border-slate-100/80 pr-3 sm:pr-5 mr-1 sm:mr-3' : ''}`}>
        {nodes.map(node => {
          const currentLevel = getNodeLevel(node)
          const hasChildren = node.children && node.children.length > 0
          
          const isTopLevel = depth === 0
          const isExpanded = isTopLevel ? expandedCategory === node.id : true // Inner nodes always expanded for now, or we could add inner expand state.

          return (
            <div key={node.id} className={`flex flex-col gap-2.5 sm:gap-3 ${isTopLevel ? 'bg-white border-2 border-slate-100/60 p-3 sm:p-4 rounded-2xl shadow-sm transition-all hover:border-slate-200' : ''}`}>
              
              <div className={`flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 sm:gap-3 ${isTopLevel && hasChildren ? 'cursor-pointer group' : ''}`}
                   onClick={e => {
                     if (isTopLevel && hasChildren) {
                       setExpandedCategory(isExpanded ? null : node.id)
                     }
                   }}
              >
                <div className="flex items-start xl:items-center gap-2">
                  <span className={`select-none transition-colors leading-tight ${
                    depth === 0 ? 'font-black text-slate-800 text-[17px] sm:text-lg flex items-center gap-2 group-hover:text-blue-600' :
                    depth === 1 ? 'font-bold text-slate-700 text-[15px] sm:text-base' :
                    'font-semibold text-slate-600 text-[13px] sm:text-sm'
                  }`}>
                    {node.label}
                    {isTopLevel && hasChildren && (
                       <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180 text-blue-500' : ''}`} />
                    )}
                  </span>
                </div>

                <div 
                  className="flex bg-slate-100/80 p-1 rounded-xl w-full xl:w-fit shrink-0 relative justify-between xl:justify-start overflow-x-auto custom-scrollbar"
                  onClick={e => e.stopPropagation()}
                >
                  <button 
                    type="button"
                    onClick={() => toggleNode(node, 'NONE')}
                    className={`flex-1 xl:flex-none px-2 sm:px-4 xl:px-5 py-2 text-[11px] sm:text-sm font-bold rounded-lg transition-all text-center whitespace-nowrap ${
                       currentLevel === 'NONE' || currentLevel === null 
                         ? 'bg-white text-red-600 shadow-sm border border-red-100/50' 
                         : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    {currentLevel === null ? 'מעורב' : 'חסום'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => toggleNode(node, 'READ')}
                    className={`flex-1 xl:flex-none px-2 sm:px-4 xl:px-5 py-2 text-[11px] sm:text-sm font-bold rounded-lg transition-all text-center whitespace-nowrap ${
                       currentLevel === 'READ' 
                         ? 'bg-amber-50 text-amber-600 shadow-sm border border-amber-200' 
                         : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    צפייה
                  </button>
                  <button 
                    type="button"
                    onClick={() => toggleNode(node, 'FULL')}
                    className={`flex-1 xl:flex-none px-2 sm:px-4 xl:px-5 py-2 text-[11px] sm:text-sm font-bold rounded-lg transition-all text-center whitespace-nowrap ${
                       currentLevel === 'FULL' 
                         ? 'bg-green-50 text-green-700 shadow-sm border border-green-200' 
                         : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    מלא
                  </button>
                </div>
              </div>
              
              {hasChildren && (!isTopLevel || isExpanded) && (
                <div className="animate-in slide-in-from-top-2 fade-in duration-200 overflow-visible mt-1 sm:mt-2">
                  {renderTree(node.children!, depth + 1)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const finalPermissions = { ...(permissions || {}) } as any
      finalPermissions._dataScope = dataScope
      finalPermissions._chat = chatSettings
      
      await onSave(user.id, role, finalPermissions)
      onClose()
    } catch (e: any) {
      alert(e.message || 'שגיאה בשמירת הרשאות')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50 relative">
          <div className="flex flex-col text-right w-full pr-10">
            <h2 className="text-2xl font-black text-gray-900 flex items-center justify-end gap-2">
              <span className="text-gray-900 ml-1">עריכת תפקיד והרשאות עבור:</span>
              <span className="text-blue-700">{user.name || 'משתמש'}</span>
            </h2>
            <p className="text-sm text-gray-500 mt-1 font-medium text-right flex items-center justify-end gap-1">
              <Shield className="w-4 h-4 text-blue-500" />
              עדכן את התפקיד והרשאות הגישה של המשתמש למודולים השונים במערכת.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide" dir="rtl">
          
          {/* Role Selection */}
          <div className="mb-8">
            <label className="block text-sm font-bold text-gray-700 mb-2">תפקיד ראשי</label>
            <div className="relative">
              <select 
                value={role}
                onChange={e => handleRoleChange(e.target.value)}
                className="w-full h-14 pl-4 pr-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none"
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {role === 'ADMIN' && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700 font-medium">
                💡 מנהל מערכת מקבל גישה מלאה לכל המודולים אוטומטית, ללא תלות בהרשאות המפורטות מטה.
              </div>
            )}
          </div>

          {/* Module Permissions */}
          <div className="mb-8">
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              הרשאות מודולים וגישה
            </h3>
            
            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500 mb-6">
                סמן את רמת הגישה הרצויה עבור כל חלק במערכת. סימון בשורת אם ישנה אוטומטית גם את כל תתי-הסעיפים שאחריה.
              </p>
              {renderTree(getPermissionTree(deliveryAreas))}
            </div>
          </div>

          {/* RLS Data Scope Permissions */}
          <div className="mb-4">
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              סינון נתונים ואזורים (Data Scope)
            </h3>
            
            <div className="bg-white border-2 border-indigo-100 rounded-3xl p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500 mb-5">
                האם להגביל את המשתמש לראות רק הזמנות ולקוחות ששייכים לאזורים ספציפיים?
                <br />(למשל: נהג שמותר לו לראות מידע רק עבור ירושלים)
              </p>

              {role === 'ADMIN' ? (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-sm font-semibold mb-4">
                  💡 משתמש זה מוגדר כ״מנהל מערכת״ בראשית העמוד. מנהלים מקבלים גישת סופר-יוזר לכל האזורים ומוחרגים אוטומטית ממנגנון הסינון הגיאוגרפי.
                </div>
              ) : null}

              <div className="flex flex-wrap bg-slate-100/80 p-1.5 rounded-xl w-full sm:w-fit relative mb-6 gap-1">
                <button 
                  type="button"
                  onClick={() => setDataScope(s => ({ ...s, isRestricted: false }))}
                  className={`flex-1 min-w-[120px] px-3 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                     !dataScope.isRestricted
                       ? 'bg-white text-indigo-700 shadow border border-indigo-200' 
                       : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  לכל האזורים
                </button>
                <button 
                  type="button"
                  onClick={() => setDataScope(s => ({ ...s, isRestricted: true }))}
                  className={`flex-1 min-w-[120px] px-3 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                     dataScope.isRestricted
                       ? 'bg-indigo-50 text-indigo-700 shadow border border-indigo-200' 
                       : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  הגבל לאזורים
                </button>
              </div>

              {dataScope.isRestricted && (
                 <div className="space-y-6 animate-in slide-in-from-top-2 fade-in duration-300 border-t border-indigo-50 pt-5">
                   
                   {/* Cities Filter */}
                   <div>
                     <label className="block text-sm font-bold text-gray-800 mb-3">ערים מורשות (אמצע השבוע/כללי)</label>
                     <div className="flex flex-wrap gap-2">
                       {CITIES.map(c => {
                         const isSelected = dataScope.cities.includes(c);
                         return (
                           <button
                             key={c}
                             onClick={() => setDataScope(s => ({ ...s, cities: isSelected ? s.cities.filter(x => x !== c) : [...s.cities, c] }))}
                             className={`px-4 py-2 border rounded-full text-sm font-semibold transition-colors ${
                               isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-400'
                             }`}
                           >
                             {c}
                           </button>
                         )
                       })}
                     </div>
                   </div>

                   {/* Areas Filter */}
                   <div>
                     <label className="block text-sm font-bold text-gray-800 mb-3">אזורי מסלול מורשים (שבת/מיוחדים)</label>
                     {deliveryAreas.length === 0 ? (
                       <div className="text-sm text-gray-400 italic">לא מוגדרים אזורי חלוקה במערכת בהגדרות המנהל.</div>
                     ) : (
                       <div className="flex flex-wrap gap-2">
                         {deliveryAreas.map(a => {
                           const isSelected = dataScope.areas.includes(a.id);
                           return (
                             <button
                               key={a.id}
                               onClick={() => setDataScope(s => ({ ...s, areas: isSelected ? s.areas.filter(x => x !== a.id) : [...s.areas, a.id] }))}
                               className={`px-4 py-2 border rounded-full text-sm font-semibold transition-colors ${
                                 isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-400'
                               }`}
                             >
                               {a.name}
                             </button>
                           )
                         })}
                       </div>
                     )}
                   </div>

                   <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-start gap-2">
                     <Shield className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                     <p className="text-amber-800 text-xs font-semibold leading-relaxed">
                       שימו לב: משתמש יראה רק נתונים התאמים לאחת מהערים או לאחד מאזורי החלוקה שייבחרו מעלה כעת.<br/>
                       אם לא נבחר כלום והופעל סינון מוגבל, המשתמש המוגדר כעת <strong>לא יראה כלום לעולם</strong>.
                     </p>
                   </div>

                 </div>
              )}
            </div>
          </div>

          {/* Chat App Permissions */}
          <div className="mb-8">
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              הרשאות צ'אט (WhatsApp)
            </h3>
            
            <div className="bg-white border-2 border-emerald-100 rounded-3xl p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500 mb-5">
                שלוט בגישת המשתמש למודול התקשורת והצ'אט הפנימי של המערכת.
              </p>

              <div className="flex flex-col gap-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={chatSettings.isAdmin}
                      onChange={(e) => setChatSettings(s => ({ ...s, isAdmin: e.target.checked }))}
                    />
                    <div className={`block w-14 h-8 rounded-full transition-colors ${chatSettings.isAdmin ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${chatSettings.isAdmin ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">מנהל צ'אט (Chat Admin)</div>
                    <div className="text-xs text-gray-500">מאפשר ניהול הגדרות קבוצה, מחיקת הודעות של כולם ועוד. (מנהל מערכת ראשי הוא מנהל צ'אט אוטומטית)</div>
                  </div>
                </label>

                <div className="h-px w-full bg-gray-100 my-1"></div>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={chatSettings.isBanned}
                      onChange={(e) => setChatSettings(s => ({ ...s, isBanned: e.target.checked }))}
                    />
                    <div className={`block w-14 h-8 rounded-full transition-colors ${chatSettings.isBanned ? 'bg-red-500' : 'bg-gray-200'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${chatSettings.isBanned ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 group-hover:text-red-700 transition-colors">חסום גישה לצ'אט (Banned)</div>
                    <div className="text-xs text-gray-500">חסימה מוחלטת מכניסה או צפייה בשיחות באפליקציית הצ'אט.</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
          
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Shield className="w-5 h-5" />
                שמור שינויים לחשבון
              </>
            )}
          </button>
          <button 
            onClick={onClose}
            disabled={isSaving}
            className="w-1/3 h-14 bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-bold rounded-xl transition-colors"
          >
            ביטול
          </button>
        </div>

      </div>
    </div>
  )
}
