export type ProductCategory = 'Headgear' | 'Shin Guards' | 'Gloves' | 'Apparel' | 'Accessories';

export interface GearProduct {
  id: string;
  name: string;
  category: ProductCategory;
  price: number; // Price in Somoni (с.)
  stock: number;
  variants: string;
  sizes: string;
  imageKey: string;
  description: string;
  featured: boolean;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SportCourse {
  id: string;
  title: string;
  sportType: string;
  schedule: string;
  coach: string;
  level: string;
  priceSomoni: number; // Monthly rate in Somoni (с.)
  imageKey: string;
  description: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseInput {
  title: string;
  sportType: string;
  schedule: string;
  coach: string;
  level: string;
  priceSomoni: number;
  imageKey: string;
  description: string;
}

export interface CartItem {
  product: GearProduct;
  selectedSize: string;
  selectedVariant: string;
  quantity: number;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
export type OrderType = 'gear' | 'tuition' | 'program';

export interface CustomerOrder {
  id: string;
  userId: string;
  customerName: string;
  itemsSummary: string;
  itemCount: number;
  totalAmount: number;
  orderType: OrderType;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  verifiedPhone?: string;
  telegramMessage?: string;
  telegramBotRef?: string;
}

export interface FighterProfile {
  uid: string;
  displayName: string;
  email: string;
  weightClass: string;
  experienceLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Pro Fighter';
  activeProgram: string;
  shippingAddress: string;
  phone: string;
  phoneVerified?: boolean;
  verifiedAt?: string;
  telegramHandle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramBotOrderMessage {
  id: string;
  orderId: string;
  customerName: string;
  verifiedPhone: string;
  shippingAddress: string;
  itemsSummary: string;
  totalAmount: number;
  verificationBadge: string;
  botText: string;
  botReplyText: string;
  telegramDeepLink: string;
  createdAt: string;
  deliveredViaApi: boolean;
}

export interface ProductInput {
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  variants: string;
  sizes: string;
  imageKey: string;
  description: string;
  featured: boolean;
}

export const BLUEPRINT_CONSTRAINTS = {
  ID_REGEX: /^[a-zA-Z0-9_\-]+$/,
  PRODUCT_NAME_MIN: 2,
  PRODUCT_NAME_MAX: 100,
  PRODUCT_VARIANTS_MAX: 120,
  PRODUCT_SIZES_MAX: 80,
  PRODUCT_IMAGE_MAX: 200,
  PRODUCT_DESC_MIN: 2,
  PRODUCT_DESC_MAX: 600,
  ORDER_SUMMARY_MAX: 500,
  CUSTOMER_NAME_MIN: 2,
  CUSTOMER_NAME_MAX: 100,
  CATEGORIES: ['Headgear', 'Shin Guards', 'Gloves', 'Apparel', 'Accessories'] as ProductCategory[],
};

const PRANK_WORDS = [
  'тест',
  'test',
  'прикол',
  'фейк',
  'fake',
  'asdf',
  'qwerty',
  'йцукен',
  'абоба',
  'aboba',
  'аноним',
  'никто',
  'хаха',
  'лол',
  'lol',
  'admin',
  'админ',
  'приколист',
];

const TAJIK_OPERATOR_PREFIXES = [
  '90',
  '91',
  '92',
  '93',
  '94',
  '98',
  '88',
  '50',
  '55',
  '77',
  '00',
  '11',
  '20',
  '70',
];

/**
 * Validates that the user entered a genuine human name and blocks prankster/spam inputs.
 */
export function validateHumanName(rawName: string): {
  valid: boolean;
  error?: string;
  normalized?: string;
} {
  const cleaned = rawName.replace(/\s+/g, ' ').trim();
  if (cleaned.length < 3 || cleaned.length > 60) {
    return {
      valid: false,
      error: 'Введите настоящее имя и фамилию (от 3 до 60 символов).',
    };
  }

  // Must contain only letters (Cyrillic, Tajik Cyrillic, or Latin), spaces, and hyphens
  if (!/^[a-zA-Zа-яА-ЯёЁғҒӣӢқҚӯӮҳҲҷҶ\s\-]+$/u.test(cleaned)) {
    return {
      valid: false,
      error: 'Имя может содержать только буквы (без цифр и спецсимволов).',
    };
  }

  const lower = cleaned.toLowerCase();
  for (const prank of PRANK_WORDS) {
    if (lower === prank || lower.includes(` ${prank}`) || lower.startsWith(`${prank} `)) {
      return {
        valid: false,
        error: 'Пожалуйста, укажите ваше настоящее имя без шуточных слов.',
      };
    }
  }

  // Reject repeated characters like "ааааа" or "вввв вввв"
  const lettersOnly = lower.replace(/[\s\-]/g, '');
  const uniqueChars = new Set(lettersOnly.split(''));
  if (uniqueChars.size < 2 || /(.)\1{3,}/u.test(lower)) {
    return {
      valid: false,
      error: 'Пожалуйста, введите корректное имя (обнаружен повтор символов).',
    };
  }

  // Capitalize words neatly
  const normalized = cleaned
    .split(' ')
    .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');

  return { valid: true, normalized };
}

export const CLUB_CONTACT = {
  ownerName: 'Аъзам Усмонов',
  ownerChatId: '979409624',
  phoneFormatted: '+992 92 883-80-80',
  phoneShort: '92-883-80-80',
  phoneDigits: '992928838080',
  phoneHref: 'tel:+992928838080',
  botUsername: '@UsmonovTeamBot',
  botUrl: 'https://t.me/UsmonovTeamBot',
  city: 'Худжанд',
};

export interface HumanChallenge {
  a: number;
  b: number;
  question: string;
}

/**
 * Creates a lightweight human verification challenge to filter out automated bots/pranksters.
 */
export function createHumanChallenge(seed = Date.now()): HumanChallenge {
  const a = 2 + (Math.abs(seed) % 7);
  const b = 1 + (Math.abs(seed >> 3) % 6);
  return {
    a,
    b,
    question: `Сколько будет ${a} + ${b}?`,
  };
}

export function verifyHumanChallenge(a: number, b: number, rawAnswer: string): boolean {
  const parsed = Number(String(rawAnswer || '').trim());
  return Number.isFinite(parsed) && parsed === a + b;
}

/**
 * Validates and formats a Tajikistan phone number (+992 XX XXX-XX-XX) and blocks fake/repeated numbers.
 */
export function validateTajikPhone(rawPhone: string): {
  valid: boolean;
  error?: string;
  formatted?: string;
  digits?: string;
} {
  const digitsOnly = rawPhone.replace(/\D/g, '');
  let nationalNine = '';

  if (digitsOnly.length === 12 && digitsOnly.startsWith('992')) {
    nationalNine = digitsOnly.slice(3);
  } else if (digitsOnly.length === 9) {
    nationalNine = digitsOnly;
  } else {
    return {
      valid: false,
      error: 'Введите корректный номер Таджикистана: +992 и 9 цифр (например, +992 92 777-45-67).',
    };
  }

  const prefix = nationalNine.slice(0, 2);
  if (!TAJIK_OPERATOR_PREFIXES.includes(prefix)) {
    return {
      valid: false,
      error: `Код оператора (${prefix}) не поддерживается. Укажите действующий номер (+992 90/91/92/93/98/88/50/55...).`,
    };
  }

  const subscriberSeven = nationalNine.slice(2);
  // Reject prank/sequential patterns like 0000000, 1111111, 1234567, 7654321, 9999999
  if (
    /^(\d)\1{5,}/.test(subscriberSeven) ||
    subscriberSeven === '1234567' ||
    subscriberSeven === '7654321' ||
    subscriberSeven === '0123456'
  ) {
    return {
      valid: false,
      error: 'Этот номер похож на вымышленный. Укажите ваш реальный мобильный номер для связи с ботом.',
    };
  }

  const formatted = `+992 ${prefix} ${subscriberSeven.slice(0, 3)}-${subscriberSeven.slice(3, 5)}-${subscriberSeven.slice(5, 7)}`;
  return {
    valid: true,
    formatted,
    digits: `992${nationalNine}`,
  };
}

/**
 * Generates a deterministic 4-digit verification code from phone digits + session salt
 * so verification works reliably and can be unit-tested.
 */
export function generatePhoneOtpCode(phoneDigits: string, seed = 42): string {
  let hash = seed;
  for (let i = 0; i < phoneDigits.length; i++) {
    hash = (hash * 31 + phoneDigits.charCodeAt(i)) % 9000;
  }
  const code = 1000 + (Math.abs(hash) % 9000);
  return String(code);
}

/**
 * Formats course fee: returns 'Договорная' / 'Мувофиқашуда' / 'By Agreement' when price is 0 or contractual.
 */
export function formatCoursePrice(
  priceSomoni: number,
  lang: 'ru' | 'tj' | 'en' = 'ru'
): string {
  if (!priceSomoni || priceSomoni <= 0) {
    if (lang === 'tj') return 'Мувофиқашуда';
    if (lang === 'en') return 'By Agreement';
    return 'Договорная';
  }
  return formatCurrency(priceSomoni);
}

/**
 * Formats a verified direct visitor message sent via @UsmonovTeamBot straight to owner Аъзам Усмонов.
 */
export function buildTelegramDirectMessage(params: {
  messageId: string;
  senderName: string;
  verifiedPhone: string;
  topic: string;
  messageBody: string;
}): {
  botText: string;
  botReplyText: string;
  verificationBadge: string;
  telegramDeepLink: string;
} {
  const shortRef = params.messageId.replace(/^msg_/, '#MSG-').slice(0, 12).toUpperCase();
  const phoneTail = params.verifiedPhone.slice(-5);
  const verificationBadge = `HUMAN-TJ-${phoneTail}`;
  const cleanTopic = params.topic.trim() || 'Сообщение в зал';
  const cleanBody = params.messageBody.trim().slice(0, 600);

  const botText = [
    `✉️ Сообщение владельцу зала (${CLUB_CONTACT.ownerName}) ${shortRef}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `👤 Отправитель: ${params.senderName}`,
    `📱 Номер: ${params.verifiedPhone} [Человек подтверждён ✓]`,
    `📌 Тема: ${cleanTopic}`,
    `💬 Текст: ${cleanBody}`,
    `📞 Контакт клуба: ${CLUB_CONTACT.phoneFormatted}`,
    `🛡 Проверка: ${verificationBadge}`,
  ].join('\n');

  const botReplyText = `Салом, ${params.senderName}! Бот ${CLUB_CONTACT.botUsername} передал ваше сообщение (${shortRef}) напрямую владельцу зала — ${CLUB_CONTACT.ownerName} (${CLUB_CONTACT.phoneFormatted}). Ответ придёт на ваш номер ${params.verifiedPhone}.`;

  const encodedText = encodeURIComponent(botText);
  const telegramDeepLink = `https://t.me/share/url?url=${encodeURIComponent(CLUB_CONTACT.botUrl)}&text=${encodedText}`;

  return {
    botText,
    botReplyText,
    verificationBadge,
    telegramDeepLink,
  };
}

/**
 * Formats a verified order into a structured Telegram Bot message sent directly to owner Аъзам Усмонов via @UsmonovTeamBot.
 */
export function buildTelegramOrderMessage(params: {
  orderId: string;
  customerName: string;
  verifiedPhone: string;
  shippingAddress: string;
  itemsSummary: string;
  totalAmount: number;
  promoCode?: string;
}): {
  botText: string;
  botReplyText: string;
  verificationBadge: string;
  telegramDeepLink: string;
} {
  const shortOrder = params.orderId.replace(/^ord_/, '#UT-').slice(0, 12).toUpperCase();
  const phoneTail = params.verifiedPhone.slice(-5);
  const verificationBadge = `VERIFIED-TJ-${phoneTail}`;
  const addressLine = params.shippingAddress.trim() || 'Самовывоз из зала вольной борьбы UsmonovTeam (Худжанд)';
  const promoInfo = params.promoCode ? ` (Промокод: ${params.promoCode.toUpperCase()})` : '';

  const botText = [
    `🤼 Новый заказ напрямую владельцу (${CLUB_CONTACT.ownerName}) ${shortOrder}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `👤 Клиент: ${params.customerName}`,
    `📱 Телефон: ${params.verifiedPhone} [Человек подтверждён ✓]`,
    `📍 Доставка: ${addressLine}`,
    `📦 Состав: ${params.itemsSummary}`,
    `💳 Итого к оплате: ${formatCurrency(params.totalAmount)}${promoInfo}`,
    `📞 Связь с владельцем: ${CLUB_CONTACT.phoneFormatted}`,
    `🛡 Анти-спам токен: ${verificationBadge}`,
  ].join('\n');

  const botReplyText = `Салом, ${params.customerName}! Бот ${CLUB_CONTACT.botUsername} передал ваш заказ ${shortOrder} (${formatCurrency(params.totalAmount)}) напрямую владельцу — ${CLUB_CONTACT.ownerName} (${CLUB_CONTACT.phoneFormatted}). Ваш номер ${params.verifiedPhone} подтверждён.`;

  const encodedText = encodeURIComponent(botText);
  const telegramDeepLink = `https://t.me/share/url?url=${encodeURIComponent(CLUB_CONTACT.botUrl)}&text=${encodedText}`;

  return {
    botText,
    botReplyText,
    verificationBadge,
    telegramDeepLink,
  };
}

export function validateProductInput(input: ProductInput): {
  valid: boolean;
  error?: string;
  sanitized?: ProductInput;
} {
  const name = input.name.trim();
  const variants = input.variants.trim();
  const sizes = input.sizes.trim();
  const imageKey = input.imageKey.trim();
  const description = input.description.trim();

  if (
    name.length < BLUEPRINT_CONSTRAINTS.PRODUCT_NAME_MIN ||
    name.length > BLUEPRINT_CONSTRAINTS.PRODUCT_NAME_MAX
  ) {
    return { valid: false, error: 'Название товара должно быть от 2 до 100 символов.' };
  }
  if (!BLUEPRINT_CONSTRAINTS.CATEGORIES.includes(input.category)) {
    return { valid: false, error: 'Некорректная категория товара.' };
  }
  if (
    typeof input.price !== 'number' ||
    Number.isNaN(input.price) ||
    input.price < 0 ||
    input.price > 100000
  ) {
    return { valid: false, error: 'Цена должна быть числом от 0 до 100 000 сомони.' };
  }
  if (
    typeof input.stock !== 'number' ||
    Number.isNaN(input.stock) ||
    input.stock < 0 ||
    input.stock > 100000
  ) {
    return { valid: false, error: 'Количество на складе должно быть неотрицательным числом.' };
  }
  if (variants.length < 1 || variants.length > BLUEPRINT_CONSTRAINTS.PRODUCT_VARIANTS_MAX) {
    return { valid: false, error: 'Укажите расцветку или вариант (до 120 символов).' };
  }
  if (sizes.length < 1 || sizes.length > BLUEPRINT_CONSTRAINTS.PRODUCT_SIZES_MAX) {
    return { valid: false, error: 'Укажите доступные размеры (до 80 символов).' };
  }
  if (imageKey.length < 1 || imageKey.length > BLUEPRINT_CONSTRAINTS.PRODUCT_IMAGE_MAX) {
    return { valid: false, error: 'Укажите изображение товара.' };
  }
  if (
    description.length < BLUEPRINT_CONSTRAINTS.PRODUCT_DESC_MIN ||
    description.length > BLUEPRINT_CONSTRAINTS.PRODUCT_DESC_MAX
  ) {
    return { valid: false, error: 'Описание должно содержать от 2 до 600 символов.' };
  }

  return {
    valid: true,
    sanitized: {
      name: name.slice(0, BLUEPRINT_CONSTRAINTS.PRODUCT_NAME_MAX),
      category: input.category,
      price: Math.round(input.price * 100) / 100,
      stock: Math.floor(input.stock),
      variants: variants.slice(0, BLUEPRINT_CONSTRAINTS.PRODUCT_VARIANTS_MAX),
      sizes: sizes.slice(0, BLUEPRINT_CONSTRAINTS.PRODUCT_SIZES_MAX),
      imageKey: imageKey.slice(0, BLUEPRINT_CONSTRAINTS.PRODUCT_IMAGE_MAX),
      description: description.slice(0, BLUEPRINT_CONSTRAINTS.PRODUCT_DESC_MAX),
      featured: Boolean(input.featured),
    },
  };
}

export function validateCourseInput(input: CourseInput): {
  valid: boolean;
  error?: string;
  sanitized?: CourseInput;
} {
  const title = input.title.trim();
  const sportType = input.sportType.trim();
  const schedule = input.schedule.trim();
  const coach = input.coach.trim();
  const level = input.level.trim();
  const imageKey = input.imageKey.trim();
  const description = input.description.trim();

  if (title.length < 2 || title.length > 100) {
    return { valid: false, error: 'Название курса/занятия должно быть от 2 до 100 символов.' };
  }
  if (sportType.length < 2 || sportType.length > 60) {
    return { valid: false, error: 'Вид спорта должен содержать от 2 до 60 символов.' };
  }
  if (schedule.length < 2 || schedule.length > 120) {
    return { valid: false, error: 'Расписание должно содержать от 2 до 120 символов.' };
  }
  if (coach.length < 2 || coach.length > 100) {
    return { valid: false, error: 'Имя тренера должно содержать от 2 до 100 символов.' };
  }
  if (level.length < 2 || level.length > 60) {
    return { valid: false, error: 'Уровень подготовки должен содержать от 2 до 60 символов.' };
  }
  if (
    typeof input.priceSomoni !== 'number' ||
    Number.isNaN(input.priceSomoni) ||
    input.priceSomoni < 0 ||
    input.priceSomoni > 100000
  ) {
    return { valid: false, error: 'Стоимость должна быть от 0 до 100 000 сомони.' };
  }
  if (imageKey.length < 1 || imageKey.length > 200) {
    return { valid: false, error: 'Выберите обложку занятия.' };
  }
  if (description.length < 2 || description.length > 600) {
    return { valid: false, error: 'Описание курса должно содержать от 2 до 600 символов.' };
  }

  return {
    valid: true,
    sanitized: {
      title: title.slice(0, 100),
      sportType: sportType.slice(0, 60),
      schedule: schedule.slice(0, 120),
      coach: coach.slice(0, 100),
      level: level.slice(0, 60),
      priceSomoni: Math.round(input.priceSomoni * 100) / 100,
      imageKey: imageKey.slice(0, 200),
      description: description.slice(0, 600),
    },
  };
}

export function filterAndSortProducts(
  products: GearProduct[],
  options: {
    category: string;
    searchQuery: string;
    sortBy: 'featured' | 'price-asc' | 'price-desc' | 'name';
  }
): GearProduct[] {
  const query = options.searchQuery.trim().toLowerCase();

  const filtered = products.filter((item) => {
    const matchesCategory = options.category === 'All' || item.category === options.category;
    const matchesQuery =
      query.length === 0 ||
      item.name.toLowerCase().includes(query) ||
      item.variants.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });

  return [...filtered].sort((a, b) => {
    if (options.sortBy === 'price-asc') return a.price - b.price;
    if (options.sortBy === 'price-desc') return b.price - a.price;
    if (options.sortBy === 'name') return a.name.localeCompare(b.name);
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return 0;
  });
}

export function calculateCartTotals(
  items: CartItem[],
  promoCode = ''
): {
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  total: number;
} {
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const cleanPromo = promoCode.trim().toUpperCase();
  const discountRate =
    cleanPromo === 'USMONOV10' || cleanPromo === 'AZAM10' || cleanPromo === 'LION10' ? 0.1 : 0;
  const discountAmount = Math.round(subtotal * discountRate * 100) / 100;
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  // Free shipping on orders >= 500 Somoni, otherwise 25 Somoni
  const shippingFee = itemCount === 0 || afterDiscount >= 500 ? 0 : 25;
  const total = Math.round((afterDiscount + shippingFee) * 100) / 100;

  return {
    itemCount,
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount,
    shippingFee,
    total,
  };
}

export function formatCurrency(amount: number): string {
  const rounded = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${rounded} с.`;
}

export function summarizeCartItems(items: CartItem[]): string {
  const raw = items
    .map((i) => `${i.quantity}x ${i.product.name} (${i.selectedSize})`)
    .join(', ');
  return raw.slice(0, BLUEPRINT_CONSTRAINTS.ORDER_SUMMARY_MAX);
}

/**
 * Ensures `fetch` on a target object (such as `window` or `Window.prototype`) has both
 * a getter and setter so browser extensions that assign `window.fetch = ...` do not
 * throw `TypeError: Cannot set property fetch of #<Window> which has only a getter`.
 */
export function ensureWritableFetch(target: Record<string, unknown> | null | undefined): boolean {
  if (!target || (typeof target !== 'object' && typeof target !== 'function')) {
    return false;
  }
  try {
    let currentFetch = typeof target.fetch === 'function' ? target.fetch : undefined;
    const desc = Object.getOwnPropertyDescriptor(target, 'fetch');
    if (!desc || desc.configurable) {
      Object.defineProperty(target, 'fetch', {
        configurable: true,
        enumerable: true,
        get() {
          return currentFetch;
        },
        set(fn: unknown) {
          if (typeof fn === 'function') {
            currentFetch = fn;
          }
        },
      });
      return true;
    }
  } catch {
    // Ignore non-configurable environment descriptors
  }
  return false;
}
