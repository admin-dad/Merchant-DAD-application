import jsPDF from 'jspdf'

export interface RewardsInvoiceOrder {
  id: string
  created_at: string
  status: string
  total_amount: number | string
  shipping_address?: string
  coupon_code?: string | null
  discount_amount?: number | string | null
  order_items: { name: string; quantity: number; price: number | string }[]
}

/** Build a points redemption invoice with wrapped text and repeating page headers. */
export function buildRewardsInvoice(order: RewardsInvoiceOrder, logo?: Uint8Array) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const blue = [11, 46, 122] as const
  const slate = [71, 85, 105] as const
  const points = (value: number | string) => Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })
  const ref = order.id.substring(0, 8).toUpperCase()
  const discount = Number(order.discount_amount) || 0
  const subtotal = order.order_items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  let y = 0

  const label = (text: string, x: number, top: number) => {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(...slate)
    pdf.text(text, x, top)
  }
  const nextPage = () => {
    pdf.addPage()
    pdf.setFillColor(...blue)
    pdf.rect(0, 0, 210, 3, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(...blue)
    pdf.text('DAD / REWARDS INVOICE', 16, 18)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(...slate)
    pdf.text(`INV-${ref} / Continued`, 194, 18, { align: 'right' })
    y = 30
  }
  const tableHeader = () => {
    pdf.setFillColor(...blue)
    pdf.roundedRect(16, y, 178, 11, 2, 2, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(255, 255, 255)
    pdf.text('#', 20, y + 7)
    pdf.text('ITEM DESCRIPTION', 32, y + 7)
    pdf.text('QTY', 121, y + 7, { align: 'right' })
    pdf.text('UNIT PTS', 154, y + 7, { align: 'right' })
    pdf.text('TOTAL PTS', 189, y + 7, { align: 'right' })
    y += 13
  }

  // Brand header.
  pdf.setFillColor(...blue)
  pdf.rect(0, 0, 210, 53, 'F')
  pdf.setFillColor(123, 193, 66)
  pdf.rect(0, 0, 210, 3, 'F')
  pdf.setFillColor(255, 255, 255)
  pdf.roundedRect(16, 12, 49, 29, 3, 3, 'F')
  if (logo) {
    const image = pdf.getImageProperties(logo)
    const scale = Math.min(41 / image.width, 23 / image.height)
    const w = image.width * scale
    const h = image.height * scale
    pdf.addImage(logo, 'PNG', 16 + (49 - w) / 2, 12 + (29 - h) / 2, w, h)
  } else {
    pdf.setTextColor(...blue)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(25)
    pdf.text('DAD', 40.5, 31, { align: 'center' })
  }
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(23)
  pdf.text('REWARDS INVOICE', 194, 24, { align: 'right' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(213, 226, 251)
  pdf.text('Merchant rewards / Points redemption', 194, 34, { align: 'right' })

  label('INVOICE NUMBER', 16, 65)
  label('ORDER DATE', 81, 65)
  label('ORDER STATUS', 153, 65)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(...blue)
  pdf.text(`INV-${ref}`, 16, 73)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text(new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }), 81, 73)
  const status = order.status.trim().toLowerCase()
  const success = ['completed', 'delivered'].includes(status)
  const statusBackground = success ? [234, 247, 237] : status === 'cancelled' ? [255, 237, 237] : [255, 247, 227]
  pdf.setFillColor(statusBackground[0], statusBackground[1], statusBackground[2])
  pdf.roundedRect(151, 68, 43, 9, 2, 2, 'F')
  pdf.setTextColor(success ? 32 : slate[0], success ? 112 : slate[1], success ? 56 : slate[2])
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.text(status.toUpperCase(), 172.5, 74, { align: 'center' })
  pdf.setTextColor(...slate)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.text(`Order reference: ${order.id}`, 16, 86)

  // Delivery information wraps within the page, even for unusually long addresses.
  label('DELIVERY DETAILS', 16, 98)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  const address: string[] = pdf.splitTextToSize(order.shipping_address || 'Shipping details were not provided.', 166)
  y = 103
  while (address.length) {
    const count = Math.min(address.length, Math.floor((255 - y - 10) / 5))
    if (count < 1) { nextPage(); continue }
    const lines = address.splice(0, count)
    pdf.setFillColor(246, 248, 252)
    pdf.roundedRect(16, y, 178, lines.length * 5 + 10, 2, 2, 'F')
    pdf.setTextColor(...slate)
    pdf.text(lines, 22, y + 8, { lineHeightFactor: 1.4 })
    y += lines.length * 5 + 18
  }
  if (y > 235) nextPage()
  tableHeader()
  order.order_items.forEach((item, index) => {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    const lines: string[] = pdf.splitTextToSize(item.name, 76)
    let first = true
    do {
      const count = Math.floor((258 - y - 8) / 4.5)
      if (count < 1) { nextPage(); tableHeader(); continue }
      const chunk = lines.splice(0, count)
      const height = Math.max(15, chunk.length * 4.5 + 7)
      pdf.setFillColor(index % 2 ? 255 : 248, index % 2 ? 255 : 250, index % 2 ? 255 : 253)
      pdf.rect(16, y, 178, height, 'F')
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(...slate)
      pdf.text(chunk, 32, y + 7, { lineHeightFactor: 1.4 })
      if (first) {
        pdf.text(String(index + 1).padStart(2, '0'), 20, y + 7)
        pdf.text(String(item.quantity), 121, y + 7, { align: 'right' })
        pdf.text(points(item.price), 154, y + 7, { align: 'right' })
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(...blue)
        pdf.text(points(Number(item.price) * item.quantity), 189, y + 7, { align: 'right' })
      }
      pdf.setDrawColor(229, 235, 244)
      pdf.line(16, y + height, 194, y + height)
      y += height
      first = false
    } while (lines.length)
  })

  if (y + 66 > 270) nextPage()
  y += 10
  // Supporting note and a distinct totals panel.
  label('YOUR REWARDS, REDEEMED', 16, y + 6)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(...slate)
  const note = status === 'cancelled'
    ? 'This order was cancelled. This document records the original order. Refer to your wallet transactions for refund details.'
    : 'Thank you for shopping with DAD. This document records your rewards redemption in points.'
  pdf.text(pdf.splitTextToSize(note, 84), 16, y + 14, { lineHeightFactor: 1.5 })
  if (order.coupon_code && discount > 0) {
    pdf.setFontSize(8)
    pdf.text(pdf.splitTextToSize(`Coupon applied: ${order.coupon_code}`, 84), 16, y + 43)
  }
  pdf.setFillColor(246, 248, 252)
  pdf.roundedRect(112, y, 82, 49, 3, 3, 'F')
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(...slate)
  pdf.text('Items subtotal', 118, y + 10)
  pdf.text(`${points(subtotal)} Pts`, 188, y + 10, { align: 'right' })
  pdf.text('Discount', 118, y + 20)
  pdf.text(`${discount > 0 ? '-' : ''}${points(discount)} Pts`, 188, y + 20, { align: 'right' })
  pdf.setDrawColor(215, 224, 237)
  pdf.line(118, y + 26, 188, y + 26)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(...blue)
  pdf.text('ORDER TOTAL', 118, y + 37)
  pdf.setFontSize(12)
  pdf.text(`${points(order.total_amount)} Pts`, 188, y + 37, { align: 'right' })

  // Page furniture is added last so every page has the correct total count.
  const pages = pdf.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page)
    pdf.setDrawColor(229, 235, 244)
    pdf.line(16, 277, 194, 277)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(...slate)
    pdf.text('DAD Merchant Rewards / Points redemption record', 16, 284)
    pdf.text(`${page} / ${pages}`, 194, 284, { align: 'right' })
    pdf.setFontSize(7)
    pdf.text('Keep this invoice and your order reference for support.', 16, 290)
  }
  pdf.setProperties({ title: `DAD Rewards Invoice INV-${ref}`, subject: 'Merchant points redemption', author: 'DAD Merchant Rewards' })
  return pdf
}
