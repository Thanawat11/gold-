import { useEffect, useState } from 'react';
import { Alert, Button, Card, CardContent, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { Download } from '@mui/icons-material';
import { systemApi } from '../api/systemApi';
import { getErrorMessage } from '../api/client';
import type { ReportSummary } from '../types';
import { useAuthStore } from '../store/useAuthStore';

const currency = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });

export const Reports = () => {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    systemApi.reportDaily()
      .then(setSummary)
      .catch((err: unknown) => setError(getErrorMessage(err, 'โหลดรายงานไม่สำเร็จ')));
  }, []);

  const exportCsv = async () => {
    setError('');
    setExporting(true);
    try {
      const response = await fetch('/api/v1/reports/daily.csv', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'daily-report.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(getErrorMessage(err, 'Export CSV ไม่สำเร็จ'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>รายงานและสถิติ</Typography>
        <Button
          variant="outlined"
          startIcon={exporting ? <CircularProgress size={18} color="inherit" /> : <Download />}
          onClick={() => void exportCsv()}
          disabled={exporting}
        >
          {exporting ? 'กำลัง Export...' : 'Export CSV'}
        </Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card><CardContent><Typography color="text.secondary">วันที่</Typography><Typography variant="h5" sx={{ fontWeight: 700 }}>{summary?.date ?? '-'}</Typography></CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card><CardContent><Typography color="text.secondary">จำนวนบิล</Typography><Typography variant="h5" sx={{ fontWeight: 700 }}>{summary?.transactionCount ?? 0}</Typography></CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card><CardContent><Typography color="text.secondary">ยอดสุทธิ</Typography><Typography variant="h5" sx={{ fontWeight: 700 }}>{currency.format(summary?.netAmount ?? 0)}</Typography></CardContent></Card>
        </Grid>
      </Grid>
    </Stack>
  );
};
