import { request } from './client';
import type { User, UserCreateRequest, UserUpdateRequest } from '../types';

export const userApi = {
  list: () => request<User[]>('/api/v1/users'),
  create: (data: UserCreateRequest) => request<User>('/api/v1/users', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: UserUpdateRequest) => request<User>(`/api/v1/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  remove: (id: number) => request<void>(`/api/v1/users/${id}`, {
    method: 'DELETE',
  }),
};
