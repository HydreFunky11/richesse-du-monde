import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import AlchemyApp from './AlchemyApp';
import SumoApp from './SumoApp';
import RtsApp from './RtsApp';
import MobaApp from './MobaApp';
import SurvivorApp from './survivor/SurvivorApp';
import PixelGunApp from './pixelgun/PixelGunApp';
import NoteApp from './note/NoteApp';
import PropHuntApp from './prophunt/PropHuntApp';
import { HellGambleApp } from './hellgamble/HellGambleApp';
import RacingApp from './racing/RacingApp';

function ReloadRedirectHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const navEntries = performance.getEntriesByType('navigation');
      const isReload =
        navEntries.length > 0
          ? (navEntries[0] as PerformanceNavigationTiming).type === 'reload'
          : (window.performance as any)?.navigation?.type === 1;

      if (isReload && window.location.pathname !== '/') {
        navigate('/', { replace: true });
      }
    } catch {
      // ignore
    }
  }, [navigate]);

  return null;
}

export default function Router() {
  return (
    <>
      <ReloadRedirectHandler />
      <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/hellgamble" element={<HellGambleApp />} />
      <Route path="/caseclash" element={<HellGambleApp />} />
      <Route path="/gamble" element={<HellGambleApp />} />
      <Route path="/prophunt" element={<PropHuntApp />} />
      <Route path="/hideseek" element={<PropHuntApp />} />
      <Route path="/note" element={<NoteApp />} />
      <Route path="/jeudelanote" element={<NoteApp />} />
      <Route path="/pixelgun" element={<PixelGunApp />} />
      <Route path="/fps" element={<PixelGunApp />} />
      <Route path="/survivor" element={<SurvivorApp />} />
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
      <Route path="/alchimiste" element={<AlchemyApp />} />
      <Route path="/alchemy" element={<AlchemyApp />} />
      <Route path="/sumo" element={<SumoApp />} />
      <Route path="/rts" element={<RtsApp />} />
      <Route path="/nexus" element={<RtsApp />} />
      <Route path="/moba" element={<MobaApp />} />
      <Route path="/nexusclash" element={<MobaApp />} />
      <Route path="/racing" element={<RacingApp />} />
      <Route path="/course" element={<RacingApp />} />
      <Route path="/race" element={<RacingApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
