import { AnimatePresence, motion } from 'framer-motion';
import { Phone } from 'lucide-react';
import { useState } from 'react';

const emergencyNumbers = [
  { label: 'الإسعاف', number: '101', color: 'text-status-emergency' },
  { label: 'الدفاع المدني', number: '102', color: 'text-status-busy' },
  { label: 'الهلال الأحمر', number: '103', color: 'text-brand-green-light' },
];

export default function SOSButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-4 w-14 h-14 rounded-full bg-gradient-to-br from-status-emergency to-red-700 text-white border-2 border-white font-bold text-xs z-40 flex items-center justify-center"
        style={{ boxShadow: '0 6px 18px rgba(239,68,68,0.55)' }}
        aria-label="SOS"
      >
        SOS
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-md p-6 rounded-t-3xl sm:rounded-3xl"
            >
              <div className="w-10 h-1 bg-[var(--border-subtle)] rounded-full mx-auto mb-4 sm:hidden" />
              <h3 className="font-cairo font-bold text-lg mb-4 text-center">أرقام الطوارئ</h3>
              <div className="space-y-3">
                {emergencyNumbers.map((e) => (
                  <a key={e.number} href={`tel:${e.number}`} className="flex items-center justify-between glass rounded-xl p-4 hover:scale-[1.02] transition-transform">
                    <div className="flex items-center gap-3">
                      <Phone className={`w-5 h-5 ${e.color}`} />
                      <span className="font-cairo font-bold">{e.label}</span>
                    </div>
                    <span className="font-inter font-bold text-lg">{e.number}</span>
                  </a>
                ))}
              </div>
              <button onClick={() => setOpen(false)} className="btn-secondary w-full mt-4 text-sm">إغلاق</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
