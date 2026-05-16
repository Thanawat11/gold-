import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
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
import { Add, QrCode2 } from '@mui/icons-material';
import { posApi } from '../api/posApi';
import { getErrorMessage } from '../api/client';
import type { Product, ProductStatus } from '../types';

const statuses: ProductStatus[] = ['AVAILABLE', 'SOLD', 'PAWNED', 'MELTED', 'RETURNED_TO_ARTISAN'];

export const Inventory = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: '',
    weightGram: '',
    weightText: '',
    costFee: '',
    status: 'AVAILABLE' as ProductStatus,
  });

  const load = async () => {
    try {
      setProducts(await posApi.getProducts());
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'โหลดสต๊อกไม่สำเร็จ'), severity: 'error' });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const totalWeight = useMemo(() => products
    .filter((product) => product.status === 'AVAILABLE')
    .reduce((sum, product) => sum + product.weightGram, 0), [products]);

  const createProduct = async () => {
    setSaving(true);
    try {
      await posApi.createProduct({
        name: form.name,
        category: form.category,
        weightGram: Number(form.weightGram),
        weightText: form.weightText,
        costFee: form.costFee ? Number(form.costFee) : undefined,
        status: form.status,
      });
      setMessage({ text: 'เพิ่มสินค้าแล้ว', severity: 'success' });
      setForm({ name: '', category: '', weightGram: '', weightText: '', costFee: '', status: 'AVAILABLE' });
      await load();
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'เพิ่มสินค้าไม่สำเร็จ'), severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>บริหารจัดการสต๊อก</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>สินค้าใหม่</Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <TextField label="ชื่อสินค้า" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                <TextField label="หมวดหมู่/ถาด" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
                <TextField type="number" label="น้ำหนัก" value={form.weightGram} onChange={(event) => setForm({ ...form, weightGram: event.target.value })} slotProps={{ input: { endAdornment: <InputAdornment position="end">กรัม</InputAdornment> } }} />
                <TextField label="น้ำหนักหน้าร้าน" value={form.weightText} onChange={(event) => setForm({ ...form, weightText: event.target.value })} />
                <TextField type="number" label="ค่ากำเหน็จ" value={form.costFee} onChange={(event) => setForm({ ...form, costFee: event.target.value })} />
                <TextField select label="สถานะ" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProductStatus })}>
                  {statuses.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
                </TextField>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Add />}
                  onClick={() => void createProduct()}
                  disabled={!form.name || !form.category || !form.weightGram || saving}
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึกสินค้า'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography sx={{ fontWeight: 700 }}>น้ำหนักทองพร้อมขายรวม {totalWeight.toLocaleString('th-TH', { maximumFractionDigits: 2 })} กรัม</Typography>
          </Paper>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>บาร์โค้ด</TableCell>
                  <TableCell>สินค้า</TableCell>
                  <TableCell>ถาด</TableCell>
                  <TableCell align="right">น้ำหนัก</TableCell>
                  <TableCell>สถานะ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} hover>
                    <TableCell><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><QrCode2 fontSize="small" />{product.barcode}</Stack></TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell align="right">{product.weightGram.toLocaleString('th-TH')} กรัม</TableCell>
                    <TableCell>{product.status}</TableCell>
                  </TableRow>
                ))}
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
