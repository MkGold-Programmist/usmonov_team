import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CatalogStore, resolveSafeChildPath } from './catalogStore';
import {
  TelegramBotEngine,
  isOwnerTelegramId,
  validateClientTelegramPhone,
  type TelegramReplyMarkup,
} from './telegramBotEngine';
import { INITIAL_PRODUCTS } from '../data/seedData';
import { CLUB_CONTACT } from '../utils/storeLogic';

interface SentEvent {
  type: 'send' | 'edit' | 'answer';
  chatId?: number | string;
  messageId?: number;
  text?: string;
  replyMarkup?: TelegramReplyMarkup;
}

function createTempCatalogHarness() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'usmonov-bot-test-'));
  const store = new CatalogStore({
    dataFilePath: path.join(tempDir, 'catalog.json'),
    uploadsDir: path.join(tempDir, 'uploads'),
    initialProducts: INITIAL_PRODUCTS.slice(0, 3),
  });

  const events: SentEvent[] = [];
  const engine = new TelegramBotEngine({
    store,
    appUrl: 'https://usmonovtime.tj',
    transport: {
      sendMessage: async (chatId, text, replyMarkup) => {
        events.push({ type: 'send', chatId, text, replyMarkup });
      },
      editMessageText: async (chatId, messageId, text, replyMarkup) => {
        events.push({ type: 'edit', chatId, messageId, text, replyMarkup });
      },
      answerCallbackQuery: async (_id, text) => {
        events.push({ type: 'answer', text });
      },
      downloadPhoto: async (fileId) => ({
        buffer: Buffer.from(`fake-jpeg-data-${fileId}`),
        extension: '.jpg',
      }),
    },
  });

  const cleanup = () => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  };

  return { store, engine, events, tempDir, cleanup };
}

test('isOwnerTelegramId allows only owner 979409624 and blocks everyone else', () => {
  assert.equal(isOwnerTelegramId(979409624), true);
  assert.equal(isOwnerTelegramId('979409624'), true);
  assert.equal(isOwnerTelegramId(123456789), false);
  assert.equal(isOwnerTelegramId('9794096240'), false);
  assert.equal(isOwnerTelegramId(undefined), false);
});

test('non-owner cannot access admin commands or forge admin callbacks', async () => {
  const { store, engine, events, cleanup } = createTempCatalogHarness();
  try {
    const strangerId = 555777999;
    const beforeCount = store.listProducts().length;

    await engine.handleUpdate({
      update_id: 1,
      message: {
        message_id: 10,
        from: { id: strangerId, first_name: 'Hacker' },
        chat: { id: strangerId, type: 'private' },
        text: '/admin',
      },
    });
    assert.ok(events.at(-1)?.text?.includes('только владельцу'));

    // Forged delete callback
    await engine.handleUpdate({
      update_id: 2,
      callback_query: {
        id: 'cb_hack',
        from: { id: strangerId, first_name: 'Hacker' },
        message: {
          message_id: 11,
          chat: { id: strangerId, type: 'private' },
        },
        data: `a:d1:${INITIAL_PRODUCTS[0].id}`,
      },
    });
    assert.ok(events.at(-1)?.text?.includes('Доступ запрещён'));
    assert.equal(store.listProducts().length, beforeCount);
  } finally {
    cleanup();
  }
});

test('owner full CRUD via Telegram bot: add with photo, adjust stock, edit price, delete', async () => {
  const { store, engine, events, tempDir, cleanup } = createTempCatalogHarness();
  const ownerId = Number(CLUB_CONTACT.ownerChatId); // 979409624
  const emittedReasons: string[] = [];
  const unsub = store.subscribe((ev) => emittedReasons.push(ev.reason));

  try {
    // 1. Owner starts bot
    await engine.handleUpdate({
      update_id: 1,
      message: {
        message_id: 1,
        from: { id: ownerId, first_name: 'Azam' },
        chat: { id: ownerId, type: 'private' },
        text: '/start',
      },
    });
    assert.ok(events.at(-1)?.text?.includes('Панель владельца UsmonovTeam'));

    // 2. Start Add Wizard
    await engine.handleUpdate({
      update_id: 2,
      message: {
        message_id: 2,
        from: { id: ownerId },
        chat: { id: ownerId, type: 'private' },
        text: '➕ Добавить товар',
      },
    });

    // Pick Category 0 ('Accessories')
    await engine.handleUpdate({
      update_id: 3,
      callback_query: {
        id: 'c1',
        from: { id: ownerId },
        message: { message_id: 3, chat: { id: ownerId, type: 'private' } },
        data: 'a:c:0',
      },
    });

    // Name, Price, Stock, Sizes, Variants, Description
    const wizardTexts = [
      'Борцовки Nike Fury Pro',
      '980',
      '15',
      '40, 41, 42, 43',
      'Чёрный / Красный',
      'Новые профессиональные борцовки для ковра и турниров.',
    ];
    let uid = 4;
    for (const val of wizardTexts) {
      await engine.handleUpdate({
        update_id: uid++,
        message: {
          message_id: uid,
          from: { id: ownerId },
          chat: { id: ownerId, type: 'private' },
          text: val,
        },
      });
    }

    // Send Photo directly in chat
    await engine.handleUpdate({
      update_id: uid++,
      message: {
        message_id: uid,
        from: { id: ownerId },
        chat: { id: ownerId, type: 'private' },
        photo: [{ file_id: 'tg_photo_999', width: 800, height: 600 }],
      },
    });

    const created = store.listProducts().find((p) => p.name === 'Борцовки Nike Fury Pro');
    assert.ok(created, 'Product should be created in catalog');
    assert.equal(created.price, 980);
    assert.equal(created.stock, 15);
    assert.ok(created.imageKey.startsWith('/uploads/products/'));
    const uploadedDiskFile = path.join(tempDir, 'uploads', path.basename(created.imageKey));
    assert.equal(fs.existsSync(uploadedDiskFile), true);

    // 3. Adjust stock via +5 callback button
    await engine.handleUpdate({
      update_id: uid++,
      callback_query: {
        id: 'c2',
        from: { id: ownerId },
        message: { message_id: 20, chat: { id: ownerId, type: 'private' } },
        data: `a:s:${created.id}:5`,
      },
    });
    assert.equal(store.getProductById(created.id)?.stock, 20);

    // 4. Exact stock edit via prompt
    await engine.handleUpdate({
      update_id: uid++,
      callback_query: {
        id: 'c3',
        from: { id: ownerId },
        message: { message_id: 20, chat: { id: ownerId, type: 'private' } },
        data: `a:e:k:${created.id}`,
      },
    });
    await engine.handleUpdate({
      update_id: uid++,
      message: {
        message_id: uid,
        from: { id: ownerId },
        chat: { id: ownerId, type: 'private' },
        text: '7',
      },
    });
    assert.equal(store.getProductById(created.id)?.stock, 7);

    // 5. Price edit
    await engine.handleUpdate({
      update_id: uid++,
      callback_query: {
        id: 'c4',
        from: { id: ownerId },
        message: { message_id: 20, chat: { id: ownerId, type: 'private' } },
        data: `a:e:p:${created.id}`,
      },
    });
    await engine.handleUpdate({
      update_id: uid++,
      message: {
        message_id: uid,
        from: { id: ownerId },
        chat: { id: ownerId, type: 'private' },
        text: '1050',
      },
    });
    assert.equal(store.getProductById(created.id)?.price, 1050);

    // 6. Verify all inline callback_data strings stay <= 64 bytes
    for (const ev of events) {
      if (ev.replyMarkup && 'inline_keyboard' in ev.replyMarkup) {
        for (const row of ev.replyMarkup.inline_keyboard) {
          for (const btn of row) {
            if (btn.callback_data) {
              assert.ok(
                Buffer.byteLength(btn.callback_data, 'utf-8') <= 64,
                `callback_data exceeds 64 bytes: ${btn.callback_data}`
              );
            }
          }
        }
      }
    }

    // 7. Delete product with confirmation
    await engine.handleUpdate({
      update_id: uid++,
      callback_query: {
        id: 'c5',
        from: { id: ownerId },
        message: { message_id: 20, chat: { id: ownerId, type: 'private' } },
        data: `a:d1:${created.id}`,
      },
    });
    assert.equal(store.getProductById(created.id), null);
    assert.ok(emittedReasons.includes('product:created'));
    assert.ok(emittedReasons.includes('product:updated'));
    assert.ok(emittedReasons.includes('product:deleted'));
  } finally {
    unsub();
    cleanup();
  }
});

test('regular Telegram user provides name, phone (text or contact), and message forwarded to owner 979409624', async () => {
  const { engine, events, cleanup } = createTempCatalogHarness();
  const clientId = 880011223;
  try {
    await engine.handleUpdate({
      update_id: 1,
      message: {
        message_id: 1,
        from: { id: clientId, first_name: 'Rustam', username: 'rustam_tj' },
        chat: { id: clientId, type: 'private' },
        text: '/start',
      },
    });
    assert.ok(events.at(-1)?.text?.includes('введите ваше настоящее имя'));

    // Prank name rejected
    await engine.handleUpdate({
      update_id: 2,
      message: {
        message_id: 2,
        from: { id: clientId, first_name: 'Rustam' },
        chat: { id: clientId, type: 'private' },
        text: 'прикол',
      },
    });
    assert.ok(events.at(-1)?.text?.includes('⚠️'));

    // Real name accepted
    await engine.handleUpdate({
      update_id: 3,
      message: {
        message_id: 3,
        from: { id: clientId, first_name: 'Rustam' },
        chat: { id: clientId, type: 'private' },
        text: 'Рустам Каримов',
      },
    });
    assert.ok(events.at(-1)?.text?.includes('Шаг 2/3'));

    // Share Telegram Contact
    await engine.handleUpdate({
      update_id: 4,
      message: {
        message_id: 4,
        from: { id: clientId, first_name: 'Rustam' },
        chat: { id: clientId, type: 'private' },
        contact: {
          phone_number: '992927774567',
          first_name: 'Рустам',
          user_id: clientId,
        },
      },
    });
    assert.ok(events.at(-1)?.text?.includes('+992 92 777-45-67'));
    assert.ok(events.at(-1)?.text?.includes('Шаг 3/3'));

    // Send final message
    await engine.handleUpdate({
      update_id: 5,
      message: {
        message_id: 5,
        from: { id: clientId, first_name: 'Rustam', username: 'rustam_tj' },
        chat: { id: clientId, type: 'private' },
        text: 'Здравствуйте! Во сколько начинается 2 смена по борьбе?',
      },
    });

    const ownerForwarded = events.find(
      (e) => String(e.chatId) === CLUB_CONTACT.ownerChatId
    );
    assert.ok(ownerForwarded, 'Owner must receive client message');
    assert.ok(ownerForwarded.text?.includes('Рустам Каримов'));
    assert.ok(ownerForwarded.text?.includes('+992 92 777-45-67'));
    assert.ok(ownerForwarded.text?.includes('2 смена по борьбе'));

    const clientReceipt = events.at(-1);
    assert.equal(clientReceipt?.chatId, clientId);
    assert.ok(clientReceipt?.text?.includes('отправлено напрямую владельцу'));
  } finally {
    cleanup();
  }
});

test('validateClientTelegramPhone, resolveSafeChildPath, and checkout stock decrement enforce bounds', () => {
  assert.equal(validateClientTelegramPhone('927774567', false).formatted, '+992 92 777-45-67');
  assert.equal(validateClientTelegramPhone('+79991234568', true).valid, true);
  assert.equal(validateClientTelegramPhone('920000000', false).valid, false);

  const safeBase = path.join(os.tmpdir(), 'safe-uploads');
  assert.throws(() => resolveSafeChildPath(safeBase, '..'), Error);
  const resolved = resolveSafeChildPath(safeBase, '../../hack.jpg');
  assert.ok(resolved.startsWith(path.resolve(safeBase) + path.sep));

  const { store, cleanup } = createTempCatalogHarness();
  try {
    const first = store.listProducts()[0];
    const startStock = first.stock;
    store.decrementStockForOrder([{ productId: first.id, quantity: 3 }]);
    assert.equal(store.getProductById(first.id)?.stock, Math.max(0, startStock - 3));
  } finally {
    cleanup();
  }
});
