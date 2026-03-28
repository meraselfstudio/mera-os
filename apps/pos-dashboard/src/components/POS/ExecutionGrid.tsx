import React from 'react';
import { usePOSStore, type Product, type Booking } from '../../store/usePOSStore';
import { Package, Plus, Play, User, Instagram, Calendar, Tag, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ExecutionGrid: React.FC = () => {
  const { viewMode, selectedBookingId, bookings, products, addToCart, selectBooking, updateBookingStatus, setViewMode } = usePOSStore();
  const [activeTab, setActiveTab] = React.useState<'packages' | 'addons'>('packages');
  const selectedBooking = bookings.find((b: Booking) => b.id === selectedBookingId);

  const handleStartSession = async () => {
    if (!selectedBookingId) return;
    updateBookingStatus(selectedBookingId, 'PROCESSED');
    // Here we would also sync to Supabase
  };

  if (viewMode === 'EXISTING_BOOKING' && selectedBooking) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Customer Header */}
        <div className="p-10 rounded-[3rem] bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-maroon-500/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
          
          <div className="relative flex items-center gap-8 mb-10">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-maroon-500 to-red-600 flex items-center justify-center shadow-[0_20px_40px_rgba(94,34,34,0.4)]">
              <User size={48} className="text-white" />
            </div>
            <div>
              <span className="text-xs font-black text-maroon-500 uppercase tracking-[0.3em] mb-2 block">Active Booking</span>
              <h1 className="text-5xl font-black tracking-tighter leading-none">{selectedBooking.customer_name}</h1>
              <div className="flex items-center gap-3 mt-4 text-white/50">
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                      <Instagram size={14} className="text-pink-500/60" />
                      <span className="text-sm font-bold lowercase">@{selectedBooking.instagram_username || 'anon'}</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                      <Calendar size={14} className="text-blue-500/60" />
                      <span className="text-sm font-bold">{format(parseISO(selectedBooking.booking_time), 'HH:mm')}</span>
                  </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 relative">
             <div className="p-5 rounded-[2rem] bg-black/40 border border-white/5">
                <span className="text-[10px] text-white/30 uppercase font-black tracking-widest block mb-2">Studio</span>
                <span className="text-xl font-black italic">{selectedBooking.studio_type}</span>
             </div>
             <div className="p-5 rounded-[2rem] bg-black/40 border border-white/5">
                <span className="text-[10px] text-white/30 uppercase font-black tracking-widest block mb-2">Method</span>
                <span className="text-xl font-black">{selectedBooking.booking_type}</span>
             </div>
             <div className="p-5 rounded-[2rem] bg-black/40 border border-white/5 flex flex-col items-center justify-center">
                <span className="text-[10px] text-white/30 uppercase font-black tracking-widest block mb-2">Status</span>
                <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black tracking-tighter uppercase border",
                    selectedBooking.status === 'PENDING' ? "border-blue-500 text-blue-400 bg-blue-500/10" : 
                    selectedBooking.status === 'VERIFIED' ? "border-orange-500 text-orange-400 bg-orange-500/10" :
                    "border-green-500 text-green-400 bg-green-500/10"
                )}>
                    {selectedBooking.status}
                </div>
             </div>
          </div>
        </div>

        {/* Execution Action */}
        {selectedBooking.status !== 'PROCESSED' && selectedBooking.status !== 'PAID' ? (
            <button 
              className="w-full py-12 rounded-[3.5rem] bg-white text-black font-black text-3xl tracking-tighter hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-6 shadow-[0_30px_60px_rgba(255,255,255,0.1)] group"
              onClick={handleStartSession}
            >
              <Play fill="black" size={40} className="group-hover:translate-x-2 transition-transform" />
              BUKA SESI EKSEKUSI FOTO
            </button>
        ) : (
            <div className="w-full py-12 rounded-[3.5rem] bg-green-500/10 border-2 border-dashed border-green-500/30 flex flex-col items-center justify-center gap-3">
                <CheckCircle2 size={48} className="text-green-500" />
                <span className="text-xl font-black text-green-500 uppercase tracking-widest">Sesi Sedang Berlangsung</span>
            </div>
        )}

        <button 
           onClick={() => selectBooking(null)}
           className="w-full py-4 text-white/20 hover:text-white/40 transition-colors uppercase text-[10px] font-black tracking-[0.3em]"
        >
          ← Kembali ke Radar Dashboard
        </button>
      </div>
    );
  }

  // Mode A: New Transaction / Packages
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
        <button 
            onClick={() => setActiveTab('packages')}
            className={cn(
                "flex-1 py-4 px-6 rounded-xl font-black text-sm tracking-widest transition-all flex items-center gap-3 justify-center",
                activeTab === 'packages' ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white"
            )}
        >
            <Tag size={18} />
            PACKAGES
        </button>
        <button 
            onClick={() => setActiveTab('addons')}
            className={cn(
                "flex-1 py-4 px-6 rounded-xl font-black text-sm tracking-widest transition-all flex items-center gap-3 justify-center",
                activeTab === 'addons' ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white"
            )}
        >
            <Plus size={18} />
            ADD-ONS
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6 pb-20">
        {products
          .filter((p: Product) => activeTab === 'packages' ? p.category === 'package' : p.category === 'addon')
          .map((product: Product) => (
          <button
            key={product.id}
            onClick={() => addToCart(product)}
            className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-white/40 hover:bg-white/[0.08] transition-all text-left flex flex-col justify-between h-56 group relative overflow-hidden"
          >
            <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity rotate-12">
                {activeTab === 'packages' ? <Package size={140} /> : <Plus size={140} />}
            </div>
            
            <div>
                <span className="text-[10px] font-black text-maroon-500 uppercase tracking-[0.2em] mb-2 block">{product.category}</span>
                <h3 className="text-3xl font-black tracking-tighter leading-[0.9] mb-2">{product.name}</h3>
                {product.duration_minutes > 0 && (
                    <span className="text-[11px] font-bold text-white/30 uppercase tracking-widest">{product.duration_minutes} Minutes SESSION</span>
                )}
            </div>
            
            <div className="flex items-end justify-between">
                <div className="flex flex-col">
                    <span className="text-[10px] text-white/30 font-bold uppercase mb-1">Price</span>
                    <span className="text-2xl font-black font-mono tracking-tighter">Rp{(product.price/1000).toFixed(0)}k</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all group-hover:rotate-90 group-hover:shadow-[0_10px_30px_rgba(255,255,255,0.2)]">
                    <Plus size={24} />
                </div>
            </div>
          </button>
        ))}
        
        {/* Empty State placeholder if needed */}
      </div>
    </div>
  );
};

export default ExecutionGrid;
