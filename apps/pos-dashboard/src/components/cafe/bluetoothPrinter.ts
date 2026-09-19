// =============================================================
// Méra Hause — ESC/POS Web Bluetooth Thermal Printer Driver
// Supports 58mm & 80mm standard portable Bluetooth receipt printers
// =============================================================

import type { CafeOrder } from './types'

// Known thermal printer BLE service UUIDs
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard 18F0
  '0000ffe0-0000-1000-8000-00805f9b34fb', // Standard FFE0 (HC-05/06 / GOOJPRT / Panda)
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent UART
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Posiflex / Zijiang
]

// ESC/POS Command Constants
const ESC = '\x1B'
const GS = '\x1D'

const CMD = {
  RESET: `${ESC}@`,
  ALIGN_LEFT: `${ESC}a\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_RIGHT: `${ESC}a\x02`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  TEXT_NORMAL: `${GS}!\x00`,
  TEXT_DOUBLE_HEIGHT: `${GS}!\x01`,
  TEXT_DOUBLE_WIDTH: `${GS}!\x10`,
  TEXT_LARGE: `${GS}!\x11`,
  FEED_3: '\n\n\n',
  FEED_4: '\n\n\n\n',
  CUT_PAPER: `${GS}V\x41\x00`,
}

export interface BluetoothPrinterState {
  isSupported: boolean
  isConnected: boolean
  deviceName: string | null
  error: string | null
}

export interface CafeRecapPrintData {
  dateStr: string
  printedAt: string
  cashierName: string
  orderCount: number
  totalCups: number
  omset: number
  cashTotal: number
  qrisTotal: number
  transferTotal: number
  expenseTotal: number
  cashExpenses: number
  netCashInDrawer: number
  topItems?: Array<{ name: string; qty: number; revenue: number }>
  expenses?: Array<{ keterangan: string; jumlah: number; metode_bayar: string }>
}

class BluetoothPrinterManager {
  private device: any = null
  private characteristic: any = null
  private listeners: Array<(state: BluetoothPrinterState) => void> = []

  public state: BluetoothPrinterState = {
    isSupported: typeof navigator !== 'undefined' && 'bluetooth' in navigator,
    isConnected: false,
    deviceName: null,
    error: null,
  }

  constructor() {
    // Check local storage for previously saved printer name for UI hint
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('mera_bt_printer_name')
      if (savedName) {
        this.state.deviceName = savedName
      }
    }
  }

  public subscribe(listener: (state: BluetoothPrinterState) => void) {
    this.listeners.push(listener)
    listener(this.state)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private notify() {
    this.listeners.forEach((l) => l({ ...this.state }))
  }

  public async connect(): Promise<boolean> {
    if (!this.state.isSupported) {
      this.state.error = 'Browser ini belum mendukung Web Bluetooth. Gunakan Chrome di Mac/Android.'
      this.notify()
      return false
    }

    try {
      this.state.error = null
      this.notify()

      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICES,
      })

      if (!device) return false

      this.device = device
      this.state.deviceName = device.name || 'Thermal Printer'
      if (this.state.deviceName) {
        localStorage.setItem('mera_bt_printer_name', this.state.deviceName)
      }

      device.addEventListener('gattserverdisconnected', () => {
        this.state.isConnected = false
        this.characteristic = null
        this.notify()
      })

      const server = await device.gatt.connect()

      // Search across known services for writable characteristic
      let writableChar: any = null

      for (const serviceUuid of PRINTER_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid)
          const characteristics = await service.getCharacteristics()
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              writableChar = char
              break
            }
          }
          if (writableChar) break
        } catch {
          // Continue searching other services
        }
      }

      // If still not found, try getting all services
      if (!writableChar) {
        try {
          const services = await server.getPrimaryServices()
          for (const service of services) {
            try {
              const characteristics = await service.getCharacteristics()
              for (const char of characteristics) {
                if (char.properties.write || char.properties.writeWithoutResponse) {
                  writableChar = char
                  break
                }
              }
              if (writableChar) break
            } catch {
              // skip
            }
          }
        } catch (e) {
          // ignore
        }
      }

      if (!writableChar) {
        throw new Error('Tidak menemukan port tulis (characteristic) pada printer ini.')
      }

      this.characteristic = writableChar
      this.state.isConnected = true
      this.state.error = null
      this.notify()
      return true
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        // User cancelled picker
        return false
      }
      this.state.error = err.message || 'Gagal menyambungkan printer Bluetooth'
      this.state.isConnected = false
      this.notify()
      return false
    }
  }

  public async disconnect() {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect()
    }
    this.device = null
    this.characteristic = null
    this.state.isConnected = false
    this.notify()
  }

  /**
   * Send ESC/POS commands with chunking to prevent BLE MTU buffer drop
   */
  public async writeRawBytes(bytes: Uint8Array): Promise<boolean> {
    if (!this.characteristic) {
      throw new Error('Printer Bluetooth belum terhubung.')
    }

    const chunkSize = 80 // Safe MTU chunk
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize)
      if (this.characteristic.writeValueWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(chunk)
      } else {
        await this.characteristic.writeValue(chunk)
      }
      // Brief pause between packets
      await new Promise((r) => setTimeout(r, 20))
    }
    return true
  }

  /**
   * Format receipt text to 58mm (32 chars per line)
   */
  public formatReceiptText(order: CafeOrder, lineWidth = 32): string {
    const pad = (left: string, right: string, width = lineWidth) => {
      const spaces = Math.max(1, width - left.length - right.length)
      return left + ' '.repeat(spaces) + right
    }

    const divider = '-'.repeat(lineWidth)
    const doubleDivider = '='.repeat(lineWidth)

    let out = ''
    out += CMD.RESET
    out += CMD.ALIGN_CENTER
    out += CMD.BOLD_ON
    out += CMD.TEXT_DOUBLE_HEIGHT
    out += 'MERA HAUSE\n'
    out += CMD.TEXT_NORMAL
    out += CMD.BOLD_OFF
    out += 'Coffee & Refreshment\n'
    out += 'Jl. Méra Hause No. 1, Kota\n'
    out += divider + '\n'

    // Order Info
    out += CMD.ALIGN_LEFT
    out += `No Order : ${order.order_number}\n`
    out += `Waktu    : ${new Date(order.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}\n`
    out += `Tipe     : ${order.order_type === 'DINE_IN' ? 'Dine In' : 'Takeaway'}`
    if (order.table_number) out += ` (Meja ${order.table_number})`
    out += '\n'
    if (order.customer_name) {
      out += `Customer : ${order.customer_name}\n`
    }
    if (order.cashier_name) {
      out += `Kasir    : ${order.cashier_name}\n`
    }
    out += doubleDivider + '\n'

    // Items
    const items = order.items ?? []
    for (const item of items) {
      const nameLine = `${item.product_name}`
      const qtyPrice = `${item.quantity}x @${item.price.toLocaleString('id-ID')}`
      const sub = `Rp ${item.subtotal.toLocaleString('id-ID')}`
      out += `${nameLine}\n`
      out += pad(`  ${qtyPrice}`, sub) + '\n'
      if (item.notes) {
        out += `  * ${item.notes}\n`
      }
    }

    out += divider + '\n'

    // Totals
    out += pad('Subtotal:', `Rp ${order.subtotal.toLocaleString('id-ID')}`) + '\n'
    if (order.discount_amount > 0) {
      out += pad('Diskon:', `-Rp ${order.discount_amount.toLocaleString('id-ID')}`) + '\n'
    }

    out += CMD.BOLD_ON
    out += pad('TOTAL:', `Rp ${order.total_amount.toLocaleString('id-ID')}`) + '\n'
    out += CMD.BOLD_OFF

    out += divider + '\n'

    // Payment Info
    out += pad('Metode:', order.payment_method || 'CASH') + '\n'
    if (order.payment_method === 'CASH') {
      out += pad('Tunai:', `Rp ${order.cash_tendered.toLocaleString('id-ID')}`) + '\n'
      out += pad('Kembalian:', `Rp ${order.change_amount.toLocaleString('id-ID')}`) + '\n'
    }

    out += divider + '\n'
    out += CMD.ALIGN_CENTER
    out += 'Terima kasih atas kunjungan Anda!\n'
    out += 'Follow IG: @merahause\n'
    out += CMD.FEED_4
    out += CMD.CUT_PAPER

    return out
  }

  /**
   * Main print method called after checkout
   */
  public async printReceipt(order: CafeOrder): Promise<{ success: boolean; method: 'bluetooth' | 'browser' | 'none'; message: string }> {
    // If bluetooth printer is connected, print directly via BLE!
    if (this.state.isConnected && this.characteristic) {
      try {
        const text = this.formatReceiptText(order)
        const encoder = new TextEncoder()
        const bytes = encoder.encode(text)
        await this.writeRawBytes(bytes)
        return {
          success: true,
          method: 'bluetooth',
          message: `Struk berhasil dicetak ke printer Bluetooth (${this.state.deviceName})!`,
        }
      } catch (err: any) {
        console.error('Bluetooth print failed, falling back to browser print:', err)
      }
    }

    // Fallback: Trigger browser thermal print
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.print()
      }, 200)
      return {
        success: true,
        method: 'browser',
        message: 'Printer Bluetooth belum tersambung. Membuka dialog cetak struk sistem...',
      }
    }

    return {
      success: false,
      method: 'none',
      message: 'Tidak ada printer yang tersedia.',
    }
  }

  /**
   * Format closing financial recap text to 58mm (32 chars per line)
   */
  public formatRecapText(recap: CafeRecapPrintData, lineWidth = 32): string {
    const pad = (left: string, right: string, width = lineWidth) => {
      const spaces = Math.max(1, width - left.length - right.length)
      return left + ' '.repeat(spaces) + right
    }

    const divider = '-'.repeat(lineWidth)
    const doubleDivider = '='.repeat(lineWidth)

    let out = ''
    out += CMD.RESET
    out += CMD.ALIGN_CENTER
    out += CMD.BOLD_ON
    out += CMD.TEXT_DOUBLE_HEIGHT
    out += 'MERA HAUSE\n'
    out += CMD.TEXT_NORMAL
    out += CMD.BOLD_OFF
    out += 'LAPORAN CLOSING KEUANGAN\n'
    out += doubleDivider + '\n'

    out += CMD.ALIGN_LEFT
    out += `Tanggal : ${recap.dateStr}\n`
    out += `Waktu   : ${recap.printedAt}\n`
    out += `Kasir   : ${recap.cashierName}\n`
    out += divider + '\n'

    out += CMD.BOLD_ON
    out += 'RINGKASAN PENJUALAN\n'
    out += CMD.BOLD_OFF
    out += pad('Total Pesanan:', `${recap.orderCount} trx`) + '\n'
    out += pad('Total Cup:', `${recap.totalCups} cup`) + '\n'
    out += divider + '\n'

    out += pad('Omset Tunai:', `Rp ${recap.cashTotal.toLocaleString('id-ID')}`) + '\n'
    out += pad('Omset Non-Tunai:', `Rp ${(recap.qrisTotal + recap.transferTotal).toLocaleString('id-ID')}`) + '\n'
    out += CMD.BOLD_ON
    out += pad('TOTAL OMSET:', `Rp ${recap.omset.toLocaleString('id-ID')}`) + '\n'
    out += CMD.BOLD_OFF
    out += divider + '\n'

    out += CMD.BOLD_ON
    out += 'KAS LACI (CASH DRAWER)\n'
    out += CMD.BOLD_OFF
    out += pad('Kas Masuk (Tunai):', `Rp ${recap.cashTotal.toLocaleString('id-ID')}`) + '\n'
    out += pad('Pengeluaran Kas:', `-Rp ${recap.cashExpenses.toLocaleString('id-ID')}`) + '\n'
    out += CMD.BOLD_ON
    out += pad('FISIK LACI BERSIH:', `Rp ${recap.netCashInDrawer.toLocaleString('id-ID')}`) + '\n'
    out += CMD.BOLD_OFF
    out += divider + '\n'

    if (recap.topItems && recap.topItems.length > 0) {
      out += CMD.BOLD_ON
      out += 'MENU TERJUAL (TOP)\n'
      out += CMD.BOLD_OFF
      for (const item of recap.topItems.slice(0, 10)) {
        out += `${item.name}\n`
        out += pad(`  ${item.qty} cup`, `Rp ${item.revenue.toLocaleString('id-ID')}`) + '\n'
      }
      out += divider + '\n'
    }

    if (recap.expenses && recap.expenses.length > 0) {
      out += CMD.BOLD_ON
      out += 'RINCIAN BELANJA KASIR\n'
      out += CMD.BOLD_OFF
      for (const exp of recap.expenses) {
        out += `${exp.keterangan}\n`
        out += pad(`  [${exp.metode_bayar}]`, `-Rp ${exp.jumlah.toLocaleString('id-ID')}`) + '\n'
      }
      out += divider + '\n'
    }

    out += CMD.ALIGN_CENTER
    out += '\n\nTtd Kasir           Ttd SPV/Owner\n\n\n'
    out += '(.............)     (.............)\n'
    out += CMD.FEED_4
    out += CMD.CUT_PAPER

    return out
  }

  /**
   * Print closing financial recap
   */
  public async printRecap(recap: CafeRecapPrintData): Promise<{ success: boolean; method: 'bluetooth' | 'browser' | 'none'; message: string }> {
    if (this.state.isConnected && this.characteristic) {
      try {
        const text = this.formatRecapText(recap)
        const encoder = new TextEncoder()
        const bytes = encoder.encode(text)
        await this.writeRawBytes(bytes)
        return {
          success: true,
          method: 'bluetooth',
          message: `Laporan closing berhasil dicetak ke Bluetooth (${this.state.deviceName})!`,
        }
      } catch (err: any) {
        console.error('Bluetooth recap print failed, falling back to browser print:', err)
      }
    }

    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.print()
      }, 200)
      return {
        success: true,
        method: 'browser',
        message: 'Membuka dialog cetak laporan sistem...',
      }
    }

    return {
      success: false,
      method: 'none',
      message: 'Tidak ada printer yang tersedia.',
    }
  }
}

export const bluetoothPrinter = new BluetoothPrinterManager()
