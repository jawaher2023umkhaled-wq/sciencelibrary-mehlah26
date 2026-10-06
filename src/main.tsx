import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary title="مكتبة العلوم الرقمية - مدرسة محلاح للبنات (5–12)">
    <App />
  </ErrorBoundary>
);
