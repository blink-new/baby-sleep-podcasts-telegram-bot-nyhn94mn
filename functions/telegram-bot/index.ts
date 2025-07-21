import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Bot configuration
const BOT_TOKEN = '7632815832:AAE-1ZVONGw4lJ4HAfVOXKesR2q79YlSpIc';
const ADMIN_ID = 3840708;
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Simple in-memory storage (in production, use a real database)
const users = new Map();
const podcasts = new Map();
const payments = new Map();
const giftStates = new Map(); // Track gift flow states

// Initialize sample data
function initializeData() {
  podcasts.set('1', {
    id: '1',
    title: 'Колыбельные для новорожденных',
    description: 'Успокаивающие мелодии для крепкого сна малыша',
    audio_url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
    is_premium: false,
    upload_date: '2024-01-15',
    duration: 1800
  });

  podcasts.set('2', {
    id: '2',
    title: 'Белый шум для глубокого сна',
    description: 'Специальные звуки для улучшения качества сна',
    audio_url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
    is_premium: true,
    upload_date: '2024-01-16',
    duration: 3600
  });

  podcasts.set('3', {
    id: '3',
    title: 'Звуки природы для детей',
    description: 'Расслабляющие звуки леса и океана',
    audio_url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
    is_premium: true,
    upload_date: '2024-01-17',
    duration: 2700
  });
}

// Initialize data on startup
initializeData();

// Telegram API helpers
async function sendMessage(chatId: number, text: string, options: any = {}) {
  const response = await fetch(`${BASE_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...options
    })
  });
  return response.json();
}

async function sendAudio(chatId: number, audioUrl: string, caption?: string, isProtected = false) {
  const response = await fetch(`${BASE_URL}/sendAudio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      audio: audioUrl,
      caption,
      protect_content: isProtected,
      parse_mode: 'HTML'
    })
  });
  return response.json();
}

async function sendInvoice(chatId: number, title: string, description: string, payload: string, prices: Array<{label: string, amount: number}>) {
  const response = await fetch(`${BASE_URL}/sendInvoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      title,
      description,
      payload,
      provider_token: '',
      currency: 'XTR',
      prices,
      protect_content: true
    })
  });
  return response.json();
}

// Bot messages
const MESSAGES = {
  WELCOME: `🌙 Добро пожаловать в бота с подкастами для сна малышей!

Здесь вы найдете успокаивающие подкасты, которые помогут вашему ребенку крепко спать.

🎁 У вас есть доступ к одному бесплатному подкасту!
✨ Заплатите один раз 599 ⭐ - получите доступ ко ВСЕМ подкастам навсегда!`,

  FREE_PODCAST_CAPTION: `🎁 Бесплатный подкаст для вас!

Вы можете приобрести полный набор подкастов для сна малышей или подарить их своему другу по цене чашки кофе ☕

✨ Заплатите один раз - получите доступ ко ВСЕМ подкастам навсегда!
💫 Полная коллекция: 599 ⭐`,

  PREMIUM_REQUIRED: `🔒 Этот подкаст доступен только с премиум доступом

✨ Заплатите один раз 599 ⭐ - получите доступ ко ВСЕМ подкастам навсегда!
💫 Новые подкасты также будут доступны автоматически!`,

  PAYMENT_SUCCESS: `✅ Спасибо за покупку! 

🎉 Теперь у вас есть доступ ко ВСЕЙ коллекции подкастов навсегда!
💫 Все новые подкасты также будут доступны автоматически!
🌙 Наслаждайтесь!`,

  GIFT_RECEIVED: `🎁 Поздравляем с рождением ребенка! Вам подарили доступ к подкастам на тему детского сна!

🎉 Теперь у вас есть доступ ко ВСЕЙ коллекции навсегда!
💫 Все новые подкасты также будут доступны автоматически!
🌙 Приятных снов!`,

  ASK_GIFT_USERNAME: `🎁 Подарить премиум доступ

Введите username получателя (например: @username или username):

💡 После ввода username мы отправим вам счет на 599 ⭐
✅ После оплаты получатель автоматически получит доступ`,

  GIFT_INVOICE_SENT: `🎁 Подарок для @{username}

💰 Оплатите счет ниже, чтобы подарить премиум доступ
✨ После оплаты @{username} автоматически получит доступ ко всем подкастам`,

  GIFT_SUCCESS_SENDER: `✅ Подарок успешно отправлен!

🎁 Пользователь @{username} получил премиум доступ
💌 Мы отправили ему поздравительное сообщение
🌙 Спасибо за ваш подарок!`,

  GIFT_USERNAME_NOT_FOUND: `❌ Пользователь не найден

Пожалуйста, убедитесь что:
• Username введен правильно
• Пользователь хотя бы раз запускал бота (/start)

Попробуйте еще раз или попросите получателя сначала запустить бота.`

};

function createInlineKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '✨ Полный доступ (599 ⭐)', callback_data: 'buy_premium' }
      ],
      [
        { text: '🎁 Подарить доступ', callback_data: 'gift_premium' }
      ],
      [
        { text: '🆓 Попробовать бесплатно', callback_data: 'try_free' }
      ]
    ]
  };
}

// User management
function ensureUser(telegramUser: any) {
  if (!users.has(telegramUser.id)) {
    users.set(telegramUser.id, {
      id: telegramUser.id,
      username: telegramUser.username,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      is_premium: false,
      joined_date: new Date().toISOString(),
      last_active: new Date().toISOString()
    });
  }
  return users.get(telegramUser.id);
}

function grantPremiumAccess(userId: number) {
  const user = users.get(userId);
  if (user) {
    user.is_premium = true;
    user.premium_purchased_at = new Date().toISOString();
    user.last_active = new Date().toISOString();
    users.set(userId, user);
    return true;
  }
  return false;
}

// Gift processing helpers
function findUserByUsername(username: string) {
  const cleanUsername = username.replace('@', '').toLowerCase();
  for (const [userId, user] of users.entries()) {
    if (user.username && user.username.toLowerCase() === cleanUsername) {
      return user;
    }
  }
  return null;
}

function createGiftState(senderId: number, recipientUsername: string, recipientUserId: number) {
  const giftId = `gift_${senderId}_${Date.now()}`;
  const giftState = {
    id: giftId,
    sender_id: senderId,
    recipient_username: recipientUsername,
    recipient_user_id: recipientUserId,
    status: 'pending_payment',
    created_at: new Date().toISOString()
  };
  giftStates.set(giftId, giftState);
  return giftState;
}

async function processGiftPayment(giftId: string) {
  const giftState = giftStates.get(giftId);
  if (!giftState) return false;

  // Grant premium access to recipient
  const success = grantPremiumAccess(giftState.recipient_user_id);
  if (success) {
    giftState.status = 'completed';
    giftState.completed_at = new Date().toISOString();
    giftStates.set(giftId, giftState);

    // Send congratulations message to recipient
    await sendMessage(
      giftState.recipient_user_id,
      MESSAGES.GIFT_RECEIVED
    );

    // Send all premium podcasts to recipient
    const premiumPodcasts = Array.from(podcasts.values()).filter(p => p.is_premium);
    for (const podcast of premiumPodcasts) {
      await sendAudio(
        giftState.recipient_user_id,
        podcast.audio_url,
        `🎵 ${podcast.title}\n\n${podcast.description}`,
        true
      );
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Send success message to sender
    await sendMessage(
      giftState.sender_id,
      MESSAGES.GIFT_SUCCESS_SENDER.replace('{username}', giftState.recipient_username)
    );

    return true;
  }
  return false;
}

// Message handlers
async function handleStart(chatId: number, user: any) {
  await sendMessage(chatId, MESSAGES.WELCOME);
  
  // Send the free podcast immediately
  const freePodcasts = Array.from(podcasts.values()).filter(p => !p.is_premium);
  if (freePodcasts.length > 0) {
    const freePodcast = freePodcasts[0];
    await sendAudio(
      chatId,
      freePodcast.audio_url,
      MESSAGES.FREE_PODCAST_CAPTION,
      false
    );
    
    // Show purchase options
    await sendMessage(
      chatId,
      '💫 Хотите получить доступ ко всей коллекции?',
      { reply_markup: createInlineKeyboard() }
    );
  }
}

async function handlePodcastsList(chatId: number, user: any) {
  const allPodcasts = Array.from(podcasts.values());
  
  let message = '🎵 Доступные подкасты:\n\n';
  
  for (const podcast of allPodcasts) {
    const icon = podcast.is_premium ? '🔒' : '🎁';
    const access = podcast.is_premium ? 
      (user?.is_premium ? '✅ Доступен' : '❌ Требует премиум') : 
      '✅ Бесплатно';
    
    message += `${icon} ${podcast.title}\n${podcast.description}\n${access}\n\n`;
  }

  if (!user?.is_premium) {
    message += '✨ Заплатите один раз 599 ⭐ - получите доступ ко ВСЕМ подкастам навсегда!';
  }

  await sendMessage(chatId, message, {
    reply_markup: user?.is_premium ? undefined : createInlineKeyboard()
  });
}

async function handleHelp(chatId: number) {
  const helpMessage = `🌙 Помощь по боту

Команды:
/start - Начать работу с ботом
/podcasts - Показать все подкасты
/help - Эта справка

✨ Премиум доступ - заплатите один раз, получите навсегда:
• Доступ ко ВСЕМ подкастам без ограничений
• Все новые подкасты автоматически
• Защищенный контент от копирования
• Пожизненный доступ

💰 Стоимость: 599 Telegram Stars (≈ цена чашки кофе)
🎯 Один платеж = доступ навсегда!`;

  await sendMessage(chatId, helpMessage);
}

async function handleBuyPremium(chatId: number, userId: number) {
  await sendInvoice(
    chatId,
    'Доступ ко ВСЕМ подкастам навсегда',
    'Заплатите один раз - получите доступ ко всей коллекции подкастов для сна навсегда! Новые подкасты также будут доступны автоматически.',
    `premium_access_${userId}_${Date.now()}`,
    [{ label: 'Доступ ко всем подкастам навсегда', amount: 599 }]
  );
}

async function handleGiftPremium(chatId: number, userId: number) {
  // Set user state to waiting for username input
  giftStates.set(`waiting_username_${userId}`, {
    status: 'waiting_username',
    sender_id: userId,
    created_at: new Date().toISOString()
  });

  await sendMessage(chatId, MESSAGES.ASK_GIFT_USERNAME);
}

async function handleUsernameInput(chatId: number, userId: number, username: string) {
  // Clean the username
  const cleanUsername = username.replace('@', '').trim();
  
  if (!cleanUsername) {
    await sendMessage(chatId, 'Пожалуйста, введите корректный username.');
    return;
  }

  // Find recipient user
  const recipient = findUserByUsername(cleanUsername);
  
  if (!recipient) {
    await sendMessage(chatId, MESSAGES.GIFT_USERNAME_NOT_FOUND);
    return;
  }

  // Create gift state
  const giftState = createGiftState(userId, cleanUsername, recipient.id);
  
  // Clear waiting state
  giftStates.delete(`waiting_username_${userId}`);
  
  // Send gift invoice
  await sendMessage(
    chatId,
    MESSAGES.GIFT_INVOICE_SENT.replace('{username}', cleanUsername)
  );
  
  await sendInvoice(
    chatId,
    `Подарок для @${cleanUsername}`,
    `Подарить премиум доступ ко всем подкастам для @${cleanUsername}. После оплаты получатель автоматически получит доступ.`,
    giftState.id,
    [{ label: `Подарок для @${cleanUsername}`, amount: 599 }]
  );
}

async function handleTryFree(chatId: number, user: any) {
  // Send the free podcast
  const freePodcasts = Array.from(podcasts.values()).filter(p => !p.is_premium);
  if (freePodcasts.length > 0) {
    const freePodcast = freePodcasts[0];
    await sendAudio(
      chatId,
      freePodcast.audio_url,
      `🎁 Бесплатный подкаст: ${freePodcast.title}\n\n${freePodcast.description}\n\n${MESSAGES.FREE_PODCAST_CAPTION}`,
      false
    );
  } else {
    await sendMessage(
      chatId,
      '😔 К сожалению, бесплатные подкасты временно недоступны.\n\nНо вы можете получить полный доступ ко всей коллекции!',
      { reply_markup: createInlineKeyboard() }
    );
  }
}

async function handleSuccessfulPayment(message: any) {
  const userId = message.from.id;
  const chatId = message.chat.id;
  const payment = message.successful_payment;
  const payload = payment.invoice_payload;

  // Record payment
  const paymentRecord = {
    id: Date.now().toString(),
    user_id: userId,
    amount: payment.total_amount,
    currency: payment.currency,
    status: 'completed',
    telegram_payment_charge_id: payment.telegram_payment_charge_id,
    payload: payload,
    created_at: new Date().toISOString()
  };
  payments.set(paymentRecord.id, paymentRecord);

  // Check if this is a gift payment
  if (payload.startsWith('gift_')) {
    await processGiftPayment(payload);
    return;
  }

  // Regular premium purchase
  grantPremiumAccess(userId);
  
  // Send success message
  await sendMessage(chatId, MESSAGES.PAYMENT_SUCCESS);
  
  // Send all premium podcasts
  const premiumPodcasts = Array.from(podcasts.values()).filter(p => p.is_premium);
  
  for (const podcast of premiumPodcasts) {
    await sendAudio(
      chatId,
      podcast.audio_url,
      `🎵 ${podcast.title}\n\n${podcast.description}`,
      true
    );
    
    // Small delay between sends
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Main webhook handler
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method === 'GET') {
    return new Response(JSON.stringify({ 
      status: 'Bot is running!',
      users: users.size,
      podcasts: podcasts.size,
      payments: payments.size
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  if (req.method === 'POST') {
    try {
      const update = await req.json();
      console.log('Received update:', JSON.stringify(update, null, 2));

      // Handle regular messages
      if (update.message) {
        const message = update.message;
        const user = message.from;
        const chatId = message.chat.id;
        const text = message.text || '';

        // Ensure user exists
        ensureUser(user);
        const dbUser = users.get(user.id);

        if (text === '/start') {
          await handleStart(chatId, dbUser);
        } else if (text === '/podcasts' || text === 'Подкасты') {
          await handlePodcastsList(chatId, dbUser);
        } else if (text === '/help' || text === 'Помощь') {
          await handleHelp(chatId);
        } else if (message.successful_payment) {
          await handleSuccessfulPayment(message);
        } else {
          // Check if user is waiting for username input
          const waitingState = giftStates.get(`waiting_username_${user.id}`);
          if (waitingState && waitingState.status === 'waiting_username') {
            await handleUsernameInput(chatId, user.id, text);
          } else {
            await sendMessage(chatId, 'Извините, я не понимаю эту команду. Используйте /help для получения справки.');
          }
        }
      }

      // Handle callback queries (button presses)
      if (update.callback_query) {
        const callbackQuery = update.callback_query;
        const chatId = callbackQuery.message.chat.id;
        const userId = callbackQuery.from.id;
        const data = callbackQuery.data;

        if (data === 'buy_premium') {
          await handleBuyPremium(chatId, userId);
        } else if (data === 'gift_premium') {
          await handleGiftPremium(chatId, userId);
        } else if (data === 'try_free') {
          const dbUser = users.get(userId);
          await handleTryFree(chatId, dbUser);
        }

        // Answer callback query
        await fetch(`${BASE_URL}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id
          })
        });
      }

      // Handle pre-checkout queries
      if (update.pre_checkout_query) {
        await fetch(`${BASE_URL}/answerPreCheckoutQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pre_checkout_query_id: update.pre_checkout_query.id,
            ok: true
          })
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (error) {
      console.error('Error processing update:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});