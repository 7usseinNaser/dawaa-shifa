import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';
import { showToast } from '@/components/ui/Toast';

export interface Review {
  id: string;
  target_id: string;
  user_name: string;
  rating: number;
  text: string;
  anon: boolean;
  ts: string;
  reply: string;
}

interface RatingCardProps {
  targetId: string;
  targetType: 'pharmacy' | 'facility';
  targetName: string;
}

function sanitize(str: string): string {
  return String(str || '').replace(/[<>]/g, '').trim().slice(0, 500);
}

export default function RatingCard({ targetId, targetType, targetName }: RatingCardProps) {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showCommentBox, setShowCommentBox] = useState(false);

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('*')
          .eq('target_id', targetId)
          .order('ts', { ascending: false });

        if (error) throw error;
        if (data) setReviews(data as Review[]);
      } catch {
        // silent fail — reviews are non-critical
      } finally {
        setLoading(false);
      }
    })();
  }, [targetId]);

  const submit = async () => {
    if (!user) {
      showToast(lang === 'ar' ? 'يجب تسجيل الدخول للتقييم' : 'Please sign in to rate', 'error');
      return;
    }
    if (selectedRating < 1 || selectedRating > 5) {
      showToast(lang === 'ar' ? 'اختر نجمة واحدة على الأقل' : 'Select at least one star', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const cleanComment = sanitize(comment);
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          target_id: targetId,
          user_id: user.id,
          user_name: user.email?.split('@')[0] || 'مواطن',
          rating: selectedRating,
          text: cleanComment,
          anon: false,
        })
        .select('*')
        .single();

      if (error) throw error;
      if (data) {
        setReviews((prev) => [data as Review, ...prev]);
        showToast(lang === 'ar' ? 'شكراً لتقييمك! تم الحفظ بنجاح.' : 'Thank you! Rating saved.');
        setSelectedRating(0);
        setHoverRating(0);
        setComment('');
        setShowCommentBox(false);
      }
    } catch {
      showToast(lang === 'ar' ? 'حدث خطأ أثناء حفظ التقييم' : 'Error saving rating', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels: Record<number, string> = {
    1: lang === 'ar' ? 'سيء جداً' : 'Very bad',
    2: lang === 'ar' ? 'سيء' : 'Bad',
    3: lang === 'ar' ? 'مقبول' : 'Okay',
    4: lang === 'ar' ? 'جيد' : 'Good',
    5: lang === 'ar' ? 'ممتاز' : 'Excellent',
  };

  return (
    <div className="glass-card p-5 space-y-4">
      {/* Header */}
      <div className="text-center">
        <p className="font-cairo font-bold text-base mb-1">
          {lang === 'ar' ? 'كيف كانت تجربتك مع' : 'How was your experience with'}{' '}
          <span className="text-brand-green-light">{targetName}</span>؟
        </p>
        {reviews.length > 0 && (
          <div className="flex items-center justify-center gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`w-4 h-4 ${n <= Math.round(parseFloat(avg)) ? 'text-amber-400 fill-amber-400' : 'text-[var(--border-subtle)]'}`}
              />
            ))}
            <span className="font-inter font-bold text-sm mr-1">{avg}</span>
            <span className="text-xs text-[var(--text-muted)]">
              ({reviews.length} {lang === 'ar' ? 'تقييم' : 'reviews'})
            </span>
          </div>
        )}
      </div>

      {/* Star selector */}
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => {
              setSelectedRating(star);
              setShowCommentBox(true);
            }}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="transition-transform hover:scale-125 active:scale-90"
            aria-label={`${star} ${lang === 'ar' ? 'نجوم' : 'stars'}`}
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                star <= (hoverRating || selectedRating)
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-[var(--border-subtle)]'
              }`}
            />
          </button>
        ))}
      </div>

      {selectedRating > 0 && !showCommentBox && (
        <p className="text-center text-sm font-tajawal text-[var(--text-muted)]">
          {ratingLabels[selectedRating]}
        </p>
      )}

      {/* Comment box */}
      <AnimatePresence>
        {showCommentBox && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <p className="text-center text-sm font-tajawal text-brand-green-light">
              {ratingLabels[selectedRating]}
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={lang === 'ar' ? 'اكتب ملاحظاتك عن الخدمة أو الازدحام...' : 'Write your notes about service or crowding...'}
              rows={2}
              maxLength={500}
              className="w-full glass-card p-3 text-sm font-tajawal focus:outline-none focus:border-brand-green transition-colors resize-none"
            />
            <button
              onClick={submit}
              disabled={submitting}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {lang === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                </>
              ) : (
                lang === 'ar' ? 'حفظ التقييم' : 'Submit Rating'
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews list */}
      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="w-5 h-5 animate-spin text-brand-green-light" />
        </div>
      ) : (
        <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
          {reviews.slice(0, 5).map((r) => (
            <div key={r.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-cairo font-bold text-sm flex items-center gap-1">
                  {r.anon ? (lang === 'ar' ? 'مجهول' : 'Anonymous') : r.user_name}
                </span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`w-3 h-3 ${n <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-[var(--border-subtle)]'}`}
                    />
                  ))}
                </div>
              </div>
              {r.text && <p className="text-sm font-tajawal text-[var(--text-soft)]">{r.text}</p>}
              {r.reply && (
                <p className="text-xs font-tajawal text-brand-blue-light bg-brand-blue/10 rounded-lg p-2">
                  {lang === 'ar' ? 'رد المرفق' : 'Reply'}: {r.reply}
                </p>
              )}
              <p className="text-[10px] text-[var(--text-muted)]">
                {new Date(r.ts).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
              </p>
            </div>
          ))}
          {reviews.length === 0 && (
            <p className="text-center text-sm font-tajawal text-[var(--text-muted)] py-2">
              {lang === 'ar' ? 'لا توجد تقييمات بعد — كن أول من يقيّم!' : 'No reviews yet — be the first!'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
