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

export function to12HourArabic(time24: string | null | undefined): string {
  return to12Hour(time24, true);
}

export function formatOpenHours(openHours: string | null | undefined, isRTL = false): string {
  if (!openHours || !openHours.trim()) return isRTL ? 'غير محدد' : 'Not specified';
  // Try to parse range formats like "08:00-15:00" or "08:00 - 15:00"
  const rangeMatch = openHours.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  if (rangeMatch) {
    const start = to12Hour(rangeMatch[1], isRTL);
    const end = to12Hour(rangeMatch[2], isRTL);
    if (isRTL) {
      // Convert AM/PM to Arabic
      const startAr = start.replace('PM', 'مساءً').replace('AM', 'صباحاً');
      const endAr = end.replace('PM', 'مساءً').replace('AM', 'صباحاً');
      return `${startAr} - ${endAr}`;
    }
    return `${start} - ${end}`;
  }
  // If it's already a display string, return as-is
  return openHours;
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

export function timeAgo(isoString: string | null | undefined, isRTL = false): string {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return isRTL ? 'الآن' : 'just now';
  if (minutes < 60) return isRTL ? `قبل ${minutes} دقيقة` : `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return isRTL ? `قبل ${hours} ساعة` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return isRTL ? `قبل ${days} يوم` : `${days}d ago`;
}
