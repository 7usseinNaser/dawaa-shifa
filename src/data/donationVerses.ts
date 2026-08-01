export interface DonationVerse {
  id: number;
  type: 'quran' | 'hadith';
  arabic: string;
  translation: string;
  reference: string;
}

// 15 verified texts — exactly as specified. No alterations.
// Note: Owner should verify hadith wording/sources with a trusted scholar before final publish.
export const donationVerses: DonationVerse[] = [
  {
    id: 1,
    type: 'quran',
    arabic: 'مَّثَلُ الَّذِينَ يُنفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ فِي كُلِّ سُنبُلَةٍ مِّائَةُ حَبَّةٍ',
    translation: 'The example of those who spend their wealth in the cause of Allah is that of a grain that sprouts seven ears, each ear having a hundred grains.',
    reference: 'سورة البقرة، آية 261 — Surah Al-Baqarah 2:261',
  },
  {
    id: 2,
    type: 'quran',
    arabic: 'مَّن ذَا الَّذِي يُقْرِضُ اللَّهَ قَرْضًا حَسَنًا فَيُضَاعِفَهُ لَهُ أَضْعَافًا كَثِيرَةً',
    translation: 'Who is it that would loan Allah a goodly loan so He will multiply it for him many times over?',
    reference: 'سورة البقرة، آية 245 — Surah Al-Baqarah 2:245',
  },
  {
    id: 3,
    type: 'quran',
    arabic: 'الَّذِينَ يُنفِقُونَ أَمْوَالَهُم بِاللَّيْلِ وَالنَّهَارِ سِرًّا وَعَلَانِيَةً فَلَهُمْ أَجْرُهُمْ عِندَ رَبِّهِمْ',
    translation: 'Those who spend their wealth by night and day, secretly and publicly, they will have their reward with their Lord.',
    reference: 'سورة البقرة، آية 274 — Surah Al-Baqarah 2:274',
  },
  {
    id: 4,
    type: 'quran',
    arabic: 'لَن تَنَالُوا الْبِرَّ حَتَّىٰ تُنفِقُوا مِمَّا تُحِبُّونَ',
    translation: 'You will never attain righteousness until you spend of that which you love.',
    reference: 'سورة آل عمران، آية 92 — Surah Aal-E-Imran 3:92',
  },
  {
    id: 5,
    type: 'quran',
    arabic: 'إِن تُبْدُوا الصَّدَقَاتِ فَنِعِمَّا هِيَ وَإِن تُخْفُوهَا وَتُؤْتُوهَا الْفُقَرَاءَ فَهُوَ خَيْرٌ لَّكُمْ',
    translation: 'If you disclose charitable donations, it is good, but if you conceal them and give to the poor, it is better for you.',
    reference: 'سورة البقرة، آية 271 — Surah Al-Baqarah 2:271',
  },
  {
    id: 6,
    type: 'quran',
    arabic: 'وَمَا أَنفَقْتُم مِّن شَيْءٍ فَهُوَ يُخْلِفُهُ وَهُوَ خَيْرُ الرَّازِقِينَ',
    translation: 'Whatever you spend of anything, He will replace it, and He is the best of providers.',
    reference: 'سورة سبأ، آية 39 — Surah Saba 34:39',
  },
  {
    id: 7,
    type: 'quran',
    arabic: 'إِنَّ الْمُصَّدِّقِينَ وَالْمُصَّدِّقَاتِ وَأَقْرَضُوا اللَّهَ قَرْضًا حَسَنًا يُضَاعَفُ لَهُمْ وَلَهُمْ أَجْرٌ كَرِيمٌ',
    translation: 'Indeed, the men who practice charity and the women who practice charity and those who loan Allah a goodly loan — it will be multiplied for them, and they will have a noble reward.',
    reference: 'سورة الحديد، آية 18 — Surah Al-Hadid 57:18',
  },
  {
    id: 8,
    type: 'quran',
    arabic: 'لِّيُنفِقْ ذُو سَعَةٍ مِّن سَعَتِهِ',
    translation: 'Let a person of means spend according to his means.',
    reference: 'سورة الطلاق، آية 7 — Surah At-Talaq 65:7',
  },
  {
    id: 9,
    type: 'hadith',
    arabic: 'اتَّقُوا النَّارَ وَلَوْ بِشِقِّ تَمْرَةٍ',
    translation: 'Protect yourselves from the Fire, even if with half a date.',
    reference: 'متفق عليه (صحيح البخاري ومسلم) — Agreed upon (Bukhari & Muslim)',
  },
  {
    id: 10,
    type: 'hadith',
    arabic: 'الصَّدَقَةُ تُطْفِئُ الْخَطِيئَةَ كَمَا يُطْفِئُ الْمَاءُ النَّارَ',
    translation: 'Charity extinguishes sin just as water extinguishes fire.',
    reference: 'رواه الترمذي — Tirmidhi',
  },
  {
    id: 11,
    type: 'hadith',
    arabic: 'مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ',
    translation: 'Charity never decreases wealth.',
    reference: 'رواه مسلم — Muslim',
  },
  {
    id: 12,
    type: 'hadith',
    arabic: 'أَفْضَلُ الصَّدَقَةِ جُهْدُ الْمُقِلِّ',
    translation: 'The best charity is that given from what little one has.',
    reference: 'رواه أبو داود — Abu Dawud',
  },
  {
    id: 13,
    type: 'hadith',
    arabic: 'كُلُّ مَعْرُوفٍ صَدَقَةٌ',
    translation: 'Every act of kindness is charity.',
    reference: 'رواه البخاري — Bukhari',
  },
  {
    id: 14,
    type: 'hadith',
    arabic: 'الْيَدُ الْعُلْيَا خَيْرٌ مِنَ الْيَدِ السُّفْلَى',
    translation: 'The upper hand is better than the lower hand.',
    reference: 'متفق عليه — Agreed upon (Bukhari & Muslim)',
  },
  {
    id: 15,
    type: 'hadith',
    arabic: 'مَنْ فَرَّجَ عَنْ مُؤْمِنٍ كُرْبَةً مِنْ كُرَبِ الدُّنْيَا فَرَّجَ اللَّهُ عَنْهُ كُرْبَةً مِنْ كُرَبِ يَوْمِ الْقِيَامَةِ',
    translation: 'Whoever relieves a believer of a hardship in this world, Allah will relieve him of a hardship on the Day of Resurrection.',
    reference: 'رواه مسلم — Muslim',
  },
];
