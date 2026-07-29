import { Activity, Github, Globe, Linkedin } from 'lucide-react';

/**
 * Footer — brand, social links, and closing line.
 */
export default function Footer() {
  return (
    <footer className="relative py-12 border-t border-[var(--border-subtle)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-brand-green-light" />
            <div>
              <div className="font-cairo font-bold text-sm">دواء وشفاء</div>
              <div className="font-inter text-[10px] text-[var(--text-muted)] tracking-wider">DAWAA & SHIFA</div>
            </div>
          </div>

          {/* Social */}
          <div className="flex items-center gap-3">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full glass flex items-center justify-center hover:scale-110 hover:text-brand-green-light transition-all" aria-label="GitHub">
              <Github className="w-4 h-4" />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full glass flex items-center justify-center hover:scale-110 hover:text-brand-green-light transition-all" aria-label="LinkedIn">
              <Linkedin className="w-4 h-4" />
            </a>
            <a href="https://7ussein.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full glass flex items-center justify-center hover:scale-110 hover:text-brand-green-light transition-all" aria-label="7ussein.com">
              <Globe className="w-4 h-4" />
            </a>
          </div>

          {/* Copyright */}
          <div className="text-center md:text-left">
            <p className="font-tajawal text-sm text-[var(--text-soft)]">
              صُنع في غزة بتقنية تهدف لصناعة فرق حقيقي.
            </p>
            <p className="font-inter text-xs text-[var(--text-muted)] mt-1">
              © 2024 Dawaa & Shifa — Hussein Nasr
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
