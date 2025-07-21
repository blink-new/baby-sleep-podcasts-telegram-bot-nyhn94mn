import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Textarea } from './components/ui/textarea'
import { Badge } from './components/ui/badge'
import { Switch } from './components/ui/switch'
import { Label } from './components/ui/label'
import { Separator } from './components/ui/separator'
import { Upload, Users, MessageSquare, Star, Bot, Play, Gift, CheckCircle, AlertCircle } from 'lucide-react'
import TelegramBot from './lib/telegram'
import Database from './lib/database'
import BotHandler from './lib/botHandler'
import './App.css'

interface Podcast {
  id: string
  title: string
  description: string
  audioUrl: string
  isPremium: boolean
  uploadDate: string
}

interface BotStats {
  totalUsers: number
  premiumUsers: number
  isOnline: boolean
}

function App() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([])
  const [botStats, setBotStats] = useState<BotStats>({
    totalUsers: 0,
    premiumUsers: 0,
    isOnline: false
  })
  const [loading, setLoading] = useState(true)
  const [botHandler] = useState(() => new BotHandler())
  const [database] = useState(() => Database.getInstance())
  const [telegramBot] = useState(() => TelegramBot.getInstance())

  const [newPodcast, setNewPodcast] = useState({
    title: '',
    description: '',
    audioFile: null as File | null,
    isPremium: true
  })

  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [premiumUserId, setPremiumUserId] = useState('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load podcasts from database
      const dbPodcasts = await database.getAllPodcasts()
      setPodcasts(dbPodcasts.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        audioUrl: p.audio_url,
        isPremium: p.is_premium,
        uploadDate: p.upload_date.split('T')[0]
      })))

      // Load stats
      const stats = await database.getStats()
      setBotStats({
        totalUsers: stats.total_users,
        premiumUsers: stats.premium_users,
        isOnline: true // Assume online for demo
      })

      // Check bot status
      try {
        const botInfo = await telegramBot.getMe()
        setBotStats(prev => ({ ...prev, isOnline: botInfo.ok }))
      } catch (error) {
        console.error('Bot status check failed:', error)
        setBotStats(prev => ({ ...prev, isOnline: false }))
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }, [database, telegramBot])

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [loadData])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setNewPodcast(prev => ({ ...prev, audioFile: file }))
    }
  }

  const handleAddPodcast = async () => {
    if (newPodcast.title && newPodcast.description && newPodcast.audioFile) {
      try {
        // In a real app, you'd upload the file to a storage service first
        const audioUrl = URL.createObjectURL(newPodcast.audioFile)
        
        const dbPodcast = await database.createPodcast({
          title: newPodcast.title,
          description: newPodcast.description,
          audio_url: audioUrl,
          is_premium: newPodcast.isPremium
        })

        const podcast: Podcast = {
          id: dbPodcast.id,
          title: dbPodcast.title,
          description: dbPodcast.description,
          audioUrl: dbPodcast.audio_url,
          isPremium: dbPodcast.is_premium,
          uploadDate: dbPodcast.upload_date.split('T')[0]
        }

        setPodcasts(prev => [podcast, ...prev])
        setNewPodcast({ title: '', description: '', audioFile: null, isPremium: true })
        
        alert('Подкаст успешно добавлен!')
      } catch (error) {
        console.error('Failed to add podcast:', error)
        alert('Ошибка при добавлении подкаста')
      }
    }
  }

  const togglePodcastPremium = async (id: string) => {
    try {
      const podcast = podcasts.find(p => p.id === id)
      if (podcast) {
        await database.updatePodcast(id, { is_premium: !podcast.isPremium })
        setPodcasts(prev => prev.map(p => 
          p.id === id ? { ...p, isPremium: !p.isPremium } : p
        ))
      }
    } catch (error) {
      console.error('Failed to update podcast:', error)
      alert('Ошибка при обновлении подкаста')
    }
  }

  const deletePodcast = async (id: string) => {
    try {
      await database.deletePodcast(id)
      setPodcasts(prev => prev.filter(p => p.id !== id))
      alert('Подкаст удален')
    } catch (error) {
      console.error('Failed to delete podcast:', error)
      alert('Ошибка при удалении подкаста')
    }
  }

  const handleBroadcast = async () => {
    if (broadcastMessage.trim()) {
      try {
        const results = await botHandler.broadcastToAllUsers(broadcastMessage)
        const successCount = results.filter(r => r.success).length
        setBroadcastMessage('')
        alert(`Сообщение отправлено ${successCount} пользователям!`)
      } catch (error) {
        console.error('Failed to broadcast:', error)
        alert('Ошибка при отправке сообщения')
      }
    }
  }

  const grantPremiumAccess = async () => {
    if (premiumUserId.trim()) {
      try {
        // Parse user ID (remove @ if present)
        const userId = parseInt(premiumUserId.replace('@', ''))
        if (isNaN(userId)) {
          alert('Неверный формат ID пользователя')
          return
        }

        const success = await botHandler.grantPremiumToUser(userId)
        if (success) {
          setPremiumUserId('')
          alert(`Премиум доступ предоставлен пользователю: ${premiumUserId}`)
          // Refresh stats
          loadData()
        } else {
          alert('Пользователь не найден')
        }
      } catch (error) {
        console.error('Failed to grant premium:', error)
        alert('Ошибка при предоставлении премиума')
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Bot className="h-12 w-12 text-blue-600 mx-auto animate-pulse" />
          <p className="text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Bot className="h-8 w-8 text-blue-600" />
            Управление Подкастами для Сна
          </h1>
          <p className="text-gray-600">CMS для Telegram бота с продажей контента. Модель: заплати один раз 599 ⭐ - получи доступ ко всем подкастам навсегда!</p>
          
          {/* Bot Status Alert */}
          <div className="max-w-2xl mx-auto p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">Бот запущен и работает!</span>
            </div>
            <div className="text-center space-y-1">
              <p className="text-green-700 text-sm">
                Протестируйте бота: <a href="https://t.me/BabySleepProBot" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-green-800">@BabySleepProBot</a>
              </p>
              <p className="text-green-600 text-xs">
                Webhook: https://nyhn94mn--telegram-bot.functions.blink.new
              </p>
            </div>
          </div>
        </div>

        {/* Bot Status & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Статус Бота</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${botStats.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-2xl font-bold">{botStats.isOnline ? 'Онлайн' : 'Офлайн'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего Пользователей</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{botStats.totalUsers.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Премиум Пользователи</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{botStats.premiumUsers}</div>
              <p className="text-xs text-muted-foreground">
                {((botStats.premiumUsers / botStats.totalUsers) * 100).toFixed(1)}% конверсия
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add New Podcast */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Добавить Подкаст
              </CardTitle>
              <CardDescription>
                Загрузите новый подкаст для продажи через бота
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Название</Label>
                <Input
                  id="title"
                  value={newPodcast.title}
                  onChange={(e) => setNewPodcast(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Название подкаста..."
                />
              </div>
              
              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={newPodcast.description}
                  onChange={(e) => setNewPodcast(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Описание подкаста..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="audio">Аудио файл</Label>
                <Input
                  id="audio"
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="premium"
                  checked={newPodcast.isPremium}
                  onCheckedChange={(checked) => setNewPodcast(prev => ({ ...prev, isPremium: checked }))}
                />
                <Label htmlFor="premium">Премиум контент (599 ⭐)</Label>
              </div>

              <Button onClick={handleAddPodcast} className="w-full">
                Добавить Подкаст
              </Button>
            </CardContent>
          </Card>

          {/* Admin Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Управление
              </CardTitle>
              <CardDescription>
                Рассылка и управление пользователями
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="broadcast">Сообщение для рассылки</Label>
                <Textarea
                  id="broadcast"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Введите сообщение для всех пользователей..."
                  rows={3}
                />
                <Button onClick={handleBroadcast} className="w-full mt-2">
                  Отправить Всем
                </Button>
              </div>

              <Separator />

              <div>
                <Label htmlFor="premium-user">ID пользователя для премиума</Label>
                <Input
                  id="premium-user"
                  value={premiumUserId}
                  onChange={(e) => setPremiumUserId(e.target.value)}
                  placeholder="@username или ID..."
                />
                <Button onClick={grantPremiumAccess} className="w-full mt-2" variant="outline">
                  <Gift className="h-4 w-4 mr-2" />
                  Предоставить Премиум
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Podcasts List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Список Подкастов ({podcasts.length})
            </CardTitle>
            <CardDescription>
              Управляйте контентом для продажи
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {podcasts.map((podcast) => (
                <div key={podcast.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{podcast.title}</h3>
                      {podcast.isPremium ? (
                        <Badge variant="default" className="bg-yellow-500">
                          <Star className="h-3 w-3 mr-1" />
                          599 ⭐
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Бесплатно</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{podcast.description}</p>
                    <p className="text-xs text-gray-400">Загружено: {podcast.uploadDate}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePodcastPremium(podcast.id)}
                    >
                      {podcast.isPremium ? 'Сделать бесплатным' : 'Сделать премиум'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deletePodcast(podcast.id)}
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App