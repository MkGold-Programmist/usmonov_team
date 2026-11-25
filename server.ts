import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import {
  CLUB_CONTACT,
  validateHumanName,
  validateTajikPhone,
  generatePhoneOtpCode,
  buildTelegramOrderMessage,
  buildTelegramDirectMessage,
} from './src/utils/storeLogic';
import { CatalogStore } from './src/server/catalogStore';
import {
  TelegramBotEngine,
  type TelegramReplyMarkup,
  type TelegramUpdate,
} from './src/server/telegramBotEngine';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '64kb' }));

const catalogStore = new CatalogStore();
app.use(
  '/uploads/products',
  express.static(catalogStore.getUploadsDir(), {
    maxAge: '1h',
    fallthrough: false,
  })
);

// Anti-prankster rate limiter by normalized phone digits
const orderCooldownByPhone = new Map<string, number>();
const messageCooldownByPhone = new Map<string, number>();

function getBotToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token === 'MY_TELEGRAM_BOT_TOKEN') {
    return null;
  }
  return token;
}

function getOwnerTelegramChatId(): string {
  return CLUB_CONTACT.ownerChatId;
}

async function callTelegramApi<T = unknown>(
  botToken: string,
  method: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal
): Promise<{ ok: boolean; result?: T; description?: string }> {
  const resp = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const json = (await resp.json().catch(() => ({ ok: false }))) as {
    ok: boolean;
    result?: T;
    description?: string;
  };
  return json;
}

async function forwardToOwnerTelegram(text: string): Promise<boolean> {
  const botToken = getBotToken();
  const chatId = getOwnerTelegramChatId();
  if (!botToken || !chatId) {
    return false;
  }
  try {
    const tgResponse = await callTelegramApi(botToken, 'sendMessage', {
      chat_id: chatId,
      text,
    });
    return Boolean(tgResponse.ok);
  } catch {
    return false;
  }
}

// ============================================================================
// AUTHORITATIVE PRODUCT CATALOG API + REAL-TIME SSE STREAM
// ============================================================================

app.get('/api/products', (_req, res) => {
  res.json({
    ok: true,
    products: catalogStore.listProducts(),
    updatedAt: catalogStore.getUpdatedAt(),
  });
});

app.get('/api/products/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendCatalogEvent = (reason: string) => {
    const payload = JSON.stringify({
      reason,
      products: catalogStore.listProducts(),
      updatedAt: catalogStore.getUpdatedAt(),
    });
    res.write(`event: catalog\ndata: ${payload}\n\n`);
  };

  // Send immediate authoritative snapshot on connect
  sendCatalogEvent('init');

  const unsubscribe = catalogStore.subscribe((event) => {
    sendCatalogEvent(event.reason);
  });

  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

app.post('/api/telegram/send-code', (req, res) => {
  const { name, phone } = req.body || {};
  const nameCheck = validateHumanName(String(name || ''));
  if (!nameCheck.valid || !nameCheck.normalized) {
    res.status(400).json({ ok: false, error: nameCheck.error });
    return;
  }

  const phoneCheck = validateTajikPhone(String(phone || ''));
  if (!phoneCheck.valid || !phoneCheck.formatted || !phoneCheck.digits) {
    res.status(400).json({ ok: false, error: phoneCheck.error });
    return;
  }

  const otpCode = generatePhoneOtpCode(phoneCheck.digits);
  res.json({
    ok: true,
    normalizedName: nameCheck.normalized,
    formattedPhone: phoneCheck.formatted,
    phoneDigits: phoneCheck.digits,
    demoOtpCode: otpCode,
    botUsername: CLUB_CONTACT.botUsername,
    ownerPhone: CLUB_CONTACT.phoneFormatted,
    message: `Код подтверждения для ${phoneCheck.formatted} сформирован через ${CLUB_CONTACT.botUsername}.`,
  });
});

app.post('/api/telegram/message', async (req, res) => {
  const { senderName, phone, otpVerified, humanVerified, topic, messageBody } = req.body || {};

  if (!humanVerified || !otpVerified) {
    res.status(403).json({
      ok: false,
      error: 'Сначала пройдите проверку «Я человек» и подтвердите номер телефона кодом.',
    });
    return;
  }

  const nameCheck = validateHumanName(String(senderName || ''));
  if (!nameCheck.valid || !nameCheck.normalized) {
    res.status(400).json({ ok: false, error: nameCheck.error });
    return;
  }

  const phoneCheck = validateTajikPhone(String(phone || ''));
  if (!phoneCheck.valid || !phoneCheck.formatted || !phoneCheck.digits) {
    res.status(400).json({ ok: false, error: phoneCheck.error });
    return;
  }

  const cleanBody = String(messageBody || '').trim();
  if (cleanBody.length < 3 || cleanBody.length > 600) {
    res.status(400).json({
      ok: false,
      error: 'Напишите сообщение для владельца (от 3 до 600 символов).',
    });
    return;
  }

  const lastMsgAt = messageCooldownByPhone.get(phoneCheck.digits) || 0;
  const now = Date.now();
  if (now - lastMsgAt < 15000) {
    res.status(429).json({
      ok: false,
      error: 'Анти-спам защита: подождите 15 секунд перед следующим сообщением.',
    });
    return;
  }
  messageCooldownByPhone.set(phoneCheck.digits, now);

  const messageId = `msg_${now}`;
  const formatted = buildTelegramDirectMessage({
    messageId,
    senderName: nameCheck.normalized,
    verifiedPhone: phoneCheck.formatted,
    topic: String(topic || 'Вопрос в зал'),
    messageBody: cleanBody,
  });

  const deliveredViaApi = await forwardToOwnerTelegram(formatted.botText);

  res.json({
    ok: true,
    messageId,
    senderName: nameCheck.normalized,
    verifiedPhone: phoneCheck.formatted,
    deliveredToOwner: CLUB_CONTACT.ownerName,
    ownerChatId: getOwnerTelegramChatId(),
    ownerPhone: CLUB_CONTACT.phoneFormatted,
    botUsername: CLUB_CONTACT.botUsername,
    deliveredViaApi,
    ...formatted,
    createdAt: new Date(now).toISOString(),
  });
});

app.post('/api/telegram/order', async (req, res) => {
  const {
    orderId,
    customerName,
    phone,
    otpVerified,
    shippingAddress,
    itemsSummary,
    items,
    totalAmount,
    promoCode,
  } = req.body || {};

  if (!otpVerified) {
    res.status(403).json({
      ok: false,
      error: 'Подтвердите номер телефона кодом перед отправкой заказа напрямую владельцу.',
    });
    return;
  }

  const nameCheck = validateHumanName(String(customerName || ''));
  if (!nameCheck.valid || !nameCheck.normalized) {
    res.status(400).json({ ok: false, error: nameCheck.error });
    return;
  }

  const phoneCheck = validateTajikPhone(String(phone || ''));
  if (!phoneCheck.valid || !phoneCheck.formatted || !phoneCheck.digits) {
    res.status(400).json({ ok: false, error: phoneCheck.error });
    return;
  }

  const lastOrderAt = orderCooldownByPhone.get(phoneCheck.digits) || 0;
  const now = Date.now();
  if (now - lastOrderAt < 15000) {
    res.status(429).json({
      ok: false,
      error: 'Анти-спам защита UsmonovTeam: подождите 15 секунд перед повторным заказом.',
    });
    return;
  }
  orderCooldownByPhone.set(phoneCheck.digits, now);

  const safeOrderId = String(orderId || `ord_${now}`);
  const safeSummary = String(itemsSummary || '').slice(0, 500);
  const safeTotal = Number(totalAmount) || 0;
  const safeAddress = String(shippingAddress || '').slice(0, 250);

  if (Array.isArray(items) && items.length > 0) {
    catalogStore.decrementStockForOrder(
      items.map((line: { productId?: unknown; quantity?: unknown }) => ({
        productId: String(line?.productId || ''),
        quantity: Number(line?.quantity || 0),
      }))
    );
  }

  const formatted = buildTelegramOrderMessage({
    orderId: safeOrderId,
    customerName: nameCheck.normalized,
    verifiedPhone: phoneCheck.formatted,
    shippingAddress: safeAddress,
    itemsSummary: safeSummary,
    totalAmount: safeTotal,
    promoCode: promoCode ? String(promoCode) : undefined,
  });

  const deliveredViaApi = await forwardToOwnerTelegram(formatted.botText);

  res.json({
    ok: true,
    orderId: safeOrderId,
    customerName: nameCheck.normalized,
    verifiedPhone: phoneCheck.formatted,
    deliveredToOwner: CLUB_CONTACT.ownerName,
    ownerChatId: getOwnerTelegramChatId(),
    ownerPhone: CLUB_CONTACT.phoneFormatted,
    botUsername: CLUB_CONTACT.botUsername,
    deliveredViaApi,
    products: catalogStore.listProducts(),
    ...formatted,
    createdAt: new Date(now).toISOString(),
  });
});

// ============================================================================
// TELEGRAM BOT LONG POLLING (@UsmonovTeamBot)
// ============================================================================

function startTelegramPollingLoop(botToken: string): () => void {
  let stopped = false;
  let offset = 0;
  let activeController: AbortController | null = null;

  const botEngine = new TelegramBotEngine({
    store: catalogStore,
    appUrl: process.env.APP_URL || '',
    transport: {
      sendMessage: async (
        chatId: number | string,
        text: string,
        replyMarkup?: TelegramReplyMarkup
      ) => {
        const body: Record<string, unknown> = { chat_id: chatId, text };
        if (replyMarkup) body.reply_markup = replyMarkup;
        await callTelegramApi(botToken, 'sendMessage', body);
      },
      editMessageText: async (
        chatId: number | string,
        messageId: number,
        text: string,
        replyMarkup?: TelegramReplyMarkup
      ) => {
        const body: Record<string, unknown> = {
          chat_id: chatId,
          message_id: messageId,
          text,
        };
        if (replyMarkup) body.reply_markup = replyMarkup;
        const res = await callTelegramApi(botToken, 'editMessageText', body);
        if (!res.ok && res.description && !res.description.includes('message is not modified')) {
          // Fallback to fresh message if original cannot be edited
          await callTelegramApi(botToken, 'sendMessage', {
            chat_id: chatId,
            text,
            ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
          });
        }
      },
      answerCallbackQuery: async (callbackQueryId: string, text?: string) => {
        await callTelegramApi(botToken, 'answerCallbackQuery', {
          callback_query_id: callbackQueryId,
          ...(text ? { text, show_alert: true } : {}),
        });
      },
      downloadPhoto: async (fileId: string) => {
        const fileMeta = await callTelegramApi<{ file_path?: string; file_size?: number }>(
          botToken,
          'getFile',
          { file_id: fileId }
        );
        const filePath = fileMeta.result?.file_path;
        if (!fileMeta.ok || !filePath) {
          throw new Error('Telegram не вернул путь к файлу.');
        }
        if (filePath.includes('..') || !/^[a-zA-Z0-9_\-\/.]+$/.test(filePath)) {
          throw new Error('Некорректный путь файла Telegram.');
        }
        const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
        const fileResp = await fetch(downloadUrl);
        if (!fileResp.ok) {
          throw new Error(`Ошибка загрузки фото (HTTP ${fileResp.status}).`);
        }
        const arrBuf = await fileResp.arrayBuffer();
        const buffer = Buffer.from(arrBuf);
        const extension = path.extname(filePath) || '.jpg';
        return { buffer, extension };
      },
    },
  });

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const run = async () => {
    try {
      // Ensure no webhook blocks getUpdates
      await callTelegramApi(botToken, 'deleteWebhook', { drop_pending_updates: false });
      await callTelegramApi(botToken, 'setMyCommands', {
        commands: [
          { command: 'start', description: 'Начать диалог / Меню' },
          { command: 'message', description: 'Написать владельцу зала' },
          { command: 'cancel', description: 'Отменить текущее действие' },
        ],
      });
    } catch {
      // Non-fatal startup prep
    }

    console.log('Telegram Bot long polling active for @UsmonovTeamBot');

    while (!stopped) {
      try {
        activeController = new AbortController();
        const updatesResp = await callTelegramApi<TelegramUpdate[]>(
          botToken,
          'getUpdates',
          {
            offset,
            timeout: 25,
            allowed_updates: ['message', 'callback_query'],
          },
          activeController.signal
        );

        if (!updatesResp.ok || !Array.isArray(updatesResp.result)) {
          await sleep(3000);
          continue;
        }

        for (const update of updatesResp.result) {
          offset = Math.max(offset, update.update_id + 1);
          try {
            await botEngine.handleUpdate(update);
          } catch (err) {
            console.error(
              'Telegram update handler error:',
              err instanceof Error ? err.message : 'unknown'
            );
          }
        }
      } catch (err) {
        if (stopped) break;
        const msg = err instanceof Error ? err.message : 'polling error';
        if (!msg.includes('abort')) {
          await sleep(3000);
        }
      }
    }
  };

  void run();

  return () => {
    stopped = true;
    activeController?.abort();
  };
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Serve a clean no-op Vite client module so disabled HMR never attempts failing WebSocket connections
    app.get('/@vite/client', (_req, res) => {
      res.type('application/javascript');
      res.send(`
        const sheetsMap = new Map();
        export function updateStyle(id, content) {
          let style = sheetsMap.get(id);
          if (!style) {
            style = document.createElement('style');
            style.setAttribute('type', 'text/css');
            style.setAttribute('data-vite-dev-id', id);
            style.textContent = content;
            document.head.appendChild(style);
          } else if (style.textContent !== content) {
            style.textContent = content;
          }
          sheetsMap.set(id, style);
        }
        export function removeStyle(id) {
          const style = sheetsMap.get(id);
          if (style && style.parentNode) {
            style.parentNode.removeChild(style);
            sheetsMap.delete(id);
          }
        }
        export function injectQuery(url) { return url; }
        export function createHotContext() {
          return {
            data: {},
            accept() {},
            acceptExports() {},
            dispose() {},
            prune() {},
            invalidate() {},
            on() {},
            off() {},
            send() {},
          };
        }
        export class ErrorOverlay extends HTMLElement {}
      `);
    });

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  let stopPolling: (() => void) | null = null;
  const botToken = getBotToken();
  if (botToken) {
    stopPolling = startTelegramPollingLoop(botToken);
  } else {
    console.log('TELEGRAM_BOT_TOKEN not configured; polling skipped until secret is provided.');
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`UsmonovTeam server listening on http://localhost:${PORT}`);
  });

  const shutdown = () => {
    stopPolling?.();
    server.close();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();

