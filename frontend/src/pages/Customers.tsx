import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
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
import { Add } from '@mui/icons-material';
import { systemApi } from '../api/systemApi';
import { getErrorMessage } from '../api/client';
import type { Customer } from '../types';

export const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', phoneNumber: '', idCardNumber: '', address: '' });

  const load = async () => {
    try {
      setCustomers(await systemApi.customers());
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'โหลดข้อมูลลูกค้าไม่สำเร็จ'), severity: 'error' });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    setSaving(true);
    try {
      await systemApi.createCustomer(form);
      setMessage({ text: 'เพิ่มลูกค้าแล้ว', severity: 'success' });
      setForm({ fullName: '', phoneNumber: '', idCardNumber: '', address: '' });
      await load();
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'เพิ่มลูกค้าไม่สำเร็จ'), severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>ฐานข้อมูลลูกค้า</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>ลูกค้าใหม่</Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <TextField label="ชื่อ-นามสกุล" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
                <TextField label="เบอร์โทรศัพท์" value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} />
                <TextField label="เลขบัตรประชาชน" value={form.idCardNumber} onChange={(event) => setForm({ ...form, idCardNumber: event.target.value })} />
                <TextField label="ที่อยู่" multiline minRows={3} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Add />}
                  onClick={() => void create()}
                  disabled={!form.fullName || saving}
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ชื่อ</TableCell>
                  <TableCell>โทรศัพท์</TableCell>
                  <TableCell>บัตรประชาชน</TableCell>
                  <TableCell>สร้างเมื่อ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id} hover>
                    <TableCell>{customer.fullName}</TableCell>
                    <TableCell>{customer.phoneNumber || '-'}</TableCell>
                    <TableCell>{customer.idCardNumber || '-'}</TableCell>
                    <TableCell>{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('th-TH') : '-'}</TableCell>
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
