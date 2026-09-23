const $ = (s, root = document) => root.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  route:'<circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M6 7v6a4 4 0 0 0 4 4h4M18 17V9a4 4 0 0 0-4-4h-2"/>',
  book:'<path d="M3 4h5a5 5 0 0 1 4 2 5 5 0 0 1 4-2h5v15h-5a5 5 0 0 0-4 2 5 5 0 0 0-4-2H3zM12 6v15"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  history:'<path d="M3 11a9 9 0 1 1 2 7M3 5v6h6M12 7v5l3 2"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  up:'<path d="m5 17 14-14M5 3h14v14"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>',
  down:'<path d="m6 9 6 6 6-6"/>',
  spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5zM20 2v4m-2-2h4"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  bell:'<path d="M5 16h14l-2-3V9a5 5 0 0 0-10 0v4zM10 20h4"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v5m10-5v5M3 11h18M7 15h2m4 0h2"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  checkCircle:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bookmark:'<path d="M6 3h12v18l-6-4-6 4z"/>',
  flag:'<path d="M5 21V3m0 1c5-4 9 4 14 0v9c-5 4-9-4-14 0"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  bulb:'<path d="M8 16a7 7 0 1 1 8 0l-1 2H9zM9 21h6M12 3v1"/>',
  team:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2"/>',
  chart:'<path d="M4 3v18h17M8 16v-5m5 5V7m5 9V4"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
  download:'<path d="M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.5"/>',
  medal:'<circle cx="12" cy="9" r="6"/><path d="m8 14-2 7 6-3 6 3-2-7"/>',
  logout:'<path d="M9 4H4v16h5m5-13 5 5-5 5m-5-5h10"/>',
};
function icon(name, cls = '') { return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.spark}</svg>`; }
const initials = name => name.split(/\s+/).slice(0,2).map(x => x[0]).join('');
const avatar = (p, cls = '', i = 0) => `<div class="avatar ${cls} color-${i % 5}" aria-hidden="true">${esc(initials(p.name))}</div>`;
const savedRead = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const prefs = savedRead('cq-preferences', {});
let state, currentId = prefs.employeeId || 'alina', role = prefs.role === 'hr' ? 'hr' : 'employee', page = 'overview', filter = 'all', searchTerm = '', uploadFile = null, externalRecs = {}, toastTimer, modalReturnFocus;
let saved = new Set(savedRead('cq-saved', []));
const person = () => state.employees.find(p => p.id === currentId) || state.employees[0];
const activity = id => state.activities.find(a => a.id === id);
const recs = p => externalRecs[p.id]?.recommendations || p.recommendations;
function persist() { try { localStorage.setItem('cq-preferences', JSON.stringify({employeeId:currentId, role})); localStorage.setItem('cq-saved', JSON.stringify([...saved])); } catch {} }
async function api(path, data) {
  const response = await fetch(path, data ? {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)} : undefined);
  let result;
  try { result = await response.json(); } catch { throw new Error('Сервер вернул некорректный ответ. Попробуйте обновить страницу.'); }
  if (!response.ok) throw new Error(result.error || 'Не удалось выполнить запрос.');
  return result;
}
function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible'); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4500); }
function go(next) { page = next; filter = 'all'; searchTerm = ''; render(); window.scrollTo({top:0, behavior:'smooth'}); }
function showModal(html) { modalReturnFocus = document.activeElement; $('#modal').innerHTML = html; if (!$('#modal').open) $('#modal').showModal(); }
function closeModal() { $('#modal').close(); }
function modalHeader(title, subtitle = '') { return `<div class="modal-header"><div><h2 id="dialog-title">${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div><button class="icon-button" data-action="close-modal" aria-label="Закрыть">${icon('close')}</button></div>`; }
function empty(title, text, button = '') { return `<div class="empty-state"><div class="empty-icon">${icon('spark')}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${button}</div>`; }
function fmtDate(value) { return new Date(value).toLocaleDateString('ru-RU', {day:'numeric',month:'long'}); }

function heroArt() {
  return `<div class="hero-art" aria-hidden="true"><svg viewBox="0 0 320 270" fill="none"><defs><linearGradient id="stepGradient" x1="130" y1="100" x2="260" y2="180" gradientUnits="userSpaceOnUse"><stop stop-color="#aa95e3"/><stop offset="1" stop-color="#8a72cb"/></linearGradient></defs>
  <circle cx="185" cy="136" r="100" stroke="#e4dcf2"/><circle cx="185" cy="136" r="77" stroke="#e4dcf2" stroke-dasharray="3 6"/><circle cx="269" cy="63" r="4" fill="#d4c6ed"/><path d="m52 91 3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#c7b4e7"/><path d="m275 173 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#b7a1de"/>
  <path d="m63 207 55 24 119-70-55-24z" fill="#dcd3ef"/><path d="m118 220 45-27 46 20-45 27z" fill="#e3dbf2"/><path d="m118 193 45-27 46 20-45 27z" fill="#f7f4fc"/><path d="m118 193 46 20v27l-46-20z" fill="#c5b6e5"/><path d="m164 213 45-27v27l-45 27z" fill="#b6a2db"/>
  <path d="m157 145 45-27 45 21-45 27z" fill="#eee7fa"/><path d="m157 145 45 21v47l-45-21z" fill="#b4a0de"/><path d="m202 166 45-27v47l-45 27z" fill="#9f86d1"/>
  <path d="m197 91 45-27 45 21-45 27z" fill="#d8cef0"/><path d="m197 91 45 21v54l-45-21z" fill="url(#stepGradient)"/><path d="m242 112 45-27v54l-45 27z" fill="#8068bd"/>
  <path d="M241 76V33" stroke="#8f77c3" stroke-width="2.5" stroke-linecap="round"/><path d="M242 34c10-10 19 6 30-3v25c-12 8-19-7-30 2z" fill="#d9efac"/><path d="m142 184 8 4 13-9" stroke="#a492c9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="64" y="125" width="82" height="35" rx="10" fill="white" transform="rotate(-9 64 125)"/><circle cx="82" cy="140" r="9" fill="#f1ecfb"/><path d="m78 140 3 3 5-6" stroke="#9a80d0" stroke-width="1.5"/><text x="97" y="139" fill="#9a81c8" font-size="9" font-weight="800" transform="rotate(-9 97 139)">+1 навык</text>
  <circle cx="202" cy="125" r="15" fill="#cce996" stroke="#e6f2cc" stroke-width="4"/><path d="m196 125 4 4 8-8" stroke="#7c9854" stroke-width="2" stroke-linecap="round"/>
  <rect x="181" y="18" width="45" height="23" rx="7" fill="white" transform="rotate(-5 181 18)"/><text x="189" y="32" fill="#9680bd" font-size="8" font-weight="800" transform="rotate(-5 189 32)">Senior</text>
  </svg></div>`;
}
function coverArt(category) {
  const common = 'class="cover-art" viewBox="0 0 230 130" fill="none" aria-hidden="true"';
  if (category === 'systems') return `<svg ${common}><circle cx="131" cy="70" r="52" stroke="#d9e1bb"/><g transform="translate(82 27) rotate(-9 39 39)"><rect width="57" height="58" rx="8" fill="#fbfcf3" stroke="#dde4c9"/><rect x="10" y="12" width="17" height="17" rx="4" fill="#c7d699"/><rect x="33" y="12" width="14" height="4" rx="2" fill="#d6dfbb"/><rect x="33" y="21" width="10" height="4" rx="2" fill="#e2e8d0"/><path d="M11 39h34m-34 8h23" stroke="#d2dbb6" stroke-width="4" stroke-linecap="round"/></g><g transform="translate(131 52) rotate(10)"><rect width="48" height="49" rx="8" fill="#c8d69f"/><rect x="10" y="11" width="11" height="11" rx="3" fill="#edf2db"/><rect x="27" y="11" width="11" height="11" rx="3" fill="#e5edca"/><rect x="10" y="28" width="11" height="11" rx="3" fill="#e5edca"/><rect x="27" y="28" width="11" height="11" rx="3" fill="#a7bd76"/></g><circle cx="72" cy="95" r="5" fill="#d3dfb4"/><path d="m180 35 3 5-3 5-3-5z" fill="#bfd18d"/></svg>`;
  if (category === 'communication') return `<svg ${common}><circle cx="130" cy="66" r="47" stroke="#f0d8c5"/><g transform="translate(77 30) rotate(-8)"><path d="M0 8a8 8 0 0 1 8-8h62a8 8 0 0 1 8 8v34a8 8 0 0 1-8 8H31L17 63V50H8a8 8 0 0 1-8-8z" fill="#fffcf7" stroke="#edd2bc"/><path d="M17 17h44M17 27h33M17 37h23" stroke="#e9c8ac" stroke-width="4" stroke-linecap="round"/></g><g transform="translate(128 64) rotate(9)"><path d="M0 8a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8h-6v12L37 38H8a8 8 0 0 1-8-8z" fill="#e9ba96"/><circle cx="19" cy="19" r="3" fill="#fff3e6"/><circle cx="32" cy="19" r="3" fill="#fff3e6"/><circle cx="45" cy="19" r="3" fill="#fff3e6"/></g><path d="m179 35 3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#e5b793"/></svg>`;
  if (category === 'research') return `<svg ${common}><circle cx="131" cy="69" r="48" stroke="#d8cdec"/><g transform="translate(88 26) rotate(-9 28 38)"><rect width="62" height="82" rx="8" fill="#fbf9ff" stroke="#d9c9ee"/><rect x="12" y="13" width="38" height="6" rx="3" fill="#c8b2e7"/><path d="M12 31h31M12 41h38M12 51h23M12 62h20" stroke="#e2d5f0" stroke-width="4" stroke-linecap="round"/></g><circle cx="156" cy="70" r="21" fill="#e6daf5" stroke="#b39bd5" stroke-width="6"/><path d="m171 87 17 18" stroke="#ad94cf" stroke-width="8" stroke-linecap="round"/><path d="m148 70 5 5 10-11" stroke="#b29ad3" stroke-width="3" stroke-linecap="round"/><path d="m73 78 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#b9a1dc"/></svg>`;
  const colors = {prototype:['#bfd3e1','#eaf3f9','#8caec6'],product:['#c8d8bd','#f1f6ed','#94b080'],visual:['#e4bfd0','#fcf1f6','#c88ba8']}[category] || ['#c8b4e5','#f7f3fc','#a58aca'];
  return `<svg ${common}><circle cx="125" cy="67" r="49" stroke="${colors[0]}"/><g transform="translate(75 28) rotate(-6 40 35)"><rect width="91" height="72" rx="8" fill="${colors[1]}" stroke="${colors[0]}"/><path d="M0 17h91" stroke="${colors[0]}"/><circle cx="11" cy="9" r="2" fill="${colors[2]}"/><circle cx="19" cy="9" r="2" fill="${colors[0]}"/><rect x="12" y="29" width="27" height="30" rx="4" fill="${colors[0]}"/><path d="M49 33h28M49 43h20M49 53h24" stroke="${colors[0]}" stroke-width="4" stroke-linecap="round"/></g><circle cx="167" cy="90" r="17" fill="${colors[2]}"/><path d="m160 90 5 5 9-11" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`;
}

function sidebar() {
  const nav = role === 'employee' ? [['overview','grid','Обзор'],['route','route','Карьерный маршрут'],['activities','book','Мои активности'],['profile','user','Мой профиль'],['history','history','История обучения']] : [['overview','chart','Обзор команды'],['team','team','Сотрудники'],['gaps','target','Дефицит навыков'],['import','upload','Загрузка данных']];
  const p = person();
  return `<aside class="sidebar" id="sidebar"><button class="icon-button sidebar-close" data-action="close-menu" aria-label="Закрыть меню">${icon('close')}</button><a href="#" class="brand" data-action="home" aria-label="Career Quest — главная"><span class="brand-mark"><svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M7 27V13l9-5v10l12-7v15l-12 7V22z" fill="currentColor"/><path d="m19 4 9-2v9" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span>career<span>quest</span></span></a><p class="workspace-label">РАСТИ В СВОЁМ ТЕМПЕ</p>
  <div class="role-switch" aria-label="Режим кабинета"><button class="${role === 'employee' ? 'active' : ''}" data-role="employee" aria-pressed="${role === 'employee'}">Сотрудник</button><button class="${role === 'hr' ? 'active' : ''}" data-role="hr" aria-pressed="${role === 'hr'}">HR-кабинет</button></div>
  <p class="nav-label">${role === 'employee' ? 'МОЁ РАЗВИТИЕ' : 'УПРАВЛЕНИЕ КОМАНДОЙ'}</p><nav class="nav" aria-label="Основная навигация">${nav.map(([id, ico, label]) => `<button data-page="${id}" class="${page === id ? 'active' : ''}" ${page === id ? 'aria-current="page"' : ''}>${icon(ico)}<span>${label}</span>${id === 'activities' && recs(p).length ? `<span class="nav-count">${recs(p).length}</span>` : ''}</button>`).join('')}</nav>
  <div class="sidebar-bottom"><div class="mentor-card"><div class="mentor-spark">${icon('spark')}</div><strong>Большие цели. Маленькие шаги.</strong><p>Ваш следующий уровень начинается<br>с одной новой привычки.</p><button class="text-button" data-action="about">Как работает подбор ${icon('arrow')}</button></div>
  <div class="sidebar-profile">${role === 'employee' ? avatar(p) : '<div class="avatar">HR</div>'}<div><strong>${role === 'employee' ? esc(p.name.split(' ')[0] + ' ' + (p.name.split(' ')[1]?.[0] || '') + '.') : 'HR-команда'}</strong><p>${role === 'employee' ? esc(p.role) : 'Развиваем людей вместе'}</p></div><button class="icon-button" data-action="switch-role" aria-label="Сменить кабинет">${icon('logout')}</button></div></div></aside>`;
}
function topbar() {
  const titles = {overview:role === 'employee' ? 'Обзор' : 'Обзор команды',route:'Карьерный маршрут',activities:'Мои активности',profile:'Мой профиль',history:'История обучения',team:'Сотрудники',gaps:'Дефицит навыков',import:'Загрузка данных'};
  return `<header class="topbar"><button class="icon-button mobile-menu" data-action="toggle-menu" aria-label="Открыть меню" aria-expanded="false">${icon('menu')}</button><div class="breadcrumb"><span>${role === 'employee' ? 'Моё развитие' : 'HR-кабинет'}</span>${icon('chevron')}<strong>${titles[page] || 'Обзор'}</strong></div><div class="topbar-actions"><button class="global-search" data-action="search" aria-label="Поиск активностей">${icon('search')}<span>Найти что-нибудь</span><kbd>Ctrl K</kbd></button><div class="notification"><button class="icon-button" data-action="notifications" aria-label="Уведомления">${icon('bell')}${person().history.length ? '<span class="notification-dot"></span>' : ''}</button></div><select class="user-select" id="employee-select" aria-label="Демонстрационный профиль сотрудника">${state.employees.map(p => `<option value="${esc(p.id)}" ${p.id === person().id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>${avatar(person())}</div></header>`;
}
function heading(title, subtitle, extra) { return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div>${extra || `<div class="date-label">${icon('calendar')}${new Date().toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}</div>`}</div>`; }
function stat(ico, number, label, unit = '') { return `<div class="stat"><div class="stat-icon">${icon(ico)}</div><div><strong>${number}${unit ? ` <span>${unit}</span>` : ''}</strong><p>${esc(label)}</p></div></div>`; }
function skillsPanel(p) {
  return `<section class="panel skills-panel"><div class="space-between"><h2 class="panel-title">Мои навыки</h2><button class="icon-button" data-page="route" aria-label="Все навыки и цели">${icon('up')}</button></div><p class="panel-subtitle">Где вы сейчас и к чему стремиться</p><div class="skill-list">${Object.entries(p.target).map(([name,target]) => `<div><div class="skill-label"><span>${esc(name)}</span><strong>${p.skills[name] || 0}<span class="muted"> / ${target}</span></strong></div><div class="skill-bar" role="meter" aria-label="${esc(name)}" aria-valuenow="${p.skills[name] || 0}" aria-valuemin="0" aria-valuemax="100"><span style="width:${p.skills[name] || 0}%"></span><i style="left:calc(${target}% - 2px)"></i></div></div>`).join('')}</div><div class="skill-legend"><span><i class="legend-dot"></i>Текущий уровень</span><span><i class="legend-line"></i>Цель для ${esc(p.nextGrade)}</span></div></section>`;
}
function profileCard(p) {
  return `<section class="panel profile-card">${avatar(p,'large')}<h2>${esc(p.name)}</h2><p class="profile-role">${esc(p.role)}</p><div class="profile-tags"><span class="pill pill-purple">${esc(p.grade)}</span><span class="pill pill-gray">${esc(p.department)}</span></div><hr><div class="progress-label"><span>На пути к ${esc(p.nextGrade)}</span><strong>${p.progress}%</strong></div><div class="progress-track" role="progressbar" aria-label="Готовность к следующему грейду" aria-valuenow="${p.progress}" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill" style="width:${p.progress}%"></div></div><div class="progress-caption"><span>${Object.entries(p.target).filter(([k,v]) => (p.skills[k] || 0) >= v).length} из ${Object.keys(p.target).length} навыков на уровне цели</span><span>${esc(p.nextGrade)}</span></div><button class="text-button" data-page="profile">Открыть профиль ${icon('arrow')}</button></section>`;
}
function careerSteps(p) {
  const grades = ['Junior','Middle','Senior','Lead']; const index = grades.indexOf(p.grade);
  return `<div class="career-steps">${grades.map((grade,i) => `<div class="career-step ${i < index ? 'done' : i === index ? 'current' : ''}"><div class="step-dot">${icon(i < index ? 'check' : i === index ? 'user' : i === index + 1 ? 'flag' : 'lock')}</div><strong>${grade} ${i === index ? '•' : ''}</strong><small>${i < index ? 'Пройденный этап' : i === index ? 'Вы здесь' : i === index + 1 ? 'Следующая цель' : 'Новый горизонт'}</small></div>`).join('')}</div>`;
}
function courseCard(a, r, p = person()) {
  const done = p.history.some(h => h.activity_id === a.id);
  const mainGain = Object.entries(r?.usefulGains || a.gains)[0];
  return `<article class="course-card"><div class="course-cover ${a.category}"><span class="cover-category">${a.tag}</span><button class="icon-button ${saved.has(a.id) ? 'saved' : ''}" data-save="${a.id}" aria-label="${saved.has(a.id) ? 'Убрать из избранного' : 'Сохранить активность'}" aria-pressed="${saved.has(a.id)}">${icon('bookmark')}</button>${coverArt(a.category)}</div><div class="course-body"><div class="course-meta">${a.type}<span>·</span>${icon('clock')}${a.duration} мин</div><h3>${a.title}</h3><p class="course-subtitle">${a.subtitle}</p>${r ? `<div class="reason">${icon('spark')}<span>${esc(r.reason)}</span></div>` : '<div style="height:13px"></div>'}<div class="course-footer"><span class="pill ${done ? 'pill-green' : 'pill-purple'}">${done ? '✓ Пройдено' : `+${mainGain[1]} к навыку`}</span><button class="text-button" data-course="${a.id}">${done ? 'Повторить' : 'Начать'} ${icon('arrow')}</button></div></div></article>`;
}
function recommendations(p, full = false) {
  const recommendations = recs(p);
  if (!recommendations.length) return empty(p.progress === 100 ? 'Цель по навыкам достигнута!' : 'Нужен индивидуальный следующий шаг',p.progress === 100 ? 'Обсудите с руководителем переход на новый грейд. В каталоге можно продолжить развитие.' : 'В каталоге пока нет подходящих активностей для ваших дефицитов. HR увидит этот запрос в аналитике.', '<button class="btn btn-light" data-page="activities">Посмотреть каталог</button>');
  return `<div class="${full ? 'full-grid' : 'course-grid'}">${recommendations.map(r => courseCard(activity(r.activityId),r,p)).join('')}</div>`;
}
function employeeOverview() {
  const p = person(); const doneMinutes = p.history.reduce((s,h) => s + (activity(h.activity_id)?.duration || 0),0);
  return `${heading(`Расти в своём темпе, ${esc(p.name.split(' ')[0])} <span class="greeting-icon">✦</span>`, 'Каждый маленький шаг — часть большого карьерного пути.')}
  <div class="dashboard-grid"><div class="left-column"><section class="hero"><div class="hero-content"><div class="hero-label">${icon('spark')} ВАШ ПЕРСОНАЛЬНЫЙ МАРШРУТ</div><h2>Следующий уровень —<br><span>ближе, чем кажется.</span></h2><p>Ваш опыт, ваши цели и немного AI.<br>Превратим «хочу расти» в понятный план действий.</p><button class="btn btn-primary" data-page="route">Мой карьерный маршрут ${icon('arrow')}</button></div>${heroArt()}</section>
  <div class="stat-row">${stat('target',p.progress,'Готовность к '+p.nextGrade,'%')}${stat('checkCircle',p.history.length,'Активностей завершено')}${stat('clock',doneMinutes,'Время на развитие','мин')}</div>
  <section><div class="section-heading"><div><h2>Твой следующий шаг <span class="ai-tag">✧ AI-подбор</span></h2><p>Подобрано под ваши навыки и карьерную цель</p></div><button class="text-button" data-page="activities">Все активности ${icon('arrow')}</button></div>${recommendations(p)}<div class="ai-explainer">${icon('info')}${externalRecs[p.id]?.mode === 'external' ? 'Объяснения подготовлены подключённой AI-моделью' : 'Демо-подбор: дефицит навыков, польза и длительность активности'}</div></section>
  <section class="panel path-panel"><div class="section-heading"><h2>Большой путь начинается с шага</h2><button class="text-button" data-page="route">Подробнее ${icon('arrow')}</button></div>${careerSteps(p)}</section></div>
  <aside class="right-column">${profileCard(p)}${skillsPanel(p)}<div class="tip-card">${icon('bulb')}<div><strong>Не быстрее. Регулярнее.</strong><p>Даже 20 минут на обучение — это шаг к тому, кем вы хотите стать.</p></div></div></aside></div>`;
}
function routePage() {
  const p = person(); const gaps = Object.entries(p.target).sort((a,b) => (b[1]-(p.skills[b[0]]||0)) - (a[1]-(p.skills[a[0]]||0)));
  return `${heading('Твой следующий уровень','Понятная цель, конкретные навыки и маршрут, который меняется вместе с вами.')}<div class="panel route-intro"><div><div class="eyebrow purple">КАРЬЕРНАЯ ЦЕЛЬ</div><h2>${esc(p.role)} · ${esc(p.nextGrade)}</h2><p>${p.progress === 100 ? 'Все целевые показатели достигнуты. Пора обсудить следующий грейд.' : `До цели — ${gaps.filter(([k,v]) => (p.skills[k]||0)<v).length} навыков, которые можно усилить.`}</p></div><div class="progress-ring" style="--progress:${p.progress}"><span>${p.progress}%</span></div></div><div class="section-stack"><section class="panel wide-section">${careerSteps(p)}</section><section class="panel wide-section"><div class="section-heading"><div><h2>Что нужно для ${esc(p.nextGrade)}</h2><p>Баллы отражают учебный прогресс в демо, а не профессиональную аттестацию</p></div><span class="pill pill-purple">${gaps.length} навыков</span></div><div class="gap-list">${gaps.map(([k,v]) => `<div class="gap-row"><strong>${esc(k)}</strong><div class="skill-bar"><span style="width:${p.skills[k] || 0}%"></span><i style="left:calc(${v}% - 2px)"></i></div><small>${p.skills[k] || 0} / ${v}${(p.skills[k]||0) >= v ? ' ✓' : ''}</small></div>`).join('')}</div></section><section><div class="section-heading"><div><h2>От цели — к действию</h2><p>Закрывайте дефициты с помощью подходящих активностей</p></div><button class="btn btn-light" data-action="refresh-ai">${icon('spark')} Обновить подбор</button></div>${recommendations(p,true)}</section></div>`;
}
function activitiesPage() {
  const p = person(); const recommended = new Set(recs(p).map(r => r.activityId));
  const list = state.activities.filter(a => (filter === 'all' || filter === 'recommended' && recommended.has(a.id) || filter === 'saved' && saved.has(a.id) || filter === 'completed' && p.history.some(h => h.activity_id === a.id)) && `${a.title} ${a.subtitle} ${a.tag} ${Object.keys(a.gains).join(' ')}`.toLowerCase().includes(searchTerm.toLowerCase()));
  return `${heading('Маленький шаг. Большой результат.','Выберите активность, которая поможет двигаться дальше.')}<div class="toolbar"><div class="tabs" aria-label="Фильтры активностей">${[['all','Все активности'],['recommended','Для меня'],['saved','Избранное'],['completed','Пройдено']].map(([id,label]) => `<button class="tab ${filter === id ? 'active' : ''}" data-filter="${id}" aria-pressed="${filter === id}">${label}</button>`).join('')}</div><button class="btn btn-light" data-action="refresh-ai">${icon('spark')} Обновить подбор</button></div><div class="full-grid">${list.length ? list.map(a => courseCard(a,recs(p).find(r => r.activityId === a.id))).join('') : empty('Здесь пока тихо',filter === 'saved' ? 'Нажмите на закладку на карточке, чтобы сохранить активность.' : 'Активности появятся здесь после прохождения или изменения фильтра.','<button class="btn btn-light" data-filter="all">Открыть все активности</button>')}</div>`;
}
function historyList(p) {
  return p.history.length ? p.history.map(h => `<div class="history-row"><div class="history-icon">${icon('checkCircle')}</div><div><h3>${esc(activity(h.activity_id)?.title || h.activity_id)}</h3><p>${fmtDate(h.completed_at)} · ${activity(h.activity_id)?.duration || 0} мин · Проверка пройдена</p></div><div class="pills">${Object.entries(h.gains).map(([k,v]) => `<span class="pill pill-green">${esc(k)} +${v}</span>`).join('')}</div></div>`).join('') : empty('Ваша история только начинается','Пройдите первую активность — здесь появятся новые навыки и результаты.','<button class="btn btn-primary" data-page="activities">Выбрать активность '+icon('arrow')+'</button>');
}
function profilePage() {
  const p = person();
  return `${heading('Твой опыт — твоя точка старта','Профиль помогает подобрать то, что нужно именно вам.')}<div class="profile-layout">${profileCard(p)}<section class="panel wide-section"><h2 class="panel-title">Профессиональный профиль</h2><dl class="profile-details"><div><dt>Полное имя</dt><dd>${esc(p.name)}</dd></div><div><dt>Команда</dt><dd>${esc(p.department)}</dd></div><div><dt>Должность</dt><dd>${esc(p.role)}</dd></div><div><dt>Текущий грейд</dt><dd>${esc(p.grade)}</dd></div><div><dt>Следующая цель</dt><dd>${esc(p.nextGrade)}</dd></div><div><dt>Завершено активностей</dt><dd>${p.history.length}</dd></div></dl><div class="notice">Профиль и целевые навыки задаются HR. После прохождения активности ваш прогресс обновляется автоматически.</div></section>${skillsPanel(p)}<section class="panel wide-section"><div class="section-heading"><h2>История развития</h2><button class="text-button" data-page="history">Вся история ${icon('arrow')}</button></div>${historyList(p)}</section></div>`;
}
function historyPage() { return `${heading('Каждый шаг имеет значение','Здесь сохраняется всё, что вы уже сделали для своего развития.')}<section class="panel wide-section">${historyList(person())}</section>`; }

function analytics() {
  const people = state.employees;
  const active = people.filter(p => p.history.length > 0);
  const noStep = people.filter(p => p.progress < 100 && !p.recommendations.length);
  const gaps = {};
  people.forEach(p => Object.entries(p.target).forEach(([k,v]) => { if ((p.skills[k] || 0) < v) gaps[k] = (gaps[k] || 0) + 1; }));
  return {people,active,noStep,gaps:Object.entries(gaps).sort((a,b) => b[1]-a[1]),completed:people.reduce((s,p) => s+p.history.length,0)};
}
function teamTable(people) {
  return `<div class="table-scroll"><table class="team-table"><thead><tr><th>Сотрудник</th><th>Грейд</th><th>Прогресс к цели</th><th>Активности</th><th>Следующий шаг</th><th><span class="tiny">Профиль</span></th></tr></thead><tbody>${people.map((p,i) => `<tr><td><div class="inline">${avatar(p,'',i)}<div><strong>${esc(p.name)}</strong><div class="tiny muted">${esc(p.role)}</div></div></div></td><td><span class="pill pill-purple">${esc(p.grade)}</span></td><td><div class="table-progress"><div class="progress-track"><div class="progress-fill" style="width:${p.progress}%"></div></div>${p.progress}%</div></td><td>${p.history.length} пройдено</td><td><span class="pill ${p.progress === 100 ? 'pill-green' : p.recommendations.length ? 'pill-gray' : 'pill-orange'}">${p.progress === 100 ? 'Цель достигнута' : p.recommendations.length ? 'Подобран' : 'Нужна помощь HR'}</span></td><td><button class="icon-button" data-person="${esc(p.id)}" aria-label="Открыть профиль ${esc(p.name)}">${icon('arrow')}</button></td></tr>`).join('')}</tbody></table></div>`;
}
function gapChart(gaps, count, all = false) { return `<div class="bar-chart">${(all ? gaps : gaps.slice(0,5)).map(([k,v]) => `<div class="chart-row"><span>${esc(k)}</span><div class="chart-bar"><span style="width:${v/count*100}%"></span></div><strong>${v}</strong></div>`).join('')}</div>`; }
function hrOverview() {
  const a = analytics();
  return `${heading('Растёт команда — растёт бизнес','Общая картина развития. Конкретные шаги для каждого.', '<button class="btn btn-primary" data-page="import">'+icon('upload')+' Загрузить данные</button>')}<div class="hr-stats">${stat('team',a.people.length,'Сотрудников в команде')}${stat('chart',Math.round(a.active.length/a.people.length*100),'Участвуют в обучении','%')}${stat('checkCircle',a.completed,'Активностей завершено')}${stat('route',a.noStep.length,'Нужен следующий шаг')}</div><div class="hr-grid"><section class="panel wide-section"><div class="section-heading"><div><h2>Где нужна поддержка</h2><p>Количество сотрудников с дефицитом навыка</p></div><button class="text-button" data-page="gaps">Все ${icon('arrow')}</button></div>${a.gaps.length ? gapChart(a.gaps,a.people.length) : '<p class="notice success">Все целевые навыки достигнуты.</p>'}</section><section class="panel wide-section"><div class="section-heading"><div><h2>Поможем найти следующий шаг</h2><p>Для этих сотрудников нет подходящих активностей</p></div><span class="pill pill-orange">${a.noStep.length}</span></div>${a.noStep.length ? a.noStep.slice(0,4).map((p,i) => `<div class="hr-person">${avatar(p,'',i)}<div><h3>${esc(p.name)}</h3><p>${esc(p.role)} · ${esc(p.grade)}</p></div><button class="text-button" data-person="${esc(p.id)}">Профиль ${icon('arrow')}</button></div>`).join('') : '<div class="notice success">У каждого сотрудника есть следующий шаг или уже достигнута цель.</div>'}<div class="notice">Добавьте обучение по недостающим навыкам в каталог или согласуйте индивидуальную активность с руководителем.</div></section></div><section class="panel"><div class="wide-section"><div class="section-heading" style="margin-bottom:0"><div><h2>Развитие в лицах</h2><p>Прогресс обновляется после каждой завершённой активности</p></div><button class="text-button" data-page="team">Все сотрудники ${icon('arrow')}</button></div></div>${teamTable(a.people.slice(0,6))}</section>`;
}
function teamPage() {
  const people = state.employees.filter(p => `${p.name} ${p.role} ${p.department}`.toLowerCase().includes(searchTerm.toLowerCase())).filter(p => filter !== 'no-step' || p.progress < 100 && !p.recommendations.length);
  return `${heading('Люди, за которыми будущее','Навыки, участие в обучении и следующий шаг каждого сотрудника.')}<div class="toolbar"><div class="tabs"><button class="tab ${filter === 'all' ? 'active' : ''}" data-filter="all">Вся команда</button><button class="tab ${filter === 'no-step' ? 'active' : ''}" data-filter="no-step">Без следующего шага</button></div><input id="team-search" class="search-input" style="max-width:300px" value="${esc(searchTerm)}" placeholder="Поиск сотрудника или команды…" aria-label="Поиск сотрудников"></div><section class="panel">${people.length ? teamTable(people) : empty('Сотрудники не найдены','Попробуйте другое имя или измените фильтр.')}</section>`;
}
function gapsPage() {
  const a = analytics();
  return `${heading('Навыки, которые усилят команду','Сравниваем текущие значения с индивидуальными целями сотрудников.')}<div class="hr-grid"><section class="panel wide-section"><h2 class="panel-title">Дефицит навыков</h2><p class="panel-subtitle">Число сотрудников, которым нужно развить навык</p>${a.gaps.length ? gapChart(a.gaps,a.people.length,true) : '<div class="notice success">Дефицитов нет.</div>'}</section><section class="panel wide-section"><h2 class="panel-title">Участие в активностях</h2><p class="panel-subtitle">Завершения по всему каталогу</p><div class="bar-chart">${state.activities.map(course => { const n=a.people.filter(p=>p.history.some(h=>h.activity_id===course.id)).length; return `<div class="chart-row"><span>${course.title}</span><div class="chart-bar"><span style="width:${n/a.people.length*100}%"></span></div><strong>${n}</strong></div>`; }).join('')}</div><div class="notice">Участие = хотя бы одна завершённая активность. Сейчас участвуют ${a.active.length} из ${a.people.length} сотрудников.</div></section></div>`;
}
function importPage() {
  return `${heading('Новые люди. Новые маршруты.','Загрузите профили — рекомендации и HR-аналитика появятся автоматически.')}<div class="upload-grid"><section class="panel wide-section"><label class="dropzone" id="dropzone" for="import-file">${icon('upload')}<h3>Перетащите файл сюда</h3><p>JSON или CSV · до 1 МБ · до 200 профилей</p><span class="btn btn-primary">Выбрать файл</span><input type="file" id="import-file" accept=".json,.csv,application/json,text/csv" style="position:absolute;width:1px;height:1px;opacity:0"></label><div id="file-info"></div><div id="import-result" role="status"></div><div class="notice">Файл добавляет новые профили. Существующие сотрудники и их прогресс сохраняются.</div></section><section class="panel wide-section upload-notes"><h3>Готово к проверке жюри</h3><p>Можно загрузить ранее неизвестного сотрудника и сразу проверить полный сценарий.</p><ol><li>Скачайте пример и заполните профиль.</li><li>Укажите навыки <code>skills</code> и цели <code>target</code> от 0 до 100 (цель — от 1).</li><li>Загрузите файл и выберите сотрудника в верхней панели.</li></ol><button class="btn btn-secondary" data-action="download-sample">${icon('download')} Скачать пример JSON</button><div class="notice">Обязательные поля: <code>name</code>, <code>role</code>, <code>grade</code>, <code>skills</code>, <code>target</code>.<br>CSV: объекты навыков передаются как JSON внутри ячеек. Кодировка UTF-8.</div></section></div>`;
}
function render() {
  const employeePages = {overview:employeeOverview,route:routePage,activities:activitiesPage,profile:profilePage,history:historyPage};
  const hrPages = {overview:hrOverview,team:teamPage,gaps:gapsPage,import:importPage};
  const renderer = (role === 'employee' ? employeePages : hrPages)[page];
  if (!renderer) { page = 'overview'; return render(); }
  $('#app').innerHTML = `${sidebar()}<div class="main-shell">${topbar()}<main class="page fade-in" id="main-content">${renderer()}<footer class="page-footer"><span>Career Quest · Ваш следующий шаг имеет значение.</span><span class="footer-status">Прогресс сохраняется</span></footer></main></div>`;
  persist();
  if (page === 'import') setupDropzone();
}

function openCourse(id) {
  const a = activity(id), p = person(); if (!a) return;
  const completed = p.history.some(h => h.activity_id === id);
  showModal(`${modalHeader(a.title,`${a.type} · ${a.duration} мин · ${a.tag}`)}<div class="modal-body"><p>${a.description}</p><div class="modal-gains">${Object.entries(a.gains).map(([k,v]) => `<span class="pill pill-purple">${esc(k)} +${v}</span>`).join('')}</div>${completed ? '<div class="notice success">Активность уже пройдена. Материалы доступны для повторения; баллы начисляются один раз.</div>' : ''}${a.lessons.map((l,i) => `<details class="lesson" ${i === 0 ? 'open' : ''}><summary data-number="${i+1}">${l.title}</summary><p>${l.text}</p></details>`).join('')}<form id="course-form" data-course-id="${a.id}" data-employee-id="${esc(p.id)}"><div class="quiz"><div class="eyebrow purple" style="margin-bottom:9px">ЗАКРЕПИМ НОВЫЙ НАВЫК</div><h3>${a.question}</h3>${a.options.map((o,i) => `<label class="answer"><input type="radio" name="answer" value="${i}" required><span>${o}</span></label>`).join('')}<div class="quiz-error" id="quiz-error" role="alert"></div></div><div class="modal-actions"><p>Прочитайте материал и выберите ответ.</p><button class="btn btn-primary" type="submit">${completed ? 'Проверить себя' : 'Завершить активность'} ${icon('check')}</button></div></form></div>`);
}
async function completeCourse(form) {
  const selected = new FormData(form).get('answer'); if (selected === null) return;
  const button = $('button[type="submit"]',form); const original = button.innerHTML;
  button.disabled = true; button.innerHTML = '<span class="spinner"></span> Сохраняем прогресс'; $('#quiz-error').textContent = '';
  try {
    const result = await api('/api/complete',{employeeId:form.dataset.employeeId,activityId:form.dataset.courseId,answer:Number(selected)});
    state = await api('/api/state'); delete externalRecs[form.dataset.employeeId]; render();
    if (result.alreadyCompleted) { closeModal(); toast('Верно! Эта активность уже есть в вашей истории.'); return; }
    showModal(`<div class="modal-header" style="border:0;padding-bottom:0"><span></span><button class="icon-button" data-action="close-modal" aria-label="Закрыть">${icon('close')}</button></div><div class="modal-body success-modal"><div class="success-badge">${icon('medal')}</div><h2 id="dialog-title">Ещё один шаг вперёд!</h2><p>«${esc(activity(form.dataset.courseId).title)}» — пройдено.<br>Новые навыки уже в вашем профиле.</p><div class="success-progress"><span class="old">${result.before}%</span>${icon('arrow')}<span>${result.after}%</span></div><p>Готовность к следующему грейду</p><div class="modal-gains">${Object.entries(result.gains).map(([k,v]) => `<span class="pill pill-green">${esc(k)} +${v}</span>`).join('')}</div><button class="btn btn-primary" data-action="view-progress">Посмотреть мой прогресс ${icon('arrow')}</button></div>`);
  } catch (error) { $('#quiz-error').textContent = error.message; button.disabled=false; button.innerHTML=original; }
}
async function refreshAI(button) {
  const pid = person().id; const original = button.innerHTML; button.disabled=true; button.innerHTML='<span class="spinner"></span> Подбираем…';
  try { const result = await api('/api/recommend',{employeeId:pid}); externalRecs[pid]=result; render(); toast(result.warning || (result.mode === 'external' ? 'AI обновил объяснения для ваших рекомендаций.' : 'Подбор обновлён по вашим навыкам. Работает локальный демо-алгоритм.')); }
  catch (error) { toast(error.message); button.disabled=false; button.innerHTML=original; }
}
function openSearch() { showModal(`${modalHeader('Найдём ваш следующий шаг','Поиск по названию, теме и навыкам')}<div class="modal-body"><input class="search-input" id="modal-search" placeholder="Например, исследования или коммуникация" aria-label="Поиск активностей"><div class="search-results" id="search-results"></div></div>`); updateSearch(''); $('#modal-search').focus(); }
function updateSearch(term) { const found = state.activities.filter(a => `${a.title} ${a.subtitle} ${a.tag} ${Object.keys(a.gains).join(' ')}`.toLowerCase().includes(term.toLowerCase())); $('#search-results').innerHTML = found.length ? found.map(a => `<button class="search-result" data-course="${a.id}">${icon('book')}<div><strong>${a.title}</strong><small>${a.type} · ${a.duration} мин · ${a.tag}</small></div>${icon('arrow','arrow')}</button>`).join('') : '<p class="notice">Ничего не найдено. Попробуйте другое название навыка.</p>'; }
function notifications() { const p=person(); showModal(`${modalHeader('Ваши новости','Всё, что изменилось на карьерном пути')}<div class="modal-body">${p.history.length ? historyList(p) : `<div class="notice">Маршрут готов! Мы подобрали ${p.recommendations.length} ${p.recommendations.length === 1 ? 'активность' : 'активности'} по вашим навыкам. Выберите первую и начните движение к цели.</div>`}</div>`); }
function about() { showModal(`${modalHeader('Рекомендации с понятной логикой','Ваши цели определяют следующий шаг')}<div class="modal-body"><p>Career Quest сравнивает текущие навыки с требованиями следующего грейда. Затем выбирает до трёх ещё не пройденных активностей, которые закрывают дефицит. Приоритет учитывает размер дефицита, полезный прирост и длительность.</p><div class="notice"><strong>${state.aiMode === 'external' ? 'Подключён внешний AI-сервис' : 'Сейчас работает локальный демо-алгоритм'}</strong><br>${state.aiMode === 'external' ? 'Нажмите «Обновить подбор» на странице маршрута. Модель подготовит объяснения на основе профиля и подходящих активностей.' : 'Рекомендации и объяснения рассчитываются по правилам, без языковой модели. Для генеративного AI подключите сервис через CQ_AI_URL — подробности в README.'}</div><p style="margin-top:17px">После проверки знаний навыки и прогресс пересчитываются, а завершённая активность исключается из рекомендаций. Результаты сохраняются в базе данных.</p><button class="btn btn-primary" style="margin-top:22px" data-action="close-modal">Понятно ${icon('check')}</button></div>`); }
function downloadSample() {
  const sample=[{name:'Айдана Серикова',role:'Продуктовый дизайнер',grade:'Middle',department:'Продукт',skills:{'UX-исследования':45,'UI-дизайн':70,'Прототипирование':60,'Дизайн-системы':35,'Коммуникация':55,'Продуктовое мышление':50},target:{'UX-исследования':80,'UI-дизайн':85,'Прототипирование':80,'Дизайн-системы':75,'Коммуникация':80,'Продуктовое мышление':75}}];
  const url=URL.createObjectURL(new Blob([JSON.stringify(sample,null,2)],{type:'application/json;charset=utf-8'})); const a=document.createElement('a');a.href=url;a.download='career-quest-profiles.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Пример профиля скачан.');
}
function selectFile(file) {
  if (!file) return; uploadFile=null;
  if (file.size>900_000) { $('#import-result').innerHTML='<div class="notice error">Размер файла не должен превышать 900 КБ (до 1 МБ вместе с запросом).</div>';return; }
  if (!/\.(json|csv)$/i.test(file.name)) { $('#import-result').innerHTML='<div class="notice error">Выберите JSON или CSV.</div>';return; }
  uploadFile=file;$('#import-result').innerHTML='';$('#file-info').innerHTML=`<div class="file-selection"><span>${esc(file.name)} <span class="muted">· ${Math.max(1,Math.round(file.size/1024))} КБ</span></span><button class="btn btn-primary" data-action="import">${icon('upload')} Загрузить</button></div>`;
}
function setupDropzone() { const zone=$('#dropzone'); zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragover');}); zone.addEventListener('dragleave',()=>zone.classList.remove('dragover'));zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('dragover');selectFile(e.dataTransfer.files[0]);}); }
async function importProfiles(button) {
  if (!uploadFile) return; button.disabled=true; button.innerHTML='<span class="spinner"></span> Загружаем…';
  try { const result=await api('/api/import',{format:uploadFile.name.toLowerCase().endsWith('.csv')?'csv':'json',content:await uploadFile.text()}); state=await api('/api/state');uploadFile=null;render();$('#import-result').innerHTML=`<div class="notice success">Добавлено профилей: ${result.count}. Рекомендации и аналитика готовы.</div><button class="btn btn-light" style="margin-top:15px" data-person="${esc(result.ids[0])}">Открыть новый профиль ${icon('arrow')}</button>`;toast(`Успешно добавлено профилей: ${result.count}`); }
  catch (error) { $('#import-result').innerHTML=`<div class="notice error">${esc(error.message)}</div>`;button.disabled=false;button.innerHTML='Повторить загрузку'; }
}

document.addEventListener('click',event=>{
  const target=event.target.closest('button,a[data-action]'); if (!target || target.disabled) return;
  if (target.dataset.page) { closeModal();go(target.dataset.page);return; }
  if (target.dataset.role) { role=target.dataset.role;go('overview');return; }
  if (target.dataset.course) { openCourse(target.dataset.course);return; }
  if (target.dataset.person) { currentId=target.dataset.person;role='employee';go('overview');return; }
  if (target.dataset.filter) {filter=target.dataset.filter;render();return;}
  if (target.dataset.save) {const id=target.dataset.save;saved.has(id)?saved.delete(id):saved.add(id);persist();render();toast(saved.has(id)?'Активность добавлена в избранное.':'Активность убрана из избранного.');return;}
  const action=target.dataset.action;
  if (action === 'home') {event.preventDefault();go('overview');}
  else if (action === 'close-modal') closeModal();
  else if (action === 'view-progress') {closeModal();go('route');}
  else if (action === 'switch-role') {role=role==='hr'?'employee':'hr';go('overview');}
  else if (action === 'toggle-menu') {const opened=$('#sidebar').classList.toggle('open');target.setAttribute('aria-expanded',String(opened));}
  else if (action === 'close-menu') {$('#sidebar').classList.remove('open');$('.mobile-menu').setAttribute('aria-expanded','false');}
  else if (action === 'search') openSearch();
  else if (action === 'about') about();
  else if (action === 'notifications') notifications();
  else if (action === 'refresh-ai') refreshAI(target);
  else if (action === 'download-sample') downloadSample();
  else if (action === 'import') importProfiles(target);
});
document.addEventListener('change',event=>{
  if (event.target.id==='employee-select') {currentId=event.target.value;render();toast(`Выбран профиль: ${person().name}`);}
  if (event.target.id==='import-file') selectFile(event.target.files[0]);
});
document.addEventListener('input',event=>{
  if (event.target.id==='modal-search') updateSearch(event.target.value);
  if (event.target.id==='team-search') {const pos=event.target.selectionStart;searchTerm=event.target.value;render();$('#team-search').focus();$('#team-search').setSelectionRange(pos,pos);}
});
document.addEventListener('submit',event=>{if(event.target.id==='course-form'){event.preventDefault();completeCourse(event.target);}});
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();if(state)openSearch();}if(event.key==='Escape')$('#sidebar')?.classList.remove('open');});
$('#modal').addEventListener('click',event=>{if(event.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeModal();}});
$('#modal').addEventListener('close',()=>{if(modalReturnFocus?.isConnected)modalReturnFocus.focus();});
(async()=>{try{state=await api('/api/state');if(!state.employees.some(p=>p.id===currentId))currentId=state.employees[0].id;render();}catch(error){$('#app').innerHTML=`<div class="initial-loading"><span class="loading-mark">↗</span><h2>Не удалось открыть маршрут</h2><p style="margin:12px 0">${esc(error.message)}</p><button class="btn btn-primary" onclick="location.reload()">Попробовать ещё раз</button></div>`;}})();
