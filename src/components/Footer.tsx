import { Instagram, MessageCircle, Mail } from 'lucide-react';
import { getDonationWhatsappUrl } from '@/lib/config';
import { useLang } from '@/lib/i18n';

/**
 * Footer — brand, social links, and closing line.
 */
export default function Footer() {
  const { lang } = useLang();
  const isRTL = lang === 'ar';

  return (
    <footer className="relative py-12 border-t border-[var(--border-subtle)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-green to-brand-blue" />
            <div>
              <div className="font-cairo font-bold text-sm">دواء وشفاء</div>
              <div className="font-inter text-[10px] text-[var(--text-muted)] tracking-wider">DAWAA & SHIFA</div>
            </div>
          </div>

          {/* Social */}
          <div className="flex items-center gap-3">
            <a href="https://www.instagram.com/7ussein.naser" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full glass flex items-center justify-center hover:scale-110 hover:text-brand-green-light transition-all" aria-label="Instagram">
              <Instagram className="w-4 h-4" />
            </a>
            <a href={getDonationWhatsappUrl()} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full glass flex items-center justify-center hover:scale-110 hover:text-brand-green-light transition-all" aria-label="WhatsApp">
              <MessageCircle className="w-4 h-4" />
            </a>
            <a href="mailto:hussein7.7naser@gmail.com" className="w-10 h-10 rounded-full glass flex items-center justify-center hover:scale-110 hover:text-brand-green-light transition-all" aria-label="Email">
              <Mail className="w-4 h-4" />
            </a>
          </div>

          {/* Copyright */}
          <div className="text-center md:text-left">
            <p className="font-tajawal text-sm text-[var(--text-soft)]">
              صُنع في غزة، رغم كل شيء.
            </p>
            <p className="font-inter text-xs text-[var(--text-muted)] mt-1">
              Dawaa & Shifa — Hussein Nasr 2026 ©
            </p>
            <a href="#/team" className="inline-flex items-center gap-1 text-xs text-brand-green-light font-tajawal hover:underline mt-2">
              {isRTL ? 'تعرّف على الفريق ←' : 'Meet the team ←'}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
