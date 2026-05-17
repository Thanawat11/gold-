import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Edit, Image, Inventory2, QrCode2, Save, Search } from '@mui/icons-material';
import { posApi } from '../api/posApi';
import { systemApi } from '../api/systemApi';
import { getErrorMessage } from '../api/client';
import type { Product, ProductRequest, ProductStatus } from '../types';

const currency = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });
const number = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 });
const maxImageSizeBytes = 1_500_000;

const productCategories = ['แหวน', 'สร้อย', 'กำไล', 'ต่างหู', 'จี้'];

const statusOptions: Array<{ value: ProductStatus; label: string; color: 'default' | 'success' | 'warning' | 'error' | 'info' }> = [
  { value: 'AVAILABLE', label: 'พร้อมขาย', color: 'success' },
  { value: 'SOLD', label: 'ขายแล้ว', color: 'default' },
  { value: 'PAWNED', label: 'จำนำ', color: 'warning' },
  { value: 'EXPIRED_PAWN', label: 'หลุดจำนำ', color: 'error' },
  { value: 'REPAIR', label: 'ส่งซ่อม', color: 'info' },
  { value: 'MELTED', label: 'หลอม', color: 'default' },
];

const legacyStatusLabels: Record<ProductStatus, string> = {
  AVAILABLE: 'พร้อมขาย',
  SOLD: 'ขายแล้ว',
  PAWNED: 'จำนำ',
  EXPIRED_PAWN: 'หลุดจำนำ',
  REPAIR: 'ส่งซ่อม',
  MELTED: 'หลอม',
  RETURNED_TO_ARTISAN: 'ส่งซ่อม/คืนช่าง',
};

interface ProductFormState {
  id?: number;
  barcode: string;
  qrCode: string;
  name: string;
  category: string;
  design: string;
  goldPercent: string;
  weightGram: string;
  weightText: string;
  makingFee: string;
  costAmount: string;
  imageUrl: string;
  status: ProductStatus;
}

const emptyForm = (): ProductFormState => ({
  barcode: '',
  qrCode: '',
  name: '',
  category: '',
  design: '',
  goldPercent: '96.5',
  weightGram: '',
  weightText: '',
  makingFee: '',
  costAmount: '',
  imageUrl: '',
  status: 'AVAILABLE',
});

const optionalNumber = (value: string) => {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const statusLabel = (status: ProductStatus) => legacyStatusLabels[status] ?? status;
const statusColor = (status: ProductStatus) => statusOptions.find((item) => item.value === status)?.color ?? 'default';
const formatGoldWeight = (weightGram: number | undefined, gramsPerBaht: number | null) => {
  if (!weightGram || !Number.isFinite(weightGram) || weightGram <= 0 || !gramsPerBaht || gramsPerBaht <= 0) {
    return '';
  }
  const bahtWeight = weightGram / gramsPerBaht;
  const salueng = bahtWeight * 4;
  const roundedSalueng = Math.round(salueng);

  if (Math.abs(salueng - roundedSalueng) <= 0.02 && roundedSalueng > 0) {
    const baht = Math.floor(roundedSalueng / 4);
    const saluengRemainder = roundedSalueng % 4;
    if (baht > 0 && saluengRemainder > 0) {
      return `${number.format(baht)} บาท ${number.format(saluengRemainder)} สลึง`;
    }
    if (baht > 0) {
      return `${number.format(baht)} บาททอง`;
    }
    return `${number.format(roundedSalueng)} สลึง`;
  }

  return `${number.format(bahtWeight)} บาททอง (${number.format(salueng)} สลึง)`;
};

export const Inventory = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [gramsPerBaht, setGramsPerBaht] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [productRows, settings] = await Promise.all([
        posApi.getProducts(),
        systemApi.settings().catch(() => null),
      ]);
      setProducts(productRows);
      setGramsPerBaht(settings?.gramsPerBaht ?? null);
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'โหลดสต๊อกไม่สำเร็จ'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const uniqueCategories = useMemo(() => {
    const fromProducts = products.map((product) => product.category).filter(Boolean);
    return Array.from(new Set([...productCategories, ...fromProducts]));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesKeyword = !keyword
        || product.name.toLowerCase().includes(keyword)
        || product.barcode.toLowerCase().includes(keyword)
        || product.category.toLowerCase().includes(keyword)
        || (product.design ?? '').toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === 'ALL' || product.status === statusFilter;
      const matchesCategory = categoryFilter === 'ALL' || product.category === categoryFilter;
      return matchesKeyword && matchesStatus && matchesCategory;
    });
  }, [categoryFilter, products, search, statusFilter]);

  const availableProducts = useMemo(() => products.filter((product) => product.status === 'AVAILABLE'), [products]);
  const totalWeight = useMemo(() => availableProducts.reduce((sum, product) => sum + product.weightGram, 0), [availableProducts]);
  const totalCost = useMemo(() => products.reduce((sum, product) => sum + (product.costAmount ?? 0), 0), [products]);
  const formGoldWeightText = useMemo(
    () => formatGoldWeight(optionalNumber(form.weightGram), gramsPerBaht),
    [form.weightGram, gramsPerBaht],
  );

  const updateForm = (patch: Partial<ProductFormState>) => setForm((current) => ({ ...current, ...patch }));

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > maxImageSizeBytes) {
      setMessage({ text: 'รูปภาพใหญ่เกินไป กรุณาใช้ไฟล์ไม่เกิน 1.5 MB', severity: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateForm({ imageUrl: String(reader.result) });
    reader.onerror = () => setMessage({ text: 'อ่านไฟล์รูปภาพไม่สำเร็จ', severity: 'error' });
    reader.readAsDataURL(file);
  };

  const startEdit = (product: Product) => {
    setForm({
      id: product.id,
      barcode: product.barcode ?? '',
      qrCode: product.qrCode ?? product.barcode ?? '',
      name: product.name,
      category: product.category,
      design: product.design ?? '',
      goldPercent: product.goldPercent?.toString() ?? '96.5',
      weightGram: product.weightGram.toString(),
      weightText: product.weightText ?? '',
      makingFee: (product.makingFee ?? product.costFee ?? '').toString(),
      costAmount: product.costAmount?.toString() ?? '',
      imageUrl: product.imageUrl ?? '',
      status: product.status === 'RETURNED_TO_ARTISAN' ? 'REPAIR' : product.status,
    });
  };

  const resetForm = () => setForm(emptyForm());

  const submitProduct = async () => {
    const weightGram = optionalNumber(form.weightGram);
    const goldPercent = optionalNumber(form.goldPercent);
    if (!form.name.trim() || !form.category || !weightGram || weightGram <= 0) {
      setMessage({ text: 'กรุณากรอกชื่อสินค้า ประเภท และน้ำหนักให้ถูกต้อง', severity: 'error' });
      return;
    }
    if (!goldPercent || goldPercent <= 0 || goldPercent > 100) {
      setMessage({ text: 'เปอร์เซ็นต์ทองต้องอยู่ระหว่าง 0-100', severity: 'error' });
      return;
    }

    const makingFee = optionalNumber(form.makingFee);
    const payload: ProductRequest = {
      barcode: form.barcode.trim() || undefined,
      qrCode: form.qrCode.trim() || form.barcode.trim() || undefined,
      name: form.name.trim(),
      category: form.category,
      design: form.design.trim() || undefined,
      goldPercent,
      weightGram,
      weightText: form.weightText.trim() || formGoldWeightText || undefined,
      makingFee,
      costFee: makingFee,
      costAmount: optionalNumber(form.costAmount),
      imageUrl: form.imageUrl || undefined,
      status: form.status,
    };

    setSaving(true);
    try {
      if (form.id) {
        await posApi.updateProduct(form.id, payload);
        setMessage({ text: 'อัปเดตสินค้าแล้ว', severity: 'success' });
      } else {
        await posApi.createProduct(payload);
        setMessage({ text: 'เพิ่มสินค้าแล้ว', severity: 'success' });
      }
      resetForm();
      await load();
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'บันทึกสินค้าไม่สำเร็จ'), severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>บริหารจัดการสต๊อก</Typography>
          <Typography variant="body2" color="text.secondary">เพิ่มสินค้า แก้ไขข้อมูลทอง ติดตามสถานะ และจัดการ Barcode / QR Code</Typography>
        </Box>
        {loading && <CircularProgress size={28} />}
      </Stack>

      <Grid container spacing={2}>
        {[
          { label: 'สินค้าพร้อมขาย', value: `${number.format(availableProducts.length)} ชิ้น`, icon: <Inventory2 /> },
          { label: 'น้ำหนักพร้อมขาย', value: `${number.format(totalWeight)} กรัม`, detail: formatGoldWeight(totalWeight, gramsPerBaht), icon: <Inventory2 /> },
          { label: 'ต้นทุนรวมในระบบ', value: currency.format(totalCost), icon: <Inventory2 /> },
        ].map((item) => (
          <Grid key={item.label} size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ color: 'primary.main', bgcolor: 'rgba(183,28,28,0.08)', p: 1, borderRadius: 1 }}>{item.icon}</Box>
              <Box>
                <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{item.value}</Typography>
                {item.detail && <Typography variant="body2" color="text.secondary">เทียบเป็น {item.detail}</Typography>}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                {form.id ? <Edit color="primary" /> : <Add color="primary" />}
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{form.id ? 'แก้ไขสินค้า' : 'สินค้าใหม่'}</Typography>
              </Stack>
              <Stack spacing={2}>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField fullWidth label="Barcode" value={form.barcode} onChange={(event) => updateForm({ barcode: event.target.value })} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField fullWidth label="QR Code" value={form.qrCode} onChange={(event) => updateForm({ qrCode: event.target.value })} />
                  </Grid>
                </Grid>
                <TextField label="ชื่อสินค้า" value={form.name} onChange={(event) => updateForm({ name: event.target.value })} />
                <TextField select label="ประเภทสินค้า" value={form.category} onChange={(event) => updateForm({ category: event.target.value })}>
                  {productCategories.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}
                </TextField>
                <TextField label="ลาย" value={form.design} onChange={(event) => updateForm({ design: event.target.value })} />
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="น้ำหนัก"
                      value={form.weightGram}
                      onChange={(event) => updateForm({ weightGram: event.target.value })}
                      helperText={formGoldWeightText ? `เทียบเป็น ${formGoldWeightText}` : 'ใส่น้ำหนักกรัมเพื่อแสดงบาททอง/สลึง'}
                      slotProps={{ input: { endAdornment: <InputAdornment position="end">กรัม</InputAdornment> } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="น้ำหนักหน้าร้าน"
                      value={form.weightText}
                      onChange={(event) => updateForm({ weightText: event.target.value })}
                      helperText={formGoldWeightText ? `เว้นว่างเพื่อใช้ ${formGoldWeightText}` : 'เช่น 1 บาท, 2 สลึง'}
                    />
                  </Grid>
                </Grid>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="เปอร์เซ็นต์ทอง"
                      value={form.goldPercent}
                      onChange={(event) => updateForm({ goldPercent: event.target.value })}
                      slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="ค่ากำเหน็จ"
                      value={form.makingFee}
                      onChange={(event) => updateForm({ makingFee: event.target.value })}
                      slotProps={{ input: { endAdornment: <InputAdornment position="end">บาท</InputAdornment> } }}
                    />
                  </Grid>
                </Grid>
                <TextField
                  type="number"
                  label="ต้นทุน"
                  value={form.costAmount}
                  onChange={(event) => updateForm({ costAmount: event.target.value })}
                  slotProps={{ input: { endAdornment: <InputAdornment position="end">บาท</InputAdornment> } }}
                />
                <TextField select label="สถานะสินค้า" value={form.status} onChange={(event) => updateForm({ status: event.target.value as ProductStatus })}>
                  {statusOptions.map((status) => <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>)}
                </TextField>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Button variant="outlined" component="label" startIcon={<Image />}>
                    เลือกรูปสินค้า
                    <input hidden accept="image/*" type="file" onChange={handleImageUpload} />
                  </Button>
                  {form.imageUrl && (
                    <Button color="inherit" onClick={() => updateForm({ imageUrl: '' })}>ลบรูป</Button>
                  )}
                </Stack>
                {form.imageUrl && (
                  <Box
                    component="img"
                    src={form.imageUrl}
                    alt={form.name || 'product'}
                    sx={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                  />
                )}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
                    onClick={() => void submitProduct()}
                    disabled={saving}
                  >
                    {saving ? 'กำลังบันทึก...' : form.id ? 'บันทึกการแก้ไข' : 'บันทึกสินค้า'}
                  </Button>
                  {form.id && <Button color="inherit" onClick={resetForm}>ยกเลิก</Button>}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, md: 5 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="ค้นหา"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
                <TextField fullWidth select size="small" label="ประเภท" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  <MenuItem value="ALL">ทั้งหมด</MenuItem>
                  {uniqueCategories.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
                <TextField fullWidth select size="small" label="สถานะ" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ProductStatus | 'ALL')}>
                  <MenuItem value="ALL">ทั้งหมด</MenuItem>
                  {statusOptions.map((status) => <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>
          </Paper>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>สินค้า</TableCell>
                  <TableCell>Barcode / QR</TableCell>
                  <TableCell>ประเภท</TableCell>
                  <TableCell align="right">น้ำหนัก</TableCell>
                  <TableCell align="right">ค่ากำเหน็จ</TableCell>
                  <TableCell align="right">ต้นทุน</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell align="right">จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        {product.imageUrl ? (
                          <Box component="img" src={product.imageUrl} alt={product.name} sx={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 1 }} />
                        ) : (
                          <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: 'rgba(212,175,55,0.16)', display: 'grid', placeItems: 'center', color: 'secondary.main' }}>
                            <Inventory2 />
                          </Box>
                        )}
                        <Box>
                          <Typography sx={{ fontWeight: 700 }}>{product.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{product.design || 'ไม่มีข้อมูลลาย'} • {product.goldPercent ?? '-'}%</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                          <QrCode2 fontSize="small" />
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{product.barcode}</Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">QR: {product.qrCode || product.barcode}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell align="right">
                      <Typography>{number.format(product.weightGram)} กรัม</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {product.weightText || formatGoldWeight(product.weightGram, gramsPerBaht) || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{currency.format(product.makingFee ?? product.costFee ?? 0)}</TableCell>
                    <TableCell align="right">{currency.format(product.costAmount ?? 0)}</TableCell>
                    <TableCell>
                      <Chip size="small" color={statusColor(product.status)} label={statusLabel(product.status)} />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" startIcon={<Edit />} onClick={() => startEdit(product)}>แก้ไข</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="text.secondary" sx={{ py: 3 }}>ไม่พบสินค้าในเงื่อนไขนี้</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      <Snackbar open={Boolean(message)} autoHideDuration={5000} onClose={() => setMessage(null)}>
        <Alert severity={message?.severity ?? 'success'} onClose={() => setMessage(null)}>{message?.text}</Alert>
      </Snackbar>
    </Stack>
  );
};
