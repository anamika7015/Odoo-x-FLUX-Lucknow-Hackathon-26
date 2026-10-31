import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { App } from './App.jsx';
import { AppErrorBoundary } from './components/AppErrorBoundary.jsx';
import { store } from './store/store.js';
import './styles/index.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } } });
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><AppErrorBoundary><Provider store={store}><QueryClientProvider client={queryClient}><BrowserRouter><App /><Toaster richColors position="top-right" /></BrowserRouter></QueryClientProvider></Provider></AppErrorBoundary></React.StrictMode>);
