import { useEffect, useState } from 'react';
import { Alert, Card, CardContent, Chip, Grid, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { systemApi } from '../api/systemApi';
import { getErrorMessage } from '../api/client';
import type { AuditLog, SystemSettings } from '../types';

export const Settings = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([systemApi.settings(), systemApi.auditLogs()])
      .then(([settingsData, logData]) => {
        setSettings(settingsData);
        setLogs(logData);
      })
      .catch((err: unknown) => setError(getErrorMessage(err, 'โหลดตั้งค่าระบบไม่สำเร็จ')));
  }, []);

  const rules = [
    ['กรัมต่อบาททองคำ', settings?.gramsPerBaht],
    ['หักค่าสึกหรอทองรูปพรรณ', `${settings?.wearDeductionPercent ?? 0}%`],
    ['อายุตั๋วเริ่มต้น', `${settings?.pawnDefaultTermMonths ?? 0} เดือน`],
    ['เพดานลดค่ากำเหน็จ Cashier', settings?.cashierMaxMakingFeeDiscount],
    ['เพดานลดค่ากำเหน็จ Manager', settings?.managerMaxMakingFeeDiscount],
  ];

  return (
    <Stack spacing={2}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>ตั้งค่าระบบ</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Grid container spacing={2}>
        {rules.map(([label, value]) => (
          <Grid key={String(label)} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Card><CardContent><Typography color="text.secondary">{label}</Typography><Typography variant="h6" sx={{ fontWeight: 700 }}>{value ?? '-'}</Typography></CardContent></Card>
          </Grid>
        ))}
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Google Sheets</Typography>
              <Chip color={settings?.googleSheetsEnabled ? 'success' : 'default'} label={settings?.googleSheetsEnabled ? 'เชื่อมต่อแล้ว' : 'ยังไม่เปิดใช้งาน'} />
            </CardContent>
          </Card>
        </Grid>
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
