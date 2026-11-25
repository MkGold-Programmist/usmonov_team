import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, User, Info, X, Send, ShieldCheck, MapPin, Phone, CheckCircle2 } from 'lucide-react';
import { CLUB_CONTACT, type SportCourse } from '../utils/storeLogic';
import type { TranslationStrings } from '../utils/i18n';
import { HERO_MEDIA } from '../data/seedData';
import { ProductVisual } from './ProductVisual';

interface CoursesViewProps {
  courses: SportCourse[];
  t: TranslationStrings;
}

export const CoursesView: React.FC<CoursesViewProps> = ({ courses, t }) => {
  const [activeCourse, setActiveCourse] = useState<SportCourse | null>(null);

  // Single authoritatively selected course
  const course = courses[0];

  const highlights = [
    { title: '1 смена: 16:00 – 17:30', desc: 'Пн, Ср, Пт — младшая и юношеская группа (техника и акробатика)' },
    { title: '2 смена: 17:30 – 19:30', desc: 'Пн, Ср, Пт — основной состав, схватки и проходы в ноги' },
    { title: '3 смена: 19:30 – 21:00', desc: 'Пн, Ср, Пт — старшие борцы, мастера и вечерний спарринг' },
    { title: 'Суббота (Шн): Кросс', desc: 'Общекомандный бег, выносливость и борьба под руководством Аъзама Усмонова' },
  ];

  return (
    <div className="space-y-8 sm:space-y-10 pb-16">
      {/* Editorial Header */}
      <div className="flex flex-col gap-3 border-b border-[#DDD3BE] pb-5 sm:pb-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#9A5B13]">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>1-й специализированный зал · г. Худжанд · Владелец и тренер: {CLUB_CONTACT.ownerName}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-semibold tracking-tight text-[#1C1917]">
          Вольная Борьба
        </h1>
        <p className="text-xs sm:text-sm text-[#57534E] max-w-2xl leading-relaxed">
          {t.coursesInfoOnlyNotice}
        </p>
      </div>

      {course && (
        <motion.article
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-3xl border border-[#DDD3BE] bg-[#FFFDF9] overflow-hidden shadow-[0_16px_36px_-16px_rgba(28,25,23,0.08)]"
        >
          {/* Top Visual Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch border-b border-[#DDD3BE]">
            <div className="lg:col-span-7 p-4 sm:p-8 lg:p-10 flex flex-col justify-between gap-5 sm:gap-6">
              <div className="space-y-3.5 sm:space-y-4">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#78716C]">
                  <span className="font-semibold text-[#1C1917]">1-й зал · г. Худжанд</span>
                  <span aria-hidden="true" className="text-[#A8A29E]">·</span>
                  <span className="font-semibold text-[#9A5B13]">{t.negotiablePrice}</span>
                  <span aria-hidden="true" className="text-[#A8A29E]">·</span>
                  <a
                    href={CLUB_CONTACT.phoneHref}
                    className="inline-flex items-center gap-1 font-mono font-semibold text-[#1C1917] hover:text-[#C2410C] transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#C2410C]" />
                    <span>{CLUB_CONTACT.phoneFormatted}</span>
                  </a>
                </div>

                <h2 className="text-2xl sm:text-3xl font-display font-semibold text-[#1C1917] tracking-tight leading-snug">
                  Вольная Борьба
                </h2>

                <p className="text-sm text-[#57534E] leading-relaxed">
                  {course.description}
                </p>
              </div>

              {/* Coach & Mat Meta Block */}
              <div className="rounded-2xl bg-[#F7F1E6] border border-[#E6DEC8] p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#57534E]">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#FFFDF9] border border-[#DDD3BE] flex items-center justify-center text-[#9A5B13] shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[#78716C] block">{t.courseModalCoach}:</span>
                    <strong className="text-sm font-semibold text-[#1C1917]">
                      {CLUB_CONTACT.ownerName}
                    </strong>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#FFFDF9] border border-[#DDD3BE] flex items-center justify-center text-[#C2410C] shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[#78716C] block">Пн, Ср, Пт (3 смены) · Сб (Шн):</span>
                    <strong className="text-sm font-semibold text-[#1C1917]">
                      16:00–17:30 · 17:30–19:30 · 19:30–21:00 | Шн: Кросс
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 relative h-[320px] sm:h-[380px] lg:h-[440px] bg-[#1C1917] overflow-hidden">
              <video
                src={HERO_MEDIA.WRESTLING_VIDEO}
                poster={HERO_MEDIA.HERO_FALLBACK_IMAGE}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-label="Тренировка в зале вольной борьбы UsmonovTeam"
                className="w-full h-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1C1917]/85 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#1C1917]/40" />
              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-[#1C1917]/85 backdrop-blur-md text-[#FAF6F0] text-xs border border-white/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#FCD34D] shrink-0" />
                  <span>1-й зал UsmonovTeam · г. Худжанд</span>
                </div>
                <span className="font-mono text-[#FCD34D] font-semibold">{CLUB_CONTACT.phoneShort}</span>
              </div>
            </div>
          </div>

          {/* Highlights & Training Program Details */}
          <div className="p-4 sm:p-8 lg:p-10 space-y-5 sm:space-y-6 bg-[#FAF6F0]/70">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#78716C] mb-1">
                Особенности школы и ковра
              </p>
              <h3 className="text-lg sm:text-xl font-display font-semibold text-[#1C1917]">
                Программа подготовки борцов вольного стиля
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {highlights.map((h, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-[#DDD3BE] bg-[#FFFDF9] p-3.5 sm:p-4 space-y-1.5 shadow-[0_4px_12px_-6px_rgba(28,25,23,0.05)]"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#1C1917]">
                    <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
                    <span>{h.title}</span>
                  </div>
                  <p className="text-xs text-[#57534E] leading-relaxed">
                    {h.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Bottom CTA Bar */}
            <div className="rounded-2xl border border-[#DDD3BE] bg-[#FFFDF9] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-0.5 text-center sm:text-left">
                <p className="text-xs text-[#78716C]">{t.courseModalMonthlyFee}:</p>
                <p className="text-lg font-display font-bold text-[#9A5B13]">
                  {t.negotiablePrice} · Тел: {CLUB_CONTACT.phoneFormatted}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveCourse(course)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-[#D6CBB5] bg-[#FAF6F0] hover:border-[#1C1917] text-xs font-semibold text-[#1C1917] transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <Info className="w-4 h-4 text-[#C2410C]" />
                  <span>{t.viewCourseDetails}</span>
                </button>

                <a
                  href={CLUB_CONTACT.botUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>{t.coachCtaTelegram}</span>
                </a>
              </div>
            </div>
          </div>
        </motion.article>
      )}

      {/* Course Details Modal (Informational / View-Only) */}
      <AnimatePresence>
        {activeCourse && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Вольная Борьба"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1C1917]/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-lg rounded-2xl border border-[#DDD3BE] bg-[#FAF6F0] overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
            >
              <div className="relative aspect-[16/9] bg-[#292524] shrink-0">
                <ProductVisual
                  imageKey={activeCourse.imageKey}
                  alt="Вольная Борьба"
                  category={activeCourse.sportType}
                />
                <button
                  type="button"
                  onClick={() => setActiveCourse(null)}
                  aria-label={t.close}
                  className="absolute top-3 right-3 min-h-[40px] min-w-[40px] rounded-xl bg-[#FAF6F0]/90 text-[#1C1917] flex items-center justify-center border border-[#E6DEC8]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between gap-2 text-xs text-[#78716C]">
                  <span className="font-medium text-[#1C1917]">
                    {activeCourse.sportType} · {activeCourse.level}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#9A5B13]">
                    {t.negotiablePrice}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-display font-semibold text-[#1C1917]">
                  Вольная Борьба
                </h3>

                <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                  {activeCourse.description}
                </p>

                <div className="rounded-xl border border-[#E6DEC8] bg-[#FFFDF9] p-4 space-y-2 text-xs text-[#57534E]">
                  <p>
                    <strong className="text-[#1C1917]">{t.courseModalSchedule}:</strong>{' '}
                    Пн, Ср, Пт: 16:00–17:30 (1 смена), 17:30–19:30 (2 смена), 19:30–21:00 (3 смена) · Шн (Сб): Кросс
                  </p>
                  <p>
                    <strong className="text-[#1C1917]">{t.courseModalCoach}:</strong>{' '}
                    <span className="text-[#9A5B13] font-semibold">{CLUB_CONTACT.ownerName}</span>
                  </p>
                  <p>
                    <strong className="text-[#1C1917]">Телефон зала:</strong>{' '}
                    <a href={CLUB_CONTACT.phoneHref} className="font-mono font-semibold text-[#1C1917]">
                      {CLUB_CONTACT.phoneFormatted}
                    </a>
                  </p>
                  <p>
                    <strong className="text-[#1C1917]">{t.courseModalMonthlyFee}:</strong>{' '}
                    <span className="text-[#9A5B13] font-semibold">{t.negotiablePrice}</span>
                  </p>
                  <p className="text-[#78716C] pt-1 leading-relaxed">{t.courseModalVisitInfo}</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
                  <a
                    href={CLUB_CONTACT.botUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{t.coachCtaTelegram}</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setActiveCourse(null)}
                    className="min-h-[42px] px-5 py-2 rounded-xl border border-[#D6CBB5] bg-[#FFFFFF] text-[#1C1917] text-xs font-semibold hover:bg-[#FAF6F0] transition-colors"
                  >
                    {t.close}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
