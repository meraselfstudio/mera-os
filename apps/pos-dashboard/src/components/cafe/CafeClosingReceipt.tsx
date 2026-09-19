import React from 'react'
import type { CafeRecapPrintData } from './bluetoothPrinter'

interface CafeClosingReceiptProps {
  recap: CafeRecapPrintData
}

export const CafeClosingReceipt: React.FC<CafeClosingReceiptProps> = ({ recap }) => {
  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #cafe-thermal-closing-container,
          #cafe-thermal-closing-container * {
            visibility: visible;
          }
          #cafe-thermal-closing-container {
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
        id="cafe-thermal-closing-container"
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
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' }}>MÉRA HAUSE</div>
          <div style={{ fontSize: '11px', color: '#444' }}>COFFEE & REFRESHMENT</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '6px', borderTop: '1px double #000', borderBottom: '1px double #000', padding: '3px 0' }}>
            LAPORAN CLOSING KASIR
          </div>
        </div>

        {/* Info */}
        <div style={{ fontSize: '11px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Tanggal:</span>
            <span style={{ fontWeight: 'bold' }}>{recap.dateStr}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Waktu:</span>
            <span>{recap.printedAt}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Kasir:</span>
            <span style={{ fontWeight: 'bold' }}>{recap.cashierName}</span>
          </div>
        </div>

        <div style={{ borderTop: '1px dashed #444', margin: '8px 0' }} />

        {/* Sales Summary */}
        <div style={{ fontSize: '11px', marginBottom: '8px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>RINGKASAN PENJUALAN:</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Pesanan:</span>
            <span>{recap.orderCount} transaksi</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Cup Terjual:</span>
            <span style={{ fontWeight: 'bold' }}>{recap.totalCups} cup</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span>Omset Tunai (Cash):</span>
            <span>Rp {recap.cashTotal.toLocaleString('id-ID')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Omset Non-Tunai:</span>
            <span>Rp {(recap.qrisTotal + recap.transferTotal).toLocaleString('id-ID')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '4px', fontSize: '12px' }}>
            <span>TOTAL OMSET:</span>
            <span>Rp {recap.omset.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div style={{ borderTop: '1px dashed #444', margin: '8px 0' }} />

        {/* Cash Register Reconciliation */}
        <div style={{ fontSize: '11px', marginBottom: '8px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>REKONSILIASI KAS LACI:</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Kas Tunai Masuk:</span>
            <span>Rp {recap.cashTotal.toLocaleString('id-ID')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
            <span>Pengeluaran Kas:</span>
            <span>-Rp {recap.cashExpenses.toLocaleString('id-ID')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '4px', padding: '4px 0', borderTop: '1px solid #000', fontSize: '13px' }}>
            <span>KAS FISIK LACI:</span>
            <span>Rp {recap.netCashInDrawer.toLocaleString('id-ID')}</span>
          </div>
          <div style={{ fontSize: '10px', color: '#555', fontStyle: 'italic', marginTop: '2px' }}>
            *Uang fisik di laci kasir wajib sesuai nominal ini saat serah terima.
          </div>
        </div>

        {/* Top Items (if any) */}
        {recap.topItems && recap.topItems.length > 0 && (
          <>
            <div style={{ borderTop: '1px dashed #444', margin: '8px 0' }} />
            <div style={{ fontSize: '11px', marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>MENU TERLARIS HARI INI:</div>
              {recap.topItems.slice(0, 8).map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {idx + 1}. {item.name}
                  </span>
                  <span>{item.qty} cup</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Expenses details (if any) */}
        {recap.expenses && recap.expenses.length > 0 && (
          <>
            <div style={{ borderTop: '1px dashed #444', margin: '8px 0' }} />
            <div style={{ fontSize: '11px', marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>RINCIAN PENGELUARAN:</div>
              {recap.expenses.map((exp, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    • {exp.keterangan} ({exp.metode_bayar})
                  </span>
                  <span>-Rp {exp.jumlah.toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Signatures */}
        <div style={{ borderTop: '1px dashed #444', margin: '14px 0 10px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: '10px', marginTop: '10px' }}>
          <div>
            <div>Kasir</div>
            <div style={{ height: '35px' }} />
            <div>( {recap.cashierName} )</div>
          </div>
          <div>
            <div>Supervisor / Owner</div>
            <div style={{ height: '35px' }} />
            <div>( ................. )</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '9px', color: '#666', marginTop: '14px' }}>
          Dicetak otomatis oleh Méra OS FreeKasir
        </div>
      </div>
    </>
  )
}
