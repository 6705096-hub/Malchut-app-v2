import { useState } from 'react';

interface ProductionItemProps {
  item: {
    id: string;
    product: { name: string };
    quantity: number;
    type: string;
  };
  onUpdate: (id: string, newQty: number) => void;
}

export default function ProductionItem({ item, onUpdate }: ProductionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempQty, setTempQty] = useState(item.quantity);

  const handleSave = async () => {
    // optimistic UI update
    onUpdate(item.id, tempQty);
    setIsEditing(false);
    try {
      await fetch(`/api/production/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: tempQty }),
      });
    } catch (e) {
      console.error('Failed to update quantity', e);
    }
  };

  return (
    <div className="flex justify-between items-center px-5 py-4 hover:bg-gray-50 transition-colors">
      <span className="font-bold text-gray-800">{item.product.name}</span>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            className="w-20 p-1 border rounded"
            value={tempQty}
            onChange={(e) => setTempQty(parseInt(e.target.value) || 0)}
          />
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded"
            onClick={handleSave}
          >
            שמור
          </button>
          <button
            className="px-3 py-1 bg-gray-300 text-gray-800 rounded"
            onClick={() => { setIsEditing(false); setTempQty(item.quantity); }}
          >
            ביטול
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className={`font-black ${item.type === 'HOT' ? 'text-red-600' : 'text-blue-600'} text-xl`}>{item.quantity}</span>
          <button
            className="text-sm text-gray-500 hover:text-gray-800"
            onClick={() => setIsEditing(true)}
          >
            ערוך
          </button>
        </div>
      )}
    </div>
  );
}
