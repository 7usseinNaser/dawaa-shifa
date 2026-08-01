export function to12Hour(time24: string | null | undefined, isRTL = false): string {
  if (!time24) return '—';
  const match = time24.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return time24;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const period = h >= 12;
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  if (isRTL) return `${h}:${m} ${period ? 'م' : 'ص'}`;
  return `${h}:${m} ${period ? 'PM' : 'AM'}`;
}

export function isWithinHours(openTime: string | null | undefined, closeTime: string | null | undefined): boolean {
  if (!openTime || !closeTime) return true;
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const openMatch = openTime.match(/^(\d{1,2}):(\d{2})/);
  const closeMatch = closeTime.match(/^(\d{1,2}):(\d{2})/);
  if (!openMatch || !closeMatch) return true;
  const openMin = parseInt(openMatch[1]) * 60 + parseInt(openMatch[2]);
  const closeMin = parseInt(closeMatch[1]) * 60 + parseInt(closeMatch[2]);
  if (closeMin > openMin) return currentMin >= openMin && currentMin < closeMin;
  return currentMin >= openMin || currentMin < closeMin;
}

export function autoCloseStatus(openTime: string | null | undefined, closeTime: string | null | undefined, currentStatus: string): string {
  if (!openTime || !closeTime) return currentStatus;
  if (!isWithinHours(openTime, closeTime)) return 'closed';
  return currentStatus;
}
