import { WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOnlineStatus, flushOfflineQueue } from '@/lib/offline';
import { useEffect, useState } from 'react';
import { showToast } from '@/components/ui/Toast';

export default function OfflineIndicator() {
  const online = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!online) return;
    (async () => {
      const queue = JSON.parse(localStorage.getItem('dawaa_offline_queue') || '[]');
      if (queue.length === 0) return;
      setSyncing(true);
      const flushed = await flushOfflineQueue();
      setSyncing(false);
      if (flushed > 0) {
        showToast(`تمت مزامنة ${flushed} عملية محفوظة دون اتصال`);
      }
    })();
  }, [online]);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-0 inset-x-0 z-[200] bg-status-emergency text-white py-2 px-4 flex items-center justify-center gap-2 text-sm font-tajawal font-bold"
        >
          <WifiOff className="w-4 h-4" />
          <span>غير متصل — يعرض آخر بيانات محفوظة. سيتم إرسال التغييرات عند عودة الاتصال.</span>
        </motion.div>
      )}
      {syncing && online && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-0 inset-x-0 z-[200] bg-brand-blue text-white py-2 px-4 flex items-center justify-center gap-2 text-sm font-tajawal font-bold"
        >
          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>جاري مزامنة البيانات المؤجلة...</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
