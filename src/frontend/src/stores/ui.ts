import { create } from 'zustand';

type ThemeMode = 'light' | 'dark';
const initialTheme = (): ThemeMode => localStorage.getItem('coupon-theme') === 'dark' ? 'dark' : 'light';
interface UiState { theme: ThemeMode; collapsed: boolean; toggleTheme: () => void; setCollapsed: (value: boolean) => void; }
export const useUiStore = create<UiState>((set, get) => ({
  theme: initialTheme(), collapsed: false,
  toggleTheme: () => { const theme = get().theme === 'light' ? 'dark' : 'light'; localStorage.setItem('coupon-theme', theme); document.documentElement.classList.toggle('dark', theme === 'dark'); set({ theme }); },
  setCollapsed: (collapsed) => set({ collapsed })
}));
