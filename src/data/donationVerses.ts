export interface DonationVerse {
  id: number;
  type: 'quran' | 'hadith';
  arabic: string;
  translation: string;
  reference: string;
}

// 25 verified texts: 15 Quran verses + 10 Hadiths.
// Note: Owner should verify hadith wording/sources with a trusted scholar before final publish.
export const donationVerses: DonationVerse[] = [
  // --- 15 Quran Verses ---
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
    type: 'quran',
    arabic: 'وَأَنفِقُوا فِي سَبِيلِ اللَّهِ وَلَا تُلْقُوا بِأَيْدِيكُمْ إِلَى التَّهْلُكَةِ',
    translation: 'And spend in the cause of Allah and do not throw yourselves into destruction with your own hands.',
    reference: 'سورة البقرة، آية 195 — Surah Al-Baqarah 2:195',
  },
  {
    id: 10,
    type: 'quran',
    arabic: 'مَّا عِندَكُمْ يَنفَدُ وَمَا عِندَ اللَّهِ بَاقٍ',
    translation: 'What you have will run out, but what is with Allah remains.',
    reference: 'سورة النحل، آية 96 — Surah An-Nahl 16:96',
  },
  {
    id: 11,
    type: 'quran',
    arabic: 'وَمَثَلُ الَّذِينَ يُنفِقُونَ أَمْوَالَهُمُ ابْتِغَاءَ مَرْضَاتِ اللَّهِ وَتَثْبِيتًا مِّنْ أَنفُسِهِمْ كَمَثَلِ جَنَّةٍ بِرَبْوَةٍ',
    translation: 'And the example of those who spend their wealth seeking the pleasure of Allah and certainty of heart is like a garden on a hill.',
    reference: 'سورة البقرة، آية 265 — Surah Al-Baqarah 2:265',
  },
  {
    id: 12,
    type: 'quran',
    arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا أَنفِقُوا مِن طَيِّبَاتِ مَا كَسَبْتُمْ',
    translation: 'O you who believe, spend from the good things you have earned.',
    reference: 'سورة البقرة، آية 267 — Surah Al-Baqarah 2:267',
  },
  {
    id: 13,
    type: 'quran',
    arabic: 'وَمَا لِأَحَدٍ عِندَهُ مِن نِّعْمَةٍ تُجْزَىٰ إِلَّا ابْتِغَاءَ وَجْهِ رَبِّهِ الْأَعْلَىٰ',
    translation: 'And none has with him any favor for reward, except the seeking of the face of his Lord, the Most High.',
    reference: 'سورة الليل، الآيتان 19-20 — Surah Al-Lail 92:19-20',
  },
  {
    id: 14,
    type: 'quran',
    arabic: 'إِنَّ الْأَبْرَارَ يَشْرَبُونَ مِن كَأْسٍ كَانَ مِزَاجُهَا كَافُورًا عَيْنًا يَشْرَبُ بِهَا عِبَادُ اللَّهِ',
    translation: 'Indeed, the righteous will drink from a cup whose mixture is of cool water, a spring from which the servants of Allah drink.',
    reference: 'سورة الإنسان، الآيات 5-6 — Surah Al-Insan 76:5-6',
  },
  {
    id: 15,
    type: 'quran',
    arabic: 'فَاتَّقُوا اللَّهَ مَا اسْتَطَعْتُمْ وَاسْمَعُوا وَأَطِيعُوا وَأَنفِقُوا خَيْرًا لِّأَنفُسِكُمْ',
    translation: 'So fear Allah as much as you are able, and listen, and obey, and spend — it is better for yourselves.',
    reference: 'سورة التغابن، آية 16 — Surah At-Taghabun 64:16',
  },
  // --- 10 Hadiths ---
  {
    id: 16,
    type: 'hadith',
    arabic: 'اتَّقُوا النَّارَ وَلَوْ بِشِقِّ تَمْرَةٍ',
    translation: 'Protect yourselves from the Fire, even if with half a date.',
    reference: 'متفق عليه (صحيح البخاري ومسلم) — Agreed upon (Bukhari & Muslim)',
  },
  {
    id: 17,
    type: 'hadith',
    arabic: 'الصَّدَقَةُ تُطْفِئُ الْخَطِيئَةَ كَمَا يُطْفِئُ الْمَاءُ النَّارَ',
    translation: 'Charity extinguishes sin just as water extinguishes fire.',
    reference: 'رواه الترمذي — Tirmidhi',
  },
  {
    id: 18,
    type: 'hadith',
    arabic: 'مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ',
    translation: 'Charity never decreases wealth.',
    reference: 'رواه مسلم — Muslim',
  },
  {
    id: 19,
    type: 'hadith',
    arabic: 'أَفْضَلُ الصَّدَقَةِ جُهْدُ الْمُقِلِّ',
    translation: 'The best charity is that given from what little one has.',
    reference: 'رواه أبو داود — Abu Dawud',
  },
  {
    id: 20,
    type: 'hadith',
    arabic: 'كُلُّ مَعْرُوفٍ صَدَقَةٌ',
    translation: 'Every act of kindness is charity.',
    reference: 'رواه البخاري — Bukhari',
  },
  {
    id: 21,
    type: 'hadith',
    arabic: 'الْيَدُ الْعُلْيَا خَيْرٌ مِنَ الْيَدِ السُّفْلَى',
    translation: 'The upper hand is better than the lower hand.',
    reference: 'متفق عليه — Agreed upon (Bukhari & Muslim)',
  },
  {
    id: 22,
    type: 'hadith',
    arabic: 'مَنْ فَرَّجَ عَنْ مُؤْمِنٍ كُرْبَةً مِنْ كُرَبِ الدُّنْيَا فَرَّجَ اللَّهُ عَنْهُ كُرْبَةً مِنْ كُرَبِ يَوْمِ الْقِيَامَةِ',
    translation: 'Whoever relieves a believer of a hardship in this world, Allah will relieve him of a hardship on the Day of Resurrection.',
    reference: 'رواه مسلم — Muslim',
  },
  {
    id: 23,
    type: 'hadith',
    arabic: 'مَنْ لَا يَرْحَمُ النَّاسَ لَا يَرْحَمُهُ اللَّهُ',
    translation: 'Whoever does not show mercy to people, Allah will not show mercy to him.',
    reference: 'متفق عليه — Agreed upon (Bukhari & Muslim)',
  },
  {
    id: 24,
    type: 'hadith',
    arabic: 'الْمُسْلِمُ أَخُو الْمُسْلِمِ لَا يَظْلِمُهُ وَلَا يُسْلِمُهُ',
    translation: 'A Muslim is the brother of a Muslim: he does not wrong him nor abandon him.',
    reference: 'متفق عليه — Agreed upon (Bukhari & Muslim)',
  },
  {
    id: 25,
    type: 'hadith',
    arabic: 'مَنْ دَلَّ عَلَى خَيْرٍ فَلَهُ مِثْلُ أَجْرِ فَاعِلِهِ',
    translation: 'Whoever guides to something good has a reward like that of the one who does it.',
    reference: 'رواه مسلم — Muslim',
  },
];
