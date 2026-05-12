'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(15,15,26,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(42,42,62,0.8)' : '1px solid transparent',
        transition: 'all 0.3s ease',
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none' }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>
          Crew<span style={{ color: '#FF5A1F' }}>GO</span>
        </span>
      </Link>

      {/* Desktop nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <Link href="/events" style={{ color: '#9090A0', fontWeight: 500, fontSize: '15px', textDecoration: 'none', transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'white')}
          onMouseLeave={e => (e.currentTarget.style.color = '#9090A0')}>
          Events
        </Link>
        <Link href="/crews" style={{ color: '#9090A0', fontWeight: 500, fontSize: '15px', textDecoration: 'none', transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'white')}
          onMouseLeave={e => (e.currentTarget.style.color = '#9090A0')}>
          My Crews
        </Link>
        <Link href="/events"
          style={{
            background: '#FF5A1F', color: 'white', padding: '10px 20px',
            borderRadius: '10px', fontWeight: 600, fontSize: '14px',
            textDecoration: 'none', transition: 'all 0.2s',
            boxShadow: '0 0 20px rgba(255,90,31,0.3)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#E04010'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FF5A1F'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>
          Get Started
        </Link>
      </div>
    </nav>
  );
}
