import React, { useEffect } from 'react';
import TimelineRadar from './TimelineRadar';
import ExecutionGrid from './ExecutionGrid';
import CheckoutTerminal from './CheckoutTerminal';
import { usePOSStore } from '../../store/usePOSStore';
import type { Booking } from '../../store/usePOSStore';
import { supabase } from '@mera/supabase/client'; // Fix path based on POSGateway.tsx
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

const POSLayout: React.FC = () => {
  const { setBookings, setProducts } = usePOSStore();

  useEffect(() => {
    // 1. Initial Fetch
    const fetchData = async () => {
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*')
        .order('booking_time', { ascending: true });
      
      const { data: productsData } = await supabase
        .from('products')
        .select('*');

      if (bookingsData) setBookings(bookingsData);
      if (productsData) setProducts(productsData);
    };

    fetchData();

    // 2. Real-time Subscription
    const channel = supabase
      .channel('pos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload: RealtimePostgresChangesPayload<Booking>) => {
        console.log('Realtime update:', payload);
        fetchData(); // Simple refresh for now
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-white overflow-hidden font-sans">
      {/* Column 1: Multi-Studio Radar (Left - 35%) */}
      <aside className="w-[35%] border-r border-white/10 h-full overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 bg-[#111]">
          <h2 className="text-xl font-bold tracking-tight text-maroon-500">MÉRA RADAR</h2>
          <p className="text-xs text-white/40 uppercase tracking-widest">Multi-Studio Timeline</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <TimelineRadar />
        </div>
      </aside>

      {/* Column 2: Execution & POS (Middle - 40%) */}
      <main className="w-[40%] border-r border-white/10 h-full flex flex-col bg-[#0f0f0f]">
        <div className="p-4 border-b border-white/10 bg-[#111] flex justify-between items-center">
            <div>
                <h2 className="text-xl font-bold tracking-tight">EXECUTION</h2>
                <p className="text-xs text-white/40 uppercase tracking-widest">Session Management</p>
            </div>
            <div className="flex gap-2">
                {/* Mode Toggles could go here */}
            </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <ExecutionGrid />
        </div>
      </main>

      {/* Column 3: Terminal Checkout & Handoff (Right - 25%) */}
      <aside className="w-[25%] h-full flex flex-col bg-[#0a0a0a]">
        <div className="p-4 border-b border-white/10 bg-[#111]">
          <h2 className="text-xl font-bold tracking-tight">TERMINAL</h2>
          <p className="text-xs text-white/40 uppercase tracking-widest">Checkout & Handoff</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <CheckoutTerminal />
        </div>
      </aside>
    </div>
  );
};

export default POSLayout;
