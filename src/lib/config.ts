// Central configuration for donation-related settings.
// Change the WhatsApp link here in one place — it propagates everywhere.

export const DONATION_WHATSAPP_BASE = 'https://api.whatsapp.com/message/S7T6HKGGJCIWK1';
export const DONATION_WHATSAPP_MESSAGE =
  'السلام عليكم ورحمة الله وبركاته، أود التبرع ودعم منصة دواء وشفاء والمساهمة في استمراريتها وتطويرها لتغطية التكاليف التشغيلية. جزاكم الله خيراً على جهودكم المباركة في خدمة المرضى والمجتمع.';

export function getDonationWhatsappUrl(): string {
  return `${DONATION_WHATSAPP_BASE}?autoload=1&app_absent=0&text=${encodeURIComponent(DONATION_WHATSAPP_MESSAGE)}`;
}

export const DONATION_CONFIG = {
  whatsappLink: getDonationWhatsappUrl(),
  confirmTextAr: 'سيتم تحويلك للتواصل المباشر مع فريق دواء وشفاء عبر واتساب لتنسيق طريقة التبرع المناسبة لك.',
  confirmTextEn: 'You will be redirected to contact the Dawaa Shifa team directly via WhatsApp to arrange your donation.',
  platformName: 'دواء وشفاء',
};
