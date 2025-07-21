// Telegram Bot API integration
const BOT_TOKEN = '7632815832:AAE-1ZVONGw4lJ4HAfVOXKesR2q79YlSpIc'
const ADMIN_ID = 3840708
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  is_premium?: boolean
}

export interface TelegramMessage {
  message_id: number
  from: TelegramUser
  chat: {
    id: number
    type: string
  }
  text?: string
  date: number
}

export class TelegramBot {
  private static instance: TelegramBot
  
  static getInstance(): TelegramBot {
    if (!TelegramBot.instance) {
      TelegramBot.instance = new TelegramBot()
    }
    return TelegramBot.instance
  }

  async sendMessage(chatId: number, text: string, options?: any) {
    const response = await fetch(`${BASE_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...options
      })
    })
    return response.json()
  }

  async sendAudio(chatId: number, audioUrl: string, caption?: string, isProtected = false) {
    const response = await fetch(`${BASE_URL}/sendAudio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        audio: audioUrl,
        caption,
        protect_content: isProtected, // Prevents forwarding/saving
        parse_mode: 'HTML'
      })
    })
    return response.json()
  }

  async sendInvoice(chatId: number, title: string, description: string, payload: string, prices: Array<{label: string, amount: number}>) {
    const response = await fetch(`${BASE_URL}/sendInvoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        title,
        description,
        payload,
        provider_token: '', // Empty for Telegram Stars
        currency: 'XTR', // Telegram Stars currency
        prices,
        protect_content: true
      })
    })
    return response.json()
  }

  async broadcastMessage(userIds: number[], message: string) {
    const results = []
    for (const userId of userIds) {
      try {
        const result = await this.sendMessage(userId, message)
        results.push({ userId, success: result.ok })
      } catch (error) {
        results.push({ userId, success: false, error })
      }
      // Rate limiting - wait 50ms between messages
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    return results
  }

  async setWebhook(url: string) {
    const response = await fetch(`${BASE_URL}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        allowed_updates: ['message', 'callback_query', 'pre_checkout_query']
      })
    })
    return response.json()
  }

  async getMe() {
    const response = await fetch(`${BASE_URL}/getMe`)
    return response.json()
  }

  // Russian messages for the bot
  static readonly MESSAGES = {
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

    GIFT_RECEIVED: `🎁 Вам подарили премиум доступ к подкастам для сна!

🎉 Теперь у вас есть доступ ко ВСЕЙ коллекции навсегда!
💫 Все новые подкасты также будут доступны автоматически!
🌙 Приятных снов!`
  }

  static createInlineKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '✨ Купить доступ ко ВСЕМ (599 ⭐)', callback_data: 'buy_premium' },
          { text: '🎁 Подарить другу', callback_data: 'gift_premium' }
        ]
      ]
    }
  }
}

export default TelegramBot