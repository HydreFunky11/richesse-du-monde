import { useNavigate } from 'react-router-dom';

interface GameCard {
  emoji: string;
  title: string;
  description: string;
  route: string;
  gradient: string;
  ringColor: string;
  players: string;
  badge: string;
  badgeColor: string;
  isClosed?: boolean;
}

const GAMES: GameCard[] = [
  {
    emoji: '🌍',
    title: 'Richesses du Monde',
    description: "Le jeu économique de stratégie mondiale - achetez des titres de ressources, enchérissez, et dominez l'économie planétaire.",
    route: '/richesse',
    gradient: 'from-amber-500 to-orange-600',
    ringColor: 'ring-amber-500',
    players: '2 à 6 joueurs',
    badge: 'Stratégie',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  {
    emoji: '🃏',
    title: 'UNO',
    description: 'Le jeu de cartes classique - jouez vos cartes, changez les couleurs, piégez vos adversaires et criez UNO !',
    route: '/uno',
    gradient: 'from-red-500 to-rose-600',
    ringColor: 'ring-red-500',
    players: '2 à 10 joueurs',
    badge: 'Cartes',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
  },
  {
    emoji: '❤️',
    title: 'Love Letter',
    description: "Le jeu de cartes minimaliste d'influence et de bluff - éliminez les autres courtisans et livrez vos mots d'amour à la Princesse.",
    route: '/loveletter',
    gradient: 'from-pink-500 to-rose-600',
    ringColor: 'ring-pink-500',
    players: '2 à 4 joueurs',
    badge: 'Déduction',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  },
  {
    emoji: '🥸',
    title: 'Discretos',
    description: "Le jeu d'espionnage et de bluff - infiltrez-vous dans des lieux loufoques sans vous faire repérer, ou menez l'enquête pour trouver l'intrus.",
    route: '/discretos',
    gradient: 'from-cyan-500 to-blue-600',
    ringColor: 'ring-cyan-500',
    players: '3 à 8 joueurs',
    badge: 'Bluff',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  {
    emoji: '🃟',
    title: 'Skyjo',
    description: "Le jeu de cartes d'opportunisme et de tactique - retournez, échangez et alignez vos cartes pour obtenir le score le plus faible possible.",
    route: '/skyjo',
    gradient: 'from-emerald-500 to-teal-600',
    ringColor: 'ring-emerald-500',
    players: '2 à 8 joueurs',
    badge: 'Tactique',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  },
  {
    emoji: '🦖',
    title: 'King of Tokyo',
    description: "Le jeu de dés et de combat de monstres géants - baffez vos adversaires et devenez le Roi suprême de Tokyo City.",
    route: '/kingoftokyo',
    gradient: 'from-red-600 to-amber-600',
    ringColor: 'ring-red-500',
    players: '2 à 6 joueurs',
    badge: 'Combat / Dés',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30'
  },
  {
    emoji: '⚔️',
    title: 'Dungeon Mayhem',
    description: "La bagarre chaotique dans le donjon - incarnez le Barbare, le Paladin, le Voleur ou le Magicien et soyez le dernier survivant !",
    route: '/dungeonmayhem',
    gradient: 'from-amber-600 via-orange-600 to-red-700',
    ringColor: 'ring-amber-500',
    players: '2 à 4 joueurs',
    badge: 'Combat / Cartes',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  },
  {
    emoji: '🎭',
    title: 'Chaos Board',
    description: 'Le jeu du chaos de Magic The Noah - avancez, combattez des monstres, pariez, et modifiez dynamiquement le plateau après votre élimination.',
    route: '/chaos',
    gradient: 'from-orange-500 to-red-600',
    ringColor: 'ring-orange-500',
    players: '2 à 6 joueurs',
    badge: 'Survie',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    isClosed: true,
  },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🎮</div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          Choisissez votre jeu
        </h1>
        <p className="text-slate-500 text-lg max-w-md mx-auto">
          Rejoignez un salon existant ou créez le vôtre et invitez vos amis
        </p>
      </div>

      {/* Game cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {GAMES.map((game) => (
          <button
            key={game.route}
            onClick={() => !game.isClosed && navigate(game.route)}
            disabled={game.isClosed}
            className={`
              group relative bg-slate-900 border border-slate-800 rounded-2xl p-8
              text-left transition-all duration-200 shadow-xl
              ${game.isClosed 
                ? 'opacity-40 cursor-not-allowed border-slate-900' 
                : 'cursor-pointer hover:border-slate-600 hover:bg-slate-800/80 hover:shadow-2xl hover:-translate-y-1'
              }
            `}
          >
            {/* Badge */}
            <span className={`absolute top-4 right-4 text-xs font-semibold px-2.5 py-1 rounded-full border ${
              game.isClosed 
                ? 'bg-slate-950/40 text-slate-500 border-slate-800' 
                : game.badgeColor
            }`}>
              {game.isClosed ? 'Fermé' : game.badge}
            </span>

            {/* Emoji */}
            <div className={`text-5xl mb-5 transition-transform duration-200 ${!game.isClosed && 'group-hover:scale-110'}`}>
              {game.emoji}
            </div>

            {/* Title */}
            <h2 className={`text-2xl font-extrabold mb-2 bg-gradient-to-r ${game.gradient} bg-clip-text text-transparent`}>
              {game.title}
            </h2>

            {/* Description */}
            <p className="text-slate-400 text-sm leading-relaxed mb-5">
              {game.description}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <span>👥</span> {game.players}
              </span>
              <span className={`text-sm font-bold bg-gradient-to-r ${game.gradient} bg-clip-text text-transparent ${!game.isClosed && 'group-hover:underline'}`}>
                {game.isClosed ? 'Fermé 🔒' : 'Jouer →'}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <p className="mt-12 text-slate-700 text-xs">
        Partie multijoueur en ligne · Temps réel
      </p>
    </div>
  );
}
