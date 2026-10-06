import { CLASS_POWERS } from './classPowers';
import { TOTEM_ANIMALS } from '../../../backend/src/lib/classAbilities';

export interface ClassSpecificTable {
  title: string;       
  columns: string[];   
  rows: string[][];    
  description?: string;
}

export interface ClassLevelStats {
  sectionTitle: string;
  stats: { label: string; value: string }[];
}

export interface ClassPower {
  minimumLevel?: number;
  subPath?: string;
  name: string;
  description: string;
}

export function getClassFeats(classNameRaw: string, level: number, subclassName?: string): {
  levelStats: ClassLevelStats[];
  tables: ClassSpecificTable[];
  powers: ClassPower[];
  futurePowers: ClassPower[];
  availableSubclasses?: string[];
} {
  const className = (classNameRaw || '').trim().toLowerCase();
  const lvlIdx = Math.max(0, level - 1);
  const getRow = (arr: any[]) => arr[Math.min(lvlIdx, arr.length - 1)];

  const levelStats: ClassLevelStats[] = [];
  const tables: ClassSpecificTable[] = [];
  
  let powers: ClassPower[] = CLASS_POWERS[className] || [];
  let availableSubclasses: string[] | undefined;

  if (powers.length > 0) {
    const subs = new Set<string>();
    powers.forEach(p => {
      if (p.subPath) subs.add(p.subPath);
    });
    if (subs.size > 0) {
      availableSubclasses = Array.from(subs);
      if (subclassName && subs.has(subclassName)) {
        powers = powers.filter(p => !p.subPath || p.subPath === subclassName);
      } else {
        powers = powers.filter(p => !p.subPath);
      }
    }
  }

  const thiefSkills = [
    ['6+', '19+', '14+', '18+', '17+', '18+', '17+', '18+'],
    ['5+', '18+', '13+', '17+', '16+', '17+', '16+', '17+'],
    ['4+', '17+', '12+', '16+', '15+', '16+', '15+', '16+'],
    ['3+', '16+', '11+', '15+', '14+', '15+', '14+', '15+'],
    ['2+', '15+', '10+', '14+', '13+', '14+', '13+', '14+'],
    ['1+', '14+', '9+', '13+', '12+', '13+', '12+', '13+'],
    ['0+', '12+', '8+', '11+', '10+', '11+', '10+', '11+'],
    ['-1+', '10+', '7+', '9+', '8+', '9+', '8+', '9+'],
    ['-2+', '8+', '6+', '7+', '6+', '7+', '6+', '7+'],
    ['-3+', '6+', '5+', '5+', '4+', '5+', '4+', '5+'],
    ['-4+', '4+', '4+', '3+', '2+', '3+', '2+', '3+'],
    ['-5+', '2+', '3+', '1+', '0+', '1+', '0+', '2+'],
    ['-6+', '0+', '2+', '-1+', '-2+', '-1+', '-2+', '2+'],
    ['-7+', '-2+', '1+', '-3+', '-4+', '-3+', '-4+', '1+']
  ];

  if (className === 'thief') {
    const row = getRow(thiefSkills);
    levelStats.push({
      sectionTitle: 'Thief Skills',
      stats: [
        { label: 'Climbing', value: row[0] },
        { label: 'Hiding', value: row[1] },
        { label: 'Listening', value: row[2] },
        { label: 'Lockpicking', value: row[3] },
        { label: 'Pickpocketing', value: row[4] },
        { label: 'Searching', value: row[5] },
        { label: 'Sneaking', value: row[6] },
        { label: 'Trapbreaking', value: row[7] }
      ]
    });
  }

  const crusaderUndead = [
    ['10+', '13+', '16+', '19+', '-', '-', '-', '-', '-'],
    ['7+', '10+', '13+', '16+', '19+', '-', '-', '-', '-'],
    ['4+', '7+', '10+', '13+', '16+', '19+', '-', '-', '-'],
    ['R', '4+', '7+', '10+', '13+', '16+', '19+', '-', '-'],
    ['R', 'R', '4+', '7+', '10+', '13+', '16+', '19+', '-'],
    ['D', 'R', 'R', '4+', '7+', '10+', '13+', '16+', '19+'],
    ['D', 'D', 'R', 'R', '4+', '7+', '10+', '13+', '16+'],
    ['D', 'D', 'D', 'R', 'R', '4+', '7+', '10+', '13+'],
    ['D', 'D', 'D', 'D', 'R', 'R', '4+', '7+', '10+'],
    ['D', 'D', 'D', 'D', 'D', 'R', 'R', '4+', '7+'],
    ['D', 'D', 'D', 'D', 'D', 'D', 'R', 'R', '4+'],
    ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'R', 'R'],
    ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'R'],
    ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D']
  ];

  if (className === 'crusader' || className === 'dwarven craftpriest') {
    const row = getRow(crusaderUndead);
    levelStats.push({
      sectionTitle: 'Rebuking Undead',
      stats: [
        { label: 'Skeleton', value: row[0] },
        { label: 'Zombie', value: row[1] },
        { label: 'Ghoul', value: row[2] },
        { label: 'Wight', value: row[3] },
        { label: 'Wraith', value: row[4] },
        { label: 'Mummy', value: row[5] },
        { label: 'Specter', value: row[6] },
        { label: 'Vampire', value: row[7] },
        { label: 'Incarnation*', value: row[8] }
      ]
    });
  }

  const elvenNightblade = [
    ['18+', '6+', '19+', '17+'],
    ['17+', '5+', '18+', '16+'],
    ['16+', '4+', '17+', '15+'],
    ['15+', '3+', '16+', '14+'],
    ['14+', '2+', '15+', '13+'],
    ['13+', '1+', '14+', '12+'],
    ['12+', '0+', '12+', '10+'],
    ['11+', '-1+', '10+', '8+'],
    ['10+', '-2+', '8+', '6+'],
    ['9+', '-3+', '6+', '4+'],
    ['8+', '-4+', '4+', '2+']
  ];

  if (className === 'elven nightblade') {
    const row = getRow(elvenNightblade);
    levelStats.push({
      sectionTitle: 'Nightblade Skills',
      stats: [
        { label: 'Acrobatics', value: row[0] },
        { label: 'Climbing', value: row[1] },
        { label: 'Hiding', value: row[2] },
        { label: 'Sneaking', value: row[3] }
      ]
    });
  }

  const bardStats = [
    ['4+', '14+', '18+'],
    ['4+', '13+', '17+'],
    ['4+', '12+', '16+'],
    ['4+', '11+', '15+'],
    ['4+', '10+', '14+'],
    ['4+', '9+', '13+'],
    ['4+', '8+', '12+'],
    ['4+', '7+', '11+'],
    ['4+', '6+', '10+'],
    ['4+', '5+', '9+'],
    ['4+', '4+', '8+'],
    ['4+', '3+', '7+'],
    ['4+', '2+', '6+'],
    ['4+', '1+', '5+']
  ];

  if (className === 'bard') {
    const row = getRow(bardStats);
    levelStats.push({
      sectionTitle: 'Innate Skills',
      stats: [
        { label: 'Arcane Dabbling', value: row[0] },
        { label: 'Listening', value: row[1] },
        { label: 'Loremastery', value: row[2] }
      ]
    });

    if (level >= 7) {
      tables.push({
        title: 'Inspire Hope (Nível 7+)',
        description: 'Temporary HP baseados na Vida Max (sua ou do alvo).',
        columns: ['Max HP', 'Temp HP'],
        rows: [
          ['1 - 3', '1d2'],
          ['4 - 9', '1d3'],
          ['10 - 16', '1d4'],
          ['17 - 23', '1d6'],
          ['24 - 29', '1d8'],
          ['30 - 36', '1d10'],
          ['37 - 49', '2d6'],
          ['50 - 63', '2d8'],
          ['64 - 76', '2d10'],
          ['77 - 89', '2d12'],
          ['90 - 110', '3d10'],
          ['111 - 140', '4d10'],
          ['141 - 170', '5d10'],
          ['171+', '6d10 + (ver regras)']
        ]
      });
    }
  }

  const assassinStats = [
    ['+1d', '19+', '17+'],
    ['+1d', '18+', '16+'],
    ['+1d', '17+', '15+'],
    ['+1d', '16+', '14+'],
    ['+2d', '15+', '13+'],
    ['+2d', '14+', '12+'],
    ['+2d', '12+', '10+'],
    ['+2d', '10+', '8+'],
    ['+3d', '8+', '6+'],
    ['+3d', '6+', '4+'],
    ['+3d', '4+', '2+'],
    ['+3d', '3+', '2+'],
    ['+4d', '2+', '1+'],
    ['+4d', '1+', '1+']
  ];

  if (className === 'assassin') {
    const row = getRow(assassinStats);
    levelStats.push({
      sectionTitle: 'Assassin Skills',
      stats: [
        { label: 'Backstab', value: row[0] },
        { label: 'Hiding', value: row[1] },
        { label: 'Sneaking', value: row[2] }
      ]
    });
  }

  if (className === 'bladedancer') {
    const bonus = level <= 6 ? '+1' : level <= 12 ? '+2' : '+3';
    levelStats.push({
      sectionTitle: 'Defesa Ágil',
      stats: [
        { label: 'AC Bonus (Armadura Leve)', value: bonus }
      ]
    });
  }

  if (className === 'venturer' && level >= 8) {
    tables.push({
      title: 'Access to Capital (Nível 8+)',
      columns: ['Market Class', 'Max Capital / Month'],
      rows: [
        ['I', '100,000gp*'],
        ['II', '25,000gp'],
        ['III', '10,000gp'],
        ['IV', '5,000gp'],
        ['V', '2,000gp'],
        ['VI', '1,000gp']
      ]
    });
  }

  if (className === 'shaman') {
    tables.push({
      title: 'Totem Animals (Base)',
      columns: ['Animal', 'Key Attr', 'Benefit', 'Characteristics'],
      description: 'Características de animais comuns (Rulebook p. 69). O totem usa HD e características ajustados conforme p. 70.',
      rows: TOTEM_ANIMALS.map(animal => [animal.name, animal.attribute.toUpperCase(), animal.benefit, animal.characteristics])
    });
  }

  if (className === 'witch') {
    tables.push({
      title: 'Witch Traditions',
      columns: ['Tradition', 'Description'],
      rows: [
        ['Antiquarian', 'Mulheres sábias que focam em cura e poções benéficas, praticando seu ofício tradicional onde quer que assentamentos humanos rurais sejam encontrados.'],
        ['Chthonic', 'Praticantes maléficas que se associam aos poderes mais sombrios, revelando-se na sedução e corrupção dos inocentes.'],
        ['Sylvan', 'Bruxas reclusas que viajam pelas fronteiras entre os assentamentos humanos e as florestas feéricas.']
      ]
    });
  }

  // Existing source labels explicitly identify powers acquired after level 1.
  powers = powers.map(p => ({ ...p, minimumLevel: p.minimumLevel ?? Number(p.name.match(/\((\d+)(?:st|nd|rd|th)(?:\s+level)?\)/i)?.[1] ?? 1) }));
  const futurePowers = powers.filter(p => p.minimumLevel! > level);
  return { 
    levelStats, 
    tables, 
    powers: powers.filter(p => p.minimumLevel! <= level),
    futurePowers,
    availableSubclasses
  };
}
