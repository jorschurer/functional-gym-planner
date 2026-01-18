---
title: Functional Gym Planner
emoji: 💪
colorFrom: blue
colorTo: purple
sdk: static
pinned: false
---

# Functional Gym Planner

AI-powered periodization and workout planning tool for functional fitness gyms.

Try this app on my huggingface space: https://huggingface.co/spaces/jorschurer/functional-gym-planner 

## Features

- **Studio Analysis**: Upload gym photos to automatically detect equipment and space
- **Macrocycle Generation**: Create 4-16 week periodization plans using AI
- **Adaptive Workouts**: Generate studio-specific workouts based on available equipment
- **Demo Mode**: Test the AI analysis with a demo gym layout

## Setup

1. Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Enter your API key when prompted on first launch
3. Upload a floorplann photo of your gym or use the demo button
4. Create training cycles and generate workouts

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies: `npm install`
2. Run the app: `npm run dev`
3. Open http://localhost:3000

## Technology

- React 19 + TypeScript
- Google Gemini AI (Vision + Text Generation)
- Vite
- Recharts for visualization

Built with ❤️ for functional fitness coaches.
