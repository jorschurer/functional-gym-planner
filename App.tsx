import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Button } from './components/Button';
import { ICONS, MOCK_STUDIOS_INITIAL, LOADING_MESSAGES } from './constants';
import { AppView, Studio, Cycle, Workout, CycleWeek } from './types';
import { analyzeStudioPhoto, fileToGenerativePart, generateMacrocycle, generateDailyWorkouts } from './services/geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { toPng } from 'html-to-image';

export default function App() {
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);

  // State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [studios, setStudios] = useState<Studio[]>(MOCK_STUDIOS_INITIAL as any);
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null);
  const [generatedWorkouts, setGeneratedWorkouts] = useState<Workout[]>([]);

  // API Key State
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });

  // Modal state for initial API key prompt
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  // User Profile State
  const [userProfile, setUserProfile] = useState({
    name: 'John Doe',
    role: 'Head Coach',
    email: 'coach@functionalgym.com',
    gymName: 'Functional HQ'
  });
  
  // UI State for Creating Studio
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [newStudioName, setNewStudioName] = useState('');
  
  // UI State for Creating Cycle
  const [isGeneratingCycle, setIsGeneratingCycle] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [cycleName, setCycleName] = useState('Winter Hyrox Prep');
  const [cycleFocus, setCycleFocus] = useState<'hyrox' | 'crossfit' | 'general_strength' | 'endurance'>('hyrox');
  const [cycleDuration, setCycleDuration] = useState(8);

  // UI State for Viewing Workout
  const [selectedDay, setSelectedDay] = useState<{week: number, day: number} | null>(null);
  const [currentViewWeekIndex, setCurrentViewWeekIndex] = useState(0); // Add state to track which week is being viewed
  const [isGeneratingWorkout, setIsGeneratingWorkout] = useState(false);

  // --- Effects ---
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('gemini_api_key', apiKey);
    }
  }, [apiKey]);

  // Show API key modal on first load if no key exists
  useEffect(() => {
    if (!apiKey) {
      setShowApiKeyModal(true);
    }
  }, []);

  // --- Handlers ---

  const handleSaveApiKey = () => {
    if (tempApiKey.trim()) {
      setApiKey(tempApiKey.trim());
      setShowApiKeyModal(false);
      setTempApiKey('');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!apiKey) {
      alert("Please add your Gemini API Key in Profile Settings first.");
      setView(AppView.PROFILE);
      return;
    }

    if (e.target.files && e.target.files[0]) {
      setIsAnalyzingImage(true);
      try {
        const file = e.target.files[0];
        const base64 = await fileToGenerativePart(file);
        const analysis = await analyzeStudioPhoto(base64, apiKey);

        const newStudio: Studio = {
          id: Math.random().toString(36).substr(2, 9),
          name: newStudioName || 'New Studio',
          location: 'Auto-detected',
          sizeSqM: analysis.sizeEstimate,
          maxCapacity: Math.floor(analysis.sizeEstimate / 6), // roughly 6sqm per person functional
          equipment: analysis.equipment,
          photoUrl: `data:image/jpeg;base64,${base64}`
        };

        setStudios([...studios, newStudio]);
        setNewStudioName('');
      } catch (error) {
        console.error(error);
        alert('Failed to analyze image. Check your API Key.');
      } finally {
        setIsAnalyzingImage(false);
      }
    }
  };

  const handleDemoImage = async () => {
    if (!apiKey) {
      alert("Please add your Gemini API Key in Profile Settings first.");
      setView(AppView.PROFILE);
      return;
    }

    setIsAnalyzingImage(true);
    try {
      // Fetch the demo image from public folder
      const response = await fetch('/demo-gym-layout.png');
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const analysis = await analyzeStudioPhoto(base64, apiKey);

        const newStudio: Studio = {
          id: Math.random().toString(36).substr(2, 9),
          name: newStudioName || 'Demo Training Studio',
          location: 'Demo Location',
          sizeSqM: analysis.sizeEstimate,
          maxCapacity: Math.floor(analysis.sizeEstimate / 6),
          equipment: analysis.equipment,
          photoUrl: `data:image/png;base64,${base64}`
        };

        setStudios([...studios, newStudio]);
        setNewStudioName('');
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      console.error(error);
      alert('Failed to load demo image. Make sure the demo image is available in the public folder.');
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleCreateCycle = async () => {
    if (!apiKey) {
      alert("Please add your Gemini API Key in Profile Settings first.");
      setView(AppView.PROFILE);
      return;
    }

    setIsGeneratingCycle(true);
    let msgIndex = 0;
    setLoadingMessage(LOADING_MESSAGES[0]);

    // Cycle through messages to keep user entertained and informed
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[msgIndex]);
    }, 2500);

    try {
      const weeks = await generateMacrocycle(cycleName, cycleFocus, cycleDuration, apiKey);
      const newCycle: Cycle = {
        id: Math.random().toString(36).substr(2, 9),
        name: cycleName,
        focus: cycleFocus,
        durationWeeks: cycleDuration,
        startDate: new Date().toISOString(),
        weeks: weeks
      };
      setActiveCycle(newCycle);
      setCurrentViewWeekIndex(0); // Reset to week 1
      setView(AppView.VIEW_CYCLE);
    } catch (error) {
      console.error(error);
      alert('Failed to create cycle. Check your API Key.');
    } finally {
      clearInterval(interval);
      setIsGeneratingCycle(false);
      setLoadingMessage('');
    }
  };

  const handleGenerateDay = async (week: CycleWeek, day: number) => {
    if (!activeCycle) return;
    if (!apiKey) {
      alert("Please add your Gemini API Key in Profile Settings first.");
      setView(AppView.PROFILE);
      return;
    }

    setIsGeneratingWorkout(true);
    try {
      // Generate workouts for ALL studios at once for this day
      const workouts = await generateDailyWorkouts(activeCycle, week, day, studios, apiKey);

      // Filter out old workouts for this day/week if re-generating
      const otherWorkouts = generatedWorkouts.filter(w =>
        !(w.weekNumber === week.weekNumber && w.dayOfWeek === day)
      );

      setGeneratedWorkouts([...otherWorkouts, ...workouts]);
      setSelectedDay({ week: week.weekNumber, day });
    } catch (error) {
      console.error(error);
      alert('Failed to generate daily session.');
    } finally {
      setIsGeneratingWorkout(false);
    }
  };

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    alert('PROFILE UPDATED SUCCESSFULLY');
  };

  const handleExportImage = async (elementId: string, filename: string) => {
    const node = document.getElementById(elementId);
    if (!node) return;

    try {
      // Use html-to-image to generate png
      // We filter out elements with class 'export-btn' so the button itself isn't in the screenshot
      const dataUrl = await toPng(node, { 
        backgroundColor: '#000000',
        filter: (childNode) => {
          return !childNode.classList?.contains('export-btn');
        }
      });
      
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
      alert('Could not export image. Try again.');
    }
  };

  // --- Views ---

  const renderDashboard = () => (
    <div className="space-y-8 relative">
      <header className="mb-10 border-b border-zinc-800 pb-8">
        <h2 className="text-5xl font-heading font-bold text-white uppercase tracking-tighter mb-2">Dashboard</h2>
        <p className="text-zinc-400 font-light tracking-wide text-lg">Overview of your boxes and programming.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Card 1 */}
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-none relative overflow-hidden group hover:border-[#ffed00] transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            {ICONS.Studios}
          </div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-heading font-bold text-xl text-white tracking-wider">ACTIVE STUDIOS</h3>
            <span className="text-black bg-[#ffed00] px-3 py-1 font-bold text-sm rounded-none">{studios.length}</span>
          </div>
          <p className="text-sm text-zinc-400">Locations managed via AI vision analysis.</p>
        </div>

        {/* Card 2 */}
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-none relative overflow-hidden group hover:border-[#ffed00] transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             {ICONS.Cycle}
          </div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-heading font-bold text-xl text-white tracking-wider">CURRENT PHASE</h3>
            {activeCycle ? (
              <span className="text-white bg-[#42c8f7] px-3 py-1 font-bold text-sm rounded-none tracking-wider">ACTIVE</span>
            ) : (
              <span className="text-zinc-500 bg-zinc-800 px-3 py-1 font-bold text-sm rounded-none">NONE</span>
            )}
          </div>
          {activeCycle ? (
            <div>
              <p className="text-white font-bold text-lg font-heading">{activeCycle.name}</p>
              <p className="text-xs text-zinc-400 uppercase tracking-widest mt-1">{activeCycle.durationWeeks} WEEKS • {activeCycle.focus}</p>
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setView(AppView.CREATE_CYCLE)}>START CYCLE</Button>
          )}
        </div>

        {/* Card 3 */}
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-none relative overflow-hidden group hover:border-[#ffed00] transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            {ICONS.Users}
          </div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-heading font-bold text-xl text-white tracking-wider">ATHLETES</h3>
            <span className="text-white border border-[#42c8f7] text-[#42c8f7] px-3 py-1 font-bold text-sm rounded-none uppercase">Active</span>
          </div>
          <p className="text-6xl font-heading font-bold text-white tracking-tighter">~45</p>
          <p className="text-xs text-zinc-500 mt-2 uppercase tracking-widest">Across all sessions</p>
        </div>
      </div>

      {activeCycle && (
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-none mt-12">
          <h3 className="font-heading font-bold text-xl text-white mb-8 tracking-wider border-l-4 border-[#ffed00] pl-4">VOLUME LOAD PROJECTION</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeCycle.weeks}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis 
                  dataKey="weekNumber" 
                  stroke="#71717a" 
                  tickFormatter={(v) => `W${v}`} 
                  tick={{fontFamily: 'Oswald', fill: '#999'}}
                />
                <YAxis stroke="#71717a" tick={{fontFamily: 'Oswald', fill: '#999'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', borderColor: '#333', color: '#fff', borderRadius: '0px' }}
                  itemStyle={{ color: '#fff', fontFamily: 'Oswald', textTransform: 'uppercase' }}
                  cursor={{fill: '#ffffff10'}}
                />
                <Legend iconType="square" wrapperStyle={{paddingTop: '20px', fontFamily: 'Oswald', textTransform: 'uppercase'}} />
                {/* Yellow Bar */}
                <Bar dataKey="volume" name="Volume" fill="#ffed00" radius={[0, 0, 0, 0]} />
                {/* Blue Bar */}
                <Bar dataKey="intensity" name="Intensity" fill="#42c8f7" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );

  const renderStudios = () => (
    <div className="space-y-8">
      <header className="flex justify-between items-end mb-10 border-b border-zinc-800 pb-8">
        <div>
          <h2 className="text-5xl font-heading font-bold text-white uppercase tracking-tighter mb-2">My Studios</h2>
          <p className="text-zinc-400 font-light tracking-wide text-lg">Manage equipment and space constraints.</p>
        </div>
      </header>

      {/* Add New Studio Input */}
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-none mb-12">
        <h3 className="text-xl font-heading font-bold text-white mb-6 uppercase border-l-4 border-[#ffed00] pl-4">Add New Studio</h3>
        <div className="flex gap-6 items-end flex-col md:flex-row">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-widest">Studio Name</label>
            <input
              type="text"
              className="w-full bg-black border border-zinc-700 rounded-none px-6 py-4 text-white focus:border-[#ffed00] focus:ring-0 outline-none transition-colors font-heading text-lg tracking-wide placeholder-zinc-700"
              placeholder="E.G. SOUTHSIDE BOX"
              value={newStudioName}
              onChange={(e) => setNewStudioName(e.target.value)}
            />
          </div>
          <div className="flex-1 w-full">
             <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-widest">Upload Photo (Equipment & Space)</label>
             <div className="flex gap-3">
               <div className="relative flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={!newStudioName || isAnalyzingImage}
                  />
                  <Button
                    variant="secondary"
                    className="w-full justify-between"
                    isLoading={isAnalyzingImage}
                  >
                     {isAnalyzingImage ? 'ANALYZING SPACE...' : 'SELECT PHOTO & ANALYZE'} {ICONS.Camera}
                  </Button>
               </div>
               <Button
                 onClick={handleDemoImage}
                 disabled={isAnalyzingImage}
                 variant="secondary"
                 className="px-6 whitespace-nowrap border-[#ffed00] text-[#ffed00] hover:bg-[#ffed00] hover:text-black"
               >
                 USE DEMO
               </Button>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {studios.map(studio => (
          <div key={studio.id} className="bg-black border border-zinc-800 rounded-none overflow-hidden group hover:border-zinc-600 transition-all">
            {studio.photoUrl && (
              <div className="h-64 w-full bg-zinc-900 overflow-hidden relative">
                 <img src={studio.photoUrl} alt={studio.name} className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 transition-all duration-500" />
                 <div className="absolute top-4 right-4 bg-[#ffed00] px-3 py-1 text-xs font-bold text-black uppercase tracking-wider">
                    AI Scanned
                 </div>
              </div>
            )}
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-3xl font-heading font-bold text-white uppercase tracking-tight leading-none mb-2">{studio.name}</h3>
                  <p className="text-sm text-[#42c8f7] font-bold uppercase tracking-widest">{studio.location} • {studio.sizeSqM}m²</p>
                </div>
                <div className="flex items-center gap-2 text-zinc-400 font-heading font-bold text-lg">
                  {ICONS.Users} <span className="text-white">{studio.maxCapacity}</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-zinc-600 uppercase tracking-widest border-b border-zinc-900 pb-2">Inventory</h4>
                <div className="flex flex-wrap gap-2">
                  {studio.equipment.slice(0, 6).map((item, idx) => (
                    <span key={idx} className="bg-zinc-900 text-zinc-300 text-xs px-3 py-2 rounded-none border border-zinc-800 font-bold uppercase tracking-wide">
                      {item.quantity}x {item.name}
                    </span>
                  ))}
                  {studio.equipment.length > 6 && (
                    <span className="text-xs text-[#ffed00] font-bold px-2 py-2 uppercase tracking-wide flex items-center">+{studio.equipment.length - 6} more</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCreateCycle = () => (
    <div className="max-w-4xl mx-auto py-12">
      <div className="text-center mb-16">
        <h2 className="text-6xl font-heading font-bold text-white mb-6 uppercase tracking-tighter">Periodization Architect</h2>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto font-light">
          Use Sport Science AI to create an 8-12 week progression cycle. 
          The system creates the "Main Quest" first, then adapts daily battles to your specific gyms.
        </p>
      </div>

      <div className="bg-zinc-900 border-2 border-zinc-800 p-10 rounded-none shadow-2xl space-y-8 relative">
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-[#ffed00]"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-[#ffed00]"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-[#ffed00]"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-[#ffed00]"></div>

        <div>
          <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-widest">Cycle Name</label>
          <input 
            value={cycleName}
            onChange={(e) => setCycleName(e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-none px-6 py-4 text-white focus:border-[#ffed00] focus:ring-0 outline-none font-heading text-2xl tracking-wide font-bold uppercase"
          />
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-widest">Duration</label>
            <select 
              value={cycleDuration}
              onChange={(e) => setCycleDuration(Number(e.target.value))}
              className="w-full bg-black border border-zinc-700 rounded-none px-6 py-4 text-white focus:border-[#ffed00] focus:ring-0 outline-none appearance-none font-heading text-lg font-bold uppercase"
            >
              {[4, 6, 8, 10, 12, 16].map(w => <option key={w} value={w}>{w} WEEKS</option>)}
            </select>
          </div>
          <div>
             <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-widest">Primary Focus</label>
             <select 
              value={cycleFocus}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onChange={(e) => setCycleFocus(e.target.value as any)}
              className="w-full bg-black border border-zinc-700 rounded-none px-6 py-4 text-white focus:border-[#ffed00] focus:ring-0 outline-none appearance-none font-heading text-lg font-bold uppercase"
            >
              <option value="hyrox">Hyrox Competition Prep</option>
              <option value="crossfit">CrossFit GPP</option>
              <option value="endurance">Endurance & Engine</option>
              <option value="general_strength">Functional Strength</option>
            </select>
          </div>
        </div>

        <div className="pt-8">
          <Button 
            className="w-full py-6 text-xl" 
            onClick={handleCreateCycle}
            disabled={isGeneratingCycle}
          >
            {isGeneratingCycle ? (
               <div className="flex items-center gap-4">
                 <div className="w-6 h-6 border-4 border-black/30 border-t-black rounded-full animate-spin" />
                 <span className="animate-pulse">{loadingMessage.toUpperCase()}</span>
               </div>
            ) : "GENERATE MACROCYCLE PLAN"}
          </Button>
          <p className="text-[10px] text-center text-zinc-600 mt-4 uppercase tracking-widest font-bold">
            Powered by Gemini 3 Pro Reasoning Engine
          </p>
        </div>
      </div>
    </div>
  );

  const renderViewCycle = () => {
    if (!activeCycle) return (
      <div className="text-center py-20">
        <h3 className="text-3xl font-heading text-white mb-6 uppercase">No Active Cycle</h3>
        <Button onClick={() => setView(AppView.CREATE_CYCLE)}>Create New Cycle</Button>
      </div>
    );

    const activeWeek = activeCycle.weeks[currentViewWeekIndex];

    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex justify-between items-end mb-8 border-b border-zinc-800 pb-6">
          <div>
            <span className="text-[#ffed00] text-sm font-bold tracking-[0.2em] uppercase mb-2 block">{activeCycle.focus}</span>
            <h2 className="text-5xl font-heading font-bold text-white uppercase tracking-tighter leading-none">{activeCycle.name}</h2>
          </div>
          <div className="text-right">
             <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Duration</p>
             <p className="text-3xl font-heading font-bold text-white">{activeCycle.durationWeeks} WEEKS</p>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col gap-8">
          <div className="grid grid-cols-12 gap-8 h-full overflow-hidden">
             {/* Left: Weeks List */}
             <div className="col-span-3 bg-zinc-900 border border-zinc-800 rounded-none overflow-y-auto p-0 flex flex-col">
                <div className="p-6 bg-black border-b border-zinc-800">
                   <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Macrocycle</h3>
                </div>
                <div className="p-4 space-y-1">
                  {activeCycle.weeks.map((week, index) => (
                    <div 
                      key={week.weekNumber} 
                      onClick={() => {
                          setCurrentViewWeekIndex(index);
                          setSelectedDay(null); // Reset day selection when switching weeks
                      }}
                      className={`p-4 cursor-pointer transition-all border-l-4 ${
                        currentViewWeekIndex === index 
                          ? 'bg-black border-[#ffed00] text-white' 
                          : 'bg-transparent border-transparent text-zinc-500 hover:text-white hover:bg-black/50'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xl font-heading font-bold uppercase tracking-wide">
                          Week {week.weekNumber}
                        </span>
                        {currentViewWeekIndex === index && (
                           <span className="text-xs font-bold text-[#ffed00]">{week.volume}% VOL</span>
                        )}
                      </div>
                      <p className="text-xs uppercase tracking-wide truncate opacity-80">{week.focus}</p>
                    </div>
                  ))}
                </div>
             </div>

             {/* Right: Daily Workout Generator */}
             <div className="col-span-9 bg-zinc-900 border border-zinc-800 rounded-none p-8 flex flex-col overflow-y-auto">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-3xl font-heading font-bold text-white uppercase tracking-tight">
                    Microcycle <span className="text-[#42c8f7]">Planning</span>
                  </h3>
                  <div className="text-right">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest block">Week Focus</span>
                    <span className="text-white font-bold uppercase tracking-wide">{activeWeek.focus}</span>
                  </div>
                </div>

                {/* Days Selector */}
                <div className="grid grid-cols-7 gap-px bg-zinc-800 border border-zinc-800 mb-10">
                  {[1, 2, 3, 4, 5, 6, 7].map(day => {
                    const hasGenerated = generatedWorkouts.some(w => w.weekNumber === activeWeek.weekNumber && w.dayOfWeek === day);
                    const isSelected = selectedDay?.day === day && selectedDay?.week === activeWeek.weekNumber;
                    
                    return (
                      <button 
                        key={day}
                        onClick={() => hasGenerated ? setSelectedDay({week: activeWeek.weekNumber, day}) : handleGenerateDay(activeWeek, day)}
                        disabled={isGeneratingWorkout}
                        className={`
                          py-6 flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden group
                          ${isSelected 
                            ? 'bg-[#ffed00] text-black' 
                            : 'bg-zinc-900 text-zinc-400 hover:bg-black hover:text-white'
                          }
                        `}
                      >
                        <span className="text-sm font-heading font-bold uppercase tracking-wider z-10">Day {day}</span>
                        {hasGenerated ? (
                          <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black' : 'bg-[#42c8f7]'}`}></div>
                        ) : (
                          <span className={`text-[10px] uppercase font-bold tracking-widest ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                             {isGeneratingWorkout && selectedDay === null ? '...' : 'Create'}
                          </span>
                        )}
                        {isSelected && (
                           <div className="absolute bottom-0 left-0 w-full h-1 bg-black/20"></div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Content Area */}
                <div className="flex-1">
                  {isGeneratingWorkout ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-6 animate-pulse">
                      <div className="w-20 h-20 border-8 border-zinc-800 border-t-[#ffed00] rounded-full animate-spin"></div>
                      <p className="font-heading font-bold text-xl uppercase tracking-widest text-white">Adapting Stimulus...</p>
                    </div>
                  ) : selectedDay ? (
                    <div className="space-y-8">
                       {/* Render Workouts for each studio side by side */}
                       <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                          {generatedWorkouts
                            .filter(w => w.weekNumber === selectedDay.week && w.dayOfWeek === selectedDay.day)
                            .map(workout => {
                              const studio = studios.find(s => s.id === workout.studioId);
                              const elementId = `workout-card-${workout.id}`;
                              return (
                                <div id={elementId} key={workout.id} className="bg-black border border-zinc-800 rounded-none p-8 relative overflow-hidden group hover:border-zinc-600 transition-colors">
                                  {/* Studio Tag & Export Button */}
                                  <div className="flex justify-between items-start mb-6 border-b border-zinc-800 pb-4">
                                     <div className="p-2 bg-zinc-900 text-xs text-white font-heading font-bold uppercase tracking-widest">
                                        {studio?.name}
                                     </div>
                                     <button 
                                      onClick={() => handleExportImage(elementId, `${studio?.name}_W${workout.weekNumber}_D${workout.dayOfWeek}`)}
                                      className="export-btn p-2 text-zinc-500 hover:text-[#ffed00] hover:bg-zinc-900 transition-all"
                                      title="Export as Image"
                                     >
                                       {ICONS.Download}
                                     </button>
                                  </div>
                                  
                                  <h4 className="text-2xl font-heading font-bold text-white mb-2 uppercase tracking-wide pr-20">{workout.title}</h4>
                                  <div className="text-xs text-[#ffed00] mb-8 uppercase tracking-[0.2em] font-bold">
                                    {workout.dayOfWeek === 1 ? 'Monday' : `Day ${workout.dayOfWeek}`} • Week {workout.weekNumber}
                                  </div>

                                  <div className="space-y-8">
                                    <div>
                                      <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Warmup</h5>
                                      <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-light">{workout.warmup}</p>
                                    </div>
                                    
                                    <div className="p-6 bg-zinc-900/50 border-l-4 border-[#ffed00]">
                                      <h5 className="text-sm font-heading font-bold text-[#ffed00] uppercase mb-4 tracking-wider">Workout of the Day</h5>
                                      <p className="text-base text-white whitespace-pre-wrap font-medium leading-relaxed font-sans">{workout.wod}</p>
                                    </div>

                                    <div>
                                      <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Capacity Management (15 Pax)</h5>
                                      <p className="text-xs text-[#42c8f7] font-medium uppercase tracking-wide bg-[#42c8f7]/10 p-4 border border-[#42c8f7]/20">
                                        {workout.coachNotes}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          }
                       </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-700">
                      <div className="mb-4 opacity-20">
                         {ICONS.Cycle}
                      </div>
                      <p className="font-heading font-bold text-2xl uppercase tracking-widest text-zinc-600">Select a Day</p>
                      <p className="text-sm font-light uppercase tracking-wide mt-2">To generate or view programming</p>
                    </div>
                  )}
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProfile = () => (
    <div className="max-w-3xl mx-auto">
      <header className="mb-10 border-b border-zinc-800 pb-8">
        <h2 className="text-5xl font-heading font-bold text-white uppercase tracking-tighter mb-2">Profile Settings</h2>
        <p className="text-zinc-400 font-light tracking-wide text-lg">Manage your account and box details.</p>
      </header>

      <form onSubmit={handleProfileUpdate} className="bg-zinc-900 border border-zinc-800 p-10 rounded-none shadow-2xl relative">
        <div className="space-y-8">
          
          {/* AI Settings Section */}
          <div className="bg-black p-6 border border-zinc-800 relative group hover:border-[#ffed00] transition-colors">
             <div className="absolute top-0 right-0 p-2 bg-zinc-900 text-[10px] uppercase font-bold text-zinc-500 tracking-widest">
               AI Configuration
             </div>
             <h3 className="text-lg font-heading font-bold text-white mb-6 uppercase tracking-wide">Intelligence Engine</h3>

             <div>
                <label className="block text-xs font-bold text-[#ffed00] mb-2 uppercase tracking-widest flex items-center gap-2">
                  Gemini API Key <span className="text-zinc-600 font-normal normal-case tracking-normal">(Required for AI features)</span>
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-none px-6 py-4 text-white focus:border-[#ffed00] focus:ring-0 outline-none font-mono text-sm"
                  />
                  {apiKey && <div className="text-green-500 text-xs font-bold uppercase tracking-wider">Active</div>}
                </div>
                <div className="mt-3 text-xs text-zinc-500">
                  <span className="uppercase font-bold tracking-wider mr-2">Don't have a key?</span>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-white hover:text-[#42c8f7] underline decoration-zinc-700 underline-offset-4 transition-colors">
                    Generate one here via Google AI Studio
                  </a>
                </div>
             </div>
          </div>

          <div className="h-px bg-zinc-800 w-full" />

          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-widest">Full Name</label>
              <input 
                type="text"
                value={userProfile.name}
                onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                className="w-full bg-black border border-zinc-700 rounded-none px-6 py-4 text-white focus:border-[#ffed00] focus:ring-0 outline-none font-heading text-lg font-bold uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-widest">Role</label>
              <input 
                type="text"
                value={userProfile.role}
                onChange={(e) => setUserProfile({...userProfile, role: e.target.value})}
                className="w-full bg-black border border-zinc-700 rounded-none px-6 py-4 text-white focus:border-[#ffed00] focus:ring-0 outline-none font-heading text-lg font-bold uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-widest">Email Address</label>
            <input 
              type="email"
              value={userProfile.email}
              onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
              className="w-full bg-black border border-zinc-700 rounded-none px-6 py-4 text-white focus:border-[#ffed00] focus:ring-0 outline-none font-heading text-lg font-bold uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-widest">Main Gym Name</label>
            <input 
              type="text"
              value={userProfile.gymName}
              onChange={(e) => setUserProfile({...userProfile, gymName: e.target.value})}
              className="w-full bg-black border border-zinc-700 rounded-none px-6 py-4 text-white focus:border-[#ffed00] focus:ring-0 outline-none font-heading text-lg font-bold uppercase"
            />
          </div>

          <div className="pt-6 border-t border-zinc-800">
            <Button type="submit" className="w-full py-5 text-lg">
              SAVE CHANGES
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-12 bg-red-900/10 border border-red-900/30 p-8 rounded-none">
        <h3 className="text-red-500 font-heading font-bold text-xl uppercase mb-4">Danger Zone</h3>
        <p className="text-zinc-500 mb-6 text-sm">Permanently delete your account and all associated cycle data. This action cannot be undone.</p>
        <Button variant="danger" className="w-auto">
          DELETE ACCOUNT
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Layout currentView={view} setView={setView} userProfile={userProfile}>
        {view === AppView.DASHBOARD && renderDashboard()}
        {view === AppView.STUDIOS && renderStudios()}
        {view === AppView.CREATE_CYCLE && renderCreateCycle()}
        {view === AppView.VIEW_CYCLE && renderViewCycle()}
        {view === AppView.PROFILE && renderProfile()}
      </Layout>

      {/* API Key Required Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-zinc-950 border-4 border-[#ffed00] max-w-2xl w-full shadow-[0_0_100px_rgba(255,237,0,0.3)] relative">
            {/* Decorative corner accents */}
            <div className="absolute -top-2 -left-2 w-6 h-6 border-l-4 border-t-4 border-[#ffed00]"></div>
            <div className="absolute -top-2 -right-2 w-6 h-6 border-r-4 border-t-4 border-[#ffed00]"></div>
            <div className="absolute -bottom-2 -left-2 w-6 h-6 border-l-4 border-b-4 border-[#ffed00]"></div>
            <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-4 border-b-4 border-[#ffed00]"></div>

            <div className="p-10">
              {/* Header */}
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-[#ffed00] flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-heading font-bold text-white uppercase tracking-tight leading-none">API Key Required</h2>
                  <p className="text-[#ffed00] text-sm font-bold uppercase tracking-wider mt-1">Intelligence Engine Setup</p>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-6 mb-8">
                <p className="text-zinc-300 leading-relaxed text-lg">
                  To use the AI-powered features of this application, you need an API key from your chosen provider.
                </p>

                <div className="bg-zinc-900 border border-zinc-800 p-6">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">What the API Key enables:</h3>
                  <ul className="space-y-3 text-zinc-300">
                    <li className="flex items-start gap-3">
                      <span className="text-[#ffed00] mt-1">→</span>
                      <span>Studio analysis via Vision AI (Equipment & Space)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-[#ffed00] mt-1">→</span>
                      <span>Automatic periodization for 4-16 week cycles</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-[#ffed00] mt-1">→</span>
                      <span>Adaptive workout generation for different studios</span>
                    </li>
                  </ul>
                </div>

                {/* API Key Input */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">
                    Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
                    placeholder="AIzaSy..."
                    className="w-full bg-black border-2 border-zinc-700 rounded-none px-6 py-4 text-white focus:border-[#ffed00] focus:ring-0 outline-none font-mono text-base transition-colors"
                    autoFocus
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-4">
                <Button
                  onClick={handleSaveApiKey}
                  disabled={!tempApiKey.trim()}
                  className="w-full py-5 text-lg"
                >
                  ACTIVATE & START
                </Button>

                <div className="flex items-center justify-center gap-4 text-sm">
                  <span className="text-zinc-500 uppercase tracking-wider font-bold">Don't have a key?</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#42c8f7] hover:text-white underline decoration-zinc-700 underline-offset-4 uppercase tracking-wider font-bold transition-colors"
                  >
                    Get one free
                  </a>
                </div>
              </div>

              {/* Info Footer */}
              <div className="mt-8 pt-6 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Your API key is stored locally in your browser only and never sent to external servers.
                  You can change it anytime in Profile Settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}