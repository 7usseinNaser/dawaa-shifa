import { supabase } from './supabase';

const scheduledTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

function notificationPermission(): boolean {
  if (!('Notification' in window)) return false;
  return Notification.permission === 'granted';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function scheduleMedicineReminder(medId: string, medName: string, dosage: string, timeStr: string, isRTL: boolean): void {
  const key = `${medId}_${timeStr}`;
  if (scheduledTimeouts[key]) clearTimeout(scheduledTimeouts[key]);

  const now = new Date();
  const [h, m] = timeStr.split(':').map(Number);
  if (h === undefined || m === undefined) return;

  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  const delay = target.getTime() - now.getTime();

  scheduledTimeouts[key] = setTimeout(() => {
    triggerMedicineNotification(medName, dosage, isRTL);
    persistDoseReminder(medId, medName, dosage, timeStr, isRTL);
    scheduleMedicineReminder(medId, medName, dosage, timeStr, isRTL);
  }, delay);
}

export function triggerMedicineNotification(medName: string, dosage: string, isRTL: boolean): void {
  const title = isRTL ? 'حان موعد دواء' : 'Medicine Reminder';
  const body = isRTL
    ? `حان موعد دواء: ${medName}${dosage ? ' - ' + dosage : ''}`
    : `Time to take: ${medName}${dosage ? ' - ' + dosage : ''}`;

  if (notificationPermission()) {
    try {
      new Notification(title, { body, icon: '/icon-192.png' });
    } catch {
      console.warn('Notification failed');
    }
  } else {
    console.log(`[Reminder] ${title}: ${body}`);
  }
}

async function persistDoseReminder(medId: string, medName: string, dosage: string, timeStr: string, isRTL: boolean): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    // Check if already reminded today
    const { data: existing } = await supabase
      .from('dose_reminders')
      .select('id')
      .eq('user_id', user.id)
      .eq('chronic_med_id', medId)
      .eq('reminder_date', today)
      .eq('dose_time', timeStr)
      .maybeSingle();
    if (existing) return;
    await supabase.from('dose_reminders').insert({
      user_id: user.id,
      chronic_med_id: medId,
      medicine_name: medName,
      dosage: dosage || '',
      dose_time: timeStr,
      reminder_date: today,
      status: 'reminded',
    });
    // Also add to user's notification center
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'info',
      title: isRTL ? `تذكير: ${medName}` : `Reminder: ${medName}`,
      body: isRTL
        ? `حان موعد دواء: ${medName}${dosage ? ' - ' + dosage : ''}`
        : `Time to take: ${medName}${dosage ? ' - ' + dosage : ''}`,
      is_active: true,
      unread: true,
    });
  } catch (err) {
    console.error('[persistDoseReminder] Error:', err);
  }
}

export async function checkDueDoses(userId: string, isRTL: boolean): Promise<void> {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const { data: meds } = await supabase
      .from('chronic_medicines')
      .select('id,user_id,member_id,name,dosage,times,pills_left,pills_per_day,created_at')
      .eq('user_id', userId);

    if (!meds || meds.length === 0) return;

    for (const med of meds) {
      const times = (med.times || '').split(',').map((t: string) => t.trim()).filter(Boolean);
      for (const time of times) {
        if (time <= currentTime) {
          const { data: existing } = await supabase
            .from('dose_reminders')
            .select('id')
            .eq('user_id', userId)
            .eq('chronic_med_id', med.id)
            .eq('reminder_date', todayStr)
            .eq('dose_time', time)
            .maybeSingle();
          if (!existing) {
            await persistDoseReminder(med.id, med.name, med.dosage || '', time, isRTL);
            triggerMedicineNotification(med.name, med.dosage || '', isRTL);
          }
        }
      }
    }
  } catch (err) {
    console.error('[checkDueDoses] Error:', err);
  }
}

export function cancelMedicineReminders(medId: string): void {
  for (const key of Object.keys(scheduledTimeouts)) {
    if (key.startsWith(`${medId}_`)) {
      clearTimeout(scheduledTimeouts[key]);
      delete scheduledTimeouts[key];
    }
  }
}

export function rescheduleMedicineReminders(medId: string, medName: string, dosage: string, timesStr: string, isRTL: boolean): void {
  cancelMedicineReminders(medId);
  if (!timesStr) return;
  const times = timesStr.split(',').map((t: string) => t.trim()).filter(Boolean);
  for (const t of times) {
    scheduleMedicineReminder(medId, medName, dosage, t, isRTL);
  }
}
