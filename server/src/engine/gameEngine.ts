import { GameState, Player, Title, BoardCell, ResourceType, AuctionState, GameCardEvent } from '../types/game';
import { INITIAL_BOARD, INITIAL_TITLES, RESOURCE_DEFINITIONS, COUNTRY_CONTINENT_MAP } from '../data/board';

// Deck de 18 cartes Actualités réalistes inspirées du jeu
const ACTUALITE_DECK: GameCardEvent[] = [
  { text: "Vos investissements dans le pétrole s'avèrent payants. Recevez 5 000 000 F.", amount: 5000000 },
  { text: "Crise pétrolière internationale. Vous devez payer 3 000 000 F de surtaxes.", amount: -3000000 },
  { text: "Remboursement d'impôts sur les sociétés. Recevez 2 000 000 F.", amount: 2000000 },
  { text: "Grève générale dans vos usines métallurgiques. Payez 4 000 000 F de réparations.", amount: -4000000 },
  { text: "Subventions gouvernementales pour l'agriculture. Recevez 1 500 000 F.", amount: 1500000 },
  { text: "Naufrage d'un supertanker. Payez 5 000 000 F d'amende environnementale.", amount: -5000000 },
  { text: "Modernisation de vos flottes navales. Payez 3 000 000 F.", amount: -3000000 },
  { text: "Découverte d'un nouveau gisement d'or. Recevez 6 000 000 F.", amount: 6000000 },
  { text: "Nationalisation de certains de vos actifs à l'étranger. Recevez 4 000 000 F d'indemnité.", amount: 4000000 },
  { text: "Baisse mondiale des cours des matières premières. Payez 2 500 000 F.", amount: -2500000 },
  { text: "Vente de brevets technologiques majeurs. Recevez 3 500 000 F.", amount: 3500000 },
  { text: "Séisme endommageant vos exploitations minières. Payez 4 500 000 F.", amount: -4500000 },
  { text: "Rachat d'actions à dividende élevé. Recevez 2 500 000 F.", amount: 2500000 },
  { text: "Inondations des plantations de café et cacao. Payez 2 000 000 F.", amount: -2000000 },
  { text: "Spéculation boursière réussie. Recevez 4 500 000 F.", amount: 4500000 },
  { text: "Amende pour entente sur les prix du charbon. Payez 3 500 000 F.", amount: -3500000 },
  { text: "Développement de nouveaux moteurs écologiques. Recevez 3 000 000 F.", amount: 3000000 },
  { text: "Impôt exceptionnel sur la fortune. Payez 5 000 000 F.", amount: -5000000 }
];

export class GameEngine {
  private state: GameState;

  constructor(gameId: string) {
    this.state = {
      gameId,
      status: 'LOBBY',
      players: [],
      currentPlayerIndex: 0,
      titles: JSON.parse(JSON.stringify(INITIAL_TITLES)),
      board: JSON.parse(JSON.stringify(INITIAL_BOARD)),
      turnNumber: 1,
      lastDiceRoll: null,
      log: ['Partie créée. En attente de joueurs.'],
      auction: null
    };
  }

  public getStatus() {
    return this.state.status;
  }

  public getPlayers() {
    return this.state.players;
  }

  public getState(): GameState {
    return this.state;
  }

  public addPlayer(id: string, username: string, color: string): boolean {
    if (this.state.status !== 'LOBBY') return false;
    if (this.state.players.length >= 6) return false;

    const newPlayer: Player = {
      id,
      username,
      cash: 0, // Défini au lancement de la partie selon le nombre de joueurs
      position: 0,
      isBankrupt: false,
      color,
      lapsCompleted: 0,
      hasJokerCard: false
    };

    this.state.players.push(newPlayer);
    this.state.log.push(`${username} a rejoint la partie.`);
    return true;
  }

  public startGame(): boolean {
    if (this.state.status !== 'LOBBY') return false;
    const nbPlayers = this.state.players.length;
    if (nbPlayers < 2) return false;

    // Répartition de l'argent initial : 200 millions partagés
    const startingCash = Math.floor(200000000 / nbPlayers);
    this.state.players.forEach(p => {
      p.cash = startingCash;
    });

    // --- Placement Aléatoire des 48 plaquettes Royalties ---
    // Il y a 48 plaquettes : 2 de chaque sorte pour les 24 ressources
    const royaltyPlates: ResourceType[] = [];
    Object.keys(RESOURCE_DEFINITIONS).forEach(resType => {
      royaltyPlates.push(resType as ResourceType);
      royaltyPlates.push(resType as ResourceType);
    });

    // Mélanger les plaquettes
    this.shuffleArray(royaltyPlates);

    // Assigner aux cases RICHESSE et BANQUE (500 000 F) du plateau
    let plateIndex = 0;
    this.state.board.forEach(cell => {
      if ((cell.type === 'RICHESSE' || cell.type === 'BANQUE') && plateIndex < royaltyPlates.length) {
        cell.royaltyResourceType = royaltyPlates[plateIndex];
        plateIndex++;
      }
    });

    this.state.status = 'PLAYING';
    this.state.currentPlayerIndex = 0;
    this.state.log.push(`La partie commence ! Chaque joueur reçoit ${startingCash.toLocaleString()} F.`);
    this.state.log.push(`C'est au tour de ${this.state.players[0].username}.`);
    return true;
  }

  public rollDice(playerId: string): { roll: [number, number], state: GameState } | null {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) return null;
    if (this.state.lastDiceRoll !== null) return null;
    if (this.state.status !== 'PLAYING') return null;

    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const total = die1 + die2;

    this.state.lastDiceRoll = [die1, die2];
    
    // Règle des doubles lancés de dés (amende de 1M à 6M F)
    if (die1 === die2) {
      const fine = die1 * 1000000;
      currentPlayer.cash -= fine;
      this.state.log.push(`🎲 DOUBLE ! ${currentPlayer.username} a fait un double ${die1} et paie une amende de ${fine.toLocaleString()} F à la banque.`);
      if (currentPlayer.cash < 0) {
        this.handleBankruptcy(currentPlayer);
      }
    }

    // Déplacement
    const oldPosition = currentPlayer.position;
    let newPosition = (oldPosition + total) % this.state.board.length;
    
    // Passage par la case Départ : Le joueur gagne 5 000 000 F (règle des millions)
    if (newPosition < oldPosition) {
      currentPlayer.lapsCompleted += 1;
      currentPlayer.cash += 5000000;
      this.state.log.push(`${currentPlayer.username} a accompli un tour de piste et reçoit 5 000 000 F de salaire.`);
    }

    currentPlayer.position = newPosition;
    const cell = this.state.board[newPosition];
    this.state.log.push(`${currentPlayer.username} avance de ${total} cases et atterrit sur : ${cell.name}.`);

    // Résolution immédiate de la case
    this.resolveCell(currentPlayer, cell, total);

    return { roll: [die1, die2], state: this.state };
  }

  private resolveCell(player: Player, cell: BoardCell, diceSum: number) {
    // 1. Payer les redevances royalties
    if (cell.royaltyResourceType) {
      const resType = cell.royaltyResourceType;
      const resName = RESOURCE_DEFINITIONS[resType].name;

      // Calculer les royalties dues à chaque autre joueur
      this.state.players.forEach(owner => {
        if (owner.id !== player.id && !owner.isBankrupt) {
          const ownedTitles = Object.values(this.state.titles).filter(
            t => t.resourceType === resType && t.ownerId === owner.id
          );
          const count = ownedTitles.length;

          // Au moins 30% (soit 2 titres ou plus) requis pour toucher des royalties
          if (count >= 2) {
            const royaltiesAmount = RESOURCE_DEFINITIONS[resType].royalties[count - 2];
            player.cash -= royaltiesAmount;
            owner.cash += royaltiesAmount;
            this.state.log.push(`${player.username} paie ${royaltiesAmount.toLocaleString()} F de redevance à ${owner.username} pour son monopole sur le ${resName} (${count}/6 titres).`);
            
            if (player.cash < 0) {
              this.handleBankruptcy(player);
            }
          }
        }
      });
    }

    // 2. Traitement spécifique du type de case
    if (cell.type === 'RICHESSE') {
      // Proposer d'acheter les titres du pays
      const availableTitles = cell.titleIds?.map(id => this.state.titles[id]).filter(t => t.ownerId === null) || [];
      if (availableTitles.length > 0) {
        this.state.log.push(`Titres disponibles à l'achat pour ${cell.name} : ${availableTitles.map(t => `${RESOURCE_DEFINITIONS[t.resourceType].name} (${t.purchasePrice.toLocaleString()} F)`).join(', ')}.`);
      } else {
        this.state.log.push(`Tous les titres de ${cell.name} sont déjà vendus.`);
      }
    } else if (cell.type === 'BANQUE') {
      // Reçoit de la banque 500 000 F * la somme des dés
      const reward = 500000 * diceSum;
      player.cash += reward;
      this.state.log.push(`${player.username} reçoit ${reward.toLocaleString()} F de la banque (500 000 F x ${diceSum}).`);
    } else if (cell.type === 'ACTUALITE') {
      this.triggerActualiteEvent(player);
    } else if (cell.type === 'JOKER') {
      this.state.log.push(`${player.username} peut acheter une carte Joker pour 3 000 000 F afin de se prémunir contre les enchères.`);
    } else if (cell.type === 'ENCHERES') {
      if (player.lapsCompleted >= 1) {
        if (player.hasJokerCard) {
          this.state.log.push(`${player.username} peut utiliser son Joker pour annuler cette enchère.`);
        } else {
          this.state.log.push(`${player.username} doit mettre ses titres aux enchères.`);
        }
      } else {
        this.state.log.push(`La case Enchères est inactive (vous devez d'abord accomplir un tour de piste).`);
      }
    }
  }

  public buyTitle(playerId: string, titleId: string): boolean {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) return false;
    if (this.state.lastDiceRoll === null) return false;
    if (this.state.status !== 'PLAYING') return false;

    const cell = this.state.board[currentPlayer.position];
    const title = this.state.titles[titleId];
    if (!title || title.ownerId !== null || currentPlayer.cash < title.purchasePrice) return false;

    // Achat normal sur case RICHESSE
    if (cell.type === 'RICHESSE' && cell.titleIds?.includes(titleId)) {
      currentPlayer.cash -= title.purchasePrice;
      title.ownerId = currentPlayer.id;
      this.state.log.push(`${currentPlayer.username} a acheté le titre de ${title.country} (${RESOURCE_DEFINITIONS[title.resourceType].name}) pour ${title.purchasePrice.toLocaleString()} F.`);
      return true;
    }

    // Achat via CHOIX_CONTINENTAL ou CHOIX_MONDIAL
    if (cell.type === 'CHOIX_CONTINENTAL' || cell.type === 'CHOIX_MONDIAL') {
      if (currentPlayer.lapsCompleted < 1) return false;

      // Filtre continental : si c'est un choix continental, le pays du titre doit correspondre au continent de la case
      if (cell.type === 'CHOIX_CONTINENTAL') {
        const titleContinent = COUNTRY_CONTINENT_MAP[title.country];
        if (titleContinent !== cell.continent) {
          this.state.log.push(`${currentPlayer.username} ne peut pas acheter ${title.country} sur la case ${cell.name} car ce pays appartient au continent ${titleContinent}.`);
          return false;
        }
      }

      // Condition : Détenir déjà au moins un titre de cette ressource
      const ownsAtLeastOne = Object.values(this.state.titles).some(
        t => t.resourceType === title.resourceType && t.ownerId === currentPlayer.id
      );
      if (!ownsAtLeastOne) {
        this.state.log.push(`${currentPlayer.username} ne peut pas acheter ce titre car il ne possède aucune part existante de type ${RESOURCE_DEFINITIONS[title.resourceType].name}.`);
        return false;
      }

      currentPlayer.cash -= title.purchasePrice;
      title.ownerId = currentPlayer.id;
      this.state.log.push(`${currentPlayer.username} a acheté ${title.country} (${RESOURCE_DEFINITIONS[title.resourceType].name}) via la case ${cell.name} pour ${title.purchasePrice.toLocaleString()} F.`);
      return true;
    }


    return false;
  }

  public buyJokerCard(playerId: string): boolean {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) return false;
    if (this.state.lastDiceRoll === null) return false;
    if (this.state.status !== 'PLAYING') return false;

    const cell = this.state.board[currentPlayer.position];
    if (cell.type === 'JOKER' && !currentPlayer.hasJokerCard && currentPlayer.cash >= 3000000) {
      currentPlayer.cash -= 3000000;
      currentPlayer.hasJokerCard = true;
      this.state.log.push(`${currentPlayer.username} a acheté une carte Joker pour 3 000 000 F.`);
      this.passTurn(playerId);
      return true;
    }
    return false;
  }

  public useJokerCard(playerId: string): boolean {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) return false;
    if (this.state.status !== 'PLAYING') return false;

    const cell = this.state.board[currentPlayer.position];
    if (cell.type === 'ENCHERES' && currentPlayer.hasJokerCard) {
      currentPlayer.hasJokerCard = false;
      this.state.log.push(`🃏 ${currentPlayer.username} utilise son Joker pour annuler les enchères.`);
      this.passTurn(playerId);
      return true;
    }
    return false;
  }

  // --- LOGIQUE ENCHÈRES ---
  public startAuction(playerId: string, titleIdsToAuction: string[]): boolean {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) return false;
    if (this.state.status !== 'PLAYING') return false;

    const cell = this.state.board[currentPlayer.position];
    if (cell.type !== 'ENCHERES' || currentPlayer.lapsCompleted < 1) return false;

    // Vérifier la règle du dé rouge (le 2e dé)
    const redDieValue = this.state.lastDiceRoll ? this.state.lastDiceRoll[1] : 3;

    // Calculer combien de titres sont proposés.
    // Un trust (2+ titres d'une même production) ne peut pas être dépareillé.
    // Si on met aux enchères un titre qui appartient à un trust, tout le trust doit y passer.
    const finalTitlesToAuction: string[] = [];
    const resourceTypesSeen = new Set<string>();

    for (const tId of titleIdsToAuction) {
      const title = this.state.titles[tId];
      if (title && title.ownerId === currentPlayer.id) {
        if (!resourceTypesSeen.has(title.resourceType)) {
          resourceTypesSeen.add(title.resourceType);
          // Récupérer tout le monopole / trust du joueur
          const trustTitles = Object.values(this.state.titles).filter(
            t => t.resourceType === title.resourceType && t.ownerId === currentPlayer.id
          );
          trustTitles.forEach(t => finalTitlesToAuction.push(t.id));
        }
      }
    }

    if (finalTitlesToAuction.length < redDieValue) {
      // Si le joueur possède moins de titres que le dé rouge, il doit mettre TOUS ses titres aux enchères
      const allMyTitles = Object.values(this.state.titles).filter(t => t.ownerId === currentPlayer.id);
      if (finalTitlesToAuction.length < allMyTitles.length) {
        this.state.log.push(`${currentPlayer.username} n'a pas sélectionné assez de titres. Le dé rouge indique ${redDieValue}.`);
        return false;
      }
    }

    // Calculer le prix de départ : moitié du prix d'achat cumulé
    const totalPrice = finalTitlesToAuction.reduce((sum, id) => sum + this.state.titles[id].purchasePrice, 0);
    const startingPrice = Math.floor(totalPrice / 2);

    this.state.status = 'AUCTION';
    this.state.auction = {
      titleIds: finalTitlesToAuction,
      sellerId: currentPlayer.id,
      currentHighestBidderId: null,
      currentBid: startingPrice,
      playersWhoBidOrPassed: {}
    };

    // Initialiser les participants à l'enchère (tous sauf le vendeur)
    this.state.players.forEach(p => {
      if (p.id !== currentPlayer.id && !p.isBankrupt) {
        this.state.auction!.playersWhoBidOrPassed[p.id] = 'PASS'; // Par défaut, 'PASS' jusqu'à ce qu'ils fassent une action
      }
    });

    this.state.log.push(`[ENCHÈRES] L'enchère commence pour : ${finalTitlesToAuction.map(id => `${this.state.titles[idxToKey(id)].country} (${RESOURCE_DEFINITIONS[this.state.titles[id].resourceType].name})`).join(', ')}.`);
    this.state.log.push(`Prix de départ : ${startingPrice.toLocaleString()} F.`);
    return true;
  }

  public placeBid(playerId: string, bidAmount: number): boolean {
    if (this.state.status !== 'AUCTION' || !this.state.auction) return false;
    const bidder = this.state.players.find(p => p.id === playerId);
    if (!bidder || bidder.isBankrupt || bidder.id === this.state.auction.sellerId) return false;

    // Surenchère minimale de 100 000 F
    const minBid = this.state.auction.currentHighestBidderId === null
      ? this.state.auction.currentBid
      : this.state.auction.currentBid + 100000;

    if (bidAmount < minBid || bidder.cash < bidAmount) return false;

    this.state.auction.currentBid = bidAmount;
    this.state.auction.currentHighestBidderId = bidder.id;
    this.state.auction.playersWhoBidOrPassed[bidder.id] = 'BID';
    
    // Réinitialiser les autres joueurs à 'PASS' pour qu'ils puissent surenchérir
    this.state.players.forEach(p => {
      if (p.id !== bidder.id && p.id !== this.state.auction!.sellerId && !p.isBankrupt) {
        this.state.auction!.playersWhoBidOrPassed[p.id] = 'PASS';
      }
    });

    this.state.log.push(`[ENCHÈRES] ${bidder.username} offre ${bidAmount.toLocaleString()} F.`);
    return true;
  }

  public passBid(playerId: string): boolean {
    if (this.state.status !== 'AUCTION' || !this.state.auction) return false;
    const bidder = this.state.players.find(p => p.id === playerId);
    if (!bidder || bidder.id === this.state.auction.sellerId) return false;

    this.state.auction.playersWhoBidOrPassed[bidder.id] = 'PASS';
    this.state.log.push(`[ENCHÈRES] ${bidder.username} passe.`);

    // Vérifier si tout le monde a passé après la dernière offre
    const allPassed = Object.values(this.state.auction.playersWhoBidOrPassed).every(status => status === 'PASS');
    if (allPassed) {
      this.resolveAuction();
    }
    return true;
  }

  private resolveAuction() {
    if (!this.state.auction) return;
    const auction = this.state.auction;
    const seller = this.state.players.find(p => p.id === auction.sellerId);

    if (auction.currentHighestBidderId) {
      // Un acheteur a remporté l'enchère
      const buyer = this.state.players.find(p => p.id === auction.currentHighestBidderId);
      if (buyer && seller) {
        buyer.cash -= auction.currentBid;
        seller.cash += auction.currentBid;
        
        // Transférer les titres
        auction.titleIds.forEach(id => {
          this.state.titles[id].ownerId = buyer.id;
        });

        this.state.log.push(`[ENCHÈRES] Adjugé ! ${buyer.username} remporte l'enchère pour ${auction.currentBid.toLocaleString()} F.`);
      }
    } else {
      // Aucun acheteur : La banque achète à moitié prix
      if (seller) {
        const halfPrice = auction.currentBid;
        seller.cash += halfPrice;

        // Retourner les titres à la banque
        auction.titleIds.forEach(id => {
          this.state.titles[id].ownerId = null;
        });

        this.state.log.push(`[ENCHÈRES] Aucune offre. La banque achète les titres pour ${halfPrice.toLocaleString()} F. Les titres sont remis en vente.`);
      }
    }

    this.state.status = 'PLAYING';
    this.state.auction = null;
    this.nextTurn();
  }

  public passTurn(playerId: string): boolean {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) return false;
    if (this.state.lastDiceRoll === null) return false;
    if (this.state.status !== 'PLAYING') return false;

    this.state.log.push(`${currentPlayer.username} termine son tour.`);
    this.nextTurn();
    return true;
  }

  private nextTurn() {
    this.state.lastDiceRoll = null;
    let nextIndex = this.state.currentPlayerIndex;
    
    let loopCount = 0;
    do {
      nextIndex = (nextIndex + 1) % this.state.players.length;
      loopCount++;
    } while (this.state.players[nextIndex].isBankrupt && loopCount < this.state.players.length);

    if (this.state.players[nextIndex].isBankrupt) {
      this.state.status = 'FINISHED';
      const winner = this.state.players.find(p => !p.isBankrupt);
      this.state.log.push(`Partie terminée ! Le grand vainqueur est ${winner?.username || 'inconnu'}.`);
    } else {
      this.state.currentPlayerIndex = nextIndex;
      this.state.turnNumber++;
      this.state.log.push(`C'est au tour de ${this.state.players[nextIndex].username}.`);
    }
  }

  private triggerActualiteEvent(player: Player) {
    const card = ACTUALITE_DECK[Math.floor(Math.random() * ACTUALITE_DECK.length)];
    player.cash += card.amount;
    this.state.log.push(`[Actualité] ${player.username} pioche : "${card.text}"`);

    if (player.cash < 0) {
      this.handleBankruptcy(player);
    }
  }

  private handleBankruptcy(player: Player) {
    player.isBankrupt = true;
    player.cash = 0;
    this.state.log.push(`💀 ${player.username} est déclaré en FAILLITE ! Ses titres retournent dans les sabots de la banque.`);
    
    Object.values(this.state.titles).forEach(t => {
      if (t.ownerId === player.id) {
        t.ownerId = null;
      }
    });

    const activePlayers = this.state.players.filter(p => !p.isBankrupt);
    if (activePlayers.length === 1) {
      this.state.status = 'FINISHED';
      this.state.log.push(`🎉 La partie est terminée ! Le dernier survivant et grand vainqueur est ${activePlayers[0].username} !`);
    }
  }

  public resetGame(): boolean {
    this.state.status = 'LOBBY';
    this.state.currentPlayerIndex = 0;
    this.state.turnNumber = 1;
    this.state.lastDiceRoll = null;
    this.state.auction = null;
    this.state.log = ['La partie a été réinitialisée. En attente du lancement.'];
    
    this.state.players.forEach(p => {
      p.cash = 0;
      p.position = 0;
      p.isBankrupt = false;
      p.lapsCompleted = 0;
      p.hasJokerCard = false;
    });

    this.state.titles = JSON.parse(JSON.stringify(INITIAL_TITLES));
    return true;
  }

  public handleDisconnectBankruptcy(playerId: string) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || player.isBankrupt) return;

    this.handleBankruptcy(player);

    // Si c'était son tour et que la partie continue, on passe au joueur suivant
    if (this.state.status === 'PLAYING') {
      const currentPlayer = this.getCurrentPlayer();
      if (currentPlayer && currentPlayer.id === playerId) {
        this.nextTurn();
      }
    }
  }



  private getCurrentPlayer(): Player | null {
    if (this.state.players.length === 0) return null;
    return this.state.players[this.state.currentPlayerIndex];
  }

  private shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

// Fonction utilitaire pour éviter les erreurs de type
function idxToKey(id: string): string {
  return id;
}
