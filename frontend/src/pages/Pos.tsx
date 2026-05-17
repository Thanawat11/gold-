import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  Print,
  QrCode2,
  QrCodeScanner,
  ReceiptLong,
  Scale,
} from '@mui/icons-material';
import { posApi } from '../api/posApi';
import { systemApi } from '../api/systemApi';
import { getErrorMessage } from '../api/client';
import { useStore } from '../store/useStore';
import { GoldPriceTicker } from '../components/GoldPriceTicker';
import type { CartItem, CheckoutPaymentRequest, Customer, GoldPriceHistoryItem, PaymentMethod, Product, TransactionType } from '../types';

type SalePaymentMethod = Exclude<PaymentMethod, 'MIXED'>;

const currency = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });
const number = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 });

const paymentOptions: Array<{ value: SalePaymentMethod; label: string; icon: ReactNode }> = [
  { value: 'CASH', label: 'เงินสด', icon: <Payments fontSize="small" /> },
  { value: 'PROMPTPAY', label: 'PromptPay', icon: <QrCode2 fontSize="small" /> },
  { value: 'TRANSFER', label: 'โอนเงิน', icon: <AccountBalance fontSize="small" /> },
  { value: 'CREDIT_CARD', label: 'บัตรเครดิต', icon: <CreditCard fontSize="small" /> },
];

const weightOptions = [
  { value: 'ALL', label: 'ทั้งหมด' },
  { value: '0.5', label: 'ครึ่งสลึง', salueng: 0.5 },
  { value: '1', label: '1 สลึง', salueng: 1 },
  { value: '2', label: '2 สลึง', salueng: 2 },
  { value: '4', label: '1 บาท', salueng: 4 },
];

interface ReceiptState {
  receiptNumber: string;
  transactionDate: string;
  customer?: Customer;
  items: CartItem[];
  payments: CheckoutPaymentRequest[];
  totalAmount: number;
  discount: number;
  netAmount: number;
  transactionType: TransactionType;
}

const itemId = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  const values = new Uint32Array(2);
  window.crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16)).join('-');
};

const parseMoney = (value: string) => {
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const optionalMoney = (value: string) => {
  const normalized = value.trim();
  return normalized ? parseMoney(normalized) : undefined;
};

const parseGoldPrice = (price: string | null | undefined) => {
  if (!price) {
    return 0;
  }
  return Number(price.replace(/,/g, ''));
};

const formatGoldWeight = (weightGram: number, gramsPerBaht: number | null) => {
  if (!gramsPerBaht || weightGram <= 0) {
    return `${number.format(weightGram)} กรัม`;
  }
  const baht = weightGram / gramsPerBaht;
  const salueng = baht * 4;
  const roundedSalueng = Math.round(salueng);
  if (Math.abs(salueng - roundedSalueng) <= 0.02) {
    if (roundedSalueng === 2) {
      return '2 สลึง';
    }
    if (roundedSalueng === 4) {
      return '1 บาท';
    }
    return `${number.format(roundedSalueng)} สลึง`;
  }
  return `${number.format(weightGram)} กรัม (${number.format(baht)} บาททอง)`;
};

const formatBahtGold = (weightGram: number, gramsPerBaht: number | null) => {
  if (!gramsPerBaht || weightGram <= 0) {
    return '-';
  }
  const baht = weightGram / gramsPerBaht;
  const salueng = baht * 4;
  const roundedSalueng = Math.round(salueng);
  if (Math.abs(salueng - roundedSalueng) <= 0.02) {
    if (roundedSalueng === 4) {
      return '1 บาททอง';
    }
    return `${number.format(roundedSalueng)} สลึง`;
  }
  return `${number.format(baht)} บาททอง`;
};

const paymentLabel = (method: PaymentMethod) => paymentOptions.find((option) => option.value === method)?.label ?? 'ผสมหลายช่องทาง';

const searchableProductText = (product: Product) => [
  product.id,
  product.barcode,
  product.qrCode,
  product.name,
  product.category,
  product.design,
  product.weightText,
].filter(Boolean).join(' ').toLowerCase();

export const Pos = () => {
  const { goldPrice, cart, addToCart, removeFromCart, clearCart } = useStore();
  const [tab, setTab] = useState(0);
  const [barcode, setBarcode] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [goldHistory, setGoldHistory] = useState<GoldPriceHistoryItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [makingFee, setMakingFee] = useState('');
  const [discount, setDiscount] = useState('0');
  const [weightFilter, setWeightFilter] = useState('ALL');
  const [gramsPerBaht, setGramsPerBaht] = useState<number | null>(null);
  const [payments, setPayments] = useState<Record<SalePaymentMethod, string>>({
    CASH: '',
    TRANSFER: '',
    PROMPTPAY: '',
    CREDIT_CARD: '',
  });
  const [lastReceipt, setLastReceipt] = useState<ReceiptState | null>(null);
  const [loadingAction, setLoadingAction] = useState<'barcode' | 'sell' | 'buy' | 'checkout' | null>(null);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  const [buyForm, setBuyForm] = useState({
    weightGram: '',
    deductionPercent: '',
    fixedDeduction: '',
    overrideAmount: '',
    description: 'ทองเก่ารับซื้อ',
  });
  const isBusy = loadingAction !== null;

  const barBuyPrice = parseGoldPrice(goldPrice.bar.buy) || goldPrice.buy;
  const barSellPrice = parseGoldPrice(goldPrice.bar.sell) || goldPrice.sell;

  const loadProducts = async () => {
    try {
      const [productRows, customerRows, settings, historyRows] = await Promise.all([
        posApi.getAvailableProducts(),
        systemApi.customers().catch(() => []),
        systemApi.settings().catch(() => null),
        systemApi.goldPriceHistory().catch(() => []),
      ]);
      setProducts(productRows);
      setCustomers(customerRows);
      setGoldHistory(historyRows);
      setGramsPerBaht(settings?.gramsPerBaht ?? null);
      if (settings) {
        setBuyForm((current) => ({
          ...current,
          deductionPercent: current.deductionPercent || String(settings.wearDeductionPercent ?? ''),
          fixedDeduction: current.fixedDeduction || String(settings.buyFixedDeductionAmount ?? ''),
        }));
      }
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

  const totalDiscount = useMemo(() => cart.reduce((sum, item) => sum + (item.discount ?? 0), 0), [cart]);
  const grossTotal = useMemo(() => total + totalDiscount, [total, totalDiscount]);
  const dueAmount = Math.abs(total);
  const paidAmount = useMemo(() => paymentOptions.reduce((sum, option) => sum + parseMoney(payments[option.value]), 0), [payments]);
  const remainingAmount = dueAmount - paidAmount;

  useEffect(() => {
    if (cart.length === 0) {
      setPayments({ CASH: '', TRANSFER: '', PROMPTPAY: '', CREDIT_CARD: '' });
      return;
    }
    if (dueAmount > 0) {
      setPayments({ CASH: dueAmount.toFixed(2), TRANSFER: '', PROMPTPAY: '', CREDIT_CARD: '' });
    }
  }, [cart.length, dueAmount]);

  const filteredProducts = useMemo(() => {
    const selectedWeight = weightOptions.find((option) => option.value === weightFilter);
    if (!selectedWeight?.salueng || !gramsPerBaht) {
      return products;
    }
    const targetGram = gramsPerBaht * (selectedWeight.salueng / 4);
    const tolerance = Math.max(0.08, targetGram * 0.025);
    return products.filter((product) => Math.abs(product.weightGram - targetGram) <= tolerance);
  }, [gramsPerBaht, products, weightFilter]);

  const visibleProducts = useMemo(() => {
    const query = barcode.trim().toLowerCase();
    if (!query) {
      return filteredProducts;
    }
    return filteredProducts.filter((product) => searchableProductText(product).includes(query));
  }, [barcode, filteredProducts]);

  const salePreview = useMemo(() => {
    if (!selectedProduct || !gramsPerBaht) {
      return { goldAmount: 0, goldBaht: 0, makingFeeAmount: parseMoney(makingFee), discountAmount: parseMoney(discount), netAmount: 0 };
    }
    const goldBaht = selectedProduct.weightGram / gramsPerBaht;
    const goldAmount = goldBaht * barSellPrice;
    const makingFeeAmount = parseMoney(makingFee);
    const discountAmount = parseMoney(discount);
    return {
      goldAmount,
      goldBaht,
      makingFeeAmount,
      discountAmount,
      netAmount: Math.max(0, goldAmount + makingFeeAmount - discountAmount),
    };
  }, [barSellPrice, discount, gramsPerBaht, makingFee, selectedProduct]);

  const buyPreview = useMemo(() => {
    const weightGram = parseMoney(buyForm.weightGram);
    const deductionPercent = parseMoney(buyForm.deductionPercent);
    const fixedDeduction = parseMoney(buyForm.fixedDeduction);
    const goldAmount = gramsPerBaht && weightGram > 0 ? (weightGram / gramsPerBaht) * barBuyPrice : 0;
    const percentDeduction = goldAmount * (deductionPercent / 100);
    const deductionTotal = percentDeduction + fixedDeduction;
    const suggestedAmount = Math.max(0, goldAmount - deductionTotal);
    const actualAmount = buyForm.overrideAmount.trim() ? parseMoney(buyForm.overrideAmount) : suggestedAmount;

    return {
      weightGram,
      goldBaht: gramsPerBaht && weightGram > 0 ? weightGram / gramsPerBaht : 0,
      deductionPercent,
      fixedDeduction,
      goldAmount,
      percentDeduction,
      deductionTotal,
      suggestedAmount,
      actualAmount,
    };
  }, [barBuyPrice, buyForm, gramsPerBaht]);

  const selectedCustomer = customers.find((customer) => customer.id === Number(selectedCustomerId));

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setMakingFee(String(product.makingFee ?? product.costFee ?? 0));
    setDiscount('0');
  };

  const defaultMakingFee = (product: Product) => product.makingFee ?? product.costFee ?? 0;

  const previewProductNet = (product: Product) => {
    if (!gramsPerBaht) {
      return defaultMakingFee(product);
    }
    return (product.weightGram / gramsPerBaht) * barSellPrice + defaultMakingFee(product);
  };

  const submitBarcode = async (event: FormEvent) => {
    event.preventDefault();
    if (!barcode.trim()) {
      return;
    }
    const query = barcode.trim().toLowerCase();
    const exactProduct = products.find((product) => [String(product.id), product.barcode, product.qrCode]
      .filter(Boolean)
      .some((value) => value?.toLowerCase() === query));
    if (exactProduct) {
      selectProduct(exactProduct);
      setBarcode('');
      setTab(0);
      return;
    }
    if (visibleProducts.length === 1) {
      selectProduct(visibleProducts[0]);
      setBarcode('');
      setTab(0);
      return;
    }
    setLoadingAction('barcode');
    try {
      const product = await posApi.searchByBarcode(barcode.trim());
      selectProduct(product);
      setBarcode('');
      setTab(0);
    } catch (err) {
      setMessage({
        text: visibleProducts.length > 1 ? 'พบหลายรายการ เลือกสินค้าจากรายการด้านล่าง' : getErrorMessage(err, 'ไม่พบสินค้า'),
        severity: 'error',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const addSellItem = async (product: Product, fee: number, discountAmount: number, closeEditor: boolean) => {
    setLoadingAction('sell');
    try {
      const quote = await posApi.quoteSell({
        weightGram: product.weightGram,
        goldPricePerBaht: barSellPrice,
        makingFee: fee,
        makingFeeDiscount: discountAmount,
      });
      addToCart({
        uid: itemId(),
        productId: product.id,
        barcode: product.barcode,
        name: product.name,
        weightText: product.weightText || formatGoldWeight(product.weightGram, gramsPerBaht),
        itemType: 'SELL',
        goldAmount: quote.goldAmount,
        makingFee: quote.feeAmount,
        discount: quote.discountAmount,
        price: quote.netAmount,
        fee: quote.feeAmount,
      });
      if (closeEditor) {
        setSelectedProduct(null);
        setMakingFee('');
        setDiscount('0');
      }
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'คำนวณราคาขายไม่สำเร็จ'), severity: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const addSelectedSellItem = async () => {
    if (!selectedProduct) {
      return;
    }
    await addSellItem(selectedProduct, parseMoney(makingFee), parseMoney(discount), true);
  };

  const quickAddSellItem = async (product: Product) => {
    await addSellItem(product, defaultMakingFee(product), 0, false);
  };

  const addBuyItem = async () => {
    setLoadingAction('buy');
    try {
      const quote = await posApi.quoteBuy({
        weightGram: Number(buyForm.weightGram),
        goldPricePerBaht: barBuyPrice,
        wearDeductionPercent: optionalMoney(buyForm.deductionPercent),
        fixedDeductionAmount: optionalMoney(buyForm.fixedDeduction),
        overrideAmount: optionalMoney(buyForm.overrideAmount),
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

  const paymentPayload = () => paymentOptions
    .map((option) => ({
      paymentMethod: option.value,
      amount: parseMoney(payments[option.value]),
    }))
    .filter((payment) => payment.amount > 0);

  const checkout = async () => {
    if (cart.length === 0) {
      return;
    }
    const paymentRows = paymentPayload();
    if (dueAmount > 0 && Math.abs(remainingAmount) > 0.01) {
      setMessage({ text: 'ยอดชำระต้องตรงกับยอดสุทธิ', severity: 'error' });
      return;
    }

    setLoadingAction('checkout');
    const hasSell = cart.some((item) => item.itemType === 'SELL');
    const hasBuy = cart.some((item) => item.itemType === 'BUY');
    const transactionType: TransactionType = hasSell && hasBuy ? 'TRADE_IN' : hasBuy ? 'BUY' : 'SELL';
    const paymentMethod: PaymentMethod = paymentRows.length > 1 ? 'MIXED' : paymentRows[0]?.paymentMethod ?? 'CASH';
    const cartSnapshot = [...cart];

    try {
      const transaction = await posApi.checkout({
        customerId: selectedCustomerId ? Number(selectedCustomerId) : undefined,
        transactionType,
        paymentMethod,
        payments: paymentRows,
        totalAmount: grossTotal,
        discount: totalDiscount,
        netAmount: total,
        items: cart.map((item) => ({
          productId: item.productId,
          itemType: item.itemType,
          price: item.price,
          fee: item.fee,
        })),
      });
      setLastReceipt({
        receiptNumber: transaction.receiptNumber,
        transactionDate: transaction.transactionDate,
        customer: selectedCustomer,
        items: cartSnapshot,
        payments: paymentRows,
        totalAmount: grossTotal,
        discount: totalDiscount,
        netAmount: total,
        transactionType,
      });
      setMessage({ text: 'บันทึกบิลสำเร็จ และตัดสต๊อกแล้ว', severity: 'success' });
      clearCart();
      await loadProducts();
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'บันทึกบิลไม่สำเร็จ'), severity: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const printReceipt = () => {
    if (!lastReceipt) {
      return;
    }
    const win = window.open('', '_blank', 'width=860,height=960');
    if (!win) {
      setMessage({ text: 'เบราว์เซอร์บล็อกหน้าพิมพ์ กรุณาอนุญาต popup', severity: 'error' });
      return;
    }
    const rows = lastReceipt.items.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.name}<br><small>${item.barcode ?? ''} ${item.weightText ?? ''}</small></td>
        <td>${item.itemType === 'SELL' ? 'ขายออก' : 'รับซื้อ'}</td>
        <td class="right">${currency.format(item.goldAmount ?? 0)}</td>
        <td class="right">${currency.format(item.makingFee ?? item.fee ?? 0)}</td>
        <td class="right">${currency.format(item.discount ?? 0)}</td>
        <td class="right">${currency.format(item.price)}</td>
      </tr>
    `).join('');
    const paymentRows = lastReceipt.payments.map((payment) => `
      <div><span>${paymentLabel(payment.paymentMethod)}</span><strong>${currency.format(payment.amount)}</strong></div>
    `).join('');
    win.document.write(`
      <html>
        <head>
          <title>${lastReceipt.receiptNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #1f1f1f; }
            header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #8b0000; padding-bottom: 16px; }
            h1 { margin: 0 0 8px; color: #8b0000; }
            h2 { margin: 20px 0 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: left; vertical-align: top; }
            th { background: #fff7df; }
            .right { text-align: right; }
            .summary { margin-left: auto; width: 320px; margin-top: 16px; }
            .summary div { display: flex; justify-content: space-between; padding: 6px 0; }
            .total { font-size: 20px; color: #8b0000; border-top: 2px solid #8b0000; margin-top: 8px; padding-top: 10px; }
            small { color: #666; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <button onclick="window.print()">พิมพ์</button>
          <header>
            <div>
              <h1>ห้างทองเอกฮั่วเฮง</h1>
              <div>ใบเสร็จรับเงิน / ใบกำกับภาษี</div>
              <small>ระบบ POS ร้านทอง</small>
            </div>
            <div>
              <strong>${lastReceipt.receiptNumber}</strong><br>
              ${new Date(lastReceipt.transactionDate).toLocaleString('th-TH')}<br>
              ลูกค้า: ${lastReceipt.customer?.fullName ?? '-'}<br>
              โทร: ${lastReceipt.customer?.phoneNumber ?? '-'}
            </div>
          </header>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>รายการ</th>
                <th>ประเภท</th>
                <th class="right">ราคาทอง</th>
                <th class="right">ค่ากำเหน็จ</th>
                <th class="right">ส่วนลด</th>
                <th class="right">สุทธิ</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <section class="summary">
            <div><span>ยอดก่อนส่วนลด</span><strong>${currency.format(lastReceipt.totalAmount)}</strong></div>
            <div><span>ส่วนลดรวม</span><strong>${currency.format(lastReceipt.discount)}</strong></div>
            ${paymentRows}
            <div class="total"><span>ยอดสุทธิ</span><strong>${currency.format(lastReceipt.netAmount)}</strong></div>
          </section>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>ระบบหน้าร้าน</Typography>
        <Typography variant="body2" color="text.secondary">ขายทองรูปพรรณ รับซื้อทองเก่า เปลี่ยนลาย และรับชำระหลายช่องทาง</Typography>
      </Box>

      {lastReceipt && (
        <Alert
          severity="success"
          action={<Button color="inherit" size="small" startIcon={<Print />} onClick={printReceipt}>พิมพ์ใบเสร็จ/ใบกำกับภาษี</Button>}
        >
          ออกบิล {lastReceipt.receiptNumber} แล้ว
        </Alert>
      )}

      <GoldPriceTicker
        goldPrice={goldPrice}
        history={goldHistory}
        subtitle="สูตรขายหน้าร้านใช้ราคาทองคำแท่งขายออกเป็นฐาน แล้วบวกค่ากำเหน็จ"
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={2}>
            <Paper component="form" onSubmit={submitBarcode} sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  fullWidth
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  label="ค้นหาสินค้า"
                  placeholder="รหัสสินค้า / Barcode / QR / ชื่อสินค้า"
                  slotProps={{ input: { startAdornment: <QrCodeScanner sx={{ mr: 1, color: 'text.secondary' }} /> } }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loadingAction === 'barcode' ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
                  disabled={isBusy}
                >
                  {loadingAction === 'barcode' ? 'กำลังค้นหา...' : 'ค้นหา'}
                </Button>
              </Stack>
            </Paper>

            <Paper>
              <Tabs value={tab} onChange={(_, value: number) => setTab(value)} variant="scrollable" scrollButtons="auto">
                <Tab label="ขายทองรูปพรรณ" />
                <Tab label="รับซื้อทองเก่า" />
                <Tab label="เปลี่ยนลาย" />
              </Tabs>
              <Divider />
              <Box sx={{ p: 2 }}>
                {tab === 0 && (
                  <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}>
                      <Typography sx={{ fontWeight: 700 }}>สินค้า {visibleProducts.length} รายการ</Typography>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                        {weightOptions.map((option) => (
                          <Chip
                            key={option.value}
                            label={option.label}
                            color={weightFilter === option.value ? 'primary' : 'default'}
                            onClick={() => setWeightFilter(option.value)}
                            sx={{ mb: 1 }}
                          />
                        ))}
                      </Stack>
                    </Stack>

                    <Grid container spacing={2}>
                      {visibleProducts.map((product) => (
                        <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4 }}>
                          <Card
                            variant="outlined"
                            sx={{
                              height: '100%',
                              cursor: isBusy ? 'default' : 'pointer',
                              opacity: isBusy ? 0.72 : 1,
                              borderColor: selectedProduct?.id === product.id ? 'primary.main' : 'divider',
                              '&:hover': { borderColor: 'primary.main', boxShadow: 2 },
                            }}
                            onClick={() => { if (!isBusy) selectProduct(product); }}
                          >
                            <CardContent>
                              <Stack spacing={1}>
                                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Diamond color="secondary" />
                                  <Chip size="small" label={product.weightText || formatGoldWeight(product.weightGram, gramsPerBaht)} />
                                </Stack>
                                <Box>
                                  <Typography sx={{ fontWeight: 700 }}>{product.name}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {[product.category, product.design].filter(Boolean).join(' / ') || '-'}
                                  </Typography>
                                </Box>
                                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-end', gap: 1 }}>
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">ราคาขายจากทองแท่ง</Typography>
                                    <Typography color="primary.main" sx={{ fontWeight: 800 }}>
                                      {currency.format(previewProductNet(product))}
                                    </Typography>
                                  </Box>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={loadingAction === 'sell' ? <CircularProgress size={16} color="inherit" /> : <AddShoppingCart />}
                                    disabled={isBusy || barSellPrice <= 0}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void quickAddSellItem(product);
                                    }}
                                  >
                                    เพิ่มเร็ว
                                  </Button>
                                </Stack>
                                <Typography variant="caption" color="text.secondary">Barcode: {product.barcode}</Typography>
                                <Typography variant="caption" color="text.secondary">QR: {product.qrCode || product.barcode}</Typography>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                      {visibleProducts.length === 0 && (
                        <Grid size={12}>
                          <Alert severity="info">ไม่พบสินค้าตามน้ำหนักที่เลือก</Alert>
                        </Grid>
                      )}
                    </Grid>
                  </Stack>
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
                        label="หักคงที่"
                        type="number"
                        value={buyForm.fixedDeduction}
                        onChange={(event) => setBuyForm({ ...buyForm, fixedDeduction: event.target.value })}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start">฿</InputAdornment> } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="ราคาที่รับซื้อจริง"
                        type="number"
                        value={buyForm.overrideAmount}
                        onChange={(event) => setBuyForm({ ...buyForm, overrideAmount: event.target.value })}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start">฿</InputAdornment> } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, bgcolor: 'rgba(212,175,55,0.08)' }}>
                        <Typography sx={{ fontWeight: 800, mb: 1 }}>ราคาประเมินรับซื้อคิดจาก</Typography>
                        <Grid container spacing={1.2}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <Stack spacing={0.5}>
                              <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                                <Typography variant="body2" color="text.secondary">น้ำหนัก</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  {buyPreview.weightGram ? `${number.format(buyPreview.weightGram)} กรัม = ${formatBahtGold(buyPreview.weightGram, gramsPerBaht)}` : '-'}
                                </Typography>
                              </Stack>
                              <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                                <Typography variant="body2" color="text.secondary">ราคาทองแท่งรับซื้อ</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  {currency.format(barBuyPrice)} x {number.format(buyPreview.goldBaht)} บาททอง
                                </Typography>
                              </Stack>
                              <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                                <Typography variant="body2" color="text.secondary">มูลค่าทองก่อนหัก</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{currency.format(buyPreview.goldAmount)}</Typography>
                              </Stack>
                            </Stack>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <Stack spacing={0.5}>
                              <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                                <Typography variant="body2" color="text.secondary">หัก {number.format(buyPreview.deductionPercent)}%</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{currency.format(buyPreview.percentDeduction)}</Typography>
                              </Stack>
                              <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                                <Typography variant="body2" color="text.secondary">หักคงที่</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{currency.format(buyPreview.fixedDeduction)}</Typography>
                              </Stack>
                              <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                                <Typography variant="body2" color="text.secondary">ราคาประเมิน</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 800 }}>{currency.format(buyPreview.suggestedAmount)}</Typography>
                              </Stack>
                            </Stack>
                          </Grid>
                          <Grid size={12}>
                            <Divider sx={{ my: 0.5 }} />
                            <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                              <Typography sx={{ fontWeight: 800 }}>ราคาที่จะรับซื้อ</Typography>
                              <Typography color="primary.main" sx={{ fontWeight: 900 }}>{currency.format(buyPreview.actualAmount)}</Typography>
                            </Stack>
                          </Grid>
                        </Grid>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Button
                        variant="contained"
                        startIcon={loadingAction === 'buy' ? <CircularProgress size={18} color="inherit" /> : <Scale />}
                        onClick={() => void addBuyItem()}
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
            <TextField
              select
              fullWidth
              label="ลูกค้า / ใบกำกับภาษี"
              value={selectedCustomerId}
              onChange={(event) => setSelectedCustomerId(event.target.value)}
              sx={{ mt: 2 }}
            >
              <MenuItem value="">ไม่ระบุลูกค้า</MenuItem>
              {customers.map((customer) => (
                <MenuItem key={customer.id} value={String(customer.id)}>{customer.fullName}</MenuItem>
              ))}
            </TextField>
            <Stack spacing={1.5} sx={{ my: 2, maxHeight: 360, overflow: 'auto' }}>
              {cart.length === 0 && <Alert severity="info">ยังไม่มีรายการในบิล</Alert>}
              {cart.map((item) => (
                <Card key={item.uid} variant="outlined">
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.weightText} · {item.itemType === 'SELL' ? 'ขายออก' : 'รับซื้อ'}
                        </Typography>
                        {item.discount ? <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>ส่วนลด {currency.format(item.discount)}</Typography> : null}
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
            <Stack spacing={1.2} sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 700 }}>รับชำระเงิน</Typography>
              {paymentOptions.map((option) => (
                <TextField
                  key={option.value}
                  size="small"
                  type="number"
                  label={option.label}
                  value={payments[option.value]}
                  onChange={(event) => setPayments((current) => ({ ...current, [option.value]: event.target.value }))}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">{option.icon}</InputAdornment> } }}
                />
              ))}
            </Stack>
            <Stack spacing={0.5} sx={{ mb: 2 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography color="text.secondary">ส่วนลดรวม</Typography>
                <Typography>{currency.format(totalDiscount)}</Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography color="text.secondary">ยอดชำระแล้ว</Typography>
                <Typography>{currency.format(paidAmount)}</Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography color={Math.abs(remainingAmount) <= 0.01 ? 'success.main' : 'error.main'}>ยอดคงเหลือ</Typography>
                <Typography color={Math.abs(remainingAmount) <= 0.01 ? 'success.main' : 'error.main'}>{currency.format(remainingAmount)}</Typography>
              </Stack>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>ยอดสุทธิ</Typography>
              <Typography variant="h5" color={total < 0 ? 'error.main' : 'primary.main'} sx={{ fontWeight: 800 }}>{currency.format(total)}</Typography>
            </Stack>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={loadingAction === 'checkout' ? undefined : <ReceiptLong />}
              onClick={() => void checkout()}
              disabled={cart.length === 0 || isBusy || (dueAmount > 0 && Math.abs(remainingAmount) > 0.01)}
            >
              {loadingAction === 'checkout' ? <CircularProgress size={24} color="inherit" /> : 'รับชำระเงิน / ออกบิล'}
            </Button>
          </Paper>
        </Grid>
      </Grid>

      <Dialog
        open={Boolean(selectedProduct)}
        onClose={() => { if (!isBusy) setSelectedProduct(null); }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ pb: 1 }}>ขายทองรูปพรรณ</DialogTitle>
        <DialogContent dividers>
          {selectedProduct && (
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{selectedProduct.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedProduct.barcode} • {selectedProduct.weightText || formatGoldWeight(selectedProduct.weightGram, gramsPerBaht)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {[selectedProduct.category, selectedProduct.design].filter(Boolean).join(' / ') || '-'}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    borderRadius: 2,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    px: 2,
                    py: 1.5,
                    minWidth: 180,
                    textAlign: { xs: 'left', sm: 'right' },
                  }}
                >
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>ยอดสุทธิ</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{currency.format(salePreview.netAmount)}</Typography>
                </Box>
              </Stack>

              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="ราคาทอง"
                    value={currency.format(salePreview.goldAmount)}
                    slotProps={{ input: { readOnly: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="ราคาทองคำแท่งขายออก/บาท"
                    value={number.format(barSellPrice)}
                    slotProps={{ input: { readOnly: true, startAdornment: <InputAdornment position="start">฿</InputAdornment> } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    autoFocus
                    type="number"
                    label="ค่ากำเหน็จ"
                    value={makingFee}
                    onChange={(event) => setMakingFee(event.target.value)}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start">฿</InputAdornment> } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="ส่วนลด"
                    value={discount}
                    onChange={(event) => setDiscount(event.target.value)}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start">฿</InputAdornment> } }}
                  />
                </Grid>
              </Grid>

              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, bgcolor: 'rgba(212,175,55,0.08)' }}>
                <Typography sx={{ fontWeight: 800, mb: 1 }}>ราคานี้คิดจาก</Typography>
                <Stack spacing={0.5}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">น้ำหนักสินค้า</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {number.format(selectedProduct.weightGram)} กรัม = {formatBahtGold(selectedProduct.weightGram, gramsPerBaht)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">ราคาทองแท่ง</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {currency.format(barSellPrice)} x {number.format(salePreview.goldBaht)} บาททอง
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">มูลค่าทอง</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{currency.format(salePreview.goldAmount)}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">ค่ากำเหน็จ - ส่วนลด</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {currency.format(salePreview.makingFeeAmount)} - {currency.format(salePreview.discountAmount)}
                    </Typography>
                  </Stack>
                  <Divider sx={{ my: 0.5 }} />
                  <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                    <Typography sx={{ fontWeight: 800 }}>ราคาขายสุทธิ</Typography>
                    <Typography color="primary.main" sx={{ fontWeight: 900 }}>{currency.format(salePreview.netAmount)}</Typography>
                  </Stack>
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button color="inherit" onClick={() => setSelectedProduct(null)} disabled={isBusy}>ยกเลิก</Button>
          <Button
            variant="contained"
            startIcon={loadingAction === 'sell' ? <CircularProgress size={18} color="inherit" /> : <AddShoppingCart />}
            onClick={() => void addSelectedSellItem()}
            disabled={!selectedProduct || isBusy || barSellPrice <= 0}
          >
            {loadingAction === 'sell' ? 'กำลังเพิ่ม...' : 'เพิ่มเข้าบิล'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(message)} autoHideDuration={5000} onClose={() => setMessage(null)}>
        <Alert severity={message?.severity ?? 'success'} onClose={() => setMessage(null)}>{message?.text}</Alert>
      </Snackbar>
    </Stack>
  );
};

const SearchIcon = () => <QrCodeScanner fontSize="small" />;
