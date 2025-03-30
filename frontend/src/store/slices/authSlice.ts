import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: number;
  username: string;
  email: string;
  is_superuser: boolean;
  is_active: boolean;
  avatar?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
}

// 尝试从localStorage恢复状态
const storedToken = localStorage.getItem('token');
const storedUser = localStorage.getItem('user');

const initialState: AuthState = {
  isAuthenticated: !!storedToken,
  token: storedToken,
  user: storedUser ? JSON.parse(storedUser) : null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ access_token: string; token_type: string }>
    ) => {
      state.isAuthenticated = true;
      state.token = action.payload.access_token;
      // 将token存储到localStorage
      localStorage.setItem('token', action.payload.access_token);
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      // 将用户信息存储到localStorage
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      // 清除localStorage中的信息
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
});

export const { setCredentials, setUser, logout } = authSlice.actions;
export default authSlice.reducer; 