import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

interface QueuedOp {
  id: string;
  table: string;
  type: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  match: Record<string, unknown>;
  ts: number;
}

const QUEUE_KEY = 'dawaa_offline_queue';

export function getOfflineQueue(): QueuedOp[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function enqueueOfflineOp(op: Omit<QueuedOp, 'id' | 'ts'>): void {
  const queue = getOfflineQueue();
  queue.push({ ...op, id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, ts: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function flushOfflineQueue(): Promise<number> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;
  let flushed = 0;
  const remaining: QueuedOp[] = [];
  for (const op of queue) {
    try {
      if (op.type === 'insert') {
        await supabase.from(op.table).insert(op.data);
      } else if (op.type === 'update') {
        let query = supabase.from(op.table).update(op.data);
        for (const [k, v] of Object.entries(op.match)) {
          query = query.eq(k, v) as typeof query;
        }
        await query;
      } else if (op.type === 'delete') {
        let query = supabase.from(op.table).delete();
        for (const [k, v] of Object.entries(op.match)) {
          query = query.eq(k, v) as typeof query;
        }
        await query;
      }
      flushed++;
    } catch {
      remaining.push(op);
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return flushed;
}
