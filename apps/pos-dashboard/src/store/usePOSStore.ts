import { create } from 'zustand'

export type BookingStatus = 'PENDING' | 'VERIFIED' | 'PROCESSED' | 'PAID' | 'CANCELLED';
export type BookingType = 'OTS' | 'KEEP_SLOT' | 'QRIS';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export type Booking = {
  id: string;
  session_id: string | null;
  customer_name: string;
  instagram_username: string | null;
  studio_type: string;
  booking_time: string;
  status: BookingStatus;
  booking_type: BookingType;
  payment_status: PaymentStatus;
  total_amount: number;
  expired_at: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: 'package' | 'addon';
  price: number;
  duration_minutes: number;
}

interface POSState {
  // Global Data
  bookings: Booking[];
  products: Product[];
  
  // Selection State
  selectedBookingId: string | null;
  cart: Product[];
  
  // UI State
  viewMode: 'NEW_TRANSACTION' | 'EXISTING_BOOKING';
  
  // Actions
  setBookings: (bookings: Booking[]) => void;
  setProducts: (products: Product[]) => void;
  selectBooking: (id: string | null) => void;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  setViewMode: (mode: 'NEW_TRANSACTION' | 'EXISTING_BOOKING') => void;
  updateBooking: (id: string, updates: Partial<Booking>) => void;
  updateBookingStatus: (id: string, status: BookingStatus) => void;
}

export const usePOSStore = create<POSState>((set) => ({
  bookings: [],
  products: [],
  selectedBookingId: null,
  cart: [],
  viewMode: 'NEW_TRANSACTION',

  setBookings: (bookings: Booking[]) => set({ bookings }),
  setProducts: (products: Product[]) => set({ products }),
  selectBooking: (id: string | null) => set({ 
    selectedBookingId: id, 
    viewMode: id ? 'EXISTING_BOOKING' : 'NEW_TRANSACTION' 
  }),
  addToCart: (product: Product) => set((state: POSState) => ({ 
    cart: [...state.cart, product] 
  })),
  removeFromCart: (productId: string) => set((state: POSState) => ({ 
    cart: state.cart.filter((p: Product) => p.id !== productId) 
  })),
  clearCart: () => set({ cart: [] }),
  setViewMode: (mode: 'NEW_TRANSACTION' | 'EXISTING_BOOKING') => set({ viewMode: mode }),
  updateBooking: (id: string, updates: Partial<Booking>) => set((state: POSState) => ({
    bookings: state.bookings.map((b: Booking) => b.id === id ? { ...b, ...updates } : b)
  })),
  updateBookingStatus: (id: string, status: BookingStatus) => set((state: POSState) => ({
    bookings: state.bookings.map((b: Booking) => b.id === id ? { ...b, status } : b)
  })),
}));
