// ============================================================================
// API Client - نسخه پیش‌نمایش با Mock Fallback
// ============================================================================

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' },
});

// --- Request: add token ---
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(config.memberAuth ? 'member_access_token' : 'access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (e) => Promise.reject(e));

// --- Response: unwrap + mock fallback ---
api.interceptors.response.use(
  (response) => {
    // اگر responseType === blob → مستقیماً برگردان (بدون unwrap)
    if (response.config?.responseType === 'blob') return response;
    const payload = response.data;
    // Legacy list routes return { data: [], pagination }. Normalize once here.
    if (Array.isArray(payload?.data) && payload?.pagination) {
      return { ...payload, data: { items: payload.data, pagination: payload.pagination } };
    }
    return payload;
  },
  async (error) => {
    // 401 → redirect
    if (error.response?.status === 401) {
      if (error.config?.memberAuth) {
        localStorage.removeItem('member_access_token');
        if (window.location.pathname !== '/club/login') window.location.href = '/club/login';
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') window.location.href = '/login';
      }
    }
    const msg = error.response?.data?.error?.detail || error.response?.data?.message || error.message || 'خطای ناشناخته';
    return Promise.reject({ ...error, message: msg });
  }
);

// === Services ===
export const authService = {
  login: (identifier, password) => api.post('/auth/login', { identifier, password }),
  register: (data) => api.post('/auth/register', data),
  refresh: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
  logout: () => api.post('/auth/logout', { refresh_token: localStorage.getItem('refresh_token') }),
  me: () => api.get('/auth/me'),
};

export const loyaltyAdminService = {
  getDashboard: () => api.get('/loyalty/dashboard'),
  getTiers: () => api.get('/loyalty/tiers'),
  createTier: (data) => api.post('/loyalty/tiers', data),
  updateTier: (id, data) => api.patch(`/loyalty/tiers/${id}`, data),
  getRules: () => api.get('/loyalty/rules'),
  createRule: (data) => api.post('/loyalty/rules', data),
  updateRule: (id, data) => api.patch(`/loyalty/rules/${id}`, data),
  deleteRule: (id) => api.delete(`/loyalty/rules/${id}`), 
  getRewards: (params = {}) => api.get('/loyalty/rewards', { params }),
  createReward: (data) => api.post('/loyalty/rewards', data),
  updateReward: (id, data) => api.patch(`/loyalty/rewards/${id}`, data),
  deleteReward: (id) => api.delete(`/loyalty/rewards/${id}`),
  getRedemptions: (params = {}) => api.get('/loyalty/redemptions', { params }),
  updateRedemption: (id, data) => api.patch(`/loyalty/redemptions/${id}/status`, data),
  getMissions: () => api.get('/loyalty/missions'),
  createMission: (data) => api.post('/loyalty/missions', data),
  updateMission: (id, data) => api.patch(`/loyalty/missions/${id}`, data),
  deleteMission: (id) => api.delete(`/loyalty/missions/${id}`), 
  getSegments: () => api.get('/loyalty/segments'),
  createSegment: (data) => api.post('/loyalty/segments', data),
  updateSegment: (id, data) => api.patch(`/loyalty/segments/${id}`, data),
  deleteSegment: (id) => api.delete(`/loyalty/segments/${id}`),
  getTransactions: (params = {}) => api.get('/loyalty/transactions', { params }),
  exportLedger: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/loyalty/transactions/export?${query}`, { responseType: 'blob' });
  },
  getOffers: () => api.get('/loyalty/offers'),
};

export const memberService = {
  requestOtp: (mobile) => api.post('/member/auth/request-otp', { mobile }, { memberAuth: true }),
  verifyOtp: (mobile, code) => api.post('/member/auth/verify-otp', { mobile, code }, { memberAuth: true }),
  me: () => api.get('/member/me', { memberAuth: true }),
  transactions: () => api.get('/member/transactions', { memberAuth: true }),
  convertPoints: (points) => api.post('/member/wallet/convert', { points }, { memberAuth: true }),
  rewards: () => api.get('/member/rewards', { memberAuth: true }),
  redeem: (id) => api.post(`/member/rewards/${id}/redeem`, {}, { memberAuth: true }),
  createFeedback: (data) => api.post('/feedback/member', data, { memberAuth: true }),
  redemptions: () => api.get('/member/redemptions', { memberAuth: true }),
  missions: () => api.get('/member/missions', { memberAuth: true }),
  claimMission: (id) => api.post(`/member/missions/${id}/claim`, {}, { memberAuth: true }),
  referrals: () => api.get('/member/referrals', { memberAuth: true }),
  invite: (mobile) => api.post('/member/referrals', { mobile }, { memberAuth: true }),
  getFeedbacks: () => api.get('/feedback/member', { memberAuth: true }),
  getNotifications: (params = {}) => api.get('/member/notifications', { params, memberAuth: true }),
  getUnreadNotificationCount: () => api.get('/member/notifications/unread-count', { memberAuth: true }),
  markNotificationAsRead: (id) => api.put(`/member/notifications/${id}/read`, {}, { memberAuth: true }),
  markAllNotificationsAsRead: () => api.put('/member/notifications/read-all', {}, { memberAuth: true }),
};

export const customerService = {
  list: (params = {}) => api.get('/customers', { params }).catch(() => ({ data: { items: [] } })),
  getById: (id) => api.get(`/customers/${id}`).catch(() => ({ data: null })),
  create: (data) => api.post('/customers', data),  // ← این رو اضافه کن
  update: (id, data) => api.patch(`/customers/${id}`, data),
  remove: (id) => api.delete(`/customers/${id}`),
};

export const invoiceService = {
  list: (params = {}) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.patch(`/invoices/${id}`, data),
  remove: (id) => api.delete(`/invoices/${id}`),
  getStats: () => api.get('/invoices/stats'),
};

export const loyaltyService = {
  getRules: () => api.get('/loyalty/rules'),
  getCustomerSummary: (id) => api.get(`/loyalty/customers/${id}/summary`),
  getCustomerBalance: (id) => api.get(`/loyalty/customers/${id}/balance`),
  getCustomerWallet: (id) => api.get(`/loyalty/customers/${id}/wallet`),
  getHistory: (id, params = {}) => api.get(`/loyalty/customers/${id}/history`, { params }),
  adjustPoints: (id, data) => api.post(`/loyalty/customers/${id}/adjust`, data),
};

export const churnService = {
  getRules: () => api.get('/churn/rules'),
  getReport: () => api.get('/churn/report'),
  runManually: () => api.post('/churn/run'),
  getReactivationWindow: (limit = 250) => api.get('/retention/reactivation', { params: { limit } }),
  createReactivationCampaign: (data = {}) => api.post('/retention/reactivation/campaign', data),
  markReactivated: (id) => api.post(`/retention/customers/${id}/reactivate`),
};

export const feedbackService = {
  list: (params = {}) => api.get('/feedback', { params }),
  stats: () => api.get('/feedback/stats'),
  create: (data) => api.post('/feedback', data),
  update: (id, data) => api.patch(`/feedback/${id}`, data),
  remove: (id) => api.delete(`/feedback/${id}`),
};

export const notificationService = {
  list: (params = {}) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  remove: (id) => api.delete(`/notifications/${id}`),
};

export const pushService = {
  getPublicKey: () => api.get('/notifications/push-public-key'),
  subscribe: (subscription) => api.post('/notifications/subscribe', subscription),
  unsubscribe: (endpoint) => api.delete('/notifications/subscribe', { data: { endpoint } }),
};

export const userService = {
  list: (params = {}) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/auth/register', data),
  updateStatus: (id, status) => api.patch(`/users/${id}/status`, { status }),
  remove: (id) => api.delete(`/users/${id}`),
};

export const csatService = {
  getTokenInfo: (token) => api.get(`/feedback/csat/${token}`),       // ← GET /csat/:token
  submitScore: (token, score) => api.post(`/feedback/csat/${token}`, { score }), // ← POST /csat/:token
  getStats: () => api.get('/feedback/stats'), // ← این رو باید بررسی کنی
};

export const campaignService = {
  list: (params = {}) => api.get('/campaigns', { params }),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  remove: (id) => api.delete(`/campaigns/${id}`),  // ← این رو اضافه کن
};

export const settingsService = {
  getLoyalty: () => api.get('/settings/loyalty'),
  getAll: () => api.get('/settings'),
  updateLoyalty: (data) => api.put('/settings/loyalty', data),
};

export const statsService = {
  getCeoDashboard: () => api.get('/stats/ceo-dashboard'),
};

export const reportService = {
  /** خروجی اکسل — بازگشت Blob */
  exportInvoices: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    // درخواست مستقیم بدون interceptor (چون پاسخ Blob است)
    return api.get(`/reports/invoices-export?${query}`, { responseType: 'blob' });
  },
  /** فایل نمونه اکسل */
  downloadSample: () => api.get('/reports/sample-excel', { responseType: 'blob' }),
  /** ورود گروهی */
  importInvoices: (formData) => api.post('/invoices/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  }),
};


export const integrationService = {
  status: () => api.get('/integration/sepidar/status'),
  test: () => api.post('/integration/sepidar/test'),
  syncCustomers: () => api.post('/integration/sepidar/sync/customers'),
  syncInvoices: () => api.post('/integration/sepidar/sync/invoices'),
  syncAll: () => api.post('/integration/sepidar/sync'),
};

export default api;
