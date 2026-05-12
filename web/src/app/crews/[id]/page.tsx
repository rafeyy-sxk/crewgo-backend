'use client';

import Navbar from '@/components/Navbar';
import { chatApi } from '@/lib/api';
import { useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type SystemMessage = {
  id: string;
  type: 'system';
  content: string;
  time: string;
};

type AiMessage = {
  id: string;
  type: 'ai';
  content: string;
  time: string;
};

type UserMessage = {
  id: string;
  type?: never;
  sender: string;
  initials: string;
  color: string;
  content: string;
  time: string;
  isMe: boolean;
};

type Message = SystemMessage | AiMessage | UserMessage;

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_MESSAGES: Message[] = [
  { id: '1', type: 'system', content: '🎉 Hasan formed this crew for Coke Studio Live', time: '7:00 PM' },
  { id: '2', sender: 'Hasan', initials: 'HA', color: '#FF5A1F', content: 'Hey everyone! Super excited for tonight 🔥', time: '7:02 PM', isMe: false },
  { id: '3', sender: 'Zara', initials: 'ZK', color: '#8B5CF6', content: 'Same! Which gate are we meeting at?', time: '7:03 PM', isMe: false },
  { id: '4', sender: 'You', initials: 'ME', color: '#22C55E', content: 'I was thinking Gate 3? Closer to the main stage', time: '7:05 PM', isMe: true },
  {
    id: '5', type: 'ai',
    content: "Great choice! Gate 3 at Alhamra is closest to the main stage. I'd suggest meeting 30 mins before the show at 6:30 PM to grab snacks together — there's a great chai stall near the entrance. Hasan and Zara both listed Food in their interests so they'll probably love that 😄",
    time: '7:05 PM',
  },
  { id: '6', sender: 'Hasan', initials: 'HA', color: '#FF5A1F', content: 'CrewAI never misses 😭 6:30 at Gate 3 it is', time: '7:06 PM', isMe: false },
  { id: '7', sender: 'Zara', initials: 'ZK', color: '#8B5CF6', content: 'Perfect! See you all there 🎵', time: '7:07 PM', isMe: false },
];

const MOCK_CREWS = [
  { id: '1', name: 'Music Lovers Crew', event: 'Coke Studio Live', preview: 'CrewAI never misses 😭', active: true, unread: false },
  { id: '2', name: 'Food Crew', event: 'Lahore Food Festival', preview: 'Anyone tried the BBQ stall?', active: false, unread: true },
  { id: '3', name: 'Sports Squad', event: 'PSL Final 2025', preview: 'Match starts at 7 PM!', active: false, unread: false },
];

const MOCK_MEMBERS = [
  { name: 'Hasan Ali', initials: 'HA', color: '#FF5A1F', status: 'going' },
  { name: 'Zara Khan', initials: 'ZK', color: '#8B5CF6', status: 'going' },
  { name: 'Bilal R.', initials: 'BR', color: '#06B6D4', status: 'going' },
  { name: 'You', initials: 'ME', color: '#22C55E', status: 'going' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 0' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#8B5CF6',
            display: 'inline-block',
            animation: `crewDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function SystemMsg({ msg }: { msg: SystemMessage }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, #2A2A3E)' }} />
      <span style={{ color: '#9090A0', fontSize: 12, fontStyle: 'italic', whiteSpace: 'nowrap', fontFamily: 'DM Sans, sans-serif' }}>
        {msg.content}
      </span>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, #2A2A3E)' }} />
    </div>
  );
}

function AiBubble({ msg, isTyping }: { msg?: AiMessage; isTyping?: boolean }) {
  return (
    <div style={{ margin: '16px 0', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 12px rgba(139,92,246,0.5)',
          fontSize: 12,
        }}>
          ✦
        </div>
        <span style={{
          fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700,
          color: '#A78BFA', letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          CrewAI
        </span>
        <span style={{
          fontSize: 10, color: '#6D5FA0', background: 'rgba(139,92,246,0.1)',
          border: '1px solid rgba(139,92,246,0.2)', borderRadius: 4,
          padding: '1px 6px', fontFamily: 'DM Sans, sans-serif',
        }}>
          Powered by Claude
        </span>
      </div>

      {/* Bubble */}
      <div style={{
        background: 'rgba(139,92,246,0.08)',
        border: '1px solid rgba(139,92,246,0.22)',
        borderRadius: 16,
        borderTopLeftRadius: 4,
        padding: '14px 18px',
        boxShadow: '0 0 28px rgba(139,92,246,0.12), inset 0 1px 0 rgba(139,92,246,0.15)',
        backdropFilter: 'blur(8px)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle shimmer stripe */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(to right, transparent, rgba(139,92,246,0.4), transparent)',
        }} />

        {isTyping
          ? <TypingDots />
          : (
            <p style={{
              margin: 0, color: 'rgba(230,220,255,0.92)', fontSize: 14,
              lineHeight: '1.65', fontFamily: 'DM Sans, sans-serif', fontWeight: 400,
            }}>
              {msg?.content}
            </p>
          )}
      </div>

      {/* Reactions */}
      {!isTyping && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6, paddingLeft: 2 }}>
          {['👍', '👎'].map((icon) => (
            <button
              key={icon}
              style={{
                background: 'none', border: '1px solid #2A2A3E', borderRadius: 6,
                padding: '2px 8px', fontSize: 13, cursor: 'pointer', color: '#9090A0',
                transition: 'all 0.15s', fontFamily: 'DM Sans, sans-serif',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(139,92,246,0.4)';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.08)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#2A2A3E';
                (e.currentTarget as HTMLButtonElement).style.background = 'none';
              }}
            >
              {icon}
            </button>
          ))}
          <span style={{ fontSize: 11, alignSelf: 'center', paddingLeft: 4, fontFamily: 'DM Sans, sans-serif', color: '#606070' }}>
            {msg?.time}
          </span>
        </div>
      )}
    </div>
  );
}

function OtherBubble({ msg }: { msg: UserMessage }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start', maxWidth: '70%' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', background: msg.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0,
        fontFamily: 'DM Sans, sans-serif', marginTop: 16,
        boxShadow: `0 0 10px ${msg.color}55`,
      }}>
        {msg.initials}
      </div>
      <div>
        <div style={{ color: '#9090A0', fontSize: 12, marginBottom: 4, fontFamily: 'DM Sans, sans-serif', paddingLeft: 2 }}>
          {msg.sender}
        </div>
        <div style={{
          background: '#252535', borderRadius: 18, borderBottomLeftRadius: 4,
          padding: '10px 14px', color: 'white', fontSize: 14,
          fontFamily: 'DM Sans, sans-serif', lineHeight: '1.5',
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          {msg.content}
        </div>
        <div style={{ color: '#9090A0', fontSize: 11, marginTop: 4, paddingLeft: 2, fontFamily: 'DM Sans, sans-serif' }}>
          {msg.time}
        </div>
      </div>
    </div>
  );
}

function MyBubble({ msg }: { msg: UserMessage }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
      <div style={{ maxWidth: '70%' }}>
        <div style={{
          background: '#FF5A1F', borderRadius: 18, borderBottomRightRadius: 4,
          padding: '10px 14px', color: 'white', fontSize: 14,
          fontFamily: 'DM Sans, sans-serif', lineHeight: '1.5',
          boxShadow: '0 4px 16px rgba(255,90,31,0.25)',
        }}>
          {msg.content}
        </div>
        <div style={{ color: '#9090A0', fontSize: 11, marginTop: 4, textAlign: 'right', fontFamily: 'DM Sans, sans-serif' }}>
          {msg.time}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CrewChatPage() {
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [aiMode, setAiMode] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

  const now = () =>
    new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const handleSendRegular = () => {
    const text = inputText.trim();
    if (!text) return;
    const newMsg: UserMessage = {
      id: Date.now().toString(),
      sender: 'You',
      initials: 'ME',
      color: '#22C55E',
      content: text,
      time: now(),
      isMe: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;

    if (!aiMode) {
      handleSendRegular();
      return;
    }

    // AI mode
    const userMsg: UserMessage = {
      id: Date.now().toString(),
      sender: 'You',
      initials: 'ME',
      color: '#22C55E',
      content: text,
      time: now(),
      isMe: true,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsAiTyping(true);

    try {
      const res = await chatApi.askAI('mock-crew-id', text);
      const reply = res.data?.data?.message || res.data?.message || 'Here\'s what I found for your crew!';
      const aiMsg: AiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: reply,
        time: now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const fallback: AiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I'm having trouble connecting right now, but I'll be back shortly! In the meantime, enjoy coordinating with your crew 🎶",
        time: now(),
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Global keyframe injection */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes crewDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1; }
        }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes aiPulse {
          0%, 100% { box-shadow: 0 0 28px rgba(139,92,246,0.12), inset 0 1px 0 rgba(139,92,246,0.15); }
          50%       { box-shadow: 0 0 40px rgba(139,92,246,0.2),  inset 0 1px 0 rgba(139,92,246,0.2); }
        }

        .crew-msg-enter {
          animation: fadeSlideUp 0.25s ease forwards;
        }

        .crew-scroll::-webkit-scrollbar { width: 4px; }
        .crew-scroll::-webkit-scrollbar-track { background: transparent; }
        .crew-scroll::-webkit-scrollbar-thumb { background: #2A2A3E; border-radius: 2px; }

        .crew-input:focus { outline: none; }

        .crew-sidebar-scroll::-webkit-scrollbar { width: 3px; }
        .crew-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .crew-sidebar-scroll::-webkit-scrollbar-thumb { background: #2A2A3E; border-radius: 2px; }
      `}</style>

      {/* Root */}
      <div style={{
        minHeight: '100vh', height: '100vh',
        background: '#0F0F1A',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'DM Sans, sans-serif',
        color: 'white',
        overflow: 'hidden',
      }}>
        <Navbar />

        {/* Body below navbar */}
        <div style={{
          display: 'flex', flex: 1, overflow: 'hidden',
          marginTop: 64, // navbar height
        }}>

          {/* ── LEFT SIDEBAR ──────────────────────────────────────────────── */}
          <aside style={{
            width: 240, flexShrink: 0,
            background: '#1C1C2E',
            borderRight: '1px solid #2A2A3E',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}
            className="crew-sidebar-scroll"
          >
            <div style={{ padding: '20px 16px 12px' }}>
              <span style={{
                fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700,
                color: '#9090A0', letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>
                My Crews
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }} className="crew-sidebar-scroll">
              {MOCK_CREWS.map((crew) => (
                <div
                  key={crew.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px',
                    background: crew.active ? '#252535' : 'transparent',
                    borderLeft: `3px solid ${crew.active ? '#FF5A1F' : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    if (!crew.active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                  }}
                  onMouseLeave={e => {
                    if (!crew.active) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {/* Crew avatar placeholder */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: crew.active
                      ? 'linear-gradient(135deg, #FF5A1F44, #FF5A1F22)'
                      : 'linear-gradient(135deg, #252535, #1C1C2E)',
                    border: `1px solid ${crew.active ? '#FF5A1F55' : '#2A2A3E'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16,
                  }}>
                    {crew.id === '1' ? '🎵' : crew.id === '2' ? '🍜' : '⚽'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: crew.active ? 'white' : '#C0C0D0',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {crew.name}
                    </div>
                    <div style={{
                      fontSize: 11, color: '#9090A0',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      marginTop: 1,
                    }}>
                      {crew.event}
                    </div>
                    <div style={{
                      fontSize: 11, color: '#606070',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      marginTop: 2,
                    }}>
                      {crew.preview}
                    </div>
                  </div>

                  {crew.unread && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#FF5A1F', flexShrink: 0,
                      boxShadow: '0 0 8px rgba(255,90,31,0.6)',
                    }} />
                  )}
                </div>
              ))}
            </div>
          </aside>

          {/* ── MAIN CHAT AREA ────────────────────────────────────────────── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Chat Header */}
            <div style={{
              height: 64, flexShrink: 0,
              background: 'rgba(28,28,46,0.8)',
              backdropFilter: 'blur(16px)',
              borderBottom: '1px solid #2A2A3E',
              display: 'flex', alignItems: 'center',
              padding: '0 20px', gap: 16,
              position: 'sticky', top: 0, zIndex: 10,
            }}>
              {/* Left: Back + Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                <button style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#9090A0', fontSize: 18, padding: '4px 8px',
                  borderRadius: 8, transition: 'all 0.15s',
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'white';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'none';
                    (e.currentTarget as HTMLButtonElement).style.color = '#9090A0';
                  }}
                >
                  ←
                </button>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700,
                    color: 'white', lineHeight: 1.2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    Music Lovers Crew
                  </div>
                  <div style={{ fontSize: 13, color: '#9090A0', marginTop: 1 }}>
                    Coke Studio Live
                  </div>
                </div>
              </div>

              {/* Center: Member Avatars */}
              <div style={{ display: 'flex', alignItems: 'center', position: 'relative', height: 32 }}>
                {MOCK_MEMBERS.map((m, i) => (
                  <div
                    key={m.name}
                    title={m.name}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: m.color,
                      border: '2px solid #1C1C2E',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700, color: 'white',
                      marginLeft: i === 0 ? 0 : -8,
                      position: 'relative', zIndex: MOCK_MEMBERS.length - i,
                      boxShadow: `0 0 8px ${m.color}55`,
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    {m.initials}
                  </div>
                ))}
                <span style={{
                  marginLeft: 8, fontSize: 12, color: '#9090A0',
                  fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap',
                }}>
                  4 members
                </span>
              </div>

              {/* Right: Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#9090A0', fontSize: 20, width: 36, height: 36,
                  borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'white';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'none';
                    (e.currentTarget as HTMLButtonElement).style.color = '#9090A0';
                  }}
                >
                  ⋯
                </button>

                <button
                  onClick={() => setAiMode((v) => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: aiMode
                      ? 'linear-gradient(135deg, #8B5CF6, #6D28D9)'
                      : 'rgba(139,92,246,0.12)',
                    border: `1px solid ${aiMode ? 'transparent' : 'rgba(139,92,246,0.35)'}`,
                    borderRadius: 20, padding: '6px 14px', cursor: 'pointer',
                    color: aiMode ? 'white' : '#A78BFA',
                    fontSize: 13, fontWeight: 600,
                    fontFamily: 'Syne, sans-serif',
                    transition: 'all 0.2s',
                    boxShadow: aiMode ? '0 0 20px rgba(139,92,246,0.4)' : 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ fontSize: 12 }}>✦</span>
                  CrewAI
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div
              className="crew-scroll"
              style={{
                flex: 1, overflowY: 'auto',
                padding: '16px 20px',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {messages.map((msg) => {
                if (msg.type === 'system') {
                  return <SystemMsg key={msg.id} msg={msg} />;
                }
                if (msg.type === 'ai') {
                  return (
                    <div key={msg.id} className="crew-msg-enter">
                      <AiBubble msg={msg} />
                    </div>
                  );
                }
                const um = msg as UserMessage;
                if (um.isMe) return (
                  <div key={msg.id} className="crew-msg-enter">
                    <MyBubble msg={um} />
                  </div>
                );
                return (
                  <div key={msg.id} className="crew-msg-enter">
                    <OtherBubble msg={um} />
                  </div>
                );
              })}

              {isAiTyping && (
                <div className="crew-msg-enter">
                  <AiBubble isTyping />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div style={{
              flexShrink: 0,
              background: 'rgba(15,15,26,0.9)',
              backdropFilter: 'blur(16px)',
              borderTop: '1px solid #2A2A3E',
              padding: aiMode ? '8px 16px 12px' : '12px 16px',
            }}>
              {/* AI Mode Banner */}
              {aiMode && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(139,92,246,0.08)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  borderRadius: 10, padding: '6px 12px', marginBottom: 8,
                  animation: 'fadeSlideUp 0.2s ease',
                }}>
                  <span style={{ fontSize: 12, color: '#A78BFA', fontFamily: 'DM Sans, sans-serif' }}>
                    💜 CrewAI Mode — Claude knows your crew &amp; event
                  </span>
                  <button
                    onClick={() => setAiMode(false)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#6060A0', fontSize: 14, lineHeight: 1,
                      padding: '2px 4px', borderRadius: 4,
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#A78BFA'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#6060A0'}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Input Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  flex: 1, position: 'relative',
                  borderRadius: 16,
                  border: `1px solid ${aiMode ? 'rgba(139,92,246,0.45)' : '#2A2A3E'}`,
                  background: '#1C1C2E',
                  boxShadow: aiMode ? '0 0 16px rgba(139,92,246,0.15)' : 'none',
                  transition: 'all 0.2s',
                }}>
                  <input
                    ref={inputRef}
                    className="crew-input"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={aiMode
                      ? 'Ask CrewAI anything about the event...'
                      : 'Message the crew...'}
                    style={{
                      width: '100%', height: 44,
                      background: 'transparent',
                      border: 'none',
                      padding: '0 16px',
                      color: 'white',
                      fontSize: 14,
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  />
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || isAiTyping}
                  style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: aiMode
                      ? (inputText.trim() ? 'linear-gradient(135deg, #8B5CF6, #6D28D9)' : '#252535')
                      : (inputText.trim() ? '#FF5A1F' : '#252535'),
                    border: 'none', cursor: inputText.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: aiMode ? 16 : 18, color: 'white',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                    boxShadow: inputText.trim()
                      ? aiMode
                        ? '0 0 20px rgba(139,92,246,0.4)'
                        : '0 0 16px rgba(255,90,31,0.35)'
                      : 'none',
                  }}
                  onMouseEnter={e => {
                    if (inputText.trim()) {
                      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.06)';
                    }
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                  }}
                >
                  {aiMode ? '✦' : '➤'}
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT SIDEBAR ─────────────────────────────────────────────── */}
          <aside
            className="crew-sidebar-scroll"
            style={{
              width: 280, flexShrink: 0,
              background: '#1C1C2E',
              borderLeft: '1px solid #2A2A3E',
              overflowY: 'auto',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Crew Info */}
            <div style={{ padding: '20px 16px', borderBottom: '1px solid #2A2A3E' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{
                    fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700,
                    color: 'white', marginBottom: 4,
                  }}>
                    Music Lovers Crew
                  </div>
                </div>
                <span style={{
                  background: 'rgba(255,90,31,0.12)', border: '1px solid rgba(255,90,31,0.3)',
                  color: '#FF7A4F', fontSize: 11, padding: '3px 8px', borderRadius: 6,
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 600, whiteSpace: 'nowrap',
                }}>
                  Live Event
                </span>
              </div>

              {/* Mini Event Card */}
              <div style={{
                background: '#252535', border: '1px solid #2A2A3E', borderRadius: 12,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: 72,
                  background: 'linear-gradient(135deg, #FF5A1F22, #8B5CF622)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, borderBottom: '1px solid #2A2A3E',
                }}>
                  🎵
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 2 }}>
                    Coke Studio Live
                  </div>
                  <div style={{ fontSize: 11, color: '#9090A0' }}>Tonight · Alhamra Arts Council</div>
                </div>
              </div>
            </div>

            {/* Members */}
            <div style={{ padding: '16px', borderBottom: '1px solid #2A2A3E' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
              }}>
                <span style={{
                  fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700,
                  color: '#9090A0', letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  Members
                </span>
                <span style={{ fontSize: 12, color: '#FF5A1F', fontWeight: 600 }}>4/6</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {MOCK_MEMBERS.map((m) => (
                  <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: m.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0,
                      boxShadow: `0 0 8px ${m.color}44`,
                    }}>
                      {m.initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'white' }}>{m.name}</div>
                    </div>
                    <span style={{
                      fontSize: 10, color: '#22C55E',
                      background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                      borderRadius: 4, padding: '2px 6px',
                      fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                    }}>
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>

              <button style={{
                marginTop: 12, width: '100%', padding: '8px 0',
                background: 'none', border: '1px solid #2A2A3E', borderRadius: 10,
                color: '#9090A0', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#FF5A1F';
                  (e.currentTarget as HTMLButtonElement).style.color = '#FF5A1F';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#2A2A3E';
                  (e.currentTarget as HTMLButtonElement).style.color = '#9090A0';
                }}
              >
                + Invite More
              </button>
            </div>

            {/* Event Details */}
            <div style={{ padding: '16px', borderBottom: '1px solid #2A2A3E' }}>
              <span style={{
                fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700,
                color: '#9090A0', letterSpacing: '0.08em', textTransform: 'uppercase',
                display: 'block', marginBottom: 12,
              }}>
                Event Details
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>📍</span>
                  <span style={{ fontSize: 13, color: '#C0C0D0', fontFamily: 'DM Sans, sans-serif' }}>
                    Alhamra Arts Council
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>🕖</span>
                  <span style={{ fontSize: 13, color: '#C0C0D0', fontFamily: 'DM Sans, sans-serif' }}>
                    Tonight, 7:00 PM
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>✅</span>
                  <span style={{
                    fontSize: 11, color: '#22C55E',
                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                    borderRadius: 6, padding: '3px 8px',
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                  }}>
                    Confirmed
                  </span>
                </div>
              </div>
            </div>

            {/* Crew Reel */}
            <div style={{ padding: '16px' }}>
              <span style={{
                fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700,
                color: '#9090A0', letterSpacing: '0.08em', textTransform: 'uppercase',
                display: 'block', marginBottom: 10,
              }}>
                Crew Reel
              </span>
              <p style={{
                fontSize: 12, color: '#606070', lineHeight: '1.55',
                fontFamily: 'DM Sans, sans-serif', marginBottom: 12,
              }}>
                Upload your clips after the event to create a crew reel.
              </p>
              <button style={{
                width: '100%', padding: '16px 0',
                background: 'none',
                border: '2px dashed #2A2A3E',
                borderRadius: 12, cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.2s',
                color: '#9090A0',
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.borderColor = 'rgba(139,92,246,0.4)';
                  el.style.background = 'rgba(139,92,246,0.05)';
                  el.style.color = '#A78BFA';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.borderColor = '#2A2A3E';
                  el.style.background = 'none';
                  el.style.color = '#9090A0';
                }}
              >
                <span style={{ fontSize: 22 }}>🎬</span>
                <span style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                  Upload clips
                </span>
              </button>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
