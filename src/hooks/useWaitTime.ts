import { useState, useEffect, useCallback } from 'react';
import { supabase, type Department } from '@/lib/supabase';

export type WaitLevel = 'green' | 'yellow' | 'red' | 'none';

export interface WaitTimeInfo {
  minutes: number;
  label: string;
  level: WaitLevel;
  occupancyPct: number;
}

export function calcWaitTime(dept: Pick<Department, 'current_queue_count' | 'avg_service_time_minutes' | 'department_capacity'>): WaitTimeInfo {
  const queue = dept.current_queue_count ?? 0;
  const serviceTime = dept.avg_service_time_minutes ?? 15;
  const capacity = dept.department_capacity ?? 20;

  const minutes = queue * serviceTime;
  const occupancyPct = capacity > 0 ? Math.min(100, Math.round((queue / capacity) * 100)) : 0;

  let level: WaitLevel = 'none';
  if (queue === 0) level = 'none';
  else if (minutes < 15) level = 'green';
  else if (minutes <= 45) level = 'yellow';
  else level = 'red';

  const label = queue === 0 ? 'دخول مباشر / لا يوجد انتظار' : `${minutes} دقيقة انتظار`;

  return { minutes, label, level, occupancyPct };
}

export function calcFacilityOccupancy(departments: Pick<Department, 'current_queue_count'>[], facilityCapacity: number): number {
  const totalQueue = departments.reduce((s, d) => s + (d.current_queue_count ?? 0), 0);
  if (facilityCapacity <= 0) return 0;
  return Math.min(100, Math.round((totalQueue / facilityCapacity) * 100));
}

export function occupancyToStatus(occupancyPct: number): 'open' | 'busy' | 'emergency' | 'closed' {
  if (occupancyPct >= 80) return 'emergency';
  if (occupancyPct >= 40) return 'busy';
  return 'open';
}

const LEVEL_COLORS: Record<WaitLevel, string> = {
  green: 'bg-status-open/20 text-status-open border-status-open/40',
  yellow: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  red: 'bg-status-emergency/20 text-status-emergency border-status-emergency/40',
  none: 'bg-status-open/20 text-status-open border-status-open/40',
};

export function waitLevelClasses(level: WaitLevel): string {
  return LEVEL_COLORS[level];
}

export function useWaitTime(deptId: string, initial: Pick<Department, 'current_queue_count' | 'avg_service_time_minutes' | 'department_capacity'>): WaitTimeInfo & { increment: () => Promise<void>; decrement: () => Promise<void> } {
  const [queue, setQueue] = useState(initial.current_queue_count ?? 0);
  const serviceTime = initial.avg_service_time_minutes ?? 15;
  const capacity = initial.department_capacity ?? 20;

  useEffect(() => {
    setQueue(initial.current_queue_count ?? 0);
  }, [initial.current_queue_count]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`dept-${deptId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments', filter: `id=eq.${deptId}` }, (payload) => {
        const newQueue = (payload.new as Department)?.current_queue_count;
        if (typeof newQueue === 'number') setQueue(newQueue);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [deptId]);

  // Auto-decrement: every avg_service_time_minutes, reduce queue by 1
  useEffect(() => {
    if (queue <= 0 || serviceTime <= 0) return;
    const intervalMs = serviceTime * 60 * 1000;
    const timer = setInterval(() => {
      setQueue((prev) => {
        if (prev <= 0) return 0;
        const next = prev - 1;
        // Sync to DB
        supabase.from('departments').update({ current_queue_count: next, last_updated: new Date().toISOString() }).eq('id', deptId).then();
        return next;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [queue, serviceTime, deptId]);

  const increment = useCallback(async () => {
    const next = queue + 1;
    setQueue(next);
    await supabase.from('departments').update({ current_queue_count: next, last_updated: new Date().toISOString() }).eq('id', deptId);
  }, [queue, deptId]);

  const decrement = useCallback(async () => {
    const next = Math.max(0, queue - 1);
    setQueue(next);
    await supabase.from('departments').update({ current_queue_count: next, last_updated: new Date().toISOString() }).eq('id', deptId);
  }, [queue, deptId]);

  const minutes = queue * serviceTime;
  const occupancyPct = capacity > 0 ? Math.min(100, Math.round((queue / capacity) * 100)) : 0;

  let level: WaitLevel = 'none';
  if (queue === 0) level = 'none';
  else if (minutes < 15) level = 'green';
  else if (minutes <= 45) level = 'yellow';
  else level = 'red';

  const label = queue === 0 ? 'دخول مباشر / لا يوجد انتظار' : `${minutes} دقيقة انتظار`;

  return { minutes, label, level, occupancyPct, increment, decrement };
}
