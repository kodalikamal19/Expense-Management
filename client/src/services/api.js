import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  updateProfile: (profileData) => api.put('/auth/me', profileData),
  changePassword: (passwordData) => api.post('/auth/change-password', passwordData),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
};

// Company API
export const companyAPI = {
  getCompanies: () => api.get('/company'),
  getCompany: (id) => api.get(`/company/${id}`),
  createCompany: (companyData) => api.post('/company', companyData),
  updateCompany: (id, companyData) => api.put(`/company/${id}`, companyData),
  deleteCompany: (id) => api.delete(`/company/${id}`),
  getCompanyUsers: (id, params) => api.get(`/company/${id}/users`, { params }),
  getCompanyStats: (id) => api.get(`/company/${id}/stats`),
  updateCompanySettings: (id, settings) => api.put(`/company/${id}/settings`, { settings }),
};

// Users API
export const usersAPI = {
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  getUserEmployees: (id) => api.get(`/users/${id}/employees`),
  getUserExpenses: (id, params) => api.get(`/users/${id}/expenses`, { params }),
  toggleUserStatus: (id, isActive) => api.put(`/users/${id}/activate`, { isActive }),
};

// Expenses API
export const expensesAPI = {
  getExpenses: (params) => api.get('/expenses', { params }),
  getExpense: (id) => api.get(`/expenses/${id}`),
  createExpense: (expenseData) => api.post('/expenses', expenseData),
  updateExpense: (id, expenseData) => api.put(`/expenses/${id}`, expenseData),
  deleteExpense: (id) => api.delete(`/expenses/${id}`),
  submitExpense: (id) => api.post(`/expenses/${id}/submit`),
  getExpenseStats: (params) => api.get('/expenses/stats/summary', { params }),
};

// Approvals API
export const approvalsAPI = {
  getApprovals: (params) => api.get('/approvals', { params }),
  getApproval: (id) => api.get(`/approvals/${id}`),
  approveExpense: (id, data) => api.post(`/approvals/${id}/approve`, data),
  rejectExpense: (id, data) => api.post(`/approvals/${id}/reject`, data),
  escalateExpense: (id, data) => api.post(`/approvals/${id}/escalate`, data),
  getApprovalStats: (params) => api.get('/approvals/stats/summary', { params }),
  sendReminder: (id) => api.put(`/approvals/${id}/reminder`),
};

// OCR API
export const ocrAPI = {
  extractText: (formData) => api.post('/ocr/extract', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  batchExtract: (formData) => api.post('/ocr/batch-extract', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getSupportedFormats: () => api.get('/ocr/supported-formats'),
};

// Reports API
export const reportsAPI = {
  getExpenseReport: (params) => api.get('/reports/expenses', { params }),
  getApprovalReport: (params) => api.get('/reports/approvals', { params }),
  getDashboardData: (params) => api.get('/reports/dashboard', { params }),
  exportReport: (params) => api.get('/reports/export', { params }),
};

// Currency API
export const currencyAPI = {
  convertCurrency: async (amount, from, to) => {
    try {
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${from}`
      );
      const data = await response.json();
      const rate = data.rates[to];
      return { convertedAmount: amount * rate, exchangeRate: rate };
    } catch (error) {
      console.error('Currency conversion error:', error);
      throw error;
    }
  },
  getExchangeRates: async (baseCurrency = 'USD') => {
    try {
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`
      );
      return await response.json();
    } catch (error) {
      console.error('Get exchange rates error:', error);
      throw error;
    }
  }
};

export default api;
