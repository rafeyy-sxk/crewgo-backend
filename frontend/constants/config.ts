export const API_BASE_URL = __DEV__
  ? 'http://192.168.1.100:8000/api/v1'   // your local IP — change to your machine's IP
  : 'https://crewgo-api.railway.app/api/v1';

export const COLORS = {
  primary: '#FF5A1F',      // CrewGO orange
  primaryDark: '#E04010',
  secondary: '#1A1A2E',    // deep navy
  accent: '#FFD700',       // gold
  background: '#0F0F1A',   // dark bg
  surface: '#1C1C2E',      // card bg
  surfaceLight: '#252535',
  text: '#FFFFFF',
  textMuted: '#9090A0',
  textDim: '#6060708',
  border: '#2A2A3E',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  ai: '#8B5CF6',           // purple for AI messages
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

export const INTEREST_OPTIONS = [
  'Music', 'Food', 'Sports', 'Art', 'Tech', 'Gaming',
  'Fitness', 'Travel', 'Movies', 'Fashion', 'Photography',
  'Dance', 'Books', 'Cars', 'Comedy', 'Networking',
];
