import React, { useState, useEffect } from 'react'
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  Bluetooth,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import type { CafeOrder, CafePaymentMethod } from './types'
import { bluetoothPrinter, type BluetoothPrinterState } from './bluetoothPrinter'
import { CafeReceipt } from './CafeReceipt'

interface CafeCheckoutModalProps {
  order: CafeOrder
  onClose: () => void
  onComplete: (completedOrder: CafeOrder) => void
}

export const CafeCheckoutModal: React.FC<CafeCheckoutModalProps> = ({
  order,
  onClose,
  onComplete,
}) => {
  const [method, setMethod] = useState<CafePaymentMethod>('CASH')
  const [cashTendered, setCashTendered] = useState<number>(order.total_amount)
  const [customCashInput, setCustomCashInput] = useState<string>(order.total_amount.toString())
  const [discountNominal, setDiscountNominal] = useState<number>(order.discount_amount || 0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [finalOrder, setFinalOrder] = useState<CafeOrder>(order)
  const [printStatus, setPrintStatus] = useState<string | null>(null)
  const [btState, setBtState] = useState<BluetoothPrinterState>(bluetoothPrinter.state)

  useEffect(() => {
    const unsub = bluetoothPrinter.subscribe((state) => {
      setBtState(state)
    })
    return () => unsub()
  }, [])

  const currentTotal = Math.max(0, order.subtotal - discountNominal)
  const changeAmount = method === 'CASH' ? Math.max(0, cashTendered - currentTotal) : 0
  const isCashSufficient = method !== 'CASH' || cashTendered >= currentTotal

  // Quick nominal buttons
  const quickNominals = [
    currentTotal, // Uang Pas
    Math.ceil(currentTotal / 10000) * 10000,
    Math.ceil(currentTotal / 50000) * 50000,
    50000,
    100000,
  ].filter((v, i, a) => v >= currentTotal && a.indexOf(v) === i).slice(0, 4)

  const handleCustomCash = (val: string) => {
    const clean = val.replace(/\D/g, '')
    setCustomCashInput(clean)
    setCashTendered(Number(clean) || 0)
  }

  const handleSelectQuickCash = (amt: number) => {
    setCashTendered(amt)
    setCustomCashInput(amt.toString())
  }

  const handleConnectBluetooth = async () => {
    await bluetoothPrinter.connect()
  }

  const handleFinishPayment = async () => {
    if (!isCashSufficient) return

    setIsProcessing(true)

    const updatedOrder: CafeOrder = {
      ...order,
      subtotal: order.subtotal,
      discount_amount: discountNominal,
      total_amount: currentTotal,
      payment_method: method,
      cash_tendered: method === 'CASH' ? cashTendered : currentTotal,
      change_amount: changeAmount,
      status: 'PAID',
    }

    setFinalOrder(updatedOrder)

    // Trigger immediate direct print to Bluetooth Thermal Printer!
    const res = await bluetoothPrinter.printReceipt(updatedOrder)
    setPrintStatus(res.message)

    setIsProcessing(false)
    setIsFinished(true)
    onComplete(updatedOrder)
  }

  const handleReprint = async () => {
    const res = await bluetoothPrinter.printReceipt(finalOrder)
    setPrintStatus(res.message)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        fontFamily: 'var(--mera-font, system-ui, sans-serif)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: isFinished ? '420px' : '580px',
          background: '#161618',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: isFinished ? 'rgba(34, 197, 94, 0.15)' : 'rgba(217, 119, 6, 0.15)',
                color: isFinished ? '#22c55e' : '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isFinished ? <CheckCircle2 size={18} /> : <CreditCard size={18} />}
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>
                {isFinished ? 'Pembayaran Sukses' : 'Pembayaran POS Méra Hause'}
              </h2>
              <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>
                Order #{order.order_number} • {order.items?.length || 0} item
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {isFinished ? (
            /* Post-Payment Success View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              <div
                style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: '12px',
                  padding: '14px',
                  width: '100%',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#4ade80' }}>
                  Transaksi Selesai & Berhasil Dicatat!
                </div>
                {printStatus && (
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
                    {printStatus}
                  </div>
                )}
              </div>

              {/* Receipt Preview */}
              <CafeReceipt order={finalOrder} />

              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button
                  onClick={handleReprint}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <Printer size={16} /> Cetak Ulang Struk
                </button>

                <button
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#d97706',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles size={16} /> Transaksi Baru
                </button>
              </div>
            </div>
          ) : (
            /* Active Checkout Form */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Bluetooth Printer Status Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: btState.isConnected
                    ? 'rgba(34, 197, 94, 0.1)'
                    : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${
                    btState.isConnected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.08)'
                  }`,
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bluetooth
                    size={16}
                    color={btState.isConnected ? '#4ade80' : 'rgba(255,255,255,0.4)'}
                  />
                  <div style={{ fontSize: '11px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Printer Thermal: </span>
                    <span style={{ color: btState.isConnected ? '#4ade80' : '#fff', fontWeight: 600 }}>
                      {btState.isConnected
                        ? `${btState.deviceName || 'Thermal BT'}`
                        : 'Belum Tersambung'}
                    </span>
                  </div>
                </div>

                {!btState.isConnected && (
                  <button
                    onClick={handleConnectBluetooth}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #d97706',
                      background: 'rgba(217, 119, 6, 0.15)',
                      color: '#f59e0b',
                      cursor: 'pointer',
                    }}
                  >
                    Sambungkan BT
                  </button>
                )}
              </div>

              {/* Total Summary Card */}
              <div
                style={{
                  background: 'rgba(217, 119, 6, 0.08)',
                  border: '1px solid rgba(217, 119, 6, 0.25)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', color: '#d97706', fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Tagihan
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                  Rp {currentTotal.toLocaleString('id-ID')}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontWeight: 600 }}>
                  Metode Pembayaran
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {(
                    [
                      { id: 'CASH', label: 'Tunai (Cash)', icon: Banknote },
                      { id: 'QRIS', label: 'QRIS', icon: QrCode },
                      { id: 'TRANSFER', label: 'Transfer', icon: CreditCard },
                    ] as const
                  ).map((m) => {
                    const active = method === m.id
                    const Icon = m.icon
                    return (
                      <button
                        key={m.id}
                        onClick={() => setMethod(m.id)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '12px 8px',
                          borderRadius: '10px',
                          border: active ? '1.5px solid #d97706' : '1px solid rgba(255,255,255,0.08)',
                          background: active ? 'rgba(217, 119, 6, 0.15)' : 'rgba(255,255,255,0.03)',
                          color: active ? '#f59e0b' : 'rgba(255,255,255,0.6)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '12px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Icon size={18} />
                        <span>{m.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Cash Input & Quick Chips */}
              {method === 'CASH' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                    Uang Tunai Diterima
                  </div>

                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: '15px',
                        fontWeight: 600,
                      }}
                    >
                      Rp
                    </span>
                    <input
                      type="text"
                      value={Number(customCashInput).toLocaleString('id-ID')}
                      onChange={(e) => handleCustomCash(e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '12px 14px 12px 42px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontSize: '18px',
                        fontWeight: 700,
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Quick Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {quickNominals.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => handleSelectQuickCash(amt)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: cashTendered === amt ? '1px solid #d97706' : '1px solid rgba(255,255,255,0.1)',
                          background: cashTendered === amt ? 'rgba(217, 119, 6, 0.2)' : 'rgba(255,255,255,0.04)',
                          color: cashTendered === amt ? '#f59e0b' : 'rgba(255,255,255,0.8)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {amt === currentTotal ? 'Uang Pas' : `Rp ${amt.toLocaleString('id-ID')}`}
                      </button>
                    ))}
                  </div>

                  {/* Change Calculation Box */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      marginTop: '4px',
                    }}
                  >
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Kembalian:</span>
                    <span
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: isCashSufficient ? '#4ade80' : '#ef4444',
                      }}
                    >
                      {isCashSufficient ? `Rp ${changeAmount.toLocaleString('id-ID')}` : 'Uang Kurang!'}
                    </span>
                  </div>
                </div>
              )}

              {/* QRIS / Transfer Hint */}
              {method !== 'CASH' && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.6)',
                  }}
                >
                  Pastikan pembayaran via {method} telah diterima di rekening / QRIS Méra Hause sebelum menyelesaikan transaksi.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!isFinished && (
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.02)',
              display: 'flex',
              gap: '10px',
            }}
          >
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'transparent',
                color: 'rgba(255, 255, 255, 0.6)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Batal
            </button>

            <button
              onClick={handleFinishPayment}
              disabled={!isCashSufficient || isProcessing}
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: isCashSufficient && !isProcessing ? '#d97706' : 'rgba(255,255,255,0.1)',
                color: isCashSufficient && !isProcessing ? '#fff' : 'rgba(255,255,255,0.3)',
                fontWeight: 700,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: isCashSufficient && !isProcessing ? 'pointer' : 'not-allowed',
                boxShadow: isCashSufficient ? '0 4px 16px rgba(217, 119, 6, 0.35)' : 'none',
              }}
            >
              <Printer size={18} />
              <span>{isProcessing ? 'Memproses...' : 'Bayar & Cetak Struk'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
