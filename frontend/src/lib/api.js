import axios from 'axios';

const DEFAULT_BACKEND_URL = 'http://localhost:8001';
const mode = import.meta.env.MODE || 'development';
const modeBaseUrl =
  mode === 'production'
    ? import.meta.env.VITE_API_BASE_URL_PROD
    : mode === 'staging'
      ? import.meta.env.VITE_API_BASE_URL_STAGING
      : import.meta.env.VITE_API_BASE_URL_DEV;

const BACKEND_URL = modeBaseUrl || import.meta.env.VITE_API_BASE_URL || DEFAULT_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('slotta_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('slotta_token');
      localStorage.removeItem('slotta_master');
      // Only redirect if not already on login/register page
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// =============================================================================
// AUTHENTICATION
// =============================================================================

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  
  // Helper methods
  setToken: (token) => {
    localStorage.setItem('slotta_token', token);
  },
  setMaster: (master) => {
    localStorage.setItem('slotta_master', JSON.stringify(master));
  },
  getToken: () => localStorage.getItem('slotta_token'),
  getMaster: () => {
    const master = localStorage.getItem('slotta_master');
    return master ? JSON.parse(master) : null;
  },
  isAuthenticated: () => !!localStorage.getItem('slotta_token'),
  logout: () => {
    localStorage.removeItem('slotta_token');
    localStorage.removeItem('slotta_master');
    window.location.href = '/login';
  }
};

// =============================================================================
// MASTERS
// =============================================================================

export const mastersAPI = {
  create: (data) => api.post('/masters', data),
  getBySlug: (slug) => api.get(`/masters/${slug}`),
  getById: (id) => api.get(`/masters/id/${id}`),
  update: (id, data) => api.put(`/masters/${id}`, data),
};

// =============================================================================
// SERVICES
// =============================================================================

export const servicesAPI = {
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`),
  getById: (id) => api.get(`/services/${id}`),
  getByMaster: (masterId, activeOnly = false) => 
    api.get(`/services/master/${masterId}`, { params: { active_only: activeOnly } }),
};

// =============================================================================
// CLIENTS
// =============================================================================

export const clientsAPI = {
  create: (data) => api.post('/clients', data),
  getById: (id) => api.get(`/clients/${id}`),
  getByEmail: (email) => api.get(`/clients/email/${email}`),
  getByMaster: (masterId) => api.get(`/clients/master/${masterId}`),
  updateCredit: (clientId, creditBalance) =>
    api.post('/client/update-credit', { clientId, credit_balance: creditBalance }),
  applyCredit: (clientId) => api.post('/client/apply-credit', { clientId }),
};

// =============================================================================
// BOOKINGS
// =============================================================================

export const bookingsAPI = {
  create: (data) => api.post('/bookings', data),
  createWithPayment: (data) => api.post('/bookings/with-payment', data),
  getById: (id) => api.get(`/bookings/${id}`),
  getByMaster: (masterId, status = null) => 
    api.get(`/bookings/master/${masterId}`, { params: { status } }),
  getByClient: (clientId) => api.get(`/bookings/client/${clientId}`),
  getByClientEmail: (email) => api.get(`/bookings/client/email/${email}`),
  complete: (id) => api.put(`/bookings/${id}/complete`),
  noShow: (id) => api.put(`/bookings/${id}/no-show`),
  cancel: (id) => api.put(`/bookings/${id}/cancel`),
  reschedule: (id, newDate) => api.put(`/bookings/${id}/reschedule`, { new_date: newDate }),
};

// =============================================================================
// MESSAGES
// =============================================================================

export const messagesAPI = {
  sendToClient: (data) => api.post('/messages/send', data),
};

// =============================================================================
// CALENDAR BLOCKS
// =============================================================================

export const calendarAPI = {
  createBlock: (data) => api.post('/calendar/blocks', data),
  getBlocksByMaster: (masterId) => api.get(`/calendar/blocks/master/${masterId}`),
  deleteBlock: (blockId) => api.delete(`/calendar/blocks/${blockId}`),
};

// =============================================================================
// GOOGLE CALENDAR
// =============================================================================

export const googleCalendarAPI = {
  getAuthUrl: (masterId = '') => api.get('/google/oauth/url', { params: { master_id: masterId } }),
  callback: (code, state = '') => api.get('/google/oauth/callback', { params: { code, state } }),
  syncStatus: (masterId) => api.get(`/google/sync-status/${masterId}`),
  disconnect: (masterId) => api.post(`/google/disconnect/${masterId}`),
  // Two-way sync endpoints
  importEvents: (masterId) => api.post(`/google/import-events/${masterId}`),  // Google → Slotta
  syncBookings: (masterId) => api.post(`/google/sync-bookings/${masterId}`),  // Slotta → Google
  fullSync: (masterId) => api.post(`/google/full-sync/${masterId}`),          // Both directions
  createEvent: (data) => api.post('/google/calendar/create', data),
  updateEvent: (eventId, data) => api.put(`/google/calendar/update/${eventId}`, data),
  deleteEvent: (eventId) => api.delete(`/google/calendar/delete/${eventId}`),
};

// =============================================================================
// STRIPE CONNECT & PAYOUTS
// =============================================================================

export const stripeAPI = {
  getConnectStatus: (masterId) => api.get(`/stripe/connect-status/${masterId}`),
  createConnectAccount: (masterId) => api.post(`/stripe/create-connect-account/${masterId}`),
  getOnboardingLink: (masterId) => {
    const returnUrl = `${window.location.origin}/master/settings`;
    return api.get(`/stripe/onboarding-link/${masterId}?return_url=${encodeURIComponent(returnUrl)}`);
  },
  getDashboardLink: (masterId) => api.get(`/stripe/dashboard-link/${masterId}`),
  requestPayout: (masterId, amount = null) => api.post(`/stripe/request-payout/${masterId}`, { amount }),
  createCheckoutSession: () => api.post('/stripe/create-checkout-session'),
  createPortalSession: () => api.post('/stripe/create-portal-session'),
  subscriptionStatus: () => api.get('/stripe/subscription-status'),
};

// =============================================================================
// TELEGRAM
// =============================================================================

export const telegramAPI = {
  getBotInfo: () => api.get('/telegram/bot-info'),
  getStatus: (masterId) => api.get(`/telegram/status/${masterId}`),
  connect: (masterId, chatId) => api.post(`/telegram/connect/${masterId}?chat_id=${chatId}`),
  disconnect: (masterId) => api.post(`/telegram/disconnect/${masterId}`),
  testNotification: (masterId) => api.post(`/telegram/test/${masterId}`),
};

// =============================================================================
// ANALYTICS
// =============================================================================

export const analyticsAPI = {
  getMasterAnalytics: (masterId) => api.get(`/analytics/master/${masterId}`),
};

// =============================================================================
// WALLET / TRANSACTIONS
// =============================================================================

export const walletAPI = {
  getWallet: (masterId) => api.get(`/wallet/master/${masterId}`),
  getTransactions: (masterId, limit = 50, offset = 0) => 
    api.get(`/transactions/master/${masterId}`, { params: { limit, offset } }),
};

// =============================================================================
// HEALTH CHECK
// =============================================================================

export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;
