'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { eventsApi } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Event {
  id: string;
  title: string;
  category: string;
  venue_name: string;
  start_datetime: string;
  is_free: boolean;
  price_min?: number;
  image_url: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Music', 'Food', 'Sports', 'Art', 'Tech', 'Fitness', 'Comedy', 'Gaming'];

const CAT_COLORS: Record<string, string> = {
  Music:   'linear-gradient(135deg, #1a0a2e 0%, #3d1a6b 100%)',
  Food:    'linear-gradient(135deg, #1a0e00 0%, #5a3000 100%)',
  Sports:  'linear-gradient(135deg, #001a0e 0%, #005a30 100%)',
  Art:     'linear-gradient(135deg, #1a001a 0%, #5a005a 100%)',
  Tech:    'linear-gradient(135deg, #001a2e 0%, #003d6b 100%)',
  Comedy:  'linear-gradient(135deg, #1a1a00 0%, #5a5000 100%)',
  Fitness: 'linear-gradient(135deg, #1a0a00 0%, #5a2000 100%)',
  Gaming:  'linear-gradient(135deg, #001a1a 0%, #005050 100%)',
  default: 'linear-gradient(135deg, #1C1C2E 0%, #252535 100%)',
};

const CAT_EMOJI: Record<string, string> = {
  Music:   '🎵',
  Food:    '🍕',
  Sports:  '⚽',
  Art:     '🎨',
  Tech:    '💻',
  Comedy:  '😂',
  Fitness: '💪',
  Gaming:  '🎮',
  default: '🎭',
};

const MOCK_EVENTS: Event[] = [
  { id: '1', title: 'Coke Studio Live Season 17',       category: 'Music',  venue_name: 'Alhamra Arts Council',    start_datetime: '2026-05-20T19:00:00', is_free: false, price_min: 500, image_url: null },
  { id: '2', title: 'Lahore Food Festival 2026',         category: 'Food',   venue_name: 'Packages Mall Ground',    start_datetime: '2026-05-22T12:00:00', is_free: true,  image_url: null },
  { id: '3', title: 'PSL Fan Zone — Final Match',        category: 'Sports', venue_name: 'Gaddafi Stadium',         start_datetime: '2026-05-25T18:30:00', is_free: true,  image_url: null },
  { id: '4', title: 'Art Lahore Contemporary Fair',      category: 'Art',    venue_name: 'Expo Centre Lahore',      start_datetime: '2026-05-28T10:00:00', is_free: false, price_min: 200, image_url: null },
  { id: '5', title: 'TechFest Lahore 2026',              category: 'Tech',   venue_name: 'LUMS Campus',             start_datetime: '2026-06-01T09:00:00', is_free: false, price_min: 300, image_url: null },
  { id: '6', title: 'Stand Up Night — Lahore Edition',  category: 'Comedy', venue_name: 'Alchemy, DHA Phase 6',    start_datetime: '2026-05-31T20:00:00', is_free: false, price_min: 800, image_url: null },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        background: '#1C1C2E',
        border: '1px solid #2A2A3E',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <div className="shimmer" style={{ height: 160 }} />
      <div style={{ padding: '16px' }}>
        <div className="shimmer" style={{ height: 14, borderRadius: 6, marginBottom: 10, width: '80%' }} />
        <div className="shimmer" style={{ height: 14, borderRadius: 6, marginBottom: 6, width: '60%' }} />
        <div className="shimmer" style={{ height: 12, borderRadius: 6, marginBottom: 4, width: '70%' }} />
        <div className="shimmer" style={{ height: 12, borderRadius: 6, marginBottom: 16, width: '50%' }} />
        <div className="shimmer" style={{ height: 40, borderRadius: 12 }} />
      </div>
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ event }: { event: Event }) {
  const router = useRouter();
  const gradient = CAT_COLORS[event.category] ?? CAT_COLORS.default;
  const emoji = CAT_EMOJI[event.category] ?? CAT_EMOJI.default;

  return (
    <div
      className="card-hover"
      onClick={() => router.push(`/events/${event.id}`)}
      style={{
        background: '#1C1C2E',
        border: '1px solid #2A2A3E',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Image / Gradient area */}
      <div style={{ position: 'relative', height: 160, flexShrink: 0 }}>
        {event.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.image_url}
            alt={event.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
            }}
          >
            {emoji}
          </div>
        )}

        {/* Bottom overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            background: 'linear-gradient(to top, rgba(28,28,46,0.9), transparent)',
          }}
        />

        {/* FREE badge — top left */}
        {event.is_free && (
          <span
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              background: '#22C55E',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 999,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            FREE
          </span>
        )}

        {/* Category badge — top right */}
        <span
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: '#FF5A1F',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: 999,
          }}
        >
          {event.category}
        </span>
      </div>

      {/* Card body */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Title */}
        <h3
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 16,
            fontWeight: 700,
            color: '#fff',
            marginBottom: 10,
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {event.title}
        </h3>

        {/* Venue */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: '#9090A0',
            fontSize: 13,
            marginBottom: 6,
          }}
        >
          <span>📍</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {event.venue_name}
          </span>
        </div>

        {/* Date/Time */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: '#9090A0',
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          <span>🕐</span>
          <span>{formatDate(event.start_datetime)} · {formatTime(event.start_datetime)}</span>
        </div>

        {/* Price */}
        {!event.is_free && event.price_min && (
          <div style={{ marginBottom: 12, fontSize: 12, color: '#9090A0' }}>
            From{' '}
            <span style={{ color: '#FF5A1F', fontWeight: 600 }}>PKR {event.price_min.toLocaleString()}</span>
          </div>
        )}

        {/* CTA Button */}
        <button
          style={{
            marginTop: 'auto',
            width: '100%',
            padding: '11px 0',
            background: '#FF5A1F',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'Syne, sans-serif',
            cursor: 'pointer',
            transition: 'opacity 0.2s ease',
            letterSpacing: '0.01em',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.85')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/events/${event.id}`);
          }}
        >
          Join Crew →
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      setLoading(true);
      try {
        const params = selectedCategory !== 'All' ? { category: selectedCategory } : {};
        const res = await eventsApi.list(params);
        if (!cancelled && res.data?.data) {
          setEvents(res.data.data);
        }
      } catch {
        // silently keep mock data on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // Show mock data immediately for instant perceived performance
    const filtered =
      selectedCategory === 'All'
        ? MOCK_EVENTS
        : MOCK_EVENTS.filter((e) => e.category === selectedCategory);
    setEvents(filtered);

    // Then try to fetch real data in background
    fetchEvents();

    return () => { cancelled = true; };
  }, [selectedCategory]);

  const displayedEvents = loading && events.length === 0 ? [] : events;

  return (
    <div style={{ minHeight: '100vh', background: '#0F0F1A' }}>
      <Navbar />

      {/* Ambient glow orbs */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '10%',
            left: '5%',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,90,31,0.07) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '40%',
            right: '8%',
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1280,
          margin: '0 auto',
          padding: '48px 24px 80px',
        }}
      >
        {/* ── Header ── */}
        <div style={{ marginBottom: 40 }} className="slide-up">
          {/* Location chip */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#1C1C2E',
              border: '1px solid #2A2A3E',
              borderRadius: 999,
              padding: '6px 14px',
              fontSize: 13,
              color: '#9090A0',
              marginBottom: 20,
            }}
          >
            📍 Lahore, Pakistan
          </div>

          <h1
            style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.1,
              marginBottom: 12,
              letterSpacing: '-0.02em',
            }}
          >
            Discover Events
          </h1>
          <p style={{ fontSize: 16, color: '#9090A0', fontWeight: 400 }}>
            What&apos;s happening in Lahore this week
          </p>
        </div>

        {/* ── Category Filter ── */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
            marginBottom: 40,
            scrollbarWidth: 'none',
          }}
          className="slide-up"
        >
          {CATEGORIES.map((cat) => {
            const active = cat === selectedCategory;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  flexShrink: 0,
                  padding: '8px 16px',
                  borderRadius: 999,
                  border: active ? 'none' : '1px solid #2A2A3E',
                  background: active ? '#FF5A1F' : '#252535',
                  color: active ? '#fff' : '#9090A0',
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'DM Sans, sans-serif',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#FF5A1F';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.color = '#9090A0';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#2A2A3E';
                  }
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* ── Events Grid ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 24,
          }}
        >
          {loading && displayedEvents.length === 0
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : displayedEvents.map((event, i) => (
                <div
                  key={event.id}
                  className="scale-in"
                  style={{ animationDelay: `${i * 60}ms`, opacity: 0, animationFillMode: 'forwards' }}
                >
                  <EventCard event={event} />
                </div>
              ))}
        </div>

        {/* Empty state */}
        {!loading && displayedEvents.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 24px',
              color: '#9090A0',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎭</div>
            <h3
              style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: 20,
                color: '#fff',
                marginBottom: 8,
              }}
            >
              No events in this category yet
            </h3>
            <p style={{ fontSize: 14 }}>Check back soon or explore another category</p>
          </div>
        )}
      </div>
    </div>
  );
}
