
import { useState, useEffect } from 'react';
import { 
  Box, Grid, Card, CardContent, Typography, 
  Divider, useTheme
} from '@mui/material';
import { useAuthStore } from '../store/useAuthStore';
import { pawnApi } from '../api/pawnApi';
import { 
  AccountBalanceWallet, 
  LocalAtm
} from '@mui/icons-material';
import { useStore } from '../store/useStore';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';

const data = [
  { name: '09:00', price: 40050 },
  { name: '10:00', price: 40100 },
  { name: '11:00', price: 40050 },
  { name: '12:00', price: 40150 },
  { name: '13:00', price: 40200 },
  { name: '14:00', price: 40150 },
  { name: '15:00', price: 40250 },
];

export const Dashboard = () => {
  const theme = useTheme();
  const { goldPrice, setGoldPriceFromApi } = useStore();
  const token = useAuthStore((state) => state.token);
  const [summary, setSummary] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);

  useEffect(() => {
    const fetchGoldPrice = async () => {
      if (!token) return;
      try {
        const response = await fetch('http://localhost:8080/api/v1/gold-price', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setGoldPriceFromApi(data);
      } catch (err) {
        console.error('Failed to fetch gold price:', err);
      }
    };

    const fetchHistory = async () => {
      if (!token) return;
      try {
        const response = await fetch('http://localhost:8080/api/v1/gold-price/history', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const formatted = data.reverse().map((item: any) => ({
          name: new Date(item.effectiveDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          price: item.sellPrice
        }));
        setHistoryData(formatted);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchSummary = async () => {
      if (!token) return;
      try {
        const data = await pawnApi.getSummary(token);
        setSummary(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchGoldPrice();
    fetchHistory();
    fetchSummary();
  }, [token, setGoldPriceFromApi]);

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          ภาพรวมร้านทอง
        </Typography>
        <Typography variant="body2" color="text.secondary">
          อัปเดตล่าสุด: {goldPrice.updatedAt}
        </Typography>
      </Box>

      {/* Gold Price Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #B71C1C 0%, #E53935 100%)', 
            color: 'white',
            boxShadow: '0 8px 32px rgba(183, 28, 28, 0.3)',
            borderRadius: 4
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ opacity: 0.9, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountBalanceWallet fontSize="small" /> ทองคำแท่ง (96.5%)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>รับซื้อ</Typography>
                  <Typography variant="h4" fontWeight="bold">฿{goldPrice.bar.buy}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>ขายออก</Typography>
                  <Typography variant="h4" fontWeight="bold">฿{goldPrice.bar.sell}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #D4AF37 0%, #FFD700 100%)', 
            color: 'black',
            boxShadow: '0 8px 32px rgba(212, 175, 55, 0.3)',
            borderRadius: 4
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ opacity: 0.8, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalAtm fontSize="small" /> ทองรูปพรรณ (96.5%)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>รับซื้อ (ฐานภาษี)</Typography>
                  <Typography variant="h4" fontWeight="bold">฿{goldPrice.ornament.buy}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>ขายออก</Typography>
                  <Typography variant="h4" fontWeight="bold">฿{goldPrice.ornament.sell}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(183, 28, 28, 0.1)', color: theme.palette.primary.main, mr: 2 }}>
                <LocalAtm />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">ยอดขายวันนี้</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>฿125,000</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(212, 175, 55, 0.1)', color: theme.palette.secondary.dark, mr: 2 }}>
                <AccountBalanceWallet />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">ยอดรับจำนำวันนี้</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  ฿{summary?.totalPrincipal?.toLocaleString() || '0'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: '100%', borderRadius: 4 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                แนวโน้มราคาทองคำแท่ง (ย้อนหลัง 20 รายการ)
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.secondary.main} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={theme.palette.secondary.main} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#888'}} />
                    <YAxis domain={['dataMin - 100', 'dataMax + 100']} axisLine={false} tickLine={false} tick={{fill: '#888'}} />
                    <Tooltip 
                      formatter={(value: any) => [`฿${value.toLocaleString()}`, 'ราคาขายออก']}
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Area type="monotone" dataKey="price" stroke={theme.palette.secondary.main} strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                การแจ้งเตือนด่วน
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                    ตั๋วจำนำใกล้หมดอายุ
                  </Typography>
                  <Typography variant="caption" sx={{ bgcolor: 'rgba(183,28,28,0.1)', color: theme.palette.primary.main, px: 1, py: 0.5, borderRadius: 1 }}>
                    {summary?.nearDueCount || 0} รายการ
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  กรุณาติดต่อลูกค้าเพื่อต่อดอกเบี้ย
                </Typography>
                <Divider sx={{ my: 2 }} />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: theme.palette.secondary.dark }}>
                    สต๊อกทองลายยอดฮิตใกล้หมด
                  </Typography>
                  <Typography variant="caption" sx={{ bgcolor: 'rgba(212,175,55,0.1)', color: theme.palette.secondary.dark, px: 1, py: 0.5, borderRadius: 1 }}>
                    2 รายการ
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  - สร้อยคอ ลายกระดูกงู 1 บาท
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  - แหวน ลายหัวโปร่ง 1 สลึง
                </Typography>
              </Box>
              
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
