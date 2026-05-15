export interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  id: number;
  username: string;
  fullName: string;
  role: string;
}

const API_URL = 'http://localhost:8080/api/auth';

export const authApi = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
      }
      throw new Error('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง');
    }

    return response.json();
  },
};
