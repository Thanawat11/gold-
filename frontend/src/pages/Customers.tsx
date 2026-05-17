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
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Badge, Edit, Image, Person, Save, Search } from '@mui/icons-material';
import { systemApi } from '../api/systemApi';
import { getErrorMessage } from '../api/client';
import type {
  Customer,
  CustomerProfileResponse,
  CustomerRequest,
  CustomerTrustLevel,
  IdentityType,
} from '../types';

const currency = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });
const number = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 });
const maxAttachmentSizeBytes = 1_500_000;

const identityOptions: Array<{ value: IdentityType; label: string }> = [
  { value: 'THAI_ID', label: 'บัตรประชาชน' },
  { value: 'PASSPORT', label: 'Passport' },
];

const trustOptions: Array<{ value: CustomerTrustLevel; label: string; color: 'success' | 'default' | 'warning' | 'error' }> = [
  { value: 'HIGH', label: 'น่าเชื่อถือสูง', color: 'success' },
  { value: 'NORMAL', label: 'ปกติ', color: 'default' },
  { value: 'WATCHLIST', label: 'ต้องติดตาม', color: 'warning' },
  { value: 'BLOCKED', label: 'ระงับธุรกรรม', color: 'error' },
];

interface CustomerFormState {
  id?: number;
  fullName: string;
  phoneNumber: string;
  identityType: IdentityType;
  idCardNumber: string;
  address: string;
  trustLevel: CustomerTrustLevel;
  idCardImageUrl: string;
  customerImageUrl: string;
  documentUrl: string;
  notes: string;
}

const emptyForm = (): CustomerFormState => ({
  fullName: '',
  phoneNumber: '',
  identityType: 'THAI_ID',
  idCardNumber: '',
  address: '',
  trustLevel: 'NORMAL',
  idCardImageUrl: '',
  customerImageUrl: '',
  documentUrl: '',
  notes: '',
});

const trustLabel = (level?: CustomerTrustLevel) => trustOptions.find((option) => option.value === level)?.label ?? 'ปกติ';
const trustColor = (level?: CustomerTrustLevel) => trustOptions.find((option) => option.value === level)?.color ?? 'default';
const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('th-TH') : '-';
const transactionTypeLabel = (type: string) => type === 'SELL' ? 'ซื้อทอง' : type === 'BUY' ? 'ขายทอง' : 'เปลี่ยนลาย';
const pawnStatusLabel = (status: string) => status === 'ACTIVE' ? 'ใช้งานอยู่' : status === 'REDEEMED' ? 'ไถ่ถอนแล้ว' : 'หลุดจำนำ';

export const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profile, setProfile] = useState<CustomerProfileResponse | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [historyTab, setHistoryTab] = useState(0);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [form, setForm] = useState<CustomerFormState>(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await systemApi.customers();
      setCustomers(rows);
      if (!selectedId && rows.length > 0) {
        setSelectedId(rows[0].id);
      }
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'โหลดข้อมูลลูกค้าไม่สำเร็จ'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async (id: number) => {
    setLoadingProfile(true);
    try {
      setProfile(await systemApi.customerProfile(id));
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'โหลดโปรไฟล์ลูกค้าไม่สำเร็จ'), severity: 'error' });
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (selectedId) {
      void loadProfile(selectedId);
    }
  }, [selectedId]);

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return customers;
    }
    return customers.filter((customer) => (
      customer.fullName.toLowerCase().includes(keyword)
      || (customer.phoneNumber ?? '').toLowerCase().includes(keyword)
      || (customer.idCardNumber ?? '').toLowerCase().includes(keyword)
      || (customer.address ?? '').toLowerCase().includes(keyword)
    ));
  }, [customers, search]);

  const updateForm = (patch: Partial<CustomerFormState>) => setForm((current) => ({ ...current, ...patch }));
  const resetForm = () => setForm(emptyForm());

  const startEdit = (customer: Customer) => {
    setForm({
      id: customer.id,
      fullName: customer.fullName,
      phoneNumber: customer.phoneNumber ?? '',
      identityType: customer.identityType ?? 'THAI_ID',
      idCardNumber: customer.idCardNumber ?? '',
      address: customer.address ?? '',
      trustLevel: customer.trustLevel ?? 'NORMAL',
      idCardImageUrl: customer.idCardImageUrl ?? '',
      customerImageUrl: customer.customerImageUrl ?? '',
      documentUrl: customer.documentUrl ?? '',
      notes: customer.notes ?? '',
    });
  };

  const handleAttachmentUpload = (field: 'idCardImageUrl' | 'customerImageUrl' | 'documentUrl') => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > maxAttachmentSizeBytes) {
      setMessage({ text: 'ไฟล์ใหญ่เกินไป กรุณาใช้ไฟล์ไม่เกิน 1.5 MB', severity: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateForm({ [field]: String(reader.result) });
    reader.onerror = () => setMessage({ text: 'อ่านไฟล์แนบไม่สำเร็จ', severity: 'error' });
    reader.readAsDataURL(file);
  };

  const payload = (): CustomerRequest => ({
    fullName: form.fullName.trim(),
    phoneNumber: form.phoneNumber.trim() || undefined,
    identityType: form.identityType,
    idCardNumber: form.idCardNumber.trim() || undefined,
    address: form.address.trim() || undefined,
    trustLevel: form.trustLevel,
    idCardImageUrl: form.idCardImageUrl || undefined,
    customerImageUrl: form.customerImageUrl || undefined,
    documentUrl: form.documentUrl || undefined,
    notes: form.notes.trim() || undefined,
  });

  const submit = async () => {
    if (!form.fullName.trim()) {
      setMessage({ text: 'กรุณากรอกชื่อ-นามสกุล', severity: 'error' });
      return;
    }
    setSaving(true);
    try {
      const saved = form.id
        ? await systemApi.updateCustomer(form.id, payload())
        : await systemApi.createCustomer(payload());
      setMessage({ text: form.id ? 'อัปเดตลูกค้าแล้ว' : 'เพิ่มลูกค้าแล้ว', severity: 'success' });
      resetForm();
      setSelectedId(saved.id);
      await load();
      await loadProfile(saved.id);
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'บันทึกลูกค้าไม่สำเร็จ'), severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const transactionRows = historyTab === 0 ? profile?.purchaseHistory ?? [] : profile?.goldSaleHistory ?? [];
  const currentCustomer = profile?.customer;

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>ฐานข้อมูลลูกค้า</Typography>
          <Typography variant="body2" color="text.secondary">จัดเก็บข้อมูลลูกค้า เอกสารแนบ และประวัติซื้อ-ขาย-จำนำ</Typography>
        </Box>
        {(loading || loadingProfile) && <CircularProgress size={28} />}
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                {form.id ? <Edit color="primary" /> : <Add color="primary" />}
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{form.id ? 'แก้ไขลูกค้า' : 'ลูกค้าใหม่'}</Typography>
              </Stack>
              <Stack spacing={2}>
                <TextField label="ชื่อ-นามสกุล" value={form.fullName} onChange={(event) => updateForm({ fullName: event.target.value })} />
                <TextField label="เบอร์โทร" value={form.phoneNumber} onChange={(event) => updateForm({ phoneNumber: event.target.value })} />
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <TextField fullWidth select label="เอกสารยืนยันตัวตน" value={form.identityType} onChange={(event) => updateForm({ identityType: event.target.value as IdentityType })}>
                      {identityOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 7 }}>
                    <TextField fullWidth label={form.identityType === 'THAI_ID' ? 'เลขบัตรประชาชน' : 'เลข Passport'} value={form.idCardNumber} onChange={(event) => updateForm({ idCardNumber: event.target.value })} />
                  </Grid>
                </Grid>
                <TextField select label="ระดับความน่าเชื่อถือ" value={form.trustLevel} onChange={(event) => updateForm({ trustLevel: event.target.value as CustomerTrustLevel })}>
                  {trustOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                </TextField>
                <TextField label="ที่อยู่" multiline minRows={3} value={form.address} onChange={(event) => updateForm({ address: event.target.value })} />
                <TextField label="หมายเหตุ" multiline minRows={2} value={form.notes} onChange={(event) => updateForm({ notes: event.target.value })} />
                <Grid container spacing={1}>
                  {[
                    { field: 'customerImageUrl' as const, label: 'รูปลูกค้า', icon: <Person /> },
                    { field: 'idCardImageUrl' as const, label: 'รูปบัตร', icon: <Badge /> },
                    { field: 'documentUrl' as const, label: 'เอกสารแนบ', icon: <Image /> },
                  ].map((attachment) => (
                    <Grid key={attachment.field} size={{ xs: 12, sm: 4 }}>
                      <Button fullWidth variant="outlined" component="label" startIcon={attachment.icon}>
                        {attachment.label}
                        <input hidden accept="image/*,.pdf" type="file" onChange={handleAttachmentUpload(attachment.field)} />
                      </Button>
                    </Grid>
                  ))}
                </Grid>
                {(form.customerImageUrl || form.idCardImageUrl || form.documentUrl) && (
                  <Grid container spacing={1}>
                    {[
                      { src: form.customerImageUrl, label: 'รูปลูกค้า' },
                      { src: form.idCardImageUrl, label: 'รูปบัตร' },
                      { src: form.documentUrl, label: 'เอกสาร' },
                    ].filter((item) => item.src).map((item) => (
                      <Grid key={item.label} size={{ xs: 4 }}>
                        {item.src.startsWith('data:image') ? (
                          <Box component="img" src={item.src} alt={item.label} sx={{ width: '100%', height: 84, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }} />
                        ) : (
                          <Paper sx={{ height: 84, display: 'grid', placeItems: 'center' }}>
                            <Typography variant="caption">{item.label}</Typography>
                          </Paper>
                        )}
                      </Grid>
                    ))}
                  </Grid>
                )}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
                    onClick={() => void submit()}
                    disabled={saving}
                  >
                    {saving ? 'กำลังบันทึก...' : form.id ? 'บันทึกการแก้ไข' : 'บันทึกลูกค้า'}
                  </Button>
                  {form.id && <Button color="inherit" onClick={resetForm}>ยกเลิก</Button>}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="ค้นหาลูกค้า"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }}
            />
          </Paper>

          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ลูกค้า</TableCell>
                  <TableCell>ติดต่อ</TableCell>
                  <TableCell>เอกสาร</TableCell>
                  <TableCell>ความน่าเชื่อถือ</TableCell>
                  <TableCell align="right">จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    hover
                    selected={selectedId === customer.id}
                    onClick={() => setSelectedId(customer.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>{customer.fullName}</Typography>
                      <Typography variant="caption" color="text.secondary">{customer.address || '-'}</Typography>
                    </TableCell>
                    <TableCell>{customer.phoneNumber || '-'}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{customer.idCardNumber || '-'}</Typography>
                      <Typography variant="caption" color="text.secondary">{customer.identityType === 'PASSPORT' ? 'Passport' : 'บัตรประชาชน'}</Typography>
                    </TableCell>
                    <TableCell><Chip size="small" color={trustColor(customer.trustLevel)} label={trustLabel(customer.trustLevel)} /></TableCell>
                    <TableCell align="right">
                      <Button size="small" startIcon={<Edit />} onClick={(event) => { event.stopPropagation(); startEdit(customer); }}>แก้ไข</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary" sx={{ py: 3 }}>ไม่พบลูกค้า</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {currentCustomer && (
            <Card>
              <CardContent>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{currentCustomer.fullName}</Typography>
                    <Typography variant="body2" color="text.secondary">{currentCustomer.phoneNumber || '-'} • {currentCustomer.address || '-'}</Typography>
                  </Box>
                  <Chip color={trustColor(currentCustomer.trustLevel)} label={trustLabel(currentCustomer.trustLevel)} />
                </Stack>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {[
                    { label: 'ยอดซื้อทองรวม', value: currency.format(profile.totalPurchaseAmount ?? 0) },
                    { label: 'ยอดขายทองคืนรวม', value: currency.format(profile.totalGoldSaleAmount ?? 0) },
                    { label: 'เงินต้นจำนำคงค้าง', value: currency.format(profile.activePawnPrincipal ?? 0) },
                    { label: 'จำนวนตั๋วจำนำ', value: `${number.format(profile.pawnHistory.length)} ตั๋ว` },
                  ].map((item) => (
                    <Grid key={item.label} size={{ xs: 12, sm: 6, md: 3 }}>
                      <Paper sx={{ p: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                        <Typography sx={{ fontWeight: 700 }}>{item.value}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
                <Tabs value={historyTab} onChange={(_, value: number) => setHistoryTab(value)} sx={{ mb: 2 }}>
                  <Tab label="ประวัติซื้อ" />
                  <Tab label="ประวัติขายทอง" />
                  <Tab label="ประวัติจำนำ" />
                </Tabs>

                {historyTab < 2 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>เลขบิล</TableCell>
                          <TableCell>ประเภท</TableCell>
                          <TableCell>วันที่</TableCell>
                          <TableCell align="right">จำนวนรายการ</TableCell>
                          <TableCell align="right">ยอดสุทธิ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {transactionRows.map((item) => (
                          <TableRow key={`${item.id}-${historyTab}`}>
                            <TableCell>{item.receiptNumber}</TableCell>
                            <TableCell>{transactionTypeLabel(item.transactionType)}</TableCell>
                            <TableCell>{formatDate(item.transactionDate)}</TableCell>
                            <TableCell align="right">{number.format(item.itemCount)}</TableCell>
                            <TableCell align="right">{currency.format(item.netAmount ?? 0)}</TableCell>
                          </TableRow>
                        ))}
                        {transactionRows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} align="center"><Typography color="text.secondary" sx={{ py: 2 }}>ยังไม่มีประวัติ</Typography></TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>เลขตั๋ว</TableCell>
                          <TableCell>สินค้า</TableCell>
                          <TableCell>วันจำนำ</TableCell>
                          <TableCell>ครบกำหนด</TableCell>
                          <TableCell>สถานะ</TableCell>
                          <TableCell align="right">เงินต้น</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {profile.pawnHistory.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.ticketNumber}</TableCell>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell>{formatDate(item.pawnDate)}</TableCell>
                            <TableCell>{formatDate(item.dueDate)}</TableCell>
                            <TableCell>{pawnStatusLabel(item.status)}</TableCell>
                            <TableCell align="right">{currency.format(item.principalAmount ?? 0)}</TableCell>
                          </TableRow>
                        ))}
                        {profile.pawnHistory.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} align="center"><Typography color="text.secondary" sx={{ py: 2 }}>ยังไม่มีประวัติจำนำ</Typography></TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
      <Snackbar open={Boolean(message)} autoHideDuration={5000} onClose={() => setMessage(null)}>
        <Alert severity={message?.severity ?? 'success'} onClose={() => setMessage(null)}>{message?.text}</Alert>
      </Snackbar>
    </Stack>
  );
};
