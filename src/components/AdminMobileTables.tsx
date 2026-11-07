'use client'

import { useEffect } from 'react'

/** Keep mobile card labels in sync with table headers, including async rows. */
export default function AdminMobileTables() {
  useEffect(() => {
    const root = document.querySelector('.admin-responsive')
    if (!root) return
    const labelTables = () => {
      root.querySelectorAll('table').forEach(table => {
        const headers = Array.from(table.querySelectorAll('thead tr:last-child th')).map(header => header.textContent?.trim() || '')
        if (!headers.length) return
        table.classList.add('admin-mobile-table')
        table.querySelectorAll('tbody tr').forEach(row => {
          Array.from(row.children).forEach((cell, index) => {
            if (cell.tagName !== 'TD') return
            const spanning = Number(cell.getAttribute('colspan') || 1) > 1
            cell.setAttribute('data-label', spanning ? '' : headers[index] || '')
          })
        })
      })
    }
    labelTables()
    const observer = new MutationObserver(labelTables)
    observer.observe(root, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [])
  return null
}
