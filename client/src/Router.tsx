import { Routes, Route } from 'react-router-dom';
import HomePage from './HomePage';
import App from './App';
import UnoApp from './UnoApp';
import ChaosApp from './ChaosApp';

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/richesse" element={<App />} />
      <Route path="/uno" element={<UnoApp />} />
      <Route path="/chaos" element={<ChaosApp />} />
    </Routes>
  );
}
