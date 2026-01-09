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

export interface Cycle {
  id: string;
  name: string;
  focus: 'hyrox' | 'crossfit' | 'general_strength' | 'endurance';
  durationWeeks: number;
  startDate: string;
  weeks: CycleWeek[];
}

export interface CycleWeek {
  weekNumber: number;
  focus: string; // e.g. "Hypertrophy Phase 1", "Peaking"
  volume: number; // Arbitrary 0-100 scale for chart
  intensity: number; // Arbitrary 0-100 scale for chart
}

export interface Workout {
  id: string;
  cycleId: string;
  studioId: string;
  weekNumber: number;
  dayOfWeek: number; // 1 = Monday
  title: string;
  warmup: string;
  skillStrength: string;
  wod: string; // Workout of the Day
  cooldown: string;
  scalingNotes: string; // Specifically for the studio's constraints
  coachNotes: string; // Logistics for 15 people
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  STUDIOS = 'STUDIOS',
  CREATE_CYCLE = 'CREATE_CYCLE',
  VIEW_CYCLE = 'VIEW_CYCLE',
  PROFILE = 'PROFILE',
}