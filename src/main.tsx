// main.tsx
//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.scss'
import App from './App'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider as JotaiProvider } from 'jotai';
import { AuthProvider } from './Auth/AuthContext';
import { ThemeProvider } from './Menu/ThemeContext';
import ToastContainer from './Toast/ToastContainer';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  //  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <JotaiProvider>
        <AuthProvider>
            <ThemeProvider>
              <App />
              </ThemeProvider>
          <ToastContainer />
        </AuthProvider>
      </JotaiProvider>
    </QueryClientProvider>
  //  </StrictMode>,
)
