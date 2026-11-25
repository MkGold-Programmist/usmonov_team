export type AppLanguage = 'ru' | 'tj' | 'en';

export interface TranslationStrings {
  navHome: string;
  navCourses: string;
  navShop: string;
  navAccount: string;
  bagButton: string;
  heroKicker: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaCourses: string;
  heroCtaShop: string;
  stat1Title: string;
  stat1Sub: string;
  stat2Title: string;
  stat2Sub: string;
  stat3Title: string;
  stat3Sub: string;
  stat4Title: string;
  stat4Sub: string;
  coursesSectionKicker: string;
  coursesSectionTitle: string;
  coursesInfoOnlyNotice: string;
  viewCourseDetails: string;
  courseModalSchedule: string;
  courseModalCoach: string;
  courseModalLevel: string;
  courseModalMonthlyFee: string;
  courseModalVisitInfo: string;
  shopSectionKicker: string;
  shopSectionTitle: string;
  viewAllShop: string;
  searchPlaceholder: string;
  allCategories: string;
  inStock: string;
  outOfStock: string;
  addToBag: string;
  backToShop: string;
  selectSize: string;
  similarProducts: string;
  perMonth: string;
  negotiablePrice: string;
  coachTitle: string;
  coachCtaTelegram: string;
  cityLabel: string;
  accountTitle: string;
  accountSubtitle: string;
  signInGoogle: string;
  signOut: string;
  saveProfile: string;
  profileSaved: string;
  athleteName: string;
  phoneNumberLabel: string;
  weightClass: string;
  experienceLevel: string;
  deliveryAddress: string;
  orderHistory: string;
  noOrders: string;
  cartTitle: string;
  cartEmpty: string;
  cartSubtotal: string;
  cartDiscount: string;
  cartShipping: string;
  cartFree: string;
  cartTotal: string;
  placeOrder: string;
  close: string;
  botTitle: string;
  botSubtitle: string;
  verifyPhoneTitle: string;
  verifyPhoneNotice: string;
  sendOtpButton: string;
  confirmOtpButton: string;
  phoneVerifiedBadge: string;
  phoneUnverifiedBadge: string;
  openInTelegramButton: string;
}

export const TRANSLATIONS: Record<AppLanguage, TranslationStrings> = {
  ru: {
    navHome: 'Главная',
    navCourses: 'Вольная Борьба',
    navShop: 'Экипировка',
    navAccount: 'Профиль и Бот',
    bagButton: 'Корзина',
    heroKicker: 'ЗАЛ ВОЛЬНОЙ БОРЬБЫ · ХУДЖАНД · +992 92 883-80-80',
    heroTitle: 'UsmonovTeam — Вольная борьба, дисциплина и школа побед',
    heroSubtitle:
      '1-й специализированный зал вольной борьбы в Худжанде. Владелец и тренер — Аъзам Усмонов. Занятия проходят в Пн, Ср, Пт (3 смены: 16:00–21:00) и в Сб (Шн) — Кросс. Заказы и сообщения боту @UsmonovTeamBot передаются напрямую владельцу.',
    heroCtaCourses: 'О вольной борьбе',
    heroCtaShop: 'Экипировка',
    stat1Title: '1 зал',
    stat1Sub: 'Олимпийский ковер в Худжанде',
    stat2Title: 'Пн · Ср · Пт',
    stat2Sub: '3 смены (16:00–21:00) · Шн (Сб): Кросс',
    stat3Title: 'Аъзам Усмонов',
    stat3Sub: 'Владелец и тренер · 92-883-80-80',
    stat4Title: '@UsmonovTeamBot',
    stat4Sub: 'Передача заказов и сообщений владельцу',
    coursesSectionKicker: '1-й зал в Худжанде · Пн, Ср, Пт (3 смены) + Шн (Кросс)',
    coursesSectionTitle: 'Вольная Борьба',
    coursesInfoOnlyNotice:
      'График тренировок: Пн, Ср, Пт — 1 смена (16:00–17:30), 2 смена (17:30–19:30), 3 смена (19:30–21:00); Суббота (Шн) — Кросс. Стоимость договорная, уточняйте у тренера или через @UsmonovTeamBot.',
    viewCourseDetails: 'Подробнее о графике',
    courseModalSchedule: 'График тренировок и смен',
    courseModalCoach: 'Тренер',
    courseModalLevel: 'Группы и смены',
    courseModalMonthlyFee: 'Стоимость занятий',
    courseModalVisitInfo:
      'Тренировки на ковре проходят в Пн, Ср, Пт (16:00–17:30, 17:30–19:30, 19:30–21:00), в Субботу (Шн) — Кросс. Телефон Аъзама Усмонова: +992 92 883-80-80.',
    shopSectionKicker: 'Борцовская экипировка для ковра · Цены в сомони (с.)',
    shopSectionTitle: 'Экипировка для вольной борьбы UsmonovTeam',
    viewAllShop: 'Смотреть всю экипировку',
    searchPlaceholder: 'Найти борцовки, трико, наколенники, рашгард...',
    allCategories: 'Вся экипировка',
    inStock: 'в наличии',
    outOfStock: 'Нет в наличии',
    addToBag: 'В корзину',
    backToShop: 'Вернуться в каталог',
    selectSize: 'Выберите размер',
    similarProducts: 'Для тренировок на ковре',
    perMonth: '',
    negotiablePrice: 'Договорная',
    coachTitle: 'Тренер и владелец: Аъзам Усмонов',
    coachCtaTelegram: 'Написать Аъзаму Усмонову в TG',
    cityLabel: 'г. Худжанд',
    accountTitle: 'Ваш профиль и Telegram-бот @UsmonovTeamBot',
    accountSubtitle:
      'Регистрация по реальному имени и номеру телефона (+992) защищает клуб в Худжанде от спама и пранкеров, передавая ваш заказ напрямую тренеру и менеджеру.',
    signInGoogle: 'Привязать Google-аккаунт',
    signOut: 'Выйти',
    saveProfile: 'Сохранить анкету',
    profileSaved: 'Анкета борца и проверенный номер сохранены.',
    athleteName: 'Ваше настоящее имя и фамилия',
    phoneNumberLabel: 'Номер телефона Таджикистана (+992)',
    weightClass: 'Весовая категория (кг)',
    experienceLevel: 'Опыт в борьбе',
    deliveryAddress: 'Адрес доставки в Худжанде / ориентир',
    orderHistory: 'Ваши заказы через @UsmonovTeamBot',
    noOrders: 'Вы ещё не отправляли заказов в наш Telegram-бот.',
    cartTitle: 'Корзина UsmonovTeam',
    cartEmpty: 'Корзина пока пуста — выберите экипировку для борьбы',
    cartSubtotal: 'Стоимость экипировки',
    cartDiscount: 'Скидка по промокоду',
    cartShipping: 'Доставка по Худжанду (от 500 с. бесплатно)',
    cartFree: 'Бесплатно',
    cartTotal: 'Итого к оплате',
    placeOrder: 'Отправить заказ владельцу (@UsmonovTeamBot)',
    close: 'Закрыть',
    botTitle: 'Живая лента Telegram-бота @UsmonovTeamBot',
    botSubtitle:
      'Бот принимает заказы только от реальных борцов с подтверждённым номером +992 и настоящим именем.',
    verifyPhoneTitle: 'Верификация номера +992 (Защита от пранкеров)',
    verifyPhoneNotice:
      'Чтобы избежать шуточных заказов, введите ваше настоящее имя и номер (+992), затем подтвердите его 4-значным кодом.',
    sendOtpButton: 'Получить код',
    confirmOtpButton: 'Подтвердить номер',
    phoneVerifiedBadge: 'Номер подтверждён · Доступ к заказам открыт',
    phoneUnverifiedBadge: 'Требуется подтверждение номера +992',
    openInTelegramButton: 'Открыть в Telegram (@UsmonovTeamBot)',
  },
  tj: {
    navHome: 'Асосӣ',
    navCourses: 'Гӯштини озод',
    navShop: 'Лавозимот',
    navAccount: 'Профил ва Бот',
    bagButton: 'Сабад',
    heroKicker: 'ТОЛОРИ ГӮШТИНИ ОЗОД · ХУҶАНД · +992 92 883-80-80',
    heroTitle: 'UsmonovTeam — Гӯштини тарзи озод, ирода ва пирӯзӣ',
    heroSubtitle:
      'Толори махсусгардонидашудаи гӯштини тарзи озод дар шаҳри Хуҷанд. Мураббӣ ва роҳбар — Аъзам Усмонов. Тамринҳо Дш, Чш, Ҷм (3 баст: 16:00–21:00) ва Шн (Шанбе) — Кросс. Фармоишҳо тавассути @UsmonovTeamBot мустақиман ба роҳбар мераванд.',
    heroCtaCourses: 'Дар бораи гӯштин',
    heroCtaShop: 'Лавозимот',
    stat1Title: '1 толор',
    stat1Sub: 'Колини олимпии гӯштини озод',
    stat2Title: 'Дш · Чш · Ҷм',
    stat2Sub: '3 баст (16:00–21:00) · Шн: Кросс',
    stat3Title: 'Аъзам Усмонов',
    stat3Sub: 'Роҳбар ва мураббӣ · 92-883-80-80',
    stat4Title: '@UsmonovTeamBot',
    stat4Sub: 'Интиқоли фармоиш ва паём ба соҳибкор',
    coursesSectionKicker: '1-умин толор дар Хуҷанд · 3 баст + Шн (Кросс)',
    coursesSectionTitle: 'Гӯштини тарзи озод',
    coursesInfoOnlyNotice:
      'Ҷадвали тамринҳо: Дш, Чш, Ҷм — басти 1 (16:00–17:30), басти 2 (17:30–19:30), басти 3 (19:30–21:00); Шанбе (Шн) — Кросс. Нарх мувофиқашуда аст.',
    viewCourseDetails: 'Маълумоти пурра',
    courseModalSchedule: 'Ҷадвали тамрин ва бастҳо',
    courseModalCoach: 'Мураббӣ',
    courseModalLevel: 'Гурӯҳҳо ва бастҳо',
    courseModalMonthlyFee: 'Нархи машғулият',
    courseModalVisitInfo:
      'Тамринҳо дар рӯзҳои Дш, Чш, Ҷм (16:00–17:30, 17:30–19:30, 19:30–21:00) ва Шн — Кросс мегузаранд. Рақами Аъзам Усмонов: +992 92 883-80-80.',
    shopSectionKicker: 'Мағозаи лавозимоти гӯштин · Нархҳо бо сомонӣ (с.)',
    shopSectionTitle: 'Лавозимоти касбии гӯштини озод UsmonovTeam',
    viewAllShop: 'Ҳамаи лавозимот',
    searchPlaceholder: 'Ҷустуҷӯи пойафзоли гӯштин, трико, муҳофизат...',
    allCategories: 'Ҳамаи молҳо',
    inStock: 'дар анбор',
    outOfStock: 'Тамом шуд',
    addToBag: 'Ба сабад',
    backToShop: 'Бозгашт ба мағоза',
    selectSize: 'Интихоби андоза',
    similarProducts: 'Барои тамрин дар болои колин',
    perMonth: '',
    negotiablePrice: 'Мувофиқашуда',
    coachTitle: 'Мураббӣ ва роҳбар: Аъзам Усмонов',
    coachCtaTelegram: 'Навиштан ба Аъзам Усмонов дар TG',
    cityLabel: 'ш. Хуҷанд',
    accountTitle: 'Профили шумо ва Telegram-боти @UsmonovTeamBot',
    accountSubtitle:
      'Сабти номи ҳақиқӣ ва рақами +992 толори моро дар Хуҷанд аз фармоишҳои қалбакӣ муҳофизат мекунад.',
    signInGoogle: 'Пайваст бо Google',
    signOut: 'Баромад',
    saveProfile: 'Сабти профил',
    profileSaved: 'Профили варзишгар ва рақами тасдиқшуда сабт шуд.',
    athleteName: 'Ном ва насаби ҳақиқӣ',
    phoneNumberLabel: 'Рақами телефони Тоҷикистон (+992)',
    weightClass: 'Вазни варзишӣ (кг)',
    experienceLevel: 'Таҷриба дар гӯштин',
    deliveryAddress: 'Суроғаи расонидан дар Хуҷанд',
    orderHistory: 'Фармоишҳо тавассути @UsmonovTeamBot',
    noOrders: 'Шумо ҳоло ба Telegram-бот фармоиш нафиристодаед.',
    cartTitle: 'Сабади UsmonovTeam',
    cartEmpty: 'Сабади шумо холист — лавозимоти гӯштинро интихоб кунед',
    cartSubtotal: 'Маблағи молҳо',
    cartDiscount: 'Тахфиф бо промокод',
    cartShipping: 'Расонидан дар Хуҷанд (аз 500 с. ройгон)',
    cartFree: 'Ройгон',
    cartTotal: 'Ҳамагӣ барои пардохт',
    placeOrder: 'Фиристодани фармоиш мустақиман ба соҳибкор',
    close: 'Пӯшидан',
    botTitle: 'Паёмҳои Telegram-боти @UsmonovTeamBot',
    botSubtitle:
      'Бот танҳо аз варзишгарони дорои рақами тасдиқшудаи +992 ва номи ҳақиқӣ фармоиш қабул мекунад.',
    verifyPhoneTitle: 'Тасдиқи рақами +992 (Муҳофизат аз шӯхигарон)',
    verifyPhoneNotice:
      'Барои пешгирии шӯхиҳо, ному насаб ва рақами +992-ро ворид карда, бо рамзи 4-рақама тасдиқ кунед.',
    sendOtpButton: 'Гирифтани рамз',
    confirmOtpButton: 'Тасдиқи рақам',
    phoneVerifiedBadge: 'Рақам тасдиқ шуд · Фармоиш фаъол аст',
    phoneUnverifiedBadge: 'Тасдиқи рақами +992 лозим аст',
    openInTelegramButton: 'Кушодан дар Telegram (@UsmonovTeamBot)',
  },
  en: {
    navHome: 'Home',
    navCourses: 'Freestyle Wrestling',
    navShop: 'Gear Shop',
    navAccount: 'Profile & Bot',
    bagButton: 'Bag',
    heroKicker: 'FREESTYLE WRESTLING ARENA · KHUJAND · +992 92 883-80-80',
    heroTitle: 'UsmonovTeam — Freestyle Wrestling, Character & Discipline',
    heroSubtitle:
      '1st dedicated freestyle wrestling hall in Khujand led by Owner & Coach Azam Usmonov. Classes run Mon/Wed/Fri (3 shifts: 16:00–21:00) plus Saturday Cross-training. Orders and messages via @UsmonovTeamBot go straight to the owner.',
    heroCtaCourses: 'About Wrestling',
    heroCtaShop: 'Wrestling Gear',
    stat1Title: '1 Hall',
    stat1Sub: 'Olympic-grade wrestling mat',
    stat2Title: 'Mon · Wed · Fri',
    stat2Sub: '3 shifts (16:00–21:00) · Sat: Cross',
    stat3Title: 'Azam Usmonov',
    stat3Sub: 'Owner & Coach · 92-883-80-80',
    stat4Title: '@UsmonovTeamBot',
    stat4Sub: 'Direct owner dispatch for orders & chats',
    coursesSectionKicker: '1st Hall in Khujand · 3 Shifts + Sat Cross',
    coursesSectionTitle: 'Freestyle Wrestling',
    coursesInfoOnlyNotice:
      'Schedule: Mon, Wed, Fri — Shift 1 (16:00–17:30), Shift 2 (17:30–19:30), Shift 3 (19:30–21:00); Saturday — Cross-training. Monthly fee by agreement.',
    viewCourseDetails: 'Schedule Details',
    courseModalSchedule: 'Training Shifts & Cross',
    courseModalCoach: 'Coach',
    courseModalLevel: 'Groups & Shifts',
    courseModalMonthlyFee: 'Monthly Tuition',
    courseModalVisitInfo:
      'Mat sessions run Mon/Wed/Fri (16:00–17:30, 17:30–19:30, 19:30–21:00) and Saturday is Cross day. Owner & Coach Azam Usmonov: +992 92 883-80-80.',
    shopSectionKicker: 'Mat-Grade Wrestling Equipment · Priced in Somoni (с.)',
    shopSectionTitle: 'UsmonovTeam Freestyle Wrestling Gear',
    viewAllShop: 'Browse Full Collection',
    searchPlaceholder: 'Search wrestling boots, singlets, knee pads...',
    allCategories: 'All Gear',
    inStock: 'available',
    outOfStock: 'Out of Stock',
    addToBag: 'Add to Bag',
    backToShop: 'Back to Collection',
    selectSize: 'Choose Size',
    similarProducts: 'Recommended for the Mat',
    perMonth: '',
    negotiablePrice: 'By Agreement',
    coachTitle: 'Owner & Coach: Azam Usmonov',
    coachCtaTelegram: 'Message Azam Usmonov on TG',
    cityLabel: 'Khujand',
    accountTitle: 'Your Profile & Telegram Bot @UsmonovTeamBot',
    accountSubtitle:
      'Registering with your real full name and verified Tajikistan (+992) phone number shields our Khujand club against fake orders and connects your order directly to the coaching staff.',
    signInGoogle: 'Connect Google Account',
    signOut: 'Sign Out',
    saveProfile: 'Save Profile',
    profileSaved: 'Athlete profile and verified phone number saved.',
    athleteName: 'Your Real Full Name',
    phoneNumberLabel: 'Tajikistan Phone Number (+992)',
    weightClass: 'Weight Class (kg)',
    experienceLevel: 'Wrestling Experience',
    deliveryAddress: 'Delivery Address in Khujand',
    orderHistory: 'Orders Sent to @UsmonovTeamBot',
    noOrders: 'No orders sent to the Telegram bot yet.',
    cartTitle: 'Your UsmonovTeam Bag',
    cartEmpty: 'Your bag is empty — choose wrestling gear for the mat',
    cartSubtotal: 'Gear Subtotal',
    cartDiscount: 'Promo Discount',
    cartShipping: 'Khujand Delivery (Free over 500 с.)',
    cartFree: 'Free',
    cartTotal: 'Total in Somoni',
    placeOrder: 'Send Order to Owner (@UsmonovTeamBot)',
    close: 'Close',
    botTitle: 'Live @UsmonovTeamBot Order Feed',
    botSubtitle:
      'Our Telegram bot only accepts orders from genuine wrestlers with a confirmed +992 phone number and real name.',
    verifyPhoneTitle: 'Phone Verification (+992 Anti-Prankster Shield)',
    verifyPhoneNotice:
      'To keep pranksters out, enter your real name and valid +992 number, then confirm with a 4-digit code.',
    sendOtpButton: 'Get Code',
    confirmOtpButton: 'Verify Number',
    phoneVerifiedBadge: 'Phone Verified · Ready for Telegram Bot Orders',
    phoneUnverifiedBadge: 'Phone Verification (+992) Required',
    openInTelegramButton: 'Open Order in Telegram (@UsmonovTeamBot)',
  },
};
