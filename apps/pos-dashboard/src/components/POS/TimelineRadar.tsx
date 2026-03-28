import React, { useEffect, useState } from 'react';
import { usePOSStore } from '../../store/usePOSStore';
import type { Product, Booking } from '../../store/usePOSStore';
import { format, addHours, startOfDay, eachHourOfInterval, isWithinInterval, parseISO } from 'date-fns';
import { Clock, User, Instagram, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STUDIOS = [
  { id: 'BASIC', name: 'Basic Studio', color: 'blue' },
  { id: 'MAJESTIC', name: 'Majestic Studio', color: 'maroon' },
  { id: 'ELEVATOR', name: 'Elevator Studio', color: 'maroon' },
];

const HOURS = eachHourOfInterval({
  start: new Date(new Date().setHours(10, 0, 0, 0)),
  end: new Date(new Date().setHours(22, 0, 0, 0)),
});


const TimelineRadar: React.FC = () => {
  const { bookings, selectBooking, selectedBookingId } = usePOSStore();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getBookingStyle = (booking: Booking) => {
    const start = parseISO(booking.booking_time);
    const duration = 50; // Set to 50min to leave gap? Or 60? 
    const top = (start.getHours() - 10) * 80 + (start.getMinutes() / 60) * 80;
    const height = (duration / 60) * 80;
    return { top: `${top}px`, height: `${height}px` };
  };

  const getStatusColor = (booking: Booking, isExpiringSoon: boolean) => {
    if (isExpiringSoon) return 'bg-orange-500/30 border-orange-500 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.4)] animate-pulse';
    
    switch (booking.status) {
      case 'PENDING': return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
      case 'VERIFIED': return 'bg-orange-500/20 border-orange-500/50 text-orange-400';
      case 'PROCESSED': return 'bg-green-500/20 border-green-500/50 text-green-400';
      case 'PAID': return 'bg-gray-500/20 border-white/20 text-white/40 strike-through opacity-60';
      default: return 'bg-white/5 border-white/10 text-white/40';
    }
  };

  const getCountdown = (expiredAt: string | null) => {
    if (!expiredAt) return null;
    const exp = parseISO(expiredAt).getTime();
    const diff = exp - now.getTime();
    if (diff <= 0) return 'EXPIRED';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="relative flex flex-col h-full bg-[#0a0a0a]">
      {/* Studio Headers */}
      <div className="flex border-b border-white/10 bg-[#111] sticky top-0 z-20">
        <div className="w-16 flex-shrink-0" />
        <div className="flex-1 py-3 text-center border-l border-white/5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Basic Studio</span>
        </div>
        <div className="flex-[2] flex border-l border-white/10">
          <div className="absolute top-0 left-[33%] right-0 h-full text-center pointer-events-none border-b border-white/5 bg-maroon-900/10">
             <span className="text-[8px] font-black italic uppercase tracking-[0.3em] text-maroon-500 pt-1 block">Thematic Area (Shared System)</span>
          </div>
          {STUDIOS.slice(1).map((studio) => (
            <div key={studio.id} className="flex-1 py-3 pt-5 text-center border-l border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">{studio.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="relative flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex min-h-[1000px]">
          {/* Time Labels */}
          <div className="w-16 flex-shrink-0 border-r border-white/10 bg-[#0a0a0a] sticky left-0 z-10">
            {HOURS.map((hour: Date) => (
              <div key={hour.toString()} className="h-20 flex items-start justify-center pt-2">
                <span className="text-[10px] font-mono font-bold text-white/30">{format(hour, 'HH:00')}</span>
              </div>
            ))}
          </div>

          {/* Columns */}
          <div className="flex-1 flex relative">
            {STUDIOS.map((studio) => {
              const isThematic = studio.id !== 'BASIC';
              return (
              <div key={studio.id} className={cn(
                "flex-1 border-l border-white/5 relative",
                isThematic && "bg-maroon-500/[0.02]"
              )}>
                {/* Grid Lines */}
                {HOURS.map((hour: Date) => (
                  <div key={hour.toString()} className="h-20 border-b border-white/[0.03]" />
                ))}

                {/* Bookings */}
                {bookings
                  .filter((b: Booking) => b.studio_type === studio.id || (studio.id === 'BASIC' && b.studio_type === 'PAS_PHOTO'))
                  .map((booking: Booking) => {
                    const isSelected = selectedBookingId === booking.id;
                    const isExpiringSoon = !!(booking.booking_type === 'KEEP_SLOT' && 
                                          booking.status === 'PENDING' && 
                                          booking.expired_at && 
                                          (parseISO(booking.expired_at).getTime() - now.getTime()) < 3600000);

                    return (
                      <div
                        key={booking.id}
                        onClick={() => selectBooking(booking.id)}
                        style={getBookingStyle(booking)}
                        className={cn(
                          "absolute inset-x-1.5 rounded-xl border p-3 cursor-pointer transition-all duration-300 group overflow-hidden z-10",
                          getStatusColor(booking, isExpiringSoon),
                          isSelected && "ring-2 ring-white scale-[1.02] shadow-[0_20px_40px_rgba(0,0,0,0.5)] z-30",
                          booking.payment_status === 'PAID' && "grayscale-[0.5]"
                        )}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black uppercase tracking-tight truncate leading-none mb-1">{booking.customer_name}</span>
                            <div className="flex items-center gap-1.5 text-[9px] font-bold opacity-60">
                              <div className={cn("w-1.5 h-1.5 rounded-full", booking.payment_status === 'PAID' ? "bg-green-500" : "bg-red-500")} />
                              <span className="font-mono">{booking.payment_status}</span>
                            </div>
                          </div>
                          {isExpiringSoon && <AlertCircle size={14} className="text-orange-500" />}
                        </div>

                        {booking.booking_type === 'KEEP_SLOT' && booking.status === 'PENDING' && (
                            <div className="mt-1 mb-2 px-2 py-1 rounded-md bg-black/40 border border-white/10 flex items-center justify-between">
                                <span className="text-[8px] font-black text-white/40 uppercase">Expiry</span>
                                <span className="text-[9px] font-mono font-black text-orange-500">{getCountdown(booking.expired_at)}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between mt-auto">
                           <div className="flex items-center gap-1 text-[10px] font-bold opacity-60">
                             <Clock size={10} />
                             <span>{format(parseISO(booking.booking_time), 'HH:mm')}</span>
                           </div>
                           <div className="text-[8px] font-black bg-white/10 rounded-full px-2 py-0.5 tracking-tighter">
                             {booking.booking_type}
                           </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
              )
            })}

            {/* Current Time Indicator */}
            <div 
              className="absolute left-0 right-0 border-t-2 border-red-500/60 z-40 pointer-events-none flex items-center"
              style={{ top: `${(now.getHours() - 10) * 80 + (now.getMinutes() / 60) * 80}px` }}
            >
              <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5 shadow-[0_0_10px_rgba(239,68,68,1)]" />
              <div className="ml-2 bg-red-500 text-white text-[8px] font-bold px-1.5 rounded-sm shadow-lg">
                {format(now, 'HH:mm')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineRadar;
