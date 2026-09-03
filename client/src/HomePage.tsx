import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { soundFx } from './utils/audio';

interface GameTheme {
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  route: string;
  fontClass: string;
  cardTheme: string;
  borderTheme: string;
  titleGradient: string;
  badge: string;
  badgeStyle: string;
  players: string;
  isClosed?: boolean;
}

const GAMES: GameTheme[] = [
  {
    emoji: '👑',
    title: 'Clash of Realms',
    subtitle: 'Arène de Cartes en Temps Réel',
    description: 'Duel stratégique en direct style Clash Royale ! Gérez votre jauge d\'Élixir, invoquez géants, archères et dragons pour anéantir les tours ennemies.',
    route: '/clash',
    fontClass: 'font-display font-black tracking-wide',
    cardTheme: 'bg-gradient-to-b from-purple-950/70 via-slate-950 to-blue-950/40',
    borderTheme: 'border-purple-500/50 hover:border-amber-400 hover:shadow-purple-900/50',
    titleGradient: 'from-amber-300 via-purple-400 to-pink-500',
    badge: 'NOUVEAU • TEMPS RÉEL ⚡',
    badgeStyle: 'bg-purple-950 text-purple-300 border-purple-500/50 animate-pulse',
    players: '1v1 ou contre IA 🤖',
  },
  {
    emoji: '⚔️',
    title: 'Dungeon Mayhem',
    subtitle: 'Grimoire & Bagarre Médiévale',
    description: 'Affrontez-vous dans le donjon avec des decks asymétriques : Barbare déchaîné, Paladine blindée, Voleur fourbe ou Magicien destructeur !',
    route: '/dungeonmayhem',
    fontClass: 'font-medieval',
    cardTheme: 'bg-gradient-to-b from-stone-900 via-stone-950 to-amber-950/40',
    borderTheme: 'border-amber-600/50 hover:border-amber-400 hover:shadow-amber-900/40',
    titleGradient: 'from-amber-300 via-orange-400 to-red-500',
    badge: 'COMBAT & HÉROS',
    badgeStyle: 'bg-amber-950 text-amber-300 border-amber-500/40',
    players: '2 à 4 Héros',
  },
  {
    emoji: '🦖',
    title: 'King of Tokyo',
    subtitle: 'Kaiju & Destruction de Masse',
    description: 'Lancez les dés, distribuez des baffes magistrales, occupez Tokyo City, amassez de l\'énergie et achetez des super-pouvoirs mutants.',
    route: '/kingoftokyo',
    fontClass: 'font-comic tracking-wider text-3xl',
    cardTheme: 'bg-gradient-to-b from-zinc-900 via-slate-950 to-red-950/40',
    borderTheme: 'border-red-600/50 hover:border-red-400 hover:shadow-red-900/50',
    titleGradient: 'from-red-400 via-rose-500 to-amber-400',
    badge: 'DÉS & BAFES',
    badgeStyle: 'bg-red-950 text-red-300 border-red-500/40',
    players: '2 à 6 Monstres',
  },
  {
    emoji: '🌍',
    title: 'Richesses du Monde',
    subtitle: 'Haute Finance & Art Déco',
    description: 'Le grand jeu économique mondial. Acquérez des concessions minières, organisez des enchères impitoyables et dominez la planète.',
    route: '/richesse',
    fontClass: 'font-luxury italic text-2xl',
    cardTheme: 'bg-gradient-to-b from-emerald-950/70 via-slate-950 to-amber-950/30',
    borderTheme: 'border-emerald-500/40 hover:border-amber-400 hover:shadow-emerald-900/40',
    titleGradient: 'from-amber-200 via-emerald-300 to-yellow-500',
    badge: 'STRATÉGIE & MONOPOLE',
    badgeStyle: 'bg-emerald-950 text-emerald-300 border-emerald-500/40',
    players: '2 à 6 Magnats',
  },
  {
    emoji: '🥸',
    title: 'Discretos',
    subtitle: 'Dossier Secret Défense',
    description: 'Tout le monde incarne le même personnage secret... sauf l\'intrus qui a reçu un alter-égo ! Donnez des indices subtils au tour par tour.',
    route: '/discretos',
    fontClass: 'font-typewriter',
    cardTheme: 'bg-gradient-to-b from-slate-900 via-slate-950 to-cyan-950/30',
    borderTheme: 'border-cyan-600/40 hover:border-cyan-400 hover:shadow-cyan-900/40',
    titleGradient: 'from-cyan-300 via-blue-400 to-teal-300',
    badge: 'INFILTRATION & BLUFF',
    badgeStyle: 'bg-cyan-950 text-cyan-300 border-cyan-500/40',
    players: '3 à 8 Agents',
  },
  {
    emoji: '🃟',
    title: 'Skyjo',
    subtitle: 'Casino Scandinave & Tactique',
    description: 'Révélez, échangez et alignez vos cartes de 12 colonnes. Éliminez les lignes identiques et obtenez le score le plus bas possible.',
    route: '/skyjo',
    fontClass: 'font-display font-extrabold',
    cardTheme: 'bg-gradient-to-b from-slate-900 via-teal-950/40 to-slate-950',
    borderTheme: 'border-teal-500/40 hover:border-teal-300 hover:shadow-teal-900/40',
    titleGradient: 'from-teal-300 via-emerald-400 to-cyan-400',
    badge: 'TACTIQUE & CHANCE',
    badgeStyle: 'bg-teal-950 text-teal-300 border-teal-500/40',
    players: '2 à 8 Joueurs',
  },
  {
    emoji: '🃏',
    title: 'UNO',
    subtitle: 'Classique Pop & Trahisons',
    description: 'Le roi des jeux de cartes d\'ambiance. Empilez les +2, changez de sens, posez des jokers +4 et n\'oubliez surtout pas de crier UNO !',
    route: '/uno',
    fontClass: 'font-display font-black tracking-tight',
    cardTheme: 'bg-gradient-to-b from-slate-900 via-rose-950/40 to-slate-950',
    borderTheme: 'border-rose-500/40 hover:border-rose-300 hover:shadow-rose-900/40',
    titleGradient: 'from-yellow-400 via-red-500 to-blue-500',
    badge: 'POP & AMBIANCE',
    badgeStyle: 'bg-rose-950 text-rose-300 border-rose-500/40',
    players: '2 à 10 Joueurs',
  },
  {
    emoji: '💌',
    title: 'Love Letter',
    subtitle: 'Cour Royale & Déduction',
    description: 'Gardes, Prêtres, Barons et Princesse. 16 cartes seulement pour un chef-d\'œuvre de déduction, de bluff et de prise de risque rapide.',
    route: '/loveletter',
    fontClass: 'font-medieval font-bold',
    cardTheme: 'bg-gradient-to-b from-slate-900 via-pink-950/30 to-purple-950/40',
    borderTheme: 'border-pink-500/40 hover:border-pink-300 hover:shadow-pink-900/40',
    titleGradient: 'from-pink-300 via-rose-400 to-purple-400',
    badge: 'DÉDUCTION & BLUFF',
    badgeStyle: 'bg-pink-950 text-pink-300 border-pink-500/40',
    players: '2 à 4 Courtisans',
  },
  {
    emoji: '🎭',
    title: 'Chaos Board',
    subtitle: 'Le Jeu du Hasard Total',
    description: 'Inspiré de Magic The Noah : avancez sur un plateau instable, combattez des monstres et modifiez le monde même après votre mort !',
    route: '/chaos',
    fontClass: 'font-comic tracking-wide text-2xl',
    cardTheme: 'bg-gradient-to-b from-orange-950/40 via-slate-950 to-purple-950/40',
    borderTheme: 'border-orange-500/30 opacity-50',
    titleGradient: 'from-orange-400 to-red-500',
    badge: 'EXPÉRIMENTAL',
    badgeStyle: 'bg-slate-900 text-slate-500 border-slate-800',
    players: '2 à 6 Joueurs',
    isClosed: true,
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [muted, setMuted] = useState(soundFx.isMuted());

  const handleToggleSound = () => {
    const isNowMuted = soundFx.toggleMute();
    setMuted(isNowMuted);
    if (!isNowMuted) {
      soundFx.click();
    }
  };

  const handleGameSelect = (route: string, isClosed?: boolean) => {
    if (isClosed) return;
    soundFx.playCard();
    navigate(route);
  };

  return (
    <div className="min-h-screen bg-lounge-felt text-slate-100 flex flex-col justify-between p-6 relative overflow-x-hidden">
      {/* Ambient background lights */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <nav className="w-full max-w-7xl mx-auto flex justify-between items-center pb-6 border-b border-slate-800/80 relative z-10">
        <div className="flex items-center gap-3">
          <span className="text-3xl animate-pulse">🎲</span>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
              Club Multijoueur
            </div>
            <div className="text-sm font-extrabold text-slate-200">
              The Tabletop Lounge
            </div>
          </div>
        </div>

        {/* Sound FX toggle */}
        <button
          onClick={handleToggleSound}
          className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 px-3.5 py-1.5 rounded-full text-xs text-slate-300 cursor-pointer transition shadow-md"
          title="Activer / Désactiver les effets sonores"
        >
          <span>{muted ? '🔇' : '🔊'}</span>
          <span className="font-mono text-[11px]">{muted ? 'Sons coupés' : 'Sons activés'}</span>
        </button>
      </nav>

      {/* Hero Header */}
      <header className="text-center my-10 max-w-2xl mx-auto relative z-10">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/20 px-4 py-1 rounded-full text-xs font-bold text-amber-300 mb-4 shadow-inner">
          ✨ 7 JEUX COMPLETS • MULTIJOUEUR EN DIRECT
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-3 text-white">
          La Salle des Jeux
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Rejoignez une table entre amis ou créez votre salon. Chaque jeu possède ses propres mécaniques, son univers et son ambiance sonore.
        </p>
      </header>

      {/* Game Cards Grid */}
      <main className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 relative z-10">
        {GAMES.map((game) => (
          <div
            key={game.route}
            onMouseEnter={() => !game.isClosed && soundFx.click()}
            onClick={() => handleGameSelect(game.route, game.isClosed)}
            className={`
              holo-card group relative p-6 rounded-3xl border-2 transition-all duration-200 flex flex-col justify-between shadow-xl
              ${game.cardTheme} ${game.borderTheme}
              ${game.isClosed 
                ? 'cursor-not-allowed' 
                : 'cursor-pointer hover:-translate-y-2 hover:shadow-2xl active:translate-y-0'
              }
            `}
          >
            <div>
              {/* Card Top: Emoji & Badge */}
              <div className="flex justify-between items-start mb-4">
                <span className="text-4xl transition-transform duration-200 group-hover:scale-110 block">
                  {game.emoji}
                </span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${game.badgeStyle}`}>
                  {game.isClosed ? 'MAINTENANCE' : game.badge}
                </span>
              </div>

              {/* Title & Subtitle */}
              <h3 className={`font-black mb-1 bg-gradient-to-r ${game.titleGradient} bg-clip-text text-transparent text-2xl ${game.fontClass}`}>
                {game.title}
              </h3>
              <div className="text-[11px] font-medium text-amber-400/90 mb-3 tracking-wide">
                {game.subtitle}
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300/90 leading-relaxed mb-6 font-normal">
                {game.description}
              </p>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px]">
                <span>👥</span> {game.players}
              </span>
              <span className={`font-bold transition-all flex items-center gap-1 ${
                game.isClosed 
                  ? 'text-slate-600' 
                  : 'text-amber-400 group-hover:text-amber-300 group-hover:translate-x-1'
              }`}>
                {game.isClosed ? 'Bientôt 🔒' : 'Rejoindre →'}
              </span>
            </div>
          </div>
        ))}
      </main>

      {/* Footer info */}
      <footer className="w-full max-w-7xl mx-auto text-center pt-12 pb-4 text-xs text-slate-600 relative z-10 flex flex-wrap justify-between items-center gap-2 border-t border-slate-850 mt-12">
        <span>Parties multijoueurs synchronisées par WebSockets</span>
        <span className="text-slate-500">Antigravity Boardgame Platform • 2026</span>
      </footer>
    </div>
  );
}
