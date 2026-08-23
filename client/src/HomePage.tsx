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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {GAMES.map((game) => (
          <button
            key={game.route}
            onClick={() => navigate(game.route)}
            className={`
              group relative bg-slate-900 border border-slate-800 rounded-2xl p-8
              text-left cursor-pointer
              hover:border-slate-600 hover:bg-slate-800/80
              transition-all duration-200 shadow-xl hover:shadow-2xl
              hover:-translate-y-1
            `}
          >
            {/* Badge */}
            <span className={`absolute top-4 right-4 text-xs font-semibold px-2.5 py-1 rounded-full border ${game.badgeColor}`}>
              {game.badge}
            </span>

            {/* Emoji */}
            <div className="text-5xl mb-5 group-hover:scale-110 transition-transform duration-200">
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
              <span className={`text-sm font-bold bg-gradient-to-r ${game.gradient} bg-clip-text text-transparent group-hover:underline`}>
                Jouer →
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
