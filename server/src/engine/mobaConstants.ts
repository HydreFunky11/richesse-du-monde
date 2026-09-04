import { ChampionDef, ChampionId, MobaItem } from "../types/moba";

export const CHAMPIONS: Record<ChampionId, ChampionDef> = {
  ignis: {
    id: "ignis",
    name: "Ignis",
    title: "Le Pyromancien Plasma",
    role: "Mage",
    color: "#EF4444",
    passive: {
      name: "Combustion",
      description: "Les sorts enflamment la cible, infligeant 3% des PV max en dégâts magiques sur 3 secondes.",
      icon: "🔥"
    },
    spells: {
      q: {
        key: "q",
        name: "Boule de Feu Plasma",
        description: "Lance une boule de feu explosive en ligne droite qui détone au premier ennemi touché.",
        cooldown: 80, // 4s at 20tps
        manaCost: 40,
        targetType: "skillshot",
        range: 480,
        damage: 100,
        damageType: "magic",
        ratio: 0.7,
        icon: "☄️"
      },
      w: {
        key: "w",
        name: "Mur de Flammes",
        description: "Crée une ligne de feu au sol ralentissant de 50% et brûlant les ennemis qui la traversent.",
        cooldown: 180, // 9s
        manaCost: 65,
        targetType: "area",
        range: 380,
        damage: 80,
        damageType: "magic",
        ratio: 0.5,
        icon: "🧱"
      },
      e: {
        key: "e",
        name: "Souffle Brûlant",
        description: "Projette un souffle ardent en cône qui repousse les ennemis proches et inflige des dégâts.",
        cooldown: 150, // 7.5s
        manaCost: 60,
        targetType: "skillshot",
        range: 260,
        damage: 90,
        damageType: "magic",
        ratio: 0.6,
        icon: "💨"
      },
      r: {
        key: "r",
        name: "Cataclysme Solaire",
        description: "Invoque un météore colossal sur la zone ciblée après 0.8s, infligeant d énormes dégâts de zone.",
        cooldown: 900, // 45s
        manaCost: 100,
        targetType: "area",
        range: 650,
        damage: 320,
        damageType: "magic",
        ratio: 1.0,
        icon: "☀️"
      }
    },
    baseStats: {
      hp: 560,
      hpRegen: 1.2,
      mana: 420,
      manaRegen: 3.5,
      attackDamage: 52,
      abilityPower: 15,
      armor: 26,
      magicResist: 30,
      attackSpeed: 0.68,
      attackRange: 460,
      moveSpeed: 3.2
    }
  },

  aegis: {
    id: "aegis",
    name: "Aegis",
    title: "Le Rempart Titanesque",
    role: "Tank",
    color: "#3B82F6",
    passive: {
      name: "Forteresse Énergétique",
      description: "Gagne un bouclier absorbant 15% de ses PV max après 10s passées hors combat.",
      icon: "🛡️"
    },
    spells: {
      q: {
        key: "q",
        name: "Charge de Bouclier",
        description: "Fonce en avant, étourdissant (Stun 1.2s) le premier champion percuté.",
        cooldown: 160, // 8s
        manaCost: 45,
        targetType: "dash",
        range: 340,
        damage: 85,
        damageType: "physical",
        ratio: 0.6,
        icon: "⚡"
      },
      w: {
        key: "w",
        name: "Bastion Réflecteur",
        description: "Lève son bouclier pendant 2.5s : réduit les dégâts subis de 50% et renvoie 30% aux attaquants.",
        cooldown: 220, // 11s
        manaCost: 55,
        targetType: "self",
        range: 0,
        icon: "🔰"
      },
      e: {
        key: "e",
        name: "Onde Tellurique",
        description: "Fracasse le sol, infligeant des dégâts et ralentissant tous les ennemis proches de 45%.",
        cooldown: 140, // 7s
        manaCost: 50,
        targetType: "area",
        range: 220,
        damage: 75,
        damageType: "magic",
        ratio: 0.5,
        icon: "💥"
      },
      r: {
        key: "r",
        name: "Dôme d Invulnérabilité",
        description: "Déploie un champ de force impénétrable protégeant tous les alliés à l intérieur pendant 3.5s.",
        cooldown: 1100, // 55s
        manaCost: 100,
        targetType: "self",
        range: 280,
        icon: "🌐"
      }
    },
    baseStats: {
      hp: 720,
      hpRegen: 2.5,
      mana: 300,
      manaRegen: 2.0,
      attackDamage: 64,
      abilityPower: 0,
      armor: 42,
      magicResist: 36,
      attackSpeed: 0.62,
      attackRange: 140,
      moveSpeed: 3.15
    }
  },

  kage: {
    id: "kage",
    name: "Kage",
    title: "L Ombre Cyber",
    role: "Assassin",
    color: "#8B5CF6",
    passive: {
      name: "Frappe de l Ombre",
      description: "Attaquer depuis une haute herbe ou sous furtivité garantit un coup critique à 180% des dégâts.",
      icon: "🗡️"
    },
    spells: {
      q: {
        key: "q",
        name: "Shuriken Plasma",
        description: "Projette deux shurikens jumelés à grande vitesse perforant les ennemis.",
        cooldown: 80,
        manaCost: 35,
        targetType: "skillshot",
        range: 420,
        damage: 90,
        damageType: "physical",
        ratio: 0.8,
        icon: "⭐"
      },
      w: {
        key: "w",
        name: "Pas de l Ombre",
        description: "Se téléporte instantanément sur une courte distance en laissant un leurre holographique.",
        cooldown: 180,
        manaCost: 50,
        targetType: "dash",
        range: 240,
        icon: "💨"
      },
      e: {
        key: "e",
        name: "Voile Furtif",
        description: "Devient invisible pendant 3s et gagne +40% de vitesse de déplacement.",
        cooldown: 240,
        manaCost: 60,
        targetType: "self",
        range: 0,
        icon: "👤"
      },
      r: {
        key: "r",
        name: "Danse des Lames",
        description: "Saute sur la cible et lui assène 4 frappes ultra-rapides en esquivant toute contre-attaque.",
        cooldown: 900,
        manaCost: 100,
        targetType: "target",
        range: 360,
        damage: 260,
        damageType: "physical",
        ratio: 1.1,
        icon: "⚔️"
      }
    },
    baseStats: {
      hp: 540,
      hpRegen: 1.5,
      mana: 280,
      manaRegen: 2.2,
      attackDamage: 68,
      abilityPower: 0,
      armor: 28,
      magicResist: 30,
      attackSpeed: 0.74,
      attackRange: 150,
      moveSpeed: 3.55
    }
  },

  nova: {
    id: "nova",
    name: "Nova",
    title: "La Tireuse d Élite",
    role: "ADC",
    color: "#F59E0B",
    passive: {
      name: "Cadence Frénétique",
      description: "Chaque tir consécutif augmente sa vitesse d attaque de 10% (cumulable jusqu à 5 fois).",
      icon: "🎯"
    },
    spells: {
      q: {
        key: "q",
        name: "Tir Perforant",
        description: "Tire un puissant rayon cinétique traversant tous les sbires et champions en ligne.",
        cooldown: 100,
        manaCost: 45,
        targetType: "skillshot",
        range: 560,
        damage: 95,
        damageType: "physical",
        ratio: 0.85,
        icon: "⚡"
      },
      w: {
        key: "w",
        name: "Roulade Tactique",
        description: "Esquive rapide vers le curseur et réinitialise instantanément l auto-attaque.",
        cooldown: 110,
        manaCost: 35,
        targetType: "dash",
        range: 190,
        icon: "🤸"
      },
      e: {
        key: "e",
        name: "Mine Répulsive",
        description: "Pose un piège invisible. Lorsqu un ennemi marche dessus, il explose et le ralentit de 60%.",
        cooldown: 180,
        manaCost: 50,
        targetType: "area",
        range: 320,
        damage: 60,
        damageType: "magic",
        ratio: 0.4,
        icon: "💣"
      },
      r: {
        key: "r",
        name: "Barrage Orbital",
        description: "Canalise une salve dévastatrice de 6 micro-roquettes à très longue distance.",
        cooldown: 1000,
        manaCost: 100,
        targetType: "skillshot",
        range: 750,
        damage: 340,
        damageType: "physical",
        ratio: 1.0,
        icon: "🚀"
      }
    },
    baseStats: {
      hp: 510,
      hpRegen: 1.1,
      mana: 320,
      manaRegen: 2.8,
      attackDamage: 62,
      abilityPower: 0,
      armor: 24,
      magicResist: 28,
      attackSpeed: 0.72,
      attackRange: 500,
      moveSpeed: 3.3
    }
  },

  zephyr: {
    id: "zephyr",
    name: "Zephyr",
    title: "Le Maître du Vent",
    role: "Fighter",
    color: "#10B981",
    passive: {
      name: "Lame Fluide",
      description: "Convertit 25% de sa vitesse bonus en dégâts d attaque. Sa 3ème attaque frappe deux fois.",
      icon: "🌪️"
    },
    spells: {
      q: {
        key: "q",
        name: "Entaille Éolienne",
        description: "Coup d estoc rapide vers l avant. Au 3ème coup réussi, lance une tornade qui projette en l air.",
        cooldown: 60,
        manaCost: 0,
        targetType: "skillshot",
        range: 320,
        damage: 75,
        damageType: "physical",
        ratio: 0.75,
        icon: "💨"
      },
      w: {
        key: "w",
        name: "Mur de Vent",
        description: "Dresse une barrière de bourrasques qui désintègre tous les tirs et projectiles ennemis pendant 2.5s.",
        cooldown: 280,
        manaCost: 0,
        targetType: "skillshot",
        range: 150,
        icon: "🌀"
      },
      e: {
        key: "e",
        name: "Glissade Leste",
        description: "Se rue à travers un ennemi (sbire ou champion), lui infligeant des dégâts vifs.",
        cooldown: 30,
        manaCost: 0,
        targetType: "dash",
        range: 220,
        damage: 55,
        damageType: "magic",
        ratio: 0.5,
        icon: "👟"
      },
      r: {
        key: "r",
        name: "Tempête Céleste",
        description: "Se téléporte instantanément sur un ennemi en l air et le découpe pendant 1.5s.",
        cooldown: 800,
        manaCost: 0,
        targetType: "target",
        range: 400,
        damage: 280,
        damageType: "physical",
        ratio: 1.0,
        icon: "⚔️"
      }
    },
    baseStats: {
      hp: 590,
      hpRegen: 1.8,
      mana: 100,
      manaRegen: 0,
      attackDamage: 65,
      abilityPower: 0,
      armor: 32,
      magicResist: 32,
      attackSpeed: 0.70,
      attackRange: 160,
      moveSpeed: 3.45
    }
  },

  dr_volt: {
    id: "dr_volt",
    name: "Dr. Volt",
    title: "Le Chimiste Électrique",
    role: "Mage",
    color: "#06B6D4",
    passive: {
      name: "Surcharge Statique",
      description: "Courir accumule jusqu à 100 volts. À 100 volts, sa prochaine attaque libère une chaîne d éclairs.",
      icon: "⚡"
    },
    spells: {
      q: {
        key: "q",
        name: "Tourelle Tesla",
        description: "Déploie une bobine Tesla automatisée qui foudroie les ennemis à proximité.",
        cooldown: 220,
        manaCost: 60,
        targetType: "area",
        range: 300,
        damage: 40,
        damageType: "magic",
        ratio: 0.35,
        icon: "🗼"
      },
      w: {
        key: "w",
        name: "Traînée Magnétique",
        description: "Active son propulseur : +35% de vitesse et laisse une traînée toxique électrisée.",
        cooldown: 180,
        manaCost: 55,
        targetType: "self",
        range: 0,
        icon: "🔋"
      },
      e: {
        key: "e",
        name: "Grappin Magnétique",
        description: "Lance un câble électromagnétique qui agrippe le premier ennemi et l attire à lui.",
        cooldown: 220,
        manaCost: 65,
        targetType: "skillshot",
        range: 380,
        damage: 70,
        damageType: "magic",
        ratio: 0.5,
        icon: "🧲"
      },
      r: {
        key: "r",
        name: "Champ de Foudre",
        description: "Déclenche une tempête EMP géante désactivant les tirs de tourelles et zappant tout le monde.",
        cooldown: 1000,
        manaCost: 100,
        targetType: "self",
        range: 350,
        damage: 290,
        damageType: "magic",
        ratio: 0.9,
        icon: "🌩️"
      }
    },
    baseStats: {
      hp: 610,
      hpRegen: 1.4,
      mana: 380,
      manaRegen: 3.2,
      attackDamage: 54,
      abilityPower: 10,
      armor: 34,
      magicResist: 32,
      attackSpeed: 0.65,
      attackRange: 380,
      moveSpeed: 3.3
    }
  },

  flora: {
    id: "flora",
    name: "Flora",
    title: "L Esprit de la Nature",
    role: "Support",
    color: "#22C55E",
    passive: {
      name: "Rosée Vivifiante",
      description: "Utiliser une compétence soigne les alliés proches de 4% de leurs PV manquants et les accélère.",
      icon: "🌸"
    },
    spells: {
      q: {
        key: "q",
        name: "Spore Explosive",
        description: "Projette un bourgeon floral qui éclate au sol et enracine (Root 1.3s) les ennemis.",
        cooldown: 140,
        manaCost: 50,
        targetType: "area",
        range: 420,
        damage: 80,
        damageType: "magic",
        ratio: 0.6,
        icon: "🌺"
      },
      w: {
        key: "w",
        name: "Étreinte Sylvestre",
        description: "Soigne instantanément un allié ou soi-même de 120 PV et confère un bouclier de ronces.",
        cooldown: 160,
        manaCost: 70,
        targetType: "self",
        range: 0,
        icon: "🌿"
      },
      e: {
        key: "e",
        name: "Barrière de Ronces",
        description: "Fait surgir une muraille de lianes infranchissable pendant 3 secondes.",
        cooldown: 240,
        manaCost: 65,
        targetType: "skillshot",
        range: 300,
        icon: "🎋"
      },
      r: {
        key: "r",
        name: "Floraison Céleste",
        description: "Crée une immense clairière enchantée : soigne continuellement les alliés et endort les ennemis.",
        cooldown: 1100,
        manaCost: 100,
        targetType: "self",
        range: 380,
        damage: 150,
        damageType: "magic",
        ratio: 0.5,
        icon: "🌻"
      }
    },
    baseStats: {
      hp: 530,
      hpRegen: 1.3,
      mana: 440,
      manaRegen: 4.0,
      attackDamage: 48,
      abilityPower: 15,
      armor: 25,
      magicResist: 30,
      attackSpeed: 0.64,
      attackRange: 450,
      moveSpeed: 3.25
    }
  },

  gromm: {
    id: "gromm",
    name: "Gromm",
    title: "Le Berserker Sauvage",
    role: "Fighter",
    color: "#DC2626",
    passive: {
      name: "Rage Sanguinaire",
      description: "Plus Gromm perd de PV, plus il gagne de vol de vie (jusqu à +45%) et de vitesse d attaque (+60%).",
      icon: "🩸"
    },
    spells: {
      q: {
        key: "q",
        name: "Hache Circulaire",
        description: "Tourbillon de haches autour de lui : inflige des dégâts et se soigne de 40% des dégâts infligés.",
        cooldown: 90,
        manaCost: 35,
        targetType: "self",
        range: 190,
        damage: 85,
        damageType: "physical",
        ratio: 0.8,
        icon: "🪓"
      },
      w: {
        key: "w",
        name: "Cri Intimidant",
        description: "Pousse un rugissement bestial réduisant l attaque ennemie de 30% et les ralentissant.",
        cooldown: 180,
        manaCost: 40,
        targetType: "self",
        range: 240,
        icon: "🦁"
      },
      e: {
        key: "e",
        name: "Ruée Inarrêtable",
        description: "Bondit sur la zone ciblée en devenant insensible aux étourdissements pendant le saut.",
        cooldown: 200,
        manaCost: 50,
        targetType: "dash",
        range: 320,
        damage: 90,
        damageType: "physical",
        ratio: 0.7,
        icon: "🏃"
      },
      r: {
        key: "r",
        name: "Furie Immortelle",
        description: "Entre dans une transe berserk de 5s : ses PV ne peuvent pas descendre sous 1 et sa vitesse double.",
        cooldown: 1100,
        manaCost: 0,
        targetType: "self",
        range: 0,
        icon: "👹"
      }
    },
    baseStats: {
      hp: 670,
      hpRegen: 2.2,
      mana: 250,
      manaRegen: 1.5,
      attackDamage: 70,
      abilityPower: 0,
      armor: 36,
      magicResist: 32,
      attackSpeed: 0.68,
      attackRange: 150,
      moveSpeed: 3.35
    }
  },

  chronos: {
    id: "chronos",
    name: "Chronos",
    title: "Le Maître du Temps",
    role: "Mage",
    color: "#EAB308",
    passive: {
      name: "Décalage Temporel",
      description: "Lorsqu il subit des dégâts mortels, entre en stase dorée invulnérable pendant 2s et revient avec 25% de PV.",
      icon: "⏳"
    },
    spells: {
      q: {
        key: "q",
        name: "Sphère Temporelle",
        description: "Génère une bulle où le temps s étire : les tirs et champions ennemis avancent à 30% de vitesse.",
        cooldown: 150,
        manaCost: 50,
        targetType: "area",
        range: 420,
        damage: 75,
        damageType: "magic",
        ratio: 0.6,
        icon: "🔮"
      },
      w: {
        key: "w",
        name: "Accélération Chrono",
        description: "Accélère considérablement un allié (+50% vitesse de course et recharge des sorts accélérée).",
        cooldown: 200,
        manaCost: 60,
        targetType: "self",
        range: 0,
        icon: "⏩"
      },
      e: {
        key: "e",
        name: "Faille Temporelle",
        description: "Pose un ancrage temporel. Réactiver dans les 4s le téléporte à son point de départ avec ses PV de l époque.",
        cooldown: 260,
        manaCost: 65,
        targetType: "self",
        range: 0,
        icon: "🌀"
      },
      r: {
        key: "r",
        name: "Arrêt du Temps",
        description: "Fige complètement le temps dans une grande zone pendant 2.5s : sbires, tourelles et ennemis sont immobiles !",
        cooldown: 1200,
        manaCost: 100,
        targetType: "area",
        range: 500,
        damage: 200,
        damageType: "magic",
        ratio: 0.8,
        icon: "⏱️"
      }
    },
    baseStats: {
      hp: 540,
      hpRegen: 1.2,
      mana: 440,
      manaRegen: 3.8,
      attackDamage: 50,
      abilityPower: 20,
      armor: 26,
      magicResist: 30,
      attackSpeed: 0.66,
      attackRange: 460,
      moveSpeed: 3.2
    }
  },

  valkyrie: {
    id: "valkyrie",
    name: "Valkyrie",
    title: "L Infiltratrice Volante",
    role: "Assassin",
    color: "#FB923C",
    passive: {
      name: "Ailes Anti-Gravité",
      description: "Survole les rivières et obstacles de terrain sans aucune pénalité de déplacement.",
      icon: "🦅"
    },
    spells: {
      q: {
        key: "q",
        name: "Tir de Roquettes",
        description: "Tire 4 micro-roquettes à tête chercheuse ciblant les ennemis les plus proches.",
        cooldown: 90,
        manaCost: 40,
        targetType: "skillshot",
        range: 400,
        damage: 90,
        damageType: "physical",
        ratio: 0.75,
        icon: "🚀"
      },
      w: {
        key: "w",
        name: "Flashbang Photonique",
        description: "Grenade aveuglante : les ennemis touchés ratent leurs tirs et perdent la vision pendant 1.5s.",
        cooldown: 190,
        manaCost: 50,
        targetType: "area",
        range: 300,
        damage: 60,
        damageType: "magic",
        ratio: 0.4,
        icon: "💡"
      },
      e: {
        key: "e",
        name: "Piqué Aérien",
        description: "Plonge des cieux sur la zone d impact, écrasant les ennemis et les étourdissant 0.8s.",
        cooldown: 170,
        manaCost: 55,
        targetType: "dash",
        range: 340,
        damage: 85,
        damageType: "physical",
        ratio: 0.7,
        icon: "☄️"
      },
      r: {
        key: "r",
        name: "Frappe Nucléaire Tactique",
        description: "Désigne une balise laser au sol : une ogive tactique explose après 1.5s dans un rayon colossal !",
        cooldown: 1200,
        manaCost: 100,
        targetType: "area",
        range: 650,
        damage: 400,
        damageType: "true",
        ratio: 1.1,
        icon: "☢️"
      }
    },
    baseStats: {
      hp: 570,
      hpRegen: 1.6,
      mana: 340,
      manaRegen: 2.5,
      attackDamage: 64,
      abilityPower: 0,
      armor: 30,
      magicResist: 30,
      attackSpeed: 0.71,
      attackRange: 380,
      moveSpeed: 3.5
    }
  }
};

export const MOBA_ITEMS: Record<string, MobaItem> = {
  boots: {
    id: "boots",
    name: "Bottes de Vitesse",
    description: "+45 Vitesse de déplacement",
    cost: 300,
    icon: "👢",
    stats: { moveSpeed: 0.45 }
  },
  infinity_edge: {
    id: "infinity_edge",
    name: "Lame d Infini",
    description: "+65 Dégâts d attaque, +25% Vitesse d attaque",
    cost: 1300,
    icon: "🗡️",
    stats: { attackDamage: 65, attackSpeed: 0.25 }
  },
  rabadon: {
    id: "rabadon",
    name: "Coiffe de Rabadon",
    description: "+90 Puissance magique, +200 Mana",
    cost: 1300,
    icon: "🧙",
    stats: { abilityPower: 90, mana: 200 }
  },
  frozen_heart: {
    id: "frozen_heart",
    name: "Cœur Gelé",
    description: "+55 Armure, +350 PV",
    cost: 1100,
    icon: "❄️",
    stats: { armor: 55, hp: 350 }
  },
  bloodthirster: {
    id: "bloodthirster",
    name: "Soif-de-Sang",
    description: "+50 Dégâts d attaque, +20% Vol de vie",
    cost: 1250,
    icon: "🩸",
    stats: { attackDamage: 50, lifesteal: 0.20 }
  },
  spirit_visage: {
    id: "spirit_visage",
    name: "Visage Spirituel",
    description: "+450 PV, +50 Résistance magique",
    cost: 1150,
    icon: "🛡️",
    stats: { hp: 450, magicResist: 50 }
  },
  trinity: {
    id: "trinity",
    name: "Force de la Trinité",
    description: "+35 AD, +35 AP, +250 PV, +0.3 Vitesse",
    cost: 1400,
    icon: "🔱",
    stats: { attackDamage: 35, abilityPower: 35, hp: 250, moveSpeed: 0.3 }
  }
};
