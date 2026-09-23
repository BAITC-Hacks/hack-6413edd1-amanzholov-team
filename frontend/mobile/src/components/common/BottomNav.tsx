import React from 'react';
import { Home, Compass, Scroll, Briefcase, User } from 'lucide-react';
import { ScreenId } from '../../types/career';
import { soundFx } from '../../utils/audio';

interface BottomNavProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const isScreenActive = (tabId: ScreenId) => {
    if (currentScreen === tabId) return true;
    if (tabId === 'home' && (currentScreen === 'classic_home' || currentScreen === 'splash')) return true;
    if (tabId === 'map' && currentScreen === 'classic_career_path') return true;
    if (tabId === 'quests' && currentScreen === 'classic_dev_plan') return true;
    if (tabId === 'roles' && (currentScreen === 'classic_career_explorer' || currentScreen === 'classic_role_details')) return true;
    if (tabId === 'skills' && (currentScreen === 'classic_skills' || currentScreen === 'profile' || currentScreen === 'mode_select' || currentScreen === 'classic_mode_select')) return true;
    return false;
  };

  const navItems = [
    { id: 'home' as ScreenId, label: 'Home', icon: Home },
    { id: 'map' as ScreenId, label: 'Map', icon: Compass },
    { id: 'quests' as ScreenId, label: 'Quests', icon: Scroll },
    { id: 'roles' as ScreenId, label: 'Jobs', icon: Briefcase },
    { id: 'skills' as ScreenId, label: 'Profile', icon: User },
  ];

  return (
    <nav className="w-full bg-[#201915] border-t-2 border-[#473424] px-2 py-1 flex items-center justify-around shrink-0 z-30 shadow-[0_-3px_10px_rgba(0,0,0,0.5)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = isScreenActive(item.id);

        return (
          <button
            key={item.id}
            onClick={() => {
              soundFx.playSelect();
              onNavigate(item.id);
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-2 min-w-[60px] min-h-[48px] transition-all relative select-none cursor-pointer group ${
              isActive
                ? 'text-[#f5ce7a] font-bold'
                : 'text-[#9e8d7d] hover:text-[#e8dacb]'
            }`}
          >
            {/* Active pointer notch in warm honey gold */}
            {isActive && (
              <span className="absolute -top-1 w-6 h-1 bg-[#d99738] shadow-[0_0_6px_#f5c973]" />
            )}

            <div className="relative">
              <Icon
                className={`w-5 h-5 transition-transform duration-100 ${
                  isActive ? 'scale-110 stroke-[2.4]' : 'group-hover:scale-105 stroke-[1.8]'
                }`}
              />

            </div>

            <span
              className={`text-[10px] mt-1 font-pixel tracking-wide ${
                isActive ? 'text-[#f5d58c]' : 'text-[#9c8b7b]'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
