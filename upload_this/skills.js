const skillsDB = [
  { id: 'sk1', name: '🧠 힌트 요정', desc: '즉시 정답에 가까운 강력한 힌트 제공', cd: 2, effect: 'hint', reqLv: 1 },
  { id: 'sk2', name: '🌟 경험치 부스트', desc: '다음 문제 정답 시 경험치 2배', cd: 3, effect: 'exp2x', reqLv: 2 },
  { id: 'sk3', name: '🔍 글자 수 힌트', desc: '정답이 몇 글자인지 (공백 포함) 알려줍니다.', cd: 3, effect: 'length_hint', reqLv: 3 },
  { id: 'sk4', name: '⚡ 번개 패스', desc: '문제를 즉시 정답 처리하고 몬스터 처치', cd: 5, effect: 'pass', reqLv: 5 },
  { id: 'sk5', name: '❤️ 부활의 주문', desc: '한 번 틀려도 오답 노트 기록 방어 및 재도전', cd: 4, effect: 'shield', reqLv: 6 },
  { id: 'sk6', name: '💰 더블 스코어', desc: '경쟁전(랭크 매치)에서 다음 정답 점수 2배', cd: 4, effect: 'rank_double', reqLv: 8 },
  { id: 'sk7', name: '🕒 시간 멈춤', desc: '경쟁전에서 상대 AI의 풀이 시간을 5초 멈춤', cd: 4, effect: 'time_stop', reqLv: 10 },
  { id: 'sk8', name: '🔥 파이어볼', desc: '몬스터에게 직접 대미지를 입혀 즉시 처치', cd: 4, effect: 'kill', reqLv: 12 },
  { id: 'sk9', name: '🎲 행운의 뽑기', desc: '사용 즉시 랜덤한 경험치 (10~50) 획득', cd: 3, effect: 'random_exp', reqLv: 15 },
  { id: 'sk10', name: '🕵️ 정답 살짝 보기', desc: '정답의 일부 문자를 가려서 힌트로 보여줍니다.', cd: 3, effect: 'peek_hint', reqLv: 18 },
  { id: 'sk11', name: '👼 수호 천사', desc: '틀렸을 때 깎이는 페널티(체력)를 무효화함', cd: 4, effect: 'no_penalty', reqLv: 20 },
  { id: 'sk12', name: '🌪️ 토네이도', desc: '문제를 랜덤한 다른 쉬운 문제로 교체', cd: 4, effect: 'reroll_easy', reqLv: 25 },
  { id: 'sk13', name: '📚 지식의 샘', desc: '해당 문제와 관련된 파이썬 개념 설명 팝업', cd: 2, effect: 'concept_hint', reqLv: 30 },
  { id: 'sk14', name: '🌟 빛의 속도', desc: '다음 문제 풀이 시 애니메이션 스킵 및 즉시 정답', cd: 5, effect: 'fast_pass', reqLv: 35 },
  { id: 'sk15', name: '💎 다이아몬드 피부', desc: '연속 3문제 동안 오답 페널티 면제', cd: 8, effect: 'shield_3', reqLv: 40 },
  { id: 'sk16', name: '🎯 핀포인트 힌트', desc: '정답에 들어가는 필수 기호 하나를 알려줍니다.', cd: 6, effect: 'symbol_hint', reqLv: 45 },
  { id: 'sk17', name: '🔮 예지력', desc: '다음 문제가 어떤 난이도인지 미리 알려줌', cd: 2, effect: 'forecast', reqLv: 50 },
  { id: 'sk18', name: '🏆 마스터의 가호', desc: '경쟁전 패배 시 점수 하락 방어', cd: 5, effect: 'rank_shield', reqLv: 60 },
  { id: 'sk19', name: '🌌 차원 이동', desc: '현재 진행 중인 일일 목표 즉시 완료', cd: 10, effect: 'quest_clear', reqLv: 75 },
  { id: 'sk20', name: '👑 신의 한 수', desc: '경쟁전에서 즉시 승리 판정', cd: 15, effect: 'rank_win', reqLv: 90 },
];

// window 객체에 바인딩하여 main.js에서 안전하게 접근하도록 수정
if (typeof window !== 'undefined') {
  window.skillsDB = skillsDB;
}
