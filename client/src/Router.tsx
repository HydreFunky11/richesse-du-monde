import { Routes, Route } from 'react-router-dom';
import HomePage from './HomePage';
import App from './App';
import UnoApp from './UnoApp';
import ChaosApp from './ChaosApp';
import LoveLetterApp from './LoveLetterApp';
import DiscretosApp from './DiscretosApp';
import SkyjoApp from './SkyjoApp';
import KingOfTokyoApp from './KingOfTokyoApp';
import DungeonMayhemApp from './DungeonMayhemApp';
import ClashApp from './ClashApp';

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/richesse" element={<App />} />
      <Route path="/uno" element={<UnoApp />} />
      <Route path="/chaos" element={<ChaosApp />} />
      <Route path="/loveletter" element={<LoveLetterApp />} />
      <Route path="/discretos" element={<DiscretosApp />} />
      <Route path="/skyjo" element={<SkyjoApp />} />
      <Route path="/kingoftokyo" element={<KingOfTokyoApp />} />
      <Route path="/dungeonmayhem" element={<DungeonMayhemApp />} />
      <Route path="/mayhem" element={<DungeonMayhemApp />} />
      <Route path="/clash" element={<ClashApp />} />
    </Routes>
  );
}
