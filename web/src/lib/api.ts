import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://crewgo-backend.vercel.app/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage on client side
if (typeof window !== 'undefined') {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
}

export const eventsApi = {
  list: (params?: { category?: string; page?: number }) =>
    api.get('/events', { params }),
  get: (id: string) => api.get(`/events/${id}`),
  interest: (id: string) => api.post(`/events/${id}/interest`),
};

export const crewsApi = {
  myCrews: () => api.get('/crews/my-crews/list'),
  get: (id: string) => api.get(`/crews/${id}`),
  getSuggested: (eventId: string) => api.get(`/crews/events/${eventId}/suggested-crew`),
};

export const chatApi = {
  getMessages: (crewId: string) => api.get(`/crews/${crewId}/messages`),
  send: (crewId: string, content: string) =>
    api.post(`/crews/${crewId}/messages`, { content, message_type: 'text' }),
  askAI: (crewId: string, message: string) =>
    api.post(`/crews/${crewId}/messages/ai`, { message }),
};

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; full_name: string; city: string }) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};
