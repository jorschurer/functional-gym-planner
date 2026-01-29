export interface Equipment {
  name: string;
  quantity: number;
  category: 'cardio' | 'weight' | 'gymnastic' | 'other';
}

export interface Studio {
  id: string;
  name: string;
  location: string;
  sizeSqM: number;
  maxCapacity: number;
  equipment: Equipment[];
  photoUrl?: string; // Base64
}

// HYROX Session Types
export type SessionType = 'endurance' | 'strength' | 'class';

export interface SessionConfig {
  type: SessionType;
  name: string;
  description: string;
  color: string; // Tailwind color class
}

// Weekly Training Themes
export type WeeklyTheme =
  | 'intervals'
  | 'zone2'
  | 'threshold'
  | 'race_prep'
  | 'recovery'
  | 'max_strength'
  | 'power_endurance'
  | 'transitions';

export interface Cycle {
  id: string;
  name: string;
  focus: 'hyrox' | 'crossfit' | 'general_strength' | 'endurance';
  durationWeeks: number;
  startDate: string;
  weeks: CycleWeek[];
  availableEquipment?: string[]; // Global equipment constraints for this cycle
}

export interface CycleWeek {
  weekNumber: number;
  focus: string; // e.g. "Hypertrophy Phase 1", "Peaking"
  theme: WeeklyTheme; // Evidence-based weekly training theme
  volume: number; // Arbitrary 0-100 scale for chart
  intensity: number; // Arbitrary 0-100 scale for chart
}

export interface Workout {
  id: string;
  cycleId: string;
  studioId: string;
  weekNumber: number;
  sessionType: SessionType; // Changed from dayOfWeek - now 'endurance', 'strength', or 'class'
  title: string;
  warmup: string;
  skillStrength: string;
  wod: string; // Main workout block
  cooldown: string;
  scalingNotes: string; // Specifically for the studio's constraints
  coachNotes: string; // Logistics for 15 people
  scientificReferences?: string[]; // Evidence-based sources
  excludedEquipment?: string[]; // Equipment to exclude from this workout
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  STUDIOS = 'STUDIOS',
  CREATE_CYCLE = 'CREATE_CYCLE',
  VIEW_CYCLE = 'VIEW_CYCLE',
  PROFILE = 'PROFILE',
}