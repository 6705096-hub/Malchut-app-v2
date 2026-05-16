export async function initiateCustomerCall(customerPhone: string) {
  if (!window.confirm('האם אתה בטוח שברצונך לחייג ללקוח עכשיו?')) {
    return;
  }
  
  const res = await fetch('/api/call-customer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: customerPhone })
  });
  
  const data = await res.json();
  
  if (!res.ok) {
    if (data.error === 'MISSING_USER_PHONE') {
      alert('כדי להוציא שיחות, עליך להגדיר מספר טלפון. לחץ על השם שלך בתפריט הצד והזן מספר טלפון אישי.');
    } else {
      alert('שגיאה: ' + (data.error || 'לא ניתן היה להוציא שיחה'));
    }
    return;
  }
  
  if (data.success) {
    alert(data.message); // Alert works on most mobile, but confirm/prompt might be blocked if called outside of direct user action.
  }
}
