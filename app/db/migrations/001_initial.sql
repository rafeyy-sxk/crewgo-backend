-- USERS TABLE
CREATE TABLE users (
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
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE,
    source TEXT NOT NULL CHECK (source IN ('eventbrite', 'google_places', 'manual')),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    venue_name TEXT,
    venue_address TEXT,
    city TEXT NOT NULL,
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
CREATE TABLE crews (
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
CREATE TABLE crew_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID REFERENCES crews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'invited' 
        CHECK (status IN ('invited', 'confirmed', 'declined', 'attended')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(crew_id, user_id)
);

-- CHAT MESSAGES TABLE
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID REFERENCES crews(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message_type TEXT NOT NULL DEFAULT 'text' 
        CHECK (message_type IN ('text', 'ai_prompt', 'system', 'image')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- REELS TABLE
CREATE TABLE reels (
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
CREATE TABLE user_ratings (
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

-- EVENT INTERESTS TABLE
CREATE TABLE event_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_events_city ON events(city);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_start_datetime ON events(start_datetime);
CREATE INDEX idx_events_tags ON events USING GIN(tags);
CREATE INDEX idx_users_interests ON users USING GIN(interests);
CREATE INDEX idx_users_city ON users(city);
CREATE INDEX idx_crew_members_crew_id ON crew_members(crew_id);
CREATE INDEX idx_crew_members_user_id ON crew_members(user_id);
CREATE INDEX idx_chat_messages_crew_id ON chat_messages(crew_id);
