// main.js - 파이썬 어드벤처 LMS 메인 로직 (UTF-8 정규화 및 종합 복원 완료)

// ==========================================
// 1. 글로벌 변수 및 초기화
// ==========================================
const $ = id => document.getElementById(id);

let user = {
  username: '',
  nickname: '게스트',
  level: 1,
  exp: 0,
  combo: 0,
  unlockedChapterId: 1,
  skills: ['sk1', 'sk2'], // 기본 장착 스킬
  reviewNotes: [],
  attempts: 0,
  correctCount: 0,
  rankedRating: 1000,
  dailyQuests: [
    { id: 'dq1', type: 'solve', desc: '학습 문제 3회 정답 맞추기', target: 3, current: 0, reward: 50, completed: false },
    { id: 'dq2', type: 'combo', desc: '3연속 콤보 달성하기', target: 3, current: 0, reward: 80, completed: false },
    { id: 'dq3', type: 'algo', desc: '알고리즘 마스터 실습 1회 해결', target: 1, current: 0, reward: 60, completed: false }
  ]
};

let editor = null;
let rankedEditor = null;
let bossEditor = null;
let algoEditors = {};

let pyodide = null;
let pyodideLoading = false;
let activeBuff = null; // 'exp2x', 'shield' 등
let cooldowns = {};

let currentChapter = null;
let currentRankedQ = null;
let playerScore = 0;
let aiScore = 0;
let rankedTimerId = null;
let rankedMatchActive = false;

let currentAlgoSection = null;

// 보스 레이드 전용 상태
let currentBossId = null;
let bossHp = 300;
let bossMaxHp = 300;
let playerHp = 100;
let playerMaxHp = 100;
let bossTimeLeft = 90;
let bossTimerId = null;
let bossQuestionsPool = [];
let currentBossQ = null;

const BOSSES_DB = {
  1: { name: '👑 킹 슬라임', maxHp: 300, timeLimit: 90, diff: 'easy', perGainedExp: 30, bonusExp: 200 },
  2: { name: '🤖 타락한 AI', maxHp: 500, timeLimit: 150, diff: 'medium', perGainedExp: 50, bonusExp: 350 },
  3: { name: '🐉 코드 드래곤', maxHp: 800, timeLimit: 200, diff: 'hard', perGainedExp: 80, bonusExp: 500 }
};

// ==========================================
// 2. 스토리지 저장 및 불러오기 (Save & Load)
// ==========================================
function saveState() {
  if (user && user.username) {
    localStorage.setItem(`py_save_${user.username}`, JSON.stringify(user));
    localStorage.setItem('py_current_user', user.username); // 세션 유지
  }
}

function loadState(username) {
  const data = localStorage.getItem(`py_save_${username}`);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      user = { ...user, ...parsed };
      localStorage.setItem('py_current_user', username); // 세션 유지
      updateNavUser();
      updateDashboard();
      return true; // 로그인 성공
    } catch (e) {
      console.error("데이터 파싱 실패:", e);
    }
  }
  return false; // 계정 없음
}

function updateNavUser() {
  const authGroup = $('nav-auth-buttons');
  const userInfo = $('nav-user-info');
  
  if (user && user.username) {
    if (authGroup) authGroup.classList.add('hidden');
    if (userInfo) {
      userInfo.classList.remove('hidden');
      $('disp-level').textContent = `Lv. ${user.level}`;
      $('disp-nickname').textContent = user.nickname || user.username;
    }
  } else {
    if (authGroup) authGroup.classList.remove('hidden');
    if (userInfo) userInfo.classList.add('hidden');
  }
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = $(screenId);
  if (target) {
    target.classList.add('active');
  }
  if (screenId === 'dashboard-screen') {
    updateDashboard();
  } else if (screenId === 'learn-screen') {
    if (editor && typeof editor.refresh === 'function') setTimeout(() => editor.refresh(), 50);
  } else if (screenId === 'ranked-screen') {
    if (rankedEditor && typeof rankedEditor.refresh === 'function') setTimeout(() => rankedEditor.refresh(), 50);
  } else if (screenId === 'boss-screen') {
    if (bossEditor && typeof bossEditor.refresh === 'function') setTimeout(() => bossEditor.refresh(), 50);
  }
}

function checkLevelUp() {
  const reqExp = user.level * 100;
  while (user.exp >= reqExp) {
    user.exp -= reqExp;
    user.level++;
    showAlert(`🎉 레벨 업! Lv.${user.level} 달성! 획득 스킬 포인트를 확인하세요!`);
  }
  updateNavUser();
  if ($('sidebar-level-disp')) $('sidebar-level-disp').textContent = `Lv. ${user.level}`;
  if ($('disp-exp')) $('disp-exp').textContent = user.exp;
  if ($('disp-max-exp')) $('disp-max-exp').textContent = user.level * 100;
  const fill = $('exp-fill');
  if (fill) {
    const pct = Math.min(100, Math.floor((user.exp / (user.level * 100)) * 100));
    fill.style.width = `${pct}%`;
  }
  // 대시보드 화면이 열려있다면(대시보드 바 업데이트용)
  if ($('dashboard-screen') && !$('dashboard-screen').classList.contains('hidden')) {
    updateDashboard();
  }
}

// ==========================================
// 3. 알림 (Alert) 및 UI 메시지 유틸리티
// ==========================================
function showAlert(msg) {
  const box = $('global-alert');
  if (!box) return;
  box.textContent = msg;
  box.classList.remove('hidden');
  box.style.animation = 'fadeIn 0.3s forwards';
  setTimeout(() => {
    box.classList.add('hidden');
  }, 3500);
}

// ==========================================
// 4. 대시보드 (Dashboard) & 통계 분석
// ==========================================
function updateDashboard() {
  if ($('dash-nickname-disp')) $('dash-nickname-disp').textContent = user.nickname || '게스트';
  if ($('dash-level-disp')) $('dash-level-disp').textContent = `Lv. ${user.level}`;
  
  const accuracy = user.attempts > 0 ? Math.round((user.correctCount / user.attempts) * 100) : 0;
  if ($('dash-accuracy')) $('dash-accuracy').textContent = `${accuracy}%`;
  if ($('dash-attempts')) $('dash-attempts').textContent = user.attempts;
  if ($('dash-correct')) $('dash-correct').textContent = user.correctCount;
  if ($('dash-combo')) $('dash-combo').textContent = user.combo;

  // 레벨 진행도 바 업데이트
  const reqExp = user.level * 100;
  if ($('dash-exp-text')) $('dash-exp-text').textContent = `${user.exp} / ${reqExp}`;
  if ($('dash-exp-bar')) {
    const expPct = Math.min(100, Math.max(0, (user.exp / reqExp) * 100));
    $('dash-exp-bar').style.width = `${expPct}%`;
  }

  // 랭크 육각형 및 레이팅 진행도 업데이트
  const rating = user.rankedRating || 1000;
  if ($('dash-rating-disp')) $('dash-rating-disp').textContent = rating;
  const hexEl = $('dash-rank-hex');
  const nameEl = $('dash-rank-name');
  if (hexEl) {
    let tierClass, tierEmoji, tierName, minRating, nextRating;
    if (rating < 1200)      { tierClass = 'tier-bronze';   tierEmoji = '🥉'; tierName = '브론즈'; minRating = 1000; nextRating = 1200; }
    else if (rating < 1400) { tierClass = 'tier-silver';   tierEmoji = '🥈'; tierName = '실버';   minRating = 1200; nextRating = 1400; }
    else if (rating < 1600) { tierClass = 'tier-gold';     tierEmoji = '🥇'; tierName = '골드';   minRating = 1400; nextRating = 1600; }
    else if (rating < 1800) { tierClass = 'tier-platinum'; tierEmoji = '💎'; tierName = '플래티넘'; minRating = 1600; nextRating = 1800; }
    else                    { tierClass = 'tier-diamond';  tierEmoji = '👑'; tierName = '다이아';   minRating = 1800; nextRating = 2000; }
    
    hexEl.className = `rank-hex ${tierClass}`;
    hexEl.innerHTML = `<span style="font-size:28px;line-height:1">${tierEmoji}</span>`;
    if (nameEl) nameEl.textContent = tierName;

    // 레이팅 바
    if ($('dash-rating-text')) $('dash-rating-text').textContent = `${rating} / ${nextRating}`;
    if ($('dash-rating-bar')) {
      let ratingPct = 100;
      if (nextRating > rating) {
        ratingPct = ((rating - minRating) / (nextRating - minRating)) * 100;
      }
      $('dash-rating-bar').style.width = `${Math.max(0, Math.min(100, ratingPct))}%`;
    }
  }

  renderDailyQuests();
  renderAnalysis();
  renderDashCurriculum();
}


function renderDailyQuests() {
  const container = $('dash-quest-list');
  if (!container) return;
  container.innerHTML = '';
  
  if (!user.dailyQuests || user.dailyQuests.length === 0) {
    container.innerHTML = '<span style="color: var(--text-muted); font-size: 16.5px; font-weight: 500; padding: 4px 0; display: inline-block;">진행 중인 일일 퀘스트가 없습니다.</span>';
    return;
  }
  
  user.dailyQuests.forEach(q => {
    const div = document.createElement('div');
    div.style.cssText = 'background: var(--panel-bg); border: 1px solid var(--glass-border); padding: 16px 22px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center;';
    const isDone = q.current >= q.target || q.completed;
    
    div.innerHTML = `
      <div>
        <div style="font-weight: 800; font-size: 17.5px; color: ${isDone ? 'var(--success)' : 'var(--text-bright)'};">
          ${isDone ? '✅ [완료] ' : '🏃 '}${q.desc}
        </div>
        <div style="font-size: 15px; color: var(--text-main); margin-top: 6px; font-weight: 600;">
          진행률: <strong style="color: var(--primary-hover); font-size: 16px;">${Math.min(q.current, q.target)} / ${q.target}</strong>
        </div>
      </div>
      <span class="badge" style="background: ${isDone ? 'var(--success-glow)' : 'var(--primary-glow)'}; color: #fff; font-weight: 900; font-size: 15px; padding: 8px 16px; border-radius: 10px;">
        +${q.reward} EXP
      </span>
    `;
    container.appendChild(div);
  });
}

function updateQuest(type, amount = 1) {
  if (!user.dailyQuests) return;
  user.dailyQuests.forEach(q => {
    if (q.type === type && !q.completed) {
      q.current += amount;
      if (q.current >= q.target) {
        q.completed = true;
        user.exp += q.reward;
        checkLevelUp();
        showAlert(`🎉 일일 퀘스트 완수!\n[${q.desc}] 달성으로 보너스 ${q.reward} EXP 획득!`);
      }
    }
  });
  saveState();
  updateDashboard();
}

function renderAnalysis() {
  const container = $('dash-analysis');
  if (!container) return;
  
  if (user.attempts === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); font-size: 14px; text-align: center; padding: 20px;">문제를 풀어보시면 실시간 정답률 및 난이도별 맞춤 학습 분석 결과가 제공됩니다. 🚀</p>';
    return;
  }
  
  const accuracy = Math.round((user.correctCount / user.attempts) * 100);
  const wrongCount = user.attempts - user.correctCount;
  
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; text-align: center;">
      <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 18px; border-radius: 14px;">
        <div style="font-size: 14.5px; color: var(--text-muted); font-weight: 700;">총 풀이 시도</div>
        <div style="font-size: 26px; font-weight: 900; color: var(--primary-hover); margin-top: 8px;">${user.attempts} 회</div>
      </div>
      <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 18px; border-radius: 14px;">
        <div style="font-size: 14.5px; color: var(--text-muted); font-weight: 700;">정답 / 오답</div>
        <div style="font-size: 22px; font-weight: 900; color: var(--text-main); margin-top: 8px;">
          <span style="color: var(--success);">${user.correctCount} 정답</span> / <span style="color: var(--danger);">${wrongCount} 오답</span>
        </div>
      </div>
      <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 18px; border-radius: 14px;">
        <div style="font-size: 14.5px; color: var(--text-muted); font-weight: 700;">종합 정답률</div>
        <div style="font-size: 26px; font-weight: 900; color: ${accuracy >= 70 ? 'var(--success)' : accuracy >= 40 ? 'var(--warning)' : 'var(--danger)'}; margin-top: 8px;">${accuracy}%</div>
      </div>
    </div>
    <div style="margin-top: 24px; text-align: center;">
      <p style="font-size: 15.5px; color: var(--text-main); margin-bottom: 14px; font-weight: 600;">💡 꾸준한 연습과 오답 복습이 프로그래밍 고수로 향하는 최적의 길입니다!</p>
      <button onclick="showScreen('learn-screen')" class="btn primary-btn small-btn" style="font-size: 15px; padding: 10px 20px;">⚔️ 이어서 파이썬 전투하러 가기</button>
    </div>
  `;
}

function renderDashCurriculum() {
  const list = $('dash-chapter-list');
  if (!list || !window.problems || window.problems.length === 0) return;
  list.innerHTML = '';
  
  window.problems.forEach(p => {
    const isUnlocked = p.id <= (user.unlockedChapterId || 1);
    const div = document.createElement('div');
    const diffLabel = p.diff === 'easy' ? '🌱 초급' : p.diff === 'medium' ? '🔥 중급' : '👑 고급';
    
    div.style.cssText = `
      background: var(--panel-bg); border: 1px solid var(--glass-border); 
      border-radius: 16px; padding: 18px 22px; cursor: ${isUnlocked ? 'pointer' : 'not-allowed'};
      opacity: ${isUnlocked ? '1' : '0.45'}; transition: all 0.2s;
      display: flex; flex-direction: column; justify-content: center; gap: 12px; min-height: 110px;
    `;
    
    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 14px; font-weight: 800; color: var(--text-muted);">${diffLabel}</span>
        <span style="font-size: 16px;">${isUnlocked ? '🔓' : '🔒'}</span>
      </div>
      <div style="font-size: 17px; font-weight: 800; color: var(--text-bright); line-height: 1.4; word-break: keep-all;">
        ${p.title}
      </div>
    `;
    
    if (isUnlocked) {
      div.onclick = () => {
        showScreen('learn-screen');
        loadChapter(p.id);
      };
      div.onmouseover = () => { div.style.borderColor = 'var(--primary-hover)'; div.style.transform = 'translateY(-2px)'; };
      div.onmouseout = () => { div.style.borderColor = 'var(--glass-border)'; div.style.transform = 'translateY(0)'; };
    } else {
      div.onclick = () => {
        showAlert('🔒 이전 단원을 먼저 클리어하여 잠금을 해제해주세요!');
      };
    }
    
    list.appendChild(div);
  });
}

// ==========================================
// 5. 파이썬 전투 학습 (Learn Screen & Pyodide)
// ==========================================
function renderSidebar() {
  const list = $('chapter-list');
  if (!list || !window.problems) return;
  list.innerHTML = '';
  
  window.problems.forEach(p => {
    const isUnlocked = p.id <= (user.unlockedChapterId || 1);
    const btn = document.createElement('button');
    btn.className = `chapter-btn ${currentChapter && currentChapter.id === p.id ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`;
    btn.textContent = `${isUnlocked ? '⚔️' : '🔒'} ${p.title}`;
    
    if (isUnlocked) {
      btn.onclick = () => loadChapter(p.id);
    } else {
      btn.onclick = () => showAlert('🔒 이전 단원을 먼저 완료하여 열쇠를 획득하세요!');
    }
    list.appendChild(btn);
  });
}

function loadChapter(id) {
  if (!window.problems) return;
  currentChapter = window.problems.find(p => p.id === id) || window.problems[0];
  
  if ($('concept-title')) $('concept-title').textContent = currentChapter.title;
  if ($('concept-desc')) $('concept-desc').innerHTML = currentChapter.desc;
  if ($('mission-desc')) $('mission-desc').textContent = currentChapter.q || '코드를 작성하여 몬스터를 공격하세요!';
  
  // 몬스터 정보 및 HP 바 리셋
  const monsterNames = ['🐛 버그 슬라임', '🦇 예외처리 박쥐', '🐺 인덱스 에러 늑대', '🤖 로직 드래곤', '👿 무한루프 마왕'];
  const mName = monsterNames[(currentChapter.id - 1) % monsterNames.length];
  if ($('monster-name')) $('monster-name').textContent = `${mName} (Lv.${currentChapter.id})`;
  if ($('monster-hp-fill')) $('monster-hp-fill').style.width = '100%';
  if ($('player-hp-fill')) $('player-hp-fill').style.width = '100%';
  
  // AI 설명 박스 초기화
  const aiBox = $('ai-explanation-box');
  if (aiBox) aiBox.classList.add('hidden');
  
  // 에디터 및 터미널 초기화
  if (editor) {
    editor.setValue('# 여기에 파이썬 정답 코드를 작성하세요\n');
    setTimeout(() => editor.refresh(), 50);
  }
  if ($('terminal-output')) {
    $('terminal-output').innerHTML = '<span style="color: var(--text-muted); font-style: italic;">코드를 실행하면 결과가 이곳에 표시됩니다...</span>';
  }
  
  renderSidebar();
  renderBattleSkills();
}

async function initPyodide() {
  if (pyodide || pyodideLoading) return;
  pyodideLoading = true;
  const term = $('terminal-output');
  if (term) term.innerHTML = '🐍 파이썬 런타임 엔진을 로딩 중입니다... 잠시만 기다려주세요.';
  try {
    pyodide = await window.loadPyodide();
    await pyodide.runPythonAsync(`import sys\nimport io`);
    if (term) term.innerHTML = '✅ 파이썬 엔진 로딩 완료! 코드를 실행해 보세요.';
  } catch (err) {
    console.error("Pyodide 로드 실패:", err);
    if (term) term.innerHTML = `❌ 파이썬 엔진 로딩 실패: ${err.message}`;
  } finally {
    pyodideLoading = false;
  }
}

function showDamage(target, amount) {
  const container = $('damage-container');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'damage-text';
  div.style.cssText = `
    position: absolute; font-size: 24px; font-weight: 900; color: ${target === 'monster' ? '#f43f5e' : '#f59e0b'};
    text-shadow: 0 0 10px rgba(0,0,0,0.5); animation: floatUp 0.8s ease-out forwards;
    left: ${target === 'monster' ? '30%' : '70%'}; top: 40%;
  `;
  div.textContent = `-${amount}!`;
  container.appendChild(div);
  setTimeout(() => div.remove(), 800);
}

function checkAnswer(output, stderr, exceptionMsg) {
  user.attempts++;
  const term = $('terminal-output');
  
  if (exceptionMsg || stderr) {
    user.combo = 0;
    saveState();
    updateDashboard();
    handleWrong(output, stderr, exceptionMsg);
    return;
  }
  
  const actual = (output || '').trim();
  const expected = (currentChapter && currentChapter.expectedOut ? currentChapter.expectedOut : '').trim();
  
  if (actual === expected && actual !== '') {
    // 정답 처리
    user.correctCount++;
    user.combo++;
    let expGain = (currentChapter && typeof currentChapter.customExp === 'number') ? currentChapter.customExp : 25;
    if (activeBuff === 'exp2x') {
      expGain *= 2;
      activeBuff = null;
      showAlert('✨ 경험치 2배 버프가 적용되어 보상을 두 배로 획득했습니다!');
    }
    user.exp += expGain;
    
    // UI 대미지 및 모션 연출
    if ($('monster-hp-fill')) $('monster-hp-fill').style.width = '0%';
    showDamage('monster', 100);
    
    // 다음 챕터 해금
    if (currentChapter.id >= user.unlockedChapterId) {
      user.unlockedChapterId = Math.min(window.problems.length, currentChapter.id + 1);
    }
    
    updateQuest('solve', 1);
    if (user.combo >= 3) updateQuest('combo', 1);
    
    checkLevelUp();
    saveState();
    updateDashboard();
    renderSidebar();
    
    if (term) {
      term.innerHTML = `${output}\n\n<span style="color: var(--success); font-weight: 800;">🎉 정답입니다! 몬스터를 훌륭히 처치했습니다! (+${expGain} EXP)</span>`;
    }
    
    setTimeout(() => {
      if (currentChapter.id < window.problems.length) {
        if (confirm(`🎉 정답입니다! 다음 단원(${currentChapter.id + 1}장)으로 진행하시겠습니까?`)) {
          loadChapter(currentChapter.id + 1);
        }
      } else {
        showAlert('🏆 모든 학습 문제를 클리어하셨습니다! 당신은 진정한 파이썬 어드벤처 마스터입니다!');
      }
    }, 1000);
    
  } else {
    // 출력 결과 불일치 (오답 처리)
    user.combo = 0;
    saveState();
    updateDashboard();
    handleWrong(output, '', '출력된 결과가 정답(기댓값)과 다릅니다.');
  }
}

function handleWrong(actualOut, stderr, exceptionMsg) {
  const term = $('terminal-output');
  let reason = '';
  if (exceptionMsg) reason = `[문법 에러 또는 불일치]\n${exceptionMsg}`;
  else if (stderr) reason = `[실행 중 오류 발생]\n${stderr}`;
  else reason = `[결과 불일치]\n기댓값: ${currentChapter.expectedOut.trim()}\n내 출력: ${(actualOut || '').trim()}`;
  
  if (activeBuff === 'shield' || activeBuff === 'shield_3' || activeBuff === 'no_penalty') {
    activeBuff = null;
    showAlert('🛡️ 부활의 주문(또는 수호 천사) 스킬이 발동하여 오답 페널티와 오답노트 기록을 방어했습니다!');
    if (term) term.innerHTML = `${actualOut || ''}\n\n<span style="color: var(--warning); font-weight: bold;">🛡️ 스킬 방어 성공! 다시 시도해 보세요.\n${reason}</span>`;
    return;
  }
  
  if ($('player-hp-fill')) {
    const currentW = parseInt($('player-hp-fill').style.width || '100');
    $('player-hp-fill').style.width = `${Math.max(0, currentW - 30)}%`;
  }
  showDamage('player', 30);
  
  if (term) {
    let wrongHtml = `${actualOut || ''}\n\n<div style="color: var(--danger); font-weight: 700; margin-bottom: 8px;">💥 오답입니다! 몬스터의 반격을 받았습니다.</div>`;
    wrongHtml += `<div id="wrong-question" style="font-size: 13px; margin-bottom: 8px; color: var(--text-color);">📝 이 문제를 오답 노트에 등록하시겠습니까?</div>`;
    wrongHtml += `<div id="wrong-actions" style="display: flex; gap: 8px; margin-bottom: 8px;">
  <button id="btn-add-wrong-yes" style="padding: 4px 8px; font-size: 12px; border-radius: 4px; cursor: pointer; border: none; background: var(--secondary-color); color: white;">⭕ 등록</button>
  <button id="btn-add-wrong-no" style="padding: 4px 8px; font-size: 12px; border-radius: 4px; cursor: pointer; border: 1px solid var(--border-color); background: transparent; color: var(--text-color);">❌ 거절</button>
  <button id="btn-show-explanation" style="padding: 4px 8px; font-size: 12px; border-radius: 4px; cursor: pointer; border: none; background: var(--info-color, #17a2b8); color: white;">💡 해설 보기</button>
</div>`;
    wrongHtml += `<div id="explanation-box" style="display: none; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; border: 1px solid var(--border-color); font-size: 13px;">
  <strong style="color: var(--highlight-color);">[해설 및 정답]</strong><br>
  <span style="color: var(--text-color);">기대했던 출력결과:</span><br>
  <pre style="margin: 4px 0 8px 0; color: #a6e22e; background: #222; padding: 4px; border-radius: 4px;">${currentChapter.expectedOut.trim()}</pre>
  <span style="color: var(--text-color);">정답 코드 예시:</span><br>
  <pre style="margin: 4px 0 0 0; color: #66d9ef; background: #222; padding: 4px; border-radius: 4px;">${currentChapter.hint || '해설 없음'}</pre>
</div>`;
    term.innerHTML = wrongHtml;

    const btnAddYes = document.getElementById('btn-add-wrong-yes');
    const btnAddNo = document.getElementById('btn-add-wrong-no');
    const wrongQuestion = document.getElementById('wrong-question');
    
    if (btnAddYes) {
      btnAddYes.onclick = () => {
        const exists = user.reviewNotes.some(r => r.qId === currentChapter.id);
        if (!exists) {
          user.reviewNotes.push({ qId: currentChapter.id, wrongCode: editor ? editor.getValue() : '', reason: reason, memo: '' });
          saveState();
          showAlert('📝 오답 노트에 문제가 안전하게 등록되었습니다!');
        } else {
          showAlert('이미 오답 노트에 등록된 문제입니다.');
        }
        btnAddYes.style.display = 'none';
        btnAddNo.style.display = 'none';
        if (wrongQuestion) wrongQuestion.style.display = 'none';
      };
    }
    
    if (btnAddNo) {
      btnAddNo.onclick = () => {
        btnAddYes.style.display = 'none';
        btnAddNo.style.display = 'none';
        if (wrongQuestion) wrongQuestion.style.display = 'none';
      };
    }

    const btnShowExpl = document.getElementById('btn-show-explanation');
    if (btnShowExpl) {
      btnShowExpl.onclick = () => {
        document.getElementById('explanation-box').style.display = 'block';
      };
    }
  }
}

// ==========================================
// 6. 스킬 (Skills) 관리 및 사용
// ==========================================
function renderBattleSkills() {
  const bar = $('battle-skills');
  if (!bar || !window.skillsDB) return;
  bar.innerHTML = '';
  
  if (!user.skills || user.skills.length === 0) {
    bar.innerHTML = '<span style="color: var(--text-muted); font-size: 13px;">장착된 스킬이 없습니다. [스킬 상점]에서 스킬을 장착하세요.</span>';
    return;
  }
  
  user.skills.forEach(skId => {
    const sk = window.skillsDB.find(s => s.id === skId);
    if (!sk) return;
    const cd = cooldowns[sk.id] || 0;
    const btn = document.createElement('button');
    btn.className = `skill-btn ${cd > 0 ? 'on-cd' : ''}`;
    btn.style.cssText = 'background: var(--panel-bg); border: 1px solid var(--border-color); color: var(--text-bright); padding: 8px 14px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px;';
    btn.innerHTML = `<span>${sk.name}</span> ${cd > 0 ? `<span style="background:var(--danger); color:#fff; font-size:11px; padding:2px 6px; border-radius:10px; font-weight:800;">${cd}턴</span>` : ''}`;
    
    if (cd > 0) {
      btn.onclick = () => showAlert(`⏳ [${sk.name}] 스킬 재사용 대기 중입니다. (${cd}번의 전투 필요)`);
    } else {
      btn.onclick = () => useSkill(sk);
    }
    bar.appendChild(btn);
  });
}

function useSkill(sk) {
  if (!currentChapter) return;
  cooldowns[sk.id] = sk.cd;
  
  switch (sk.effect) {
    case 'hint':
    case 'symbol_hint':
      showAlert(`💡 [${sk.name}] 힌트: ${currentChapter.hint || '기본 구조를 확인해 보세요!'}`);
      break;
    case 'length_hint':
      const len = (currentChapter.expectedOut || '').trim().length;
      showAlert(`📏 [글자 수 힌트]: 정답의 길이는 공백을 포함해 총 ${len} 글자입니다!`);
      break;
    case 'peek_hint':
      const out = (currentChapter.expectedOut || '').trim();
      const peek = out.length > 2 ? out.substring(0, 2) + '*'.repeat(out.length - 2) : out[0] + '*';
      showAlert(`🕵️ [정답 살짝 보기]: 정답의 앞 글자는 "${peek}" 입니다!`);
      break;
    case 'exp2x':
      activeBuff = 'exp2x';
      showAlert('🌟 [경험치 부스트]: 다음 문제 정답 맞춤 시 경험치 2배 획득!');
      break;
    case 'shield':
    case 'shield_3':
    case 'no_penalty':
    case 'rank_shield':
      activeBuff = 'shield';
      showAlert('🛡️ [방어 스킬 발동]: 다음 오답 발생 시 체력 저하 및 오답노트 등록을 1회 무효화합니다.');
      break;
    case 'pass':
    case 'fast_pass':
      showAlert('⚡ [번개 패스 발동!]: 문제 풀이 없이 즉시 몬스터를 격파하고 다음 단원으로 넘어갑니다!');
      checkAnswer((currentChapter.expectedOut || '').trim(), '', '');
      break;
    case 'kill':
      if ($('monster-hp-fill')) $('monster-hp-fill').style.width = '0%';
      showDamage('monster', 999);
      showAlert('🔥 [파이어볼 명중!]: 몬스터에게 극대미지를 입혀 즉시 처치했습니다!');
      checkAnswer((currentChapter.expectedOut || '').trim(), '', '');
      break;
    case 'random_exp':
      const randExp = Math.floor(Math.random() * 41) + 10; // 10~50
      user.exp += randExp;
      checkLevelUp();
      saveState();
      updateDashboard();
      showAlert(`🎲 [행운의 뽑기 당첨!]: 즉시 ${randExp} EXP 보너스를 획득했습니다!`);
      break;
    default:
      showAlert(`✨ [${sk.name}] 마법 주문을 성공적으로 시전했습니다!`);
  }
  renderBattleSkills();
}

function reduceCooldowns() {
  for (let k in cooldowns) {
    if (cooldowns[k] > 0) cooldowns[k]--;
  }
  renderBattleSkills();
}

function showSkillsOverlay() {
  const overlay = $('overlay-screen');
  const box = $('overlay-content-box');
  const title = $('overlay-title');
  const body = $('overlay-body');
  if (!overlay || !body) return;
  
  if (title) title.textContent = '⚡ 스킬 상점 및 장착 관리';
  body.innerHTML = '<p style="color:var(--text-muted); font-size:13px; margin-bottom:15px;">레벨이 올라감에 따라 강력한 마법 스킬이 해금됩니다. 최대 4개까지 전투 슬롯에 장착할 수 있습니다.</p>';
  
  const grid = document.createElement('div');
  grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; max-height: 60vh; overflow-y: auto; padding-right: 5px;';
  
  window.skillsDB.forEach(sk => {
    const isUnlocked = user.level >= sk.reqLv;
    const isEquipped = user.skills.includes(sk.id);
    const card = document.createElement('div');
    card.style.cssText = `
      background: var(--panel-bg); border: 2px solid ${isEquipped ? 'var(--primary)' : 'var(--glass-border)'};
      border-radius: 14px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between;
      opacity: ${isUnlocked ? '1' : '0.4'}; transition: all 0.2s;
    `;
    
    card.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="font-size: 15px; color: var(--text-bright);">${sk.name}</strong>
          <span style="font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; background: ${isUnlocked ? 'var(--glass-bg)' : 'rgba(244,63,94,0.2)'}; color: ${isUnlocked ? 'var(--primary-hover)' : 'var(--danger)'};">
            ${isUnlocked ? `재사용: ${sk.cd}턴` : `Lv.${sk.reqLv} 해금`}
          </span>
        </div>
        <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin-bottom: 15px;">
          ${sk.desc}
        </p>
      </div>
      <button class="btn ${isEquipped ? 'outline-btn' : 'primary-btn'} small-btn" style="width: 100%; font-size: 13px; font-weight: 700;" ${!isUnlocked ? 'disabled' : ''}>
        ${!isUnlocked ? '🔒 잠김' : isEquipped ? '✅ 장착 해제' : '⚔️ 스킬 장착'}
      </button>
    `;
    
    if (isUnlocked) {
      const btn = card.querySelector('button');
      btn.onclick = () => {
        if (isEquipped) {
          user.skills = user.skills.filter(id => id !== sk.id);
          showAlert(`🚫 [${sk.name}] 스킬 장착을 해제했습니다.`);
        } else {
          if (user.skills.length >= 4) {
            return showAlert('⚠️ 스킬은 최대 4개까지만 슬롯에 장착할 수 있습니다!');
          }
          user.skills.push(sk.id);
          showAlert(`⚔️ [${sk.name}] 스킬을 전투 슬롯에 장착했습니다!`);
        }
        saveState();
        showSkillsOverlay();
        renderBattleSkills();
      };
    }
    grid.appendChild(card);
  });
  
  body.appendChild(grid);
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
}

// ==========================================
// 7. 오답 노트 (Review Notes) 및 팝업
// ==========================================
function showReviewOverlay() {
  const overlay = $('overlay-screen');
  const title = $('overlay-title');
  const body = $('overlay-body');
  if (!overlay || !body) return;
  
  if (title) title.textContent = '📝 오답 노트 및 약점 극복';
  body.innerHTML = '';
  
  if (!user.reviewNotes || user.reviewNotes.length === 0) {
    body.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px 20px; font-size: 15px;">🎉 현재 오답 노트가 비어 있습니다! 전투에서 틀렸던 문제들이 이곳에 자동으로 기록됩니다.</p>';
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    return;
  }
  
  const list = document.createElement('div');
  list.style.cssText = 'display: flex; flex-direction: column; gap: 16px; max-height: 65vh; overflow-y: auto; padding-right: 5px;';
  
  user.reviewNotes.forEach((r, index) => {
    const q = window.problems.find(p => p.id === r.qId) || { title: '알 수 없는 단원', q: '문제 정보 없음', expectedOut: '' };
    const item = document.createElement('div');
    item.style.cssText = 'background: var(--panel-bg); border: 1px solid var(--border-color); border-radius: 14px; padding: 18px; position: relative;';
    
    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--glass-border); padding-bottom: 10px; margin-bottom: 12px;">
        <span style="font-weight: 800; font-size: 15px; color: var(--danger);">${q.title}</span>
        <div>
          <button class="btn primary-btn small-btn btn-retry-q" data-id="${q.id}" style="font-size: 12px; padding: 5px 12px; margin-right: 6px;">🎯 다시 도전</button>
          <button class="btn outline-btn small-btn btn-delete-q" data-index="${index}" style="font-size: 12px; padding: 5px 10px; color: var(--text-muted);">🗑️ 삭제</button>
        </div>
      </div>
      <div style="font-size: 14px; font-weight: 700; color: var(--text-bright); margin-bottom: 10px;">❓ 문제: ${q.q}</div>
      <div style="background: rgba(0,0,0,0.25); padding: 10px; border-radius: 8px; font-family: monospace; font-size: 12px; margin-bottom: 10px; color: #fca5a5;">
        <strong>내 오답 코드:</strong><br>${r.wrongCode || '# 기록된 코드가 없습니다.'}
      </div>
      <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
        <strong style="color: #f59e0b;">오답 사유:</strong><br>${(r.reason || '').replace(/\n/g, '<br>')}
      </div>
      <textarea placeholder="💡 문제 해결을 위한 깨달음이나 메모를 남겨보세요..." style="width: 100%; height: 55px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; padding: 10px; font-size: 13px; color: var(--text-main); resize: none; font-family: inherit;">${r.memo || ''}</textarea>
    `;
    
    const retryBtn = item.querySelector('.btn-retry-q');
    retryBtn.onclick = () => {
      overlay.style.display = 'none';
      showScreen('learn-screen');
      loadChapter(q.id);
    };
    
    const delBtn = item.querySelector('.btn-delete-q');
    delBtn.onclick = () => {
      user.reviewNotes.splice(index, 1);
      saveState();
      showReviewOverlay();
      showAlert('🗑️ 오답 노트에서 기록을 삭제했습니다.');
    };
    
    const memoArea = item.querySelector('textarea');
    memoArea.onchange = () => {
      r.memo = memoArea.value.trim();
      saveState();
      showAlert('💾 오답 노트 메모가 안전하게 저장되었습니다.');
    };
    
    list.appendChild(item);
  });
  
  body.appendChild(list);
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
}

function showReviewConfirmPopup(chapter, wrongCode, reason) {
  const popup = $('review-confirm-popup');
  const text = $('review-confirm-text');
  if (!popup || !text) return;
  
  // 이미 있는지 확인
  const exists = user.reviewNotes.some(r => r.qId === chapter.id);
  if (exists) return; // 이미 기록된 문제면 조용히 리턴
  
  text.innerHTML = `이 문제(<strong>${chapter.title}</strong>)를 오답 노트에 등록하여 나중에 다시 복습할까요?`;
  popup.classList.remove('hidden');
  
  const yesBtn = $('btn-review-confirm-yes');
  const noBtn = $('btn-review-confirm-no');
  
  if (yesBtn) {
    yesBtn.onclick = () => {
      user.reviewNotes.push({ qId: chapter.id, wrongCode, reason, memo: '' });
      saveState();
      popup.classList.add('hidden');
      showAlert('📝 오답 노트에 문제가 안전하게 등록되었습니다!');
    };
  }
  if (noBtn) {
    noBtn.onclick = () => {
      popup.classList.add('hidden');
    };
  }
}

// ==========================================
// 8. 경쟁전 (Ranked Match Logic)
// ==========================================
function getTierInfo(rating) {
  if (rating < 1200) return { name: '🥉 브론즈', diff: 'easy', aiInterval: 26000 };
  if (rating < 1400) return { name: '🥈 실버', diff: 'easy', aiInterval: 23000 };
  if (rating < 1600) return { name: '🥇 골드', diff: 'medium', aiInterval: 20000 };
  if (rating < 1800) return { name: '💎 플래티넘', diff: 'medium', aiInterval: 17000 };
  return { name: '👑 다이아몬드', diff: 'hard', aiInterval: 14000 };
}

function updateRankedLobby() {
  const tier = getTierInfo(user.rankedRating || 1000);
  if ($('ranked-tier-disp')) $('ranked-tier-disp').textContent = tier.name;
  if ($('ranked-rating-disp')) $('ranked-rating-disp').textContent = user.rankedRating || 1000;
  if ($('ranked-header')) $('ranked-header').classList.remove('hidden');
  if ($('ranked-arena')) $('ranked-arena').classList.add('hidden');
}

function initRankedEditor() {
  if (!rankedEditor && $('ranked-code-editor')) {
    rankedEditor = CodeMirror.fromTextArea($('ranked-code-editor'), {
      mode: 'python',
      theme: 'dracula',
      lineNumbers: true,
      indentUnit: 4
    });
  }
}

function updateRankedScores() {
  if ($('r-score-player')) $('r-score-player').textContent = playerScore;
  if ($('r-score-ai')) $('r-score-ai').textContent = aiScore;
}

function nextRankedQuestion() {
  if (!window.problems) return;
  const tier = getTierInfo(user.rankedRating || 1000);
  const pool = window.problems.filter(p => p.diff === tier.diff) || window.problems;
  currentRankedQ = pool[Math.floor(Math.random() * pool.length)] || window.problems[0];
  
  if ($('r-question-title')) $('r-question-title').textContent = `🏆 경쟁전 문제: ${currentRankedQ.title}`;
  if ($('r-question-desc')) $('r-question-desc').innerHTML = currentRankedQ.desc;
  if ($('r-question-text')) $('r-question-text').textContent = currentRankedQ.q;
  if ($('r-terminal-output')) $('r-terminal-output').textContent = '빠른 스피드로 코드를 완성하고 제출하세요!';
  
  if (rankedEditor) {
    rankedEditor.setValue('# 여기에 정답을 입력하고 스피드 공격 버튼을 클릭하세요!\n');
    setTimeout(() => rankedEditor.refresh(), 50);
  }
}

function endRankedMatch(isWin) {
  rankedMatchActive = false;
  if (rankedTimerId) clearInterval(rankedTimerId);
  
  if (isWin) {
    user.rankedRating = (user.rankedRating || 1000) + 50;
    user.exp += 150;
    showAlert('🏆 경쟁전 승리! 상냥한 AI를 제쳤습니다! (+50 레이팅, +150 EXP)');
  } else {
    user.rankedRating = Math.max(800, (user.rankedRating || 1000) - 25);
    showAlert('💥 아쉬운 패배! AI가 먼저 5문제를 도달했습니다. (-25 레이팅)');
  }
  checkLevelUp();
  saveState();
  updateRankedLobby();
}

// ==========================================
// 9. 알고리즘 마스터 (Algorithm Master)
// ==========================================
function showAlgoScreen() {
  showScreen('algo-screen');
  const nav = $('algo-chapter-nav');
  if (!nav || typeof ALGO_CHAPTERS === 'undefined') return;
  nav.innerHTML = '';
  
  ALGO_CHAPTERS.forEach((ch, idx) => {
    const header = document.createElement('div');
    header.style.cssText = 'font-size: 13px; font-weight: 800; color: var(--text-muted); margin: 12px 0 6px 4px;';
    header.textContent = `${ch.icon || '📘'} ${ch.title}`;
    nav.appendChild(header);
    
    ch.sections.forEach(sec => {
      const btn = document.createElement('button');
      btn.className = 'chapter-btn';
      btn.style.cssText = 'width: 100%; text-align: left; padding: 10px 14px; margin-bottom: 4px; border-radius: 10px; border: none; background: transparent; color: var(--text-main); cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 8px;';
      btn.innerHTML = `<span>${sec.icon || '💡'}</span> <span>${sec.title}</span>`;
      btn.onclick = () => loadAlgoSection(ch, sec, btn);
      nav.appendChild(btn);
    });
  });
  
  // 첫 챕터 첫 섹션 자동 로드
  if (ALGO_CHAPTERS[0] && ALGO_CHAPTERS[0].sections[0]) {
    loadAlgoSection(ALGO_CHAPTERS[0], ALGO_CHAPTERS[0].sections[0], nav.querySelector('.chapter-btn'));
  }
}

function loadAlgoSection(ch, sec, btnElement) {
  currentAlgoSection = sec;
  document.querySelectorAll('#algo-chapter-nav .chapter-btn').forEach(b => b.style.background = 'transparent');
  if (btnElement) btnElement.style.background = 'var(--panel-bg)';
  
  if ($('algo-section-badge')) $('algo-section-badge').textContent = sec.id;
  if ($('algo-section-title')) $('algo-section-title').textContent = sec.title;
  if ($('algo-progress-text')) $('algo-progress-text').textContent = `${ch.title} > ${sec.title}`;
  
  // 개념 설명 로드
  if ($('algo-concept-body')) $('algo-concept-body').innerHTML = sec.concept || '개념 설명이 준비 중입니다.';
  if ($('algo-ai-box')) $('algo-ai-box').classList.add('hidden');
  
  // 예제 목록 로드
  const exList = $('algo-examples-list');
  if (exList) {
    exList.innerHTML = '';
    (sec.examples || []).forEach((ex, i) => {
      const card = document.createElement('div');
      card.style.cssText = 'background: var(--panel-bg); border: 1px solid var(--border-color); border-radius: 14px; padding: 20px; margin-bottom: 20px;';
      card.innerHTML = `
        <h4 style="font-size: 16px; color: var(--primary-hover); margin-bottom: 10px;">📌 예제 ${i + 1}: ${ex.title}</h4>
        <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6; margin-bottom: 15px;">${ex.explanation}</p>
        <pre style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); padding: 15px; border-radius: 10px; overflow-x: auto; font-family: monospace; color: #a7f3d0; font-size: 13px; line-height: 1.5;">${ex.code}</pre>
        <div style="margin-top: 12px; font-size: 13px; font-weight: 700; color: var(--text-main);">
          출력 결과: <code style="background: var(--glass-bg); padding: 3px 8px; border-radius: 6px; color: var(--success);">${ex.expectedOut}</code>
        </div>
      `;
      exList.appendChild(card);
    });
  }
  
  // 실습 문제 로드
  const prList = $('algo-practice-list');
  if (prList) {
    prList.innerHTML = '';
    (sec.problems || []).forEach((pr, i) => {
      const card = document.createElement('div');
      card.style.cssText = 'background: var(--panel-bg); border: 1px solid var(--border-color); border-radius: 14px; padding: 20px; margin-bottom: 20px;';
      const taId = `algo-editor-${pr.id}`;
      const resId = `algo-res-${pr.id}`;
      
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h4 style="font-size: 16px; color: var(--warning);">${pr.title}</h4>
          <span style="font-size: 12px; color: var(--text-muted);">기댓값: <strong>${pr.expectedOut}</strong></span>
        </div>
        <p style="font-size: 14px; color: var(--text-main); margin-bottom: 15px;">${pr.description}</p>
        <div style="border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; margin-bottom: 12px;">
          <textarea id="${taId}">${pr.starterCode || ''}</textarea>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <button class="btn outline-btn small-btn" onclick="alert('💡 힌트: ' + '${pr.hint}')">💡 힌트 보기</button>
          <button class="btn primary-btn small-btn" onclick="runAlgoPractice('${pr.id}', '${pr.expectedOut}')">▶ 실습 코드 실행</button>
        </div>
        <pre id="${resId}" style="margin-top: 15px; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 8px; font-family: monospace; font-size: 13px; min-height: 40px; color: var(--text-main);">코드를 수정하고 위 실행 버튼을 클릭해 보세요.</pre>
      `;
      prList.appendChild(card);
      
      // CodeMirror 초기화 (DOM 마운트 후)
      setTimeout(() => {
        const ta = document.getElementById(taId);
        if (ta && typeof CodeMirror !== 'undefined') {
          algoEditors[pr.id] = CodeMirror.fromTextArea(ta, {
            mode: 'python',
            theme: 'dracula',
            lineNumbers: true,
            indentUnit: 4
          });
        }
      }, 50);
    });
  }
}

async function runAlgoPractice(probId, expectedOut) {
  const resEl = $(`algo-res-${probId}`);
  const ed = algoEditors[probId];
  if (!ed || !resEl) return;
  
  const code = ed.getValue();
  resEl.innerHTML = '⚡ 파이썬 코드 실행 및 판정 중...';
  
  if (!pyodide) {
    await initPyodide();
  }
  
  try {
    await pyodide.runPythonAsync(`sys.stdout = io.StringIO()\nsys.stderr = io.StringIO()`);
    await pyodide.runPythonAsync(code);
    const stdout = await pyodide.runPythonAsync("sys.stdout.getvalue()");
    const stderr = await pyodide.runPythonAsync("sys.stderr.getvalue()");
    
    if (stderr) {
      resEl.innerHTML = `<span style="color: var(--danger); font-weight: 700;">[실행 오류]\n${stderr}</span>`;
      return;
    }
    
    const actual = (stdout || '').trim();
    if (actual === (expectedOut || '').trim()) {
      resEl.innerHTML = `${stdout}\n\n<span style="color: var(--success); font-weight: 800;">✨ 정답입니다! 훌륭하게 실습을 완료했습니다! (+50 EXP)</span>`;
      
      // 실습문제 맞으면 코드를 초기 상태(starterCode)로 리셋
      let starterCode = '';
      if (window.ALGO_CHAPTERS) {
        for (const chap of window.ALGO_CHAPTERS) {
          for (const sec of chap.sections) {
            const pr = (sec.problems || []).find(p => p.id === probId);
            if (pr) { starterCode = pr.starterCode || ''; break; }
          }
          if (starterCode) break;
        }
      }
      ed.setValue(starterCode);

      user.exp += 50;
      updateQuest('algo', 1);
      checkLevelUp();
      saveState();
    } else {
      resEl.innerHTML = `${stdout}\n\n<span style="color: var(--danger); font-weight: 700;">❌ 결과 불일치: 내 출력 [${actual}] vs 정답 [${expectedOut.trim()}]</span>`;
    }
  } catch (err) {
    resEl.innerHTML = `<span style="color: var(--danger); font-weight: 700;">[문법 오류 발생]\n${err.message}</span>`;
  }
}

// ==========================================
// 10. AI 튜터 (OpenAI API 통신) - 구문 복원 완료!
// ==========================================
async function requestAIExplanation() {
  const aiBox = $('ai-explanation-box');
  if (!aiBox) return;
  aiBox.classList.remove('hidden');
  aiBox.innerHTML = '<strong>🤖 AI 파이썬 선생님</strong> <span class="ai-typing">잠시만 기다려주세요! 친절한 설명을 생각하는 중입니다... 💭</span>';
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = currentChapter ? currentChapter.desc : "";
  const cleanDesc = tempDiv.textContent || tempDiv.innerText || "";
  const title = currentChapter ? currentChapter.title : "기본 파이썬 개념";
  
  const prompt = `너는 초등학생과 코딩 초보자를 가르치는 세상에서 제일 친절한 파이썬 AI 선생님이야!
지금 배우는 단원 제목은 "${title}"이고 기본 설명은 "${cleanDesc}"이야.
학습자가 쉽게 이해할 수 있도록 일상생활의 재미있는 비유(마법, 요리, 게임 등)를 곁들여 3~4문장으로 다정하게 설명해줘.`;

  // 1단계: Vercel 서버리스 API 호출 시도
  let success = false;
  try {
    const res = await fetch('/api/ask-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, type: 'chapter' })
    });
    
    if (res.ok) {
      const data = await res.json();
      const reply = data.choices[0].message.content.replace(/\n/g, '<br>');
      aiBox.innerHTML = `<strong>🤖 AI 파이썬 선생님의 다정한 보강 설명:</strong><br><br><div style="font-size: 14px; line-height: 1.7;">${reply}</div>`;
      success = true;
    } else {
      const errData = await res.json().catch(() => ({}));
      console.warn('서버리스 API 오류:', errData.error?.message || res.statusText);
    }
  } catch (err) {
    console.warn('서버리스 API 호출 실패 (로컬 구동 또는 네트워크 에러):', err.message);
  }

  // 2단계: 실패 시 브라우저 로컬 스토리지 키 폴백 작동
  if (!success) {
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
      aiBox.innerHTML = `<strong>🤖 AI 파이썬 선생님:</strong><br><br><span style="color: var(--danger);">🔑 API 키 설정이 필요합니다. 우측 상단의 팝업 창에 개인 OpenAI API 키를 입력해주세요.</span>`;
      if ($('overlay-apikey')) $('overlay-apikey').classList.remove('hidden');
      return;
    }
    
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
          temperature: 0.7
        })
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP 에러: ${res.status}`);
      }
      
      const data = await res.json();
      const reply = data.choices[0].message.content.replace(/\n/g, '<br>');
      aiBox.innerHTML = `<strong>🤖 AI 파이썬 선생님의 다정한 보강 설명 (개인 키 사용):</strong><br><br><div style="font-size: 14px; line-height: 1.7;">${reply}</div>`;
    } catch (err) {
      if (err.message.includes('API key') || err.message.includes('401')) {
        aiBox.innerHTML = `<strong>🤖 AI 파이썬 선생님:</strong><br><br><span style="color: var(--danger);">🔑 입력한 API 키가 올바르지 않습니다. 우측 상단 설정 팝업에서 다시 확인해주세요!</span>`;
        localStorage.removeItem('openai_api_key');
        setTimeout(() => { if ($('overlay-apikey')) $('overlay-apikey').classList.remove('hidden'); }, 1500);
      } else {
        aiBox.innerHTML = `<strong>🤖 AI 파이썬 선생님:</strong><br><br><span style="color: var(--danger);">⚠️ 통신 중 오류가 발생했습니다: ${err.message}</span>`;
      }
    }
  }
}

// 알고리즘 마스터 전용 AI 튜터 (이전 구문 붕괴 오류 완벽 해결)
async function requestAlgoAIExplanation() {
  const aiBox = $('algo-ai-box');
  const aiContent = $('algo-ai-content');
  if (!aiBox || !aiContent) return;
  
  aiBox.classList.remove('hidden');
  aiContent.innerHTML = '<span class="ai-typing">🤖 AI 선생님이 알고리즘 개념을 분석하며 답변을 준비 중입니다... 💭</span>';
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = currentAlgoSection ? currentAlgoSection.concept : "";
  const cleanConcept = tempDiv.textContent || tempDiv.innerText || "";
  const title = currentAlgoSection ? currentAlgoSection.title : "알고리즘 개념";
  
  const prompt = `너는 초보 프로그래머를 위한 최고의 친절한 알고리즘 멘토 AI야!
지금 학습자가 배우고 있는 주제는 "${title}"이고, 기본 개념은 다음과 같아: "${cleanConcept}".
이 알고리즘이 왜 유용한지, 일상에서 볼 수 있는 쉬운 문제 해결 사례나 팁을 들어 3~4문장으로 명확하고 친근하게 설명해줘.`;

  // 1단계: Vercel 서버리스 API 호출 시도
  let success = false;
  try {
    const res = await fetch('/api/ask-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, type: 'algo' })
    });
    
    if (res.ok) {
      const data = await res.json();
      const reply = data.choices[0].message.content.replace(/\n/g, '<br>');
      aiContent.innerHTML = `<div style="font-size: 14px; line-height: 1.7; color: var(--text-main);">${reply}</div>`;
      success = true;
    } else {
      const errData = await res.json().catch(() => ({}));
      console.warn('서버리스 API 오류:', errData.error?.message || res.statusText);
    }
  } catch (err) {
    console.warn('서버리스 API 호출 실패 (로컬 구동 또는 네트워크 에러):', err.message);
  }

  // 2단계: 실패 시 브라우저 로컬 스토리지 키 폴백 작동
  if (!success) {
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
      aiContent.innerHTML = `<span style="color: var(--danger);">🔑 API 키 설정이 필요합니다. 우측 상단의 팝업 창에 개인 OpenAI API 키를 입력해주세요.</span>`;
      if ($('overlay-apikey')) $('overlay-apikey').classList.remove('hidden');
      return;
    }
    
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 350,
          temperature: 0.7
        })
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP 에러: ${res.status}`);
      }
      
      const data = await res.json();
      const reply = data.choices[0].message.content.replace(/\n/g, '<br>');
      aiContent.innerHTML = `<div style="font-size: 14px; line-height: 1.7; color: var(--text-main);">${reply} (개인 키 사용)</div>`;
    } catch (err) {
      if (err.message.includes('API key') || err.message.includes('401')) {
        aiContent.innerHTML = `<span style="color: var(--danger);">🔑 설정된 OpenAI API 키가 유효하지 않습니다. 설정 팝업에서 올바른 API 키를 등록해주세요!</span>`;
        localStorage.removeItem('openai_api_key');
        setTimeout(() => { if ($('overlay-apikey')) $('overlay-apikey').classList.remove('hidden'); }, 1500);
      } else {
        aiContent.innerHTML = `<span style="color: var(--danger);">⚠️ AI 선생님과 대화 중 오류가 발생했습니다: ${err.message}</span>`;
      }
    }
  }
}

// AI 추가 문제 생성 (난이도별 조절)
async function generateAdditionalProblem(level) {
  if (!currentChapter) return showAlert('⚠️ 먼저 학습할 단원을 선택해주세요.');
  
  const aiBox = $('ai-explanation-box');
  if (!aiBox) return;
  aiBox.classList.remove('hidden');
  
  let levelText = "비슷한 난이도의 실습";
  let expReward = 25;
  let tag = "[AI 유사]";
  if (level === 'easy') {
    levelText = "더 쉬운 기초 입문용";
    expReward = 15;
    tag = "[AI 쉬움]";
  } else if (level === 'hard') {
    levelText = "한 단계 심화된 응용/도전";
    expReward = 40;
    tag = "[AI 도전]";
  }
  
  aiBox.innerHTML = `<strong>🎲 AI 맞춤 문제 생성기</strong> <span class="ai-typing">현재 단원의 개념을 바탕으로 <strong>${levelText}</strong> 문제를 만들고 있습니다... (보상: ${expReward} EXP) 💭</span>`;
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = currentChapter.desc || "";
  const cleanDesc = tempDiv.textContent || tempDiv.innerText || "";
  
  const prompt = `너는 최고의 파이썬 코딩 선생님이야.
학습자가 현재 배우는 단원은 "${currentChapter.title}"이고, 기본 문제 내용은 "${currentChapter.q}" (기댓값: "${currentChapter.expectedOut}")이야.
학습자를 위해 이 단원의 핵심 개념을 유지하면서 **${levelText}** 추가 문제를 딱 1개 새로 만들어줘.
응답은 무조건 다른 설명 없이 아래 JSON 형식으로만 작성해야 해:
{
  "title": "새로운 문제 제목 (예: 01. 귀여운 고양이 출력하기)",
  "desc": "<div class='rich-desc'>이 문제에 대한 친근하고 명확한 개념 설명과 안내 (HTML 간략 사용 가능)</div>",
  "q": "학습자가 풀어야 할 구체적인 실습 미션 (예: '고양이'를 출력하세요.)",
  "expectedOut": "터미널 실행 시 일치해야 하는 기댓값 문자열 (반복문/줄바꿈 주의, 끝에 \\n 포함)",
  "hint": "힌트가 될 파이썬 코드 (예: print('고양이'))"
}`;

  let success = false;
  let jsonStr = "";
  
  // 1단계: Vercel 서버리스 API 호출 시도
  try {
    const res = await fetch('/api/ask-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, type: 'problem_gen' })
    });
    
    if (res.ok) {
      const data = await res.json();
      jsonStr = data.choices[0].message.content;
      success = true;
    } else {
      console.warn('서버리스 API 문제 생성 실패:', res.statusText);
    }
  } catch (err) {
    console.warn('서버리스 API 호출 오류:', err.message);
  }

  // 2단계: 실패 시 브라우저 로컬 스토리지 키 폴백 작동
  if (!success) {
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
      aiBox.innerHTML = `<strong>🎲 AI 맞춤 문제 생성기:</strong><br><br><span style="color: var(--danger);">🔑 API 키 설정이 필요합니다. 우측 상단의 팝업 창에 개인 OpenAI API 키를 입력해주세요.</span>`;
      if ($('overlay-apikey')) $('overlay-apikey').classList.remove('hidden');
      return;
    }
    
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 800,
          temperature: 0.7
        })
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP 에러: ${res.status}`);
      }
      
      const data = await res.json();
      jsonStr = data.choices[0].message.content;
      success = true;
    } catch (err) {
      if (err.message.includes('API key') || err.message.includes('401')) {
        aiBox.innerHTML = `<strong>🎲 AI 맞춤 문제 생성기:</strong><br><br><span style="color: var(--danger);">🔑 입력한 API 키가 올바르지 않습니다. 설정 팝업에서 다시 확인해주세요!</span>`;
        localStorage.removeItem('openai_api_key');
        setTimeout(() => { if ($('overlay-apikey')) $('overlay-apikey').classList.remove('hidden'); }, 1500);
      } else {
        aiBox.innerHTML = `<strong>🎲 AI 맞춤 문제 생성기:</strong><br><br><span style="color: var(--danger);">⚠️ 문제 생성 중 오류가 발생했습니다: ${err.message}</span>`;
      }
      return;
    }
  }

  if (success && jsonStr) {
    try {
      const cleanJson = jsonStr.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
      const problemData = JSON.parse(cleanJson);
      
      // 기존 단원의 원래 개념 설명을 손상 없이 그대로 유지하기 위해 window.problems에서 원본 조회
      const baseProblem = (window.problems || []).find(p => p.id === currentChapter.id) || currentChapter;
      const originalDesc = baseProblem.desc || "";
      const aiAddedDesc = `<div style="margin: 24px 0 10px 0; border-top: 1px dashed var(--primary-glow); padding-top: 18px; background: rgba(255,255,255,0.02); border-radius: 8px;">
        <h4 style="font-size: 15px; color: #e879f9; margin: 0 0 10px 0; font-weight: 800;">${tag} AI 추가 문제 설명 & 가이드</h4>
        <div style="font-size: 14.5px; line-height: 1.6; color: var(--text-main); margin-bottom: 14px;">${problemData.desc || 'AI가 출제한 맞춤형 실습 문제입니다.'}</div>
        <div style="background: rgba(16, 185, 129, 0.1); padding: 8px 12px; border-radius: 6px; display: inline-block; border: 1px solid rgba(16, 185, 129, 0.3);">
          <span style="color: #10b981; font-weight: 800; font-size: 13px;">💡 정답 보상: ${expReward} EXP</span> 
          <span style="font-size: 12px; color: var(--text-muted); margin-left: 6px;">(💡 원래 기본 문제로 돌리려면 좌측 단원 목록에서 다시 선택하세요)</span>
        </div>
      </div>`;

      // 현재 챕터 객체 교체 (기본 단원 목록 데이터는 보호하기 위해 복사본 사용)
      currentChapter = {
        ...currentChapter,
        title: `${tag} ${problemData.title || 'AI 생성 실습 문제'}`,
        desc: `${originalDesc}\n${aiAddedDesc}`,
        q: problemData.q || '코드를 작성하여 실습을 완성하세요!',
        expectedOut: problemData.expectedOut || '\n',
        hint: problemData.hint || '힌트 없음',
        customExp: expReward
      };
      
      if ($('concept-title')) $('concept-title').textContent = currentChapter.title;
      if ($('concept-desc')) $('concept-desc').innerHTML = currentChapter.desc;
      if ($('mission-desc')) $('mission-desc').textContent = currentChapter.q;
      
      if (editor) {
        editor.setValue('# AI가 출제한 맞춤형 실습 문제입니다!\n# 여기에 정답 코드를 작성하세요\n');
        setTimeout(() => editor.refresh(), 50);
      }
      if ($('terminal-output')) {
        $('terminal-output').innerHTML = '<span style="color: var(--text-muted); font-style: italic;">✨ AI 추가 문제 출제 완료! 코드를 실행해 결과를 확인해보세요...</span>';
      }
      if ($('monster-hp-fill')) $('monster-hp-fill').style.width = '100%';
      
      aiBox.innerHTML = `<strong>✨ AI 문제 생성 완료!</strong><br><span style="font-size: 13px; color: var(--success);">아래 전투 미션을 읽고 새로운 문제에 도전해 보세요! (완료 시 ${expReward} EXP 획득)</span>`;
      showAlert(`🎲 ${tag} 새로운 맞춤형 실습 문제가 생성되었습니다!`);
    } catch (parseErr) {
      console.error("AI 문제 JSON 파싱 실패:", parseErr, jsonStr);
      aiBox.innerHTML = `<strong>🎲 AI 맞춤 문제 생성기:</strong><br><br><span style="color: var(--danger);">⚠️ AI 응답 형식이 올바르지 않아 생성에 실패했습니다. 버튼을 눌러 다시 시도해 주세요.</span>`;
    }
  }
}

// ==========================================
// 11. 보스 레이드 (Boss Raid Game Logic)
// ==========================================
function initBossEditor() {
  if (!bossEditor && $('boss-code-editor')) {
    bossEditor = CodeMirror.fromTextArea($('boss-code-editor'), {
      mode: 'python',
      theme: 'dracula',
      lineNumbers: true,
      indentUnit: 4
    });
  }
}

function startBossRaid(bossId) {
  const bossMeta = BOSSES_DB[bossId];
  if (!bossMeta) return;

  if ($('boss-lobby')) $('boss-lobby').classList.add('hidden');
  if ($('boss-arena')) $('boss-arena').classList.remove('hidden');
  initBossEditor();

  currentBossId = bossId;
  bossMaxHp = bossMeta.maxHp;
  bossHp = bossMeta.maxHp;
  bossTimeLeft = bossMeta.timeLimit;
  playerMaxHp = 100;
  playerHp = 100;

  if ($('boss-active-name')) $('boss-active-name').textContent = bossMeta.name;
  updateBossHpBar();
  updateBossPlayerHpBar();
  if ($('boss-timer-disp')) $('boss-timer-disp').textContent = `${bossTimeLeft}초`;
  if ($('boss-terminal-output')) $('boss-terminal-output').textContent = '초고속 공격을 위해 준비되셨습니다! 코드를 작성하고 제출하세요.';
  if (bossEditor) bossEditor.setValue('# 보스 공격 파이썬 코드 입력\n');

  // 난이도별 풀 필터링
  bossQuestionsPool = (window.problems || []).filter(p => p.diff === bossMeta.diff);
  if (!bossQuestionsPool || bossQuestionsPool.length === 0) bossQuestionsPool = window.problems || [];

  nextBossQuestion();

  if (bossTimerId) clearInterval(bossTimerId);
  bossTimerId = setInterval(tickBossTimer, 1000);
}

function tickBossTimer() {
  bossTimeLeft--;
  if (bossTimeLeft <= 0) {
    bossTimeLeft = 0;
    if ($('boss-timer-disp')) $('boss-timer-disp').textContent = '0초';
    endBossRaid(false, '⏰ 제한 시간 초과! 시간 내에 보스를 격파하지 못했습니다.');
  } else {
    if ($('boss-timer-disp')) $('boss-timer-disp').textContent = `${bossTimeLeft}초`;
  }
}

function updateBossHpBar() {
  const fill = $('boss-huge-hp-fill');
  const txt = $('boss-hp-text');
  if (fill) fill.style.width = `${Math.max(0, Math.floor((bossHp / bossMaxHp) * 100))}%`;
  if (txt) txt.textContent = `${Math.max(0, bossHp)} / ${bossMaxHp}`;
}

function updateBossPlayerHpBar() {
  const fill = $('boss-player-hp-fill');
  const txt = $('boss-player-hp-text');
  if (fill) fill.style.width = `${Math.max(0, Math.floor((playerHp / playerMaxHp) * 100))}%`;
  if (txt) txt.textContent = `${Math.max(0, playerHp)} / ${playerMaxHp}`;
}

function nextBossQuestion() {
  if (!bossQuestionsPool || bossQuestionsPool.length === 0) return;
  currentBossQ = bossQuestionsPool[Math.floor(Math.random() * bossQuestionsPool.length)];
  if ($('boss-q-title')) $('boss-q-title').textContent = `⚡ 레이드 마법 주문: ${currentBossQ.title}`;
  if ($('boss-q-desc')) $('boss-q-desc').innerHTML = currentBossQ.desc;
  if ($('boss-q-text')) $('boss-q-text').textContent = currentBossQ.q;
  if (bossEditor) {
    bossEditor.setValue('# 정답 작성 후 초고속 공격 제출!\n');
    setTimeout(() => bossEditor.refresh(), 50);
  }
}

function handleBossWrong(errorMsg) {
  const mypre = $('boss-terminal-output');
  if (mypre) mypre.innerHTML += `\n\n<span style="color: var(--danger); font-weight: bold;">⚠️ 보스의 흉포한 반격! 체력이 20 감소했습니다! (${errorMsg})</span>`;
  playerHp = Math.max(0, playerHp - 20);
  updateBossPlayerHpBar();
  showAlert('💥 오답입니다! 보스의 반격으로 20 HP를 잃었습니다!');

  if (playerHp <= 0) {
    setTimeout(() => endBossRaid(false, '💀 체력이 모두 소진되어 전사하였습니다.'), 1000);
  }
}

function endBossRaid(isWin, failReason = '') {
  if (bossTimerId) clearInterval(bossTimerId);
  
  if ($('boss-arena')) $('boss-arena').classList.add('hidden');
  if ($('boss-lobby')) $('boss-lobby').classList.remove('hidden');
  
  if (isWin) {
    const bossMeta = BOSSES_DB[currentBossId];
    const bonus = bossMeta ? bossMeta.bonusExp : 200;
    user.exp += bonus;
    checkLevelUp();
    saveState();
    updateDashboard();
    
    alert(`🎉 보스 레이드 대성공! 🏆\n\n${bossMeta ? bossMeta.name : '보스'}를 완벽히 토벌하였습니다!\n토벌 성공 보너스로 대량의 ${bonus} EXP를 획득하였습니다!`);
  } else {
    alert(`⚠️ 보스 레이드 실패 ⚠️\n\n패배 사유: ${failReason}\n실력을 갈고닦아 다시 복수전에 도전해 보세요!`);
  }
  
  showScreen('dashboard-screen');
}

// ==========================================
// 12. 이벤트 리스너 통합 마운트
// ==========================================
function bindAllEvents() {
  // 상단 네비게이션 버튼
  if ($('nav-dashboard')) $('nav-dashboard').onclick = () => showScreen('dashboard-screen');
  if ($('nav-learn')) $('nav-learn').onclick = () => { showScreen('learn-screen'); if (!currentChapter && window.problems) loadChapter(1); };
  if ($('nav-algo')) $('nav-algo').onclick = () => showAlgoScreen();
  if ($('nav-skills')) $('nav-skills').onclick = () => showSkillsOverlay();
  if ($('nav-review')) $('nav-review').onclick = () => showReviewOverlay();
  if ($('nav-ranked')) $('nav-ranked').onclick = () => { showScreen('ranked-screen'); updateRankedLobby(); };
  if ($('nav-boss')) $('nav-boss').onclick = () => showScreen('boss-screen');

  // =============================================
  // 🤖 FLOATING AI PYTHON TUTOR CHAT WIDGET
  // =============================================
  const chatToggle = $('ai-chat-toggle');
  const chatPanel  = $('ai-chat-panel');
  const chatClose  = $('ai-chat-close');
  const chatInput  = $('ai-chat-input');
  const chatSend   = $('ai-chat-send');
  const chatMsgs   = $('ai-chat-messages');

  if (chatToggle) chatToggle.onclick = () => {
    chatPanel.classList.toggle('hidden');
    if (!chatPanel.classList.contains('hidden')) chatInput.focus();
  };

  if (chatClose) chatClose.onclick = () => chatPanel.classList.add('hidden');

  async function sendAiChatMessage() {
    const q = chatInput.value.trim();
    if (!q) return;

    // Append user message
    chatInput.value = '';
    chatSend.disabled = true;
    const userDiv = document.createElement('div');
    userDiv.className = 'ai-chat-msg user-msg';
    userDiv.innerHTML = `<div class="ai-chat-bubble">${q.replace(/</g,'&lt;')}</div>`;
    chatMsgs.appendChild(userDiv);

    // Typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-chat-msg ai-msg';
    typingDiv.innerHTML = `<div class="ai-chat-bubble ai-typing-bubble"><span></span><span></span><span></span></div>`;
    chatMsgs.appendChild(typingDiv);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;

    const prompt = `너는 파이썬을 가르치는 친절한 AI 선생님이야. 초보자도 이해할 수 있게 쉽고 재미있게 설명해줘. 코드 예시가 필요하면 짧게 보여줘.
학생의 질문: "${q}"
한국어로 간결하게 3~5문장으로 답변해줘.`;

    let reply = '';
    try {
      const res = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type: 'chat' })
      });
      if (res.ok) {
        const data = await res.json();
        reply = data.choices[0].message.content;
      }
    } catch (e) { /* fallback to local key */ }

    // Fallback to local OpenAI key
    if (!reply) {
      const apiKey = localStorage.getItem('openai_api_key');
      if (apiKey) {
        try {
          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: prompt }], max_tokens: 400 })
          });
          if (res.ok) {
            const data = await res.json();
            reply = data.choices[0].message.content;
          }
        } catch (e) { /* ignore */ }
      }
    }

    // Remove typing indicator, add reply
    typingDiv.remove();
    const aiDiv = document.createElement('div');
    aiDiv.className = 'ai-chat-msg ai-msg';
    const safeReply = (reply || '죄송해요, 지금은 답변을 드리기 어렵네요. 잠시 후 다시 시도해 주세요! 🙏')
      .replace(/</g,'&lt;').replace(/\n/g,'<br>');
    aiDiv.innerHTML = `<div class="ai-chat-bubble">${safeReply}</div>`;
    chatMsgs.appendChild(aiDiv);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
    chatSend.disabled = false;
    chatInput.focus();
  }

  if (chatSend)  chatSend.onclick  = sendAiChatMessage;
  if (chatInput) chatInput.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiChatMessage(); } };

  // 대시보드 카드
  if ($('card-learn')) $('card-learn').onclick = () => { showScreen('learn-screen'); if (!currentChapter && window.problems) loadChapter(1); };
  if ($('card-skills')) $('card-skills').onclick = () => showSkillsOverlay();
  if ($('card-ranked')) $('card-ranked').onclick = () => { showScreen('ranked-screen'); updateRankedLobby(); };
  if ($('card-algo')) $('card-algo').onclick = () => showAlgoScreen();
  if ($('card-review')) $('card-review').onclick = () => showReviewOverlay();
  if ($('card-boss')) $('card-boss').onclick = () => showScreen('boss-screen');

  // 오버레이 닫기
  if ($('btn-close-overlay')) $('btn-close-overlay').onclick = () => {
    if ($('overlay-screen')) {
      $('overlay-screen').classList.add('hidden');
      $('overlay-screen').style.display = 'none';
    }
  };

  // 로그인 / 가입 / 로그아웃
  if ($('btn-login')) {
    $('btn-login').onclick = () => {
      const un = $('username') ? $('username').value.trim() : '';
      if (!un) return showAlert('⚠️ 아이디를 입력해 주세요!');
      const success = loadState(un);
      if (success) {
        showAlert(`👋 환영합니다, ${user.nickname || user.username}님!`);
      } else {
        showAlert('❌ 존재하지 않는 아이디입니다. 먼저 가입해 주세요!');
      }
    };
  }
  if ($('btn-signup')) {
    $('btn-signup').onclick = () => {
      const un = $('username') ? $('username').value.trim() : '';
      const nick = $('nickname') ? $('nickname').value.trim() : '';
      if (!un) return showAlert('⚠️ 가입할 아이디를 입력해 주세요!');
      user.username = un;
      user.nickname = nick || un;
      saveState();
      updateNavUser();
      updateDashboard();
      showAlert(`🎉 가입 완료! ${user.nickname}님, 신나는 코딩 모험을 시작하세요!`);
    };
  }
  if ($('btn-logout')) {
    $('btn-logout').onclick = () => {
      localStorage.removeItem('py_current_user'); // 세션 삭제
      user = { username: '', nickname: '게스트', level: 1, exp: 0, combo: 0, unlockedChapterId: 1, skills: ['sk1', 'sk2'], reviewNotes: [], attempts: 0, correctCount: 0, rankedRating: 1000, dailyQuests: [] };
      updateNavUser();
      updateDashboard();
      showAlert('🔒 정상적으로 로그아웃되었습니다.');
    };
  }

  // 학습 화면 코드 실행 버튼
  if ($('btn-run-code')) {
    $('btn-run-code').onclick = async () => {
      if (!editor) return;
      const prog = editor.getValue();
      if (!prog.trim()) return showAlert('⚠️ 실행할 코드를 에디터에 작성해주세요!');
      
      const term = $('terminal-output');
      if (term) term.innerHTML = '⚙️ 코드를 분석하고 몬스터를 향해 실행 중...';
      
      if (!pyodide) {
        try { await initPyodide(); } catch(e) { return; }
      }
      
      try {
        await pyodide.runPythonAsync(`sys.stdout = io.StringIO()\nsys.stderr = io.StringIO()`);
        await pyodide.runPythonAsync(prog);
        const stdout = await pyodide.runPythonAsync("sys.stdout.getvalue()");
        const stderr = await pyodide.runPythonAsync("sys.stderr.getvalue()");
        checkAnswer(stdout, stderr, '');
      } catch (err) {
        checkAnswer('', '', err.message);
      }
    };
  }

  // AI 튜터 질문 및 API 키 관리
  if ($('btn-ask-ai')) {
    $('btn-ask-ai').onclick = () => {
      requestAIExplanation();
    };
  }
  if ($('btn-algo-ask-ai')) {
    $('btn-algo-ask-ai').onclick = () => {
      requestAlgoAIExplanation();
    };
  }
  if ($('btn-save-apikey')) {
    $('btn-save-apikey').onclick = () => {
      const key = $('input-openai-key') ? $('input-openai-key').value.trim() : '';
      if (!key || !key.startsWith('sk-')) return showAlert('⚠️ 유효한 OpenAI API 키(sk-...)를 입력해주세요.');
      localStorage.setItem('openai_api_key', key);
      if ($('overlay-apikey')) $('overlay-apikey').classList.add('hidden');
      showAlert('🔑 API 키가 안전하게 저장되었습니다! 이제 AI 선생님께 질문해보세요.');
    };
  }

  // AI 맞춤 문제 생성 버튼 이벤트
  if ($('btn-gen-easy')) $('btn-gen-easy').onclick = () => generateAdditionalProblem('easy');
  if ($('btn-gen-similar')) $('btn-gen-similar').onclick = () => generateAdditionalProblem('similar');
  if ($('btn-gen-hard')) $('btn-gen-hard').onclick = () => generateAdditionalProblem('hard');

  // 알고리즘 탭 전환
  document.querySelectorAll('.algo-tab').forEach(t => {
    t.onclick = () => {
      document.querySelectorAll('.algo-tab').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.algo-tab-content').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const tabId = t.getAttribute('data-tab');
      if ($(`algo-tab-${tabId}`)) $(`algo-tab-${tabId}`).classList.add('active');
      if (tabId === 'practice') {
        Object.values(algoEditors).forEach(ed => { if (typeof ed.refresh === 'function') setTimeout(() => ed.refresh(), 50); });
      }
    };
  });

  // 경쟁전 배틀 시작 및 제출
  if ($('btn-ranked-start')) {
    $('btn-ranked-start').onclick = () => {
      if ($('ranked-header')) $('ranked-header').classList.add('hidden');
      if ($('ranked-arena')) $('ranked-arena').classList.remove('hidden');
      initRankedEditor();
      playerScore = 0; aiScore = 0;
      updateRankedScores();
      nextRankedQuestion();
      
      const tier = getTierInfo(user.rankedRating || 1000);
      rankedMatchActive = true;
      if (rankedTimerId) clearInterval(rankedTimerId);
      rankedTimerId = setInterval(() => {
        if (!rankedMatchActive) return;
        aiScore++;
        updateRankedScores();
        showAlert(`🤖 AI 상대가 문제를 풀었습니다! (AI 점수: ${aiScore}/5)`);
        if (aiScore >= 5) endRankedMatch(false);
      }, tier.aiInterval);
    };
  }
  if ($('btn-ranked-run')) {
    $('btn-ranked-run').onclick = async () => {
      if (!rankedEditor || !currentRankedQ) return;
      const prog = rankedEditor.getValue();
      if (!prog.trim()) return showAlert('⚠️ 스피드 정답 코드를 입력하세요!');
      
      const mypre = $('r-terminal-output');
      if (mypre) mypre.innerHTML = '⚡ 쾌속 코드 실행 및 정답 확인 중...';
      if (!pyodide) { try { await initPyodide(); } catch(e) { return; } }
      
      try {
        await pyodide.runPythonAsync(`sys.stdout = io.StringIO()\nsys.stderr = io.StringIO()`);
        await pyodide.runPythonAsync(prog);
        const stdout = await pyodide.runPythonAsync("sys.stdout.getvalue()");
        const stderr = await pyodide.runPythonAsync("sys.stderr.getvalue()");
        
        if (stderr) {
          if (mypre) mypre.innerHTML = `<span style="color: var(--danger); font-weight: 700;">[오류]\n${stderr}</span>`;
          return;
        }
        
        const actual = (stdout || '').trim();
        if (actual === (currentRankedQ.expectedOut || '').trim()) {
          playerScore++;
          updateRankedScores();
          if (mypre) mypre.innerHTML = `${stdout}\n\n<span style="color: var(--success); font-weight: 800;">🎉 정답 적중! 나의 점수가 상승합니다!</span>`;
          if (playerScore >= 5) {
            endRankedMatch(true);
          } else {
            setTimeout(nextRankedQuestion, 1200);
          }
        } else {
          if (mypre) mypre.innerHTML = `${stdout}\n\n<span style="color: var(--danger); font-weight: 700;">❌ 오답입니다! 서둘러 수정하세요!</span>`;
        }
      } catch (err) {
        if (mypre) mypre.innerHTML = `<span style="color: var(--danger); font-weight: 700;">[에러]\n${err.message}</span>`;
      }
    };
  }

  // 보스 레이드 시작 버튼 (선택 로비)
  document.querySelectorAll('.btn-start-boss-raid').forEach(b => {
    b.onclick = () => {
      const bId = parseInt(b.getAttribute('data-boss-id') || '1');
      startBossRaid(bId);
    };
  });

  // 보스 레이드 공격 제출 버튼
  if ($('btn-boss-run')) {
    $('btn-boss-run').onclick = async () => {
      if (!bossEditor || !currentBossQ) return;
      const prog = bossEditor.getValue();
      if (!prog.trim()) return showAlert('⚠️ 공격 주문(코드)을 먼저 에디터에 작성해주세요!');
      
      const mypre = $('boss-terminal-output');
      if (mypre) mypre.textContent = '⚔️ 초고속 공격 마법 연출 중...';
      if (!pyodide) { try { await initPyodide(); } catch(e) { return; } }
      
      try {
        await pyodide.runPythonAsync(`sys.stdout = io.StringIO()\nsys.stderr = io.StringIO()`);
        await pyodide.runPythonAsync(prog);
        const stdout = await pyodide.runPythonAsync("sys.stdout.getvalue()");
        const stderr = await pyodide.runPythonAsync("sys.stderr.getvalue()");
        
        if (stderr) {
          if (mypre) mypre.innerHTML = `<span style="color: var(--danger);">${stderr}</span>`;
          handleBossWrong('실행 중 에러 발생');
          return;
        }
        
        const actual = (stdout || '').trim();
        if (actual === (currentBossQ.expectedOut || '').trim()) {
          const bossMeta = BOSSES_DB[currentBossId] || { perGainedExp: 40 };
          bossHp = Math.max(0, bossHp - 100);
          updateBossHpBar();
          user.exp += bossMeta.perGainedExp;
          checkLevelUp();
          saveState();
          
          if (mypre) mypre.innerHTML = `${stdout}\n\n<span style="color: var(--success); font-weight: 800;">✨ 공격 적중! 보스에게 100 대미지를 입히고 +${bossMeta.perGainedExp} EXP 획득!</span>`;
          
          if (bossHp <= 0) {
            setTimeout(() => endBossRaid(true), 1200);
          } else {
            setTimeout(nextBossQuestion, 1200);
          }
        } else {
          if (mypre) mypre.innerHTML = `${stdout}\n\n<span style="color: var(--danger); font-weight: 700;">❌ 오답입니다! 출력 결과 불일치!</span>`;
          handleBossWrong('출력 기댓값 불일치');
        }
      } catch (err) {
        if (mypre) mypre.innerHTML = `<span style="color: var(--danger); font-weight: 700;">${err.message}</span>`;
        handleBossWrong('문법 오류 발생');
      }
    };
  }
}

// ==========================================
// 13. 다크모드 / 라이트모드 테마 관리
// ==========================================
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  const btn = $('btn-theme-toggle');
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    if (btn) btn.textContent = '🌙 다크 모드';
  } else {
    document.body.classList.remove('light-mode');
    if (btn) btn.textContent = '☀️ 라이트 모드';
  }
}

const themeBtn = $('btn-theme-toggle');
if (themeBtn) {
  themeBtn.onclick = () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    themeBtn.textContent = isLight ? '🌙 다크 모드' : '☀️ 라이트 모드';
  };
}

// ==========================================
// 14. 애플리케이션 초기 시작 (App Init)
// ==========================================
function initApp() {
  initTheme();
  
  if ($('code-editor') && typeof CodeMirror !== 'undefined') {
    editor = CodeMirror.fromTextArea($('code-editor'), {
      mode: 'python',
      theme: 'dracula',
      lineNumbers: true,
      indentUnit: 4
    });
    
    editor.on('change', () => {
      const wrongActions = document.getElementById('wrong-actions');
      const explanationBox = document.getElementById('explanation-box');
      const wrongQuestion = document.getElementById('wrong-question');
      if (wrongActions) wrongActions.style.display = 'none';
      if (explanationBox) explanationBox.style.display = 'none';
      if (wrongQuestion) wrongQuestion.style.display = 'none';
    });
  }
  
  bindAllEvents();

  // 자동 로그인: 이전 세션이 있으면 복원
  const savedUsername = localStorage.getItem('py_current_user');
  if (savedUsername) {
    loadState(savedUsername);
  } else {
    updateNavUser();
    updateDashboard();
  }

  // 첫 번째 문제 로드 준비
  if (typeof window.problems !== 'undefined' && window.problems && window.problems.length > 0) {
    loadChapter(user.unlockedChapterId || 1);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
