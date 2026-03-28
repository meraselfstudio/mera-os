import React, { useState } from 'react';
import { usePOSStore, type Booking } from '../../store/usePOSStore';
import { 
  CreditCard, 
  Banknote, 
  Copy, 
  ExternalLink, 
  CheckCircle2, 
  Instagram, 
  Link as LinkIcon,
  ShoppingBag,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CheckoutTerminal: React.FC = () => {
  const { cart, selectedBookingId, bookings, removeFromCart, updateBooking } = usePOSStore();
  const selectedBooking = bookings.find((b: Booking) => b.id === selectedBookingId);
  const [gdriveLink, setGdriveLink] = useState('');

  const cartTotal = cart.reduce((sum: number, item: any) => sum + item.price, 0);
  const totalToPay = selectedBooking ? selectedBooking.total_amount : cartTotal;

  const generateSessionId = (booking: Booking) => {
    const date = format(new Date(), 'yyMMdd');
    const type = booking.studio_type.substring(0, 3).toUpperCase();
    const nameParts = (booking.customer_name || 'NONAME').split(' ');
    const initials = nameParts.length > 1 
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : nameParts[0].substring(0, 2).toUpperCase();
    return `${date}-${type}-${initials}`;
  };

  const handlePayment = () => {
    if (!selectedBookingId) return;
    updateBooking(selectedBookingId, { 
      payment_status: 'PAID',
      status: 'PAID'
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleInstagramHandoff = () => {
    if (!selectedBooking || !gdriveLink) return;
    const template = `Halo Kak ${selectedBooking.customer_name}! Terima kasih sudah mampir ke Méra SelfStudio. Berikut link foto-foto kamu ya:\n\n${gdriveLink}\n\nDitunggu kedatangan berikutnya! ✨`;
    copyToClipboard(template);
    window.open(`https://ig.me/m/${selectedBooking.instagram_username}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Transaction Summary */}
      <div className="flex-1 flex flex-col space-y-6">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-white/40" />
                <span className="text-[10px] uppercase font-black tracking-[0.2em] text-white/40">Checkout Terminal</span>
            </div>
            {selectedBooking?.payment_status === 'PAID' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/50">
                    <CheckCircle2 size={12} className="text-green-500" />
                    <span className="text-[10px] font-black text-green-500 uppercase">Paid</span>
                </div>
            )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
            {selectedBooking ? (
                <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 shadow-lg group">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-xs font-black text-maroon-500 uppercase tracking-widest block mb-1">{selectedBooking.studio_type}</span>
                            <h3 className="text-lg font-black tracking-tight underline decoration-maroon-500/30 decoration-4 underline-offset-4">Studio Session</h3>
                        </div>
                        <span className="font-mono font-black text-lg">Rp{selectedBooking.total_amount.toLocaleString()}</span>
                    </div>
                </div>
            ) : (
                cart.map((item: any, idx: number) => (
                    <div key={`${item.id}-${idx}`} className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/10 group hover:border-white/30 transition-all">
                        <div>
                           <span className="text-[10px] text-white/30 font-bold uppercase block">{item.category}</span>
                           <span className="text-sm font-bold tracking-tight">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="font-mono font-bold text-sm">Rp{item.price.toLocaleString()}</span>
                            <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))
            )}
            {!selectedBooking && cart.length === 0 && (
                <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] gap-4">
                    <ShoppingBag size={48} className="text-white/5" />
                    <span className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em]">Waiting for order...</span>
                </div>
            )}
        </div>

        <div className="pt-6 border-t border-white/10">
            <div className="flex justify-between items-end mb-8 px-2">
                <div className="flex flex-col">
                   <span className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1">Total Amount</span>
                   <span className="text-4xl font-black font-mono tracking-tighter">Rp{totalToPay.toLocaleString()}</span>
                </div>
                {totalToPay > 0 && selectedBooking?.payment_status !== 'PAID' && (
                    <div className="bg-maroon-500/10 px-3 py-1 rounded-full border border-maroon-500/30">
                        <span className="text-[10px] font-black text-maroon-500 uppercase">Unpaid</span>
                    </div>
                )}
            </div>

            {selectedBooking?.payment_status !== 'PAID' && totalToPay > 0 && (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => handlePayment()}
                            className="py-5 rounded-[1.5rem] bg-white text-black flex flex-col items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
                        >
                            <Banknote size={24} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Pay Cash</span>
                        </button>
                        <button 
                            onClick={() => handlePayment()}
                            className="py-5 rounded-[1.5rem] bg-white/5 border border-white/10 flex flex-col items-center gap-2 hover:bg-white/10 hover:border-white/30 transition-all"
                        >
                            <CreditCard size={24} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">QRIS / EDC</span>
                        </button>
                    </div>
                    
                    <button 
                        onClick={() => handlePayment()}
                        className="w-full py-6 rounded-[1.5rem] bg-green-500 text-black font-black uppercase tracking-tight flex items-center justify-center gap-3 hover:shadow-[0_20px_40px_rgba(34,197,94,0.3)] transition-all group"
                    >
                        <CheckCircle2 size={24} className="group-hover:scale-110 transition-transform" />
                        Complete Payment
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* Post-Payment Automation (Only visible if PROCESSED/PAID) */}
      {(selectedBooking?.status === 'PROCESSED' || selectedBooking?.status === 'PAID') && (
        <div className="space-y-6 pt-10 border-t-2 border-dashed border-white/10 bg-gradient-to-t from-maroon-900/10 to-transparent -mx-6 px-6 pb-6 animate-in slide-in-from-bottom-6 duration-700">
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Copy size={14} className="text-maroon-500" />
                    <span className="text-[10px] text-white/40 uppercase font-black tracking-widest">Capture One Sesi ID</span>
                </div>
                <div className="flex items-center gap-2 h-20 p-2 bg-black rounded-[2rem] border border-white/10 shadow-2xl group hover:border-maroon-500/50 transition-colors">
                    <span className="flex-1 font-mono text-3xl font-black text-center pl-4 tracking-tighter group-hover:text-maroon-500 transition-colors">{generateSessionId(selectedBooking)}</span>
                    <button 
                        onClick={() => copyToClipboard(generateSessionId(selectedBooking))}
                        className="w-16 h-16 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all group-hover:scale-[1.05]"
                    >
                        <Copy size={24} />
                    </button>
                </div>
            </div>

            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2">
                    <Instagram size={14} className="text-pink-500" />
                    <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">Handoff Delivery</span>
                </div>
                <div className="relative group">
                    <LinkIcon size={18} className="absolute left-5 top-5 text-white/20 group-focus-within:text-maroon-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Paste Google Drive Link..." 
                        value={gdriveLink}
                        onChange={(e) => setGdriveLink(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-2xl py-5 pl-14 pr-4 text-sm font-bold focus:outline-none focus:border-maroon-500 focus:bg-black transition-all shadow-inner"
                    />
                </div>
                <button 
                    disabled={!gdriveLink}
                    onClick={handleInstagramHandoff}
                    className="w-full py-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-20 disabled:grayscale transition-all hover:shadow-[0_15px_30px_rgba(219,39,119,0.3)] hover:-translate-y-1 active:translate-y-0"
                >
                    <Instagram size={24} />
                    Complete & Open IG
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutTerminal;
