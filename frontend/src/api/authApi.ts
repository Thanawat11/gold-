import { request } from './client';
import type { AuthResponse } from '../types';

export const authApi = {
  login: (username: string, password: string) => request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    token: null,
  }),
};
