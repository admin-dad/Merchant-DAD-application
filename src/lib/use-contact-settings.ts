'use client'
import { useEffect, useState } from 'react'
export function useContactSettings() {
  const [contact, setContact] = useState({ support_email: '', support_phone: '' })
  useEffect(() => {
    let active = true
    const load = async () => {
      try { const response = await fetch('/api/public/contact-settings', { cache: 'no-store' }); if (!response.ok) return; const data = await response.json(); if (active) setContact(data) } catch {}
    }
    void load()
    window.addEventListener('focus', load)
    return () => { active = false; window.removeEventListener('focus', load) }
  }, [])
  return contact
}
