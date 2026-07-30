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
  const times = timesStr.split(',').map((t) => t.trim()).filter(Boolean);
  for (const t of times) {
    scheduleMedicineReminder(medId, medName, dosage, t, isRTL);
  }
}
