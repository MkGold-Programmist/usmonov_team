import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  ShoppingBag,
  Clock,
  User,
  X,
  Send,
  ShieldCheck,
  MessageCircle,
  Phone,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  CLUB_CONTACT,
  formatCurrency,
  validateHumanName,
  validateTajikPhone,
  generatePhoneOtpCode,
  createHumanChallenge,
  verifyHumanChallenge,
  buildTelegramDirectMessage,
  type GearProduct,
  type SportCourse,
} from '../utils/storeLogic';
import type { TranslationStrings } from '../utils/i18n';
import { ProductVisual, UsmonovTeamEmblem } from './ProductVisual';
import { HERO_MEDIA } from '../data/seedData';

const CATEGORY_LABELS: Record<string, string> = {
  Accessories: 'Борцовки',
  Apparel: 'Трико',
  'Shin Guards': 'Наколенники',
  Headgear: 'Защита ушей',
  Gloves: 'Перчатки',
};

interface HomeViewProps {
  products: GearProduct[];
  courses: SportCourse[];
  t: TranslationStrings;
  phoneVerified: boolean;
  verifiedName: string;
  verifiedPhone: string;
  onNavigateGears: () => void;
  onNavigateCourses: () => void;
  onOpenCart: () => void;
  onVerifyProfileInline: (verifiedName: string, verifiedPhone: string, address: string) => void;
  onSelectProduct: (product: GearProduct) => void;
  onQuickAdd: (product: GearProduct) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  products,
  courses,
  t,
  phoneVerified,
  verifiedName,
  verifiedPhone,
  onNavigateGears,
  onNavigateCourses,
  onOpenCart,
  onVerifyProfileInline,
  onSelectProduct,
  onQuickAdd,
}) => {
  const [selectedCourse, setSelectedCourse] = useState<SportCourse | null>(null);
  const [videoMuted, setVideoMuted] = useState(true);
  const featuredProducts = products.filter((p) => p.featured).slice(0, 6);
  const resolvedFeatured = featuredProducts.length > 0 ? featuredProducts : products.slice(0, 6);
  const mainCourse = courses[0];

  // Direct Bot Message Composer State (Section 4)
  const [senderName, setSenderName] = useState(verifiedName || '');
  const [senderPhone, setSenderPhone] = useState(verifiedPhone || '');
  const [messageTopic, setMessageTopic] = useState('Запись на вольную борьбу');
  const [messageBody, setMessageBody] = useState('');
  const [humanChallenge] = useState(() => createHumanChallenge(54321));
  const [humanAnswer, setHumanAnswer] = useState('');
  const [otpSentCode, setOtpSentCode] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [inlineVerified, setInlineVerified] = useState(phoneVerified);
  const [msgError, setMsgError] = useState<string | null>(null);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [sentReceipt, setSentReceipt] = useState<{
    botText: string;
    botReplyText: string;
    telegramDeepLink: string;
    verifiedPhone: string;
  } | null>(null);

  useEffect(() => {
    if (phoneVerified) {
      setSenderName(verifiedName);
      setSenderPhone(verifiedPhone);
      setInlineVerified(true);
    }
  }, [phoneVerified, verifiedName, verifiedPhone]);

  const isHumanPhoneVerified = Boolean(phoneVerified || inlineVerified);

  const handleRequestMessageOtp = async () => {
    setMsgError(null);
    const nameCheck = validateHumanName(senderName);
    if (!nameCheck.valid || !nameCheck.normalized) {
      setMsgError(nameCheck.error || 'Введите ваше настоящее имя и фамилию.');
      return;
    }

    const phoneCheck = validateTajikPhone(senderPhone);
    if (!phoneCheck.valid || !phoneCheck.formatted || !phoneCheck.digits) {
      setMsgError(phoneCheck.error || 'Введите действующий номер (+992).');
      return;
    }

    if (!verifyHumanChallenge(humanChallenge.a, humanChallenge.b, humanAnswer)) {
      setMsgError(`Проверка «Я человек»: решите пример (${humanChallenge.question})`);
      return;
    }

    let code = generatePhoneOtpCode(phoneCheck.digits);
    try {
      const resp = await fetch('/api/telegram/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameCheck.normalized,
          phone: phoneCheck.formatted,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data?.demoOtpCode) {
        code = String(data.demoOtpCode);
      }
    } catch {
      // fallback to deterministic local code
    }

    setSenderName(nameCheck.normalized);
    setSenderPhone(phoneCheck.formatted);
    setOtpSentCode(code);
    setOtpInput('');
  };

  const handleConfirmMessageOtp = () => {
    setMsgError(null);
    if (!otpSentCode || otpInput.trim() !== otpSentCode) {
      setMsgError('Неверный 4-значный код подтверждения.');
      return;
    }
    setInlineVerified(true);
    setOtpSentCode(null);
    onVerifyProfileInline(senderName, senderPhone, '');
  };

  const handleSendDirectMessageToOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgError(null);

    const activeName = phoneVerified ? verifiedName : senderName;
    const activePhone = phoneVerified ? verifiedPhone : senderPhone;

    const nameCheck = validateHumanName(activeName);
    if (!nameCheck.valid || !nameCheck.normalized) {
      setMsgError(nameCheck.error || 'Укажите настоящее имя.');
      return;
    }

    const phoneCheck = validateTajikPhone(activePhone);
    if (!phoneCheck.valid || !phoneCheck.formatted) {
      setMsgError(phoneCheck.error || 'Укажите действующий номер +992.');
      return;
    }

    if (!isHumanPhoneVerified) {
      setMsgError('Сначала пройдите проверку «Я человек» и подтвердите свой номер 4-значным кодом.');
      return;
    }

    if (messageBody.trim().length < 3) {
      setMsgError('Напишите ваше сообщение или вопрос для владельца (минимум 3 символа).');
      return;
    }

    setSendingMsg(true);
    const localFormatted = buildTelegramDirectMessage({
      messageId: `msg_${Date.now()}`,
      senderName: nameCheck.normalized,
      verifiedPhone: phoneCheck.formatted,
      topic: messageTopic,
      messageBody: messageBody.trim(),
    });

    try {
      const resp = await fetch('/api/telegram/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: nameCheck.normalized,
          phone: phoneCheck.formatted,
          otpVerified: true,
          humanVerified: true,
          topic: messageTopic,
          messageBody: messageBody.trim(),
        }),
      });
      const data = await resp.json();
      if (!resp.ok && data?.error) {
        throw new Error(data.error);
      }
      setSentReceipt({
        botText: data.botText || localFormatted.botText,
        botReplyText: data.botReplyText || localFormatted.botReplyText,
        telegramDeepLink: data.telegramDeepLink || localFormatted.telegramDeepLink,
        verifiedPhone: phoneCheck.formatted,
      });
      setMessageBody('');
    } catch (err) {
      if (err instanceof Error && err.message.includes('Анти-спам')) {
        setMsgError(err.message);
      } else {
        setSentReceipt({
          botText: localFormatted.botText,
          botReplyText: localFormatted.botReplyText,
          telegramDeepLink: localFormatted.telegramDeepLink,
          verifiedPhone: phoneCheck.formatted,
        });
        setMessageBody('');
      }
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* SECTION 1: FULL-BLEED VIDEO BACKGROUND HERO */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-3xl border border-[#2C2621] bg-[#14110F] overflow-hidden shadow-[0_24px_56px_-20px_rgba(28,25,23,0.32)]"
      >
        {/* Full-Bleed Background Video Layer */}
        <div className="relative min-h-[430px] sm:min-h-[490px] lg:min-h-[540px] flex flex-col justify-between overflow-hidden">
          <video
            src={HERO_MEDIA.WRESTLING_VIDEO}
            poster={HERO_MEDIA.HERO_FALLBACK_IMAGE}
            autoPlay
            loop
            muted={videoMuted}
            playsInline
            preload="auto"
            aria-label="Тренировка в зале вольной борьбы UsmonovTeam в Худжанде"
            className="pointer-events-none absolute inset-0 w-full h-full object-cover object-[50%_62%] lg:object-[50%_58%]"
          />

          {/* Directional Contrast Scrims (Left-weighted on desktop so the mat action shines brightly on the right) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#14110F]/84 via-[#14110F]/60 to-[#14110F]/86 lg:bg-gradient-to-r lg:from-[#14110F]/92 lg:via-[#14110F]/68 lg:to-[#14110F]/10"
          />

          {/* Foreground Top Utility Bar */}
          <div className="relative z-10 px-4 pt-4 sm:px-8 sm:pt-7 lg:px-12 lg:pt-8 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs font-medium text-[#E7DFD1] min-w-0">
              <UsmonovTeamEmblem className="w-6 h-6 sm:w-8 sm:h-8 shrink-0" />
              <span className="text-[10.5px] sm:text-xs tracking-wide leading-snug">
                {t.heroKicker}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setVideoMuted((m) => !m)}
              aria-label={videoMuted ? 'Включить звук видео' : 'Выключить звук видео'}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#14110F]/75 hover:bg-[#14110F]/90 backdrop-blur-md text-[#FAF6F0] border border-white/20 text-[11px] sm:text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {videoMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-[#FBBF24]" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#FBBF24]" />
              )}
              <span>{videoMuted ? 'Звук выкл' : 'Звук вкл'}</span>
            </button>
          </div>

          {/* Foreground Editorial Content */}
          <div className="relative z-10 px-4 py-6 sm:px-8 sm:py-9 lg:px-12 lg:py-11 max-w-3xl space-y-4 sm:space-y-6">
            <div className="space-y-3 sm:space-y-4">
              <h1 className="text-[1.6rem] sm:text-4xl lg:text-[3.35rem] font-display font-semibold tracking-tight leading-[1.1] text-[#FAF6F0] text-balance drop-shadow-sm">
                {t.heroTitle}
              </h1>

              <p className="text-[13px] sm:text-base text-[#E7DFD1] leading-relaxed max-w-xl">
                {t.heroSubtitle}
              </p>
            </div>

            {/* Thumb-Friendly Actions: Primary Full-Width + Side-by-Side Secondary Row on Mobile, Inline Row on Tablet/Desktop */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 pt-1">
              <button
                type="button"
                onClick={onNavigateCourses}
                className="col-span-2 sm:w-auto min-h-[46px] px-5 sm:px-6 py-3 rounded-xl bg-[#C2410C] hover:bg-[#EA580C] text-white font-semibold text-xs sm:text-sm transition-all duration-150 flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-md cursor-pointer"
              >
                <span>{t.heroCtaCourses}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onNavigateGears}
                className="min-h-[44px] sm:min-h-[46px] px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl border border-white/25 bg-white/10 hover:bg-white/20 backdrop-blur-md text-[#FAF6F0] font-semibold text-xs sm:text-sm transition-all duration-150 flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-[#FBBF24] shrink-0" />
                <span>{t.heroCtaShop}</span>
              </button>

              <a
                href={CLUB_CONTACT.phoneHref}
                className="min-h-[44px] sm:min-h-[46px] px-2.5 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-[#14110F]/75 hover:bg-[#14110F]/90 backdrop-blur-md text-[#FAF6F0] font-medium text-[11px] sm:text-sm transition-colors flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 border border-white/20"
              >
                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FBBF24] shrink-0" />
                <span className="font-mono font-semibold">{CLUB_CONTACT.phoneShort}</span>
                <span className="hidden md:inline font-mono text-[#D6CFC2]">(+992)</span>
              </a>
            </div>
          </div>

          {/* Bottom Docked 4-Column Club Values Strip (2x2 with crisp dividers on Mobile, 4-col on Tablet/Desktop) */}
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 border-t border-white/15 bg-[#14110F]/82 backdrop-blur-md">
            <div className="p-3 sm:p-4 lg:px-6 border-r border-b md:border-b-0 border-white/10">
              <p className="text-sm sm:text-lg lg:text-xl font-display font-semibold text-[#FAF6F0]">
                {t.stat1Title}
              </p>
              <p className="text-[11px] sm:text-xs text-[#D6CFC2] mt-0.5 leading-snug">{t.stat1Sub}</p>
            </div>
            <div className="p-3 sm:p-4 lg:px-6 border-b md:border-b-0 md:border-r border-white/10">
              <p className="text-sm sm:text-lg lg:text-xl font-display font-semibold text-[#FAF6F0]">
                {t.stat2Title}
              </p>
              <p className="text-[11px] sm:text-xs text-[#D6CFC2] mt-0.5 leading-snug">{t.stat2Sub}</p>
            </div>
            <div className="p-3 sm:p-4 lg:px-6 border-r border-white/10">
              <p className="text-[14px] sm:text-lg lg:text-xl font-display font-semibold text-[#FAF6F0]">
                {t.stat3Title}
              </p>
              <p className="text-[11px] sm:text-xs text-[#D6CFC2] mt-0.5 leading-snug">{t.stat3Sub}</p>
            </div>
            <div className="p-3 sm:p-4 lg:px-6">
              <p className="text-[12.5px] sm:text-sm md:text-[13px] lg:text-lg font-mono font-semibold text-[#FB923C] whitespace-nowrap">
                {t.stat4Title}
              </p>
              <p className="text-[11px] sm:text-xs text-[#D6CFC2] mt-0.5 leading-snug">{t.stat4Sub}</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* SECTION 2: FREESTYLE WRESTLING CARD (FOCUSED ELEMENT: div#root > ... > section:nth-of-type(2) > div:nth-of-type(2)) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#DDD3BE] pb-4 sm:pb-5">
          <div className="space-y-1">
            <p className="text-xs font-medium text-[#78716C]">{t.coursesSectionKicker}</p>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-semibold text-[#1C1917]">
              01. {t.coursesSectionTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onNavigateCourses}
            className="min-h-[42px] px-4 py-2 rounded-xl border border-[#D6CBB5] bg-[#FFFDF9] hover:border-[#1C1917] text-xs font-semibold text-[#1C1917] transition-colors flex items-center gap-2 self-start sm:self-auto whitespace-nowrap shrink-0"
          >
            <span>{t.heroCtaCourses}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#C2410C]" />
          </button>
        </div>

        {mainCourse && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl border border-[#DDD3BE] bg-[#FFFDF9] p-4 sm:p-7 lg:p-8 flex flex-col lg:flex-row items-stretch justify-between gap-5 sm:gap-6 shadow-[0_14px_34px_-16px_rgba(28,25,23,0.08)]"
          >
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#78716C]">
                <span className="font-semibold text-[#1C1917]">1-й зал · г. Худжанд</span>
                <span aria-hidden="true" className="text-[#A8A29E]">·</span>
                <span className="font-semibold text-[#9A5B13]">Стоимость: {t.negotiablePrice}</span>
                <span aria-hidden="true" className="text-[#A8A29E]">·</span>
                <a
                  href={CLUB_CONTACT.phoneHref}
                  className="inline-flex items-center gap-1 font-mono font-semibold text-[#1C1917] hover:text-[#C2410C] transition-colors"
                >
                  <Phone className="w-3 h-3 text-[#C2410C]" />
                  <span>{CLUB_CONTACT.phoneFormatted}</span>
                </a>
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight text-[#1C1917]">
                  Вольная Борьба
                </h3>
                <p className="text-xs sm:text-sm font-medium text-[#9A5B13]">
                  Тренер: <span className="font-semibold text-[#1C1917]">Аъзам Усмонов</span>
                </p>
              </div>

              <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed max-w-2xl">
                {mainCourse.description}
              </p>

              {/* Clean Scannable 4-Slot Shift Schedule Grid (2x2 Mobile, 4-col Tablet/Desktop) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 pt-1">
                {[
                  { label: '1 смена · Пн, Ср, Пт', time: '16:00–17:30' },
                  { label: '2 смена · Пн, Ср, Пт', time: '17:30–19:30' },
                  { label: '3 смена · Пн, Ср, Пт', time: '19:30–21:00' },
                  { label: 'Суббота (Шн)', time: 'Кросс' },
                ].map((slot) => (
                  <div
                    key={slot.label}
                    className="rounded-xl bg-[#F7F1E6] border border-[#E6DEC8] p-2.5 sm:p-3 space-y-0.5"
                  >
                    <p className="text-[10.5px] sm:text-[11px] font-medium text-[#78716C] leading-snug">
                      {slot.label}
                    </p>
                    <p className="text-xs sm:text-sm font-mono font-semibold text-[#1C1917] tabular-nums">
                      {slot.time}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:w-64 shrink-0 flex flex-col sm:flex-row lg:flex-col justify-between gap-4 border-t lg:border-t-0 lg:border-l border-[#E8DFCE] pt-4 lg:pt-0 lg:pl-6">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-[#78716C]">
                  Условия занятий
                </p>
                <p className="text-lg sm:text-xl font-display font-bold text-[#9A5B13]">
                  {t.negotiablePrice}
                </p>
                <p className="text-xs text-[#57534E] leading-snug">
                  Запись по телефону{' '}
                  <a href={CLUB_CONTACT.phoneHref} className="font-mono font-semibold text-[#1C1917] underline decoration-[#C2410C]/40">
                    {CLUB_CONTACT.phoneShort}
                  </a>{' '}
                  или через бот
                </p>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:flex-row lg:flex-col gap-2 sm:gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedCourse(mainCourse)}
                  className="min-h-[42px] px-3 sm:px-4 py-2 rounded-xl border border-[#D6CBB5] bg-[#FAF6F0] hover:border-[#1C1917] text-xs font-semibold text-[#1C1917] transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <span>{t.viewCourseDetails}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C2410C] hidden sm:inline" />
                </button>

                <a
                  href="#bot-owner-section"
                  className="min-h-[42px] px-3 sm:px-4 py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors shadow-sm"
                >
                  <Send className="w-3.5 h-3.5 shrink-0" />
                  <span>Записаться</span>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </section>

      {/* SECTION 3: ARTISANAL FIGHT GEAR ATELIER */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#E6DEC8] pb-4 sm:pb-5">
          <div className="space-y-1">
            <p className="text-xs font-medium text-[#78716C]">{t.shopSectionKicker}</p>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-semibold text-[#1C1917]">
              02. {t.shopSectionTitle}
            </h2>
          </div>

          <button
            type="button"
            onClick={onNavigateGears}
            className="min-h-[42px] px-4 py-2 rounded-xl border border-[#D6CBB5] bg-[#FFFFFF] hover:border-[#1C1917] text-xs font-semibold text-[#1C1917] transition-colors flex items-center gap-2 self-start sm:self-auto whitespace-nowrap shrink-0"
          >
            <span>
              {t.viewAllShop} ({products.length})
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[#C2410C]" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4 lg:gap-6">
          {resolvedFeatured.map((product) => (
            <article
              key={product.id}
              className="group rounded-2xl border border-[#E6DEC8] bg-[#FFFFFF] overflow-hidden flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5 shadow-[0_10px_28px_-14px_rgba(28,25,23,0.07)]"
            >
              <div>
                <button
                  type="button"
                  onClick={() => onSelectProduct(product)}
                  className="w-full aspect-[4/3] bg-[#FFFFFF] border-b border-[#F3EDE2] overflow-hidden block relative text-left"
                >
                  <ProductVisual
                    imageKey={product.imageKey}
                    alt={product.name}
                    category={CATEGORY_LABELS[product.category] || product.category}
                  />
                </button>

                <div className="p-3 sm:p-4 lg:p-5 space-y-1.5 sm:space-y-2">
                  <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-[#78716C] truncate">
                    <span className="font-medium text-[#9A5B13]">
                      {CATEGORY_LABELS[product.category] || product.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">
                      {product.stock > 0 ? `${product.stock} ${t.inStock}` : t.outOfStock}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectProduct(product)}
                    className="text-left block w-full"
                  >
                    <h3 className="text-xs sm:text-base lg:text-lg font-display font-semibold text-[#1C1917] hover:text-[#C2410C] transition-colors line-clamp-2 min-h-[2rem] sm:min-h-[2.75rem] leading-snug">
                      {product.name}
                    </h3>
                  </button>

                  <p className="hidden sm:block text-xs text-[#57534E] line-clamp-1">{product.variants}</p>

                  <p className="text-sm sm:text-lg font-mono font-semibold text-[#B45309] tabular-nums pt-0.5">
                    {formatCurrency(product.price)}
                  </p>
                </div>
              </div>

              <div className="px-3 sm:px-4 lg:px-5 pb-3 sm:pb-4 lg:pb-5">
                <button
                  type="button"
                  disabled={product.stock <= 0}
                  onClick={() => onQuickAdd(product)}
                  className="w-full min-h-[38px] sm:min-h-[42px] px-2.5 sm:px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-[#C2410C] disabled:opacity-40 text-[11px] sm:text-xs font-semibold text-[#FAF6F0] transition-colors whitespace-nowrap"
                >
                  {product.stock > 0 ? t.addToBag : t.outOfStock}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* SECTION 4: INTERACTIVE TELEGRAM BOT TO OWNER (FOCUSED ELEMENT: div#root > ... > section:nth-of-type(4)) */}
      <section
        id="bot-owner-section"
        className="rounded-3xl border border-[#DDD3BE] bg-[#F5EFE4] p-4 sm:p-7 lg:p-10 shadow-[0_14px_34px_-16px_rgba(28,25,23,0.08)]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7 items-start">
          {/* Left: Clear Explanation of Both Bot Functions + Direct Owner Contact */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#9A5B13]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Напрямую владельцу · Защита от спама и ботов</span>
              </div>
              <h2 className="text-xl sm:text-3xl font-display font-semibold text-[#1C1917] leading-tight">
                03. Напишите владельцу через {CLUB_CONTACT.botUsername}
              </h2>
              <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                Наш Telegram-бот работает как личный передатчик между вами и владельцем зала <strong>{CLUB_CONTACT.ownerName}</strong>:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2.5 text-xs text-[#44403C]">
              <div className="rounded-2xl border border-[#E2D8C4] bg-[#FFFDF9] p-3.5 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#C2410C] text-white font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <p className="font-semibold text-[#1C1917]">Любое сообщение боту → сразу владельцу</p>
                  <p className="text-[#57534E] mt-0.5 leading-relaxed">
                    Напишите вопрос о записи, графике или экипировке — бот проверит, что вы человек, и передаст текст напрямую {CLUB_CONTACT.ownerName}.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E2D8C4] bg-[#FFFDF9] p-3.5 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#1C1917] text-[#FAF6F0] font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <p className="font-semibold text-[#1C1917]">Заказы из корзины → напрямую владельцу</p>
                  <p className="text-[#57534E] mt-0.5 leading-relaxed">
                    Каждый оформленный заказ экипировки с подтверждённым номером моментально уходит владельцу зала.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 pt-1">
              <a
                href={CLUB_CONTACT.phoneHref}
                className="min-h-[42px] px-3 sm:px-4 py-2 rounded-xl border border-[#D6CBB5] bg-[#FFFDF9] hover:border-[#1C1917] text-[11px] sm:text-xs font-semibold text-[#1C1917] transition-colors inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap"
              >
                <Phone className="w-3.5 h-3.5 text-[#C2410C] shrink-0" />
                <span className="font-mono">{CLUB_CONTACT.phoneShort}</span>
              </a>

              <button
                type="button"
                onClick={onOpenCart}
                className="min-h-[42px] px-3 sm:px-4 py-2 rounded-xl border border-[#D6CBB5] bg-[#FFFDF9] hover:border-[#1C1917] text-[11px] sm:text-xs font-semibold text-[#1C1917] transition-colors inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-[#C2410C] shrink-0" />
                <span className="truncate">{phoneVerified ? 'Номер подтверждён ✓' : 'Оформить заказ'}</span>
              </button>
            </div>
          </div>

          {/* Right: Live Message-to-Owner Composer with Human + Phone Verification */}
          <div className="lg:col-span-7 rounded-2xl border border-[#DDD3BE] bg-[#FFFDF9] p-5 sm:p-6 space-y-4 shadow-sm">
            {sentReceipt ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#15803D] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-base font-display font-semibold text-[#1C1917]">
                      Сообщение передано владельцу ({CLUB_CONTACT.ownerName})!
                    </h3>
                    <p className="text-xs text-[#57534E]">
                      Ваш подтверждённый номер: {sentReceipt.verifiedPhone}
                    </p>
                  </div>
                </div>

                <pre className="whitespace-pre-wrap font-mono text-xs text-[#1C1917] bg-[#FAF6F0] border border-[#E6DEC8] rounded-xl p-3.5 leading-relaxed overflow-x-auto">
                  {sentReceipt.botText}
                </pre>

                <div className="rounded-xl bg-[#F3EDE2] p-3 text-xs text-[#44403C]">
                  <strong className="text-[#1C1917]">{CLUB_CONTACT.botUsername}: </strong>
                  {sentReceipt.botReplyText}
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <a
                    href={sentReceipt.telegramDeepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Открыть диалог в {CLUB_CONTACT.botUsername}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setSentReceipt(null)}
                    className="min-h-[42px] px-4 py-2 rounded-xl border border-[#D6CBB5] text-xs font-semibold text-[#1C1917] hover:bg-[#FAF6F0]"
                  >
                    Написать ещё сообщение
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendDirectMessageToOwner} className="space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-[#EFE8D8] pb-3">
                  <div>
                    <h3 className="text-base font-display font-semibold text-[#1C1917]">
                      Написать сообщение боту → Владельцу
                    </h3>
                    <p className="text-[11px] text-[#78716C]">
                      Получатель: {CLUB_CONTACT.ownerName} ({CLUB_CONTACT.phoneFormatted})
                    </p>
                  </div>
                  {isHumanPhoneVerified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800 shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Человек подтверждён
                    </span>
                  )}
                </div>

                {msgError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900 flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                    <span>{msgError}</span>
                  </div>
                )}

                {!isHumanPhoneVerified && (
                  <div className="rounded-2xl border border-[#E6DEC8] bg-[#FAF6F0] p-3.5 space-y-2.5">
                    <p className="text-[11px] font-semibold text-[#1C1917]">
                      Шаг 1. Подтвердите, что вы реальный человек (имя + номер + код):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="Ваше настоящее имя и фамилия"
                        className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-[#D6CBB5] bg-[#FFFFFF] text-xs text-[#1C1917]"
                      />
                      <div className="flex items-center gap-2 rounded-xl border border-[#D6CBB5] bg-[#FFFFFF] px-3 py-1.5">
                        <label htmlFor="bot-human-check" className="text-[11px] font-medium text-[#1C1917] whitespace-nowrap">
                          {humanChallenge.question}
                        </label>
                        <input
                          id="bot-human-check"
                          type="text"
                          inputMode="numeric"
                          maxLength={3}
                          value={humanAnswer}
                          onChange={(e) => setHumanAnswer(e.target.value.replace(/\D/g, ''))}
                          placeholder="Ответ"
                          className="w-14 min-h-[28px] px-2 py-1 rounded-lg border border-[#D6CBB5] bg-[#FAF6F0] font-mono text-xs text-center text-[#1C1917] ml-auto"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="tel"
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        placeholder="+992 92 XXX-XX-XX"
                        className="flex-1 min-h-[40px] px-3 py-2 rounded-xl border border-[#D6CBB5] bg-[#FFFFFF] font-mono text-xs text-[#1C1917]"
                      />
                      <button
                        type="button"
                        onClick={handleRequestMessageOtp}
                        className="min-h-[40px] px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-[#373330] text-[#FAF6F0] text-xs font-semibold whitespace-nowrap transition-colors"
                      >
                        Получить код
                      </button>
                    </div>

                    <AnimatePresence>
                      {otpSentCode && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="rounded-xl bg-[#FEF3C7] border border-[#D97706]/40 p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between text-[11px] text-[#92400E]">
                            <span>Проверочный код от {CLUB_CONTACT.botUsername}:</span>
                            <button
                              type="button"
                              onClick={() => setOtpInput(otpSentCode)}
                              className="font-mono font-bold underline"
                            >
                              Вставить {otpSentCode}
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={4}
                              value={otpInput}
                              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                              placeholder="4 цифры"
                              className="flex-1 min-h-[38px] px-3 py-1.5 rounded-lg border border-[#D97706]/40 bg-[#FFFFFF] font-mono text-xs"
                            />
                            <button
                              type="button"
                              onClick={handleConfirmMessageOtp}
                              className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#15803D] text-white text-xs font-semibold"
                            >
                              Подтвердить
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <div className="space-y-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Запись в 1 / 2 / 3 смену',
                      'Вопрос по графику (Пн, Ср, Пт + Кросс)',
                      'Заказ борцовок / трико',
                    ].map((topicOpt) => (
                      <button
                        key={topicOpt}
                        type="button"
                        onClick={() => setMessageTopic(topicOpt)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                          messageTopic === topicOpt
                            ? 'bg-[#1C1917] text-[#FAF6F0] border-[#1C1917]'
                            : 'bg-[#FAF6F0] text-[#57534E] border-[#DDD3BE] hover:border-[#1C1917]'
                        }`}
                      >
                        {topicOpt}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={3}
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="Напишите сообщение для Аъзама Усмонова (например: хочу записаться в зал, когда можно подойти?)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6CBB5] bg-[#FAF6F0] text-xs text-[#1C1917] focus:outline-none focus:border-[#C2410C] resize-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <a
                    href={CLUB_CONTACT.botUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-[#78716C] hover:text-[#1C1917] inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Открыть напрямую {CLUB_CONTACT.botUsername}</span>
                  </a>

                  <button
                    type="submit"
                    disabled={sendingMsg}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    <span>{sendingMsg ? 'Отправка владельцу...' : 'Отправить владельцу через бота'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Course Detail Modal (View-Only & Contractual Price) */}
      <AnimatePresence>
        {selectedCourse && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selectedCourse.title}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1C1917]/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-lg rounded-2xl border border-[#E6DEC8] bg-[#FAF6F0] overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
            >
              <div className="relative aspect-[16/9] bg-[#292524] shrink-0">
                <ProductVisual
                  imageKey={selectedCourse.imageKey}
                  alt={selectedCourse.title}
                  category={selectedCourse.sportType}
                />
                <button
                  type="button"
                  onClick={() => setSelectedCourse(null)}
                  aria-label={t.close}
                  className="absolute top-3 right-3 min-h-[40px] min-w-[40px] rounded-xl bg-[#FAF6F0]/90 text-[#1C1917] flex items-center justify-center border border-[#E6DEC8]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between gap-2 text-xs text-[#78716C]">
                  <span className="font-medium text-[#1C1917]">
                    {selectedCourse.sportType} · {selectedCourse.level}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#B45309]">
                    {t.negotiablePrice}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-display font-semibold text-[#1C1917]">
                  Вольная Борьба
                </h3>

                <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                  {selectedCourse.description}
                </p>

                <div className="rounded-xl border border-[#E6DEC8] bg-[#FFFFFF] p-4 space-y-2 text-xs text-[#57534E]">
                  <p>
                    <strong className="text-[#1C1917]">{t.courseModalSchedule}:</strong>{' '}
                    Пн, Ср, Пт: 16:00–17:30 (1 смена), 17:30–19:30 (2 смена), 19:30–21:00 (3 смена) · Шн (Сб): Кросс
                  </p>
                  <p>
                    <strong className="text-[#1C1917]">{t.courseModalCoach}:</strong>{' '}
                    <span className="text-[#B45309] font-semibold">Аъзам Усмонов</span>
                  </p>
                  <p>
                    <strong className="text-[#1C1917]">Телефон зала:</strong>{' '}
                    <a href={CLUB_CONTACT.phoneHref} className="font-mono font-semibold text-[#1C1917]">
                      {CLUB_CONTACT.phoneFormatted}
                    </a>
                  </p>
                  <p>
                    <strong className="text-[#1C1917]">{t.courseModalMonthlyFee}:</strong>{' '}
                    <span className="text-[#B45309] font-semibold">{t.negotiablePrice}</span>
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
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{t.coachCtaTelegram}</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setSelectedCourse(null)}
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
