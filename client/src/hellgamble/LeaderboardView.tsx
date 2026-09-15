import React from 'react';
import type { HellPlayer } from './types';
import { RARITY_CONFIG } from './types';
import { formatCurrency } from './skinsData';

interface LeaderboardViewProps {
  players: HellPlayer[];
  myPlayerId: string;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  players,
  myPlayerId,
}) => {
  const sortedPlayers = [...players].sort((a, b) => b.netWorth - a.netWorth);

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in">
      {/* ─── BANNIERE TITRE ─── */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/80 via-slate-950 to-yellow-950/80 border border-amber-500/30 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-3xl shadow-lg shadow-amber-950">
            🏆
          </div>
          <div>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-500">
              Classement des Fortunes du Salon
            </h2>
            <p className="text-sm text-slate-300">
              Le but ultime : accumuler la plus grande valeur nette (Cash + Inventaire) et débloquer les skins les plus légendaires !
            </p>
          </div>
        </div>
      </div>

      {/* ─── TABLEAU DU CLASSEMENT ─── */}
      <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400 bg-slate-950/60">
              <th className="py-4 px-5">Rang</th>
              <th className="py-4 px-5">Joueur</th>
              <th className="py-4 px-5">Fortune Totale</th>
              <th className="py-4 px-5">Cash Liquide</th>
              <th className="py-4 px-5">Valeur Inventaire</th>
              <th className="py-4 px-5">Meilleur Drop Débloqué</th>
              <th className="py-4 px-5 text-center">Battles Gagnées</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm font-semibold">
            {sortedPlayers.map((player, index) => {
              const isMe = player.id === myPlayerId;
              const rank = index + 1;
              const invValue = player.inventory.reduce((sum, i) => sum + i.value, 0);
              const bestDropCfg = player.bestDrop ? RARITY_CONFIG[player.bestDrop.rarity] : null;

              return (
                <tr
                  key={player.id}
                  className={`transition-colors ${
                    isMe
                      ? 'bg-amber-500/10 hover:bg-amber-500/15'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  {/* Rang */}
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2 font-black text-base">
                      {rank === 1 ? (
                        <span className="text-2xl drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">👑</span>
                      ) : rank === 2 ? (
                        <span className="text-xl">🥈</span>
                      ) : rank === 3 ? (
                        <span className="text-xl">🥉</span>
                      ) : (
                        <span className="text-slate-500 font-mono w-6 text-center">{rank}</span>
                      )}
                    </div>
                  </td>

                  {/* Joueur */}
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{player.avatar}</span>
                      <div>
                        <span className="font-black text-slate-100 flex items-center gap-1.5">
                          {player.username}
                          {isMe && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase">
                              Vous
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-slate-500">
                          {player.totalOpened} caisse(s) ouverte(s)
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Fortune Totale */}
                  <td className="py-4 px-5">
                    <span className="font-black text-base font-mono text-amber-400">
                      {formatCurrency(player.netWorth)}
                    </span>
                  </td>

                  {/* Cash Liquide */}
                  <td className="py-4 px-5">
                    <span className="font-mono text-emerald-400 font-bold">
                      {formatCurrency(player.cash)}
                    </span>
                  </td>

                  {/* Valeur Inventaire */}
                  <td className="py-4 px-5">
                    <span className="font-mono text-purple-400 font-bold">
                      {formatCurrency(invValue)}
                    </span>
                  </td>

                  {/* Meilleur Drop */}
                  <td className="py-4 px-5">
                    {player.bestDrop && bestDropCfg ? (
                      <div className="flex items-center gap-2">
                        <span>{player.bestDrop.skinId.includes('knife') ? '🗡️' : '🔥'}</span>
                        <div>
                          <p className={`text-xs font-black truncate max-w-[160px] ${bestDropCfg.textColor}`}>
                            {player.bestDrop.name}
                          </p>
                          <span className="text-[10px] font-mono text-emerald-400">
                            {formatCurrency(player.bestDrop.value)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600 italic">Aucun drop</span>
                    )}
                  </td>

                  {/* Battles Gagnées */}
                  <td className="py-4 px-5 text-center">
                    <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-bold font-mono text-xs">
                      {player.totalBattlesWon} ⚔️
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
