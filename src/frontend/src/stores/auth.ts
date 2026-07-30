import { create } from 'zustand';
import type { ApiSuccess, RegisterInput, UserSummary } from '@coupon/shared';
import { apiClient, configureSessionHandlers, dataOf, fetchCurrentUser, publicClient, refreshAccessToken, registerAccount, setMemoryAccessToken } from '@/services/api';

interface LoginData { accessToken: string; expiresIn: number; user: UserSummary; }
interface AuthState {
  user: UserSummary | null;
  accessToken: string | null;
  status: 'idle' | 'loading' | 'authenticated' | 'anonymous';
  login: (username: string, password: string) => Promise<UserSummary>;
  register: (input: RegisterInput) => Promise<UserSummary>;
  bootstrap: () => Promise<void>;
  logout: () => Promise<void>;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, accessToken: null, status: 'idle',
  login: async (username, password) => {
    set({ status: 'loading' });
    try {
      const result = dataOf(await publicClient.post<ApiSuccess<LoginData>>('/auth/login', { username, password }, { skipAuthRefresh: true } as never));
      setMemoryAccessToken(result.accessToken);
      set({ user: result.user, accessToken: result.accessToken, status: 'authenticated' });
      return result.user;
    } catch (error) { set({ user: null, accessToken: null, status: 'anonymous' }); throw error; }
  },
  register: async (input) => {
    set({ status: 'loading' });
    try {
      const result = await registerAccount(input);
      setMemoryAccessToken(result.accessToken);
      set({ user: result.user, accessToken: result.accessToken, status: 'authenticated' });
      return result.user;
    } catch (error) { set({ user: null, accessToken: null, status: 'anonymous' }); throw error; }
  },
  bootstrap: async () => {
    if (useAuthStore.getState().status !== 'idle') return;
    set({ status: 'loading' });
    try {
      const token = await refreshAccessToken();
      const user = await fetchCurrentUser();
      set({ user, accessToken: token, status: 'authenticated' });
    } catch { setMemoryAccessToken(null); set({ user: null, accessToken: null, status: 'anonymous' }); }
  },
  logout: async () => {
    try { await apiClient.post('/auth/logout'); } finally { setMemoryAccessToken(null); set({ user: null, accessToken: null, status: 'anonymous' }); }
  },
  clear: () => { setMemoryAccessToken(null); set({ user: null, accessToken: null, status: 'anonymous' }); }
}));

configureSessionHandlers({
  onExpired: () => useAuthStore.setState({ user: null, accessToken: null, status: 'anonymous' }),
  onTokenChanged: (accessToken) => useAuthStore.setState({ accessToken })
});
