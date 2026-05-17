import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add,
  Calculate,
  Close,
  EventAvailable,
  Gavel,
  History,
  Info,
  NotificationsActive,
  PriceChange,
  Print,
  Receipt,
  Search,
  WarningAmber,
} from '@mui/icons-material';
import { pawnApi, type PawnableItem } from '../api/pawnApi';
import { getErrorMessage } from '../api/client';
import { systemApi } from '../api/systemApi';
import type { IdentityType, PawnActionRequest, PawnEstimateResponse, PawnHistory, PawnInterestSuggestion, PawnStatus, PawnTicket, SystemSettings } from '../types';
import shopLogo from '../assets/ek-hua-heng-logo.png';

const currency = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });
const number = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 });

const parseNumberInput = (value: string, fallback = 0) => {
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMoneyInput = (value: number) => Math.max(0, value).toFixed(2);

const identityTypeLabel: Record<IdentityType, string> = {
  THAI_ID: 'บัตรประชาชน',
  PASSPORT: 'Passport',
};

const normalizePhoneInput = (value: string) => value.trim().replace(/[\s-]/g, '');

const normalizeIdentityInput = (type: IdentityType, value: string) => {
  if (type === 'PASSPORT') {
    return value.trim().replace(/[\s-]/g, '').toUpperCase();
  }
  return value.replace(/\D/g, '');
};

const isValidPhone = (value: string) => /^(0\d{8,9}|\+66\d{8,9})$/.test(value);

const isValidThaiId = (value: string) => {
  if (!/^\d{13}$/.test(value) || /^(\d)\1{12}$/.test(value)) {
    return false;
  }
  const sum = value
    .slice(0, 12)
    .split('')
    .reduce((total, digit, index) => total + Number(digit) * (13 - index), 0);
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === Number(value[12]);
};

const isValidIdentity = (type: IdentityType, value: string) => (
  type === 'PASSPORT'
    ? /^[A-Z0-9]{6,20}$/.test(value)
    : isValidThaiId(value)
);

const formatGoldWeight = (weightGram: number, gramsPerBaht: number) => {
  if (!Number.isFinite(weightGram) || weightGram <= 0 || !Number.isFinite(gramsPerBaht) || gramsPerBaht <= 0) {
    return '';
  }
  const bahtWeight = weightGram / gramsPerBaht;
  const salueng = bahtWeight * 4;
  const roundedSalueng = Math.round(salueng);
  const commonUnit = Math.abs(salueng - roundedSalueng) <= 0.02
    ? `${number.format(roundedSalueng)} สลึง`
    : `${number.format(salueng)} สลึง`;
  return `${number.format(bahtWeight)} บาททอง (${commonUnit})`;
};

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const statusLabel: Record<PawnStatus, string> = {
  ACTIVE: 'ใช้งานอยู่',
  REDEEMED: 'ไถ่ถอนแล้ว',
  EXPIRED: 'หลุดจำนำ',
};

const statusColor = (status: PawnStatus) => {
  if (status === 'ACTIVE') {
    return 'primary';
  }
  return status === 'REDEEMED' ? 'success' : 'error';
};

const daysUntil = (dateValue: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000);
};

const defaultDueDate = (months = 4) => {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
};

export const Pawn = () => {
  const [tickets, setTickets] = useState<PawnTicket[]>([]);
  const [pawnableItems, setPawnableItems] = useState<PawnableItem[]>([]);
  const [gramsPerBaht, setGramsPerBaht] = useState<number | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<PawnTicket | null>(null);
  const [history, setHistory] = useState<PawnHistory[]>([]);
  const [suggestion, setSuggestion] = useState<PawnInterestSuggestion | null>(null);
  const [estimate, setEstimate] = useState<PawnEstimateResponse | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [openingCreate, setOpeningCreate] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [managingTicketId, setManagingTicketId] = useState<number | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    identityType: 'THAI_ID' as IdentityType,
    idCard: '',
    productName: '',
    category: '',
    weightGram: '',
    weightText: '',
    principalAmount: '',
    interestRate: '',
    dueDate: defaultDueDate(),
    goldPricePerBaht: '',
    wearDeductionPercent: '5',
    loanToValuePercent: '85',
  });
  const [actionForm, setActionForm] = useState({
    interestPaid: '',
    amountPaid: '',
    principalAdjusted: '',
    extendMonths: '1',
    newInterestRate: '',
    interestMonths: '0.5',
  });

  const loadTickets = async () => {
    try {
      setTickets(await pawnApi.getTickets());
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'ไม่สามารถโหลดตั๋วจำนำได้'), severity: 'error' });
    }
  };

  useEffect(() => {
    void loadTickets();
    systemApi.settings()
      .then((settingsData) => {
        setSettings(settingsData);
        setGramsPerBaht(settingsData.gramsPerBaht);
        setForm((current) => ({
          ...current,
          dueDate: defaultDueDate(settingsData.pawnDefaultTermMonths),
          wearDeductionPercent: String(settingsData.wearDeductionPercent),
          loanToValuePercent: String(settingsData.pawnLoanToValuePercent),
        }));
      })
      .catch(() => {
        setSettings(null);
        setGramsPerBaht(null);
      });
  }, []);

  const filteredTickets = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return tickets;
    }
    return tickets.filter((ticket) =>
      ticket.ticketNumber.toLowerCase().includes(keyword)
      || ticket.customer.fullName.toLowerCase().includes(keyword)
      || ticket.product.name.toLowerCase().includes(keyword)
    );
  }, [query, tickets]);

  const activeTickets = useMemo(() => tickets.filter((ticket) => ticket.status === 'ACTIVE'), [tickets]);
  const overdueTickets = useMemo(() => activeTickets.filter((ticket) => daysUntil(ticket.dueDate) < 0), [activeTickets]);
  const nearDueTickets = useMemo(() => activeTickets.filter((ticket) => {
    const days = daysUntil(ticket.dueDate);
    return days >= 0 && days <= 7;
  }), [activeTickets]);
  const normalizedPhone = normalizePhoneInput(form.customerPhone);
  const normalizedIdentityNumber = normalizeIdentityInput(form.identityType, form.idCard);
  const phoneHasError = form.customerPhone.trim().length > 0 && !isValidPhone(normalizedPhone);
  const identityHasError = form.idCard.trim().length > 0 && !isValidIdentity(form.identityType, normalizedIdentityNumber);
  const goldWeightText = gramsPerBaht
    ? formatGoldWeight(parseNumberInput(form.weightGram), gramsPerBaht)
    : '';

  const interestMonths = parseNumberInput(actionForm.interestMonths);
  const monthlyInterestRate = selectedTicket
    ? parseNumberInput(actionForm.newInterestRate, selectedTicket.interestRate)
    : 0;
  const monthlyInterestBeforeReduction = selectedTicket
    ? selectedTicket.principalAmount * (monthlyInterestRate / 100)
    : 0;
  const monthlyReduction = suggestion?.reduction ?? 0;
  const calculatedInterest = Math.max(0, (monthlyInterestBeforeReduction - monthlyReduction) * interestMonths);
  const calculatedRedeemTotal = selectedTicket ? selectedTicket.principalAmount + calculatedInterest : calculatedInterest;
  const calculatedRenewDueDate = selectedTicket
    ? (() => {
        const date = new Date(selectedTicket.dueDate);
        date.setMonth(date.getMonth() + Number(actionForm.extendMonths || 0));
        return date;
      })()
    : null;

  const openCreateDialog = async () => {
    setOpeningCreate(true);
    setEstimate(null);
    try {
      setPawnableItems(await pawnApi.getPawnableItems());
    } catch {
      setPawnableItems([]);
    } finally {
      setOpeningCreate(false);
    }
    setOpen(true);
  };

  const estimatePawn = async () => {
    if (!form.weightGram) {
      setMessage({ text: 'กรุณาระบุน้ำหนักทองก่อนประเมินราคา', severity: 'error' });
      return;
    }
    setEstimating(true);
    try {
      const response = await pawnApi.estimate({
        weightGram: parseNumberInput(form.weightGram),
        goldPricePerBaht: form.goldPricePerBaht ? parseNumberInput(form.goldPricePerBaht) : undefined,
        wearDeductionPercent: form.wearDeductionPercent ? parseNumberInput(form.wearDeductionPercent) : undefined,
        loanToValuePercent: form.loanToValuePercent ? parseNumberInput(form.loanToValuePercent) : undefined,
        principalAmount: form.principalAmount ? parseNumberInput(form.principalAmount) : undefined,
      });
      setEstimate(response);
      setForm((prev) => ({
        ...prev,
        principalAmount: formatMoneyInput(response.selectedPrincipal),
        interestRate: String(response.monthlyInterestRate),
        dueDate: response.defaultDueDate,
      }));
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'ประเมินราคาทองไม่สำเร็จ'), severity: 'error' });
    } finally {
      setEstimating(false);
    }
  };

  const createTicket = async () => {
    if (!form.customerName.trim()) {
      setMessage({ text: 'กรุณาระบุชื่อลูกค้า', severity: 'error' });
      return;
    }
    if (!isValidPhone(normalizedPhone)) {
      setMessage({ text: 'กรุณาระบุเบอร์โทรให้ถูกต้อง เช่น 0812345678 หรือ +66812345678', severity: 'error' });
      return;
    }
    if (!isValidIdentity(form.identityType, normalizedIdentityNumber)) {
      setMessage({
        text: form.identityType === 'PASSPORT'
          ? 'กรุณาระบุ Passport เป็นตัวอักษรหรือตัวเลข 6-20 ตัว'
          : 'กรุณาระบุเลขบัตรประชาชน 13 หลักให้ถูกต้อง',
        severity: 'error',
      });
      return;
    }
    setCreatingTicket(true);
    try {
      await pawnApi.createTicket({
        customerName: form.customerName.trim(),
        customerPhone: normalizedPhone,
        identityType: form.identityType,
        identityNumber: normalizedIdentityNumber,
        idCard: normalizedIdentityNumber,
        productName: form.productName,
        category: form.category,
        weightGram: Number(form.weightGram || 0),
        weightText: form.weightText,
        principalAmount: Number(form.principalAmount),
        interestRate: form.interestRate ? Number(form.interestRate) : undefined,
        dueDate: form.dueDate,
      });
      setMessage({ text: 'ออกตั๋วจำนำสำเร็จ', severity: 'success' });
      setOpen(false);
      setForm({
        customerName: '',
        customerPhone: '',
        identityType: 'THAI_ID',
        idCard: '',
        productName: '',
        category: '',
        weightGram: '',
        weightText: '',
        principalAmount: '',
        interestRate: '',
        dueDate: defaultDueDate(settings?.pawnDefaultTermMonths),
        goldPricePerBaht: '',
        wearDeductionPercent: String(settings?.wearDeductionPercent ?? 5),
        loanToValuePercent: String(settings?.pawnLoanToValuePercent ?? 85),
      });
      setEstimate(null);
      await loadTickets();
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'ออกตั๋วจำนำไม่สำเร็จ'), severity: 'error' });
    } finally {
      setCreatingTicket(false);
    }
  };

  const manageTicket = async (ticket: PawnTicket) => {
    setManagingTicketId(ticket.id);
    setSelectedTicket(ticket);
    setManageOpen(true);
    setActiveTab(0);
    setActionForm({
      interestPaid: '',
      amountPaid: '',
      principalAdjusted: '',
      extendMonths: '1',
      newInterestRate: String(ticket.interestRate),
      interestMonths: '0.5',
    });
    try {
      const [historyRows, interest] = await Promise.all([
        pawnApi.getHistory(ticket.id),
        pawnApi.getInterestSuggestion(ticket.id),
      ]);
      setHistory(historyRows);
      setSuggestion(interest);
      setActionForm((prev) => ({
        ...prev,
        interestMonths: String(interest.renewMonths),
        interestPaid: interest.renewInterest.toFixed(2),
      }));
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'โหลดข้อมูลตั๋วไม่สำเร็จ'), severity: 'error' });
    } finally {
      setManagingTicketId(null);
    }
  };

  const performAction = async (actionType: PawnActionRequest['actionType']) => {
    if (!selectedTicket) {
      return;
    }
    setSubmittingAction(true);
    const interestPaid = actionType === 'ADJUST_PRINCIPAL' || actionType === 'EXPIRE'
      ? 0
      : Number(formatMoneyInput(calculatedInterest));
    const amountPaid = actionType === 'REDEEM'
      ? Number(formatMoneyInput(calculatedRedeemTotal))
      : actionType === 'RENEW'
        ? interestPaid
        : Number(actionForm.amountPaid || 0);
    try {
      await pawnApi.performAction(selectedTicket.id, {
        actionType,
        amountPaid,
        interestPaid,
        principalAdjusted: Number(actionForm.principalAdjusted || 0),
        extendMonths: Number(actionForm.extendMonths || 0),
        newInterestRate: Number(actionForm.newInterestRate || selectedTicket.interestRate),
      });
      setMessage({ text: 'ทำรายการสำเร็จ', severity: 'success' });
      setManageOpen(false);
      await loadTickets();
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'ทำรายการไม่สำเร็จ'), severity: 'error' });
    } finally {
      setSubmittingAction(false);
    }
  };

  const printTicket = (ticket: PawnTicket) => {
    const printable = window.open('', '_blank', 'width=820,height=900');
    if (!printable) {
      setMessage({ text: 'เบราว์เซอร์บล็อกหน้าต่างพิมพ์ตั๋ว', severity: 'error' });
      return;
    }
    const logoSrc = new URL(shopLogo, window.location.origin).href;
    const identityLabel = ticket.customer.identityType === 'PASSPORT' ? 'เลข Passport' : 'เลขบัตรประชาชน';
    const rows = [
      ['เลขตั๋ว', ticket.ticketNumber],
      ['ลูกค้า', ticket.customer.fullName],
      [identityLabel, ticket.customer.idCardNumber || '-'],
      ['เบอร์โทร', ticket.customer.phoneNumber || '-'],
      ['รายการทอง', ticket.product.name],
      ['หมวดหมู่/ถาด', ticket.product.category],
      ['น้ำหนัก', ticket.product.weightText || `${ticket.product.weightGram} กรัม`],
      ['เงินต้น', currency.format(ticket.principalAmount)],
      ['ดอกเบี้ยต่อเดือน', `${number.format(ticket.interestRate)}%`],
      ['วันที่จำนำ', new Date(ticket.pawnDate).toLocaleDateString('th-TH')],
      ['วันครบกำหนด', new Date(ticket.dueDate).toLocaleDateString('th-TH')],
    ];
    printable.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(ticket.ticketNumber)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #1f1f1f; }
            .ticket { border: 2px solid #b71c1c; padding: 24px; border-radius: 8px; }
            .header { display: flex; align-items: center; gap: 16px; padding-bottom: 18px; border-bottom: 2px solid #f0dba0; }
            .logo { width: 86px; height: 86px; object-fit: contain; }
            h1 { margin: 0; color: #b71c1c; font-size: 24px; }
            h2 { margin: 4px 0 0; font-size: 18px; color: #806000; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            td { padding: 10px 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
            td:first-child { width: 180px; color: #666; }
            .amount { font-size: 28px; font-weight: 700; color: #b71c1c; margin: 18px 0; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 56px; }
            .line { border-top: 1px solid #444; padding-top: 8px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              <img class="logo" src="${escapeHtml(logoSrc)}" alt="ห้างทองเอกฮั่วเฮง" />
              <div>
                <h1>ห้างทองเอกฮั่วเฮง</h1>
                <h2>ตั๋วจำนำ / ขายฝากทอง</h2>
              </div>
            </div>
            <div class="amount">${escapeHtml(currency.format(ticket.principalAmount))}</div>
            <table>
              ${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(String(value))}</td></tr>`).join('')}
            </table>
            <div class="signatures">
              <div class="line">ผู้รับจำนำ</div>
              <div class="line">ลูกค้า</div>
            </div>
          </div>
          <script>
            window.onload = function () {
              window.focus();
              window.setTimeout(function () {
                window.print();
              }, 100);
            };
          </script>
        </body>
      </html>
    `);
    printable.document.close();
  };

  useEffect(() => {
    if (!suggestion || !selectedTicket) {
      return;
    }
    const months = activeTab === 2 ? suggestion.redeemMonths : suggestion.renewMonths;
    const interest = activeTab === 2 ? suggestion.redeemInterest : suggestion.renewInterest;
    setActionForm((prev) => ({
      ...prev,
      interestMonths: String(months),
      interestPaid: interest.toFixed(2),
    }));
  }, [activeTab, suggestion, selectedTicket]);

  useEffect(() => {
    if (!selectedTicket || activeTab === 1) {
      return;
    }
    const interestPaid = formatMoneyInput(calculatedInterest);
    const amountPaid = formatMoneyInput(activeTab === 2 ? calculatedRedeemTotal : calculatedInterest);
    setActionForm((prev) => (
      prev.interestPaid === interestPaid && prev.amountPaid === amountPaid
        ? prev
        : { ...prev, interestPaid, amountPaid }
    ));
  }, [activeTab, calculatedInterest, calculatedRedeemTotal, selectedTicket]);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>ระบบขายฝาก / จำนำ</Typography>
          <Typography variant="body2" color="text.secondary">ติดตามตั๋ว ต่อดอก ตัดต้น และไถ่ถอน</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={openingCreate ? <CircularProgress size={18} color="inherit" /> : <Add />}
          onClick={() => void openCreateDialog()}
          disabled={openingCreate}
        >
          {openingCreate ? 'กำลังโหลด...' : 'ออกตั๋วใหม่'}
        </Button>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="ค้นหาตามเลขตั๋ว ลูกค้า หรือสินค้า"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          slotProps={{ input: { startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> } }}
        />
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.light', bgcolor: 'rgba(183,28,28,0.04)' }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <NotificationsActive color="primary" />
              <Box>
                <Typography variant="body2" color="text.secondary">ตั๋วใช้งานอยู่</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{number.format(activeTickets.length)} รายการ</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2, borderColor: 'warning.light', bgcolor: 'rgba(237,108,2,0.06)' }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <WarningAmber color="warning" />
              <Box>
                <Typography variant="body2" color="text.secondary">ใกล้ครบกำหนดใน 7 วัน</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{number.format(nearDueTickets.length)} รายการ</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2, borderColor: 'error.light', bgcolor: 'rgba(211,47,47,0.06)' }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Gavel color="error" />
              <Box>
                <Typography variant="body2" color="text.secondary">เกินกำหนดรอตัดหลุด</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{number.format(overdueTickets.length)} รายการ</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>เลขตั๋ว</TableCell>
              <TableCell>ลูกค้า</TableCell>
              <TableCell>สินค้า</TableCell>
              <TableCell align="right">เงินต้น</TableCell>
              <TableCell>ครบกำหนด</TableCell>
              <TableCell>แจ้งเตือน</TableCell>
              <TableCell>สถานะ</TableCell>
              <TableCell align="right">จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTickets.map((ticket) => (
              <TableRow key={ticket.id} hover>
                <TableCell>{ticket.ticketNumber}</TableCell>
                <TableCell>{ticket.customer.fullName}</TableCell>
                <TableCell>{ticket.product.name}</TableCell>
                <TableCell align="right">{currency.format(ticket.principalAmount)}</TableCell>
                <TableCell>{new Date(ticket.dueDate).toLocaleDateString('th-TH')}</TableCell>
                <TableCell>
                  {ticket.status !== 'ACTIVE' && <Typography variant="body2" color="text.secondary">ปิดตั๋วแล้ว</Typography>}
                  {ticket.status === 'ACTIVE' && daysUntil(ticket.dueDate) < 0 && (
                    <Chip size="small" color="error" label={`เกิน ${Math.abs(daysUntil(ticket.dueDate))} วัน`} />
                  )}
                  {ticket.status === 'ACTIVE' && daysUntil(ticket.dueDate) >= 0 && daysUntil(ticket.dueDate) <= 7 && (
                    <Chip size="small" color="warning" label={`เหลือ ${daysUntil(ticket.dueDate)} วัน`} />
                  )}
                  {ticket.status === 'ACTIVE' && daysUntil(ticket.dueDate) > 7 && (
                    <Typography variant="body2" color="text.secondary">-</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip size="small" color={statusColor(ticket.status)} label={statusLabel[ticket.status]} />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                    <IconButton color="secondary" onClick={() => printTicket(ticket)}>
                      <Print />
                    </IconButton>
                    <IconButton color="primary" onClick={() => void manageTicket(ticket)} disabled={managingTicketId !== null}>
                      {managingTicketId === ticket.id ? <CircularProgress size={22} /> : <Info />}
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {filteredTickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">ไม่พบข้อมูล</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>เปิดตั๋วจำนำทอง</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>ข้อมูลลูกค้า</Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="ชื่อ-นามสกุล" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="เบอร์โทรศัพท์"
                value={form.customerPhone}
                onChange={(event) => setForm({ ...form, customerPhone: event.target.value })}
                error={phoneHasError}
                helperText={phoneHasError ? 'รูปแบบที่รองรับ เช่น 0812345678 หรือ +66812345678' : 'ใช้สำหรับติดต่อและแจ้งเตือนตั๋วใกล้ครบกำหนด'}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                fullWidth
                label="ประเภทเอกสาร"
                value={form.identityType}
                onChange={(event) => setForm({ ...form, identityType: event.target.value as IdentityType, idCard: '' })}
              >
                <MenuItem value="THAI_ID">บัตรประชาชน</MenuItem>
                <MenuItem value="PASSPORT">Passport</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                fullWidth
                label={form.identityType === 'PASSPORT' ? 'เลข Passport' : 'เลขบัตรประชาชน'}
                value={form.idCard}
                onChange={(event) => setForm({ ...form, idCard: event.target.value })}
                error={identityHasError}
                helperText={identityHasError
                  ? (form.identityType === 'PASSPORT' ? 'ใช้ตัวอักษรหรือตัวเลข 6-20 ตัว' : 'เลขบัตรประชาชนต้องถูกต้องตาม checksum 13 หลัก')
                  : `ระบบจะบันทึกเป็น ${identityTypeLabel[form.identityType]}`}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Divider />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>รายละเอียดทอง</Typography>
            </Grid>
            {pawnableItems.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <TextField
                  select
                  fullWidth
                  label="รายการจาก Google Sheets"
                  onChange={(event) => {
                    const selected = pawnableItems.find((item) => item.id === event.target.value);
                    if (selected) {
                      setForm({ ...form, productName: selected.name, category: selected.category });
                    }
                  }}
                >
                  {pawnableItems.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                </TextField>
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="ชื่อสินค้า" value={form.productName} onChange={(event) => setForm({ ...form, productName: event.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="หมวดหมู่/ถาด" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="น้ำหนักชั่งจริง"
                value={form.weightGram}
                onChange={(event) => setForm({ ...form, weightGram: event.target.value })}
                helperText={goldWeightText ? `เทียบเป็น ${goldWeightText}` : 'ใส่น้ำหนักกรัมเพื่อแสดงบาททอง'}
                slotProps={{ input: { endAdornment: <InputAdornment position="end">กรัม</InputAdornment> } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="น้ำหนักหน้าร้าน" value={form.weightText} onChange={(event) => setForm({ ...form, weightText: event.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Divider />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>ประเมินราคาและวงเงินจำนำ</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="ราคาทองคำแท่งรับซื้อ/บาททอง"
                value={form.goldPricePerBaht}
                onChange={(event) => setForm({ ...form, goldPricePerBaht: event.target.value })}
                helperText="ทองรูปพรรณใช้ราคาแท่งรับซื้อเป็นฐาน แล้วหักค่าสึกหรอ"
                slotProps={{ input: { startAdornment: <InputAdornment position="start">฿</InputAdornment> } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="หักค่าสึกหรอ"
                value={form.wearDeductionPercent}
                onChange={(event) => setForm({ ...form, wearDeductionPercent: event.target.value })}
                slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="วงเงินเทียบมูลค่าประเมิน"
                value={form.loanToValuePercent}
                onChange={(event) => setForm({ ...form, loanToValuePercent: event.target.value })}
                slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button
                variant="outlined"
                startIcon={estimating ? <CircularProgress size={18} color="inherit" /> : <Calculate />}
                onClick={() => void estimatePawn()}
                disabled={estimating || !form.weightGram}
              >
                {estimating ? 'กำลังประเมิน...' : 'ประเมินราคาทองและคำนวณดอกเบี้ย'}
              </Button>
            </Grid>
            {estimate && (
              <Grid size={{ xs: 12 }}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(212,175,55,0.08)', borderColor: 'rgba(212,175,55,0.32)' }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">มูลค่าทองก่อนหัก</Typography>
                      <Typography sx={{ fontWeight: 800 }}>{currency.format(estimate.rawGoldValue)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">หักค่าสึกหรอ</Typography>
                      <Typography sx={{ fontWeight: 800 }}>{currency.format(estimate.wearDeductionAmount)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">มูลค่าประเมิน</Typography>
                      <Typography sx={{ fontWeight: 800 }}>{currency.format(estimate.appraisedValue)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">วงเงินแนะนำ</Typography>
                      <Typography color="primary.main" sx={{ fontWeight: 900 }}>{currency.format(estimate.recommendedPrincipal)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">ดอกเบี้ย/เดือน</Typography>
                      <Typography sx={{ fontWeight: 800 }}>{number.format(estimate.monthlyInterestRate)}%</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">ยอดดอกต่อเดือน</Typography>
                      <Typography sx={{ fontWeight: 800 }}>{currency.format(estimate.monthlyInterestAmount)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">อายุตั๋วเริ่มต้น</Typography>
                      <Typography sx={{ fontWeight: 800 }}>{estimate.defaultTermMonths} เดือน</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">วันครบกำหนด</Typography>
                      <Typography sx={{ fontWeight: 800 }}>{new Date(estimate.defaultDueDate).toLocaleDateString('th-TH')}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth type="number" label="เงินต้น" value={form.principalAmount} onChange={(event) => setForm({ ...form, principalAmount: event.target.value })} slotProps={{ input: { startAdornment: <InputAdornment position="start">฿</InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth type="number" label="ดอกเบี้ยต่อเดือน" value={form.interestRate} onChange={(event) => setForm({ ...form, interestRate: event.target.value })} slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth type="date" label="วันครบกำหนด" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={creatingTicket}>ยกเลิก</Button>
          <Button
            variant="contained"
            onClick={() => void createTicket()}
            disabled={!form.customerName || !form.productName || !form.principalAmount || creatingTicket}
            startIcon={creatingTicket ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {creatingTicket ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={manageOpen} onClose={() => setManageOpen(false)} fullWidth maxWidth="md">
        <DialogTitle component="div">
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">จัดการตั๋ว {selectedTicket?.ticketNumber}</Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              {selectedTicket && (
                <Button size="small" variant="outlined" startIcon={<Print />} onClick={() => printTicket(selectedTicket)}>
                  พิมพ์ตั๋ว
                </Button>
              )}
              {selectedTicket?.status === 'ACTIVE' && (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={submittingAction ? <CircularProgress size={16} color="inherit" /> : <Gavel />}
                  onClick={() => {
                    if (window.confirm('ยืนยันตัดตั๋วนี้เป็นหลุดจำนำและนำทองกลับเข้าสต๊อกหรือไม่?')) {
                      void performAction('EXPIRE');
                    }
                  }}
                  disabled={submittingAction}
                >
                  หลุดจำนำ
                </Button>
              )}
              <IconButton onClick={() => setManageOpen(false)} disabled={submittingAction}><Close /></IconButton>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {selectedTicket && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: 'rgba(183,28,28,0.04)',
                    borderColor: 'rgba(183,28,28,0.16)',
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">ลูกค้า</Typography>
                      <Typography sx={{ fontWeight: 800 }}>{selectedTicket.customer.fullName}</Typography>
                      <Typography variant="body2" color="text.secondary">{selectedTicket.product.name}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <Typography variant="caption" color="text.secondary">เงินต้น</Typography>
                      <Typography color="primary.main" sx={{ fontWeight: 800 }}>{currency.format(selectedTicket.principalAmount)}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <Typography variant="caption" color="text.secondary">ดอกเบี้ย/เดือน</Typography>
                      <Typography sx={{ fontWeight: 800 }}>{number.format(monthlyInterestRate)}%</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <Typography variant="caption" color="text.secondary">ครบกำหนดเดิม</Typography>
                      <Typography sx={{ fontWeight: 800 }}>{new Date(selectedTicket.dueDate).toLocaleDateString('th-TH')}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">{activeTab === 2 ? 'ยอดไถ่ถอนรวม' : 'ยอดต้องชำระ'}</Typography>
                      <Typography variant="h6" color={activeTab === 2 ? 'warning.main' : 'primary.main'} sx={{ fontWeight: 900 }}>
                        {currency.format(activeTab === 2 ? calculatedRedeemTotal : calculatedInterest)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Tabs value={activeTab} onChange={(_, value: number) => setActiveTab(value)} variant="scrollable" scrollButtons="auto">
                  <Tab icon={<EventAvailable />} label="ต่อดอก" />
                  <Tab icon={<PriceChange />} label="ตัดต้น" />
                  <Tab icon={<Receipt />} label="ไถ่ถอน" />
                  <Tab icon={<History />} label="ประวัติ" />
                </Tabs>
                <Divider sx={{ mb: 2 }} />
                {selectedTicket.status !== 'ACTIVE' && activeTab < 3 && (
                  <Alert severity="info">
                    ตั๋วนี้อยู่ในสถานะ {statusLabel[selectedTicket.status]} จึงทำรายการต่อดอก ตัดต้น หรือไถ่ถอนไม่ได้
                  </Alert>
                )}
                {selectedTicket.status === 'ACTIVE' && activeTab < 3 && (
                  <Grid container spacing={2}>
                    {activeTab !== 1 && (
                      <>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField
                            fullWidth
                            type="number"
                            label="เดือนที่คิดดอก"
                            value={actionForm.interestMonths}
                            onChange={(event) => setActionForm({ ...actionForm, interestMonths: event.target.value })}
                            helperText="แก้จำนวนเดือนแล้วระบบคำนวณยอดทันที"
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField
                            fullWidth
                            type="number"
                            label="อัตราดอกเบี้ยต่อเดือน"
                            value={actionForm.newInterestRate}
                            onChange={(event) => setActionForm({ ...actionForm, newInterestRate: event.target.value })}
                            slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField
                            fullWidth
                            type="number"
                            label="ดอกเบี้ยที่ต้องจ่าย"
                            value={actionForm.interestPaid}
                            slotProps={{ input: { readOnly: true, startAdornment: <InputAdornment position="start">฿</InputAdornment> } }}
                          />
                        </Grid>
                      </>
                    )}
                    {activeTab === 0 && (
                      <>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField fullWidth type="number" label="จำนวนเดือนที่ต่ออายุตั๋ว" value={actionForm.extendMonths} onChange={(event) => setActionForm({ ...actionForm, extendMonths: event.target.value })} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                          <Paper variant="outlined" sx={{ p: 2, height: '100%', bgcolor: 'background.default' }}>
                            <Typography variant="body2" color="text.secondary">สูตรคำนวณ</Typography>
                            <Typography sx={{ fontWeight: 700 }}>
                              ({currency.format(monthlyInterestBeforeReduction)} - {currency.format(monthlyReduction)}) x {number.format(interestMonths)} เดือน
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              วันครบกำหนดใหม่: {calculatedRenewDueDate ? calculatedRenewDueDate.toLocaleDateString('th-TH') : '-'}
                            </Typography>
                          </Paper>
                        </Grid>
                      </>
                    )}
                    {activeTab === 1 && (
                      <Grid size={{ xs: 12 }}>
                        <TextField fullWidth type="number" label="ยอดปรับเงินต้น" value={actionForm.principalAdjusted} onChange={(event) => setActionForm({ ...actionForm, principalAdjusted: event.target.value })} slotProps={{ input: { startAdornment: <InputAdornment position="start">฿</InputAdornment> } }} />
                      </Grid>
                    )}
                    <Grid size={{ xs: 12 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        color={activeTab === 2 ? 'warning' : 'primary'}
                        onClick={() => void performAction(activeTab === 0 ? 'RENEW' : activeTab === 1 ? 'ADJUST_PRINCIPAL' : 'REDEEM')}
                        disabled={submittingAction}
                        startIcon={submittingAction ? <CircularProgress size={18} color="inherit" /> : undefined}
                      >
                        {submittingAction ? 'กำลังทำรายการ...' : activeTab === 2 ? 'ยืนยันไถ่ถอน' : activeTab === 1 ? 'ยืนยันตัดต้น' : `ชำระ ${currency.format(calculatedInterest)} และต่อดอก`}
                      </Button>
                    </Grid>
                  </Grid>
                )}
                {activeTab === 3 && (
                  <Stack spacing={1}>
                    {history.map((item) => (
                      <Paper key={item.id} variant="outlined" sx={{ p: 1.5 }}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                          <Typography sx={{ fontWeight: 700 }}>{item.actionType}</Typography>
                          <Typography variant="caption" color="text.secondary">{new Date(item.createdAt).toLocaleString('th-TH')}</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">ชำระ {currency.format(item.amountPaid || item.interestPaid || 0)}</Typography>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar open={Boolean(message)} autoHideDuration={5000} onClose={() => setMessage(null)}>
        <Alert severity={message?.severity ?? 'success'} onClose={() => setMessage(null)}>{message?.text}</Alert>
      </Snackbar>
    </Stack>
  );
};
