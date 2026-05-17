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
import { Area, AreaChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import { systemApi } from '../api/systemApi';
import { getErrorMessage } from '../api/client';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import { GoldPriceTicker } from '../components/GoldPriceTicker';
import type { DashboardSummary, GoldPriceHistoryItem } from '../types';

const currency = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });
const number = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 });

interface ChartPoint {
  name: string;
  barSell: number;
  ornamentSell?: number;
}

const parsePriceInput = (value: string) => Number(value.replace(/,/g, ''));
const parseOptionalPriceInput = (value: string) => {
  const normalized = value.trim();
  return normalized ? parsePriceInput(normalized) : null;
};

export const Dashboard = () => {
  const theme = useTheme();
  const { goldPrice, setGoldPriceFromApi } = useStore();
  const user = useAuthStore((state) => state.user);
  const canUpdatePrice = user?.role === 'OWNER';
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [history, setHistory] = useState<ChartPoint[]>([]);
  const [goldHistory, setGoldHistory] = useState<GoldPriceHistoryItem[]>([]);
  const [manualBuy, setManualBuy] = useState('');
  const [manualSell, setManualSell] = useState('');
  const [manualOrnamentBuy, setManualOrnamentBuy] = useState('');
  const [manualOrnamentSell, setManualOrnamentSell] = useState('');
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
      setManualOrnamentBuy(price.ornament.buy ?? '');
      setManualOrnamentSell(price.ornament.sell ?? '');
      setSummary(dashboard);
      setGoldHistory(historyRows);
      setHistory(historyRows.slice().reverse().map((item) => ({
        name: new Date(item.effectiveDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        barSell: item.sellPrice,
        ornamentSell: item.ornamentSellPrice ?? undefined,
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
      await systemApi.updateGoldPrice({
        barBuyPrice: parsePriceInput(manualBuy),
        barSellPrice: parsePriceInput(manualSell),
        ornamentBuyPrice: parseOptionalPriceInput(manualOrnamentBuy),
        ornamentSellPrice: parseOptionalPriceInput(manualOrnamentSell),
      });
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
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <TextField size="small" label="แท่งรับซื้อ" value={manualBuy} onChange={(event) => setManualBuy(event.target.value)} disabled={!canUpdatePrice} sx={{ minWidth: 150 }} />
          <TextField size="small" label="แท่งขายออก" value={manualSell} onChange={(event) => setManualSell(event.target.value)} disabled={!canUpdatePrice} sx={{ minWidth: 150 }} />
          <TextField size="small" label="รูปพรรณรับซื้อ" value={manualOrnamentBuy} onChange={(event) => setManualOrnamentBuy(event.target.value)} disabled={!canUpdatePrice} sx={{ minWidth: 160 }} />
          <TextField size="small" label="รูปพรรณขายออก" value={manualOrnamentSell} onChange={(event) => setManualOrnamentSell(event.target.value)} disabled={!canUpdatePrice} sx={{ minWidth: 160 }} />
          <Button
            variant="contained"
            startIcon={updatingPrice ? <CircularProgress size={18} color="inherit" /> : <Save />}
            onClick={updatePrice}
            disabled={updatingPrice || !canUpdatePrice}
          >
            {updatingPrice ? 'กำลังอัปเดต...' : 'อัปเดต'}
          </Button>
        </Stack>
      </Box>

      {!canUpdatePrice && <Alert severity="info">การแก้ราคาทองทำได้เฉพาะ Owner เพื่อป้องกันการแก้ราคาเองของพนักงาน</Alert>}

      {error && <Alert severity="error">{error}</Alert>}

      <GoldPriceTicker
        goldPrice={goldPrice}
        history={goldHistory}
        subtitle="ดูทิศทางราคาล่าสุดพร้อมสัญลักษณ์ขึ้น/ลงหลังอัปเดต"
      />

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
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>แนวโน้มราคาทอง</Typography>
              <Box sx={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="barPriceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.secondary.main} stopOpacity={0.7} />
                        <stop offset="95%" stopColor={theme.palette.secondary.main} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ornamentPriceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis domain={['dataMin - 100', 'dataMax + 100']} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value, name) => [currency.format(Number(value)), String(name)]} />
                    <Legend />
                    <Area
                      dataKey="barSell"
                      name="ทองคำแท่งขายออก"
                      type="monotone"
                      stroke={theme.palette.secondary.main}
                      fill="url(#barPriceGradient)"
                      strokeWidth={3}
                    />
                    <Area
                      dataKey="ornamentSell"
                      name="ทองรูปพรรณขายออก"
                      type="monotone"
                      stroke={theme.palette.primary.main}
                      fill="url(#ornamentPriceGradient)"
                      strokeWidth={3}
                      connectNulls
                    />
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
