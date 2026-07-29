import { useState } from 'react';
import { Check, Link2, Share2, Twitter, X } from 'lucide-react';

/**
 * SocialShare — floating share button with link copy + social links.
 */
export default function SocialShare() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-24 left-6 z-30">
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:scale-110 transition-transform mb-2"
        aria-label="مشاركة"
      >
        <Share2 className="w-4 h-4 text-brand-green-light" />
      </button>

      {open && (
        <div className="glass-card p-3 space-y-2 animate-fade-in w-44">
          <button onClick={copyLink} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--glass)] transition-colors text-sm font-tajawal">
            {copied ? <Check className="w-4 h-4 text-status-open" /> : <Link2 className="w-4 h-4 text-brand-green-light" />}
            {copied ? 'تم النسخ' : 'نسخ الرابط'}
          </button>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--glass)] transition-colors text-sm font-tajawal">
            <Twitter className="w-4 h-4 text-brand-blue-light" /> تويتر
          </a>
          <a href="https://wa.me" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--glass)] transition-colors text-sm font-tajawal">
            <Share2 className="w-4 h-4 text-status-open" /> واتساب
          </a>
        </div>
      )}
    </div>
  );
}
