import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

/* ═══════════════════════════════════════════════════════════
   Constants & Helpers
   ═══════════════════════════════════════════════════════════ */

const LS_DOB = 'timebank_dob'
const LS_NAME = 'timebank_name'

const QUOTES = [
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius", source: "Meditations" },
  { text: "It is not that we have a short time to live, but that we waste a great deal of it.", author: "Seneca", source: "On the Shortness of Life" },
  { text: "The cost of a thing is the amount of what I will call life which is required to be exchanged for it.", author: "Henry David Thoreau", source: "Walden" },
  { text: "Lost time is never found again.", author: "Benjamin Franklin", source: "Poor Richard's Almanack" },
  { text: "Time is the most valuable thing a man can spend.", author: "Theophrastus", source: "" },
]

function loadData() {
  try {
    const rawDob = localStorage.getItem(LS_DOB)
    const name = localStorage.getItem(LS_NAME) || ''
    if (!rawDob) return { dob: null, name: '' }
    const d = new Date(rawDob)
    return isNaN(d.getTime()) ? { dob: null, name: '' } : { dob: d, name }
  } catch { return { dob: null, name: '' } }
}

function saveData(dob, name) {
  localStorage.setItem(LS_DOB, dob.toISOString())
  localStorage.setItem(LS_NAME, name)
}

function clearData() {
  localStorage.removeItem(LS_DOB)
  localStorage.removeItem(LS_NAME)
}

function calcAge(dob) {
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--
  return age
}

function getRemaining(dob) {
  const now = new Date()
  const deadline = new Date(dob)
  deadline.setFullYear(deadline.getFullYear() + 40)
  const diffMs = deadline.getTime() - now.getTime()
  if (diffMs <= 0) return null

  const totalHours = diffMs / 3_600_000

  // Calendar-based breakdown (borrow method — accurate to the day)
  let years = deadline.getFullYear() - now.getFullYear()
  let months = deadline.getMonth() - now.getMonth()
  let days = deadline.getDate() - now.getDate()
  let hours = deadline.getHours() - now.getHours()
  let minutes = deadline.getMinutes() - now.getMinutes()
  let seconds = deadline.getSeconds() - now.getSeconds()

  if (seconds < 0) { seconds += 60; minutes-- }
  if (minutes < 0) { minutes += 60; hours-- }
  if (hours < 0) { hours += 24; days-- }
  if (days < 0) {
    // Days in the month before the deadline month
    const prevMonth = new Date(deadline.getFullYear(), deadline.getMonth(), 0)
    days += prevMonth.getDate()
    months--
  }
  if (months < 0) { months += 12; years-- }

  return { totalHours, years, months, days, hours, minutes, seconds }
}

function getOpeningBalance() { return Math.floor(40 * 365.25 * 24) }

function getHoursSpent(dob) {
  return Math.floor((new Date().getTime() - dob.getTime()) / 3_600_000)
}

function getLifePercent(dob) {
  const now = new Date()
  const deadline = new Date(dob)
  deadline.setFullYear(deadline.getFullYear() + 40)
  const total = deadline.getTime() - dob.getTime()
  const elapsed = now.getTime() - dob.getTime()
  return Math.min(100, Math.max(0, (elapsed / total) * 100))
}

function getDeadlineDate(dob) {
  const d = new Date(dob)
  d.setFullYear(d.getFullYear() + 40)
  return d
}

function getSecondsConsumedToday() {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(0, 0, 0, 0)
  return Math.floor((now.getTime() - midnight.getTime()) / 1000)
}

function formatIndian(n) {
  const s = Math.floor(n).toString()
  if (s.length <= 3) return s
  let result = s.slice(-3)
  let rest = s.slice(0, -3)
  while (rest.length > 2) {
    result = rest.slice(-2) + ',' + result
    rest = rest.slice(0, -2)
  }
  if (rest.length > 0) result = rest + ',' + result
  return result
}

function formatDate(d) {
  return d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).toUpperCase()
}

function formatDeadline(d) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}


/* ═══════════════════════════════════════════════════════════
   Analog Clock (SVG)
   ═══════════════════════════════════════════════════════════ */

function AnalogClock({ size = 130 }) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const cx = 60, cy = 60, r = 52
  const h = time.getHours() % 12, m = time.getMinutes(), s = time.getSeconds()
  const hA = (h + m / 60) * 30 - 90
  const mA = (m + s / 60) * 6 - 90
  const sA = s * 6 - 90
  const end = (a, l) => {
    const rad = (a * Math.PI) / 180
    return { x: cx + l * Math.cos(rad), y: cy + l * Math.sin(rad) }
  }
  const hE = end(hA, 26), mE = end(mA, 36), sE = end(sA, 42)

  const markers = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 - 90) * Math.PI / 180
    const major = i % 3 === 0
    const oLen = r, iLen = r - (major ? 8 : 4)
    return (
      <line key={i}
        x1={cx + iLen * Math.cos(a)} y1={cy + iLen * Math.sin(a)}
        x2={cx + oLen * Math.cos(a)} y2={cy + oLen * Math.sin(a)}
        stroke={major ? '#D4AF37' : '#2a2520'} strokeWidth={major ? 1.5 : 0.7} strokeLinecap="round" />
    )
  })

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className="block">
      <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke="#1c1914" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r} fill="#0d0b07" stroke="#252118" strokeWidth="0.5" />
      {markers}
      <line x1={cx} y1={cy} x2={hE.x} y2={hE.y} stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={mE.x} y2={mE.y} stroke="#ede8df" strokeWidth="1.5" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={sE.x} y2={sE.y} stroke="#d94435" strokeWidth="0.7" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="2.5" fill="#D4AF37" />
      <circle cx={cx} cy={cy} r="1" fill="#0d0b07" />
    </svg>
  )
}


/* ═══════════════════════════════════════════════════════════
   Confirmation Modal
   ═══════════════════════════════════════════════════════════ */

function ConfirmModal({ onConfirm, onCancel }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 anim-overlay"
      style={{ backgroundColor: 'rgba(8,6,3,0.88)', backdropFilter: 'blur(12px)' }}
      onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} className="anim-modal"
        style={{
          width: '100%', maxWidth: '400px',
          background: '#12100d',
          border: '1px solid #252118',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>

        {/* Gold accent top line */}
        <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }} />

        {/* Content */}
        <div style={{ padding: '40px 36px 36px' }}>

          {/* Label */}
          <p className="label" style={{
            fontSize: '9px', letterSpacing: '0.3em', color: '#D4AF37',
            marginBottom: '20px',
          }}>
            NOTICE OF ACCOUNT CLOSURE
          </p>

          {/* Title */}
          <h3 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '24px', fontWeight: 500, color: '#ede8df',
            marginBottom: '20px', lineHeight: 1.3,
          }}>
            Are you sure you want to<br />close this account?
          </h3>

          {/* Body */}
          <p style={{
            fontFamily: "'Inter', sans-serif", fontSize: '13px',
            color: '#7d766c', lineHeight: '1.8', marginBottom: '16px',
          }}>
            This action will permanently erase all account data including your balance history and personal records.
          </p>

          <p style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '11px',
            color: '#504b44', lineHeight: '1.7', marginBottom: '36px',
            letterSpacing: '0.02em',
          }}>
            This action is irreversible. Closed accounts cannot be recovered or reopened.
          </p>

          {/* Divider */}
          <div style={{ height: '1px', background: '#1c1914', marginBottom: '28px' }} />

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '14px' }}>
            <button onClick={onCancel} id="cancel-close-btn"
              style={{
                flex: 1, padding: '15px 20px',
                border: '1px solid #D4AF37',
                borderRadius: '4px',
                background: 'transparent',
                color: '#D4AF37',
                cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={e => { e.target.style.background = 'rgba(212,175,55,0.08)' }}
              onMouseOut={e => { e.target.style.background = 'transparent' }}>
              Keep Account
            </button>
            <button onClick={onConfirm} id="confirm-close-btn"
              style={{
                flex: 1, padding: '15px 20px',
                border: '1px solid #252118',
                borderRadius: '4px',
                background: 'transparent',
                color: '#7d766c',
                cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={e => { e.target.style.borderColor = '#d94435'; e.target.style.color = '#d94435' }}
              onMouseOut={e => { e.target.style.borderColor = '#252118'; e.target.style.color = '#7d766c' }}>
              Close Account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════
   Setup Screen (DOB + Name)
   ═══════════════════════════════════════════════════════════ */

function SetupScreen({ onSubmit }) {
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [error, setError] = useState('')
  const nameRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 700)
    return () => clearTimeout(t)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    const trimmed = name.trim()
    if (!trimmed) { setError('Please enter your name.'); return }
    const d = new Date(dob)
    if (!dob || isNaN(d.getTime())) { setError('Please enter a valid date of birth.'); return }
    if (d > new Date()) { setError('Date of birth cannot be in the future.'); return }
    const age = calcAge(d)
    if (age >= 40) { setError('Your Time Bank balance has already reached zero.'); return }
    if (age < 0) { setError('Invalid date of birth.'); return }
    onSubmit(d, trimmed)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      background: 'radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.03) 0%, #0d0b07 70%)',
    }}>
      <div className="stagger" style={{ width: '100%', maxWidth: '420px' }}>

        {/* ── Icon ── */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className="anim-float" style={{ display: 'inline-block', marginBottom: '32px' }}>
            <svg width="64" height="64" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#252118" strokeWidth="1" />
              <circle cx="60" cy="60" r="48" fill="none" stroke="#D4AF37" strokeWidth="1.2" opacity="0.4" />
              {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
                const a = (i * 30 - 90) * Math.PI / 180
                const major = i % 3 === 0
                return <line key={i}
                  x1={60 + (major ? 38 : 42) * Math.cos(a)} y1={60 + (major ? 38 : 42) * Math.sin(a)}
                  x2={60 + 48 * Math.cos(a)} y2={60 + 48 * Math.sin(a)}
                  stroke={major ? '#D4AF37' : '#252118'} strokeWidth={major ? 1.5 : 0.6} strokeLinecap="round" />
              })}
              <line x1="60" y1="60" x2="60" y2="32" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="60" y1="60" x2="78" y2="66" stroke="#ede8df" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="60" cy="60" r="3" fill="#D4AF37" />
              <circle cx="60" cy="60" r="1.2" fill="#0d0b07" />
            </svg>
          </div>

          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '36px',
            fontWeight: 500,
            color: '#ede8df',
            letterSpacing: '-0.01em',
            marginBottom: '16px',
            lineHeight: 1.1,
          }}>
            Time Bank
          </h1>

          <p className="label" style={{
            fontSize: '10px',
            letterSpacing: '0.3em',
            color: '#504b44',
          }}>
            EVERY HOUR IS A RUPEE · SPEND ACCORDINGLY
          </p>
        </div>

        {/* ── Thin gold line ── */}
        <div style={{
          width: '40px', height: '1px', margin: '0 auto 48px',
          background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)',
        }} />

        {/* ── Form ── */}
        <form onSubmit={handleSubmit}>
          {/* Name field */}
          <div style={{ marginBottom: '28px' }}>
            <label htmlFor="name-input" className="label" style={{
              display: 'block', marginBottom: '12px', fontSize: '10px', letterSpacing: '0.25em',
            }}>
              YOUR NAME
            </label>
            <input
              ref={nameRef}
              id="name-input"
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              placeholder="Enter your name"
              autoComplete="name"
              className="input-field"
              style={{ fontFamily: "'Inter', sans-serif" }}
            />
          </div>

          {/* DOB field */}
          <div style={{ marginBottom: '36px' }}>
            <label htmlFor="dob-input" className="label" style={{
              display: 'block', marginBottom: '12px', fontSize: '10px', letterSpacing: '0.25em',
            }}>
              DATE OF BIRTH
            </label>
            <input
              id="dob-input"
              type="date"
              value={dob}
              onChange={e => { setDob(e.target.value); setError('') }}
              max={new Date().toISOString().split('T')[0]}
              className="input-field"
              style={{ fontFamily: "'JetBrains Mono', monospace", colorScheme: 'dark' }}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="anim-slide-down" style={{
              fontFamily: "'Inter', sans-serif", fontSize: '13px', color: '#d94435',
              marginBottom: '20px', paddingLeft: '2px',
            }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button id="open-account-btn" type="submit" className="btn-primary">
            Open Account
          </button>
        </form>

        {/* ── Disclaimer ── */}
        <p style={{
          textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
          fontSize: '11px',
          color: '#332f2a',
          marginTop: '48px',
          lineHeight: '1.8',
          letterSpacing: '0.01em',
        }}>
          By proceeding you acknowledge that time cannot be<br />
          earned, borrowed, or refunded. All withdrawals are final.
        </p>
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════
   Dashboard
   ═══════════════════════════════════════════════════════════ */

function Dashboard({ dob, name, onReset }) {
  const [, setTick] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const raf = useRef(null)

  useEffect(() => {
    let running = true
    const loop = () => {
      if (!running) return
      setTick(t => t + 1)
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => { running = false; cancelAnimationFrame(raf.current) }
  }, [])

  const remaining = getRemaining(dob)
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], [])

  if (!remaining) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div className="stagger" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '56px', marginBottom: '24px' }}>⏱</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 500, color: '#ede8df', marginBottom: '12px' }}>
            Account Closed
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: '#7d766c' }}>
            Your Time Bank balance has been fully withdrawn.
          </p>
          <button onClick={onReset} id="reset-expired-btn" className="label"
            style={{ marginTop: '32px', background: 'none', border: 'none', cursor: 'pointer', color: '#504b44' }}>
            RESET
          </button>
        </div>
      </div>
    )
  }

  const now = new Date()
  const bal = Math.floor(remaining.totalHours)
  const opening = getOpeningBalance()
  const spent = getHoursSpent(dob)
  const pct = getLifePercent(dob)
  const deadline = getDeadlineDate(dob)
  const secToday = getSecondsConsumedToday()
  const rupeeToday = secToday / 3600

  return (
    <>
      {showConfirm && <ConfirmModal onConfirm={() => { setShowConfirm(false); onReset() }} onCancel={() => setShowConfirm(false)} />}

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* ════════════ HEADER ════════════ */}
        <header style={{
          padding: '24px 32px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid #1c1914',
        }}>
          <span className="label" style={{ color: '#D4AF37', fontSize: '11px', letterSpacing: '0.22em' }}>
            TIME BANK · {name.toUpperCase()}
          </span>
          <span className="label" style={{ color: '#504b44', fontSize: '10px', display: 'none' }}
            id="header-date" ref={el => { if (el) el.style.display = window.innerWidth > 640 ? 'block' : 'none' }}>
            {formatDate(now)}
          </span>
        </header>

        {/* ════════════ MAIN ════════════ */}
        <main style={{ flex: 1, padding: '0 32px', maxWidth: '760px', margin: '0 auto', width: '100%' }}>
          <div className="stagger">

            {/* ── Balance ── */}
            <section style={{ paddingTop: '56px', paddingBottom: '48px' }}>
              <p className="label" style={{ marginBottom: '20px', letterSpacing: '0.22em' }}>
                CURRENT BALANCE · 1 HOUR = ₹1
              </p>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 'clamp(32px, 5vw, 42px)',
                  fontWeight: 400,
                  color: '#D4AF37',
                }}>₹</span>
                <span className="anim-shimmer" style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 'clamp(64px, 14vw, 110px)',
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}>
                  {formatIndian(bal)}
                </span>
              </div>

              <p className="label" style={{ marginTop: '20px', color: '#504b44', letterSpacing: '0.18em' }}>
                HOURS REMAINING UNTIL {deadline.getFullYear()}
              </p>
            </section>

            {/* ── Daily Deduction ── */}
            <section style={{ paddingBottom: '48px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                border: '1px solid rgba(212,175,55,0.25)', borderRadius: '10px',
                padding: '10px 20px',
                fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#D4AF37',
                letterSpacing: '0.05em',
              }}>
                − ₹24 / DAY
              </span>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: '#7d766c', lineHeight: '1.6' }}>
                Every midnight, <strong style={{ color: '#ede8df', fontWeight: 500 }}>24 rupees</strong> are deducted. No extensions. No refunds.
              </p>
            </section>

            {/* ── Progress Bar ── */}
            <section style={{ paddingBottom: '48px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span className="label" style={{ fontSize: '10px' }}>{pct.toFixed(1)}% spent</span>
                <span className="label" style={{ fontSize: '10px' }}>{(100 - pct).toFixed(1)}% remaining</span>
              </div>
              <div style={{
                height: '6px', background: '#131110', borderRadius: '6px',
                overflow: 'hidden', border: '1px solid #1c1914',
              }}>
                <div style={{
                  height: '100%', borderRadius: '6px',
                  width: `${pct}%`,
                  background: pct > 75
                    ? 'linear-gradient(90deg, #D4AF37, #d94435)'
                    : 'linear-gradient(90deg, #5b8fb9, #D4AF37)',
                  transition: 'width 2s ease',
                }} />
              </div>
            </section>

            {/* ── Breakdown Cards ── */}
            <section style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '14px',
              paddingBottom: '56px',
            }}>
              {[
                { v: remaining.years, u: 'YEARS', accent: false },
                { v: remaining.months, u: 'MONTHS', accent: false },
                { v: remaining.days, u: 'DAYS', accent: false },
                { v: remaining.hours, u: 'HOURS', accent: false },
                { v: remaining.minutes, u: 'MINUTES', accent: false },
                { v: remaining.seconds, u: 'SECONDS', accent: true },
              ].map(({ v, u, accent }) => (
                <div key={u} style={{
                  border: `1px solid ${accent ? 'rgba(212,175,55,0.2)' : '#252118'}`,
                  borderRadius: '14px',
                  padding: '24px 8px',
                  textAlign: 'center',
                  background: accent ? 'rgba(212,175,55,0.03)' : 'transparent',
                }}>
                  <span style={{
                    display: 'block',
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 'clamp(26px, 5vw, 40px)',
                    fontWeight: 600,
                    fontStyle: 'italic',
                    color: accent ? '#D4AF37' : '#ede8df',
                    lineHeight: 1,
                    marginBottom: '10px',
                  }}>{String(v).padStart(2, '0')}</span>
                  <span className="label" style={{
                    fontSize: '8px',
                    letterSpacing: '0.22em',
                    color: accent ? '#D4AF37' : undefined,
                  }}>{u}</span>
                </div>
              ))}
            </section>

            {/* ── Divider ── */}
            <div className="divider" />

            {/* ── Live Clock + Seconds Today ── */}
            <section style={{
              padding: '56px 0',
              display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '40px',
              flexWrap: 'wrap',
            }}>
              <div style={{
                border: '1px solid #252118', borderRadius: '16px',
                padding: '20px', flexShrink: 0,
              }}>
                <AnalogClock size={130} />
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <p className="label" style={{ color: '#a93226', letterSpacing: '0.2em', marginBottom: '10px' }}>
                  SECONDS CONSUMED TODAY
                </p>
                <p style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 'clamp(32px, 7vw, 48px)',
                  fontWeight: 600,
                  color: '#e8c94a',
                  lineHeight: 1,
                  marginBottom: '24px',
                }}>
                  {formatIndian(secToday)}
                </p>

                <p className="label" style={{ marginBottom: '8px' }}>RUPEES DRAINED TODAY</p>
                <p style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '20px', fontWeight: 500, color: '#d94435',
                  marginBottom: '24px',
                }}>
                  ₹{rupeeToday.toFixed(4)}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="anim-pulse-dot" style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    backgroundColor: '#4caf50', display: 'inline-block',
                  }} />
                  <span className="label" style={{ color: '#4caf50', fontSize: '10px', letterSpacing: '0.2em' }}>
                    LIVE · EVERY SECOND COUNTS
                  </span>
                </div>
              </div>
            </section>

            {/* ── Divider ── */}
            <div className="divider" />

            {/* ── Account Statement ── */}
            <section style={{ padding: '56px 0' }}>
              <p className="label" style={{ marginBottom: '28px', letterSpacing: '0.22em' }}>
                ACCOUNT STATEMENT
              </p>

              {[
                { l: `opening balance (at birth · ${dob.getFullYear()})`, v: `₹${formatIndian(opening)}`, c: '#ede8df' },
                { l: 'hours spent to date', v: `− ₹${formatIndian(spent)}`, c: '#d94435' },
                { l: 'current balance', v: `₹${formatIndian(bal)}`, c: '#ede8df' },
                { l: 'daily deduction rate', v: '₹24.00 / day', c: '#ede8df' },
                { l: 'deadline', v: formatDeadline(deadline), c: '#ede8df' },
                { l: '% of life budget remaining', v: `${(100 - pct).toFixed(2)}%`, c: '#ede8df' },
              ].map(({ l, v, c }, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 0',
                  borderBottom: '1px solid #1c1914',
                }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: '#7d766c' }}>{l}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 500, color: c }}>
                    {v}
                  </span>
                </div>
              ))}
            </section>

            {/* ── Divider ── */}
            <div className="divider" />

            {/* ── Quote ── */}
            <section style={{ padding: '56px 0' }}>
              <div style={{
                background: '#131110',
                border: '1px solid #1c1914',
                borderRadius: '20px',
                padding: 'clamp(32px, 5vw, 48px)',
              }}>
                <p style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 'clamp(20px, 3.5vw, 28px)',
                  fontWeight: 500,
                  fontStyle: 'italic',
                  color: '#ede8df',
                  lineHeight: 1.5,
                  marginBottom: '20px',
                }}>
                  &ldquo;{quote.text}&rdquo;
                </p>
                <p className="label" style={{ color: '#504b44', fontSize: '10px' }}>
                  — {quote.author.toUpperCase()}{quote.source ? ` · ${quote.source.toUpperCase()}` : ''}
                </p>
              </div>
            </section>

          </div>
        </main>

        {/* ════════════ FOOTER ════════════ */}
        <footer style={{
          padding: '24px 32px',
          borderTop: '1px solid #1c1914',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
          gap: '16px',
        }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '11px', color: '#332f2a' }}>
            Every hour is a rupee. Spend accordingly.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '11px', color: '#332f2a' }}>
              Built by <span style={{ color: '#D4AF37' }}>Harsh</span>
            </p>
            <button onClick={() => setShowConfirm(true)} id="close-account-btn"
              className="label"
              style={{
                fontSize: '9px', color: '#332f2a', background: 'none', border: 'none',
                cursor: 'pointer', transition: 'color 0.5s',
              }}
              onMouseOver={e => e.target.style.color = '#d94435'}
              onMouseOut={e => e.target.style.color = '#332f2a'}>
              CLOSE ACCOUNT
            </button>
          </div>
        </footer>

      </div>
    </>
  )
}


/* ═══════════════════════════════════════════════════════════
   App Root
   ═══════════════════════════════════════════════════════════ */

export default function App() {
  const [state, setState] = useState(() => loadData())

  const handleSubmit = useCallback((dob, name) => {
    saveData(dob, name)
    setState({ dob, name })
  }, [])

  const handleReset = useCallback(() => {
    clearData()
    setState({ dob: null, name: '' })
  }, [])

  if (!state.dob) return <SetupScreen onSubmit={handleSubmit} />
  return <Dashboard dob={state.dob} name={state.name} onReset={handleReset} />
}
