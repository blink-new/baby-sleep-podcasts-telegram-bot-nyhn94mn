// Telegram Bot Message Handler
import TelegramBot, { TelegramMessage, TelegramUser } from './telegram'
import Database from './database'

export class BotHandler {
  private bot: TelegramBot
  private db: Database

  constructor() {
    this.bot = TelegramBot.getInstance()
    this.db = Database.getInstance()
  }

  async handleMessage(message: TelegramMessage) {
    const user = message.from
    const chatId = message.chat.id
    const text = message.text || ''

    // Ensure user exists in database
    await this.ensureUser(user)

    if (text === '/start') {
      await this.handleStart(chatId, user)
    } else if (text === '/podcasts' || text === 'Подкасты') {
      await this.handlePodcastsList(chatId, user)
    } else if (text === '/help' || text === 'Помощь') {
      await this.handleHelp(chatId)
    } else {
      await this.handleUnknownCommand(chatId)
    }
  }

  async handleCallbackQuery(callbackQuery: any) {
    const chatId = callbackQuery.message.chat.id
    const userId = callbackQuery.from.id
    const data = callbackQuery.data

    if (data === 'buy_premium') {
      await this.handleBuyPremium(chatId, userId)
    } else if (data === 'gift_premium') {
      await this.handleGiftPremium(chatId, userId)
    } else if (data.startsWith('podcast_')) {
      const podcastId = data.replace('podcast_', '')
      await this.handlePodcastRequest(chatId, userId, podcastId)
    }
  }

  async handlePreCheckoutQuery(preCheckoutQuery: any) {
    // Always approve the payment for Telegram Stars
    const response = await fetch(`https://api.telegram.org/bot7632815832:AAE-1ZVONGw4lJ4HAfVOXKesR2q79YlSpIc/answerPreCheckoutQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pre_checkout_query_id: preCheckoutQuery.id,
        ok: true
      })
    })
    return response.json()
  }

  async handleSuccessfulPayment(message: any) {
    const userId = message.from.id
    const chatId = message.chat.id
    const payment = message.successful_payment

    // Grant premium access
    await this.db.grantPremiumAccess(userId)
    
    // Record payment
    await this.db.createPayment({
      user_id: userId,
      amount: payment.total_amount,
      currency: payment.currency,
      status: 'completed',
      telegram_payment_charge_id: payment.telegram_payment_charge_id
    })

    // Send success message
    await this.bot.sendMessage(chatId, TelegramBot.MESSAGES.PAYMENT_SUCCESS)
    
    // Send all premium podcasts
    await this.sendPremiumPodcasts(chatId, userId)
  }

  private async ensureUser(telegramUser: TelegramUser) {
    let user = await this.db.getUser(telegramUser.id)
    if (!user) {
      user = await this.db.createUser({
        id: telegramUser.id,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name
      })
    }
    return user
  }

  private async handleStart(chatId: number, user: TelegramUser) {
    await this.bot.sendMessage(chatId, TelegramBot.MESSAGES.WELCOME)
    
    // Send the free podcast immediately
    const freePodcasts = await this.db.getFreePodcasts()
    if (freePodcasts.length > 0) {
      const freePodcast = freePodcasts[0]
      await this.bot.sendAudio(
        chatId,
        freePodcast.audio_url,
        TelegramBot.MESSAGES.FREE_PODCAST_CAPTION,
        false // Not protected since it's free
      )
      
      // Show purchase options
      await this.bot.sendMessage(
        chatId,
        '💫 Хотите получить доступ ко всей коллекции?',
        { reply_markup: TelegramBot.createInlineKeyboard() }
      )
    }
  }

  private async handlePodcastsList(chatId: number, user: TelegramUser) {
    const dbUser = await this.db.getUser(user.id)
    const allPodcasts = await this.db.getAllPodcasts()
    
    let message = '🎵 Доступные подкасты:\n\n'
    
    for (const podcast of allPodcasts) {
      const icon = podcast.is_premium ? '🔒' : '🎁'
      const access = podcast.is_premium ? 
        (dbUser?.is_premium ? '✅ Доступен' : '❌ Требует премиум') : 
        '✅ Бесплатно'
      
      message += `${icon} ${podcast.title}\n${podcast.description}\n${access}\n\n`
    }

    if (!dbUser?.is_premium) {
      message += '✨ Заплатите один раз 599 ⭐ - получите доступ ко ВСЕМ подкастам навсегда!'
    }

    await this.bot.sendMessage(chatId, message, {
      reply_markup: dbUser?.is_premium ? undefined : TelegramBot.createInlineKeyboard()
    })
  }

  private async handleHelp(chatId: number) {
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
🎯 Один платеж = доступ навсегда!`

    await this.bot.sendMessage(chatId, helpMessage)
  }

  private async handleUnknownCommand(chatId: number) {
    await this.bot.sendMessage(
      chatId,
      'Извините, я не понимаю эту команду. Используйте /help для получения справки.'
    )
  }

  private async handleBuyPremium(chatId: number, userId: number) {
    await this.bot.sendInvoice(
      chatId,
      'Доступ ко ВСЕМ подкастам навсегда',
      'Заплатите один раз - получите доступ ко всей коллекции подкастов для сна навсегда! Новые подкасты также будут доступны автоматически.',
      `premium_access_${userId}_${Date.now()}`,
      [{ label: 'Доступ ко всем подкастам навсегда', amount: 599 }]
    )
  }

  private async handleGiftPremium(chatId: number, userId: number) {
    await this.bot.sendMessage(
      chatId,
      '🎁 Чтобы подарить премиум доступ:\n\n1. Купите доступ для себя\n2. Отправьте @potnin username получателя\n3. Мы переведем доступ на указанный аккаунт\n\nИли используйте кнопку ниже для покупки:',
      { reply_markup: TelegramBot.createInlineKeyboard() }
    )
  }

  private async handlePodcastRequest(chatId: number, userId: number, podcastId: string) {
    const user = await this.db.getUser(userId)
    const podcast = await this.db.getPodcast(podcastId)
    
    if (!podcast) {
      await this.bot.sendMessage(chatId, 'Подкаст не найден.')
      return
    }

    if (podcast.is_premium && !user?.is_premium) {
      await this.bot.sendMessage(
        chatId,
        TelegramBot.MESSAGES.PREMIUM_REQUIRED,
        { reply_markup: TelegramBot.createInlineKeyboard() }
      )
      return
    }

    // Send the podcast
    await this.bot.sendAudio(
      chatId,
      podcast.audio_url,
      `🎵 ${podcast.title}\n\n${podcast.description}`,
      podcast.is_premium // Protect premium content
    )
  }

  private async sendPremiumPodcasts(chatId: number, userId: number) {
    const premiumPodcasts = await this.db.getPremiumPodcasts()
    
    for (const podcast of premiumPodcasts) {
      await this.bot.sendAudio(
        chatId,
        podcast.audio_url,
        `🎵 ${podcast.title}\n\n${podcast.description}`,
        true // Protected content
      )
      
      // Small delay between sends
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  // Admin functions
  async broadcastToAllUsers(message: string): Promise<any[]> {
    const users = await this.db.getAllUsers()
    const userIds = users.map(u => u.id)
    return this.bot.broadcastMessage(userIds, message)
  }

  async grantPremiumToUser(userId: number): Promise<boolean> {
    const success = await this.db.grantPremiumAccess(userId)
    if (success) {
      await this.bot.sendMessage(userId, TelegramBot.MESSAGES.GIFT_RECEIVED)
    }
    return success
  }
}

export default BotHandler