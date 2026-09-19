import React from 'react'
import type { CafeOrder } from './types'

interface CafeReceiptProps {
  order: CafeOrder
}

export const CafeReceipt: React.FC<CafeReceiptProps> = ({ order }) => {
  const items = order.items ?? []

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #cafe-thermal-receipt-container,
          #cafe-thermal-receipt-container * {
            visibility: visible;
          }
          #cafe-thermal-receipt-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 58mm;
            margin: 0;
            padding: 2mm;
            background: #fff !important;
            color: #000 !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: 58mm auto;
            margin: 0;
          }
        }
      `}</style>

      <div
        id="cafe-thermal-receipt-container"
        style={{
          width: '100%',
          maxWidth: '320px',
          margin: '0 auto',
          background: '#fff',
          color: '#000',
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: '12px',
          lineHeight: '1.4',
          padding: '20px 16px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' }}>MÉRA HAUSE</div>
          <div style={{ fontSize: '11px', color: '#444' }}>COFFEE & REFRESHMENT</div>
          <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>Jl. Méra Hause No. 1, Kota</div>
        </div>

        <div style={{ borderTop: '1px dashed #444', margin: '8px 0' }} />

        {/* Order Details */}
        <div style={{ fontSize: '11px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>No Order:</span>
            <span style={{ fontWeight: 'bold' }}>{order.order_number}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Waktu:</span>
            <span>{new Date(order.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Tipe:</span>
            <span>
              {order.order_type === 'DINE_IN' ? 'Dine In' : 'Takeaway'}
              {order.table_number ? ` (Meja ${order.table_number})` : ''}
            </span>
          </div>
          {order.customer_name && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Pelanggan:</span>
              <span>{order.customer_name}</span>
            </div>
          )}
          {order.cashier_name && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Kasir:</span>
              <span>{order.cashier_name}</span>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid #000', margin: '8px 0' }} />

        {/* Item List */}
        <div style={{ marginBottom: '8px' }}>
          {items.map((item, idx) => (
            <div key={item.id || idx} style={{ marginBottom: '6px' }}>
              <div style={{ fontWeight: '600', wordBreak: 'break-word' }}>{item.product_name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px', color: '#333' }}>
                <span>
                  {item.quantity} x @{item.price.toLocaleString('id-ID')}
                </span>
                <span>Rp {item.subtotal.toLocaleString('id-ID')}</span>
              </div>
              {item.notes && (
                <div style={{ paddingLeft: '8px', fontSize: '10px', color: '#666', fontStyle: 'italic' }}>
                  * {item.notes}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px dashed #444', margin: '8px 0' }} />

        {/* Financial Summary */}
        <div style={{ fontSize: '11px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span>Subtotal:</span>
            <span>Rp {order.subtotal.toLocaleString('id-ID')}</span>
          </div>
          {order.discount_amount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: '#c00' }}>
              <span>Diskon:</span>
              <span>-Rp {order.discount_amount.toLocaleString('id-ID')}</span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 'bold',
              fontSize: '13px',
              borderTop: '1px solid #000',
              paddingTop: '4px',
              marginTop: '4px',
            }}
          >
            <span>TOTAL:</span>
            <span>Rp {order.total_amount.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div style={{ borderTop: '1px dashed #444', margin: '8px 0' }} />

        {/* Payment Summary */}
        <div style={{ fontSize: '11px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Metode Bayar:</span>
            <span style={{ fontWeight: 'bold' }}>{order.payment_method || 'CASH'}</span>
          </div>
          {order.payment_method === 'CASH' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Uang Diterima:</span>
                <span>Rp {order.cash_tendered.toLocaleString('id-ID')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                <span>Kembalian:</span>
                <span>Rp {order.change_amount.toLocaleString('id-ID')}</span>
              </div>
            </>
          )}
        </div>

        <div style={{ borderTop: '1px dashed #444', margin: '8px 0' }} />

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '10px', color: '#555', marginTop: '10px' }}>
          <div>Terima kasih atas kunjungan Anda!</div>
          <div style={{ marginTop: '2px' }}>Follow IG: @merahause</div>
          <div style={{ marginTop: '4px', fontSize: '9px', color: '#888' }}>
            Powered by Méra OS FreeKasir
          </div>
        </div>
      </div>
    </>
  )
}
