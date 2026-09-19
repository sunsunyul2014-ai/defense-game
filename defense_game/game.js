const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const bgCanvas = document.createElement('canvas');
bgCanvas.width = canvas.width;
bgCanvas.height = canvas.height;
const bgCtx = bgCanvas.getContext('2d');

// Game State
let lives = 500;
let berries = 100;
let wave = 1;
const MAX_WAVE = 20;
let isWaveActive = false;
let frame = 0;
let enemiesSpawnedThisWave = 0;

// Grid settings
const cellSize = 50;
const cols = canvas.width / cellSize; // 16
const rows = canvas.height / cellSize; // 12

// Preload Images
const imgCache = {};
function getImg(id) {
    if (imgCache[id]) return imgCache[id];
    const img = new Image();
    img.crossOrigin = "Anonymous"; // just in case
    img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
    imgCache[id] = img;
    return img;
}

// POKEMON DATA (Towers & Evolutions)
const POKEMON_DATA = {
    'charmander': { name: '?åÏù¥Î¶?, spriteId: 4, cost: 50, range: 150, damage: 20, cooldown: 40, type: 'single', color: '#ef4444', desc: 'Íº¨Î¶¨??Î∂àÍΩÉ??Í∫ºÏ?Î©??∞Ïùº ?òÏöî! (?®Ïùº ?Ä??Í≥µÍ≤©)', evolveLvl: 8, evolveTo: 'charmeleon', attackStyle: 'fire' },
    'charmeleon': { name: 'Î¶¨Ïûê??, spriteId: 5, cost: 0, range: 160, damage: 45, cooldown: 35, type: 'single', color: '#dc2626', desc: '?±Í≤©???úÎ≤ï ?¨ÏïÖ?¥Ï°å?µÎãà?? ???®Í±∞! (?®Ïùº Í≥µÍ≤© + 10% ?ïÎ•† ?îÏÉÅ)', burnChance: 0.1, evolveLvl: 15, evolveCost: 300, evolveTo: 'charizard', attackStyle: 'fire' },
    'charizard': { name: 'Î¶¨ÏûêÎ™?, spriteId: 6, cost: 0, range: 180, damage: 120, cooldown: 35, type: 'aoe', aoeRange: 80, color: '#b91c1c', desc: 'ÏßÄÍµ¨ÎçòÏßÄÍ∏?ÎßàÎ†µ??.. Î™®Îì† Í±??úÏõåÎ≤ÑÎ¶¨??(Í¥ëÏó≠ ??∞ú Í≥µÍ≤© + 10% ?îÏÉÅ)', burnChance: 0.1, attackStyle: 'fire', itemEvolutions: { 'mega_stone_x': 'mega_charizard_x', 'mega_stone_y': 'mega_charizard_y' } },
    'mega_charizard_x': { name: 'Î©îÍ?Î¶¨ÏûêÎ™ΩX', spriteId: 10034, cost: 0, range: 80, damage: 250, cooldown: 30, type: 'aoe', aoeRange: 80, color: '#1e3a8a', desc: 'Í∞ïÎ†•???úÎûòÍ≥§Ïùò ?? (Ï¥àÍ∑º??Í¥ëÏó≠ ?ÄÍ≤?+ 15% ?ºÎ?)', confuseChance: 0.15, attackStyle: 'fire' },
    'mega_charizard_y': { name: 'Î©îÍ?Î¶¨ÏûêÎ™ΩY', spriteId: 10035, cost: 0, range: 220, damage: 200, cooldown: 35, type: 'aoe', aoeRange: 120, color: '#f59e0b', desc: 'Í∞ÄÎ≠??πÏÑ± Î∞úÎèô! (Ï¥àÍ¥ë????∞ú Í≥µÍ≤© + 30% ?îÏÉÅ)', burnChance: 0.3, attackStyle: 'fire' },

    'mega_venusaur': { name: 'Î©îÍ??¥ÏÉÅ?¥ÍΩÉ', spriteId: 10033, cost: 0, range: 250, damage: 85, cooldown: 25, type: 'aoe', aoeRange: 150, poisonChance: 0.6, color: '#16a34a', desc: '???ìÏ? Î≤îÏúÑ?Ä Í∞ïÌïú ÎßπÎèÖ! 2?∞ÏÜç Î∞úÏÇ¨.', multiHit: 2, multiHitDelay: 10, attackStyle: 'seed' },
    'mega_blastoise': { name: 'Î©îÍ?Í±∞Î∂Å??, spriteId: 10036, cost: 0, range: 250, damage: 200, cooldown: 120, type: 'spread', spreadCount: 1, pierceCount: 9999, flyEnd: true, projScale: 2.5, slowFactor: 0.4, slowDur: 120, color: '#3b82f6', desc: 'Îß??ùÍπåÏßÄ ?†ÏïÑÍ∞Ä???êÍ∫º??Í¥Ä??Î¨ºÎ??? Î™ÖÏ§ë ???îÌôî.', attackStyle: 'water' },
    'mega_raichu_y': { name: 'Î©îÍ??ºÏù¥Ï∏ÑY', spriteId: 10305, cost: 0, range: 250, damage: 150, cooldown: 90, type: 'aoe', aoeRange: 150, paralyzeChance: 0.3, color: '#facc15', desc: '?ÑÏ£º ?∏Í≥† ?ìÏ? Î≤îÏúÑ???ÑÏûê?? ÎßàÎπÑ 30%.', attackStyle: 'lightning' },
    'mega_raichu_x': { name: 'Î©îÍ??ºÏù¥Ï∏ÑX', spriteId: 10304, cost: 0, range: 140, damage: 25, cooldown: 8, type: 'normal', paralyzeChance: 0.05, color: '#fbbf24', desc: 'ÏßßÏ? Î≤îÏúÑ ?Ä?§Îã§??Î≤àÍ∞ú?ÄÏπ??∞Î∞ú! ÎßàÎπÑ 5%.', attackStyle: 'lightning' },
    'mega_lucario': { name: 'Î©îÍ?Î£®Ïπ¥Î¶¨Ïò§', spriteId: 10059, cost: 0, range: 240, damage: 160, cooldown: 35, type: 'aoe', aoeRange: 100, immuneToDebuffs: true, ignoreDef: true, defDownFactor: 1.3, debuffDur: 200, atkSpeedStack: true, color: '#3b82f6', desc: '?¨Í±∞Î¶? ???Ä??Ï¶ùÍ?. Î™®Îì† ?îÎ≤Ñ???ÑÏ†Ñ Î©¥Ïó≠!', attackStyle: 'water' },
    'mega_gengar': { name: 'Î©îÍ??¨Ì?', spriteId: 10038, cost: 0, range: 220, damage: 150, cooldown: 45, type: 'aoe', aoeRange: 130, debuffDur: 300, defDownFactor: 1.6, atkDownFactor: 0.4, poisonChance: 0.2, color: '#9333ea', desc: 'Î≤îÏúÑ Ï¶ùÍ? Î∞???20% Ï∂îÍ?! Î∞©Ïñ¥/Í≥µÍ≤© ?òÎùΩ(ÏßÄ???úÍ∞Ñ Ï¶ùÍ?).', attackStyle: 'shadow' },
    'mega_alakazam': { name: 'Î©îÍ??ÑÎîò', spriteId: 10037, cost: 0, range: 250, damage: 250, cooldown: 25, type: 'aoe', aoeRange: 130, knockbackChance: 0.15, paralyzeChance: 0.1, color: '#fcd34d', desc: '?? ?¨Í±∞Î¶? Î≤îÏúÑ, Í≥µÏÜç ?Ä??Ï¶ùÍ?! 15% Î∞ÄÏπòÍ∏∞?Ä 10% ÎßàÎπÑ.', attackStyle: 'psychic' },
    
    'zeraora': { name: '?úÎùº?§Îùº', spriteId: 807, cost: 0, range: 140, damage: 30, cooldown: 8, type: 'aoe', aoeRange: 80, paralyzeChance: 0.05, color: '#facc15', desc: 'Îπ†Î•∏ Í≥µÏÜç??Í∑ºÏ†ë Í¥ëÏó≠ Í≥µÍ≤©! (5% ÎßàÎπÑ)', itemEvolutions: { 'mega_zeraora_nite': 'mega_zeraora' }, attackStyle: 'lightning' },
    'mega_zeraora': { name: 'Î©îÍ??úÎùº?§Îùº', spriteId: 10319, cost: 0, range: 160, damage: 45, cooldown: 8, type: 'aoe', aoeRange: 100, paralyzeChance: 0.1, color: '#f59e0b', desc: 'ÎßàÎπÑ???ÅÏóêÍ≤?1.5Î∞∞Ïùò ?ºÌï¥!', bonusDamageToParalyzed: 1.5, attackStyle: 'lightning' },
    'squirtle': { name: 'Íº¨Î?Í∏?, spriteId: 7, cost: 50, range: 100, damage: 10, cooldown: 50, type: 'aura', color: '#3b82f6', desc: 'Íº¨Î?Í∏∞Îã® Ï∂úÏã†?ºÏ???Î™®Î¶Ö?àÎã§. ?†Í??ºÏä§???¥Îî®ÏßÄ? (Ï£ºÎ? Í¥ëÏó≠ + ?ΩÌïú ?îÌôî)', slowFactor: 0.8, slowDur: 60, evolveLvl: 8, evolveTo: 'wartortle' },
    'wartortle': { name: '?¥ÎãàÎ∂ÄÍ∏?, spriteId: 8, cost: 0, range: 130, damage: 25, cooldown: 45, type: 'aura', color: '#2563eb', desc: 'Í∑ÄÍ∞Ä ?†Í∞úÏ≤òÎüº ?ùÍ≤ºÏßÄÎß??†Ï???Î™ªÌï©?àÎã§. (Í¥ëÏó≠ Î≤îÏúÑ Î∞???Ï¶ùÍ? + ?îÌôî)', slowFactor: 0.7, slowDur: 80, evolveLvl: 15, evolveCost: 300, evolveTo: 'blastoise' },
    'blastoise': { name: 'Í±∞Î∂Å??, spriteId: 9, cost: 0, range: 190, damage: 80, cooldown: 40, type: 'aura', color: '#1d4ed8', desc: '?±ÍªçÏßàÏùò ?Ä?¨Î°ú Î≠êÎì†ÏßÄ ?†Î†§Î≤ÑÎ¶Ω?àÎã§! (?ìÏ? Í¥ëÏó≠ + Í∞ïÌïú ?îÌôî)', slowFactor: 0.5, slowDur: 120, itemEvolutions: { 'mega_stone_blastoise': 'mega_blastoise' } },
    
    'bulbasaur': { name: '?¥ÏÉÅ?¥Ïî®', spriteId: 1, cost: 50, range: 130, damage: 15, cooldown: 45, type: 'aoe', aoeRange: 60, color: '#22c55e', desc: '?®Ïïó??Î¨¥Í±∞?åÏÑú ??û†??Ï¶êÍπÅ?àÎã§. ?®Ïù¥- (Í¥ëÏó≠ ??∞ú Í≥µÍ≤©)', evolveLvl: 8, evolveTo: 'ivysaur', attackStyle: 'leaf' },
    'ivysaur': { name: '?¥ÏÉÅ?¥Ì?', spriteId: 2, cost: 0, range: 150, damage: 35, cooldown: 40, type: 'aoe', aoeRange: 75, color: '#16a34a', desc: '?±Ïùò Î¥âÏò§Î¶¨Í? ?ºÏñ¥?òÎ†§Í≥??¥Ïöî. ?ÅÏñëÍ∞Ä ÎßåÏ†ê! (Í¥ëÏó≠ Î≤îÏúÑ Î∞???Ï¶ùÍ?)', evolveLvl: 15, evolveCost: 300, evolveTo: 'venusaur', attackStyle: 'leaf' },
    'venusaur': { name: '?¥ÏÉÅ?¥ÍΩÉ', spriteId: 3, cost: 0, range: 200, damage: 65, cooldown: 35, type: 'aoe', aoeRange: 120, color: '#15803d', desc: '?îÎùºÎπ?Ï∂©Ï†Ñ ?ÑÎ£å! ?¨Ïã§ ÎßπÎèÖ????Î¨¥ÏÑ≠?µÎãà?? (Í¥ëÏó≠ ??∞ú Í≥µÍ≤© + 20% ÎßπÎèÖ)', poisonChance: 0.2, attackStyle: 'leaf', itemEvolutions: { 'mega_stone_venusaur': 'mega_venusaur' } },
    
    'pikachu': { name: '?ºÏπ¥Ï∏?, spriteId: 25, cost: 100, range: 150, damage: 25, cooldown: 40, type: 'chain', chainMax: 3, color: '#facc15', desc: '?ºÏπ¥?ºÏπ¥! ÏºÄÏ≤©ÏùÑ Í∞Ä??Ï¢ãÏïÑ?©Îãà?? (ÏµúÎ? 3Î™??∞ÏáÑ Î≤àÍ∞ú + ?ºÏãú Î©àÏ∂§)', stunDur: 15, evolveItem: 'thunder_stone', evolveTo: 'raichu' },
    'raichu': { name: '?ºÏù¥Ï∏?, spriteId: 26, cost: 0, range: 180, damage: 35, cooldown: 35, type: 'chain', chainMax: 5, color: '#eab308', desc: '?ºÏπ¥Ï∏ÑÎ≥¥???±Îö±?òÏ?Îß?Î≤àÍ∞ú?????ÑÌîï?àÎã§. (ÏµúÎ? 5Î™??∞ÏáÑ Î≤àÍ∞ú + 20% ÎßàÎπÑ)', stunDur: 20, paralyzeChance: 0.2, itemEvolutions: { 'mega_stone_raichu_x': 'mega_raichu_x', 'mega_stone_raichu_y': 'mega_raichu_y' } },
    
    'eevee': { name: '?¥Î∏å??, spriteId: 133, cost: 100, range: 100, damage: 5, cooldown: 50, type: 'single', color: '#c2410c', desc: '?∞Îã§?¨Í≥† ?∂Ï? ?? ?ÑÍµ¨Î•?Ï£ºÎ©¥ ?êÌïò???ïÌÉúÎ°?Î≥Ä?†Ìï©?àÎã§! (?ΩÌïú ?®Ïùº Í≥µÍ≤©)', itemEvolutions: { 'fire_stone': 'flareon', 'water_stone': 'vaporeon', 'thunder_stone': 'jolteon', 'leaf_stone': 'leafeon', 'ice_stone': 'glaceon' } },
    'flareon': { name: 'Î∂Ä?§ÌÑ∞', spriteId: 136, cost: 0, range: 140, damage: 60, cooldown: 45, type: 'aoe', aoeRange: 70, color: '#ef4444', desc: '?†Ïùº???)??Î∂àÍΩÉ! Ï≤¥Ïò®??Î¨¥Î†§ 900?ÑÍπåÏßÄ ?¨ÎùºÍ∞ëÎãà?? (Í¥ëÏó≠ ?îÏóº Í≥µÍ≤© + 30% ?îÏÉÅ)', burnChance: 0.3, attackStyle: 'fire' },
    'vaporeon': { name: '?§Î???, spriteId: 134, cost: 0, range: 150, damage: 45, cooldown: 40, type: 'single', color: '#3b82f6', desc: 'Î¨ºÏóê ?πÏïÑ?§Î©¥ ?¨Î™Ö?¥Ï†∏?? Ï¥âÏ¥â??Î≤ÑÌîÑ???? (?®Ïùº Í≥µÍ≤©. Ï£ºÏúÑ ?Ä??Í≥µÍ≤©??1.5Î∞??§Îùº)', hasDamageAura: true, auraRange: 120, auraMult: 1.5, attackStyle: 'water' },
    'jolteon': { name: 'Ï•¨Ìîº?¨Îçî', spriteId: 135, cost: 0, range: 150, damage: 40, cooldown: 20, type: 'single', color: '#facc15', desc: '?àÏóê Î≥¥Ïù¥ÏßÄ ?äÎäî ?çÎèÑ! ?∏Ïù¥ Îæ∞Ï°±Îæ∞Ï°± ?∞Í∞ë?µÎãà?? (Îß§Ïö∞ Îπ†Î•∏ Í≥µÍ≤© + 10% ÎßàÎπÑ)', paralyzeChance: 0.1, stunDur: 25, attackStyle: 'lightning' },
    'leafeon': { name: 'Î¶¨Ìîº??, spriteId: 470, cost: 0, range: 80, damage: 75, cooldown: 40, type: 'aoe', aoeRange: 80, color: '#22c55e', desc: 'Í¥ëÌï©??Ï§?.. Í∞ÄÍπåÏù¥ ?§Î©¥ ?Ä?éÏùò Îß§Ïö¥ÎßõÏùÑ Î≥¥Ïó¨Ï§çÎãà?? (Ï¥àÍ∑º??Í∞ïÎ†•??Î≤îÏúÑ Í≥µÍ≤©)', attackStyle: 'leaf' },
    'glaceon': { name: 'Í∏Ä?àÏù¥?úÏïÑ', spriteId: 471, cost: 0, range: 160, damage: 35, cooldown: 45, type: 'chain', chainMax: 5, color: '#38bdf8', desc: '?§Ïù¥?ÑÎ™¨???îÏä§?? ?îÏúÑÎ•???Í∞Ä?úÍ≤å ?¥Ï§ç?àÎã§. (ÏµúÎ? 5Î™??ºÏùå ?®Í≤∞ + 10% ?ºÏùå)', freezeChance: 0.1, attackStyle: 'ice' },
    
    'gastly': { name: 'Í≥†Ïò§??, spriteId: 92, cost: 80, range: 120, damage: 15, cooldown: 50, type: 'aoe', aoeRange: 60, color: '#a855f7', desc: '95%Í∞Ä Í∞Ä?§Î°ú ?¥Î£®?¥Ï°å?¥Ïöî. ?ÑÏÉà??ÏµúÏïÖ! (Í¥ëÏó≠ ?ÄÏ£? Í≥?Î∞?15% Í∞êÏÜå)', defDownFactor: 1.15, atkDownFactor: 0.85, debuffDur: 90, evolveLvl: 8, evolveTo: 'haunter', attackStyle: 'psychic' },
    'haunter': { name: 'Í≥†Ïö∞?§Ìä∏', spriteId: 93, cost: 0, range: 140, damage: 30, cooldown: 45, type: 'aoe', aoeRange: 80, color: '#7e22ce', desc: '?¥Îëê??Í≥≥Ïóê???¥Íπ®Î•??°ÌÜ° ÏπúÎã§Î©??ÑÎßùÍ∞Ä?∏Ïöî! (Í¥ëÏó≠ ?ÄÏ£? Í≥?Î∞?30% Í∞êÏÜå)', defDownFactor: 1.30, atkDownFactor: 0.70, debuffDur: 120, evolveLvl: 15, evolveCost: 350, evolveTo: 'gengar', attackStyle: 'psychic' },
    'gengar': { name: '?¨Ì?', spriteId: 94, cost: 0, range: 170, damage: 60, cooldown: 40, type: 'aoe', aoeRange: 100, color: '#581c87', desc: '?πÏã†??Í∑∏Î¶º???çÏóê ?®Ïñ¥ ?ÉÍ≥† ?àÏäµ?àÎã§. ?ÑÎÇÑ! (Í¥ëÏó≠ ?ÄÏ£? Í≥?Î∞?45% Í∞êÏÜå)', defDownFactor: 1.45, atkDownFactor: 0.55, debuffDur: 180, attackStyle: 'psychic', itemEvolutions: { 'mega_stone_gengar': 'mega_gengar' } },

    'abra': { name: 'ÏºÄ?¥Ïãú', spriteId: 63, cost: 60, range: 0, damage: 0, cooldown: 999, type: 'none', canAttack: false, color: '#facc15', desc: '?òÎ£® 18?úÍ∞Ñ???°Îãà?? ÍøÄ???êÎäî Ï§?.. (Í≥µÍ≤© Î∂àÍ?. ?¥Îß§Î°?15?àÎ≤® ?¨ÏÑ± ??ÏßÑÌôî!)', evolveLvl: 15, evolveTo: 'kadabra' },
    'kadabra': { name: '?§Í≤î??, spriteId: 64, cost: 0, range: 140, damage: 55, cooldown: 45, type: 'aoe', aoeRange: 70, color: '#eab308', desc: '?Ä?òÏ?Î•??§Í≥† ?§Îãà???¨Ïù¥ÏΩîÌå®?? ?üÍ???Íµ¨Î?Î¶¨Í∏∞???¨Ïù∏! (Í∞ïÎ†•??Î≤îÏúÑ ?ºÌï¥ + 10% Î∞ÄÏπòÍ∏∞)', knockbackChance: 0.1, evolveLvl: 25, evolveCost: 400, evolveTo: 'alakazam', attackStyle: 'psychic' },
    'alakazam': { name: '?ÑÎîò', spriteId: 65, cost: 0, range: 190, damage: 120, cooldown: 40, type: 'aoe', aoeRange: 90, color: '#ca8a04', desc: 'IQ 500! ?àÌçºÏª¥Ìì®?∞Î≥¥???ëÎòë?©Îãà?? ?üÍ??ΩÎèÑ 2Í∞? (Ï¥àÍ¥ë????îú + 10% Î∞ÄÏπòÍ∏∞)', knockbackChance: 0.1, attackStyle: 'psychic', itemEvolutions: { 'mega_stone_alakazam': 'mega_alakazam' } },

    'magnemite': { name: 'ÏΩîÏùº', spriteId: 81, cost: 180, range: 150, damage: 18, cooldown: 60, type: 'laser', laserWidth: 8, color: '#94a3b8', desc: 'Ï∞åÎ¶øÏ∞åÎ¶ø! ?ÑÏûê?åÎ? ?àÎ¨¥ Ï¢ãÏïÑ?¥ÏÑú Î∞úÏ†Ñ?åÏóê ?êÏ£º Ï∂úÎ™∞?©Îãà?? (?ºÏßÅ??Í¥Ä???àÏù¥?Ä + 10% ÎßàÎπÑ)', paralyzeChance: 0.1, evolveLvl: 8, evolveTo: 'magneton' },
    'magneton': { name: '?àÏñ¥ÏΩîÏùº', spriteId: 82, cost: 0, range: 160, damage: 40, cooldown: 45, type: 'laser', laserWidth: 15, color: '#64748b', desc: 'ÏΩîÏùº 3ÎßàÎ¶¨Í∞Ä ?©Ï≤¥! Í∑ºÎç∞ ???åÎäî ?òÎÇò?ºÍπå?? (Í¥ëÌè≠ Í¥Ä???àÏù¥?Ä + 15% ÎßàÎπÑ)', paralyzeChance: 0.15, evolveLvl: 15, evolveCost: 350, evolveTo: 'magnezone' },
    'magnezone': { name: '?êÌè¨ÏΩîÏùº', spriteId: 462, cost: 0, range: 180, damage: 85, cooldown: 45, type: 'laser', laserWidth: 25, color: '#334155', desc: 'UFOÎ°??êÏ£º ?§Ìï¥Î∞õÏäµ?àÎã§. Í∞ïÎ†§?¨Ìïú ?êÍ∏∞??Î∞©Ïñ¥Îß??ÑÍ∞ú! (?ÅÌÉú?¥ÏÉÅ ?ÑÎ≤Ω Î©¥Ïó≠ + Ï¶âÏÇ¨Í∏?Í¥Ä???àÏù¥?Ä + 20% ÎßàÎπÑ)', paralyzeChance: 0.2, immuneToDebuffs: true },

    'riolu': { name: 'Î¶¨Ïò§Î•?, spriteId: 447, cost: 90, range: 130, damage: 30, cooldown: 45, type: 'aoe', aoeRange: 60, color: '#3b82f6', desc: 'Í∏∞Ïö¥???êÎÅº??Í∞ïÏïÑÏßÄ. ?ÑÏßÅ?Ä Í∑Ä?ΩÏ?Îß??åÎèô?ÑÏ? ÎßµÏäµ?àÎã§. (Î∞©Ïñ¥???úÎÑàÏßÄ Î¨¥Ïãú ?åÎèô??', ignoreDef: true, defDownFactor: 1.1, debuffDur: 120, evolveLvl: 10, evolveTo: 'lucario', attackStyle: 'water' },
    'lucario': { name: 'Î£®Ïπ¥Î¶¨Ïò§', spriteId: 448, cost: 0, range: 160, damage: 70, cooldown: 40, type: 'aoe', aoeRange: 80, color: '#1d4ed8', desc: '?åÎèô???©ÏÇ¨! ÎßûÏúºÎ©?ÎßûÏùÑ?òÎ°ù ?êÏÖò???¨ÎùºÍ∞ëÎãà?? ?çÏñç?? (Î∞©Ïñ¥ Î¨¥Ïãú + ?∞ÏÜç Í≥µÍ≤© ??Í≥µÏÜç Í∏âÏÉÅ??', ignoreDef: true, defDownFactor: 1.2, debuffDur: 150, atkSpeedStack: true, attackStyle: 'water', itemEvolutions: { 'mega_stone_lucario': 'mega_lucario' } },
    
    'smoochum': { name: 'ÎΩÄÎΩÄ??, spriteId: 238, cost: 70, range: 130, damage: 15, cooldown: 45, type: 'aoe', aoeRange: 60, color: '#38bdf8', desc: '?ÖÏà†??Ï≠??¥Î?Í≥??ºÏùå ?®Í≤∞???¥Îøú?µÎãà?? (?ºÏùå Î≤îÏúÑ Í≥µÍ≤© + 10% ÎπôÍ≤∞)', freezeChance: 0.1, evolveItem: 'ice_stone', evolveTo: 'jynx', attackStyle: 'ice' },
    'jynx': { name: 'Î£®Ï£º??, spriteId: 124, cost: 0, range: 180, damage: 45, cooldown: 40, type: 'aoe', aoeRange: 110, color: '#0284c7', desc: 'Îß§Ìòπ?ÅÏù∏(?) ?ÖÏà†Î°??ìÏ? ?ºÏùå ??íç??ÎßåÎì≠?àÎã§. (?Ä??Ï¶ùÍ????ºÏùå Î≤îÏúÑ + 20% ÎπôÍ≤∞)', freezeChance: 0.2, attackStyle: 'ice' },
    
    'froakie': { name: 'Í∞úÍµ¨ÎßàÎ•¥', spriteId: 656, cost: 70, range: 170, damage: 15, cooldown: 25, type: 'single', color: '#60a5fa', desc: '?ìÏ? ?¨Í±∞Î¶¨Ï? Îπ†Î•∏ ?òÎ¶¨Í≤Ä ?¨Ï≤ô! Í∞úÍµ¥Í∞úÍµ¥ (?®Ïùº ?Ä??Îπ†Î•∏ Í≥µÍ≤©)', evolveLvl: 8, evolveTo: 'frogadier', attackStyle: 'shuriken' },
    'frogadier': { name: 'Í∞úÍµ¥Î∞òÏû•', spriteId: 657, cost: 0, range: 200, damage: 35, cooldown: 25, type: 'single', color: '#3b82f6', desc: '?úÏ∏µ ???†Î†µ?¥ÏßÑ Î™∏Î?Î¶? (?¨Í±∞Î¶?Î∞??úÎüâ Ï¶ùÍ?)', evolveLvl: 15, evolveCost: 350, evolveTo: 'greninja', attackStyle: 'shuriken' },
    'greninja': { name: 'Í∞úÍµ¥?åÏûê', spriteId: 658, cost: 0, range: 280, damage: 70, cooldown: 15, type: 'single', color: '#1d4ed8', desc: 'Î¨ºÏàòÎ¶¨Í?! Îß??ùÏóê???ÅÏùÑ ?îÏÇ¥?©Îãà?? (Ï¥àÏû•Í±∞Î¶¨ + Ï¥àÍ≥†??Í≥µÍ≤©)', attackStyle: 'shuriken' },
    
    'sigilyph': { name: '?¨Î≥¥??, spriteId: 561, cost: 250, range: 0, damage: 10, cooldown: 120, type: 'global', color: '#a855f7', desc: 'Í≥†Î? ?ÑÏãúÎ•?ÏßÄ?§Îçò ?òÌò∏?? (Îß??ÑÏ≤¥ Í≥µÍ≤© + 10% ?ºÎ?)', confuseChance: 0.1 },
    
    'litten': { name: '?êÏò§Î∂?, spriteId: 725, cost: 50, range: 80, damage: 25, cooldown: 40, type: 'single', color: '#ef4444', desc: 'Î∂àÍΩÉ Í≥†Ïñë?? (Í∑ºÏ†ë ?®Ïùº Í≥µÍ≤©)', evolveLvl: 8, evolveTo: 'torracat', attackStyle: 'fire' },
    'torracat': { name: '?êÏò§?àÌä∏', spriteId: 726, cost: 0, range: 120, damage: 55, cooldown: 40, type: 'aoe', aoeRange: 70, color: '#dc2626', desc: 'Î™©Ïùò Î∞©Ïö∏?êÏÑú Î∂àÍΩÉ???¥Îøú?µÎãà?? (Î≤îÏúÑ Í≥µÍ≤© + Í≥µÏÜç Ï¶ùÍ? + 20% ?îÏÉÅ)', burnChance: 0.2, evolveLvl: 15, evolveCost: 300, evolveTo: 'incineroar', attackStyle: 'fire' },
    'incineroar': { name: '?¥Ìù•??, spriteId: 727, cost: 0, range: 80, damage: 120, cooldown: 60, type: 'aoe', aoeRange: 90, color: '#b91c1c', desc: 'Í∞ïÎ†•?????ÖÏó≠ ?àÏä¨?? (Í∑ºÏ†ë Î≤îÏúÑ ??+ Ï£ºÎ? ?ÅÏóêÍ≤??ÅÍµ¨ Í≥µÍπé 25% ?ÑÌòë ?ÑÏä§)', hasIntimidate: true, auraRange: 80, attackStyle: 'fire' },

    'popplio': { name: '?ÑÎ¶¨Í≥?, spriteId: 728, cost: 50, range: 130, damage: 15, cooldown: 45, type: 'aoe', aoeRange: 60, color: '#3b82f6', desc: 'Î¨ºÌíç?†ÏùÑ ÎßåÎì§??Í≥µÍ≤©?©Îãà?? (?ìÏ? Î≤îÏúÑ + 10% ??Í≥µÍ≤©???òÎùΩ)', atkDownFactor: 0.9, debuffDur: 120, evolveLvl: 8, evolveTo: 'brionne', attackStyle: 'water' },
    'brionne': { name: '?§ÏöîÍ≥?, spriteId: 729, cost: 0, range: 160, damage: 35, cooldown: 45, type: 'aoe', aoeRange: 80, color: '#2563eb', desc: 'Ï∂§Ï∂îÎ©?Î¨ºÌíç?†ÏùÑ ??Î©ÄÎ¶??ìÍ≤å ?òÏßë?àÎã§. (?¨Í±∞Î¶?Î≤îÏúÑ Ï¶ùÍ? + 10% ??Í≥µÍπé)', atkDownFactor: 0.9, debuffDur: 150, evolveLvl: 15, evolveCost: 300, evolveTo: 'primarina', attackStyle: 'water' },
    'primarina': { name: '?ÑÎ¶¨?àÎäê', spriteId: 730, cost: 0, range: 190, damage: 95, cooldown: 35, type: 'aoe', aoeRange: 100, color: '#1d4ed8', desc: '?ÑÎ¶Ñ?§Ïö¥ ?∏Îû´?åÎ¶¨! (Í≥µÏÜç/???Ä??Ï¶ùÍ? + 15% ??Í≥µÍπé)', atkDownFactor: 0.85, debuffDur: 180, attackStyle: 'water' },

    'rowlet': { name: '?òÎ™∞ÎπºÎ?', spriteId: 722, cost: 50, range: 150, damage: 3, cooldown: 50, type: 'spread', spreadCount: 5, color: '#22c55e', desc: '?åÎ¶¨ ?ÜÏù¥ ?§Í?Í∞Ä ÍπÉÌÑ∏???†Î¶Ω?àÎã§! (5?∞Î∞ú Í¥Ä??ÍπÉÌÑ∏ + 5% Î∞ÄÏπòÍ∏∞)', knockbackChance: 0.05, evolveLvl: 8, evolveTo: 'dartrix', attackStyle: 'leaf' },
    'dartrix': { name: 'ÎπºÎ??§Î°ú??, spriteId: 723, cost: 0, range: 180, damage: 5, cooldown: 50, type: 'spread', spreadCount: 5, color: '#16a34a', desc: '?ûÎ®∏Î¶¨Î? ?†Í≤Ω ?∞Îäî Î©ãÏüÅ?? (Í≥µÏÜç/???¨Í±∞Î¶?Ï¶ùÍ? + 5% Î∞ÄÏπòÍ∏∞)', knockbackChance: 0.05, evolveLvl: 15, evolveCost: 300, evolveTo: 'decidueye', attackStyle: 'leaf' },
    'decidueye': { name: 'Î™®ÌÅ¨?òÏù¥??, spriteId: 724, cost: 0, range: 220, damage: 8, cooldown: 50, type: 'spread', spreadCount: 7, color: '#15803d', desc: 'Í∑∏Î¶º??Íø∞Îß§Í∏? (7?∞Î∞ú Í¥Ä??ÍπÉÌÑ∏ + ???åÎ≥µ Î¥âÏù∏)', healBlock: true, debuffDur: 200, attackStyle: 'leaf' },

    'type_null': { name: '?Ä????, spriteId: 772, cost: 0, range: 100, damage: 150, cooldown: 10, type: 'single', color: '#9ca3af', desc: 'Îπ†Î•¥Í≥?Í∞ïÎ†•??Í∑ºÏ†ë ?®Ïùº ??(?§ÌÑ¥ Î∞??ÅÌÉú?¥ÏÉÅ Î©¥Ïó≠)', immuneToDebuffs: true, evolveLvl: 15, evolveCost: 0, evolveTo: 'silvally', attackStyle: 'normal' },
    'silvally': { name: '?§Î≤Ñ??, spriteId: 773, cost: 0, range: 130, damage: 300, cooldown: 10, type: 'aoe', aoeRange: 80, color: '#d1d5db', desc: '??Í∞ïÌïú Î≤îÏúÑ ??Î∞??¨Í±∞Î¶?Ï¶ùÍ? (?§ÌÑ¥ Î∞??ÅÌÉú?¥ÏÉÅ Î©¥Ïó≠)', immuneToDebuffs: true, attackStyle: 'normal' },
      'lugia': { name: 'Î£®Í∏∞??, cost: 0, damage: 45, range: 250, cooldown: 60, spriteId: 249, type: 'aoe', aoeRadius: 100, paralyzeChance: 0.10, desc: '?àÏù¥??Î≥¥ÏÉÅ, ?ìÏ? Í¥ëÏó≠ Í≥µÍ≤© Î∞?10% ÎßàÎπÑ, ?îÎ≤Ñ??Î©¥Ïó≠', immuneToDebuffs: true }
};

// POKEMON FAMILIES (For Snorlax's Shop Upgrades)
const POKEMON_FAMILIES = {
    charmander: ['charmander', 'charmeleon', 'charizard', 'mega_charizard_x', 'mega_charizard_y'],
    squirtle: ['squirtle', 'wartortle', 'blastoise', 'mega_blastoise'],
    bulbasaur: ['bulbasaur', 'ivysaur', 'venusaur', 'mega_venusaur'],
    pikachu: ['pikachu', 'raichu', 'mega_raichu_x', 'mega_raichu_y'],
    eevee: ['eevee', 'flareon', 'vaporeon', 'jolteon', 'leafeon', 'glaceon'],
    gastly: ['gastly', 'haunter', 'gengar', 'mega_gengar'],
    abra: ['kadabra', 'alakazam', 'mega_alakazam'],
    magnemite: ['magnemite', 'magneton', 'magnezone'],
    riolu: ['riolu', 'lucario', 'mega_lucario'],
    froakie: ['froakie', 'frogadier', 'greninja'],
    smoochum: ['smoochum', 'jynx'],
    sigilyph: ['sigilyph'],
    litten: ['litten', 'torracat', 'incineroar'],
    popplio: ['popplio', 'brionne', 'primarina'],
    rowlet: ['rowlet', 'dartrix', 'decidueye']
};

// NEW ENEMY TYPES
const ENEMY_TYPES = [
    { id: 'caterpie', name:'Ï∫êÌÑ∞??, spriteId: 10, hp: 40, speed: 1.0, dmg: 2, reward: 6, desc: '?àÎì§??ÎßõÏûà??Í∞ÑÏãù. ?àÏ†ÅÍ±∞Î¶¨???§ÏùÑ Î±âÏ?Îß??¨Í∏∞??Í∑∏ÎÉ• Í∑Ä?ΩÍ≤å Í∏∞Ïñ¥Í∞ëÎãà??' },
    { id: 'weedle', name:'ÎøîÏ∂©??, spriteId: 13, hp: 60, speed: 1.0, dmg: 2, reward: 6, desc: 'Î®∏Î¶¨??ÎøîÏóî ÎßπÎèÖ???àÏ?Îß? ?åÎ†à?¥Ïñ¥ Í∏∞Ï?ÍπåÏ? ?§Í∏∞ ?ÑÏóê Î≥¥ÌÜµ ?∞Îü¨ÏßëÎãà??' },
    { id: 'rattata', name:'Íº¨Î†õ', spriteId: 19, hp: 60, speed: 1.5, dmg: 5, reward: 8, desc: '?¥Îπ®??Îß§Ïö∞ Í∞ÑÏ??¨Ïõå ?ÑÎ¨¥Í±∞ÎÇò Í∞âÏïÑÎ®πÎäî Í∑ÄÏ∞?? ?Ä??' },
    { id: 'pidgey', name:'Íµ¨Íµ¨', spriteId: 16, hp: 60, speed: 1.3, dmg: 10, reward: 8, desc: '?úÌïú ?±Í≤©?¥Ï?Îß?Î¨¥Î¶¨ÏßÄ???§Î©¥ ÍΩ§ÎÇò ?±Í???ãà??' },
    { id: 'metapod', name:'?®Îç∞Í∏?, spriteId: 11, hp: 200, speed: 0.6, dmg: 15, reward: 15, desc: '?®Îã®?¥Ï?Í∏??•Ïù∏! Ï≤¥Î†•??ÍΩ??íÏïÑ Ï¥àÎ∞ò??Ï≤òÏπò?òÍ∏∞ ÍπåÎã§Î°?äµ?àÎã§.' },
    { id: 'kakuna', name:'?±Ï∂©??, spriteId: 14, hp: 300, speed: 0.6, dmg: 15, reward: 15, desc: 'Í±¥ÎìúÎ¶¨Î©¥ Î¨¥ÏÑú???ÖÏπ®Î∂ïÏù¥ ?òÏò§ÏßÄÎß? ÏßÄÍ∏àÏ? Í∑∏ÎÉ• ?ºÌäº???åÎìúÎ∞±Ïùº ÎøêÏûÖ?àÎã§.' },
    { id: 'raticate', name:'?àÌä∏??, spriteId: 20, hp: 250, speed: 1.6, dmg: 25, reward: 22, desc: '?ûÎãàÎ°?ÏΩòÌÅ¨Î¶¨Ìä∏???πÏñ¥Î®πÏäµ?àÎã§. Í∏∞Ï?Í∞Ä ?∏Î¶¨ÏßÄ ?äÍ≤å Ï°∞Ïã¨?òÏÑ∏??' },
    { id: 'pidgeotto', name:'?ºÏ£§', spriteId: 17, hp: 150, speed: 1.6, dmg: 20, reward: 18, desc: '?ìÏ? Íµ¨Ïó≠???†ÏïÑ?§ÎãàÎ©??¨ÎÉ•Í∞êÏùÑ Ï∞æÏäµ?àÎã§. ?¥Îèô ?çÎèÑÍ∞Ä Îπ†Î¶Ö?àÎã§.' },
    { id: 'butterfree', name:'Î≤ÑÌÑ∞??, spriteId: 12, hp: 180, speed: 1.4, dmg: 15, reward: 25, skill: 'sleep', desc: '?†Í∞ØÏßìÏúºÎ°??Ä?åÎì§??Ïø®Ïø® ?¨ÏõåÎ≤ÑÎ¶¨???òÎ©¥Í∞ÄÎ£? Î¨¥ÏÑú???òÎπÑ!' },
    { id: 'beedrill', name:'?ÖÏπ®Î∂?, spriteId: 15, hp: 160, speed: 1.8, dmg: 25, reward: 25, desc: '?±Ïßà???ÑÏ£º ?¨ÎÇ©Í≥??çÎèÑÍ∞Ä ?ÑÏ≤≠?òÍ≤å Îπ†Î¶Ö?àÎã§. Î≤åÏßë??Í±¥ÎìúÎ¶??ÄÍ∞ÄÏ£?' },
    { id: 'pidgeot', name:'?ºÏ£§??, spriteId: 18, hp: 300, speed: 1.6, dmg: 10, reward: 35, skill: 'ranged', desc: 'ÎßàÌïò 2???çÎèÑÎ°??†ÏïÑ Îß?Î©ÄÎ¶¨ÏÑú Í∏∞Ï?Î•??ÄÍ≤??êÍ±∞Î¶?Í≥µÍ≤©)?òÎäî Í∞ïÏ†Å.' },
    { id: 'snorlax', name:'?†ÎßåÎ≥?, spriteId: 143, hp: 1200, speed: 0.5, dmg: 35, reward: 80, skill: 'yawn', desc: '1?ºÏö¥?úÏùò Î≥¥Ïä§! ?ÑÏ≤≠??Ï≤¥Î†•Í≥? ?Ä?åÎ? Í¥ëÏó≠?ºÎ°ú ?†Ïû¨?∞Îäî ?òÌíà???ÅÎãà??' },
    { id: 'gimmighoul', name: 'Î™®Ïúº??, spriteId: 999, hp: 2500, speed: 3.0, dmg: 0, reward: 500, skill: 'dash', desc: 'ÏΩîÏù∏???¨Îûë?òÎäî ?©Í∏à ?îÏ†ï! ?ÑÏ≤≠???çÎèÑÎ°??Ä?¨ÌïòÎ©? ?°ÏúºÎ©??ÄÎ∞ïÏù¥ ?∞Ïßë?àÎã§.' }
];

// ROUND 2 ENEMY TYPES (Custom Mechanics) - Adjusted (90% HP, Original DMG, High Rewards)
const ENEMY_TYPES_R2 = [
    { id: 'geodude', name:'Íº¨Îßà??, spriteId: 74, hp: 70, speed: 0.8, dmg: 5, reward: 12, desc: '?åÎ©©?¥Ïù∏ Ï§??åÍ≥† Ï∞ºÎã§Í∞?Î∞úÍ??ΩÏù¥ Î∞ïÏÇ¥?©Îãà??' },
    { id: 'sandshrew', name:'Î™®Îûò?êÏ?', spriteId: 27, hp: 65, speed: 1.4, dmg: 8, reward: 12, desc: 'Í±¥Ï°∞???ÖÏùÑ Ï¢ãÏïÑ?òÎäî Í∑Ä?¨Ïö¥ Ï•? Î¨?Í≥µÍ≤©???ΩÌï†ÏßÄ??' },
    { id: 'cubone', name:'?ïÍµ¨Î¶?, spriteId: 104, hp: 80, speed: 1.1, dmg: 10, reward: 15, skill: 'ranged', rangeDist: 150, desc: '?¨Ìîà ?¨Ïó∞??Í∞ÄÏß??Ä?? Î©ÄÎ¶¨ÏÑú ÎºàÎã§Í∑Ä Î∂ÄÎ©îÎûë???òÏ†∏ Í∏∞Ï?Î•??åÎ¶Ω?àÎã§.' },
    { id: 'rhyhorn', name:'ÎøîÏπ¥??, spriteId: 111, hp: 110, speed: 1.3, dmg: 15, reward: 18, skill: 'dash', desc: '?åÍ? ?ëÏïÑ ??Î≤??∞Í∏∞ ?úÏûë?òÎ©¥ Î©àÏ∂ú Ï§?Î™®Î¶Ö?àÎã§. Î¨¥ÏãúÎ¨¥Ïãú???Ä??' },
    { id: 'klink', name:'Í∏∞Ïñ¥Î•?, spriteId: 599, hp: 45, speed: 1.0, dmg: 8, reward: 12, skill: 'synergy', desc: '??Í∞úÏùò ?±ÎãàÍ∞Ä ÎßûÎ¨º???åÏïÑÍ∞ëÎãà?? ?ôÎ£åÍ∞Ä ÎßéÏúºÎ©?Í∏∞Ïñ¥ ?úÎÑàÏßÄÍ∞Ä ?ùÍ≤® Îπ®Îùº?∏Ïöî!' },
    { id: 'graveler', name:'?∞Íµ¨Î¶?, spriteId: 75, hp: 145, speed: 0.8, dmg: 15, reward: 25, desc: '?∞Ïóê??Íµ¥Îü¨?®Ïñ¥ÏßÄ??Î¨¥ÏÑú???åÎç©??' },
    { id: 'sandslash', name:'Í≥†Ï?', spriteId: 28, hp: 125, speed: 1.6, dmg: 20, reward: 25, desc: 'Í∞Ä?úÎ°ú Î¨¥Ïû•???¨Îßâ???îÏÇ¥?? ?ÄÏßÅÏûÑ???†Î†µ?©Îãà??' },
    { id: 'marowak', name:'?ÖÍµ¨Î¶?, spriteId: 105, hp: 160, speed: 1.2, dmg: 25, reward: 30, skill: 'ranged', rangeDist: 200, desc: 'ÎºàÎã§Í∑Ä Î∂ÄÎ©îÎûë???¨Ïù∏! Íµ¨ÏÑù???®Ïñ¥????Î®?Í±∞Î¶¨?êÏÑú ÎºàÎ? ?òÏßë?àÎã§.' },
    { id: 'onix', name:'Î°±Ïä§??, spriteId: 95, hp: 270, speed: 0.9, dmg: 35, reward: 45, skill: 'rockThrow', desc: 'Í±∞Î???Î∞îÏúÑÎ±Ä. Í∞Ä??Ïß±Îèå???òÏ†∏ ?Ä???òÎÇòÎ•?5Ï¥àÍ∞Ñ Í∏∞Ï†à?úÌÇµ?àÎã§!' },
    { id: 'klang', name:'Í∏∞Í∏∞?¥Î•¥', spriteId: 600, hp: 90, speed: 1.0, dmg: 15, reward: 22, skill: 'synergy', desc: 'ÏßÑÌôî?òÎ©¥???±ÎãàÍ∞Ä ?òÎÇò ?òÏñ¥ ?úÎÑàÏßÄÍ∞Ä ??Í∞ïÎ†•?¥Ïßë?àÎã§.' },
    { id: 'rhydon', name:'ÏΩîÎøåÎ¶?, spriteId: 112, hp: 405, speed: 1.0, dmg: 40, reward: 50, skill: 'dash', desc: 'Íº¨Î¶¨Î°?ÎπåÎî©??Î∂Ä?òÎäî Í¥¥Î†•. ÎøîÏπ¥?∏Î≥¥???®Ïî¨ Î¨µÏßÅ???Ä?¨Î? ?ÅÎãà??' },
    { id: 'golem', name:'?±Íµ¨Î¶?, spriteId: 76, hp: 315, speed: 0.8, dmg: 30, reward: 45, skill: 'explode', desc: '?∏Ï†ú ?∞ÏßàÏßÄ Î™®Î•¥???úÌïú??ÉÑ! Ï£ΩÏúºÎ©¥ÏÑú ?ÑÏ≤≠???êÌè≠ ?∞Î?ÏßÄÎ•?Ï§çÎãà??' },
    { id: 'klinklang', name:'Í∏∞Í∏∞Í∏∞Ïñ¥Î•?, spriteId: 601, hp: 180, speed: 1.0, dmg: 25, reward: 30, skill: 'synergy', desc: '?±Îãà Íµ∞Îã®???µÏã¨! ÎßµÏóê Í∏∞Ïñ¥Î•òÍ? ÎßéÏùÑ?òÎ°ù ÎØ∏Ïπú ??ïú ?çÎèÑÎ°??¨Î†§?µÎãà??' },
    { id: 'rhyperior', name:'Í±∞Î?ÏΩîÎøåÎ¶?, spriteId: 464, hp: 1080, speed: 0.7, dmg: 55, reward: 150, skill: 'sandTomb', desc: '2?ºÏö¥?úÏùò ÏµúÏ¢Ö Î≥¥Ïä§. Íº¨Îßà?åÏùÑ ?Ä?¨Ï≤ò???òÎ©∞, ?Ä?åÎì§??Î¥âÏù∏?òÎäî Î™®ÎûòÏßÄ?•ÏùÑ ?ÅÎãà??' } // Î≥¥Ïä§
];

// ROUND 3 ENEMY TYPES (Beach Map)
const ENEMY_TYPES_R3 = [
    { id: 'magikarp', name: '?âÏñ¥??, spriteId: 129, hp: 50, speed: 0.5, dmg: 1, reward: 2, desc: 'Í∑∏ÎÉ• ?úÏùº ?ΩÌï¥. Î™®Îì† ??Ï§?ÏµúÏïΩÏ≤? ?àÎèÑ ÎßéÏù¥ ??Ï§?' },
    { id: 'horsea', name: '?òÎìú??, spriteId: 116, hp: 120, speed: 1.2, dmg: 15, reward: 15, skill: 'ranged', rangeDist: 150, desc: 'Î®πÎ¨º???òÎäî ?êÍ±∞Î¶??úÎü¨.' },
    { id: 'seadra', name: '?®Îìú??, spriteId: 117, hp: 200, speed: 1.4, dmg: 25, reward: 25, skill: 'ranged', rangeDist: 180, desc: '?ÑÏ≤¥?ÅÏù∏ ?§ÌÖüÍ≥??¨Í±∞Î¶¨Í? Ï¶ùÍ??àÏäµ?àÎã§.' },
    { id: 'kingdra', name: '?πÎìú??, spriteId: 230, hp: 350, speed: 1.5, dmg: 40, reward: 40, skill: 'rangedStun', rangeDist: 220, desc: '??Í∏??¨Í±∞Î¶¨Ï? ?êÍ±∞Î¶??§ÌÑ¥ ?•Î†•??Í∞ÄÏ°åÏäµ?àÎã§.' },
    { id: 'sandygast', name: 'Î™®ÎûòÍø?, spriteId: 769, hp: 300, speed: 0.7, dmg: 15, reward: 20, skill: 'healAlliesOnHit', desc: '?êÎ¶¨ÏßÄÎß??®Îã®?? Ï£ºÎ? ÎßûÏùÑ ?åÎßà???ÑÍµ∞???åÎ≥µ?úÌÇµ?àÎã§.' },
    { id: 'palossand', name: 'Î™®Îûò?±Ïù¥??, spriteId: 770, hp: 550, speed: 0.6, dmg: 35, reward: 35, skill: 'sandTombHeal', desc: 'Ï≤¥Î†• Ï¶ùÍ?, ?ºÍ≤©???ÑÍµ∞ ?åÎ≥µÍ≥?Î™®ÎûòÏßÄ?•ÏùÑ ?¨Ïö©?©Îãà??' },
    { id: 'crabrawler', name: '?§Í∏∞ÏßÄÍ≤?, spriteId: 739, hp: 180, speed: 1.5, dmg: 30, reward: 25, skill: 'enemyStun', desc: 'Îπ†Î•¥Í≥?Í∞ïÌï®. Í∞Ä??Ï£ºÎ? ?®Ïùº ???Ä????2Ï¥??§ÌÑ¥?úÌÇµ?àÎã§.' },
    { id: 'crabominable', name: 'Î™®Îã®?®Í≤å', spriteId: 740, hp: 320, speed: 1.4, dmg: 50, reward: 35, skill: 'enemyFreeze', desc: '??Ï¶ùÍ?, Ï≤¥Î†• Ï¶ùÍ?. ?§ÌÑ¥ ?Ä???ºÏùå ?ÅÌÉú?¥ÏÉÅ??Î∂Ä?¨Ìï©?àÎã§.' },
    { id: 'carvanha', name: '?§ÌîÑ?àÏïÑ', spriteId: 318, hp: 150, speed: 2.0, dmg: 30, reward: 20, skill: 'dash', desc: '?ÑÏ£º Îπ†Î•¥Í≥??åÏßÑ?©Îãà??' },
    { id: 'sharpedo', name: '?§ÌÅ¨?àÏïÑ', spriteId: 319, hp: 250, speed: 2.5, dmg: 45, reward: 30, skill: 'dash', desc: '??Í∞ïÌïòÍ≥?Îπ†Î¶Ö?àÎã§.' },
    { id: 'mega_sharpedo', name: 'Î©îÍ??§ÌÅ¨?àÏïÑ', spriteId: 10070, hp: 2500, speed: 2.0, dmg: 100, reward: 300, skill: 'dash', desc: '???®Îã®?¥ÏßÑ ÏßÑÎ≥¥?? 20?®Ïù¥Î∏åÏóê??1ÎßàÎ¶¨Îß??òÏòµ?àÎã§.' },
    { id: 'exeggcute', name: '?ÑÎùºÎ¶?, spriteId: 102, hp: 100, speed: 1.1, dmg: 10, reward: 10, skill: 'explodeSmall', desc: '??? Î≤îÏúÑ???êÌè≠???©Îãà??' },
    { id: 'exeggutor', name: '?òÏãú', spriteId: 103, hp: 350, speed: 0.9, dmg: 35, reward: 35, skill: 'ranged', rangeDist: 150, desc: '?êÌè≠?Ä ?ÜÏñ¥Ï°åÍ≥† ?®Îã®?òÍ≥† Í∞ïÌï¥Ïß? ?êÍ±∞Î¶??•Î†• Ï∂îÍ?.' },
    { id: 'alolan_exeggutor', name: '?åÎ°ú?ºÎÇò??, spriteId: 10114, hp: 450, speed: 0.8, dmg: 60, reward: 45, skill: 'summonExeggcute', desc: '?òÏãú???§Î•∏ ÏßÑÌôî. ?êÍ±∞Î¶¨Í? ?ÑÎãå ?ÑÎùºÎ¶?Î≥¥ÏÉÅ ?ÜÏùå) ?åÌôò ?•Î†•???ªÏóà?µÎãà??' },
    { id: 'dewpider', name: 'Î¨ºÍ±∞ÎØ?, spriteId: 751, hp: 220, speed: 1.0, dmg: 20, reward: 25, skill: 'weakenTowerAura', desc: 'Ï£ºÎ????ΩÌôî ?§ÎùºÍ∞Ä ?ùÍ∏∞Í≥?Í∑?Î≤îÏúÑ???Ä???úÏù¥ 20% ?òÎùΩ?©Îãà??' },
    { id: 'araquanid', name: 'Íπ®ÎπÑÎ¨ºÍ±∞ÎØ?, spriteId: 752, hp: 400, speed: 1.2, dmg: 45, reward: 40, skill: 'weakenTowerAuraLarge', desc: '??Îπ†Î•¥Í≥?Í∞ïÌïòÎ©??§Îùº Î≤îÏúÑÍ∞Ä ?ΩÍ∞Ñ Ï¶ùÍ??àÏäµ?àÎã§.' },
    { id: 'gyarados', name: 'Í∞∏Îùº?ÑÏä§', spriteId: 130, hp: 1200, speed: 1.8, dmg: 80, reward: 150, skill: 'dash', desc: '?ÑÏ£º?ÑÏ£º Í∞ïÌï®. Î™®Îì† ?§ÌÖü???ÑÎ©∞ ?åÏßÑ???àÎäî 3?ºÏö¥??Î≥¥Ïä§.' }
];

// Preload enemy sprites
ENEMY_TYPES.forEach(e => getImg(e.spriteId));
ENEMY_TYPES_R2.forEach(e => getImg(e.spriteId));
ENEMY_TYPES_R3.forEach(e => getImg(e.spriteId));
Object.values(POKEMON_DATA).forEach(data => getImg(data.spriteId));

// Wave distribution logic
function getEnemyForWave(w, isBossSpawn) {
    if (currentRound === 1) {
        if (isBossSpawn) return ENEMY_TYPES.find(e => e.id === 'snorlax');
        
        const pool = [];
        if (w <= 4) pool.push('caterpie', 'weedle'); 
        if (w >= 4 && w <= 8) pool.push('rattata', 'pidgey'); 
        if (w >= 7 && w <= 13) pool.push('pidgeotto'); 
        if (w >= 9 && w <= 15) pool.push('metapod', 'kakuna'); 
        if (w >= 12) pool.push('butterfree', 'beedrill'); 
        if (w >= 14) pool.push('raticate'); 
        if (w >= 16) pool.push('pidgeot'); 
        
        if (pool.length === 0) pool.push('caterpie');
        const chosenId = pool[Math.floor(Math.random() * pool.length)];
        return ENEMY_TYPES.find(e => e.id === chosenId);
        
    } else if (currentRound === 2) {
        // ROUND 2 Logic
        if (isBossSpawn) return ENEMY_TYPES_R2.find(e => e.id === 'rhyperior');
        
        const pool = [];
        if (w <= 5) pool.push('geodude', 'sandshrew', 'klink'); // Wave 1~5
        if (w >= 5 && w <= 10) pool.push('cubone', 'rhyhorn', 'klang'); // Wave 5~10
        if (w >= 9 && w <= 14) pool.push('graveler', 'sandslash'); // Wave 9~14
        if (w >= 12 && w <= 17) pool.push('marowak', 'klinklang'); // Wave 12~17
        if (w >= 14) pool.push('onix'); // Wave 14~19
        if (w >= 16) pool.push('rhydon', 'golem'); // Wave 16~19
        
        if (pool.length === 0) pool.push('geodude');
        const chosenId = pool[Math.floor(Math.random() * pool.length)];
        return ENEMY_TYPES_R2.find(e => e.id === chosenId);
    } else {
        // ROUND 3 Logic
        if (isBossSpawn) return ENEMY_TYPES_R3.find(e => e.id === 'gyarados');
        
        const pool = [];
        if (w <= 5) pool.push('magikarp', 'horsea', 'exeggcute', 'dewpider');
        if (w >= 4 && w <= 9) pool.push('sandygast', 'crabrawler', 'carvanha');
        if (w >= 8 && w <= 13) pool.push('seadra', 'exeggutor', 'palossand');
        if (w >= 12 && w <= 17) pool.push('crabominable', 'araquanid', 'alolan_exeggutor');
        if (w >= 15) pool.push('kingdra', 'sharpedo');
        
        if (pool.length === 0) pool.push('magikarp');
        const chosenId = pool[Math.floor(Math.random() * pool.length)];
        return ENEMY_TYPES_R3.find(e => e.id === chosenId);
    }
}

// UI Elements
const livesEl = document.getElementById('lives');
const berriesEl = document.getElementById('berries');
const poffinsEl = document.getElementById('poffins');
const waveEl = document.getElementById('wave');
const btnStartWave = document.getElementById('btn-start-wave');
const buildMenu = document.getElementById('build-menu');
const upgradeMenu = document.getElementById('upgrade-menu');

const upgName = document.getElementById('upg-name');
const upgImg = document.getElementById('upg-img');
const upgDesc = document.getElementById('upg-desc');
const statDmg = document.getElementById('stat-dmg');
const statRange = document.getElementById('stat-range');
const statCd = document.getElementById('stat-cd');
const btnUpgrade = document.getElementById('btn-upgrade');
const btnSell = document.getElementById('btn-sell');
const btnCloseUpgrade = document.getElementById('btn-close-upgrade');

let selectedBuildType = 'charmander';
let selectedTower = null; 

document.querySelectorAll('.tower-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        selectedBuildType = e.currentTarget.getAttribute('data-type');
        document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        selectedTower = null;
        updateUI();
    });
});

function updateUI() {
    if (selectedTower) {
        buildMenu.style.display = 'none';
        document.getElementById('top-buttons-container').style.display = 'none';
        upgradeMenu.style.display = 'flex';
        
        const data = POKEMON_DATA[selectedTower.baseId];
        upgName.innerText = `${data.name} Lv.${selectedTower.level}`;
        upgImg.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${data.spriteId}.png`;
        upgDesc.innerText = data.desc;
        
        statDmg.innerText = selectedTower.damage;
        statRange.innerText = selectedTower.range;
        statCd.innerText = (selectedTower.cooldown / 60).toFixed(1);

        const upgCost = selectedTower.level * 10;
        if (selectedTower.level >= 100) {
            btnUpgrade.innerText = `ÏµúÎ? ?àÎ≤® (100)`;
            btnUpgrade.style.opacity = '0.5';
            btnUpgrade.style.cursor = 'not-allowed';
        } else {
            btnUpgrade.innerText = `Í∞ïÌôî (ÎπÑÏö©: ${upgCost}?¥Îß§)`;
            btnUpgrade.style.opacity = '1';
            btnUpgrade.style.cursor = 'pointer';
        }
        btnSell.innerText = `Ï≤†Í±∞ (Î∞òÌôò: ${Math.floor(selectedTower.totalInvested / 2)}?¥Îß§)`;
        
        const evolveContainer = document.getElementById('evolve-container');
        evolveContainer.innerHTML = '';
        
        // Î≤†Î¶¨Î°?ÏßÑÌôî (?àÎ≤® + ÎπÑÏö©)
        if (data.evolveLvl && selectedTower.level >= data.evolveLvl) {
            const cost = data.evolveCost || 150;
            const btn = document.createElement('button');
            btn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
            btn.style.borderColor = '#fcd34d';
            btn.innerText = `ÏßÑÌôî (ÎπÑÏö©: ${cost}?¥Îß§)`;
            btn.onclick = () => doEvolve(data.evolveTo, cost, null);
            evolveContainer.appendChild(btn);
        }
        
        // ?®Ïùº ?ÑÏù¥??ÏßÑÌôî (?ºÏπ¥Ï∏???
        if (data.evolveItem && inventory[data.evolveItem] > 0) {
            const itemName = SHOP_ITEM_POOL.find(i => i.id === data.evolveItem)?.name || '?ÑÍµ¨';
            const btn = document.createElement('button');
            btn.style.background = 'linear-gradient(135deg, #8b5cf6, #6d28d9)';
            btn.style.borderColor = '#a78bfa';
            btn.innerText = `ÏßÑÌôî (${itemName} ?¨Ïö©)`;
            btn.onclick = () => doEvolve(data.evolveTo, 0, data.evolveItem);
            evolveContainer.appendChild(btn);
        }
        
        // ?§Ï§ë ?ÑÏù¥??ÏßÑÌôî (?¥Î∏å????
        if (data.itemEvolutions) {
            Object.keys(data.itemEvolutions).forEach(itemId => {
                if (inventory[itemId] > 0) {
                    if (itemId.startsWith('mega_stone') && inventory['keystone'] <= 0) return; // ?§Ïä§???ÑÏöî
                    const evolveToId = data.itemEvolutions[itemId];
                    const targetData = POKEMON_DATA[evolveToId];
                    const itemName = SHOP_ITEM_POOL.find(i => i.id === itemId)?.name || '?ÑÍµ¨';
                    const btn = document.createElement('button');
                    btn.style.background = `linear-gradient(135deg, ${targetData.color}, #000000)`;
                    btn.style.borderColor = targetData.color;
                    btn.innerText = `${targetData.name} ÏßÑÌôî (${itemName})`;
                    btn.onclick = () => doEvolve(evolveToId, 0, itemId);
                    evolveContainer.appendChild(btn);
                }
            });
        }
    } else {
        buildMenu.style.display = 'flex';
        document.getElementById('top-buttons-container').style.display = 'block';
        upgradeMenu.style.display = 'none';
    }
}

btnUpgrade.addEventListener('click', () => {
    if (!selectedTower) return;
    if (selectedTower.level >= 100) {
        visualEffects.push(new TextEffect(selectedTower.x, selectedTower.y - 20, "MAX LEVEL!", '#ef4444'));
        return;
    }
    const upgCost = selectedTower.level * 10;
    if (berries >= upgCost) {
        berries -= upgCost;
        
        selectedTower.level++;
        selectedTower.totalInvested += upgCost;
        if (selectedTower.baseId === 'sigilyph' || selectedTower.baseId === 'rowlet' || selectedTower.baseId === 'dartrix' || selectedTower.baseId === 'decidueye') {
            selectedTower.damage += 1;
        } else {
            selectedTower.damage += 5;
        }
        updateUI();
    }
});

function doEvolve(newBaseId, berryCost, consumeItem) {
    if (!selectedTower) return;
    
    if (berryCost > 0) {
        if (berries < berryCost) return;
        berries -= berryCost;
        
        selectedTower.totalInvested += berryCost;
    }
    
    if (consumeItem) {
        if (inventory[consumeItem] <= 0) return;
        inventory[consumeItem]--;
        renderInventory();
    }
    
    const newData = POKEMON_DATA[newBaseId];
    selectedTower.baseId = newBaseId;
    selectedTower.range = newData.range;
    selectedTower.damage = newData.damage + (selectedTower.level * 2);
    selectedTower.cooldown = newData.cooldown;
    
    visualEffects.push(new BubbleEffect(selectedTower.x, selectedTower.y, '#fcd34d', 100));
    updateUI();
}

btnCloseUpgrade.addEventListener('click', () => {
    selectedTower = null;
    updateUI();
});

btnSell.addEventListener('click', () => {
    if (!selectedTower) return;
    berries += Math.floor(selectedTower.totalInvested / 2);
    
    
    const index = towers.indexOf(selectedTower);
    if (index > -1) towers.splice(index, 1);
    
    selectedTower = null;
    updateUI();
});

// Round and Map System
let currentRound = 1;
let isRaidActive = false;
let raidVirtualHp = 0;
let raidVirtualMaxHp = 0;
let clearedRaidsThisRound = [];
const raidBossData = {
    'type_null': { id: 'boss_type_null', name: '?Ä????, spriteId: 772, hp: 6000, speed: 1.5, dmg: 30, reward: 0, skill: 'raidBossTypeNull', cost: 555 },
    'zeraora': { id: ,
      'lugia': { id: 'boss_lugia', name: 'Î£®Í∏∞??, spriteId: 249, hp: 8000, speed: 1.5, dmg: 40, reward: 0, skill: 'raidBossLugia', cost: 700, immuneToDebuffs: true }
};
const ROUND_MAPS = {
    1: {
        bgColor: '#4ade80',
        pathColor: '#d4d4d8',
        pathNodes: [ {x: 0, y: 3}, {x: 10, y: 3}, {x: 10, y: 7}, {x: 3, y: 7}, {x: 3, y: 10}, {x: 15, y: 10} ]
    },
    2: {
        bgColor: '#fcd34d', // Desert sand
        pathColor: '#d97706', // Darker sand for path
        pathNodes: [ {x: 0, y: 1}, {x: 5, y: 1}, {x: 5, y: 6}, {x: 10, y: 6}, {x: 10, y: 2}, {x: 13, y: 2}, {x: 13, y: 8}, {x: 15, y: 8} ]
    },
    3: {
        bgColor: '#0ea5e9', // Beach water
        pathColor: '#fde047', // Beach sand path
        pathNodes: [ {x: 0, y: 8}, {x: 3, y: 8}, {x: 3, y: 2}, {x: 8, y: 2}, {x: 8, y: 9}, {x: 13, y: 9}, {x: 13, y: 4}, {x: 15, y: 4} ]
    }
};

let pathCells = new Set();
let waypoints = [];
let BASE_X = 0, BASE_Y = 0;

function initMap() {
    const mapData = ROUND_MAPS[currentRound];
    pathCells.clear();
    for (let i = 0; i < mapData.pathNodes.length - 1; i++) {
        let p1 = mapData.pathNodes[i]; let p2 = mapData.pathNodes[i+1];
        let dx = Math.sign(p2.x - p1.x); let dy = Math.sign(p2.y - p1.y);
        let cx = p1.x; let cy = p1.y;
        pathCells.add(`${cx},${cy}`);
        while(cx !== p2.x || cy !== p2.y) { cx += dx; cy += dy; pathCells.add(`${cx},${cy}`); }
    }
    waypoints = mapData.pathNodes.map(p => ({ x: p.x * cellSize + cellSize / 2, y: p.y * cellSize + cellSize / 2 }));
    BASE_X = waypoints[waypoints.length-1].x;
    BASE_Y = waypoints[waypoints.length-1].y;
    
    renderBackgroundToOffscreen();
}
initMap();

function startNextRound() {
    currentRound++;
    if (!ROUND_MAPS[currentRound]) return; // No more rounds
    
    // Reset for new round
    wave = 1;
    berries = (currentRound >= 3) ? 300 : 200;
    
    waveEl.innerText = `${wave} / 20`;
    
    // Enable the start wave button for the new round
    btnStartWave.disabled = false;
    btnStartWave.innerText = '?®Ïù¥Î∏??úÏûë!';
    
    // Wipe towers and enemies
    towers.length = 0; // Empty the array but keep reference
    enemies.length = 0;
    projectiles.length = 0;
    isRaidActive = false;
    clearedRaidsThisRound = [];
    if (document.getElementById('btn-build-typenull')) document.getElementById('btn-build-typenull').style.display = 'none';

    
    // Do not wipe inventory (Keep between rounds)
    renderInventory();
    selectedTower = null;
    updateUI();
    
    initMap();
    
    visualEffects.push(new TextEffect(canvas.width / 2, canvas.height / 2, `ROUND ${currentRound} ?úÏûë!`, '#ef4444'));
}

const enemies = [];
const towers = [];
const projectiles = [];
const visualEffects = [];

// Shared offscreen canvas for lightweight status effect overlays (avoids ctx.filter overhead)
const _overlayCanvas = document.createElement('canvas');
_overlayCanvas.width = 80; _overlayCanvas.height = 80;
const _overlayCtx = _overlayCanvas.getContext('2d');

let mouseX = -1; let mouseY = -1;
canvas.addEventListener('mousemove', (e) => { const rect = canvas.getBoundingClientRect(); mouseX = e.clientX - rect.left; mouseY = e.clientY - rect.top; });
canvas.addEventListener('mouseleave', () => { mouseX = -1; mouseY = -1; });

// Classes
class Enemy {
    constructor(baseData, hpMultiplier = 1) {
        this.x = waypoints[0].x; this.y = waypoints[0].y;
        this.pathIndex = 0;
        this.baseData = baseData;
        
        this.maxHp = Math.floor(baseData.hp * hpMultiplier); 
        this.hp = this.maxHp; 
        
        this.baseSpeed = baseData.speed;
        this.damage = baseData.dmg;
        this.reward = baseData.reward;
        this.sprite = getImg(baseData.spriteId);
        
        this.skill = baseData.skill;
        this.skillTimer = 0;
        
        // Animation state
        this.bobOffset = Math.random() * Math.PI * 2; // random phase for bobbing
        this.facingDir = 1; // 1 = right, -1 = left
        this.progress = 0; // cached progress for tower targeting
        
        // Status effects
        this.status = {
            burnTimer: 0, poisonTimer: 0, slowFactor: 1, slowTimer: 0, stunTimer: 0, paralyzed: false,
            burnTick: 0, poisonTick: 0, paraStunTick: 0, frozen: false, freezeTick: 0,
            atkDownTimer: 0, atkDownFactor: 1, defDownTimer: 0, defDownFactor: 1,
            confused: false, confuseTick: 0, confuseTimer: 0,
            healBlockTimer: 0
        };
    }

    applyDamage(amount, ignoreDef = false, isDot = false, attacker = null) {
        if (this.isDead) return;

        if (this.skill === 'synergy' && !ignoreDef) {
            let count = window.globalSynergyCount || 0;
            amount = amount / (1 + count * 0.2); // 20% damage reduction per gear
        }
        if (this.status.defDownTimer > 0) {
            amount *= this.status.defDownFactor;
        }
        
        if (attacker && POKEMON_DATA[attacker.baseId] && POKEMON_DATA[attacker.baseId].healBlock) {
            this.status.healBlockTimer = POKEMON_DATA[attacker.baseId].debuffDur;
        }

        if (!isDot && (this.skill === 'healAlliesOnHit' || this.skill === 'sandTombHeal')) {
            if (this.status.healBlockTimer > 0) {
                if (Math.random() < 0.2) visualEffects.push(new TextEffect(this.x, this.y - 20, 'Î¥âÏù∏??', '#94a3b8'));
            } else {
                enemies.forEach(e => {
                    let dx = e.x - this.x; let dy = e.y - this.y;
                    if (dx*dx + dy*dy <= 10000) {
                        if (e.baseData.id !== 'sandygast' && e.baseData.id !== 'palossand') {
                            e.hp = Math.min(e.maxHp, e.hp + amount * 0.33); // 33% of damage taken
                            if (Math.random() < 0.2) visualEffects.push(new BubbleEffect(e.x, e.y, '#22c55e', 20));
                        }
                    }
                });
            }
        }

        
        let critChance = 0.04;
        if (attacker && attacker.item === 'scope_lens') critChance += 0.06;
        
        if (!isDot && Math.random() < critChance) {
            amount *= 2;
            visualEffects.push(new TextEffect(this.x, this.y - 40, 'Í∏âÏÜå!', '#ef4444'));
        }
        
        this.hp -= amount;
        if (this.hp <= 0) {
            this.isDead = true;
            
            if (this.baseData && this.baseData.skill === 'raidBossTypeNull') {
                isRaidActive = false;
                clearedRaidsThisRound.push('type_null');
                document.getElementById('btn-build-typenull').style.display = 'flex';
                renderBackgroundToOffscreen();
                visualEffects.push(new TextEffect(canvas.width/2, canvas.height/2, '?àÏù¥???¥Î¶¨??', '#fcd34d'));
                alert('?ÑÏÑ§ ?àÏù¥???¥Î¶¨?? ?Ä???êÏù¥ ?ÑÍµ∞?ºÎ°ú ?©Î•ò?©Îãà??');
            } else if (this.baseData && this.baseData.skill === 'raidBossZeraora' || this.baseData.skill === 'raidBossLugia') {
                isRaidActive = false;
                clearedRaidsThisRound.push('zeraora');
                window.zeraoraUnlocked = true;
                document.getElementById('btn-build-zeraora').style.display = 'flex';
                renderBackgroundToOffscreen();
                visualEffects.push(new TextEffect(canvas.width/2, canvas.height/2, '?àÏù¥???¥Î¶¨??', '#fcd34d'));
                alert('?ÑÏÑ§ ?àÏù¥???¥Î¶¨?? ?úÎùº?§ÎùºÍ∞Ä ?ÑÍµ∞?ºÎ°ú ?©Î•ò?©Îãà??');
            } else {
                berries += this.reward;
            }
            
            if (attacker && attacker.item === 'leftovers') {
                lives = Math.min(500, lives + 1);
                
                visualEffects.push(new BubbleEffect(attacker.x, attacker.y, '#4ade80', 30));
            }
            
            if (this.skill === 'explode') {
                visualEffects.push(new ExplosionEffect(this.x, this.y, 90, '#f59e0b')); // ??∞ú Î∞òÍ≤Ω Ï∂ïÏÜå
                towers.forEach(t => {
                    if (Math.hypot(t.x - this.x, t.y - this.y) <= 90) { // ?¨Í±∞Î¶?Ï∂ïÏÜå
                        t.stunTimer = 180; // 3Ï¥??§ÌÑ¥
                    }
                });
            }
        }
    }

    applyKnockback(distance) {
        if (this.baseData.id === 'rhyperior' || this.baseData.id === 'snorlax') return; // Î≥¥Ïä§???âÎ∞± Î©¥Ïó≠
        
        let remDist = distance;
        while (remDist > 0) {
            let curWP = waypoints[this.pathIndex];
            if (!curWP) break; // ?úÏûë?êÏùÑ Î≤óÏñ¥?????ÜÏùå
            
            let dx = this.x - curWP.x;
            let dy = this.y - curWP.y;
            let distToPrev = Math.hypot(dx, dy);
            
            if (distToPrev > remDist) {
                // ???†Î∂Ñ ?¥Ïóê???§Î°ú Î∞Ä?§ÎÇ®
                this.x -= (dx / distToPrev) * remDist;
                this.y -= (dy / distToPrev) * remDist;
                remDist = 0;
            } else {
                // ?¥Ï†Ñ ?®Ïù¥?¨Ïù∏?∏Ïóê ?ÑÎã¨, ?¥Ï†Ñ ?†Î∂Ñ?ºÎ°ú ?òÏñ¥Í∞Ä????
                this.x = curWP.x;
                this.y = curWP.y;
                remDist -= distToPrev;
                if (this.pathIndex > 0) {
                    this.pathIndex--; // ?¥Ï†Ñ ?®Ïù¥?¨Ïù∏?∏Î°ú Î≥ÄÍ≤?
                } else {
                    break; // ???¥ÏÉÅ Í∞?Í≥≥Ïù¥ ?ÜÏúºÎ©??ïÏ?
                }
            }
        }
        
        visualEffects.push(new TextEffect(this.x, this.y - 30, 'Î∞ÄÏπ?', '#facc15'));
    }

    draw() {
        if (this.baseData.id === 'rhyperior') {
            ctx.fillStyle = 'rgba(180, 83, 9, 0.15)';
            ctx.beginPath(); ctx.arc(this.x, this.y, 80, 0, Math.PI * 2); ctx.fill();
        }
        
        if (this.sprite.complete && this.sprite.naturalWidth > 0) {
            const id = this.baseData.id;
            const walkCycle = frame * 0.15 + this.bobOffset;
            let bob = 0, rot = 0, squash = 1, stretch = 1;

            const flying = ['zubat', 'pidgey', 'spearow', 'golbat', 'aerodactyl', 'crobat', 'pidgeot', 'fearow'];
            const crawler = ['caterpie', 'weedle', 'ekans', 'arbok', 'onix', 'steelix', 'seviper'];
            const heavy = ['geodude', 'rhyhorn', 'rhyperior', 'snorlax', 'golem', 'graveler', 'machop', 'machamp'];
            const flailer = ['magikarp'];

            if (flying.includes(id)) {
                // Hovering motion
                bob = Math.sin(walkCycle * 0.8) * -8 - 5; 
                rot = Math.cos(walkCycle * 0.4) * 0.05;
            } else if (crawler.includes(id)) {
                // Crawling: heavy squash/stretch, no jump
                squash = 1 + Math.sin(walkCycle) * 0.15;
                stretch = 1 / squash;
                bob = 0;
            } else if (heavy.includes(id)) {
                // Heavy hop: slow jump, fast fall, stay on ground
                let hopCycle = walkCycle % Math.PI;
                if (hopCycle < 1.5) {
                    bob = Math.sin(hopCycle) * -10;
                } else {
                    bob = 0;
                    squash = 1.1; stretch = 0.9; // impact squash
                }
            } else if (flailer.includes(id)) {
                // Flailing
                bob = Math.abs(Math.sin(walkCycle * 2)) * -10;
                rot = Math.sin(walkCycle * 3) * 0.5;
                squash = 1 + Math.random() * 0.1;
                stretch = 1 + Math.random() * 0.1;
            } else {
                // Default Waddle
                bob = Math.abs(Math.sin(walkCycle)) * -6;
                rot = Math.cos(walkCycle) * 0.12;
                squash = 1 + Math.sin(walkCycle * 2) * 0.04;
                stretch = 1 - Math.sin(walkCycle * 2) * 0.04;
            }
            
            // Determine status overlay color
            let overlayColor = null;
            if (this.status.frozen) overlayColor = 'rgba(147, 210, 255, 0.6)';
            else if (this.status.poisonTimer > 0) overlayColor = 'rgba(168, 85, 247, 0.5)';
            else if (this.status.burnTimer > 0) overlayColor = 'rgba(239, 68, 68, 0.5)';
            else if (this.status.paralyzed) overlayColor = 'rgba(234, 179, 8, 0.5)';
            else if (this.status.confused) overlayColor = 'rgba(220, 38, 127, 0.55)';
            
            ctx.save();
            ctx.translate(Math.floor(this.x), Math.floor(this.y + bob));
            ctx.scale(this.facingDir * squash, stretch);
            ctx.rotate(rot);

            if (overlayColor) {
                // Correctly draw status overlay using offscreen canvas (only colors sprite pixels)
                _overlayCtx.clearRect(0, 0, 80, 80);
                _overlayCtx.drawImage(this.sprite, 0, 0, 80, 80);
                _overlayCtx.globalCompositeOperation = 'source-atop';
                _overlayCtx.fillStyle = overlayColor;
                _overlayCtx.fillRect(0, 0, 80, 80);
                _overlayCtx.globalCompositeOperation = 'source-over';
                ctx.drawImage(_overlayCanvas, -40, -45);
            } else {
                ctx.drawImage(this.sprite, -40, -45, 80, 80);
            }
            ctx.restore();
            
            // HP bar stays completely still (no bob added)
            const isRaidBoss = this.baseData && this.baseData.skill === 'raidBossTypeNull';
            const hpBarW = isRaidBoss ? 60 : 40;
            const hpBarColor = isRaidBoss ? '#c084fc' : '#22c55e';
            ctx.fillStyle = '#374151'; ctx.fillRect(this.x - hpBarW/2, this.y - 30, hpBarW, 6);
            ctx.fillStyle = hpBarColor; ctx.fillRect(this.x - hpBarW/2, this.y - 30, hpBarW * Math.max(0, this.hp / this.maxHp), 6);
        } else {
            // Fallback: just draw HP bar
            const isRaidBoss = this.baseData && this.baseData.skill === 'raidBossTypeNull';
            const hpBarW = isRaidBoss ? 60 : 40;
            const hpBarColor = isRaidBoss ? '#c084fc' : '#22c55e';
            ctx.fillStyle = '#374151'; ctx.fillRect(this.x - hpBarW/2, this.y - 30, hpBarW, 6);
            ctx.fillStyle = hpBarColor; ctx.fillRect(this.x - hpBarW/2, this.y - 30, hpBarW * Math.max(0, this.hp / this.maxHp), 6);
        }
    }

    update() {
        if (this.hp <= 0) return;

        // Boss Immunity (Rhyperior & Snorlax)
        if (this.baseData.id === 'rhyperior' || this.baseData.id === 'snorlax') {
            this.status.frozen = false;
            this.status.stunTimer = 0;
            this.status.paralyzed = false;
        }

        // Status Effects processing
        if (this.status.burnTimer > 0) {
            this.status.burnTimer--; this.status.burnTick++;
            if (this.status.burnTick > 30) {
                this.applyDamage(5, false, true); this.status.burnTick = 0;
                visualEffects.push(new TextEffect(this.x, this.y - 20, '-5', '#ef4444'));
            }
        }
        if (this.status.poisonTimer > 0) {
            this.status.poisonTimer--; this.status.poisonTick++;
            if (this.status.poisonTick > 30) {
                this.applyDamage(15, false, true); this.status.poisonTick = 0;
                visualEffects.push(new TextEffect(this.x, this.y - 20, '-15', '#a855f7'));
            }
        }

        if (this.status.slowTimer > 0) this.status.slowTimer--;
        else this.status.slowFactor = 1;

        if (this.status.atkDownTimer > 0) this.status.atkDownTimer--;
        if (this.status.defDownTimer > 0) this.status.defDownTimer--;
        if (this.status.healBlockTimer > 0) this.status.healBlockTimer--;

        if (this.status.frozen) {
            this.status.freezeTick++;
            if (this.status.freezeTick >= 60) { // 1 sec
                if (Math.random() < 0.20) {
                    this.status.frozen = false; // 20% chance to break free
                    visualEffects.push(new BubbleEffect(this.x, this.y, '#38bdf8', 100)); // ice shatter
                }
                this.status.freezeTick = 0;
            }
            return; // Cannot move or attack
        }

        if (this.status.stunTimer > 0) {
            this.status.stunTimer--;
            return; // Cannot move
        }
        
        if (this.status.paralyzed) {
            this.status.paraStunTick++;
            if (this.status.paraStunTick > 60) {
                if (Math.random() < 0.12) this.status.stunTimer = 120;
                this.status.paraStunTick = 0;
            }
        }

        let currentSpeed = this.baseSpeed * this.status.slowFactor;
        if (this.status.paralyzed) currentSpeed *= 0.5;

        // Confusion processing
        if (this.status.confused) {
            this.status.confuseTick++;
            if (this.status.confuseTick >= 60) {
                this.status.confuseTick = 0;
                if (Math.random() < 0.1) {
                    let selfDmg = (this.baseData.dmg || 10) * 3;
                    this.applyDamage(selfDmg, true, true);
                    visualEffects.push(new TextEffect(this.x, this.y - 30, `?ºÎ?! -${selfDmg}`, '#a855f7'));
                }
            }
            this.status.confuseTimer--;
            if (this.status.confuseTimer <= 0) {
                this.status.confused = false;
            }
        }

        // Skill Processing
        if (this.skill === 'sleep') {
            this.skillTimer++;
            if (this.skillTimer >= 180) { // Every 3 sec
                this.skillTimer = 0;
                visualEffects.push(new BubbleEffect(this.x, this.y, '#93c5fd', 80)); // blue sleep powder
                towers.forEach(t => {
                    let dx = t.x - this.x;
                    let dy = t.y - this.y;
                    if (dx*dx + dy*dy <= 10000) { // 100^2
                        t.sleepTimer = 210; // 3.5s
                    }
                });
            }
        } else if (this.skill === 'yawn') {
            this.skillTimer++;
            if (this.skillTimer >= 900) { // Every 15 sec
                this.skillTimer = 0;
                visualEffects.push(new BubbleEffect(this.x, this.y, '#f87171', 120)); // red yawn
                towers.forEach(t => {
                    let dx = t.x - this.x;
                    let dy = t.y - this.y;
                    if (dx*dx + dy*dy <= 14400) { // 120^2
                        t.yawnTimer = 600; // 10s
                    }
                });
            }
        } else if (this.skill === 'rockThrow') {
            this.skillTimer++;
            if (this.skillTimer >= 300) { // Every 5 sec
                this.skillTimer = 0;
                let target = towers.find(t => {
                    let dx = t.x - this.x;
                    let dy = t.y - this.y;
                    return dx*dx + dy*dy <= 40000; // 200^2
                });
                if (target) {
                    if (!POKEMON_DATA[target.baseId].immuneToDebuffs) target.stunTimer = 300; // 5Ï¥??§ÌÑ¥
                    visualEffects.push(new LineEffect(this.x, this.y, target.x, target.y, '#78716c'));
                    visualEffects.push(new TextEffect(target.x, target.y - 20, 'Stun!', '#facc15'));
                }
            }
        } else if (this.skill === 'enemyStun' || this.skill === 'enemyFreeze') {
            this.skillTimer++;
            if (this.skillTimer >= 300) { // Every 5 sec
                this.skillTimer = 0;
                let target = towers.find(t => {
                    let dx = t.x - this.x; let dy = t.y - this.y;
                    return dx*dx + dy*dy <= 40000; // 200^2
                });
                if (target) {
                    if (!POKEMON_DATA[target.baseId].immuneToDebuffs) target.stunTimer = 120; // 2Ï¥?Í∏∞Ï†à/?ºÏùå
                    visualEffects.push(new TextEffect(target.x, target.y - 20, this.skill === 'enemyFreeze' ? 'Frozen!' : 'Stun!', this.skill === 'enemyFreeze' ? '#38bdf8' : '#facc15'));
                }
            }
        } else if (this.skill === 'summonExeggcute') {
            this.skillTimer++;
            if (this.skillTimer >= 300) { // Every 5 sec
                this.skillTimer = 0;
                let childData = ENEMY_TYPES_R3.find(e => e.id === 'exeggcute');
                if (childData) {
                    let child = new Enemy(childData, this.maxHp / childData.hp * 0.5); // ?ÅÏ†à??Ï≤¥Î†•
                    child.x = this.x; child.y = this.y; child.pathIndex = this.pathIndex;
                    child.reward = 0; // Î≥¥ÏÉÅ ?ÜÏùå
                    enemies.push(child);
                    visualEffects.push(new TextEffect(this.x, this.y - 20, 'Summon!', '#4ade80'));
                }
            }
        } else if (this.skill === 'weakenTowerAura' || this.skill === 'weakenTowerAuraLarge') {
            let range = this.skill === 'weakenTowerAuraLarge' ? 120 : 90;
            if (frame % 30 === 0) visualEffects.push(new BubbleEffect(this.x, this.y, 'rgba(59, 130, 246, 0.3)', range));
        } else if (this.skill === 'dash') {
            this.skillTimer++;
            if (this.skillTimer >= 180) { // 3Ï¥àÎßà??
                this.skillTimer = 0;
                this.dashTimer = 30; // 0.5Ï¥??ôÏïà ?Ä??
            }
            if (this.dashTimer > 0) {
                this.dashTimer--;
                currentSpeed *= 3;
                if (frame % 3 === 0) visualEffects.push(new BubbleEffect(this.x, this.y, '#d4d4d8', 10));
            }
        } else if (this.skill === 'sandTomb' || this.skill === 'sandTombHeal') {
            if (frame % 5 === 0) visualEffects.push(new BubbleEffect(this.x, this.y, '#b45309', 20)); // Î™®Îûò ?¥Ìéô??
            towers.forEach(t => {
                let dx = t.x - this.x;
                let dy = t.y - this.y;
                if (dx*dx + dy*dy <= 6400) { // 80^2 ?¨Í±∞Î¶?
                    t.sandTombTimer = 2; // Îß??ÑÎ†à??Î∂Ä?¨Îêò??Í≥µÍ≤© Î∂àÍ??•ÌïòÍ≤?ÎßåÎì¶
                }
            });
        }

        if (this.skill === 'synergy') {
            let count = window.globalSynergyCount || 0;
            currentSpeed *= (1 + count * 0.1);
        }

        // Move Logic
        let bdx = BASE_X - this.x;
        let bdy = BASE_Y - this.y;
        const distToBaseSq = bdx*bdx + bdy*bdy;

        // Ranged Attack logic (Stops moving when base is in range)
        const rangeDist = this.baseData.rangeDist || 250;
        if ((this.skill === 'ranged' || this.skill === 'rangedStun') && distToBaseSq <= rangeDist * rangeDist) {
            this.skillTimer++;
            if (this.skillTimer >= 60) { // Attack base every 1 second
                this.skillTimer = 0;
                let finalDamage = this.damage;
                if (finalDamage > 0) {
                    if (this.status.atkDownTimer > 0) finalDamage = Math.max(1, Math.floor(finalDamage * this.status.atkDownFactor));
                }
                
                lives -= finalDamage; // Deals damage from afar
                
                visualEffects.push(new LineEffect(this.x, this.y, BASE_X, BASE_Y, '#94a3b8'));
                visualEffects.push(new TextEffect(BASE_X, BASE_Y - 20, `-${finalDamage}`, '#ef4444'));
                
                if (this.skill === 'rangedStun') {
                    let target = towers[Math.floor(Math.random() * towers.length)];
                    if (target) {
                        if (!POKEMON_DATA[target.baseId].immuneToDebuffs) target.stunTimer = 120;
                        visualEffects.push(new TextEffect(target.x, target.y - 20, 'Stun!', '#facc15'));
                    }
                }
            }
            return; // Stops moving
        }

        if (this.skill === 'raidBossZeraora' && frame % 120 === 0) { // Îß?2Ï¥àÎßà??1ÎßàÎ¶¨ ?§ÌÑ¥
            visualEffects.push(new BubbleEffect(this.x, this.y, '#facc15', 30));
            towers.forEach(t => {
                if (Math.hypot(t.x - this.x, t.y - this.y) <= 150) {
                    if (t.immuneTimer <= 0 && !POKEMON_DATA[t.baseId].immuneToDebuffs) {
                        t.stunTimer = Math.max(t.stunTimer, 60); // 1Ï¥?Í∏∞Ï†à
                        visualEffects.push(new TextEffect(t.x, t.y - 20, 'ÎßàÎπÑ!', '#facc15'));
                    }
                }
            });
        }

        if (this.skill === 'raidBossLugia' && frame % 180 === 0) { // Îß?3Ï¥àÎßà??Í∏ÄÎ°úÎ≤å ?®Ïùº ?§ÌÑ¥
            const validTowers = towers.filter(t => t.immuneTimer <= 0 && !POKEMON_DATA[t.baseId].immuneToDebuffs);
            if (validTowers.length > 0) {
                const targetTower = validTowers[Math.floor(Math.random() * validTowers.length)];
                targetTower.stunTimer = Math.max(targetTower.stunTimer, 180); // 3Ï¥?Í∏∞Ï†à
                visualEffects.push(new BubbleEffect(this.x, this.y, '#93c5fd', 30));
                visualEffects.push(new TextEffect(targetTower.x, targetTower.y - 20, 'ÎßàÎπÑ!', '#93c5fd'));
                
                // Î£®Í∏∞?ÑÎ????Ä?åÍπåÏßÄ ?úÍ∞Å?ÅÏù∏ Î≤àÍ∞ú(Í¥ëÏÑ†) ?®Í≥º
                ctx.beginPath();
                ctx.moveTo(this.x, this.y - 20);
                ctx.lineTo(targetTower.x, targetTower.y - 20);
                ctx.strokeStyle = '#bfdbfe';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }
                }
            });
        }

        const target = waypoints[this.pathIndex + 1];
        if (!target) return;

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);

        // Track facing direction for animation
        if (Math.abs(dx) > 0.5) this.facingDir = dx > 0 ? 1 : -1;

        if (dist < currentSpeed) {
            this.x = target.x; this.y = target.y;
            this.pathIndex++;
            // Update cached progress
            this.progress = this.pathIndex * 1000;
            if (this.pathIndex >= waypoints.length - 1) {
                // Reached Base
                if (this.baseData && (this.baseData.skill === 'raidBossTypeNull' || this.baseData.skill === 'raidBossZeraora' || this.baseData.skill === 'raidBossLugia')) {
                    this.x = waypoints[0].x;
                    this.y = waypoints[0].y;
                    this.pathIndex = 0;
                    raidVirtualHp -= 5000;
                    if (raidVirtualHp <= 0) {
                        isRaidActive = false;
                        this.hp = 0;
                        renderBackgroundToOffscreen();
                        alert('?àÏù¥???§Ìå®!');
                    } else {
                        visualEffects.push(new TextEffect(this.x, this.y, 'Î£®ÌîÑ! Í∞Ä?ÅÏ≤¥??Í∞êÏÜå', '#c084fc'));
                    }
                    return; // Skip normal base damage
                }

                let finalDamage = this.damage;
                if (finalDamage > 0) {
                    if (this.status.burnTimer > 0) finalDamage = Math.max(1, Math.floor(finalDamage / 2));
                    if (this.status.atkDownTimer > 0) finalDamage = Math.max(1, Math.floor(finalDamage * this.status.atkDownFactor));
                }
                
                lives -= finalDamage;
                
                visualEffects.push(new TextEffect(BASE_X, BASE_Y - 20, `-${finalDamage}`, '#ef4444'));
                this.hp = 0;
            }
        } else {
            this.x += (dx / dist) * currentSpeed;
            this.y += (dy / dist) * currentSpeed;
            // Update cached progress (negative dist means farther = more progress)
            this.progress = this.pathIndex * 1000 - dist;
        }
    }
}

// Tower draw ?†ÎãàÎ©îÏù¥???Ä??Î∂ÑÎ•ò (Îß??ÑÎ†à???ùÏÑ± Î∞©Ï????ÅÏàò)
const TOWER_ANIM_ENERGETIC = new Set(['charmander','charmeleon','charizard','pikachu','raichu','mega_charizard_x','mega_charizard_y','zapdos','magneton','mega_raichu_x','mega_raichu_y']);
const TOWER_ANIM_FLUID     = new Set(['squirtle','wartortle','blastoise','vaporeon','articuno','lapras','gyarados','mega_blastoise','mega_lucario']);
const TOWER_ANIM_FLOATING  = new Set(['sigilyph','mewtwo','alakazam','gengar','haunter','gastly','mega_alakazam','mega_gengar']);
const TOWER_ANIM_SWAYING   = new Set(['bulbasaur','ivysaur','venusaur','oddish','vileplume','exeggutor','mega_venusaur']);

class Tower {
    constructor(gridX, gridY, baseId) {
        this.gridX = gridX; this.gridY = gridY;
        this.x = gridX * cellSize + cellSize / 2;
        this.y = gridY * cellSize + cellSize / 2;
        this.baseId = baseId;
        this.level = 1;
        this.timer = 0;

        const data = POKEMON_DATA[baseId];
        this.totalInvested = data.cost;
        this.range = data.range;

        // ?ºÏö¥?úÍ? ÏßÄ???åÎßà??Í∏∞Ï¥à ?•Î†•Ïπ??ÅÏäπ (?∞Î?ÏßÄ 20% Ï¶ùÍ?)
        const dmgBoost = 1 + (currentRound - 1) * 0.2;

        this.damage = Math.floor(data.damage * dmgBoost);
        this.cooldown = data.cooldown; // Í≥µÏÜç Ï¶ùÍ? ?ÜÏùå
        
        this.sleepTimer = 0;
        this.yawnTimer = 0;
        this.stunTimer = 0;
        this.sandTombTimer = 0;
        
        this.item = null;
        this.immuneTimer = 0;
        this.lastTarget = null;
        this.attackFrame = 0;
        this.bobOffset = Math.random() * Math.PI * 2;
        
        this.applyGlobalUpgrades();
    }

    applyGlobalUpgrades() {
        if (!currentUser) return;
        const users = loadUsers();
        if (!users[currentUser] || !users[currentUser].upgrades) return;

        const upgrades = users[currentUser].upgrades;
        const data = POKEMON_DATA[this.baseId];
        
        let myFamily = null;
        for (const [family, idArray] of Object.entries(POKEMON_FAMILIES)) {
            if (idArray.includes(this.baseId)) {
                myFamily = family;
                break;
            }
        }
        
        if (!myFamily) return;
        
        const famUpg = upgrades[myFamily] || {};

        const getR = (statKey) => (famUpg[statKey] || 0) / 10;
        const getLv = (statKey) => (famUpg[statKey] || 0);

        const dmgBoost = 1 + (currentRound - 1) * 0.2;
        this.damage = Math.floor(data.damage * dmgBoost);
        this.range = data.range;
        this.cooldown = data.cooldown;
        
        this.globalBurnChance = 0;
        this.globalParalyzeChance = 0;
        this.globalFreezeChance = 0;
        this.globalConfuseChance = 0;
        this.globalStunChance = 0;
        this.globalHealBlock = false;
        this.globalAoeMult = 1;
        this.globalProjRangeMult = 1;
        this.globalDebuffMult = 1;
        this.globalChainBonus = 0;
        this.globalSpreadBonus = 0;
        this.globalSpreadAngleMult = 1;
        this.globalSlowFactor = 0;
        this.immuneToAtkDown = false;
        this.hasGlobalIntimidate = false;
        
        switch (myFamily) {
            case 'charmander':
                this.damage = Math.floor(this.damage * (1 + 0.70 * getR('damage')));
                this.range = Math.floor(this.range * (1 + 0.25 * getR('range')));
                this.globalAoeMult = 1 + 0.15 * getR('aoe');
                this.globalBurnChance = 0.05 * getR('burn');
                break;
            case 'squirtle':
                this.damage = Math.floor(this.damage * (1 + 0.50 * getR('damage')));
                this.globalAoeMult = 1 + 0.33 * getR('aoe');
                this.globalDebuffMult = 1 + 0.50 * getR('debuff');
                if (data.cooldown > 30) {
                    this.cooldown = Math.floor(data.cooldown - (data.cooldown - 30) * getR('speed'));
                }
                break;
            case 'bulbasaur':
                this.damage = Math.floor(this.damage * (1 + 0.50 * getR('damage')));
                this.range = Math.floor(this.range * (1 + 0.20 * getR('range')));
                this.globalAoeMult = 1 + 0.50 * getR('aoe');
                this.globalHealBlock = (getLv('util') > 0);
                break;
            case 'pikachu':
                this.damage = Math.floor(this.damage * (1 + 0.45 * getR('damage')));
                this.range = Math.floor(this.range * (1 + 0.20 * getR('range')));
                this.globalChainBonus = Math.floor(2 * getR('chain'));
                this.globalParalyzeChance = 0.05 * getR('paralyze');
                this.globalConfuseChance = 0.10 * getR('confuse');
                break;
            case 'eevee':
                this.damage = Math.floor(this.damage * (1 + 0.55 * getR('damage')));
                const effR = getR('effect');
                if (this.baseId === 'flareon') this.globalBurnChance = 0.10 * effR;
                if (this.baseId === 'vaporeon') this.globalAoeMult = 1 + 0.80 * effR;
                if (this.baseId === 'jolteon') {
                    if (data.cooldown > 6) {
                        this.cooldown = Math.floor(data.cooldown - (data.cooldown - 6) * effR);
                    }
                }
                if (this.baseId === 'leafeon') this.damage = Math.floor(this.damage * (1 + 0.25 * effR));
                if (this.baseId === 'glaceon') this.globalChainBonus = Math.floor(3 * effR);
                break;
            case 'gastly':
                this.damage = Math.floor(this.damage * (1 + 0.33 * getR('damage')));
                this.range = Math.floor(this.range * (1 + 0.05 * getR('range')));
                this.globalAoeMult = 1 + 0.20 * getR('aoe');
                this.globalDebuffMult = 1 + 0.15 * getR('debuff');
                this.globalHealBlock = (getLv('util') > 0);
                break;
            case 'abra':
                this.damage = Math.floor(this.damage * (1 + 0.40 * getR('damage')));
                this.range = Math.floor(this.range * (1 + 0.15 * getR('range')));
                this.globalAoeMult = 1 + 0.10 * getR('aoe');
                this.globalParalyzeChance = 0.10 * getR('paralyze');
                if (this.baseId === 'mega_alakazam') this.globalParalyzeChance += 0.05 * getR('paralyze');
                break;
            case 'magnemite':
                this.damage = Math.floor(this.damage * (1 + 0.45 * getR('damage')));
                this.range = Math.floor(this.range * (1 + 0.20 * getR('range')));
                this.globalAoeMult = 1 + 0.35 * getR('aoe');
                this.globalParalyzeChance = 0.05 * getR('paralyze');
                this.globalStunChance = 0.05 * getR('stun');
                break;
            case 'riolu':
                this.damage = Math.floor(this.damage * (1 + 0.50 * getR('damage')));
                this.cooldown = Math.floor(data.cooldown * (1 - 0.18 * getR('speed')));
                this.globalAoeMult = 1 + 0.20 * getR('aoe');
                this.hasGlobalIntimidate = (getLv('util') > 0);
                break;
            case 'froakie':
                this.range = Math.floor(this.range * (1 + 0.35 * getR('range')));
                const targetCd = (this.baseId === 'greninja') ? 6 : 12;
                if (data.cooldown > targetCd) {
                    this.cooldown = Math.floor(data.cooldown - (data.cooldown - targetCd) * getR('speed'));
                }
                this.immuneToAtkDown = (getLv('util') > 0);
                break;
            case 'smoochum':
                this.damage = Math.floor(this.damage * (1 + 0.25 * getR('damage')));
                this.range = Math.floor(this.range * (1 + 0.15 * getR('range')));
                this.globalAoeMult = 1 + 0.10 * getR('aoe');
                this.globalFreezeChance = 0.05 * getR('freeze');
                break;
            case 'sigilyph':
                this.damage = Math.floor(this.damage * (1 + 0.25 * getR('damage')));
                break;
            case 'litten':
                this.damage = Math.floor(this.damage * (1 + 0.50 * getR('damage')));
                this.range = Math.floor(this.range * (1 + 0.15 * getR('range')));
                this.globalBurnChance = 0.10 * getR('burn');
                if (this.baseId === 'incineroar') {
                    this.globalAoeMult = 1 + 0.50 * getR('aoe');
                }
                break;
            case 'popplio':
                this.range = Math.floor(this.range * (1 + 0.20 * getR('range')));
                this.globalAoeMult = 1 + 0.33 * getR('aoe');
                this.globalDebuffMult = 1 + 0.10 * getR('debuff');
                this.globalSlowFactor = 0.5 * getR('slow');
                break;
            case 'rowlet':
                this.range = Math.floor(this.range * (1 + 0.22 * getR('range')));
                this.globalSpreadBonus = Math.floor(2 * getR('spread'));
                this.globalProjRangeMult = 1 + 0.15 * getR('proj');
                this.globalSpreadAngleMult = 1 - 0.50 * getR('narrow');
                break;
        }
    }

    draw() {
        const data = POKEMON_DATA[this.baseId];
        const img = getImg(data.spriteId);
        
        if (data.id === 'vaporeon' || this.baseId === 'vaporeon') {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
            ctx.beginPath(); ctx.arc(this.x, this.y, data.auraRange || 120, 0, Math.PI*2); ctx.fill();
        }
        
        if (selectedTower === this) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath(); ctx.arc(this.x, this.y, 25, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath(); ctx.arc(this.x, this.y, this.range, 0, Math.PI*2); ctx.stroke();
        }

        if (img.complete && img.naturalWidth > 0) {
            const id = data.id || this.baseId;

            let idleTime = frame * 0.05 + this.bobOffset;
            let idleSquash = 1, idleStretch = 1, idleBob = 0, idleRot = 0;

            if (TOWER_ANIM_ENERGETIC.has(id)) {
                idleTime *= 1.5;
                idleSquash = 1 + Math.sin(idleTime) * 0.04;
                idleStretch = 1 - Math.sin(idleTime) * 0.04;
            } else if (TOWER_ANIM_FLUID.has(id)) {
                idleSquash = 1 + Math.sin(idleTime) * 0.02;
                idleStretch = 1 + Math.cos(idleTime) * 0.02;
                idleBob = Math.sin(idleTime) * 3;
            } else if (TOWER_ANIM_FLOATING.has(id)) {
                idleBob = Math.sin(idleTime * 0.8) * -8 - 5;
                idleRot = Math.sin(idleTime * 0.4) * 0.05;
            } else if (TOWER_ANIM_SWAYING.has(id)) {
                idleRot = Math.sin(idleTime * 0.6) * 0.1;
            } else {
                idleSquash = 1 + Math.sin(idleTime) * 0.03;
                idleStretch = 1 - Math.sin(idleTime) * 0.03;
                idleBob = Math.sin(idleTime * 2) * 2;
            }

            // Attack recoil jump animation
            let atkPop = 0, atkRot = 0, atkScale = 1;
            
            if (this.attackFrame > 0) {
                const prog = (8 - this.attackFrame) / 8;
                if (TOWER_ANIM_ENERGETIC.has(id)) {
                    atkPop = Math.sin(prog * Math.PI) * -15;
                    atkScale = 1 + Math.sin(prog * Math.PI) * 0.2;
                } else if (TOWER_ANIM_FLUID.has(id)) {
                    atkPop = Math.sin(prog * Math.PI) * -6;
                    atkScale = 1 - Math.sin(prog * Math.PI) * 0.1;
                } else if (TOWER_ANIM_SWAYING.has(id)) {
                    atkRot = Math.sin(prog * Math.PI) * 0.3 * (this.gridX % 2 === 0 ? 1 : -1);
                } else {
                    atkPop = Math.sin(prog * Math.PI) * -12;
                    atkRot = Math.sin(prog * Math.PI) * 0.2 * (this.gridX % 2 === 0 ? 1 : -1);
                    atkScale = 1 + Math.sin(prog * Math.PI) * 0.15;
                }
                this.attackFrame--;
            }

            // Status overlay color
            let overlayColor = null;
            if (this.stunTimer > 0) overlayColor = 'rgba(234, 179, 8, 0.5)';
            else if (this.sleepTimer > 0) overlayColor = 'rgba(100, 116, 139, 0.6)';
            else if (this.yawnTimer > 0) overlayColor = 'rgba(236, 72, 153, 0.4)';
            else if (this.sandTombTimer > 0) overlayColor = 'rgba(180, 83, 9, 0.45)';

            ctx.save();
            ctx.translate(Math.floor(this.x), Math.floor(this.y + idleBob + atkPop));
            ctx.scale(idleSquash * atkScale, idleStretch * atkScale);
            ctx.rotate(idleRot + atkRot);

            if (overlayColor) {
                // Use offscreen canvas for correct sprite-only overlay
                _overlayCtx.clearRect(0, 0, 80, 80);
                _overlayCtx.drawImage(img, 0, 0, 80, 80);
                _overlayCtx.globalCompositeOperation = 'source-atop';
                _overlayCtx.fillStyle = overlayColor;
                _overlayCtx.fillRect(0, 0, 80, 80);
                _overlayCtx.globalCompositeOperation = 'source-over';
                ctx.drawImage(_overlayCanvas, -40, -45);
            } else {
                ctx.drawImage(img, -40, -45, 80, 80);
            }
            ctx.restore();

            if (this.stunTimer > 0) {
                ctx.fillStyle = '#facc15'; ctx.font = '14px Arial'; ctx.textAlign = 'center'; ctx.fillText('Stun!', this.x, this.y - 50 + idleBob + atkPop);
            } else if (this.sleepTimer > 0) {
                ctx.fillStyle = '#cbd5e1'; ctx.font = '14px Arial'; ctx.textAlign = 'center'; ctx.fillText('Zzz', this.x, this.y - 50 + idleBob + atkPop);
            } else if (this.yawnTimer > 0) {
                ctx.fillStyle = '#64748b'; ctx.font = '14px Arial'; ctx.textAlign = 'center'; ctx.fillText('...', this.x, this.y - 50 + idleBob + atkPop);
            } else if (this.sandTombTimer > 0) {
                ctx.fillStyle = '#b45309'; ctx.font = '14px Arial'; ctx.textAlign = 'center'; ctx.fillText('Trapped', this.x, this.y - 50 + idleBob + atkPop);
            }
        }
        
        ctx.fillStyle = '#0f172a'; ctx.fillRect(this.x + 10, this.y + 10, 20, 15);
        ctx.fillStyle = '#fff'; ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`L${this.level}`, this.x + 20, this.y + 17.5);
        
        if (this.item) {
            const itemInfo = SHOP_ITEM_POOL.find(i => i.id === this.item);
            if (itemInfo) {
                ctx.font = '16px Arial';
                ctx.fillText(itemInfo.icon, this.x - 20, this.y + 18);
            }
        }
    }

    update() {
        const data = POKEMON_DATA[this.baseId];
        
        if (this.item === 'lum_berry') {
            if (this.stunTimer > 0 || this.sandTombTimer > 0 || this.sleepTimer > 0 || this.yawnTimer > 0) {
                this.stunTimer = 0; this.sandTombTimer = 0; this.sleepTimer = 0; this.yawnTimer = 0;
                this.immuneTimer = 600; // 10 seconds immunity
                this.item = null;
                visualEffects.push(new BubbleEffect(this.x, this.y, '#4ade80', 50));
                visualEffects.push(new TextEffect(this.x, this.y - 30, '?ÅÌÉú?¥ÏÉÅ ?åÎ≥µ!', '#4ade80'));
            }
        }

        if (data.immuneToDebuffs || this.immuneTimer > 0) {
            this.stunTimer = 0;
            this.sandTombTimer = 0;
            this.sleepTimer = 0;
            this.yawnTimer = 0;
        }
        
        if (this.immuneTimer > 0) this.immuneTimer--;
        
        if (this.stunTimer > 0) {
            this.stunTimer--;
            return; // Cannot attack
        }
        if (this.sandTombTimer > 0) {
            this.sandTombTimer--;
            return; // Cannot attack
        }
        if (this.sleepTimer > 0) {
            this.sleepTimer--;
            return; // Cannot attack
        }
        
        if (data.canAttack === false) return; // ÏºÄ?¥ÏãúÏ≤òÎüº Í≥µÍ≤©??Î∂àÍ??•Ìïú ?Ä??
        
        if (this.yawnTimer > 0) {
            this.yawnTimer--;
            // Halve attack speed by decrementing timer only every other frame
            if (frame % 2 !== 0) return;
        }

        if (this.timer > 0) this.timer--;
        if (this.timer === 0) {
            
            if (data.type === 'global') {
                let hitAny = false;
                for (let e of enemies) {
                    e.applyDamage(this.damage, false, false, this);
                    if (data.confuseChance && Math.random() < data.confuseChance) {
                        e.status.confused = true;
                        e.status.confuseTimer = 300; // 5Ï¥?
                        e.status.confuseTick = 0;
                    }
                    hitAny = true;
                    if (visualEffects.length < 200) visualEffects.push(new BubbleEffect(e.x, e.y, data.color, 15));
                }
                if (hitAny) { this.timer = this.cooldown; this.attackFrame = 8; }
                
            } else if (data.type === 'aura') {
                let hitAny = false;
                let rangeSq = this.range * this.range;
                for (let e of enemies) {
                    let dx = e.x - this.x;
                    if (dx > this.range || dx < -this.range) continue;
                    let dy = e.y - this.y;
                    if (dy > this.range || dy < -this.range) continue;
                    if (dx*dx + dy*dy <= rangeSq) {
                        let finalDamage = this.damage;
                        if (data.bonusDamageToParalyzed && (e.status.paralyzed || e.status.stunTimer > 0)) finalDamage *= data.bonusDamageToParalyzed;
                        e.applyDamage(finalDamage, false, false, this);
                        e.status.slowFactor = data.slowFactor;
                        e.status.slowTimer = data.slowDur;
                        if (data.paralyzeChance && Math.random() < data.paralyzeChance) e.status.paralyzed = true;
                        hitAny = true;
                        if (visualEffects.length < 200) visualEffects.push(new BubbleEffect(e.x, e.y, data.color, 20));
                    }
                }
                if (hitAny) { this.timer = this.cooldown; this.attackFrame = 8; }
                
            } else {
                let bestEnemy = null;
                let maxProgress = -Infinity;
                let rangeSq = this.range * this.range;
                for (let e of enemies) {
                    let dx = e.x - this.x;
                    if (dx > this.range || dx < -this.range) continue;
                    let dy = e.y - this.y;
                    if (dy > this.range || dy < -this.range) continue;
                    if (dx*dx + dy*dy <= rangeSq) {
                        // Use cached progress (updated each frame in Enemy.update)
                        if (e.progress > maxProgress) {
                            maxProgress = e.progress;
                            bestEnemy = e;
                        }
                    }
                }
                if (bestEnemy) {
                    let damageMult = 1;
                    if (this.item === 'life_orb') damageMult *= 1.2;
                    if (this.item === 'enigma_berry' && lives <= 250) damageMult *= 1.5;
                    
                    for (let e of (window.weakenAuraEnemies || [])) {
                        let auraRange = e.baseData.skill === 'weakenTowerAuraLarge' ? 120 : 90;
                        let edx = e.x - this.x; let edy = e.y - this.y;
                        if (edx*edx + edy*edy <= auraRange*auraRange) {
                            if (!POKEMON_DATA[this.baseId].immuneToDebuffs) {
                                damageMult *= 0.8; // 20% reduction
                            }
                            break;
                        }
                    }
                    
                    for (let t of (window.damageAuraTowers || [])) {
                        const auraData = POKEMON_DATA[t.baseId];
                        let tdx = t.x - this.x;
                        let tdy = t.y - this.y;
                        if (tdx*tdx + tdy*tdy <= auraData.auraRange * auraData.auraRange) {
                            damageMult = Math.max(damageMult, auraData.auraMult);
                        }
                    }
                    
                    let targetChanged = (this.lastTarget !== bestEnemy);
                    this.lastTarget = bestEnemy;

                    let currentCooldown = this.cooldown;
                    if (this.item === 'choice_scarf') {
                        currentCooldown = Math.floor(currentCooldown * 0.66);
                        if (targetChanged && this.comboStack > 0) {
                            currentCooldown += this.cooldown; // delay
                            visualEffects.push(new TextEffect(this.x, this.y - 30, '?úÎ†à??..', '#94a3b8'));
                        }
                    }

                    if (data.atkSpeedStack) {
                        if (!targetChanged) {
                            this.comboStack = Math.min((this.comboStack || 0) + 1, 15); // ÏµúÎ? 15?§ÌÉù
                        } else {
                            this.comboStack = 0;
                        }
                        this.timer = Math.max(10, currentCooldown - this.comboStack * 2); // ÏµúÏÜå 10?ÑÎ†à??
                    } else {
                        this.timer = currentCooldown;
                        this.comboStack = 1; // used for choice scarf delay check
                    }

                    if (data.type === 'laser') {
                        // ?àÏù¥?Ä Ï¶âÎ∞ú Ï∂©Îèå ?êÏ†ï
                        this.attackFrame = 8;
                        let dx = bestEnemy.x - this.x;
                        let dy = bestEnemy.y - this.y;
                        let length = Math.hypot(dx, dy);
                        let dirX = dx / length;
                        let dirY = dy / length;
                        let laserEndX = this.x + dirX * 1000;
                        let laserEndY = this.y + dirY * 1000;
                        if (visualEffects.length < 200) visualEffects.push(new LaserEffect(this.x, this.y, laserEndX, laserEndY, data.color, data.laserWidth));
                        for (let e of enemies) {
                            let px = e.x - this.x; let py = e.y - this.y;
                            let proj = px * dirX + py * dirY;
                            if (proj > 0 && proj < 1000) {
                                let closestX = this.x + proj * dirX; let closestY = this.y + proj * dirY;
                                let cx = e.x - closestX; if (cx > 30 || cx < -30) continue;
                                let cy = e.y - closestY; if (cy > 30 || cy < -30) continue;
                                if (cx*cx + cy*cy < 900) {
                                    e.applyDamage(this.damage * damageMult, data.ignoreDef, false, this);
                                    if (data.paralyzeChance && Math.random() < data.paralyzeChance) e.status.paralyzed = true;
                                    if (data.stunDur) e.status.stunTimer = data.stunDur;
                                }
                            }
                        }
                    } else if (data.type === 'spread') {
                        this.attackFrame = 8;
                        let spreadCount = (data.spreadCount || 5) + (this.globalSpreadBonus || 0);
                        let baseAngle = Math.atan2(bestEnemy.y - this.y, bestEnemy.x - this.x);
                        let spreadAngle = (Math.PI / 4) * (this.globalSpreadAngleMult || 1);
                        let startAngle = baseAngle - spreadAngle / 2;
                        let angleStep = spreadCount > 1 ? spreadAngle / (spreadCount - 1) : 0;
                        for (let i = 0; i < spreadCount; i++) {
                            let angle = startAngle + i * angleStep;
                            projectiles.push(new Projectile(this.x, this.y, null, this, damageMult, angle, spreadCount));
                        }
                    } else if (data.type === 'aoe' && data.aoeRange) {
                        // AOE: ?ÑÎ°ú?ùÌ???Î∞úÏÇ¨ ???ÑÏ∞© ????∞ú
                        this.attackFrame = 8;
                        projectiles.push(new Projectile(this.x, this.y, bestEnemy, this, damageMult));
                    } else if (data.type === 'chain') {
                        // Chain: ?ÑÎ°ú?ùÌ???Î∞úÏÇ¨
                        this.attackFrame = 8;
                        projectiles.push(new Projectile(this.x, this.y, bestEnemy, this, damageMult));
                    } else {
                        // Single: ?ÑÎ°ú?ùÌ???Î∞úÏÇ¨
                        this.attackFrame = 8;
                        projectiles.push(new Projectile(this.x, this.y, bestEnemy, this, damageMult));
                    }
                }
            }
        }

        if (data.hasIntimidate && frame % 60 === 0) {
            if (visualEffects.length < 200) visualEffects.push(new BubbleEffect(this.x, this.y, 'rgba(239, 68, 68, 0.3)', data.auraRange));
            for (let e of enemies) {
                let dx = e.x - this.x; let dy = e.y - this.y;
                if (dx*dx + dy*dy <= data.auraRange * data.auraRange) {
                    if (e.status.atkDownFactor > 0.75) {
                        e.status.atkDownFactor -= 0.05;
                        e.status.atkDownTimer = 99999;
                        if (Math.random() < 0.3 && visualEffects.length < 200) visualEffects.push(new TextEffect(e.x, e.y - 20, '?ÑÌòë!', '#ef4444'));
                    }
                }
            }
        }
    }
}

class Projectile {
    constructor(x, y, target, sourceTower, damageMult = 1, fixedAngle = null, pierceCount = null) {
        this.x = x; this.y = y; this.target = target; this.sourceTower = sourceTower;
        this.data = POKEMON_DATA[sourceTower.baseId];
        this.damage = sourceTower.damage * damageMult;
        this.speed = 15; this.active = true; this.chainCount = 0; this.hitTargets = new Set();
        this.angle = 0;
        this.spin = 0; // for shuriken
        this.fixedAngle = fixedAngle; this.distTraveled = 0;
        this.pierceCount = pierceCount !== null ? pierceCount : (this.data.pierceCount !== undefined ? this.data.pierceCount : (this.data.type === 'spread' ? this.data.spreadCount : 0));
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.data.projScale) ctx.scale(this.data.projScale, this.data.projScale);
        
        let style = this.data.attackStyle || (this.data.type === 'chain' ? 'lightning' : 'normal');
        
        if (style === 'shuriken') {
            this.spin += 0.4;
            ctx.rotate(this.spin);
        } else {
            ctx.rotate(this.angle);
        }

        ctx.fillStyle = this.data.color;
        
        if (style === 'fire') {
            // Fire droplet
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.quadraticCurveTo(-5, 8, -10, 0);
            ctx.quadraticCurveTo(-5, -8, 10, 0);
            ctx.fill();
            ctx.fillStyle = '#fef08a'; // yellow center
            ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
        } else if (style === 'water') {
            // Water droplet
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.quadraticCurveTo(-8, 6, -10, 0);
            ctx.quadraticCurveTo(-8, -6, 10, 0);
            ctx.fill();
            ctx.fillStyle = '#bae6fd';
            ctx.beginPath(); ctx.arc(-2, -2, 2, 0, Math.PI*2); ctx.fill(); // highlight
        } else if (style === 'leaf') {
            // Leaf shape
            ctx.beginPath();
            ctx.ellipse(0, 0, 10, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#bef264';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke(); // vein
        } else if (style === 'shuriken') {
            // 4-point star
            ctx.beginPath();
            ctx.moveTo(12, 0); ctx.lineTo(3, 3);
            ctx.lineTo(0, 12); ctx.lineTo(-3, 3);
            ctx.lineTo(-12, 0); ctx.lineTo(-3, -3);
            ctx.lineTo(0, -12); ctx.lineTo(3, -3);
            ctx.closePath();
            ctx.fill();
        } else if (style === 'lightning') {
            // Zigzag
            ctx.strokeStyle = this.data.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(-2, -8);
            ctx.lineTo(2, 8);
            ctx.lineTo(10, 0);
            ctx.stroke();
        } else if (style === 'ice') {
            // Snowflake
            ctx.strokeStyle = this.data.color;
            ctx.lineWidth = 2;
            for(let i=0; i<3; i++) {
                ctx.rotate(Math.PI / 3);
                ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
            }
        } else if (style === 'psychic') {
            // Concentric rings
            ctx.strokeStyle = this.data.color;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.stroke();
        } else {
            // Normal circle
            ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
        }
        
        ctx.restore();
    }

    applyEffects(enemy) {
        let finalDamage = this.damage;
        if (this.data.bonusDamageToParalyzed && (enemy.status.paralyzed || enemy.status.stunTimer > 0)) finalDamage *= this.data.bonusDamageToParalyzed;
        
        enemy.applyDamage(finalDamage, this.data.ignoreDef, false, this.sourceTower);
        
        if (enemy.baseData.immuneToDebuffs) return;
        
        let burnChance = (this.data.burnChance || 0) + (this.sourceTower.globalBurnChance || 0);
        let poisonChance = (this.data.poisonChance || 0);
        let confuseChance = (this.data.confuseChance || 0) + (this.sourceTower.globalConfuseChance || 0);
        let freezeChance = (this.data.freezeChance || 0) + (this.sourceTower.globalFreezeChance || 0);
        let paralyzeChance = (this.data.paralyzeChance || 0) + (this.sourceTower.globalParalyzeChance || 0);
        let stunChance = this.sourceTower.globalStunChance || 0;
        let debuffMult = this.sourceTower.globalDebuffMult || 1;
        
        if (burnChance && Math.random() < burnChance) enemy.status.burnTimer = 300;
        if (poisonChance && Math.random() < poisonChance) enemy.status.poisonTimer = 300;
        if (confuseChance && Math.random() < confuseChance) {
            enemy.status.confused = true; enemy.status.confuseTimer = 300; enemy.status.confuseTick = 0;
        }
        if (freezeChance && Math.random() < freezeChance) {
            enemy.status.frozen = true; enemy.status.freezeTick = 0;
        }
        
        if (enemy.baseData.id !== 'snorlax') {
            if (this.data.stunDur) enemy.status.stunTimer = this.data.stunDur;
            else if (stunChance && Math.random() < stunChance) enemy.status.stunTimer = 60;
            if (paralyzeChance && Math.random() < paralyzeChance) enemy.status.paralyzed = true;
        }
        
        if (this.data.defDownFactor) {
            enemy.status.defDownFactor = this.data.defDownFactor * debuffMult; enemy.status.defDownTimer = this.data.debuffDur;
            enemy.status.atkDownFactor = this.data.atkDownFactor || 1; enemy.status.atkDownTimer = this.data.debuffDur;
        }

        let slowFactor = this.data.slowFactor || 0;
        if (this.sourceTower.globalSlowFactor) {
            // Í∏∞Ï°¥ ?îÌôîÍ∞Ä ?ÜÏñ¥???àÎ°ú Ï∂îÍ??????àÏùå. Í∞ïÎèÑ???? 0.5 (50% ?çÎèÑ)
            slowFactor = slowFactor ? Math.min(slowFactor, 1 - this.sourceTower.globalSlowFactor) : (1 - this.sourceTower.globalSlowFactor);
        }
        if (slowFactor && slowFactor > 0) {
            enemy.status.slowFactor = slowFactor;
            enemy.status.slowTimer = this.data.debuffDur || 120;
        }

        if (this.data.knockbackChance && Math.random() < this.data.knockbackChance) enemy.applyKnockback(40);
        
        if (this.sourceTower.globalHealBlock) {
            enemy.status.healBlockTimer = 300;
        }
    }

    update() {
        if (this.fixedAngle !== null) {
            this.angle = this.fixedAngle;
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            this.distTraveled += this.speed;
            
            if (!this.data.flyEnd && this.distTraveled > this.sourceTower.range + 100) {
                this.active = false;
                return;
            }

            
            for (let e of enemies) {
                if (!this.hitTargets.has(e)) {
                    let dx = e.x - this.x;
                    if (dx > 30 || dx < -30) continue;
                    let dy = e.y - this.y;
                    if (dy > 30 || dy < -30) continue;
                    if (dx*dx + dy*dy < 900) { // 30*30
                        this.hitTargets.add(e);
                        this.applyEffects(e);
                        this.pierceCount--;
                        if (this.pierceCount <= 0) { this.active = false; return; }
                    }
                }
            }
            if (this.x < -100 || this.x > canvas.width + 100 || this.y < -100 || this.y > canvas.height + 100) this.active = false;
            return;
        }

        if (!this.target || this.target.hp <= 0) {
            let newTarget = enemies.find(e => {
                if (this.hitTargets.has(e)) return false;
                let dx = e.x - this.x;
                let dy = e.y - this.y;
                return dx*dx + dy*dy < 22500; // 150^2
            });
            if (newTarget) this.target = newTarget;
            else { this.active = false; return; }
        }

        const dx = this.target.x - this.x; const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy);
        this.angle = Math.atan2(dy, dx);

        if (dist < this.speed) {
            this.hitTargets.add(this.target);
            this.applyEffects(this.target);

            if (this.data.type === 'aoe') {
                let currentAoeRange = this.data.aoeRange * (this.sourceTower.globalAoeMult || 1);
                visualEffects.push(new ExplosionEffect(this.target.x, this.target.y, currentAoeRange, this.data.color));
                let aoeRangeSq = currentAoeRange * currentAoeRange;
                for (let e of enemies) {
                    if (e !== this.target) {
                        let edx = e.x - this.target.x;
                        if (edx > currentAoeRange || edx < -currentAoeRange) continue;
                        let edy = e.y - this.target.y;
                        if (edy > currentAoeRange || edy < -currentAoeRange) continue;
                        if (edx*edx + edy*edy <= aoeRangeSq) {
                            let oldDamage = this.damage;
                            this.damage *= 0.5;
                            this.applyEffects(e);
                            this.damage = oldDamage;
                        }
                    }
                }
                this.active = false;
            } else if (this.data.type === 'chain' && this.chainCount < (this.data.chainMax - 1 + (this.sourceTower.globalChainBonus || 0))) {
                this.chainCount++;
                let nextTarget = enemies.find(e => {
                    if (this.hitTargets.has(e)) return false;
                    const dx = e.x - this.target.x;
                    const dy = e.y - this.target.y;
                    return dx * dx + dy * dy < 22500; // 150 * 150
                });
                if (nextTarget) {
                    this.x = this.target.x; this.y = this.target.y; this.target = nextTarget;
                    visualEffects.push(new LineEffect(this.x, this.y, this.target.x, this.target.y, this.data.color));
                    return; 
                } else {
                    this.active = false;
                }
            } else {
                this.active = false;
            }
        } else {
            this.x += (dx / dist) * this.speed; this.y += (dy / dist) * this.speed;
        }
    }
}

// Visual Effects
class ExplosionEffect {
    constructor(x, y, radius, color) { this.x=x; this.y=y; this.maxRadius=radius; this.color=color; this.radius=0; this.alpha=0.8; this.timer=16; }
    update() { this.radius += this.maxRadius/16; this.alpha -= 0.05; this.timer--; }
    draw() { if(this.alpha<=0) return; ctx.globalAlpha=Math.max(0,this.alpha); ctx.fillStyle=this.color; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; }
}
class TextEffect {
    constructor(x,y,text,color) { this.x=x; this.y=y; this.text=text; this.color=color; this.timer=30; }
    update() { this.y-=1; this.timer--; }
    draw() { ctx.fillStyle=this.color; ctx.font='bold 16px Arial'; ctx.fillText(this.text, this.x, this.y); }
}
class LineEffect {
    constructor(x1,y1,x2,y2,color) { this.x1=x1; this.y1=y1; this.x2=x2; this.y2=y2; this.color=color; this.timer=10; }
    update() { this.timer--; }
    draw() { ctx.strokeStyle=this.color; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(this.x1,this.y1); ctx.lineTo(this.x2,this.y2); ctx.stroke(); }
}
class BubbleEffect {
    constructor(x,y,color, maxRadius) { this.x=x; this.y=y; this.color=color; this.radius=10; this.maxRadius = maxRadius; this.timer=15; }
    update() { this.radius += (this.maxRadius / 15); this.timer--; }
    draw() { ctx.strokeStyle=this.color; ctx.lineWidth=2; ctx.globalAlpha=Math.max(0, this.timer/15); ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1;}
}

class LaserEffect {
    constructor(x1, y1, x2, y2, color, width) {
        this.x1 = x1; this.y1 = y1; this.x2 = x2; this.y2 = y2;
        this.color = color; this.width = width;
        this.timer = 15;
    }
    update() { this.timer--; }
    draw() {
        ctx.globalAlpha = Math.max(0, this.timer / 15);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.width;
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.stroke();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = this.width * 0.4;
        ctx.stroke();
        
        ctx.globalAlpha = 1;
    }
}

function renderBackgroundToOffscreen() {
    const mapData = ROUND_MAPS[currentRound];
    if (!mapData) return;
    bgCtx.fillStyle = isRaidActive ? '#1e1b4b' : mapData.bgColor; 
    bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    
    bgCtx.strokeStyle = 'rgba(255,255,255,0.15)'; bgCtx.lineWidth = 1;
    for(let x=0; x<=bgCanvas.width; x+=cellSize) { bgCtx.beginPath(); bgCtx.moveTo(x, 0); bgCtx.lineTo(x, bgCanvas.height); bgCtx.stroke(); }
    for(let y=0; y<=bgCanvas.height; y+=cellSize) { bgCtx.beginPath(); bgCtx.moveTo(0, y); bgCtx.lineTo(bgCanvas.width, y); bgCtx.stroke(); }

    bgCtx.fillStyle = mapData.pathColor;
    pathCells.forEach(cellStr => {
        const [cx, cy] = cellStr.split(',').map(Number);
        bgCtx.fillRect(cx * cellSize, cy * cellSize, cellSize, cellSize);
    });
}

// Draw Grid & Path
function drawBackground() {
    ctx.drawImage(bgCanvas, 0, 0);
}

function drawGridHover() {
    if (mouseX >= 0 && mouseX < canvas.width && mouseY >= 0 && mouseY < canvas.height && !selectedTower) {
        const cellX = Math.floor(mouseX / cellSize);
        const cellY = Math.floor(mouseY / cellSize);
        
        const isPath = pathCells.has(`${cellX},${cellY}`);
        const isTower = towers.some(t => t.gridX === cellX && t.gridY === cellY);
        const cost = POKEMON_DATA[selectedBuildType].cost;
        const canPlace = !isPath && !isTower && berries >= cost;

        ctx.fillStyle = canPlace ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
        ctx.fillRect(cellX * cellSize, cellY * cellSize, cellSize, cellSize);

        const range = POKEMON_DATA[selectedBuildType].range;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath(); ctx.arc(cellX * cellSize + cellSize/2, cellY * cellSize + cellSize/2, range, 0, Math.PI*2); ctx.stroke();
    }
}

// Interaction
canvas.addEventListener('click', (e) => {
    if (mouseX < 0 || mouseY < 0) return;
    const cellX = Math.floor(mouseX / cellSize);
    const cellY = Math.floor(mouseY / cellSize);
    
    const clickedTower = towers.find(t => t.gridX === cellX && t.gridY === cellY);
    
    if (usingItem) {
        // reset item border
        const invSlots = document.getElementById('inv-slots');
        if (invSlots) {
            Array.from(invSlots.children).forEach(child => {
                child.style.borderColor = '#475569';
                child.style.boxShadow = 'none';
            });
        }
        
        if (clickedTower) {
            if (usingItem === 'rare_candy') {
                if (clickedTower.level >= 100) {
                    visualEffects.push(new TextEffect(clickedTower.x, clickedTower.y - 20, "MAX LEVEL!", '#ef4444'));
                    usingItem = null;
                    return;
                }
                inventory['rare_candy']--;
                clickedTower.level++;
                if (clickedTower.baseId === 'sigilyph') {
                    clickedTower.damage += 1;
                } else {
                    clickedTower.damage += 5;
                }
                visualEffects.push(new BubbleEffect(clickedTower.x, clickedTower.y, '#fcd34d', 80));
                visualEffects.push(new TextEffect(clickedTower.x, clickedTower.y - 20, `Level Up!`, '#fcd34d'));
            } else {
                // Equip hold item
                if (clickedTower.item) {
                    inventory[clickedTower.item]++; // Return old item
                }
                inventory[usingItem]--;
                clickedTower.item = usingItem;
                const itemInfo = SHOP_ITEM_POOL.find(i => i.id === usingItem);
                visualEffects.push(new BubbleEffect(clickedTower.x, clickedTower.y, '#fbbf24', 80));
                visualEffects.push(new TextEffect(clickedTower.x, clickedTower.y - 20, `${itemInfo.icon} ?•Ï∞©!`, '#fbbf24'));
            }
            if (selectedTower === clickedTower) updateUI();
            renderInventory();
        }
        usingItem = null;
        return; // ?¨Ïö© Ï∑®ÏÜå ?êÎäî ?¨Ïö© ?ÑÎ£å
    }

    if (clickedTower) {
        selectedTower = clickedTower;
        updateUI();
        if (tutStep === 2) nextTutorial();
        return;
    }

    selectedTower = null;
    updateUI();
    
    if (!selectedBuildType) return;
    const isPath = pathCells.has(`${cellX},${cellY}`);
    const cost = POKEMON_DATA[selectedBuildType].cost;

    if (!isPath && berries >= cost) {
        if (selectedBuildType === 'sigilyph') {
            const sigilyphCount = towers.filter(t => t.baseId === 'sigilyph').length;
            if (sigilyphCount >= 10) {
                visualEffects.push(new TextEffect(mouseX, mouseY - 20, "?¨Î≥¥??ÏµúÎ? 10ÎßàÎ¶¨ ?úÌïú!", '#ef4444'));
                return;
            }
        }
        // ?àÏù¥??Î≥¥ÏÉÅ ?¨ÏºìÎ™??Ä???? ?úÎùº?§Îùº)?Ä 1Î≤àÎßå Î∞∞Ïπò Í∞Ä??
        if (selectedBuildType === 'type_null') {
            const alreadyPlaced = towers.some(t => t.baseId === 'type_null' || t.baseId === 'silvally');
            if (alreadyPlaced) {
                visualEffects.push(new TextEffect(mouseX, mouseY - 20, "?¥Î? Î∞∞Ïπò??", '#ef4444'));
                return;
            }
        }
        if (selectedBuildType === 'zeraora') {
            const alreadyPlaced = towers.some(t => t.baseId === 'zeraora' || t.baseId === 'mega_zeraora');
            if (alreadyPlaced) {
                visualEffects.push(new TextEffect(mouseX, mouseY - 20, "?¥Î? Î∞∞Ïπò??", '#ef4444'));
                return;
            }
        }
        const typeToPlace = selectedBuildType;
        towers.push(new Tower(cellX, cellY, typeToPlace));
        berries -= cost;
        
        // ?àÏù¥??Î≥¥ÏÉÅ ?¨ÏºìÎ™¨Ï? Î∞∞Ïπò ??Î≤ÑÌäº ?®Í∏∞Í∏?
        if (typeToPlace === 'type_null') {
            const btn = document.getElementById('btn-build-typenull');
            if (btn) btn.style.display = 'none';
            selectedBuildType = 'charmander';
            document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('active'));
        }
        if (typeToPlace === 'zeraora') {
            const zeraoraCount = towers.filter(t => t.baseId === 'zeraora' || t.baseId === 'mega_zeraora').length;
            if (zeraoraCount >= 1) {
                visualEffects.push(new TextEffect(mouseX, mouseY - 20, "?úÎùº?§Îùº??1ÎßàÎ¶¨Îß?Î∞∞Ïπò Í∞Ä??", '#ef4444'));
                selectedBuildType = null;
                document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('active'));
                return;
            }
        }
        if (typeToPlace === 'lugia') {
            const lugiaCount = towers.filter(t => t.baseId === 'lugia').length;
            if (lugiaCount >= 1) {
                visualEffects.push(new TextEffect(mouseX, mouseY - 20, "Î£®Í∏∞?ÑÎäî 1ÎßàÎ¶¨Îß?Î∞∞Ïπò Í∞Ä??", '#ef4444'));
                selectedBuildType = null;
                document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('active'));
                return;
            }
        }
        frame++;
    }

    // ?àÏù¥??ÏßÑÌñâ Ï§ëÏóî ?®Ïù¥Î∏??¨Î??Ä Î¨¥Í??òÍ≤å ?àÏù¥??Î≥¥Ïä§ ?ÖÎç∞?¥Ìä∏
    if (isRaidActive) {
        for (let i = enemies.length - 1; i >= 0; i--) {
            enemies[i].update(); enemies[i].draw();
            if (enemies[i].hp <= 0) enemies.splice(i, 1);
        }
        frame++; // ?àÏù¥??Ï§ëÏóê??frame Ïπ¥Ïö¥??Ï¶ùÍ? (?†ÎãàÎ©îÏù¥??Ïø®Îã§??Ï≤òÎ¶¨??
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
        projectiles[i].update(); projectiles[i].draw();
        if (!projectiles[i].active) projectiles.splice(i, 1);
    }
    
    for (let i = visualEffects.length - 1; i >= 0; i--) {
        visualEffects[i].update(); visualEffects[i].draw();
        if (visualEffects[i].timer <= 0 || visualEffects[i].alpha <= 0) visualEffects.splice(i, 1);
    }
    
    if (lives <= 0) {
        if (currentUser) {
            const users = loadUsers();
            if (users[currentUser]) saveUsers(users);
        }
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ef4444'; ctx.font = 'bold 50px Outfit'; ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 20);
        return;
    }

    requestAnimationFrame(animate);
}

// Tutorial System
const tutOverlay = document.getElementById('tutorial-overlay');
const tutTooltip = document.getElementById('tut-tooltip');
const tutText = document.getElementById('tut-text');
let tutStep = 0;

// Tutorial listeners moved to Account System at the bottom

function startTutorial() {
    tutStep = 1; tutTooltip.style.display = 'block'; tutTooltip.style.top = '100px'; tutTooltip.style.left = '320px';
    tutText.innerHTML = "<b>[1/4] ?Ä???§Ïπò</b><br>?ºÏ™Ω Î©îÎâ¥?êÏÑú ?¨ÏºìÎ™¨ÏùÑ Í≥†Î•¥Í≥?Ï∫îÎ≤Ñ?§Ïùò ?îÎîîÎ∞?ùÑ ?¥Î¶≠???§Ïπò?òÏÑ∏??";
    document.getElementById('btn-tut-next').style.display = 'none';
}

function nextTutorial() {
    if (tutStep === 1) {
        tutStep = 2; tutTooltip.style.top = '100px'; tutTooltip.style.left = '320px';
        tutText.innerHTML = "<b>[2/4] Í∞ïÌôî Î∞?ÏßÑÌôî</b><br>Î∞©Í∏à ?§Ïπò???¨ÏºìÎ™¨ÏùÑ ÎßàÏö∞?§Î°ú ?§Ïãú <b>?¥Î¶≠</b>??Î≥¥ÏÑ∏??";
    } else if (tutStep === 2) {
        tutStep = 3; tutTooltip.style.top = '150px'; tutTooltip.style.left = '320px';
        document.getElementById('btn-tut-next').style.display = 'inline-block';
        tutText.innerHTML = "<b>[3/4] Í∞ïÌôî Î©îÎâ¥</b><br>Ï¢åÏ∏° Î©îÎâ¥Í∞Ä Í∞ïÌôî Î©îÎâ¥Î°?Î∞îÎÄùÎãà?? ?¥Îß§Î•??åÎ™®???àÎ≤®???¨Î¶¨Í≥??πÏ†ï ?àÎ≤®???òÎ©¥ ÏßÑÌôî?????àÏäµ?àÎã§!";
    } else if (tutStep === 3) {
        tutStep = 4; tutTooltip.style.top = '500px'; tutTooltip.style.left = '320px';
        document.getElementById('btn-tut-next').style.display = 'none';
        tutText.innerHTML = "<b>[4/4] ?®Ïù¥Î∏??úÏûë</b><br>Ï§ÄÎπÑÍ? ?ùÎÇ¨?§Î©¥ Ï¢åÏ∏° ?òÎã®??<b>'?®Ïù¥Î∏??úÏûë!'</b> Î≤ÑÌäº???ÑÎ•¥?∏Ïöî!";
        btnCloseUpgrade.click();
    }
}
function endTutorial() { tutStep = 0; tutTooltip.style.display = 'none'; }

// ==========================================
// Encyclopedia Logic
// ==========================================
const encOverlay = document.getElementById('encyclopedia-overlay');
const btnOpenEnc = document.getElementById('btn-open-enc');
const btnCloseEnc = document.getElementById('btn-close-enc');
const tabTowers = document.getElementById('tab-towers');
const tabEnemies = document.getElementById('tab-enemies');
const encTowersContent = document.getElementById('enc-towers-content');
const encEnemiesContent = document.getElementById('enc-enemies-content');
const tabStatus = document.getElementById('tab-status');
const encStatusContent = document.getElementById('enc-status-content');

if (btnOpenEnc) {
    btnOpenEnc.addEventListener('click', () => {
        if(encOverlay) encOverlay.style.display = 'flex';
        renderEncyclopedia();
    });
}

if (btnCloseEnc) {
    btnCloseEnc.addEventListener('click', () => {
        if(encOverlay) encOverlay.style.display = 'none';
    });
}

if (tabTowers) {
    tabTowers.addEventListener('click', () => {
        tabTowers.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
        tabTowers.style.color = 'white';
        tabEnemies.style.background = '#334155';
        tabEnemies.style.color = '#cbd5e1';
        tabStatus.style.background = '#334155';
        tabStatus.style.color = '#cbd5e1';
        encTowersContent.style.display = 'grid';
        encEnemiesContent.style.display = 'none';
        encStatusContent.style.display = 'none';
    });
}

if (tabEnemies) {
    tabEnemies.addEventListener('click', () => {
        tabEnemies.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        tabEnemies.style.color = 'white';
        tabTowers.style.background = '#334155';
        tabTowers.style.color = '#cbd5e1';
        tabStatus.style.background = '#334155';
        tabStatus.style.color = '#cbd5e1';
        encEnemiesContent.style.display = 'grid';
        encTowersContent.style.display = 'none';
        encStatusContent.style.display = 'none';
    });
}

if (tabStatus) {
    tabStatus.addEventListener('click', () => {
        tabStatus.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        tabStatus.style.color = 'white';
        tabTowers.style.background = '#334155';
        tabTowers.style.color = '#cbd5e1';
        tabEnemies.style.background = '#334155';
        tabEnemies.style.color = '#cbd5e1';
        encStatusContent.style.display = 'grid';
        encTowersContent.style.display = 'none';
        encEnemiesContent.style.display = 'none';
    });
}

function renderEncyclopedia() {
    if(!encTowersContent || !encEnemiesContent) return;
    encTowersContent.innerHTML = '';
    let keys = Object.keys(POKEMON_DATA);
    keys.sort((a, b) => {
        let isA = a.includes('mega_');
        let isB = b.includes('mega_');
        if (isA && !isB) return 1;
        if (!isA && isB) return -1;
        return 0;
    });
    keys.forEach(key => {
        const p = POKEMON_DATA[key];
        encTowersContent.innerHTML += `
            <div style="background: rgba(0,0,0,0.3); border: 1px solid #475569; border-radius: 8px; padding: 15px; text-align: center;">
                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.spriteId}.png" style="width: 60px; height: 60px;">
                <h4 style="margin: 5px 0; color: ${p.color}; font-size: 1.1rem;">${p.name}</h4>
                <div style="font-size: 0.85rem; color: #94a3b8; text-align: left; line-height: 1.4; margin-top: 10px;">
                    <strong style="color: #cbd5e1;">ÎπÑÏö©:</strong> ${p.cost} ?¥Îß§<br>
                    <strong style="color: #cbd5e1;">Í≥µÍ≤©??</strong> ${p.damage}<br>
                    <strong style="color: #cbd5e1;">?¨Í±∞Î¶?</strong> ${p.range}<br>
                    <strong style="color: #cbd5e1;">Ïø®Ì???</strong> ${(p.cooldown / 60).toFixed(1)}Ï¥?br>
                    <div style="margin-top: 5px; font-size: 0.75rem; color: #64748b;">${p.desc}</div>
                </div>
            </div>
        `;
    });

    encEnemiesContent.innerHTML = '';
    
    const skillNames = {
        'sleep': '?òÎ©¥',
        'yawn': '?òÌíà',
        'ranged': '?êÍ±∞Î¶?,
        'dash': '?åÏßÑ',
        'synergy': '?±ÎãàÎ∞îÌÄ??úÎÑàÏßÄ',
        'rockThrow': '???òÏ?Í∏?,
        'explode': '?êÌè≠',
        'sandTomb': 'Î™®ÎûòÏßÄ??,
        'weakenTowerAura': '?ÑÌòë???§Îùº(??',
        'weakenTowerAuraLarge': '?ÑÌòë???§Îùº(?Ä)',
        'healAlliesOnHit': '?ÑÍµ∞ ?åÎ≥µ',
        'sandTombHeal': 'Î™®ÎûòÏßÄ??& ?ÑÍµ∞ ?åÎ≥µ',
        'enemyStun': '?Ä??Í∏∞Ï†à',
        'enemyFreeze': '?Ä??ÎπôÍ≤∞',
        'summonExeggcute': '?ÑÎùºÎ¶??åÌôò',
        'rangedStun': '?êÍ±∞Î¶?Í∏∞Ï†à'
    };

    // Round 1 Enemies
    ENEMY_TYPES.forEach(e => {
        const skillText = e.skill ? skillNames[e.skill] || e.skill : '';
        encEnemiesContent.innerHTML += `
            <div style="background: rgba(0,0,0,0.3); border: 1px solid #475569; border-radius: 8px; padding: 15px; text-align: center; position: relative;">
                <span style="position: absolute; top: 5px; left: 5px; background: #4ade80; color: #000; font-size: 0.7rem; font-weight: bold; padding: 2px 5px; border-radius: 3px;">1?ºÏö¥??/span>
                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${e.spriteId}.png" style="width: 60px; height: 60px;">
                <h4 style="margin: 5px 0; color: #f87171; font-size: 1.1rem;">${e.name}</h4>
                <div style="font-size: 0.85rem; color: #94a3b8; text-align: left; line-height: 1.4; margin-top: 10px;">
                    <strong style="color: #cbd5e1;">Ï≤¥Î†•(HP):</strong> ${e.hp}<br>
                    <strong style="color: #cbd5e1;">?¥ÏÜç:</strong> ${e.speed}<br>
                    <strong style="color: #cbd5e1;">?ºÌï¥??</strong> ${e.dmg}<br>
                    <strong style="color: #cbd5e1;">Î≥¥ÏÉÅ:</strong> ${e.reward} ?¥Îß§<br>
                    ${e.skill ? `<strong style="color: #f59e0b;">?πÏÑ±:</strong> ${skillText}` : ''}
                </div>
            </div>
        `;
    });
    
    // Round 2 Enemies
    ENEMY_TYPES_R2.forEach(e => {
        const skillText = e.skill ? skillNames[e.skill] || e.skill : '';
        encEnemiesContent.innerHTML += `
            <div style="background: rgba(0,0,0,0.3); border: 1px solid #475569; border-radius: 8px; padding: 15px; text-align: center; position: relative;">
                <span style="position: absolute; top: 5px; left: 5px; background: #fcd34d; color: #000; font-size: 0.7rem; font-weight: bold; padding: 2px 5px; border-radius: 3px;">2?ºÏö¥??/span>
                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${e.spriteId}.png" style="width: 60px; height: 60px;">
                <h4 style="margin: 5px 0; color: #f87171; font-size: 1.1rem;">${e.name}</h4>
                <div style="font-size: 0.85rem; color: #94a3b8; text-align: left; line-height: 1.4; margin-top: 10px;">
                    <strong style="color: #cbd5e1;">Ï≤¥Î†•(HP):</strong> ${e.hp}<br>
                    <strong style="color: #cbd5e1;">?¥ÏÜç:</strong> ${e.speed}<br>
                    <strong style="color: #cbd5e1;">?ºÌï¥??</strong> ${e.dmg}<br>
                    <strong style="color: #cbd5e1;">Î≥¥ÏÉÅ:</strong> ${e.reward} ?¥Îß§<br>
                    ${e.skill ? `<strong style="color: #f59e0b;">?πÏÑ±:</strong> ${skillText}` : ''}
                </div>
            </div>
        `;
    });

    // Round 3 Enemies
    ENEMY_TYPES_R3.forEach(e => {
        const skillText = e.skill ? skillNames[e.skill] || e.skill : '';
        encEnemiesContent.innerHTML += `
            <div style="background: rgba(0,0,0,0.3); border: 1px solid #475569; border-radius: 8px; padding: 15px; text-align: center; position: relative;">
                <span style="position: absolute; top: 5px; left: 5px; background: #60a5fa; color: #000; font-size: 0.7rem; font-weight: bold; padding: 2px 5px; border-radius: 3px;">3?ºÏö¥??/span>
                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${e.spriteId}.png" style="width: 60px; height: 60px;">
                <h4 style="margin: 5px 0; color: #f87171; font-size: 1.1rem;">${e.name}</h4>
                <div style="font-size: 0.85rem; color: #94a3b8; text-align: left; line-height: 1.4; margin-top: 10px;">
                    <strong style="color: #cbd5e1;">Ï≤¥Î†•(HP):</strong> ${e.hp}<br>
                    <strong style="color: #cbd5e1;">?¥ÏÜç:</strong> ${e.speed}<br>
                    <strong style="color: #cbd5e1;">?ºÌï¥??</strong> ${e.dmg}<br>
                    <strong style="color: #cbd5e1;">Î≥¥ÏÉÅ:</strong> ${e.reward} ?¥Îß§<br>
                    ${e.skill ? `<strong style="color: #f59e0b;">?πÏÑ±:</strong> ${skillText}` : ''}
                </div>
            </div>
        `;
    });
}

// ==========================================
// Shop Logic
// ==========================================
const shopOverlay = document.getElementById('shop-overlay');
const btnOpenShop = document.getElementById('btn-open-shop');
const btnCloseShop = document.getElementById('btn-close-shop');
const shopItemsContainer = document.getElementById('shop-items-container');
const shopBerriesDisplay = document.getElementById('shop-berries-display');

// Snorlax Shop UI
const snorlaxShopOverlay = document.getElementById('snorlax-shop-overlay');
const btnOpenSnorlaxShop = document.getElementById('btn-open-snorlax-shop');
const btnCloseSnorlaxShop = document.getElementById('btn-close-snorlax-shop');
const snorlaxUpgradesContainer = document.getElementById('snorlax-upgrades-container');
const snorlaxPoffinsDisplay = document.getElementById('snorlax-poffins-display');

btnOpenSnorlaxShop.addEventListener('click', () => {
    snorlaxShopOverlay.style.display = 'flex';
    renderSnorlaxShop();
});
btnCloseSnorlaxShop.addEventListener('click', () => {
    snorlaxShopOverlay.style.display = 'none';
});

const UPGRADE_DATA = {
    charmander: { title: '?åÏù¥Î¶¨Î•ò', sprite: 4, stats: { damage: { name: 'Í≥µÍ≤©??, max: 10 }, range: { name: '?¨Í±∞Î¶?, max: 10 }, aoe: { name: 'Î≤îÏúÑ', max: 10 }, burn: { name: '?îÏÉÅ ?ïÎ•†', max: 10 } } },
    squirtle: { title: 'Íº¨Î?Í∏∞Î•ò', sprite: 7, stats: { damage: { name: 'Í≥µÍ≤©??, max: 10 }, aoe: { name: 'Î≤îÏúÑ', max: 10 }, debuff: { name: '?¨Î°ú??Í∞ïÎèÑ', max: 10 }, speed: { name: 'Í≥µÍ≤©?çÎèÑ', max: 10 } } },
    bulbasaur: { title: '?¥ÏÉÅ?¥Ïî®Î•?, sprite: 1, stats: { damage: { name: 'Í≥µÍ≤©??, max: 10 }, range: { name: '?¨Í±∞Î¶?, max: 10 }, aoe: { name: 'Î≤îÏúÑ', max: 10 }, util: { name: '?åÎ≥µÎ¥âÏù∏', max: 1 } } },
    pikachu: { title: '?ºÏπ¥Ï∏ÑÎ•ò', sprite: 25, stats: { damage: { name: 'Í≥µÍ≤©??, max: 10 }, range: { name: '?¨Í±∞Î¶?, max: 10 }, chain: { name: 'Ï≤¥Ïù∏ +1ÎßàÎ¶¨', max: 10 }, paralyze: { name: 'ÎßàÎπÑ ?ïÎ•†', max: 10 }, confuse: { name: '?ºÎ? ?ïÎ•†', max: 10 } } },
    eevee: { title: '?¥Î∏å?¥Î•ò', sprite: 133, stats: { damage: { name: 'Í≥µÍ≤©??, max: 10 }, effect: { name: '?πÏàò?®Í≥º', max: 10 } } },
    gastly: { title: 'Í≥†Ïò§?§Î•ò', sprite: 92, stats: { damage: { name: 'Í≥µÍ≤©??, max: 10 }, range: { name: '?¨Í±∞Î¶?, max: 10 }, aoe: { name: 'Î≤îÏúÑ', max: 10 }, debuff: { name: '?îÎ≤Ñ??Í∞ïÎèÑ', max: 10 }, util: { name: '?åÎ≥µÎ¥âÏù∏', max: 1 } } },
    abra: { title: '?§Í≤î?ºÎ•ò', sprite: 64, stats: { damage: { name: 'Í≥µÍ≤©??, max: 10 }, range: { name: '?¨Í±∞Î¶?, max: 10 }, aoe: { name: 'Î≤îÏúÑ', max: 10 }, paralyze: { name: 'ÎßàÎπÑ ?ïÎ•†', max: 10 } } },
    magnemite: { title: 'ÏΩîÏùºÎ•?, sprite: 81, stats: { damage: { name: 'Í≥µÍ≤©??, max: 10 }, range: { name: '?¨Í±∞Î¶?, max: 10 }, aoe: { name: '?àÏù¥?Ä ??, max: 10 }, paralyze: { name: 'ÎßàÎπÑ ?ïÎ•†', max: 10 }, stun: { name: '?§ÌÑ¥ ?ïÎ•†', max: 10 } } },
    riolu: { title: 'Î¶¨Ïò§Î•¥Î•ò', sprite: 447, stats: { damage: { name: 'Í≥µÍ≤©??, max: 10 }, speed: { name: 'Í≥µÍ≤©?çÎèÑ', max: 10 }, aoe: { name: 'Î≤îÏúÑ', max: 10 }, util: { name: '?ÑÌòë ?πÏÑ±', max: 1 } } },
    froakie: { title: 'Í∞úÍµ¨ÎßàÎ•¥Î•?, sprite: 656, stats: { range: { name: '?¨Í±∞Î¶?, max: 10 }, speed: { name: 'Í≥µÍ≤©?çÎèÑ', max: 10 }, util: { name: 'Í≥µÍπé Î¨¥Ìö®', max: 1 } } },
    smoochum: { title: 'ÎΩÄÎΩÄ?ºÎ•ò', sprite: 238, stats: { damage: { name: 'Í≥µÍ≤©??, max: 10 }, range: { name: '?¨Í±∞Î¶?, max: 10 }, aoe: { name: 'Î≤îÏúÑ', max: 10 }, freeze: { name: 'ÎπôÍ≤∞ ?ïÎ•†', max: 10 } } },
    sigilyph: { title: '?¨Î≥¥??, sprite: 561, stats: { damage: { name: 'Í≥µÍ≤©??, max: 10 } } },
    litten: { title: '?êÏò§Î∂àÎ•ò', sprite: 725, stats: { damage: { name: 'Í≥µÍ≤©??, max: 10 }, range: { name: '?¨Í±∞Î¶?, max: 10 }, aoe: { name: '?ÑÌòë Î≤îÏúÑ', max: 10 }, burn: { name: '?îÏÉÅ ?ïÎ•†', max: 10 } } },
    popplio: { title: '?ÑÎ¶¨Í≥µÎ•ò', sprite: 728, stats: { range: { name: '?¨Í±∞Î¶?, max: 10 }, aoe: { name: 'Î≤îÏúÑ', max: 10 }, debuff: { name: '?îÎ≤Ñ??Í∞ïÎèÑ', max: 10 }, slow: { name: '?îÌôî Í∞ïÎèÑ', max: 10 } } },
    rowlet: { title: '?òÎ™∞ÎπºÎ?Î•?, sprite: 722, stats: { range: { name: '?¨Í±∞Î¶?, max: 10 }, spread: { name: 'ÍπÉÌÑ∏ Í∞úÏàò', max: 10 }, proj: { name: '?¨ÏÇ¨Ï≤??¨Í±∞Î¶?, max: 10 }, narrow: { name: 'Í∞ÅÎèÑ Í∞êÏÜå', max: 10 } } }
};

let selectedSnorlaxFamily = 'charmander';

function renderSnorlaxShop() {
    snorlaxUpgradesContainer.innerHTML = '';
    snorlaxUpgradesContainer.style.display = 'flex';
    snorlaxUpgradesContainer.style.flexDirection = 'row';
    snorlaxUpgradesContainer.style.gap = '20px';
    snorlaxUpgradesContainer.style.height = '450px';

    if (!currentUser) return;
    const users = loadUsers();
    
    // Migration Logic (?´Ïûê -> Í∞ùÏ≤¥ Î≥Ä??
    let needsSave = false;
    for (const fam of Object.keys(UPGRADE_DATA)) {
        if (!users[currentUser].upgrades[fam]) {
            users[currentUser].upgrades[fam] = {};
            needsSave = true;
        } else if (typeof users[currentUser].upgrades[fam] === 'number') {
            let oldLevel = users[currentUser].upgrades[fam];
            users[currentUser].upgrades[fam] = {};
            for (const statKey in UPGRADE_DATA[fam].stats) {
                users[currentUser].upgrades[fam][statKey] = oldLevel;
            }
            needsSave = true;
        }
    }
    if (needsSave) saveUsers(users);
    
    const upgrades = users[currentUser].upgrades;
    const currentPoffins = users[currentUser].poffins;

    // Left Panel: Family List
    const listPanel = document.createElement('div');
    listPanel.style.width = '200px';
    listPanel.style.display = 'flex';
    listPanel.style.flexDirection = 'column';
    listPanel.style.gap = '5px';
    listPanel.style.overflowY = 'auto';
    listPanel.style.borderRight = '1px solid #334155';
    listPanel.style.paddingRight = '10px';

    for (const [family, data] of Object.entries(UPGRADE_DATA)) {
        const btn = document.createElement('button');
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '10px';
        btn.style.padding = '10px';
        btn.style.background = (selectedSnorlaxFamily === family) ? '#0ea5e9' : '#1e293b';
        btn.style.border = '1px solid #334155';
        btn.style.color = 'white';
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        
        btn.innerHTML = `
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${data.sprite}.png" style="width: 40px; height: 40px; background: rgba(0,0,0,0.2); border-radius: 4px; object-fit: contain;">
            <span style="font-weight: bold;">${data.title}</span>
        `;
        btn.onclick = () => {
            selectedSnorlaxFamily = family;
            renderSnorlaxShop();
        };
        listPanel.appendChild(btn);
    }

    // Right Panel: Detail Stats
    const detailPanel = document.createElement('div');
    detailPanel.style.flex = '1';
    detailPanel.style.display = 'flex';
    detailPanel.style.flexDirection = 'column';
    detailPanel.style.gap = '10px';
    detailPanel.style.overflowY = 'auto';
    detailPanel.style.paddingLeft = '10px';

    const selData = UPGRADE_DATA[selectedSnorlaxFamily];
    const familyUpgrades = upgrades[selectedSnorlaxFamily] || {};

    const titleEl = document.createElement('h2');
    titleEl.style.margin = '0 0 10px 0';
    titleEl.style.color = '#38bdf8';
    titleEl.innerText = `${selData.title} ?•Î†•Ïπ?Í∞ïÌôî`;
    detailPanel.appendChild(titleEl);

    for (const [statKey, statInfo] of Object.entries(selData.stats)) {
        const lv = familyUpgrades[statKey] || 0;
        const maxLv = statInfo.max;
        const cost = lv * 10 + 10;
        
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';
        row.style.background = '#1e293b';
        row.style.padding = '15px';
        row.style.borderRadius = '8px';
        row.style.border = '1px solid #334155';

        row.innerHTML = `
            <div>
                <div style="font-size: 1.1rem; font-weight: bold; color: #f8fafc; margin-bottom: 5px;">${statInfo.name} <span style="color: #fbbf24;">(Lv.${lv}/${maxLv})</span></div>
            </div>
        `;
        
        const btn = document.createElement('button');
        btn.style.padding = '8px 15px';
        if (lv >= maxLv) {
            btn.innerText = 'ÏµúÎ? ?àÎ≤®';
            btn.style.background = '#475569';
            btn.style.color = '#94a3b8';
            btn.style.cursor = 'not-allowed';
            btn.style.border = 'none';
            btn.style.borderRadius = '4px';
        } else {
            btn.innerHTML = `Í∞ïÌôî (${cost} <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/lumiose-galette.png" style="width: 16px; vertical-align: middle;">)`;
            btn.style.background = (currentPoffins >= cost) ? '#10b981' : '#475569';
            btn.style.color = 'white';
            btn.style.cursor = (currentPoffins >= cost) ? 'pointer' : 'not-allowed';
            btn.style.border = 'none';
            btn.style.borderRadius = '4px';
            btn.style.fontWeight = 'bold';
            if (currentPoffins >= cost) {
                btn.onclick = () => {
                    buySnorlaxUpgrade(selectedSnorlaxFamily, statKey, cost);
                };
            }
        }
        row.appendChild(btn);
        detailPanel.appendChild(row);
    }

    snorlaxUpgradesContainer.appendChild(listPanel);
    snorlaxUpgradesContainer.appendChild(detailPanel);
}

function buySnorlaxUpgrade(family, statKey, cost) {
    if (!currentUser) return;
    const users = loadUsers();
    if (users[currentUser].poffins >= cost) {
        users[currentUser].poffins -= cost;
        if (!users[currentUser].upgrades[family]) users[currentUser].upgrades[family] = {};
        users[currentUser].upgrades[family][statKey] = (users[currentUser].upgrades[family][statKey] || 0) + 1;
        saveUsers(users);
        updatePoffinUI();
        renderSnorlaxShop();
        
        // Í∏∞Ï°¥ ÎßµÏóê ?àÎäî ?¥Îãπ Í≥ÑÏó¥ ?Ä?åÎì§??Ï¶âÏãú ?•Î†•Ïπ??¨Í≥Ñ??
        const familyKeys = POKEMON_FAMILIES[family] || [];
        for (const tower of towers) {
            if (familyKeys.includes(tower.baseId)) {
                if (typeof tower.applyGlobalUpgrades === 'function') {
                    tower.applyGlobalUpgrades();
                }
            }
        }
    }
}

const SHOP_ITEM_POOL = [
    { id: 'fire_stone', name: 'Î∂àÍΩÉ????, desc: '?πÏ†ï ?¨ÏºìÎ™?ÏßÑÌôî???¨Ïö©', price: 150, icon: '?î•' },
    { id: 'water_stone', name: 'Î¨ºÏùò ??, desc: '?πÏ†ï ?¨ÏºìÎ™?ÏßÑÌôî???¨Ïö©', price: 150, icon: '?íß' },
    { id: 'leaf_stone', name: '?Ä????, desc: '?πÏ†ï ?¨ÏºìÎ™?ÏßÑÌôî???¨Ïö©', price: 150, icon: '?çÉ' },
    { id: 'thunder_stone', name: 'Ï≤úÎë•????, desc: '?πÏ†ï ?¨ÏºìÎ™?ÏßÑÌôî???¨Ïö©', price: 150, icon: '?? },
    { id: 'ice_stone', name: '?ºÏùå????, desc: '?πÏ†ï ?¨ÏºìÎ™?ÏßÑÌôî???¨Ïö©', price: 150, icon: '?ÑÔ∏è' },
    { id: 'potion', name: '?ÅÏ≤ò??, desc: '?¥Î¶≠ ??Í∏∞Ï? Ï≤¥Î†•??50 ?åÎ≥µ', price: 50, icon: '?ß™' },
    { id: 'rare_candy', name: '?¥ÏÉÅ???¨ÌÉï', desc: '?¥Î¶≠ ???Ä???†ÌÉù ???àÎ≤®??, price: 200, icon: '?ç¨' },
    { id: 'scope_lens', name: 'Ï¥àÏ†ê?åÏ¶à', desc: 'Í∏âÏÜå ?ïÎ•† 6% Ï¶ùÍ? (Ï¥?10%)', price: 200, icon: '?îé' },
    { id: 'leftovers', name: 'Î®πÎã§?®Ï? ?åÏãù', desc: '?¥Îãπ ?¨ÏºìÎ™¨Ïù¥ ??Ï≤òÏπò ??Í∏∞Ï? Ï≤¥Î†• +1 ?åÎ≥µ', price: 250, icon: '?çé' },
    { id: 'enigma_berry', name: '?òÎ¨∏?¥Îß§', desc: 'Í∏∞Ï? Ï≤¥Î†• 50% ?¥Ìïò ??Í≥µÍ≤©??1.5Î∞?, price: 250, icon: '?? },
    { id: 'life_orb', name: '?ùÎ™Ö??Íµ¨Ïä¨', desc: 'Í≥µÍ≤©??1.2Î∞?Ï¶ùÍ?', price: 300, icon: '?îÆ' },
    { id: 'lum_berry', name: 'Î¶¨ÏÉò?¥Îß§', desc: '?ÅÌÉú?¥ÏÉÅ 1??Ï¶âÏãú ?¥Ï†ú Î∞?10Ï¥?Î©¥Ïó≠', price: 200, icon: '?åø' },
    { id: 'choice_scarf', name: 'Íµ¨Ïï†?§Ïπ¥??, desc: 'Í≥µÏÜç 1.5Î∞? ?Ä??Î≥ÄÍ≤????†Íπê ?úÎ†à??, price: 300, icon: '?ß£' },
    { id: 'keystone', name: '?§Ïä§??, desc: 'Î©îÍ? ÏßÑÌôîÎ•??ÑÌïú ?†ÎπÑ????(1???úÏ†ï)', price: 500, icon: '?óùÔ∏? },
    { id: 'mega_stone_x', name: 'Î©îÍ?Î¶¨ÏûêÎ™ΩX?òÏù¥??, desc: 'Î¶¨ÏûêÎ™ΩÏùÑ Î©îÍ?Î¶¨ÏûêÎ™ΩXÎ°?ÏßÑÌôî (?§Ïä§???ÑÏöî)', price: 400, icon: '?åë' },
    { id: 'mega_stone_y', name: 'Î©îÍ?Î¶¨ÏûêÎ™ΩY?òÏù¥??, desc: 'Î¶¨ÏûêÎ™ΩÏùÑ Î©îÍ?Î¶¨ÏûêÎ™ΩYÎ°?ÏßÑÌôî (?§Ïä§???ÑÏöî)', price: 400, icon: '?ÄÔ∏? },
    { id: 'mega_stone_venusaur', name: 'Î©îÍ??¥ÏÉÅ?¥ÍΩÉ?òÏù¥??, desc: '?¥ÏÉÅ?¥ÍΩÉ??Î©îÍ??¥ÏÉÅ?¥ÍΩÉ?ºÎ°ú ÏßÑÌôî (?§Ïä§???ÑÏöî)', price: 400, icon: '?å∫' },
    { id: 'mega_stone_blastoise', name: 'Î©îÍ?Í±∞Î∂Å?ïÎÇò?¥Ìä∏', desc: 'Í±∞Î∂Å?ïÏùÑ Î©îÍ?Í±∞Î∂Å?ïÏúºÎ°?ÏßÑÌôî (?§Ïä§???ÑÏöî)', price: 400, icon: '?ê¢' },
    { id: 'mega_stone_raichu_x', name: 'Î©îÍ??ºÏù¥Ï∏ÑX?òÏù¥??, desc: '?ºÏù¥Ï∏ÑÎ? Î©îÍ??ºÏù¥Ï∏ÑXÎ°?ÏßÑÌôî (?§Ïä§???ÑÏöî)', price: 400, icon: '?? },
    { id: 'mega_stone_raichu_y', name: 'Î©îÍ??ºÏù¥Ï∏ÑY?òÏù¥??, desc: '?ºÏù¥Ï∏ÑÎ? Î©îÍ??ºÏù¥Ï∏ÑYÎ°?ÏßÑÌôî (?§Ïä§???ÑÏöî)', price: 400, icon: '?å©Ô∏? },
    { id: 'mega_stone_lucario', name: 'Î©îÍ?Î£®Ïπ¥Î¶¨Ïò§?òÏù¥??, desc: 'Î£®Ïπ¥Î¶¨Ïò§Î•?Î©îÍ?Î£®Ïπ¥Î¶¨Ïò§Î°?ÏßÑÌôî (?§Ïä§???ÑÏöî)', price: 400, icon: '?•ä' },
    { id: 'mega_stone_gengar', name: 'Î©îÍ??¨Ì??òÏù¥??, desc: '?¨Ì???Î©îÍ??¨Ì??ºÎ°ú ÏßÑÌôî (?§Ïä§???ÑÏöî)', price: 400, icon: '?ëª' },
    { id: 'mega_stone_alakazam', name: 'Î©îÍ??ÑÎîò?òÏù¥??, desc: '?ÑÎîò??Î©îÍ??ÑÎîò?ºÎ°ú ÏßÑÌôî (?§Ïä§???ÑÏöî)', price: 400, icon: '?•Ñ' },
    { id: 'mega_zeraora_nite', name: 'Î©îÍ??úÎùº?§Îùº?òÏù¥??, desc: '?úÎùº?§ÎùºÎ•?Î©îÍ??úÎùº?§ÎùºÎ°?ÏßÑÌôî (?§Ïä§???ÑÏöî)', price: 400, icon: '?? }
];

let currentShopItems = [null, null, null];
let inventory = {
    'fire_stone': 0, 'water_stone': 0, 'leaf_stone': 0, 
    'thunder_stone': 0, 'ice_stone': 0, 'potion': 0, 'rare_candy': 0,
    'scope_lens': 0, 'leftovers': 0, 'enigma_berry': 0, 'life_orb': 0, 'lum_berry': 0, 'choice_scarf': 0,
    'keystone': 0, 'mega_stone_x': 0, 'mega_stone_y': 0, 'mega_stone_venusaur': 0, 'mega_stone_blastoise': 0, 'mega_stone_raichu_x': 0, 'mega_stone_raichu_y': 0, 'mega_stone_lucario': 0, 'mega_stone_gengar': 0, 'mega_stone_alakazam': 0, 'mega_zeraora_nite': 0
};
let usingItem = null;

function renderInventory() {
    const invSlots = document.getElementById('inv-slots');
    if (!invSlots) return;
    
    invSlots.innerHTML = '';
    let hasItem = false;
    
    SHOP_ITEM_POOL.forEach(itemInfo => {
        if (inventory[itemInfo.id] > 0) {
            hasItem = true;
            const slot = document.createElement('div');
            slot.style.background = '#1e293b';
            slot.style.border = '1px solid #475569';
            slot.style.borderRadius = '5px';
            slot.style.padding = '5px 10px';
            slot.style.display = 'flex';
            slot.style.alignItems = 'center';
            slot.style.justifyContent = 'space-between';
            slot.style.gap = '5px';
            const isEquippable = ['rare_candy', 'scope_lens', 'leftovers', 'enigma_berry', 'life_orb', 'lum_berry', 'choice_scarf'].includes(itemInfo.id);
            slot.style.cursor = (itemInfo.id === 'potion' || isEquippable) ? 'pointer' : 'default';
            
            const infoDiv = document.createElement('div');
            infoDiv.style.display = 'flex';
            infoDiv.style.alignItems = 'center';
            infoDiv.style.gap = '5px';
            infoDiv.innerHTML = `<span>${itemInfo.icon}</span> <span>${itemInfo.name} x${inventory[itemInfo.id]}</span>`;
            
            const delBtn = document.createElement('button');
            delBtn.innerHTML = '?óëÔ∏?;
            delBtn.style.background = 'transparent';
            delBtn.style.border = 'none';
            delBtn.style.cursor = 'pointer';
            delBtn.style.padding = '0';
            delBtn.style.marginLeft = '10px';
            delBtn.title = '?ÑÏù¥???êÎß§ (Î∞òÌôò: 50?¥Îß§)';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                inventory[itemInfo.id]--;
                berries += 50;
                if (berriesEl) 
                if (usingItem === itemInfo.id && inventory[itemInfo.id] === 0) usingItem = null;
                renderInventory();
            };
            
            slot.appendChild(infoDiv);
            slot.appendChild(delBtn);
            
            if (itemInfo.id === 'potion') {
                slot.onclick = () => {
                    inventory['potion']--;
                    lives = Math.min(500, lives + 50); // MAX 500
                    
                    visualEffects.push(new TextEffect(canvas.width / 2, canvas.height / 2, `Ï≤¥Î†• +50 ?åÎ≥µ!`, '#4ade80'));
                    renderInventory();
                };
            } else if (isEquippable) {
                slot.onclick = () => {
                    if (usingItem === itemInfo.id) {
                        usingItem = null; // Toggle off
                        renderInventory();
                        return;
                    }
                    usingItem = itemInfo.id;
                    renderInventory(); // Re-render to clear other borders
                    slot.style.borderColor = '#fbbf24';
                    slot.style.boxShadow = '0 0 10px rgba(251, 191, 36, 0.5)';
                    const msg = itemInfo.id === 'rare_candy' ? '?àÎ≤®?ÖÌï† ?Ä?åÎ? ?¥Î¶≠?òÏÑ∏??' : '?ÑÍµ¨Î•??•Ï∞©???Ä?åÎ? ?¥Î¶≠?òÏÑ∏??';
                    visualEffects.push(new TextEffect(canvas.width / 2, 50, msg, '#fbbf24'));
                };
            }
            
            if (usingItem === itemInfo.id) {
                slot.style.borderColor = '#fbbf24';
                slot.style.boxShadow = '0 0 10px rgba(251, 191, 36, 0.5)';
            }
            
            invSlots.appendChild(slot);
        }
    });
    
    if (!hasItem) {
        invSlots.innerHTML = '<p style="color: #64748b; font-size: 0.8rem; margin: 0;">Í∞ÄÎ∞©Ïù¥ ÎπÑÏñ¥?àÏäµ?àÎã§.</p>';
    }
}

function getRandomShopItem() {
    let pool = SHOP_ITEM_POOL.filter(item => {
        if (item.id === 'keystone') {
            return inventory['keystone'] === 0 && !currentShopItems.some(i => i && i.id === 'keystone');
        }
        if (item.id === 'mega_zeraora_nite') {
            return window.zeraoraUnlocked; // ?úÎùº?§ÎùºÍ∞Ä ?¥Í∏à??Í≤ΩÏö∞?êÎßå ?ÅÏ†ê???±Ïû•
        }
        return true;
    });
    
    let totalWeight = 0;
    pool.forEach(item => {
        if (item.id.startsWith('mega_')) item.weight = 0.5;
        else if (item.id === 'keystone') item.weight = 3;
        else item.weight = 10;
        totalWeight += item.weight;
    });
    
    let rand = Math.random() * totalWeight;
    for (let item of pool) {
        if (rand < item.weight) return item;
        rand -= item.weight;
    }
    return pool[0];
}

function initShopItems() {
    for (let i = 0; i < 3; i++) {
        currentShopItems[i] = getRandomShopItem();
    }
}
initShopItems();

function renderShop() {
    if (!shopBerriesDisplay || !shopItemsContainer) return;
    shopBerriesDisplay.innerText = berries;
    shopItemsContainer.innerHTML = '';
    
    currentShopItems.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.style.background = 'rgba(0,0,0,0.3)';
        itemDiv.style.border = '1px solid #334155';
        itemDiv.style.borderRadius = '8px';
        itemDiv.style.padding = '15px';
        itemDiv.style.textAlign = 'center';
        itemDiv.style.display = 'flex';
        itemDiv.style.flexDirection = 'column';
        itemDiv.style.justifyContent = 'space-between';

        itemDiv.innerHTML = `
            <div>
                <div style="font-size: 2.5rem; margin-bottom: 10px;">${item.icon}</div>
                <h4 style="margin: 0 0 5px 0; color: #f8fafc;">${item.name}</h4>
                <p style="font-size: 0.8rem; color: #94a3b8; margin: 0 0 15px 0; line-height: 1.3;">${item.desc}</p>
            </div>
            <button style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; font-weight: bold; border-color: #4ade80; width: 100%; padding: 8px; border-radius: 5px; cursor: pointer;">
                Íµ¨Îß§ (${item.price}?çí)
            </button>
        `;
        
        const buyBtn = itemDiv.querySelector('button');
        buyBtn.addEventListener('click', () => {
            if (berries >= item.price) {
                berries -= item.price;
                
                shopBerriesDisplay.innerText = berries;
                
                // ?∏Î≤§?†Î¶¨ Ï¶ùÍ?
                inventory[item.id] = (inventory[item.id] || 0) + 1;
                renderInventory();
                
                // ?úÍ∞Å???®Í≥º
                visualEffects.push(new TextEffect(canvas.width / 2, canvas.height / 2, `${item.name} ?çÎìù!`, '#4ade80'));
                
                // ?Ä??UI ?ÖÎç∞?¥Ìä∏ (ÏßÑÌôî Î≤ÑÌäº Í∞±Ïã†???ÑÌï®)
                if (selectedTower) updateUI();
                
                // Î¶¨ÌïÑ
                currentShopItems[index] = getRandomShopItem();
                renderShop(); // ?§Ïãú ?åÎçîÎß?
            } else {
                alert('?¥Îß§Í∞Ä Î∂ÄÏ°±Ìï©?àÎã§!');
            }
        });

        shopItemsContainer.appendChild(itemDiv);
    });
}

if (btnOpenShop) {
    btnOpenShop.addEventListener('click', () => {
        if(shopOverlay) {
            shopOverlay.style.display = 'flex';
            renderShop();
        }
    });
}

if (btnCloseShop) {
    btnCloseShop.addEventListener('click', () => {
        if(shopOverlay) shopOverlay.style.display = 'none';
    });
}

// --- RAID SYSTEM EVENTS ---
const btnOpenRaid = document.getElementById('btn-open-raid');
const raidMenu = document.getElementById('raid-menu');
const btnCloseRaid = document.getElementById('btn-close-raid');
const btnStartRaid = document.getElementById('btn-start-raid');
const btnPrevRaid = document.getElementById('btn-prev-raid');
const btnNextRaid = document.getElementById('btn-next-raid');
const raidBossIndicator = document.getElementById('raid-boss-indicator');
const raidBossImg = document.getElementById('raid-boss-img');
const raidBossName = document.getElementById('raid-boss-name');
const raidBossDesc = document.getElementById('raid-boss-desc');

let currentRaidIndex = 0;
const availableRaids = [
    {
        id: 'type_null',
        name: '?Ä????,
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/772.png',
        cost: 555,
        desc: '?§ÌÑ¥/?ÅÌÉú?¥ÏÉÅ Î©¥Ïó≠??Í∞ïÎ†•??Î≥¥Ïä§! Ï≤òÏπò ???ÑÍµ∞?ºÎ°ú ?©Î•ò?©Îãà??'
    },
    {
        id: 'zeraora',
        name: '?úÎùº?§Îùº',
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/807.png',
        cost: 600,
        desc: 'Ï¥àÍ≥†?? Í∞ïÎ†•??Ï≤¥Ïù∏ ?ºÏù¥?∏Îãù! Ï≤òÏπò ???Ä???çÎìù!'
    },
    {
        id: 'lugia',
        name: 'Î£®Í∏∞??,
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/249.png',
        cost: 700,
        desc: 'Î©Ä?∞Ïä§ÏºÄ??Ï≤¥Î†• ?àÎ∞òÍπåÏ? ?ºÌï¥??50%), ?®Ïùº ?Ä??3Ï¥??§ÌÑ¥. Ï≤òÏπò ???Ä???çÎìù!'
    }
];

function updateRaidUI() {
    const raidInfo = availableRaids[currentRaidIndex];
    raidBossIndicator.innerText = `${currentRaidIndex + 1} / ${availableRaids.length}`;
    raidBossImg.src = raidInfo.sprite;
    raidBossName.innerText = `${raidInfo.name} (ÎπÑÏö©: ${raidInfo.cost})`;
    raidBossDesc.innerText = raidInfo.desc;
}

if (btnPrevRaid) {
    btnPrevRaid.addEventListener('click', () => {
        currentRaidIndex = (currentRaidIndex > 0) ? currentRaidIndex - 1 : availableRaids.length - 1;
        updateRaidUI();
    });
}

if (btnNextRaid) {
    btnNextRaid.addEventListener('click', () => {
        currentRaidIndex = (currentRaidIndex < availableRaids.length - 1) ? currentRaidIndex + 1 : 0;
        updateRaidUI();
    });
}

if (btnOpenRaid) {
    btnOpenRaid.addEventListener('click', () => {
        if (currentRound >= 2) {
            raidMenu.style.display = 'block';
            updateRaidUI();
        } else {
            alert('?àÏù¥?úÎäî 2?ºÏö¥?úÎ???Í∞Ä?•Ìï©?àÎã§!');
        }
    });
}

if (btnCloseRaid) {
    btnCloseRaid.addEventListener('click', () => {
        raidMenu.style.display = 'none';
    });
}

if (btnStartRaid) {
    btnStartRaid.addEventListener('click', () => {
        const raidInfo = availableRaids[currentRaidIndex];
        
        if (isRaidActive) {
            alert('?¥Î? ?àÏù¥?úÍ? ÏßÑÌñâ Ï§ëÏûÖ?àÎã§!');
            return;
        }
        if (clearedRaidsThisRound.includes(raidInfo.id)) {
            alert('?¥Î? ?¥Î≤à ?ºÏö¥?úÏóê ?¥Î¶¨?¥Ìïú ?àÏù¥?úÏûÖ?àÎã§!');
            return;
        }
        if (berries < raidInfo.cost) {
            alert(`?¥Îß§Í∞Ä Î∂ÄÏ°±Ìï©?àÎã§! (?ÑÏöî: ${raidInfo.cost})`);
            return;
        }
        
        berries -= raidInfo.cost;
        
        raidMenu.style.display = 'none';
        
        // Start Raid
        isRaidActive = true;
        raidVirtualMaxHp = 10000;
        raidVirtualHp = raidVirtualMaxHp;
        
        renderBackgroundToOffscreen();
        visualEffects.push(new TextEffect(canvas.width/2, canvas.height/2, '?ÑÏÑ§ ?àÏù¥???úÏûë!', '#c084fc'));
        
        let bossData = Object.assign({}, raidBossData[raidInfo.id]);
        bossData.hp = Math.floor(bossData.hp * (1 + (currentRound-1)*0.5));
        let enemy = new Enemy(bossData);
        enemy.x = waypoints[0].x;
        enemy.y = waypoints[0].y;
        enemies.push(enemy);
    });
}

//Override gameLoop UI drawing for virtual HP
const originalDrawBackground = drawBackground;
drawBackground = function() {
    originalDrawBackground();
    if (isRaidActive) {
        ctx.fillStyle = '#000';
        ctx.fillRect(10, 10, 200, 30);
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(12, 12, 196, 26);
        let hpRatio = Math.max(0, raidVirtualHp / raidVirtualMaxHp);
        ctx.fillStyle = '#c084fc';
        ctx.fillRect(12, 12, 196 * hpRatio, 26);
        ctx.fillStyle = '#fff';
        ctx.font = '14px sans-serif';
        ctx.fillText(`?àÏù¥??Í∞Ä??Ï≤¥Î†•: ${Math.max(0, Math.floor(raidVirtualHp))} / ${raidVirtualMaxHp}`, 20, 30);
    }
};

// ==========================================
// Account & Save/Load System (localStorage)
// ==========================================
const loginOverlay = document.getElementById('login-overlay');
const loginId = document.getElementById('login-id');
const loginPw = document.getElementById('login-pw');
const btnLogin = document.getElementById('btn-login');
const userStatusBar = document.getElementById('user-status-bar');
const userNameDisplay = document.getElementById('user-name-display');
const btnSaveGame = document.getElementById('btn-save-game');
const btnLogout = document.getElementById('btn-logout');

let currentUser = null;

function loadUsers() {
    return JSON.parse(localStorage.getItem('pokemon_defense_users')) || {};
}

function updatePoffinUI() {
    if (!currentUser) return;
    const users = loadUsers();
    const user = users[currentUser];
    if (user && poffinsEl) {
        poffinsEl.innerText = user.poffins;
        snorlaxPoffinsDisplay.innerText = user.poffins;
    }
}

function saveUsers(users) {
    localStorage.setItem('pokemon_defense_users', JSON.stringify(users));
}

if (btnLogin) {
    const initialUpgrades = {
        charmander: 0, squirtle: 0, bulbasaur: 0, pikachu: 0, eevee: 0,
        gastly: 0, abra: 0, magnemite: 0, riolu: 0, froakie: 0,
        smoochum: 0, sigilyph: 0, litten: 0, popplio: 0, rowlet: 0
    };

    const handleLogin = () => {
        const id = loginId.value.trim();
        const pw = loginPw.value;
        if (!id || !pw) {
            alert('?¥Î¶ÑÍ≥?ÎπÑÎ?Î≤àÌò∏Î•??ÖÎ†•?¥Ï£º?∏Ïöî.');
            return;
        }

        const users = loadUsers();
        if (users[id]) {
            if (users[id].password === pw) {
                // Í∏∞Ï°¥ ?†Ï? ?∞Ïù¥???∏Ìôò???®Ïπò
                if (users[id].poffins === undefined) users[id].poffins = 0;
                if (!users[id].upgrades) users[id].upgrades = { ...initialUpgrades };
                saveUsers(users); // Î≥ÄÍ≤ΩÎêú Íµ¨Ï°∞ ?Ä??

                // Î°úÍ∑∏???±Í≥µ
                currentUser = id;
                loginOverlay.style.display = 'none';
                userStatusBar.style.display = 'flex';
                userNameDisplay.innerText = currentUser;
                updatePoffinUI(); // ?¨Ì? UI ?ÖÎç∞?¥Ìä∏
                
                if (users[id].hasSeenTutorial) {
                    if (users[id].saveData) {
                        loadGame(users[id].saveData);
                    }
                    animate();
                } else {
                    tutOverlay.style.display = 'flex';
                }
            } else {
                alert('ÎπÑÎ?Î≤àÌò∏Í∞Ä ?Ä?∏Ïäµ?àÎã§. ?§Ïãú ?ïÏù∏?¥Ï£º?∏Ïöî.');
            }
        } else {
            // ?åÏõêÍ∞Ä??
            users[id] = {
                password: pw,
                hasSeenTutorial: false,
                saveData: null,
                poffins: 0,
                upgrades: { ...initialUpgrades }
            };
            saveUsers(users);
            currentUser = id;
            loginOverlay.style.display = 'none';
            userStatusBar.style.display = 'flex';
            userNameDisplay.innerText = currentUser;
            updatePoffinUI(); // ?¨Ì? UI ?ÖÎç∞?¥Ìä∏
            
            tutOverlay.style.display = 'flex';
        }
    };

    btnLogin.addEventListener('click', handleLogin);
    
    // ?îÌÑ∞??ÏßÄ??Ï∂îÍ?
    loginId.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loginPw.focus();
    });
    loginPw.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
}

function updateTutorialSeen() {
    if (!currentUser) return;
    const users = loadUsers();
    if (users[currentUser]) {
        users[currentUser].hasSeenTutorial = true;
        saveUsers(users);
    }
}

// ?úÌÜ†Î¶¨Ïñº ?úÏûë ??seen Ï≤òÎ¶¨
document.getElementById('btn-tut-no').addEventListener('click', () => { 
    tutOverlay.style.display = 'none'; 
    updateTutorialSeen();
    animate(); 
});
document.getElementById('btn-tut-yes').addEventListener('click', () => {
    tutOverlay.style.display = 'none';
    updateTutorialSeen();
    startTutorial();
    animate();
});
// ?úÌÜ†Î¶¨Ïñº Ï¢ÖÎ£å Î≤ÑÌäº ?§Î≤Ñ?ºÏù¥??(ÎßàÏ?Îß??§ÌÖù?êÏÑú)
document.getElementById('btn-tut-next').addEventListener('click', () => { 
    if (tutStep === 3) nextTutorial(); 
});

function serializeGameState() {
    const serializedTowers = towers.map(t => ({
        gridX: t.gridX,
        gridY: t.gridY,
        baseId: t.baseId,
        level: t.level,
        damage: t.damage,
        range: t.range,
        cooldown: t.cooldown,
        totalInvested: t.totalInvested,
        kills: t.kills,
        item: t.item
    }));

    return {
        berries,
        lives,
        wave,
        currentRound,
        inventory: { ...inventory },
        towers: serializedTowers,
        clearedRaidsThisRound: [...clearedRaidsThisRound],
        zeraoraUnlocked: window.zeraoraUnlocked,
        lugiaUnlocked: window.lugiaUnlocked,
        tutStep: tutStep
    };
}

function saveGame() {
    if (!currentUser) return;
    const users = loadUsers();
    if (users[currentUser]) {
        users[currentUser].saveData = serializeGameState();
        saveUsers(users);
        visualEffects.push(new TextEffect(canvas.width/2, canvas.height/2, '?Ä???ÑÎ£å!', '#22c55e'));
    }
}

function loadGame(saveData) {
    if (!saveData) return;
    
    berries = saveData.berries;
    lives = saveData.lives;
    wave = saveData.wave;
    currentRound = saveData.currentRound;
    
    if (saveData.inventory) {
        inventory = { ...saveData.inventory };
    }
    
    clearedRaidsThisRound = saveData.clearedRaidsThisRound || [];
    window.zeraoraUnlocked = saveData.zeraoraUnlocked || false;
    window.lugiaUnlocked = saveData.lugiaUnlocked || false;
    tutStep = saveData.tutStep || 0;
    
    // UI ?ÖÎç∞?¥Ìä∏ (?àÏù¥??Î≤ÑÌäº)
    if (clearedRaidsThisRound.includes('type_null')) {
        const btn = document.getElementById('btn-build-typenull');
        if (btn) btn.style.display = 'flex';
    }
    if (window.zeraoraUnlocked) {
        const alreadyPlaced = towers.some(t => t.baseId === 'zeraora' || t.baseId === 'mega_zeraora');
        const btn = document.getElementById('btn-build-zeraora');
        if (btn) btn.style.display = alreadyPlaced ? 'none' : 'flex';
    }
    if (window.lugiaUnlocked) {
        const alreadyPlaced = towers.some(t => t.baseId === 'lugia');
        const btn = document.getElementById('btn-build-lugia');
        if (btn) btn.style.display = alreadyPlaced ? 'none' : 'flex';
    }
    
    // ?Ä??Î≥µÍµ¨
    towers.length = 0; // Ï¥àÍ∏∞??
    if (saveData.towers) {
        saveData.towers.forEach(tData => {
            const t = new Tower(tData.gridX, tData.gridY, tData.baseId);
            t.level = tData.level;
            t.damage = tData.damage;
            t.range = tData.range;
            t.cooldown = tData.cooldown;
            t.totalInvested = tData.totalInvested;
            t.kills = tData.kills || 0;
            t.item = tData.item || null;
            towers.push(t);
        });
    }
    
    // ?åÎçîÎß??ÖÎç∞?¥Ìä∏
    berriesEl.innerText = berries;
    livesEl.innerText = Math.ceil(Math.max(0, lives));
    waveEl.innerText = wave;
    renderInventory();
    renderShop();
    renderBackgroundToOffscreen();
}

if (btnSaveGame) {
    btnSaveGame.addEventListener('click', saveGame);
}

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        saveGame(); // Î°úÍ∑∏?ÑÏõÉ ???êÎèô ?Ä??
        currentUser = null;
        location.reload();
    });
}
