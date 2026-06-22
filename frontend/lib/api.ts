import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getRecent: () => api.get('/dashboard/recent'),
};

export const studentsApi = {
  getAll: (params?: any) => api.get('/students', { params }),
  create: (data: any) => api.post('/students', data),
  update: (id: string, data: any) => api.put('/students/' + id, data),
  delete: (id: string) => api.delete('/students/' + id),
};

export const attendanceApi = {
  getAll: (params?: any) => api.get('/attendance', { params }),
  create: (data: any) => api.post('/attendance', data),
};

export const devicesApi = {
  getAll: () => api.get('/tablets'),
  create: (data: any) => api.post('/tablets', data),
  sync: (id: string) => api.put('/tablets/' + id + '/sync'),
};

export default api;