export type VerificationStatus = 'verified' | 'peer_endorsed' | 'self_reported' | 'warning' | 'locked';

export interface Skill {
  id: string;
  name: string;
  currentLevel: number;
  maxLevel: number;
  status: VerificationStatus;
  evidence: string;
  category: 'core' | 'architecture' | 'devops' | 'leadership' | 'data';
  verifiedCount?: number;
  endorsers?: string[];
  pendingReview?: boolean;
  claimedLevel?: number;
}

export interface Quest {
  id: string;
  title: string;
  type: 'Workshop' | 'Trial' | 'Project' | 'Mentorship';
  category: string;
  targetSkill: string;
  skillBonus: number;
  currentSkillLevel: number;
  nextSkillLevel: number;
  seniorRequiredLevel: number;
  xpProgressBonus: number; // e.g. 12%
  xpGain: number; // e.g. 350 XP
  duration: string;
  description: string;
  prerequisites: string[];
  unlocks?: string;
  isAccepted?: boolean;
  isCompleted?: boolean;
  rewardBadge?: string;
  sessionId?: string | null;
  isRecommended?: boolean;
  recommendationReasons?: string[];
}

export interface RoleGap {
  skill: string;
  current: number;
  required: number;
  isCritical?: boolean;
}

export interface CareerRole {
  id: string;
  title: string;
  readinessPercentage: number;
  verifiedCount: number;
  totalSkillsNeeded: number;
  gaps: RoleGap[];
  unlockCondition: string;
  salaryBand?: string;
  department: string;
  isCurrent?: boolean;
  status?: 'available' | 'locked' | 'in_progress';
  vacancyId?: string;
  roleLevelId?: string;
  coverageConfigured?: boolean;
}

export interface CareerLadderNode {
  id: string;
  title: string;
  tier: string;
  status: 'completed' | 'current' | 'next' | 'locked';
  levelRequirement: number;
  requiredSkills: { name: string; required: number; current: number }[];
  description: string;
  branch?: string;
}

export interface UserProfile {
  name: string;
  title: string;
  tier: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  progressToSenior: number; // percentage, e.g. 72%
  avatarUrl: string;
  guildRank: string;
  skillPoints: number;
  gems: number;
  completedQuestsCount: number;
  targetGrade?: string | null;
  targetRole?: string | null;
  coverageConfigured?: boolean;
}

export type ScreenId =
  | 'splash'
  | 'home'
  | 'map'
  | 'skills'
  | 'quests'
  | 'roles'
  | 'profile'
  | 'mode_select'
  | 'classic_mode_select'
  | 'classic_home'
  | 'classic_career_path'
  | 'classic_career_explorer'
  | 'classic_role_details'
  | 'classic_skills'
  | 'classic_dev_plan';

export type UiMode = 'rpg' | 'classic' | 'clean';
