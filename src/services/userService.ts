import api from './api';

export const userService = {
  getProfile: async () => {
    const res = await api.get('/users/profile');
    return res.data.data;
  },

  updateProfile: async (data: { name?: string; email?: string }) => {
    const res = await api.patch('/users/profile', data);
    return res.data.data;
  },

  uploadAvatar: async (base64Image: string) => {
    const res = await api.post('/users/profile/avatar', { image: base64Image }, { timeout: 30000 });
    return res.data.data;
  },
};
