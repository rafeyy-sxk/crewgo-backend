export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  city: string;
  area?: string;
  bio?: string;
  interests: string[];
  availability: string[];
  is_active: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  venue_name?: string;
  venue_address?: string;
  city: string;
  latitude?: number;
  longitude?: number;
  start_datetime: string;
  end_datetime?: string;
  image_url?: string;
  ticket_url?: string;
  is_free: boolean;
  price_min?: number;
  price_max?: number;
}

export interface CrewMember {
  id: string;
  user_id: string;
  crew_id: string;
  status: 'invited' | 'accepted' | 'declined';
  user?: User;
}

export interface Crew {
  id: string;
  name: string;
  event_id: string;
  creator_id: string;
  max_members: number;
  status: 'forming' | 'confirmed' | 'completed';
  event?: Event;
  members?: CrewMember[];
  member_count?: number;
}

export interface ChatMessage {
  id: string;
  crew_id: string;
  sender_id?: string;
  message_type: 'text' | 'ai_prompt' | 'ai_message' | 'system';
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
  sender?: Partial<User>;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
