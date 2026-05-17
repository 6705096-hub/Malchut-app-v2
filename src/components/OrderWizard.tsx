'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, CircleCheck, Loader2, Info, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { BackButton } from '@/components/BackButton'
import { addActionToQueue } from '@/lib/offlineQueue'

type Customer = { id: string; name: string; phone: string; address: string | null; city?: string | null; typeId?: string; saveAddress?: boolean; debt?: number; prices?: { productId: string; price: number; bulkQuantity?: number | null; bulkPrice?: number | null; discountType?: 'PACK_OF_N' | 'ALL_REDUCED_PRICE' | null; discountIfAnyOtherPrice?: number | null }[] }
type OrderItem = { product: { id: string; name: string; price: number; category: string }; quantity: number }
type Product = { id: string; name: string; price: number; category: string; bulkQuantity?: number | null; bulkPrice?: number | null; discountType?: 'PACK_OF_N' | 'ALL_REDUCED_PRICE' | null; discountIfAnyOtherPrice?: number | null; fractionSize?: number; linkedWholeProductId?: string | null; sortOrder?: number; sortOrderStores?: number; isSpecial?: boolean; isSpecialStores?: boolean }

import { getParasha, getParashaForDate } from '@/lib/parasha'
import { getDeliveryHebrewDate } from '@/lib/hebrewDate'
import { startOfWeek, addDays, startOfDay, isSameDay, differenceInDays, format } from 'date-fns'
import { getHebrewDateString } from '@/lib/hebrewDate'
import { HebrewDatePicker } from './HebrewDatePicker'

function getReferenceDate() {
  const now = new Date();
  if (now.getDay() === 6 || (now.getDay() === 5 && now.getHours() >= 17)) {
    return addDays(now, 2);
  }
  return now;
}
type CustomerTypePrice = { productId: string; price: number; bulkQuantity?: number | null; bulkPrice?: number | null; discountType?: 'PACK_OF_N' | 'ALL_REDUCED_PRICE' | null; discountIfAnyOtherPrice?: number | null }
type CustomerType = { id: string; name: string; saveAddress: boolean; prices: CustomerTypePrice[] }

type SpecialDate = { id: string; name: string; date: string }
type BlockedDate = { id: string; date: string; reason: string | null }

function CustomerInfoInline({
  name, setName, phone, setPhone, address, setAddress,
  city, setCity, area, setArea, areas, isShabbat,
  saveAddress, setSaveAddress
}: any) {
  const [editingName, setEditingName] = useState(false)
  const [editingPhone, setEditingPhone] = useState(false)
  const [editingAddress, setEditingAddress] = useState(false)

  const areaName = areas.find((a: any) => a.id === area)?.name || '';

  return (
    <div className="flex flex-col gap-1.5 items-start mb-4 px-2 animate-in fade-in pt-2">

      {/* NAME */}
      <div className="relative z-[70]">
        {editingName ? (
          <input autoFocus value={name} onChange={e => setName(e.target.value)} onBlur={() => setEditingName(false)}
            className="w-[220px] text-lg font-bold bg-white px-2 py-1 shadow-lg border border-blue-400 rounded outline-none absolute -top-1.5 right-0" placeholder="שם מלא" />
        ) : (
          <span className="text-xl font-bold text-gray-800 cursor-pointer hover:opacity-75 transition-opacity" onClick={() => setEditingName(true)}>
            {name || 'הזן שם'}
          </span>
        )}
      </div>

      {/* PHONE */}
      <div className="relative z-[60]">
        {editingPhone ? (
          <input autoFocus type="tel" value={phone} onChange={e => setPhone(e.target.value)} onBlur={() => setEditingPhone(false)}
            className="w-[180px] text-lg font-bold bg-white px-2 py-1 shadow-lg border border-blue-400 rounded outline-none absolute -top-1.5 right-0" placeholder="טלפון" />
        ) : (
          <span className="text-lg font-bold text-gray-700 cursor-pointer hover:opacity-75 transition-opacity" onClick={() => setEditingPhone(true)} dir="ltr">
            {phone || 'הזן טלפון'}
          </span>
        )}
      </div>

      {/* ADDRESS */}
      <div className="relative z-[50]">
        {editingAddress ? (
          <div className="absolute -top-2 right-0 flex flex-col gap-3 w-72 bg-white p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-200">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm font-bold text-gray-800">עריכת כתובת</span>
              <button type="button" onClick={() => setEditingAddress(false)} className="text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-xs font-bold hover:bg-blue-100">סגור</button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">רחוב ומספר</label>
              <input value={address} onChange={e => setAddress(e.target.value)} className="w-full text-sm font-bold bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:bg-white transition-colors" placeholder="רחוב" />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">עיר</label>
              <select value={city} onChange={e => setCity(e.target.value)} className="w-full text-sm font-bold bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg outline-none appearance-none cursor-pointer focus:border-blue-400 focus:bg-white transition-colors">
                <option value="">בחר עיר</option>
                <option value="ירושלים">ירושלים</option>
                <option value="בית שמש">בית שמש</option>
              </select>
            </div>

            {city === 'בית שמש' && areas?.length > 0 && (
              <div className="animate-in fade-in slide-in-from-top-1">
                <label className="block text-[11px] font-bold text-gray-500 mb-1">אזור חלוקה</label>
                <select value={area || ''} onChange={e => setArea(e.target.value)} className="w-full text-sm font-bold bg-gray-50 px-3 py-2 border border-gray-200 rounded-lg outline-none appearance-none cursor-pointer focus:border-purple-400 focus:bg-white transition-colors">
                  <option value="">בחר אזור</option>
                  {areas.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ) : (
          <div className="cursor-pointer hover:opacity-75 transition-opacity" onClick={() => setEditingAddress(true)}>
            <span className="text-md font-bold text-gray-600">
              {address || 'רחוב'} {city ? `, ${city}` : ''} {areaName ? `(${areaName})` : ''}
            </span>
          </div>
        )}
      </div>

    </div>
  )
}
export function OrderWizard({
  initialOrderId,
  initialTemplateId,
  isFixedInitial,
  onClose,
  initialOrderData
}: {
  initialOrderId?: string | null
  initialTemplateId?: string | null
  isFixedInitial?: boolean
  onClose?: () => void
  initialOrderData?: any
} = {}) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = initialOrderId || searchParams.get('edit') || searchParams.get('orderId');
  const templateId = initialTemplateId || searchParams.get('templateId');
  const isFixedMode = typeof isFixedInitial !== 'undefined' ? isFixedInitial : searchParams.get('isFixed') === 'true';

  // --- Customer State ---
  const [phoneInput, setPhoneInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState<string>('')
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([])
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([])
  const [isSearchingPhone, setIsSearchingPhone] = useState(false)
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null)
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [saveAddress, setSaveAddress] = useState(true)

  // Custom Customer Type
  const [customerTypes, setCustomerTypes] = useState<CustomerType[]>([])
  const [selectedTypeId, setSelectedTypeId] = useState<string>('')

  // --- Delivery State ---
  const [deliveryDay, setDeliveryDay] = useState('')
  const [deliveryWeek, setDeliveryWeek] = useState('THIS_WEEK')
  const [shabbatArea, setShabbatArea] = useState('')
  const [showAreaPicker, setShowAreaPicker] = useState(false)
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([])

  // Custom Dates State
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([])
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [selectedSpecialDateId, setSelectedSpecialDateId] = useState<string | null>(null)

  // --- Items: HOT and COLD quantities per product ---
  const [hotQtys, setHotQtys] = useState<Record<string, number>>({})
  const [coldQtys, setColdQtys] = useState<Record<string, number>>({})
  const [showEditCalendar, setShowEditCalendar] = useState(false)
  const [isPastOrder, setIsPastOrder] = useState(false)
  const [isStandingOrderMode, setIsStandingOrderMode] = useState(false)
  const [recurringDay, setRecurringDay] = useState('Shabbat')
  const [isRecurring, setIsRecurring] = useState(isFixedMode || !!templateId)
  const [requiresApproval, setRequiresApproval] = useState(false)

  // --- Notes & Payment ---
  const [notes, setNotes] = useState('')
  const [paidAmount, setPaidAmount] = useState<number | string>('')
  const [deliveryFee, setDeliveryFee] = useState<number | string>('')

  const [products, setProducts] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [showSpecials, setShowSpecials] = useState(false)

  const { standardProducts, specialProducts } = useMemo(() => {
    const ordered = [...products].sort((a: any, b: any) => {
      const orderA = deliveryDay === 'Wednesday_Stores' ? (a.sortOrderStores || 0) : (a.sortOrder || 0)
      const orderB = deliveryDay === 'Wednesday_Stores' ? (b.sortOrderStores || 0) : (b.sortOrder || 0)
      if (orderA !== orderB) return orderA - orderB
      return a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
    }) as Product[]

    const standard: Product[] = []
    const special: Product[] = []
    
    ordered.forEach(p => {
      const isSpec = deliveryDay === 'Wednesday_Stores' ? p.isSpecialStores : p.isSpecial
      if (isSpec) special.push(p)
      else standard.push(p)
    })
    
    return { standardProducts: standard, specialProducts: special }
  }, [products, deliveryDay])

  // Auto-open specials if editing and has special items selected
  useEffect(() => {
    if ((!!editId || !!templateId) && specialProducts.length > 0) {
      const hasSpecial = specialProducts.some(p => (hotQtys[p.id] || 0) > 0 || (coldQtys[p.id] || 0) > 0)
      if (hasSpecial) setShowSpecials(true)
    }
  }, [specialProducts, hotQtys, coldQtys, editId, templateId])

  useEffect(() => {
    if (!address || address.trim().length < 3) return;
    const t = setTimeout(() => {
      fetch(`/api/addresses/lookup?street=${encodeURIComponent(address)}`)
        .then(r => r.json())
        .then(data => {
          if (data.city) setCity(data.city);
          if (data.deliveryAreaId) {
            setShabbatArea(data.deliveryAreaId);
            setShowAreaPicker(false);
          }
        })
        .catch(() => { });
    }, 700);
    return () => clearTimeout(t);
  }, [address]);

  useEffect(() => {
    fetch('/api/areas')
      .then(res => res.json())
      .then(data => setAreas(data.areas || []))
      .catch(err => console.error('Failed to load areas', err))
  }, [])

  useEffect(() => {
    setIsLoadingProducts(true)
    Promise.all([
      fetch('/api/products').then(res => res.json()),
      fetch('/api/customer-types').then(res => res.json()),
      fetch('/api/settings/special-dates').then(res => res.json()),
      fetch('/api/settings/blocked-dates').then(res => res.json())
    ])
      .then(([prodData, typesData, specialData, blockedData]) => {
        setProducts(prodData.products || [])
        setCustomerTypes(typesData.customerTypes || [])
        setSpecialDates(Array.isArray(specialData) ? specialData : [])
        setBlockedDates(Array.isArray(blockedData) ? blockedData : [])
      })
      .catch(err => console.error('Failed to load data', err))
      .finally(() => setIsLoadingProducts(false))
  }, [])

  // Load order for editing
  useEffect(() => {
    if (initialOrderData) {
      const o = initialOrderData
      setCustomer(o.customer)
      setNameInput(o.customer.name)
      setPhoneInput(o.customer.phone)
      if (o.customer.saveAddress !== undefined) setSaveAddress(o.customer.saveAddress)
      setAddress(o.address || '')
      setCity(o.city || '')
      setSelectedTypeId(o.customer.customerTypeId || '')
      setDeliveryDay(o.deliveryDay)

      let resolvedWeek = o.deliveryWeek
      if (!resolvedWeek.includes('-')) {
        const createdAt = new Date(o.createdAt)
        const createdWeekStart = startOfWeek(createdAt, { weekStartsOn: 0 })
        const daysMap: Record<string, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Shabbat: 6 }
        const dayOffset = daysMap[o.deliveryDay] ?? 0
        const realDate = addDays(createdWeekStart, dayOffset)
        resolvedWeek = format(startOfWeek(realDate, { weekStartsOn: 0 }), 'yyyy-MM-dd')
      }
      setDeliveryWeek(resolvedWeek)
      setShabbatArea(o.deliveryAreaId || '')
      setDeliveryFee(o.deliveryFee || '')
      setPaidAmount(o.paidAmount || '')
      setNotes(o.notes || '')
      setIsPastOrder(o.status === 'PAID' || o.status === 'EXECUTED')
      
      const newHotQtys: Record<string, number> = {}
      const newColdQtys: Record<string, number> = {}
      o.items.forEach((item: any) => {
        const key = item.productId
        const isSbb = o.deliveryDay === 'Shabbat'
        const isHot = !isSbb && (item.variant === 'HOT' || (!item.variant && (item.product.category === 'HOT' || o.type === 'HOT')))
        if (isHot) {
          newHotQtys[key] = (newHotQtys[key] || 0) + item.quantity
        } else {
          newColdQtys[key] = (newColdQtys[key] || 0) + item.quantity
        }
      })
      setHotQtys(newHotQtys)
      setColdQtys(newColdQtys)
    } else if (editId) {
      fetch(`/api/orders/${editId}`)
        .then(res => res.json())
        .then(data => {
          if (data.order) {
            const o = data.order
            setCustomer(o.customer)
            setNameInput(o.customer.name)
            setPhoneInput(o.customer.phone)
            if (o.customer.saveAddress !== undefined) setSaveAddress(o.customer.saveAddress)
            setAddress(o.address || '')
            setCity(o.city || '')
            setSelectedTypeId(o.customer.customerTypeId || '')
            setDeliveryDay(o.deliveryDay)

            // Resolve relative weeks based on when the order was created
            let resolvedWeek = o.deliveryWeek
            if (!resolvedWeek.includes('-')) {
              const createdAt = new Date(o.createdAt)
              const createdWeekStart = startOfWeek(createdAt, { weekStartsOn: 0 })
              const daysMap: Record<string, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Shabbat: 6 }
              const dayOffset = daysMap[o.deliveryDay] ?? 0

              let absoluteDeliveryDate = addDays(createdWeekStart, dayOffset)
              if (resolvedWeek === 'NEXT_WEEK') absoluteDeliveryDate = addDays(absoluteDeliveryDate, 7)

              const today = startOfDay(getReferenceDate())
              const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 })
              const diffDays = differenceInDays(startOfDay(absoluteDeliveryDate), currentWeekStart)

              if (diffDays >= 0 && diffDays <= 6) {
                resolvedWeek = 'THIS_WEEK'
              } else if (diffDays >= 7 && diffDays <= 13) {
                resolvedWeek = 'NEXT_WEEK'
              } else {
                const tzOffset = absoluteDeliveryDate.getTimezoneOffset() * 60000;
                resolvedWeek = (new Date(absoluteDeliveryDate.getTime() - tzOffset)).toISOString().split('T')[0];
              }
            }
            setDeliveryWeek(resolvedWeek)

            setShabbatArea(o.deliveryAreaId || '')
            setNotes(o.notes || '')
            // Load existing item quantities into hotQtys/coldQtys
            const hot: Record<string, number> = {}
            const cold: Record<string, number> = {}
            o.items.forEach((i: any) => {
              if (i.variant === 'COLD') cold[i.product.id] = (cold[i.product.id] || 0) + i.quantity
              else hot[i.product.id] = (hot[i.product.id] || 0) + i.quantity
            })
            setHotQtys(hot)
            setColdQtys(cold)
            setDeliveryFee(o.deliveryFee || '')
            setStep(3)
          }
        })
        .catch(err => console.error('Failed to load order for edit', err))
      return
    } else if (templateId) {
      fetch(`/api/order-templates/${templateId}`)
        .then(res => res.json())
        .then(data => {
          if (data.template) {
            const o = data.template
            setCustomer(o.customer)
            setNameInput(o.customer.name)
            setPhoneInput(o.customer.phone)
            if (o.customer.saveAddress !== undefined) setSaveAddress(o.customer.saveAddress)
            setAddress(o.address || '')
            setCity(o.city || '')
            setSelectedTypeId(o.customer.customerTypeId || '')
            setDeliveryDay(o.deliveryDay)
            setDeliveryWeek('THIS_WEEK')
            setIsRecurring(true)
            setShabbatArea(o.deliveryAreaId || '')
            setNotes(o.notes || '')
            const hot: Record<string, number> = {}; const cold: Record<string, number> = {}; o.items.forEach((i: any) => {
              if (i.variant === 'COLD') cold[i.product.id] = (cold[i.product.id] || 0) + i.quantity
              else hot[i.product.id] = (hot[i.product.id] || 0) + i.quantity
            })
            setHotQtys(hot)
            setColdQtys(cold)
            setDeliveryFee(o.deliveryFee || '')
            setStep(3)
          }
        })
        .catch(err => console.error('Failed to load template for edit', err))
      return
    }

    const customerId = searchParams.get('customerId')
    const customerName = searchParams.get('customerName')
    const customerPhone = searchParams.get('customerPhone')
    const customerAddress = searchParams.get('customerAddress')
    const customerTypeId = searchParams.get('customerTypeId')
    if (customerId && customerName && customerPhone) {
      const c: Customer = { id: customerId, name: customerName, phone: customerPhone, address: customerAddress || null, typeId: customerTypeId || undefined }
      setCustomer(c)
      // Fetch full customer details to get their personal prices
      fetch(`/api/customers/search?q=${customerPhone}`)
        .then(res => res.json())
        .then(data => {
          const fullCustomer = data.customers?.find((x: any) => x.id === customerId);
          if (fullCustomer) {
            setCustomer(fullCustomer);
            setFoundCustomer(fullCustomer);
          }
        })
        .catch(err => console.error('Failed to load full customer details', err))

      setNameInput(customerName)
      setPhoneInput(customerPhone)
      setAddress(customerAddress || '')
      setCity(c.city || '') // if available in search
      setSelectedTypeId(customerTypeId || '')
      setStep(3)
    }
  }, [searchParams, editId, templateId])

  const isExistingCustomer = !!foundCustomer || (customer && customer.id !== 'NEW')

  const handleNext = () => {
    setStep(s => {
      // If we are on step 1 and it's an existing customer, skip type selection (step 2)
      if (s === 1 && isExistingCustomer) return 3
      return s + 1
    })
    document.querySelector('.fixed.inset-0.z-\\[200\\]')?.scrollTo({ top: 0, behavior: 'smooth' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBack = () => {
    setStep(s => {
      // If we are on step 3 and it's an existing customer, go back directly to step 1
      if (s === 3 && isExistingCustomer) return 1
      return Math.max(1, s - 1)
    })
  }

  const handleUpdateQty = (productId: string, type: 'HOT' | 'COLD', qty: number) => {
    const setter = type === 'HOT' ? setHotQtys : setColdQtys
    setter(prev => {
      if (qty <= 0) { const n = { ...prev }; delete n[productId]; return n }
      return { ...prev, [productId]: qty }
    })
  }

  const getProductConfig = (productId: string) => {
    const pd = products.find(p => p.id === productId)
    if (!pd) return null
    let res = {
      price: pd.price,
      bulkQuantity: pd.bulkQuantity,
      bulkPrice: pd.bulkPrice,
      discountType: pd.discountType || 'PACK_OF_N',
      discountIfAnyOtherPrice: pd.discountIfAnyOtherPrice
    }
    if (selectedTypeId) {
      const type = customerTypes.find(t => t.id === selectedTypeId)
      if (type) {
        const tPrice = type.prices.find(p => p.productId === productId)
        if (tPrice) {
          res = { ...res, price: tPrice.price, discountIfAnyOtherPrice: undefined }
          if (tPrice.bulkQuantity) res.bulkQuantity = tPrice.bulkQuantity
          if (tPrice.bulkPrice) res.bulkPrice = tPrice.bulkPrice
          if (tPrice.discountType) res.discountType = tPrice.discountType
          if (tPrice.discountIfAnyOtherPrice !== undefined && tPrice.discountIfAnyOtherPrice !== null) res.discountIfAnyOtherPrice = tPrice.discountIfAnyOtherPrice
        }
      }
    }
    const activeCust = customer?.prices ? customer : foundCustomer?.prices ? foundCustomer : null
    if (activeCust?.prices) {
      const cPrice = activeCust.prices.find((p: any) => p.productId === productId)
      if (cPrice) {
        // MUST REMOVE `discountIfAnyOtherPrice` if the personal custom price doesn't have it, otherwise it overrides it!
        res = { ...res, price: cPrice.price, discountIfAnyOtherPrice: undefined }
        if (cPrice.bulkQuantity) res.bulkQuantity = cPrice.bulkQuantity
        if (cPrice.bulkPrice) res.bulkPrice = cPrice.bulkPrice
        if (cPrice.discountType) res.discountType = cPrice.discountType
        if (cPrice.discountIfAnyOtherPrice !== undefined && cPrice.discountIfAnyOtherPrice !== null) res.discountIfAnyOtherPrice = cPrice.discountIfAnyOtherPrice
      }
    }
    return res
  }

  const getProductPrice = (productId: string, currentQty: number = 0, totalCartItems: number = 0) => {
    const conf = getProductConfig(productId)
    if (!conf) return 0
    if (conf.discountIfAnyOtherPrice != null && (totalCartItems - currentQty) > 0) {
      return conf.discountIfAnyOtherPrice
    }
    return conf.price
  }

  const allEntries = [
    ...Object.entries(hotQtys).map(([id, qty]) => ({ id, qty })),
    ...Object.entries(coldQtys).map(([id, qty]) => ({ id, qty }))
  ]

  const totalCartItems = allEntries.reduce((s, { qty }) => s + qty, 0)

  const itemsTotal = allEntries.reduce((sum, { id, qty }) => {
    const conf = getProductConfig(id)
    if (!conf) return sum

    // Apply cross-product discount condition first
    if (conf.discountIfAnyOtherPrice != null && (totalCartItems - qty) > 0) {
      conf.price = conf.discountIfAnyOtherPrice
    }

    if (conf.bulkQuantity && conf.bulkPrice && qty >= conf.bulkQuantity) {
      if (conf.discountType === 'ALL_REDUCED_PRICE') {
        return sum + (qty * (conf.bulkPrice / (conf.bulkQuantity === 1 ? 1 : (conf.bulkQuantity || 1)))) // Note: ALL_REDUCED_PRICE bulkPrice is per unit when threshold met
      } else { // PACK_OF_N
        const bulkPacks = Math.floor(qty / conf.bulkQuantity)
        const singles = qty % conf.bulkQuantity
        return sum + (bulkPacks * conf.bulkPrice) + (singles * conf.price)
      }
    }

    return sum + (conf.price * qty)
  }, 0)

  const orderTotal = itemsTotal + (Number(deliveryFee) || 0)

  const hotTotal = Object.entries(hotQtys).reduce((s, [id, qty]) => s + qty, 0)
  const coldTotal = Object.entries(coldQtys).reduce((s, [id, qty]) => s + qty, 0)

  const handleSubmit = async (saveMode: 'NORMAL' | 'TEMPLATE_ONLY' = 'NORMAL') => {
    setIsSubmitting(true)
    const allItems: { productId: string; quantity: number; price: number; variant: string }[] = []
    Object.entries(hotQtys).forEach(([id, qty]) => {
      if (qty > 0) allItems.push({ productId: id, quantity: qty, price: getProductPrice(id), variant: 'HOT' })
    })
    Object.entries(coldQtys).forEach(([id, qty]) => {
      if (qty > 0) allItems.push({ productId: id, quantity: qty, price: getProductPrice(id), variant: 'COLD' })
    })
    const payload = {
      customer: customer?.id === 'NEW'
        ? { name: nameInput, phone: phoneInput, typeId: selectedTypeId || null, saveAddress }
        : { id: customer?.id, typeId: selectedTypeId || null, saveAddress },
      deliveryDay,
      deliveryWeek,
      type: (deliveryDay === 'Shabbat' || selectedSpecialDateId) ? 'HOT' : (hotTotal > 0 ? 'HOT' : 'COLD'),
      deliveryArea: shabbatArea || null,
      address,
      city,
      notes,
      specialDateId: selectedSpecialDateId,
      items: allItems,
      totalPrice: orderTotal,
      deliveryFee: Number(deliveryFee) || 0,
      paidAmount: Number(paidAmount) || 0,
      isPastOrder,
      isRecurring: isRecurring || isFixedMode || !!templateId || isStandingOrderMode,
      recurringDay: isStandingOrderMode ? recurringDay : deliveryDay,
      requiresApproval: isStandingOrderMode ? requiresApproval : false
    }

    try {
      const url = editId ? `/api/orders/${editId}` : (templateId ? `/api/order-templates/${templateId}` : '/api/orders')
      const method = (editId || templateId) ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) { const text = await res.text(); throw new Error(text || 'שגיאה בשמירה'); }

      if (onClose) {
        onClose(); // In a modal, just close it and let the parent refresh!
      } else if (editId) {
        router.back();
        setTimeout(() => router.refresh(), 100);
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      if (!navigator.onLine || err.message === 'Failed to fetch') {
        // OFFLINE MODE: Save to queue instead of failing
        alert('אין חיבור לאינטרנט! ההזמנה נשמרה בטלפון ותסונכרן אוטומטית כשהקליטה תחזור.');
        try {
          await addActionToQueue('CREATE_ORDER', payload)
          if (onClose) onClose()
          else router.push('/dashboard')
        } catch (queueErr) {
          console.error('Failed to save offline queue', queueErr)
          alert('שגיאה קריטית בשמירה במצב לא מקוון.')
        }
      } else {
        console.error(err)
        alert('שגיאה בשמירת ההזמנה: ' + err.message)
      }
      setIsSubmitting(false)
    }
  }


  const handleDeleteTemplate = async () => {
    if (!templateId) return;
    if (!confirm('האם לבטל ולמחוק את ההזמנה הקבועה הזו לתמיד?')) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/order-templates/${templateId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('err');

      if (onClose) {
        onClose();
      } else {
        router.push('/dashboard/fixed-orders');
      }
    } catch (err) {
      alert('שגיאה במחיקת ההזמנה');
      setIsSubmitting(false);
    }
  }


  const [nameSuggestions, setNameSuggestions] = useState<Customer[]>([])

  const handleNameChange = (val: string) => {
    setNameInput(val)
    setFoundCustomer(null)
    if (debounceTimeout) clearTimeout(debounceTimeout)
    if (val.trim().length >= 2) {
      const t = setTimeout(async () => {
        setIsSearchingPhone(true)
        try {
          const res = await fetch(`/api/customers/search?q=${encodeURIComponent(val.trim())}`)
          const data = await res.json()
          if (data.customers) {
            setNameSuggestions(data.customers)
            const exact = data.customers.find((c: Customer) => c.name.toLowerCase() === val.trim().toLowerCase())
            if (exact) {
              setFoundCustomer(exact);
              setPhoneInput(exact.phone);
              if (exact.saveAddress !== false) {
                if (exact.address) {
                  setAddress(exact.address);
                  fetch(`/api/addresses/lookup?street=${encodeURIComponent(exact.address)}`).then(r => r.json()).then(d => { if (d.city) setCity(d.city); if (d.deliveryAreaId) setShabbatArea(d.deliveryAreaId); }).catch(() => { });
                }
              } else {
                setAddress(''); setCity(''); setShabbatArea('');
              }
              setNameSuggestions([])
            }
          }
        } catch (e) { console.error(e) }
        finally { setIsSearchingPhone(false) }
      }, 400)
      setDebounceTimeout(t)
    } else {
      setNameSuggestions([])
    }
  }

  // Phone CRM search

  const handlePhoneChange = (val: string) => {
    setPhoneInput(val)
    setFoundCustomer(null)
    if (debounceTimeout) clearTimeout(debounceTimeout)
    const clean = val.replace(/\D/g, '')
    if (clean.length >= 3) {
      const t = setTimeout(async () => {
        setIsSearchingPhone(true)
        try {
          const res = await fetch(`/api/customers/search?q=${encodeURIComponent(clean)}`)
          const data = await res.json()
          if (data.customers) {
            setCustomerSuggestions(data.customers)
            if (clean.length >= 9) {
              const exact = data.customers.find((c: Customer) => c.phone.replace(/\D/g, '') === clean)
              if (exact) {
                setFoundCustomer(exact);
                setNameInput(exact.name);
                if (exact.customerTypeId) setSelectedTypeId(exact.customerTypeId); else setSelectedTypeId('');
                if (exact.saveAddress !== undefined) setSaveAddress(exact.saveAddress);
                if (exact.saveAddress !== false) {
                  if (exact.defaultDeliveryAreaId) { setShabbatArea(exact.defaultDeliveryAreaId); setShowAreaPicker(false); }
                  if (exact.city) setCity(exact.city);
                  if (exact.address) {
                    setAddress(exact.address);
                    fetch(`/api/addresses/lookup?street=${encodeURIComponent(exact.address)}`).then(r => r.json()).then(d => { if (d.city && !exact.city) setCity(d.city); if (d.deliveryAreaId && !exact.defaultDeliveryAreaId) { setShabbatArea(d.deliveryAreaId); setShowAreaPicker(false); } }).catch(() => { });
                  }
                } else {
                  setAddress(''); setCity(''); setShabbatArea('');
                }
                setCustomerSuggestions([])
              }
            }
          }
        } catch (e) { console.error(e) }
        finally { setIsSearchingPhone(false) }
      }, 400)
      setDebounceTimeout(t)
    } else {
      setCustomerSuggestions([])
    }
  }

  const selectCustomer = (c: any) => {
    setPhoneInput(c.phone); setNameInput(c.name); setFoundCustomer(c)
    if (c.saveAddress !== undefined) setSaveAddress(c.saveAddress)
    if (c.customerTypeId) setSelectedTypeId(c.customerTypeId)
    else setSelectedTypeId('')

    if (c.saveAddress !== false) {
      if (c.defaultDeliveryAreaId) { setShabbatArea(c.defaultDeliveryAreaId); setShowAreaPicker(false); }
      if (c.city) setCity(c.city)
      if (c.address) {
        setAddress(c.address)
        fetch(`/api/addresses/lookup?street=${encodeURIComponent(c.address)}`).then(r => r.json()).then(d => { if (d.city && !c.city) setCity(d.city); if (d.deliveryAreaId && !c.defaultDeliveryAreaId) { setShabbatArea(d.deliveryAreaId); setShowAreaPicker(false); } }).catch(() => { });
      }
    } else {
      setAddress(''); setCity(''); setShabbatArea('');
    }
    setCustomerSuggestions([])
  }
  // Product row function
  const renderProductRow = (product: Product, type: 'HOT' | 'COLD' | 'NEUTRAL') => {
    const qtys = type === 'COLD' ? coldQtys : hotQtys
    const currentQty = qtys[product.id] || 0

    let bgSelected = 'bg-gray-100 border-gray-300'
    let bgNormal = 'bg-gray-50 border-gray-100/60'
    let plusCls = 'bg-gray-200 text-gray-800 hover:bg-gray-300'

    if (type === 'HOT') {
      bgSelected = 'bg-red-50 border-red-200'
      bgNormal = 'bg-red-50/20 border-red-100/60'
      plusCls = 'bg-red-100 text-red-700 hover:bg-red-200'
    } else if (type === 'COLD') {
      bgSelected = 'bg-blue-50 border-blue-200'
      bgNormal = 'bg-blue-50/20 border-blue-100/60'
      plusCls = 'bg-blue-100 text-blue-700 hover:bg-blue-200'
    } else if (type === 'NEUTRAL') {
      bgSelected = 'bg-purple-50 border-purple-200'
      bgNormal = 'bg-purple-50/20 border-purple-100/60'
      plusCls = 'bg-purple-100 text-purple-700 hover:bg-purple-200'
    }

    // Check custom price difference
    const currentPrice = getProductPrice(product.id, currentQty, totalCartItems)
    const isCustomPrice = currentPrice !== product.price

    return (
      <div className={`flex justify-between items-center px-3 py-2 rounded-xl border transition-colors ${currentQty > 0 ? bgSelected : bgNormal}`}>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm flex items-center gap-1.5 leading-none">
            {product.name}
            {isCustomPrice && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-[1px] rounded-full uppercase font-bold tracking-widest leading-none">מבצע</span>}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm shrink-0">
          <button type="button" onClick={() => handleUpdateQty(product.id, type === 'COLD' ? 'COLD' : 'HOT', Math.max(0, currentQty - 1))}
            className="w-8 h-8 flex items-center justify-center rounded-md text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors active:scale-95">
            <span className="text-xl font-medium leading-none mb-0.5">-</span>
          </button>
          <div className="relative">
            <select value={currentQty} onChange={e => handleUpdateQty(product.id, type === 'COLD' ? 'COLD' : 'HOT', parseInt(e.target.value, 10))}
              className="appearance-none bg-transparent font-black text-lg text-center w-8 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 rounded">
              {Array.from({ length: 101 }).map((_, i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <button type="button" onClick={() => handleUpdateQty(product.id, type === 'COLD' ? 'COLD' : 'HOT', currentQty + 1)}
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors active:scale-95 ${plusCls}`}>
            <span className="text-xl font-medium leading-none mb-0.5">+</span>
          </button>
        </div>
      </div>
    )
  }

  const renderProductCardVertical = (product: Product, type: 'HOT' | 'COLD') => {
    const qtys = type === 'HOT' ? hotQtys : coldQtys
    const currentQty = qtys[product.id] || 0
    let bgSelected = type === 'HOT' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
    const bgNormal = 'bg-white border-gray-100'
    let plusCls = type === 'HOT' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'

    if (product.category === 'OTHER') {
      bgSelected = 'bg-purple-50 border-purple-200'
      plusCls = 'bg-purple-100 text-purple-700 hover:bg-purple-200'
    }

    // Check custom price difference
    const currentPrice = getProductPrice(product.id)
    const isCustomPrice = currentPrice !== product.price

    return (
      <div className={`flex flex-col justify-between p-2 rounded-xl border transition-colors shadow-sm ${currentQty > 0 ? bgSelected : bgNormal}`}>
        <div className="text-center mb-1.5">
          <p className="font-bold text-gray-900 text-xs leading-tight break-words">
            {product.name}
            {isCustomPrice && <span className="inline-block mr-1 align-middle text-[8px] bg-indigo-100 text-indigo-700 px-1 py-[1px] rounded uppercase font-bold tracking-widest">מבצע</span>}
          </p>
        </div>

        {/* Controls UNDERNEATH */}
        <div className="flex items-center justify-between bg-gray-50/50 rounded-lg p-0.5 border border-gray-100/50">
          <button type="button" onClick={() => handleUpdateQty(product.id, type, Math.max(0, currentQty - 1))}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-600 bg-white hover:bg-gray-50 border shadow-sm transition-colors active:scale-95">
            <span className="text-lg font-medium leading-none mb-0.5">-</span>
          </button>

          <div className="relative">
            <select value={currentQty} onChange={e => handleUpdateQty(product.id, type, parseInt(e.target.value, 10))}
              className="appearance-none bg-transparent font-black text-base text-center w-7 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 rounded p-0 m-0">
              {Array.from({ length: 101 }).map((_, i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <button type="button" onClick={() => handleUpdateQty(product.id, type, currentQty + 1)}
            className={`w-7 h-7 flex items-center justify-center rounded-md border border-transparent shadow-sm transition-colors active:scale-95 ${plusCls}`}>
            <span className="text-lg font-medium leading-none mb-0.5">+</span>
          </button>
        </div>
      </div>
    )
  }

  const hotProducts = products.filter(p => p.category === 'HOT')
  const coldProducts = products.filter(p => p.category === 'COLD')
  const otherProducts = products.filter(p => p.category === 'OTHER')

  const canProceedStep1 = nameInput.trim().length > 0 && phoneInput.replace(/\D/g, '').length >= 9
  const canProceedStep3 = isPastOrder
    ? !!deliveryDay
    : !!deliveryDay && address.trim().length > 0 && (city !== 'בית שמש' || !!shabbatArea)

  const selectedTypeObj = customerTypes.find(t => t.id === selectedTypeId)

  return (
    <div className="w-full flex flex-col pt-0 pb-32 relative">
      <div className="mb-2 sm:mb-4 px-2 pt-0 flex justify-between items-center border-b border-gray-200 pb-2 gap-2">
        <div className="flex flex-col pr-2 shrink-0 max-w-[50%]">
          <div className="flex flex-col justify-center">
            <h2 className="text-xl font-black text-gray-900 leading-tight truncate">
              {!!editId || !!templateId ? 'עריכת הזמנה' : ["", "פרטי לקוח", "סוג לקוח", "תאריך", "בחירת מוצרים"][step]}
            </h2>
          </div>
          {step > 1 && nameInput && (
            <span className="text-xs font-bold text-gray-500 truncate mt-0.5">{nameInput}</span>
          )}
        </div>
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 overflow-hidden">
          {step === 1 && !editId && !templateId && (
            <button type="button" 
              onClick={() => { 
                if (canProceedStep1) { 
                  setIsStandingOrderMode(true); 
                  const c = foundCustomer || { id: 'NEW', name: nameInput, phone: phoneInput, address, saveAddress };
                  if (c.id !== 'NEW') { c.saveAddress = saveAddress; }
                  setCustomer(c);
                  handleNext(); 
                } else { 
                  alert('אנא הזן מספר טלפון ושם לקוח לפני מעבר להזמנה קבועה'); 
                }
              }}
              className="text-[11px] font-bold bg-white text-gray-600 px-3 py-1.5 rounded-full border border-gray-200 active:scale-95 transition-colors hover:bg-gray-50 shrink-0">
              הזמנה קבועה
            </button>
          )}
          {selectedTypeObj && (step > 1 || !!editId || !!templateId) && (
            <span className="text-[10px] sm:text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full shrink truncate shadow-sm">
              {selectedTypeObj.name}
            </span>
          )}
          {!selectedTypeObj && isExistingCustomer && (step > 1 || !!editId || !!templateId) && (
            <span className="text-[10px] sm:text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded-full shrink truncate shadow-sm">
              לקוח רגיל
            </span>
          )}
          {(!isStandingOrderMode && customer && (customer.debt || 0) > 0 && step > 1) && (
            <span className="text-[11px] sm:text-sm font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 shadow-sm flex items-center justify-center">
              חוב: ₪{customer.debt?.toFixed(0)}
            </span>
          )}
          <div className="shrink-0">
            {onClose ? (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-700"
                title="סגור"
              >
                <X className="w-5 h-5" />
              </button>
            ) : (
              <BackButton />
            )}
          </div>
        </div>
      </div>
      {/* Removed Step indicators */}

      {/* When in edit mode, add space between sections */}
      <div className={!!editId ? "space-y-12" : ""}>

        {/* ===== STEP 1: Customer ===== */}
        {(step === 1 || !!editId) && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className={!!editId || !!templateId ? "" : "space-y-4"}>
              {(!!editId || !!templateId) ? (
                <CustomerInfoInline
                  name={nameInput} setName={setNameInput}
                  phone={phoneInput} setPhone={setPhoneInput}
                  address={address} setAddress={setAddress}
                  city={city} setCity={setCity}
                  area={shabbatArea} setArea={setShabbatArea}
                  areas={areas}
                  isShabbat={deliveryDay === 'Shabbat' || selectedSpecialDateId}
                />
              ) : (
                <div className="space-y-4">
                  {/* Phone */}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">מספר טלפון</label>
                    <div className="relative">
                      <input type="tel"
                        className={`w-full h-14 px-4 pr-12 rounded-xl border-2 text-lg font-bold outline-none transition-colors ${foundCustomer ? 'border-green-500 bg-green-50 text-green-900' : 'border-gray-300 focus:border-blue-500'}`}
                        value={phoneInput} onChange={e => handlePhoneChange(e.target.value)}
                        placeholder="05X-XXXXXXX" autoComplete="off" />
                      {isSearchingPhone && <div className="absolute inset-y-0 right-0 pr-4 flex items-center"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}
                      {foundCustomer && !isSearchingPhone && <div className="absolute inset-y-0 right-0 pr-4 flex items-center"><CircleCheck className="w-6 h-6 text-green-500" /></div>}
                    </div>
                    {customerSuggestions.length > 0 && !foundCustomer && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {customerSuggestions.map(c => (
                          <div key={c.id} className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0" onClick={() => selectCustomer(c)}>
                            <div className="font-bold text-gray-800">{c.phone}</div>
                            <div className="text-sm text-gray-500">{c.name}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      שם לקוח {foundCustomer && <span className="text-green-600 text-xs font-bold">(נמצא ב-CRM)</span>}
                    </label>
                    <div className="relative">
                      <input type="text"
                        className={`w-full h-14 px-4 ${isSearchingPhone ? 'pr-12' : ''} rounded-xl border-2 text-lg font-bold outline-none transition-colors ${foundCustomer ? 'border-green-300 bg-gray-50 text-gray-700' : 'border-gray-300 focus:border-blue-500'}`}
                        value={nameInput} onChange={e => handleNameChange(e.target.value)}
                        placeholder="שם מלא" readOnly={!!foundCustomer} />
                      {isSearchingPhone && <div className="absolute inset-y-0 right-0 pr-4 flex items-center"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}
                    </div>
                    {nameSuggestions.length > 0 && !foundCustomer && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {nameSuggestions.map(c => (
                          <div key={c.id} className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0" onClick={() => { selectCustomer(c); setNameSuggestions([]); }}>
                            <div className="font-bold text-gray-800">{c.name}</div>
                            <div className="text-sm text-gray-500">{c.phone}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== STEP 2: Customer Type ===== */}
        {(step === 2 && !editId) && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <button type="button" onClick={() => { setSelectedTypeId(''); handleNext(); }}
                className={`w-full py-4 px-3 rounded-xl font-bold transition-all text-[15px] flex items-center justify-between shadow-sm ${selectedTypeId === '' ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
                <span className="truncate leading-tight">רגיל (ללא מחירון)</span>
                {selectedTypeId === '' && <CircleCheck className="w-5 h-5 shrink-0 ml-1 text-blue-600" />}
              </button>
              {customerTypes.map(t => (
                <button key={t.id} type="button" onClick={() => { setSelectedTypeId(t.id); handleNext(); }}
                  className={`w-full py-4 px-3 rounded-xl font-bold transition-all text-[15px] flex items-center justify-between shadow-sm ${selectedTypeId === t.id ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
                  <span className="truncate leading-tight">{t.name}</span>
                  {selectedTypeId === t.id && <CircleCheck className="w-5 h-5 shrink-0 ml-1 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===== STEP 3: Date / Recurring Day ===== */}
        {(step === 3 || !!editId) && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">

            {isStandingOrderMode ? (
              <div className="mb-4 mt-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="flex flex-wrap items-center gap-2 mb-3" dir="rtl">
                  <span className="font-black text-gray-800 text-sm w-full">יום חלוקה קבוע:</span>
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Shabbat'].map(day => {
                    const hebrewDays: Record<string, string> = { Sunday: 'ראשון', Monday: 'שני', Tuesday: 'שלישי', Wednesday: 'רביעי', Thursday: 'חמישי', Shabbat: 'שבת' };
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => { setRecurringDay(day); setDeliveryDay(day); }}
                        className={`px-3 py-1.5 rounded-full font-bold text-sm transition-all ${recurringDay === day ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-purple-50'}`}
                      >
                        {hebrewDays[day]}
                      </button>
                    )
                  })}
                </div>

                {/* Approval mode toggle */}
                <div className="flex items-center justify-between gap-3 bg-white rounded-xl px-3 py-2.5 border border-gray-100 mt-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800 text-sm">אופן יצירה</span>
                    <span className="text-xs text-gray-400">
                      {requiresApproval ? 'תצטרך לאשר ידנית כל שבוע' : 'נוצרת אוטומטית יומיים לפני'}
                    </span>
                  </div>
                  <div className="flex rounded-xl overflow-hidden border border-gray-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => setRequiresApproval(false)}
                      className={`px-3 py-1.5 text-xs font-bold transition-all ${
                        !requiresApproval ? 'bg-emerald-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      ⚡ אוטומטי
                    </button>
                    <button
                      type="button"
                      onClick={() => setRequiresApproval(true)}
                      className={`px-3 py-1.5 text-xs font-bold transition-all border-r border-gray-200 ${
                        requiresApproval ? 'bg-amber-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      🔔 דורש אישור
                    </button>
                  </div>
                </div>
              </div>
            ) : (
            <div className={(!!editId || !!templateId) ? 'hidden' : 'space-y-0 mb-4'}>
              <div>

                <div className="flex items-center justify-center pt-0 pb-1">
                  <div className="flex items-center justify-between gap-2 w-full max-w-[280px]">
                    <button 
                      type="button" 
                      onClick={() => setDeliveryWeek('THIS_WEEK')}
                      disabled={deliveryWeek === 'THIS_WEEK'}
                      className={`p-1 rounded-full transition-colors focus:outline-none ${deliveryWeek === 'NEXT_WEEK' ? 'text-gray-400 hover:text-blue-600 hover:bg-gray-100 cursor-pointer' : 'text-gray-200 cursor-default'}`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    
                    <div className="flex flex-row items-baseline gap-1.5 flex-1 justify-center leading-none select-none">
                      <span className="text-lg font-extrabold text-blue-800 tracking-tight">
                        {deliveryWeek === 'THIS_WEEK' ? 'השבוע' : 'שבוע הבא'}
                      </span>
                      <span className="text-[13px] font-bold text-purple-600">
                        ({getParasha(deliveryWeek).split(' ').length > 1 ? getParasha(deliveryWeek).split(' ').map(x=>x[0]).join('"') : getParasha(deliveryWeek)})
                      </span>
                    </div>
  
                    <button 
                      type="button" 
                      onClick={() => setDeliveryWeek('NEXT_WEEK')}
                      disabled={deliveryWeek === 'NEXT_WEEK'}
                      className={`p-1 rounded-full transition-colors focus:outline-none ${deliveryWeek === 'THIS_WEEK' ? 'text-gray-400 hover:text-blue-600 hover:bg-gray-100 cursor-pointer' : 'text-gray-200 cursor-default'}`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
              <div>


                {/* Weekdays Row */}
                <div id="wizard-days-wrapper" className="flex items-center justify-between px-1 bg-white rounded-lg">
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].map(d => {
                    const daysMap: Record<string, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Shabbat: 6 }
                    const labels: Record<string, string> = { Sunday: 'א\'', Monday: 'ב\'', Tuesday: 'ג\'', Wednesday: 'ד\'', Thursday: 'ה\'' }

                    // Compute real absolute date
                    let absoluteDate = new Date();
                    if (deliveryWeek === 'THIS_WEEK' || deliveryWeek === 'NEXT_WEEK') {
                      const today = startOfDay(getReferenceDate());
                      let baseWeek = startOfWeek(today, { weekStartsOn: 0 });
                      if (deliveryWeek === 'NEXT_WEEK') baseWeek = addDays(baseWeek, 7);
                      absoluteDate = addDays(baseWeek, daysMap[d] ?? 0);
                    } else if (deliveryWeek.includes('-')) {
                      const baseDate = new Date(deliveryWeek);
                      const baseWeek = startOfWeek(baseDate, { weekStartsOn: 0 });
                      absoluteDate = addDays(baseWeek, daysMap[d] ?? 0);
                    }

                    const matchedSpecial = specialDates.find(sd => isSameDay(new Date(sd.date), absoluteDate));
                    const matchedBlocked = blockedDates.find(bd => isSameDay(new Date(bd.date), absoluteDate));

                    let isDisabled = false;

                    if (matchedBlocked) {
                      isDisabled = true;
                    } else if (deliveryWeek === 'THIS_WEEK' && !isPastOrder) {
                      const todayIndex = getReferenceDate().getDay()
                      if ((daysMap[d] ?? 0) < todayIndex) isDisabled = true
                    }

                    const rawP2 = getParasha(deliveryWeek);
                    const pArr2 = rawP2.split(' ');
                    const formattedP2 = pArr2.length > 1 ? pArr2.map(x => x[0]).join('"') : rawP2;

                    return (
                      <button key={d} type="button"
                        onClick={() => {
                          if (isDisabled) return;
                          setDeliveryWeek(deliveryWeek);
                          setDeliveryDay(d);
                          if (matchedSpecial) setSelectedSpecialDateId(matchedSpecial.id);
                          else setSelectedSpecialDateId(null);

                          // Scroll magic: bring the days row to the top!
                          setTimeout(() => {
                            document.getElementById('wizard-days-wrapper')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 50);
                        }}
                        disabled={isDisabled}
                        className={`flex-1 py-1 px-1 flex flex-col items-center gap-0.5 transition-all focus:outline-none rounded-xl ${isDisabled ? 'opacity-30 cursor-not-allowed' : deliveryWeek !== 'THIS_WEEK' && deliveryWeek !== 'NEXT_WEEK' && deliveryDay !== d ? 'hover:bg-gray-50' : 'hover:bg-gray-50'}`}>

                        <div className="flex flex-col items-center text-center">
                          {matchedBlocked ? (
                            <span className="text-red-500 line-through font-bold text-xs w-full">{labels[d]} חסום</span>
                          ) : matchedSpecial ? (
                            <span className={`text-fuchsia-600 font-bold text-[11px] leading-tight ${deliveryDay === d ? 'text-fuchsia-700 font-black scale-105' : ''}`}>{labels[d]}<br />{matchedSpecial.name}</span>
                          ) : (
                            <>
                              <span className={`text-sm ${deliveryDay === d ? 'text-blue-700 font-black scale-110' : 'text-gray-700 font-bold'}`}>{labels[d]}</span>
                              <span className={`text-[10px] hidden sm:block mt-1 ${deliveryDay === d ? 'text-purple-700 font-bold' : 'text-purple-500'}`}>{formattedP2}</span>
                            </>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Shabbat Row */}
                <div className="flex justify-center mt-0">
                  {['Shabbat'].map(d => {
                    const daysMap: Record<string, number> = { Shabbat: 6 }

                    let absoluteDate = new Date();
                    if (deliveryWeek === 'THIS_WEEK' || deliveryWeek === 'NEXT_WEEK') {
                      const today = startOfDay(getReferenceDate());
                      let baseWeek = startOfWeek(today, { weekStartsOn: 0 });
                      if (deliveryWeek === 'NEXT_WEEK') baseWeek = addDays(baseWeek, 7);
                      absoluteDate = addDays(baseWeek, daysMap[d] ?? 0);
                    } else if (deliveryWeek.includes('-')) {
                      const baseDate = new Date(deliveryWeek);
                      const baseWeek = startOfWeek(baseDate, { weekStartsOn: 0 });
                      absoluteDate = addDays(baseWeek, daysMap[d] ?? 0);
                    }

                    const matchedSpecial = specialDates.find(sd => isSameDay(new Date(sd.date), absoluteDate));
                    const matchedBlocked = blockedDates.find(bd => isSameDay(new Date(bd.date), absoluteDate));

                    let isDisabled = false;

                    if (matchedBlocked) {
                      isDisabled = true;
                    } else if (deliveryWeek === 'THIS_WEEK' && !isPastOrder) {
                      const todayIndex = getReferenceDate().getDay()
                      if ((daysMap[d] ?? 0) < todayIndex) isDisabled = true
                    }

                    const rawP3 = getParasha(deliveryWeek);
                    const pArr3 = rawP3.split(' ');
                    const formattedP3 = pArr3.length > 1 ? pArr3.map(x => x[0]).join('"') : rawP3;

                    return (
                      <button key={d} type="button"
                        onClick={() => {
                          if (isDisabled) return;
                          setDeliveryWeek(deliveryWeek);
                          setDeliveryDay(d);
                          if (matchedSpecial) setSelectedSpecialDateId(matchedSpecial.id);
                          else setSelectedSpecialDateId(null);

                          // Scroll magic
                          setTimeout(() => {
                            document.getElementById('wizard-days-wrapper')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 50);
                        }}
                        disabled={isDisabled}
                        className={`px-6 py-0 w-full max-w-[200px] flex flex-col items-center justify-center gap-0 transition-all focus:outline-none rounded-xl ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-50'}`}>

                        <div className="flex flex-col items-center leading-tight">
                          {matchedBlocked ? (
                            <span className="text-red-500 line-through font-bold">שבת - חסום</span>
                          ) : matchedSpecial ? (
                            <span className={`text-fuchsia-600 font-bold ${deliveryDay === d ? 'text-fuchsia-700 font-black scale-105' : ''}`}>שבת - {matchedSpecial.name}</span>
                          ) : (
                            <>
                              <span className={`text-base ${deliveryDay === d ? 'text-purple-700 font-extrabold' : 'text-gray-700 font-bold'}`}>שבת קודש</span>
                              <span className={`text-[10px] ${deliveryDay === d ? 'text-purple-800 font-bold' : 'text-purple-600 font-medium'}`}>פרשת {formattedP3}</span>
                            </>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            )}
            {/* Address (Moved from Step 1) */}
            {(!isPastOrder && !editId && !templateId) && (
              <div className="relative pt-2">
                <label className="block text-sm font-semibold text-gray-700 mb-3">כתובת למשלוח <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={`w-full h-14 px-4 rounded-xl border-2 outline-none transition-colors ${!address ? 'border-red-200 focus:border-red-400' : 'border-gray-300 focus:border-blue-500'}`}
                  value={address}
                  onChange={e => {
                    setAddress(e.target.value)
                    if (e.target.value.length >= 2) {
                      fetch(`/api/addresses/search?q=${encodeURIComponent(e.target.value)}`).then(r => r.json()).then(d => setAddressSuggestions(d.addresses || []))
                      if (debounceTimeout) clearTimeout(debounceTimeout)
                      const t = setTimeout(() => {
                        fetch(`/api/addresses/lookup?street=${encodeURIComponent(e.target.value)}`)
                          .then(r => r.json())
                          .then(d => {
                            if (d.city) setCity(d.city);
                            if (d.deliveryAreaId) { setShabbatArea(d.deliveryAreaId); setShowAreaPicker(false); }
                          })
                          .catch(() => { })
                      }, 500)
                      setDebounceTimeout(t)
                    } else { setAddressSuggestions([]) }
                  }}
                  onFocus={() => {
                    if (address.length >= 2) fetch(`/api/addresses/search?q=${encodeURIComponent(address)}`).then(r => r.json()).then(d => setAddressSuggestions(d.addresses || []))
                  }}
                  placeholder="רחוב, מספר בית, עיר..."
                />
                {addressSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {addressSuggestions.map((s, idx) => (
                      <div key={idx} className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 font-bold border-b border-gray-100 last:border-0"
                        onClick={() => {
                          setAddress(s);
                          setAddressSuggestions([]);
                          fetch(`/api/addresses/lookup?street=${encodeURIComponent(s)}`)
                            .then(r => r.json())
                            .then(d => {
                              if (d.city) setCity(d.city);
                              if (d.deliveryAreaId) { setShabbatArea(d.deliveryAreaId); setShowAreaPicker(false); }
                            }).catch(() => { });
                        }}
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* City Selection */}
            {(!isPastOrder && !editId && !templateId) && (
              <div className="pt-2 animate-in fade-in duration-300">
                <label className="block text-sm font-semibold text-gray-700 mb-2">עיר <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  {['ירושלים', 'בית שמש'].map(cName => (
                    <button
                      key={cName}
                      type="button"
                      onClick={() => {
                        setCity(cName);
                        // Optional scroll downwards slightly
                        setTimeout(() => {
                          document.getElementById('wizard-next-options')?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                        }, 50);
                      }}
                      className={`py-3 px-1 flex flex-col items-center gap-1 transition-all rounded-xl focus:outline-none ${city !== cName ? 'hover:bg-gray-50' : ''}`}
                    >
                      <span className={`transition-all ${city === cName ? 'text-blue-700 font-extrabold text-lg scale-110' : 'text-gray-500 font-bold text-sm'}`}>{cName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isPastOrder && !editId && !templateId && city === 'בית שמש' && (
              <div className="pt-2 animate-in fade-in duration-300">
                <label className="block text-sm font-semibold text-gray-700 mb-3">אזור חלוקה <span className="text-red-500">*</span></label>
                {(shabbatArea && !showAreaPicker) ? (
                  <div className="flex items-center justify-between bg-purple-50 p-3 rounded-xl border border-purple-100">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-500">אזור משלוח נבחר</span>
                      <span className="text-purple-700 font-bold">{areas.find(a => a.id === shabbatArea)?.name}</span>
                    </div>
                    <button type="button" onClick={() => setShowAreaPicker(true)} className="text-sm font-bold text-blue-600 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100 border-b-2 hover:bg-gray-50 active:scale-95 transition-all">שנה אזור</button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {areas.map(a => (
                        <button key={a.id} type="button" onClick={() => { setShabbatArea(a.id); setShowAreaPicker(false); }}
                          className="py-2 px-2 flex items-center gap-2 transition-all hover:bg-gray-50 rounded-lg text-sm font-bold text-gray-700 text-right border border-transparent hover:border-gray-200">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${shabbatArea === a.id ? 'border-purple-600' : 'border-gray-400'}`}>
                            {shabbatArea === a.id && <div className="w-2 h-2 bg-purple-600 rounded-full" />}
                          </div>
                          <span className={shabbatArea === a.id ? 'text-purple-700' : 'text-gray-600'}>{a.name}</span>
                        </button>
                      ))}
                    </div>
                    {areas.length === 0 && (
                      <p className="text-sm text-red-500 font-medium mt-2">לא נמצאו אזורי חלוקה. אנא הוסף בלוח הניהול.</p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Always show the Hebrew Date Picker outside the !isPastOrder block if it's a past order OR for normal custom date fallback */}
            {(!editId && !isStandingOrderMode && (isPastOrder || true)) && (
              <div className="mt-4">
                <HebrewDatePicker
                  selectedDate={deliveryWeek.includes('-') ? new Date(deliveryWeek) : undefined}
                  onSelect={(d: Date) => {
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbat'];
                    const dayName = dayNames[d.getDay()];

                    const specialMatch = specialDates.find(sd => isSameDay(new Date(sd.date), startOfDay(d)));

                    const tzOffset = d.getTimezoneOffset() * 60000;
                    const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().split('T')[0];

                    setDeliveryWeek(localISOTime);
                    setDeliveryDay(dayName);
                    setSelectedSpecialDateId(specialMatch ? specialMatch.id : null);
                  }}
                />
              </div>
            )}

            {!editId && !isStandingOrderMode && deliveryWeek.includes('-') && (
              <div className="bg-purple-50 border-2 border-purple-400 rounded-xl p-4 flex justify-between items-center mt-2 animate-in fade-in zoom-in-95">
                <div>
                  <h4 className="font-bold text-purple-900 mb-0.5">תאריך ספציפי נבחר</h4>
                  <p className="text-sm font-semibold text-purple-700">
                    {getDeliveryHebrewDate(new Date(), deliveryDay, deliveryWeek, specialDates.find(sd => sd.id === selectedSpecialDateId)?.name)}
                  </p>
                </div>
              </div>
            )}


            {(!!editId || !!templateId) && !isStandingOrderMode && (
              <div className="text-center mt-3 mb-6 relative w-full flex justify-center">
                <HebrewDatePicker
                  selectedDate={deliveryWeek.includes('-') ? new Date(deliveryWeek) : undefined}
                  customTriggerLabel={getDeliveryHebrewDate(new Date(), deliveryDay, deliveryWeek, specialDates.find(sd => sd.id === selectedSpecialDateId)?.name)}
                  onSelect={(d: Date) => {
                    const today = startOfDay(new Date());
                    const weekStart = startOfWeek(today, { weekStartsOn: 0 });
                    const diffDays = differenceInDays(startOfDay(d), weekStart);

                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbat'];
                    const dayName = dayNames[d.getDay()];

                    const specialMatch = specialDates.find(sd => isSameDay(new Date(sd.date), startOfDay(d)));

                    if (diffDays >= 0 && diffDays <= 6) {
                      setDeliveryWeek('THIS_WEEK'); setDeliveryDay(dayName); setSelectedSpecialDateId(specialMatch ? specialMatch.id : null);
                    } else if (diffDays >= 7 && diffDays <= 13) {
                      setDeliveryWeek('NEXT_WEEK'); setDeliveryDay(dayName); setSelectedSpecialDateId(specialMatch ? specialMatch.id : null);
                    } else {
                      const tzOffset = d.getTimezoneOffset() * 60000;
                      const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().split('T')[0];
                      setDeliveryWeek(localISOTime); setDeliveryDay(dayName); setSelectedSpecialDateId(specialMatch ? specialMatch.id : null);
                    }
                  }}
                />
              </div>
            )}

            {/* TOGGLES AT BOTTOM OF STEP 3 */}
            <div className={(!!editId || !!templateId || isStandingOrderMode) ? "hidden" : "flex justify-center gap-4 items-center mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100 shadow-sm"}>
              <label className="flex items-center cursor-pointer gap-2 bg-gray-100 rounded-full px-4 py-1.5 border border-gray-200">
                <span className="text-sm font-bold text-gray-700">הזמנת עבר?</span>
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={isPastOrder} onChange={e => setIsPastOrder(e.target.checked)} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${isPastOrder ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isPastOrder ? 'transform translate-x-4' : ''}`}></div>
                </div>
              </label>

              {!isPastOrder && deliveryDay !== 'Wednesday_Stores' && (
                <label className="flex items-center cursor-pointer gap-2 bg-purple-50 rounded-full px-4 py-1.5 border border-purple-200 shadow-sm hover:bg-purple-100 transition-colors">
                  <span className="text-sm font-black text-purple-700">📌 הפוך לקבועה!</span>
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${isRecurring ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isRecurring ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                </label>
              )}
            </div>

          </div>
        )}

        {/* ===== STEP 4: Products ===== */}
        {(step === 4 || !!editId) && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="flex justify-between items-center mb-6 pt-2">
              <span className="bg-blue-100 text-blue-800 text-lg font-black px-4 py-1.5 rounded-full shadow-sm">
                ₪{orderTotal.toFixed(2)}
              </span>
            </div>
            {isLoadingProducts ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                טוען מוצרים...
              </div>
            ) : (
              <div className="space-y-3">
                {(deliveryDay === 'Shabbat' || selectedSpecialDateId) ? (
                  /* Shabbat / Special Date — single unified list, full width */
                  <div className="space-y-3 mt-4">
                    {standardProducts.length > 0
                      ? standardProducts.map(p => <div key={`shabbat-${p.id}`}>{renderProductRow(p, "NEUTRAL")}</div>)
                      : <p className="text-center text-gray-400 text-sm py-4">אין מוצרים — הוסף בהגדרות</p>
                    }
                    
                    {specialProducts.length > 0 && (
                      <div className="pt-2 text-center">
                        <button 
                          onClick={() => setShowSpecials(!showSpecials)}
                          className="text-blue-600 font-bold text-sm underline px-4 py-2 hover:text-blue-800 transition-colors"
                        >
                          {showSpecials ? 'הסתר מוצרים מיוחדים' : 'מוצרים מיוחדים...'}
                        </button>
                        
                        {showSpecials && (
                          <div className="space-y-3 mt-3 animate-in fade-in slide-in-from-top-4">
                            {specialProducts.map(p => <div key={`shabbat-special-${p.id}`}>{renderProductRow(p, "NEUTRAL")}</div>)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Regular weekday — 2 Columns (HOT on Right, COLD on Left) */
                  <>
                    <div className="grid grid-cols-2 gap-3 mt-4" dir="rtl">
                    {/* Right Column: HOT */}
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col items-center justify-center bg-red-50 rounded-xl py-2 border border-red-100 mb-1 shadow-sm">
                        <span className="text-sm font-black text-red-600 tracking-widest">🔥 חם</span>
                        {hotTotal > 0 && <span className="text-[10px] font-bold text-red-400 mt-0.5">{hotTotal} נבחרו</span>}
                      </div>
                      {standardProducts.filter(p => p.category === 'HOT' || p.category === 'BOTH').length > 0
                        ? standardProducts.filter(p => p.category === 'HOT' || p.category === 'BOTH').map(p => <div key={`hot-${p.id}`}>{renderProductCardVertical(p, "HOT")}</div>)
                        : <p className="text-center text-gray-400 text-xs py-4">אין מוצרים</p>
                      }
                    </div>

                    {/* Left Column: COLD */}
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col items-center justify-center bg-blue-50 rounded-xl py-2 border border-blue-100 mb-1 shadow-sm">
                        <span className="text-sm font-black text-blue-600 tracking-widest">❄️ קר</span>
                        {coldTotal > 0 && <span className="text-[10px] font-bold text-blue-400 mt-0.5">{coldTotal} נבחרו</span>}
                      </div>
                      {standardProducts.filter(p => p.category === 'COLD' || p.category === 'BOTH' || p.category === 'OTHER').length > 0
                        ? standardProducts.filter(p => p.category === 'COLD' || p.category === 'BOTH' || p.category === 'OTHER').map(p => <div key={`cold-${p.id}`}>{renderProductCardVertical(p, "COLD")}</div>)
                        : <p className="text-center text-gray-400 text-xs py-4">אין מוצרים</p>
                      }
                    </div>
                  </div>

                  {specialProducts.length > 0 && (
                    <div className="mt-6 pt-2 text-center">
                      <button 
                        onClick={() => setShowSpecials(!showSpecials)}
                        className="text-blue-600 font-bold text-sm underline px-4 py-2 hover:text-blue-800 transition-colors"
                      >
                        {showSpecials ? 'הסתר מוצרים מיוחדים' : 'מוצרים מיוחדים...'}
                      </button>
                      
                      {showSpecials && (
                        <div className="grid grid-cols-2 gap-3 mt-4 animate-in fade-in slide-in-from-top-4" dir="rtl">
                          <div className="flex flex-col gap-3">
                            {specialProducts.filter(p => p.category === 'HOT' || p.category === 'BOTH').map(p => <div key={`hot-special-${p.id}`}>{renderProductCardVertical(p, "HOT")}</div>)}
                          </div>
                          <div className="flex flex-col gap-3">
                            {specialProducts.filter(p => p.category === 'COLD' || p.category === 'BOTH' || p.category === 'OTHER').map(p => <div key={`cold-special-${p.id}`}>{renderProductCardVertical(p, "COLD")}</div>)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  </>
                )}
              </div>
            )}
          </div>
        )}


        {/* Small subtle toggles for Edit Mode */}
        {(!!editId || !!templateId) && (
          <div className="flex justify-center gap-6 items-center mt-6 p-2 rounded-xl border-t border-gray-200/50 pt-4 opacity-70 hover:opacity-100 transition-opacity">
            <label className="flex items-center cursor-pointer gap-2">
              <div className="relative scale-75 origin-right">
                <input type="checkbox" className="sr-only" checked={isPastOrder} onChange={e => setIsPastOrder(e.target.checked)} />
                <div className={`block w-10 h-6 rounded-full transition-colors ${isPastOrder ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isPastOrder ? 'transform translate-x-4' : ''}`}></div>
              </div>
              <span className="text-xs font-semibold text-gray-600">הזמנת עבר</span>
            </label>
          </div>
        )}

        {/* ===== NAVIGATION ===== */}
        {!editId && step > 1 && (
          <div className="fixed bottom-0 left-0 w-full px-4 flex justify-between gap-4 max-w-md mx-auto right-0 pb-[calc(env(safe-area-inset-bottom)+12px)] z-50 pointer-events-none">
            <button type="button" onClick={handleBack}
              className="flex-1 h-14 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform pointer-events-auto shadow-lg">
              <ArrowRight className="w-5 h-5" /> חזור
            </button>
            {step < 4 && (
              <button type="button" onClick={handleNext}
                disabled={(step === 3 && !canProceedStep3)}
                className="flex-1 h-14 bg-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 pointer-events-auto shadow-[0_8px_20px_rgba(37,99,235,0.3)]">
                המשך <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            {step === 4 && (
              <button type="button" onClick={() => setShowConfirmModal(true)}
                className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform pointer-events-auto shadow-[0_8px_20px_rgba(22,163,74,0.3)]">
                סיכום ואישור ✅
              </button>
            )}
          </div>
        )}

        {!editId && step === 1 && (
          <div className="fixed bottom-0 left-0 w-full px-4 flex justify-between gap-4 max-w-md mx-auto right-0 pb-[calc(env(safe-area-inset-bottom)+12px)] z-50 pointer-events-none">
            <button type="button" onClick={() => {
              const c = foundCustomer || { id: 'NEW', name: nameInput, phone: phoneInput, address, saveAddress }
              // Ensure saveAddress preference is passed
              if (c.id !== 'NEW') { c.saveAddress = saveAddress }
              setCustomer(c)
              handleNext()
            }}
              disabled={!canProceedStep1}
              className="w-full h-14 bg-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 pointer-events-auto shadow-[0_8px_20px_rgba(37,99,235,0.3)]">
              המשך <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        )}

        {!!editId && (
          <div className="max-w-md mx-auto mt-8 pb-10 z-50 px-6">
            <button type="button" onClick={() => setShowConfirmModal(true)}
              disabled={!canProceedStep1 || !canProceedStep3}
              className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
              📝 בדיקת שינויים ושמירה
            </button>
          </div>
        )}

        {/* ===== CONFIRMATION MODAL ===== */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)} />

            {/* Modal */}
            <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md mx-auto max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 scrollbar-hide absolute bottom-0 sm:relative">
              <h3 className="text-xl font-black text-gray-900 mb-1 text-center">
                {isStandingOrderMode ? 'סיכום הזמנה קבועה' : 'סיכום הזמנה'}
              </h3>
              <p className="text-sm text-gray-400 text-center mb-4">
                {isStandingOrderMode ? 'האם לאשר את ההזמנה הקבועה?' : 'האם לאשר את ההזמנה?'}
              </p>

              {/* Customer info & Items layout */}
              {isStandingOrderMode ? (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {/* Right: Customer */}
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-1 flex flex-col justify-start text-right">
                    <p className="font-bold text-gray-900 text-base">{nameInput}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {city && <span className="font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded ml-1 text-xs">{city}</span>}
                      {address}
                    </p>
                    <div className="mt-2 pt-2 border-t border-gray-200/60">
                      <span className="text-purple-600 font-bold text-sm">
                        קבוע ביום {({ Sunday: 'ראשון', Monday: 'שני', Tuesday: 'שלישי', Wednesday: 'רביעי', Thursday: 'חמישי', Shabbat: 'שבת' } as Record<string, string>)[recurringDay]}
                      </span>
                    </div>
                  </div>

                  {/* Left: Items */}
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-3 max-h-40 overflow-y-auto scrollbar-hide">
                    {hotTotal > 0 && (
                      <div>
                        {Object.entries(hotQtys).filter(([, q]) => q > 0).map(([id, qty]) => {
                          const p = products.find(pr => pr.id === id)
                          return p ? (
                            <div key={id} className={`flex items-start gap-2 text-sm py-1 border-b ${(deliveryDay === 'Shabbat' || selectedSpecialDateId) ? 'border-gray-100' : 'border-red-50'}`}>
                              <span className="font-bold text-gray-700 mt-0.5">×{qty}</span>
                              <span className="text-gray-800 leading-tight">{p.name}</span>
                            </div>
                          ) : null
                        })}
                      </div>
                    )}
                    {coldTotal > 0 && (
                      <div className={hotTotal > 0 ? "mt-3" : ""}>
                        {Object.entries(coldQtys).filter(([, q]) => q > 0).map(([id, qty]) => {
                          const p = products.find(pr => pr.id === id)
                          return p ? (
                            <div key={id} className="flex items-start gap-2 text-sm py-1 border-b border-blue-50">
                              <span className="font-bold text-gray-700 mt-0.5">×{qty}</span>
                              <span className="text-gray-800 leading-tight">{p.name}</span>
                            </div>
                          ) : null
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-1">
                    <p className="font-bold text-gray-900 text-base">{nameInput}</p>
                    <p className="text-sm text-gray-500">
                      {city && <span className="font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded ml-1 text-xs">{city}</span>}
                      {address}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedSpecialDateId && (
                        <span className="block text-sm font-black text-fuchsia-600 mb-1">
                          {specialDates.find(sd => sd.id === selectedSpecialDateId)?.name}
                        </span>
                      )}
                      {({ Sunday: 'ראשון', Monday: 'שני', Tuesday: 'שלישי', Wednesday: 'רביעי', Thursday: 'חמישי', Shabbat: 'שבת' } as Record<string, string>)[deliveryDay]} | {deliveryWeek === 'THIS_WEEK' ? 'השבוע' : 'שבוע הבא'}
                      {deliveryDay === 'Shabbat' && !selectedSpecialDateId && (
                        <span className="block text-xs font-bold text-purple-600 mt-0.5">פרשת {getParasha(deliveryWeek)}</span>
                      )}
                    </p>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto mb-5">
                    {hotTotal > 0 && (
                      <div>
                        {(deliveryDay !== 'Shabbat' && !selectedSpecialDateId) && (
                          <p className="text-xs font-black text-red-500 uppercase tracking-wider mb-1">🔥 חם ({hotTotal} יח')</p>
                        )}
                        {Object.entries(hotQtys).filter(([, q]) => q > 0).map(([id, qty]) => {
                          const p = products.find(pr => pr.id === id)
                          return p ? (
                            <div key={id} className={`flex items-center gap-2 text-sm py-1 border-b ${(deliveryDay === 'Shabbat' || selectedSpecialDateId) ? 'border-gray-100' : 'border-red-50'}`}>
                              <span className="font-bold text-gray-700">×{qty}</span>
                              <span className="text-gray-800">{p.name}</span>
                            </div>
                          ) : null
                        })}
                      </div>
                    )}
                    {coldTotal > 0 && (
                      <div>
                        <p className="text-xs font-black text-blue-500 uppercase tracking-wider mb-1">❄️ קר ({coldTotal} יח')</p>
                        {Object.entries(coldQtys).filter(([, q]) => q > 0).map(([id, qty]) => {
                          const p = products.find(pr => pr.id === id)
                          return p ? (
                            <div key={id} className="flex items-center gap-2 text-sm py-1 border-b border-blue-50">
                              <span className="font-bold text-gray-700">×{qty}</span>
                              <span className="text-gray-800">{p.name}</span>
                            </div>
                          ) : null
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Editable Notes inside Modal */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 mb-1">הערות להזמנה <span className="font-normal">(לא חובה)</span></label>
                <textarea
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none resize-none text-gray-800 text-sm transition-colors"
                  rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="אם יש בקשות מיוחדות, כתוב כאן..."
                />
              </div>
              {/* Total & Payment */}
              {isStandingOrderMode ? (
                <div className="flex items-center justify-between mb-6 bg-blue-50/50 rounded-xl px-4 py-3 border border-blue-100/50">
                  <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
                    <span className="text-[10px] font-bold text-gray-500">דמי משלוח:</span>
                    <input
                      type="number"
                      value={deliveryFee}
                      onChange={e => setDeliveryFee(e.target.value)}
                      placeholder="0"
                      className="w-12 px-1 text-center bg-white border-b border-gray-200 rounded-none text-sm font-bold text-gray-800 outline-none focus:border-purple-400"
                    />
                  </div>
                  <div className="text-left font-black text-2xl text-blue-700">
                    ₪{orderTotal.toFixed(2)}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex justify-between items-center font-black text-lg bg-blue-50 rounded-xl px-4 py-3 border border-blue-100/50">
                      <span className="text-gray-700">סה"כ להזמנה זו</span>
                      <div className="flex flex-col items-end">
                        <span className="text-blue-700 leading-none mb-1">₪{orderTotal.toFixed(2)}</span>
                        {(customer && (customer.debt || 0) > 0) && (
                          <span className="text-xs text-red-600 font-bold leading-none">חוב: ₪{customer.debt?.toFixed(0)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-red-50/50 rounded-xl px-4 py-2.5 border border-red-100 flex flex-col justify-center items-start shadow-sm">
                      <p className="font-bold text-xs text-red-900 flex items-center gap-2 mb-1">דמי משלוח 🛵</p>
                      <div className="relative w-full">
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-bold text-red-400 text-sm">₪</span>
                        <input
                          type="number"
                          value={deliveryFee}
                          onChange={e => setDeliveryFee(e.target.value)}
                          placeholder="0"
                          className="w-full pl-2 pr-7 py-1 bg-white border border-red-200 rounded text-left text-base font-black text-red-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                        />
                      </div>
                    </div>
                    <div className="bg-emerald-50/50 rounded-xl px-4 py-2.5 border border-emerald-100 flex flex-col justify-center items-start shadow-sm">
                      <p className="font-bold text-xs text-emerald-900 flex items-center gap-2 mb-1">תשלום מראש 💰</p>
                      <div className="relative w-full">
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-bold text-emerald-400 text-sm">₪</span>
                        <input
                          type="number"
                          value={paidAmount}
                          onChange={e => setPaidAmount(e.target.value)}
                          placeholder="0"
                          className="w-full pl-2 pr-7 py-1 bg-white border border-emerald-200 rounded text-left text-base font-black text-emerald-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setShowConfirmModal(false)}
                  className="h-14 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-colors active:scale-95">
                  ביטול
                </button>
                {templateId && (
                  <button type="button" onClick={() => handleDeleteTemplate()} disabled={isSubmitting}
                    className="col-span-2 h-14 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-2xl transition-colors active:scale-95 mb-2 order-last mt-2">
                    🗑️ מחיקה וביטול לתמיד
                  </button>
                )}
                <button type="button" onClick={() => handleSubmit()} disabled={isSubmitting}
                  className="h-14 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl transition-colors active:scale-95 disabled:opacity-60">
                  {isSubmitting ? 'שומר...' : 'אישור ✅'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== EDIT DATE MODAL ===== */}
        {showEditCalendar && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditCalendar(false)}></div>
            <div className="relative bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95">
              <h3 className="font-bold text-center mb-4 text-purple-900 border-b pb-3">בחירת תאריך משלוח</h3>
              <div className="bg-blue-50/50 p-2 rounded-xl mb-4 text-center">
                <p className="text-xs font-bold text-blue-900 mb-2">לחץ על תאריך חדש בלוח השנה</p>
                <HebrewDatePicker
                  selectedDate={deliveryWeek.includes('-') ? new Date(deliveryWeek) : undefined}
                  onSelect={(d: Date) => {
                    const today = startOfDay(new Date());
                    const weekStart = startOfWeek(today, { weekStartsOn: 0 });
                    const diffDays = differenceInDays(startOfDay(d), weekStart);

                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbat'];
                    const dayName = dayNames[d.getDay()];

                    // Special Date Map Check
                    const specialMatch = specialDates.find(sd => isSameDay(new Date(sd.date), startOfDay(d)));

                    if (diffDays >= 0 && diffDays <= 6) {
                      setDeliveryWeek('THIS_WEEK');
                      setDeliveryDay(dayName);
                      setSelectedSpecialDateId(specialMatch ? specialMatch.id : null);
                    } else if (diffDays >= 7 && diffDays <= 13) {
                      setDeliveryWeek('NEXT_WEEK');
                      setDeliveryDay(dayName);
                      setSelectedSpecialDateId(specialMatch ? specialMatch.id : null);
                    } else {
                      const tzOffset = d.getTimezoneOffset() * 60000;
                      const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().split('T')[0];
                      setDeliveryWeek(localISOTime);
                      setDeliveryDay(dayName);
                      setSelectedSpecialDateId(specialMatch ? specialMatch.id : null);
                    }
                    setShowEditCalendar(false);
                  }}
                />
              </div>
              <button
                onClick={() => setShowEditCalendar(false)}
                className="mt-2 w-full h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
              >
                חזור בלי לשנות
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
