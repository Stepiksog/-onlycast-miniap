import { useEffect, useMemo, useState } from 'react'

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void
        expand: () => void
        close?: () => void
        sendData: (data: string) => void
        initData?: string
        initDataUnsafe?: {
          user?: {
            id?: number
            first_name?: string
            last_name?: string
            username?: string
          }
        }
        MainButton?: {
          setText: (text: string) => void
          show: () => void
          hide: () => void
          enable: () => void
          disable: () => void
          onClick: (cb: () => void) => void
          offClick: (cb: () => void) => void
        }
      }
    }
  }
}

type ServiceKey = 'studio' | 'shorts' | 'host'

type Estimate = {
  base: number
  editing: number
  shorts: number
  host: number
  total: number
}

const STUDIO_PRICE_PER_HOUR = 6000
const EDITING_PRICE_PER_SOURCE_HOUR = 10000
const SHORTS_PACKAGE_PRICE = 25000
const HOST_PACKAGE_PRICE = 30000
const STUDIO_ADDRESS = 'Москва, улица Правды, 8к13'

const STUDIO_IMAGES = [
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1497366412874-3415097a27e7?q=80&w=1400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1400&auto=format&fit=crop',
]

const SERVICE_META: Record<ServiceKey, { title: string; description: string; priceText: string }> = {
  studio: {
    title: '🎥 Съёмка в студии',
    description: 'Съёмка ведётся на 3 камеры Sony 4K, используется студийный свет и микрофоны Shure.',
    priceText: 'от 6 000 ₽ / час',
  },
  shorts: {
    title: '📱 Пакет коротких видео',
    description: 'Подготовка 20–25 вертикальных видео для Reels / TikTok из вашего подкаста или интервью.',
    priceText: 'от 25 000 ₽',
  },
  host: {
    title: '🎤 Ведущий / продюсер',
    description: 'Подготовка, проведение интервью и раскрытие вашей экспертизы под контент-задачу.',
    priceText: 'от 30 000 ₽',
  },
}

function EstimateRow({ label, value }: { label: string; value: number }) {
  if (value <= 0) return null

  return (
    <div className="estimate-row">
      <span className="muted">{label}</span>
      <span>{value.toLocaleString('ru-RU')} ₽</span>
    </div>
  )
}

export default function App() {
  const [service, setService] = useState<ServiceKey>('studio')
  const [needEditing, setNeedEditing] = useState(false)
  const [shootDate, setShootDate] = useState('')
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [name, setName] = useState('')
  const [telegramContact, setTelegramContact] = useState('')
  const [comment, setComment] = useState('')
  const [activeImage, setActiveImage] = useState(0)
  const [debugTelegram, setDebugTelegram] = useState('DEBUG: пока нет данных')
useEffect(() => {
  const app = window.Telegram?.WebApp

  if (!app) {
    setDebugTelegram('window.Telegram.WebApp НЕ найден')
    return
  }

  app.ready()
  app.expand()

  let tgUser = app.initDataUnsafe?.user

  if (!tgUser && app.initData) {
    const params = new URLSearchParams(app.initData)
    const userRaw = params.get('user')

    if (userRaw) {
      try {
        tgUser = JSON.parse(decodeURIComponent(userRaw))
      } catch (error) {
        console.log('Failed to parse Telegram user:', error)
      }
    }
  }

  console.log('Telegram user:', tgUser)

  setDebugTelegram(
    JSON.stringify(
      {
        hasTelegram: Boolean(window.Telegram),
        hasWebApp: Boolean(app),
        initDataLength: app.initData?.length || 0,
        initDataUnsafe: app.initDataUnsafe,
        user: tgUser,
      },
      null,
      2,
    ),
  )

  if (tgUser?.first_name) {
    const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ')
    setName(fullName)
  }

  if (tgUser?.username) {
    setTelegramContact(`@${tgUser.username}`)
  }
}, [])

  useEffect(() => {
    setSelectedSlots([])
  }, [shootDate])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveImage((prev) => (prev + 1) % STUDIO_IMAGES.length)
    }, 2800)

    return () => window.clearInterval(timer)
  }, [])

  const selectedHours = useMemo(() => selectedSlots.length, [selectedSlots])

  const availableSlots = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const startHour = 10 + index
        const endHour = startHour + 1
        return `${String(startHour).padStart(2, '0')}:00–${String(endHour).padStart(2, '0')}:00`
      }),
    [],
  )

  const estimate = useMemo<Estimate>(() => {
    if (service === 'shorts') {
      return { base: 0, editing: 0, shorts: SHORTS_PACKAGE_PRICE, host: 0, total: SHORTS_PACKAGE_PRICE }
    }

    if (service === 'host') {
      return { base: 0, editing: 0, shorts: 0, host: HOST_PACKAGE_PRICE, total: HOST_PACKAGE_PRICE }
    }

    const base = STUDIO_PRICE_PER_HOUR * selectedHours
    const editing = needEditing ? EDITING_PRICE_PER_SOURCE_HOUR * selectedHours : 0

    return { base, editing, shorts: 0, host: 0, total: base + editing }
  }, [service, needEditing, selectedHours])

  const payload = useMemo(
    () => ({
      studio: 'OnlyCast',
      service,
      serviceTitle: SERVICE_META[service].title,
      hours: selectedHours,
      needEditing,
      shootDate,
      selectedSlots,
      estimate,
      lead: { name, telegramContact, comment },
      source: 'telegram_mini_app',
      createdAt: new Date().toISOString(),
    }),
    [service, selectedHours, needEditing, shootDate, selectedSlots, estimate, name, telegramContact, comment],
  )

  const canSubmit = Boolean(name.trim() && telegramContact.trim() && shootDate.trim() && selectedSlots.length > 0)

  const toggleSlot = (slot: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((item) => item !== slot) : [...prev, slot].sort(),
    )
  }

  const handleSubmit = () => {
    if (!canSubmit) return

    const app = window.Telegram?.WebApp
    if (!app) return

    app.sendData(JSON.stringify(payload))
    app.close?.()
  }

  useEffect(() => {
    const app = window.Telegram?.WebApp
    const mainButton = app?.MainButton

    if (!mainButton) return

    mainButton.setText('Забронировать время')
    mainButton.show()

    if (canSubmit) {
      mainButton.enable()
    } else {
      mainButton.disable()
    }

    mainButton.onClick(handleSubmit)

    return () => {
      mainButton.offClick(handleSubmit)
    }
  }, [canSubmit, payload])

  return (
    <div className="app-shell">
      <div className="hero">
        <div className="hero-top">
          <div>
            <div className="eyebrow">Telegram Mini App</div>
            <h1 className="title">OnlyCast TEST 999</h1>
          </div>
          <div className="badge">Запись за 1 минуту</div>
        </div>
        <p className="hero-text">
          Выберите услугу, получите предварительную стоимость, выберите удобное время и
          забронируйте запись в студии.
        </p>
      </div>

      <div className="stack">
        <div className="card">
          <div className="gallery">
            {STUDIO_IMAGES.map((image, index) => (
              <img
                key={image}
                src={image}
                alt={`Студия OnlyCast ${index + 1}`}
                className={`gallery-slide ${index === activeImage ? 'active' : ''}`}
              />
            ))}
            <div className="gallery-overlay">
              <p className="gallery-overlay-title">Пространство студии</p>
              <p className="gallery-overlay-text">Несколько ракурсов студии до бронирования.</p>
            </div>
          </div>

          <div className="dots">
            {STUDIO_IMAGES.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`dot ${index === activeImage ? 'active' : ''}`}
                onClick={() => setActiveImage(index)}
                aria-label={`Показать фото ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Что входит в съёмку</h2>
          <div className="features">
            <div className="feature">
              <div className="feature-icon">📷</div>
              <div className="feature-label">3 камеры Sony 4K</div>
            </div>
            <div className="feature">
              <div className="feature-icon">🎙️</div>
              <div className="feature-label">Микрофоны Shure</div>
            </div>
            <div className="feature">
              <div className="feature-icon">💡</div>
              <div className="feature-label">Студийный свет</div>
            </div>
            <div className="feature">
              <div className="feature-icon">🛠️</div>
              <div className="feature-label">Помощь на площадке</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">1. Выберите услугу</h2>
          <div className="service-list">
            {(Object.keys(SERVICE_META) as ServiceKey[]).map((key) => {
              const item = SERVICE_META[key]
              const isActive = service === key

              return (
                <button
                  key={key}
                  type="button"
                  className={`service-button ${isActive ? 'active' : ''}`}
                  onClick={() => setService(key)}
                >
                  <div className="service-row">
                    <p className="service-title">{item.title}</p>
                    {isActive && <span className="chosen-pill">Выбрано</span>}
                  </div>
                  <p className="service-desc">{item.description}</p>
                  <p className="service-price">{item.priceText}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">2. Параметры заявки</h2>

          <div className="field">
            <label className="label">Укажите желаемую дату</label>
            <div className="help">После выбора даты Вы сможете выбрать удобное время записи.</div>
            <input className="input" type="date" value={shootDate} onChange={(e) => setShootDate(e.target.value)} />
          </div>

          {service === 'studio' && (
            <div className="checkbox-box" style={{ marginTop: 16 }}>
              <div className="checkbox-row">
                <input type="checkbox" checked={needEditing} onChange={(e) => setNeedEditing(e.target.checked)} />
                <div>
                  <div className="label">Добавить монтаж</div>
                  <div className="help">Чистка звука, цветокоррекция, монтаж и подготовка файла для публикации.</div>
                  <div className="appeal">+10 000 ₽ за каждый выбранный час исходного материала</div>
                </div>
              </div>
            </div>
          )}

          {shootDate && (
            <div style={{ marginTop: 16 }}>
              <div className="label">Выберите удобные часы записи</div>
              <div className="help" style={{ marginTop: 6 }}>
                График работы студии: с 10:00 до 22:00. Можно выбрать один или несколько часов.
              </div>

              <div className="slot-grid" style={{ marginTop: 12 }}>
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={`slot-button ${selectedSlots.includes(slot) ? 'active' : ''}`}
                    onClick={() => toggleSlot(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>

              {selectedSlots.length > 0 && (
                <div className="slot-summary" style={{ marginTop: 12 }}>
                  <div className="slot-summary-top">
                    <span className="muted">Вы выбрали</span>
                    <span>{selectedSlots.length} ч.</span>
                  </div>
                  <div>{selectedSlots.join(', ')}</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">3. Предварительный расчёт стоимости</h2>
          <div className="estimate-list">
            <EstimateRow label="Съёмка в студии" value={estimate.base} />
            <EstimateRow label="Монтаж" value={estimate.editing} />
            <EstimateRow label="Пакет коротких видео" value={estimate.shorts} />
            <EstimateRow label="Ведущий / продюсер" value={estimate.host} />
            <div className="estimate-total">
              <span>Итого</span>
              <span>{estimate.total.toLocaleString('ru-RU')} ₽</span>
            </div>
            <div className="help">
              Расчёт является предварительным. Итоговая стоимость может изменяться в зависимости от задач и дополнительных опций.
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">4. Отправить заявку в студию</h2>

          <div className="field">
            <label className="label">Ваше имя</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Как к Вам обращаться" />
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label className="label">Ваш Telegram для связи</label>
            <input
              className="input"
              value={telegramContact}
              onChange={(e) => setTelegramContact(e.target.value)}
              placeholder="@username или номер"
            />
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label className="label">Комментарий к заявке</label>
            <textarea
              className="textarea"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Например: требуется запись интервью, важен монтаж"
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="center-note">Имя и Telegram подтягиваются автоматически, если они доступны в профиле.</div>
            <div className="center-note">Кнопка отправки доступна внизу интерфейса Telegram.</div>
          </div>

          <div style={{ marginTop: 16, padding: 12, border: '1px solid #444', borderRadius: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>DEBUG TELEGRAM</div>
            <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', margin: 0 }}>{debugTelegram}</pre>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">5. Адрес студии</h2>
          <div className="address-box">
            <div>📍</div>
            <div>
              <p className="address-title">{STUDIO_ADDRESS}</p>
            </div>
          </div>

          <div className="address-box" style={{ marginTop: 12 }}>
            <div>🚗</div>
            <div>
              <p className="address-title">Бесплатная парковка у студии</p>
              <p className="address-text">Собственное парковочное место для гостей.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
