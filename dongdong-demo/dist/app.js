const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const alienData = {
  "冲冲": { className: "alien--blue", planet: "涡轮星", line: "“准备好！我们要把今天的动能冲满。”" },
  "弹弹": { className: "alien--pink", planet: "软糖星", line: "“我已经把返乡行李打包好啦！”" },
  "慢慢": { className: "alien--green", planet: "苔藓星", line: "“慢慢动也算动，我会等你的。”" }
};

const baseActions = [
  { name: "肩膀绕环", duration: "60秒", part: "肩颈", glyph: "↻", tip: "肩膀放松，手臂缓慢向后画圈。" },
  { name: "颈部侧向拉伸", duration: "60秒", part: "肩颈", glyph: "↔", tip: "头部轻轻侧倾，不要耸肩或憋气。" },
  { name: "站姿扩胸", duration: "60秒", part: "上背", glyph: "↗", tip: "双臂向后打开，胸口自然抬起。" },
  { name: "手臂上举拉伸", duration: "60秒", part: "手臂", glyph: "↑", tip: "双手向上延伸，肋骨保持放松。" },
  { name: "上背放松", duration: "60秒", part: "上背", glyph: "⌒", tip: "微微屈膝，手臂向前延伸，背部放松。" }
];

const initialState = () => ({
  screen: "welcome",
  previousScreen: "welcome",
  setupStep: 0,
  setupReview: false,
  mode: "formal",
  alien: "弹弹",
  planReady: false,
  completed: false,
  completedParts: 0,
  selectedDate: 23,
  config: {
    scene: "办公室", duration: 5, focus: "肩颈", frequency: 3,
    days: ["一", "三", "五"], reminder: "19:00", age: "25～34岁",
    foundation: "几乎不运动", goal: "养成运动习惯", limits: ["无明显不适"]
  },
  actions: baseActions.map((item) => ({ ...item, favorite: false })),
  workoutActions: [], workoutIndex: 0, seconds: 60, paused: false,
  communityTab: "friends", communityEvent: "celebration", challengeJoined: false,
  messages: [],
  join: { alien: "弹弹", time: "20:30", punishment: "被外星人打屁屁", visibility: "广场公开", consent: false }
});

let state = initialState();
let workoutTimer = null;
let toastTimer = null;
let storyTimer = null;
let storyIndex = 0;
const screens = $$('[data-screen]');

const defaultMemoMessages = [
  { author: '小鱼', text: '今天一起动5分钟？', time: '点一下回复', color: '' },
  { author: '系统消息', text: '阿圆给你送来一个夸夸 ♡', time: '刚刚', color: 'memo-note--blue' }
];

function showStoryScene(index) {
  storyIndex = index;
  $$('[data-story-scene]').forEach((scene) => scene.classList.toggle('active', Number(scene.dataset.storyScene) === index));
  $$('.story-progress i').forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex <= index));
}

function finishIntroStory() {
  window.clearInterval(storyTimer);
  storyTimer = null;
  const welcome = $('.welcome');
  welcome.classList.remove('is-story-playing');
  welcome.classList.add('story-complete');
  $('#story-stage').hidden = true;
  welcome.scrollTop = 0;
}

function startIntroStory() {
  window.clearInterval(storyTimer);
  const welcome = $('.welcome');
  welcome.classList.add('is-story-playing');
  welcome.classList.remove('story-complete');
  $('#story-stage').hidden = false;
  showStoryScene(0);
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 700 : 4000;
  storyTimer = window.setInterval(() => {
    if (storyIndex >= 5) { finishIntroStory(); return; }
    showStoryScene(storyIndex + 1);
  }, duration);
}

function showScreen(name, options = {}) {
  state.previousScreen = state.screen;
  state.screen = name;
  closeSheet();
  closeDialog();
  screens.forEach((screen) => {
    const active = screen.dataset.screen === name;
    screen.hidden = !active;
    screen.classList.toggle('screen--active', active);
    if (active) screen.scrollTop = 0;
  });
  if (name !== 'workout') stopTimer();
  if (name === 'home') renderHome();
  if (name === 'community') {
    renderCommunityTab();
    if (options.showEvent !== false) window.setTimeout(showCommunityEvent, 260);
  }
  if (name === 'profile') renderAlienClasses();
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => element.classList.remove('show'), 2200);
}

function openSheet(title, html) {
  $('#sheet-title').textContent = title;
  $('#sheet-content').innerHTML = html;
  $('#sheet-overlay').hidden = false;
  requestAnimationFrame(() => $('.sheet', $('#sheet-overlay'))?.focus?.());
}

function closeSheet() { $('#sheet-overlay').hidden = true; }
function openDialog(html) { $('#dialog-content').innerHTML = html; $('#dialog-overlay').hidden = false; }
function closeDialog() { $('#dialog-overlay').hidden = true; }

function startPlan() {
  state.mode = 'formal';
  state.setupStep = 0;
  state.setupReview = false;
  renderSetup();
  showScreen('setup');
}

const setupSteps = [
  {
    title: '今天适合怎么动？', intro: '选择最接近当下的状态，计划随时可以再调整。',
    content: () => `
      ${choiceGroup('场景', 'scene', ['办公室','家里','户外','睡前'], state.config.scene)}
      ${choiceGroup('可接受时长', 'duration', [3,5,10,15], state.config.duration, (value) => `${value}分钟${value === 5 ? '<small>最容易坚持</small>' : ''}`, 'choice-grid--wide')}
      ${choiceGroup('重点部位', 'focus', ['肩颈','腰背','核心','腿部','全身'], state.config.focus)}
      <p class="choice-note">今天将优先安排${state.config.focus}放松与活动。</p>`
  },
  {
    title: '一周动几次？', intro: '不用排得太满，留一点轻松坚持的空间。',
    content: () => `
      <section class="form-group"><h3>每周运动频次</h3><div class="frequency"><button data-frequency="-1" aria-label="减少频次">−</button><strong>每周 ${state.config.frequency} 次</strong><button data-frequency="1" aria-label="增加频次">＋</button></div><p class="choice-note">每周${state.config.frequency}次，每次${state.config.duration}分钟，一周只需要${state.config.frequency * state.config.duration}分钟。</p></section>
      <section class="form-group"><h3>运动日</h3><div class="chip-row">${['一','二','三','四','五','六','日'].map(day => `<button data-day="${day}" class="${state.config.days.includes(day) ? 'selected' : ''}">周${day}</button>`).join('')}</div></section>
      ${choiceGroup('提醒时间', 'reminder', ['08:00','12:30','19:00','22:30','暂不设置'], state.config.reminder)}`
  },
  {
    title: '再认识你一点', intro: '这些信息只用来调整动作难度，不展示给其他人。',
    content: () => `
      ${choiceGroup('年龄段', 'age', ['18岁以下','18～24岁','25～34岁','35～44岁','45～59岁','60岁以上'], state.config.age)}
      ${choiceGroup('运动基础', 'foundation', ['几乎不运动','偶尔运动','规律运动'], state.config.foundation)}
      ${choiceGroup('主要目标', 'goal', ['养成运动习惯','改善体态','减脂塑形','提升活力'], state.config.goal)}`
  },
  {
    title: '有什么需要避开？', intro: '可以多选；运动过程中如感到疼痛，请立即停止。',
    content: () => `<section class="form-group"><h3>身体限制</h3><div class="choice-list">${['无明显不适','膝盖不适','腰背不适','肩颈不适','手腕不适','其他'].map(value => `<button data-limit="${value}" class="${state.config.limits.includes(value) ? 'selected' : ''}">${value}</button>`).join('')}</div>${state.config.limits[0] !== '无明显不适' ? '<p class="choice-note">我们将减少相关部位的冲击动作。</p>' : ''}</section>`
  }
];

function choiceGroup(label, key, values, selected, formatter = (value) => value, extraClass = '') {
  return `<section class="form-group"><h3>${label}</h3><div class="choice-grid ${extraClass}">${values.map(value => `<button data-config="${key}" data-value="${value}" class="${String(value) === String(selected) ? 'selected' : ''}">${formatter(value)}</button>`).join('')}</div></section>`;
}

function renderSetup() {
  const count = $('#setup-count');
  const progress = $('#setup-progress');
  const next = $('#setup-next');
  if (state.setupReview) {
    count.textContent = '完成';
    progress.style.width = '100%';
    $('#setup-content').innerHTML = `
      <h2>这就是你的轻运动计划</h2><p class="setup-intro">先从容易完成的节奏开始，之后随时能改。</p>
      <div class="plan-summary"><h3>${state.config.duration}分钟${state.config.focus}唤醒</h3>
        <div class="summary-row"><span>频次</span><b>每周${state.config.frequency}次</b></div>
        <div class="summary-row"><span>主要场景</span><b>${state.config.scene}</b></div>
        <div class="summary-row"><span>重点部位</span><b>${state.config.focus}</b></div>
        <div class="summary-row"><span>目标</span><b>${state.config.goal}</b></div>
        <div class="summary-row"><span>难度</span><b>轻松</b></div>
      </div><button class="text-button" data-action="edit-setup">← 返回修改</button>`;
    next.textContent = '选择外星人';
    return;
  }
  const step = setupSteps[state.setupStep];
  count.textContent = `${state.setupStep + 1}/4`;
  progress.style.width = `${(state.setupStep + 1) * 25}%`;
  $('#setup-content').innerHTML = `<h2>${step.title}</h2><p class="setup-intro">${step.intro}</p>${step.content()}`;
  next.textContent = state.setupStep === 3 ? '生成我的计划' : '下一步';
}

function setupBack() {
  if (state.setupReview) { state.setupReview = false; state.setupStep = 3; renderSetup(); return; }
  if (state.setupStep > 0) { state.setupStep -= 1; renderSetup(); } else showScreen('welcome');
}

function setupNext() {
  if (state.setupReview) { state.mode = 'formal'; renderAlienSelect(); showScreen('alien-select'); return; }
  if (state.setupStep < 3) state.setupStep += 1;
  else state.setupReview = true;
  renderSetup();
}

function selectAlien(name) {
  state.alien = name;
  $$('.alien-choice').forEach((choice) => {
    const selected = choice.dataset.alien === name;
    choice.classList.toggle('selected', selected);
    choice.setAttribute('aria-checked', String(selected));
  });
  $('#alien-line').textContent = alienData[name].line;
}

function renderAlienSelect() {
  $('#alien-kicker').textContent = state.mode === 'quick' ? '快速一分钟 · 选择搭档' : state.mode === 'change' ? '更换今日搭档' : '今日救援搭档';
  selectAlien(state.alien);
}

function confirmAlien() {
  if (state.mode === 'quick') { startWorkout(true); return; }
  if (state.mode === 'change') { showScreen('home'); toast(`今天改为救援${state.alien}`); return; }
  state.planReady = true;
  showScreen('home');
  toast('周计划已生成，今天从 5 分钟开始');
}

function alienBack() {
  if (state.mode === 'quick') showScreen('welcome');
  else if (state.mode === 'change') showScreen('home');
  else showScreen('setup');
}

function renderAlienClasses() {
  const data = alienData[state.alien];
  ['#home-alien','#workout-alien','#complete-alien'].forEach((selector) => {
    const element = $(selector);
    if (!element) return;
    element.classList.remove('alien--pink','alien--blue','alien--green');
    element.classList.add(data.className);
  });
}

function renderHome() {
  const data = alienData[state.alien];
  renderAlienClasses();
  $('#home-alien-name').textContent = state.alien;
  $('#home-plan-name').textContent = `${state.config.duration}分钟${state.config.focus}唤醒`;
  $('#home-plan-meta').textContent = `${state.config.scene} · 轻松 · ${state.actions.length}个动作`;
  const button = $('#home-start');
  button.textContent = state.completed ? '再动一次' : state.completedParts ? `继续救援，还剩${Math.max(1, state.config.duration - state.completedParts)}分钟` : '开始救援';
  $$('#home-energy i').forEach((dot, index) => dot.classList.toggle('active', state.completed || index < state.completedParts));
  $('#home-energy').setAttribute('aria-label', `飞船能量 ${state.completed ? 100 : state.completedParts * 20}%`);
  renderWeek(); renderActionList();
  $('.tiny-ship').title = `准备前往${data.planet}`;
}

function renderWeek() {
  const days = [
    { week:'一', date:21, status:'done' }, { week:'二', date:22, status:'done' },
    { week:'三', date:23, status:'today' }, { week:'四', date:24 },
    { week:'五', date:25 }, { week:'六', date:26, status:'rest' }, { week:'日', date:27, status:'rest' }
  ];
  $('#week-strip').innerHTML = days.map(day => `<button class="day ${day.status || ''} ${state.selectedDate === day.date ? 'selected-date' : ''}" data-date="${day.date}" data-week="${day.week}"><small>${day.week}</small><b>${day.status === 'done' ? '✓' : day.date}</b></button>`).join('');
}

function renderActionList() {
  $('#action-list').innerHTML = state.actions.map((action, index) => `
    <div class="action-swipe" data-index="${index}"><div class="swipe-actions"><button data-replace="${index}">更换</button><button class="delete-action" data-delete="${index}">删除</button></div>
      <div class="action-row" data-preview="${index}"><span class="motion-icon">${action.glyph}</span><div><strong>${action.name}</strong><small>${action.duration} · ${action.part}</small></div><button class="favorite ${action.favorite ? 'active' : ''}" data-favorite="${index}" aria-label="${action.favorite ? '取消收藏' : '收藏'}${action.name}">${action.favorite ? '♥' : '♡'}</button></div></div>`).join('');
  attachSwipeHandlers();
}

function attachSwipeHandlers() {
  $$('.action-swipe').forEach((item) => {
    let startX = 0;
    item.addEventListener('pointerdown', (event) => { startX = event.clientX; });
    item.addEventListener('pointerup', (event) => {
      const distance = event.clientX - startX;
      const row = $('.action-row', item);
      if (distance < -35) row.classList.add('revealed');
      if (distance > 35) {
        if (row.classList.contains('revealed')) row.classList.remove('revealed');
        else toggleFavorite(Number(item.dataset.index));
      }
    });
  });
}

function toggleFavorite(index) {
  state.actions[index].favorite = !state.actions[index].favorite;
  renderActionList();
  toast(state.actions[index].favorite ? '已加入收藏' : '已取消收藏');
}

function adjustPlanSheet() {
  openSheet('调整今日计划', `
    <section class="sheet-section"><h3>时长</h3><div class="chip-row">${[3,5,10,15].map(value => `<button data-adjust="duration" data-value="${value}" class="${state.config.duration === value ? 'selected' : ''}">${value}分钟</button>`).join('')}</div></section>
    <section class="sheet-section"><h3>场景</h3><div class="chip-row">${['办公室','家里','户外','睡前'].map(value => `<button data-adjust="scene" data-value="${value}" class="${state.config.scene === value ? 'selected' : ''}">${value}</button>`).join('')}</div></section>
    <section class="sheet-section"><h3>部位</h3><div class="chip-row">${['肩颈','腰背','核心','腿部','全身'].map(value => `<button data-adjust="focus" data-value="${value}" class="${state.config.focus === value ? 'selected' : ''}">${value}</button>`).join('')}</div></section>
    <p class="choice-note" id="adjust-note">修改后约 ${state.config.duration} 分钟，${state.actions.length} 个动作。</p>
    <label class="check-row"><input type="checkbox" id="sync-plan">同步到后续计划</label>
    <button class="button button--primary" data-action="save-adjust">仅修改今天</button>`);
}

function startWorkout(quick = false) {
  state.mode = quick ? 'quick' : 'formal';
  state.workoutActions = quick ? [{ name:'全身醒醒操', duration:'60秒', part:'全身', glyph:'✦', tip:'跟着节奏活动肩膀、手臂和双腿。' }] : state.actions.map(item => ({...item}));
  state.workoutIndex = 0; state.seconds = 60; state.paused = false;
  renderWorkout(); showScreen('workout'); startTimer();
}

function renderWorkout() {
  const action = state.workoutActions[state.workoutIndex];
  const total = state.workoutActions.length;
  $('#workout-index').textContent = `${state.workoutIndex + 1}/${total}`;
  $('#workout-energy-label').textContent = `已产生动能 ${state.workoutIndex}分钟`;
  $('#workout-progress').style.width = `${(state.workoutIndex / total) * 100}%`;
  $('#workout-part').textContent = `${action.part} · 轻松`;
  $('#workout-action').textContent = action.name;
  $('#workout-tip').textContent = action.tip;
  $('#timer').textContent = formatTime(state.seconds);
  $('#next-action-label').textContent = state.workoutIndex + 1 < total ? `下一个：${state.workoutActions[state.workoutIndex + 1].name}` : '完成这个动作，飞船就能出发';
  $('.pause-button').textContent = state.paused ? '▶' : 'Ⅱ';
  renderAlienClasses();
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}

function startTimer() {
  stopTimer();
  workoutTimer = window.setInterval(() => {
    if (state.screen !== 'workout' || state.paused) return;
    state.seconds = Math.max(0, state.seconds - 1);
    $('#timer').textContent = formatTime(state.seconds);
    if (state.seconds === 0) nextAction();
  }, 1000);
}
function stopTimer(){ if (workoutTimer) window.clearInterval(workoutTimer); workoutTimer = null; }

function nextAction() {
  if (state.workoutIndex + 1 >= state.workoutActions.length) { finishWorkout(state.mode !== 'quick'); return; }
  state.workoutIndex += 1; state.seconds = 60; state.paused = false; renderWorkout();
}
function previousAction(){ if (state.workoutIndex > 0) { state.workoutIndex -= 1; state.seconds = 60; renderWorkout(); } else toast('已经是第一个动作'); }

function finishWorkout(full) {
  stopTimer();
  const quick = state.mode === 'quick';
  state.completed = full;
  state.completedParts = quick ? 1 : full ? 5 : Math.max(1, state.workoutIndex);
  const minutes = quick ? 1 : full ? state.config.duration : state.completedParts;
  $('#complete-kicker').textContent = quick ? '快速一分钟已完成' : full ? '完整计划已完成' : '今天已经产生动能';
  $('#complete-title').innerHTML = quick ? `第一个部位已传送！<br>${state.alien}离家又近了一点。` : full ? `救援成功！<br>${state.alien}已经完整回家。` : `今天先送回了${state.completedParts}个部位。`;
  $('#complete-desc').textContent = quick ? '完成一分钟也很了不起。想完整送 TA 回家，可以设置正式计划。' : full ? `你今天的 ${minutes} 分钟，让地球和${alienData[state.alien].planet}都亮了一点。` : `再动${Math.max(1, state.config.duration - minutes)}分钟，就能把${state.alien}完整送回家。`;
  $('#complete-minutes').textContent = minutes;
  $('#complete-actions').textContent = quick ? 1 : full ? state.workoutActions.length : state.completedParts;
  $('#complete-energy').textContent = `+${minutes}`;
  $('#quick-plan-cta').hidden = !quick;
  renderAlienClasses(); showScreen('complete');
}

function exitWorkout() {
  state.paused = true;
  const completeMinutes = state.workoutIndex;
  if (completeMinutes > 0) {
    openDialog(`<h2 id="dialog-title">现在结束吗？</h2><p>已产生 ${completeMinutes} 分钟动能，现在退出可以先传送 ${completeMinutes} 个部位。</p><button class="button button--primary" data-action="continue-workout">继续救援</button><button class="button button--ghost" data-action="finish-partial">传送已有部位并结束</button>`);
  } else {
    const remain = Math.max(1, state.seconds);
    openDialog(`<h2 id="dialog-title">再坚持一下？</h2><p>再坚持 ${remain} 秒，就能送回第一个部位。当前进度会保留。</p><button class="button button--primary" data-action="continue-workout">继续${remain}秒</button><button class="button button--ghost" data-action="exit-without-part">暂时退出</button>`);
  }
}

function discomfortSheet() {
  state.paused = true;
  openSheet('先停一下，舒服最重要', `<p class="setup-intro">选择一个更适合现在身体状态的方式。</p><div class="choice-list"><button data-action="easier-action">降低难度 <span>动作幅度减半</span></button><button data-action="replace-workout-action">更换动作 <span>换成肩颈呼吸</span></button><button data-action="skip-workout-action">跳过并补充替代动作</button></div><p class="choice-note">如果出现疼痛或眩晕，请结束运动并咨询专业人士。</p>`);
}

function renderCommunityTab() {
  $$('[data-community-tab]').forEach(button => button.classList.toggle('active', button.dataset.communityTab === state.communityTab));
  $('#friends-panel').hidden = state.communityTab !== 'friends';
  $('#square-panel').hidden = state.communityTab !== 'square';
  renderMemoBoard();
}

function renderMemoBoard() {
  const board = $('#memo-board');
  if (!board) return;
  const messages = [...state.messages, ...defaultMemoMessages];
  board.replaceChildren();
  messages.forEach((message) => {
    const note = document.createElement('button');
    note.className = `memo-note ${message.color}`.trim();
    note.dataset.action = 'toast';
    note.dataset.message = message.author === '我' ? '留言已发布' : `已回复${message.author}：晚上见！`;
    const author = document.createElement('span');
    const copy = document.createElement('p');
    const time = document.createElement('small');
    author.textContent = message.author;
    copy.textContent = message.text;
    time.textContent = message.time;
    note.append(author, copy, time);
    board.append(note);
  });
  $('#memo-count').textContent = `${messages.length} 条留言`;
}

function openNewMessageSheet() {
  openSheet('新建留言', `<p class="setup-intro">写给好友们，约着一起动一动。</p><label class="message-compose"><span>留言内容</span><textarea id="new-message-text" maxlength="60" placeholder="例如：今晚 8 点一起动 5 分钟？"></textarea></label><div class="message-compose-meta"><span>将展示在好友留言板</span><b id="message-count">0/60</b></div><button class="button button--primary" data-action="publish-message">发布留言</button>`);
  window.requestAnimationFrame(() => $('#new-message-text')?.focus());
}

function publishMessage() {
  const input = $('#new-message-text');
  const text = input?.value.trim();
  if (!text) { toast('先写一句留言吧'); input?.focus(); return; }
  state.messages.unshift({ author:'我', text, time:'刚刚', color:'memo-note--peach' });
  renderMemoBoard();
  closeSheet();
  toast('留言已贴到好友留言板');
}

function showCommunityEvent() {
  if (state.communityEvent === 'celebration') {
    openDialog(`<div class="dialog-visual"><span class="confetti c1">✦</span><span class="confetti c2">●</span><span class="confetti c3">✦</span><div><div class="event-stat">62%</div><b>地球防护罩已点亮</b></div></div><h2 id="dialog-title">我们又成功保卫了地球一天！</h2><p>今日 62% 的地球居民完成了运动，7,861 只外星人顺利回家。</p><button class="button button--primary" data-action="claim-badge">收下今日守卫徽章</button><button class="button button--ghost" data-action="see-scenes">看看大家的救援现场</button>`);
  } else {
    openDialog(`<div class="dialog-visual punish-visual"><div class="alien-sprite alien--pink"></div><span class="potato">🥔</span></div><h2 id="dialog-title">今日受罚现场</h2><p>沙发土豆阿福没有完成挑战，正在接受自己选择的“外星人打屁屁”惩罚。</p><button class="button button--secondary" data-action="praise-punished">给 TA 一个夸夸</button><button class="button button--ghost" data-action="close-dialog">哈哈哈 · 关闭</button>`);
  }
}

function openFriendSheet(name) {
  const friends = {
    '小鱼': { status:'今日已完成', plan:'5分钟肩颈唤醒', progress:'5 / 5 分钟', parts:'整只弹弹已回家', alien:'alien--pink' },
    '阿圆': { status:'运动进行中', plan:'5分钟腰背放松', progress:'2 / 5 分钟', parts:'已传送 2 个部位', alien:'alien--blue' },
    '毛毛': { status:'今日尚未开始', plan:'3分钟全身醒醒操', progress:'0 / 3 分钟', parts:'飞船等待动能', alien:'alien--green' }
  };
  const friend = friends[name];
  openSheet(`${name}的今日计划`, `<div class="friend-detail-top"><div class="alien-sprite ${friend.alien}"></div><div><span>${friend.status}</span><h3>${friend.plan}</h3><p>${friend.progress}</p></div></div><div class="plan-summary"><div class="summary-row"><span>救援进度</span><b>${friend.parts}</b></div><div class="summary-row"><span>运动场景</span><b>办公室</b></div><div class="summary-row"><span>难度</span><b>轻松</b></div></div><div class="friend-sheet-actions"><button class="button button--secondary" data-action="praise">♡ 给 TA 一个夸夸</button><button class="button button--ghost" data-action="nudge">🔨 轻轻锤一下</button></div>`);
}

function openJoinChallenge() {
  const join = state.join;
  openSheet('加入挑战', `
    <section class="sheet-section"><h3>使用哪个外星人</h3><div class="chip-row">${['冲冲','弹弹','慢慢'].map(value => `<button data-join="alien" data-value="${value}" class="${join.alien === value ? 'selected' : ''}">${value}</button>`).join('')}</div></section>
    <section class="sheet-section"><h3>每天提醒时间</h3><div class="chip-row">${['08:00','12:30','20:30','22:00'].map(value => `<button data-join="time" data-value="${value}" class="${join.time === value ? 'selected' : ''}">${value}</button>`).join('')}</div></section>
    <section class="sheet-section"><h3>失败惩罚</h3><div class="choice-list">${['不设置惩罚','完成一个1分钟补救任务','获得“沙发土豆”称号一天','被外星人打屁屁'].map(value => `<button data-join="punishment" data-value="${value}" class="${join.punishment === value ? 'selected' : ''}">${value}</button>`).join('')}</div></section>
    <section class="sheet-section"><h3>惩罚可见范围</h3><div class="chip-row">${['仅自己','好友','广场公开'].map(value => `<button data-join="visibility" data-value="${value}" class="${join.visibility === value ? 'selected' : ''}">${value}</button>`).join('')}</div></section>
    <div class="public-warning" id="join-warning">选择广场公开后，挑战失败的惩罚动画可能展示给所有进入社区的用户。</div>
    <label class="check-row"><input id="join-consent" type="checkbox" ${join.consent ? 'checked' : ''}>我确认这是自己选择的惩罚，并单独授权公开展示</label>
    <button class="button button--primary" id="confirm-join" data-action="confirm-join" ${join.visibility === '广场公开' && !join.consent ? 'disabled' : ''}>确认加入挑战</button>`);
}

function confirmJoin() {
  if (state.join.visibility === '广场公开' && !state.join.consent) { toast('请先确认公开授权'); return; }
  state.challengeJoined = true;
  $('#join-challenge-button').textContent = '已加入挑战';
  $('#join-challenge-button').disabled = true;
  closeSheet(); toast('已加入「7天拒绝沙发土豆」');
}

function settingsSheet(label = '设置') {
  openSheet(label, `<div class="choice-list"><button class="selected">运动提醒 <span>20:30</span></button><button>未完成时再次提醒 <span>开启</span></button><button>接收好友“锤锤” <span>开启</span></button><button>挑战截止提醒 <span>开启</span></button></div><p class="choice-note">动动提供日常轻运动建议，不能替代专业医疗意见。</p><button class="button button--primary" data-action="save-settings">保存设置</button>`);
}

function handleClick(event) {
  const target = event.target.closest('button,[data-action]');
  if (!target) return;

  if (target.dataset.config) {
    const key = target.dataset.config;
    const value = key === 'duration' ? Number(target.dataset.value) : target.dataset.value;
    state.config[key] = value; renderSetup(); return;
  }
  if (target.dataset.frequency) {
    state.config.frequency = Math.min(7, Math.max(2, state.config.frequency + Number(target.dataset.frequency)));
    const defaults = ['一','二','三','四','五','六','日']; state.config.days = defaults.filter((_, index) => index % Math.ceil(7 / state.config.frequency) === 0).slice(0, state.config.frequency);
    renderSetup(); return;
  }
  if (target.dataset.day) {
    const day = target.dataset.day;
    if (state.config.days.includes(day)) {
      if (state.config.days.length <= 2) { toast('每周至少选择 2 天'); return; }
      state.config.days = state.config.days.filter(item => item !== day);
    } else state.config.days.push(day);
    state.config.frequency = state.config.days.length; renderSetup(); return;
  }
  if (target.dataset.limit) {
    const value = target.dataset.limit;
    if (value === '无明显不适') state.config.limits = [value];
    else { state.config.limits = state.config.limits.filter(item => item !== '无明显不适'); state.config.limits = state.config.limits.includes(value) ? state.config.limits.filter(item => item !== value) : [...state.config.limits, value]; if (!state.config.limits.length) state.config.limits = ['无明显不适']; }
    renderSetup(); return;
  }
  if (target.dataset.alien) { selectAlien(target.dataset.alien); return; }
  if (target.dataset.friend) { openFriendSheet(target.dataset.friend); return; }
  if (target.dataset.date) {
    state.selectedDate = Number(target.dataset.date); renderWeek();
    $('#home-date-label').textContent = `9月${target.dataset.date}日 · 星期${target.dataset.week}`;
    toast(state.selectedDate < 23 ? '已查看完成记录' : state.selectedDate > 23 ? '已查看计划预告' : '已回到今日计划'); return;
  }
  if (target.dataset.favorite !== undefined) { toggleFavorite(Number(target.dataset.favorite)); event.stopPropagation(); return; }
  if (target.dataset.delete !== undefined) {
    if (state.actions.length <= 1) { toast('最后一个动作建议更换，不建议删除'); return; }
    state.actions.splice(Number(target.dataset.delete),1); renderActionList(); toast('已删除，计划时长已更新'); return;
  }
  if (target.dataset.replace !== undefined) { const index = Number(target.dataset.replace); state.actions[index] = { ...state.actions[index], name:'肩颈呼吸', glyph:'≈', tip:'跟随呼吸缓慢放松肩颈。' }; renderActionList(); toast('已换成肩颈呼吸'); return; }
  if (target.dataset.preview !== undefined && !event.target.closest('button')) { const action = state.actions[Number(target.dataset.preview)]; openSheet(action.name, `<div class="dialog-visual"><div class="motion-ring"><span>${action.glyph}</span></div></div><p>${action.tip}</p><p class="choice-note">动作过程中保持自然呼吸，不要追求过大的幅度。</p><button class="button button--primary" data-action="close-sheet">看懂了</button>`); return; }
  if (target.dataset.adjust) {
    const value = target.dataset.adjust === 'duration' ? Number(target.dataset.value) : target.dataset.value;
    state.config[target.dataset.adjust] = value;
    $$(`[data-adjust="${target.dataset.adjust}"]`, $('#sheet-content')).forEach(button => button.classList.toggle('selected', button.dataset.value === String(value)));
    $('#adjust-note').textContent = `修改后约 ${state.config.duration} 分钟，${state.config.duration <= 5 ? state.config.duration : Math.ceil(state.config.duration / 2)} 个动作。`; return;
  }
  if (target.dataset.communityTab) { state.communityTab = target.dataset.communityTab; renderCommunityTab(); return; }
  if (target.dataset.nav) { showScreen(target.dataset.nav); return; }
  if (target.dataset.feeling) { $$('.feeling-options button').forEach(button => button.classList.toggle('selected', button === target)); toast(`已记录：${target.dataset.feeling}`); if (target.dataset.feeling === '身体不舒服') window.setTimeout(discomfortSheet, 250); return; }
  if (target.dataset.join) { state.join[target.dataset.join] = target.dataset.value; if (target.dataset.join === 'visibility' && target.dataset.value !== '广场公开') state.join.consent = false; openJoinChallenge(); return; }

  const action = target.dataset.action;
  if (!action) return;
  const actions = {
    'skip-story': finishIntroStory,
    'start-plan': startPlan,
    'start-quick': () => { state.mode = 'quick'; renderAlienSelect(); showScreen('alien-select'); },
    'setup-back': setupBack, 'setup-next': setupNext,
    'edit-setup': () => { state.setupReview = false; state.setupStep = 0; renderSetup(); },
    'alien-back': alienBack, 'alien-preview': () => $$('.alien-choice').forEach(choice => { choice.classList.remove('preview'); void choice.offsetWidth; choice.classList.add('preview'); }),
    'confirm-alien': confirmAlien,
    'change-alien': () => { state.mode = 'change'; renderAlienSelect(); showScreen('alien-select'); },
    'adjust-plan': adjustPlanSheet,
    'save-adjust': () => { closeSheet(); renderHome(); toast($('#sync-plan')?.checked ? '已同步到后续计划' : '已更新今日计划'); },
    'start-workout': () => startWorkout(false),
    'toggle-barrage': () => { target.classList.toggle('active'); $('#barrage').hidden = !target.classList.contains('active'); },
    'toggle-guide': () => { const detail = $('#guide-detail'); detail.hidden = !detail.hidden; target.textContent = detail.hidden ? '查看完整说明 ↓' : '收起说明 ↑'; },
    'love-action': () => { const original = state.actions[state.workoutIndex]; if (original) original.favorite = true; toast(`${state.workoutActions[state.workoutIndex].name}已收藏，${state.alien}开心得跳起来！`); },
    'discomfort': discomfortSheet,
    'previous-action': previousAction, 'next-action': nextAction,
    'toggle-pause': () => { state.paused = !state.paused; renderWorkout(); toast(state.paused ? '已暂停' : '继续救援'); },
    'toggle-sound': () => { target.classList.toggle('muted'); target.textContent = target.classList.contains('muted') ? '♩' : '♫'; toast(target.classList.contains('muted') ? '音乐和语音已关闭' : '音乐和语音已开启'); },
    'exit-workout': exitWorkout,
    'continue-workout': () => { closeDialog(); state.paused = false; renderWorkout(); },
    'finish-partial': () => finishWorkout(false),
    'exit-without-part': () => { closeDialog(); stopTimer(); showScreen(state.planReady ? 'home' : 'welcome'); toast('进度已保留，再坚持一点就能传送第一个部位'); },
    'easier-action': () => { closeSheet(); state.paused = false; $('#workout-tip').textContent = '动作幅度减半，保持呼吸自然。'; toast('已切换为低难度动作'); },
    'replace-workout-action': () => { state.workoutActions[state.workoutIndex] = { name:'肩颈呼吸', duration:'60秒', part:'肩颈', glyph:'≈', tip:'跟随呼吸，缓慢放松肩膀。' }; closeSheet(); state.paused = false; renderWorkout(); toast('已更换为肩颈呼吸'); },
    'skip-workout-action': () => { closeSheet(); state.paused = false; nextAction(); toast('已跳过，并在后面补充替代动作'); },
    'complete-home': () => { if (!state.planReady && state.mode === 'quick') showScreen('welcome'); else showScreen('home'); },
    'share': () => toast('救援卡片已准备好'),
    'toggle-community-event': () => { state.communityEvent = state.communityEvent === 'celebration' ? 'punishment' : 'celebration'; toast(`下次进入社区将展示${state.communityEvent === 'celebration' ? '防卫成功' : '自主惩罚'}事件`); },
    'claim-badge': () => { closeDialog(); toast('已收下「今日地球守卫者」徽章'); },
    'see-scenes': () => { closeDialog(); state.communityTab = 'square'; renderCommunityTab(); },
    'praise': () => toast('夸夸已送达 ♡'), 'nudge': () => { target.disabled = true; target.textContent = '✓'; toast('外星人轻轻敲了敲对方的飞船'); },
    'praise-punished': () => { closeDialog(); toast('夸夸已送达：明天一起动！'); },
    'view-challenge': () => showScreen('challenge'), 'back-community': () => showScreen('community', {showEvent:false}),
    'join-challenge': openJoinChallenge, 'confirm-join': confirmJoin,
    'new-message': openNewMessageSheet, 'publish-message': publishMessage,
    'settings': () => settingsSheet(target.textContent.trim() || '设置'), 'save-settings': () => { closeSheet(); toast('设置已保存'); },
    'close-sheet': closeSheet, 'close-dialog': closeDialog,
    'action-help': () => toast('左滑可更换或删除，右滑可收藏'),
    'toast': () => toast(target.dataset.message || '已完成')
  };
  actions[action]?.();
}

document.addEventListener('click', handleClick);
$('#sheet-overlay').addEventListener('click', (event) => { if (event.target === $('#sheet-overlay')) closeSheet(); });
$('#dialog-overlay').addEventListener('click', (event) => { if (event.target === $('#dialog-overlay')) closeDialog(); });
$('#join-consent')?.addEventListener?.('change', () => {});
document.addEventListener('change', (event) => {
  if (event.target.id === 'join-consent') { state.join.consent = event.target.checked; $('#confirm-join').disabled = state.join.visibility === '广场公开' && !state.join.consent; }
});
document.addEventListener('input', (event) => {
  if (event.target.id === 'new-message-text') $('#message-count').textContent = `${event.target.value.length}/60`;
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { closeSheet(); closeDialog(); }
  if (event.key.toLowerCase() === 'r' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) { state = initialState(); stopTimer(); showScreen('welcome'); renderMemoBoard(); startIntroStory(); toast('Demo 已重置'); }
});

function registerWebMCP() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const tools = [
    {
      name:'navigate_dongdong', title:'打开动动页面', description:'打开今日、社区或我的页面。',
      inputSchema:{type:'object',properties:{screen:{type:'string',enum:['home','community','profile']}},required:['screen'],additionalProperties:false},
      annotations:{readOnlyHint:true,untrustedContentHint:false}, execute({screen}){ if (!['home','community','profile'].includes(screen)) throw new Error('不支持的页面'); showScreen(screen); return {screen}; }
    },
    {
      name:'start_quick_workout', title:'开始一分钟运动', description:'选择当前外星人并直接开始一分钟轻运动。',
      inputSchema:{type:'object',properties:{alien:{type:'string',enum:['冲冲','弹弹','慢慢']}},required:['alien'],additionalProperties:false},
      annotations:{readOnlyHint:false,untrustedContentHint:false}, execute({alien}){ if (!alienData[alien]) throw new Error('不支持此外星人'); state.alien = alien; startWorkout(true); return {status:'started',mode:'quick',alien}; }
    },
    {
      name:'configure_daily_plan', title:'调整今日计划', description:'设置今日轻运动的时长、场景和重点部位。',
      inputSchema:{type:'object',properties:{duration:{type:'number',enum:[3,5,10,15]},scene:{type:'string',enum:['办公室','家里','户外','睡前']},focus:{type:'string',enum:['肩颈','腰背','核心','腿部','全身']}},required:['duration','scene','focus'],additionalProperties:false},
      annotations:{readOnlyHint:false,untrustedContentHint:false}, execute(input){
        const valid = [3,5,10,15].includes(input.duration) && ['办公室','家里','户外','睡前'].includes(input.scene) && ['肩颈','腰背','核心','腿部','全身'].includes(input.focus);
        if (!valid) throw new Error('计划参数不在可选范围内');
        state.config = {...state.config,...input}; renderHome(); return {status:'updated',plan:input};
      }
    }
  ];
  tools.forEach(tool => { try { void Promise.resolve(context.registerTool(tool)).catch(() => {}); } catch (_) {} });
}

renderSetup(); renderHome(); renderMemoBoard(); startIntroStory(); registerWebMCP();
