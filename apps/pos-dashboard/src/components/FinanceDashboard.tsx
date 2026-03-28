import React, { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@mera/supabase/client'
import type { Crew, Attendance, Transaction, Expense } from '@mera/supabase'
import { Target, CheckCircle2, Receipt, RefreshCw, FileImage, Plus, Save } from 'lucide-react'
import html2canvas from 'html2canvas'

// ── Bonus targets from docs ───────────────────────────────────
const TARGET_WEEKDAY = 1_000_000
const TARGET_WEEKEND = 1_500_000

function isWeekend(date: Date): boolean {
    const d = date.getDay()
    return d === 0 || d === 5 || d === 6 // Sun, Fri, Sat
}

function fmtRp(n: number): string {
    return `Rp ${n.toLocaleString('id-ID')}`
}

function fmtTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

type DateRange = 'today' | 'week' | 'month'

function getRangeISO(range: DateRange): { start: string; end: string } {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

    if (range === 'today') {
        const t = ymd(now)
        return { start: `${t}T00:00:00`, end: `${t}T23:59:59` }
    }
    if (range === 'week') {
        const day = now.getDay() || 7 // Mon=1..Sun=7
        const mon = new Date(now); mon.setDate(now.getDate() - day + 1)
        return { start: `${ymd(mon)}T00:00:00`, end: `${ymd(now)}T23:59:59` }
    }
    // month
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start: `${ymd(firstDay)}T00:00:00`, end: `${ymd(now)}T23:59:59` }
}

// ── Component ─────────────────────────────────────────────────
export default function FinanceDashboard() {
    const [finTab, setFinTab] = useState<'Summary' | 'Payroll' | 'Expenses'>('Summary')
    const [range, setRange] = useState<DateRange>('today')
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [attendance, setAttendance] = useState<Attendance[]>([])
    const [crew, setCrew] = useState<Crew[]>([])
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)

    // Expense Form State
    const [expTanggal, setExpTanggal] = useState(new Date().toISOString().split('T')[0])
    const [expKategori, setExpKategori] = useState('Operational')
    const [expKeterangan, setExpKeterangan] = useState('')
    const [expJumlah, setExpJumlah] = useState('')
    const [expSubmitting, setExpSubmitting] = useState(false)

    // Slip Gaji Generator Ref
    const slipRef = useRef<HTMLDivElement>(null)
    const [slipData, setSlipData] = useState<PayrollRow | null>(null)
    const [isGeneratingSlip, setIsGeneratingSlip] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        const { start, end } = getRangeISO(range)

        const [{ data: txData }, { data: attData }, { data: crewData }, { data: expData }] = await Promise.all([
            (supabase.from('transactions') as any)
                .select('*')
                .gte('created_at', start)
                .lte('created_at', end)
                .order('created_at', { ascending: false }),
            (supabase.from('attendance') as any)
                .select('*')
                .gte('clock_in', start)
                .lte('clock_in', end)
                .order('clock_in', { ascending: false }),
            (supabase.from('crew') as any).select('*').order('nama'),
            (supabase.from('expenses') as any)
                .select('*')
                .gte('tanggal', start.split('T')[0])
                .lte('tanggal', end.split('T')[0])
                .order('tanggal', { ascending: false })
                .order('created_at', { ascending: false }),
        ])

        setTransactions((txData ?? []) as Transaction[])
        setAttendance((attData ?? []) as Attendance[])
        setCrew((crewData ?? []) as Crew[])
        setExpenses((expData ?? []) as Expense[])
        setLoading(false)
    }, [range])

    useEffect(() => { load() }, [load])

    // ── Finance metrics ───────────────────────────────────────
    const paid = transactions.filter(t => t.status === 'PAID')
    const totalOmset = paid.reduce((s, t) => s + t.total_amount, 0)
    const totalDiskon = paid.reduce((s, t) => s + (t.discount_amount ?? 0), 0)
    const cashTotal = paid.filter(t => t.payment_method === 'CASH').reduce((s, t) => s + t.total_amount, 0)
    const qrisTotal = paid.filter(t => ['QRIS', 'ONLINE_QRIS', 'TRANSFER'].includes(t.payment_method ?? '')).reduce((s, t) => s + t.total_amount, 0)
    const txCount = paid.length

    const target = isWeekend(new Date()) ? TARGET_WEEKEND : TARGET_WEEKDAY
    const pct = Math.min((totalOmset / target) * 100, 100)
    const bonusReached = totalOmset >= target

    // ── Payroll preview ───────────────────────────────────────
    const crewMap = new Map(crew.map(c => [c.id, c]))

    interface PayrollRow {
        crew_id: string
        nama: string
        shifts: number
        totalBase: number
        totalPenalty: number
        netPay: number
    }

    const payroll = new Map<string, PayrollRow>()
    attendance.forEach(a => {
        const c = crewMap.get(a.crew_id)
        if (!c) return
        const existing = payroll.get(a.crew_id) ?? {
            crew_id: a.crew_id, nama: c.nama,
            shifts: 0, totalBase: 0, totalPenalty: 0, netPay: 0,
        }
        existing.shifts++
        existing.totalBase += a.base_rate
        existing.totalPenalty += a.penalty_amount
        existing.netPay += (a.base_rate - a.penalty_amount)
        payroll.set(a.crew_id, existing)
    })

    const payrollRows = Array.from(payroll.values())

    // ── Status badge colors ───────────────────────────────────
    const TX_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
        ACTIVE: { bg: 'var(--mera-warning-bg)', text: 'var(--mera-warning)' },
        PAID: { bg: 'var(--mera-success-bg)', text: 'var(--mera-success)' },
        REFUNDED: { bg: 'var(--mera-error-bg)', text: 'var(--mera-error)' },
        VOID: { bg: 'var(--mera-surface-raised)', text: 'var(--mera-text-secondary)' },
    }

    const totalExpenses = expenses.reduce((sum, e) => sum + e.jumlah, 0)

    const handleGenerateSlip = async (row: PayrollRow) => {
        setSlipData(row)
        setIsGeneratingSlip(true)

        // Give React a tick to render the hidden slip DOM element
        setTimeout(async () => {
            if (slipRef.current) {
                try {
                    const canvas = await html2canvas(slipRef.current, { scale: 3, backgroundColor: '#3f3f3fff' })
                    const imgData = canvas.toDataURL('image/jpeg', 0.9)

                    const link = document.createElement('a')
                    link.href = imgData
                    link.download = `Slip_Gaji_${row.nama.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.jpg`
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                } catch (err) {
                    console.error('Failed to generate slip:', err)
                    window.alert('Failed.')
                } finally {
                    setIsGeneratingSlip(false)
                    setSlipData(null)
                }
            }
        }, 100)
    }

    const handleSubmitExpense = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!expKeterangan || !expJumlah) return

        setExpSubmitting(true)
        try {
            const { error } = await (supabase.from('expenses') as any).insert({
                tanggal: expTanggal,
                kategori: expKategori,
                keterangan: expKeterangan,
                jumlah: parseInt(expJumlah.replace(/\D/g, ''), 10)
            })
            if (error) throw error

            setExpKeterangan('')
            setExpJumlah('')
            await load()
            window.alert('Pengeluaran berhasil dicatat.')
        } catch (err) {
            console.error(err)
            window.alert('Gagal menyimpan pengeluaran.')
        } finally {
            setExpSubmitting(false)
        }
    }

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: 24, position: 'relative' }}>

            {/* Hidden Slip Gaji Template Form (Rendered only when needed for html2canvas) */}
            <div style={{ position: 'absolute', top: -9999, left: -9999, opacity: 0, pointerEvents: 'none' }}>
                <div ref={slipRef} style={{ width: 600, padding: 40, background: '#fff', color: '#1a1a1a', fontFamily: 'system-ui, sans-serif' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e5e7eb', paddingBottom: 20, marginBottom: 20 }}>
                        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#111827' }}>Méra<span style={{ color: '#8b5cf6' }}>.</span></h1>
                        <div style={{ textAlign: 'right' }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#374151' }}>SLIP GAJI</h2>
                            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Periode: {range === 'today' ? 'Harian' : range === 'week' ? 'Mingguan' : 'Bulanan'}</p>
                        </div>
                    </div>

                    {slipData && (
                        <>
                            <div style={{ display: 'flex', gap: 40, marginBottom: 32 }}>
                                <div>
                                    <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nama Kru</p>
                                    <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1f2937' }}>{slipData.nama}</p>
                                </div>
                                <div>
                                    <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shift Selesai</p>
                                    <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1f2937' }}>{slipData.shifts} Shift</p>
                                </div>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32 }}>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6', fontSize: 14 }}>Gaji Pokok Total</td>
                                        <td style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontSize: 14, fontWeight: 600 }}>{fmtRp(slipData.totalBase)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6', fontSize: 14 }}>Potongan Keterlambatan</td>
                                        <td style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#dc2626' }}>
                                            {slipData.totalPenalty > 0 ? `- ${fmtRp(slipData.totalPenalty)}` : 'Rp 0'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 16, fontWeight: 700, color: '#334155' }}>TOTAL GAJI BERSIH</span>
                                <span style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>{fmtRp(slipData.netPay)}</span>
                            </div>
                        </>
                    )}

                    <div style={{ marginTop: 60, textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>
                        Méra Self Studio • Dicetak otomatis pada {new Date().toLocaleDateString('id-ID')}
                    </div>
                </div>
            </div>

            {/* ── Header & Range Switcher ───────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h2 style={{ fontSize: 40, fontWeight: 700, marginBottom: 2 }}>Méra Finance Dashboard</h2>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                    {(['today', 'week', 'month'] as DateRange[]).map(r => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            style={{
                                padding: '6px 14px', fontSize: 12, fontWeight: 600,
                                border: '1px solid var(--mera-border)',
                                borderRadius: 'var(--mera-radius-md)',
                                background: range === r ? 'var(--mera-accent)' : 'var(--mera-surface)',
                                color: range === r ? '#a0a0a0ff' : 'var(--mera-text-secondary)',
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}
                        >
                            {r === 'today' ? 'Daily' : r === 'week' ? 'Weekly' : 'Monthly'}
                        </button>
                    ))}
                    <button
                        onClick={load}
                        style={{
                            padding: '6px 12px', fontSize: 12,
                            border: '1px solid var(--mera-border)',
                            borderRadius: 'var(--mera-radius-md)',
                            background: 'var(--mera-surface)',
                            color: 'var(--mera-text-secondary)',
                            cursor: 'pointer',
                        }}
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* ── Sub Navigation Tabs ─────────────────── */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--mera-border)', paddingBottom: 16 }}>
                {(['Summary', 'Payroll', 'Expenses'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setFinTab(tab)}
                        style={{
                            padding: '8px 16px', borderRadius: 'var(--mera-radius-full)',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            background: finTab === tab ? 'var(--mera-surface-raised)' : 'transparent',
                            color: finTab === tab ? 'var(--mera-text-primary)' : 'var(--mera-text-tertiary)',
                            border: finTab === tab ? '1px solid var(--mera-border)' : '1px solid transparent',
                            textTransform: 'capitalize'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--mera-text-tertiary)' }}>
                    Loading...
                </div>
            ) : (
                <>
                    {/* === TAB: RINGKASAN === */}
                    {finTab === 'Summary' && (
                        <>
                            {/* ── Summary Cards ─────────────────────── */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                                <StatCard label="Total Omset" value={fmtRp(totalOmset)} color="var(--mera-success)" />
                                <StatCard label="Total Diskon" value={fmtRp(totalDiskon)} color="var(--mera-error)" />
                                <StatCard label="Tunai" value={fmtRp(cashTotal)} color="var(--mera-warning)" />
                                <StatCard label="QRIS / Transfer" value={fmtRp(qrisTotal)} color="var(--mera-info)" />
                                <StatCard label="Pengeluaran" value={fmtRp(totalExpenses)} color="var(--mera-error)" />
                            </div>

                            {/* ── Target Progress (only for today) ───── */}
                            {range === 'today' && (
                                <div style={{
                                    background: 'var(--mera-surface)', border: '1px solid var(--mera-border)',
                                    borderRadius: 'var(--mera-radius-lg)', padding: '16px 18px', marginBottom: 20,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                                        <p style={{ fontSize: 13, fontWeight: 600 }}>
                                            <Target size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} /> Omzet Target {isWeekend(new Date()) ? 'Weekend' : 'Weekday'}
                                        </p>
                                        <p style={{ fontSize: 12, color: 'var(--mera-text-tertiary)' }}>
                                            {fmtRp(totalOmset)} / {fmtRp(target)}
                                        </p>
                                    </div>
                                    {/* Progress bar */}
                                    <div style={{ height: 8, background: 'var(--mera-surface-raised)', borderRadius: 4, overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%', width: `${pct}%`,
                                            background: bonusReached ? 'var(--mera-success)' : 'var(--mera-accent)',
                                            borderRadius: 4, transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
                                        }} />
                                    </div>
                                    <p style={{ fontSize: 11, color: 'var(--mera-text-tertiary)', marginTop: 6 }}>
                                        {pct.toFixed(1)}% Reached
                                    </p>
                                    {bonusReached && (
                                        <div style={{
                                            marginTop: 10, padding: '8px 12px',
                                            background: 'var(--mera-success-bg)', borderRadius: 'var(--mera-radius-md)',
                                            border: '1px solid rgba(136, 212, 158, 0.3)',
                                        }}>
                                            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--mera-success)' }}>
                                                <CheckCircle2 size={14} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 4 }} /> Target Reached!
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Cash vs QRIS Breakdown ───────────── */}
                            {totalOmset > 0 && (
                                <div style={{
                                    background: 'var(--mera-surface)', border: '1px solid var(--mera-border)',
                                    borderRadius: 'var(--mera-radius-lg)', padding: '16px 18px', marginBottom: 20,
                                }}>
                                    <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--mera-text-tertiary)', marginBottom: 12 }}>
                                        Payment Method
                                    </p>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                                        <div style={{ flex: cashTotal / totalOmset * 100, height: 12, background: 'var(--mera-warning)', borderRadius: 6, transition: 'flex 0.5s' }} />
                                        <div style={{ flex: qrisTotal / totalOmset * 100, height: 12, background: 'var(--mera-info)', borderRadius: 6, transition: 'flex 0.5s' }} />
                                    </div>
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <p style={{ fontSize: 12, color: 'var(--mera-warning)' }}>
                                            ● Cash {totalOmset > 0 ? (cashTotal / totalOmset * 100).toFixed(0) : 0}%
                                        </p>
                                        <p style={{ fontSize: 12, color: 'var(--mera-info)' }}>
                                            ● QRIS {totalOmset > 0 ? (qrisTotal / totalOmset * 100).toFixed(0) : 0}%
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ── Transactions Table ───────────────── */}
                            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--mera-text-tertiary)', marginBottom: 10 }}>
                                All Transaction
                            </p>
                            {transactions.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 32, color: 'var(--mera-text-tertiary)', fontSize: 13, marginBottom: 24 }}>
                                    <Receipt size={16} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} /> No Transaction
                                </div>
                            ) : (
                                <div style={{ border: '1px solid var(--mera-border)', borderRadius: 'var(--mera-radius-lg)', overflow: 'hidden', marginBottom: 28 }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--mera-surface-raised)' }}>
                                                {['Session ID', 'Total', 'Diskon', 'Metode', 'Waktu', 'Status'].map(h => (
                                                    <th key={h} style={{
                                                        padding: '10px 14px', textAlign: 'left', fontSize: 11,
                                                        fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                                                        color: 'var(--mera-text-tertiary)', borderBottom: '1px solid var(--mera-border)',
                                                    }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map(tx => {
                                                const sc = TX_STATUS_COLOR[tx.status] ?? TX_STATUS_COLOR.VOID
                                                return (
                                                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--mera-border)' }}>
                                                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em' }}>
                                                            {tx.session_id}
                                                        </td>
                                                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700 }}>
                                                            {fmtRp(tx.total_amount)}
                                                        </td>
                                                        <td style={{ padding: '10px 14px', fontSize: 12, color: tx.discount_amount > 0 ? 'var(--mera-error)' : 'var(--mera-text-tertiary)' }}>
                                                            {tx.discount_amount > 0 ? `−${fmtRp(tx.discount_amount)}` : '–'}
                                                        </td>
                                                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--mera-text-secondary)' }}>
                                                            {tx.payment_method ?? '–'}
                                                        </td>
                                                        <td style={{ padding: '10px 14px', fontSize: 12 }}>
                                                            {fmtTime(tx.created_at)}
                                                        </td>
                                                        <td style={{ padding: '10px 14px' }}>
                                                            <span style={{
                                                                fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 'var(--mera-radius-full)',
                                                                background: sc.bg, color: sc.text,
                                                            }}>
                                                                {tx.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}

                    {/* === TAB: PENGGAJIAN === */}
                    {finTab === 'Payroll' && (
                        <>
                            {payrollRows.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 48, color: 'var(--mera-text-tertiary)', fontSize: 14 }}>
                                    -.
                                </div>
                            ) : (
                                <>
                                    <div style={{ border: '1px solid var(--mera-border)', borderRadius: 'var(--mera-radius-lg)', overflow: 'hidden', marginBottom: 24 }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--mera-surface-raised)' }}>
                                                    {['Nama', 'Jml Shift', 'Gaji Pokok Total', 'Potongan', 'Gaji Bersih', 'Aksi'].map(h => (
                                                        <th key={h} style={{
                                                            padding: '12px 16px', textAlign: h === 'Aksi' ? 'right' : 'left', fontSize: 11,
                                                            fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                                                            color: 'var(--mera-text-tertiary)', borderBottom: '1px solid var(--mera-border)',
                                                        }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {payrollRows.map(row => (
                                                    <tr key={row.crew_id} style={{ borderBottom: '1px solid var(--mera-border)' }}>
                                                        <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: 14 }}>{row.nama}</td>
                                                        <td style={{ padding: '14px 16px', fontSize: 13 }}>{row.shifts} Shift</td>
                                                        <td style={{ padding: '14px 16px', fontSize: 13 }}>{fmtRp(row.totalBase)}</td>
                                                        <td style={{ padding: '14px 16px', fontSize: 13, color: row.totalPenalty > 0 ? 'var(--mera-error)' : 'var(--mera-text-tertiary)' }}>
                                                            {row.totalPenalty > 0 ? `−${fmtRp(row.totalPenalty)}` : '–'}
                                                        </td>
                                                        <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 800, color: 'var(--mera-success)' }}>
                                                            {fmtRp(row.netPay)}
                                                        </td>
                                                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                                            <button
                                                                onClick={() => handleGenerateSlip(row)}
                                                                disabled={isGeneratingSlip}
                                                                style={{
                                                                    padding: '6px 14px', fontSize: 12, fontWeight: 600,
                                                                    background: 'var(--mera-surface-raised)', border: '1px solid var(--mera-border)',
                                                                    borderRadius: 'var(--mera-radius-md)', color: 'var(--mera-text-primary)',
                                                                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                                                                }}
                                                            >
                                                                <FileImage size={14} /> Download
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {/* === TAB: PENGELUARAN === */}
                    {finTab === 'Expenses' && (
                        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                            {/* Input Form */}
                            <div style={{ flex: '0 0 320px', background: 'var(--mera-surface)', border: '1px solid var(--mera-border)', borderRadius: 'var(--mera-radius-lg)', padding: 20 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Input Expenses</h3>
                                <form onSubmit={handleSubmitExpense} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mera-text-secondary)', marginBottom: 6 }}>Date</label>
                                        <input
                                            type="date"
                                            value={expTanggal} onChange={e => setExpTanggal(e.target.value)} required
                                            style={{ width: '100%', padding: '10px 12px', background: 'var(--mera-surface)', border: '1px solid var(--mera-border)', borderRadius: 'var(--mera-radius-md)', color: 'var(--mera-text-primary)' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mera-text-secondary)', marginBottom: 6 }}>Category</label>
                                        <select
                                            value={expKategori} onChange={e => setExpKategori(e.target.value)}
                                            style={{ width: '100%', padding: '10px 12px', background: 'var(--mera-surface)', border: '1px solid var(--mera-border)', borderRadius: 'var(--mera-radius-md)', color: 'var(--mera-text-primary)' }}
                                        >
                                            <option>Operational</option>
                                            <option>Maintenance</option>
                                            <option>Supplies</option>
                                            <option>Credit Card</option>
                                            <option>Admin Fee</option>
                                            <option>Lain-lain</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mera-text-secondary)', marginBottom: 6 }}>Item</label>
                                        <input
                                            type="text" placeholder="Beli tinta printer..."
                                            value={expKeterangan} onChange={e => setExpKeterangan(e.target.value)} required
                                            style={{ width: '100%', padding: '10px 12px', background: 'var(--mera-surface)', border: '1px solid var(--mera-border)', borderRadius: 'var(--mera-radius-md)', color: 'var(--mera-text-primary)' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mera-text-secondary)', marginBottom: 6 }}>Amount (Rp)</label>
                                        <input
                                            type="text" inputMode="numeric" placeholder="50000"
                                            value={expJumlah} onChange={e => setExpJumlah(e.target.value.replace(/\D/g, ''))} required
                                            style={{ width: '100%', padding: '10px 12px', background: 'var(--mera-surface)', border: '1px solid var(--mera-border)', borderRadius: 'var(--mera-radius-md)', color: 'var(--mera-text-primary)', fontSize: 16, fontWeight: 700 }}
                                        />
                                    </div>

                                    <button
                                        type="submit" disabled={expSubmitting}
                                        style={{
                                            marginTop: 8, padding: '12px', background: 'var(--mera-accent)', color: '#232323ff',
                                            border: 'none', borderRadius: 'var(--mera-radius-md)', fontWeight: 700, fontSize: 14,
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: expSubmitting ? 0.7 : 1
                                        }}
                                    >
                                        <Save size={16} /> Input
                                    </button>
                                </form>
                            </div>

                            {/* Table of Expenses */}
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--mera-text-tertiary)', marginBottom: 10 }}>Log (Active Period)</p>
                                {expenses.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: 32, border: '1px dashed var(--mera-border)', borderRadius: 'var(--mera-radius-lg)', color: 'var(--mera-text-tertiary)', fontSize: 13 }}>
                                        No Expenses.
                                    </div>
                                ) : (
                                    <div style={{ border: '1px solid var(--mera-border)', borderRadius: 'var(--mera-radius-lg)', overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--mera-surface-raised)' }}>
                                                    {['Tanggal', 'Kategori', 'Keterangan', 'Nominal'].map(h => (
                                                        <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Nominal' ? 'right' : 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mera-text-tertiary)', borderBottom: '1px solid var(--mera-border)' }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {expenses.map(exp => (
                                                    <tr key={exp.id} style={{ borderBottom: '1px solid var(--mera-border)' }}>
                                                        <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--mera-text-secondary)' }}>{exp.tanggal}</td>
                                                        <td style={{ padding: '10px 14px', fontSize: 12 }}>
                                                            <span style={{ background: 'var(--mera-surface-raised)', padding: '2px 8px', borderRadius: 'var(--mera-radius-full)', color: 'var(--mera-text-primary)' }}>{exp.kategori}</span>
                                                        </td>
                                                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>{exp.keterangan}</td>
                                                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: 'var(--mera-error)', textAlign: 'right' }}>{fmtRp(exp.jumlah)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

// ── Micro-component: Stat Card ────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div style={{
            background: 'var(--mera-surface)', border: '1px solid var(--mera-border)',
            borderRadius: 'var(--mera-radius-lg)', padding: '20px 16px',
        }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--mera-text-tertiary)', marginBottom: 6 }}>
                {label}
            </p>
            <p style={{ fontSize: 20, fontWeight: 800, color }}>{value}</p>
        </div>
    )
}
