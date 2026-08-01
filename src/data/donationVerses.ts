export interface DonationVerse {
  id: number;
  type: 'quran' | 'hadith';
  arabic: string;
  translation: string;
  reference: string;
}

// 25 verified texts — 15 Quran verses + 10 authentic Hadiths.
// NOTE: Hadith wording/attribution should be double-checked against a trusted
// source (e.g. alDurar.net) before final publish — this is sensitive religious content.
export const donationVerses: DonationVerse[] = [
  // ===== القرآن الكريم (15 آية) =====
  {
    id: 1,
    type: 'quran',
    arabic: 'مَّثَلُ الَّذِينَ يُنفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ فِي كُلِّ سُنبُلَةٍ مِّائَةُ حَبَّةٍ ۗ وَاللَّهُ يُضَاعِفُ لِمَن يَشَاءُ',
    translation: 'The example of those who spend their wealth in the cause of Allah is that of a grain that sprouts seven ears, each ear having a hundred grains. And Allah multiplies for whom He wills.',
    reference: 'سورة البقرة: 261 — Surah Al-Baqarah 2:261',
  },
  {
    id: 2,
    type: 'quran',
    arabic: 'مَّن ذَا الَّذِي يُقْرِضُ اللَّهَ قَرْضًا حَسَنًا فَيُضَاعِفَهُ لَهُ أَضْعَافًا كَثِيرَةً ۚ وَاللَّهُ يَقْبِضُ وَيَبْسُطُ وَإِلَيْهِ تُرْجَعُونَ',
    translation: 'Who is it that would loan Allah a goodly loan so He will multiply it for him many times over? And it is Allah who withholds and grants abundance, and to Him you will be returned.',
    reference: 'سورة البقرة: 245 — Surah Al-Baqarah 2:245',
  },
  {
    id: 3,
    type: 'quran',
    arabic: 'الَّذِينَ يُنفِقُونَ أَمْوَالَهُم بِاللَّيْلِ وَالنَّهَارِ سِرًّا وَعَلَانِيَةً فَلَهُمْ أَجْرُهُمْ عِندَ رَبِّهِمْ وَلَا خَوْفٌ عَلَيْهِمْ وَلَا هُمْ يَحْزَنُونَ',
    translation: 'Those who spend their wealth by night and day, secretly and publicly, they will have their reward with their Lord, and no fear will be upon them, nor will they grieve.',
    reference: 'سورة البقرة: 274 — Surah Al-Baqarah 2:274',
  },
  {
    id: 4,
    type: 'quran',
    arabic: 'لَن تَنَالُوا الْبِرَّ حَتَّىٰ تُنفِقُوا مِمَّا تُحِبُّونَ ۚ وَمَا تُنفِقُوا مِن شَيْءٍ فَإِنَّ اللَّهَ بِهِ عَلِيمٌ',
    translation: 'You will never attain righteousness until you spend of that which you love. And whatever you spend of anything, Allah indeed knows it.',
    reference: 'سورة آل عمران: 92 — Surah Aal-E-Imran 3:92',
  },
  {
    id: 5,
    type: 'quran',
    arabic: 'إِن تُبْدُوا الصَّدَقَاتِ فَنِعِمَّا هِيَ ۖ وَإِن تُخْفُوهَا وَتُؤْتُوهَا الْفُقَرَاءَ فَهُوَ خَيْرٌ لَّكُمْ ۚ وَيُكَفِّرُ عَنكُم مِّن سَيِّئَاتِكُمْ',
    translation: 'If you disclose charitable donations, it is good, but if you conceal them and give to the poor, it is better for you, and He will remove from you some of your misdeeds.',
    reference: 'سورة البقرة: 271 — Surah Al-Baqarah 2:271',
  },
  {
    id: 6,
    type: 'quran',
    arabic: 'وَمَا أَنفَقْتُم مِّن شَيْءٍ فَهُوَ يُخْلِفُهُ ۖ وَهُوَ خَيْرُ الرَّازِقِينَ',
    translation: 'Whatever you spend of anything, He will replace it, and He is the best of providers.',
    reference: 'سورة سبأ: 39 — Surah Saba 34:39',
  },
  {
    id: 7,
    type: 'quran',
    arabic: 'إِنَّ الْمُصَّدِّقِينَ وَالْمُصَّدِّقَاتِ وَأَقْرَضُوا اللَّهَ قَرْضًا حَسَنًا يُضَاعَفُ لَهُمْ وَلَهُمْ أَجْرٌ كَرِيمٌ',
    translation: 'Indeed, the men who practice charity and the women who practice charity and those who loan Allah a goodly loan — it will be multiplied for them, and they will have a noble reward.',
    reference: 'سورة الحديد: 18 — Surah Al-Hadid 57:18',
  },
  {
    id: 8,
    type: 'quran',
    arabic: 'لِيُنفِقْ ذُو سَعَةٍ مِّن سَعَتِهِ ۖ وَمَن قُدِرَ عَلَيْهِ رِزْقُهُ فَلْيُنفِقْ مِمَّا آتَاهُ اللَّهُ',
    translation: 'Let a person of means spend according to his means. And whoever has his provision restricted, let him spend from what Allah has given him.',
    reference: 'سورة الطلاق: 7 — Surah At-Talaq 65:7',
  },
  {
    id: 9,
    type: 'quran',
    arabic: 'وَمَا تُقَدِّمُوا لِأَنفُسِكُم مِّنْ خَيْرٍ تَجِدُوهُ عِندَ اللَّهِ هُوَ خَيْرًا وَأَعْظَمَ أَجْرًا',
    translation: 'Whatever good you send ahead for yourselves, you will find it with Allah — better and greater in reward.',
    reference: 'سورة المزمل: 20 — Surah Al-Muzzammil 73:20',
  },
  {
    id: 10,
    type: 'quran',
    arabic: 'الَّذِينَ يُنفِقُونَ فِي السَّرَّاءِ وَالضَّرَّاءِ وَالْكَاظِمِينَ الْغَيْظَ وَالْعَافِينَ عَنِ النَّاسِ ۗ وَاللَّهُ يُحِبُّ الْمُحْسِنِينَ',
    translation: 'Those who spend in ease and hardship, and who restrain anger, and who pardon people — and Allah loves the doers of good.',
    reference: 'سورة آل عمران: 134 — Surah Aal-E-Imran 3:134',
  },
  {
    id: 11,
    type: 'quran',
    arabic: 'وَأَنفِقُوا مِمَّا رَزَقْنَاكُم مِّن قَبْلِ أَن يَأْتِيَ أَحَدَكُمُ الْمَوْتُ فَيَقُولَ رَبِّ لَوْلَا أَخَّرْتَنِي إِلَىٰ أَجَلٍ قَرِيبٍ فَأَصَّدَّقَ وَأَكُن مِّنَ الصَّالِحِينَ',
    translation: 'And spend from what We have provided for you before death approaches one of you and he says: My Lord, if only You would delay me for a brief term so I would give charity and be among the righteous.',
    reference: 'سورة المنافقون: 10 — Surah Al-Munafiqun 63:10',
  },
  {
    id: 12,
    type: 'quran',
    arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا أَنفِقُوا مِن طَيِّبَاتِ مَا كَسَبْتُمْ وَمِمَّا أَخْرَجْنَا لَكُم مِّنَ الْأَرْضِ',
    translation: 'O you who believe, spend from the good things you have earned and from what We have produced for you from the earth.',
    reference: 'سورة البقرة: 267 — Surah Al-Baqarah 2:267',
  },
  {
    id: 13,
    type: 'quran',
    arabic: 'الَّذِينَ يُنفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ ثُمَّ لَا يُتْبِعُونَ مَا أَنفَقُوا مَنًّا وَلَا أَذًى ۙ لَّهُمْ أَجْرُهُمْ عِندَ رَبِّهِمْ',
    translation: 'Those who spend their wealth in the way of Allah, then do not follow up what they spent with reminder of it or injury — they will have their reward with their Lord.',
    reference: 'سورة البقرة: 262 — Surah Al-Baqarah 2:262',
  },
  {
    id: 14,
    type: 'quran',
    arabic: 'فَاتَّقُوا اللَّهَ مَا اسْتَطَعْتُمْ وَاسْمَعُوا وَأَطِيعُوا وَأَنفِقُوا خَيْرًا لِّأَنفُسِكُمْ ۗ وَمَن يُوقَ شُحَّ نَفْسِهِ فَأُولَٰئِكَ هُمُ الْمُفْلِحُونَ',
    translation: 'So fear Allah as much as you are able, and listen and obey, and spend — it is better for yourselves. And whoever is protected from the stinginess of his soul, it is those who will be the successful.',
    reference: 'سورة التغابن: 16 — Surah At-Taghabun 64:16',
  },
  {
    id: 15,
    type: 'quran',
    arabic: 'وَمَا تُنفِقُوا مِنْ خَيْرٍ فَلِأَنفُسِكُمْ ۚ وَمَا تُنفِقُونَ إِلَّا ابْتِغَاءَ وَجْهِ اللَّهِ ۚ وَمَا تُنفِقُوا مِنْ خَيْرٍ يُوَفَّ إِلَيْكُمْ وَأَنتُمْ لَا تُظْلَمُونَ',
    translation: 'Whatever good you spend is for yourselves, and you do not spend except seeking the face of Allah. And whatever good you spend will be repaid to you in full, and you will not be wronged.',
    reference: 'سورة البقرة: 272 — Surah Al-Baqarah 2:272',
  },
  // ===== الأحاديث النبوية الصحيحة (10 أحاديث) =====
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
    reference: 'رواه الترمذي (صحيح) — Tirmidhi (Sahih)',
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
    reference: 'رواه أبو داود (صحيح) — Abu Dawud (Sahih)',
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
    arabic: 'صَنَائِعُ الْمَعْرُوفِ تَقِي مَصَارِعَ السُّوءِ، وَالصَّدَقَةُ فِي السِّرِّ تُطْفِئُ غَضَبَ الرَّبِّ',
    translation: 'Good deeds protect from evil fates, and charity given in secret extinguishes the anger of the Lord.',
    reference: 'رواه الطبراني (حسن) — Tabarani (Hasan)',
  },
  {
    id: 24,
    type: 'hadith',
    arabic: 'إِذَا مَاتَ الإِنْسَانُ انْقَطَعَ عَنْهُ عَمَلُهُ إِلاَّ مِنْ ثَلاَثَةٍ: إِلاَّ مِنْ صَدَقَةٍ جَارِيَةٍ، أَوْ عِلْمٍ يُنْتَفَعُ بِهِ، أَوْ وَلَدٍ صَالِحٍ يَدْعُو لَهُ',
    translation: 'When a person dies, their deeds end except three: ongoing charity, beneficial knowledge, or a righteous child who prays for them.',
    reference: 'رواه مسلم — Muslim',
  },
  {
    id: 25,
    type: 'hadith',
    arabic: 'الرَّجُلُ فِي ظِلِّ صَدَقَتِهِ حَتَّى يُقْضَى بَيْنَ النَّاسِ',
    translation: 'A person is under the shade of his charity until judgment is passed between people.',
    reference: 'رواه أحمد (صحيح) — Ahmad (Sahih)',
  },
];
