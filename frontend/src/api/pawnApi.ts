const API_URL = 'http://localhost:8080/api/v1/pawn';

export const pawnApi = {
  createTicket: async (data: any, token: string) => {
    const response = await fetch(`${API_URL}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(errorMsg || 'เกิดข้อผิดพลาดในการออกตั๋ว');
    }
    return response.json();
  },

  getTickets: async (token: string) => {
    const response = await fetch(`${API_URL}/tickets`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('ไม่สามารถดึงข้อมูลตั๋วจำนำได้');
    return response.json();
  },

  redeem: async (id: number, token: string) => {
    const response = await fetch(`${API_URL}/redeem/${id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('ไม่สามารถไถ่ถอนได้');
    return response.json();
  },

  getSummary: async (token: string) => {
    const response = await fetch(`${API_URL}/summary`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('ไม่สามารถดึงข้อมูลสรุปได้');
    return response.json();
  },

  performAction: async (id: number, data: any, token: string) => {
    const response = await fetch(`${API_URL}/${id}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(errorMsg || 'เกิดข้อผิดพลาดในการทำรายการ');
    }
    return response.json();
  },

  getHistory: async (id: number, token: string) => {
    const response = await fetch(`${API_URL}/${id}/history`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('ไม่สามารถดึงข้อมูลประวัติได้');
    return response.json();
  },

  getInterestSuggestion: async (id: number, token: string) => {
    const response = await fetch(`${API_URL}/${id}/interest-suggestion`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('ไม่สามารถคำนวณดอกเบี้ยแนะนำได้');
    return response.json();
  }
};
