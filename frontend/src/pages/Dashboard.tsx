import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import {
  AccountBalanceWallet,
  Inventory2,
  LocalAtm,
  NotificationsActive,
  PointOfSale,
  Save,
} from '@mui/icons-material';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import { systemApi } from '../api/systemApi';
import { getErrorMessage } from '../api/client';
import { useStore } from '../store/useStore';
import type { DashboardSummary } from '../types';

const currency = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });
const number = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 });

interface ChartPoint {
  name: string;
  price: number;
}

export const Dashboard = () => {
  const theme = useTheme();
  const { goldPrice, setGoldPriceFromApi } = useStore();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [history, setHistory] = useState<ChartPoint[]>([]);
  const [manualBuy, setManualBuy] = useState('');
  const [manualSell, setManualSell] = useState('');
  const [error, setError] = useState('');
  const [updatingPrice, setUpdatingPrice] = useState(false);

  const load = async () => {
    setError('');
    try {
      const [price, historyRows, dashboard] = await Promise.all([
        systemApi.goldPrice(),
        systemApi.goldPriceHistory(),
        systemApi.dashboard(),
      ]);
      setGoldPriceFromApi(price);
      setManualBuy(price.bar.buy ?? '');
      setManualSell(price.bar.sell ?? '');
      setSummary(dashboard);
      setHistory(historyRows.slice().reverse().map((item) => ({
        name: new Date(item.effectiveDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        price: item.sellPrice,
      })));
    } catch (err) {
      setError(getErrorMessage(err, 'ไม่สามารถโหลดข้อมูลหน้าหลักได้'));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const alerts = useMemo(() => {
    const lowStock = summary?.lowStock ?? [];
    return [
      {
        title: 'ตั๋วจำนำใกล้ครบกำหนด',
        value: summary?.nearDuePawnTickets ?? 0,
        detail: 'รายการที่ต้องติดตามภายใน 7 วัน',
      },
      ...lowStock.map((item) => ({
        title: `สต๊อก ${item.category} ใกล้หมด`,
        value: item.count,
        detail: 'จำนวนชิ้นพร้อมขายในถาดนี้',
      })),
    ];
  }, [summary]);

  const updatePrice = async () => {
    setError('');
    setUpdatingPrice(true);
    try {
      await systemApi.updateGoldPrice(Number(manualBuy.replace(/,/g, '')), Number(manualSell.replace(/,/g, '')));
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'ไม่สามารถอัปเดตราคาทองได้'));
    } finally {
      setUpdatingPrice(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>หน้าหลัก</Typography>
          <Typography variant="body2" color="text.secondary">อัปเดตราคา: {goldPrice.updateTime || '-'}</Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField size="small" label="รับซื้อทองคำแท่ง" value={manualBuy} onChange={(event) => setManualBuy(event.target.value)} />
          <TextField size="small" label="ขายออกทองคำแท่ง" value={manualSell} onChange={(event) => setManualSell(event.target.value)} />
          <Button
            variant="contained"
            startIcon={updatingPrice ? <CircularProgress size={18} color="inherit" /> : <Save />}
            onClick={updatePrice}
            disabled={updatingPrice}
          >
            {updatingPrice ? 'กำลังอัปเดต...' : 'อัปเดต'}
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2}>
        {[
          { label: 'ยอดขายวันนี้', value: currency.format(summary?.dailySalesAmount ?? 0), icon: <PointOfSale /> },
          { label: 'บิลวันนี้', value: number.format(summary?.dailyTransactionCount ?? 0), icon: <LocalAtm /> },
          { label: 'ทองพร้อมขาย', value: `${number.format(summary?.availableInventoryWeightGram ?? 0)} กรัม`, icon: <Inventory2 /> },
          { label: 'ตั๋วใกล้ครบกำหนด', value: number.format(summary?.nearDuePawnTickets ?? 0), icon: <AccountBalanceWallet /> },
        ].map((card) => (
          <Grid key={card.label} size={{ xs: 12, sm: 6, lg: 3 }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ color: 'primary.main', bgcolor: 'rgba(183,28,28,0.08)', p: 1, borderRadius: 1 }}>
                    {card.icon}
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{card.value}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>แนวโน้มราคาทองคำแท่ง</Typography>
              <Box sx={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.secondary.main} stopOpacity={0.7} />
                        <stop offset="95%" stopColor={theme.palette.secondary.main} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis domain={['dataMin - 100', 'dataMax + 100']} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => [currency.format(Number(value)), 'ขายออก']} />
                    <Area dataKey="price" type="monotone" stroke={theme.palette.secondary.main} fill="url(#priceGradient)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                <NotificationsActive color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>แจ้งเตือน</Typography>
              </Stack>
              <Stack spacing={2} divider={<Divider flexItem />}>
                {alerts.map((alert) => (
                  <Box key={alert.title}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                      <Typography sx={{ fontWeight: 700 }}>{alert.title}</Typography>
                      <Typography color="primary.main" sx={{ fontWeight: 700 }}>{alert.value}</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">{alert.detail}</Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};
