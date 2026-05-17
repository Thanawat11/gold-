import { useEffect, useMemo, useState } from 'react';
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
  Grid,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip as MuiTooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  AccountBalance,
  Assessment,
  Block,
  Download,
  InfoOutlined,
  Inventory2,
  Paid,
  Percent,
  PictureAsPdf,
  PointOfSale,
  ReceiptLong,
  Scale,
  Storefront,
  TableChart,
} from '@mui/icons-material';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import { systemApi } from '../api/systemApi';
import { posApi } from '../api/posApi';
import { getErrorMessage } from '../api/client';
import type { OwnerReportResponse, ReportPeriod } from '../types';
import { useAuthStore } from '../store/useAuthStore';

const currency = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });
const number = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 });

const reportPeriods: Array<{ value: ReportPeriod; label: string }> = [
  { value: 'DAILY', label: 'รายวัน' },
  { value: 'MONTHLY', label: 'รายเดือน' },
  { value: 'YEARLY', label: 'รายปี' },
];

const statusLabels: Record<string, string> = {
  AVAILABLE: 'พร้อมขาย',
  SOLD: 'ขายแล้ว',
  PAWNED: 'จำนำ',
  EXPIRED_PAWN: 'หลุดจำนำ',
  REPAIR: 'ส่งซ่อม',
  MELTED: 'หลอม',
  RETURNED_TO_ARTISAN: 'ส่งคืนช่าง',
};

const transactionStatusLabels: Record<string, string> = {
  ACTIVE: 'ใช้งาน',
  VOIDED: 'ยกเลิก',
};

const transactionTypeLabels: Record<string, string> = {
  SELL: 'ขาย',
  BUY: 'รับซื้อทองเก่า',
  TRADE_IN: 'เปลี่ยนลาย',
};

const toInputDate = (date: Date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const today = toInputDate(new Date());
const yearStart = `${today.slice(0, 4)}-01-01`;

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('th-TH') : '-');
const formatDateTime = (value?: string | null) => (
  value ? new Date(value).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'
);

export const Reports = () => {
  const theme = useTheme();
  const token = useAuthStore((state) => state.token);
  const [report, setReport] = useState<OwnerReportResponse | null>(null);
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(today);
  const [period, setPeriod] = useState<ReportPeriod>('MONTHLY');
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const loadReport = async () => {
    setError('');
    setLoading(true);
    try {
      setReport(await systemApi.ownerReport({ from, to, period }));
    } catch (err) {
      setError(getErrorMessage(err, 'โหลดรายงานไม่สำเร็จ'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, [from, to, period]);

  const exportCsv = async () => {
    setError('');
    setExporting(true);
    try {
      const searchParams = new URLSearchParams({ from, to, period });
      const response = await fetch(`/api/v1/reports/owner.csv?${searchParams.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `owner-report-${from}-${to}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(getErrorMessage(err, 'Export CSV ไม่สำเร็จ'));
    } finally {
      setExporting(false);
    }
  };

  const exportExcel = async () => {
    setError('');
    setExportingExcel(true);
    try {
      const searchParams = new URLSearchParams({ from, to, period });
      const response = await fetch(`/api/v1/reports/owner.xls?${searchParams.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `owner-report-${from}-${to}.xls`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(getErrorMessage(err, 'Export Excel ไม่สำเร็จ'));
    } finally {
      setExportingExcel(false);
    }
  };

  const exportPdf = () => {
    window.print();
  };

  const cancelTransaction = async (id: number, receiptNumber: string) => {
    const reason = window.prompt(`เหตุผลที่ยกเลิกบิล ${receiptNumber}`);
    if (!reason?.trim()) {
      return;
    }
    setCancelingId(id);
    setError('');
    try {
      await posApi.cancelTransaction(id, reason.trim());
      await loadReport();
    } catch (err) {
      setError(getErrorMessage(err, 'ยกเลิกบิลไม่สำเร็จ'));
    } finally {
      setCancelingId(null);
    }
  };

  const summaryCards = useMemo(() => {
    const totals = report?.totals;
    return [
      { label: 'รายได้รวม', value: currency.format(totals?.revenueAmount ?? 0), icon: <Assessment />, color: '#7c2d12', formula: 'ยอดขายรวม + ดอกเบี้ยรับ ในช่วงวันที่เลือก' },
      ...(report?.canViewProfit ? [{ label: 'กำไรสุทธิโดยประมาณ', value: currency.format(totals?.estimatedNetProfit ?? 0), icon: <Paid />, color: '#166534', formula: 'กำไรจากการขาย + ดอกเบี้ยรับ ยังไม่หักค่าใช้จ่ายร้าน เช่น ค่าแรง ค่าเช่า ค่าไฟ' }] : []),
      { label: 'ยอดขาย', value: currency.format(totals?.salesAmount ?? 0), icon: <PointOfSale />, color: theme.palette.primary.main, formula: 'รวมราคาขายของรายการ SELL จากบิลที่ยังไม่ถูกยกเลิก' },
      ...(report?.canViewProfit ? [{ label: 'กำไรจากการขาย', value: currency.format(totals?.salesProfit ?? 0), icon: <Paid />, color: theme.palette.secondary.dark, formula: 'ผลรวมของ ราคาขายสินค้า - ต้นทุนสินค้า เฉพาะสินค้าที่มี costAmount' }] : []),
      { label: 'เงินสดเข้า', value: currency.format(totals?.cashInAmount ?? 0), icon: <Paid />, color: '#15803d', formula: 'รวมยอดชำระด้วยเงินสดจากบิลขาย/เปลี่ยนลายที่เป็นเงินสดเข้า' },
      { label: 'เงินสดออก', value: currency.format(totals?.cashOutAmount ?? 0), icon: <Scale />, color: '#b91c1c', formula: 'รวมยอดเงินสดที่ร้านจ่ายออก เช่น รับซื้อทองเก่าด้วยเงินสด' },
      { label: 'เงินสดสุทธิ', value: currency.format(totals?.netCashAmount ?? 0), icon: <AccountBalance />, color: '#0369a1', formula: 'เงินสดเข้า - เงินสดออก' },
      { label: 'รับซื้อทองเก่า', value: currency.format(totals?.buyOldGoldAmount ?? 0), icon: <Scale />, color: '#8a4b00', formula: 'รวมราคาของรายการ BUY จากบิลที่ยังไม่ถูกยกเลิก' },
      { label: 'จำนำคงค้าง', value: currency.format(totals?.activePawnPrincipal ?? 0), icon: <AccountBalance />, color: '#6a1b9a', formula: 'ผลรวมเงินต้นของตั๋วจำนำที่สถานะ ACTIVE ทั้งหมด' },
      { label: 'ดอกเบี้ยรับ', value: currency.format(totals?.interestIncome ?? 0), icon: <Percent />, color: '#0f766e', formula: 'รวม interestPaid จากประวัติการต่อดอก/ไถ่ถอนในช่วงวันที่เลือก' },
      { label: 'ทองหลุดจำนำ', value: `${number.format(totals?.expiredPawnCount ?? 0)} ตั๋ว`, icon: <ReceiptLong />, color: '#c2410c', formula: 'นับรายการประวัติจำนำที่ actionType = EXPIRE ในช่วงวันที่เลือก' },
      {
        label: 'ทองพร้อมขาย',
        value: `${number.format(totals?.availableStockGoldBaht ?? 0)} บาททอง`,
        helper: `${number.format(totals?.availableStockWeightGram ?? 0)} กรัม / ${number.format(totals?.availableStockCount ?? 0)} ชิ้น`,
        icon: <Inventory2 />,
        color: '#334155',
        formula: 'น้ำหนักทองสถานะ AVAILABLE รวม ÷ กรัมต่อบาททองจากตั้งค่าระบบ',
      },
      { label: 'ภาษีขายโดยประมาณ', value: currency.format(totals?.vatAmount ?? 0), icon: <Assessment />, color: '#be123c', formula: 'ยอดขายรวม x 7 ÷ 107 เพราะคิด VAT แบบรวมในราคา' },
    ];
  }, [report, theme.palette.primary.main, theme.palette.secondary.dark]);

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { lg: 'center' } }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>รายงานและสถิติ</Typography>
          <Typography variant="body2" color="text.secondary">
            รวมรายงานยอดขาย กำไร รับซื้อทอง จำนำ สต๊อก ภาษี และพนักงานขาย
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2}>
          <TextField size="small" type="date" label="ตั้งแต่" value={from} onChange={(event) => setFrom(event.target.value)} />
          <TextField size="small" type="date" label="ถึง" value={to} onChange={(event) => setTo(event.target.value)} />
          <TextField
            select
            size="small"
            label="รูปแบบรายงาน"
            value={period}
            onChange={(event) => setPeriod(event.target.value as ReportPeriod)}
            sx={{ minWidth: 140 }}
          >
            {reportPeriods.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
          <Button
            variant="outlined"
            startIcon={exporting ? <CircularProgress size={18} color="inherit" /> : <Download />}
            onClick={() => void exportCsv()}
            disabled={exporting || !report?.canExport}
          >
            {exporting ? 'กำลัง Export...' : 'Export CSV'}
          </Button>
          <Button
            variant="outlined"
            startIcon={exportingExcel ? <CircularProgress size={18} color="inherit" /> : <TableChart />}
            onClick={() => void exportExcel()}
            disabled={exportingExcel || !report?.canExport}
          >
            {exportingExcel ? 'กำลัง Export...' : 'Excel'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<PictureAsPdf />}
            onClick={exportPdf}
            disabled={!report?.canExport}
          >
            PDF
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {report && !report.canExport && <Alert severity="info">บทบาทนี้ดูรายงานได้ แต่ Export เอกสารทำได้เฉพาะ Owner และ Account</Alert>}

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Chip label={`${formatDate(report?.fromDate)} - ${formatDate(report?.toDate)}`} color="primary" variant="outlined" />
        <Chip label={reportPeriods.find((item) => item.value === report?.period)?.label ?? 'รายวัน'} color="secondary" />
        {loading && <Chip icon={<CircularProgress size={14} />} label="กำลังโหลดรายงาน" />}
      </Stack>

      <Grid container spacing={2}>
        {summaryCards.map((card, index) => (
          <Grid key={card.label} size={{ xs: 12, sm: 6, lg: 3 }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
              <Card
                sx={{
                  height: '100%',
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                  background: `linear-gradient(135deg, ${card.color}16, #fff 58%)`,
                }}
              >
                <CardContent>
                  <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                        <MuiTooltip title={card.formula} arrow>
                          <InfoOutlined fontSize="inherit" sx={{ color: 'text.secondary', cursor: 'help' }} />
                        </MuiTooltip>
                      </Stack>
                      <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5 }}>{card.value}</Typography>
                      {'helper' in card && <Typography variant="caption" color="text.secondary">{card.helper}</Typography>}
                    </Box>
                    <Box sx={{ color: card.color, display: 'grid', placeItems: 'center' }}>{card.icon}</Box>
                  </Stack>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <SectionTitle
            title="รายได้และกำไรสุทธิตามเดือน"
            subtitle="รายได้ = ยอดขาย + ดอกเบี้ยรับ, กำไรสุทธิโดยประมาณ = กำไรจากขาย + ดอกเบี้ยรับ ยังไม่รวมค่าใช้จ่ายร้าน"
          />
          <ReportTable
            headers={['เดือน/ช่วง', 'รายได้', 'กำไรสุทธิโดยประมาณ', 'ยอดขาย', 'ดอกเบี้ยรับ', 'เงินสดสุทธิ', 'จำนวนบิล']}
            empty={!report?.periodRows.length}
          >
            {report?.periodRows.map((row) => (
              <TableRow key={row.periodKey}>
                <TableCell sx={{ fontWeight: 800 }}>{row.periodKey}</TableCell>
                <TableCell align="right">{currency.format(row.revenueAmount)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 900, color: report.canViewProfit ? 'success.main' : 'text.secondary' }}>
                  {report.canViewProfit ? currency.format(row.estimatedNetProfit) : '-'}
                </TableCell>
                <TableCell align="right">{currency.format(row.salesAmount)}</TableCell>
                <TableCell align="right">{currency.format(row.interestIncome)}</TableCell>
                <TableCell align="right">{currency.format(row.cashInAmount - row.cashOutAmount)}</TableCell>
                <TableCell align="right">{number.format(row.transactionCount)}</TableCell>
              </TableRow>
            ))}
          </ReportTable>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>แนวโน้มตามช่วงรายงาน</Typography>
          <Box sx={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={report?.periodRows ?? []}>
                <defs>
                  <linearGradient id="salesReportGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.42} />
                    <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitReportGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.palette.secondary.main} stopOpacity={0.55} />
                    <stop offset="95%" stopColor={theme.palette.secondary.main} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="periodKey" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => number.format(Number(value))} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value, name) => [currency.format(Number(value)), String(name)]} />
                <Legend />
                <Area dataKey="revenueAmount" name="รายได้" type="monotone" stroke="#7c2d12" fill="transparent" strokeWidth={3} />
                {report?.canViewProfit && <Area dataKey="estimatedNetProfit" name="กำไรสุทธิโดยประมาณ" type="monotone" stroke="#166534" fill="transparent" strokeWidth={3} />}
                <Area dataKey="salesAmount" name="ยอดขาย" type="monotone" stroke={theme.palette.primary.main} fill="url(#salesReportGradient)" strokeWidth={3} />
                {report?.canViewProfit && <Area dataKey="salesProfit" name="กำไร" type="monotone" stroke={theme.palette.secondary.main} fill="url(#profitReportGradient)" strokeWidth={3} />}
                <Area dataKey="cashInAmount" name="เงินสดเข้า" type="monotone" stroke="#15803d" fill="transparent" strokeWidth={2} />
                <Area dataKey="cashOutAmount" name="เงินสดออก" type="monotone" stroke="#b91c1c" fill="transparent" strokeWidth={2} />
                <Area dataKey="buyOldGoldAmount" name="รับซื้อทองเก่า" type="monotone" stroke="#8a4b00" fill="transparent" strokeWidth={2} />
                <Area dataKey="interestIncome" name="ดอกเบี้ยรับ" type="monotone" stroke="#0f766e" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ pb: 0 }}>
          <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} variant="scrollable" scrollButtons="auto">
            <Tab label="ขาย / ภาษี" />
            <Tab label="จำนำ" />
            <Tab label="สต๊อกทอง" />
            <Tab label="พนักงานขาย" />
            <Tab label="ธุรกรรมย้อนหลัง" />
          </Tabs>
        </CardContent>
        <Divider />
        <CardContent>
          {activeTab === 0 && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, lg: 7 }}>
                {report?.canViewProfit ? (
                  <>
                    <SectionTitle title="กำไรจากการขาย" subtitle={`รายการที่ไม่มีต้นทุน: ${number.format(report?.totals.unknownCostItemCount ?? 0)} รายการ`} />
                    <ReportTable
                      headers={['วันที่', 'ใบเสร็จ', 'สินค้า', 'ยอดขาย', 'ต้นทุน', 'กำไร', 'พนักงาน']}
                      empty={!report?.profitRows.length}
                    >
                      {report?.profitRows.slice(0, 12).map((row) => (
                        <TableRow key={`${row.receiptNumber}-${row.productName}-${row.transactionDate}`}>
                          <TableCell>{formatDateTime(row.transactionDate)}</TableCell>
                          <TableCell>{row.receiptNumber}</TableCell>
                          <TableCell>{row.productName}<Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{row.category}</Typography></TableCell>
                          <TableCell align="right">{currency.format(row.saleAmount)}</TableCell>
                          <TableCell align="right">{row.costKnown ? currency.format(row.costAmount) : '-'}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>{row.costKnown ? currency.format(row.profitAmount) : '-'}</TableCell>
                          <TableCell>{row.sellerName}</TableCell>
                        </TableRow>
                      ))}
                    </ReportTable>
                  </>
                ) : (
                  <Alert severity="info">ข้อมูลต้นทุนและกำไรแสดงเฉพาะ Owner</Alert>
                )}
              </Grid>
              <Grid size={{ xs: 12, lg: 5 }}>
                <SectionTitle title="รับซื้อทองเก่า" subtitle={`${number.format(report?.oldGoldPurchaseRows.length ?? 0)} รายการ`} />
                <ReportTable headers={['วันที่', 'ใบเสร็จ', 'รายละเอียด', 'ยอดรับซื้อ', 'พนักงาน']} empty={!report?.oldGoldPurchaseRows.length}>
                  {report?.oldGoldPurchaseRows.slice(0, 12).map((row) => (
                    <TableRow key={`${row.receiptNumber}-${row.transactionDate}`}>
                      <TableCell>{formatDateTime(row.transactionDate)}</TableCell>
                      <TableCell>{row.receiptNumber}</TableCell>
                      <TableCell>{row.description}{row.weightGram ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{number.format(row.weightGram)} กรัม</Typography> : null}</TableCell>
                      <TableCell align="right">{currency.format(row.amount)}</TableCell>
                      <TableCell>{row.cashierName}</TableCell>
                    </TableRow>
                  ))}
                </ReportTable>
              </Grid>
              <Grid size={12}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, bgcolor: 'rgba(183,28,28,0.04)' }}>
                  <SectionTitle title="เงินสดและรายงานภาษี" subtitle={`คำนวณ VAT ${number.format(report?.tax.vatRate ?? 7)}% แบบรวมในยอดขาย`} />
                  <Grid container spacing={2}>
                    <TaxMetric label="เงินสดเข้า" value={currency.format(report?.totals.cashInAmount ?? 0)} formula="รวมยอดชำระด้วยเงินสดจากบิลขาย/เปลี่ยนลายที่เป็นเงินสดเข้า" />
                    <TaxMetric label="เงินสดออก" value={currency.format(report?.totals.cashOutAmount ?? 0)} formula="รวมยอดเงินสดที่ร้านจ่ายออก เช่น รับซื้อทองเก่าด้วยเงินสด" />
                    <TaxMetric label="เงินสดสุทธิ" value={currency.format(report?.totals.netCashAmount ?? 0)} formula="เงินสดเข้า - เงินสดออก" />
                    <TaxMetric label="ยอดขายรวม" value={currency.format(report?.tax.salesAmount ?? 0)} formula="รวมราคาขายของรายการ SELL จากบิลที่ยังไม่ถูกยกเลิก" />
                    <TaxMetric label="ฐานภาษี" value={currency.format(report?.tax.taxBaseAmount ?? 0)} formula="ยอดขายรวม - VAT โดยประมาณ" />
                    <TaxMetric label="VAT โดยประมาณ" value={currency.format(report?.tax.vatAmount ?? 0)} formula="ยอดขายรวม x 7 ÷ 107 เพราะคิด VAT แบบรวมในราคา" />
                  </Grid>
                </Box>
              </Grid>
            </Grid>
          )}

          {activeTab === 1 && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, lg: 7 }}>
                <SectionTitle title="จำนำคงค้าง" subtitle={`${number.format(report?.pawn.activeTicketCount ?? 0)} ตั๋ว / เงินต้น ${currency.format(report?.pawn.activePrincipalAmount ?? 0)}`} />
                <ReportTable headers={['ครบกำหนด', 'เลขตั๋ว', 'ลูกค้า', 'สินค้า', 'เงินต้น', 'ดอก/เดือน']} empty={!report?.pawn.outstandingTickets.length}>
                  {report?.pawn.outstandingTickets.slice(0, 15).map((row) => (
                    <TableRow key={row.ticketNumber}>
                      <TableCell>
                        {formatDate(row.dueDate)}
                        <Typography variant="caption" color={row.daysUntilDue < 0 ? 'error.main' : 'text.secondary'} sx={{ display: 'block' }}>
                          {row.daysUntilDue < 0 ? `เกิน ${Math.abs(row.daysUntilDue)} วัน` : `เหลือ ${row.daysUntilDue} วัน`}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.ticketNumber}</TableCell>
                      <TableCell>{row.customerName}</TableCell>
                      <TableCell>{row.productName}<Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{number.format(row.weightGram)} กรัม</Typography></TableCell>
                      <TableCell align="right">{currency.format(row.principalAmount)}</TableCell>
                      <TableCell align="right">{number.format(row.interestRate)}%</TableCell>
                    </TableRow>
                  ))}
                </ReportTable>
              </Grid>
              <Grid size={{ xs: 12, lg: 5 }}>
                <SectionTitle title="ทองหลุดจำนำ" subtitle={`ดอกเบี้ยรับช่วงนี้ ${currency.format(report?.pawn.interestIncome ?? 0)}`} />
                <ReportTable headers={['วันที่หลุด', 'เลขตั๋ว', 'ลูกค้า', 'สินค้า', 'เงินต้น']} empty={!report?.pawn.expiredTickets.length}>
                  {report?.pawn.expiredTickets.slice(0, 15).map((row) => (
                    <TableRow key={`${row.ticketNumber}-${row.expiredAt}`}>
                      <TableCell>{formatDateTime(row.expiredAt)}</TableCell>
                      <TableCell>{row.ticketNumber}</TableCell>
                      <TableCell>{row.customerName}</TableCell>
                      <TableCell>{row.productName}</TableCell>
                      <TableCell align="right">{currency.format(row.principalAmount)}</TableCell>
                    </TableRow>
                  ))}
                </ReportTable>
              </Grid>
            </Grid>
          )}

          {activeTab === 2 && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, lg: 4 }}>
                <SectionTitle title="สต๊อกตามสถานะ" subtitle={`รวม ${number.format(report?.inventory.totalProductCount ?? 0)} ชิ้น / ${number.format(report?.inventory.availableGoldBaht ?? 0)} บาททองพร้อมขาย`} />
                <ReportTable headers={['สถานะ', 'จำนวน', 'น้ำหนัก', 'ต้นทุน']} empty={!report?.inventory.byStatus.length}>
                  {report?.inventory.byStatus.map((row) => (
                    <TableRow key={row.status}>
                      <TableCell>{statusLabels[row.status] ?? row.status}</TableCell>
                      <TableCell align="right">{number.format(row.count)}</TableCell>
                      <TableCell align="right">{number.format(row.weightGram)} กรัม</TableCell>
                      <TableCell align="right">{report?.canViewProfit ? currency.format(row.costAmount) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </ReportTable>
              </Grid>
              <Grid size={{ xs: 12, lg: 4 }}>
                <SectionTitle title="สต๊อกตามประเภท" subtitle="แยกแหวน สร้อย กำไล ต่างหู จี้ และหมวดอื่น" />
                <ReportTable headers={['ประเภท', 'จำนวน', 'น้ำหนัก', 'ต้นทุน']} empty={!report?.inventory.byCategory.length}>
                  {report?.inventory.byCategory.map((row) => (
                    <TableRow key={row.category}>
                      <TableCell>{row.category}</TableCell>
                      <TableCell align="right">{number.format(row.count)}</TableCell>
                      <TableCell align="right">{number.format(row.weightGram)} กรัม</TableCell>
                      <TableCell align="right">{report?.canViewProfit ? currency.format(row.costAmount) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </ReportTable>
              </Grid>
              <Grid size={{ xs: 12, lg: 4 }}>
                <SectionTitle title="ทองแยกตามน้ำหนัก" subtitle="ใช้ weightText หรือคำนวณจากกรัมต่อบาททองในตั้งค่า" />
                <ReportTable headers={['น้ำหนัก', 'จำนวน', 'น้ำหนักรวม', 'ต้นทุน']} empty={!report?.inventory.byWeight.length}>
                  {report?.inventory.byWeight.map((row) => (
                    <TableRow key={row.weightLabel}>
                      <TableCell>{row.weightLabel}</TableCell>
                      <TableCell align="right">{number.format(row.count)}</TableCell>
                      <TableCell align="right">{number.format(row.weightGram)} กรัม</TableCell>
                      <TableCell align="right">{report?.canViewProfit ? currency.format(row.costAmount) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </ReportTable>
              </Grid>
            </Grid>
          )}

          {activeTab === 3 && (
            <>
              <SectionTitle title="พนักงานขาย" subtitle={report?.canViewProfit ? 'รวมยอดขาย รับซื้อทองเก่า และกำไรที่คำนวณจากต้นทุนสินค้า' : 'รวมยอดขายและรับซื้อทองเก่า กำไรแสดงเฉพาะ Owner'} />
              <ReportTable headers={['พนักงาน', 'จำนวนบิล', 'ยอดขาย', 'รับซื้อทองเก่า', 'กำไร', 'รายการไม่มีต้นทุน']} empty={!report?.employeeSalesRows.length}>
                {report?.employeeSalesRows.map((row) => (
                  <TableRow key={row.username}>
                    <TableCell>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Storefront fontSize="small" color="primary" />
                        <Box>
                          <Typography sx={{ fontWeight: 800 }}>{row.fullName}</Typography>
                          <Typography variant="caption" color="text.secondary">{row.username}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{number.format(row.transactionCount)}</TableCell>
                    <TableCell align="right">{currency.format(row.salesAmount)}</TableCell>
                    <TableCell align="right">{currency.format(row.buyOldGoldAmount)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>{report?.canViewProfit ? currency.format(row.salesProfit) : '-'}</TableCell>
                    <TableCell align="right">{report?.canViewProfit ? number.format(row.unknownCostItemCount) : '-'}</TableCell>
                  </TableRow>
                ))}
              </ReportTable>
            </>
          )}

          {activeTab === 4 && (
            <>
              <SectionTitle title="ตรวจสอบธุรกรรมย้อนหลัง" subtitle="แสดงทุกบิลในช่วงที่เลือก รวมบิลที่ถูกยกเลิกและเหตุผลการยกเลิก" />
              <ReportTable headers={['วันที่', 'ใบเสร็จ', 'ประเภท', 'สถานะ', 'ลูกค้า', 'พนักงาน', 'ยอดสุทธิ', 'เงินสดเข้า', 'เงินสดออก', 'เหตุผล/จัดการ']} empty={!report?.transactionRows.length}>
                {report?.transactionRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{formatDateTime(row.transactionDate)}</TableCell>
                    <TableCell>{row.receiptNumber}</TableCell>
                    <TableCell>{transactionTypeLabels[row.transactionType] ?? row.transactionType}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={row.status === 'VOIDED' ? 'error' : 'success'}
                        variant={row.status === 'VOIDED' ? 'outlined' : 'filled'}
                        label={transactionStatusLabels[row.status] ?? row.status}
                      />
                    </TableCell>
                    <TableCell>{row.customerName}</TableCell>
                    <TableCell>{row.cashierName}</TableCell>
                    <TableCell align="right">{currency.format(row.netAmount)}</TableCell>
                    <TableCell align="right">{currency.format(row.cashInAmount)}</TableCell>
                    <TableCell align="right">{currency.format(row.cashOutAmount)}</TableCell>
                    <TableCell>
                      {row.status === 'VOIDED' ? (
                        <Typography variant="caption" color="text.secondary">
                          {row.cancelReason || '-'} {row.canceledAt ? `(${formatDateTime(row.canceledAt)})` : ''}
                        </Typography>
                      ) : (
                        <Button
                          color="error"
                          size="small"
                          variant="outlined"
                          startIcon={cancelingId === row.id ? <CircularProgress size={14} color="inherit" /> : <Block />}
                          onClick={() => void cancelTransaction(row.id, row.receiptNumber)}
                          disabled={!report?.canCancelTransactions || cancelingId !== null}
                        >
                          ยกเลิก
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </ReportTable>
            </>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
};

const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography variant="h6" sx={{ fontWeight: 800 }}>{title}</Typography>
    {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
  </Box>
);

const TaxMetric = ({ label, value, formula }: { label: string; value: string; formula?: string }) => (
  <Grid size={{ xs: 12, md: 4 }}>
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        {formula && (
          <MuiTooltip title={formula} arrow>
            <InfoOutlined fontSize="inherit" sx={{ color: 'text.secondary', cursor: 'help' }} />
          </MuiTooltip>
        )}
      </Stack>
      <Typography variant="h6" sx={{ fontWeight: 900 }}>{value}</Typography>
    </Box>
  </Grid>
);

interface ReportTableProps {
  headers: string[];
  empty: boolean;
  children: ReactNode;
}

const ReportTable = ({ headers, empty, children }: ReportTableProps) => (
  <Box sx={{ overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
    <Table size="small" stickyHeader>
      <TableHead>
        <TableRow>
          {headers.map((header) => (
            <TableCell key={header} sx={{ fontWeight: 800, bgcolor: 'background.default', whiteSpace: 'nowrap' }}>{header}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {empty ? (
          <TableRow>
            <TableCell colSpan={headers.length}>
              <Alert severity="info" sx={{ my: 1 }}>ยังไม่มีข้อมูลในช่วงที่เลือก</Alert>
            </TableCell>
          </TableRow>
        ) : children}
      </TableBody>
    </Table>
  </Box>
);
