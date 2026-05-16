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
import { Add, Close, EventAvailable, History, Info, PriceChange, Receipt, Search } from '@mui/icons-material';
import { pawnApi, type PawnableItem } from '../api/pawnApi';
import { getErrorMessage } from '../api/client';
import type { PawnActionRequest, PawnHistory, PawnInterestSuggestion, PawnTicket } from '../types';

const currency = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });
const number = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 });

const parseNumberInput = (value: string, fallback = 0) => {
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMoneyInput = (value: number) => Math.max(0, value).toFixed(2);

const defaultDueDate = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 4);
  return date.toISOString().slice(0, 10);
};

export const Pawn = () => {
  const [tickets, setTickets] = useState<PawnTicket[]>([]);
  const [pawnableItems, setPawnableItems] = useState<PawnableItem[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<PawnTicket | null>(null);
  const [history, setHistory] = useState<PawnHistory[]>([]);
  const [suggestion, setSuggestion] = useState<PawnInterestSuggestion | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [openingCreate, setOpeningCreate] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [managingTicketId, setManagingTicketId] = useState<number | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    idCard: '',
    productName: '',
    category: '',
    weightGram: '',
    weightText: '',
    principalAmount: '',
    interestRate: '',
    dueDate: defaultDueDate(),
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
    try {
      setPawnableItems(await pawnApi.getPawnableItems());
    } catch {
      setPawnableItems([]);
    } finally {
      setOpeningCreate(false);
    }
    setOpen(true);
  };

  const createTicket = async () => {
    setCreatingTicket(true);
    try {
      await pawnApi.createTicket({
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        idCard: form.idCard,
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
        idCard: '',
        productName: '',
        category: '',
        weightGram: '',
        weightText: '',
        principalAmount: '',
        interestRate: '',
        dueDate: defaultDueDate(),
      });
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
    const interestPaid = actionType === 'ADJUST_PRINCIPAL'
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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>เลขตั๋ว</TableCell>
              <TableCell>ลูกค้า</TableCell>
              <TableCell>สินค้า</TableCell>
              <TableCell align="right">เงินต้น</TableCell>
              <TableCell>ครบกำหนด</TableCell>
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
                  <Chip size="small" color={ticket.status === 'ACTIVE' ? 'primary' : ticket.status === 'REDEEMED' ? 'success' : 'error'} label={ticket.status} />
                </TableCell>
                <TableCell align="right">
                  <IconButton color="primary" onClick={() => void manageTicket(ticket)} disabled={managingTicketId !== null}>
                    {managingTicketId === ticket.id ? <CircularProgress size={22} /> : <Info />}
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filteredTickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">ไม่พบข้อมูล</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>ออกตั๋วจำนำใหม่</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="ชื่อ-นามสกุล" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="เบอร์โทรศัพท์" value={form.customerPhone} onChange={(event) => setForm({ ...form, customerPhone: event.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="เลขบัตรประชาชน" value={form.idCard} onChange={(event) => setForm({ ...form, idCard: event.target.value })} />
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
              <TextField fullWidth type="number" label="น้ำหนักชั่งจริง" value={form.weightGram} onChange={(event) => setForm({ ...form, weightGram: event.target.value })} slotProps={{ input: { endAdornment: <InputAdornment position="end">กรัม</InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="น้ำหนักหน้าร้าน" value={form.weightText} onChange={(event) => setForm({ ...form, weightText: event.target.value })} />
            </Grid>
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
            <IconButton onClick={() => setManageOpen(false)} disabled={submittingAction}><Close /></IconButton>
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
                {activeTab < 3 && (
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
