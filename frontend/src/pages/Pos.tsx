import React, { useState, useEffect } from 'react';
import { 
  Box, Grid, Card, CardContent, Typography, TextField, 
  Button, IconButton, Divider, Paper, useTheme, Avatar,
  Tabs, Tab, CircularProgress
} from '@mui/material';
import { 
  QrCodeScanner, Delete, ShoppingCartCheckout, PersonSearch
} from '@mui/icons-material';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import { posApi } from '../api/posApi';
import { Alert, Snackbar } from '@mui/material';

export const Pos = () => {
  const theme = useTheme();
  const { goldPrice, cart, addToCart, clearCart } = useStore();
  const token = useAuthStore((state) => state.token);
  const [tabValue, setTabValue] = useState(0);
  const [barcode, setBarcode] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    const fetchProducts = async () => {
      if (!token) return;
      try {
        const data = await posApi.getAvailableProducts(token);
        setProducts(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchProducts();
  }, [token]);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode && token) {
      setLoading(true);
      try {
        const product = await posApi.searchByBarcode(barcode, token);
        const price = product.weightGram === 15.16 ? goldPrice.sell + 1500 : (goldPrice.sell / (15.16/product.weightGram)) + 800;
        addToCart({ ...product, price, uid: Date.now(), type: 'sell', image: product.category === 'สร้อยคอ' ? '🥇' : '💍' });
        setBarcode('');
      } catch (err: any) {
        setSnackbar({ open: true, message: err.message, severity: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !token) return;
    setLoading(true);
    try {
      const checkoutData = {
        transactionType: 'SELL',
        items: cart.map(item => ({
          productId: item.id,
          itemType: 'SELL',
          price: item.price,
          fee: item.costFee || 0
        })),
        totalAmount: calculateTotal(),
        discount: 0,
        netAmount: calculateTotal(),
        paymentMethod: 'CASH'
      };

      await posApi.checkout(checkoutData, token);
      setSnackbar({ open: true, message: 'บันทึกรายการขายสำเร็จ', severity: 'success' });
      clearCart();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price || 0), 0);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>
        ระบบหน้าร้าน (POS)
      </Typography>
      
      <Grid container spacing={3} sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {/* Left Side: Product Selection & Barcode */}
        <Grid size={{ xs: 12, md: 8 }} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Paper sx={{ p: 2, mb: 3, borderRadius: 3, display: 'flex', alignItems: 'center' }}>
            <form onSubmit={handleBarcodeSubmit} style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
              <TextField 
                fullWidth 
                variant="outlined" 
                placeholder="สแกนบาร์โค้ด หรือ รหัสสินค้า..." 
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                autoFocus
                slotProps={{
                  input: {
                    startAdornment: <QrCodeScanner sx={{ color: 'text.secondary', mr: 1 }} />,
                    sx: { borderRadius: 2, bgcolor: 'background.default' }
                  }
                }}
              />
              <Button 
                variant="contained" 
                color="primary" 
                type="submit"
                sx={{ ml: 2, height: 56, borderRadius: 2, minWidth: 120 }}
              >
                เพิ่ม
              </Button>
            </form>
          </Paper>

          <Paper sx={{ flexGrow: 1, borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}>
              <Tab label="ขายทองรูปพรรณ" sx={{ fontWeight: 'bold' }} />
              <Tab label="รับซื้อทองเก่า" sx={{ fontWeight: 'bold' }} />
              <Tab label="เปลี่ยนลาย (เทิร์น)" sx={{ fontWeight: 'bold' }} />
            </Tabs>
            
            <Box sx={{ p: 3, overflowY: 'auto', flexGrow: 1, bgcolor: 'background.default' }}>
              {tabValue === 0 && (
                <Grid container spacing={2}>
                  {products.map((p) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p.id}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer', 
                          transition: '0.2s',
                          '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }
                        }}
                        onClick={() => addToCart({...p, price: p.weightGram === 15.16 ? goldPrice.sell + 1500 : (goldPrice.sell / (15.16/p.weightGram)) + 800, uid: Date.now()})}
                      >
                        <CardContent sx={{ textAlign: 'center', p: 3 }}>
                          <Typography variant="h2" sx={{ mb: 2 }}>{p.image}</Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{p.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{p.weightText}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
              {tabValue === 1 && (
                <Box sx={{ textAlign: 'center', mt: 10 }}>
                  <Typography color="text.secondary">ส่วนฟังก์ชันรับซื้อทองเก่า</Typography>
                </Box>
              )}
              {tabValue === 2 && (
                <Box sx={{ textAlign: 'center', mt: 10 }}>
                  <Typography color="text.secondary">ส่วนฟังก์ชันเปลี่ยนลาย</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Right Side: Cart */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ height: '100%' }}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ p: 2, bgcolor: theme.palette.primary.main, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>รายการบิล</Typography>
              <Button size="small" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.2)', '&:hover':{bgcolor: 'rgba(255,255,255,0.3)'} }}>
                <PersonSearch sx={{ mr: 1, fontSize: 18 }} /> เลือกลูกค้า
              </Button>
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: 'background.default' }}>
              {cart.length === 0 ? (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <ShoppingCartCheckout sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                  <Typography color="text.secondary">ยังไม่มีรายการ</Typography>
                </Box>
              ) : (
                <List cart={cart} />
              )}
            </Box>

            <Box sx={{ p: 3, borderTop: '1px solid rgba(0,0,0,0.05)', bgcolor: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="text.secondary">ยอดรวมทั้งหมด</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>฿{calculateTotal().toLocaleString(undefined, {minimumFractionDigits: 2})}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography color="text.secondary">หักส่วนลด</Typography>
                <Typography color="primary" sx={{ fontWeight: 'bold' }}>- ฿0.00</Typography>
              </Box>
              
              <Divider sx={{ mb: 3 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>ยอดสุทธิ</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                  ฿{calculateTotal().toLocaleString(undefined, {minimumFractionDigits: 2})}
                </Typography>
              </Box>

              <Button 
                fullWidth 
                variant="contained" 
                color="primary" 
                size="large"
                sx={{ height: 60, fontSize: '1.2rem', borderRadius: 2 }}
                disabled={cart.length === 0 || loading}
                onClick={handleCheckout}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'รับชำระเงิน'}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// Mini component for cart list
const List = ({ cart }: { cart: any[] }) => (
  <Box>
    {cart.map((item) => (
      <Card key={item.uid} sx={{ mb: 2, boxShadow: 'none', border: '1px solid rgba(0,0,0,0.05)' }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: 'rgba(212, 175, 55, 0.2)', mr: 2 }}>{item.image}</Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{item.name}</Typography>
            <Typography variant="caption" color="text.secondary">{item.weightText} ({item.type === 'sell' ? 'ขายออก' : 'รับซื้อ'})</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>฿{item.price.toLocaleString()}</Typography>
            <IconButton size="small" color="error"><Delete fontSize="small" /></IconButton>
          </Box>
        </Box>
      </Card>
    ))}
  </Box>
);
