'use client'

import { initiateCustomerCall } from '@/lib/callCustomer'

interface ClickToCallLinkProps {
  phone: string;
  className?: string;
}

export function ClickToCallLink({ phone, className }: ClickToCallLinkProps) {
  return (
    <button 
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        initiateCustomerCall(phone);
      }}
      className={className}
      dir="ltr"
      title="חייג ללקוח דרך ימות המשיח"
    >
      {phone}
    </button>
  )
}
