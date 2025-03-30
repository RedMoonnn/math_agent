import axios from 'axios';
import { store } from '../store';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 150000,
  withCredentials: false
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch({ type: 'auth/logout' });
    }
    
    if (error.response) {
      console.error('Response error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Request error:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username: string, password: string) => {
    // 使用URLSearchParams创建表单格式数据
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    // 使用表单数据格式提交
    return api.post('/auth/login', formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  },
  register: (username: string, email: string, password: string) =>
    api.post('/auth/register', { username, email, password }),
  getCurrentUser: () => api.get('/auth/me'),
  updateAvatar: (avatar: string) => 
    api.post('/auth/update-avatar', { avatar }),
  sendPasswordResetCode: (email: string) =>
    api.post('/auth/reset-password/send-code', { email }),
  resetPassword: (email: string, verificationCode: string, newPassword: string) =>
    api.post('/auth/reset-password/verify', { email, verification_code: verificationCode, new_password: newPassword }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword }),
  sendEmailVerificationCode: (email: string) =>
    api.post('/auth/verify-email/send-code', { email }),
  verifyEmail: (email: string, verificationCode: string) =>
    api.post('/auth/verify-email/verify', { email, verification_code: verificationCode }),
};

export const adminAPI = {
  getAllUsers: () => api.get('/admin/users'),
  activateUser: (userId: number) => api.put(`/admin/users/${userId}/activate`),
  deactivateUser: (userId: number) => api.put(`/admin/users/${userId}/deactivate`),
  deleteUser: (userId: number) => api.delete(`/admin/users/${userId}`),
};

export const questionAPI = {
  getQuestions: () => api.get('/questions/', { timeout: 10000 }),
  getQuestion: (id: number) => api.get(`/questions/${id}`, { timeout: 10000 }),
  createQuestion: (data: {
    title: string;
    content: string;
    category: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'easy' | 'medium' | 'hard';
  }) => api.post('/questions/', data, { timeout: 10000 }),
  updateQuestion: (id: number, data: {
    title?: string;
    content?: string;
    category?: string;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'easy' | 'medium' | 'hard';
  }) => api.put(`/questions/${id}`, data, { timeout: 10000 }),
  deleteQuestion: (id: number) => api.delete(`/questions/${id}`),
  submitAnswer: (questionId: number, content: string) =>
    api.post(`/questions/${questionId}/answers`, { content }),
  getAnswers: (questionId: number) => api.get(`/questions/${questionId}/answers`),
  submitFeedback: (answerId: number, rating: number, comment?: string) =>
    api.post(`/answers/${answerId}/feedback`, { rating, comment }),
  getAIAnswer: (questionId: number) => 
    api.post(`/questions/${questionId}/ai-answer`),
  getAIAnswerDirect: (question: string) => 
    api.post('/chat/math', { question }),
  uploadAndAnalyze: (formData: FormData) =>
    api.post('/chat/upload-math', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 150000,
    }),
};

export default api;