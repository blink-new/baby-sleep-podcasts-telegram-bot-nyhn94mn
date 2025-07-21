// Simple in-memory database for demo purposes
// In production, you'd use a real database like PostgreSQL, MongoDB, etc.

export interface User {
  id: number
  username?: string
  first_name: string
  last_name?: string
  is_premium: boolean
  premium_purchased_at?: string
  joined_date: string
  last_active: string
}

export interface Podcast {
  id: string
  title: string
  description: string
  audio_url: string
  is_premium: boolean
  upload_date: string
  file_size?: number
  duration?: number
}

export interface Payment {
  id: string
  user_id: number
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed'
  created_at: string
  telegram_payment_charge_id?: string
}

class Database {
  private static instance: Database
  private users: Map<number, User> = new Map()
  private podcasts: Map<string, Podcast> = new Map()
  private payments: Map<string, Payment> = new Map()

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database()
      Database.instance.initializeData()
    }
    return Database.instance
  }

  private initializeData() {
    // Initialize with sample data
    this.podcasts.set('1', {
      id: '1',
      title: 'Колыбельные для новорожденных',
      description: 'Успокаивающие мелодии для крепкого сна малыша',
      audio_url: 'https://example.com/lullaby.mp3',
      is_premium: false,
      upload_date: '2024-01-15',
      duration: 1800 // 30 minutes
    })

    this.podcasts.set('2', {
      id: '2',
      title: 'Белый шум для глубокого сна',
      description: 'Специальные звуки для улучшения качества сна',
      audio_url: 'https://example.com/white-noise.mp3',
      is_premium: true,
      upload_date: '2024-01-16',
      duration: 3600 // 60 minutes
    })

    this.podcasts.set('3', {
      id: '3',
      title: 'Звуки природы для детей',
      description: 'Расслабляющие звуки леса и океана',
      audio_url: 'https://example.com/nature.mp3',
      is_premium: true,
      upload_date: '2024-01-17',
      duration: 2700 // 45 minutes
    })
  }

  // User methods
  async createUser(userData: Omit<User, 'is_premium' | 'joined_date' | 'last_active'>): Promise<User> {
    const user: User = {
      ...userData,
      is_premium: false,
      joined_date: new Date().toISOString(),
      last_active: new Date().toISOString()
    }
    this.users.set(user.id, user)
    return user
  }

  async getUser(userId: number): Promise<User | null> {
    return this.users.get(userId) || null
  }

  async updateUser(userId: number, updates: Partial<User>): Promise<User | null> {
    const user = this.users.get(userId)
    if (!user) return null
    
    const updatedUser = { ...user, ...updates, last_active: new Date().toISOString() }
    this.users.set(userId, updatedUser)
    return updatedUser
  }

  async grantPremiumAccess(userId: number): Promise<boolean> {
    const user = this.users.get(userId)
    if (!user) return false
    
    user.is_premium = true
    user.premium_purchased_at = new Date().toISOString()
    user.last_active = new Date().toISOString()
    this.users.set(userId, user)
    return true
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values())
  }

  async getPremiumUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.is_premium)
  }

  // Podcast methods
  async createPodcast(podcastData: Omit<Podcast, 'id' | 'upload_date'>): Promise<Podcast> {
    const id = Date.now().toString()
    const podcast: Podcast = {
      ...podcastData,
      id,
      upload_date: new Date().toISOString()
    }
    this.podcasts.set(id, podcast)
    return podcast
  }

  async getPodcast(podcastId: string): Promise<Podcast | null> {
    return this.podcasts.get(podcastId) || null
  }

  async getAllPodcasts(): Promise<Podcast[]> {
    return Array.from(this.podcasts.values())
  }

  async getFreePodcasts(): Promise<Podcast[]> {
    return Array.from(this.podcasts.values()).filter(p => !p.is_premium)
  }

  async getPremiumPodcasts(): Promise<Podcast[]> {
    return Array.from(this.podcasts.values()).filter(p => p.is_premium)
  }

  async updatePodcast(podcastId: string, updates: Partial<Podcast>): Promise<Podcast | null> {
    const podcast = this.podcasts.get(podcastId)
    if (!podcast) return null
    
    const updatedPodcast = { ...podcast, ...updates }
    this.podcasts.set(podcastId, updatedPodcast)
    return updatedPodcast
  }

  async deletePodcast(podcastId: string): Promise<boolean> {
    return this.podcasts.delete(podcastId)
  }

  // Payment methods
  async createPayment(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
    const id = Date.now().toString()
    const payment: Payment = {
      ...paymentData,
      id,
      created_at: new Date().toISOString()
    }
    this.payments.set(id, payment)
    return payment
  }

  async updatePayment(paymentId: string, updates: Partial<Payment>): Promise<Payment | null> {
    const payment = this.payments.get(paymentId)
    if (!payment) return null
    
    const updatedPayment = { ...payment, ...updates }
    this.payments.set(paymentId, updatedPayment)
    return updatedPayment
  }

  async getPayment(paymentId: string): Promise<Payment | null> {
    return this.payments.get(paymentId) || null
  }

  // Statistics
  async getStats() {
    const users = Array.from(this.users.values())
    const podcasts = Array.from(this.podcasts.values())
    const payments = Array.from(this.payments.values())
    
    return {
      total_users: users.length,
      premium_users: users.filter(u => u.is_premium).length,
      total_podcasts: podcasts.length,
      free_podcasts: podcasts.filter(p => !p.is_premium).length,
      premium_podcasts: podcasts.filter(p => p.is_premium).length,
      total_revenue: payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0),
      conversion_rate: users.length > 0 ? (users.filter(u => u.is_premium).length / users.length) * 100 : 0
    }
  }
}

export default Database