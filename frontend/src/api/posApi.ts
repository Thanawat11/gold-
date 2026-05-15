const API_URL = 'http://localhost:8080/api/v1';

export const posApi = {
  searchByBarcode: async (barcode: string, token: string) => {
    const response = await fetch(`${API_URL}/products/barcode/${barcode}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      if (response.status === 404) throw new Error('ไม่พบสินค้า');
      throw new Error('เกิดข้อผิดพลาดในการค้นหาสินค้า');
    }
    return response.json();
  },

  checkout: async (data: any, token: string) => {
    const response = await fetch(`${API_URL}/pos/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(errorMsg || 'เกิดข้อผิดพลาดในการบันทึกรายการ');
    }
    return response.json();
  },

  getAvailableProducts: async (token: string) => {
    const response = await fetch(`${API_URL}/products/available`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('ไม่สามารถดึงข้อมูลสินค้าได้');
    return response.json();
  }
};
