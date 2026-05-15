import { useState, useEffect } from 'react';
import { 
  Box, Typography, Grid, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Button, Chip, 
  IconButton, TextField, MenuItem, Dialog, DialogTitle, 
  DialogContent, DialogActions, Alert, CircularProgress, Snackbar,
  Tabs, Tab, Divider, List, ListItem, ListItemText
} from '@mui/material';
import { Add, Search, Receipt, Info, History, PriceChange, EventAvailable, Close } from '@mui/icons-material';
import { pawnApi } from '../api/pawnApi';
import { posApi } from '../api/posApi';
import { useAuthStore } from '../store/useAuthStore';

export const Pawn = () => {
  const token = useAuthStore((state) => state.token);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [suggestion, setSuggestion] = useState<any>(null);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Action Form State
  const [actionForm, setActionForm] = useState({
    amountPaid: '',
    interestPaid: '',
    principalAdjusted: '',
    extendMonths: 1,
    newInterestRate: '',
    interestMonths: 0
  });

  // New Ticket Form State
  const [form, setForm] = useState({
    customerId: 1,
    productId: '',
    principalAmount: '',
    interestRate: 1.25,
    dueDate: ''
  });

  const fetchTickets = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await pawnApi.getTickets(token);
      setTickets(data);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [token]);

  const handleOpen = async () => {
    if (!token) return;
    try {
      const products = await posApi.getAvailableProducts(token);
      setAvailableProducts(products);
      setOpen(true);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleManage = async (ticket: any) => {
    if (!ticket) return;
    setSelectedTicket(ticket);
    setManageOpen(true);
    setActiveTab(0);
    setSuggestion(null);
    setActionForm({ 
      amountPaid: '', 
      interestPaid: '', 
      principalAdjusted: '', 
      extendMonths: 1,
      newInterestRate: ticket.interestRate?.toString() || '0',
      interestMonths: 0
    });
    if (token) {
      try {
        const [historyData, suggData] = await Promise.all([
          pawnApi.getHistory(ticket.id, token),
          pawnApi.getInterestSuggestion(ticket.id, token)
        ]);
        setHistory(historyData);
        setSuggestion(suggData);
        // Default to Renew rule
        setActionForm(prev => ({ 
          ...prev, 
          interestMonths: suggData?.renewMonths || 0,
          interestPaid: (suggData?.renewInterest || 0).toString() 
        }));
      } catch (err: any) {
        console.error('Failed to fetch ticket management data:', err);
        setSnackbar({ open: true, message: 'ไม่สามารถดึงข้อมูลตั๋วได้', severity: 'error' });
      }
    }
  };

  const handleSubmit = async () => {
    if (!token) return;
    try {
      await pawnApi.createTicket({
        ...form,
        principalAmount: parseFloat(form.principalAmount),
        pawnDate: new Date().toISOString().split('T')[0]
      }, token);
      setSnackbar({ open: true, message: 'ออกตั๋วจำนำสำเร็จ', severity: 'success' });
      setOpen(false);
      fetchTickets();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  useEffect(() => {
    if (selectedTicket && suggestion) {
      const rate = parseFloat(actionForm.newInterestRate || '0') / 100;
      const principal = selectedTicket.principalAmount;
      
      const currentMonths = actionForm.interestMonths;
      const reduction = (principal >= 7000 && principal <= 9999 && rate === 0.02) ? 20.0 : 0.0;
      
      const newInterest = (principal * rate * currentMonths) - (reduction * currentMonths);
      setActionForm(prev => ({ ...prev, interestPaid: Math.max(0, newInterest).toFixed(2) }));
    }
  }, [actionForm.newInterestRate, actionForm.interestMonths, selectedTicket, suggestion]);

  // Handle tab switch to update interestMonths suggestion
  useEffect(() => {
    if (suggestion) {
      if (activeTab === 0) { // Renew
        setActionForm(prev => ({ ...prev, interestMonths: suggestion.renewMonths }));
      } else if (activeTab === 2) { // Redeem
        setActionForm(prev => ({ ...prev, interestMonths: suggestion.redeemMonths }));
      }
    }
  }, [activeTab, suggestion]);

  const handleAction = async (type: 'RENEW' | 'ADJUST_PRINCIPAL' | 'REDEEM') => {
    if (!token || !selectedTicket) return;
    try {
      const data = {
        actionType: type,
        amountPaid: parseFloat(actionForm.amountPaid || '0'),
        interestPaid: parseFloat(actionForm.interestPaid || '0'),
        principalAdjusted: parseFloat(actionForm.principalAdjusted || '0'),
        extendMonths: actionForm.extendMonths,
        newInterestRate: parseFloat(actionForm.newInterestRate || '0')
      };
      await pawnApi.performAction(selectedTicket.id, data, token);
      setSnackbar({ open: true, message: 'ทำรายการสำเร็จ', severity: 'success' });
      setManageOpen(false);
      fetchTickets();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'primary';
      case 'REDEEMED': return 'success';
      case 'EXPIRED': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>ระบบจัดการจำนำ</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpen} sx={{ borderRadius: 2 }}>
          ออกตั๋วจำนำใหม่
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField 
            fullWidth 
            size="small" 
            placeholder="ค้นหาตามชื่อลูกค้า หรือเลขที่ตั๋ว..." 
            slotProps={{ input: { startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} /> } }}
          />
        </Box>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>เลขที่ตั๋ว</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>ลูกค้า</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>สินค้า</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>เงินต้น</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>ดอกเบี้ย</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>วันครบกำหนด</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>สถานะ</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} align="center"><CircularProgress /></TableCell></TableRow>
            ) : tickets.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center">ไม่พบข้อมูล</TableCell></TableRow>
            ) : tickets.map((t) => (
              <TableRow key={t.id}>
                <TableCell>#{String(t.id).padStart(5, '0')}</TableCell>
                <TableCell>{t.customer.fullName}</TableCell>
                <TableCell>{t.product.name} ({t.product.weightText})</TableCell>
                <TableCell>฿{t.principalAmount.toLocaleString()}</TableCell>
                <TableCell>{t.interestRate}%</TableCell>
                <TableCell>{new Date(t.dueDate).toLocaleDateString('th-TH')}</TableCell>
                <TableCell>
                  <Chip label={t.status === 'ACTIVE' ? 'ใช้งาน' : t.status === 'REDEEMED' ? 'ไถ่ถอนแล้ว' : 'หมดอายุ'} 
                        color={getStatusColor(t.status)} size="small" />
                </TableCell>
                <TableCell>
                  <IconButton size="small" color="primary" onClick={() => handleManage(t)}><Info fontSize="small" /></IconButton>
                  <IconButton size="small" color="secondary"><Receipt fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* New Ticket Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>ออกตั๋วจำนำใหม่</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                select
                fullWidth
                label="เลือกสินค้าที่จำนำ"
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
              >
                {availableProducts.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name} - {p.weightText} ({p.barcode})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="ยอดเงินต้น"
                type="number"
                value={form.principalAmount}
                onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
                slotProps={{ input: { startAdornment: '฿' } }}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="อัตราดอกเบี้ย (%)"
                type="number"
                value={form.interestRate}
                onChange={(e) => setForm({ ...form, interestRate: parseFloat(e.target.value) })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="วันครบกำหนด"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!form.productId || !form.principalAmount}>
            ยืนยันออกตั๋ว
          </Button>
        </DialogActions>
      </Dialog>

      {/* Management Dialog */}
      <Dialog open={manageOpen} onClose={() => setManageOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle component="div" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>จัดการตั๋วจำนำ #{selectedTicket ? String(selectedTicket.id).padStart(5, '0') : ''}</Typography>
          <IconButton onClick={() => setManageOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Grid container>
            <Grid size={{ xs: 12, md: 4 }} sx={{ borderRight: '1px solid #eee', p: 2, bgcolor: '#fafafa' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>ข้อมูลลูกค้า</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{selectedTicket?.customer.fullName}</Typography>
              <Typography variant="body2">{selectedTicket?.customer.phone}</Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>ข้อมูลสินค้า</Typography>
              <Typography variant="body1">{selectedTicket?.product.name}</Typography>
              <Typography variant="body2" color="text.secondary">น้ำหนัก: {selectedTicket?.product.weightText}</Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>ข้อมูลการเงิน</Typography>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>฿{selectedTicket?.principalAmount.toLocaleString()}</Typography>
              <Typography variant="body2">ดอกเบี้ย: {selectedTicket?.interestRate}% ต่อเดือน</Typography>
              <Typography variant="body2" color="error">ครบกำหนด: {selectedTicket ? new Date(selectedTicket.dueDate).toLocaleDateString('th-TH') : ''}</Typography>
            </Grid>
            
            <Grid size={{ xs: 12, md: 8 }}>
              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="fullWidth">
                <Tab icon={<EventAvailable />} label="ต่อดอกเบี้ย" />
                <Tab icon={<PriceChange />} label="ปรับเงินต้น" />
                <Tab icon={<Receipt />} label="ไถ่ถอน" />
                <Tab icon={<History />} label="ประวัติ" />
              </Tabs>
              
              <Box sx={{ p: 3 }}>
                {activeTab === 0 && (
                  <Grid container spacing={2}>
                    {suggestion && (
                      <Grid size={{ xs: 12 }}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                          <Typography variant="body2"><b>ดอกเบี้ยแนะนำ:</b> ฿{(suggestion.renewInterest || 0).toLocaleString()}</Typography>
                          <Typography variant="caption">
                            (เงินต้น ฿{suggestion.principal.toLocaleString()} × {suggestion.rate}% × {suggestion.renewMonths} เดือน)
                            {suggestion.reduction > 0 && ` - ลด ${suggestion.reduction} บาท/เดือน`}
                          </Typography>
                        </Alert>
                      </Grid>
                    )}
                    <Grid size={{ xs: 4 }}>
                      <TextField 
                        fullWidth 
                        label="จำนวนเดือนที่ค้าง" 
                        type="number" 
                        value={actionForm.interestMonths}
                        onChange={(e) => setActionForm({ ...actionForm, interestMonths: parseFloat(e.target.value) })}
                        slotProps={{ input: { endAdornment: 'ด.' } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <TextField 
                        fullWidth 
                        label="อัตราดอกเบี้ย (%)" 
                        type="number" 
                        value={actionForm.newInterestRate}
                        onChange={(e) => setActionForm({ ...actionForm, newInterestRate: e.target.value })}
                        slotProps={{ input: { endAdornment: '%' } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <TextField 
                        fullWidth 
                        label="จำนวนเดือนที่ต่อ" 
                        type="number" 
                        value={actionForm.extendMonths}
                        onChange={(e) => setActionForm({ ...actionForm, extendMonths: parseInt(e.target.value) })}
                        helperText={selectedTicket ? `ขยายเป็น: ${new Date(new Date(selectedTicket.dueDate).setMonth(new Date(selectedTicket.dueDate).getMonth() + actionForm.extendMonths)).toLocaleDateString('th-TH')}` : ''}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField 
                        fullWidth 
                        label="ยอดดอกเบี้ยที่ชำระจริง" 
                        type="number" 
                        value={actionForm.interestPaid}
                        onChange={(e) => setActionForm({ ...actionForm, interestPaid: e.target.value })}
                        slotProps={{ input: { startAdornment: '฿' } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Button variant="contained" fullWidth size="large" onClick={() => handleAction('RENEW')}>
                        ยืนยันการต่อดอกเบี้ย
                      </Button>
                    </Grid>
                  </Grid>
                )}

                {activeTab === 1 && (
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <Alert severity="info" sx={{ mb: 2 }}>ค่าบวก = ลูกค้าเอาเงินมาเพิ่มเงินต้น (ร้านจ่ายเพิ่ม), ค่าลบ = ลูกค้าเอาเงินมาลดเงินต้น (โปะ)</Alert>
                      <TextField 
                        fullWidth 
                        label="ยอดเงินต้นที่ปรับปรุง (+/-)" 
                        type="number" 
                        value={actionForm.principalAdjusted}
                        onChange={(e) => setActionForm({ ...actionForm, principalAdjusted: e.target.value })}
                        slotProps={{ input: { startAdornment: '฿' } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Button variant="contained" fullWidth size="large" onClick={() => handleAction('ADJUST_PRINCIPAL')}>
                        ยืนยันการปรับเงินต้น
                      </Button>
                    </Grid>
                  </Grid>
                )}

                {activeTab === 2 && (
                  <Grid container spacing={2}>
                    {suggestion && selectedTicket && (
                      <Grid size={{ xs: 12 }}>
                        <Alert severity="warning" sx={{ mb: 2 }}>
                          <Typography variant="body2"><b>ยอดไถ่ถอนรวม:</b> ฿{( (selectedTicket?.principalAmount || 0) + parseFloat(actionForm.interestPaid || '0')).toLocaleString()}</Typography>
                          <Typography variant="caption">
                            (เงินต้น ฿{(selectedTicket?.principalAmount || 0).toLocaleString()} + ดอกเบี้ย ฿{parseFloat(actionForm.interestPaid || '0').toLocaleString()})
                          </Typography>
                        </Alert>
                      </Grid>
                    )}
                    <Grid size={{ xs: 6 }}>
                      <TextField 
                        fullWidth 
                        label="จำนวนเดือนที่ค้าง (ไถ่ถอน)" 
                        type="number" 
                        value={actionForm.interestMonths}
                        onChange={(e) => setActionForm({ ...actionForm, interestMonths: parseFloat(e.target.value) })}
                        slotProps={{ input: { endAdornment: 'ด.' } }}
                        helperText="เกณฑ์: 1-15 (0.5ด.) / 16+ (1.0ด.)"
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField 
                        fullWidth 
                        label="อัตราดอกเบี้ย (%)" 
                        type="number" 
                        value={actionForm.newInterestRate}
                        onChange={(e) => setActionForm({ ...actionForm, newInterestRate: e.target.value })}
                        slotProps={{ input: { endAdornment: '%' } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField 
                        fullWidth 
                        label="ยอดดอกเบี้ยที่ต้องชำระ" 
                        type="number" 
                        value={actionForm.interestPaid}
                        onChange={(e) => setActionForm({ ...actionForm, interestPaid: e.target.value })}
                        slotProps={{ input: { startAdornment: '฿' } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Button variant="contained" color="warning" fullWidth size="large" onClick={() => handleAction('REDEEM')}>
                        ยืนยันการไถ่ถอน
                      </Button>
                    </Grid>
                  </Grid>
                )}

                {activeTab === 3 && (
                  <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {history.map((h) => (
                      <ListItem key={h.id} divider>
                        <ListItemText 
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {h.actionType === 'CREATE' ? 'เปิดตั๋ว' : h.actionType === 'RENEW' ? 'ต่อดอกเบี้ย' : h.actionType === 'REDEEM' ? 'ไถ่ถอน' : 'ปรับเงินต้น'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(h.createdAt).toLocaleString('th-TH')}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <>
                              {h.amountPaid > 0 && <Typography variant="caption" sx={{ display: 'block' }}>ยอดจ่าย: ฿{h.amountPaid.toLocaleString()}</Typography>}
                              {h.newDueDate && <Typography variant="caption" sx={{ display: 'block' }}>วันครบกำหนดใหม่: {new Date(h.newDueDate).toLocaleDateString('th-TH')}</Typography>}
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

