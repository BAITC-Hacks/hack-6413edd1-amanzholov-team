import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FigmaCanvas } from './components/figma/FigmaCanvas';
import { ClassicCanvas } from './components/classic/ClassicCanvas';
import { AddSkillModal } from './components/modals/AddSkillModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { api, ApiError, session } from './services/api';
import { loadWorkspace } from './services/workspace';
import type { ScreenId, UiMode } from './types/career';
import { soundFx } from './utils/audio';

type Workspace = Awaited<ReturnType<typeof loadWorkspace>>;

function screenForMode(screen: ScreenId, mode: UiMode): ScreenId {
  const pairs: [ScreenId, ScreenId][] = [
    ['home', 'classic_home'], ['map', 'classic_career_path'],
    ['skills', 'classic_skills'], ['quests', 'classic_dev_plan'],
    ['roles', 'classic_career_explorer'], ['mode_select', 'classic_mode_select'],
  ];
  const pair = pairs.find((values) => values.includes(screen));
  return pair ? pair[mode === 'rpg' ? 0 : 1] : mode === 'rpg' ? 'home' : 'classic_home';
}

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [authenticated, setAuthenticated] = useState(!!session.get());
  const [busy, setBusy] = useState(!!session.get());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [login, setLogin] = useState('employee');
  const [password, setPassword] = useState('');
  const [activeScreen, setActiveScreen] = useState<ScreenId>('classic_home');
  const [soundActive, setSoundActive] = useState(false);
  const [skillModal, setSkillModal] = useState<{ skillId?: string } | null>(null);
  const inFlight = useRef(false);
  const uiMode = workspace?.preferences.ui_mode ?? 'classic';

  const receive = (data: Workspace) => {
    setWorkspace(data);
    setAuthenticated(true);
    setActiveScreen((current) => screenForMode(current, data.preferences.ui_mode));
  };
  const failure = (reason: unknown) => {
    if (reason instanceof ApiError && reason.status === 401) {
      session.clear(); setAuthenticated(false); setWorkspace(null);
    }
    setError(reason instanceof Error ? reason.message : 'Операция не выполнена. Повторите попытку.');
  };

  useEffect(() => {
    soundFx.setEnabled(false);
    if (!session.get()) return;
    let active = true;
    loadWorkspace().then((data) => { if (active) receive(data); })
      .catch((reason) => { if (active) failure(reason); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const result = await api<{ access_token: string }>('/auth/login', {
        method: 'POST', body: JSON.stringify({ login, password }),
      });
      session.set(result.access_token); setAuthenticated(true);
      receive(await loadWorkspace());
    } catch (reason) { failure(reason); }
    finally { setPassword(''); setBusy(false); inFlight.current = false; }
  };

  const execute = async (action: () => Promise<unknown>, message: string) => {
    if (inFlight.current) throw new Error('Дождитесь завершения текущей операции.');
    inFlight.current = true; setBusy(true); setError(''); setNotice('');
    try {
      await action();
      // The command is already saved even if the following refresh fails.
      setNotice(message);
      try { receive(await loadWorkspace()); }
      catch (reason) { failure(reason); }
    } catch (reason) { failure(reason); throw reason; }
    finally { setBusy(false); inFlight.current = false; }
  };
  const act = (action: () => Promise<unknown>, message: string) => {
    void execute(action, message).catch(() => {});
  };
  const acceptQuest = (id: string) => {
    const quest = workspace?.quests.find((item) => item.id === id);
    if (!quest || quest.isAccepted) return;
    act(() => api(`/activities/${id}/enrollments`, {
      method: 'POST', body: JSON.stringify({ session_id: quest.sessionId ?? null }),
    }), 'Вы записаны на активность. Навыки обновятся после независимого подтверждения результата.');
  };
  const selectRole = (vacancyId: string) => act(() => api('/me/career-goal', {
    method: 'PUT', body: JSON.stringify({ vacancy_id: vacancyId }),
  }), 'Карьерная цель сохранена.');
  const review = () => {
    if (!workspace?.targetRoleLevelId) { setError('Сначала выберите карьерную цель.'); return; }
    act(() => api('/promotion-reviews', { method: 'POST', body: JSON.stringify({
      role_level_id: workspace.targetRoleLevelId,
    }) }), 'Заявка на рассмотрение повышения отправлена. Решение принимает уполномоченный сотрудник.');
  };
  const switchMode = (mode: UiMode) => {
    if (!workspace || mode === uiMode) return;
    act(() => api('/me/preferences', { method: 'PATCH', body: JSON.stringify({
      ...workspace.preferences, ui_mode: mode === 'rpg' ? 'rpg' : 'classic',
    }) }), 'Режим интерфейса сохранён.');
  };
  const addSkill = async (claim: { skill_id: string; level: number; evidence: string }) => {
    await execute(() => api('/me/skill-claims', { method: 'POST', body: JSON.stringify({
      skill_id: claim.skill_id, claimed_level: claim.level, evidence: claim.evidence,
    }) }), 'Заявка на проверку навыка отправлена. Подтверждённый уровень пока не изменился.');
  };
  if (!authenticated) return <main className="employee-login"><form onSubmit={signIn}>
    <p>CAREER QUEST</p><h1>Кабинет сотрудника</h1><p>Войдите, чтобы увидеть свои навыки и план развития.</p>
    <label>Логин<input required autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} /></label>
    <label>Пароль<input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
    {error && <p role="alert">{error}</p>}
    <button disabled={busy}>{busy ? 'Подключаемся…' : 'Войти'}</button>
  </form></main>;

  const common = workspace ? {
    user: workspace.user, skills: workspace.skills, quests: workspace.quests,
    ladder: workspace.ladder, roles: workspace.roles, activeScreen,
    onNavigate: (screen: ScreenId) => setActiveScreen(screen),
    onStartQuest: acceptQuest, onAcceptQuest: acceptQuest,
    onAddSkill: () => setSkillModal({}),
    onRequestVerification: (skillId: string) => setSkillModal({ skillId }),
    onRequestReview: review, onSelectRole: selectRole, uiMode,
    onSelectMode: switchMode, onToggleUiMode: () => switchMode(uiMode === 'rpg' ? 'classic' : 'rpg'),
  } : null;

  return <div className={uiMode === 'rpg' ? 'theme-rpg' : 'theme-clean'}>
    {(error || notice) && <div className="employee-notice" role={error ? 'alert' : 'status'}>
      <span>{error || notice}</span><button aria-label="Закрыть уведомление" onClick={() => { setError(''); setNotice(''); }}>×</button>
    </div>}
    <div className="employee-content" aria-busy={busy}>
      {common && workspace ? <ErrorBoundary onReset={() => setActiveScreen(screenForMode('home', uiMode))}>
        {uiMode === 'rpg' ? <FigmaCanvas {...common}
          acceptedQuestIds={workspace.acceptedQuestIds} soundActive={soundActive}
          onToggleSound={() => { soundFx.setEnabled(!soundActive); setSoundActive(!soundActive); }}
        /> : <ClassicCanvas {...common} />}
      </ErrorBoundary> : <div className="employee-loading">{busy ? 'Загружаем профиль…' : 'Профиль не загружен. Перезагрузите страницу.'}</div>}
    </div>
    {busy && <div className="employee-busy" role="status">Синхронизация…</div>}
    {workspace && <AddSkillModal key={skillModal?.skillId ?? 'new'} isOpen={!!skillModal}
      catalogSkills={workspace.catalogSkills} initialSkillId={skillModal?.skillId}
      onClose={() => setSkillModal(null)} onAddSkill={addSkill} />}

  </div>;
}
