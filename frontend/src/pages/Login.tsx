import { useState } from 'react';
import { 
  Box, Card, CardContent, Typography, TextField, 
  Button, InputAdornment, IconButton, CircularProgress, Alert
} from '@mui/material';
import { Visibility, VisibilityOff, LockOutlined, PersonOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';
import { getErrorMessage } from '../api/client';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(username, password);
      setAuth(response.token, {
        id: response.id,
        username: response.username,
        fullName: response.fullName,
        role: response.role
      });
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err, 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #b71c1c 0%, #4a0000 100%)',
        padding: 2
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card sx={{ 
          maxWidth: 400, 
          width: '100%', 
          borderRadius: 1,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)'
        }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box 
                sx={{ 
                  width: 60, 
                  height: 60, 
                  bgcolor: 'primary.main', 
                  borderRadius: 1,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto',
                  mb: 2,
                  boxShadow: '0 4px 12px rgba(183, 28, 28, 0.4)'
                }}
              >
                <LockOutlined sx={{ color: 'white', fontSize: 30 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }} color="primary.main">
                ห้างทองเอกฮั่วเฮง
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                เข้าสู่ระบบบริหารจัดการร้านทอง
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="ชื่อผู้ใช้งาน"
                variant="outlined"
                margin="normal"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlined color="action" />
                      </InputAdornment>
                    ),
                  }
                }}
              />
              
              <TextField
                fullWidth
                label="รหัสผ่าน"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                margin="normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          disabled={loading}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ 
                  mt: 4, 
                  mb: 2,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, #b71c1c 30%, #d4af37 90%)',
                  boxShadow: '0 3px 5px 2px rgba(183, 28, 28, .3)',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                {loading ? <CircularProgress size={28} color="inherit" /> : 'เข้าสู่ระบบ'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
}
