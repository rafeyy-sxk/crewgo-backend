import Navbar from '@/components/Navbar';
import Link from 'next/link';

// ─── Orbit constellation data ─────────────────────────────────────────────────
const outerAvatars = [
  { initials: 'AK', color: '#FF5A1F', bg: 'rgba(255,90,31,0.18)', delay: '0s' },
  { initials: 'SR', color: '#22C55E', bg: 'rgba(34,197,94,0.18)', delay: '-4s' },
  { initials: 'MH', color: '#3B82F6', bg: 'rgba(59,130,246,0.18)', delay: '-8s' },
];
const innerAvatars = [
  { initials: 'ZA', color: '#8B5CF6', bg: 'rgba(139,92,246,0.18)', delay: '0s' },
  { initials: 'FA', color: '#EC4899', bg: 'rgba(236,72,153,0.18)', delay: '-3s' },
];

// ─── How It Works steps ───────────────────────────────────────────────────────
const steps = [
  {
    num: '01',
    title: 'Find an Event',
    desc: 'Browse hundreds of local Lahore events — concerts, food festivals, art shows, gaming meets. Filter by vibe, distance, or date.',
    icon: '🎪',
    delay: '0ms',
  },
  {
    num: '02',
    title: 'Join or Form a Crew',
    desc: 'Max 6 people per crew. Our AI matches you by shared interests, music taste, and social style — not just proximity.',
    icon: '👥',
    delay: '120ms',
  },
  {
    num: '03',
    title: 'Chat & Coordinate',
    desc: 'CrewAI joins your group chat knowing your event, venue layout, and every crew member\'s preferences. Logistics handled.',
    icon: '💬',
    delay: '240ms',
  },
];

// ─── Chat messages ────────────────────────────────────────────────────────────
const chatMessages = [
  {
    role: 'user' as const,
    name: 'You',
    text: 'where should we meet before the Coke Studio show?',
  },
  {
    role: 'ai' as const,
    name: '🤖 CrewAI',
    text: 'Given your crew\'s location spread across Gulberg and DHA, Johar Town Food Street is the perfect midpoint — everyone\'s within 15 minutes. I\'d suggest meeting at Salt\'n Pepper around 7:30 PM. Doors open at 9, so you\'ll have time to grab dinner and head over together without rushing.',
  },
  {
    role: 'user' as const,
    name: 'You',
    text: 'nice — any parking tips for Alhamra? Zara hates walking far',
  },
  {
    role: 'ai' as const,
    name: '🤖 CrewAI',
    text: 'Alhamra\'s main lot fills by 8:30 — I\'d recommend the underground parking on Mall Road, it\'s a 4-minute walk from Gate 2 (the closer entrance). Or Shahid can drive since he mentioned he\'s coming from Liberty, and the rest of you can Careem to him.',
  },
];

export default function LandingPage() {
  return (
    <>
      <style>{`
        /* Outer orbit: 3 avatars, clockwise, radius ~160px */
        @keyframes orbitOuter {
          from { transform: rotate(var(--start)) translateX(160px) rotate(calc(-1 * var(--start))); }
          to   { transform: rotate(calc(var(--start) + 360deg)) translateX(160px) rotate(calc(-1 * (var(--start) + 360deg))); }
        }
        /* Inner orbit: 2 avatars, counter-clockwise, radius ~105px */
        @keyframes orbitInner {
          from { transform: rotate(var(--start)) translateX(105px) rotate(calc(-1 * var(--start))); }
          to   { transform: rotate(calc(var(--start) - 360deg)) translateX(105px) rotate(calc(-1 * (var(--start) - 360deg))); }
        }
        @keyframes orbitRingPulse {
          0%,100% { opacity: 0.15; transform: scale(1); }
          50%      { opacity: 0.28; transform: scale(1.02); }
        }
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotBounce {
          0%,60%,100% { opacity: 0.25; transform: translateY(0); }
          30%          { opacity: 1;    transform: translateY(-5px); }
        }
        @keyframes stepReveal {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 24px rgba(139,92,246,0.25), 0 0 80px rgba(139,92,246,0.06); }
          50%      { box-shadow: 0 0 40px rgba(139,92,246,0.45), 0 0 120px rgba(139,92,246,0.12); }
        }
        @keyframes statSlide {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes cardFloat {
          0%,100% { transform: translateY(0px) rotate(-1deg); }
          50%      { transform: translateY(-8px) rotate(-1deg); }
        }

        .hero-line-1 { animation: heroFadeUp 0.7s ease forwards 0.1s; opacity: 0; }
        .hero-line-2 { animation: heroFadeUp 0.7s ease forwards 0.25s; opacity: 0; }
        .hero-line-3 { animation: heroFadeUp 0.7s ease forwards 0.4s; opacity: 0; }
        .hero-sub    { animation: heroFadeUp 0.7s ease forwards 0.55s; opacity: 0; }
        .hero-cta    { animation: heroFadeUp 0.7s ease forwards 0.7s; opacity: 0; }
        .hero-stats  { animation: heroFadeUp 0.7s ease forwards 0.85s; opacity: 0; }

        .orbit-outer {
          position: absolute;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          animation: orbitOuter 13s linear infinite;
          animation-delay: var(--delay);
          --start: 0deg;
        }
        .orbit-outer:nth-child(1) { --start: 0deg; }
        .orbit-outer:nth-child(2) { --start: 120deg; }
        .orbit-outer:nth-child(3) { --start: 240deg; }

        .orbit-inner {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          animation: orbitInner 8s linear infinite;
          animation-delay: var(--delay);
          --start: 60deg;
        }
        .orbit-inner:nth-child(1) { --start: 60deg; }
        .orbit-inner:nth-child(2) { --start: 240deg; }

        .orbit-ring {
          animation: orbitRingPulse 4s ease-in-out infinite;
        }

        .event-card-float {
          animation: cardFloat 5s ease-in-out infinite;
        }

        .dot-1 { animation: dotBounce 1.4s ease infinite 0ms; }
        .dot-2 { animation: dotBounce 1.4s ease infinite 180ms; }
        .dot-3 { animation: dotBounce 1.4s ease infinite 360ms; }

        .step-card {
          animation: stepReveal 0.6s ease forwards;
          opacity: 0;
        }
        .step-card:nth-child(1) { animation-delay: 0ms; }
        .step-card:nth-child(2) { animation-delay: 140ms; }
        .step-card:nth-child(3) { animation-delay: 280ms; }

        .chat-window { animation: glowPulse 4s ease-in-out infinite; }

        .stat-item:nth-child(1) { animation: statSlide 0.5s ease forwards 0.9s; opacity: 0; }
        .stat-item:nth-child(2) { animation: statSlide 0.5s ease forwards 1.05s; opacity: 0; }
        .stat-item:nth-child(3) { animation: statSlide 0.5s ease forwards 1.2s; opacity: 0; }

        .btn-primary:hover { background: #E8481A !important; transform: translateY(-2px); box-shadow: 0 8px 32px rgba(255,90,31,0.4) !important; }
        .btn-ghost:hover { background: rgba(255,255,255,0.06) !important; border-color: rgba(255,255,255,0.3) !important; transform: translateY(-2px); }
        .btn-primary, .btn-ghost { transition: all 0.22s ease; }
        .step-card-inner:hover { border-color: rgba(255,90,31,0.3) !important; transform: translateY(-4px); box-shadow: 0 16px 48px rgba(255,90,31,0.1) !important; transition: all 0.25s ease; }

        @media (max-width: 768px) {
          .hero-headline { font-size: 52px !important; }
          .constellation-wrap { width: 300px !important; height: 300px !important; }
          .hero-grid { flex-direction: column !important; gap: 48px !important; }
          .steps-grid { flex-direction: column !important; }
          .chat-grid { flex-direction: column !important; }
        }
      `}</style>

      <Navbar />

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1 — HERO
      ═══════════════════════════════════════════════════════════════ */}
      <section
        className="grid-bg"
        style={{
          minHeight: '100vh',
          paddingTop: '68px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Radial glow */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(255,90,31,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Corner accent glows */}
        <div style={{
          position: 'absolute', top: '-120px', right: '-80px',
          width: '480px', height: '480px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,90,31,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '0', left: '-100px',
          width: '360px', height: '360px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          padding: '80px 24px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '64px',
          position: 'relative',
          zIndex: 1,
        }} className="hero-grid">

          {/* ── LEFT: Headline ── */}
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <div className="hero-line-1">
              <h1
                className="hero-headline"
                style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: '80px',
                  fontWeight: 800,
                  lineHeight: 1.0,
                  letterSpacing: '-0.03em',
                  color: 'white',
                  margin: 0,
                }}
              >
                Find your
              </h1>
            </div>
            <div className="hero-line-2" style={{ overflow: 'visible' }}>
              <h1
                className="hero-headline"
                style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: '80px',
                  fontWeight: 800,
                  lineHeight: 1.0,
                  letterSpacing: '-0.03em',
                  color: '#FF5A1F',
                  textShadow: '0 0 60px rgba(255,90,31,0.5), 0 0 120px rgba(255,90,31,0.2)',
                  margin: 0,
                }}
              >
                CREW
              </h1>
            </div>
            <div className="hero-line-3">
              <h1
                className="hero-headline"
                style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: '80px',
                  fontWeight: 800,
                  lineHeight: 1.0,
                  letterSpacing: '-0.03em',
                  color: 'white',
                  margin: 0,
                  marginBottom: '28px',
                }}
              >
                in Lahore
              </h1>
            </div>

            <p
              className="hero-sub"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '18px',
                lineHeight: 1.7,
                color: '#9090A0',
                maxWidth: '480px',
                marginBottom: '40px',
              }}
            >
              Stop going alone. Match with people attending the same events.
              Form a crew of up to 6, chat, coordinate — with AI that actually
              knows your vibe.
            </p>

            {/* CTA Buttons */}
            <div className="hero-cta" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '48px' }}>
              <Link
                href="/events"
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 28px',
                  borderRadius: '12px',
                  background: '#FF5A1F',
                  color: 'white',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '16px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  boxShadow: '0 4px 24px rgba(255,90,31,0.35)',
                }}
              >
                Discover Events <span style={{ fontSize: '18px' }}>→</span>
              </Link>
              <Link
                href="#how-it-works"
                className="btn-ghost"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '14px 28px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.18)',
                  color: 'white',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '16px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                How it works
              </Link>
            </div>

            {/* Stats Row */}
            <div
              className="hero-stats"
              style={{
                display: 'flex',
                gap: '0',
                flexWrap: 'wrap',
              }}
            >
              {[
                { value: '2,400+', label: 'crews formed' },
                { value: '48', label: 'events this week' },
                { value: 'AI', label: 'powered matching' },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="stat-item"
                  style={{
                    paddingRight: i < 2 ? '28px' : '0',
                    marginRight: i < 2 ? '28px' : '0',
                    borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  }}
                >
                  <div style={{
                    fontFamily: 'Syne, sans-serif',
                    fontSize: '22px',
                    fontWeight: 700,
                    color: '#FF5A1F',
                    lineHeight: 1,
                  }}>
                    {stat.value}
                  </div>
                  <div style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '12px',
                    color: '#5A5A6A',
                    marginTop: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Constellation ── */}
          <div style={{
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div
              className="constellation-wrap"
              style={{
                position: 'relative',
                width: '380px',
                height: '380px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Orbit rings */}
              <div
                className="orbit-ring"
                style={{
                  position: 'absolute',
                  width: '340px',
                  height: '340px',
                  borderRadius: '50%',
                  border: '1px dashed rgba(255,90,31,0.2)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  width: '228px',
                  height: '228px',
                  borderRadius: '50%',
                  border: '1px dashed rgba(139,92,246,0.2)',
                }}
              />

              {/* Outer orbit: 3 avatars clockwise */}
              {outerAvatars.map((av, i) => (
                <div
                  key={i}
                  className="orbit-outer"
                  style={{ '--delay': av.delay } as React.CSSProperties}
                >
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: av.bg,
                    border: `2px solid ${av.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Syne, sans-serif',
                    fontWeight: 700,
                    fontSize: '12px',
                    color: av.color,
                    backdropFilter: 'blur(8px)',
                    boxShadow: `0 0 16px ${av.color}40`,
                  }}>
                    {av.initials}
                  </div>
                </div>
              ))}

              {/* Inner orbit: 2 avatars counter-clockwise */}
              {innerAvatars.map((av, i) => (
                <div
                  key={i}
                  className="orbit-inner"
                  style={{ '--delay': av.delay } as React.CSSProperties}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: av.bg,
                    border: `2px solid ${av.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Syne, sans-serif',
                    fontWeight: 700,
                    fontSize: '11px',
                    color: av.color,
                    boxShadow: `0 0 12px ${av.color}40`,
                  }}>
                    {av.initials}
                  </div>
                </div>
              ))}

              {/* Center event card */}
              <div
                className="event-card-float"
                style={{
                  width: '172px',
                  background: 'rgba(28,28,46,0.9)',
                  border: '1px solid rgba(255,90,31,0.3)',
                  borderRadius: '20px',
                  padding: '20px 18px',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 40px rgba(255,90,31,0.1)',
                  zIndex: 2,
                }}
              >
                {/* Event image placeholder */}
                <div style={{
                  width: '100%',
                  height: '80px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(255,90,31,0.25) 0%, rgba(139,92,246,0.2) 100%)',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                }}>
                  🎵
                </div>
                <div style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'white',
                  lineHeight: 1.3,
                  marginBottom: '6px',
                }}>
                  Coke Studio Live
                </div>
                <div style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '11px',
                  color: '#9090A0',
                  marginBottom: '12px',
                }}>
                  📍 Alhamra, Lahore
                </div>
                {/* Crew slots */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '-4px' }}>
                    {['#FF5A1F', '#8B5CF6', '#22C55E'].map((c, i) => (
                      <div key={i} style={{
                        width: '22px', height: '22px', borderRadius: '50%',
                        background: c, border: '2px solid #1C1C2E',
                        marginLeft: i > 0 ? '-6px' : '0',
                      }} />
                    ))}
                  </div>
                  <div style={{
                    background: 'rgba(255,90,31,0.15)',
                    border: '1px solid rgba(255,90,31,0.3)',
                    borderRadius: '100px',
                    padding: '3px 8px',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#FF5A1F',
                    fontFamily: 'DM Sans, sans-serif',
                  }}>
                    3/6 crew
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute', bottom: '32px', left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
          opacity: 0.4,
        }}>
          <div style={{ width: '1px', height: '40px', background: 'linear-gradient(to bottom, white, transparent)' }} />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'white', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Scroll
          </span>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2 — HOW IT WORKS
      ═══════════════════════════════════════════════════════════════ */}
      <section
        id="how-it-works"
        style={{
          padding: '120px 24px',
          background: '#0F0F1A',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background accent */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,90,31,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
          {/* Section header */}
          <div style={{ textAlign: 'center', marginBottom: '72px' }}>
            <div style={{
              display: 'inline-block',
              padding: '6px 16px',
              borderRadius: '100px',
              background: 'rgba(255,90,31,0.1)',
              border: '1px solid rgba(255,90,31,0.2)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              fontWeight: 600,
              color: '#FF5A1F',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '20px',
            }}>
              How it works
            </div>
            <h2 style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: '48px',
              fontWeight: 800,
              color: 'white',
              letterSpacing: '-0.02em',
              margin: 0,
            }}>
              Three steps to your crew
            </h2>
            <p style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '16px',
              color: '#9090A0',
              marginTop: '14px',
              maxWidth: '440px',
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: 1.7,
            }}>
              From solo to squad in minutes. No awkward DMs, no group chats that
              die before the event.
            </p>
          </div>

          {/* Steps grid */}
          <div
            className="steps-grid"
            style={{
              display: 'flex',
              gap: '24px',
              alignItems: 'stretch',
            }}
          >
            {steps.map((step, i) => (
              <div
                key={i}
                className="step-card"
                style={{ flex: '1 1 0', minWidth: 0 }}
              >
                <div
                  className="step-card-inner"
                  style={{
                    height: '100%',
                    background: '#1C1C2E',
                    border: '1px solid #2A2A3E',
                    borderLeft: '3px solid #FF5A1F',
                    borderRadius: '20px',
                    padding: '36px 32px',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'default',
                  }}
                >
                  {/* Dim step number watermark */}
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '24px',
                    fontFamily: 'Syne, sans-serif',
                    fontSize: '96px',
                    fontWeight: 800,
                    color: 'rgba(255,255,255,0.04)',
                    lineHeight: 1,
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}>
                    {step.num}
                  </div>

                  {/* Icon */}
                  <div style={{
                    width: '52px', height: '52px',
                    borderRadius: '14px',
                    background: 'rgba(255,90,31,0.1)',
                    border: '1px solid rgba(255,90,31,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px',
                    marginBottom: '24px',
                  }}>
                    {step.icon}
                  </div>

                  {/* Step label */}
                  <div style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#FF5A1F',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: '10px',
                  }}>
                    {step.num} —
                  </div>

                  <h3 style={{
                    fontFamily: 'Syne, sans-serif',
                    fontSize: '22px',
                    fontWeight: 700,
                    color: 'white',
                    marginBottom: '14px',
                    letterSpacing: '-0.01em',
                  }}>
                    {step.title}
                  </h3>

                  <p style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '15px',
                    color: '#9090A0',
                    lineHeight: 1.7,
                    margin: 0,
                  }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Connecting line between cards (desktop only) */}
          <div
            className="hidden md:block"
            style={{
              position: 'absolute',
              top: 'calc(72px + 36px + 52px + 24px + 12px)',
              left: 'calc(33.33% - 12px)',
              right: 'calc(33.33% - 12px)',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255,90,31,0.3), rgba(255,90,31,0.3), transparent)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3 — AI CHAT PREVIEW
      ═══════════════════════════════════════════════════════════════ */}
      <section
        style={{
          padding: '120px 24px',
          background: 'linear-gradient(180deg, #0F0F1A 0%, #11111F 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* AI purple glow */}
        <div style={{
          position: 'absolute', top: '40%', right: '-100px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
          {/* Section header */}
          <div style={{ textAlign: 'center', marginBottom: '72px' }}>
            <div style={{
              display: 'inline-block',
              padding: '6px 16px',
              borderRadius: '100px',
              background: 'rgba(139,92,246,0.1)',
              border: '1px solid rgba(139,92,246,0.25)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              fontWeight: 600,
              color: '#8B5CF6',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '20px',
            }}>
              Powered by Claude AI
            </div>
            <h2 style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: '48px',
              fontWeight: 800,
              color: 'white',
              letterSpacing: '-0.02em',
              margin: '0 0 4px',
            }}>
              Meet{' '}
              <span style={{
                color: '#8B5CF6',
                textShadow: '0 0 40px rgba(139,92,246,0.5)',
              }}>
                CrewAI
              </span>
            </h2>
            <p style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '16px',
              color: '#9090A0',
              marginTop: '14px',
              lineHeight: 1.7,
            }}>
              Powered by Claude. Knows your crew, your event, your vibe.
            </p>
          </div>

          {/* Two-column layout */}
          <div
            className="chat-grid"
            style={{
              display: 'flex',
              gap: '64px',
              alignItems: 'center',
            }}
          >
            {/* Left: feature list */}
            <div style={{ flex: '1 1 0', minWidth: 0 }}>
              <h3 style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: '28px',
                fontWeight: 700,
                color: 'white',
                marginBottom: '32px',
                letterSpacing: '-0.01em',
              }}>
                Your AI crew coordinator — always in the loop.
              </h3>

              {[
                {
                  icon: '🗺️',
                  title: 'Knows your city',
                  desc: 'CrewAI has deep knowledge of Lahore — venues, traffic, parking, food spots. It gives local, specific advice.',
                },
                {
                  icon: '🎯',
                  title: 'Event-aware context',
                  desc: 'Every conversation is scoped to your event. It knows the lineup, timing, gate details, and your crew\'s preferences.',
                },
                {
                  icon: '🤝',
                  title: 'Crew personality matching',
                  desc: 'It remembers every member\'s interests, transport situation, and social preferences to coordinate perfectly.',
                },
                {
                  icon: '⚡',
                  title: 'Real-time coordination',
                  desc: 'Last-minute plan changes? CrewAI proposes alternatives instantly, considering everyone\'s constraints.',
                },
              ].map((feature, i) => (
                <div key={i} style={{
                  display: 'flex',
                  gap: '16px',
                  marginBottom: '28px',
                  alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: '42px', height: '42px', flexShrink: 0,
                    borderRadius: '10px',
                    background: 'rgba(139,92,246,0.1)',
                    border: '1px solid rgba(139,92,246,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px',
                  }}>
                    {feature.icon}
                  </div>
                  <div>
                    <div style={{
                      fontFamily: 'Syne, sans-serif',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: 'white',
                      marginBottom: '6px',
                    }}>
                      {feature.title}
                    </div>
                    <div style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '14px',
                      color: '#9090A0',
                      lineHeight: 1.65,
                    }}>
                      {feature.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: chat window */}
            <div style={{ flex: '1 1 0', minWidth: 0 }}>
              <div
                className="chat-window"
                style={{
                  background: '#1C1C2E',
                  border: '1px solid rgba(139,92,246,0.25)',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  boxShadow: '0 0 40px rgba(139,92,246,0.15), 0 24px 80px rgba(0,0,0,0.4)',
                }}
              >
                {/* Chat header */}
                <div style={{
                  padding: '18px 24px',
                  borderBottom: '1px solid rgba(42,42,62,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(28,28,46,0.5)',
                }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px',
                    boxShadow: '0 0 16px rgba(139,92,246,0.4)',
                  }}>
                    🤖
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 700, color: 'white' }}>
                      CrewAI
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E' }} />
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#9090A0' }}>
                        Coke Studio Live · Crew of 4
                      </span>
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                    {['#FF5A1F', '#FBBF24', '#22C55E'].map((c, i) => (
                      <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, opacity: 0.6 }} />
                    ))}
                  </div>
                </div>

                {/* Messages */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '340px' }}>
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        gap: '6px',
                      }}
                    >
                      <span style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '11px',
                        color: '#5A5A6A',
                        letterSpacing: '0.04em',
                      }}>
                        {msg.name}
                      </span>
                      <div style={{
                        maxWidth: '85%',
                        padding: '12px 16px',
                        borderRadius: msg.role === 'user'
                          ? '18px 18px 4px 18px'
                          : '18px 18px 18px 4px',
                        background: msg.role === 'user'
                          ? 'rgba(255,90,31,0.85)'
                          : 'rgba(139,92,246,0.15)',
                        border: msg.role === 'user'
                          ? 'none'
                          : '1px solid rgba(139,92,246,0.25)',
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '14px',
                        lineHeight: 1.6,
                        color: 'white',
                      }}>
                        {msg.text}
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#5A5A6A' }}>🤖 CrewAI</span>
                    <div style={{
                      padding: '14px 20px',
                      borderRadius: '18px 18px 18px 4px',
                      background: 'rgba(139,92,246,0.15)',
                      border: '1px solid rgba(139,92,246,0.25)',
                      display: 'flex',
                      gap: '6px',
                      alignItems: 'center',
                    }}>
                      <span className="dot-1" style={{ display: 'block', width: '8px', height: '8px', borderRadius: '50%', background: '#8B5CF6' }} />
                      <span className="dot-2" style={{ display: 'block', width: '8px', height: '8px', borderRadius: '50%', background: '#8B5CF6' }} />
                      <span className="dot-3" style={{ display: 'block', width: '8px', height: '8px', borderRadius: '50%', background: '#8B5CF6' }} />
                    </div>
                  </div>
                </div>

                {/* Input bar */}
                <div style={{
                  padding: '16px 24px',
                  borderTop: '1px solid rgba(42,42,62,0.8)',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                }}>
                  <div style={{
                    flex: 1,
                    background: 'rgba(42,42,62,0.6)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '10px 16px',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '14px',
                    color: '#5A5A6A',
                    userSelect: 'none',
                  }}>
                    Ask CrewAI anything about tonight...
                  </div>
                  <div style={{
                    width: '38px', height: '38px',
                    borderRadius: '10px',
                    background: '#8B5CF6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px',
                    cursor: 'pointer',
                    boxShadow: '0 0 16px rgba(139,92,246,0.4)',
                    flexShrink: 0,
                  }}>
                    ↑
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4 — CTA BANNER
      ═══════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '0 24px 120px', background: '#0F0F1A' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            borderRadius: '32px',
            background: 'linear-gradient(135deg, rgba(255,90,31,0.18) 0%, rgba(255,90,31,0.08) 50%, rgba(139,92,246,0.08) 100%)',
            border: '1px solid rgba(255,90,31,0.25)',
            padding: '80px 64px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Background texture */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'radial-gradient(rgba(255,90,31,0.06) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', top: '-80px', left: '50%',
              transform: 'translateX(-50%)',
              width: '400px', height: '200px',
              background: 'radial-gradient(ellipse, rgba(255,90,31,0.2) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Crew avatars strip */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
                <div style={{ display: 'flex' }}>
                  {['#FF5A1F','#8B5CF6','#22C55E','#3B82F6','#EC4899'].map((c, i) => (
                    <div key={i} style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      background: c,
                      border: '3px solid #0F0F1A',
                      marginLeft: i > 0 ? '-12px' : '0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Syne, sans-serif',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'white',
                      zIndex: 5 - i,
                      position: 'relative',
                    }}>
                      {['AK','SR','MH','ZA','FA'][i]}
                    </div>
                  ))}
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: 'rgba(255,90,31,0.15)',
                    border: '3px solid rgba(255,90,31,0.3)',
                    marginLeft: '-12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#FF5A1F',
                    position: 'relative',
                    zIndex: 0,
                  }}>
                    +400
                  </div>
                </div>
              </div>

              <h2 style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: '48px',
                fontWeight: 800,
                color: 'white',
                letterSpacing: '-0.02em',
                marginBottom: '16px',
                margin: '0 0 16px',
              }}>
                Ready to find your crew?
              </h2>
              <p style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '18px',
                color: '#9090A0',
                marginBottom: '40px',
                lineHeight: 1.6,
              }}>
                Join 2,400+ crews already formed in Lahore. Your people are out there.
              </p>

              <Link
                href="/events"
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '16px 36px',
                  borderRadius: '14px',
                  background: '#FF5A1F',
                  color: 'white',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '17px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 4px 32px rgba(255,90,31,0.4)',
                  letterSpacing: '-0.01em',
                }}
              >
                Get Started Free <span style={{ fontSize: '20px' }}>→</span>
              </Link>

              <p style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                color: '#5A5A6A',
                marginTop: '16px',
              }}>
                No account needed · Free to join · AI-powered matching
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════════ */}
      <footer
        id="about"
        style={{
          background: '#0A0A14',
          borderTop: '1px solid rgba(42,42,62,0.6)',
          padding: '56px 24px 40px',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '40px',
            marginBottom: '48px',
          }}>
            {/* Logo + tagline */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '9px',
                  background: '#FF5A1F',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 800, fontSize: '14px', color: 'white',
                }}>
                  CG
                </div>
                <span style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: '22px',
                  fontWeight: 800,
                  color: 'white',
                  letterSpacing: '-0.02em',
                }}>
                  Crew<span style={{ color: '#FF5A1F' }}>GO</span>
                </span>
              </div>
              <p style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
                color: '#5A5A6A',
                maxWidth: '220px',
                lineHeight: 1.6,
              }}>
                Social event coordination for Lahore. Never go to a concert alone again.
              </p>
            </div>

            {/* Nav links */}
            <div style={{ display: 'flex', gap: '64px', flexWrap: 'wrap' }}>
              <div>
                <div style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#5A5A6A',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '16px',
                }}>
                  Product
                </div>
                {[
                  { label: 'Events', href: '/events' },
                  { label: 'How it works', href: '#how-it-works' },
                  { label: 'Find Crew', href: '/crews' },
                ].map((link) => (
                  <div key={link.label} style={{ marginBottom: '10px' }}>
                    <Link
                      href={link.href}
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '14px',
                        color: '#9090A0',
                        textDecoration: 'none',
                      }}
                    >
                      {link.label}
                    </Link>
                  </div>
                ))}
              </div>
              <div>
                <div style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#5A5A6A',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '16px',
                }}>
                  Company
                </div>
                {[
                  { label: 'About', href: '#about' },
                  { label: 'Privacy', href: '#' },
                  { label: 'Terms', href: '#' },
                ].map((link) => (
                  <div key={link.label} style={{ marginBottom: '10px' }}>
                    <Link
                      href={link.href}
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '14px',
                        color: '#9090A0',
                        textDecoration: 'none',
                      }}
                    >
                      {link.label}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{
            borderTop: '1px solid rgba(42,42,62,0.5)',
            paddingTop: '28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <p style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              color: '#5A5A6A',
              margin: 0,
            }}>
              © 2025 CrewGO. Built for Lahore. Powered by Claude AI.
            </p>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#22C55E',
                boxShadow: '0 0 8px rgba(34,197,94,0.5)',
              }} />
              <span style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '12px',
                color: '#5A5A6A',
              }}>
                All systems operational
              </span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
