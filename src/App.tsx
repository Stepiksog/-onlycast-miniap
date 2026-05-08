import { useEffect, useMemo, useState } from 'react'

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void
        expand: () => void
        close?: () => void
        sendData: (data: string) => void
        MainButton?: {
          setText: (text: string) => void
          show: () => void
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
  '/studio/photo1.jpg?v=11',
  '/studio/photo2.jpg?v=11',
  '/studio/photo3.jpg?v=11',
]

const SERVICE_META: Record<ServiceKey, { title: string; description: string; priceText: string }> = {
  studio: {
    title: '🎥 Съёмка в студии',
    description: 'Съёмка на 3 камеры Sony 4K.',
    priceText: 'от 6 000 ₽ / час',
  },
  shorts: {
    title: '📱 Пакет коротких видео',
    description: '20–25 коротких видео для Reels / TikTok.',
    priceText: 'от 25 000 ₽',
  },
  host: {
    title: '🎤 Ведущий / продюсер',
    description: 'Проведение интервью и раскрытие вашей экспертизы.',
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
  const [comment, setComment] = useState('')
  const [activeImage, setActiveImage] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    const app = window.Telegram?.WebApp
    if (!app) return

    app.ready()
    app.expand()
  }, [])

  useEffect(() => {
    setSelectedSlots([])
    setNeedEditing(false)
  }, [shootDate, service])

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
      return {
        base: 0,
        editing: 0,
        shorts: SHORTS_PACKAGE_PRICE,
        host: 0,
        total: SHORTS_PACKAGE_PRICE,
      }
    }

    if (service === 'host') {
      return {
        base: 0,
        editing: 0,
        shorts: 0,
        host: HOST_PACKAGE_PRICE,
        total: HOST_PACKAGE_PRICE,
      }
    }

    const base = STUDIO_PRICE_PER_HOUR * selectedHours
    const editing = needEditing ? EDITING_PRICE_PER_SOURCE_HOUR * selectedHours : 0

    return {
      base,
      editing,
      shorts: 0,
      host: 0,
      total: base + editing,
    }
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
      lead: {
        comment,
      },
      source: 'telegram_mini_app',
      createdAt: new Date().toISOString(),
    }),
    [service, selectedHours, needEditing, shootDate, selectedSlots, estimate, comment],
  )

  const canSubmit = Boolean(shootDate.trim() && selectedSlots.length > 0)

  const toggleSlot = (slot: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((item) => item !== slot) : [...prev, slot].sort(),
    )
  }

  const handleSubmit = () => {
    if (!canSubmit || isSubmitting || isSubmitted) return

    const app = window.Telegram?.WebApp
    if (!app) return

    setIsSubmitting(true)

    setTimeout(() => {
      app.sendData(JSON.stringify(payload))
      setIsSubmitting(false)
      setIsSubmitted(true)

      setTimeout(() => {
        app.close?.()
      }, 3000)
    }, 900)
  }

  useEffect(() => {
    const mainButton = window.Telegram?.WebApp?.MainButton
    if (!mainButton) return

    mainButton.setText('Забронировать время')
    mainButton.show()

    if (canSubmit && !isSubmitting && !isSubmitted) {
      mainButton.enable()
    } else {
      mainButton.disable()
    }

    mainButton.onClick(handleSubmit)

    return () => {
      mainButton.offClick(handleSubmit)
    }
  }, [canSubmit, payload, isSubmitting, isSubmitted])

  if (isSubmitting || isSubmitted) {
    return (
      <div className="app-shell animated-bg success-shell">
        <div className="success-card">
          {!isSubmitted ? (
            <>
              <div className="loader" />
              <h1 className="success-title">Отправляем заявку</h1>
              <p className="success-text">Передаём данные в студию OnlyCast.</p>
            </>
          ) : (
            <>
              <div className="success-icon">✅</div>
              <h1 className="success-title">Заявка отправлена</h1>
              <p className="success-text">Мы скоро свяжемся с вами в Telegram.</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell animated-bg">
      <div className="hero">
        <div className="hero-top">
          <div>
            <div className="eyebrow">Telegram Mini App</div>
            <h1 className="title">OnlyCast</h1>
          </div>

          <div className="badge">Запись за 1 минуту</div>
        </div>

        <p className="hero-text">Выберите формат съёмки и отправьте заявку в студию.</p>
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
          </div>

          <div className="gallery-info">
            <p className="gallery-info-title">Студия OnlyCast</p>
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
            <div className="help">Выберите дату съёмки</div>

            <input
              className="input"
              type="date"
              value={shootDate}
              onChange={(event) => setShootDate(event.target.value)}
            />
          </div>

          {shootDate && (
            <div style={{ marginTop: 16 }}>
              <div className="label">Выберите удобные часы записи</div>
              <div className="help" style={{ marginTop: 6 }}>
                Выберите время записи
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

          {service === 'studio' && selectedSlots.length > 0 && (
            <div
              className={`checkbox-box ${needEditing ? 'active' : ''}`}
              style={{ marginTop: 16 }}
              onClick={() => setNeedEditing((prev) => !prev)}
            >
              <div className="checkbox-row">
                <input
                  type="checkbox"
                  checked={needEditing}
                  onChange={(event) => setNeedEditing(event.target.checked)}
                  onClick={(event) => event.stopPropagation()}
                />

                <div>
                  <div className="label">Подготовка выпуска под публикацию</div>

                  <div className="help-list">
                    <div>• Обрезка выпуска</div>
                    <div>• Монтаж по таймкодам</div>
                    <div>• Переключение между 3 камерами</div>
                    <div>• Сведение аудио и видео</div>
                    <div>• Обложка выпуска</div>
                  </div>

                  <div className="appeal">+10 000 ₽ за 1 час готового видео</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">3. Предварительный расчёт стоимости</h2>

          <div className="estimate-list">
            <EstimateRow label="Съёмка в студии" value={estimate.base} />
            <EstimateRow label="Подготовка выпуска" value={estimate.editing} />
            <EstimateRow label="Пакет коротких видео" value={estimate.shorts} />
            <EstimateRow label="Ведущий / продюсер" value={estimate.host} />

            <div className="estimate-total">
              <span>Итого</span>
              <span>{estimate.total.toLocaleString('ru-RU')} ₽</span>
            </div>

            <div className="help">
              Расчёт предварительный. Итоговая стоимость зависит от задач.
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">4. Комментарий к заявке</h2>

          <div className="field">
            <label className="label">Комментарий</label>
            <textarea
              className="textarea"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Дополнительные пожелания"
            />
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
              <p className="address-title">Бесплатная парковка</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
