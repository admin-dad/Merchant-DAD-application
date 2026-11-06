'use client'
import { useEffect, useState } from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/client'
import { PRODUCT_AUDIENCES } from '@/lib/product-audiences'
export function useProductAudiences(admin = false) {
  const [audiences, setAudiences] = useState<Array<{value:string;label:string}>>([...PRODUCT_AUDIENCES])
  useEffect(() => { let active = true; const client = admin ? createAdminClient() : createClient();
    const load = async () => { const {data,error} = await client.from('product_audiences').select('value,label').order('sort_order').order('label'); if(active && !error && data) setAudiences(data) }
    void load(); window.addEventListener('focus',load)
    return () => {active=false;window.removeEventListener('focus',load)}
  }, [admin])
  return { audiences, audienceLabel: (value?:string|null) => audiences.find(a=>a.value===value)?.label ?? value ?? 'Other' }
}
