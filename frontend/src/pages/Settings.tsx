import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  InputAdornment,
  Paper,
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
import { Save } from '@mui/icons-material';
import { systemApi } from '../api/systemApi';
import { getErrorMessage } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import type { AuditLog, SystemSettings, SystemSettingsUpdateRequest } from '../types';

type SettingsForm = Record<keyof SystemSettingsUpdateRequest, string>;

const toForm = (settings: SystemSettings): SettingsForm => ({
  gramsPerBaht: String(settings.gramsPerBaht ?? ''),
  wearDeductionPercent: String(settings.wearDeductionPercent ?? ''),
  buyFixedDeductionAmount: String(settings.buyFixedDeductionAmount ?? ''),
  ownerMaxMakingFeeDiscount: String(settings.ownerMaxMakingFeeDiscount ?? ''),
  managerMaxMakingFeeDiscount: String(settings.managerMaxMakingFeeDiscount ?? ''),
  cashierMaxMakingFeeDiscount: String(settings.cashierMaxMakingFeeDiscount ?? ''),
  pawnDefaultTermMonths: String(settings.pawnDefaultTermMonths ?? ''),
  pawnLoanToValuePercent: String(settings.pawnLoanToValuePercent ?? ''),
  pawnSmallTicketInterestRate: String(settings.pawnSmallTicketInterestRate ?? ''),
  pawnStandardTicketInterestRate: String(settings.pawnStandardTicketInterestRate ?? ''),
  pawnSmallTicketLimit: String(settings.pawnSmallTicketLimit ?? ''),
  pawnMiddleTicketMin: String(settings.pawnMiddleTicketMin ?? ''),
  pawnMonthlyReductionForMiddleTickets: String(settings.pawnMonthlyReductionForMiddleTickets ?? ''),
});

const emptyForm: SettingsForm = {
  gramsPerBaht: '',
  wearDeductionPercent: '',
  buyFixedDeductionAmount: '',
  ownerMaxMakingFeeDiscount: '',
  managerMaxMakingFeeDiscount: '',
  cashierMaxMakingFeeDiscount: '',
  pawnDefaultTermMonths: '',
  pawnLoanToValuePercent: '',
  pawnSmallTicketInterestRate: '',
  pawnStandardTicketInterestRate: '',
  pawnSmallTicketLimit: '',
  pawnMiddleTicketMin: '',
  pawnMonthlyReductionForMiddleTickets: '',
};

const parseField = (value: string, label: string) => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`กรุณาระบุ${label}`);
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} ต้องเป็นตัวเลข`);
  }
  return parsed;
};

const fieldGroups: Array<{
  title: string;
  fields: Array<{ key: keyof SettingsForm; label: string; adornment?: string; position?: 'start' | 'end' }>;
}> = [
  {
    title: 'น้ำหนักและรับซื้อทองเก่า',
    fields: [
      { key: 'gramsPerBaht', label: 'กรัมต่อบาททองคำ', adornment: 'กรัม', position: 'end' },
      { key: 'wearDeductionPercent', label: 'หักค่าสึกหรอรับซื้อ', adornment: '%', position: 'end' },
      { key: 'buyFixedDeductionAmount', label: 'หักคงที่ตอนรับซื้อทองเก่า', adornment: '฿', position: 'start' },
    ],
  },
  {
    title: 'สิทธิ์ลดค่ากำเหน็จ',
    fields: [
      { key: 'ownerMaxMakingFeeDiscount', label: 'Owner ลดได้สูงสุด', adornment: '฿', position: 'start' },
      { key: 'managerMaxMakingFeeDiscount', label: 'Manager ลดได้สูงสุด', adornment: '฿', position: 'start' },
      { key: 'cashierMaxMakingFeeDiscount', label: 'Cashier ลดได้สูงสุด', adornment: '฿', position: 'start' },
    ],
  },
  {
    title: 'ขายฝาก / จำนำ',
    fields: [
      { key: 'pawnDefaultTermMonths', label: 'อายุตั๋วเริ่มต้น', adornment: 'เดือน', position: 'end' },
      { key: 'pawnLoanToValuePercent', label: 'วงเงินเทียบมูลค่าประเมิน', adornment: '%', position: 'end' },
      { key: 'pawnSmallTicketInterestRate', label: 'ดอกเบี้ยตั๋วเล็ก', adornment: '%/เดือน', position: 'end' },
      { key: 'pawnStandardTicketInterestRate', label: 'ดอกเบี้ยมาตรฐาน', adornment: '%/เดือน', position: 'end' },
      { key: 'pawnSmallTicketLimit', label: 'เพดานตั๋วเล็ก', adornment: '฿', position: 'start' },
      { key: 'pawnMiddleTicketMin', label: 'ขั้นต่ำตั๋วกลาง', adornment: '฿', position: 'start' },
      { key: 'pawnMonthlyReductionForMiddleTickets', label: 'ส่วนลดดอกเบี้ยตั๋วกลาง', adornment: '฿', position: 'start' },
    ],
  },
];

export const Settings = () => {
  const user = useAuthStore((state) => state.user);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [form, setForm] = useState<SettingsForm>(emptyForm);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setError('');
    try {
      const [settingsData, logData] = await Promise.all([
        systemApi.settings(),
        systemApi.auditLogs().catch(() => []),
      ]);
      setSettings(settingsData);
      setForm(toForm(settingsData));
      setLogs(logData);
    } catch (err) {
      setError(getErrorMessage(err, 'โหลดตั้งค่าระบบไม่สำเร็จ'));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const fieldLabels = useMemo(() => new Map(
    fieldGroups.flatMap((group) => group.fields.map((field) => [field.key, field.label])),
  ), []);

  const updateForm = (key: keyof SettingsForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveSettings = async () => {
    if (user?.role !== 'OWNER') {
      setError('เฉพาะเจ้าของร้านเท่านั้นที่แก้ไขตั้งค่าระบบได้');
      return;
    }
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, parseField(value, fieldLabels.get(key as keyof SettingsForm) ?? key)]),
      ) as SystemSettingsUpdateRequest;
      payload.pawnDefaultTermMonths = Math.round(payload.pawnDefaultTermMonths);
      const updated = await systemApi.updateSettings(payload);
      setSettings(updated);
      setForm(toForm(updated));
      setSuccess('บันทึกตั้งค่าระบบแล้ว');
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'บันทึกตั้งค่าระบบไม่สำเร็จ'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>ตั้งค่าระบบ</Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Chip color={settings?.googleSheetsEnabled ? 'success' : 'default'} label={settings?.googleSheetsEnabled ? 'Google Sheets เชื่อมต่อแล้ว' : 'Google Sheets ปิดอยู่'} />
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
            onClick={() => void saveSettings()}
            disabled={saving || user?.role !== 'OWNER'}
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      {user?.role !== 'OWNER' && <Alert severity="info">คุณดูค่าตั้งค่าได้ แต่การแก้ไขทำได้เฉพาะเจ้าของร้าน</Alert>}

      <Grid container spacing={2}>
        {fieldGroups.map((group) => (
          <Grid key={group.title} size={{ xs: 12, lg: group.title === 'ขายฝาก / จำนำ' ? 12 : 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>{group.title}</Typography>
                <Grid container spacing={1.5}>
                  {group.fields.map((field) => (
                    <Grid key={field.key} size={{ xs: 12, sm: 6, lg: group.title === 'ขายฝาก / จำนำ' ? 4 : 6 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label={field.label}
                        value={form[field.key]}
                        onChange={(event) => updateForm(field.key, event.target.value)}
                        disabled={user?.role !== 'OWNER'}
                        slotProps={{
                          input: field.adornment
                            ? {
                                [field.position === 'start' ? 'startAdornment' : 'endAdornment']: (
                                  <InputAdornment position={field.position ?? 'end'}>{field.adornment}</InputAdornment>
                                ),
                              }
                            : undefined,
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" sx={{ fontWeight: 700 }}>Audit Trail</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>เวลา</TableCell>
              <TableCell>ผู้ใช้</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Entity</TableCell>
              <TableCell>IP</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} hover>
                <TableCell>{new Date(log.createdAt).toLocaleString('th-TH')}</TableCell>
                <TableCell>{log.username ?? '-'}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{log.entityType} {log.entityId ?? ''}</TableCell>
                <TableCell>{log.ipAddress ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};
