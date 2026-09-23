import React from 'react';
import { Home, GitBranch, CalendarCheck, Briefcase, User } from 'lucide-react';
import { ScreenId } from '../../types/career';

interface ClassicBottomNavProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}

export const ClassicBottomNav: React.FC<ClassicBottomNavProps> = ({
  currentScreen,
  onNavigate,
}) => {
  const navItems: {
    screen: ScreenId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { screen: 'classic_home', label: 'Home', icon: Home },
    { screen: 'classic_career_path', label: 'Career', icon: GitBranch },
    { screen: 'classic_dev_plan', label: 'Activities', icon: CalendarCheck },
    { screen: 'classic_career_explorer', label: 'Jobs', icon: Briefcase },
    { screen: 'classic_skills', label: 'Profile', icon: User },
  ];

  const isCurrent = (target: ScreenId) => {
    if (currentScreen === target) return true;
    if (target === 'classic_career_explorer' && currentScreen === 'classic_role_details') return true;
    if (target === 'classic_home' && (currentScreen === 'home' || currentScreen === 'splash')) return true;
    if (target === 'classic_skills' && (currentScreen === 'skills' || currentScreen === 'profile' || currentScreen === 'classic_mode_select' || currentScreen === 'mode_select')) return true;
    return false;
  };

  return (
    <nav
      aria-label="Classic Mobile Navigation"
      className="w-full bg-white border-t border-slate-200/90 px-3 py-2 shrink-0 z-30 select-none shadow-[0_-2px_8px_rgba(0,0,0,0.03)]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isCurrent(item.screen);
          return (
            <button
              key={item.screen}
              onClick={() => onNavigate(item.screen)}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-lg transition-colors cursor-pointer min-w-[56px] min-h-[44px] ${
                active
                  ? 'text-emerald-700 font-semibold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <div
                className={`p-1 rounded-md transition-colors ${
                  active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] leading-none tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
