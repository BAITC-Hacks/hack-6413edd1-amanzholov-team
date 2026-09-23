import React, { useState } from 'react';
import {
  CareerLadderNode,
  CareerRole,
  Quest,
  ScreenId,
  Skill,
  UiMode,
  UserProfile,
} from '../../types/career';
import { ClassicTopBar } from './ClassicTopBar';
import { ClassicBottomNav } from './ClassicBottomNav';
import { ModeSelectionScreen } from '../common/ModeSelectionScreen';
import { ClassicHomeScreen } from './ClassicHomeScreen';
import { ClassicCareerPathScreen } from './ClassicCareerPathScreen';
import { ClassicCareerExplorerScreen } from './ClassicCareerExplorerScreen';
import { ClassicRoleDetailsScreen } from './ClassicRoleDetailsScreen';
import { ClassicSkillsScreen } from './ClassicSkillsScreen';
import { ClassicDevPlanScreen } from './ClassicDevPlanScreen';

interface ClassicCanvasProps {
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
  uiMode: UiMode;
  onSelectMode?: (mode: UiMode) => void;
  onToggleUiMode: () => void;
}

export const ClassicCanvas: React.FC<ClassicCanvasProps> = ({
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
  uiMode,
  onSelectMode,
  onToggleUiMode,
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id || '');

  const selectedRole =
    roles.find((r) => r.id === selectedRoleId) || roles[0];

  const handleSelectRole = (roleId: string) => {
    setSelectedRoleId(roleId);
  };

  // Screen resolution for Classic
  const renderScreen = () => {
    switch (activeScreen) {
      case 'classic_mode_select':
      case 'mode_select':
        return (
          <ModeSelectionScreen
            user={user}
            uiMode={uiMode}
            onSelectMode={onSelectMode || ((m) => {
              if (m !== uiMode) onToggleUiMode();
            })}
            onNavigate={onNavigate}
          />
        );

      case 'classic_career_path':
      case 'map':
        return (
          <ClassicCareerPathScreen
            ladder={ladder}
            roles={roles}
            onNavigate={onNavigate}
            onSelectRole={handleSelectRole}
            onRequestReview={onRequestReview}
          />
        );

      case 'classic_career_explorer':
      case 'roles':
        return (
          <ClassicCareerExplorerScreen
            roles={roles}
            onNavigate={onNavigate}
            onSelectRole={handleSelectRole}
          />
        );

      case 'classic_role_details':
        return (
          <ClassicRoleDetailsScreen
            role={selectedRole}
            onSelectRole={onSelectRole}
            quests={quests}
            onNavigate={onNavigate}
            onStartQuest={onStartQuest}
          />
        );

      case 'classic_skills':
      case 'skills':
      case 'profile':
        return (
          <ClassicSkillsScreen
            skills={skills}
            user={user}
            uiMode={uiMode}
            onSelectMode={onSelectMode}
            onToggleUiMode={onToggleUiMode}
            onAddSkill={onAddSkill}
            onRequestVerification={onRequestVerification}
            onNavigate={onNavigate}
          />
        );

      case 'classic_dev_plan':
      case 'quests':
        return (
          <ClassicDevPlanScreen
            user={user}
            quests={quests}
            onStartQuest={onStartQuest}
            onNavigate={onNavigate}
          />
        );

      case 'classic_home':
      case 'home':
      case 'splash':
      default:
        return (
          <ClassicHomeScreen
            user={user}
            skills={skills}
            quests={quests}
            roles={roles}
            onStartQuest={onStartQuest}
            onNavigate={onNavigate}
            onSelectRole={handleSelectRole}
          />
        );
    }
  };

  // Get screen title for top bar
  const getScreenTitle = (): string => {
    switch (activeScreen) {
      case 'classic_mode_select':
        return 'Display Mode Selection';
      case 'classic_career_path':
      case 'map':
        return 'Career Path';
      case 'classic_career_explorer':
      case 'roles':
        return 'Career Explorer';
      case 'classic_role_details':
        return 'Role Details';
      case 'classic_skills':
      case 'skills':
      case 'profile':
        return 'Skills';
      case 'classic_dev_plan':
      case 'quests':
        return 'Development Plan';
      case 'classic_home':
      case 'home':
      default:
        return 'Home';
    }
  };

  return (
    <div className="w-full h-screen h-[100dvh] bg-[#f0f2f5] text-slate-900 flex justify-center overflow-hidden select-none font-sans">
      {/* 390x844 viewport container */}
      <main className="w-full max-w-[420px] h-full flex flex-col bg-[#fafaf9] border-x border-slate-200/80 relative overflow-hidden shadow-2xl">
        {/* Modern Classic Top Bar */}
        <ClassicTopBar
          user={user}
          title={getScreenTitle()}
          uiMode={uiMode}
          onToggleUiMode={onToggleUiMode}
          onNavigate={onNavigate}
          showBackToExplorer={activeScreen === 'classic_role_details'}
        />

        {/* Scrollable Screen Content */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {renderScreen()}
        </div>

        {/* Classic 5-tab Bottom Navigation */}
        <ClassicBottomNav currentScreen={activeScreen} onNavigate={onNavigate} />
      </main>
    </div>
  );
};
