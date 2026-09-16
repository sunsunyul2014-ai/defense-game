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
    'charmander': { name: '파이리', spriteId: 4, cost: 50, range: 150, damage: 20, cooldown: 40, type: 'single', color: '#ef4444', desc: '꼬리의 불꽃이 꺼지면 큰일 나요! (단일 대상 공격)', evolveLvl: 8, evolveTo: 'charmeleon', attackStyle: 'fire' },
    'charmeleon': { name: '리자드', spriteId: 5, cost: 0, range: 160, damage: 45, cooldown: 35, type: 'single', color: '#dc2626', desc: '성격이 제법 포악해졌습니다. 앗 뜨거! (단일 공격 + 10% 확률 화상)', burnChance: 0.1, evolveLvl: 15, evolveCost: 300, evolveTo: 'charizard', attackStyle: 'fire' },
    'charizard': { name: '리자몽', spriteId: 6, cost: 0, range: 180, damage: 120, cooldown: 35, type: 'aoe', aoeRange: 80, color: '#b91c1c', desc: '지구던지기 마렵다... 모든 걸 태워버리는 (광역 폭발 공격 + 10% 화상)', burnChance: 0.1, attackStyle: 'fire', itemEvolutions: { 'mega_stone_x': 'mega_charizard_x', 'mega_stone_y': 'mega_charizard_y' } },
    'mega_charizard_x': { name: '메가리자몽X', spriteId: 10034, cost: 0, range: 80, damage: 250, cooldown: 30, type: 'aoe', aoeRange: 80, color: '#1e3a8a', desc: '강력한 드래곤의 힘! (초근접 광역 타격 + 15% 혼란)', confuseChance: 0.15, attackStyle: 'fire' },
    'mega_charizard_y': { name: '메가리자몽Y', spriteId: 10035, cost: 0, range: 220, damage: 200, cooldown: 35, type: 'aoe', aoeRange: 120, color: '#f59e0b', desc: '가뭄 특성 발동! (초광역 폭발 공격 + 30% 화상)', burnChance: 0.3, attackStyle: 'fire' },

    'mega_venusaur': { name: '메가이상해꽃', spriteId: 10033, cost: 0, range: 250, damage: 85, cooldown: 25, type: 'aoe', aoeRange: 150, poisonChance: 0.6, color: '#16a34a', desc: '더 넓은 범위와 강한 맹독! 2연속 발사.', multiHit: 2, multiHitDelay: 10, attackStyle: 'seed' },
    'mega_blastoise': { name: '메가거북왕', spriteId: 10036, cost: 0, range: 250, damage: 200, cooldown: 120, type: 'spread', spreadCount: 1, pierceCount: 9999, flyEnd: true, projScale: 2.5, slowFactor: 0.4, slowDur: 120, color: '#3b82f6', desc: '맵 끝까지 날아가는 두꺼운 관통 물대포. 명중 시 둔화.', attackStyle: 'water' },
    'mega_raichu_y': { name: '메가라이츄Y', spriteId: 10305, cost: 0, range: 250, damage: 150, cooldown: 90, type: 'aoe', aoeRange: 150, paralyzeChance: 0.3, color: '#facc15', desc: '아주 세고 넓은 범위에 전자포! 마비 30%.', attackStyle: 'lightning' },
    'mega_raichu_x': { name: '메가라이츄X', spriteId: 10304, cost: 0, range: 140, damage: 25, cooldown: 8, type: 'normal', paralyzeChance: 0.05, color: '#fbbf24', desc: '짧은 범위 타다다닥 번개펀치 연발! 마비 5%.', attackStyle: 'lightning' },
    'mega_lucario': { name: '메가루카리오', spriteId: 10059, cost: 0, range: 240, damage: 160, cooldown: 35, type: 'aoe', aoeRange: 100, immuneToDebuffs: true, ignoreDef: true, defDownFactor: 1.3, debuffDur: 200, atkSpeedStack: true, color: '#3b82f6', desc: '사거리, 딜 대폭 증가. 모든 디버프 완전 면역!', attackStyle: 'water' },
    'mega_gengar': { name: '메가팬텀', spriteId: 10038, cost: 0, range: 220, damage: 150, cooldown: 45, type: 'aoe', aoeRange: 130, debuffDur: 300, defDownFactor: 1.6, atkDownFactor: 0.4, poisonChance: 0.2, color: '#9333ea', desc: '범위 증가 및 독 20% 추가! 방어/공격 하락(지속 시간 증가).', attackStyle: 'shadow' },
    'mega_alakazam': { name: '메가후딘', spriteId: 10037, cost: 0, range: 250, damage: 250, cooldown: 25, type: 'aoe', aoeRange: 130, knockbackChance: 0.15, paralyzeChance: 0.1, color: '#fcd34d', desc: '딜, 사거리, 범위, 공속 대폭 증가! 15% 밀치기와 10% 마비.', attackStyle: 'psychic' },
    
    'zeraora': { name: '제라오라', spriteId: 807, cost: 0, range: 140, damage: 30, cooldown: 8, type: 'aoe', aoeRange: 80, paralyzeChance: 0.05, color: '#facc15', desc: '빠른 공속의 근접 광역 공격! (5% 마비)', itemEvolutions: { 'mega_zeraora_nite': 'mega_zeraora' }, attackStyle: 'lightning' },
    'mega_zeraora': { name: '메가제라오라', spriteId: 10319, cost: 0, range: 160, damage: 45, cooldown: 8, type: 'aoe', aoeRange: 100, paralyzeChance: 0.1, color: '#f59e0b', desc: '마비된 적에게 1.5배의 피해!', bonusDamageToParalyzed: 1.5, attackStyle: 'lightning' },
    'squirtle': { name: '꼬부기', spriteId: 7, cost: 50, range: 100, damage: 10, cooldown: 50, type: 'aura', color: '#3b82f6', desc: '꼬부기단 출신일지도 모릅니다. 선글라스는 어딨지? (주변 광역 + 약한 둔화)', slowFactor: 0.8, slowDur: 60, evolveLvl: 8, evolveTo: 'wartortle' },
    'wartortle': { name: '어니부기', spriteId: 8, cost: 0, range: 130, damage: 25, cooldown: 45, type: 'aura', color: '#2563eb', desc: '귀가 날개처럼 생겼지만 날지는 못합니다. (광역 범위 및 딜 증가 + 둔화)', slowFactor: 0.7, slowDur: 80, evolveLvl: 15, evolveCost: 300, evolveTo: 'blastoise' },
    'blastoise': { name: '거북왕', spriteId: 9, cost: 0, range: 190, damage: 80, cooldown: 40, type: 'aura', color: '#1d4ed8', desc: '등껍질의 대포로 뭐든지 날려버립니다! (넓은 광역 + 강한 둔화)', slowFactor: 0.5, slowDur: 120, itemEvolutions: { 'mega_stone_blastoise': 'mega_blastoise' } },
    
    'bulbasaur': { name: '이상해씨', spriteId: 1, cost: 50, range: 130, damage: 15, cooldown: 45, type: 'aoe', aoeRange: 60, color: '#22c55e', desc: '씨앗이 무거워서 낮잠을 즐깁니다. 씨이- (광역 폭발 공격)', evolveLvl: 8, evolveTo: 'ivysaur', attackStyle: 'leaf' },
    'ivysaur': { name: '이상해풀', spriteId: 2, cost: 0, range: 150, damage: 35, cooldown: 40, type: 'aoe', aoeRange: 75, color: '#16a34a', desc: '등의 봉오리가 피어나려고 해요. 영양가 만점! (광역 범위 및 딜 증가)', evolveLvl: 15, evolveCost: 300, evolveTo: 'venusaur', attackStyle: 'leaf' },
    'venusaur': { name: '이상해꽃', spriteId: 3, cost: 0, range: 200, damage: 65, cooldown: 35, type: 'aoe', aoeRange: 120, color: '#15803d', desc: '솔라빔 충전 완료! 사실 맹독이 더 무섭습니다. (광역 폭발 공격 + 20% 맹독)', poisonChance: 0.2, attackStyle: 'leaf', itemEvolutions: { 'mega_stone_venusaur': 'mega_venusaur' } },
    
    'pikachu': { name: '피카츄', spriteId: 25, cost: 100, range: 150, damage: 25, cooldown: 40, type: 'chain', chainMax: 3, color: '#facc15', desc: '피카피카! 케첩을 가장 좋아합니다. (최대 3명 연쇄 번개 + 일시 멈춤)', stunDur: 15, evolveItem: 'thunder_stone', evolveTo: 'raichu' },
    'raichu': { name: '라이츄', spriteId: 26, cost: 0, range: 180, damage: 35, cooldown: 35, type: 'chain', chainMax: 5, color: '#eab308', desc: '피카츄보다 뚱뚱하지만 번개는 더 아픕니다. (최대 5명 연쇄 번개 + 20% 마비)', stunDur: 20, paralyzeChance: 0.2, itemEvolutions: { 'mega_stone_raichu_x': 'mega_raichu_x', 'mega_stone_raichu_y': 'mega_raichu_y' } },
    
    'eevee': { name: '이브이', spriteId: 133, cost: 100, range: 100, damage: 5, cooldown: 50, type: 'single', color: '#c2410c', desc: '쓰다듬고 싶은 털! 도구를 주면 원하는 형태로 변신합니다! (약한 단일 공격)', itemEvolutions: { 'fire_stone': 'flareon', 'water_stone': 'vaporeon', 'thunder_stone': 'jolteon', 'leaf_stone': 'leafeon', 'ice_stone': 'glaceon' } },
    'flareon': { name: '부스터', spriteId: 136, cost: 0, range: 140, damage: 60, cooldown: 45, type: 'aoe', aoeRange: 70, color: '#ef4444', desc: '유일왕(?)의 불꽃! 체온이 무려 900도까지 올라갑니다. (광역 화염 공격 + 30% 화상)', burnChance: 0.3, attackStyle: 'fire' },
    'vaporeon': { name: '샤미드', spriteId: 134, cost: 0, range: 150, damage: 45, cooldown: 40, type: 'single', color: '#3b82f6', desc: '물에 녹아들면 투명해져요. 촉촉한 버프의 신! (단일 공격. 주위 타워 공격력 1.5배 오라)', hasDamageAura: true, auraRange: 120, auraMult: 1.5, attackStyle: 'water' },
    'jolteon': { name: '쥬피썬더', spriteId: 135, cost: 0, range: 150, damage: 40, cooldown: 20, type: 'single', color: '#facc15', desc: '눈에 보이지 않는 속도! 털이 뾰족뾰족 따갑습니다. (매우 빠른 공격 + 10% 마비)', paralyzeChance: 0.1, stunDur: 25, attackStyle: 'lightning' },
    'leafeon': { name: '리피아', spriteId: 470, cost: 0, range: 80, damage: 75, cooldown: 40, type: 'aoe', aoeRange: 80, color: '#22c55e', desc: '광합성 중... 가까이 오면 풀잎의 매운맛을 보여줍니다! (초근접 강력한 범위 공격)', attackStyle: 'leaf' },
    'glaceon': { name: '글레이시아', spriteId: 471, cost: 0, range: 160, damage: 35, cooldown: 45, type: 'chain', chainMax: 5, color: '#38bdf8', desc: '다이아몬드 더스트! 더위를 싹 가시게 해줍니다. (최대 5명 얼음 숨결 + 10% 얼음)', freezeChance: 0.1, attackStyle: 'ice' },
    
    'gastly': { name: '고오스', spriteId: 92, cost: 80, range: 120, damage: 15, cooldown: 50, type: 'aoe', aoeRange: 60, color: '#a855f7', desc: '95%가 가스로 이루어졌어요. 냄새는 최악! (광역 저주: 공/방 15% 감소)', defDownFactor: 1.15, atkDownFactor: 0.85, debuffDur: 90, evolveLvl: 8, evolveTo: 'haunter', attackStyle: 'psychic' },
    'haunter': { name: '고우스트', spriteId: 93, cost: 0, range: 140, damage: 30, cooldown: 45, type: 'aoe', aoeRange: 80, color: '#7e22ce', desc: '어두운 곳에서 어깨를 톡톡 친다면 도망가세요! (광역 저주: 공/방 30% 감소)', defDownFactor: 1.30, atkDownFactor: 0.70, debuffDur: 120, evolveLvl: 15, evolveCost: 350, evolveTo: 'gengar', attackStyle: 'psychic' },
    'gengar': { name: '팬텀', spriteId: 94, cost: 0, range: 170, damage: 60, cooldown: 40, type: 'aoe', aoeRange: 100, color: '#581c87', desc: '당신의 그림자 속에 숨어 웃고 있습니다. 낄낄! (광역 저주: 공/방 45% 감소)', defDownFactor: 1.45, atkDownFactor: 0.55, debuffDur: 180, attackStyle: 'psychic', itemEvolutions: { 'mega_stone_gengar': 'mega_gengar' } },

    'abra': { name: '케이시', spriteId: 63, cost: 60, range: 0, damage: 0, cooldown: 999, type: 'none', canAttack: false, color: '#facc15', desc: '하루 18시간을 잡니다. 꿀잠 자는 중... (공격 불가. 열매로 15레벨 달성 시 진화!)', evolveLvl: 15, evolveTo: 'kadabra' },
    'kadabra': { name: '윤겔라', spriteId: 64, cost: 0, range: 140, damage: 55, cooldown: 45, type: 'aoe', aoeRange: 70, color: '#eab308', desc: '은수저를 들고 다니는 사이코패스. 숟가락 구부리기의 달인! (강력한 범위 피해 + 10% 밀치기)', knockbackChance: 0.1, evolveLvl: 25, evolveCost: 400, evolveTo: 'alakazam', attackStyle: 'psychic' },
    'alakazam': { name: '후딘', spriteId: 65, cost: 0, range: 190, damage: 120, cooldown: 40, type: 'aoe', aoeRange: 90, color: '#ca8a04', desc: 'IQ 500! 슈퍼컴퓨터보다 똑똑합니다. 숟가락도 2개! (초광역 폭딜 + 10% 밀치기)', knockbackChance: 0.1, attackStyle: 'psychic', itemEvolutions: { 'mega_stone_alakazam': 'mega_alakazam' } },

    'magnemite': { name: '코일', spriteId: 81, cost: 180, range: 150, damage: 18, cooldown: 60, type: 'laser', laserWidth: 8, color: '#94a3b8', desc: '찌릿찌릿! 전자파를 너무 좋아해서 발전소에 자주 출몰합니다. (일직선 관통 레이저 + 10% 마비)', paralyzeChance: 0.1, evolveLvl: 8, evolveTo: 'magneton' },
    'magneton': { name: '레어코일', spriteId: 82, cost: 0, range: 160, damage: 40, cooldown: 45, type: 'laser', laserWidth: 15, color: '#64748b', desc: '코일 3마리가 합체! 근데 왜 뇌는 하나일까요? (광폭 관통 레이저 + 15% 마비)', paralyzeChance: 0.15, evolveLvl: 15, evolveCost: 350, evolveTo: 'magnezone' },
    'magnezone': { name: '자포코일', spriteId: 462, cost: 0, range: 180, damage: 85, cooldown: 45, type: 'laser', laserWidth: 25, color: '#334155', desc: 'UFO로 자주 오해받습니다. 강려크한 자기장 방어막 전개! (상태이상 완벽 면역 + 즉사급 관통 레이저 + 20% 마비)', paralyzeChance: 0.2, immuneToDebuffs: true },

    'riolu': { name: '리오르', spriteId: 447, cost: 90, range: 130, damage: 30, cooldown: 45, type: 'aoe', aoeRange: 60, color: '#3b82f6', desc: '기운을 느끼는 강아지. 아직은 귀엽지만 파동탄은 맵습니다. (방어력/시너지 무시 파동탄)', ignoreDef: true, defDownFactor: 1.1, debuffDur: 120, evolveLvl: 10, evolveTo: 'lucario', attackStyle: 'water' },
    'lucario': { name: '루카리오', spriteId: 448, cost: 0, range: 160, damage: 70, cooldown: 40, type: 'aoe', aoeRange: 80, color: '#1d4ed8', desc: '파동의 용사! 맞으면 맞을수록 텐션이 올라갑니다. 얍얍얍! (방어 무시 + 연속 공격 시 공속 급상승)', ignoreDef: true, defDownFactor: 1.2, debuffDur: 150, atkSpeedStack: true, attackStyle: 'water', itemEvolutions: { 'mega_stone_lucario': 'mega_lucario' } },
    
    'smoochum': { name: '뽀뽀라', spriteId: 238, cost: 70, range: 130, damage: 15, cooldown: 45, type: 'aoe', aoeRange: 60, color: '#38bdf8', desc: '입술을 쭉 내밀고 얼음 숨결을 내뿜습니다. (얼음 범위 공격 + 10% 빙결)', freezeChance: 0.1, evolveItem: 'ice_stone', evolveTo: 'jynx', attackStyle: 'ice' },
    'jynx': { name: '루주라', spriteId: 124, cost: 0, range: 180, damage: 45, cooldown: 40, type: 'aoe', aoeRange: 110, color: '#0284c7', desc: '매혹적인(?) 입술로 넓은 얼음 폭풍을 만듭니다. (대폭 증가된 얼음 범위 + 20% 빙결)', freezeChance: 0.2, attackStyle: 'ice' },
    
    'froakie': { name: '개구마르', spriteId: 656, cost: 70, range: 170, damage: 15, cooldown: 25, type: 'single', color: '#60a5fa', desc: '넓은 사거리와 빠른 수리검 투척! 개굴개굴 (단일 대상 빠른 공격)', evolveLvl: 8, evolveTo: 'frogadier', attackStyle: 'shuriken' },
    'frogadier': { name: '개굴반장', spriteId: 657, cost: 0, range: 200, damage: 35, cooldown: 25, type: 'single', color: '#3b82f6', desc: '한층 더 날렵해진 몸놀림! (사거리 및 딜량 증가)', evolveLvl: 15, evolveCost: 350, evolveTo: 'greninja', attackStyle: 'shuriken' },
    'greninja': { name: '개굴닌자', spriteId: 658, cost: 0, range: 280, damage: 70, cooldown: 15, type: 'single', color: '#1d4ed8', desc: '물수리검! 맵 끝에서 적을 암살합니다. (초장거리 + 초고속 공격)', attackStyle: 'shuriken' },
    
    'sigilyph': { name: '심보러', spriteId: 561, cost: 250, range: 0, damage: 10, cooldown: 120, type: 'global', color: '#a855f7', desc: '고대 도시를 지키던 수호신. (맵 전체 공격 + 10% 혼란)', confuseChance: 0.1 },
    
    'litten': { name: '냐오불', spriteId: 725, cost: 50, range: 80, damage: 25, cooldown: 40, type: 'single', color: '#ef4444', desc: '불꽃 고양이! (근접 단일 공격)', evolveLvl: 8, evolveTo: 'torracat', attackStyle: 'fire' },
    'torracat': { name: '냐오히트', spriteId: 726, cost: 0, range: 120, damage: 55, cooldown: 40, type: 'aoe', aoeRange: 70, color: '#dc2626', desc: '목의 방울에서 불꽃을 내뿜습니다. (범위 공격 + 공속 증가 + 20% 화상)', burnChance: 0.2, evolveLvl: 15, evolveCost: 300, evolveTo: 'incineroar', attackStyle: 'fire' },
    'incineroar': { name: '어흥염', spriteId: 727, cost: 0, range: 80, damage: 120, cooldown: 60, type: 'aoe', aoeRange: 90, color: '#b91c1c', desc: '강력한 힐 악역 레슬러! (근접 범위 딜 + 주변 적에게 영구 공깎 25% 위협 펄스)', hasIntimidate: true, auraRange: 80, attackStyle: 'fire' },

    'popplio': { name: '누리공', spriteId: 728, cost: 50, range: 130, damage: 15, cooldown: 45, type: 'aoe', aoeRange: 60, color: '#3b82f6', desc: '물풍선을 만들어 공격합니다. (넓은 범위 + 10% 적 공격력 하락)', atkDownFactor: 0.9, debuffDur: 120, evolveLvl: 8, evolveTo: 'brionne', attackStyle: 'water' },
    'brionne': { name: '키요공', spriteId: 729, cost: 0, range: 160, damage: 35, cooldown: 45, type: 'aoe', aoeRange: 80, color: '#2563eb', desc: '춤추며 물풍선을 더 멀리 넓게 던집니다. (사거리/범위 증가 + 10% 적 공깎)', atkDownFactor: 0.9, debuffDur: 150, evolveLvl: 15, evolveCost: 300, evolveTo: 'primarina', attackStyle: 'water' },
    'primarina': { name: '누리레느', spriteId: 730, cost: 0, range: 190, damage: 95, cooldown: 35, type: 'aoe', aoeRange: 100, color: '#1d4ed8', desc: '아름다운 노랫소리! (공속/딜 대폭 증가 + 15% 적 공깎)', atkDownFactor: 0.85, debuffDur: 180, attackStyle: 'water' },

    'rowlet': { name: '나몰빼미', spriteId: 722, cost: 50, range: 150, damage: 3, cooldown: 50, type: 'spread', spreadCount: 5, color: '#22c55e', desc: '소리 없이 다가가 깃털을 날립니다! (5연발 관통 깃털 + 5% 밀치기)', knockbackChance: 0.05, evolveLvl: 8, evolveTo: 'dartrix', attackStyle: 'leaf' },
    'dartrix': { name: '빼미스로우', spriteId: 723, cost: 0, range: 180, damage: 5, cooldown: 50, type: 'spread', spreadCount: 5, color: '#16a34a', desc: '앞머리를 신경 쓰는 멋쟁이. (공속/딜/사거리 증가 + 5% 밀치기)', knockbackChance: 0.05, evolveLvl: 15, evolveCost: 300, evolveTo: 'decidueye', attackStyle: 'leaf' },
    'decidueye': { name: '모크나이퍼', spriteId: 724, cost: 0, range: 220, damage: 8, cooldown: 50, type: 'spread', spreadCount: 7, color: '#15803d', desc: '그림자 꿰매기! (7연발 관통 깃털 + 적 회복 봉인)', healBlock: true, debuffDur: 200, attackStyle: 'leaf' },

    'type_null': { name: '타입:널', spriteId: 772, cost: 0, range: 100, damage: 150, cooldown: 10, type: 'single', color: '#9ca3af', desc: '빠르고 강력한 근접 단일 딜 (스턴 및 상태이상 면역)', immuneToDebuffs: true, evolveLvl: 15, evolveCost: 0, evolveTo: 'silvally', attackStyle: 'normal' },
    'silvally': { name: '실버디', spriteId: 773, cost: 0, range: 130, damage: 300, cooldown: 10, type: 'aoe', aoeRange: 80, color: '#d1d5db', desc: '더 강한 범위 딜 및 사거리 증가 (스턴 및 상태이상 면역)', immuneToDebuffs: true, attackStyle: 'normal' }
};

// NEW ENEMY TYPES
const ENEMY_TYPES = [
    { id: 'caterpie', name:'캐터피', spriteId: 10, hp: 40, speed: 1.0, dmg: 2, reward: 6, desc: '새들의 맛있는 간식. 끈적거리는 실을 뱉지만 여기선 그냥 귀엽게 기어갑니다.' },
    { id: 'weedle', name:'뿔충이', spriteId: 13, hp: 60, speed: 1.0, dmg: 2, reward: 6, desc: '머리의 뿔엔 맹독이 있지만, 플레이어 기지까지 오기 전에 보통 쓰러집니다.' },
    { id: 'rattata', name:'꼬렛', spriteId: 19, hp: 60, speed: 1.5, dmg: 5, reward: 8, desc: '이빨이 매우 간지러워 아무거나 갉아먹는 귀찮은 녀석.' },
    { id: 'pidgey', name:'구구', spriteId: 16, hp: 60, speed: 1.3, dmg: 10, reward: 8, desc: '순한 성격이지만 무리지어 오면 꽤나 성가십니다.' },
    { id: 'metapod', name:'단데기', spriteId: 11, hp: 200, speed: 0.6, dmg: 15, reward: 15, desc: '단단해지기 장인! 체력이 꽤 높아 초반에 처치하기 까다롭습니다.' },
    { id: 'kakuna', name:'딱충이', spriteId: 14, hp: 300, speed: 0.6, dmg: 15, reward: 15, desc: '건드리면 무서운 독침붕이 나오지만, 지금은 그냥 튼튼한 샌드백일 뿐입니다.' },
    { id: 'raticate', name:'레트라', spriteId: 20, hp: 250, speed: 1.6, dmg: 25, reward: 22, desc: '앞니로 콘크리트도 씹어먹습니다. 기지가 털리지 않게 조심하세요!' },
    { id: 'pidgeotto', name:'피죤', spriteId: 17, hp: 150, speed: 1.6, dmg: 20, reward: 18, desc: '넓은 구역을 날아다니며 사냥감을 찾습니다. 이동 속도가 빠릅니다.' },
    { id: 'butterfree', name:'버터플', spriteId: 12, hp: 180, speed: 1.4, dmg: 15, reward: 25, skill: 'sleep', desc: '날갯짓으로 타워들을 쿨쿨 재워버리는(수면가루) 무서운 나비!' },
    { id: 'beedrill', name:'독침붕', spriteId: 15, hp: 160, speed: 1.8, dmg: 25, reward: 25, desc: '성질이 아주 사납고 속도가 엄청나게 빠릅니다. 벌집을 건드린 대가죠!' },
    { id: 'pidgeot', name:'피죤투', spriteId: 18, hp: 300, speed: 1.6, dmg: 10, reward: 35, skill: 'ranged', desc: '마하 2의 속도로 날아 맵 멀리서 기지를 저격(원거리 공격)하는 강적.' },
    { id: 'snorlax', name:'잠만보', spriteId: 143, hp: 1200, speed: 0.5, dmg: 35, reward: 80, skill: 'yawn', desc: '1라운드의 보스! 엄청난 체력과, 타워를 광역으로 잠재우는 하품을 씁니다.' },
    { id: 'gimmighoul', name: '모으령', spriteId: 999, hp: 2500, speed: 3.0, dmg: 0, reward: 500, skill: 'dash', desc: '코인을 사랑하는 황금 요정! 엄청난 속도로 대쉬하며, 잡으면 대박이 터집니다.' }
];

// ROUND 2 ENEMY TYPES (Custom Mechanics) - Adjusted (90% HP, Original DMG, High Rewards)
const ENEMY_TYPES_R2 = [
    { id: 'geodude', name:'꼬마돌', spriteId: 74, hp: 70, speed: 0.8, dmg: 5, reward: 12, desc: '돌멩이인 줄 알고 찼다간 발가락이 박살납니다.' },
    { id: 'sandshrew', name:'모래두지', spriteId: 27, hp: 65, speed: 1.4, dmg: 8, reward: 12, desc: '건조한 땅을 좋아하는 귀여운 쥐. 물 공격에 약할지도?' },
    { id: 'cubone', name:'탕구리', spriteId: 104, hp: 80, speed: 1.1, dmg: 10, reward: 15, skill: 'ranged', rangeDist: 150, desc: '슬픈 사연을 가진 녀석. 멀리서 뼈다귀 부메랑을 던져 기지를 때립니다.' },
    { id: 'rhyhorn', name:'뿔카노', spriteId: 111, hp: 110, speed: 1.3, dmg: 15, reward: 18, skill: 'dash', desc: '뇌가 작아 한 번 뛰기 시작하면 멈출 줄 모릅니다. 무시무시한 대쉬!' },
    { id: 'klink', name:'기어르', spriteId: 599, hp: 45, speed: 1.0, dmg: 8, reward: 12, skill: 'synergy', desc: '두 개의 톱니가 맞물려 돌아갑니다. 동료가 많으면 기어 시너지가 생겨 빨라져요!' },
    { id: 'graveler', name:'데구리', spriteId: 75, hp: 145, speed: 0.8, dmg: 15, reward: 25, desc: '산에서 굴러떨어지는 무서운 돌덩이.' },
    { id: 'sandslash', name:'고지', spriteId: 28, hp: 125, speed: 1.6, dmg: 20, reward: 25, desc: '가시로 무장한 사막의 암살자. 움직임이 날렵합니다.' },
    { id: 'marowak', name:'텅구리', spriteId: 105, hp: 160, speed: 1.2, dmg: 25, reward: 30, skill: 'ranged', rangeDist: 200, desc: '뼈다귀 부메랑의 달인! 구석에 숨어서 더 먼 거리에서 뼈를 던집니다.' },
    { id: 'onix', name:'롱스톤', spriteId: 95, hp: 270, speed: 0.9, dmg: 35, reward: 45, skill: 'rockThrow', desc: '거대한 바위뱀. 가끔 짱돌을 던져 타워 하나를 5초간 기절시킵니다!' },
    { id: 'klang', name:'기기어르', spriteId: 600, hp: 90, speed: 1.0, dmg: 15, reward: 22, skill: 'synergy', desc: '진화하면서 톱니가 하나 늘어 시너지가 더 강력해집니다.' },
    { id: 'rhydon', name:'코뿌리', spriteId: 112, hp: 405, speed: 1.0, dmg: 40, reward: 50, skill: 'dash', desc: '꼬리로 빌딩도 부수는 괴력. 뿔카노보다 훨씬 묵직한 대쉬를 씁니다.' },
    { id: 'golem', name:'딱구리', spriteId: 76, hp: 315, speed: 0.8, dmg: 30, reward: 45, skill: 'explode', desc: '언제 터질지 모르는 시한폭탄! 죽으면서 엄청난 자폭 데미지를 줍니다.' },
    { id: 'klinklang', name:'기기기어르', spriteId: 601, hp: 180, speed: 1.0, dmg: 25, reward: 30, skill: 'synergy', desc: '톱니 군단의 핵심! 맵에 기어류가 많을수록 미친 듯한 속도로 달려옵니다.' },
    { id: 'rhyperior', name:'거대코뿌리', spriteId: 464, hp: 1080, speed: 0.7, dmg: 55, reward: 150, skill: 'sandTomb', desc: '2라운드의 최종 보스. 꼬마돌을 대포처럼 쏘며, 타워들을 봉인하는 모래지옥을 씁니다.' } // 보스
];

// ROUND 3 ENEMY TYPES (Beach Map)
const ENEMY_TYPES_R3 = [
    { id: 'magikarp', name: '잉어킹', spriteId: 129, hp: 50, speed: 0.5, dmg: 1, reward: 2, desc: '그냥 제일 약해. 모든 적 중 최약체. 돈도 많이 안 줘.' },
    { id: 'horsea', name: '쏘드라', spriteId: 116, hp: 120, speed: 1.2, dmg: 15, reward: 15, skill: 'ranged', rangeDist: 150, desc: '먹물을 쏘는 원거리 딜러.' },
    { id: 'seadra', name: '씨드라', spriteId: 117, hp: 200, speed: 1.4, dmg: 25, reward: 25, skill: 'ranged', rangeDist: 180, desc: '전체적인 스텟과 사거리가 증가했습니다.' },
    { id: 'kingdra', name: '킹드라', spriteId: 230, hp: 350, speed: 1.5, dmg: 40, reward: 40, skill: 'rangedStun', rangeDist: 220, desc: '더 긴 사거리와 원거리 스턴 능력을 가졌습니다.' },
    { id: 'sandygast', name: '모래꿍', spriteId: 769, hp: 300, speed: 0.7, dmg: 15, reward: 20, skill: 'healAlliesOnHit', desc: '느리지만 단단함. 주변 맞을 때마다 아군을 회복시킵니다.' },
    { id: 'palossand', name: '모래성이당', spriteId: 770, hp: 550, speed: 0.6, dmg: 35, reward: 35, skill: 'sandTombHeal', desc: '체력 증가, 피격시 아군 회복과 모래지옥을 사용합니다.' },
    { id: 'crabrawler', name: '오기지게', spriteId: 739, hp: 180, speed: 1.5, dmg: 30, reward: 25, skill: 'enemyStun', desc: '빠르고 강함. 가끔 주변 단일 적(타워)을 2초 스턴시킵니다.' },
    { id: 'crabominable', name: '모단단게', spriteId: 740, hp: 320, speed: 1.4, dmg: 50, reward: 35, skill: 'enemyFreeze', desc: '딜 증가, 체력 증가. 스턴 대신 얼음 상태이상을 부여합니다.' },
    { id: 'carvanha', name: '샤프니아', spriteId: 318, hp: 150, speed: 2.0, dmg: 30, reward: 20, skill: 'dash', desc: '아주 빠르고 돌진합니다.' },
    { id: 'sharpedo', name: '샤크니아', spriteId: 319, hp: 250, speed: 2.5, dmg: 45, reward: 30, skill: 'dash', desc: '더 강하고 빠릅니다.' },
    { id: 'mega_sharpedo', name: '메가샤크니아', spriteId: 10070, hp: 2500, speed: 2.0, dmg: 100, reward: 300, skill: 'dash', desc: '더 단단해진 진보스. 20웨이브에서 1마리만 나옵니다.' },
    { id: 'exeggcute', name: '아라리', spriteId: 102, hp: 100, speed: 1.1, dmg: 10, reward: 10, skill: 'explodeSmall', desc: '낮은 범위의 자폭을 합니다.' },
    { id: 'exeggutor', name: '나시', spriteId: 103, hp: 350, speed: 0.9, dmg: 35, reward: 35, skill: 'ranged', rangeDist: 150, desc: '자폭은 없어졌고 단단하고 강해짐. 원거리 능력 추가.' },
    { id: 'alolan_exeggutor', name: '알로라나시', spriteId: 10114, hp: 450, speed: 0.8, dmg: 60, reward: 45, skill: 'summonExeggcute', desc: '나시의 다른 진화. 원거리가 아닌 아라리(보상 없음) 소환 능력을 얻었습니다.' },
    { id: 'dewpider', name: '물거미', spriteId: 751, hp: 220, speed: 1.0, dmg: 20, reward: 25, skill: 'weakenTowerAura', desc: '주변에 약화 오라가 생기고 그 범위의 타워 딜이 20% 하락합니다.' },
    { id: 'araquanid', name: '깨비물거미', spriteId: 752, hp: 400, speed: 1.2, dmg: 45, reward: 40, skill: 'weakenTowerAuraLarge', desc: '더 빠르고 강하며 오라 범위가 약간 증가했습니다.' },
    { id: 'gyarados', name: '갸라도스', spriteId: 130, hp: 1200, speed: 1.8, dmg: 80, reward: 150, skill: 'dash', desc: '아주아주 강함. 모든 스텟이 쎄며 돌진이 있는 3라운드 보스.' }
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
            btnUpgrade.innerText = `최대 레벨 (100)`;
            btnUpgrade.style.opacity = '0.5';
            btnUpgrade.style.cursor = 'not-allowed';
        } else {
            btnUpgrade.innerText = `강화 (비용: ${upgCost}열매)`;
            btnUpgrade.style.opacity = '1';
            btnUpgrade.style.cursor = 'pointer';
        }
        btnSell.innerText = `철거 (반환: ${Math.floor(selectedTower.totalInvested / 2)}열매)`;
        
        const evolveContainer = document.getElementById('evolve-container');
        evolveContainer.innerHTML = '';
        
        // 베리로 진화 (레벨 + 비용)
        if (data.evolveLvl && selectedTower.level >= data.evolveLvl) {
            const cost = data.evolveCost || 150;
            const btn = document.createElement('button');
            btn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
            btn.style.borderColor = '#fcd34d';
            btn.innerText = `진화 (비용: ${cost}열매)`;
            btn.onclick = () => doEvolve(data.evolveTo, cost, null);
            evolveContainer.appendChild(btn);
        }
        
        // 단일 아이템 진화 (피카츄 등)
        if (data.evolveItem && inventory[data.evolveItem] > 0) {
            const itemName = SHOP_ITEM_POOL.find(i => i.id === data.evolveItem)?.name || '도구';
            const btn = document.createElement('button');
            btn.style.background = 'linear-gradient(135deg, #8b5cf6, #6d28d9)';
            btn.style.borderColor = '#a78bfa';
            btn.innerText = `진화 (${itemName} 사용)`;
            btn.onclick = () => doEvolve(data.evolveTo, 0, data.evolveItem);
            evolveContainer.appendChild(btn);
        }
        
        // 다중 아이템 진화 (이브이 등)
        if (data.itemEvolutions) {
            Object.keys(data.itemEvolutions).forEach(itemId => {
                if (inventory[itemId] > 0) {
                    if (itemId.startsWith('mega_stone') && inventory['keystone'] <= 0) return; // 키스톤 필요
                    const evolveToId = data.itemEvolutions[itemId];
                    const targetData = POKEMON_DATA[evolveToId];
                    const itemName = SHOP_ITEM_POOL.find(i => i.id === itemId)?.name || '도구';
                    const btn = document.createElement('button');
                    btn.style.background = `linear-gradient(135deg, ${targetData.color}, #000000)`;
                    btn.style.borderColor = targetData.color;
                    btn.innerText = `${targetData.name} 진화 (${itemName})`;
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
    'type_null': { id: 'boss_type_null', name: '타입:널', spriteId: 772, hp: 6000, speed: 1.5, dmg: 30, reward: 0, skill: 'raidBossTypeNull', cost: 555 },
    'zeraora': { id: 'boss_zeraora', name: '제라오라', spriteId: 807, hp: 5000, speed: 2.5, dmg: 30, reward: 0, skill: 'raidBossZeraora', cost: 600, immuneToDebuffs: true }
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
    btnStartWave.innerText = '웨이브 시작!';
    
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
    
    visualEffects.push(new TextEffect(canvas.width / 2, canvas.height / 2, `ROUND ${currentRound} 시작!`, '#ef4444'));
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
                if (Math.random() < 0.2) visualEffects.push(new TextEffect(this.x, this.y - 20, '봉인됨!', '#94a3b8'));
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
            visualEffects.push(new TextEffect(this.x, this.y - 40, '급소!', '#ef4444'));
        }
        
        this.hp -= amount;
        if (this.hp <= 0) {
            this.isDead = true;
            
            if (this.baseData && this.baseData.skill === 'raidBossTypeNull') {
                isRaidActive = false;
                clearedRaidsThisRound.push('type_null');
                document.getElementById('btn-build-typenull').style.display = 'flex';
                renderBackgroundToOffscreen();
                visualEffects.push(new TextEffect(canvas.width/2, canvas.height/2, '레이드 클리어!', '#fcd34d'));
                alert('전설 레이드 클리어! 타입:널이 아군으로 합류합니다.');
            } else if (this.baseData && this.baseData.skill === 'raidBossZeraora') {
                isRaidActive = false;
                clearedRaidsThisRound.push('zeraora');
                window.zeraoraUnlocked = true;
                document.getElementById('btn-build-zeraora').style.display = 'flex';
                renderBackgroundToOffscreen();
                visualEffects.push(new TextEffect(canvas.width/2, canvas.height/2, '레이드 클리어!', '#fcd34d'));
                alert('전설 레이드 클리어! 제라오라가 아군으로 합류합니다.');
            } else {
                berries += this.reward;
            }
            
            if (attacker && attacker.item === 'leftovers') {
                lives = Math.min(500, lives + 1);
                
                visualEffects.push(new BubbleEffect(attacker.x, attacker.y, '#4ade80', 30));
            }
            
            if (this.skill === 'explode') {
                visualEffects.push(new ExplosionEffect(this.x, this.y, 90, '#f59e0b')); // 폭발 반경 축소
                towers.forEach(t => {
                    if (Math.hypot(t.x - this.x, t.y - this.y) <= 90) { // 사거리 축소
                        t.stunTimer = 180; // 3초 스턴
                    }
                });
            }
        }
    }

    applyKnockback(distance) {
        if (this.baseData.id === 'rhyperior' || this.baseData.id === 'snorlax') return; // 보스는 넉백 면역
        
        let remDist = distance;
        while (remDist > 0) {
            let curWP = waypoints[this.pathIndex];
            if (!curWP) break; // 시작점을 벗어날 수 없음
            
            let dx = this.x - curWP.x;
            let dy = this.y - curWP.y;
            let distToPrev = Math.hypot(dx, dy);
            
            if (distToPrev > remDist) {
                // 이 선분 내에서 뒤로 밀려남
                this.x -= (dx / distToPrev) * remDist;
                this.y -= (dy / distToPrev) * remDist;
                remDist = 0;
            } else {
                // 이전 웨이포인트에 도달, 이전 선분으로 넘어가야 함
                this.x = curWP.x;
                this.y = curWP.y;
                remDist -= distToPrev;
                if (this.pathIndex > 0) {
                    this.pathIndex--; // 이전 웨이포인트로 변경
                } else {
                    break; // 더 이상 갈 곳이 없으면 정지
                }
            }
        }
        
        visualEffects.push(new TextEffect(this.x, this.y - 30, '밀침!', '#facc15'));
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
                    visualEffects.push(new TextEffect(this.x, this.y - 30, `혼란! -${selfDmg}`, '#a855f7'));
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
                    if (!POKEMON_DATA[target.baseId].immuneToDebuffs) target.stunTimer = 300; // 5초 스턴
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
                    if (!POKEMON_DATA[target.baseId].immuneToDebuffs) target.stunTimer = 120; // 2초 기절/얼음
                    visualEffects.push(new TextEffect(target.x, target.y - 20, this.skill === 'enemyFreeze' ? 'Frozen!' : 'Stun!', this.skill === 'enemyFreeze' ? '#38bdf8' : '#facc15'));
                }
            }
        } else if (this.skill === 'summonExeggcute') {
            this.skillTimer++;
            if (this.skillTimer >= 300) { // Every 5 sec
                this.skillTimer = 0;
                let childData = ENEMY_TYPES_R3.find(e => e.id === 'exeggcute');
                if (childData) {
                    let child = new Enemy(childData, this.maxHp / childData.hp * 0.5); // 적절한 체력
                    child.x = this.x; child.y = this.y; child.pathIndex = this.pathIndex;
                    child.reward = 0; // 보상 없음
                    enemies.push(child);
                    visualEffects.push(new TextEffect(this.x, this.y - 20, 'Summon!', '#4ade80'));
                }
            }
        } else if (this.skill === 'weakenTowerAura' || this.skill === 'weakenTowerAuraLarge') {
            let range = this.skill === 'weakenTowerAuraLarge' ? 120 : 90;
            if (frame % 30 === 0) visualEffects.push(new BubbleEffect(this.x, this.y, 'rgba(59, 130, 246, 0.3)', range));
        } else if (this.skill === 'dash') {
            this.skillTimer++;
            if (this.skillTimer >= 180) { // 3초마다
                this.skillTimer = 0;
                this.dashTimer = 30; // 0.5초 동안 대쉬
            }
            if (this.dashTimer > 0) {
                this.dashTimer--;
                currentSpeed *= 3;
                if (frame % 3 === 0) visualEffects.push(new BubbleEffect(this.x, this.y, '#d4d4d8', 10));
            }
        } else if (this.skill === 'sandTomb' || this.skill === 'sandTombHeal') {
            if (frame % 5 === 0) visualEffects.push(new BubbleEffect(this.x, this.y, '#b45309', 20)); // 모래 이펙트
            towers.forEach(t => {
                let dx = t.x - this.x;
                let dy = t.y - this.y;
                if (dx*dx + dy*dy <= 6400) { // 80^2 사거리
                    t.sandTombTimer = 2; // 매 프레임 부여되어 공격 불가능하게 만듦
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

        if (this.skill === 'raidBossZeraora' && frame % 120 === 0) { // 매 2초마다 타워 마비
            visualEffects.push(new BubbleEffect(this.x, this.y, '#facc15', 30));
            towers.forEach(t => {
                if (Math.hypot(t.x - this.x, t.y - this.y) <= 150) {
                    if (t.immuneTimer <= 0 && !POKEMON_DATA[t.baseId].immuneToDebuffs) {
                        t.stunTimer = Math.max(t.stunTimer, 60); // 1초 마비
                        visualEffects.push(new TextEffect(t.x, t.y - 20, '마비!', '#facc15'));
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
                if (this.baseData && (this.baseData.skill === 'raidBossTypeNull' || this.baseData.skill === 'raidBossZeraora')) {
                    this.x = waypoints[0].x;
                    this.y = waypoints[0].y;
                    this.pathIndex = 0;
                    raidVirtualHp -= 5000;
                    if (raidVirtualHp <= 0) {
                        isRaidActive = false;
                        this.hp = 0;
                        renderBackgroundToOffscreen();
                        alert('레이드 실패!');
                    } else {
                        visualEffects.push(new TextEffect(this.x, this.y, '루프! 가상체력 감소', '#c084fc'));
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

// Tower draw 애니메이션 타입 분류 (매 프레임 생성 방지용 상수)
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

        // 라운드가 지날 때마다 기초 능력치 상승 (데미지 20% 증가)
        const dmgBoost = 1 + (currentRound - 1) * 0.2;

        this.damage = Math.floor(data.damage * dmgBoost);
        this.cooldown = data.cooldown; // 공속 증가 없음
        
        this.sleepTimer = 0;
        this.yawnTimer = 0;
        this.stunTimer = 0;
        this.sandTombTimer = 0;
        
        this.item = null;
        this.immuneTimer = 0;
        this.lastTarget = null;
        this.attackFrame = 0; // for attack recoil animation
        this.bobOffset = Math.random() * Math.PI * 2; // for idle bob animation
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
                visualEffects.push(new TextEffect(this.x, this.y - 30, '상태이상 회복!', '#4ade80'));
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
        
        if (data.canAttack === false) return; // 케이시처럼 공격이 불가능한 타워
        
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
                        e.status.confuseTimer = 300; // 5초
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
                            visualEffects.push(new TextEffect(this.x, this.y - 30, '딜레이...', '#94a3b8'));
                        }
                    }

                    if (data.atkSpeedStack) {
                        if (!targetChanged) {
                            this.comboStack = Math.min((this.comboStack || 0) + 1, 15); // 최대 15스택
                        } else {
                            this.comboStack = 0;
                        }
                        this.timer = Math.max(10, currentCooldown - this.comboStack * 2); // 최소 10프레임
                    } else {
                        this.timer = currentCooldown;
                        this.comboStack = 1; // used for choice scarf delay check
                    }

                    if (data.type === 'laser') {
                        // 레이저 즉발 충돌 판정
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
                        let spreadCount = data.spreadCount || 5;
                        let baseAngle = Math.atan2(bestEnemy.y - this.y, bestEnemy.x - this.x);
                        let spreadAngle = Math.PI / 4;
                        let startAngle = baseAngle - spreadAngle / 2;
                        let angleStep = spreadCount > 1 ? spreadAngle / (spreadCount - 1) : 0;
                        for (let i = 0; i < spreadCount; i++) {
                            let angle = startAngle + i * angleStep;
                            projectiles.push(new Projectile(this.x, this.y, null, this, damageMult, angle, spreadCount));
                        }
                    } else if (data.type === 'aoe' && data.aoeRange) {
                        // AOE: 프로젝타일 발사 후 도착 시 폭발
                        this.attackFrame = 8;
                        projectiles.push(new Projectile(this.x, this.y, bestEnemy, this, damageMult));
                    } else if (data.type === 'chain') {
                        // Chain: 프로젝타일 발사
                        this.attackFrame = 8;
                        projectiles.push(new Projectile(this.x, this.y, bestEnemy, this, damageMult));
                    } else {
                        // Single: 프로젝타일 발사
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
                        if (Math.random() < 0.3 && visualEffects.length < 200) visualEffects.push(new TextEffect(e.x, e.y - 20, '위협!', '#ef4444'));
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
        
        if (this.data.burnChance && Math.random() < this.data.burnChance) enemy.status.burnTimer = 300;
        if (this.data.poisonChance && Math.random() < this.data.poisonChance) enemy.status.poisonTimer = 300;
        if (this.data.confuseChance && Math.random() < this.data.confuseChance) {
            enemy.status.confused = true; enemy.status.confuseTimer = 300; enemy.status.confuseTick = 0;
        }
        if (this.data.freezeChance && Math.random() < this.data.freezeChance) {
            enemy.status.frozen = true; enemy.status.freezeTick = 0;
        }
        if (enemy.baseData.id !== 'snorlax') {
            if (this.data.stunDur) enemy.status.stunTimer = this.data.stunDur;
            if (this.data.paralyzeChance && Math.random() < this.data.paralyzeChance) enemy.status.paralyzed = true;
        }
        if (this.data.defDownFactor) {
            enemy.status.defDownFactor = this.data.defDownFactor; enemy.status.defDownTimer = this.data.debuffDur;
            enemy.status.atkDownFactor = this.data.atkDownFactor || 1; enemy.status.atkDownTimer = this.data.debuffDur;
            if (this.data.slowFactor) { enemy.status.slowFactor = this.data.slowFactor; enemy.status.slowTimer = this.data.debuffDur; }
        }
        if (this.data.knockbackChance && Math.random() < this.data.knockbackChance) enemy.applyKnockback(40);
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
                visualEffects.push(new ExplosionEffect(this.target.x, this.target.y, this.data.aoeRange, this.data.color));
                let aoeRangeSq = this.data.aoeRange * this.data.aoeRange;
                for (let e of enemies) {
                    if (e !== this.target) {
                        let edx = e.x - this.target.x;
                        if (edx > this.data.aoeRange || edx < -this.data.aoeRange) continue;
                        let edy = e.y - this.target.y;
                        if (edy > this.data.aoeRange || edy < -this.data.aoeRange) continue;
                        if (edx*edx + edy*edy <= aoeRangeSq) {
                            let oldDamage = this.damage;
                            this.damage *= 0.5;
                            this.applyEffects(e);
                            this.damage = oldDamage;
                        }
                    }
                }
                this.active = false;
            } else if (this.data.type === 'chain' && this.chainCount < (this.data.chainMax - 1)) {
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
                visualEffects.push(new TextEffect(clickedTower.x, clickedTower.y - 20, `${itemInfo.icon} 장착!`, '#fbbf24'));
            }
            if (selectedTower === clickedTower) updateUI();
            renderInventory();
        }
        usingItem = null;
        return; // 사용 취소 또는 사용 완료
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
                visualEffects.push(new TextEffect(mouseX, mouseY - 20, "심보러 최대 10마리 제한!", '#ef4444'));
                return;
            }
        }
        // 레이드 보상 포켓몬(타입:널, 제라오라)은 1번만 배치 가능
        if (selectedBuildType === 'type_null') {
            const alreadyPlaced = towers.some(t => t.baseId === 'type_null' || t.baseId === 'silvally');
            if (alreadyPlaced) {
                visualEffects.push(new TextEffect(mouseX, mouseY - 20, "이미 배치됨!", '#ef4444'));
                return;
            }
        }
        if (selectedBuildType === 'zeraora') {
            const alreadyPlaced = towers.some(t => t.baseId === 'zeraora' || t.baseId === 'mega_zeraora');
            if (alreadyPlaced) {
                visualEffects.push(new TextEffect(mouseX, mouseY - 20, "이미 배치됨!", '#ef4444'));
                return;
            }
        }
        const typeToPlace = selectedBuildType;
        towers.push(new Tower(cellX, cellY, typeToPlace));
        berries -= cost;
        
        // 레이드 보상 포켓몬은 배치 후 버튼 숨기기
        if (typeToPlace === 'type_null') {
            const btn = document.getElementById('btn-build-typenull');
            if (btn) btn.style.display = 'none';
            selectedBuildType = 'charmander';
            document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('active'));
        }
        if (typeToPlace === 'zeraora') {
            const btn = document.getElementById('btn-build-zeraora');
            if (btn) btn.style.display = 'none';
            selectedBuildType = 'charmander';
            document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('active'));
        }
        
        if (tutStep === 1) nextTutorial();
    } else if (!isPath && berries < cost) {
        visualEffects.push(new TextEffect(mouseX, mouseY - 20, "열매 부족!", '#ef4444'));
    }
});

btnStartWave.addEventListener('click', () => {
    if (!isWaveActive) {
        isWaveActive = true;
        enemiesSpawnedThisWave = 0;
        btnStartWave.disabled = true;
        btnStartWave.innerText = '웨이브 진행중...';
        if (tutStep === 4) endTutorial();
    }
});

// Main Loop
let lastRenderedBerries = -1;
let lastRenderedLives = -1;

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (berries !== lastRenderedBerries) {
        berriesEl.innerText = berries;
        lastRenderedBerries = berries;
    }
    if (lives !== lastRenderedLives) {
        livesEl.innerText = Math.ceil(Math.max(0, lives));
        lastRenderedLives = lives;
    }
    drawBackground();
    drawGridHover();

    window.globalSynergyCount = 0;
    window.damageAuraTowers = window.damageAuraTowers || [];
    window.weakenAuraEnemies = window.weakenAuraEnemies || [];
    window.damageAuraTowers.length = 0;
    window.weakenAuraEnemies.length = 0;
    for(let i=0; i<enemies.length; i++) {
        if(enemies[i].skill === 'synergy') window.globalSynergyCount++;
        if(enemies[i].baseData && (enemies[i].baseData.skill === 'weakenTowerAura' || enemies[i].baseData.skill === 'weakenTowerAuraLarge')) window.weakenAuraEnemies.push(enemies[i]);
    }
    for(let i=0; i<towers.length; i++) {
        if(POKEMON_DATA[towers[i].baseId].hasDamageAura) window.damageAuraTowers.push(towers[i]);
    }

    towers.forEach(t => { t.update(); t.draw(); });

    if (isWaveActive) {
        const spawnRate = Math.max(5, Math.floor(30 - wave * 1.5)); 
        // 몬스터 수를 대폭 줄임 (20웨이브 기준 약 150마리 내외)
        const maxEnemies = wave * 4 + (wave > 3 ? Math.floor(Math.pow(wave - 3, 1.3) * 2) : 0);

        // 레이드 진행 중엔 일반 적 스폰 중단
        if (!isRaidActive && frame % spawnRate === 0 && enemiesSpawnedThisWave < maxEnemies) {
            // 10웨이브부터 5단위로 보스 출현
            const isBossWave = (wave >= 10 && wave % 5 === 0);
            const bossCount = isBossWave ? Math.floor(wave / 5) - 1 : 0; // 10웹: 1마리, 15웹: 2마리, 20웹: 3마리
            const isBossSpawn = isBossWave && (enemiesSpawnedThisWave >= maxEnemies - bossCount);
            
            let enemyData;
            if (enemiesSpawnedThisWave === Math.floor(maxEnemies / 2)) {
                // 매 라운드 중간에 모으령 1마리 확정 스폰
                enemyData = ENEMY_TYPES.find(e => e.id === 'gimmighoul');
            } else if (currentRound === 3 && wave === 20 && enemiesSpawnedThisWave === maxEnemies - 1) {
                enemyData = ENEMY_TYPES_R3.find(e => e.id === 'mega_sharpedo');
            } else {
                enemyData = getEnemyForWave(wave, isBossSpawn);
            }
            
            const hpScaling = 1 + (wave * 0.25); // 선형 스케일링으로 변경하여 급격한 스펙 상승 방지
            enemies.push(new Enemy(enemyData, hpScaling));
            enemiesSpawnedThisWave++;
        }

        // 레이드 중이 아닐 때만 일반 웨이브 완료 체크
        if (!isRaidActive) {
            for (let i = enemies.length - 1; i >= 0; i--) {
                enemies[i].update(); enemies[i].draw();
                if (enemies[i].hp <= 0) enemies.splice(i, 1);
            }

            if (enemies.length === 0 && enemiesSpawnedThisWave >= maxEnemies) {
                isWaveActive = false; 
                
                const waveBonus = 20 + wave * 10;
                berries += waveBonus;
                
                visualEffects.push(new TextEffect(canvas.width / 2 - 50, canvas.height / 2, `웨이브 보상 +${waveBonus}열매!`, '#facc15'));
                
                if (wave === MAX_WAVE) {
                    if (ROUND_MAPS[currentRound + 1]) {
                        startNextRound();
                        requestAnimationFrame(animate);
                        return; // Prevent wave++ and frame rendering for this cycle
                    } else {
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.fillStyle = '#fcd34d'; ctx.font = 'bold 50px Outfit'; ctx.textAlign = 'center';
                        ctx.fillText('STAGE CLEAR!', canvas.width/2, canvas.height/2 - 20);
                        ctx.fillStyle = '#fff'; ctx.font = '20px Outfit';
                        ctx.fillText('모든 라운드를 완벽하게 클리어했습니다! 🎉', canvas.width/2, canvas.height/2 + 30);
                        return; // Stop game loop on victory
                    }
                }
                
                wave++; 
                waveEl.innerText = wave;
                btnStartWave.disabled = false; btnStartWave.innerText = '웨이브 시작!';
                frame = 0;
                
                // 웨이브 완료 시 자동 저장
                if (typeof saveGame === 'function') saveGame();
            }
        }
        frame++;
    }

    // 레이드 진행 중엔 웨이브 여부와 무관하게 레이드 보스 업데이트
    if (isRaidActive) {
        for (let i = enemies.length - 1; i >= 0; i--) {
            enemies[i].update(); enemies[i].draw();
            if (enemies[i].hp <= 0) enemies.splice(i, 1);
        }
        frame++; // 레이드 중에도 frame 카운터 증가 (애니메이션/쿨다운 처리용)
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
    tutText.innerHTML = "<b>[1/4] 타워 설치</b><br>왼쪽 메뉴에서 포켓몬을 고르고 캔버스의 잔디밭을 클릭해 설치하세요!";
    document.getElementById('btn-tut-next').style.display = 'none';
}

function nextTutorial() {
    if (tutStep === 1) {
        tutStep = 2; tutTooltip.style.top = '100px'; tutTooltip.style.left = '320px';
        tutText.innerHTML = "<b>[2/4] 강화 및 진화</b><br>방금 설치한 포켓몬을 마우스로 다시 <b>클릭</b>해 보세요.";
    } else if (tutStep === 2) {
        tutStep = 3; tutTooltip.style.top = '150px'; tutTooltip.style.left = '320px';
        document.getElementById('btn-tut-next').style.display = 'inline-block';
        tutText.innerHTML = "<b>[3/4] 강화 메뉴</b><br>좌측 메뉴가 강화 메뉴로 바뀝니다. 열매를 소모해 레벨을 올리고 특정 레벨이 되면 진화할 수 있습니다!";
    } else if (tutStep === 3) {
        tutStep = 4; tutTooltip.style.top = '500px'; tutTooltip.style.left = '320px';
        document.getElementById('btn-tut-next').style.display = 'none';
        tutText.innerHTML = "<b>[4/4] 웨이브 시작</b><br>준비가 끝났다면 좌측 하단의 <b>'웨이브 시작!'</b> 버튼을 누르세요!";
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
                    <strong style="color: #cbd5e1;">비용:</strong> ${p.cost} 열매<br>
                    <strong style="color: #cbd5e1;">공격력:</strong> ${p.damage}<br>
                    <strong style="color: #cbd5e1;">사거리:</strong> ${p.range}<br>
                    <strong style="color: #cbd5e1;">쿨타임:</strong> ${(p.cooldown / 60).toFixed(1)}초<br>
                    <div style="margin-top: 5px; font-size: 0.75rem; color: #64748b;">${p.desc}</div>
                </div>
            </div>
        `;
    });

    encEnemiesContent.innerHTML = '';
    
    const skillNames = {
        'sleep': '수면',
        'yawn': '하품',
        'ranged': '원거리',
        'dash': '돌진',
        'synergy': '톱니바퀴 시너지',
        'rockThrow': '돌 던지기',
        'explode': '자폭',
        'sandTomb': '모래지옥',
        'weakenTowerAura': '위협의 오라(소)',
        'weakenTowerAuraLarge': '위협의 오라(대)',
        'healAlliesOnHit': '아군 회복',
        'sandTombHeal': '모래지옥 & 아군 회복',
        'enemyStun': '타워 기절',
        'enemyFreeze': '타워 빙결',
        'summonExeggcute': '아라리 소환',
        'rangedStun': '원거리 기절'
    };

    // Round 1 Enemies
    ENEMY_TYPES.forEach(e => {
        const skillText = e.skill ? skillNames[e.skill] || e.skill : '';
        encEnemiesContent.innerHTML += `
            <div style="background: rgba(0,0,0,0.3); border: 1px solid #475569; border-radius: 8px; padding: 15px; text-align: center; position: relative;">
                <span style="position: absolute; top: 5px; left: 5px; background: #4ade80; color: #000; font-size: 0.7rem; font-weight: bold; padding: 2px 5px; border-radius: 3px;">1라운드</span>
                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${e.spriteId}.png" style="width: 60px; height: 60px;">
                <h4 style="margin: 5px 0; color: #f87171; font-size: 1.1rem;">${e.name}</h4>
                <div style="font-size: 0.85rem; color: #94a3b8; text-align: left; line-height: 1.4; margin-top: 10px;">
                    <strong style="color: #cbd5e1;">체력(HP):</strong> ${e.hp}<br>
                    <strong style="color: #cbd5e1;">이속:</strong> ${e.speed}<br>
                    <strong style="color: #cbd5e1;">피해량:</strong> ${e.dmg}<br>
                    <strong style="color: #cbd5e1;">보상:</strong> ${e.reward} 열매<br>
                    ${e.skill ? `<strong style="color: #f59e0b;">특성:</strong> ${skillText}` : ''}
                </div>
            </div>
        `;
    });
    
    // Round 2 Enemies
    ENEMY_TYPES_R2.forEach(e => {
        const skillText = e.skill ? skillNames[e.skill] || e.skill : '';
        encEnemiesContent.innerHTML += `
            <div style="background: rgba(0,0,0,0.3); border: 1px solid #475569; border-radius: 8px; padding: 15px; text-align: center; position: relative;">
                <span style="position: absolute; top: 5px; left: 5px; background: #fcd34d; color: #000; font-size: 0.7rem; font-weight: bold; padding: 2px 5px; border-radius: 3px;">2라운드</span>
                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${e.spriteId}.png" style="width: 60px; height: 60px;">
                <h4 style="margin: 5px 0; color: #f87171; font-size: 1.1rem;">${e.name}</h4>
                <div style="font-size: 0.85rem; color: #94a3b8; text-align: left; line-height: 1.4; margin-top: 10px;">
                    <strong style="color: #cbd5e1;">체력(HP):</strong> ${e.hp}<br>
                    <strong style="color: #cbd5e1;">이속:</strong> ${e.speed}<br>
                    <strong style="color: #cbd5e1;">피해량:</strong> ${e.dmg}<br>
                    <strong style="color: #cbd5e1;">보상:</strong> ${e.reward} 열매<br>
                    ${e.skill ? `<strong style="color: #f59e0b;">특성:</strong> ${skillText}` : ''}
                </div>
            </div>
        `;
    });

    // Round 3 Enemies
    ENEMY_TYPES_R3.forEach(e => {
        const skillText = e.skill ? skillNames[e.skill] || e.skill : '';
        encEnemiesContent.innerHTML += `
            <div style="background: rgba(0,0,0,0.3); border: 1px solid #475569; border-radius: 8px; padding: 15px; text-align: center; position: relative;">
                <span style="position: absolute; top: 5px; left: 5px; background: #60a5fa; color: #000; font-size: 0.7rem; font-weight: bold; padding: 2px 5px; border-radius: 3px;">3라운드</span>
                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${e.spriteId}.png" style="width: 60px; height: 60px;">
                <h4 style="margin: 5px 0; color: #f87171; font-size: 1.1rem;">${e.name}</h4>
                <div style="font-size: 0.85rem; color: #94a3b8; text-align: left; line-height: 1.4; margin-top: 10px;">
                    <strong style="color: #cbd5e1;">체력(HP):</strong> ${e.hp}<br>
                    <strong style="color: #cbd5e1;">이속:</strong> ${e.speed}<br>
                    <strong style="color: #cbd5e1;">피해량:</strong> ${e.dmg}<br>
                    <strong style="color: #cbd5e1;">보상:</strong> ${e.reward} 열매<br>
                    ${e.skill ? `<strong style="color: #f59e0b;">특성:</strong> ${skillText}` : ''}
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

const SHOP_ITEM_POOL = [
    { id: 'fire_stone', name: '불꽃의 돌', desc: '특정 포켓몬 진화에 사용', price: 150, icon: '🔥' },
    { id: 'water_stone', name: '물의 돌', desc: '특정 포켓몬 진화에 사용', price: 150, icon: '💧' },
    { id: 'leaf_stone', name: '풀의 돌', desc: '특정 포켓몬 진화에 사용', price: 150, icon: '🍃' },
    { id: 'thunder_stone', name: '천둥의 돌', desc: '특정 포켓몬 진화에 사용', price: 150, icon: '⚡' },
    { id: 'ice_stone', name: '얼음의 돌', desc: '특정 포켓몬 진화에 사용', price: 150, icon: '❄️' },
    { id: 'potion', name: '상처약', desc: '클릭 시 기지 체력을 50 회복', price: 50, icon: '🧪' },
    { id: 'rare_candy', name: '이상한 사탕', desc: '클릭 후 타워 선택 시 레벨업', price: 200, icon: '🍬' },
    { id: 'scope_lens', name: '초점렌즈', desc: '급소 확률 6% 증가 (총 10%)', price: 200, icon: '🔎' },
    { id: 'leftovers', name: '먹다남은 음식', desc: '해당 포켓몬이 적 처치 시 기지 체력 +1 회복', price: 250, icon: '🍎' },
    { id: 'enigma_berry', name: '의문열매', desc: '기지 체력 50% 이하 시 공격력 1.5배', price: 250, icon: '❓' },
    { id: 'life_orb', name: '생명의 구슬', desc: '공격력 1.2배 증가', price: 300, icon: '🔮' },
    { id: 'lum_berry', name: '리샘열매', desc: '상태이상 1회 즉시 해제 및 10초 면역', price: 200, icon: '🌿' },
    { id: 'choice_scarf', name: '구애스카프', desc: '공속 1.5배. 대상 변경 시 잠깐 딜레이', price: 300, icon: '🧣' },
    { id: 'keystone', name: '키스톤', desc: '메가 진화를 위한 신비한 돌 (1회 한정)', price: 500, icon: '🗝️' },
    { id: 'mega_stone_x', name: '메가리자몽X나이트', desc: '리자몽을 메가리자몽X로 진화 (키스톤 필요)', price: 400, icon: '🌑' },
    { id: 'mega_stone_y', name: '메가리자몽Y나이트', desc: '리자몽을 메가리자몽Y로 진화 (키스톤 필요)', price: 400, icon: '☀️' },
    { id: 'mega_stone_venusaur', name: '메가이상해꽃나이트', desc: '이상해꽃을 메가이상해꽃으로 진화 (키스톤 필요)', price: 400, icon: '🌺' },
    { id: 'mega_stone_blastoise', name: '메가거북왕나이트', desc: '거북왕을 메가거북왕으로 진화 (키스톤 필요)', price: 400, icon: '🐢' },
    { id: 'mega_stone_raichu_x', name: '메가라이츄X나이트', desc: '라이츄를 메가라이츄X로 진화 (키스톤 필요)', price: 400, icon: '⚡' },
    { id: 'mega_stone_raichu_y', name: '메가라이츄Y나이트', desc: '라이츄를 메가라이츄Y로 진화 (키스톤 필요)', price: 400, icon: '🌩️' },
    { id: 'mega_stone_lucario', name: '메가루카리오나이트', desc: '루카리오를 메가루카리오로 진화 (키스톤 필요)', price: 400, icon: '🥊' },
    { id: 'mega_stone_gengar', name: '메가팬텀나이트', desc: '팬텀을 메가팬텀으로 진화 (키스톤 필요)', price: 400, icon: '👻' },
    { id: 'mega_stone_alakazam', name: '메가후딘나이트', desc: '후딘을 메가후딘으로 진화 (키스톤 필요)', price: 400, icon: '🥄' },
    { id: 'mega_zeraora_nite', name: '메가제라오라나이트', desc: '제라오라를 메가제라오라로 진화 (키스톤 필요)', price: 400, icon: '⚡' }
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
            delBtn.innerHTML = '🗑️';
            delBtn.style.background = 'transparent';
            delBtn.style.border = 'none';
            delBtn.style.cursor = 'pointer';
            delBtn.style.padding = '0';
            delBtn.style.marginLeft = '10px';
            delBtn.title = '아이템 판매 (반환: 50열매)';
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
                    
                    visualEffects.push(new TextEffect(canvas.width / 2, canvas.height / 2, `체력 +50 회복!`, '#4ade80'));
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
                    const msg = itemInfo.id === 'rare_candy' ? '레벨업할 타워를 클릭하세요!' : '도구를 장착할 타워를 클릭하세요!';
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
        invSlots.innerHTML = '<p style="color: #64748b; font-size: 0.8rem; margin: 0;">가방이 비어있습니다.</p>';
    }
}

function getRandomShopItem() {
    let pool = SHOP_ITEM_POOL.filter(item => {
        if (item.id === 'keystone') {
            return inventory['keystone'] === 0 && !currentShopItems.some(i => i && i.id === 'keystone');
        }
        if (item.id === 'mega_zeraora_nite') {
            return window.zeraoraUnlocked; // 제라오라가 해금된 경우에만 상점에 등장
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
                구매 (${item.price}🍒)
            </button>
        `;
        
        const buyBtn = itemDiv.querySelector('button');
        buyBtn.addEventListener('click', () => {
            if (berries >= item.price) {
                berries -= item.price;
                
                shopBerriesDisplay.innerText = berries;
                
                // 인벤토리 증가
                inventory[item.id] = (inventory[item.id] || 0) + 1;
                renderInventory();
                
                // 시각적 효과
                visualEffects.push(new TextEffect(canvas.width / 2, canvas.height / 2, `${item.name} 획득!`, '#4ade80'));
                
                // 타워 UI 업데이트 (진화 버튼 갱신을 위함)
                if (selectedTower) updateUI();
                
                // 리필
                currentShopItems[index] = getRandomShopItem();
                renderShop(); // 다시 렌더링
            } else {
                alert('열매가 부족합니다!');
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
        name: '타입:널',
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/772.png',
        cost: 555,
        desc: '스턴/상태이상 면역의 강력한 보스! 처치 시 아군으로 합류합니다.'
    },
    {
        id: 'zeraora',
        name: '제라오라',
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/807.png',
        cost: 600,
        desc: '초고속 이동과 주변을 마비시키는 능력! 처치 시 아군으로 합류합니다.'
    }
];

function updateRaidUI() {
    const raidInfo = availableRaids[currentRaidIndex];
    raidBossIndicator.innerText = `${currentRaidIndex + 1} / ${availableRaids.length}`;
    raidBossImg.src = raidInfo.sprite;
    raidBossName.innerText = `${raidInfo.name} (비용: ${raidInfo.cost})`;
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
            alert('레이드는 2라운드부터 가능합니다!');
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
            alert('이미 레이드가 진행 중입니다!');
            return;
        }
        if (clearedRaidsThisRound.includes(raidInfo.id)) {
            alert('이미 이번 라운드에 클리어한 레이드입니다!');
            return;
        }
        if (berries < raidInfo.cost) {
            alert(`열매가 부족합니다! (필요: ${raidInfo.cost})`);
            return;
        }
        
        berries -= raidInfo.cost;
        
        raidMenu.style.display = 'none';
        
        // Start Raid
        isRaidActive = true;
        raidVirtualMaxHp = 10000;
        raidVirtualHp = raidVirtualMaxHp;
        
        renderBackgroundToOffscreen();
        visualEffects.push(new TextEffect(canvas.width/2, canvas.height/2, '전설 레이드 시작!', '#c084fc'));
        
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
        ctx.fillText(`레이드 가상 체력: ${Math.max(0, Math.floor(raidVirtualHp))} / ${raidVirtualMaxHp}`, 20, 30);
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

function saveUsers(users) {
    localStorage.setItem('pokemon_defense_users', JSON.stringify(users));
}

if (btnLogin) {
    btnLogin.addEventListener('click', () => {
        const id = loginId.value.trim();
        const pw = loginPw.value;
        if (!id || !pw) {
            alert('이름과 비밀번호를 입력해주세요.');
            return;
        }

        const users = loadUsers();
        if (users[id]) {
            if (users[id].password === pw) {
                // 로그인 성공
                currentUser = id;
                loginOverlay.style.display = 'none';
                userStatusBar.style.display = 'flex';
                userNameDisplay.innerText = currentUser;
                
                if (users[id].hasSeenTutorial) {
                    // 세이브 데이터가 있으면 불러오기
                    if (users[id].saveData) {
                        loadGame(users[id].saveData);
                    }
                    animate();
                } else {
                    // 첫 로그인이나 튜토리얼을 안 본 경우
                    tutOverlay.style.display = 'flex';
                }
            } else {
                alert('비밀번호가 틀렸습니다. 다시 확인해주세요.');
            }
        } else {
            // 회원가입
            users[id] = {
                password: pw,
                hasSeenTutorial: false,
                saveData: null
            };
            saveUsers(users);
            currentUser = id;
            loginOverlay.style.display = 'none';
            userStatusBar.style.display = 'flex';
            userNameDisplay.innerText = currentUser;
            
            // 신규 가입이므로 튜토리얼 물어보기
            tutOverlay.style.display = 'flex';
        }
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

// 튜토리얼 시작 시 seen 처리
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
// 튜토리얼 종료 버튼 오버라이드 (마지막 스텝에서)
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
        tutStep: tutStep
    };
}

function saveGame() {
    if (!currentUser) return;
    const users = loadUsers();
    if (users[currentUser]) {
        users[currentUser].saveData = serializeGameState();
        saveUsers(users);
        visualEffects.push(new TextEffect(canvas.width/2, canvas.height/2, '저장 완료!', '#22c55e'));
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
    tutStep = saveData.tutStep || 0;
    
    // UI 업데이트 (레이드 버튼)
    if (clearedRaidsThisRound.includes('type_null')) {
        const btn = document.getElementById('btn-build-typenull');
        if (btn) btn.style.display = 'flex';
    }
    if (window.zeraoraUnlocked) {
        const btn = document.getElementById('btn-build-zeraora');
        if (btn) btn.style.display = 'flex';
    }
    
    // 타워 복구
    towers.length = 0; // 초기화
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
    
    // 렌더링 업데이트
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
        saveGame(); // 로그아웃 전 자동 저장
        currentUser = null;
        location.reload();
    });
}
