import { GoogleGenAI, Type } from "@google/genai";
import { Studio, Equipment, Cycle, Workout, CycleWeek, SessionType } from "../types";
import { SCIENTIFIC_SOURCES, WEEKLY_THEMES } from "../constants";

// Helper to initialize AI with dynamic key
const getAi = (apiKey: string) => new GoogleGenAI({ apiKey });

// --- Helper to convert file to base64 ---
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// --- 1. Studio Analysis (Vision) ---
export const analyzeStudioPhoto = async (base64Image: string, apiKey: string): Promise<{ sizeEstimate: number, equipment: Equipment[] }> => {
  if (!apiKey) throw new Error("API Key is missing");
  const ai = getAi(apiKey);
  
  // Using gemini-3-flash-preview for vision tasks and JSON output
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze this fitness studio image. 
    1. Estimate the open floor area roughly in square meters (assume standard ceiling height).
    2. List visible functional fitness equipment (e.g., Rowers, Barbells, Rigs, Kettlebells).
    3. Return ONLY valid JSON.
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64Image } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sizeEstimate: { type: Type.NUMBER },
          equipment: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                category: { type: Type.STRING, enum: ['cardio', 'weight', 'gymnastic', 'other'] }
              }
            }
          }
        }
      }
    }
  });

  if (response.text) {
    return JSON.parse(response.text);
  }
  throw new Error("Failed to analyze image");
};

// --- 2. Macrocycle Generation (Planning) for HYROX ---
export const generateMacrocycle = async (
  name: string,
  focus: string,
  durationWeeks: number,
  apiKey: string
): Promise<CycleWeek[]> => {
  if (!apiKey) throw new Error("API Key is missing");
  const ai = getAi(apiKey);

  const model = "gemini-3-flash-preview";

  // Build scientific context
  const themesContext = Object.entries(WEEKLY_THEMES)
    .map(([key, theme]) => `- ${theme.name}: ${theme.description} (${theme.scientificBasis})`)
    .join('\n');

  const scientificContext = SCIENTIFIC_SOURCES.join('\n- ');

  const prompt = `
    Create a ${durationWeeks}-week HYROX-specific periodization plan.

    CRITICAL REQUIREMENTS:
    1. HYROX FOCUS: This is NOT CrossFit. Optimize for HYROX race demands:
       - 8km running (1km run + station repeated 8 times)
       - 8 functional stations: SkiErg, Sled Push, Sled Pull, Burpee Broad Jumps, Rowing, Farmers Carry, Sandbag Lunges, Wall Balls
       - Race duration: 60-90 minutes sustained effort

    2. EVIDENCE-BASED APPROACH: Base all training decisions on sports science research:
       ${scientificContext}

    3. WEEKLY THEMES: Each week must have ONE clear training theme (do NOT mix themes within a week):
       ${themesContext}

       Theme options: intervals, zone2, threshold, race_prep, recovery, max_strength, power_endurance, transitions

    4. PERIODIZATION PRINCIPLES:
       - Use polarized training model (80% low intensity, 20% high intensity overall)
       - Progressive overload in volume and intensity
       - Include deload weeks (Week ${Math.ceil(durationWeeks / 3)} and Week ${Math.max(durationWeeks - 2, 1)})
       - Final 2 weeks: taper phase with reduced volume, maintained intensity

    5. TARGET AUDIENCE: Intermediate HYROX athletes (6-12 months experience)

    Return a JSON array of ${durationWeeks} weeks with clear weekly themes.
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            weekNumber: { type: Type.INTEGER },
            focus: { type: Type.STRING, description: "Phase description (e.g. Base Building, Peak Week)" },
            theme: {
              type: Type.STRING,
              description: "Weekly training theme",
              enum: ['intervals', 'zone2', 'threshold', 'race_prep', 'recovery', 'max_strength', 'power_endurance', 'transitions']
            },
            volume: { type: Type.NUMBER, description: "Training volume 0-100" },
            intensity: { type: Type.NUMBER, description: "Average intensity 0-100" }
          },
          required: ['weekNumber', 'focus', 'theme', 'volume', 'intensity']
        }
      }
    }
  });

  if (response.text) {
    return JSON.parse(response.text);
  }
  throw new Error("Failed to generate macrocycle");
};

// --- 3. Weekly HYROX Workout Generation (3 Sessions per Week) ---
export const generateWeeklyWorkouts = async (
  cycle: Cycle,
  week: CycleWeek,
  sessionType: SessionType,
  studios: Studio[],
  apiKey: string
): Promise<Workout[]> => {
  if (!apiKey) throw new Error("API Key is missing");
  const ai = getAi(apiKey);

  const model = "gemini-3-flash-preview";

  // Filter equipment based on cycle constraints
  const studiosContext = studios.map(s => {
    const availableEquipment = cycle.availableEquipment
      ? s.equipment.filter(e => cycle.availableEquipment!.includes(e.name))
      : s.equipment;

    return `
    Studio ID: ${s.id}
    Name: ${s.name}
    Size: ${s.sizeSqM}sqm
    Available Equipment: ${availableEquipment.map(e => `${e.quantity}x ${e.name}`).join(', ')}
  `;
  }).join('\n---\n');

  const themeInfo = WEEKLY_THEMES[week.theme as keyof typeof WEEKLY_THEMES];
  const scientificContext = SCIENTIFIC_SOURCES.slice(0, 3).join('\n- ');

  // Session-specific guidance
  const sessionGuidance: Record<SessionType, string> = {
    endurance: `
      HYROX ENDURANCE SESSION:
      - Focus on aerobic capacity and running economy
      - Include SkiErg, Rowing, and sustained running intervals
      - Simulate race-pace efforts with transitions
      - Volume: 45-60 minutes total work
      - Intensity based on weekly theme: ${themeInfo?.name}
    `,
    strength: `
      HYROX STRENGTH SESSION:
      - Focus on functional strength for race stations
      - Prioritize: Sled Push/Pull, Farmers Carry, Sandbag Lunges, Wall Balls
      - Use compound movements: Squats, Deadlifts, Lunges, Carries
      - Can incorporate CrossFit-style strength work BUT optimized for HYROX
      - Volume: 40-50 minutes total work
      - Theme alignment: ${themeInfo?.name}
    `,
    class: `
      HYROX CLASS (Race Simulation):
      - Full or partial race simulation with all 8 stations
      - CRITICAL: Practice transitions between stations (minimize rest)
      - Pacing strategy practice at race intensity
      - Include: 1km run + station pattern (repeat 4-8 times depending on week)
      - Volume: 60-75 minutes total work
      - Theme: ${themeInfo?.name} - apply to pacing strategy
    `
  };

  const prompt = `
    Design a HYROX-SPECIFIC workout for Week ${week.weekNumber}.

    SESSION TYPE: ${sessionType.toUpperCase()}
    WEEKLY THEME: ${week.theme} - ${themeInfo?.name}
    Theme Description: ${themeInfo?.description}
    Scientific Basis: ${themeInfo?.scientificBasis}

    Phase: ${week.focus}
    Volume Load: ${week.volume}/100
    Intensity: ${week.intensity}/100

    ${sessionGuidance[sessionType]}

    EVIDENCE-BASED APPROACH:
    Base this workout on sports science principles from:
    - ${scientificContext}

    HYROX CORE EQUIPMENT (prioritize these):
    - SkiErg, Concept2 Rower, Sled (Push/Pull), Sandbag (10-20kg), Wall Balls, Farmers Carry implements

    CRITICAL REQUIREMENTS:
    1. This is HYROX training, NOT CrossFit - minimize barbell cycling, kipping movements
    2. Focus on sustained power output and aerobic endurance
    3. Practice transitions between movements (race-specific)
    4. Class size: 12-15 people maximum
    5. Include scientific references in workout design

    ADAPTATION: Create the SAME workout concept for all studios, but adapt exercises to their available equipment.

    Studios Data:
    ${studiosContext}

    Return a JSON array of workouts (one per studio) with scientific references.
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            studioId: { type: Type.STRING },
            title: { type: Type.STRING, description: "Workout title reflecting session type and theme" },
            warmup: { type: Type.STRING, description: "HYROX-specific warmup with dynamic movements" },
            skillStrength: { type: Type.STRING, description: "Skill work or strength block" },
            wod: { type: Type.STRING, description: "Main workout block - clearly formatted" },
            cooldown: { type: Type.STRING, description: "Cool down and mobility" },
            scalingNotes: { type: Type.STRING, description: "Scaling options for this studio's constraints" },
            coachNotes: { type: Type.STRING, description: "Logistics for 15 people + transition setup" },
            scientificReferences: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2-3 scientific sources supporting this workout design"
            }
          },
          required: ['studioId', 'title', 'warmup', 'skillStrength', 'wod', 'cooldown', 'scalingNotes', 'coachNotes', 'scientificReferences']
        }
      }
    }
  });

  if (response.text) {
    const rawWorkouts = JSON.parse(response.text);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rawWorkouts.map((w: any) => ({
      ...w,
      id: Math.random().toString(36).substr(2, 9),
      cycleId: cycle.id,
      weekNumber: week.weekNumber,
      sessionType: sessionType
    }));
  }
  throw new Error("Failed to generate workouts");
};

// --- Legacy function for backward compatibility (deprecated) ---
export const generateDailyWorkouts = async (
  cycle: Cycle,
  week: CycleWeek,
  day: number,
  studios: Studio[],
  apiKey: string
): Promise<Workout[]> => {
  // Map day number to session type for backward compatibility
  const sessionMap: Record<number, SessionType> = {
    1: 'endurance',
    2: 'strength',
    3: 'class',
    4: 'endurance',
    5: 'strength',
    6: 'class',
    7: 'endurance'
  };
  return generateWeeklyWorkouts(cycle, week, sessionMap[day] || 'endurance', studios, apiKey);
};