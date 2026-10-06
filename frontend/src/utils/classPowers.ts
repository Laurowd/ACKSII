import { WITCH_POWERS, CRAFTPRIEST_POWERS } from './revisedClassPowers'
export const CLASS_POWERS: Record<string, {name: string, description: string, minimumLevel?: number, subPath?: string}[]> = {
  "fighter": [
    {
      "name": "Manual of Arms",
      "description": "The fighter is highly experienced in military discipline, physical fitness, and weapon drill. He can automatically identify the battle standards, equipment, great captains, military slang, and rank insignia of his homeland. He can identify those of other realms with a proficiency throw of 11+. He can fight as a regular (rather than irregular) in formed and loose units. He can begin play as a member of a legion, mercenary’s guild, or other military organization (Judge’s discretion). (This class power is equivalent to one rank of Manual of Arms proficiency.)"
    },
    {
      "name": "Battlefield Prowess (5th level)",
      "description": "The fighter’s presence inspires troops he leads. Any henchmen and mercenaries hired by the fighter gain a +1 bonus to their morale score whenever he personally leads them. This bonus stacks with any modifiers from the fighter’s Charisma or proficiencies."
    },
    {
      "name": "Castle (9th level)",
      "description": "By acquiring a castle or fort worth at least 15,000gp, the fighter can attract followers to his service. 5d6 x 10 0th level troops and 1d6 fighters of 1st – 3 rd level arrive to serve him within 1d3 months of him acquiring the castle. If the fighter already has a castle, the followers arrive to serve him within 1d3 months of him reaching 9th level. The fighter must pay his followers the ordinary rates for mercenaries and henchmen or they leave his service. In time, the fighter might become a great lord, commanding armies to conquer vast realms. Additional rules for castles are detailed in the Campaigns chapter (p. XX)."
    }
  ],
  "explorer": [
    {
      "name": "Alertness",
      "description": "Explorers are always alert to danger. An explorer gains a +1 bonus to avoid surprise. When using Adventuring proficiency to search or listen, he succeeds on a proficiency throw of 14+ (instead of the usual 18+). If separately proficient in Searching or Listening, he gains a +2 bonus to his throw instead."
    },
    {
      "name": "Ambushing",
      "description": "Explorers are skilled at ambushing unprepared enemies. An explorer can ambush any vulnerable opponent. Ambushes can be made in melee or with missile weapons at short range, but cannot be made with missile weapons at medium or longer range. When ambushing, an explorer gets a +4 bonus on his attack throws and deals an extra die of damage on the attack. (This class power is the equivalent of Ambushing proficiency.)"
    },
    {
      "name": "Animal Reflexes",
      "description": "Explorers react to danger as fast as a deer to a wolf. An explorer gains a +1 bonus to initiative and a +1 bonus to avoid surprise. (This bonus stacks with the bonus from Alertness, so in most cases explorers have a +2 bonus to avoid surprise.)"
    },
    {
      "name": "Endurance",
      "description": "Explorers are inured to the hardship and fatigue of travel. When exploring, an explorer does not need to rest every 6 turns. An explorer can force march for one day without penalty, plus one additional day for each point of Constitution bonus. (This class power is equivalent to Endurance proficiency.)"
    },
    {
      "name": "Evasion",
      "description": "Explorers learn to avoid the wild beasts of the wilderness. When the explorer guides the party in familiar territory, the party gains a +5 bonus to proficiency throws to evade wilderness encounters. The explorer’s party can evade wilderness encounters even when surprised provided the explorer is not surprised. See Evasion (p. xx) for more details on evading encounters."
    },
    {
      "name": "Pathfinding",
      "description": "Explorers rarely lose their bearings, even in trackless wilderness. When the explorer guides a party in familiar territory, the party gains a +4 bonus on proficiency throws to avoid getting lost. See Wilderness Expeditions section of Chapter 6 (p. XX) for more details on getting lost."
    },
    {
      "name": "Natural Stealth",
      "description": "As hunters and wilderness scouts, explorers are naturally sneaky. Opponents suffer a -2 penalty to surprise rolls when encountering an explorer approaching from outside line of sight or lying in wait in cover or darkness."
    },
    {
      "name": "Experience and Hardiness (5th level)",
      "description": "When an explorer reaches 5th level (Guide), his experience and hardiness reassure those who follow him into the wild. Hirelings on a wilderness adventure led by the explorer gain a +1 bonus to their morale score. This bonus stacks with any modifiers from Charisma or proficiencies."
    },
    {
      "name": "Border Fort (9th level)",
      "description": "By acquiring a border fort worth at least 15,000gp, the explorer can attract followers to his service. 5d6 x 10 0th level troops and 1d6 explorers of 1st – 3 rd level arrive to serve him within 1d3 months of him acquiring the border fort. If the explorer already has a border fort, the followers arrive to serve him within 1d3 months of him reaching 9th level. The explorer must pay his followers the ordinary rates for mercenaries and henchmen or they leave his service. In time, the explorer might become the warden of a flourishing colony. In order for a stronghold to count as a border fort, it must be constructed in outlands or unsettled territory. An explorer within 24 miles of a domain secured by his border fort never becomes lost and gains an additional +4 bonus to evade encounters because of his familiarity with the region. Additional rules for border forts are detailed in the Campaigns chapter (p. XX)."
    }
  ],
  "thief": [
    {
      "name": "Backstabbing",
      "description": "Thieves are skilled at treacherously attacking unprepared enemies. A thief can backstab any vulnerable opponent. Backstabs can be made in melee or with missile weapons at short range, but cannot be made with missile weapons at medium or longer range. When backstabbing, a thief gains a +4 bonus to hit and if the attack succeeds, the thief deals an additional die of damage for every four levels he has attained."
    },
    {
      "name": "Climbing",
      "description": "Thieves are adept at scaling sheer surfaces, including smooth walls or steep cliffs. The thief must make a Climbing proficiency throw for each 100’ climbed (with a minimum of one check required). If the throw succeeds, the thief can safely ascend or descend the distance. If the throw fails, the thief falls a distance equal to half the attempted distance, plus the distance covered by any previous throws, taking 1d6 bludgeoning damage per 10 feet. A thief can climb at his exploration speed or one-third his combat speed without penalty. If he moves at one-half combat speed, he takes a -5 penalty to the proficiency throw, and if he moves at full combat speed, he takes a -10 penalty."
    },
    {
      "name": "Hiding",
      "description": "Thieves are trained to skulk unseen in the cover of darkness. A thief can begin hiding as a combat action anytime he is in cover, dim light, or darkness. When the thief begins hiding, the Judge must make a Hiding proficiency throw on behalf of the thief. A thief will always think he is successful in this skill, and will not know otherwise until others react to his presence. Regardless of whether the throw succeeds, opponents encountering the thief suffer a -2 penalty to surprise rolls as long as he remains stationary in cover, dim light, or darkness. If the throw succeeds, the thief is hidden. If the throw fails, the thief is not hidden. No creature can claim line of sight on a thief that is hidden from it. If a hidden thief engages an unengaged opponent, the opponent cannot make a free facing change (p. XX). If an opponent knows the hidden thief’s general location, the opponent can attack him in melee at a -4 penalty, but it cannot even blindly attack the thief if it doesn’t knows his general location. The hidden condition expires at the end of the thief’s initiative if he moves or attacks. It also terminates if the cover, dim light, or darkness no longer conceals the thief from his opponents."
    },
    {
      "name": "Listening",
      "description": "Thieves at doors, passageways, or intersections can listen for sounds coming from the other side of the door or passage. The Judge makes a Listening proficiency throw in secret on behalf of the thief. If the throw succeeds, he hears any noises in earshot. If the throw fails, or if there aren’t any noises in earshot, he doesn’t hear anything. The thief must be quiet and must be the closest creature in the party relative to the location of the sound or suspected sound. Listening only requires one round but can only be undertaken once per turn if the party is moving at all, because it takes time for people to settle down into quiet."
    },
    {
      "name": "Lockpicking",
      "description": "With the aid of thieves’ tools, a thief can pick mechanical locks. A thief can pick locks either hastily or methodically. • Attempting to hastily pick a lock requires one round and a Lockpicking proficiency throw. If the throw succeeds, the lock is opened. If it fails on a natural roll of 1 – 3, the thief breaks his pick in the lock, jamming it. The lock cannot thereafter be picked. If it fails on any other result, the thief cannot figure out how to quickly open the lock. He can still attempt to open it methodically, but cannot make another attempt to hastily pick the same lock again until he reaches a higher experience level. • Attempting to methodically pick a lock requires one turn (10 minutes) and a Lockpicking proficiency throw with a +4 bonus. If the throw succeeds, the lock is opened. If it fails on a natural roll of 1, the thief breaks his pick in the lock, jamming it. The lock cannot thereafter be picked. If it fails on any other result, the thief fails to pick the lock, but can make another methodical attempt if desired. Other bonuses or penalties might apply to the throw, depending on the thief’s tools, the complexity of the lock, and other factors."
    },
    {
      "name": "Pickpocketing",
      "description": "The thief is practiced in the art of picking pockets and cutting purses. To use this skill, the thief must move within 5’ of his target and make a Pickpocketing proficiency throw. If the target is unaware of the thief, the thief gains a +4 bonus to the throw. If the throw succeeds, the target can be robbed of the contents of one pocket, or any one item or tiny or small weapon hung on his person (but not a held item or weapon). If the throw fails, the thief fails to pickpocket the target. If the throw fails, and the roll is a natural roll of 1 or less than half the target value, the intended target notices the thieving attempt. The Judge will then make a reaction roll with a -3 penalty to determine the intended victim’s reaction."
    },
    {
      "name": "Searching",
      "description": "Through careful inspection and probing of his surroundings, a thief can find concealed traps, secret doors, obscured objects, buried treasure, and other hidden features. A thief can attempt to search for hidden features either hastily or methodically. • Attempting to hastily search requires one round and a Searching proficiency throw. The Judge makes the throw in secret on behalf of the thief. If the throw succeeds, the thief notices any hidden features within 5’ of his location. If it fails, or there is nothing hidden, the thief finds nothing. The thief cannot make another attempt to hastily search the same area again until he reaches a higher experience level, but he can attempt to methodically search the location. • Attempting to methodically search requires one turn (10 minutes) and a Searching proficiency throw with a +4 bonus. The Judge makes the throw in secret on behalf of the thief. If the throw succeeds, the thief notices any hidden features within 5’ of his location. If the throw fails, or there is nothing hidden, the thief finds nothing. The thief can make repeated attempts to methodically search a location if desired. When a thief is moving at exploration speed, he can choose to attempt to hastily search as he moves. If so, then anytime the thief moves within 5’ of a hidden feature, the Judge secretly makes a proficiency throw on his behalf. If the throw succeeds, the thief notices it (and if it’s a trap, he notices it before triggering it). If the throw fails, the thief does not notice anything (and, if it’s a trap, he or another character in the party might trigger it as they move). Note that this counts as a failure to hastily search for hidden features. If the thief is equipped with a long pole or similar implement, he can search a 5’ radius area within 10’ of his location. This can be advantageous because if a trap gets set off, he might be far enough to avoid being harmed. Other rules, bonuses or penalties might apply to the attempt, depending on the thief’s tools, the degree of concealment, and other factors."
    },
    {
      "name": "Shadowy Senses",
      "description": "Since the bright light of torches will reveal their positions, thieves learn to rely on superior night-vision, keen hearing and smell, and echolocation to slowly scout through dark alleys, lightless dungeons, and star-lit rooftops. When moving at combat speed or exploration speed, a thief can “see” as if he were carrying a light source that sheds dim light in a 30’ radius. Shadowy senses can be used to fight, probe for traps, and so on. However, shadowy senses cannot be used to discern colors, faces, markings, or flat images (such as frescoes and murals), or to read books, maps, or scrolls. Shadowy senses does not function if the thief is charging or running, if deafened, or if in an area of bright light, magical darkness, or magical silence. Because it counts as dim light, an opponent can hide from shadowy senses."
    },
    {
      "name": "Sneaking",
      "description": "Thieves learn to prowl with great stealth. A thief can begin sneaking as a movement action. He can sneak at his encounter speed or one-half combat speed without penalty. If he moves greater than one-half combat speed, he takes a -5 penalty to the Sneaking proficiency throw. If he runs, he takes a -10 penalty. When the thief begins sneaking, the Judge must make a Sneaking proficiency throw on behalf of the thief. A thief will always think he is successful in this skill, and will not know otherwise until others react to his presence. Regardless of whether the throw succeeds, opponents encountering the thief suffer a -2 penalty to surprise rolls if the thief is outside their line of sight. If the throw succeeds, the thief is also sneaking. If the throw fails, the thief is not sneaking. When sneaking, the thief makes no noise when he moves — none whatsoever. Even alert creatures that make a successful Listening proficiency throw will not hear a sound. When a sneaking thief engages an unengaged opponent from the rear, the opponent cannot make a free facing change."
    },
    {
      "name": "Streetwise",
      "description": "The thief has learned the hard lessons taught by life as a criminal. He might begin play as a member of a thieves’ guild or other criminal syndicate (Judge’s discretion). He can engage in hijinks if he has the necessary proficiencies or thief skills. He can automatically identify gestures, signs, slang, and territory of criminal organizations in his home settlement. He can identify those of other urban settlements with a proficiency throw of 11+. Secret organizations or organizations in far-off cities might be harder to recognize. (This class power is equivalent to one rank of Streetwise proficiency.)"
    },
    {
      "name": "Trapbreaking",
      "description": "With the aid of thieves’ tools, a thief can attempt to disable or discharge a trap harmlessly. A thief can crack traps either hastily or methodically. • Attempting to hastily disarm a trap requires one round and a Trapbreaking proficiency throw. If the throw succeeds, the trap is disarmed or discharged harmlessly (thief’s choice). If it fails on a natural roll of 1 – 3, the thief accidentally triggers the trap. If it fails on any other result, the thief cannot figure out how to quickly disable the trap. He can still attempt to disable it methodically, but cannot make another attempt to hastily remove the same trap again until he reaches a higher experience level. • Attempting to methodically disarm a trap requires one turn (10 minutes) and a Trapbreaking proficiency throw with a +4 bonus. If the throw succeeds, the trap is disarmed or discharged harmlessly. If it fails on a natural roll of 1, the thief accidentally triggers the trap. If it fails on any other result, the thief is unable to disable the trap. The thief can make repeated attempts to methodically remove the same trap if desired. Other bonuses or penalties might apply to the proficiency throw, depending on the thief’s tools, the complexity of the trap, and other factors."
    },
    {
      "name": "Deciphering (4th level)",
      "description": "The thief gains the ability to decipher text (including ciphers, treasure maps, and dead languages, but not magical writings). Deciphering a page of text requires one turn (10 minutes) and a successful proficiency throw of 4+ on 1d20. If the roll does not succeed, the thief cannot try to decipher that particular page of text until he reaches a higher level of experience."
    },
    {
      "name": "Hideout (9th level)",
      "description": "By acquiring a hideout worth at least 5,000gp, the thief can attract followers to his service. 2d6 1 st level thieves will arrive to serve him as followers within 1d4 weeks of him acquiring the hideout. If the thief already has a hideout, the followers arrive to serve him within 1d4 weeks of him reaching 9th level. If hired, the followers must be paid standard rates for ruffians. These followers will serve the character with some loyalty, though at least one will be an infiltrator working for the thief’s local rivals, sent to keep an eye on the character. A cunning and resourceful thief can use these followers to start a criminal syndicate. Additional rules for hideouts and syndicates are detailed in the Campaigns chapter (p. XX)."
    },
    {
      "name": "Scrollreading (10th)",
      "description": "The thief gains the ability to read and cast magic from arcane and divine scrolls. The thief does not have to be able to read the language in which the scroll is written provided he has successfully deciphered it before. Reading a magical scroll requires one round and a successful proficiency throw of 4+ on 1d20. However, a failed throw means the spell does not function as expected, and can create a horrible effect at the Judge’s discretion."
    }
  ],
  "mage": [
    {
      "name": "Arcane Magic",
      "description": "Mages can learn and cast powerful arcane spells. The number and levels of spells the mage can cast in a single day are listed on the Mage Spell Progression table. A mage’s spell selection is limited to the spells in his repertoire. A mage’s repertoire can include a number of spells up to the number and level of spells listed for his level, increased by his Intellect bonus. For instance, Quintus, a 3rd level mage, is able to cast 2 1st level spells and 1 2nd level spell per day. If he has 16 INT (+2 modifier) he can have up to 4 1st level and 3 2nd level spells in his repertoire (though the number of spells he can cast each day is unaffected). More information on casting spells and individual spell descriptions can be found in the Spells chapter."
    },
    {
      "name": "Collegiate Wizardry",
      "description": "The mage has received arcane instruction as an apprentice to a mage, pupil at a magical academy, or member of an arcane organization. He can begin play as a member of a wizard’s guild or similar order (Judge’s discretion). He can automatically identify arcane symbols, spell signatures, trappings, and grimoires of his own order or tradition, and can recognize those of other orders or traditions with a proficiency throw of 11+. Rare or esoteric traditions might be harder to recognize. (This class power is the equivalent of one rank of Collegiate Wizardry proficiency)."
    },
    {
      "name": "Minor Magical Research (5th level)",
      "description": "The mage can research spells, scribe magical scrolls, and brew potions. Rulesfor magic research can be found in the Campaigns chapter (p. XX)."
    },
    {
      "name": "Major Magical Research (9th level)",
      "description": "The mage can create more powerful magic items such as weapons, rings, and staffs."
    },
    {
      "name": "Sanctum (9th level)",
      "description": "By acquiring a sanctum (often a great tower) worth at least 15,000gp, the mage can attract followers to his service. 1d6 apprentices of 1st – 3 rd level plus 2d6 apprentices of 0th level arrive to serve him as followers within 1d3 months of him acquiring the sanctum. If the mage already has a sanctum, the followers arrive to serve him within 1d3 months of him reaching 9th level. The apprentices function as assistants in magical research (see p. XXX). If performing magic research, the apprentices must be provided food and lodging, but need not be paid wages. (If asked to accompany the mage on an adventure, the apprentices must be paid wages as henchmen.) If the mage builds a dungeon beneath or near his sanctum, monsters will start to arrive to dwell within, often followed by adventurers seeking to fight them. Additional rules for mages’ sanctums are detailed in the Campaigns chapter (p. XX)."
    },
    {
      "name": "Supreme Magical Research (11th level)",
      "description": "The mage can learn and cast ritual arcane spells of great power (7th, 8th, and 9th level), craft magical constructs, and create magical crossbreeds. If chaotic, the mage can create necromantic servants and become undead."
    }
  ],
  "crusader": [
    {
      "name": "Divine Magic",
      "description": "By invoking or praying to their deities, crusaders can manifest their power in the form of divine spells. The number and levels of spells the crusader can cast in a single day are listed on the Crusader Spell Progression table. The crusader’s spell selection is limited to the spells in his order’s repertoire. See the Spells chapter for a list of all available spells."
    },
    {
      "name": "Theology",
      "description": "The crusader has received religious instruction at a seminary, monastery, or temple. He can begin play as a member of a religious hierarchy (Judge’s discretion). He can acquire congregants through proselytizing. He can automatically identify religious symbols, spell signatures, trappings, and holy days of his own faith, and can recognize those of other faiths with a proficiency throw of 11+. Rare or occult cults might be harder to recognize. (This class power is the equivalent of one rank of Theology proficiency.)"
    },
    {
      "name": "Rebuke Undead",
      "description": "Most crusaders have the ability to rebuke the undead, invoking the name and power of their deity to turn away, and even destroy, dark powers. When a crusader attempts to rebuke undead, the result is determined by consulting the Crusader Rebuking Undead table, cross-referencing the type of undead with the crusader’s level. Crusader Rebuking Undead Crusader Level Undead Type 1 2 3 4 5 6 7 8 9 10 11 12 13 14+ Skeleton 10+ 7+ 4+ R R D D D D D D D D D Zombie 13+ 10+ 7+ 4+ R R D D D D D D D D Ghoul 16+ 13+ 10+ 7+ 4+ R R D D D D D D D Wight 19+ 16+ 13+ 10+ 7+ 4+ R R D D D D D D Wraith - 19+ 16+ 13+ 10+ 7+ 4+ R R D D D D D Mummy - - 19+ 16+ 13+ 10+ 7+ 4+ R R D D D D Specter - - - 19+ 16+ 13+ 10+ 7+ 4+ R R D D D Vampire - - - - 19+ 16+ 13+ 10+ 7+ 4+ R R D D Incarnation* - - - - - 19+ 16+ 13+ 10+ 7+ 4+ R R D *Lawful crusaders can rebuke demons, while chaotic crusaders can control demons and rebuke angels. A dash means that the crusader does not yet have the piety and power to rebuke that type of undead. An “R” indicates that the crusader automatically rebukes that type of undead, while a “D” means that the crusader automatically destroys that type of undead. A number indicates the target value for a Rebuking proficiency throw. If this roll is successful, or there is an “R” or a “D” in the chart, the crusader immediately rolls 2d6 to see the effect. The number rolled is the number of total Hit Dice of undead monsters that are rebuked or destroyed. No matter what the dice roll result, at least one undead monster will always be rebuked or destroyed, as appropriate, on a successful rebuking. Undead with lower HD are always rebuked before undead with higher HD. Rebuked undead flee the area for 10 rounds (1 turn) by the best and fastest means available to them. If they cannot flee, they cower in terror, taking no actions and suffering a -2 penalty to AC. If the crusader attacks rebuked undead in melee combat, the rebuking effect is broken, but he can use spells or missile weapons against them, and other characters can attack them in any fashion, without breaking the rebuking effect. Destroyed undead are immediately turned to ash. There is no limit to how often a crusader can attempt to rebuke undead each day, but if an attempt to rebuke undead completely fails during an encounter, the crusader cannot attempt to rebuke undead again for the remainder of that encounter."
    },
    {
      "name": "Minor Magical Research (5th level)",
      "description": "The crusader can scribe scrolls and brew potions."
    },
    {
      "name": "Major Magical Research (9th level)",
      "description": "The crusader can create permanent magic items, such as weapons, rings, and staffs."
    },
    {
      "name": "Fortified Church (9th level)",
      "description": "By acquiring a fortified church worth at least 15,000gp, the crusader can attract followers to his service. Provided the crusader has kept to his code of behavior, he can build a fortified church at half price due to the assistance of his deity and order. 5d6 x 10 0th level troops and 1d6 crusaders of 1st level of the same religion arrive to serve him within 1d3 months of him acquiring the fortified church. If the crusader has already acquired a fortified church, the followers arrive to serve him within 1d3 months of him reaching 9th level. The followers are fanatically brave and completely loyal (loyalty +4 and morale +4). Despite their loyalty, the followers must be paid a fair wage or they might eventually leave his service. Additional rules for fortified churches are detailed in the Campaigns chapter (p. XX)."
    },
    {
      "name": "Supreme Magical Research (11th level)",
      "description": "The crusader can learn and cast ritual divine spells of great power (7th, 8th, and 9th level), and craft magical constructs such as golems and animated statues. If chaotic, the crusader can create necromantic servants and even become undead himself. Rules for magic research can be found in the Campaigns chapter (p. XX). CODE OF BEHAVIOR In order to use spells and rebuke undead, a crusader must uphold the strictures of his faith. If the Judge has not specified particular religious orders in his campaign, the default crusader is assumed to be from the Temple of the Winged Sun, the order devoted to Ammonar, God of Light and Law. Crusaders of Ammonar must obey the following strictures. • The crusader must always display the holy symbol of his order, the winged sun, somewhere on his person when in public. • The crusader must offer prayers to Ammonar at dawn and dusk. Offering prayers requires one turn (10 minutes). • The crusader must not use any weapons designed to shed blood, such as swords, axes, and arrows. • The crusader must obey the just laws of the Auran Empire and the lawful orders of its rightful authorities. • The crusader must not use his divine magic for unlawful or chaotic purposes. If a crusader ever violates the strictures of his faith, the god might impose penalties upon the crusader. These penalties are entirely up to the Judge. The usual penalty is disfavor (p. XX), but might include penalties to turning throws, a reduction in spells available, or even a loss of all crusader powers entirely. To remove the penalties, the crusader will have to atone for his violation by, e.g., sacrificing treasure, undertaking quests, or even receiving an atonement spell from a powerful caster of his order (Judge’s discretion). Sometimes a crusader might grossly violate his strictures and yet seemingly suffer no punishment at all. However, in this case, what has actually occurred is that the crusader has unknowingly become aligned with a new god that is better suited to his actions. After 1d4 weeks, the crusader will learn (through dreams and omens) the identity of his new deity and their new strictures. It is up to the crusader to decide at that time whether to seek atonement with his prior god, or to accept his new faith (which might require, among other things, an alignment change). Because it is impossible to tell the source of a crusader’s divine power, a religious order must pay close attention to the actual behavior of its crusaders to be certain that they are not apostates, heretics, or false prophets. Some religious orders might have special clergy (inquisitors) to root out such characters."
    }
  ],
  "venturer": [
    {
      "name": "Bribery",
      "description": "Not every market obeys the rule of law, so a venturer also becomes exceptionally skilled at the art of bribery. He receives a +1 bonus to reaction rolls if he offers one day’s pay for the target; a +2 bonus for a week’s pay; and a +3 bonus for a month’s pay. His bribery is so subtle that the attempt is politely deniable by both parties. The character is only blatant enough to be charged with the crime of bribery if he rolls an unmodified 2 on 2d6. See Offering Bribes (p. XX)."
    },
    {
      "name": "Diplomacy",
      "description": "In order to open new markets and establish trade with unknown tribes, venturers study the art of protocol and parley. They receive a +1 bonus on all reaction rolls when they attempt to parley with intelligent creatures. (This class power is equivalent to Diplomacy proficiency.)"
    },
    {
      "name": "Expert Bargaining",
      "description": "Venturers can get the best deals available for goods, services, and information. Any items the venturer purchases cost 10% less than the listed price and any items he sells go for 10% more than the listed price (as per the Bargaining proficiency). If trading with another venturer, or a character with the Bargaining proficiency, the opposed bargainers should make reaction rolls. Whichever character scores the higher result gets the discount. (Special rules apply when using Bargaining for mercantile ventures, see p. XX.) A venturer can select Bargaining proficiency to improve his skills. Each time the proficiency is selected, the character receives a +2 bonus on his reaction roll when negotiating with other bargainers. (This class power is equivalent to one rank of Bargaining proficiency.)"
    },
    {
      "name": "Expert Traveling",
      "description": "While most merchants consider risk a financial term, venturers lead their own caravans or fleets, and do so with considerable skill. Venturers begin play with their choice of either Driving or Seafaring proficiency."
    },
    {
      "name": "Mercantile Network",
      "description": "As they travel, venturers build connections with buyers, fences, and peddlers in each area they visit. Whenever venturers buy or sell equipment, hire retainers, and/or engage in mercantile ventures in a market they have previously entered, they can treat the market as if it were one market class larger than its actual size (Class I markets remain Class I markets) or they can take a +1 bonus to market impact, whichever is more useful. A venturer’s mercantile network does not change market class for purposes of passive investments (p. XX), however. Cain, a 5th level venturer, is in Siadanos (a Class IV market). He wishes to purchase a heavy warhorse (700gp). According to the Equipment Availability by Market Class table, there is only a 25% chance for 1 heavy warhorse to be available in a Class IV market. However, Cain has visited Siadanos before, so he can treat it as a Class III market. There is a 100% chance for 1 heavy warhorse available in a Class III market, so Cain is able to purchase the heavy warhorse. His party members shake their heads in amazement that he’s found such a fine steed in an outpost town. “I know people,” he explains."
    },
    {
      "name": "Multilingual",
      "description": "As world travelers, venturers become conversant in a wide variety of tongues of their trading partners, thereby gaining three bonus languages. The venturer can select some or all of these languages immediately from among those in common use in the campaign’s starting region or select them later from among those he encounters in play."
    },
    {
      "name": "Pathfinding",
      "description": "When the venturer guides a party in familiar territory, the party gains a +4 bonus on proficiency throws to avoid getting lost. (At 1st level, a venturer is considered familiar with the civilized areas of his starting region as well as all territory within one 24-mile hex radius of civilized areas. With each additional level of experience, the radius increases one 24-mile hex further from civilization.) See the Wilderness Expeditions section of Chapter 6 (p. XX) for more details on getting lost."
    },
    {
      "name": "Treachery",
      "description": "Despite the venturer’s agreeable disposition and generous fiscal offerings, sometimes business might get ugly. It is for this reason that every venturer learns the art of treachery. Anytime a venturer uses his Diplomacy or Bribery to gain a Friendly reaction roll, he can force every creature (allied or enemy) within 30’ to make surprise rolls at a -3 penalty by treacherously attacking. Any creature that failsthe roll issurprised for the first round of combat. If the venturer has some way of secretly signaling to his party (such as Signaling proficiency) or has planned the treachery to occur in advance, then his party does not have to make the surprise roll. The art of treachery cannot be used if the NPC opposition also has a character with this power handling negotiation, due to professional courtesy and mutual paranoia. Cain and his party members are parleying with representatives of the Argollëan Brotherhood in the sewers of the Undercity below Cyfaraun. Ownership of the elven artifacts found in the Nethercity is a point of contention but after a few minutes of discussion and a few bribes, Cain achieves Friendly reactions with the Brotherhood. With a deal seemingly at hand, Cain uses the art of treachery. He and his party gain a +3 bonus to surprise the Brotherhood thieves by immediately initiating combat. However, if Liber Faunus were present, this bonus would not apply, because the leader of the Brotherhood is a venturer and hence also comprehends the art of treachery."
    },
    {
      "name": "Steady Trade Route (2nd level)",
      "description": "Through long-term business dealings, the venturer establishes a steady trade route for transactions in any two types of merchandise between any two of the markets that he has visited. The trade route’s markets, and the specific type of merchandise that is bought and sold at each market, is chosen by the venturer when he establishes the trade route. Thereafter, anytime the venturer personally enters one of the trade route’s markets, he can add one-half his class level to his market impact when determining the amount of merchandise of that type available for purchase or sale. If that results in his market impact exceeding the market maximum, reduce the market impact by 4 but shift to the next highest market class. A venturer can also manage an additional passive investment per steady trade route he establishes (p. XX)."
    },
    {
      "name": "Rumormongering (4th level)",
      "description": "The venturer has learned that business empires rise and fall on information. Through his rumormongering, he can automatically learn 1d4 interesting rumors from old contacts and commercial associates any time he revisits an urban settlement he has previously done business in. Rumormongering requires one day of dedicated activity in an urban settlement. A venturer can rumormonger in any given urban settlement only once per month. Steady Trade Route (6 th level): The venturer establishes a second steady trade route for transactions in any two types of merchandise between any two of the markets that he has visited. The trade route can be for the same merchandise in a new market or markets, for different merchandise in the same market as his current route, or for different merchandise in different markets, as desired."
    },
    {
      "name": "Access to Capital (8th level)",
      "description": "The venturer’s reputation for money-making aids him in securing financing. He can borrow money from the merchant guild at an interest rate of 3% per month without collateral or at an interest rate of 1% per month with collateral. There is no limit to how much he can borrow in total, but each market only has a limited pool of capital for use each month, shown on the adjoining table. If the venturer fails to pay interest each month, he becomes disreputable in that market. While disreputable, he cannot use his mercantile network or friendly merchant connections. If the venturer allows interest payments to build up such that he owes more in gp than his total XP, then his former business partners will begin to send rival adventurers after him, with wages by level that total the monthly interest payment. A henchman will not use this ability on behalf of his employer, but a player character can do so on behalf of his fellow party members. Cain has advanced to 8th level, and gains access to capital. While visiting Aura (a huge Class I market with 100,000 families), he borrows 500,000gp without collateral, which he uses to help his fellow adventurers begin building strongholds. However, each month he owes 3% on the outstanding balance in interest, i.e. 15,000gp. If he fails to meet his interest payments, he will become disreputable in Aura, losing use of many of his class powers. In addition, because he owes more than his XP total, if he fails to pay then the merchant guild will send bounty hunters after him. With a debt payment of 15,000gp, he might face a 12th and 8th level bounty hunter team (12,000gp and 3,000gp wage respectively), a party of 5 8th -level bounty hunters (3,000gp wage each), etc. Market Class Max Capital / Month I 100,000gp* II 25,000gp III 10,000gp IV 5,000gp V 2,000gp VI 1,000gp *Per 20,000 families"
    },
    {
      "name": "Guildhouse (9th level)",
      "description": "By acquiring a guildhouse worth at least 5,000gp, the venturer can attract followers to his service. 2d6 1st level venturers will arrive to serve him as followers within 1d4 weeks of him acquiring the guildhouse. If the venturer already has a guildhouse, the followers arrive to serve him within 1d4 weeks of him reaching 9th level. If hired, the followers must be paid standard rates for henchmen. These followers will serve the character with some loyalty, though at least one will be an infiltrator working for the venturer’s local rivals, sent to keep an eye on the character. Some venturers use their guildhouse to start a criminal syndicate, expanding their wealth through illegitimate channels. When a venturer operates a criminal syndicate, his guildhouse counts as a hideout of one-half its value. The venturer otherwise follows all of the rules for hideouts and hijinks detailed in the Campaigns chapter (p. XX). All venturers, of course, use their guildhouse to coordinate their legitimate investments. The venturer can make a number of additional passive investment of any type equal to the value of his guildhouse divided by the maximum investment in the market class where his guildhouse is located. Rules for passive investments can be found in the Campaigns chapter (p. XX)."
    },
    {
      "name": "Steady Trade Route (10th level)",
      "description": "The venturer establishes a third steady trade route for transactions in any two types of merchandise between any two of the markets that he has visited. The trade route can be for the same merchandise in a new market or markets, for different merchandise in the same market as his current route, or for different merchandise in different markets, as desired."
    },
    {
      "name": "Monopoly Power (12th level)",
      "description": "If the venturer has established a guildhouse in a settlement, he can use it to seize monopoly power in that settlement. Thereafter, he earns 1gp per month in monopoly revenue per urban family in the urban settlement. He does not need to be the domain’s ruler to earn this revenue; if he is the domain’s ruler, the monopoly revenue is in addition to his domain revenue. Only one venturer in each urban settlement can earn monopoly revenue from each urban family. If there is more than one venturer with this class power operating in the settlement, then either the character must eliminate his rival(s) or he must come to a deal to distribute the monopoly revenue between the various venturers. Cain has now become a 12th level merchant prince with a merchant guildhouse in Aura. Aura has 100,000 families, so Cain could earn as much as 100,000gp per month in monopoly revenue if he were the sole venturer in the city. However, the ancient and opulent capital has three other high-level venturers living there, including Armento Drakomir, Tullius Valens, and Varian Lazar. Cain partners with Armento Drakomir to eliminate Tullius Valens and Varian Lazar and the two then split the families between them, each earning 50,000gp in monopoly revenue per month."
    }
  ],
  "assassin": [
    {
      "name": "Backstabbing",
      "description": "Assassins are skilled at treacherously attacking unprepared enemies. An assassin can backstab any vulnerable opponent. Backstabs can be made in melee or with missile weapons at short range, but cannot be made with missile weapons at medium or longer range. When backstabbing, an assassin gains a +4 bonus to hit and if the attack succeeds, the assassin deals an additional die of damage for every four levels he has attained."
    },
    {
      "name": "Hiding",
      "description": "Assassins are trained to skulk unseen in the cover of darkness. An assassin can begin hiding as a combat action anytime he is in cover, dim light, or darkness. When the assassin begins hiding, the Judge must make a Hiding proficiency throw on behalf of the assassin. An assassin will always think he is successful in this skill, and will not know otherwise until others react to his presence. Regardless of whether the throw succeeds, opponents encountering the assassin suffer a -2 penalty to surprise rolls as long as he remains stationary in cover, dim light, or darkness. If the throw succeeds, the assassin is hidden. If the throw fails, the assassin is not hidden. No creature can claim line of sight on an assassin that is hidden from it. If a hidden assassin engages an unengaged opponent, the opponent cannot make a free facing change (p. XX). If an opponent knows the hidden assassin’s general location, the opponent can attack him in melee at a -4 penalty, but it cannot even blindly attack the assassin if it doesn’t knows his general location. The hidden condition expires at the end of the assassin’s initiative if he moves or attacks. It also terminates if the cover, dim light, or darkness no longer conceals the assassin from his opponents."
    },
    {
      "name": "Shadowy Senses",
      "description": "Since the bright light of torches will reveal their positions, assassins learn to rely on superior night-vision, keen hearing and smell, and echolocation to slowly scout through dark alleys, lightless dungeons, and star-lit rooftops. When moving at combat speed or exploration speed, an assassin can “see” as if he were carrying a light source that sheds dim light in a 30’ radius. Shadowy senses can be used to fight, probe for traps, and so on. However, shadowy senses cannot be used to discern colors, faces, markings, or flat images (such as frescoes and murals) or to read books, maps, or scrolls. Shadowy senses does not function if the assassin is charging or running, if deafened, or if in an area of magical darkness or magical silence. Because it counts as dim light, an opponent can hide from shadowy senses."
    },
    {
      "name": "Sneaking",
      "description": "Assassins learn to prowl with great stealth. An assassin can begin sneaking as a movement action. He can sneak at his encounter speed or one-half combat speed without penalty. If he moves greater than half his combat speed, he takes a -5 penalty to the Sneaking proficiency throw. If he runs, he takes a -10 penalty. When the assassin begins sneaking, the Judge must make a Sneaking proficiency throw on behalf of the assassin. An assassin will always think he is successful in this skill, and will not know otherwise until others react to his presence. Regardless of whether the throw succeeds, opponents encountering the assassin suffer a -2 penalty to surprise rolls if the assassin is outside their line of sight. If the throw succeeds, the assassin is also sneaking. If the throw fails, the assassin is not sneaking. When sneaking, the assassin makes no noise when he moves — none whatsoever. Even alert creatures that make a successful Listening proficiency throw will not hear a sound. When a sneaking assassin engages an unengaged opponent from the rear, the opponent cannot make a free facing change."
    },
    {
      "name": "Streetwise",
      "description": "The assassin has learned the hard lessons taught by life as a criminal. He might begin play as a member of an assassin’s guild or other criminal syndicate (Judge’s discretion). He can engage in hijinks if he has the necessary proficiencies or thief skills. He can automatically identify gestures, signs, slang, and territory of criminal organizations in his home settlement. He can identify those of other urban settlements with a proficiency throw of 11+. Secret organizations or organizations in far-off cities might be harder to recognize. (This class power is equivalent to one rank of Streetwise proficiency.)"
    },
    {
      "name": "Hideout (9th level)",
      "description": "By acquiring a hideout worth at least 5,000gp, the assassin can attract followers to his service. 2d6 1 st level assassins will arrive to serve him as followers within 1d4 weeks of him acquiring the hideout. If the assassin already has a hideout, the followers arrive to serve him within 1d4 weeks of him reaching 9th level. If hired, the followers must be paid standard rates for henchmen. These followers will serve the character with some loyalty, though at least one will be an infiltrator working for the assassin’s local rivals, sent to keep an eye on the character. A cunning and resourceful assassin can use these followers to start a criminal syndicate. Additional rules for hideouts and syndicates are detailed in the Campaigns chapter."
    }
  ],
  "barbarian": [
    {
      "name": "Animal Reflexes",
      "description": "Barbarians react to danger as fast as a deer to a wolf. A barbarian gains a +1 bonus to initiative and a +1 bonus to avoid surprise."
    },
    {
      "name": "Natural Proficiency",
      "description": "Depending on his region of origin, every barbarian possesses natural proficiencies in a particular area. These are bonus proficiencies that do not count against the barbarian’s normal selections. • Barbarians from Jutland gain Climbing and Seafaring proficiencies. • Barbarians from Skysostan gain Precise Shooting and Riding proficiencies. • Barbarians from the Ivory Kingdoms gain Running and Endurance proficiencies. The Judge might devise other natural proficiencies for other barbarian regions in his own setting."
    },
    {
      "name": "Natural Stealth",
      "description": "As hunters and raiders by trade, barbarians are naturally sneaky. Opponents suffer a -2 penalty to surprise rolls when encountering a barbarian approaching from outside line of sight or lying in wait in cover or darkness."
    },
    {
      "name": "Savage Resilience",
      "description": "The healers and priests of civilized lands are foreign to barbarians, who rely on their savage resilience to survive. When a barbarian is required to consult the Mortal Wounds table, the player can roll twice and choose the preferred result to apply. Barbarians also subtract their class level from the number of days of bed rest required to recover."
    },
    {
      "name": "Animal Magnetism (5th level)",
      "description": "The barbarian has become a formidable presence who inspiresthose who follow him. Any henchmen and mercenaries hired by the barbarian gain a +1 bonus to their morale score whenever he personally leads them. This bonus stacks with any modifiers from the barbarian’s Charisma or proficiencies. Chieftain’s Hall (9th level): By acquiring a chieftain’s hall worth at least 15,000gp, the barbarian can attract followers to his service. 5d6 x 10 0th level troops and 1d6 barbarians of 1st – 3 rd level arrive to serve him within 1d3 months of him acquiring the chieftain’s hall. If the barbarian already has a chieftain’s hall, the followers arrive to serve him within 1d3 months of him reaching 9th level. The barbarian must pay his followers the ordinary rates for mercenaries and henchmen or they leave his service. Additional rules for chieftain’s halls are detailed in the Campaigns chapter."
    }
  ],
  "bard": [
    {
      "name": "Arcane Dabbling",
      "description": "Bards are prone to dabble in the arcane. They can attempt to use wands, staffs, and other magic items only usable by arcane casters. The bard does not need to know the command word for the item, but he must make a proficiency throw of 4+ on 1d20 or the attempt backfires in some desultory way (Judge’s discretion)."
    },
    {
      "name": "Listening",
      "description": "Bards have sharp ears that permit them to hear noises in caves, hallways, at a door, or other locations. The Judge makes a Listening proficiency throw in secret on behalf of the bard. If the throw succeeds, he hears any noises in earshot. If the throw fails, or if there aren’t any noises in earshot, he doesn’t hear anything. The bard must be quiet and must be the closest creature in the party relative to the location of the sound or suspected sound. Listening only requires one round but can only be undertaken once per turn (10 minutes) if the party is moving at all, because it takes time for people to settle down into quiet."
    },
    {
      "name": "Inspire Courage",
      "description": "By reciting heroic lays and epic poems, bards can improve the effectiveness of their allies. Inspiring courage requires a few moments of oration before a battle (one round), and makes up to 30 of the bard’s allies within a 50’ radius inspired. An inspired creature gains a +1 bonus to attack throws, armor class, morale rolls (for monsters or NPCs allied with the caster), and saving throws against magical fear. The bonus lasts for 10 minutes (1 turn). A bard can inspire courage once per day per class level. (Even the most inspired epic gets stale if you hear it twice in the same day.) A bard cannot inspire courage on characters who are already engaged in combat."
    },
    {
      "name": "Jack of All Trades",
      "description": "Being habitually curious jacks-of-all-trades, bards pick up an array of skills that vary widely. The bard can learn a class proficiency from any class; a thief skill (excluding backstab); a venturer class power (excluding mercantile network); or other class power approved by the Judge, excluding spellcasting powers. The bard cannot select a class power when the bard’s class level is lower than the class level at which that power becomes available to its default class. For instance, he could not select Rumormongering at 1st level because it doesn’t become available to venturers until 4th level. Note that some selections might not be useful; e.g. the bard has no spells to regain with Contemplation, so that proficiency isn’t ever a good choice."
    },
    {
      "name": "Loremastery",
      "description": "The bard can make a proficiency throw of 18+ to decipher occult runes, remember ancient history, or identify a historic artifact or special monster part. The proficiency throw required reduces by 1 per level. He can also identify magic items as if he were a 5th level mage. (This class power is the equivalent of Loremastery proficiency.)"
    },
    {
      "name": "Multilingual",
      "description": "Because they travel widely and converse freely, bards become conversant in a wide variety of tongues. They gain three bonus languages. The bard can select some or all of these languages immediately from among those in common use in the campaign’s starting region or select them later from among those he encounters in play. (This class power is the equivalent of one rank of Language proficiency.)"
    },
    {
      "name": "Performance",
      "description": "The bard has been trained in a performing art such as chanting, reciting poetry, singing, or playing an instrument. He can earn 10gp per month from working as a street performer or tavern entertainer. He can identify renowned performers, famous works, and unusual songs with a proficiency throw of 11+. (This class power is equivalent to one rank of Performance proficiency.)"
    },
    {
      "name": "Jack of All Trades II (3rd level)",
      "description": "The bard can learn another class proficiency from any class, thief skill (excluding backstab), venturer class power (excluding mercantile network), or other class power approved by the Judge, excluding spellcasting."
    },
    {
      "name": "Deciphering (4th level)",
      "description": "The bard gains the ability to decipher text (including ciphers, treasure maps, and dead languages, but not magical writings). Deciphering a page of text requires one turn (10 minutes) and a successful proficiency throw of 4+ on 1d20. If the roll does not succeed, the bard cannot try to decipher that particular page of text until he reaches a higher level of experience."
    },
    {
      "name": "Chronicles of Battle (5th)",
      "description": "The bard’s songs and stories inspire his hirelings to strive for glory. Any henchmen and mercenaries hired by the bard gain a +1 bonus to their morale score while the bard is present to witness and record their deeds. This bonus stacks with any modifiers from the bard’s Charisma or proficiencies."
    },
    {
      "name": "Jack of All Trades III (6th level)",
      "description": "The bard can learn another class proficiency from any class, thief skill (excluding backstab), venturer class power (excluding mercantile network), or other class power approved by the Judge, excluding spellcasting."
    },
    {
      "name": "Inspire Hope (7th)",
      "description": "By recounting the glorious deeds of old, bards can brighten the darkest moment. Inspiring hope requires a few moments of oration (one round), and grants up to 30 of the bard’s allies within 30’ a pool of temporary hit points. The number of hit points gained by each ally is determined on the adjoining table based on the bard’s or the ally’s max hit points (whichever is lower). These temporary hit points last for one turn (10 minutes), until lost to damage, or until the bard inspires hope on the ally again, whichever comes first. The bard can inspire hope once per day at 7th level, and one additional time per day with each level thereafter."
    },
    {
      "name": "Jack of All Trades IV (8th level)",
      "description": "The bard can learn another class proficiency from any class, thief skill (excluding backstab), venturer class power (excluding mercantile network), or other class power approved by the Judge, excluding spellcasting."
    },
    {
      "name": "Great Hall (9th level)",
      "description": "By acquiring a great hall worth at least 15,000gp, the bard can attract followers to his service. 5d6 x 10 0th level troops and 1d6 bards of 1st – 3 rd level arrive to serve him within 1d3 months of him acquiring the hall. If the bard already has a hall, the followers arrive to serve him within 1d3 months of him reaching 9th level. The bard must pay his followers the ordinary rates for mercenaries and henchmen or they leave his service. Additional rules for great halls are detailed in the Campaigns chapter."
    },
    {
      "name": "Scrollreading (10th)",
      "description": "The bard gains the ability to read and cast magic from arcane and divine scrolls. The bard does not have to be able to read the language in which the scroll is written provided he has successfully deciphered it before. Reading a magical scroll requires one round and a successful proficiency throw of 4+ on 1d20. However, a failed throw means the spell does not function as expected, and can create a horrible effect at the Judge’s discretion."
    },
    {
      "name": "Jack of All Trades V (11th level)",
      "description": "The bard can learn another class proficiency from any class, thief skill (excluding backstab), venturer class power (excluding mercantile network), or other class power approved by the Judge, excluding spellcasting."
    }
  ],
  "bladedancer": [
    {
      "name": "Graceful Fighting",
      "description": "The bladedancer fights in an agile and acrobatic style that resembles a choreographed dance. If a bladedancer is wearing light armor, very light armor, or no armor, and carrying 5 stones or less encumbrance, she gains a +1 bonus to initiative and a +1 bonus to Armor Class. At 7 th level, the AC bonus increases to +2, and at 13th level the AC bonus increases to +3. Graceful fighting can be stacked with Swashbuckling proficiency to increase the AC bonus, but the bonus from Swashbuckling is capped at +1 unless the bladedancer is unarmored."
    },
    {
      "name": "Divine Magic",
      "description": "Bladedancers can manifest their goddess’s power in the form of divine spells, which are granted through prayer and worship. The number and levels of spells the bladedancer can cast in a single day are listed on the Bladedancer Spell Progression table. The bladedancer’s spell selection is limited to the spells in her order’s repertoire (which is different than that of the crusader). See the Spells chapter for a list of all available spells."
    },
    {
      "name": "Strength of Faith",
      "description": "When the bladedancer strikes a foe, the goddess lends her strength to the blow. The bladedancer can apply her WIL modifier instead of her STR modifier on any damage roll affected by STR."
    },
    {
      "name": "Theology",
      "description": "Every bladedancer receives religious instruction at an abbey, cloister, or temple. She can begin play as a member of a religious hierarchy (Judge’s discretion). She can acquire congregants through proselytizing. She can automatically identify religious symbols, spell signatures, trappings, and holy days of her own faith, and can recognize those of other faiths with a proficiency throw of 11+. Rare or occult cults might be harder to recognize. (This class power is the equivalent of one rank of Theology proficiency.)"
    },
    {
      "name": "Weapon Finesse",
      "description": "Bladedancers fight with lissome speed and cat-like agility. A bladedancer can apply her DEX modifier instead of her STR modifier on her melee attack throws when using weapons with which she is proficient. (This class power is the equivalent of Weapon Finesse proficiency, except that it applies to the bladedancer’s specific weapons rather than to all tiny, small, or medium weapons. It cannot stack with Weapon Finesse.)"
    },
    {
      "name": "Minor Magical Research (5th)",
      "description": "The bladedancer can scribe scrolls and brew potions."
    },
    {
      "name": "Major Magical Research (9th)",
      "description": "The bladedancer can create permanent magic items such as enchanted armor, rings, or weapons."
    },
    {
      "name": "Temple (9th level)",
      "description": "By acquiring a temple worth at least 15,000gp, the bladedancer can attract followers to her service. So long as the bladedancer is currently in favor with her goddess, she can buy or build her temple at half the normal price due to miraculous assistance. 5d6 x 10 0th level troops and 1d6 bladedancers of 1st level of the same religion arrive to serve her within 1d3 months of her acquiring the temple. If the bladedancer has already acquired a temple, the followers arrive to serve her within 1d3 months of her reaching 9th level. The followers are fanatically brave and completely loyal (loyalty +4 and morale +4). Despite their loyalty, the followers must be paid a fair wage or they might eventually leave the bladedancer’s service. Additional rules for temples are detailed in the Campaigns chapter."
    },
    {
      "name": "Supreme Magical Research (11th level)",
      "description": "The bladedancer can learn and cast ritual divine spells of great power (7th, 8th, and 9th level) and craft magical constructs. If chaotic, the bladedancer can create necromantic servants and become undead. Rules for magic research can be found in the Campaigns chapter (p. XX). CODE OF BEHAVIOR Like crusaders, bladedancers must uphold the strictures of their order and their goddess. If the Judge has not specified particular religious orders in his campaign, the default bladedancer is assumed to be from the Temple of the Blade and Veil, the order devoted to Ianna, Goddess of Love and War. The strictures of their order are many. • The bladedancer must always carry a weapon on her person, except where imperial or sacred law forbids it. • The bladedancer must offer prayers to Ianna at dawn and dusk. Offering prayers requires one turn (10 minutes). • The bladedancer must not debase herself by fighting with the implements of the peasantry such as axes and hammers, by dishonorably firing bows or slings from a distance, or by resorting to shields for defense. (She can, however, hurl javelins or spears she carries.) • The bladedancer must not get married or have children before she reaches the rank of Blade-Dancer (7th level). She needn’t remain chaste, however, and may have liaisons as desired. • The bladedancer must not use her divine magic for unlawful or chaotic purposes. If a bladedancer ever falls from favor, due to violating the strictures of her faith, the goddess can impose penalties upon the bladedancer. As with crusaders, these penalties are entirely up to the Judge."
    },
    {
      "name": "Divine Magic",
      "description": "Priestesses can manifest their goddess’s power in the form of divine spells, which are granted through prayer and worship. The number and levels of spells the priestess can cast in a single day are listed on the Priestess Spell Progression table. The priestess’s spell selection is limited to the spells in her order’s repertoire (which is different than that of the crusader). See the Spells chapter for a list of all available spells."
    },
    {
      "name": "Theology",
      "description": "Every priestess receives religious instruction at an abbey, cloister, or temple. She can begin play as a member of a religious hierarchy (Judge’s discretion). She can acquire congregants through proselytizing. She can automatically identify religious symbols, spell signatures, trappings, and holy days of her own faith, and can recognize those of other faiths with a proficiency throw of 11+. Rare or occult cults might be harder to recognize. (This class power is the equivalent of one rank of Theology proficiency)."
    },
    {
      "name": "Minor Magical Research (5th level)",
      "description": "The priestess can scribe magical scrolls and brew potions."
    },
    {
      "name": "Major Magical Research (9th level)",
      "description": "The priestess can create more powerful magic items such as weapons, rings, and staffs."
    },
    {
      "name": "Supreme Magical Research (11th level)",
      "description": "The priestess can learn and cast ritual divine spells of great power (7th, 8th, and 9th level) and craft magical constructs. If chaotic, the priestess can create necromantic servants and become undead. Rules for magic research can be found in the Campaigns chapter (p. XX). CODE OF BEHAVIOR Like crusaders, priestesses must uphold the strictures of their order and their goddess. If the Judge has not specified particular religious orders in his campaign, the default priestess is assumed to be from the Keepers of the Hearth Fire, the order devoted to Mityara, Goddess of Civilization and Mercy. The strictures of their order are many. • The priestess must always wear the white mantles and shawls of their order when in public. • The priestess must offer prayers to Mityara at dawn and dusk. Offering prayers requires one turn (10 minutes). • Every seventh day, the priestess must keep a flame lit throughout the night, representing the light of civilization. • The priestess must refrain from the taking of human or demi-human life by any means. (Of course, beastmen, undead, and other monsters are abominations and should be put down!) • The priestess must remain both chaste and celibate until she reaches the rank of Mother (7th level). • The priestess must not use her divine magic for unlawful or chaotic purposes. If a priestess ever falls from favor, due to violating the strictures of her faith, the goddess might impose penalties upon the priestess. As with crusaders, these penalties are entirely up to the Judge."
    }
  ],
  "shaman": [
    {
      "name": "Commune with Spirits",
      "description": "As the intermediary between his tribe and the sacred powers that watch over them, the shaman has the ability to commune with spirits once per week. When using this power, he can choose between the ancestral spirits of his tribe, or the natural spirits of his current location. The spirits will answer three yes-or-no questions to the best of their ability. The ritual takes 1 turn to complete, during which time the shaman is 'out of body' and entirely helpless."
    },
    {
      "name": "Divine Magic",
      "description": "Shamans can manifest the power of their tribal gods and spirits in the form of divine spells, which are granted through prayer and worship. The shaman’s spell selection is limited to the spells in his order’s repertoire."
    },
    {
      "name": "Tribal Traditions",
      "description": "Every shaman receives instruction in the sacred rites and religious traditions of his tribe. He can acquire congregants through proselytizing. He can automatically identify religious symbols, spell signatures, trappings, and holy days of his own tribal traditions."
    },
    {
      "name": "Totem Animal",
      "description": "Every shaman has a totem animal as a companion. The totem animal physically represents the shaman’s relationship with his sacred powers. The totem animal has human-like intelligence, with Intellect equal to half the shaman’s Intellect. While the totem animal is alive, the shaman receives the animal’s totem benefit (a bonus proficiency related to the totem). Because it is partly a creature of the shaman’s own spirit, the totem animal always has a number of Hit Dice equal to one less than the shaman’s own."
    },
    {
      "name": "Spiritual Ritual (3rd level)",
      "description": "The shaman can perform a spiritual ritual to re-gain the ability to cast a spell of a level he had previously expended. Each spiritual ritual requires one hour (6 turns). He can perform a spiritual ritual as often as desired, but cannot regain the same level of spell more than once per day."
    },
    {
      "name": "Minor Magical Research (5th level)",
      "description": "At 5th level or higher, the shaman can scribe scrolls and brew potions."
    },
    {
      "name": "Shapechanging (5th level)",
      "description": "The physical link between the shaman and his totem becomes strong enough for the shaman to shapechange into his totem animal. A 5th level shaman can initially shapechange once per day. With each level of experience gained, the shaman can change shape one additional time per day."
    },
    {
      "name": "Spiritwalking (7th level)",
      "description": "The shaman’s spiritual powers have grown strong enough for him to spiritwalk. After 1 turn (10 minutes) of chanting, the shaman enters a deep trance during which his spirit walks free of his body. A spiritwalking shaman’s spirit can assume either human or totem animal shape as desired."
    },
    {
      "name": "Major Magical Research (9th level)",
      "description": "The shaman can create more powerful magic items such as weapons, rings, and staffs."
    },
    {
      "name": "Medicine Lodge (9th level)",
      "description": "By acquiring a medicine lodge worth at least 15,000gp, the shaman can attract followers to his service. Followers arrive to serve him within 1d3 months of him reaching 9th level."
    },
    {
      "name": "Supreme Magical Research (11th level)",
      "description": "The shaman can learn and cast ritual divine spells of great power (7th, 8th, and 9th level) and craft magical constructs."
    },
    {
      "name": "Code of Behavior",
      "description": "Shamans must uphold the traditions of their ancestors and the gods and spirits they serve. The shaman must always display a holy symbol of his tribe and totem somewhere on his person when in public."
    }
  ],
  "witch": WITCH_POWERS,
  "elven nightblade": [
    {
      "name": "Arcane Magic (2nd level)",
      "description": "As magical assassins, elven nightblades learn and cast arcane spells at a slower rate than mages. An elven nightblade can cast spells while wearing light or very light armor."
    },
    {
      "name": "Quiet Magic (2nd level)",
      "description": "Nightblades can cast their spells with minimal words and gestures. A successful proficiency throw to hear noise is required to hear the nightblade cast spells."
    },
    {
      "name": "Minor Magical Research (7th level)",
      "description": "The elven nightblade can research spells, scribe magical scrolls, and brew potions as if he were a 5th level mage."
    },
    {
      "name": "Hideout (9th level)",
      "description": "By acquiring a hideout worth at least 5,000gp, the elven nightblade can attract followers to his service."
    },
    {
      "name": "Racial Trait: Attunement to Nature",
      "description": "Elves gain a +1 bonus to surprise rolls when in the wilderness. When using Adventuring to search or listen, they succeed on a 14+."
    },
    {
      "name": "Racial Trait: Connection to Nature",
      "description": "Elves are completely unaffected by diseases caused by undead, and gain a +1 bonus to Paralysis and Spells saving throws."
    },
    {
      "name": "Racial Trait: Elf Tongues",
      "description": "Elves can speak the Common, Elven, Gnoll, Hobgoblin, and Orc languages."
    }
  ],
  "warlock": [
    {
      "name": "Arcane Magic",
      "description": "Warlocks can learn and cast powerful arcane spells. A warlock’s spell selection is limited to the spells in his repertoire. A warlock’s repertoire can include the number of spells up to the number and level of spells listed for his level, increased by his Intellect bonus."
    },
    {
      "name": "Dark Path",
      "description": "Every warlock has chosen to follow a dark path: Demonology, Necromancy, or Transmogrification. Each dark path rewards the warlock with one class power at 1st level and one additional class power at 3rd, 5th, 7th, 9th, and 11th level."
    },
    {
      "name": "Occultism",
      "description": "Every warlock has studied the forbidden secrets of the occult. On a proficiency throw of 11+, he can name the popular titles and symbols of chthonic powers; identify the type of undead creature encountered; and otherwise recall information of interest to demonology and necromancy."
    },
    {
      "name": "Minor Magical Research (5th level)",
      "description": "The warlock can research spells, scribe magical scrolls, and brew potions."
    },
    {
      "name": "Major Magical Research (9th level)",
      "description": "The warlock can create more powerful magic items such as weapons, rings, and staffs."
    },
    {
      "name": "Sanctum (9th level)",
      "description": "By acquiring a sanctum (often a great tower) worth at least 15,000gp, the warlock can attract followers to his service as assistants in magical research."
    },
    {
      "name": "Supreme Magical Research (11th level)",
      "description": "The warlock can learn and cast ritual arcane spells of great power (7th, 8th, and 9th level), craft magical constructs, and create magical cross-breeds."
    },
    {
      "name": "Dark Path: Demonology (1st) - Conjure Dark Powers",
      "description": "When the demonologist casts summoning spells, the spell effects are calculated as if he were two caster levels higher than his actual level of experience. He is better at maintaining concentration over them."
    },
    {
      "name": "Dark Path: Demonology (3rd) - Theology",
      "description": "The demonologist has become a cultist of the chthonic powers. He gains one rank of the Theology proficiency."
    },
    {
      "name": "Dark Path: Demonology (5th) - Conjure Hellion",
      "description": "The demonologist has made pacts with demon lords. He can cast conjure hellion once per day."
    },
    {
      "name": "Dark Path: Demonology (7th) - Expanded Repertoire",
      "description": "The demonologist gains an expanded repertoire. The additional spells must be conjuration or summoning spells."
    },
    {
      "name": "Dark Path: Demonology (9th) - Words of Command",
      "description": "The demonologist can compel his conjured and summoned creatures to obey his inexorable will rather than pervert it."
    },
    {
      "name": "Dark Path: Demonology (11th) - Power of Sacrifice",
      "description": "Bargaining with the infernal powers has taught the demonologist the power of sacrifice. He can gain arcane power by blood sacrifice, and counts any arcane power from blood sacrifice as double its gp value."
    },
    {
      "name": "Dark Path: Necromancy (1st) - Secrets of the Dark Arts",
      "description": "The necromancer can control undead as a Chaotic crusader of one half his class level. When the character casts necromantic spells, the spell effects are calculated as if he were two class levels higher than his actual level."
    },
    {
      "name": "Dark Path: Necromancy (3rd) - Mortuary Science",
      "description": "The necromancer has undertaken a deep study of anatomy, circulation, disease, and vitality. He gains one rank of the Healing proficiency."
    },
    {
      "name": "Dark Path: Necromancy (5th) - Speak with Dead",
      "description": "The dead hold no secrets for the necromancer. He can cast speak with the dead once per day."
    },
    {
      "name": "Dark Path: Necromancy (7th) - Expanded Repertoire",
      "description": "The necromancer gains an expanded repertoire. The additional spells must be death and necromancy spells."
    },
    {
      "name": "Dark Path: Necromancy (9th) - Lordship Over the Undead",
      "description": "Whenever the character succeeds in controlling undead, the undead are controlled for 1 day per level instead of the usual 1 turn per level. If it would be 1 day per level, they are controlled indefinitely."
    },
    {
      "name": "Dark Path: Necromancy (11th) - Secrets of Life and Death",
      "description": "The necromancer has finally unlocked the secrets of life and death. He can perform necromancy at half the usual material cost and research cost."
    },
    {
      "name": "Dark Path: Transmogrification (1st) - Grotesque Arts",
      "description": "When the character casts transmogrification spells, the spell effects are calculated as if he were two class levels higher than his actual level of experience. Targets suffer a -2 penalty to their saving throw."
    },
    {
      "name": "Dark Path: Transmogrification (3rd) - Alchemy",
      "description": "To master the art of transmogrification one must unravel the secrets of alchemy. The character gains one rank of the Alchemy proficiency."
    },
    {
      "name": "Dark Path: Transmogrification (5th) - Skinchange",
      "description": "The transmogrifier has learned to transcend his own form. He can cast skinchange once per day."
    },
    {
      "name": "Dark Path: Transmogrification (7th) - Expanded Repertoire",
      "description": "The transmogrifier gains an expanded repertoire. The additional spells must be transmogrification spells."
    },
    {
      "name": "Dark Path: Transmogrification (9th) - Hideous Servant",
      "description": "Experiments combining living creatures with the transmogrifier’s own flesh and blood have created a hideous servant intimately bonded to his will. The hideous servant is mechanically similar to a shaman’s totem animal. However, the sorcerer selects characteristics from two different animals."
    },
    {
      "name": "Dark Path: Transmogrification (11th) - Shape Flesh and Bone",
      "description": "The transmogrifier can mold flesh and bone like clay. The character is able to create magical crossbreeds at half the usual material cost and research cost."
    }
  ],
  "paladin": [
    {
      "name": "Aura of Protection",
      "description": "Paladins are protected by a magical aura that grants them a +1 bonus to AC and a +1 bonus to saving throws against attacks made or effects created by evil creatures."
    },
    {
      "name": "Lay on Hands",
      "description": "By calling on the higher powers of Law, the paladin can lay on hands to heal injuries. He can heal 2 damage per level when the power is used. Can be used once per day."
    },
    {
      "name": "Manual of Arms",
      "description": "The paladin is highly experienced in military discipline, physical fitness, and weapon drill. He can automatically identify battle standards, equipment, etc."
    },
    {
      "name": "Sanctified Body",
      "description": "Paladins are completely immune to the ravages of disease, including magical diseases."
    },
    {
      "name": "Sense Evil",
      "description": "The paladin can detect creatures with evil intentions, magic items with evil enchantments, sinkholes of evil, etc., within 30’."
    },
    {
      "name": "Holy Fervor (5th level)",
      "description": "The paladin’s presence inspires troops he leads. Hirelings of the same religion gain a +1 bonus to their morale score."
    },
    {
      "name": "Fortress (9th level)",
      "description": "By acquiring a fortress or other stronghold worth at least 15,000gp, the paladin can attract followers to his service."
    }
  ],
  "priestess": [
    {
      "name": "Consolation",
      "description": "The priestess can console the faithful to better endure pain and suffering while they heal. Natural healing from resting is doubled for the next day."
    },
    {
      "name": "Diplomacy",
      "description": "They receive a +1 bonus on all reaction rolls when they attempt to parley with intelligent creatures."
    },
    {
      "name": "Divine Magic",
      "description": "Priestesses can manifest their goddess’s power in the form of divine spells, which are granted through prayer and worship."
    },
    {
      "name": "Lay on Hands",
      "description": "By calling on her goddess, the priestess can lay on hands to heal injuries. She can heal 2 damage per level when the power is used. Can be used once per day."
    },
    {
      "name": "Purity of the Body",
      "description": "The priestess is immune to all forms of disease, including magical diseases."
    },
    {
      "name": "Theology",
      "description": "She can automatically identify religious symbols, spell signatures, trappings, and holy days of her own faith, and can recognize those of other faiths."
    },
    {
      "name": "Minor Magical Research (5th level)",
      "description": "The priestess can scribe magical scrolls and brew potions."
    },
    {
      "name": "Major Magical Research (9th level)",
      "description": "The priestess can create more powerful magic items such as weapons, rings, and staffs."
    },
    {
      "name": "Cloister (9th level)",
      "description": "By acquiring a cloister worth at least 15,000gp, the priestess can attract followers to her service."
    },
    {
      "name": "Supreme Magical Research (11th level)",
      "description": "The priestess can learn and cast ritual divine spells of great power and craft magical constructs."
    }
  ],
  "dwarven craftpriest": CRAFTPRIEST_POWERS,
  "dwarven vaultguard": [
    {
      "name": "Cleave",
      "description": "Like fighters, they are devastating combatants. They can cleave after killing a foe once per level."
    },
    {
      "name": "Hardiness",
      "description": "Vaultguards are notoriously tough. They gain a +2 bonus on saving throws vs. onset of disease and poison."
    },
    {
      "name": "Manual of Arms",
      "description": "The vaultguard is highly experienced in military discipline, physical fitness, and weapon drill. He can fight as a regular troop in formed and loose units."
    },
    {
      "name": "Vanguard (5th level)",
      "description": "The vaultguard’s presence inspires troops he leads. Hirelings gain a +1 bonus to their morale score whenever he personally leads them."
    },
    {
      "name": "Vault (9th level)",
      "description": "By acquiring a vault worth at least 15,000gp, the vaultguard can attract followers to his service."
    },
    {
      "name": "Racial Trait: Attunement to Stone",
      "description": "Dwarves can detect traps, false walls, hidden construction, or sloped passages on an 11+, and can automatically determine direction underground."
    },
    {
      "name": "Racial Trait: Connection to Stone",
      "description": "Dwarves take only half damage from earth- or stone-based spells or effects, and gain a +1 bonus to Blast and paralyze/petrify saves."
    }
  ],
  "elven spellsword": [
    {
      "name": "Arcane Magic",
      "description": "Spellswords can learn and cast arcane spells, though not as devoted as ordinary mages."
    },
    {
      "name": "Battle Magic",
      "description": "An elven spellsword can cast spells while wearing any type of armor."
    },
    {
      "name": "Cleave",
      "description": "Spellswords are devastating combatants. They can cleave after killing a foe once per level."
    },
    {
      "name": "Minor Magical Research (5th level)",
      "description": "The elven spellsword can research spells, scribe magical scrolls, and brew potions."
    },
    {
      "name": "Major Magical Research (9th level)",
      "description": "The elven spellsword can create more powerful magic items such as weapons, rings, and staffs."
    },
    {
      "name": "Fastness (9th level)",
      "description": "By acquiring a fastness worth at least 15,000gp, the elven spellsword can attract followers to his service."
    },
    {
      "name": "Racial Trait: Attunement to Nature",
      "description": "Elves gain a +1 bonus to surprise rolls when in the wilderness. When using Adventuring to search or listen, they succeed on a 14+."
    },
    {
      "name": "Racial Trait: Connection to Nature",
      "description": "Elves are completely unaffected by diseases caused by undead, and gain a +1 bonus to Paralysis and Spells saving throws."
    }
  ],
  "nobiran wonderworker": [
    {
      "name": "Arcane Magic",
      "description": "Wonderworkers cast arcane spells. Their selection is limited to the spells in their repertoire."
    },
    {
      "name": "Divine Blessing",
      "description": "Because of their divine ancestry, wonderworkers heal naturally at twice the rate of normal characters."
    },
    {
      "name": "Immunity to Disease",
      "description": "Wonderworkers are completely immune to all diseases, mundane and magical. They do not age past their prime."
    },
    {
      "name": "Minor Magical Research (5th level)",
      "description": "The wonderworker can research spells, scribe magical scrolls, and brew potions."
    },
    {
      "name": "Major Magical Research (9th level)",
      "description": "The wonderworker can create more powerful magic items such as weapons, rings, and staffs."
    },
    {
      "name": "Tower (9th level)",
      "description": "By acquiring a sanctum or tower worth at least 15,000gp, the wonderworker can attract followers to his service."
    },
    {
      "name": "Supreme Magical Research (11th level)",
      "description": "The wonderworker can learn and cast ritual arcane spells of great power and craft magical constructs."
    }
  ],
  "zaharan ruinguard": [
    {
      "name": "Arcane Magic",
      "description": "Ruinguards cast arcane spells. Unlike typical mages, they can cast spells while wearing up to medium armor, but cannot cast spells while using a shield or wearing heavy armor."
    },
    {
      "name": "Black Lore of Zahar",
      "description": "The ruinguard can command undead to do his bidding. With a throw of 11+, he can force a type of undead creature to obey his commands."
    },
    {
      "name": "Cleave",
      "description": "Ruinguards can cleave after killing a foe once per level."
    },
    {
      "name": "Minor Magical Research (5th level)",
      "description": "The ruinguard can research spells, scribe magical scrolls, and brew potions."
    },
    {
      "name": "Major Magical Research (9th level)",
      "description": "The ruinguard can create more powerful magic items such as weapons, rings, and staffs."
    },
    {
      "name": "Ruined Fortress (9th level)",
      "description": "By occupying or building a fortress/sanctum worth at least 15,000gp, the ruinguard can attract fanatical followers."
    },
    {
      "name": "Racial Trait: Affinity for Death",
      "description": "Zaharans are completely unaffected by diseases caused by undead, and take only half damage from death spells or effects."
    },
    {
      "name": "Racial Trait: Attunement to Death",
      "description": "Zaharans gain a +1 bonus to any proficiency throws to identify undead, identify necromantic magic, or otherwise recall knowledge dealing with death or the occult."
    }
  ]
};
