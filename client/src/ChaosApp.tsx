import { useNavigate } from 'react-router-dom';

export default function ChaosApp() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-800 text-center">
        <div className="text-5xl mb-4 text-center">🔒</div>
        <h1 className="text-2xl font-extrabold text-orange-400 mb-2 text-center">
          Chaos Board est fermé
        </h1>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed text-center">
          Ce prototype de jeu est actuellement indisponible en raison de la complexité des règles et des options de personnalisation.
        </p>
        <button
          onClick={() => navigate('/')}
          className="w-full bg-slate-800 hover:bg-slate-750 text-white font-bold py-2.5 rounded-lg border border-slate-700 transition cursor-pointer"
        >
          Retourner à l'accueil
        </button>
      </div>
    </div>
  );
}
