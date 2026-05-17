import { Box, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import {
  HorizontalRule,
  Inventory2,
  PriceChange,
  TrendingDown,
  TrendingUp,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import type { GoldPriceHistoryItem, GoldPriceResponse } from '../types';

const currency = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });

type TrendDirection = 'up' | 'down' | 'flat';

interface PriceTrend {
  direction: TrendDirection;
  amount: number;
}

interface GoldPriceTickerProps {
  goldPrice: GoldPriceResponse;
  history?: GoldPriceHistoryItem[];
  subtitle?: string;
}

const parseGoldPrice = (price: string | null | undefined) => {
  if (!price) {
    return 0;
  }
  const parsed = Number(price.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const displayGoldPrice = (price: string | null | undefined) => price ? `${price} บาท` : '-';

const comparePrice = (current: number, previous?: number | null): PriceTrend => {
  if (!previous || !current) {
    return { direction: 'flat', amount: 0 };
  }
  const amount = current - previous;
  if (amount > 0) {
    return { direction: 'up', amount };
  }
  if (amount < 0) {
    return { direction: 'down', amount: Math.abs(amount) };
  }
  return { direction: 'flat', amount: 0 };
};

const trendMeta = (trend: PriceTrend) => {
  if (trend.direction === 'up') {
    return { color: 'success' as const, icon: <TrendingUp fontSize="small" />, label: `ขึ้น ${currency.format(trend.amount)}` };
  }
  if (trend.direction === 'down') {
    return { color: 'error' as const, icon: <TrendingDown fontSize="small" />, label: `ลง ${currency.format(trend.amount)}` };
  }
  return { color: 'default' as const, icon: <HorizontalRule fontSize="small" />, label: 'เท่าเดิม' };
};

const TrendChip = ({ trend }: { trend: PriceTrend }) => {
  const meta = trendMeta(trend);
  return (
    <Chip
      size="small"
      color={meta.color}
      icon={meta.icon}
      label={meta.label}
      sx={{ fontWeight: 700, '& .MuiChip-icon': { ml: 0.75 } }}
    />
  );
};

export const GoldPriceTicker = ({ goldPrice, history = [], subtitle }: GoldPriceTickerProps) => {
  const sortedHistory = history.slice().sort((left, right) =>
    new Date(left.effectiveDate).getTime() - new Date(right.effectiveDate).getTime(),
  );
  const previous = sortedHistory.length >= 2 ? sortedHistory[sortedHistory.length - 2] : undefined;

  const cards = [
    {
      title: 'ทองคำแท่ง',
      subtitle: 'อ้างอิงต่อ 1 บาททองคำ',
      buy: goldPrice.bar.buy,
      sell: goldPrice.bar.sell,
      buyTrend: comparePrice(parseGoldPrice(goldPrice.bar.buy), previous?.buyPrice),
      sellTrend: comparePrice(parseGoldPrice(goldPrice.bar.sell), previous?.sellPrice),
      icon: <PriceChange />,
      gradient: 'linear-gradient(135deg, rgba(183,28,28,0.12), rgba(212,175,55,0.24))',
      accent: '#d4af37',
    },
    {
      title: 'ทองรูปพรรณ',
      subtitle: 'ราคาประกาศหน้าร้าน',
      buy: goldPrice.ornament.buy,
      sell: goldPrice.ornament.sell,
      buyTrend: comparePrice(parseGoldPrice(goldPrice.ornament.buy), previous?.ornamentBuyPrice),
      sellTrend: comparePrice(parseGoldPrice(goldPrice.ornament.sell), previous?.ornamentSellPrice),
      icon: <Inventory2 />,
      gradient: 'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(255,255,255,0.78))',
      accent: '#b71c1c',
    },
  ];

  return (
    <Card
      sx={{
        overflow: 'hidden',
        border: '1px solid rgba(212,175,55,0.35)',
        background: 'linear-gradient(120deg, rgba(255,248,225,0.95), rgba(255,255,255,0.92), rgba(183,28,28,0.06))',
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>ราคาทองวันนี้</Typography>
              <Typography variant="body2" color="text.secondary">{subtitle ?? 'ติดตามราคาแบบเรียลไทม์สำหรับหน้าร้าน'}</Typography>
              <Typography variant="caption" color="text.secondary">อัปเดต: {goldPrice.updateTime || '-'}</Typography>
            </Box>
          </Stack>

          <Grid container spacing={1.5}>
            {cards.map((card, index) => (
              <Grid key={card.title} size={{ xs: 12, md: 6 }}>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.08 }}
                  whileHover={{ y: -2 }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      overflow: 'hidden',
                      border: '1px solid rgba(212,175,55,0.3)',
                      borderRadius: 2,
                      p: 1.5,
                      background: card.gradient,
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent)',
                        transform: 'translateX(-120%)',
                        animation: 'priceTickerShine 3.8s ease-in-out infinite',
                      },
                      '@keyframes priceTickerShine': {
                        '0%': { transform: 'translateX(-120%)' },
                        '45%': { transform: 'translateX(120%)' },
                        '100%': { transform: 'translateX(120%)' },
                      },
                    }}
                  >
                    <Stack spacing={1.25} sx={{ position: 'relative', zIndex: 1 }}>
                      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                        <Box sx={{ color: card.accent, bgcolor: 'rgba(255,255,255,0.7)', p: 1, borderRadius: 1 }}>
                          {card.icon}
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 900 }}>{card.title}</Typography>
                          <Typography variant="caption" color="text.secondary">{card.subtitle}</Typography>
                        </Box>
                      </Stack>

                      <Grid container spacing={1}>
                        <Grid size={6}>
                          <Stack spacing={0.75}>
                            <Typography variant="body2" color="text.secondary">รับซื้อ</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 900 }}>{displayGoldPrice(card.buy)}</Typography>
                            <TrendChip trend={card.buyTrend} />
                          </Stack>
                        </Grid>
                        <Grid size={6}>
                          <Stack spacing={0.75}>
                            <Typography variant="body2" color="text.secondary">ขายออก</Typography>
                            <Typography variant="h6" color="primary.main" sx={{ fontWeight: 900 }}>{displayGoldPrice(card.sell)}</Typography>
                            <TrendChip trend={card.sellTrend} />
                          </Stack>
                        </Grid>
                      </Grid>
                    </Stack>
                  </Box>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  );
};
