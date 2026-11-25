import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Send,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  CLUB_CONTACT,
  calculateCartTotals,
  formatCurrency,
  validateHumanName,
  validateTajikPhone,
  generatePhoneOtpCode,
  createHumanChallenge,
  verifyHumanChallenge,
  type CartItem,
  type FighterProfile,
  type TelegramBotOrderMessage,
} from '../utils/storeLogic';
import type { TranslationStrings } from '../utils/i18n';
import { ProductVisual } from './ProductVisual';

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  profile: FighterProfile;
  t: TranslationStrings;
  onClose: () => void;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onVerifyProfileInline: (verifiedName: string, verifiedPhone: string, address: string) => void;
  onCheckoutViaTelegramBot: (
    promoCode: string,
    verifiedName: string,
    verifiedPhone: string,
    shippingAddress: string
  ) => Promise<TelegramBotOrderMessage | null>;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  items,
  profile,
  t,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onVerifyProfileInline,
  onCheckoutViaTelegramBot,
}) => {
  const [promoCode, setPromoCode] = useState('');
  const [customerName, setCustomerName] = useState(profile.displayName || '');
  const [phoneInput, setPhoneInput] = useState(profile.phone || '');
  const [addressInput, setAddressInput] = useState(profile.shippingAddress || '');

  const [humanChallenge, setHumanChallenge] = useState(() => createHumanChallenge(12345));
  const [humanAnswer, setHumanAnswer] = useState('');
  const [otpSentCode, setOtpSentCode] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [inlineVerified, setInlineVerified] = useState<boolean>(Boolean(profile.phoneVerified));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBotReceipt, setConfirmedBotReceipt] =
    useState<TelegramBotOrderMessage | null>(null);

  useEffect(() => {
    if (profile.phoneVerified) {
      setCustomerName(profile.displayName);
      setPhoneInput(profile.phone);
      setInlineVerified(true);
    }
  }, [profile.phoneVerified, profile.displayName, profile.phone]);

  if (!isOpen) return null;

  const isPhoneReady = Boolean(profile.phoneVerified || inlineVerified);
  const totals = calculateCartTotals(items, promoCode);
  const hasOutOfStockItem = items.some((item) => item.product.stock <= 0);

  const handleSendInlineOtp = () => {
    setErrorMsg(null);
    const nameCheck = validateHumanName(customerName || profile.displayName);
    if (!nameCheck.valid || !nameCheck.normalized) {
      setErrorMsg(nameCheck.error || 'Введите ваше настоящее имя и фамилию.');
      return;
    }

    const phoneCheck = validateTajikPhone(phoneInput || profile.phone);
    if (!phoneCheck.valid || !phoneCheck.formatted || !phoneCheck.digits) {
      setErrorMsg(phoneCheck.error || 'Введите корректный номер +992.');
      return;
    }

    if (!verifyHumanChallenge(humanChallenge.a, humanChallenge.b, humanAnswer)) {
      setErrorMsg(`Проверка «Я человек»: решите пример (${humanChallenge.question})`);
      return;
    }

    const code = generatePhoneOtpCode(phoneCheck.digits);
    setCustomerName(nameCheck.normalized);
    setPhoneInput(phoneCheck.formatted);
    setOtpSentCode(code);
    setOtpInput('');
  };

  const handleVerifyInlineOtp = () => {
    setErrorMsg(null);
    if (!otpSentCode || otpInput.trim() !== otpSentCode) {
      setErrorMsg('Неверный 4-значный код подтверждения.');
      return;
    }
    setInlineVerified(true);
    setOtpSentCode(null);
    onVerifyProfileInline(customerName, phoneInput, addressInput);
  };

  const handleSendOrderToBot = async () => {
    setErrorMsg(null);
    const activeName = profile.phoneVerified ? profile.displayName : customerName;
    const activePhone = profile.phoneVerified ? profile.phone : phoneInput;

    const nameCheck = validateHumanName(activeName);
    if (!nameCheck.valid || !nameCheck.normalized) {
      setErrorMsg(nameCheck.error || 'Укажите настоящее имя перед заказом.');
      return;
    }

    const phoneCheck = validateTajikPhone(activePhone);
    if (!phoneCheck.valid || !phoneCheck.formatted) {
      setErrorMsg(phoneCheck.error || 'Укажите действующий номер +992.');
      return;
    }

    if (!isPhoneReady) {
      setErrorMsg('Сначала подтвердите ваш номер телефона (+992) 4-значным кодом.');
      return;
    }

    setSubmitting(true);
    try {
      const receipt = await onCheckoutViaTelegramBot(
        promoCode,
        nameCheck.normalized,
        phoneCheck.formatted,
        addressInput || profile.shippingAddress
      );
      if (receipt) {
        setConfirmedBotReceipt(receipt);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Не удалось отправить заказ в бот.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.cartTitle}
      className="fixed inset-0 z-50 flex justify-end bg-[#1C1917]/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full sm:max-w-md bg-[#FAF6F0] border-l border-[#E6DEC8] h-full flex flex-col justify-between shadow-2xl"
      >
        {/* Drawer Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[#E6DEC8] bg-[#FFFFFF] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#C2410C]" />
            <h2 className="text-base sm:text-lg font-display font-semibold text-[#1C1917]">
              {t.cartTitle} ({totals.itemCount})
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              setConfirmedBotReceipt(null);
              onClose();
            }}
            aria-label={t.close}
            className="min-w-[40px] min-h-[40px] rounded-xl border border-[#D6CBB5] bg-[#FAF6F0] flex items-center justify-center text-[#57534E] hover:text-[#1C1917]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {confirmedBotReceipt ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-emerald-300 bg-[#FFFFFF] p-4 sm:p-5 space-y-4 shadow-sm"
            >
              <div className="flex items-center gap-2.5 text-emerald-800">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="text-base font-display font-semibold text-[#1C1917]">
                    Заказ отправлен напрямую владельцу!
                  </h3>
                  <p className="text-xs text-[#57534E]">
                    Получатель: {CLUB_CONTACT.ownerName} ({CLUB_CONTACT.phoneFormatted}) · Ваш номер: {confirmedBotReceipt.verifiedPhone}
                  </p>
                </div>
              </div>

              <pre className="whitespace-pre-wrap font-mono text-xs text-[#1C1917] bg-[#FAF6F0] border border-[#E6DEC8] rounded-xl p-3 sm:p-3.5 leading-relaxed overflow-x-auto">
                {confirmedBotReceipt.botText}
              </pre>

              <div className="rounded-xl bg-[#F3EDE2] p-3 sm:p-3.5 text-xs text-[#44403C]">
                <strong className="text-[#1C1917]">@UsmonovTeamBot: </strong>
                {confirmedBotReceipt.botReplyText}
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <a
                  href={confirmedBotReceipt.telegramDeepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>{t.openInTelegramButton}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setConfirmedBotReceipt(null);
                    onClose();
                  }}
                  className="w-full min-h-[42px] px-4 py-2 rounded-xl border border-[#D6CBB5] text-xs font-semibold text-[#1C1917] hover:bg-[#F3EDE2]"
                >
                  {t.close}
                </button>
              </div>
            </motion.div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-sm text-[#57534E]">{t.cartEmpty}</p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={`${item.product.id}-${item.selectedSize}`}
                    className="rounded-2xl border border-[#E6DEC8] bg-[#FFFFFF] p-3.5 sm:p-4 flex items-center gap-3 sm:gap-4"
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#F3EDE2] overflow-hidden shrink-0">
                      <ProductVisual
                        imageKey={item.product.imageKey}
                        alt={item.product.name}
                        category={item.product.category}
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <h3 className="text-xs sm:text-sm font-display font-semibold text-[#1C1917] truncate">
                        {item.product.name}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-[#78716C]">
                        Размер: {item.selectedSize} · {formatCurrency(item.product.price)} ·{' '}
                        <span className={item.product.stock > 0 ? 'text-[#15803D]' : 'text-red-700 font-semibold'}>
                          {item.product.stock > 0 ? `${item.product.stock} шт.` : 'Нет в наличии'}
                        </span>
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1 rounded-lg border border-[#D6CBB5] bg-[#FAF6F0] px-1">
                          <button
                            type="button"
                            aria-label="Уменьшить количество"
                            onClick={() => onUpdateQuantity(idx, -1)}
                            className="min-w-[28px] min-h-[28px] flex items-center justify-center text-[#57534E] hover:text-[#1C1917]"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-mono text-xs font-semibold text-[#1C1917] tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="Увеличить количество"
                            disabled={item.quantity >= item.product.stock}
                            onClick={() => onUpdateQuantity(idx, 1)}
                            className="min-w-[28px] min-h-[28px] flex items-center justify-center text-[#57534E] hover:text-[#1C1917] disabled:opacity-35"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          aria-label={`Удалить ${item.product.name}`}
                          onClick={() => onRemoveItem(idx)}
                          className="min-w-[32px] min-h-[32px] flex items-center justify-center text-[#78716C] hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Anti-Prankster Registration & Phone Verification Gate Inside Drawer */}
              <div className="rounded-2xl border border-[#E6DEC8] bg-[#FFFFFF] p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1C1917]">
                  <ShieldCheck className="w-4 h-4 text-[#15803D] shrink-0" />
                  <span className="truncate">
                    {isPhoneReady
                      ? `Профиль подтверждён: ${
                          profile.phoneVerified ? profile.displayName : customerName
                        }`
                      : 'Обязательная регистрация перед заказом'}
                  </span>
                </div>

                {!isPhoneReady && (
                  <p className="text-[11px] text-[#57534E] leading-relaxed">
                    Чтобы убедиться, что вы реальный человек, а не бот или шутник: введите настоящее имя, номер (+992), решите короткую проверку и подтвердите телефон 4-значным кодом. После этого заказ уйдёт напрямую владельцу ({CLUB_CONTACT.ownerName}).
                  </p>
                )}

                {errorMsg && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900 flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {!isPhoneReady && (
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ваше настоящее имя и фамилия"
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-[#D6CBB5] bg-[#FAF6F0] text-xs text-[#1C1917]"
                    />
                    <div className="flex items-center gap-2 rounded-xl border border-[#E6DEC8] bg-[#FAF6F0] px-3 py-2">
                      <label htmlFor="cart-human-check" className="text-[11px] font-medium text-[#1C1917] whitespace-nowrap">
                        Я человек · {humanChallenge.question}
                      </label>
                      <input
                        id="cart-human-check"
                        type="text"
                        inputMode="numeric"
                        maxLength={3}
                        value={humanAnswer}
                        onChange={(e) => setHumanAnswer(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ответ"
                        className="w-16 min-h-[30px] px-2 py-1 rounded-lg border border-[#D6CBB5] bg-[#FFFFFF] font-mono text-xs text-center text-[#1C1917] ml-auto"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="+992 92 777-45-67"
                        className="flex-1 min-h-[40px] px-3 py-2 rounded-xl border border-[#D6CBB5] bg-[#FAF6F0] font-mono text-xs text-[#1C1917]"
                      />
                      <button
                        type="button"
                        onClick={handleSendInlineOtp}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#1C1917] text-[#FAF6F0] text-xs font-semibold whitespace-nowrap"
                      >
                        Код СМС
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
                            <span>Код от @UsmonovTeamBot:</span>
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
                              onChange={(e) =>
                                setOtpInput(e.target.value.replace(/\D/g, ''))
                              }
                              placeholder="4 цифры"
                              className="flex-1 min-h-[38px] px-3 py-1.5 rounded-lg border border-[#D97706]/40 bg-[#FFFFFF] font-mono text-xs"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyInlineOtp}
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

                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="Адрес доставки в Худжанде или самовывоз из 1-го зала"
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-[#D6CBB5] bg-[#FAF6F0] text-xs text-[#1C1917]"
                />
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer */}
        {items.length > 0 && !confirmedBotReceipt && (
          <div className="p-4 sm:p-6 border-t border-[#E6DEC8] bg-[#FFFFFF] space-y-3 sm:space-y-4">
            <div>
              <label
                htmlFor="cart-promo"
                className="block text-xs text-[#78716C] mb-1"
              >
                Промокод клуба (<span className="font-mono font-semibold text-[#1C1917]">USMONOV10</span> для -10%)
              </label>
              <input
                id="cart-promo"
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="USMONOV10"
                className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-[#D6CBB5] bg-[#FAF6F0] text-xs font-mono text-[#1C1917] uppercase focus:outline-none focus:border-[#C2410C]"
              />
            </div>

            <div className="space-y-1 text-xs text-[#57534E] border-t border-[#F0E9DA] pt-2.5">
              <div className="flex justify-between">
                <span>{t.cartSubtotal}</span>
                <span className="font-mono text-[#1C1917] tabular-nums">
                  {formatCurrency(totals.subtotal)}
                </span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>{t.cartDiscount}</span>
                  <span className="font-mono tabular-nums">
                    -{formatCurrency(totals.discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{t.cartShipping}</span>
                <span className="font-mono text-[#1C1917] tabular-nums">
                  {totals.shippingFee === 0
                    ? t.cartFree
                    : formatCurrency(totals.shippingFee)}
                </span>
              </div>
              <div className="flex justify-between text-sm sm:text-base font-bold text-[#1C1917] pt-1.5 border-t border-[#F0E9DA]">
                <span>{t.cartTotal}</span>
                <span className="font-mono text-[#C2410C] tabular-nums">
                  {formatCurrency(totals.total)}
                </span>
              </div>
            </div>

            {hasOutOfStockItem && (
              <p className="text-[11px] font-medium text-red-700">
                Удалите закончившийся товар, чтобы отправить заказ.
              </p>
            )}

            <button
              type="button"
              disabled={submitting || hasOutOfStockItem}
              onClick={handleSendOrderToBot}
              className="w-full min-h-[46px] px-5 py-3 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-50 text-white font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Отправка боту...' : t.placeOrder}</span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
