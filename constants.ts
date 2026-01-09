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
  Download
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
  Download: <Download size={18} />
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