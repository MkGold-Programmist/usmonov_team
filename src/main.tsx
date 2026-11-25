import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ensureWritableFetch} from './utils/storeLogic';
import './index.css';

if (typeof window !== 'undefined') {
  ensureWritableFetch(window as unknown as Record<string, unknown>);
}

createRoot(document.getElementById('root')!).render(<App />);

