'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  FileBarChart, Store, Users, Truck, Wallet, QrCode, Download, FileText,
  Loader2, AlertCircle, Calendar, TrendingUp, CreditCard, Share2, Ticket,
  Trophy, Gift, Receipt, Coins, ShoppingCart, PackageCheck, Filter, Search
} from 'lucide-react'
import jsPDF from 'jspdf'
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
interface MerchantRow { id: string; business_name: string; category: string; status: string; created_at: string; }
interface TransactionRow { id: string; wallet_type: 'points' | 'cash'; transaction_type: 'credit' | 'debit'; amount: number; description: string | null; created_at: string; merchant_id: string; }
interface ScanRow { id: string; customer_phone: string | null; status: string; prize_won: string | null; fulfillment_status: string; created_at: string; merchant_id: string; }
interface PaymentRow { id: string; amount: number; status: string; payment_method: string; utr_number: string | null; created_at: string; merchant_id: string; }
interface ReferralRow { id: string; referred_business_name: string; status: string; created_at: string; referrer_id: string; }
interface VendorRow { id: string; store_name: string; owner_name: string; status: string; created_at: string; }
interface OrderRow { id: string; status: string; created_at: string; }
interface CampaignRow { id: string; name: string; status: string; winning_probability: number; created_at: string; }

const COLORS = {
  blue: '#1857D6', green: '#3E7A1C', lightGreen: '#7BC142', amber: '#D97706',
  rose: '#E11D48', purple: '#9333EA', slate: '#64748B',
}
const PIE_COLORS = [COLORS.lightGreen, COLORS.amber, COLORS.rose, COLORS.blue, COLORS.purple]

// ─────────────────────────────────────────────────────────────────────────
// Export Helpers
// ─────────────────────────────────────────────────────────────────────────
function toCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (val: string | number) => { const s = String(val ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const lines = [headers.map(escape).join(',')]
  rows.forEach((row) => lines.push(row.map(escape).join(',')))
  return lines.join('\n')
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function downloadTablePDF(title: string, subtitle: string, headers: string[], rows: (string | number)[][], filename: string, colWidths: number[]) {
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.width
  const pageHeight = pdf.internal.pageSize.height
  const marginX = 14
  const startY = 40
  const rowHeight = 8
  let y = startY

  const drawHeader = () => {
    pdf.setFontSize(18); pdf.setTextColor(11, 15, 25); pdf.text(title, marginX, 20)
    pdf.setFontSize(10); pdf.setTextColor(100, 116, 139); pdf.text(subtitle, marginX, 27)
    pdf.setDrawColor(226, 232, 240); pdf.line(marginX, 32, pageWidth - marginX, 32)
  }

  const drawTableHeaderRow = (yPos: number) => {
    pdf.setFillColor(241, 245, 249)
    pdf.rect(marginX, yPos - 5.5, pageWidth - marginX * 2, rowHeight, 'F')
    pdf.setFontSize(9); pdf.setTextColor(51, 65, 85)
    let x = marginX + 2
    headers.forEach((h, i) => { pdf.text(h, x, yPos); x += colWidths[i] })
    return yPos + rowHeight
  }

  drawHeader()
  y = drawTableHeaderRow(y)
  pdf.setFontSize(9); pdf.setTextColor(30, 41, 59)

  rows.forEach((row) => {
    if (y > pageHeight - 20) {
      pdf.addPage(); y = startY; y = drawTableHeaderRow(y)
      pdf.setFontSize(9); pdf.setTextColor(30, 41, 59)
    }
    let x = marginX + 2
    row.forEach((cell, i) => {
      const text = String(cell ?? '')
      const truncated = text.length > 40 ? text.slice(0, 37) + '...' : text
      pdf.text(truncated, x, y); x += colWidths[i]
    })
    y += rowHeight
  })

  if (rows.length === 0) {
    pdf.setFontSize(10); pdf.setTextColor(148, 163, 184)
    pdf.text('No records found for this report based on current filters.', marginX, y + 2)
  }
  pdf.save(filename)
}

function monthKey(iso: string) {
  const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}`
}
function lastNMonthLabels(n: number) {
  const out: { key: string; label: string }[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-IN', { month: 'short' }) })
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────
export default function AdminReportsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Raw Data
  const [merchants, setMerchants] = useState<MerchantRow[]>([])
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [scans, setScans] = useState<ScanRow[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [referrals, setReferrals] = useState<ReferralRow[]>([])
  const [vendors, setVendors] = useState<VendorRow[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  
  // Mappings
  const [merchantMap, setMerchantMap] = useState<Record<string, string>>({})
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([])

  // Filters State
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [merchantFilter, setMerchantFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/admin/login'); return }

      const [merchantsRes, txRes, scansRes, payRes, refRes, vendRes, ordRes, campRes] = await Promise.all([
        supabase.from('merchants').select('id, business_name, category, status, created_at').order('created_at', { ascending: false }),
        supabase.from('merchant_transactions').select('id, wallet_type, transaction_type, amount, description, created_at, merchant_id').order('created_at', { ascending: false }),
        supabase.from('qr_scans').select('id, customer_phone, status, prize_won, fulfillment_status, created_at, merchant_id').order('created_at', { ascending: false }),
        supabase.from('merchant_payments').select('id, amount, status, payment_method, utr_number, created_at, merchant_id').order('created_at', { ascending: false }),
        supabase.from('merchant_referrals').select('id, referred_business_name, status, created_at, referrer_id').order('created_at', { ascending: false }),
        supabase.from('vendors').select('id, store_name, owner_name, status, created_at').order('created_at', { ascending: false }),
        supabase.from('orders').select('id, status, created_at').order('created_at', { ascending: false }),
        supabase.from('campaigns').select('id, name, status, winning_probability, created_at').order('created_at', { ascending: false })
      ])

      const merchData = merchantsRes.data as MerchantRow[] || []
      setMerchants(merchData)
      
      const map: Record<string, string> = {}
      const categories = new Set<string>()
      merchData.forEach(m => { 
        map[m.id] = m.business_name
        if (m.category) categories.add(m.category)
      })
      setMerchantMap(map)
      setUniqueCategories(Array.from(categories).sort())

      if (txRes.data) setTransactions(txRes.data as TransactionRow[])
      if (scansRes.data) setScans(scansRes.data as ScanRow[])
      if (payRes.data) setPayments(payRes.data as PaymentRow[])
      if (refRes.data) setReferrals(refRes.data as ReferralRow[])
      if (vendRes.data) setVendors(vendRes.data as VendorRow[])
      if (ordRes.data) setOrders(ordRes.data as OrderRow[])
      if (campRes.data) setCampaigns(campRes.data as CampaignRow[])

      setLoading(false)
    }

    fetchAll()
  }, [router, supabase])

  // ── Filter Logic ─────────────────────────────────────────────────────
  const isWithinDate = (dateStr: string) => {
    if (dateFilter === 'all') return true
    const d = new Date(dateStr)
    const diffDays = (new Date().getTime() - d.getTime()) / (1000 * 3600 * 24)
    if (dateFilter === 'today') return diffDays <= 1
    if (dateFilter === '7d') return diffDays <= 7
    if (dateFilter === '30d') return diffDays <= 30
    if (dateFilter === '6m') return diffDays <= 180
    if (dateFilter === '1y') return diffDays <= 365
    return true
  }

  // Filtered Datasets
  const fMerchants = useMemo(() => merchants.filter(m => 
    isWithinDate(m.created_at) && 
    (merchantFilter === 'all' || m.id === merchantFilter) &&
    (categoryFilter === 'all' || m.category === categoryFilter)
  ), [merchants, dateFilter, merchantFilter, categoryFilter])

  const validMerchantIds = useMemo(() => new Set(fMerchants.map(m => m.id)), [fMerchants])

  const fScans = useMemo(() => scans.filter(s => 
    isWithinDate(s.created_at) && 
    (merchantFilter === 'all' ? validMerchantIds.has(s.merchant_id) : s.merchant_id === merchantFilter)
  ), [scans, dateFilter, merchantFilter, validMerchantIds])

  const fTransactions = useMemo(() => transactions.filter(t => 
    isWithinDate(t.created_at) && 
    (merchantFilter === 'all' ? validMerchantIds.has(t.merchant_id) : t.merchant_id === merchantFilter)
  ), [transactions, dateFilter, merchantFilter, validMerchantIds])

  const fPayments = useMemo(() => payments.filter(p => 
    isWithinDate(p.created_at) && 
    (merchantFilter === 'all' ? validMerchantIds.has(p.merchant_id) : p.merchant_id === merchantFilter)
  ), [payments, dateFilter, merchantFilter, validMerchantIds])

  const fReferrals = useMemo(() => referrals.filter(r => 
    isWithinDate(r.created_at) && 
    (merchantFilter === 'all' ? validMerchantIds.has(r.referrer_id) : r.referrer_id === merchantFilter)
  ), [referrals, dateFilter, merchantFilter, validMerchantIds])

  const fVendors = useMemo(() => vendors.filter(v => isWithinDate(v.created_at)), [vendors, dateFilter])
  const fOrders = useMemo(() => orders.filter(o => isWithinDate(o.created_at)), [orders, dateFilter])
  const fCampaigns = useMemo(() => campaigns.filter(c => isWithinDate(c.created_at)), [campaigns, dateFilter])


  // ── Chart data ───────────────────────────────────────────────────────
  const merchantGrowthData = useMemo(() => {
    const months = lastNMonthLabels(6)
    const counts: Record<string, number> = {}
    fMerchants.forEach((m) => { const k = monthKey(m.created_at); counts[k] = (counts[k] || 0) + 1 })
    let running = 0
    return months.map((m) => { running += counts[m.key] || 0; return { month: m.label, New: counts[m.key] || 0, Cumulative: running } })
  }, [fMerchants])

  const pointsChartData = useMemo(() => {
    const months = lastNMonthLabels(6)
    const earned: Record<string, number> = {}
    const spent: Record<string, number> = {}
    fTransactions.filter((t) => t.wallet_type === 'points').forEach((t) => {
      const k = monthKey(t.created_at)
      if (t.transaction_type === 'credit') earned[k] = (earned[k] || 0) + t.amount
      else spent[k] = (spent[k] || 0) + t.amount
    })
    return months.map((m) => ({ month: m.label, Earned: earned[m.key] || 0, Spent: spent[m.key] || 0 }))
  }, [fTransactions])

  const scanTrendData = useMemo(() => {
    const months = lastNMonthLabels(6)
    const counts: Record<string, number> = {}
    fScans.forEach((s) => { const k = monthKey(s.created_at); counts[k] = (counts[k] || 0) + 1 })
    return months.map((m) => ({ month: m.label, Scans: counts[m.key] || 0 }))
  }, [fScans])

  const scanStatusData = useMemo(() => {
    const counts: Record<string, number> = {}
    fScans.forEach((s) => { counts[s.status] = (counts[s.status] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [fScans])

  // ── Unified Export Handler ───────────────────────────────────────────
  const handleExport = (reportKey: string, format: 'csv' | 'pdf') => {
    setExporting(`${reportKey}-${format}`)
    
    let title = '', subtitle = `Filtered Platform Data • Generated ${new Date().toLocaleDateString('en-IN')}`
    let headers: string[] = []
    let rows: (string | number)[][] = []
    let colWidths: number[] = []
    let filename = ''

    switch (reportKey) {
      case 'merchant_reg':
        title = 'Merchant Registration Report'
        headers = ['Business Name', 'Category', 'Status', 'Joined Date']
        rows = fMerchants.map(m => [m.business_name, m.category, m.status, new Date(m.created_at).toLocaleDateString('en-IN')])
        colWidths = [60, 40, 30, 40]; filename = 'Merchant_Registration_Report'
        break
      case 'merchant_cat':
        title = 'Merchant Category Report'
        headers = ['Category', 'Count']
        const catCounts: Record<string, number> = {}
        fMerchants.forEach(m => { catCounts[m.category] = (catCounts[m.category] || 0) + 1 })
        rows = Object.entries(catCounts).map(([cat, count]) => [cat, count])
        colWidths = [60, 30]; filename = 'Merchant_Category_Report'
        break
      case 'customer_reg':
        title = 'Customer Registration Report'
        headers = ['Customer Phone', 'First Seen Date']
        const custMap: Record<string, string> = {}
        fScans.forEach(s => { if (s.customer_phone && !custMap[s.customer_phone]) custMap[s.customer_phone] = s.created_at })
        rows = Object.entries(custMap).map(([phone, date]) => [`+91 ${phone}`, new Date(date).toLocaleDateString('en-IN')])
        colWidths = [50, 40]; filename = 'Customer_Registration_Report'
        break
      case 'vendor':
        title = 'Vendor Report'
        headers = ['Store Name', 'Owner', 'Status', 'Joined Date']
        rows = fVendors.map(v => [v.store_name, v.owner_name, v.status, new Date(v.created_at).toLocaleDateString('en-IN')])
        colWidths = [50, 40, 30, 40]; filename = 'Vendor_Report'
        break
      case 'referral':
        title = 'Referral Report'
        headers = ['Referrer', 'Referred Business', 'Status', 'Date']
        rows = fReferrals.map(r => [merchantMap[r.referrer_id] || 'Unknown', r.referred_business_name, r.status, new Date(r.created_at).toLocaleDateString('en-IN')])
        colWidths = [40, 50, 30, 40]; filename = 'Referral_Report'
        break
      case 'points':
        title = 'Points Report'
        headers = ['Merchant', 'Type', 'Amount', 'Description', 'Date']
        rows = fTransactions.filter(t => t.wallet_type === 'points').map(t => [merchantMap[t.merchant_id] || 'Unknown', t.transaction_type, `${t.amount} Pts`, t.description || 'N/A', new Date(t.created_at).toLocaleDateString('en-IN')])
        colWidths = [40, 20, 25, 50, 35]; filename = 'Points_Report'
        break
      case 'redemption':
        title = 'Redemption Report'
        headers = ['Merchant', 'Amount', 'Description', 'Date']
        rows = fTransactions.filter(t => t.wallet_type === 'points' && t.transaction_type === 'debit').map(t => [merchantMap[t.merchant_id] || 'Unknown', `${t.amount} Pts`, t.description || 'N/A', new Date(t.created_at).toLocaleDateString('en-IN')])
        colWidths = [45, 30, 60, 35]; filename = 'Redemption_Report'
        break
      case 'wallet_txn':
        title = 'Wallet Transaction Report'
        headers = ['Merchant', 'Type', 'Amount (₹)', 'Description', 'Date']
        rows = fTransactions.filter(t => t.wallet_type === 'cash').map(t => [merchantMap[t.merchant_id] || 'Unknown', t.transaction_type, t.amount.toFixed(2), t.description || 'N/A', new Date(t.created_at).toLocaleDateString('en-IN')])
        colWidths = [40, 25, 30, 50, 30]; filename = 'Wallet_Transaction_Report'
        break
      case 'sales':
        title = 'E-Commerce Sales Report'
        headers = ['Order ID', 'Status', 'Date']
        rows = fOrders.map(o => [o.id, o.status, new Date(o.created_at).toLocaleDateString('en-IN')])
        colWidths = [70, 40, 40]; filename = 'Ecommerce_Sales_Report'
        break
      case 'order':
        title = 'Order Report'
        headers = ['Order ID', 'Status', 'Date']
        rows = fOrders.map(o => [o.id, o.status, new Date(o.created_at).toLocaleDateString('en-IN')])
        colWidths = [70, 40, 40]; filename = 'Order_Report'
        break
      case 'qr_scan':
        title = 'QR Scan Report'
        headers = ['Merchant', 'Customer Phone', 'Status', 'Date']
        rows = fScans.map(s => [merchantMap[s.merchant_id] || 'Unknown', s.customer_phone ? `+91 ${s.customer_phone}` : 'Walk-in', s.status, new Date(s.created_at).toLocaleString('en-IN')])
        colWidths = [50, 35, 30, 45]; filename = 'QR_Scan_Report'
        break
      case 'engagement':
        title = 'Customer Engagement Report'
        headers = ['Merchant', 'Customer Phone', 'Status', 'Date']
        rows = fScans.map(s => [merchantMap[s.merchant_id] || 'Unknown', s.customer_phone ? `+91 ${s.customer_phone}` : 'Walk-in', s.status, new Date(s.created_at).toLocaleString('en-IN')])
        colWidths = [50, 35, 30, 45]; filename = 'Customer_Engagement_Report'
        break
      case 'scratch_card':
        title = 'Scratch Card Report'
        headers = ['Merchant', 'Customer Phone', 'Status', 'Prize Won', 'Date']
        rows = fScans.map(s => [merchantMap[s.merchant_id] || 'Unknown', s.customer_phone ? `+91 ${s.customer_phone}` : 'Walk-in', s.status, s.prize_won || 'N/A', new Date(s.created_at).toLocaleString('en-IN')])
        colWidths = [45, 35, 25, 40, 35]; filename = 'Scratch_Card_Report'
        break
      case 'winner':
        title = 'Winner Report'
        headers = ['Merchant', 'Customer Phone', 'Prize Won', 'Date']
        rows = fScans.filter(s => s.status === 'Reward Won').map(s => [merchantMap[s.merchant_id] || 'Unknown', s.customer_phone ? `+91 ${s.customer_phone}` : 'Walk-in', s.prize_won || 'Reward', new Date(s.created_at).toLocaleString('en-IN')])
        colWidths = [50, 35, 45, 40]; filename = 'Winner_Report'
        break
      case 'prize_dist':
        title = 'Prize Distribution Report'
        headers = ['Merchant', 'Customer Phone', 'Prize', 'Status', 'Date']
        rows = fScans.filter(s => s.status === 'Reward Won').map(s => [merchantMap[s.merchant_id] || 'Unknown', s.customer_phone ? `+91 ${s.customer_phone}` : 'Walk-in', s.prize_won || 'Reward', s.fulfillment_status || 'Pending', new Date(s.created_at).toLocaleDateString('en-IN')])
        colWidths = [45, 35, 35, 25, 35]; filename = 'Prize_Distribution_Report'
        break
      case 'billing':
        title = 'Merchant Billing Report'
        headers = ['Merchant', 'Amount (₹)', 'Method', 'UTR', 'Status', 'Date']
        rows = fPayments.map(p => [merchantMap[p.merchant_id] || 'Unknown', p.amount.toFixed(2), p.payment_method, p.utr_number || 'N/A', p.status, new Date(p.created_at).toLocaleDateString('en-IN')])
        colWidths = [40, 25, 25, 35, 25, 35]; filename = 'Merchant_Billing_Report'
        break
      case 'payment_coll':
        title = 'Payment Collection Report'
        headers = ['Merchant', 'Amount (₹)', 'Method', 'Date']
        rows = fPayments.filter(p => p.status === 'approved').map(p => [merchantMap[p.merchant_id] || 'Unknown', p.amount.toFixed(2), p.payment_method, new Date(p.created_at).toLocaleDateString('en-IN')])
        colWidths = [50, 30, 30, 40]; filename = 'Payment_Collection_Report'
        break
      case 'campaign_perf':
        title = 'Campaign Performance Report'
        headers = ['Campaign Name', 'Status', 'Win Probability', 'Created Date']
        rows = fCampaigns.map(c => [c.name, c.status, `${(c.winning_probability * 100).toFixed(0)}%`, new Date(c.created_at).toLocaleDateString('en-IN')])
        colWidths = [60, 30, 30, 40]; filename = 'Campaign_Performance_Report'
        break
    }

    if (format === 'csv') {
      downloadBlob(toCSV(headers, rows), `${filename}.csv`, 'text/csv')
    } else {
      downloadTablePDF(title, subtitle, headers, rows, `${filename}.pdf`, colWidths)
    }
    setTimeout(() => setExporting(null), 400)
  }

  // ── Report Definitions Array (SOW Section 21) ────────────────────────
  const reportDefs = [
    { key: 'merchant_reg', title: 'Merchant Registration', icon: Store, accent: 'blue', count: fMerchants.length },
    { key: 'merchant_cat', title: 'Merchant Category', icon: Store, accent: 'blue', count: new Set(fMerchants.map(m => m.category)).size },
    { key: 'customer_reg', title: 'Customer Registration', icon: Users, accent: 'green', count: new Set(fScans.map(s => s.customer_phone).filter(Boolean)).size },
    { key: 'vendor', title: 'Vendor Report', icon: Truck, accent: 'purple', count: fVendors.length },
    { key: 'referral', title: 'Referral Report', icon: Share2, accent: 'amber', count: fReferrals.length },
    { key: 'points', title: 'Points Report', icon: Coins, accent: 'amber', count: fTransactions.filter(t => t.wallet_type === 'points').length },
    { key: 'redemption', title: 'Redemption Report', icon: Gift, accent: 'rose', count: fTransactions.filter(t => t.wallet_type === 'points' && t.transaction_type === 'debit').length },
    { key: 'wallet_txn', title: 'Wallet Transaction', icon: Wallet, accent: 'blue', count: fTransactions.filter(t => t.wallet_type === 'cash').length },
    { key: 'sales', title: 'E-Commerce Sales', icon: ShoppingCart, accent: 'green', count: fOrders.length },
    { key: 'order', title: 'Order Report', icon: PackageCheck, accent: 'purple', count: fOrders.length },
    { key: 'qr_scan', title: 'QR Scan Report', icon: QrCode, accent: 'purple', count: fScans.length },
    { key: 'engagement', title: 'Customer Engagement', icon: Users, accent: 'blue', count: fScans.length },
    { key: 'scratch_card', title: 'Scratch Card Report', icon: Ticket, accent: 'amber', count: fScans.length },
    { key: 'winner', title: 'Winner Report', icon: Trophy, accent: 'green', count: fScans.filter(s => s.status === 'Reward Won').length },
    { key: 'prize_dist', title: 'Prize Distribution', icon: Gift, accent: 'rose', count: fScans.filter(s => s.status === 'Reward Won').length },
    { key: 'billing', title: 'Merchant Billing', icon: Receipt, accent: 'blue', count: fPayments.length },
    { key: 'payment_coll', title: 'Payment Collection', icon: CreditCard, accent: 'green', count: fPayments.filter(p => p.status === 'approved').length },
    { key: 'campaign_perf', title: 'Campaign Performance', icon: TrendingUp, accent: 'purple', count: fCampaigns.length },
  ]

  const accentClasses: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-[#1857D6]' },
    green: { bg: 'bg-emerald-50', text: 'text-[#3E7A1C]' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600' },
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1857D6]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Reports Error</h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-8xl px-4 py-8 sm:px-6 lg:px-8" style={{ fontFamily: 'var(--font-display)' }}>

      {/* Header Banner */}
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#1857D6]/10 to-[#7BC142]/15 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#0B0F19] to-[#1857D6] text-white shadow-lg shadow-blue-500/20">
              <FileBarChart size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Reports & Analytics</h1>
              <p className="mt-1 text-sm text-slate-500">Filter, visualize, and download 18 custom administrative reports.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Global Filter Engine */}
      <div className="mb-8 rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 md:mr-2">
            <Filter size={16} className="text-[#1857D6]" /> Filters:
          </div>
          
          <div className="relative flex-1">
            <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-8 py-2.5 text-sm font-medium text-slate-700 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10 cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="6m">Last 6 Months</option>
              <option value="1y">This Year</option>
            </select>
          </div>

          <div className="relative flex-1">
            <Store size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={merchantFilter}
              onChange={(e) => setMerchantFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-8 py-2.5 text-sm font-medium text-slate-700 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10 cursor-pointer"
            >
              <option value="all">All Merchants</option>
              {merchants.map(m => <option key={m.id} value={m.id}>{m.business_name}</option>)}
            </select>
          </div>

          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-8 py-2.5 text-sm font-medium text-slate-700 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:border-[#1857D6] focus:ring-[#1857D6]/10 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#1857D6]"><TrendingUp size={18} /></div>
            <div><h2 className="text-sm font-semibold text-slate-900">Merchant Growth</h2><p className="text-xs text-slate-500">Based on active filters.</p></div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={merchantGrowthData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12, outline: 'none' }} labelStyle={{ fontWeight: 600, color: '#0F172A' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="New" stroke={COLORS.lightGreen} strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Cumulative" stroke={COLORS.blue} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#3E7A1C]"><Wallet size={18} /></div>
            <div><h2 className="text-sm font-semibold text-slate-900">Points Movement</h2><p className="text-xs text-slate-500">Based on active filters.</p></div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={pointsChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12, outline: 'none' }} labelStyle={{ fontWeight: 600, color: '#0F172A' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Earned" fill={COLORS.lightGreen} radius={[6, 6, 0, 0]} />
              <Bar dataKey="Spent" fill={COLORS.rose} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600"><QrCode size={18} /></div>
            <div><h2 className="text-sm font-semibold text-slate-900">Scan Volume</h2><p className="text-xs text-slate-500">Based on active filters.</p></div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={scanTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs><linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.35} /><stop offset="95%" stopColor={COLORS.blue} stopOpacity={0.02} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12, outline: 'none' }} labelStyle={{ fontWeight: 600, color: '#0F172A' }} />
              <Area type="monotone" dataKey="Scans" stroke={COLORS.blue} strokeWidth={2.5} fill="url(#scanGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><FileBarChart size={18} /></div>
            <div><h2 className="text-sm font-semibold text-slate-900">Scan Outcomes</h2><p className="text-xs text-slate-500">Based on active filters.</p></div>
          </div>
          {scanStatusData.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">No scan data found for selected filters.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={scanStatusData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={3} stroke="none">
                  {scanStatusData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12, outline: 'none' }} itemStyle={{ color: '#0F172A' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Export Report Cards (All 18 SOW Requirements) */}
      <h2 className="mb-4 text-base font-semibold text-slate-900">Export Filtered Reports</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportDefs.map((report, i) => {
          const accent = accentClasses[report.accent]
          const Icon = report.icon
          return (
            <motion.div
              key={report.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
              className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent.bg} ${accent.text}`}>
                  <Icon size={20} />
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {report.count} records
                </span>
              </div>

              <h3 className="text-base font-semibold text-slate-900">{report.title}</h3>
              <p className="mt-1.5 flex-1 text-xs leading-relaxed text-slate-500">Export detailed {report.title.toLowerCase()} data based on current filters.</p>

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => handleExport(report.key, 'csv')}
                  disabled={exporting === `${report.key}-csv` || report.count === 0}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {exporting === `${report.key}-csv` ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => handleExport(report.key, 'pdf')}
                  disabled={exporting === `${report.key}-pdf` || report.count === 0}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1857D6] to-[#0B2E7A] px-3 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:translate-y-[-1px] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {exporting === `${report.key}-pdf` ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  <span>PDF</span>
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}