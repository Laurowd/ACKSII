import rules from '../data/acksRules.json'

export const RAW_DEFAULT_CLASSES = [
  {
    "name": "Fighter",
    "hitDie": "1d8",
    "conBonus": true,
    "xpPerLevel": [
      0,
      2000,
      4000,
      8000,
      16000,
      32000,
      65000,
      130000,
      250000,
      370000,
      490000,
      610000,
      730000,
      850000
    ],
    "titles": [
      "Man-at-Arms",
      "Warrior",
      "Swordmaster",
      "Hero",
      "Exemplar",
      "Myrmidon",
      "Champion",
      "Epic Hero",
      "Warlord",
      "Warlord (10)",
      "Warlord (11)",
      "Warlord (12)",
      "Warlord (13)",
      "Overlord"
    ],
    "attackThrows": [
      10,
      9,
      9,
      8,
      7,
      7,
      6,
      5,
      5,
      4,
      3,
      3,
      2,
      1
    ],
    "savingThrows": [
      {
        "level": 1,
        "paralysis": 13,
        "death": 14,
        "blast": 15,
        "implements": 16,
        "spells": 17
      },
      {
        "level": 2,
        "paralysis": 12,
        "death": 13,
        "blast": 14,
        "implements": 15,
        "spells": 16
      },
      {
        "level": 3,
        "paralysis": 12,
        "death": 13,
        "blast": 14,
        "implements": 15,
        "spells": 16
      },
      {
        "level": 4,
        "paralysis": 11,
        "death": 12,
        "blast": 13,
        "implements": 14,
        "spells": 15
      },
      {
        "level": 5,
        "paralysis": 10,
        "death": 11,
        "blast": 12,
        "implements": 13,
        "spells": 14
      },
      {
        "level": 6,
        "paralysis": 10,
        "death": 11,
        "blast": 12,
        "implements": 13,
        "spells": 14
      },
      {
        "level": 7,
        "paralysis": 9,
        "death": 10,
        "blast": 11,
        "implements": 12,
        "spells": 13
      },
      {
        "level": 8,
        "paralysis": 8,
        "death": 9,
        "blast": 10,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 9,
        "paralysis": 8,
        "death": 9,
        "blast": 10,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 10,
        "paralysis": 7,
        "death": 8,
        "blast": 9,
        "implements": 10,
        "spells": 11
      },
      {
        "level": 11,
        "paralysis": 6,
        "death": 7,
        "blast": 8,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 12,
        "paralysis": 6,
        "death": 7,
        "blast": 8,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 13,
        "paralysis": 5,
        "death": 6,
        "blast": 7,
        "implements": 8,
        "spells": 9
      },
      {
        "level": 14,
        "paralysis": 4,
        "death": 5,
        "blast": 6,
        "implements": 7,
        "spells": 8
      }
    ]
  },
  {
    "name": "Explorer",
    "hitDie": "1d6",
    "conBonus": true,
    "xpPerLevel": [
      0,
      2000,
      4000,
      8000,
      16000,
      32000,
      65000,
      130000,
      250000,
      370000,
      490000,
      610000,
      730000,
      850000
    ],
    "titles": [
      "Scout",
      "Outrider",
      "Forester",
      "Explorer",
      "Guide",
      "Tracker",
      "Wayfinder",
      "Ranger",
      "Warden",
      "Warden (10)",
      "Warden (11)",
      "Warden (12)",
      "Warden (13)",
      "Lord Warden"
    ],
    "attackThrows": [
      10,
      9,
      9,
      8,
      7,
      7,
      6,
      5,
      5,
      4,
      3,
      3,
      2,
      1
    ],
    "savingThrows": [
      {
        "level": 1,
        "paralysis": 13,
        "death": 14,
        "blast": 15,
        "implements": 16,
        "spells": 17
      },
      {
        "level": 2,
        "paralysis": 12,
        "death": 13,
        "blast": 14,
        "implements": 15,
        "spells": 16
      },
      {
        "level": 3,
        "paralysis": 12,
        "death": 13,
        "blast": 14,
        "implements": 15,
        "spells": 16
      },
      {
        "level": 4,
        "paralysis": 11,
        "death": 12,
        "blast": 13,
        "implements": 14,
        "spells": 15
      },
      {
        "level": 5,
        "paralysis": 10,
        "death": 11,
        "blast": 12,
        "implements": 13,
        "spells": 14
      },
      {
        "level": 6,
        "paralysis": 10,
        "death": 11,
        "blast": 12,
        "implements": 13,
        "spells": 14
      },
      {
        "level": 7,
        "paralysis": 9,
        "death": 10,
        "blast": 11,
        "implements": 12,
        "spells": 13
      },
      {
        "level": 8,
        "paralysis": 8,
        "death": 9,
        "blast": 10,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 9,
        "paralysis": 8,
        "death": 9,
        "blast": 10,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 10,
        "paralysis": 7,
        "death": 8,
        "blast": 9,
        "implements": 10,
        "spells": 11
      },
      {
        "level": 11,
        "paralysis": 6,
        "death": 7,
        "blast": 8,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 12,
        "paralysis": 6,
        "death": 7,
        "blast": 8,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 13,
        "paralysis": 5,
        "death": 6,
        "blast": 7,
        "implements": 8,
        "spells": 9
      },
      {
        "level": 14,
        "paralysis": 4,
        "death": 5,
        "blast": 6,
        "implements": 7,
        "spells": 8
      }
    ]
  },
  {
    "name": "Thief",
    "hitDie": "1d4",
    "conBonus": true,
    "xpPerLevel": [
      0,
      1250,
      2500,
      5000,
      10000,
      20000,
      40000,
      80000,
      180000,
      280000,
      380000,
      480000,
      580000,
      680000
    ],
    "titles": [
      "Footpad",
      "Hood",
      "Robber",
      "Burglar",
      "Rogue",
      "Scoundrel",
      "Pilferer",
      "Thief",
      "Master Thief",
      "Master Thief (10)",
      "Master Thief (11)",
      "Master Thief (12)",
      "Master Thief (13)",
      "Prince of Thieves"
    ],
    "attackThrows": [
      10,
      10,
      9,
      9,
      8,
      8,
      7,
      7,
      6,
      6,
      5,
      5,
      4,
      4
    ],
    "savingThrows": [
      {
        "level": 1,
        "paralysis": 13,
        "death": 13,
        "blast": 13,
        "implements": 14,
        "spells": 15
      },
      {
        "level": 2,
        "paralysis": 13,
        "death": 13,
        "blast": 13,
        "implements": 14,
        "spells": 15
      },
      {
        "level": 3,
        "paralysis": 12,
        "death": 12,
        "blast": 12,
        "implements": 13,
        "spells": 14
      },
      {
        "level": 4,
        "paralysis": 12,
        "death": 12,
        "blast": 12,
        "implements": 13,
        "spells": 14
      },
      {
        "level": 5,
        "paralysis": 11,
        "death": 11,
        "blast": 11,
        "implements": 12,
        "spells": 13
      },
      {
        "level": 6,
        "paralysis": 11,
        "death": 11,
        "blast": 11,
        "implements": 12,
        "spells": 13
      },
      {
        "level": 7,
        "paralysis": 10,
        "death": 10,
        "blast": 10,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 8,
        "paralysis": 10,
        "death": 10,
        "blast": 10,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 9,
        "paralysis": 9,
        "death": 9,
        "blast": 9,
        "implements": 10,
        "spells": 11
      },
      {
        "level": 10,
        "paralysis": 9,
        "death": 9,
        "blast": 9,
        "implements": 10,
        "spells": 11
      },
      {
        "level": 11,
        "paralysis": 8,
        "death": 8,
        "blast": 8,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 12,
        "paralysis": 8,
        "death": 8,
        "blast": 8,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 13,
        "paralysis": 7,
        "death": 7,
        "blast": 7,
        "implements": 8,
        "spells": 9
      },
      {
        "level": 14,
        "paralysis": 7,
        "death": 7,
        "blast": 7,
        "implements": 8,
        "spells": 9
      }
    ]
  },
  {
    "name": "Mage",
    "hitDie": "1d4",
    "conBonus": true,
    "xpPerLevel": [
      0,
      2500,
      5000,
      10000,
      20000,
      40000,
      80000,
      160000,
      310000,
      460000,
      610000,
      760000,
      910000,
      1060000
    ],
    "titles": [
      "Arcanist",
      "Seer",
      "Theurgist",
      "Magician",
      "Thaumaturge",
      "Enchanter",
      "Sorcerer",
      "Mage",
      "Wizard",
      "Wizard (10)",
      "Wizard (11)",
      "Wizard (12)",
      "Wizard (13)",
      "Archmage"
    ],
    "attackThrows": [
      10,
      10,
      10,
      9,
      9,
      9,
      8,
      8,
      8,
      7,
      7,
      7,
      6,
      6
    ],
    "savingThrows": [
      {
        "level": 1,
        "paralysis": 13,
        "death": 13,
        "blast": 15,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 2,
        "paralysis": 13,
        "death": 13,
        "blast": 15,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 3,
        "paralysis": 13,
        "death": 13,
        "blast": 15,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 4,
        "paralysis": 12,
        "death": 12,
        "blast": 14,
        "implements": 10,
        "spells": 11
      },
      {
        "level": 5,
        "paralysis": 12,
        "death": 12,
        "blast": 14,
        "implements": 10,
        "spells": 11
      },
      {
        "level": 6,
        "paralysis": 12,
        "death": 12,
        "blast": 14,
        "implements": 10,
        "spells": 11
      },
      {
        "level": 7,
        "paralysis": 11,
        "death": 11,
        "blast": 13,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 8,
        "paralysis": 11,
        "death": 11,
        "blast": 13,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 9,
        "paralysis": 11,
        "death": 11,
        "blast": 13,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 10,
        "paralysis": 10,
        "death": 10,
        "blast": 12,
        "implements": 8,
        "spells": 9
      },
      {
        "level": 11,
        "paralysis": 10,
        "death": 10,
        "blast": 12,
        "implements": 8,
        "spells": 9
      },
      {
        "level": 12,
        "paralysis": 10,
        "death": 10,
        "blast": 12,
        "implements": 8,
        "spells": 9
      },
      {
        "level": 13,
        "paralysis": 9,
        "death": 9,
        "blast": 11,
        "implements": 7,
        "spells": 8
      },
      {
        "level": 14,
        "paralysis": 9,
        "death": 9,
        "blast": 11,
        "implements": 7,
        "spells": 8
      }
    ]
  },
  {
    "name": "Crusader",
    "hitDie": "1d6",
    "conBonus": true,
    "xpPerLevel": [
      0,
      1500,
      3000,
      6000,
      12000,
      24000,
      50000,
      100000,
      200000,
      300000,
      400000,
      500000,
      600000,
      700000
    ],
    "titles": [
      "Catechist",
      "Acolyte",
      "Priest",
      "Curate",
      "Vicar",
      "Rector",
      "Prelate",
      "Bishop",
      "Patriarch",
      "Patriarch (10)",
      "Patriarch (11)",
      "Patriarch (12)",
      "Patriarch (13)",
      "Theocrat"
    ],
    "attackThrows": [
      10,
      10,
      9,
      9,
      8,
      8,
      7,
      7,
      6,
      6,
      5,
      5,
      4,
      4
    ],
    "savingThrows": [
      {
        "level": 1,
        "paralysis": 13,
        "death": 10,
        "blast": 16,
        "implements": 13,
        "spells": 15
      },
      {
        "level": 2,
        "paralysis": 13,
        "death": 10,
        "blast": 16,
        "implements": 13,
        "spells": 15
      },
      {
        "level": 3,
        "paralysis": 12,
        "death": 9,
        "blast": 15,
        "implements": 12,
        "spells": 14
      },
      {
        "level": 4,
        "paralysis": 12,
        "death": 9,
        "blast": 15,
        "implements": 12,
        "spells": 14
      },
      {
        "level": 5,
        "paralysis": 11,
        "death": 8,
        "blast": 14,
        "implements": 11,
        "spells": 13
      },
      {
        "level": 6,
        "paralysis": 11,
        "death": 8,
        "blast": 14,
        "implements": 11,
        "spells": 13
      },
      {
        "level": 7,
        "paralysis": 10,
        "death": 7,
        "blast": 13,
        "implements": 10,
        "spells": 12
      },
      {
        "level": 8,
        "paralysis": 10,
        "death": 7,
        "blast": 13,
        "implements": 10,
        "spells": 12
      },
      {
        "level": 9,
        "paralysis": 9,
        "death": 6,
        "blast": 12,
        "implements": 9,
        "spells": 11
      },
      {
        "level": 10,
        "paralysis": 9,
        "death": 6,
        "blast": 12,
        "implements": 9,
        "spells": 11
      },
      {
        "level": 11,
        "paralysis": 8,
        "death": 5,
        "blast": 11,
        "implements": 8,
        "spells": 10
      },
      {
        "level": 12,
        "paralysis": 8,
        "death": 5,
        "blast": 11,
        "implements": 8,
        "spells": 10
      },
      {
        "level": 13,
        "paralysis": 7,
        "death": 4,
        "blast": 10,
        "implements": 7,
        "spells": 9
      },
      {
        "level": 14,
        "paralysis": 7,
        "death": 4,
        "blast": 10,
        "implements": 7,
        "spells": 9
      }
    ]
  },
  {
    "name": "Venturer",
    "hitDie": "1d6",
    "conBonus": true,
    "xpPerLevel": [
      0,
      1500,
      3000,
      6000,
      12000,
      24000,
      50000,
      100000,
      200000,
      300000,
      400000,
      500000,
      600000,
      700000
    ],
    "titles": [
      "Tinker",
      "Trader",
      "Arbitrager",
      "Commissary",
      "Mercantilist",
      "Enterpriser",
      "Venturer",
      "Merchant Venturer",
      "Merchant Prince",
      "Merchant Prince (10)",
      "Merchant Prince (11)",
      "Merchant Prince (12)",
      "Merchant Prince (13)",
      "Mogul"
    ],
    "attackThrows": [
      10,
      10,
      9,
      9,
      8,
      8,
      7,
      7,
      6,
      6,
      5,
      5,
      4,
      4
    ],
    "savingThrows": [
      {
        "level": 1,
        "paralysis": 13,
        "death": 13,
        "blast": 13,
        "implements": 14,
        "spells": 15
      },
      {
        "level": 2,
        "paralysis": 13,
        "death": 13,
        "blast": 13,
        "implements": 14,
        "spells": 15
      },
      {
        "level": 3,
        "paralysis": 12,
        "death": 12,
        "blast": 12,
        "implements": 13,
        "spells": 14
      },
      {
        "level": 4,
        "paralysis": 12,
        "death": 12,
        "blast": 12,
        "implements": 13,
        "spells": 14
      },
      {
        "level": 5,
        "paralysis": 11,
        "death": 11,
        "blast": 11,
        "implements": 12,
        "spells": 13
      },
      {
        "level": 6,
        "paralysis": 11,
        "death": 11,
        "blast": 11,
        "implements": 12,
        "spells": 13
      },
      {
        "level": 7,
        "paralysis": 10,
        "death": 10,
        "blast": 10,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 8,
        "paralysis": 10,
        "death": 10,
        "blast": 10,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 9,
        "paralysis": 9,
        "death": 9,
        "blast": 9,
        "implements": 10,
        "spells": 11
      },
      {
        "level": 10,
        "paralysis": 9,
        "death": 9,
        "blast": 9,
        "implements": 10,
        "spells": 11
      },
      {
        "level": 11,
        "paralysis": 8,
        "death": 8,
        "blast": 8,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 12,
        "paralysis": 8,
        "death": 8,
        "blast": 8,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 13,
        "paralysis": 7,
        "death": 7,
        "blast": 7,
        "implements": 8,
        "spells": 9
      },
      {
        "level": 14,
        "paralysis": 7,
        "death": 7,
        "blast": 7,
        "implements": 8,
        "spells": 9
      }
    ]
  },
  {
    "name": "Assassin",
    "hitDie": "1d6",
    "conBonus": true,
    "xpPerLevel": [
      0,
      1750,
      3500,
      7000,
      14000,
      28000,
      55000,
      110000,
      230000,
      350000,
      470000,
      590000,
      710000,
      830000
    ],
    "titles": [
      "Thug",
      "Enforcer",
      "Torturer",
      "Slayer",
      "Destroyer",
      "Executioner",
      "Blackguard",
      "Assassin",
      "Master Assassin",
      "Master Assassin (10)",
      "Master Assassin (11)",
      "Master Assassin (12)",
      "Master Assassin (13)",
      "Grandfather of Assassins"
    ],
    "attackThrows": [
      10,
      9,
      9,
      8,
      7,
      7,
      6,
      5,
      5,
      4,
      3,
      3,
      2,
      1
    ],
    "savingThrows": [
      {
        "level": 1,
        "paralysis": 13,
        "death": 14,
        "blast": 15,
        "implements": 16,
        "spells": 17
      },
      {
        "level": 2,
        "paralysis": 12,
        "death": 13,
        "blast": 14,
        "implements": 15,
        "spells": 16
      },
      {
        "level": 3,
        "paralysis": 12,
        "death": 13,
        "blast": 14,
        "implements": 15,
        "spells": 16
      },
      {
        "level": 4,
        "paralysis": 11,
        "death": 12,
        "blast": 13,
        "implements": 14,
        "spells": 15
      },
      {
        "level": 5,
        "paralysis": 10,
        "death": 11,
        "blast": 12,
        "implements": 13,
        "spells": 14
      },
      {
        "level": 6,
        "paralysis": 10,
        "death": 11,
        "blast": 12,
        "implements": 13,
        "spells": 14
      },
      {
        "level": 7,
        "paralysis": 9,
        "death": 10,
        "blast": 11,
        "implements": 12,
        "spells": 13
      },
      {
        "level": 8,
        "paralysis": 8,
        "death": 9,
        "blast": 10,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 9,
        "paralysis": 8,
        "death": 9,
        "blast": 10,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 10,
        "paralysis": 7,
        "death": 8,
        "blast": 9,
        "implements": 10,
        "spells": 11
      },
      {
        "level": 11,
        "paralysis": 6,
        "death": 7,
        "blast": 8,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 12,
        "paralysis": 6,
        "death": 7,
        "blast": 8,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 13,
        "paralysis": 5,
        "death": 6,
        "blast": 7,
        "implements": 8,
        "spells": 9
      },
      {
        "level": 14,
        "paralysis": 4,
        "death": 5,
        "blast": 6,
        "implements": 7,
        "spells": 8
      }
    ]
  },
  {
    "name": "Barbarian",
    "hitDie": "1d8",
    "conBonus": true,
    "xpPerLevel": [
      0,
      2250,
      4500,
      9000,
      18000,
      36000,
      70000,
      140000,
      260000,
      380000,
      500000,
      620000,
      740000,
      860000
    ],
    "titles": [
      "Hunter",
      "Raider",
      "Marauder",
      "Plunderer",
      "Reaver",
      "Bloodletter",
      "Menace",
      "Scourge",
      "Warchief",
      "Warchief (10)",
      "Warchief (11)",
      "Warchief (12)",
      "Warchief (13)",
      "Great Chieftain"
    ],
    "attackThrows": [
      10,
      9,
      9,
      8,
      7,
      7,
      6,
      5,
      5,
      4,
      3,
      3,
      2,
      1
    ],
    "savingThrows": [
      {
        "level": 1,
        "paralysis": 13,
        "death": 14,
        "blast": 15,
        "implements": 16,
        "spells": 17
      },
      {
        "level": 2,
        "paralysis": 12,
        "death": 13,
        "blast": 14,
        "implements": 15,
        "spells": 16
      },
      {
        "level": 3,
        "paralysis": 12,
        "death": 13,
        "blast": 14,
        "implements": 15,
        "spells": 16
      },
      {
        "level": 4,
        "paralysis": 11,
        "death": 12,
        "blast": 13,
        "implements": 14,
        "spells": 15
      },
      {
        "level": 5,
        "paralysis": 10,
        "death": 11,
        "blast": 12,
        "implements": 13,
        "spells": 14
      },
      {
        "level": 6,
        "paralysis": 10,
        "death": 11,
        "blast": 12,
        "implements": 13,
        "spells": 14
      },
      {
        "level": 7,
        "paralysis": 9,
        "death": 10,
        "blast": 11,
        "implements": 12,
        "spells": 13
      },
      {
        "level": 8,
        "paralysis": 8,
        "death": 9,
        "blast": 10,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 9,
        "paralysis": 8,
        "death": 9,
        "blast": 10,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 10,
        "paralysis": 7,
        "death": 8,
        "blast": 9,
        "implements": 10,
        "spells": 11
      },
      {
        "level": 11,
        "paralysis": 6,
        "death": 7,
        "blast": 8,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 12,
        "paralysis": 6,
        "death": 7,
        "blast": 8,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 13,
        "paralysis": 5,
        "death": 6,
        "blast": 7,
        "implements": 8,
        "spells": 9
      },
      {
        "level": 14,
        "paralysis": 4,
        "death": 5,
        "blast": 6,
        "implements": 7,
        "spells": 8
      }
    ]
  },
  {
    "name": "Bard",
    "hitDie": "1d4",
    "conBonus": true,
    "xpPerLevel": [
      0,
      1750,
      3500,
      7000,
      14000,
      28000,
      56000,
      110000,
      220000,
      320000,
      420000,
      520000,
      620000,
      720000
    ],
    "titles": [
      "Reciter",
      "Versifier",
      "Archivist",
      "Annalist",
      "Chronicler",
      "Panegyrist",
      "Skald",
      "Rhapsodist",
      "Bard",
      "Bard (10)",
      "Bard (11)",
      "Bard (12)",
      "Bard (13)",
      "Master Bard"
    ],
    "attackThrows": [
      10,
      9,
      9,
      8,
      7,
      7,
      6,
      5,
      5,
      4,
      3,
      3,
      2,
      1
    ],
    "savingThrows": [
      {
        "level": 1,
        "paralysis": 13,
        "death": 14,
        "blast": 15,
        "implements": 16,
        "spells": 17
      },
      {
        "level": 2,
        "paralysis": 12,
        "death": 13,
        "blast": 14,
        "implements": 15,
        "spells": 16
      },
      {
        "level": 3,
        "paralysis": 12,
        "death": 13,
        "blast": 14,
        "implements": 15,
        "spells": 16
      },
      {
        "level": 4,
        "paralysis": 11,
        "death": 12,
        "blast": 13,
        "implements": 14,
        "spells": 15
      },
      {
        "level": 5,
        "paralysis": 10,
        "death": 11,
        "blast": 12,
        "implements": 13,
        "spells": 14
      },
      {
        "level": 6,
        "paralysis": 10,
        "death": 11,
        "blast": 12,
        "implements": 13,
        "spells": 14
      },
      {
        "level": 7,
        "paralysis": 9,
        "death": 10,
        "blast": 11,
        "implements": 12,
        "spells": 13
      },
      {
        "level": 8,
        "paralysis": 8,
        "death": 9,
        "blast": 10,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 9,
        "paralysis": 8,
        "death": 9,
        "blast": 10,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 10,
        "paralysis": 7,
        "death": 8,
        "blast": 9,
        "implements": 10,
        "spells": 11
      },
      {
        "level": 11,
        "paralysis": 6,
        "death": 7,
        "blast": 8,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 12,
        "paralysis": 6,
        "death": 7,
        "blast": 8,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 13,
        "paralysis": 5,
        "death": 6,
        "blast": 7,
        "implements": 8,
        "spells": 9
      },
      {
        "level": 14,
        "paralysis": 4,
        "death": 5,
        "blast": 6,
        "implements": 7,
        "spells": 8
      }
    ]
  },
  {
    "name": "Bladedancer",
    "hitDie": "1d6",
    "conBonus": true,
    "xpPerLevel": [
      0,
      1500,
      3000,
      6000,
      12000,
      24000,
      50000,
      100000,
      200000,
      300000,
      400000,
      500000,
      600000,
      700000
    ],
    "titles": [
      "Blade-Initiate",
      "Blade-Daughter",
      "Blade-Singer",
      "Blade-Weaver",
      "Blade-Sister",
      "Blade-Adept",
      "Blade-Dancer",
      "Blade-Priestess",
      "Blade-Mistress",
      "Blade-Mistress (10)",
      "Blade-Mistress (11)",
      "Blade-Mistress (12)",
      "Blade-Mistress (13)",
      "Mistress of All Blades"
    ],
    "attackThrows": [
      10,
      10,
      9,
      9,
      8,
      8,
      7,
      7,
      6,
      6,
      5,
      5,
      4,
      4
    ],
    "savingThrows": [
      {
        "level": 1,
        "paralysis": 13,
        "death": 10,
        "blast": 16,
        "implements": 13,
        "spells": 15
      },
      {
        "level": 2,
        "paralysis": 13,
        "death": 10,
        "blast": 16,
        "implements": 13,
        "spells": 15
      },
      {
        "level": 3,
        "paralysis": 12,
        "death": 9,
        "blast": 15,
        "implements": 12,
        "spells": 14
      },
      {
        "level": 4,
        "paralysis": 12,
        "death": 9,
        "blast": 15,
        "implements": 12,
        "spells": 14
      },
      {
        "level": 5,
        "paralysis": 11,
        "death": 8,
        "blast": 14,
        "implements": 11,
        "spells": 13
      },
      {
        "level": 6,
        "paralysis": 11,
        "death": 8,
        "blast": 14,
        "implements": 11,
        "spells": 13
      },
      {
        "level": 7,
        "paralysis": 10,
        "death": 7,
        "blast": 13,
        "implements": 10,
        "spells": 12
      },
      {
        "level": 8,
        "paralysis": 10,
        "death": 7,
        "blast": 13,
        "implements": 10,
        "spells": 12
      },
      {
        "level": 9,
        "paralysis": 9,
        "death": 6,
        "blast": 12,
        "implements": 9,
        "spells": 11
      },
      {
        "level": 10,
        "paralysis": 9,
        "death": 6,
        "blast": 12,
        "implements": 9,
        "spells": 11
      },
      {
        "level": 11,
        "paralysis": 8,
        "death": 5,
        "blast": 11,
        "implements": 8,
        "spells": 10
      },
      {
        "level": 12,
        "paralysis": 8,
        "death": 5,
        "blast": 11,
        "implements": 8,
        "spells": 10
      },
      {
        "level": 13,
        "paralysis": 7,
        "death": 4,
        "blast": 10,
        "implements": 7,
        "spells": 9
      },
      {
        "level": 14,
        "paralysis": 7,
        "death": 4,
        "blast": 10,
        "implements": 7,
        "spells": 9
      }
    ]
  },
  {
    "name": "Paladin",
    "hitDie": "1d8",
    "conBonus": true,
    "xpPerLevel": [
      0,
      2500,
      5000,
      10000,
      20000,
      40000,
      80000,
      160000,
      280000,
      400000,
      520000,
      640000,
      760000,
      880000
    ],
    "titles": [
      "Bulwark",
      "Warder",
      "Defender",
      "Protector",
      "Guardian",
      "Sentinel",
      "Justiciar",
      "Paladin",
      "Paladin Lord",
      "Paladin Lord (10)",
      "Paladin Lord (11)",
      "Paladin Lord (12)",
      "Paladin Lord (13)",
      "Lord Protector"
    ],
    "attackThrows": [
      10,
      9,
      9,
      8,
      7,
      7,
      6,
      5,
      5,
      4,
      3,
      3,
      2,
      1
    ],
    "savingThrows": [
      {
        "level": 1,
        "paralysis": 13,
        "death": 14,
        "blast": 15,
        "implements": 16,
        "spells": 17
      },
      {
        "level": 2,
        "paralysis": 12,
        "death": 13,
        "blast": 14,
        "implements": 15,
        "spells": 16
      },
      {
        "level": 3,
        "paralysis": 12,
        "death": 13,
        "blast": 14,
        "implements": 15,
        "spells": 16
      },
      {
        "level": 4,
        "paralysis": 11,
        "death": 12,
        "blast": 13,
        "implements": 14,
        "spells": 15
      },
      {
        "level": 5,
        "paralysis": 10,
        "death": 11,
        "blast": 12,
        "implements": 13,
        "spells": 14
      },
      {
        "level": 6,
        "paralysis": 10,
        "death": 11,
        "blast": 12,
        "implements": 13,
        "spells": 14
      },
      {
        "level": 7,
        "paralysis": 9,
        "death": 10,
        "blast": 11,
        "implements": 12,
        "spells": 13
      },
      {
        "level": 8,
        "paralysis": 8,
        "death": 9,
        "blast": 10,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 9,
        "paralysis": 8,
        "death": 9,
        "blast": 10,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 10,
        "paralysis": 7,
        "death": 8,
        "blast": 9,
        "implements": 10,
        "spells": 11
      },
      {
        "level": 11,
        "paralysis": 6,
        "death": 7,
        "blast": 8,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 12,
        "paralysis": 6,
        "death": 7,
        "blast": 8,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 13,
        "paralysis": 5,
        "death": 6,
        "blast": 7,
        "implements": 8,
        "spells": 9
      },
      {
        "level": 14,
        "paralysis": 4,
        "death": 5,
        "blast": 6,
        "implements": 7,
        "spells": 8
      }
    ]
  },
  {
    "name": "Priestess",
    "hitDie": "1d4",
    "conBonus": true,
    "xpPerLevel": [
      0,
      2000,
      4000,
      8000,
      16000,
      32000,
      65000,
      130000,
      230000,
      330000,
      430000,
      530000,
      630000,
      730000
    ],
    "titles": [
      "Novice",
      "Daughter",
      "Sister-Initiate",
      "Sister",
      "Sister-Disciple",
      "Priestess",
      "Mother",
      "Revered Mother",
      "Matriarch",
      "Matriarch (10)",
      "Matriarch (11)",
      "Matriarch (12)",
      "Matriarch (13)",
      "High Priestess"
    ],
    "attackThrows": [
      10,
      10,
      10,
      9,
      9,
      9,
      8,
      8,
      8,
      7,
      7,
      7,
      6,
      6
    ],
    "savingThrows": [
      {
        "level": 1,
        "paralysis": 13,
        "death": 10,
        "blast": 16,
        "implements": 13,
        "spells": 15
      },
      {
        "level": 2,
        "paralysis": 13,
        "death": 10,
        "blast": 16,
        "implements": 13,
        "spells": 15
      },
      {
        "level": 3,
        "paralysis": 12,
        "death": 9,
        "blast": 15,
        "implements": 12,
        "spells": 14
      },
      {
        "level": 4,
        "paralysis": 12,
        "death": 9,
        "blast": 15,
        "implements": 12,
        "spells": 14
      },
      {
        "level": 5,
        "paralysis": 11,
        "death": 8,
        "blast": 14,
        "implements": 11,
        "spells": 13
      },
      {
        "level": 6,
        "paralysis": 11,
        "death": 8,
        "blast": 14,
        "implements": 11,
        "spells": 13
      },
      {
        "level": 7,
        "paralysis": 10,
        "death": 7,
        "blast": 13,
        "implements": 10,
        "spells": 12
      },
      {
        "level": 8,
        "paralysis": 10,
        "death": 7,
        "blast": 13,
        "implements": 10,
        "spells": 12
      },
      {
        "level": 9,
        "paralysis": 9,
        "death": 6,
        "blast": 12,
        "implements": 9,
        "spells": 11
      },
      {
        "level": 10,
        "paralysis": 9,
        "death": 6,
        "blast": 12,
        "implements": 9,
        "spells": 11
      },
      {
        "level": 11,
        "paralysis": 8,
        "death": 5,
        "blast": 11,
        "implements": 8,
        "spells": 10
      },
      {
        "level": 12,
        "paralysis": 8,
        "death": 5,
        "blast": 11,
        "implements": 8,
        "spells": 10
      },
      {
        "level": 13,
        "paralysis": 7,
        "death": 4,
        "blast": 10,
        "implements": 7,
        "spells": 9
      },
      {
        "level": 14,
        "paralysis": 7,
        "death": 4,
        "blast": 10,
        "implements": 7,
        "spells": 9
      }
    ]
  },
  {
    "name": "Shaman",
    "hitDie": "1d6",
    "conBonus": true,
    "xpPerLevel": [
      0,
      1500,
      3000,
      6000,
      12000,
      24000,
      50000,
      100000,
      200000,
      300000,
      400000,
      500000,
      600000,
      700000
    ],
    "titles": [
      "Spirit Whisperer",
      "Village Healer",
      "Tribal Priest",
      "Medicine Man",
      "Totem Bearer",
      "Witch Doctor",
      "Spirit Walker",
      "Tribal Elder",
      "Shaman",
      "Shaman (10)",
      "Shaman (11)",
      "Shaman (12)",
      "Shaman (13)",
      "Grandfather of Totems"
    ],
    "attackThrows": [
      10,
      10,
      9,
      9,
      8,
      8,
      7,
      7,
      6,
      6,
      5,
      5,
      4,
      4
    ],
    "savingThrows": [
      {
        "level": 1,
        "paralysis": 13,
        "death": 10,
        "blast": 16,
        "implements": 13,
        "spells": 15
      },
      {
        "level": 2,
        "paralysis": 13,
        "death": 10,
        "blast": 16,
        "implements": 13,
        "spells": 15
      },
      {
        "level": 3,
        "paralysis": 12,
        "death": 9,
        "blast": 15,
        "implements": 12,
        "spells": 14
      },
      {
        "level": 4,
        "paralysis": 12,
        "death": 9,
        "blast": 15,
        "implements": 12,
        "spells": 14
      },
      {
        "level": 5,
        "paralysis": 11,
        "death": 8,
        "blast": 14,
        "implements": 11,
        "spells": 13
      },
      {
        "level": 6,
        "paralysis": 11,
        "death": 8,
        "blast": 14,
        "implements": 11,
        "spells": 13
      },
      {
        "level": 7,
        "paralysis": 10,
        "death": 7,
        "blast": 13,
        "implements": 10,
        "spells": 12
      },
      {
        "level": 8,
        "paralysis": 10,
        "death": 7,
        "blast": 13,
        "implements": 10,
        "spells": 12
      },
      {
        "level": 9,
        "paralysis": 9,
        "death": 6,
        "blast": 12,
        "implements": 9,
        "spells": 11
      },
      {
        "level": 10,
        "paralysis": 9,
        "death": 6,
        "blast": 12,
        "implements": 9,
        "spells": 11
      },
      {
        "level": 11,
        "paralysis": 8,
        "death": 5,
        "blast": 11,
        "implements": 8,
        "spells": 10
      },
      {
        "level": 12,
        "paralysis": 8,
        "death": 5,
        "blast": 11,
        "implements": 8,
        "spells": 10
      },
      {
        "level": 13,
        "paralysis": 7,
        "death": 4,
        "blast": 10,
        "implements": 7,
        "spells": 9
      },
      {
        "level": 14,
        "paralysis": 7,
        "death": 4,
        "blast": 10,
        "implements": 7,
        "spells": 9
      }
    ]
  },
  {
    "name": "Warlock",
    "hitDie": "1d4",
    "conBonus": true,
    "xpPerLevel": [
      0,
      2500,
      5000,
      10000,
      20000,
      40000,
      80000,
      160000,
      310000,
      460000,
      610000,
      760000,
      910000,
      1060000
    ],
    "titles": [
      "Medium",
      "Occultist",
      "Spiritualist",
      "Hexgiver",
      "Cursebringer",
      "Maleficus",
      "Infernalist",
      "Warlock",
      "Dread Lord",
      "Dread Lord (10)",
      "Dread Lord (11)",
      "Dread Lord (12)",
      "Dread Lord (13)",
      "Dread King"
    ],
    "attackThrows": [
      10,
      10,
      10,
      9,
      9,
      9,
      8,
      8,
      8,
      7,
      7,
      7,
      6,
      6
    ],
    "savingThrows": [
      {
        "level": 1,
        "paralysis": 13,
        "death": 13,
        "blast": 15,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 2,
        "paralysis": 13,
        "death": 13,
        "blast": 15,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 3,
        "paralysis": 13,
        "death": 13,
        "blast": 15,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 4,
        "paralysis": 12,
        "death": 12,
        "blast": 14,
        "implements": 10,
        "spells": 11
      },
      {
        "level": 5,
        "paralysis": 12,
        "death": 12,
        "blast": 14,
        "implements": 10,
        "spells": 11
      },
      {
        "level": 6,
        "paralysis": 12,
        "death": 12,
        "blast": 14,
        "implements": 10,
        "spells": 11
      },
      {
        "level": 7,
        "paralysis": 11,
        "death": 11,
        "blast": 13,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 8,
        "paralysis": 11,
        "death": 11,
        "blast": 13,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 9,
        "paralysis": 11,
        "death": 11,
        "blast": 13,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 10,
        "paralysis": 10,
        "death": 10,
        "blast": 12,
        "implements": 8,
        "spells": 9
      },
      {
        "level": 11,
        "paralysis": 10,
        "death": 10,
        "blast": 12,
        "implements": 8,
        "spells": 9
      },
      {
        "level": 12,
        "paralysis": 10,
        "death": 10,
        "blast": 12,
        "implements": 8,
        "spells": 9
      },
      {
        "level": 13,
        "paralysis": 9,
        "death": 9,
        "blast": 11,
        "implements": 7,
        "spells": 8
      },
      {
        "level": 14,
        "paralysis": 9,
        "death": 9,
        "blast": 11,
        "implements": 7,
        "spells": 8
      }
    ]
  },
  {
    "name": "Witch",
    "hitDie": "1d4",
    "conBonus": true,
    "xpPerLevel": [
      0,
      2000,
      4000,
      8000,
      16000,
      32000,
      65000,
      130000,
      230000,
      330000,
      430000,
      530000,
      630000,
      730000
    ],
    "titles": [
      "Initiate",
      "Seeress",
      "Siren",
      "Pythoness",
      "Sibyl",
      "Enchantress",
      "Sorceress",
      "Incantrix",
      "Witch",
      "Witch (10)",
      "Witch (11)",
      "Witch (12)",
      "Witch (13)",
      "Witch Queen"
    ],
    "attackThrows": [
      10,
      10,
      10,
      9,
      9,
      9,
      8,
      8,
      8,
      7,
      7,
      7,
      6,
      6
    ],
    "savingThrows": [
      {
        "level": 1,
        "paralysis": 13,
        "death": 10,
        "blast": 16,
        "implements": 13,
        "spells": 15
      },
      {
        "level": 2,
        "paralysis": 13,
        "death": 10,
        "blast": 16,
        "implements": 13,
        "spells": 15
      },
      {
        "level": 3,
        "paralysis": 12,
        "death": 9,
        "blast": 15,
        "implements": 12,
        "spells": 14
      },
      {
        "level": 4,
        "paralysis": 12,
        "death": 9,
        "blast": 15,
        "implements": 12,
        "spells": 14
      },
      {
        "level": 5,
        "paralysis": 11,
        "death": 8,
        "blast": 14,
        "implements": 11,
        "spells": 13
      },
      {
        "level": 6,
        "paralysis": 11,
        "death": 8,
        "blast": 14,
        "implements": 11,
        "spells": 13
      },
      {
        "level": 7,
        "paralysis": 10,
        "death": 7,
        "blast": 13,
        "implements": 10,
        "spells": 12
      },
      {
        "level": 8,
        "paralysis": 10,
        "death": 7,
        "blast": 13,
        "implements": 10,
        "spells": 12
      },
      {
        "level": 9,
        "paralysis": 9,
        "death": 6,
        "blast": 12,
        "implements": 9,
        "spells": 11
      },
      {
        "level": 10,
        "paralysis": 9,
        "death": 6,
        "blast": 12,
        "implements": 9,
        "spells": 11
      },
      {
        "level": 11,
        "paralysis": 8,
        "death": 5,
        "blast": 11,
        "implements": 8,
        "spells": 10
      },
      {
        "level": 12,
        "paralysis": 8,
        "death": 5,
        "blast": 11,
        "implements": 8,
        "spells": 10
      },
      {
        "level": 13,
        "paralysis": 7,
        "death": 4,
        "blast": 10,
        "implements": 7,
        "spells": 9
      },
      {
        "level": 14,
        "paralysis": 7,
        "death": 4,
        "blast": 10,
        "implements": 7,
        "spells": 9
      }
    ]
  },
  {
    "name": "Dwarven Craftpriest",
    "hitDie": "1d6",
    "conBonus": true,
    "xpPerLevel": [
      0,
      2400,
      4800,
      9600,
      19200,
      38400,
      75000,
      150000,
      280000,
      410000,
      540000,
      670000,
      800000,
      930000
    ],
    "titles": [
      "Dwarven Craft-Catechist",
      "Dwarven Craft-Acolyte",
      "Dwarven Craft-Priest",
      "Dwarven Craft-Curate",
      "Dwarven Craft-Vicar",
      "Dwarven Craft-Rector",
      "Dwarven Craft-Prelate",
      "Dwarven Craft-Bishop",
      "Dwarven Craft-Lord",
      "Dwarven Craft-Lord (10)",
      "Dwarven Craft-Lord (11)",
      "Dwarven Craft-Lord (12)",
      "Dwarven Craft-Lord (13)",
      "Dwarven Craft-Lord (14)"
    ],
    "attackThrows": [
      10,
      10,
      9,
      9,
      8,
      8,
      7,
      7,
      6,
      6,
      5,
      5,
      4,
      4
    ],
    "savingThrows": [
      {
        "level": 1,
        "paralysis": 9,
        "death": 6,
        "blast": 13,
        "implements": 9,
        "spells": 11
      },
      {
        "level": 2,
        "paralysis": 9,
        "death": 6,
        "blast": 13,
        "implements": 9,
        "spells": 11
      },
      {
        "level": 3,
        "paralysis": 8,
        "death": 5,
        "blast": 12,
        "implements": 8,
        "spells": 10
      },
      {
        "level": 4,
        "paralysis": 8,
        "death": 5,
        "blast": 12,
        "implements": 8,
        "spells": 10
      },
      {
        "level": 5,
        "paralysis": 7,
        "death": 4,
        "blast": 11,
        "implements": 7,
        "spells": 9
      },
      {
        "level": 6,
        "paralysis": 7,
        "death": 4,
        "blast": 11,
        "implements": 7,
        "spells": 9
      },
      {
        "level": 7,
        "paralysis": 6,
        "death": 3,
        "blast": 10,
        "implements": 6,
        "spells": 8
      },
      {
        "level": 8,
        "paralysis": 6,
        "death": 3,
        "blast": 10,
        "implements": 6,
        "spells": 8
      },
      {
        "level": 9,
        "paralysis": 5,
        "death": 2,
        "blast": 9,
        "implements": 5,
        "spells": 7
      },
      {
        "level": 10,
        "paralysis": 5,
        "death": 2,
        "blast": 9,
        "implements": 5,
        "spells": 7
      },
      {
        "level": 11,
        "paralysis": 5,
        "death": 2,
        "blast": 9,
        "implements": 5,
        "spells": 7
      },
      {
        "level": 12,
        "paralysis": 5,
        "death": 2,
        "blast": 9,
        "implements": 5,
        "spells": 7
      },
      {
        "level": 13,
        "paralysis": 5,
        "death": 2,
        "blast": 9,
        "implements": 5,
        "spells": 7
      },
      {
        "level": 14,
        "paralysis": 5,
        "death": 2,
        "blast": 9,
        "implements": 5,
        "spells": 7
      }
    ]
  },
  {
    "name": "Dwarven Vaultguard",
    "hitDie": "1d8",
    "conBonus": true,
    "xpPerLevel": [
      0,
      2200,
      4400,
      8800,
      17500,
      35000,
      70000,
      140000,
      270000,
      400000,
      530000,
      660000,
      790000,
      920000
    ],
    "titles": [
      "Sentry",
      "Warden",
      "Shieldbearer",
      "Defender",
      "Sentinel",
      "Guardian",
      "Champion",
      "Vaultguard",
      "Vaultlord",
      "Vaultlord (10)",
      "Vaultlord (11)",
      "Vaultlord (12)",
      "Vaultlord (13)",
      "Vaultlord (14)"
    ],
    "attackThrows": [
      10,
      9,
      9,
      8,
      7,
      7,
      6,
      5,
      5,
      4,
      3,
      3,
      2,
      1
    ],
    "savingThrows": [
      {
        "level": 1,
        "paralysis": 9,
        "death": 10,
        "blast": 12,
        "implements": 12,
        "spells": 13
      },
      {
        "level": 2,
        "paralysis": 8,
        "death": 9,
        "blast": 11,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 3,
        "paralysis": 8,
        "death": 9,
        "blast": 11,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 4,
        "paralysis": 7,
        "death": 8,
        "blast": 10,
        "implements": 10,
        "spells": 11
      },
      {
        "level": 5,
        "paralysis": 6,
        "death": 7,
        "blast": 9,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 6,
        "paralysis": 6,
        "death": 7,
        "blast": 9,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 7,
        "paralysis": 5,
        "death": 6,
        "blast": 8,
        "implements": 8,
        "spells": 9
      },
      {
        "level": 8,
        "paralysis": 4,
        "death": 5,
        "blast": 7,
        "implements": 7,
        "spells": 8
      },
      {
        "level": 9,
        "paralysis": 4,
        "death": 5,
        "blast": 7,
        "implements": 7,
        "spells": 8
      },
      {
        "level": 10,
        "paralysis": 3,
        "death": 4,
        "blast": 6,
        "implements": 6,
        "spells": 7
      },
      {
        "level": 11,
        "paralysis": 2,
        "death": 3,
        "blast": 5,
        "implements": 5,
        "spells": 6
      },
      {
        "level": 12,
        "paralysis": 2,
        "death": 3,
        "blast": 5,
        "implements": 5,
        "spells": 6
      },
      {
        "level": 13,
        "paralysis": 1,
        "death": 2,
        "blast": 4,
        "implements": 4,
        "spells": 5
      },
      {
        "level": 14,
        "paralysis": 1,
        "death": 2,
        "blast": 4,
        "implements": 4,
        "spells": 5
      }
    ]
  },
  {
    "name": "Elven Nightblade",
    "hitDie": "1d6",
    "conBonus": true,
    "xpPerLevel": [
      0,
      2875,
      5750,
      11500,
      23000,
      46000,
      90000,
      180000,
      330000,
      480000,
      630000,
      780000,
      930000,
      1080000
    ],
    "titles": [
      "Arcanist-Avenger",
      "Seer-Enforcer",
      "Theurgist-Torturer",
      "Magician-Slayer",
      "Thaumaturge-Destroyer",
      "Enchanter-Executioner",
      "Sorcerer-Blackguard",
      "Mage-Assassin",
      "Nightblade",
      "Nightblade (10)",
      "Nightblade (11)",
      "Nightblade (12)",
      "Nightblade (13)",
      "Nightblade (14)"
    ],
    "attackThrows": [
      10,
      10,
      9,
      9,
      8,
      8,
      7,
      7,
      6,
      6,
      5,
      5,
      4,
      4
    ],
    "savingThrows": [
      {
        "level": 1,
        "paralysis": 12,
        "death": 13,
        "blast": 13,
        "implements": 14,
        "spells": 14
      },
      {
        "level": 2,
        "paralysis": 12,
        "death": 13,
        "blast": 13,
        "implements": 14,
        "spells": 14
      },
      {
        "level": 3,
        "paralysis": 11,
        "death": 12,
        "blast": 12,
        "implements": 13,
        "spells": 13
      },
      {
        "level": 4,
        "paralysis": 11,
        "death": 12,
        "blast": 12,
        "implements": 13,
        "spells": 13
      },
      {
        "level": 5,
        "paralysis": 10,
        "death": 11,
        "blast": 11,
        "implements": 12,
        "spells": 12
      },
      {
        "level": 6,
        "paralysis": 10,
        "death": 11,
        "blast": 11,
        "implements": 12,
        "spells": 12
      },
      {
        "level": 7,
        "paralysis": 9,
        "death": 10,
        "blast": 10,
        "implements": 11,
        "spells": 11
      },
      {
        "level": 8,
        "paralysis": 9,
        "death": 10,
        "blast": 10,
        "implements": 11,
        "spells": 11
      },
      {
        "level": 9,
        "paralysis": 8,
        "death": 9,
        "blast": 9,
        "implements": 10,
        "spells": 10
      },
      {
        "level": 10,
        "paralysis": 8,
        "death": 9,
        "blast": 9,
        "implements": 10,
        "spells": 10
      },
      {
        "level": 11,
        "paralysis": 7,
        "death": 8,
        "blast": 8,
        "implements": 9,
        "spells": 9
      },
      {
        "level": 12,
        "paralysis": 7,
        "death": 8,
        "blast": 8,
        "implements": 9,
        "spells": 9
      },
      {
        "level": 13,
        "paralysis": 7,
        "death": 8,
        "blast": 8,
        "implements": 9,
        "spells": 9
      },
      {
        "level": 14,
        "paralysis": 7,
        "death": 8,
        "blast": 8,
        "implements": 9,
        "spells": 9
      }
    ]
  },
  {
    "name": "Elven Spellsword",
    "hitDie": "1d6",
    "conBonus": true,
    "xpPerLevel": [
      0,
      4000,
      8000,
      16000,
      32000,
      64000,
      130000,
      260000,
      430000,
      600000,
      770000,
      940000,
      1110000,
      1280000
    ],
    "titles": [
      "Arcanist-Guardian",
      "Warrior-Seer",
      "Theurgist-Swordmaster",
      "Magician-Hero",
      "Thaumaturge-Exemplar",
      "Myrmidon-Enchanter",
      "Sorcerer-Champion",
      "Epic Hero-Mage",
      "Wizard-Lord",
      "Wizard-Lord (10)",
      "Wizard-Lord (11)",
      "Wizard-Lord (12)",
      "Wizard-Lord (13)",
      "Wizard-Lord (14)"
    ],
    "attackThrows": [
      10,
      9,
      9,
      8,
      7,
      7,
      6,
      5,
      5,
      4,
      3,
      3,
      2,
      1
    ],
    "savingThrows": [
      {
        "level": 1,
        "paralysis": 12,
        "death": 14,
        "blast": 15,
        "implements": 16,
        "spells": 16
      },
      {
        "level": 2,
        "paralysis": 11,
        "death": 13,
        "blast": 14,
        "implements": 15,
        "spells": 15
      },
      {
        "level": 3,
        "paralysis": 11,
        "death": 13,
        "blast": 14,
        "implements": 15,
        "spells": 15
      },
      {
        "level": 4,
        "paralysis": 10,
        "death": 12,
        "blast": 13,
        "implements": 14,
        "spells": 14
      },
      {
        "level": 5,
        "paralysis": 9,
        "death": 11,
        "blast": 12,
        "implements": 13,
        "spells": 13
      },
      {
        "level": 6,
        "paralysis": 9,
        "death": 11,
        "blast": 12,
        "implements": 13,
        "spells": 13
      },
      {
        "level": 7,
        "paralysis": 8,
        "death": 10,
        "blast": 11,
        "implements": 12,
        "spells": 12
      },
      {
        "level": 8,
        "paralysis": 7,
        "death": 9,
        "blast": 10,
        "implements": 11,
        "spells": 11
      },
      {
        "level": 9,
        "paralysis": 7,
        "death": 9,
        "blast": 10,
        "implements": 11,
        "spells": 11
      },
      {
        "level": 10,
        "paralysis": 6,
        "death": 8,
        "blast": 9,
        "implements": 10,
        "spells": 10
      },
      {
        "level": 11,
        "paralysis": 6,
        "death": 8,
        "blast": 9,
        "implements": 10,
        "spells": 10
      },
      {
        "level": 12,
        "paralysis": 6,
        "death": 8,
        "blast": 9,
        "implements": 10,
        "spells": 10
      },
      {
        "level": 13,
        "paralysis": 6,
        "death": 8,
        "blast": 9,
        "implements": 10,
        "spells": 10
      },
      {
        "level": 14,
        "paralysis": 6,
        "death": 8,
        "blast": 9,
        "implements": 10,
        "spells": 10
      }
    ]
  },
  {
    "name": "Nobiran Wonderworker",
    "hitDie": "1d4",
    "conBonus": true,
    "xpPerLevel": [
      0,
      3125,
      6250,
      12500,
      25000,
      50000,
      100000,
      200000,
      390000,
      580000,
      870000,
      1060000,
      1250000,
      1440000
    ],
    "titles": [
      "Divine Arcanist",
      "Divine Seer",
      "Divine Theurgist",
      "Divine Magician",
      "Divine Thaumaturge",
      "Divine Enchanter",
      "Divine Sorcerer",
      "Divine Mage",
      "Divine Wizard",
      "Divine Wizard (10)",
      "Divine Wizard (11)",
      "Divine Wizard (12)",
      "Divine Wizard (13)",
      "Divine Wizard (14)"
    ],
    "attackThrows": [
      10,
      10,
      10,
      9,
      9,
      9,
      8,
      8,
      8,
      7,
      7,
      7,
      6,
      6
    ],
    "savingThrows": [
      {
        "level": 1,
        "paralysis": 11,
        "death": 11,
        "blast": 13,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 2,
        "paralysis": 11,
        "death": 11,
        "blast": 13,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 3,
        "paralysis": 11,
        "death": 11,
        "blast": 13,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 4,
        "paralysis": 10,
        "death": 10,
        "blast": 12,
        "implements": 8,
        "spells": 9
      },
      {
        "level": 5,
        "paralysis": 10,
        "death": 10,
        "blast": 12,
        "implements": 8,
        "spells": 9
      },
      {
        "level": 6,
        "paralysis": 10,
        "death": 10,
        "blast": 12,
        "implements": 8,
        "spells": 9
      },
      {
        "level": 7,
        "paralysis": 9,
        "death": 9,
        "blast": 11,
        "implements": 7,
        "spells": 8
      },
      {
        "level": 8,
        "paralysis": 9,
        "death": 9,
        "blast": 11,
        "implements": 7,
        "spells": 8
      },
      {
        "level": 9,
        "paralysis": 9,
        "death": 9,
        "blast": 11,
        "implements": 7,
        "spells": 8
      },
      {
        "level": 10,
        "paralysis": 8,
        "death": 8,
        "blast": 10,
        "implements": 6,
        "spells": 7
      },
      {
        "level": 11,
        "paralysis": 8,
        "death": 8,
        "blast": 10,
        "implements": 6,
        "spells": 7
      },
      {
        "level": 12,
        "paralysis": 8,
        "death": 8,
        "blast": 10,
        "implements": 6,
        "spells": 7
      },
      {
        "level": 13,
        "paralysis": 8,
        "death": 8,
        "blast": 10,
        "implements": 6,
        "spells": 7
      },
      {
        "level": 14,
        "paralysis": 8,
        "death": 8,
        "blast": 10,
        "implements": 6,
        "spells": 7
      }
    ]
  },
  {
    "name": "Zaharan Ruinguard",
    "hitDie": "1d6",
    "conBonus": true,
    "xpPerLevel": [
      0,
      3700,
      7400,
      14800,
      29600,
      59200,
      120000,
      240000,
      415000,
      590000,
      765000,
      940000,
      1115000,
      1290000
    ],
    "titles": [
      "Insignificant",
      "Ruinborn",
      "Ruinchild",
      "Son of Ruin",
      "Ruinwielder",
      "Ruinscourge",
      "Ruinmaster",
      "Father of Ruin",
      "Lord of Ruin",
      "Lord of Secrets",
      "Lord of Bindings",
      "Prince of Ruin",
      "Prince of Ruin (13)",
      "Prince of Ruin (14)"
    ],
    "attackThrows": [
      10,
      9,
      9,
      8,
      7,
      7,
      6,
      5,
      5,
      4,
      3,
      3,
      2,
      1
    ],
    "savingThrows": [
      {
        "level": 1,
        "paralysis": 11,
        "death": 12,
        "blast": 13,
        "implements": 14,
        "spells": 15
      },
      {
        "level": 2,
        "paralysis": 10,
        "death": 11,
        "blast": 12,
        "implements": 13,
        "spells": 14
      },
      {
        "level": 3,
        "paralysis": 10,
        "death": 11,
        "blast": 12,
        "implements": 13,
        "spells": 14
      },
      {
        "level": 4,
        "paralysis": 9,
        "death": 10,
        "blast": 11,
        "implements": 12,
        "spells": 13
      },
      {
        "level": 5,
        "paralysis": 8,
        "death": 9,
        "blast": 10,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 6,
        "paralysis": 8,
        "death": 9,
        "blast": 10,
        "implements": 11,
        "spells": 12
      },
      {
        "level": 7,
        "paralysis": 7,
        "death": 8,
        "blast": 9,
        "implements": 10,
        "spells": 11
      },
      {
        "level": 8,
        "paralysis": 6,
        "death": 7,
        "blast": 8,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 9,
        "paralysis": 6,
        "death": 7,
        "blast": 8,
        "implements": 9,
        "spells": 10
      },
      {
        "level": 10,
        "paralysis": 5,
        "death": 6,
        "blast": 7,
        "implements": 8,
        "spells": 9
      },
      {
        "level": 11,
        "paralysis": 4,
        "death": 5,
        "blast": 6,
        "implements": 7,
        "spells": 8
      },
      {
        "level": 12,
        "paralysis": 4,
        "death": 5,
        "blast": 6,
        "implements": 7,
        "spells": 8
      },
      {
        "level": 13,
        "paralysis": 4,
        "death": 5,
        "blast": 6,
        "implements": 7,
        "spells": 8
      },
      {
        "level": 14,
        "paralysis": 4,
        "death": 5,
        "blast": 6,
        "implements": 7,
        "spells": 8
      }
    ]
  }
];

/**
 * Maximum levels printed in the ACKS II Revised Rulebook. Human classes all
 * advance to level 14; the six racial classes have their own limits.
 * Keeping the limit beside the seed data prevents fabricated rows from being
 * exposed by the catalogue or accepted by level validation.
 */
export const BASE_CLASS_MAX_LEVELS: Record<string, number> = {
  'Dwarven Craftpriest': 10,
  'Dwarven Vaultguard': 13,
  'Elven Nightblade': 11,
  'Elven Spellsword': 10,
  'Nobiran Wonderworker': 12,
  'Zaharan Ruinguard': 12,
}

export const PREVIOUS_DEFAULT_CLASSES = RAW_DEFAULT_CLASSES.map((klass) => {
  const maxLevel = BASE_CLASS_MAX_LEVELS[klass.name] ?? 14
  return {
    ...klass,
    xpPerLevel: klass.xpPerLevel.slice(0, maxLevel),
    titles: klass.titles.slice(0, maxLevel),
    attackThrows: klass.attackThrows.slice(0, maxLevel),
    savingThrows: klass.savingThrows.slice(0, maxLevel),
  }
})

// The book-checked progression is also used by advancement. Keep historical
// arrays above only for identifying unmodified campaign copies.
export const DEFAULT_CLASSES = PREVIOUS_DEFAULT_CLASSES.map(klass => ({
  ...klass,
  xpPerLevel: (rules.classes as Record<string, { levels: { xp: number }[] }>)[klass.name]!.levels.map(level => level.xp),
}))
