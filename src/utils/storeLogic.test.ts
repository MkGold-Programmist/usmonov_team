import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateProductInput,
  validateCourseInput,
  filterAndSortProducts,
  calculateCartTotals,
  summarizeCartItems,
  formatCurrency,
  formatCoursePrice,
  CLUB_CONTACT,
  validateHumanName,
  validateTajikPhone,
  generatePhoneOtpCode,
  createHumanChallenge,
  verifyHumanChallenge,
  buildTelegramOrderMessage,
  buildTelegramDirectMessage,
  ensureWritableFetch,
  type GearProduct,
  type CartItem,
} from './storeLogic';

const sampleProducts: GearProduct[] = [
  {
    id: 'prod_headgear_1',
    name: 'Шлем для спарринга UsmonovTeam Pro',
    category: 'Headgear',
    price: 420,
    stock: 15,
    variants: 'Матовый черный и бордовый',
    sizes: 'S, M, L, XL',
    imageKey: '/src/assets/images/gear_mma_headgear_1794305484060.jpg',
    description: 'Профессиональный защитный шлем из натуральной кожи.',
    featured: true,
    updatedBy: 'admin_1',
    createdAt: '2026-11-10T00:00:00Z',
    updatedAt: '2026-11-10T00:00:00Z',
  },
  {
    id: 'prod_shin_1',
    name: 'Щитки для кикбоксинга Gold Series',
    category: 'Shin Guards',
    price: 340,
    stock: 20,
    variants: 'Черный и золотой',
    sizes: 'M, L, XL',
    imageKey: '/src/assets/images/gear_shin_guards_1794305484604.jpg',
    description: 'Анатомические щитки для голени и стопы.',
    featured: true,
    updatedBy: 'admin_1',
    createdAt: '2026-11-10T00:00:00Z',
    updatedAt: '2026-11-10T00:00:00Z',
  },
  {
    id: 'prod_gloves_1',
    name: 'Боксерские перчатки Titan Pro 16oz',
    category: 'Gloves',
    price: 490,
    stock: 12,
    variants: 'Черный оникс и бордовый',
    sizes: '12oz, 14oz, 16oz',
    imageKey: '/src/assets/images/gear_boxing_gloves_1794305485941.jpg',
    description: 'Многослойная пена и усиленная фиксация запястья.',
    featured: false,
    updatedBy: 'admin_1',
    createdAt: '2026-11-10T00:00:00Z',
    updatedAt: '2026-11-10T00:00:00Z',
  },
];

test('validateProductInput and validateCourseInput validate Somoni prices and text bounds', () => {
  const validProd = validateProductInput({
    name: '  Щитки UsmonovTeam ',
    category: 'Shin Guards',
    price: 340,
    stock: 10,
    variants: 'Черный / Золотой',
    sizes: 'M, L',
    imageKey: '/src/assets/images/gear_shin_guards_1794305484604.jpg',
    description: 'Защита голени и стопы для муай-тай.',
    featured: true,
  });
  assert.equal(validProd.valid, true);
  assert.equal(validProd.sanitized?.name, 'Щитки UsmonovTeam');

  const validCourse = validateCourseInput({
    title: 'ММА и смешанные единоборства',
    sportType: 'MMA',
    schedule: 'Пн / Ср / Пт · 18:30 – 20:00',
    coach: 'Усмонов Фирдавс',
    level: 'Все уровни',
    priceSomoni: 350,
    imageKey: '/src/assets/images/course_mma_training_1794305486908.jpg',
    description: 'Комплексная подготовка в стойке и партере.',
  });
  assert.equal(validCourse.valid, true);
  assert.equal(validCourse.sanitized?.priceSomoni, 350);

  const invalidCourse = validateCourseInput({
    title: 'A',
    sportType: 'MMA',
    schedule: 'Пн',
    coach: 'Тренер',
    level: 'Базовый',
    priceSomoni: -50,
    imageKey: '/src/assets/images/course_mma_training_1794305486908.jpg',
    description: 'Описание',
  });
  assert.equal(invalidCourse.valid, false);
});

test('filterAndSortProducts filters by category and search query and sorts by Somoni price', () => {
  const headgearOnly = filterAndSortProducts(sampleProducts, {
    category: 'Headgear',
    searchQuery: '',
    sortBy: 'featured',
  });
  assert.equal(headgearOnly.length, 1);
  assert.equal(headgearOnly[0].id, 'prod_headgear_1');

  const sortedByPriceAsc = filterAndSortProducts(sampleProducts, {
    category: 'All',
    searchQuery: '',
    sortBy: 'price-asc',
  });
  assert.equal(sortedByPriceAsc[0].price, 340);
  assert.equal(sortedByPriceAsc[2].price, 490);
});

test('calculateCartTotals computes subtotal in Somoni, USMONOV10 promo, and free shipping >= 500 с.', () => {
  const items: CartItem[] = [
    {
      product: sampleProducts[0], // 420 с.
      selectedSize: 'L',
      selectedVariant: 'Матовый черный и бордовый',
      quantity: 1,
    },
    {
      product: sampleProducts[1], // 340 с.
      selectedSize: 'M',
      selectedVariant: 'Черный и золотой',
      quantity: 1,
    },
  ];

  // Subtotal = 760 с. -> free shipping (>= 500 с.)
  const regular = calculateCartTotals(items, '');
  assert.equal(regular.itemCount, 2);
  assert.equal(regular.subtotal, 760);
  assert.equal(regular.shippingFee, 0);
  assert.equal(regular.total, 760);

  // With USMONOV10 promo -> 10% off (76 с. discount) -> 684 с. total
  const discounted = calculateCartTotals(items, 'usmonov10');
  assert.equal(discounted.discountAmount, 76);
  assert.equal(discounted.total, 684);
  assert.equal(formatCurrency(discounted.total), '684 с.');
  assert.equal(
    summarizeCartItems(items),
    '1x Шлем для спарринга UsmonovTeam Pro (L), 1x Щитки для кикбоксинга Gold Series (M)'
  );
});

test('validateHumanName and validateTajikPhone block pranksters and accept real Tajik accounts', () => {
  // Prank names blocked
  assert.equal(validateHumanName('аааааа').valid, false);
  assert.equal(validateHumanName('прикол').valid, false);
  assert.equal(validateHumanName('12345').valid, false);

  // Real name accepted & formatted
  const realName = validateHumanName('усмонов фирдавс');
  assert.equal(realName.valid, true);
  assert.equal(realName.normalized, 'Усмонов Фирдавс');

  // Fake/repeated phones blocked
  assert.equal(validateTajikPhone('+992 92 000 00 00').valid, false);
  assert.equal(validateTajikPhone('+992 92 123 45 67').valid, false);
  assert.equal(validateTajikPhone('+992 99 555 44 33').valid, false);

  // Real Tajik phone accepted & formatted
  const realPhone = validateTajikPhone('927774567');
  assert.equal(realPhone.valid, true);
  assert.equal(realPhone.formatted, '+992 92 777-45-67');

  const otp = generatePhoneOtpCode(realPhone.digits!);
  assert.equal(otp.length, 4);

  const tgMsg = buildTelegramOrderMessage({
    orderId: 'ord_99123',
    customerName: realName.normalized!,
    verifiedPhone: realPhone.formatted!,
    shippingAddress: 'г. Худжанд, ул. Ленина 42',
    itemsSummary: '1x Борцовки замшевые UsmonovTeam MatFlex Khujand (42)',
    totalAmount: 460,
    promoCode: 'USMONOV10',
  });
  assert.ok(tgMsg.botText.includes('UsmonovTeam'));
  assert.ok(tgMsg.botText.includes('+992 92 777-45-67'));
  assert.ok(tgMsg.botReplyText.includes('@UsmonovTeamBot'));
  assert.ok(tgMsg.telegramDeepLink.includes('UsmonovTeamBot'));
});

test('formatCoursePrice returns Договорная / Мувофиқашуда / By Agreement for 0 price', () => {
  assert.equal(formatCoursePrice(0, 'ru'), 'Договорная');
  assert.equal(formatCoursePrice(0, 'tj'), 'Мувофиқашуда');
  assert.equal(formatCoursePrice(0, 'en'), 'By Agreement');
  assert.equal(formatCoursePrice(350, 'ru'), '350 с.');
});

test('ensureWritableFetch prevents TypeError when assigning fetch on getter-only Window object', () => {
  const baseFetch = () => 'original-fetch';
  const mockWindow: Record<string, unknown> = {};
  Object.defineProperty(mockWindow, 'fetch', {
    configurable: true,
    enumerable: true,
    get() {
      return baseFetch;
    },
  });

  assert.throws(() => {
    mockWindow.fetch = () => 'intercepted-fetch';
  }, TypeError);

  const patched = ensureWritableFetch(mockWindow);
  assert.equal(patched, true);

  const intercepted = () => 'intercepted-fetch';
  assert.doesNotThrow(() => {
    mockWindow.fetch = intercepted;
  });
  assert.equal(mockWindow.fetch, intercepted);
});

test('CLUB_CONTACT matches club owner Аъзам Усмонов and phone 92-883-80-80', () => {
  assert.equal(CLUB_CONTACT.ownerName, 'Аъзам Усмонов');
  assert.equal(CLUB_CONTACT.ownerChatId, '979409624');
  assert.equal(CLUB_CONTACT.phoneFormatted, '+992 92 883-80-80');
  assert.equal(CLUB_CONTACT.phoneShort, '92-883-80-80');
  assert.equal(CLUB_CONTACT.phoneHref, 'tel:+992928838080');
  assert.equal(CLUB_CONTACT.botUsername, '@UsmonovTeamBot');
});

test('createHumanChallenge, verifyHumanChallenge, and buildTelegramDirectMessage work for real human messages to owner', () => {
  const challenge = createHumanChallenge(54321);
  assert.equal(verifyHumanChallenge(challenge.a, challenge.b, String(challenge.a + challenge.b)), true);
  assert.equal(verifyHumanChallenge(challenge.a, challenge.b, '999'), false);
  assert.equal(verifyHumanChallenge(challenge.a, challenge.b, ''), false);

  const directMsg = buildTelegramDirectMessage({
    messageId: 'msg_101',
    senderName: 'Далер Рахимов',
    verifiedPhone: '+992 92 777-45-67',
    topic: 'Запись на вольную борьбу',
    messageBody: 'Хочу записаться в зал, когда можно подойти?',
  });

  assert.ok(directMsg.botText.includes('Аъзам Усмонов'));
  assert.ok(directMsg.botText.includes('+992 92 777-45-67'));
  assert.ok(directMsg.botText.includes('Хочу записаться в зал'));
  assert.ok(directMsg.botReplyText.includes('Аъзам Усмонов'));
  assert.ok(directMsg.telegramDeepLink.includes('UsmonovTeamBot'));
});
