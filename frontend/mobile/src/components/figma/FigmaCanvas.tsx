import React from 'react';
import {
  UserProfile,
  Skill,
  Quest,
  CareerLadderNode,
  CareerRole,
  ScreenId,
  UiMode,
} from '../../types/career';
import { SplashScreen } from '../screens/SplashScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { CareerMapScreen } from '../screens/CareerMapScreen';
import { SkillsLedgerScreen } from '../screens/SkillsLedgerScreen';
import { RecommendedQuestsScreen } from '../screens/RecommendedQuestsScreen';
import { OpenRolesScreen } from '../screens/OpenRolesScreen';
import { MobileTopBar } from '../common/MobileTopBar';
import { BottomNav } from '../common/BottomNav';
import { CozyAmbientParticles } from '../common/CozyAmbientParticles';
import { ModeSelectionScreen } from '../common/ModeSelectionScreen';
import { soundFx } from '../../utils/audio';

interface FigmaCanvasProps {
  user: UserProfile;
  skills: Skill[];
  quests: Quest[];
  ladder: CareerLadderNode[];
  roles: CareerRole[];
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onStartQuest: (questId: string) => void;
  onAcceptQuest: (questId: string) => void;
  onAddSkill: () => void;
  onRequestVerification: (skillId: string) => void;
  onRequestReview: () => void;
  onSelectRole: (roleId: string) => void;
  acceptedQuestIds: string[];
  uiMode: UiMode;
  onSelectMode?: (mode: UiMode) => void;
  onToggleUiMode: () => void;
  soundActive: boolean;
  onToggleSound: () => void;
}

export const FigmaCanvas: React.FC<FigmaCanvasProps> = ({
  user,
  skills,
  quests,
  ladder,
  roles,
  activeScreen,
  onNavigate,
  onStartQuest,
  onAcceptQuest,
  onAddSkill,
  onRequestVerification,
  onRequestReview,
  onSelectRole,
  acceptedQuestIds,
  uiMode,
  onSelectMode,
  onToggleUiMode,
  soundActive,
  onToggleSound,
}) => {
  const featuredQuest = quests.find((quest) => quest.isRecommended && !quest.isAccepted) || quests.find((quest) => !quest.isCompleted) || quests[0];

  const normalizeScreenId = (screenId: ScreenId): ScreenId => {
    switch (screenId) {
      case 'mode_select':
      case 'classic_mode_select':
        return 'mode_select';
      case 'classic_career_path':
        return 'map';
      case 'classic_skills':
      case 'profile':
        return 'skills';
      case 'classic_dev_plan':
        return 'quests';
      case 'classic_career_explorer':
      case 'classic_role_details':
        return 'roles';
      case 'classic_home':
      case 'home':
        return 'home';
      case 'splash':
        return 'splash';
      case 'map':
        return 'map';
      case 'skills':
        return 'skills';
      case 'quests':
        return 'quests';
      case 'roles':
        return 'roles';
      default:
        return 'home';
    }
  };

  const renderScreenContent = (screenId: ScreenId) => {
    const resolvedScreen = normalizeScreenId(screenId);
    switch (resolvedScreen) {
      case 'mode_select':
        return (
          <div className="w-full h-full flex flex-col min-h-0 bg-[#191512]">
            <MobileTopBar
              user={user}
              uiMode={uiMode}
              onToggleUiMode={onToggleUiMode}
              title="Interface Style"
              onSoundToggle={onToggleSound}
              soundActive={soundActive}
            />
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <ModeSelectionScreen
                user={user}
                uiMode={uiMode}
                onSelectMode={onSelectMode || ((m) => {
                  if (m !== uiMode) onToggleUiMode();
                })}
                onNavigate={onNavigate}
              />
            </div>
            <BottomNav currentScreen="skills" onNavigate={onNavigate} />
          </div>
        );
      case 'splash':
        return (
          <div className="w-full h-full flex flex-col min-h-0 bg-[#191512]">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <SplashScreen
                onStartJourney={() => {
                  soundFx.playSelect();
                  onNavigate('home');
                }}
                onContinue={() => {
                  soundFx.playSelect();
                  onNavigate('home');
                }}
                uiMode={uiMode}
                onToggleUiMode={onToggleUiMode}
                onNavigate={onNavigate}
              />
            </div>
            <BottomNav currentScreen={screenId} onNavigate={onNavigate} />
          </div>
        );
      case 'home':
        return (
          <div className="w-full h-full flex flex-col min-h-0 bg-[#191512]">
            <MobileTopBar
              user={user}
              uiMode={uiMode}
              onToggleUiMode={onToggleUiMode}
              title="Career Command"
              onSoundToggle={onToggleSound}
              soundActive={soundActive}
            />
            <div className="flex-1 min-h-0 overflow-hidden">
              <HomeScreen
                user={user}
                skills={skills}
                featuredQuest={featuredQuest}
                onStartQuest={(id) => {
                  onStartQuest(id);
                  onNavigate('quests');
                }}
                onNavigate={(s) => onNavigate(s)}
              />
            </div>
            <BottomNav currentScreen={screenId} onNavigate={onNavigate} />
          </div>
        );
      case 'map':
        return (
          <div className="w-full h-full flex flex-col min-h-0 bg-[#191512]">
            <MobileTopBar
              user={user}
              uiMode={uiMode}
              onToggleUiMode={onToggleUiMode}
              title="Progression Topology"
              onSoundToggle={onToggleSound}
              soundActive={soundActive}
            />
            <div className="flex-1 min-h-0 overflow-hidden">
              <CareerMapScreen
                ladder={ladder}
                branches={roles}
                onNavigate={onNavigate}
                onSelectRole={onSelectRole}
              />
            </div>
            <BottomNav currentScreen={screenId} onNavigate={onNavigate} />
          </div>
        );
      case 'skills':
        return (
          <div className="w-full h-full flex flex-col min-h-0 bg-[#191512]">
            <MobileTopBar
              user={user}
              uiMode={uiMode}
              onToggleUiMode={onToggleUiMode}
              title="Competency Ledger"
              onSoundToggle={onToggleSound}
              soundActive={soundActive}
            />
            <div className="flex-1 min-h-0 overflow-hidden">
              <SkillsLedgerScreen
                skills={skills}
                onAddSkill={onAddSkill}
                onRequestVerification={onRequestVerification}
                onRequestReview={onRequestReview}
                onNavigate={onNavigate}
                uiMode={uiMode}
                onSelectMode={onSelectMode}
                onToggleUiMode={onToggleUiMode}
              />
            </div>
            <BottomNav currentScreen={screenId} onNavigate={onNavigate} />
          </div>
        );
      case 'quests':
        return (
          <div className="w-full h-full flex flex-col min-h-0 bg-[#191512]">
            <MobileTopBar
              user={user}
              uiMode={uiMode}
              onToggleUiMode={onToggleUiMode}
              title="Guild Quests"
              onSoundToggle={onToggleSound}
              soundActive={soundActive}
            />
            <div className="flex-1 min-h-0 overflow-hidden">
              <RecommendedQuestsScreen
                quests={quests}
                onAcceptQuest={onAcceptQuest}
                acceptedQuestIds={acceptedQuestIds}
              />
            </div>
            <BottomNav currentScreen={screenId} onNavigate={onNavigate} />
          </div>
        );
      case 'roles':
        return (
          <div className="w-full h-full flex flex-col min-h-0 bg-[#191512]">
            <MobileTopBar
              user={user}
              uiMode={uiMode}
              onToggleUiMode={onToggleUiMode}
              title="Role Opportunities"
              onSoundToggle={onToggleSound}
              soundActive={soundActive}
            />
            <div className="flex-1 min-h-0 overflow-hidden">
              <OpenRolesScreen
                roles={roles}
                onNavigate={onNavigate}
                onSelectRole={onSelectRole}
              />
            </div>
            <BottomNav currentScreen={screenId} onNavigate={onNavigate} />
          </div>
        );
      default:
        return (
          <div className="w-full h-full flex flex-col min-h-0 bg-[#191512]">
            <MobileTopBar
              user={user}
              uiMode={uiMode}
              onToggleUiMode={onToggleUiMode}
              title="Career Command"
              onSoundToggle={onToggleSound}
              soundActive={soundActive}
            />
            <div className="flex-1 min-h-0 overflow-hidden">
              <HomeScreen
                user={user}
                skills={skills}
                featuredQuest={featuredQuest}
                onStartQuest={(id) => {
                  onStartQuest(id);
                  onNavigate('quests');
                }}
                onNavigate={(s) => onNavigate(s)}
              />
            </div>
            <BottomNav currentScreen="home" onNavigate={onNavigate} />
          </div>
        );
    }
  };

  return (
    <div className="w-full h-screen h-[100dvh] bg-[#191512] text-[#efe4d5] flex justify-center overflow-hidden select-none">
      {/* Pure Screen Viewport with buttons, bottom navigation, and ambient floating particles */}
      <main className="w-full max-w-[420px] h-full flex flex-col bg-[#191512] relative overflow-hidden">
        {/* Subtle, cozy floating leaves and warm dust motes */}
        <CozyAmbientParticles />
        {renderScreenContent(activeScreen)}
      </main>
    </div>
  );
};
