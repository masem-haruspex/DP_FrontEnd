//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider as JotaiProvider } from 'jotai';
import { AuthProvider } from './Auth/AuthContext';
import ToastContainer from './Toast/ToastContainer';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  //  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <JotaiProvider>
        <AuthProvider>
          <App />
          <ToastContainer />
        </AuthProvider>
      </JotaiProvider>
    </QueryClientProvider>
  //  </StrictMode>,
)
