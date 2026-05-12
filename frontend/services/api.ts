import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../constants/config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = await SecureStore.getItemAsync('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refresh,
          });
          await SecureStore.setItemAsync('access_token', data.access_token);
          error.config.headers.Authorization = `Bearer ${data.access_token}`;
          return api.request(error.config);
        } catch {
          await SecureStore.deleteItemAsync('access_token');
          await SecureStore.deleteItemAsync('refresh_token');
        }
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    city: string;
    interests?: string[];
  }) => api.post('/auth/register', data),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  me: () => api.get('/auth/me'),

  logout: () => api.post('/auth/logout'),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: Partial<{ full_name: string; bio: string; area: string; availability: string[] }>) =>
    api.put('/users/profile', data),
  updateInterests: (interests: string[]) =>
    api.put('/users/interests', { interests }),
};

// ── Events ────────────────────────────────────────────────────────────────────
export const eventsApi = {
  list: (params?: { category?: string; page?: number }) =>
    api.get('/events', { params }),
  get: (id: string) => api.get(`/events/${id}`),
  interest: (id: string) => api.post(`/events/${id}/interest`),
  removeInterest: (id: string) => api.delete(`/events/${id}/interest`),
};

// ── Crews ─────────────────────────────────────────────────────────────────────
export const crewsApi = {
  myCrews: () => api.get('/crews/my-crews/list'),
  get: (id: string) => api.get(`/crews/${id}`),
  create: (data: { name: string; event_id: string; max_members?: number }) =>
    api.post('/crews', data),
  join: (id: string) => api.post(`/crews/${id}/join`),
  getSuggestedCrew: (eventId: string) =>
    api.get(`/crews/events/${eventId}/suggested-crew`),
};

// ── Chat ──────────────────────────────────────────────────────────────────────
export const chatApi = {
  getMessages: (crewId: string, page = 1) =>
    api.get(`/crews/${crewId}/messages`, { params: { page } }),
  sendMessage: (crewId: string, content: string) =>
    api.post(`/crews/${crewId}/messages`, { content, message_type: 'text' }),
  askAI: (crewId: string, message: string) =>
    api.post(`/crews/${crewId}/messages/ai`, { message }),
};

export default api;
