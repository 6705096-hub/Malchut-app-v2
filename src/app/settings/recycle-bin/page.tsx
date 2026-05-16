'use client';

import { useState, useEffect } from 'react';
import { Trash2, RefreshCw, AlertTriangle, RotateCcw } from 'lucide-react';
import { BackButton } from '@/components/BackButton';
import { getDeliveryHebrewDate } from '@/lib/hebrewDate';

type DeletedCustomer = {
  id: string;
  name: string;
  phone: string;
  address?: string | null;
  city?: string | null;
  debt: number;
  deletedAt: string;
};

type DeletedOrder = {
  id: string;
  createdAt: string;
  deletedAt: string;
  deliveryDay: string;
  deliveryWeek: string;
  totalPrice: number;
  customer: { name: string } | null;
  items: { quantity: number, price: number, product: { name: string } | null }[];
};

type DeletedProduct = {
  id: string;
  name: string;
  deletedAt: string;
  category: string;
  price: number;
  inStock: number;
};

export default function RecycleBinPage() {
  const [customers, setCustomers] = useState<DeletedCustomer[]>([]);
  const [orders, setOrders] = useState<DeletedOrder[]>([]);
  const [products, setProducts] = useState<DeletedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmPurge, setConfirmPurge] = useState<{ type: string; id: string; label: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedId(prev => prev === id ? null : id);
  };

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch('/api/recycle-bin');
    if (res.ok) {
      const data = await res.json();
      setCustomers(data.customers || []);
      setOrders(data.orders || []);
      setProducts(data.products || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const restore = async (type: string, id: string) => {
    await fetch('/api/recycle-bin/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id }),
    });
    fetchData();
  };

  const purge = async (type: string, id: string) => {
    await fetch('/api/recycle-bin/purge', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id }),
    });
    setConfirmPurge(null);
    fetchData();
  };

  const emptyAll = async () => {
    await fetch('/api/recycle-bin/empty', {
      method: 'DELETE',
    });
    setConfirmPurge(null);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }


  const totalItems = customers.length + orders.length + products.length;

  return (
    <div className="max-w-4xl mx-auto p-6" dir="rtl">
      <div className="flex justify-between items-start sm:items-center mb-6 mt-[-10px] w-full flex-col sm:flex-row gap-4 sm:gap-0">
        <div className="flex flex-col pr-2 pt-2">
            <h1 className="text-2xl font-black text-gray-900">סל מיחזור</h1>
            <p className="text-gray-500 text-sm">{totalItems} פריטים מחוקים – ניתן לשחזר</p>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {totalItems > 0 && (
            <button 
              onClick={() => setConfirmPurge({ type: 'all', id: 'all', label: 'כל תוכן סל המיחזור' })}
              className="flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 w-10 h-10 rounded-xl transition shadow-sm"
              title="ריקון הכל לצמיתות"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <BackButton />
        </div>
      </div>

      {totalItems === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Trash2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">סל המיחזור ריק</p>
        </div>
      ) : (
        <>
          {customers.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">לקוחות מחוקים ({customers.length})</h2>
              <div className="space-y-2">
                {customers.map(c => (
                  <div key={c.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:border-gray-300 transition-colors">
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer" onClick={() => toggleExpand(c.id)}>
                      <div>
                        <p className="font-bold text-gray-900">{c.name}</p>
                        <p className="text-sm text-gray-500">{c.phone} · נמחק {new Date(c.deletedAt).toLocaleDateString('he-IL')}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); restore('customer', c.id); }}
                          className="flex items-center gap-1.5 bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" /> שחזר
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmPurge({ type: 'customer', id: c.id, label: c.name }); }}
                          className="flex items-center gap-1.5 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                        >
                          <Trash2 className="w-4 h-4" /> השמד
                        </button>
                      </div>
                    </div>
                    {expandedId === c.id && (
                      <div className="bg-gray-50 p-4 border-t border-gray-100 text-sm flex flex-col gap-1.5 shadow-inner">
                        <p><span className="font-semibold text-gray-600">עיר וכתובת:</span> {c.city || c.address ? `${c.city || 'עיר לא מוזנת'} - ${c.address || 'כתובת לא מוזנת'}` : 'לא צוינה כתובת'}</p>
                        <p><span className="font-semibold text-gray-600">טלפון נוסף / היסטוריה עסקית:</span> רשומות הזמנות שמורות עבור לקוח זה.</p>
                        <p><span className="font-semibold text-gray-600">חוב פתוח בזמן מחיקה:</span> ₪{c.debt.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {orders.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-700 mb-3">הזמנות מחוקות ({orders.length})</h2>
              <div className="space-y-2">
                {orders.map(o => (
                  <div key={o.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:border-gray-300 transition-colors">
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer" onClick={() => toggleExpand(o.id)}>
                      <div>
                        <p className="font-bold text-gray-900">{o.customer?.name || 'לקוח לא ידוע'} – {getDeliveryHebrewDate(o.createdAt, o.deliveryDay, o.deliveryWeek)}</p>
                        <p className="text-sm text-gray-500">{o.items.map(i => i.product?.name).filter(Boolean).join(', ')} · נמחק {new Date(o.deletedAt).toLocaleDateString('he-IL')}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); restore('order', o.id); }}
                          className="flex items-center gap-1.5 bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" /> שחזר
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmPurge({ type: 'order', id: o.id, label: `הזמנה של ${o.customer?.name}` }); }}
                          className="flex items-center gap-1.5 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                        >
                          <Trash2 className="w-4 h-4" /> השמד
                        </button>
                      </div>
                    </div>
                    {expandedId === o.id && (
                      <div className="bg-gray-50 p-4 border-t border-gray-100 shadow-inner">
                        <p className="text-sm font-bold text-gray-800 mb-2">תכולת ההזמנה (₪{o.totalPrice})</p>
                        <ul className="text-sm text-gray-600 flex flex-col gap-1 list-disc list-inside">
                           {o.items.map((it, idx) => (
                             <li key={idx}>
                                {it.product?.name || 'מוצר מחוק'} (x{it.quantity}) - ₪{it.price} יח'
                             </li>
                           ))}
                        </ul>
                        <div className="mt-3 text-xs text-gray-500 font-mono">
                           מועד חלוקה/אירוע: {getDeliveryHebrewDate(o.createdAt, o.deliveryDay, o.deliveryWeek)} | ID: {o.id.split('-')[0]}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {products.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">מוצרים מחוקים ({products.length})</h2>
              <div className="space-y-2">
                {products.map(p => (
                  <div key={p.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:border-gray-300 transition-colors">
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer" onClick={() => toggleExpand(p.id)}>
                      <div>
                        <p className="font-bold text-gray-900">{p.name}</p>
                        <p className="text-sm text-gray-500">{p.category} · נמחק {new Date(p.deletedAt).toLocaleDateString('he-IL')}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); restore('product', p.id); }}
                          className="flex items-center gap-1.5 bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" /> שחזר
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmPurge({ type: 'product', id: p.id, label: p.name }); }}
                          className="flex items-center gap-1.5 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                        >
                          <Trash2 className="w-4 h-4" /> השמד
                        </button>
                      </div>
                    </div>
                    {expandedId === p.id && (
                      <div className="bg-gray-50 p-4 border-t border-gray-100 text-sm shadow-inner flex flex-col gap-1.5">
                        <p><span className="font-semibold text-gray-600">קטגוריה:</span> {p.category}</p>
                        <p><span className="font-semibold text-gray-600">מחיר מחירון:</span> ₪{p.price}</p>
                        <p><span className="font-semibold text-gray-600">מלאי קיים בזמן מחיקה:</span> {p.inStock} יחידות</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Purge Confirmation Modal */}
      {confirmPurge && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setConfirmPurge(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
              <div>
                <h3 className="font-bold text-gray-900">מחיקה לצמיתות</h3>
                <p className="text-sm text-gray-500">
                  {confirmPurge.type === 'all' 
                    ? 'האם אתה בטוח שברצונך למחוק הכל? הפעולה לא ניתנת לשחזור.'
                    : `"${confirmPurge.label}" יימחק לצמיתות ולא ניתן יהיה לשחזר.`}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmPurge(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={() => confirmPurge.type === 'all' ? emptyAll() : purge(confirmPurge.type, confirmPurge.id)}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                {confirmPurge.type === 'all' ? 'אישור מחיקה' : 'מחק לצמיתות'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
