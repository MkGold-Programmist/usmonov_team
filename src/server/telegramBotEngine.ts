import {
  CLUB_CONTACT,
  formatCurrency,
  validateHumanName,
  validateTajikPhone,
  buildTelegramDirectMessage,
  type GearProduct,
  type ProductCategory,
  type ProductInput,
} from '../utils/storeLogic';
import type { CatalogStore } from './catalogStore';

export const CATEGORY_LABELS_RU: Record<ProductCategory, string> = {
  Accessories: 'Борцовки',
  Apparel: 'Трико',
  'Shin Guards': 'Наколенники',
  Headgear: 'Защита ушей',
  Gloves: 'Перчатки',
};

export const ORDERED_CATEGORIES: ProductCategory[] = [
  'Accessories',
  'Apparel',
  'Shin Guards',
  'Headgear',
  'Gloves',
];

export interface TelegramInlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramKeyboardButton {
  text: string;
  request_contact?: boolean;
}

export type TelegramReplyMarkup =
  | { inline_keyboard: TelegramInlineButton[][] }
  | {
      keyboard: TelegramKeyboardButton[][];
      resize_keyboard?: boolean;
      one_time_keyboard?: boolean;
    }
  | { remove_keyboard: true };

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id?: string;
  width?: number;
  height?: number;
  file_size?: number;
}

export interface TelegramContact {
  phone_number: string;
  first_name?: string;
  last_name?: string;
  user_id?: number;
}

export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number; type: string };
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  contact?: TelegramContact;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramTransport {
  sendMessage: (
    chatId: number | string,
    text: string,
    replyMarkup?: TelegramReplyMarkup
  ) => Promise<void>;
  editMessageText?: (
    chatId: number | string,
    messageId: number,
    text: string,
    replyMarkup?: TelegramReplyMarkup
  ) => Promise<void>;
  answerCallbackQuery?: (callbackQueryId: string, text?: string) => Promise<void>;
  downloadPhoto?: (fileId: string) => Promise<{ buffer: Buffer; extension: string }>;
}

type AdminSession =
  | { mode: 'idle' }
  | {
      mode: 'add';
      step:
        | 'category'
        | 'name'
        | 'price'
        | 'stock'
        | 'sizes'
        | 'variants'
        | 'description'
        | 'photo';
      draft: Partial<ProductInput>;
    }
  | {
      mode: 'edit';
      productId: string;
      field: 'name' | 'price' | 'stock' | 'sizes' | 'variants' | 'description' | 'photo';
    };

type ClientSession = {
  step: 'idle' | 'name' | 'phone' | 'message';
  name?: string;
  phoneFormatted?: string;
  draftMessage?: string;
  lastSentAt?: number;
};

const ITEMS_PER_PAGE = 6;

export function isOwnerTelegramId(userId: number | string | undefined | null): boolean {
  if (userId === undefined || userId === null) return false;
  return String(userId).trim() === CLUB_CONTACT.ownerChatId;
}

/**
 * Validates a client phone number submitted in Telegram (either shared Telegram Contact or typed text).
 * Tajik numbers are formatted canonically via validateTajikPhone; verified Telegram international contacts
 * are also accepted while blocking obvious fake/repeated-digit patterns.
 */
export function validateClientTelegramPhone(
  rawPhone: string,
  fromTelegramContact = false
): { valid: boolean; formatted?: string; error?: string } {
  const clean = String(rawPhone || '').trim();
  const digits = clean.replace(/\D/g, '');

  // Prefer canonical Tajikistan formatting first
  if (digits.length === 9 || (digits.length === 12 && digits.startsWith('992'))) {
    const tj = validateTajikPhone(clean);
    if (tj.valid && tj.formatted) {
      return { valid: true, formatted: tj.formatted };
    }
    return { valid: false, error: tj.error };
  }

  // Allow real international phone numbers shared via Telegram Contact button or typed with +code
  if (fromTelegramContact || clean.startsWith('+')) {
    if (digits.length < 8 || digits.length > 15) {
      return {
        valid: false,
        error: 'Укажите корректный номер телефона (например, +992 92 777-45-67).',
      };
    }
    const tail = digits.slice(-7);
    if (/^(\d)\1{5,}/.test(tail) || tail === '1234567' || tail === '7654321') {
      return {
        valid: false,
        error: 'Укажите настоящий номер телефона для обратной связи.',
      };
    }
    return { valid: true, formatted: `+${digits}` };
  }

  return {
    valid: false,
    error:
      'Введите номер Таджикистана (+992 XX XXX-XX-XX или 9 цифр) либо нажмите кнопку «📱 Отправить мой номер».',
  };
}

export class TelegramBotEngine {
  private readonly store: CatalogStore;
  private readonly transport: TelegramTransport;
  private readonly adminSessions = new Map<number, AdminSession>();
  private readonly clientSessions = new Map<number, ClientSession>();
  private readonly appUrl: string;

  constructor(options: {
    store: CatalogStore;
    transport: TelegramTransport;
    appUrl?: string;
  }) {
    this.store = options.store;
    this.transport = options.transport;
    this.appUrl = (options.appUrl || '').replace(/\/+$/, '');
  }

  public async handleUpdate(update: TelegramUpdate): Promise<void> {
    if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
      return;
    }
    if (update.message) {
      await this.handleMessage(update.message);
    }
  }

  private getOwnerReplyKeyboard(): TelegramReplyMarkup {
    return {
      keyboard: [
        [{ text: '📦 Список и остатки' }, { text: '➕ Добавить товар' }],
        [{ text: '📊 Сводка склада' }, { text: '❌ Отмена' }],
      ],
      resize_keyboard: true,
    };
  }

  private getClientReplyKeyboard(): TelegramReplyMarkup {
    return {
      keyboard: [
        [{ text: '✉️ Написать владельцу' }],
        [{ text: '📅 График и контакты' }, { text: '❌ Отмена' }],
      ],
      resize_keyboard: true,
    };
  }

  private async handleMessage(msg: TelegramMessage): Promise<void> {
    const fromId = msg.from?.id;
    const chatId = msg.chat.id;
    if (!fromId || msg.from?.is_bot) return;

    if (isOwnerTelegramId(fromId)) {
      await this.handleOwnerMessage(msg, fromId, chatId);
    } else {
      await this.handleClientMessage(msg, fromId, chatId);
    }
  }

  // =========================================================================
  // OWNER / ADMIN FLOW (Strictly gated to CLUB_CONTACT.ownerChatId = 979409624)
  // =========================================================================

  private async sendOwnerMainMenu(chatId: number, prefix?: string): Promise<void> {
    const all = this.store.listProducts();
    const outOfStock = all.filter((p) => p.stock <= 0).length;
    const totalUnits = all.reduce((sum, p) => sum + p.stock, 0);

    const lines = [
      prefix ? `${prefix}\n` : '',
      `🛡 Панель владельца UsmonovTeam (${CLUB_CONTACT.ownerName})`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📦 Товаров в каталоге: ${all.length} позиций`,
      `📊 Всего единиц на складе: ${totalUnits} шт.`,
      outOfStock > 0 ? `⚠️ Нет в наличии: ${outOfStock} поз.` : `✅ Все позиции в наличии`,
      ``,
      `Выберите действие кнопками ниже:`,
    ].filter(Boolean);

    await this.transport.sendMessage(chatId, lines.join('\n'), this.getOwnerReplyKeyboard());
  }

  private async sendOwnerProductList(
    chatId: number,
    page = 0,
    editMessageId?: number
  ): Promise<void> {
    const products = this.store.listProducts();
    if (products.length === 0) {
      const emptyText =
        '📦 Каталог пока пуст. Нажмите «➕ Добавить товар», чтобы добавить первую позицию с фото.';
      const markup: TelegramReplyMarkup = {
        inline_keyboard: [[{ text: '➕ Добавить товар', callback_data: 'a:add' }]],
      };
      if (editMessageId && this.transport.editMessageText) {
        await this.transport.editMessageText(chatId, editMessageId, emptyText, markup);
      } else {
        await this.transport.sendMessage(chatId, emptyText, markup);
      }
      return;
    }

    const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));
    const safePage = Math.max(0, Math.min(page, totalPages - 1));
    const slice = products.slice(safePage * ITEMS_PER_PAGE, (safePage + 1) * ITEMS_PER_PAGE);

    const keyboard: TelegramInlineButton[][] = slice.map((p) => {
      const shortName = p.name.length > 26 ? `${p.name.slice(0, 25)}…` : p.name;
      const stockTag = p.stock > 0 ? `${p.stock}шт` : '0шт!';
      return [
        {
          text: `${shortName} · ${p.price}с · ${stockTag}`,
          callback_data: `a:v:${p.id}:${safePage}`,
        },
      ];
    });

    const navRow: TelegramInlineButton[] = [];
    if (safePage > 0) {
      navRow.push({ text: '⬅️ Назад', callback_data: `a:l:${safePage - 1}` });
    }
    if (safePage < totalPages - 1) {
      navRow.push({ text: 'Вперёд ➡️', callback_data: `a:l:${safePage + 1}` });
    }
    if (navRow.length > 0) keyboard.push(navRow);

    keyboard.push([{ text: '➕ Добавить новый товар', callback_data: 'a:add' }]);

    const text = [
      `📦 Каталог товаров (${products.length} поз.) — стр. ${safePage + 1}/${totalPages}`,
      `Нажмите на товар, чтобы изменить цену, кол-во, фото или удалить:`,
    ].join('\n');

    if (editMessageId && this.transport.editMessageText) {
      await this.transport.editMessageText(chatId, editMessageId, text, {
        inline_keyboard: keyboard,
      });
    } else {
      await this.transport.sendMessage(chatId, text, { inline_keyboard: keyboard });
    }
  }

  private formatProductCardText(p: GearProduct): string {
    const catLabel = CATEGORY_LABELS_RU[p.category] || p.category;
    return [
      `🏷 ${p.name}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📂 Категория: ${catLabel}`,
      `💰 Цена: ${formatCurrency(p.price)}`,
      `📦 Остаток (кол-во): ${p.stock} шт.${p.stock === 0 ? ' (НЕТ В НАЛИЧИИ)' : ''}`,
      `📏 Размеры: ${p.sizes}`,
      `🎨 Вариант: ${p.variants}`,
      `⭐ На главной (Хит): ${p.featured ? 'Да' : 'Нет'}`,
      `🖼 Фото: ${p.imageKey}`,
      `📝 Описание: ${p.description}`,
    ].join('\n');
  }

  private getProductCardMarkup(p: GearProduct, backPage = 0): TelegramReplyMarkup {
    return {
      inline_keyboard: [
        [
          { text: '➖5', callback_data: `a:s:${p.id}:-5` },
          { text: '➖1', callback_data: `a:s:${p.id}:-1` },
          { text: '➕1', callback_data: `a:s:${p.id}:1` },
          { text: '➕5', callback_data: `a:s:${p.id}:5` },
        ],
        [
          { text: '🔢 Задать кол-во', callback_data: `a:e:k:${p.id}` },
          { text: '💰 Цена (с.)', callback_data: `a:e:p:${p.id}` },
        ],
        [
          { text: '✏️ Название', callback_data: `a:e:n:${p.id}` },
          { text: '📏 Размеры', callback_data: `a:e:z:${p.id}` },
        ],
        [
          { text: '🎨 Вариант', callback_data: `a:e:v:${p.id}` },
          { text: '📝 Описание', callback_data: `a:e:d:${p.id}` },
        ],
        [
          { text: '🖼 Заменить фото', callback_data: `a:e:i:${p.id}` },
          { text: p.featured ? '⭐ Убрать из хитов' : '☆ Сделать хитом', callback_data: `a:f:${p.id}` },
        ],
        [
          { text: '🗑 Удалить товар', callback_data: `a:d0:${p.id}` },
          { text: '⬅️ К списку', callback_data: `a:l:${backPage}` },
        ],
      ],
    };
  }

  private async sendProductCard(
    chatId: number,
    productId: string,
    backPage = 0,
    editMessageId?: number
  ): Promise<void> {
    const product = this.store.getProductById(productId);
    if (!product) {
      const msg = '⚠️ Товар не найден или уже удалён.';
      if (editMessageId && this.transport.editMessageText) {
        await this.transport.editMessageText(chatId, editMessageId, msg, {
          inline_keyboard: [[{ text: '⬅️ К списку', callback_data: 'a:l:0' }]],
        });
      } else {
        await this.transport.sendMessage(chatId, msg);
      }
      return;
    }

    const text = this.formatProductCardText(product);
    const markup = this.getProductCardMarkup(product, backPage);
    if (editMessageId && this.transport.editMessageText) {
      await this.transport.editMessageText(chatId, editMessageId, text, markup);
    } else {
      await this.transport.sendMessage(chatId, text, markup);
    }
  }

  private async startAddWizard(chatId: number, ownerId: number): Promise<void> {
    this.adminSessions.set(ownerId, {
      mode: 'add',
      step: 'category',
      draft: { featured: false },
    });

    const catButtons: TelegramInlineButton[][] = ORDERED_CATEGORIES.map((cat, idx) => [
      { text: CATEGORY_LABELS_RU[cat], callback_data: `a:c:${idx}` },
    ]);
    catButtons.push([{ text: '❌ Отмена', callback_data: 'a:x' }]);

    await this.transport.sendMessage(
      chatId,
      '➕ Добавление нового товара\n\nШаг 1/7: Выберите категорию товара:',
      { inline_keyboard: catButtons }
    );
  }

  private async handleOwnerMessage(
    msg: TelegramMessage,
    ownerId: number,
    chatId: number
  ): Promise<void> {
    const text = (msg.text || '').trim();
    const session = this.adminSessions.get(ownerId) || { mode: 'idle' };

    // Global owner commands / top-level menu triggers
    if (
      text === '/start' ||
      text === '/admin' ||
      text === '/menu' ||
      text === '/cancel' ||
      text === '❌ Отмена'
    ) {
      this.adminSessions.set(ownerId, { mode: 'idle' });
      const prefix =
        text === '/cancel' || text === '❌ Отмена' ? '↩️ Действие отменено.' : undefined;
      await this.sendOwnerMainMenu(chatId, prefix);
      return;
    }

    if (text === '/list' || text === '📦 Список и остатки') {
      this.adminSessions.set(ownerId, { mode: 'idle' });
      await this.sendOwnerProductList(chatId, 0);
      return;
    }

    if (text === '/add' || text === '➕ Добавить товар') {
      await this.startAddWizard(chatId, ownerId);
      return;
    }

    if (text === '📊 Сводка склада') {
      this.adminSessions.set(ownerId, { mode: 'idle' });
      const products = this.store.listProducts();
      const zero = products.filter((p) => p.stock === 0);
      const low = products.filter((p) => p.stock > 0 && p.stock <= 5);
      const lines = [
        '📊 Сводка склада UsmonovTeam',
        `━━━━━━━━━━━━━━━━━━━━`,
        `Всего позиций: ${products.length}`,
        `Общий остаток: ${products.reduce((s, p) => s + p.stock, 0)} шт.`,
        `Закончились (0 шт.): ${zero.length > 0 ? zero.map((p) => p.name).join(', ') : 'нет'}`,
        `Мало (1–5 шт.): ${low.length > 0 ? low.map((p) => `${p.name} (${p.stock}шт)`).join(', ') : 'нет'}`,
      ];
      await this.transport.sendMessage(chatId, lines.join('\n'), this.getOwnerReplyKeyboard());
      return;
    }

    // Photo input handling for Add Wizard or Photo Edit
    if (msg.photo && msg.photo.length > 0) {
      await this.handleOwnerPhotoMessage(msg, ownerId, chatId, session);
      return;
    }

    // Wizard text steps
    if (session.mode === 'add') {
      await this.handleOwnerAddTextStep(text, ownerId, chatId, session);
      return;
    }

    if (session.mode === 'edit') {
      await this.handleOwnerEditTextStep(text, ownerId, chatId, session);
      return;
    }

    await this.sendOwnerMainMenu(
      chatId,
      'Используйте кнопки меню ниже для управления товарами или введите /list.'
    );
  }

  private async handleOwnerPhotoMessage(
    msg: TelegramMessage,
    ownerId: number,
    chatId: number,
    session: AdminSession
  ): Promise<void> {
    if (!msg.photo || msg.photo.length === 0) return;
    const largest = msg.photo[msg.photo.length - 1];

    if (
      !(session.mode === 'add' && session.step === 'photo') &&
      !(session.mode === 'edit' && session.field === 'photo')
    ) {
      await this.transport.sendMessage(
        chatId,
        '📸 Чтобы прикрепить фото к товару, выберите «➕ Добавить товар» или откройте товар из «📦 Список и остатки» → «🖼 Заменить фото».'
      );
      return;
    }

    if (!this.transport.downloadPhoto) {
      await this.transport.sendMessage(chatId, '⚠️ Загрузка фото не настроена на сервере.');
      return;
    }

    let savedPath = '';
    try {
      const downloaded = await this.transport.downloadPhoto(largest.file_id);
      savedPath = this.store.saveUploadedImage(downloaded.buffer, downloaded.extension);
    } catch (err) {
      await this.transport.sendMessage(
        chatId,
        `❌ Не удалось сохранить фото: ${err instanceof Error ? err.message : 'ошибка загрузки'}`
      );
      return;
    }

    if (session.mode === 'add' && session.step === 'photo') {
      await this.finalizeAddProduct(ownerId, chatId, session.draft, savedPath);
      return;
    }

    if (session.mode === 'edit' && session.field === 'photo') {
      const updated = this.store.updateProduct(
        session.productId,
        { imageKey: savedPath },
        `tg_${ownerId}`
      );
      this.adminSessions.set(ownerId, { mode: 'idle' });
      if (!updated.ok) {
        await this.transport.sendMessage(chatId, `❌ ${updated.error}`);
        return;
      }
      await this.transport.sendMessage(
        chatId,
        `✅ Фотография товара «${updated.product.name}» обновлена и сразу появилась на сайте!`
      );
      await this.sendProductCard(chatId, updated.product.id, 0);
    }
  }

  private async finalizeAddProduct(
    ownerId: number,
    chatId: number,
    draft: Partial<ProductInput>,
    imageKey: string
  ): Promise<void> {
    const result = this.store.createProduct(
      {
        name: draft.name || 'Новый товар',
        category: draft.category || 'Accessories',
        price: draft.price ?? 0,
        stock: draft.stock ?? 1,
        sizes: draft.sizes || 'Standard',
        variants: draft.variants || 'Стандарт',
        description: draft.description || 'Оригинальная экипировка UsmonovTeam.',
        imageKey,
        featured: Boolean(draft.featured),
      },
      `tg_${ownerId}`
    );

    this.adminSessions.set(ownerId, { mode: 'idle' });

    if (!result.ok) {
      await this.transport.sendMessage(
        chatId,
        `❌ Не удалось создать товар: ${result.error}`,
        this.getOwnerReplyKeyboard()
      );
      return;
    }

    await this.transport.sendMessage(
      chatId,
      `✅ Товар добавлен в базу и сразу появился на сайте!\n\n${this.formatProductCardText(result.product)}`,
      this.getProductCardMarkup(result.product, 0)
    );
  }

  private async handleOwnerAddTextStep(
    text: string,
    ownerId: number,
    chatId: number,
    session: Extract<AdminSession, { mode: 'add' }>
  ): Promise<void> {
    if (!text) {
      await this.transport.sendMessage(chatId, 'Пожалуйста, отправьте текстовое значение (или /cancel).');
      return;
    }

    if (session.step === 'category') {
      await this.transport.sendMessage(
        chatId,
        'Выберите категорию с помощью кнопок выше или нажмите «❌ Отмена».'
      );
      return;
    }

    if (session.step === 'name') {
      if (text.length < 2 || text.length > 100) {
        await this.transport.sendMessage(chatId, 'Название должно быть от 2 до 100 символов. Попробуйте снова:');
        return;
      }
      session.draft.name = text;
      session.step = 'price';
      await this.transport.sendMessage(
        chatId,
        'Шаг 3/7: Введите цену в сомони (только число, например: 950):'
      );
      return;
    }

    if (session.step === 'price') {
      const price = Number(text.replace(',', '.').replace(/\s+/g, ''));
      if (!Number.isFinite(price) || price < 0 || price > 100000) {
        await this.transport.sendMessage(chatId, 'Введите корректную цену от 0 до 100000 (например: 850):');
        return;
      }
      session.draft.price = Math.round(price * 100) / 100;
      session.step = 'stock';
      await this.transport.sendMessage(
        chatId,
        'Шаг 4/7: Введите количество товара на складе (целое число, например: 12):'
      );
      return;
    }

    if (session.step === 'stock') {
      const stock = Number(text.replace(/\s+/g, ''));
      if (!Number.isInteger(stock) || stock < 0 || stock > 100000) {
        await this.transport.sendMessage(chatId, 'Введите целое количество от 0 до 100000 (например: 10):');
        return;
      }
      session.draft.stock = stock;
      session.step = 'sizes';
      await this.transport.sendMessage(
        chatId,
        'Шаг 5/7: Введите доступные размеры через запятую (например: 39, 40, 41, 42 или S, M, L):',
        {
          inline_keyboard: [[{ text: '⏭ Стандарт (S, M, L, XL)', callback_data: 'a:skip:sz' }]],
        }
      );
      return;
    }

    if (session.step === 'sizes') {
      if (text.length > 80) {
        await this.transport.sendMessage(chatId, 'Строка размеров слишком длинная (макс. 80 символов).');
        return;
      }
      session.draft.sizes = text;
      session.step = 'variants';
      await this.transport.sendMessage(
        chatId,
        'Шаг 6/7: Укажите расцветку или особенность модели (например: Чёрный / Золото):',
        {
          inline_keyboard: [[{ text: '⏭ Пропустить (Стандарт)', callback_data: 'a:skip:var' }]],
        }
      );
      return;
    }

    if (session.step === 'variants') {
      if (text.length > 120) {
        await this.transport.sendMessage(chatId, 'Вариант слишком длинный (макс. 120 символов).');
        return;
      }
      session.draft.variants = text;
      session.step = 'description';
      await this.transport.sendMessage(
        chatId,
        'Шаг 7/7 (текст): Введите короткое описание товара для покупателей (до 600 символов):',
        {
          inline_keyboard: [[{ text: '⏭ Стандартное описание', callback_data: 'a:skip:desc' }]],
        }
      );
      return;
    }

    if (session.step === 'description') {
      if (text.length < 2 || text.length > 600) {
        await this.transport.sendMessage(chatId, 'Описание должно быть от 2 до 600 символов.');
        return;
      }
      session.draft.description = text;
      session.step = 'photo';
      await this.transport.sendMessage(
        chatId,
        '📸 Финальный шаг: Отправьте фотографию товара прямо в этот чат (как обычное фото) — товар сразу появится на сайте!',
        {
          inline_keyboard: [[{ text: '⏭ Сохранить без нового фото', callback_data: 'a:skip:img' }]],
        }
      );
      return;
    }

    if (session.step === 'photo') {
      await this.transport.sendMessage(
        chatId,
        '📸 Отправьте именно фотографию (картинку) в чат или нажмите кнопку «⏭ Сохранить без нового фото».',
        {
          inline_keyboard: [[{ text: '⏭ Сохранить без нового фото', callback_data: 'a:skip:img' }]],
        }
      );
    }
  }

  private async handleOwnerEditTextStep(
    text: string,
    ownerId: number,
    chatId: number,
    session: Extract<AdminSession, { mode: 'edit' }>
  ): Promise<void> {
    if (session.field === 'photo') {
      await this.transport.sendMessage(
        chatId,
        '📸 Отправьте новую фотографию товара в чат (или /cancel для отмены).'
      );
      return;
    }

    let result: { ok: true; product: GearProduct } | { ok: false; error: string };

    if (session.field === 'stock') {
      const exact = Number(text.replace(/\s+/g, ''));
      if (!Number.isInteger(exact) || exact < 0 || exact > 100000) {
        await this.transport.sendMessage(chatId, 'Введите целое число от 0 до 100000 (например: 15):');
        return;
      }
      result = this.store.adjustStock(session.productId, { exact }, `tg_${ownerId}`);
    } else if (session.field === 'price') {
      const price = Number(text.replace(',', '.').replace(/\s+/g, ''));
      if (!Number.isFinite(price) || price < 0 || price > 100000) {
        await this.transport.sendMessage(chatId, 'Введите цену числом от 0 до 100000 (например: 990):');
        return;
      }
      result = this.store.updateProduct(session.productId, { price }, `tg_${ownerId}`);
    } else if (session.field === 'name') {
      result = this.store.updateProduct(session.productId, { name: text }, `tg_${ownerId}`);
    } else if (session.field === 'sizes') {
      result = this.store.updateProduct(session.productId, { sizes: text }, `tg_${ownerId}`);
    } else if (session.field === 'variants') {
      result = this.store.updateProduct(session.productId, { variants: text }, `tg_${ownerId}`);
    } else {
      result = this.store.updateProduct(session.productId, { description: text }, `tg_${ownerId}`);
    }

    if (!result.ok) {
      await this.transport.sendMessage(chatId, `❌ ${result.error} Попробуйте ещё раз или /cancel.`);
      return;
    }

    this.adminSessions.set(ownerId, { mode: 'idle' });
    await this.transport.sendMessage(
      chatId,
      `✅ Изменения сохранены и сразу синхронизированы с сайтом!`
    );
    await this.sendProductCard(chatId, result.product.id, 0);
  }

  private async handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
    const fromId = query.from.id;
    const chatId = query.message?.chat.id ?? fromId;
    const messageId = query.message?.message_id;
    const data = String(query.data || '');

    // STRICT SECURITY GATE: block non-owners from ANY admin callback
    if (data.startsWith('a:') && !isOwnerTelegramId(fromId)) {
      if (this.transport.answerCallbackQuery) {
        await this.transport.answerCallbackQuery(
          query.id,
          'Доступ запрещён: управление товарами доступно только владельцу.'
        );
      }
      return;
    }

    if (!isOwnerTelegramId(fromId)) {
      if (this.transport.answerCallbackQuery) {
        await this.transport.answerCallbackQuery(query.id);
      }
      if (data === 'c:msg') {
        this.clientSessions.set(fromId, { step: 'name' });
        await this.transport.sendMessage(
          chatId,
          'Введите ваше настоящее имя и фамилию:',
          this.getClientReplyKeyboard()
        );
      }
      return;
    }

    if (this.transport.answerCallbackQuery) {
      await this.transport.answerCallbackQuery(query.id);
    }

    // Owner callbacks
    if (data === 'a:x') {
      this.adminSessions.set(fromId, { mode: 'idle' });
      await this.sendOwnerMainMenu(chatId, '↩️ Отменено.');
      return;
    }

    if (data === 'a:add') {
      await this.startAddWizard(chatId, fromId);
      return;
    }

    if (data.startsWith('a:l:')) {
      const page = Number(data.slice(4)) || 0;
      await this.sendOwnerProductList(chatId, page, messageId);
      return;
    }

    if (data.startsWith('a:v:')) {
      const parts = data.split(':');
      const productId = parts[2];
      const backPage = Number(parts[3]) || 0;
      await this.sendProductCard(chatId, productId, backPage, messageId);
      return;
    }

    if (data.startsWith('a:s:')) {
      const parts = data.split(':');
      const productId = parts[2];
      const delta = Number(parts[3]) || 0;
      const existing = this.store.getProductById(productId);
      if (!existing) {
        await this.transport.sendMessage(chatId, '⚠️ Товар не найден.');
        return;
      }
      const nextStock = Math.max(0, existing.stock + delta);
      const updated = this.store.adjustStock(productId, { exact: nextStock }, `tg_${fromId}`);
      if (updated.ok) {
        await this.sendProductCard(chatId, productId, 0, messageId);
      }
      return;
    }

    if (data.startsWith('a:f:')) {
      const productId = data.slice(4);
      const existing = this.store.getProductById(productId);
      if (existing) {
        this.store.updateProduct(productId, { featured: !existing.featured }, `tg_${fromId}`);
        await this.sendProductCard(chatId, productId, 0, messageId);
      }
      return;
    }

    if (data.startsWith('a:d0:')) {
      const productId = data.slice(5);
      const existing = this.store.getProductById(productId);
      if (!existing) {
        await this.sendOwnerProductList(chatId, 0, messageId);
        return;
      }
      const confirmMarkup: TelegramReplyMarkup = {
        inline_keyboard: [
          [
            { text: '⚠️ Да, удалить товар', callback_data: `a:d1:${productId}` },
            { text: '↩️ Отмена', callback_data: `a:v:${productId}:0` },
          ],
        ],
      };
      const text = `🗑 Удалить товар «${existing.name}»?\nЭто действие сразу уберёт позицию с сайта.`;
      if (messageId && this.transport.editMessageText) {
        await this.transport.editMessageText(chatId, messageId, text, confirmMarkup);
      } else {
        await this.transport.sendMessage(chatId, text, confirmMarkup);
      }
      return;
    }

    if (data.startsWith('a:d1:')) {
      const productId = data.slice(5);
      const res = this.store.deleteProduct(productId);
      if (res.ok) {
        if (messageId && this.transport.editMessageText) {
          await this.transport.editMessageText(
            chatId,
            messageId,
            `✅ Товар «${res.deleted.name}» удалён из базы и с сайта.`,
            {
              inline_keyboard: [[{ text: '📦 Вернуться к списку', callback_data: 'a:l:0' }]],
            }
          );
        } else {
          await this.transport.sendMessage(chatId, `✅ Товар «${res.deleted.name}» удалён.`);
        }
      }
      return;
    }

    if (data.startsWith('a:e:')) {
      const parts = data.split(':');
      const code = parts[2];
      const productId = parts[3];
      const fieldMap: Record<
        string,
        { field: Extract<AdminSession, { mode: 'edit' }>['field']; prompt: string }
      > = {
        k: { field: 'stock', prompt: '🔢 Введите точное количество товара на складе (число >= 0):' },
        p: { field: 'price', prompt: '💰 Введите новую цену в сомони (например: 950):' },
        n: { field: 'name', prompt: '✏️ Введите новое название товара (2–100 символов):' },
        z: { field: 'sizes', prompt: '📏 Введите доступные размеры через запятую:' },
        v: { field: 'variants', prompt: '🎨 Введите описание расцветки / варианта:' },
        d: { field: 'description', prompt: '📝 Введите новое описание товара:' },
        i: { field: 'photo', prompt: '🖼 Отправьте новую фотографию товара прямо в этот чат:' },
      };
      const target = fieldMap[code];
      if (!target) return;
      this.adminSessions.set(fromId, { mode: 'edit', productId, field: target.field });
      await this.transport.sendMessage(chatId, `${target.prompt}\n(Для отмены нажмите /cancel)`);
      return;
    }

    if (data.startsWith('a:c:')) {
      const catIdx = Number(data.slice(4));
      const category = ORDERED_CATEGORIES[catIdx];
      const session = this.adminSessions.get(fromId);
      if (!category || !session || session.mode !== 'add') return;
      session.draft.category = category;
      session.step = 'name';
      await this.transport.sendMessage(
        chatId,
        `Категория: ${CATEGORY_LABELS_RU[category]}\n\nШаг 2/7: Введите название товара (например: Борцовки Nike Inflict Red):`
      );
      return;
    }

    if (data.startsWith('a:skip:')) {
      const kind = data.slice(7);
      const session = this.adminSessions.get(fromId);
      if (!session || session.mode !== 'add') return;

      if (kind === 'sz' && session.step === 'sizes') {
        session.draft.sizes = 'S, M, L, XL';
        session.step = 'variants';
        await this.transport.sendMessage(
          chatId,
          'Размеры: S, M, L, XL\n\nШаг 6/7: Укажите расцветку или особенность модели:',
          {
            inline_keyboard: [[{ text: '⏭ Пропустить (Стандарт)', callback_data: 'a:skip:var' }]],
          }
        );
      } else if (kind === 'var' && session.step === 'variants') {
        session.draft.variants = 'Фирменная серия UsmonovTeam';
        session.step = 'description';
        await this.transport.sendMessage(
          chatId,
          'Шаг 7/7 (текст): Введите короткое описание товара для покупателей:',
          {
            inline_keyboard: [[{ text: '⏭ Стандартное описание', callback_data: 'a:skip:desc' }]],
          }
        );
      } else if (kind === 'desc' && session.step === 'description') {
        session.draft.description =
          'Оригинальная борцовская экипировка UsmonovTeam для ежедневных тренировок и соревнований.';
        session.step = 'photo';
        await this.transport.sendMessage(
          chatId,
          '📸 Финальный шаг: Отправьте фотографию товара прямо в этот чат (как обычное фото) — товар сразу появится на сайте!',
          {
            inline_keyboard: [[{ text: '⏭ Сохранить без нового фото', callback_data: 'a:skip:img' }]],
          }
        );
      } else if (kind === 'img' && session.step === 'photo') {
        const defaultVisual =
          session.draft.category === 'Apparel' ? 'studio_rashguard' : 'studio_wraps';
        await this.finalizeAddProduct(fromId, chatId, session.draft, defaultVisual);
      }
    }
  }

  // =========================================================================
  // CLIENT FLOW (All non-owner Telegram users)
  // =========================================================================

  private async handleClientMessage(
    msg: TelegramMessage,
    clientId: number,
    chatId: number
  ): Promise<void> {
    const text = (msg.text || '').trim();
    let session = this.clientSessions.get(clientId) || { step: 'idle' };

    // Handle Telegram Contact Share when user taps "Отправить мой номер"
    if (msg.contact) {
      if (session.step !== 'phone') {
        session = {
          step: 'phone',
          name:
            session.name ||
            [msg.contact.first_name, msg.contact.last_name].filter(Boolean).join(' ') ||
            msg.from?.first_name ||
            'Клиент',
        };
      }
      const phoneCheck = validateClientTelegramPhone(msg.contact.phone_number, true);
      if (!phoneCheck.valid || !phoneCheck.formatted) {
        await this.transport.sendMessage(
          chatId,
          `⚠️ ${phoneCheck.error || 'Некорректный номер.'}`,
          this.getClientPhoneMarkup()
        );
        return;
      }
      session.phoneFormatted = phoneCheck.formatted;
      if (session.draftMessage) {
        await this.dispatchClientMessageToOwner(clientId, chatId, msg.from, session, session.draftMessage);
        return;
      }
      session.step = 'message';
      this.clientSessions.set(clientId, session);
      await this.transport.sendMessage(
        chatId,
        `✅ Номер ${phoneCheck.formatted} принят!\n\nШаг 3/3: Напишите ваш вопрос или сообщение для владельца зала (${CLUB_CONTACT.ownerName}):`,
        this.getClientReplyKeyboard()
      );
      return;
    }

    if (text === '/cancel' || text === '❌ Отмена') {
      this.clientSessions.set(clientId, { step: 'idle' });
      await this.transport.sendMessage(
        chatId,
        '↩️ Отменено. Нажмите «✉️ Написать владельцу», когда будете готовы отправить сообщение.',
        this.getClientReplyKeyboard()
      );
      return;
    }

    // Never expose admin commands to non-owners
    if (text === '/admin' || text === '/add' || text === '/list') {
      this.clientSessions.set(clientId, { step: 'idle' });
      await this.transport.sendMessage(
        chatId,
        [
          `👋 Салом! Вы находитесь в боте зала вольной борьбы UsmonovTeam (г. Худжанд).`,
          `Управление каталогом доступно только владельцу зала.`,
          ``,
          `Чтобы задать вопрос тренеру ${CLUB_CONTACT.ownerName}, нажмите «✉️ Написать владельцу».`,
        ].join('\n'),
        this.getClientReplyKeyboard()
      );
      return;
    }

    if (text === '/start' || text === '/help') {
      this.clientSessions.set(clientId, { step: 'name' });
      const lines = [
        `🤼 Салом! Это официальный бот зала вольной борьбы и экипировки UsmonovTeam (Худжанд).`,
        `Владелец и тренер: ${CLUB_CONTACT.ownerName} · ${CLUB_CONTACT.phoneFormatted}`,
        ``,
        `Чтобы отправить сообщение напрямую владельцу, введите ваше настоящее имя и фамилию (Шаг 1/3):`,
      ];
      await this.transport.sendMessage(chatId, lines.join('\n'), this.getClientReplyKeyboard());
      return;
    }

    if (text === '📅 График и контакты') {
      const info = [
        `🤼 Зал вольной борьбы UsmonovTeam — г. Худжанд`,
        `Тренер и владелец: ${CLUB_CONTACT.ownerName}`,
        `📞 Телефон: ${CLUB_CONTACT.phoneFormatted}`,
        ``,
        `📅 График тренировок:`,
        `• Пн, Ср, Пт:`,
        `  1 смена: 16:00–17:30`,
        `  2 смена: 17:30–19:30`,
        `  3 смена: 19:30–21:00`,
        `• Суббота (Шн): Кросс`,
        this.appUrl ? `\n🌐 Сайт и экипировка: ${this.appUrl}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      await this.transport.sendMessage(chatId, info, this.getClientReplyKeyboard());
      return;
    }

    if (text === '✉️ Написать владельцу' || text === '/message') {
      this.clientSessions.set(clientId, { step: 'name' });
      await this.transport.sendMessage(
        chatId,
        'Шаг 1/3: Введите ваше настоящее имя и фамилию (например: Рустам Каримов):',
        this.getClientReplyKeyboard()
      );
      return;
    }

    // Step 1: Collect Real Name
    if (session.step === 'name') {
      const nameCheck = validateHumanName(text);
      if (!nameCheck.valid || !nameCheck.normalized) {
        await this.transport.sendMessage(
          chatId,
          `⚠️ ${nameCheck.error || 'Введите настоящее имя (только буквы).'}`
        );
        return;
      }
      session.name = nameCheck.normalized;
      session.step = 'phone';
      this.clientSessions.set(clientId, session);
      await this.transport.sendMessage(
        chatId,
        `Приятно познакомиться, ${nameCheck.normalized}!\n\nШаг 2/3: Отправьте ваш номер телефона (нажмите кнопку «📱 Отправить мой номер» ниже или введите вручную в формате +992 92 XXX-XX-XX):`,
        this.getClientPhoneMarkup()
      );
      return;
    }

    // Step 2: Collect Phone Number
    if (session.step === 'phone') {
      const phoneCheck = validateClientTelegramPhone(text, false);
      if (!phoneCheck.valid || !phoneCheck.formatted) {
        await this.transport.sendMessage(
          chatId,
          `⚠️ ${phoneCheck.error || 'Укажите действующий номер.'}`,
          this.getClientPhoneMarkup()
        );
        return;
      }
      session.phoneFormatted = phoneCheck.formatted;
      if (session.draftMessage) {
        await this.dispatchClientMessageToOwner(clientId, chatId, msg.from, session, session.draftMessage);
        return;
      }
      session.step = 'message';
      this.clientSessions.set(clientId, session);
      await this.transport.sendMessage(
        chatId,
        `✅ Номер ${phoneCheck.formatted} подтверждён!\n\nШаг 3/3: Напишите ваше сообщение или вопрос для владельца (${CLUB_CONTACT.ownerName}):`,
        this.getClientReplyKeyboard()
      );
      return;
    }

    // Step 3: Collect Message and forward to Owner ID 979409624
    if (session.step === 'message') {
      if (text.length < 3 || text.length > 600) {
        await this.transport.sendMessage(
          chatId,
          'Напишите сообщение длиной от 3 до 600 символов:'
        );
        return;
      }
      await this.dispatchClientMessageToOwner(clientId, chatId, msg.from, session, text);
      return;
    }

    // Idle state: if user immediately typed a question, save it as draftMessage & ask Name + Phone
    if (text.length >= 3 && !text.startsWith('/')) {
      this.clientSessions.set(clientId, {
        step: 'name',
        draftMessage: text.slice(0, 600),
      });
      await this.transport.sendMessage(
        chatId,
        `📝 Ваше сообщение сохранено. Чтобы передать его владельцу (${CLUB_CONTACT.ownerName}), представьтесь:\n\nШаг 1/2: Введите ваше настоящее имя и фамилию:`,
        this.getClientReplyKeyboard()
      );
      return;
    }

    await this.transport.sendMessage(
      chatId,
      `Нажмите «✉️ Написать владельцу», чтобы отправить сообщение ${CLUB_CONTACT.ownerName}.`,
      this.getClientReplyKeyboard()
    );
  }

  private getClientPhoneMarkup(): TelegramReplyMarkup {
    return {
      keyboard: [
        [{ text: '📱 Отправить мой номер', request_contact: true }],
        [{ text: '❌ Отмена' }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    };
  }

  private async dispatchClientMessageToOwner(
    clientId: number,
    clientChatId: number,
    fromUser: TelegramUser | undefined,
    session: ClientSession,
    messageText: string
  ): Promise<void> {
    const now = Date.now();
    if (session.lastSentAt && now - session.lastSentAt < 15000) {
      await this.transport.sendMessage(
        clientChatId,
        '⏳ Анти-спам защита: подождите 15 секунд перед следующим сообщением.'
      );
      return;
    }

    const senderName = session.name || 'Клиент';
    const verifiedPhone = session.phoneFormatted || 'Не указан';
    const usernameNote = fromUser?.username ? ` (@${fromUser.username})` : '';
    const formatted = buildTelegramDirectMessage({
      messageId: `msg_${now}`,
      senderName: `${senderName}${usernameNote}`,
      verifiedPhone,
      topic: 'Обращение через Telegram-бот',
      messageBody: messageText,
    });

    const ownerMessage = `${formatted.botText}\n🆔 Telegram ID: ${clientId}`;
    await this.transport.sendMessage(CLUB_CONTACT.ownerChatId, ownerMessage);

    this.clientSessions.set(clientId, {
      step: 'idle',
      name: session.name,
      phoneFormatted: session.phoneFormatted,
      lastSentAt: now,
    });

    await this.transport.sendMessage(
      clientChatId,
      [
        `✅ Ваше сообщение отправлено напрямую владельцу (${CLUB_CONTACT.ownerName})!`,
        `👤 Имя: ${senderName}`,
        `📱 Телефон: ${verifiedPhone}`,
        ``,
        `Если нужно написать ещё раз, нажмите «✉️ Написать владельцу».`,
      ].join('\n'),
      this.getClientReplyKeyboard()
    );
  }
}
