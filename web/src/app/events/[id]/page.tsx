'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { eventsApi } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Event {
  id: string;
  title: string;
  category: string;
  venue_name: string;
  venue_address?: string;
  start_datetime: string;
  end_datetime?: string;
  is_free: boolean;
  price_min?: number;
  image_url: string | null;
  description?: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Coke Studio Live Season 17',
    category: 'Music',
    venue_name: 'Alhamra Arts Council',
    venue_address: 'The Mall, Lahore, Punjab 54000',
    start_datetime: '2026-05-20T19:00:00',
    end_datetime: '2026-05-20T23:00:00',
    is_free: false,
    price_min: 500,
    image_url: null,
    description:
      'Experience the magic of Coke Studio live in Lahore! Season 17 brings Pakistan\'s most iconic music platform to the stage — featuring fusion performances, emerging artists, and legendary collaborations you won\'t find anywhere else. Expect powerful vocals, live orchestras, and a night of unforgettable music that blends classical, folk, and contemporary sounds.',
  },
  {
    id: '2',
    title: 'Lahore Food Festival 2026',
    category: 'Food',
    venue_name: 'Packages Mall Ground',
    venue_address: 'Walton Road, Lahore Cantt, Lahore',
    start_datetime: '2026-05-22T12:00:00',
    is_free: true,
    image_url: null,
    description:
      'Lahore\'s biggest food festival returns for 2026! Over 100 food stalls, live cooking demonstrations by top chefs, street food competitions, and international cuisines all under one roof. From traditional desi khana to trendy fusion bites — there\'s something for every palate.',
  },
  {
    id: '3',
    title: 'PSL Fan Zone — Final Match',
    category: 'Sports',
    venue_name: 'Gaddafi Stadium',
    venue_address: 'Ferozepur Road, Gulberg, Lahore',
    start_datetime: '2026-05-25T18:30:00',
    is_free: true,
    image_url: null,
    description:
      'The PSL final is here and Lahore is ready! Join thousands of cricket fans at the official PSL Fan Zone for live screening, live performances, and electrifying atmosphere. Giant screens, food stalls, and non-stop entertainment before and after the match.',
  },
  {
    id: '4',
    title: 'Art Lahore Contemporary Fair',
    category: 'Art',
    venue_name: 'Expo Centre Lahore',
    venue_address: 'Johar Town, Lahore, Punjab',
    start_datetime: '2026-05-28T10:00:00',
    is_free: false,
    price_min: 200,
    image_url: null,
    description:
      'Pakistan\'s leading contemporary art fair brings together galleries, collectors, and artists from across South Asia. Discover emerging Pakistani talent, established masters, and international exhibitors in a curated showcase spanning painting, sculpture, digital art, and installation.',
  },
  {
    id: '5',
    title: 'TechFest Lahore 2026',
    category: 'Tech',
    venue_name: 'LUMS Campus',
    venue_address: 'DHA, Lahore Cantt, Lahore',
    start_datetime: '2026-06-01T09:00:00',
    is_free: false,
    price_min: 300,
    image_url: null,
    description:
      'TechFest Lahore is back — bigger than ever! Pakistan\'s premier technology festival features keynote talks from industry leaders, startup pitches, hackathons, workshops, and exhibitions. Whether you\'re a developer, founder, or tech enthusiast, this is the event of the year.',
  },
  {
    id: '6',
    title: 'Stand Up Night — Lahore Edition',
    category: 'Comedy',
    venue_name: 'Alchemy, DHA Phase 6',
    venue_address: 'Phase 6, DHA, Lahore',
    start_datetime: '2026-05-31T20:00:00',
    is_free: false,
    price_min: 800,
    image_url: null,
    description:
      'A night of pure laughter featuring Lahore\'s best and brightest stand-up comedians. Expect sharp wit, relatable observations about Pakistani life, and some absolutely unfiltered comedy. Doors open at 7:30 PM — seats are limited, grab yours before they\'re gone!',
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  Music:   'linear-gradient(135deg, #1a0a2e 0%, #3d1a6b 100%)',
  Food:    'linear-gradient(135deg, #1a0e00 0%, #5a3000 100%)',
  Sports:  'linear-gradient(135deg, #001a0e 0%, #005a30 100%)',
  Art:     'linear-gradient(135deg, #1a001a 0%, #5a005a 100%)',
  Tech:    'linear-gradient(135deg, #001a2e 0%, #003d6b 100%)',
  Comedy:  'linear-gradient(135deg, #1a1a00 0%, #5a5000 100%)',
  default: 'linear-gradient(135deg, #1C1C2E 0%, #252535 100%)',
};

const CAT_EMOJI: Record<string, string> = {
  Music:   '🎵',
  Food:    '🍕',
  Sports:  '⚽',
  Art:     '🎨',
  Tech:    '💻',
  Comedy:  '😂',
  default: '🎭',
};

// Mock crew suggestions
const SUGGESTED_CREW = [
  { id: 'a', name: 'Hasan A.', interests: 3, color: '#FF5A1F', initial: 'H' },
  { id: 'b', name: 'Zara K.',  interests: 5, color: '#8B5CF6', initial: 'Z' },
  { id: 'c', name: 'Ali R.',   interests: 2, color: '#22C55E', initial: 'A' },
  { id: 'd', name: 'Fatima N.',interests: 4, color: '#F59E0B', initial: 'F' },
];

// Mock interested avatars
const INTERESTED_AVATARS = [
  { initial: 'U', color: '#FF5A1F' },
  { initial: 'S', color: '#8B5CF6' },
  { initial: 'M', color: '#22C55E' },
  { initial: 'R', color: '#F59E0B' },
  { initial: 'A', color: '#3B82F6' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [event, setEvent] = useState<Event>(
    MOCK_EVENTS.find((e) => e.id === id) ?? MOCK_EVENTS[0]
  );
  const [descExpanded, setDescExpanded] = useState(false);
  const [interested, setInterested] = useState(false);
  const [interestLoading, setInterestLoading] = useState(false);

  const gradient = CAT_COLORS[event.category] ?? CAT_COLORS.default;
  const emoji    = CAT_EMOJI[event.category]  ?? CAT_EMOJI.default;

  const description = event.description ?? '';
  const shortDesc   = description.slice(0, 200);
  const needsTruncate = description.length > 200;

  // Try real API in background
  useEffect(() => {
    if (!id) return;
    eventsApi
      .get(id)
      .then((res) => {
        if (res.data?.data) setEvent(res.data.data);
      })
      .catch(() => {
        // keep mock data
      });
  }, [id]);

  async function handleInterest() {
    if (interested || interestLoading) return;
    setInterestLoading(true);
    try {
      await eventsApi.interest(id);
    } catch {
      // silently accept — optimistic UI
    } finally {
      setInterested(true);
      setInterestLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F0F1A', paddingBottom: 100 }}>

      {/* ── Back Button ── */}
      <div style={{ position: 'relative', zIndex: 10, padding: '16px 24px 0' }}>
        <button
          onClick={() => router.push('/events')}
          style={{
            background: 'none',
            border: 'none',
            color: '#9090A0',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 0',
            transition: 'color 0.2s ease',
            fontFamily: 'DM Sans, sans-serif',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#FF5A1F')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#9090A0')}
        >
          ← Back to Events
        </button>
      </div>

      {/* ── Hero ── */}
      <div style={{ position: 'relative', height: 320, marginTop: 0, overflow: 'hidden' }}>
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
              fontSize: 80,
            }}
          >
            {emoji}
          </div>
        )}
        {/* Bottom fade overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 160,
            background: 'linear-gradient(to top, #0F0F1A 0%, transparent 100%)',
          }}
        />
      </div>

      {/* ── Floating Content Card ── */}
      <div
        style={{
          maxWidth: 860,
          margin: '-40px auto 0',
          padding: '0 24px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div
          style={{
            background: '#1C1C2E',
            border: '1px solid #2A2A3E',
            borderRadius: 24,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '32px 32px 0' }}>

            {/* ── 1. Title + Badges ── */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                <span
                  style={{
                    background: '#FF5A1F',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: 999,
                  }}
                >
                  {event.category}
                </span>
                {event.is_free ? (
                  <span
                    style={{
                      background: 'rgba(34,197,94,0.15)',
                      color: '#22C55E',
                      border: '1px solid rgba(34,197,94,0.3)',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '4px 12px',
                      borderRadius: 999,
                    }}
                  >
                    FREE ENTRY
                  </span>
                ) : event.price_min ? (
                  <span
                    style={{
                      background: 'rgba(255,90,31,0.1)',
                      color: '#FF5A1F',
                      border: '1px solid rgba(255,90,31,0.2)',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '4px 12px',
                      borderRadius: 999,
                    }}
                  >
                    From PKR {event.price_min.toLocaleString()}
                  </span>
                ) : null}
              </div>

              <h1
                style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: 'clamp(22px, 4vw, 28px)',
                  fontWeight: 800,
                  color: '#fff',
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                }}
              >
                {event.title}
              </h1>
            </div>

            {/* ── Divider ── */}
            <div style={{ height: 1, background: '#2A2A3E', marginBottom: 24 }} />

            {/* ── 2. Info Grid ── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 16,
                marginBottom: 28,
              }}
            >
              {[
                { icon: '📅', label: 'Date',  value: formatDate(event.start_datetime) },
                { icon: '🕐', label: 'Time',  value: formatTime(event.start_datetime) },
                { icon: '📍', label: 'Venue', value: event.venue_name },
              ].map(({ icon, label, value }) => (
                <div
                  key={label}
                  style={{
                    background: '#252535',
                    border: '1px solid #2A2A3E',
                    borderRadius: 12,
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 11, color: '#9090A0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 14, color: '#fff', fontWeight: 500, lineHeight: 1.3 }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* ── 3. Description ── */}
            {description && (
              <div style={{ marginBottom: 28 }}>
                <h2
                  style={{
                    fontFamily: 'Syne, sans-serif',
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#fff',
                    marginBottom: 10,
                  }}
                >
                  About this Event
                </h2>
                <p style={{ fontSize: 14, color: '#9090A0', lineHeight: 1.7 }}>
                  {needsTruncate && !descExpanded ? `${shortDesc}…` : description}
                </p>
                {needsTruncate && (
                  <button
                    onClick={() => setDescExpanded((v) => !v)}
                    style={{
                      marginTop: 8,
                      background: 'none',
                      border: 'none',
                      color: '#FF5A1F',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    {descExpanded ? 'Show less ↑' : 'Show more ↓'}
                  </button>
                )}
              </div>
            )}

            {/* ── Divider ── */}
            <div style={{ height: 1, background: '#2A2A3E', marginBottom: 28 }} />

            {/* ── 5. Who's Interested ── */}
            <div style={{ marginBottom: 28 }}>
              <h2
                style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#fff',
                  marginBottom: 14,
                }}
              >
                Who&apos;s Interested
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Overlapping avatars */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {INTERESTED_AVATARS.map((av, i) => (
                    <div
                      key={i}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: av.color,
                        border: '2px solid #1C1C2E',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#fff',
                        marginLeft: i === 0 ? 0 : -10,
                        zIndex: INTERESTED_AVATARS.length - i,
                        position: 'relative',
                      }}
                    >
                      {av.initial}
                    </div>
                  ))}
                </div>
                <span style={{ fontSize: 14, color: '#9090A0' }}>
                  <span style={{ color: '#fff', fontWeight: 600 }}>+24 people</span> are interested
                </span>
              </div>
            </div>

            {/* ── 6. Suggested Crew ── */}
            <div style={{ marginBottom: 28 }}>
              <h2
                style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#fff',
                  marginBottom: 6,
                }}
              >
                Suggested Crew for You
              </h2>
              <p style={{ fontSize: 13, color: '#9090A0', marginBottom: 14 }}>
                People going to this event with shared interests
              </p>

              {/* Horizontal scroll */}
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  overflowX: 'auto',
                  paddingBottom: 4,
                  scrollbarWidth: 'none',
                }}
              >
                {SUGGESTED_CREW.map((person) => (
                  <div
                    key={person.id}
                    style={{
                      flexShrink: 0,
                      width: 160,
                      background: '#252535',
                      border: '1px solid #2A2A3E',
                      borderRadius: 16,
                      padding: '16px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'border-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,90,31,0.3)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#2A2A3E')}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: person.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#fff',
                      }}
                    >
                      {person.initial}
                    </div>

                    {/* Name */}
                    <div
                      style={{
                        fontFamily: 'Syne, sans-serif',
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#fff',
                        textAlign: 'center',
                      }}
                    >
                      {person.name}
                    </div>

                    {/* Interests badge */}
                    <div
                      style={{
                        background: 'rgba(139,92,246,0.12)',
                        border: '1px solid rgba(139,92,246,0.2)',
                        color: '#8B5CF6',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 999,
                        textAlign: 'center',
                      }}
                    >
                      {person.interests} shared interests
                    </div>

                    {/* Invite button */}
                    <button
                      style={{
                        width: '100%',
                        padding: '7px 0',
                        background: 'transparent',
                        border: '1px solid rgba(255,90,31,0.4)',
                        color: '#FF5A1F',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: 'DM Sans, sans-serif',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = '#FF5A1F';
                        (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                        (e.currentTarget as HTMLButtonElement).style.color = '#FF5A1F';
                      }}
                    >
                      Invite
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Divider ── */}
            <div style={{ height: 1, background: '#2A2A3E', marginBottom: 28 }} />

            {/* ── 8. About the Venue ── */}
            <div style={{ paddingBottom: 32 }}>
              <h2
                style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#fff',
                  marginBottom: 14,
                }}
              >
                About the Venue
              </h2>

              <div
                style={{
                  background: '#252535',
                  border: '1px solid #2A2A3E',
                  borderRadius: 16,
                  overflow: 'hidden',
                }}
              >
                {/* Map placeholder */}
                <div
                  style={{
                    height: 140,
                    background: 'linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Grid pattern */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: 'linear-gradient(rgba(255,90,31,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,90,31,0.05) 1px, transparent 1px)',
                      backgroundSize: '32px 32px',
                    }}
                  />
                  <span style={{ fontSize: 32, position: 'relative', zIndex: 1 }}>📍</span>
                  <span
                    style={{
                      fontSize: 12,
                      color: '#9090A0',
                      position: 'relative',
                      zIndex: 1,
                      fontWeight: 500,
                    }}
                  >
                    Map View
                  </span>
                </div>

                {/* Venue info */}
                <div style={{ padding: '16px 20px' }}>
                  <div
                    style={{
                      fontFamily: 'Syne, sans-serif',
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#fff',
                      marginBottom: 4,
                    }}
                  >
                    {event.venue_name}
                  </div>
                  {event.venue_address && (
                    <div style={{ fontSize: 13, color: '#9090A0' }}>
                      📍 {event.venue_address}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>{/* /inner padding */}
        </div>{/* /floating card */}
      </div>{/* /container */}

      {/* ── Sticky Bottom Bar ── */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: '12px 24px',
          background: 'rgba(15,15,26,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(42,42,62,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        {/* Event name — left */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {event.title}
          </div>
          <div style={{ fontSize: 12, color: '#9090A0', marginTop: 1 }}>
            {event.venue_name}
          </div>
        </div>

        {/* Buttons — right */}
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          {/* I'm Interested */}
          <button
            onClick={handleInterest}
            disabled={interestLoading}
            style={{
              padding: '10px 18px',
              borderRadius: 12,
              background: interested ? 'rgba(34,197,94,0.15)' : '#FF5A1F',
              color: interested ? '#22C55E' : '#fff',
              border: interested ? '1px solid rgba(34,197,94,0.4)' : 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: interested ? 'default' : 'pointer',
              fontFamily: 'Syne, sans-serif',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap',
              boxShadow: interested ? 'none' : '0 0 20px rgba(255,90,31,0.25)',
              opacity: interestLoading ? 0.7 : 1,
            }}
          >
            {interested ? 'Going! ✓' : interestLoading ? '...' : "I'm Interested ⚡"}
          </button>

          {/* Create Crew */}
          <button
            onClick={() => router.push(`/crews/create?event=${id}`)}
            style={{
              padding: '10px 18px',
              borderRadius: 12,
              background: 'transparent',
              color: '#FF5A1F',
              border: '1px solid rgba(255,90,31,0.5)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Syne, sans-serif',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,90,31,0.1)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#FF5A1F';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,90,31,0.5)';
            }}
          >
            Create Crew
          </button>
        </div>
      </div>

    </div>
  );
}
