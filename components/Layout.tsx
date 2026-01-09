import React from 'react';
import { ICONS } from '../constants';
import { AppView } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: AppView;
  setView: (view: AppView) => void;
  userProfile: {
    name: string;
    role: string;
  };
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, userProfile }) => {
  const navItemClass = (view: AppView) => 
    `flex items-center gap-3 px-6 py-4 transition-all cursor-pointer font-heading tracking-wide uppercase text-sm border-l-4 ${
      currentView === view 
        ? 'border-[#ffed00] bg-zinc-900 text-white' 
        : 'border-transparent text-zinc-500 hover:text-white hover:bg-zinc-900'
    }`;

  // Generate initials from name
  const initials = userProfile.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 border-r border-zinc-800 flex flex-col bg-black">
        <div className="p-8 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            {/* Logo Mark */}
            <div className="w-10 h-10 bg-[#ffed00] flex items-center justify-center">
               <span className="text-black font-heading font-black text-xl">FG</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-heading font-bold tracking-tighter text-white leading-none">FUNCTIONAL</h1>
              <span className="text-[10px] text-[#42c8f7] font-bold tracking-[0.2em] uppercase">Gym Planner</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-8 space-y-1">
          <button onClick={() => setView(AppView.DASHBOARD)} className={navItemClass(AppView.DASHBOARD)}>
            {ICONS.Dashboard} Dashboard
          </button>
          <button onClick={() => setView(AppView.STUDIOS)} className={navItemClass(AppView.STUDIOS)}>
            {ICONS.Studios} My Studios
          </button>
          
          <div className="mt-8 mb-4 px-6 text-xs font-bold text-[#ffed00] uppercase tracking-widest opacity-80">
            Performance
          </div>
          
          <button onClick={() => setView(AppView.CREATE_CYCLE)} className={navItemClass(AppView.CREATE_CYCLE)}>
            {ICONS.Add} New Cycle
          </button>
          <button onClick={() => setView(AppView.VIEW_CYCLE)} className={navItemClass(AppView.VIEW_CYCLE)}>
            {ICONS.Cycle} Active Cycles
          </button>
        </nav>

        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-zinc-800 border border-zinc-700 flex items-center justify-center font-heading font-bold text-sm text-[#ffed00]">
              {initials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white uppercase truncate">{userProfile.name}</p>
              <p className="text-xs text-zinc-500 uppercase tracking-wide">{userProfile.role}</p>
            </div>
            <button 
              onClick={() => setView(AppView.PROFILE)}
              className={`transition-colors ${currentView === AppView.PROFILE ? 'text-[#ffed00]' : 'text-zinc-500 hover:text-[#ffed00]'}`}
            >
              {ICONS.Settings}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-black bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-black to-black">
        <div className="max-w-[1600px] mx-auto p-8 lg:p-12">
          {children}
        </div>
      </main>
    </div>
  );
};