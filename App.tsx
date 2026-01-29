import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Button } from './components/Button';
import { ICONS, MOCK_STUDIOS_INITIAL, LOADING_MESSAGES, SESSION_CONFIGS, HYROX_EQUIPMENT, WEEKLY_THEMES } from './constants';
import { AppView, Studio, Cycle, Workout, CycleWeek, SessionType } from './types';
import { analyzeStudioPhoto, fileToGenerativePart, generateMacrocycle, generateWeeklyWorkouts } from './services/geminiService';
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

  // UI State for Viewing Workout (HYROX Weekly Model)
  const [selectedSession, setSelectedSession] = useState<{week: number, sessionType: SessionType} | null>(null);
  const [currentViewWeekIndex, setCurrentViewWeekIndex] = useState(0);
  const [isGeneratingWorkout, setIsGeneratingWorkout] = useState(false);

  // UI State for Equipment Constraints
  const [availableEquipment, setAvailableEquipment] = useState<string[]>([]);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);

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

  // HYROX Weekly Session Generator
  const handleGenerateSession = async (week: CycleWeek, sessionType: SessionType) => {
    if (!activeCycle) return;
    if (!apiKey) {
      alert("Please add your Gemini API Key in Profile Settings first.");
      setView(AppView.PROFILE);
      return;
    }

    setIsGeneratingWorkout(true);
    try {
      // Generate workouts for ALL studios at once for this session type
      const workouts = await generateWeeklyWorkouts(activeCycle, week, sessionType, studios, apiKey);

      // Filter out old workouts for this session/week if re-generating
      const otherWorkouts = generatedWorkouts.filter(w =>
        !(w.weekNumber === week.weekNumber && w.sessionType === sessionType)
      );

      setGeneratedWorkouts([...otherWorkouts, ...workouts]);
      setSelectedSession({ week: week.weekNumber, sessionType });
    } catch (error) {
      console.error(error);
      alert('Failed to generate session.');
    } finally {
      setIsGeneratingWorkout(false);
    }
  };

  // Handle Gym Deletion
  const handleDeleteStudio = (studioId: string) => {
    if (window.confirm('Are you sure you want to delete this gym? This action cannot be undone.')) {
      setStudios(studios.filter(s => s.id !== studioId));
      // Remove workouts for this studio
      setGeneratedWorkouts(generatedWorkouts.filter(w => w.studioId !== studioId));
    }
  };

  // Update Cycle Equipment Constraints
  const handleUpdateEquipmentConstraints = () => {
    if (activeCycle) {
      const updatedCycle = {
        ...activeCycle,
        availableEquipment: availableEquipment.length > 0 ? availableEquipment : undefined
      };
      setActiveCycle(updatedCycle);
      setShowEquipmentModal(false);
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

  // Export entire week as presentation-ready images
  const handleExportWeek = async (weekNumber: number) => {
    if (!activeCycle) return;

    const week = activeCycle.weeks.find(w => w.weekNumber === weekNumber);
    if (!week) return;

    try {
      // Export all 3 sessions for all studios
      for (const sessionConfig of SESSION_CONFIGS) {
        const sessionWorkouts = generatedWorkouts.filter(
          w => w.weekNumber === weekNumber && w.sessionType === sessionConfig.type
        );

        if (sessionWorkouts.length === 0) {
          alert(`Please generate ${sessionConfig.name} session first.`);
          continue;
        }

        for (const workout of sessionWorkouts) {
          const studio = studios.find(s => s.id === workout.studioId);
          const elementId = `workout-card-${workout.id}`;
          const filename = `Week${weekNumber}_${sessionConfig.type}_${studio?.name}`;

          await handleExportImage(elementId, filename);
          // Small delay between exports
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      alert(`Week ${weekNumber} exported successfully! Check your downloads folder.`);
    } catch (err) {
      console.error('Failed to export week', err);
      alert('Could not export complete week. Try again.');
    }
  };

  // Export presentation-ready HTML (can be opened in PowerPoint/Keynote)
  const handleExportPresentation = async (weekNumber: number) => {
    if (!activeCycle) return;

    const week = activeCycle.weeks.find(w => w.weekNumber === weekNumber);
    if (!week) return;

    const themeInfo = WEEKLY_THEMES[week.theme as keyof typeof WEEKLY_THEMES];

    // Build HTML presentation
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${activeCycle.name} - Week ${weekNumber}</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #000;
      color: #fff;
      margin: 0;
      padding: 40px;
    }
    .slide {
      page-break-after: always;
      min-height: 100vh;
      padding: 60px;
      background: #0a0a0a;
      border: 2px solid #ffed00;
      margin-bottom: 40px;
    }
    h1 {
      font-size: 48px;
      font-weight: bold;
      text-transform: uppercase;
      color: #ffed00;
      margin-bottom: 20px;
    }
    h2 {
      font-size: 32px;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 40px;
    }
    .theme {
      background: #1a1a1a;
      border-left: 4px solid #42c8f7;
      padding: 20px;
      margin: 20px 0;
      font-size: 14px;
    }
    .session {
      background: #1a1a1a;
      border: 1px solid #333;
      padding: 30px;
      margin: 20px 0;
    }
    .session-title {
      font-size: 24px;
      font-weight: bold;
      color: #ffed00;
      margin-bottom: 10px;
    }
    .studio-tag {
      display: inline-block;
      background: #333;
      padding: 5px 10px;
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 20px;
    }
    .section {
      margin: 20px 0;
    }
    .section-label {
      font-size: 11px;
      font-weight: bold;
      color: #999;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .wod {
      background: #18181880;
      border-left: 4px solid #ffed00;
      padding: 20px;
      white-space: pre-wrap;
      font-family: monospace;
      font-size: 14px;
      line-height: 1.6;
    }
    .references {
      background: #1a2a3a;
      border-left: 4px solid #4a90e2;
      padding: 15px;
      font-size: 11px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <!-- Title Slide -->
  <div class="slide">
    <h1>${activeCycle.name}</h1>
    <h2>Week ${weekNumber}: ${week.focus}</h2>
    <div class="theme">
      <strong>${themeInfo?.name || week.theme}</strong><br/>
      ${themeInfo?.description || ''}<br/>
      <em>Scientific Basis: ${themeInfo?.scientificBasis || 'Evidence-based programming'}</em>
    </div>
    <p style="font-size: 18px; margin-top: 40px;">
      Volume: ${week.volume}% • Intensity: ${week.intensity}%
    </p>
  </div>
`;

    // Add slides for each session type
    for (const sessionConfig of SESSION_CONFIGS) {
      const sessionWorkouts = generatedWorkouts.filter(
        w => w.weekNumber === weekNumber && w.sessionType === sessionConfig.type
      );

      if (sessionWorkouts.length === 0) continue;

      html += `
  <!-- ${sessionConfig.name} Slide -->
  <div class="slide">
    <h1>${sessionConfig.name}</h1>
    <p style="font-size: 16px; color: #999;">${sessionConfig.description}</p>
`;

      for (const workout of sessionWorkouts) {
        const studio = studios.find(s => s.id === workout.studioId);

        html += `
    <div class="session">
      <div class="studio-tag">${studio?.name || 'Studio'}</div>
      <div class="session-title">${workout.title}</div>

      <div class="section">
        <div class="section-label">Warmup</div>
        <div>${workout.warmup}</div>
      </div>

      ${workout.skillStrength ? `
      <div class="section">
        <div class="section-label">Skill / Strength</div>
        <div>${workout.skillStrength}</div>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-label">Main Workout</div>
        <div class="wod">${workout.wod}</div>
      </div>

      <div class="section">
        <div class="section-label">Cooldown</div>
        <div>${workout.cooldown}</div>
      </div>

      ${workout.scientificReferences && workout.scientificReferences.length > 0 ? `
      <div class="references">
        <strong>Scientific References:</strong><br/>
        ${workout.scientificReferences.map(ref => `• ${ref}`).join('<br/>')}
      </div>
      ` : ''}

      <div class="section" style="background: #0a2a3a; padding: 10px; margin-top: 20px;">
        <div class="section-label">Coach Notes</div>
        <div style="font-size: 11px; color: #42c8f7;">${workout.coachNotes}</div>
      </div>
    </div>
`;
      }

      html += `
  </div>
`;
    }

    html += `
  <!-- Footer -->
  <div style="text-align: center; margin-top: 60px; color: #666; font-size: 12px;">
    Generated by Functional Gym Planner • Evidence-Based HYROX Programming
  </div>
</body>
</html>
`;

    // Create and download HTML file
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeCycle.name.replace(/\s/g, '_')}_Week${weekNumber}_Presentation.html`;
    link.click();
    URL.revokeObjectURL(url);

    alert('Presentation exported! Open the HTML file in your browser, then print/save as PDF or import into PowerPoint/Keynote.');
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
          <div key={studio.id} className="bg-black border border-zinc-800 rounded-none overflow-hidden group hover:border-zinc-600 transition-all relative">
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
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-zinc-400 font-heading font-bold text-lg">
                    {ICONS.Users} <span className="text-white">{studio.maxCapacity}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteStudio(studio.id)}
                    className="p-2 text-zinc-500 hover:text-red-500 hover:bg-zinc-900 transition-all rounded-none border border-transparent hover:border-red-900"
                    title="Delete Studio"
                  >
                    {ICONS.Delete}
                  </button>
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
    const themeInfo = WEEKLY_THEMES[activeWeek.theme as keyof typeof WEEKLY_THEMES];

    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex justify-between items-end mb-8 border-b border-zinc-800 pb-6">
          <div>
            <span className="text-[#ffed00] text-sm font-bold tracking-[0.2em] uppercase mb-2 block">HYROX TRAINING</span>
            <h2 className="text-5xl font-heading font-bold text-white uppercase tracking-tighter leading-none">{activeCycle.name}</h2>
          </div>
          <div className="text-right flex gap-4 items-end">
             <div>
               <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Duration</p>
               <p className="text-3xl font-heading font-bold text-white">{activeCycle.durationWeeks} WEEKS</p>
             </div>
             <button
               onClick={() => setShowEquipmentModal(true)}
               className="px-4 py-2 border border-zinc-700 hover:border-[#ffed00] text-zinc-400 hover:text-white transition-all text-xs uppercase font-bold tracking-wider whitespace-nowrap"
             >
               Equipment
             </button>
             <button
               onClick={() => handleExportWeek(activeWeek.weekNumber)}
               className="px-4 py-2 border border-zinc-700 hover:border-[#42c8f7] text-zinc-400 hover:text-white transition-all text-xs uppercase font-bold tracking-wider whitespace-nowrap flex items-center gap-2"
               title="Export all sessions as images"
             >
               {ICONS.Download} Week
             </button>
             <button
               onClick={() => handleExportPresentation(activeWeek.weekNumber)}
               className="px-4 py-2 bg-[#ffed00] text-black hover:bg-white transition-all text-xs uppercase font-bold tracking-wider whitespace-nowrap"
               title="Export as presentation"
             >
               Presentation
             </button>
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
                  {activeCycle.weeks.map((week, index) => {
                    const weekTheme = WEEKLY_THEMES[week.theme as keyof typeof WEEKLY_THEMES];
                    return (
                      <div
                        key={week.weekNumber}
                        onClick={() => {
                            setCurrentViewWeekIndex(index);
                            setSelectedSession(null);
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
                        {weekTheme && (
                          <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-wider">
                            Theme: {weekTheme.name}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
             </div>

             {/* Right: HYROX Weekly Session Generator */}
             <div className="col-span-9 bg-zinc-900 border border-zinc-800 rounded-none p-8 flex flex-col overflow-y-auto">
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-3xl font-heading font-bold text-white uppercase tracking-tight">
                      Week {activeWeek.weekNumber} <span className="text-[#42c8f7]">Sessions</span>
                    </h3>
                    <div className="text-right">
                      <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest block">Week Theme</span>
                      <span className="text-white font-bold uppercase tracking-wide">{themeInfo?.name || activeWeek.focus}</span>
                    </div>
                  </div>
                  {themeInfo && (
                    <div className="bg-zinc-950 border-l-4 border-[#42c8f7] p-4">
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        <span className="font-bold text-[#42c8f7]">{themeInfo.description}</span>
                        {' • '}
                        <span className="text-zinc-500">Evidence: {themeInfo.scientificBasis}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* HYROX Session Selector (3 Sessions per Week) */}
                <div className="grid grid-cols-3 gap-4 mb-10">
                  {SESSION_CONFIGS.map(session => {
                    const hasGenerated = generatedWorkouts.some(
                      w => w.weekNumber === activeWeek.weekNumber && w.sessionType === session.type
                    );
                    const isSelected = selectedSession?.sessionType === session.type && selectedSession?.week === activeWeek.weekNumber;

                    return (
                      <button
                        key={session.type}
                        onClick={() =>
                          hasGenerated
                            ? setSelectedSession({week: activeWeek.weekNumber, sessionType: session.type as SessionType})
                            : handleGenerateSession(activeWeek, session.type as SessionType)
                        }
                        disabled={isGeneratingWorkout}
                        className={`
                          p-6 flex flex-col items-start justify-between gap-3 transition-all relative overflow-hidden group border-2
                          ${isSelected
                            ? 'bg-[#ffed00] text-black border-[#ffed00]'
                            : hasGenerated
                            ? 'bg-zinc-950 text-white border-zinc-700 hover:border-[#ffed00]'
                            : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-white hover:border-zinc-600'
                          }
                        `}
                      >
                        <div className="w-full">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-10 h-10 flex items-center justify-center rounded-none ${isSelected ? 'bg-black/10' : session.color}`}>
                              {session.type === 'endurance' && ICONS.Endurance}
                              {session.type === 'strength' && ICONS.Strength}
                              {session.type === 'class' && ICONS.Class}
                            </div>
                            <span className="text-xl font-heading font-bold uppercase tracking-wide">
                              {session.name.replace('HYROX ', '')}
                            </span>
                          </div>
                          <p className={`text-[10px] uppercase tracking-wider font-bold ${isSelected ? 'text-black/70' : 'text-zinc-500'}`}>
                            {session.description}
                          </p>
                        </div>
                        <div className="w-full flex justify-between items-center">
                          {hasGenerated ? (
                            <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-black' : 'bg-[#42c8f7]'}`}></div>
                          ) : (
                            <span className={`text-[10px] uppercase font-bold tracking-widest ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                               {isGeneratingWorkout && selectedSession === null ? '...' : 'Generate'}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Content Area */}
                <div className="flex-1">
                  {isGeneratingWorkout ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-6 animate-pulse">
                      <div className="w-20 h-20 border-8 border-zinc-800 border-t-[#ffed00] rounded-full animate-spin"></div>
                      <p className="font-heading font-bold text-xl uppercase tracking-widest text-white">
                        Generating HYROX Session...
                      </p>
                    </div>
                  ) : selectedSession ? (
                    <div className="space-y-8">
                       {/* Render Workouts for each studio */}
                       <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                          {generatedWorkouts
                            .filter(w => w.weekNumber === selectedSession.week && w.sessionType === selectedSession.sessionType)
                            .map(workout => {
                              const studio = studios.find(s => s.id === workout.studioId);
                              const sessionConfig = SESSION_CONFIGS.find(s => s.type === workout.sessionType);
                              const elementId = `workout-card-${workout.id}`;

                              return (
                                <div id={elementId} key={workout.id} className="bg-black border border-zinc-800 rounded-none p-8 relative overflow-hidden group hover:border-zinc-600 transition-colors">
                                  {/* Studio Tag & Actions */}
                                  <div className="flex justify-between items-start mb-6 border-b border-zinc-800 pb-4">
                                     <div className="flex items-center gap-2">
                                       <div className="p-2 bg-zinc-900 text-xs text-white font-heading font-bold uppercase tracking-widest">
                                          {studio?.name}
                                       </div>
                                       <div className={`p-2 ${sessionConfig?.color} text-xs text-black font-heading font-bold uppercase tracking-widest`}>
                                          {sessionConfig?.name.replace('HYROX ', '')}
                                       </div>
                                     </div>
                                     <div className="flex gap-2">
                                       <button
                                        onClick={() => setEditingWorkout(workout)}
                                        className="export-btn p-2 text-zinc-500 hover:text-[#42c8f7] hover:bg-zinc-900 transition-all"
                                        title="Edit Workout"
                                       >
                                         {ICONS.Edit}
                                       </button>
                                       <button
                                        onClick={() => handleExportImage(elementId, `${studio?.name}_W${workout.weekNumber}_${workout.sessionType}`)}
                                        className="export-btn p-2 text-zinc-500 hover:text-[#ffed00] hover:bg-zinc-900 transition-all"
                                        title="Export as Image"
                                       >
                                         {ICONS.Download}
                                       </button>
                                     </div>
                                  </div>

                                  <h4 className="text-2xl font-heading font-bold text-white mb-2 uppercase tracking-wide pr-20">{workout.title}</h4>
                                  <div className="text-xs text-[#ffed00] mb-8 uppercase tracking-[0.2em] font-bold">
                                    Week {workout.weekNumber} • {themeInfo?.name}
                                  </div>

                                  <div className="space-y-8">
                                    <div>
                                      <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Warmup</h5>
                                      <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-light">{workout.warmup}</p>
                                    </div>

                                    {workout.skillStrength && (
                                      <div>
                                        <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Skill / Strength</h5>
                                        <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-light">{workout.skillStrength}</p>
                                      </div>
                                    )}

                                    <div className="p-6 bg-zinc-900/50 border-l-4 border-[#ffed00]">
                                      <h5 className="text-sm font-heading font-bold text-[#ffed00] uppercase mb-4 tracking-wider">Main Workout</h5>
                                      <p className="text-base text-white whitespace-pre-wrap font-medium leading-relaxed font-sans">{workout.wod}</p>
                                    </div>

                                    <div>
                                      <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Cooldown</h5>
                                      <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-light">{workout.cooldown}</p>
                                    </div>

                                    {workout.scientificReferences && workout.scientificReferences.length > 0 && (
                                      <div className="bg-blue-950/20 border-l-4 border-blue-500 p-4">
                                        <h5 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Scientific Evidence</h5>
                                        <ul className="space-y-1">
                                          {workout.scientificReferences.map((ref, idx) => (
                                            <li key={idx} className="text-[10px] text-zinc-400 leading-relaxed">• {ref}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

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
                      <p className="font-heading font-bold text-2xl uppercase tracking-widest text-zinc-600">Select a Session</p>
                      <p className="text-sm font-light uppercase tracking-wide mt-2">To generate or view HYROX programming</p>
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

      {/* Equipment Constraints Modal */}
      {showEquipmentModal && activeCycle && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-zinc-950 border-2 border-[#ffed00] max-w-4xl w-full shadow-[0_0_100px_rgba(255,237,0,0.3)] max-h-[80vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-heading font-bold text-white uppercase tracking-tight">Equipment Constraints</h2>
                  <p className="text-zinc-400 text-sm mt-2">Select available equipment for this cycle. Workouts will only use selected equipment.</p>
                </div>
                <button onClick={() => setShowEquipmentModal(false)} className="text-zinc-500 hover:text-white">
                  {ICONS.Close}
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-zinc-900 border border-zinc-800 p-6">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">HYROX Core Equipment</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {HYROX_EQUIPMENT.map(equipment => {
                      const isSelected = availableEquipment.includes(equipment);
                      return (
                        <button
                          key={equipment}
                          onClick={() => {
                            if (isSelected) {
                              setAvailableEquipment(availableEquipment.filter(e => e !== equipment));
                            } else {
                              setAvailableEquipment([...availableEquipment, equipment]);
                            }
                          }}
                          className={`p-3 text-xs font-bold uppercase tracking-wider transition-all border ${
                            isSelected
                              ? 'bg-[#ffed00] text-black border-[#ffed00]'
                              : 'bg-zinc-950 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                          }`}
                        >
                          {equipment}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-6">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">All Studio Equipment</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Array.from(new Set(studios.flatMap(s => s.equipment.map(e => e.name)))).map(equipment => {
                      const isSelected = availableEquipment.includes(equipment);
                      return (
                        <button
                          key={equipment}
                          onClick={() => {
                            if (isSelected) {
                              setAvailableEquipment(availableEquipment.filter(e => e !== equipment));
                            } else {
                              setAvailableEquipment([...availableEquipment, equipment]);
                            }
                          }}
                          className={`p-2 text-[10px] font-bold uppercase tracking-wider transition-all border ${
                            isSelected
                              ? 'bg-[#42c8f7] text-black border-[#42c8f7]'
                              : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:border-zinc-600'
                          }`}
                        >
                          {equipment}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button onClick={handleUpdateEquipmentConstraints} className="flex-1">
                    Apply Constraints
                  </Button>
                  <Button
                    onClick={() => setAvailableEquipment([])}
                    variant="secondary"
                    className="flex-1"
                  >
                    Reset (Allow All)
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workout Edit Modal */}
      {editingWorkout && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-zinc-950 border-2 border-[#42c8f7] max-w-4xl w-full shadow-[0_0_100px_rgba(66,200,247,0.3)] max-h-[80vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-heading font-bold text-white uppercase tracking-tight">Edit Workout</h2>
                  <p className="text-zinc-400 text-sm mt-2">{editingWorkout.title}</p>
                </div>
                <button onClick={() => setEditingWorkout(null)} className="text-zinc-500 hover:text-white">
                  {ICONS.Close}
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-widest">Title</label>
                  <input
                    type="text"
                    value={editingWorkout.title}
                    onChange={(e) => setEditingWorkout({...editingWorkout, title: e.target.value})}
                    className="w-full bg-black border border-zinc-700 rounded-none px-4 py-3 text-white focus:border-[#42c8f7] focus:ring-0 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-widest">Warmup</label>
                  <textarea
                    value={editingWorkout.warmup}
                    onChange={(e) => setEditingWorkout({...editingWorkout, warmup: e.target.value})}
                    rows={3}
                    className="w-full bg-black border border-zinc-700 rounded-none px-4 py-3 text-white focus:border-[#42c8f7] focus:ring-0 outline-none font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-widest">Main Workout (WOD)</label>
                  <textarea
                    value={editingWorkout.wod}
                    onChange={(e) => setEditingWorkout({...editingWorkout, wod: e.target.value})}
                    rows={8}
                    className="w-full bg-black border border-zinc-700 rounded-none px-4 py-3 text-white focus:border-[#42c8f7] focus:ring-0 outline-none font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-widest">Cooldown</label>
                  <textarea
                    value={editingWorkout.cooldown}
                    onChange={(e) => setEditingWorkout({...editingWorkout, cooldown: e.target.value})}
                    rows={3}
                    className="w-full bg-black border border-zinc-700 rounded-none px-4 py-3 text-white focus:border-[#42c8f7] focus:ring-0 outline-none font-mono text-sm"
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => {
                      // Update the workout in state
                      setGeneratedWorkouts(generatedWorkouts.map(w => w.id === editingWorkout.id ? editingWorkout : w));
                      setEditingWorkout(null);
                    }}
                    className="flex-1"
                  >
                    Save Changes
                  </Button>
                  <Button
                    onClick={() => setEditingWorkout(null)}
                    variant="secondary"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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