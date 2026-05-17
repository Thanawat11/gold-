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
  Grid,
  IconButton,
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
import { Add, DeleteOutlined, EditOutlined, ManageAccounts, Save } from '@mui/icons-material';
import { userApi } from '../api/userApi';
import { getErrorMessage } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import type { Role, User } from '../types';

const roleLabel: Record<Role, string> = {
  OWNER: 'เจ้าของร้าน',
  MANAGER: 'ผู้จัดการ',
  STAFF: 'พนักงาน',
  ACCOUNT: 'บัญชี',
  CASHIER: 'พนักงานหน้าร้าน',
};

const roleColor = (role: Role) => {
  if (role === 'OWNER') {
    return 'secondary';
  }
  if (role === 'MANAGER') {
    return 'primary';
  }
  return role === 'ACCOUNT' ? 'success' : 'default';
};

const emptyForm = {
  username: '',
  fullName: '',
  password: '',
  role: 'STAFF' as Role,
};

export const Users = () => {
  const currentUser = useAuthStore((state) => state.user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);

  const ownerCount = useMemo(() => users.filter((user) => user.role === 'OWNER').length, [users]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      setUsers(await userApi.list());
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'โหลดข้อมูลผู้ใช้งานไม่สำเร็จ'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      fullName: user.fullName,
      password: '',
      role: user.role,
    });
    setOpen(true);
  };

  const saveUser = async () => {
    if (!form.fullName.trim() || (!editingUser && !form.username.trim())) {
      setMessage({ text: 'กรุณากรอกชื่อผู้ใช้และชื่อ-นามสกุล', severity: 'error' });
      return;
    }
    if (!editingUser && form.password.length < 6) {
      setMessage({ text: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        await userApi.update(editingUser.id, {
          fullName: form.fullName.trim(),
          password: form.password || undefined,
          role: form.role,
        });
        setMessage({ text: 'แก้ไขผู้ใช้งานสำเร็จ', severity: 'success' });
      } else {
        await userApi.create({
          username: form.username.trim(),
          fullName: form.fullName.trim(),
          password: form.password,
          role: form.role,
        });
        setMessage({ text: 'สร้างผู้ใช้งานสำเร็จ', severity: 'success' });
      }
      setOpen(false);
      await loadUsers();
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'บันทึกผู้ใช้งานไม่สำเร็จ'), severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user: User) => {
    if (!window.confirm(`ยืนยันลบผู้ใช้งาน ${user.username}?`)) {
      return;
    }
    setDeletingId(user.id);
    try {
      await userApi.remove(user.id);
      setMessage({ text: 'ลบผู้ใช้งานสำเร็จ', severity: 'success' });
      await loadUsers();
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'ลบผู้ใช้งานไม่สำเร็จ'), severity: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  const isSelf = (user: User) => currentUser?.id === user.id;
  const isLastOwner = (user: User) => user.role === 'OWNER' && ownerCount <= 1;

  if (currentUser?.role !== 'OWNER') {
    return (
      <Alert severity="error">
        เฉพาะเจ้าของร้านเท่านั้นที่จัดการผู้ใช้งานได้
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>จัดการผู้ใช้งาน</Typography>
          <Typography variant="body2" color="text.secondary">เพิ่มพนักงาน กำหนดสิทธิ์ และรีเซ็ตรหัสผ่านภายในระบบ</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          เพิ่มผู้ใช้งาน
        </Button>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <ManageAccounts color="primary" />
              <Box>
                <Typography variant="body2" color="text.secondary">ผู้ใช้งานทั้งหมด</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{users.length} บัญชี</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">เจ้าของร้าน</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>{ownerCount} บัญชี</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">พนักงาน / บัญชี</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {users.filter((user) => user.role === 'STAFF' || user.role === 'CASHIER' || user.role === 'ACCOUNT').length} บัญชี
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>ชื่อ-นามสกุล</TableCell>
              <TableCell>สิทธิ์</TableCell>
              <TableCell align="right">จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            )}
            {!loading && users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography sx={{ fontWeight: 700 }}>{user.username}</Typography>
                    {isSelf(user) && <Typography variant="caption" color="text.secondary">บัญชีที่ใช้งานอยู่</Typography>}
                  </Stack>
                </TableCell>
                <TableCell>{user.fullName}</TableCell>
                <TableCell>
                  <Chip size="small" color={roleColor(user.role)} label={roleLabel[user.role]} />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                    <IconButton color="primary" onClick={() => openEdit(user)}>
                      <EditOutlined />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => void deleteUser(user)}
                      disabled={isSelf(user) || isLastOwner(user) || deletingId !== null}
                    >
                      {deletingId === user.id ? <CircularProgress size={22} /> : <DeleteOutlined />}
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!loading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">ไม่พบผู้ใช้งาน</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingUser ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งาน'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Username"
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              disabled={Boolean(editingUser)}
              helperText={editingUser ? 'ไม่สามารถแก้ username หลังสร้างบัญชี' : 'ใช้สำหรับเข้าสู่ระบบ'}
            />
            <TextField
              fullWidth
              label="ชื่อ-นามสกุล"
              value={form.fullName}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })}
            />
            <TextField
              select
              fullWidth
              label="สิทธิ์"
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
            >
              <MenuItem value="OWNER">เจ้าของร้าน</MenuItem>
              <MenuItem value="MANAGER">ผู้จัดการ</MenuItem>
              <MenuItem value="STAFF">พนักงาน</MenuItem>
              <MenuItem value="ACCOUNT">บัญชี</MenuItem>
              <MenuItem value="CASHIER">พนักงานหน้าร้านเดิม</MenuItem>
            </TextField>
            <TextField
              fullWidth
              type="password"
              label={editingUser ? 'รหัสผ่านใหม่' : 'รหัสผ่าน'}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              helperText={editingUser ? 'เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยนรหัสผ่าน' : 'อย่างน้อย 6 ตัวอักษร'}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving}>ยกเลิก</Button>
          <Button variant="contained" startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />} onClick={() => void saveUser()} disabled={saving}>
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(message)}
        autoHideDuration={4000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {message ? <Alert severity={message.severity}>{message.text}</Alert> : undefined}
      </Snackbar>
    </Stack>
  );
};
