import React from 'react';
import {
  LayoutDashboard,
  Dumbbell,
  CalendarDays,
  Plus,
  Camera,
  Users,
  Settings,
  ChevronRight,
  Trash2,
  Play,
  Download,
  Activity,
  Zap,
  Target,
  Edit2,
  X
} from 'lucide-react';

export const ICONS = {
  Dashboard: <LayoutDashboard size={20} />,
  Studios: <Dumbbell size={20} />,
  Cycle: <CalendarDays size={20} />,
  Add: <Plus size={20} />,
  Camera: <Camera size={20} />,
  Users: <Users size={16} />,
  Settings: <Settings size={20} />,
  ArrowRight: <ChevronRight size={16} />,
  Delete: <Trash2 size={16} />,
  Play: <Play size={16} />,
  Download: <Download size={18} />,
  Endurance: <Activity size={20} />,
  Strength: <Dumbbell size={20} />,
  Class: <Target size={20} />,
  Edit: <Edit2 size={16} />,
  Close: <X size={16} />
};

export const MOCK_STUDIOS_INITIAL = [
  {
    id: 's1',
    name: 'Downtown Box',
    location: 'Berlin Mitte',
    sizeSqM: 120,
    maxCapacity: 15,
    equipment: [
      { name: 'Concept2 Rower', quantity: 8, category: 'cardio' },
      { name: 'Barbell', quantity: 15, category: 'weight' },
      { name: 'Pullup Rig', quantity: 1, category: 'gymnastic' }
    ]
  },
  {
    id: 's2',
    name: 'Garage Gym',
    location: 'Potsdam',
    sizeSqM: 80,
    maxCapacity: 10,
    equipment: [
      { name: 'Assault Bike', quantity: 4, category: 'cardio' },
      { name: 'Dumbbells', quantity: 20, category: 'weight' },
      { name: 'Box', quantity: 10, category: 'gymnastic' }
    ]
  }
];

export const LOADING_MESSAGES = [
  "Initializing Sport Science Model...",
  "Analyzing physiological demands...",
  "Structuring Mesocycle phases...",
  "Calculating progressive overload...",
  "Integrating deload & recovery weeks...",
  "Optimizing volume vs intensity...",
  "Finalizing periodization logic..."
];

// HYROX Weekly Session Configurations
export const SESSION_CONFIGS = [
  {
    type: 'endurance',
    name: 'HYROX Endurance',
    description: 'Aerobic capacity, running economy, and sustained effort training',
    color: 'bg-blue-500'
  },
  {
    type: 'strength',
    name: 'HYROX Strength',
    description: 'Functional strength for sled, sandbag, and farmer carries',
    color: 'bg-red-500'
  },
  {
    type: 'class',
    name: 'HYROX Class',
    description: 'Race simulation with transition practice and pacing',
    color: 'bg-yellow-500'
  }
];

// HYROX Core Equipment
export const HYROX_EQUIPMENT = [
  'SkiErg',
  'Concept2 Rower',
  'Assault Bike / Air Bike',
  'Sled',
  'Burpee Broad Jump Space',
  'Sandbag (10-20kg)',
  'Wall Balls (6-9kg)',
  'Farmer Carry Kettlebells/Dumbbells'
];

// Weekly Training Themes with Descriptions
export const WEEKLY_THEMES = {
  intervals: {
    name: 'High-Intensity Intervals',
    description: 'VO2max development through repeated short, intense efforts',
    scientificBasis: 'Tabata Protocol, 4x4 Norwegian Method'
  },
  zone2: {
    name: 'Zone 2 Endurance',
    description: 'Aerobic base building at conversational pace',
    scientificBasis: 'Polarized Training Model (Seiler & Tønnessen, 2009)'
  },
  threshold: {
    name: 'Lactate Threshold',
    description: 'Sustained effort at race pace intensity',
    scientificBasis: 'Critical Power Theory (Jones et al., 2019)'
  },
  race_prep: {
    name: 'Race Preparation',
    description: 'Full simulations with transitions and pacing strategy',
    scientificBasis: 'Sport-Specific Practice Principle'
  },
  recovery: {
    name: 'Active Recovery',
    description: 'Low-intensity movement for adaptation and regeneration',
    scientificBasis: 'Supercompensation Theory'
  },
  max_strength: {
    name: 'Maximum Strength',
    description: 'Heavy compound lifts at 85-95% 1RM',
    scientificBasis: 'Concurrent Training Model (Coffey & Hawley, 2017)'
  },
  power_endurance: {
    name: 'Power Endurance',
    description: 'Repeated explosive efforts under fatigue',
    scientificBasis: 'Anaerobic Capacity Development'
  },
  transitions: {
    name: 'Transition Efficiency',
    description: 'Minimizing time and energy cost between stations',
    scientificBasis: 'Task Switching & Motor Learning'
  }
};

// Scientific Sources for Evidence-Based Programming
export const SCIENTIFIC_SOURCES = [
  'Seiler, S. & Tønnessen, E. (2009). Intervals, Thresholds, and Long Slow Distance.',
  'Jones, A.M. et al. (2019). Critical Power: Implications for Determination of VO2max and Exercise Tolerance.',
  'Coffey, V.G. & Hawley, J.A. (2017). Concurrent exercise training: do opposites distract?',
  'Tabata, I. et al. (1996). Effects of moderate-intensity endurance and high-intensity intermittent training.',
  'Buchheit, M. & Laursen, P.B. (2013). High-intensity interval training, solutions to the programming puzzle.',
  'Bompa, T.O. & Haff, G.G. (2009). Periodization: Theory and Methodology of Training.',
  'Verkhoshansky, Y. & Siff, M.C. (2009). Supertraining.'
];