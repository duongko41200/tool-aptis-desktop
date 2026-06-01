import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from './store';
import App from './App';
import PopupApp from './components/popup/PopupApp';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

const isPopupWindow = window.location.pathname === '/popup';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isPopupWindow ? (
      <QueryClientProvider client={queryClient}>
        <PopupApp />
      </QueryClientProvider>
    ) : (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </Provider>
    )}
  </React.StrictMode>
);
