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

const quickActions = [
  { id: "wake", name: "全身醒醒操", duration: "60秒", part: "全身", glyph: "✦", tip: "跟着节奏活动肩膀、手臂和双腿。" },
  { id: "neck", name: "肩颈放松", duration: "60秒", part: "肩颈", glyph: "↻", tip: "肩膀缓慢向后绕环，再轻轻左右侧颈。" },
  { id: "chest", name: "站姿扩胸", duration: "60秒", part: "上背", glyph: "↗", tip: "双臂向后打开，胸口自然抬起。" },
  { id: "march", name: "原地踏步", duration: "60秒", part: "腿部", glyph: "⇅", tip: "抬膝踏步，手臂自然摆动，保持呼吸顺畅。" },
  { id: "breath", name: "呼吸伸展", duration: "60秒", part: "全身", glyph: "≈", tip: "吸气双手上举，呼气缓慢放下，适合睡前。" }
];

const STORAGE_KEY = "dongdong.demo.v1";
const defaultQuick = () => ({ actionId: "wake", alien: "弹弹", fab: { side: "right", top: 1 } });

function loadSaved() {
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {}; } catch (_) { return {}; }
}

function saveState() {
  const { planReady, alien, config, quick } = state;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ planReady, alien, config, quick })); } catch (_) {}
}

const FOCUS_OPTIONS = ["肩颈", "腰背", "核心", "腿部", "全身"];
const GOAL_OPTIONS = ["养成运动习惯", "改善体态", "减脂塑形", "提升活力"];

function selectedList(options, selected) {
  const list = Array.isArray(selected) ? selected : selected ? [selected] : [];
  const ordered = options.filter((item) => list.includes(item));
  return ordered.length ? ordered : [options[0]];
}

function normalizeConfig(config) {
  const focuses = selectedList(FOCUS_OPTIONS, config.focuses || config.focus);
  const goals = selectedList(GOAL_OPTIONS, config.goals || config.goal);
  const reminder = config.reminder && config.reminder !== "暂不设置" ? config.reminder : "19:00";
  return {
    ...config,
    focuses,
    focus: focuses[0],
    goals,
    goal: goals[0],
    reminder,
    reminderEnabled: config.reminderEnabled !== undefined ? Boolean(config.reminderEnabled) : config.reminder !== "暂不设置"
  };
}

function focusLabel() {
  return selectedList(FOCUS_OPTIONS, state.config.focuses).join("、");
}

function goalLabel() {
  return selectedList(GOAL_OPTIONS, state.config.goals).join("、");
}

const initialState = (saved = {}) => ({
  screen: "welcome",
  previousScreen: "welcome",
  setupStep: 0,
  setupReview: false,
  mode: "formal",
  alien: alienData[saved.alien] ? saved.alien : "弹弹",
  sessionAlien: null,
  planReady: Boolean(saved.planReady),
  completed: false,
  completedParts: 0,
  selectedDate: 23,
  config: normalizeConfig({
    scene: "办公室", duration: 5, focus: "肩颈", frequency: 3,
    days: ["一", "三", "五"], reminder: "19:00", age: "25～34岁",
    foundation: "几乎不运动", goal: "养成运动习惯", limits: ["无明显不适"],
    ...saved.config
  }),
  quick: { ...defaultQuick(), ...saved.quick, fab: { ...defaultQuick().fab, ...saved.quick?.fab } },
  quickDraft: null,
  actions: baseActions.map((item) => ({ ...item, favorite: false })),
  workoutActions: [], workoutIndex: 0, seconds: 60, paused: false, following: false,
  communityTab: "friends", community: null, selectedChallengeId: null, activeFriendId: null,
  join: { alien: "弹弹", time: "20:30", punishment: "被外星人打屁屁", visibility: "广场公开", consent: false }
});

let state = initialState(loadSaved());
let suppressFabClick = false;
let workoutTimer = null;
let toastTimer = null;
let storyTimer = null;
let storyIndex = 0;
const screens = $$('[data-screen]');

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
  $('#quick-fab').hidden = !['home', 'community', 'profile'].includes(name);
  if (name === 'home') renderHome();
  if (name === 'community') {
    renderCommunity();
    loadCommunity();
  }
  if (name === 'challenge') renderChallengeDetail();
  if (name === 'profile') loadProfile();
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
    title: '你喜欢怎么动？', intro: '按你平时的习惯来选，之后随时能改。',
    content: () => `
      ${choiceGroup('场景', 'scene', ['办公室','家里','户外','睡前'], state.config.scene)}
      ${choiceGroup('可接受时长', 'duration', [3,5,10,15], state.config.duration, (value) => `${value}分钟${value === 5 ? '<small>最容易坚持</small>' : ''}`, 'choice-grid--wide')}
      ${multiChoiceGroup('偏好部位', 'focuses', FOCUS_OPTIONS, state.config.focuses)}
      <p class="choice-note">会优先安排${focusLabel()}的放松与活动。</p>`
  },
  {
    title: '一周动几次？', intro: '不用排得太满，留一点轻松坚持的空间。',
    content: () => `
      <section class="form-group"><h3>每周运动频次</h3><div class="frequency"><button data-frequency="-1" aria-label="减少频次">−</button><strong>每周 ${state.config.frequency} 次</strong><button data-frequency="1" aria-label="增加频次">＋</button></div><p class="choice-note">每周${state.config.frequency}次，每次${state.config.duration}分钟，一周只需要${state.config.frequency * state.config.duration}分钟。</p></section>
      <section class="form-group"><h3>运动日</h3><div class="chip-row">${['一','二','三','四','五','六','日'].map(day => `<button data-day="${day}" class="${state.config.days.includes(day) ? 'selected' : ''}">周${day}</button>`).join('')}</div></section>
      <section class="form-group"><h3>提醒时间</h3><div class="time-slider"><strong id="reminder-clock">${state.config.reminder}</strong><input id="reminder-range" type="range" min="0" max="287" step="1" value="${reminderIndex(state.config.reminder)}" aria-label="提醒时间"><div class="time-slider-scale"><span>00:00</span><span>12:00</span><span>23:55</span></div></div><label class="check-row"><input id="reminder-enabled" type="checkbox" ${state.config.reminderEnabled ? 'checked' : ''}>到点用电脑提醒我</label><p class="choice-note">打开后会调用这台电脑的通知。页面留在浏览器里时，到点会响一次。</p></section>`
  },
  {
    title: '再认识你一点', intro: '这些信息只用来调整动作难度，不展示给其他人。',
    content: () => `
      ${choiceGroup('年龄段', 'age', ['18岁以下','18～24岁','25～34岁','35～44岁','45～59岁','60岁以上'], state.config.age)}
      ${choiceGroup('运动基础', 'foundation', ['几乎不运动','偶尔运动','规律运动'], state.config.foundation)}
      ${multiChoiceGroup('主要目标', 'goals', GOAL_OPTIONS, state.config.goals)}`
  },
  {
    title: '有什么需要避开？', intro: '可以多选；运动过程中如感到疼痛，请立即停止。',
    content: () => `<section class="form-group"><h3>身体限制</h3><div class="choice-list">${['无明显不适','膝盖不适','腰背不适','肩颈不适','手腕不适','其他'].map(value => `<button data-limit="${value}" class="${state.config.limits.includes(value) ? 'selected' : ''}">${value}</button>`).join('')}</div>${state.config.limits[0] !== '无明显不适' ? '<p class="choice-note">我们将减少相关部位的冲击动作。</p>' : ''}</section>`
  }
];

function choiceGroup(label, key, values, selected, formatter = (value) => value, extraClass = '') {
  return `<section class="form-group"><h3>${label}</h3><div class="choice-grid ${extraClass}">${values.map(value => `<button data-config="${key}" data-value="${value}" class="${String(value) === String(selected) ? 'selected' : ''}">${formatter(value)}</button>`).join('')}</div></section>`;
}

function multiChoiceGroup(label, key, values, selected) {
  const chosen = new Set(selectedList(values, selected));
  return `<section class="form-group"><h3>${label}</h3><div class="choice-grid">${values.map(value => `<button data-multi="${key}" data-value="${value}" class="${chosen.has(value) ? 'selected' : ''}">${value}</button>`).join('')}</div></section>`;
}

function reminderIndex(time) {
  const match = String(time || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 19 * 12;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return Math.max(0, Math.min(287, Math.round(minutes / 5)));
}

function timeFromIndex(index) {
  const total = Number(index) * 5;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
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
      <div class="plan-summary"><h3>${state.config.duration}分钟${focusLabel()}唤醒</h3>
        <div class="summary-row"><span>频次</span><b>每周${state.config.frequency}次</b></div>
        <div class="summary-row"><span>主要场景</span><b>${state.config.scene}</b></div>
        <div class="summary-row"><span>偏好部位</span><b>${focusLabel()}</b></div>
        <div class="summary-row"><span>目标</span><b>${goalLabel()}</b></div>
        <div class="summary-row"><span>提醒</span><b>${state.config.reminderEnabled ? state.config.reminder : '暂不设置'}</b></div>
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
  if (state.setupStep === 1) armComputerReminder({ announce: true });
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
  if (state.mode === 'quick') { state.quick.alien = state.alien; saveState(); startWorkout(true); return; }
  if (state.mode === 'change') { saveState(); showScreen('home'); toast(`今天改为救援${state.alien}`); return; }
  submitOnboarding();
}

function onboardingPayload() {
  const c = state.config;
  return {
    scene: c.scene, duration_min: c.duration, focus: c.focuses,
    frequency_per_week: c.days.length, weekdays: c.days, reminder: c.reminderEnabled ? c.reminder : '暂不设置',
    age_band: c.age, fitness_level: c.foundation, primary_goal: c.goals,
    body_limits: c.limits, alien_code: state.alien
  };
}

function applyServerProfile(me) {
  if (!me?.onboarding_completed) return false;
  const focuses = me.preferences.focus_labels?.length ? me.preferences.focus_labels : [me.preferences.focus_label];
  const goals = me.health.primary_goal_labels?.length ? me.health.primary_goal_labels : [me.health.primary_goal_label];
  state.config = normalizeConfig({
    ...state.config,
    scene: me.preferences.scene_label, duration: me.preferences.duration_min, focuses, focus: focuses[0],
    frequency: me.plan.frequency_per_week, days: me.plan.weekday_labels,
    reminder: me.plan.reminder || '19:00', reminderEnabled: Boolean(me.plan.reminder),
    age: me.health.age_band_label, foundation: me.health.fitness_level_label, goals, goal: goals[0],
    limits: me.body_limits.map(item => item.label)
  });
  if (alienData[me.alien?.name]) state.alien = me.alien.name;
  state.planReady = true;
  saveState();
  return true;
}

let onboardingSubmitting = false;
async function submitOnboarding() {
  if (onboardingSubmitting) return;
  onboardingSubmitting = true;
  const button = $('[data-action="confirm-alien"]');
  const label = button.textContent;
  button.disabled = true;
  button.textContent = '正在保存计划…';
  try {
    applyServerProfile(await window.dongdongApi.submitOnboarding(onboardingPayload()));
    showScreen('home');
    toast(`周计划已保存，今天从 ${state.config.duration} 分钟开始`);
  } catch (error) {
    toast(error.status === 400 ? '计划信息有误，请返回检查后再试' : '网络开小差了，计划还没保存，请再试一次');
  } finally {
    onboardingSubmitting = false;
    button.disabled = false;
    button.textContent = label;
  }
}

async function syncWithServer() {
  const api = window.dongdongApi;
  if (!api) return;
  if (!api.hasSession() && !state.planReady) { api.ensureSession().catch(() => {}); return; }
  try {
    let me = await api.getMe();
    if (!me.onboarding_completed && state.planReady) me = await api.submitOnboarding(onboardingPayload());
    if (!applyServerProfile(me)) return;
    if (state.screen === 'welcome') { finishIntroStory(); showScreen('home'); }
    else if (state.screen === 'home') renderHome();
  } catch (_) {}
}

function alienBack() {
  if (state.mode === 'quick') showScreen('welcome');
  else if (state.mode === 'change') showScreen('home');
  else showScreen('setup');
}

function renderAlienClasses() {
  const sessionAlien = state.sessionAlien || state.alien;
  [['#home-alien', state.alien], ['#workout-alien', sessionAlien], ['#complete-alien', sessionAlien]].forEach(([selector, name]) => {
    const element = $(selector);
    if (!element) return;
    element.classList.remove('alien--pink','alien--blue','alien--green');
    element.classList.add(alienData[name].className);
  });
}

const SCENE_CODE = { 办公室: 'office', 家里: 'home', 户外: 'outdoor', 睡前: 'bedtime' };
const FOCUS_CODE = { 肩颈: 'neck', 腰背: 'back', 核心: 'core', 腿部: 'legs', 全身: 'full' };
const LIMIT_CODE = { 膝盖不适: 'knee', 腰背不适: 'back', 肩颈不适: 'neck', 手腕不适: 'wrist' };
const ACTION_GLYPH = { stretch: '⌒', mobility: '↻', activation: '✦', low_impact_cardio: '⇅', relax: '≈' };
let actionCatalog = null;
let planMatchKey = '';

function toPlanAction(row) {
  return {
    code: row.code,
    name: row.name,
    duration: `${row.duration_sec || 60}秒`,
    part: row.primary_body_part,
    glyph: ACTION_GLYPH[row.action_type] || '·',
    tip: row.screen_cue || '动作慢一点，保持能正常说话。',
    steps: row.steps || '',
    source: row.source,
    favorite: false
  };
}

function matchPlanActions(rows, config) {
  const scene = SCENE_CODE[config.scene];
  const focuses = selectedList(FOCUS_OPTIONS, config.focuses || config.focus).map((label) => FOCUS_CODE[label]).filter(Boolean);
  const matchAnyFocus = focuses.includes('full');
  const limits = (config.limits || []).map((label) => LIMIT_CODE[label]).filter(Boolean);
  const fits = (row, ignoreFocus, allowCaution) => {
    if (scene && !(row.scenes || []).includes(scene)) return false;
    if (!ignoreFocus && !matchAnyFocus && !focuses.some((focus) => (row.focus_areas || []).includes(focus))) return false;
    return limits.every((part) => {
      const suitability = row[`limit_${part}`];
      if (suitability === 'unsuitable') return false;
      return allowCaution || suitability !== 'caution';
    });
  };
  let pool = rows.filter((row) => fits(row, false, false));
  if (pool.length < config.duration) pool = rows.filter((row) => fits(row, false, true));
  if (pool.length < Math.min(3, config.duration)) pool = rows.filter((row) => fits(row, true, true));
  const groups = new Map();
  pool.forEach((row) => {
    const key = row.source || 'dongdong';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  const buckets = [...groups.values()];
  const count = Math.max(1, config.duration);
  const picked = [];
  for (let index = 0; picked.length < count && buckets.some((bucket) => bucket.length); index += 1) {
    const bucket = buckets[index % buckets.length];
    if (bucket.length) picked.push(bucket.shift());
  }
  return picked.map(toPlanAction);
}

function syncActionsToPlan() {
  if (!actionCatalog?.length) return;
  const key = JSON.stringify([state.config.scene, state.config.focuses, state.config.duration, state.config.limits]);
  if (key === planMatchKey) return;
  const matched = matchPlanActions(actionCatalog, state.config);
  if (!matched.length) return;
  planMatchKey = key;
  state.actions = matched;
}

async function ensureActionCatalog() {
  if (actionCatalog || !window.dongdongApi?.listActions) return;
  try {
    actionCatalog = await window.dongdongApi.listActions();
    if (state.screen === 'home') renderHome();
  } catch (_) {
    actionCatalog = null;
  }
}

function renderHome() {
  syncActionsToPlan();
  const data = alienData[state.alien];
  renderAlienClasses();
  $('#home-alien-name').textContent = state.alien;
  $('#home-title').textContent = `下午好，今天动${state.config.duration}分钟吧`;
  $('#home-plan-name').textContent = `${state.config.duration}分钟${focusLabel()}唤醒`;
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
      <div class="action-row" data-preview="${index}"><span class="motion-icon">${action.glyph}</span><div><strong>${action.name}</strong><small>${action.duration} · ${action.part}${action.code?.startsWith('E') ? ' · 动作库' : ''}</small></div><button class="favorite ${action.favorite ? 'active' : ''}" data-favorite="${index}" aria-label="${action.favorite ? '取消收藏' : '收藏'}${action.name}">${action.favorite ? '♥' : '♡'}</button></div></div>`).join('');
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
    <section class="sheet-section"><h3>偏好部位</h3><div class="chip-row">${FOCUS_OPTIONS.map(value => `<button data-adjust="focus" data-value="${value}" class="${state.config.focuses.includes(value) ? 'selected' : ''}">${value}</button>`).join('')}</div></section>
    <p class="choice-note" id="adjust-note">修改后约 ${state.config.duration} 分钟，${state.actions.length} 个动作。</p>
    <label class="check-row"><input type="checkbox" id="sync-plan">同步到后续计划</label>
    <button class="button button--primary" data-action="save-adjust">仅修改今天</button>`);
}

function getQuickAction(id = state.quick.actionId) {
  return quickActions.find(item => item.id === id) || quickActions[0];
}

function renderQuickFab() {
  const action = getQuickAction();
  $('#quick-fab-glyph').textContent = action.glyph;
  $('#quick-fab-main').setAttribute('aria-label', `快速开启一分钟运动：${action.name}，搭档${state.quick.alien}`);
  positionQuickFab();
}

function positionQuickFab() {
  const fab = $('#quick-fab');
  const shellHeight = $('.phone-shell').clientHeight;
  const minTop = 56;
  const maxTop = shellHeight - 82 - (fab.offsetHeight || 64) - 12;
  const top = Math.min(maxTop, Math.max(minTop, state.quick.fab.top * shellHeight));
  const left = state.quick.fab.side === 'left';
  fab.style.top = `${top}px`;
  fab.style.left = left ? '12px' : 'auto';
  fab.style.right = left ? 'auto' : '12px';
  fab.classList.toggle('quick-fab--left', left);
}

function initQuickFab() {
  const fab = $('#quick-fab');
  const shell = $('.phone-shell');
  let drag = null;
  fab.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const rect = fab.getBoundingClientRect();
    drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, moved: false };
  });
  fab.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.moved) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
      drag.moved = true;
      fab.setPointerCapture(event.pointerId);
      fab.classList.add('dragging');
    }
    const shellRect = shell.getBoundingClientRect();
    const x = Math.min(shellRect.width - fab.offsetWidth, Math.max(0, event.clientX - shellRect.left - drag.offsetX));
    const y = Math.min(shellRect.height - fab.offsetHeight, Math.max(0, event.clientY - shellRect.top - drag.offsetY));
    fab.style.left = `${x}px`; fab.style.right = 'auto'; fab.style.top = `${y}px`;
  });
  const endDrag = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (drag.moved) {
      const shellRect = shell.getBoundingClientRect();
      const fabRect = fab.getBoundingClientRect();
      const centerX = fabRect.left + fabRect.width / 2 - shellRect.left;
      state.quick.fab = { side: centerX < shellRect.width / 2 ? 'left' : 'right', top: (fabRect.top - shellRect.top) / shellRect.height };
      fab.classList.remove('dragging');
      positionQuickFab(); saveState();
      suppressFabClick = event.type === 'pointerup';
    }
    drag = null;
  };
  fab.addEventListener('pointerup', endDrag);
  fab.addEventListener('pointercancel', endDrag);
  fab.addEventListener('click', (event) => {
    if (!suppressFabClick) return;
    suppressFabClick = false;
    event.stopPropagation(); event.preventDefault();
  }, true);
  window.addEventListener('resize', positionQuickFab);
}

function quickSettingsSheet() {
  state.quickDraft = { actionId: getQuickAction().id, alien: state.quick.alien };
  const draft = state.quickDraft;
  openSheet('快速开启设定', `
    <p class="setup-intro">点击悬浮球会直接开始这 1 分钟，不用再选择。拖动悬浮球可以放到屏幕两侧。</p>
    <section class="sheet-section"><h3>快速动作</h3><div class="choice-list">${quickActions.map(item => `<button class="quick-action-option ${draft.actionId === item.id ? 'selected' : ''}" data-quick-action="${item.id}"><b><i aria-hidden="true">${item.glyph}</i>${item.name}</b><small>${item.part} · 60秒</small></button>`).join('')}</div></section>
    <section class="sheet-section"><h3>救援搭档</h3><div class="chip-row">${Object.keys(alienData).map(name => `<button data-quick-alien="${name}" class="${draft.alien === name ? 'selected' : ''}">${name}</button>`).join('')}</div></section>
    <button class="button button--primary" data-action="save-quick">保存设定</button>
    <button class="button button--ghost" data-action="save-quick-start">保存并开始</button>`);
}

function saveQuickSettings() {
  state.quick = { ...state.quick, ...state.quickDraft };
  state.quickDraft = null;
  saveState(); renderQuickFab(); closeSheet();
}

function startWorkout(quick = false, alien) {
  state.mode = quick ? 'quick' : 'formal';
  state.sessionAlien = alien || (quick ? state.quick.alien : state.alien);
  state.workoutActions = quick ? [{ ...getQuickAction() }] : state.actions.map(item => ({...item}));
  state.workoutIndex = 0; state.seconds = 60; state.paused = false; state.following = true;
  renderWorkout(); showScreen('workout'); startTimer();
}

function openWorkoutAt(index) {
  state.mode = 'formal';
  state.sessionAlien = state.alien;
  state.workoutActions = state.actions.map(item => ({ ...item }));
  state.workoutIndex = index;
  state.seconds = 60;
  state.paused = true;
  state.following = false;
  stopTimer();
  renderWorkout();
  showScreen('workout');
}

function beginFollow() {
  state.following = true;
  state.paused = false;
  renderWorkout();
  startTimer();
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
  $('#guide-detail').textContent = action.steps || '保持呼吸自然，动作幅度以舒适为准。如果出现刺痛或眩晕，请立刻停止。';
  $('#motion-demo').setAttribute('aria-label', `${action.name}的动作示意`);
  $('#timer').textContent = formatTime(state.seconds);
  $('#next-action-label').textContent = state.workoutIndex + 1 < total ? `下一个：${state.workoutActions[state.workoutIndex + 1].name}` : '完成这个动作，飞船就能出发';
  const pauseButton = $('.pause-button');
  pauseButton.classList.toggle('is-start', !state.following);
  if (!state.following) {
    pauseButton.textContent = '开始';
    pauseButton.setAttribute('aria-label', '开始跟练');
  } else {
    pauseButton.textContent = state.paused ? '▶' : 'Ⅱ';
    pauseButton.setAttribute('aria-label', state.paused ? '继续跟练' : '暂停');
  }
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
  state.workoutIndex += 1; state.seconds = 60; state.paused = !state.following; renderWorkout();
}
function previousAction(){ if (state.workoutIndex > 0) { state.workoutIndex -= 1; state.seconds = 60; renderWorkout(); } else toast('已经是第一个动作'); }

function finishWorkout(full) {
  stopTimer();
  const quick = state.mode === 'quick';
  const alien = state.sessionAlien || state.alien;
  const parts = quick ? 1 : full ? 5 : Math.max(1, state.workoutIndex);
  if (!quick || !state.planReady) { state.completed = full; state.completedParts = parts; }
  const minutes = quick ? 1 : full ? state.config.duration : parts;
  $('#complete-kicker').textContent = quick ? '快速一分钟已完成' : full ? '完整计划已完成' : '今天已经产生动能';
  $('#complete-title').innerHTML = quick ? `第一个部位已传送！<br>${alien}离家又近了一点。` : full ? `救援成功！<br>${alien}已经完整回家。` : `今天先送回了${parts}个部位。`;
  $('#complete-desc').textContent = quick ? (state.planReady ? '快速一分钟单独记录，不影响今天的正式救援计划。' : '完成一分钟也很了不起。想完整送 TA 回家，可以设置正式计划。') : full ? `你今天的 ${minutes} 分钟，让地球和${alienData[alien].planet}都亮了一点。` : `再动${Math.max(1, state.config.duration - minutes)}分钟，就能把${alien}完整送回家。`;
  $('.celebrate-zone .planet').textContent = alienData[alien].planet;
  $('#complete-minutes').textContent = minutes;
  $('#complete-actions').textContent = quick ? 1 : full ? state.workoutActions.length : parts;
  $('#complete-energy').textContent = `+${minutes}`;
  $('#quick-plan-cta').hidden = !quick || state.planReady;
  window.dongdongApi?.communityAct?.({
    op: 'complete',
    active_sec: minutes * 60,
    completed: !quick && Boolean(full),
    alien: state.sessionAlien || state.alien
  }).catch(() => {});
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

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function messageTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return '刚刚';
  if (diff < 86_400_000) return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function shortDate(iso) {
  const [, month, day] = String(iso || '').split('-');
  if (!month || !day) return '';
  return `${Number(month)}月${Number(day)}日`;
}

function emptyNote(text) {
  const note = document.createElement('p');
  note.className = 'community-empty';
  note.textContent = text;
  return note;
}

function friendAvatar() {
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="25" r="14"/><path d="M14 58c2-13 10-20 18-20s16 7 18 20"/><path class="hair" d="M18 25c0-18 28-19 28 0-6-7-22-7-28 0z"/></svg>`;
}

let communityEpoch = 0;

function applyCommunity(data) {
  communityEpoch += 1;
  state.community = data;
  renderCommunity();
  if (state.screen === 'challenge') renderChallengeDetail();
}

function loadCommunity() {
  if (!window.dongdongApi?.community || loadCommunity.pending) return loadCommunity.pending;
  const epoch = communityEpoch;
  loadCommunity.pending = window.dongdongApi.community().then((data) => {
    if (epoch === communityEpoch) {
      state.community = data;
      renderCommunity();
      if (state.screen === 'challenge') renderChallengeDetail();
    }
    if (data.popup && state.screen === 'community') showCommunityPopup(data.popup);
    else if (data.popup) window.dongdongApi.communityAct({ op: 'dismiss-popup' }).catch(() => {});
  }).catch((error) => {
    toast(error.message || '社区暂时打不开');
  }).finally(() => { loadCommunity.pending = null; });
  return loadCommunity.pending;
}

function renderCommunity() {
  renderCommunityTab();
  renderDefense();
  renderFriends();
  renderMemoBoard();
  renderChallengeList();
}

function renderCommunityTab() {
  $$('[data-community-tab]').forEach(button => button.classList.toggle('active', button.dataset.communityTab === state.communityTab));
  $('#friends-panel').hidden = state.communityTab !== 'friends';
  $('#square-panel').hidden = state.communityTab !== 'square';
}

function renderDefense() {
  const defense = state.community?.earth_defense;
  const bar = $('#defense-bar');
  const participants = $('#defense-participants');
  const rescued = $('#defense-rescued');
  if (!bar || !participants || !rescued) return;
  if (!defense) {
    bar.style.width = '0%';
    participants.textContent = '读取今日进度…';
    rescued.textContent = '';
    return;
  }
  const percent = Math.round((defense.completion_rate || 0) * 100);
  bar.style.width = `${percent}%`;
  participants.textContent = `${defense.participants} 人已安排计划`;
  rescued.textContent = `已送回 ${defense.rescued_aliens} 只`;
}

function renderFriends() {
  const grid = $('#friend-grid');
  const count = $('#friend-count');
  if (!grid) return;
  const friends = state.community?.friends || [];
  if (count) count.textContent = state.community ? `${friends.length} 位` : '读取中';
  grid.replaceChildren();
  if (!state.community) {
    grid.append(emptyNote('正在读取好友。'));
    return;
  }
  if (!friends.length) {
    grid.append(emptyNote('还没有好友。完成今天的运动后，你的进度会记在地球防卫里。'));
    return;
  }
  friends.forEach((friend) => {
    const card = document.createElement('article');
    card.className = 'friend-bubble';
    card.innerHTML = `<button class="friend-avatar" data-friend-id="${escapeHtml(friend.id)}" aria-label="查看${escapeHtml(friend.name)}的计划">${friendAvatar()}</button><strong></strong><div class="friend-actions"><button data-action="praise" data-user-id="${escapeHtml(friend.id)}" aria-label="夸夸${escapeHtml(friend.name)}" ${friend.praised_today ? 'disabled' : ''}>${friend.praised_today ? '✓' : '♡'}</button><button data-action="nudge" data-user-id="${escapeHtml(friend.id)}" aria-label="锤锤${escapeHtml(friend.name)}" ${friend.nudged_today ? 'disabled' : ''}>${friend.nudged_today ? '✓' : '🔨'}</button></div>`;
    card.querySelector('strong').textContent = friend.name;
    grid.append(card);
  });
}

function renderMemoBoard() {
  const board = $('#memo-board');
  if (!board) return;
  const messages = state.community?.messages || [];
  board.replaceChildren();
  if (!state.community) {
    board.append(emptyNote('正在读取留言。'));
  } else if (!messages.length) {
    board.append(emptyNote('还没有留言，写第一句吧。'));
  } else {
    messages.forEach((message) => {
      const note = document.createElement('button');
      note.className = `memo-note ${message.mine ? 'memo-note--peach' : ''}`.trim();
      note.dataset.action = 'toast';
      note.dataset.message = message.body;
      const author = document.createElement('span');
      const copy = document.createElement('p');
      const time = document.createElement('small');
      author.textContent = message.author;
      copy.textContent = message.body;
      time.textContent = messageTime(message.created_at);
      note.append(author, copy, time);
      board.append(note);
    });
  }
  const counter = $('#memo-count');
  if (counter) counter.textContent = `${messages.length} 条留言`;
}

function openNewMessageSheet() {
  openSheet('新建留言', `<p class="setup-intro">写给一起运动的人。</p><label class="message-compose"><span>留言内容</span><textarea id="new-message-text" maxlength="60" placeholder="例如：今晚 8 点一起动 5 分钟？"></textarea></label><div class="message-compose-meta"><span>将展示在留言板</span><b id="message-count">0/60</b></div><button class="button button--primary" data-action="publish-message">发布留言</button>`);
  window.requestAnimationFrame(() => $('#new-message-text')?.focus());
}

async function publishMessage() {
  const input = $('#new-message-text');
  const text = input?.value.trim();
  if (!text) { toast('先写一句留言吧'); input?.focus(); return; }
  try {
    applyCommunity(await window.dongdongApi.communityAct({ op: 'message', body: text }));
    closeSheet();
    toast('留言已贴到留言板');
  } catch (error) {
    toast(error.message || '留言没有发出去');
  }
}

function showCommunityPopup(popup) {
  openDialog(`<div class="dialog-visual"><span class="confetti c1">✦</span><span class="confetti c2">●</span><span class="confetti c3">✦</span><div><div class="event-stat">${escapeHtml(popup.rate_label)}</div><b>地球防护罩</b></div></div><h2 id="dialog-title">${escapeHtml(popup.title)}</h2><p>${escapeHtml(popup.body)}</p><button class="button button--primary" data-action="close-dialog">知道了</button><button class="button button--ghost" data-action="see-scenes">看看挑战</button>`);
}

function openFriendSheet(id) {
  const friend = (state.community?.friends || []).find((item) => item.id === id);
  if (!friend) return;
  state.activeFriendId = id;
  const alien = friend.status === '今日已完成' ? 'alien--pink' : friend.status === '运动进行中' ? 'alien--blue' : 'alien--green';
  openSheet(`${friend.name}的今日计划`, `<div class="friend-detail-top"><div class="alien-sprite ${alien}"></div><div><span>${escapeHtml(friend.status)}</span><h3>${escapeHtml(friend.plan)}</h3><p>${escapeHtml(friend.progress)}</p></div></div><div class="plan-summary"><div class="summary-row"><span>救援进度</span><b>${escapeHtml(friend.parts)}</b></div><div class="summary-row"><span>运动场景</span><b>${escapeHtml(friend.scene_label)}</b></div></div><div class="friend-sheet-actions"><button class="button button--secondary" data-action="praise" data-user-id="${escapeHtml(friend.id)}" ${friend.praised_today ? 'disabled' : ''}>♡ 给 TA 一个夸夸</button><button class="button button--ghost" data-action="nudge" data-user-id="${escapeHtml(friend.id)}" ${friend.nudged_today ? 'disabled' : ''}>🔨 轻轻锤一下</button></div>`);
}

function renderChallengeList() {
  const list = $('#challenge-list');
  const count = $('#challenge-count');
  if (!list) return;
  const challenges = state.community?.challenges || [];
  if (count) count.textContent = state.community ? `正在进行 ${challenges.length} 个` : '读取中';
  list.replaceChildren();
  if (!state.community) {
    list.append(emptyNote('正在读取挑战。'));
    return;
  }
  if (!challenges.length) {
    list.append(emptyNote('今天没有进行中的挑战。'));
    return;
  }
  challenges.forEach((challenge) => {
    const button = document.createElement('button');
    button.className = 'challenge-list-item';
    button.dataset.challengeId = challenge.id;
    const percent = Math.round((challenge.today_completion_rate || 0) * 100);
    button.innerHTML = `<span class="challenge-number">${challenge.duration_days}<small>DAYS</small></span><span class="challenge-copy"><small></small><strong></strong><em></em></span>`;
    const bits = button.querySelector('.challenge-copy').querySelectorAll('small, strong, em');
    bits[0].textContent = `${challenge.member_count} 人参加${challenge.joined ? ' · 已加入' : ''}`;
    bits[1].textContent = challenge.title;
    bits[2].textContent = `每天 ${challenge.daily_minutes} 分钟 · 今日完成 ${percent}%`;
    list.append(button);
  });
}

function selectedChallenge() {
  return (state.community?.challenges || []).find((item) => item.id === state.selectedChallengeId) || null;
}

function renderChallengeDetail() {
  const challenge = selectedChallenge();
  const title = $('#challenge-title');
  if (!title) return;
  if (!challenge) {
    $('#challenge-dates').textContent = state.community ? '没有找到这个挑战' : '读取挑战…';
    title.textContent = '挑战';
    $('#challenge-desc').textContent = '';
    $('#challenge-people').replaceChildren();
    return;
  }
  $('#challenge-dates').textContent = `${shortDate(challenge.starts_on)}—${shortDate(challenge.ends_on)}`;
  title.textContent = challenge.title;
  $('#challenge-desc').textContent = challenge.member_count
    ? `${challenge.description} 目前 ${challenge.member_count} 人参加。`
    : challenge.description;
  const people = $('#challenge-people');
  people.replaceChildren();
  const names = challenge.ranking.map((item) => item.name).slice(0, 4);
  names.forEach((name) => {
    const chip = document.createElement('span');
    chip.textContent = name.slice(0, 1);
    people.append(chip);
  });
  if (challenge.member_count > names.length) {
    const more = document.createElement('b');
    more.textContent = `+${challenge.member_count - names.length}`;
    people.append(more);
  }
  $('#challenge-minutes').textContent = `${challenge.daily_minutes}分钟`;
  $('#challenge-rate').textContent = `${Math.round((challenge.today_completion_rate || 0) * 100)}%`;
  $('#challenge-visibility').textContent = challenge.joined ? challenge.visibility_label : '未加入';
  $('#challenge-visibility-label').textContent = challenge.joined ? '我的可见范围' : '可见范围';
  $('#challenge-punishment').textContent = challenge.joined ? challenge.punishment_label : '加入后选择';
  $('#challenge-punishment-note').textContent = '只有你主动选择并再次授权后，惩罚才会公开。';
  const ranking = $('#challenge-ranking');
  ranking.replaceChildren();
  if (!challenge.ranking.length) {
    const item = document.createElement('li');
    item.textContent = '还没有人加入，完成后会出现在这里。';
    ranking.append(item);
  } else {
    challenge.ranking.forEach((item, index) => {
      const row = document.createElement('li');
      const order = document.createElement('span');
      const name = document.createElement('em');
      const time = document.createElement('b');
      order.textContent = String(index + 1);
      name.textContent = item.name;
      time.textContent = item.time_label;
      row.append(order, name, time);
      ranking.append(row);
    });
  }
  const joinButton = $('#join-challenge-button');
  joinButton.textContent = challenge.joined ? '已加入挑战' : '加入挑战';
  joinButton.disabled = challenge.joined;
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

async function confirmJoin() {
  const challenge = selectedChallenge();
  if (!challenge) { toast('先选择一个挑战'); return; }
  if (state.join.visibility === '广场公开' && !state.join.consent) { toast('请先确认公开授权'); return; }
  try {
    applyCommunity(await window.dongdongApi.communityAct({
      op: 'join',
      challenge_id: challenge.id,
      alien: state.join.alien,
      reminder_time: state.join.time,
      punishment: state.join.punishment,
      visibility: state.join.visibility,
      public_allowed: state.join.visibility === '广场公开' && state.join.consent
    }));
    closeSheet();
    toast(`已加入「${challenge.title}」`);
  } catch (error) {
    toast(error.message || '暂时没能加入挑战');
  }
}

async function reactToFriend(type, userId) {
  if (!userId) return;
  try {
    applyCommunity(await window.dongdongApi.communityAct({ op: 'react', target_user_id: userId, reaction_type: type }));
    closeSheet();
    toast(type === 'praise' ? '夸夸已送达' : '轻轻锤了一下');
  } catch (error) {
    toast(error.message || '这次互动没有送出');
  }
}

function loadProfile() {
  if (!window.dongdongApi?.getMe) return;
  window.dongdongApi.getMe().then((me) => {
    state.serverProfile = me;
    if (me?.onboarding_completed) applyServerProfile(me);
    renderProfile();
  }).catch((error) => {
    toast(error.message || '账号暂时读不出来');
  });
}

function renderProfile() {
  const profile = state.serverProfile?.profile;
  const avatar = $('#profile-avatar');
  const level = $('#profile-level');
  const title = $('#profile-title');
  const meta = $('#profile-meta');
  if (!avatar || !profile) return;
  avatar.textContent = profile.name.slice(0, 1);
  level.textContent = `地球守卫者 Lv.${profile.level}`;
  title.textContent = profile.name;
  meta.textContent = `${profile.friend_count} 位好友 · ${profile.active_challenge_count} 个进行中挑战`;
  $('#profile-days').textContent = String(profile.active_days);
  $('#profile-minutes').textContent = String(profile.exercise_minutes);
  $('#profile-week').textContent = `${Math.round((profile.week_completion_rate || 0) * 100)}%`;
  const collection = $('#profile-collection');
  collection.replaceChildren();
  const rescued = (profile.collection || []).filter((item) => item.rescues > 0).length;
  $('#profile-collection-count').textContent = `${rescued} / ${(profile.collection || []).length}`;
  (profile.collection || []).forEach((item) => {
    const button = document.createElement('button');
    button.dataset.rescue = item.code;
    const sprite = document.createElement('span');
    sprite.className = `alien-sprite ${alienData[item.name]?.className || 'alien--pink'}${item.rescues ? '' : ' faded'}`;
    const label = document.createElement('small');
    label.textContent = item.rescues ? `${item.name} · ${item.rescues}次` : `${item.name} · 还没回家`;
    button.append(sprite, label);
    collection.append(button);
  });
  const badges = $('#profile-badges');
  badges.replaceChildren();
  $('#profile-badge-count').textContent = `${profile.badges.length} 枚`;
  if (!profile.badges.length) {
    badges.append(emptyNote('完成第一次运动后，徽章会出现在这里。'));
    return;
  }
  const marks = { first_move: '✦', streak_3: '3', week_guard: '🌍' };
  profile.badges.forEach((badge) => {
    const item = document.createElement('span');
    item.append(marks[badge.code] || '✦');
    const name = document.createElement('small');
    name.textContent = badge.name;
    item.append(name);
    badges.append(item);
  });
}

function profileRows(rows) {
  return `<div class="plan-summary">${rows.map(([label, value]) => `<div class="summary-row"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join('')}</div>`;
}

function openProfileSetting(kind) {
  const me = state.serverProfile;
  if (!me?.onboarding_completed) {
    openSheet('还没有计划', '<p class="setup-intro">先完成一次运动计划，这里会显示已经保存的提醒、偏好和身体信息。</p>');
    return;
  }
  if (kind === 'reminder') {
    openSheet('提醒设置', profileRows([
      ['每周运动', (me.plan.weekday_labels || []).join('、') || '未设置'],
      ['每周次数', `${me.plan.frequency_per_week} 天`],
      ['提醒时间', me.plan.reminder || '暂不设置']
    ]) + '<p class="choice-note">这些是已经保存在账号里的安排。</p>');
    return;
  }
  if (kind === 'preference') {
    openSheet('运动偏好', profileRows([
      ['场景', me.preferences.scene_label],
      ['时长', `${me.preferences.duration_min} 分钟`],
      ['偏好部位', (me.preferences.focus_labels || [me.preferences.focus_label]).join('、')],
      ['难度', me.preferences.difficulty_label || '轻松']
    ]));
    return;
  }
  if (kind === 'health') {
    const limits = (me.body_limits || []).map((item) => item.label).join('、') || '无明显不适';
    openSheet('身体限制与健康信息', profileRows([
      ['年龄', me.health.age_band_label],
      ['运动基础', me.health.fitness_level_label],
      ['目标', (me.health.primary_goal_labels || [me.health.primary_goal_label]).join('、')],
      ['身体限制', limits]
    ]) + '<p class="choice-note">动动提供日常轻运动建议，不能替代专业医疗意见。</p>');
    return;
  }
  const challenges = me.profile?.challenges || [];
  const rows = challenges.length
    ? challenges.flatMap((item) => [[item.title, `${item.visibility_label} · ${item.punishment_label}`]])
    : [['挑战可见范围', '还没有加入挑战']];
  openSheet('隐私设置', profileRows(rows) + '<p class="choice-note">惩罚只有在你加入挑战并选择公开后，才会按这个范围展示。</p>');
}

function handleClick(event) {
  const preview = event.target.closest('[data-preview]');
  if (preview && !event.target.closest('button')) {
    openWorkoutAt(Number(preview.dataset.preview));
    return;
  }
  const target = event.target.closest('button,[data-action]');
  if (!target) return;

  if (target.dataset.multi) {
    const key = target.dataset.multi;
    const options = key === 'focuses' ? FOCUS_OPTIONS : GOAL_OPTIONS;
    const current = selectedList(options, state.config[key]);
    const value = target.dataset.value;
    if (current.includes(value) && current.length === 1) {
      toast(key === 'focuses' ? '至少保留一个偏好部位' : '至少保留一个主要目标');
      return;
    }
    state.config[key] = current.includes(value) ? current.filter((item) => item !== value) : options.filter((item) => item === value || current.includes(item));
    if (key === 'focuses') state.config.focus = state.config.focuses[0];
    if (key === 'goals') state.config.goal = state.config.goals[0];
    renderSetup();
    return;
  }
  if (target.dataset.config) {
    const key = target.dataset.config;
    const value = key === 'duration' ? Number(target.dataset.value) : target.dataset.value;
    state.config[key] = value; renderSetup(); return;
  }
  if (target.dataset.frequency) {
    state.config.frequency = Math.min(7, Math.max(2, state.config.frequency + Number(target.dataset.frequency)));
    const defaults = ['一','二','三','四','五','六','日']; state.config.days = Array.from({ length: state.config.frequency }, (_, index) => defaults[Math.floor(index * 7 / state.config.frequency)]);
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
  if (target.dataset.quickAction) {
    state.quickDraft.actionId = target.dataset.quickAction;
    $$('[data-quick-action]', $('#sheet-content')).forEach(button => button.classList.toggle('selected', button === target)); return;
  }
  if (target.dataset.quickAlien) {
    state.quickDraft.alien = target.dataset.quickAlien;
    $$('[data-quick-alien]', $('#sheet-content')).forEach(button => button.classList.toggle('selected', button === target)); return;
  }
  if (target.dataset.alien) { selectAlien(target.dataset.alien); return; }
  if (target.dataset.friendId) { openFriendSheet(target.dataset.friendId); return; }
  if (target.dataset.challengeId) { state.selectedChallengeId = target.dataset.challengeId; showScreen('challenge'); return; }
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
  if (target.dataset.adjust) {
    if (target.dataset.adjust === 'focus') {
      const current = selectedList(FOCUS_OPTIONS, state.config.focuses);
      const value = target.dataset.value;
      if (current.includes(value) && current.length === 1) { toast('至少保留一个偏好部位'); return; }
      state.config.focuses = current.includes(value) ? current.filter((item) => item !== value) : FOCUS_OPTIONS.filter((item) => item === value || current.includes(item));
      state.config.focus = state.config.focuses[0];
      planMatchKey = '';
      $$(`[data-adjust="focus"]`, $('#sheet-content')).forEach((button) => button.classList.toggle('selected', state.config.focuses.includes(button.dataset.value)));
      return;
    }
    const value = target.dataset.adjust === 'duration' ? Number(target.dataset.value) : target.dataset.value;
    state.config[target.dataset.adjust] = value;
    $$(`[data-adjust="${target.dataset.adjust}"]`, $('#sheet-content')).forEach(button => button.classList.toggle('selected', button.dataset.value === String(value)));
    $('#adjust-note').textContent = `修改后约 ${state.config.duration} 分钟，${state.config.duration <= 5 ? state.config.duration : Math.ceil(state.config.duration / 2)} 个动作。`; return;
  }
  if (target.dataset.setting) { openProfileSetting(target.dataset.setting); return; }
  if (target.dataset.rescue) {
    const item = (state.serverProfile?.profile?.collection || []).find((alien) => alien.code === target.dataset.rescue);
    if (item) toast(item.rescues ? `${item.name}已经和你一起回家 ${item.rescues} 次` : `${item.name}还在${item.planet}等一次完整救援`);
    return;
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
    'quick-fab-start': () => startWorkout(true),
    'quick-settings': quickSettingsSheet,
    'save-quick': () => { saveQuickSettings(); toast(`已保存：点悬浮球直接开始「${getQuickAction().name}」`); },
    'save-quick-start': () => { saveQuickSettings(); startWorkout(true); },
    'save-adjust': () => { saveState(); closeSheet(); renderHome(); toast($('#sync-plan')?.checked ? '已同步到后续计划' : '已更新今日计划'); },
    'start-workout': () => startWorkout(false),
    'toggle-barrage': () => { target.classList.toggle('active'); $('#barrage').hidden = !target.classList.contains('active'); },
    'toggle-guide': () => { const detail = $('#guide-detail'); detail.hidden = !detail.hidden; target.textContent = detail.hidden ? '查看完整说明 ↓' : '收起说明 ↑'; },
    'love-action': () => { const original = state.mode === 'quick' ? null : state.actions[state.workoutIndex]; if (original) original.favorite = true; toast(`${state.workoutActions[state.workoutIndex].name}已收藏，${state.sessionAlien || state.alien}开心得跳起来！`); },
    'discomfort': discomfortSheet,
    'previous-action': previousAction, 'next-action': nextAction,
    'toggle-pause': () => {
      if (!state.following) { beginFollow(); return; }
      state.paused = !state.paused; renderWorkout(); toast(state.paused ? '已暂停' : '继续救援');
    },
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
    'see-scenes': () => { closeDialog(); state.communityTab = 'square'; renderCommunityTab(); },
    'praise': () => reactToFriend('praise', target.dataset.userId || state.activeFriendId),
    'nudge': () => reactToFriend('nudge', target.dataset.userId || state.activeFriendId),
    'back-community': () => showScreen('community'),
    'join-challenge': openJoinChallenge, 'confirm-join': confirmJoin,
    'new-message': openNewMessageSheet, 'publish-message': publishMessage,
    'save-settings': () => { closeSheet(); toast('设置已保存'); },
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
  if (event.target.id === 'reminder-enabled') {
    state.config.reminderEnabled = event.target.checked;
    if (event.target.checked) armComputerReminder({ announce: true });
    else clearComputerReminder();
  }
  if (event.target.id === 'reminder-range') {
    state.config.reminder = timeFromIndex(event.target.value);
    if (state.config.reminderEnabled && 'Notification' in window && Notification.permission === 'granted') scheduleComputerReminder(state.config.reminder);
  }
});
document.addEventListener('input', (event) => {
  if (event.target.id === 'new-message-text') $('#message-count').textContent = `${event.target.value.length}/60`;
  if (event.target.id === 'reminder-range') {
    state.config.reminder = timeFromIndex(event.target.value);
    const clock = $('#reminder-clock');
    if (clock) clock.textContent = state.config.reminder;
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { closeSheet(); closeDialog(); }
  if (event.key.toLowerCase() === 'r' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) { try { window.localStorage.removeItem(STORAGE_KEY); window.localStorage.removeItem(REMINDER_KEY); } catch (_) {} clearComputerReminder(); window.dongdongApi?.clearSession(); state = initialState(); stopTimer(); renderQuickFab(); showScreen('welcome'); renderMemoBoard(); startIntroStory(); syncWithServer(); toast('Demo 已重置'); }
});

const REMINDER_KEY = "dongdong.reminder.v1";
let reminderTimer = 0;

function clearComputerReminder() {
  if (reminderTimer) window.clearTimeout(reminderTimer);
  reminderTimer = 0;
}

function nextReminderDelay(time) {
  const match = String(time || "").match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const now = new Date();
  const target = new Date(now);
  target.setHours(Number(match[1]), Number(match[2]), 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

function scheduleComputerReminder(time) {
  clearComputerReminder();
  const delay = nextReminderDelay(time);
  if (delay == null) return;
  reminderTimer = window.setTimeout(() => {
    if (!state.config.reminderEnabled || !("Notification" in window) || Notification.permission !== "granted") return;
    try { new Notification("动动", { body: `到 ${time} 了，来动 ${state.config.duration} 分钟吧` }); } catch (_) {}
    scheduleComputerReminder(state.config.reminder);
  }, delay);
}

async function armComputerReminder({ announce } = {}) {
  if (!state.config.reminderEnabled) { clearComputerReminder(); return; }
  if (!("Notification" in window)) {
    if (announce) toast("这台电脑的浏览器不支持通知");
    return;
  }
  let permission = Notification.permission;
  if (permission === "default") {
    try { permission = await Notification.requestPermission(); } catch (_) { permission = "denied"; }
  }
  if (permission !== "granted") {
    if (announce) toast("没有打开通知权限，时间已记下，但到点不会提醒");
    return;
  }
  scheduleComputerReminder(state.config.reminder);
  if (!announce) return;
  const stamp = `${state.config.reminder}|${new Date().toDateString()}`;
  try {
    if (window.localStorage.getItem(REMINDER_KEY) === stamp) return;
    window.localStorage.setItem(REMINDER_KEY, stamp);
  } catch (_) {}
  try { new Notification("动动提醒已打开", { body: `每天 ${state.config.reminder} 会提醒你` }); } catch (_) {}
}

function resumeComputerReminder() {
  if (state.config.reminderEnabled && "Notification" in window && Notification.permission === "granted") {
    scheduleComputerReminder(state.config.reminder);
  }
}

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
      annotations:{readOnlyHint:false,untrustedContentHint:false}, execute({alien}){ if (!alienData[alien]) throw new Error('不支持此外星人'); startWorkout(true, alien); return {status:'started',mode:'quick',alien}; }
    },
    {
      name:'configure_daily_plan', title:'调整今日计划', description:'设置今日轻运动的时长、场景和偏好部位。',
      inputSchema:{type:'object',properties:{duration:{type:'number',enum:[3,5,10,15]},scene:{type:'string',enum:['办公室','家里','户外','睡前']},focus:{type:'string',enum:['肩颈','腰背','核心','腿部','全身']}},required:['duration','scene','focus'],additionalProperties:false},
      annotations:{readOnlyHint:false,untrustedContentHint:false}, execute(input){
        const valid = [3,5,10,15].includes(input.duration) && ['办公室','家里','户外','睡前'].includes(input.scene) && ['肩颈','腰背','核心','腿部','全身'].includes(input.focus);
        if (!valid) throw new Error('计划参数不在可选范围内');
        state.config = {...state.config,...input, focuses:[input.focus]}; renderHome(); return {status:'updated',plan:input};
      }
    }
  ];
  tools.forEach(tool => { try { void Promise.resolve(context.registerTool(tool)).catch(() => {}); } catch (_) {} });
}

renderSetup(); renderHome(); renderMemoBoard(); initQuickFab(); renderQuickFab(); registerWebMCP();
if (state.planReady) { finishIntroStory(); showScreen('home'); } else startIntroStory();
syncWithServer();
ensureActionCatalog();
resumeComputerReminder();
