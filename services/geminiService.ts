import { GoogleGenAI, Type } from "@google/genai";
import { Studio, Equipment, Cycle, Workout, CycleWeek } from "../types";

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

// --- 2. Macrocycle Generation (Planning) ---
export const generateMacrocycle = async (
  name: string,
  focus: string,
  durationWeeks: number,
  apiKey: string
): Promise<CycleWeek[]> => {
  if (!apiKey) throw new Error("API Key is missing");
  const ai = getAi(apiKey);

  // Switched to gemini-3-flash-preview for faster response times and stability
  const model = "gemini-3-flash-preview";

  const prompt = `
    Create a ${durationWeeks}-week periodization plan for a Functional Fitness cycle focused on "${focus}".
    The target audience is a general gym population (intermediate).
    Apply progressive overload principles.
    Return a JSON array of weeks.
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
            focus: { type: Type.STRING, description: "Main theme of the week (e.g. Accumulation, Deload)" },
            volume: { type: Type.NUMBER, description: "Estimated volume load 0-100" },
            intensity: { type: Type.NUMBER, description: "Estimated average intensity 0-100" }
          }
        }
      }
    }
  });

  if (response.text) {
    return JSON.parse(response.text);
  }
  throw new Error("Failed to generate macrocycle");
};

// --- 3. Workout Generation (Adaptation) ---
export const generateDailyWorkouts = async (
  cycle: Cycle,
  week: CycleWeek,
  day: number,
  studios: Studio[],
  apiKey: string
): Promise<Workout[]> => {
  if (!apiKey) throw new Error("API Key is missing");
  const ai = getAi(apiKey);

  // Switched to gemini-3-flash-preview for faster response times and stability
  const model = "gemini-3-flash-preview";

  const studiosContext = studios.map(s => `
    Studio ID: ${s.id}
    Name: ${s.name}
    Size: ${s.sizeSqM}sqm
    Equipment: ${s.equipment.map(e => `${e.quantity}x ${e.name}`).join(', ')}
  `).join('\n---\n');

  const prompt = `
    Design a single Functional Fitness workout for Week ${week.weekNumber} (Focus: ${week.focus}), Day ${day}.
    Cycle Goal: ${cycle.focus}.
    Class Size: Up to 15 people.
    
    CRITICAL: Create the *same intended stimulus* for the following studios, but adapt the exercises based on their specific equipment and space constraints.
    
    Studios Data:
    ${studiosContext}
    
    Return a JSON array of workouts (one per studio).
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
            title: { type: Type.STRING },
            warmup: { type: Type.STRING },
            skillStrength: { type: Type.STRING },
            wod: { type: Type.STRING },
            cooldown: { type: Type.STRING },
            scalingNotes: { type: Type.STRING },
            coachNotes: { type: Type.STRING, description: "Logistics for managing 15 people in this specific space." }
          }
        }
      }
    }
  });

  if (response.text) {
    const rawWorkouts = JSON.parse(response.text);
    // Hydrate with missing IDs if necessary and standard fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rawWorkouts.map((w: any) => ({
      ...w,
      id: Math.random().toString(36).substr(2, 9),
      cycleId: cycle.id,
      weekNumber: week.weekNumber,
      dayOfWeek: day
    }));
  }
  throw new Error("Failed to generate workouts");
};