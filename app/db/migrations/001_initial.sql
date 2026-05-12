-- ═══════════════════════════════════════════════════════════════
-- CrewGO — Initial Schema
-- ═══════════════════════════════════════════════════════════════

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    city TEXT NOT NULL DEFAULT 'Lahore',
    area TEXT,
    bio TEXT,
    interests TEXT[] NOT NULL DEFAULT '{}',
    availability TEXT[] NOT NULL DEFAULT '{}',
    fcm_token TEXT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVENTS TABLE
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE,
    source TEXT NOT NULL CHECK (source IN ('eventbrite', 'google_places', 'manual')),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    venue_name TEXT,
    venue_address TEXT,
    city TEXT NOT NULL DEFAULT 'Lahore',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ,
    image_url TEXT,
    ticket_url TEXT,
    is_free BOOLEAN DEFAULT true,
    price_min DECIMAL(10, 2),
    price_max DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CREWS TABLE
CREATE TABLE IF NOT EXISTS crews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    max_members INTEGER NOT NULL DEFAULT 6,
    status TEXT NOT NULL DEFAULT 'forming'
        CHECK (status IN ('forming', 'confirmed', 'completed', 'cancelled')),
    meeting_point TEXT,
    carpool_available BOOLEAN DEFAULT false,
    ai_icebreaker TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CREW MEMBERS TABLE
CREATE TABLE IF NOT EXISTS crew_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID REFERENCES crews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'invited'
        CHECK (status IN ('invited', 'confirmed', 'declined', 'attended')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(crew_id, user_id)
);

-- CHAT MESSAGES TABLE (includes ai_message for Claude responses)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID REFERENCES crews(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message_type TEXT NOT NULL DEFAULT 'text'
        CHECK (message_type IN ('text', 'ai_prompt', 'ai_message', 'system', 'image')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVENT INTERESTS TABLE
CREATE TABLE IF NOT EXISTS event_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- REELS TABLE
CREATE TABLE IF NOT EXISTS reels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID REFERENCES crews(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'collecting'
        CHECK (status IN ('collecting', 'processing', 'ready', 'failed')),
    clip_urls TEXT[] DEFAULT '{}',
    final_url TEXT,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    watermark_text TEXT,
    view_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER RATINGS TABLE
CREATE TABLE IF NOT EXISTS user_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rater_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rated_id UUID REFERENCES users(id) ON DELETE CASCADE,
    crew_id UUID REFERENCES crews(id) ON DELETE CASCADE,
    punctuality INTEGER CHECK (punctuality BETWEEN 1 AND 5),
    energy INTEGER CHECK (energy BETWEEN 1 AND 5),
    would_crew_again BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(rater_id, rated_id, crew_id)
);

-- ═══════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_events_city ON events(city);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_start_datetime ON events(start_datetime);
CREATE INDEX IF NOT EXISTS idx_events_is_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_events_tags ON events USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_users_interests ON users USING GIN(interests);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_crew_members_crew_id ON crew_members(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_user_id ON crew_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_crew_id ON chat_messages(crew_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_interests ENABLE ROW LEVEL SECURITY;

-- Users: read own profile + public profiles of others
CREATE POLICY "Users can read all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Events: anyone can read active events
CREATE POLICY "Anyone can read active events" ON events FOR SELECT USING (is_active = true);
CREATE POLICY "Service role can manage events" ON events FOR ALL USING (auth.role() = 'service_role');

-- Crews: read if member or public forming crew
CREATE POLICY "Anyone can read crews" ON crews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create crews" ON crews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creator can update crew" ON crews FOR UPDATE USING (auth.uid() = creator_id);

-- Crew members: read if in crew
CREATE POLICY "Anyone can read crew members" ON crew_members FOR SELECT USING (true);
CREATE POLICY "Authenticated can join crew" ON crew_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Member can update own status" ON crew_members FOR UPDATE USING (auth.uid() = user_id);

-- Chat: read if crew member
CREATE POLICY "Crew members can read messages" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Authenticated can send messages" ON chat_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Service role can insert AI messages" ON chat_messages FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Event interests
CREATE POLICY "Anyone can read interests" ON event_interests FOR SELECT USING (true);
CREATE POLICY "User can manage own interests" ON event_interests FOR ALL USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- SEED: Real Lahore Events (manually curated)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO events (source, title, description, category, tags, venue_name, venue_address, city, start_datetime, end_datetime, is_free, price_min, price_max, image_url) VALUES

('manual', 'Coke Studio Season 17 — Live Recording', 'Experience the magic of Coke Studio live. Watch Pakistan''s biggest music show being recorded with full audience access. Artists TBA — expect surprises.', 'Music', ARRAY['music','live','coke studio','desi'], 'Alhamra Arts Council', 'The Mall Road, Lahore', 'Lahore', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '3 hours', false, 500, 2000, null),

('manual', 'Lahore Food Festival 2026', 'Biggest food festival in Lahore. 100+ food stalls, live cooking competitions, dessert zone, and street food from every corner of Pakistan.', 'Food', ARRAY['food','festival','street food','family'], 'Packages Mall Grounds', 'Walton Road, Lahore', 'Lahore', NOW() + INTERVAL '10 days', NOW() + INTERVAL '12 days', true, 0, 0, null),

('manual', 'PSL 2026 Fan Zone — Lahore Qalandars', 'Official PSL Fan Zone for Lahore Qalandars home matches. Giant screens, food stalls, merchandise, and live commentary. Entry free with match ticket.', 'Sports', ARRAY['psl','cricket','qalandars','sports'], 'Gaddafi Stadium', 'Ferozepur Road, Lahore', 'Lahore', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '5 hours', false, 500, 3000, null),

('manual', 'Art Lahore Contemporary Art Fair', 'Pakistan''s premier contemporary art fair. 50+ local and international artists. Paintings, sculptures, installations, and live art performances.', 'Art', ARRAY['art','contemporary','gallery','culture'], 'Expo Centre Lahore', 'Johar Town, Lahore', 'Lahore', NOW() + INTERVAL '14 days', NOW() + INTERVAL '17 days', false, 200, 500, null),

('manual', 'TechFest Lahore 2026', 'Largest tech conference in Punjab. Startup pitches, AI workshops, developer talks, and networking with 2000+ tech professionals.', 'Tech', ARRAY['tech','startup','ai','networking'], 'LUMS Campus', 'DHA Phase V, Lahore', 'Lahore', NOW() + INTERVAL '20 days', NOW() + INTERVAL '21 days', false, 300, 800, null),

('manual', 'Stand Up Night Lahore — Vol. 12', 'An evening of pure comedy. Featuring top Pakistani stand-up comedians. Expect 2 hours of roast, stories, and crowd work. 18+ only.', 'Comedy', ARRAY['comedy','standup','nightlife','entertainment'], 'Alchemy, DHA', 'Phase 6, DHA, Lahore', 'Lahore', NOW() + INTERVAL '8 days', NOW() + INTERVAL '8 days' + INTERVAL '2 hours', false, 800, 1200, null),

('manual', 'Basant Kite Festival — Old Lahore', 'The unofficial revival of Basant in Old Lahore. Rooftop kite flying competition, dholki, food, and the iconic Lahori spring energy. Join a crew and own the sky.', 'Festival', ARRAY['basant','kites','old lahore','culture','spring'], 'Androon Lahore', 'Walled City, Lahore', 'Lahore', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '8 hours', true, 0, 0, null),

('manual', 'Fitness Rave — Lahore', 'Pakistan''s first fitness rave. Dance workout meets electronic music. 2 hours of high-energy cardio with a live DJ. Beginners welcome.', 'Fitness', ARRAY['fitness','dance','rave','health','fun'], 'Fortress Stadium', 'Lahore Cantonment, Lahore', 'Lahore', NOW() + INTERVAL '6 days', NOW() + INTERVAL '6 days' + INTERVAL '2 hours', false, 600, 600, null),

('manual', 'Lahore Literary Festival 2026', 'Three days of ideas, books, and conversations. 80+ speakers including novelists, journalists, poets, and thinkers from Pakistan and abroad.', 'Culture', ARRAY['books','literature','poetry','talks'], 'Alhamra Arts Council', 'The Mall Road, Lahore', 'Lahore', NOW() + INTERVAL '25 days', NOW() + INTERVAL '27 days', false, 0, 500, null),

('manual', 'Gaming Tournament — Valorant Open', 'Open Valorant tournament with PKR 50,000 prize pool. Team registration open. Bring your squad or find teammates at the event.', 'Gaming', ARRAY['gaming','esports','valorant','tournament'], 'Arena Game World', 'M.M. Alam Road, Gulberg, Lahore', 'Lahore', NOW() + INTERVAL '12 days', NOW() + INTERVAL '12 days' + INTERVAL '6 hours', false, 500, 500, null)

ON CONFLICT (external_id) DO NOTHING;
