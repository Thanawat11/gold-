import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  AccountBalance,
  AddShoppingCart,
  CreditCard,
  Delete,
  Diamond,
  Payments,
  QrCode2,
  QrCodeScanner,
  Scale,
} from '@mui/icons-material';
import { posApi } from '../api/posApi';
import { getErrorMessage } from '../api/client';
import { useStore } from '../store/useStore';
import type { PaymentMethod, Product, TransactionType } from '../types';

const currency = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });

const paymentOptions: Array<{ value: PaymentMethod; label: string; icon: ReactNode }> = [
  { value: 'CASH', label: 'เงินสด', icon: <Payments fontSize="small" /> },
  { value: 'PROMPTPAY', label: 'PromptPay', icon: <QrCode2 fontSize="small" /> },
  { value: 'TRANSFER', label: 'โอนเงิน', icon: <AccountBalance fontSize="small" /> },
  { value: 'CREDIT_CARD', label: 'บัตรเครดิต', icon: <CreditCard fontSize="small" /> },
];

const itemId = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  const values = new Uint32Array(2);
  window.crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16)).join('-');
};

export const Pos = () => {
  const { goldPrice, cart, addToCart, removeFromCart, clearCart } = useStore();
  const [tab, setTab] = useState(0);
  const [barcode, setBarcode] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [loadingAction, setLoadingAction] = useState<'barcode' | 'sell' | 'buy' | 'checkout' | null>(null);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  const [buyForm, setBuyForm] = useState({ weightGram: '', deductionPercent: '5', overrideAmount: '', description: 'ทองเก่ารับซื้อ' });
  const isBusy = loadingAction !== null;

  const loadProducts = async () => {
    try {
      setProducts(await posApi.getAvailableProducts());
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'ไม่สามารถดึงข้อมูลสินค้าได้'), severity: 'error' });
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const total = useMemo(() => cart.reduce((sum, item) => {
    const signed = item.itemType === 'BUY' ? -item.price : item.price;
    return sum + signed;
  }, 0), [cart]);

  const addSellItem = async (product: Product) => {
    setLoadingAction('sell');
    try {
      const quote = await posApi.quoteSell({
        weightGram: product.weightGram,
        goldPricePerBaht: goldPrice.sell,
        makingFee: product.costFee ?? 0,
        makingFeeDiscount: 0,
      });
      addToCart({
        uid: itemId(),
        productId: product.id,
        name: product.name,
        weightText: product.weightText,
        itemType: 'SELL',
        price: quote.netAmount,
        fee: quote.feeAmount,
      });
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'คำนวณราคาขายไม่สำเร็จ'), severity: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const submitBarcode = async (event: FormEvent) => {
    event.preventDefault();
    if (!barcode.trim()) {
      return;
    }
    setLoadingAction('barcode');
    try {
      const product = await posApi.searchByBarcode(barcode.trim());
      const quote = await posApi.quoteSell({
        weightGram: product.weightGram,
        goldPricePerBaht: goldPrice.sell,
        makingFee: product.costFee ?? 0,
        makingFeeDiscount: 0,
      });
      addToCart({
        uid: itemId(),
        productId: product.id,
        name: product.name,
        weightText: product.weightText,
        itemType: 'SELL',
        price: quote.netAmount,
        fee: quote.feeAmount,
      });
      setBarcode('');
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'ไม่พบสินค้า'), severity: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const addBuyItem = async () => {
    setLoadingAction('buy');
    try {
      const quote = await posApi.quoteBuy({
        weightGram: Number(buyForm.weightGram),
        goldPricePerBaht: goldPrice.buy,
        wearDeductionPercent: Number(buyForm.deductionPercent),
        overrideAmount: buyForm.overrideAmount ? Number(buyForm.overrideAmount) : undefined,
      });
      addToCart({
        uid: itemId(),
        name: buyForm.description,
        weightText: `${buyForm.weightGram} กรัม`,
        itemType: 'BUY',
        price: quote.netAmount,
        fee: quote.deductionAmount,
      });
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'คำนวณราคารับซื้อไม่สำเร็จ'), severity: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const checkout = async () => {
    if (cart.length === 0) {
      return;
    }
    setLoadingAction('checkout');
    const hasSell = cart.some((item) => item.itemType === 'SELL');
    const hasBuy = cart.some((item) => item.itemType === 'BUY');
    const transactionType: TransactionType = hasSell && hasBuy ? 'TRADE_IN' : hasBuy ? 'BUY' : 'SELL';

    try {
      await posApi.checkout({
        transactionType,
        paymentMethod,
        totalAmount: total,
        discount: 0,
        netAmount: total,
        items: cart.map((item) => ({
          productId: item.productId,
          itemType: item.itemType,
          price: item.price,
          fee: item.fee,
        })),
      });
      setMessage({ text: 'บันทึกบิลสำเร็จ', severity: 'success' });
      clearCart();
      await loadProducts();
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'บันทึกบิลไม่สำเร็จ'), severity: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>ระบบหน้าร้าน</Typography>
        <Typography variant="body2" color="text.secondary">ขาย รับซื้อ และเปลี่ยนลายในบิลเดียว</Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={2}>
            <Paper component="form" onSubmit={submitBarcode} sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  fullWidth
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  placeholder="สแกนหรือกรอกบาร์โค้ด"
                  slotProps={{ input: { startAdornment: <QrCodeScanner sx={{ mr: 1, color: 'text.secondary' }} /> } }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loadingAction === 'barcode' ? <CircularProgress size={18} color="inherit" /> : <AddShoppingCart />}
                  disabled={isBusy}
                >
                  {loadingAction === 'barcode' ? 'กำลังเพิ่ม...' : 'เพิ่ม'}
                </Button>
              </Stack>
            </Paper>

            <Paper>
              <Tabs value={tab} onChange={(_, value: number) => setTab(value)} variant="scrollable" scrollButtons="auto">
                <Tab label="ขายทอง" />
                <Tab label="รับซื้อทองเก่า" />
                <Tab label="เปลี่ยนลาย" />
              </Tabs>
              <Divider />
              <Box sx={{ p: 2 }}>
                {tab === 0 && (
                  <Grid container spacing={2}>
                    {products.map((product) => (
                      <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4 }}>
                        <Card
                          sx={{ height: '100%', cursor: isBusy ? 'default' : 'pointer', opacity: isBusy ? 0.72 : 1 }}
                          onClick={() => { if (!isBusy) void addSellItem(product); }}
                        >
                          <CardContent>
                            <Stack spacing={1}>
                              <Diamond color="secondary" />
                              <Typography sx={{ fontWeight: 700 }}>{product.name}</Typography>
                              <Typography variant="body2" color="text.secondary">{product.weightText || `${product.weightGram} กรัม`}</Typography>
                              <Typography variant="caption" color="text.secondary">{product.barcode}</Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}

                {tab !== 0 && (
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField fullWidth label="รายละเอียดทองเก่า" value={buyForm.description} onChange={(event) => setBuyForm({ ...buyForm, description: event.target.value })} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="น้ำหนัก"
                        type="number"
                        value={buyForm.weightGram}
                        onChange={(event) => setBuyForm({ ...buyForm, weightGram: event.target.value })}
                        slotProps={{ input: { endAdornment: <InputAdornment position="end">กรัม</InputAdornment> } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="หักค่าสึกหรอ"
                        type="number"
                        value={buyForm.deductionPercent}
                        onChange={(event) => setBuyForm({ ...buyForm, deductionPercent: event.target.value })}
                        slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="ราคา Override"
                        type="number"
                        value={buyForm.overrideAmount}
                        onChange={(event) => setBuyForm({ ...buyForm, overrideAmount: event.target.value })}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start">฿</InputAdornment> } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Button
                        variant="contained"
                        startIcon={loadingAction === 'buy' ? <CircularProgress size={18} color="inherit" /> : <Scale />}
                        onClick={addBuyItem}
                        disabled={!buyForm.weightGram || isBusy}
                      >
                        {loadingAction === 'buy' ? 'กำลังคำนวณ...' : 'เพิ่มรายการรับซื้อ'}
                      </Button>
                    </Grid>
                  </Grid>
                )}
              </Box>
            </Paper>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 2, position: { lg: 'sticky' }, top: 88 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>รายการบิล</Typography>
            <Stack spacing={1.5} sx={{ my: 2, maxHeight: 420, overflow: 'auto' }}>
              {cart.length === 0 && <Alert severity="info">ยังไม่มีรายการในบิล</Alert>}
              {cart.map((item) => (
                <Card key={item.uid} variant="outlined">
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.weightText} · {item.itemType === 'SELL' ? 'ขายออก' : 'รับซื้อ'}</Typography>
                      </Box>
                      <Typography color={item.itemType === 'BUY' ? 'error.main' : 'text.primary'} sx={{ fontWeight: 700 }}>
                        {item.itemType === 'BUY' ? '-' : ''}{currency.format(item.price)}
                      </Typography>
                      <IconButton size="small" color="error" onClick={() => removeFromCart(item.uid)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
            <Divider sx={{ my: 2 }} />
            <TextField
              select
              fullWidth
              label="ช่องทางชำระเงิน"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
              sx={{ mb: 2 }}
            >
              {paymentOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>{option.icon}<span>{option.label}</span></Stack>
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>ยอดสุทธิ</Typography>
              <Typography variant="h5" color={total < 0 ? 'error.main' : 'primary.main'} sx={{ fontWeight: 800 }}>{currency.format(total)}</Typography>
            </Stack>
            <Button fullWidth variant="contained" size="large" onClick={checkout} disabled={cart.length === 0 || isBusy}>
              {loadingAction === 'checkout' ? <CircularProgress size={24} color="inherit" /> : 'รับชำระเงิน'}
            </Button>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar open={Boolean(message)} autoHideDuration={5000} onClose={() => setMessage(null)}>
        <Alert severity={message?.severity ?? 'success'} onClose={() => setMessage(null)}>{message?.text}</Alert>
      </Snackbar>
    </Stack>
  );
};
