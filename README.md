# Second Brain OS 🧠

A personal operating system for managing projects, tasks, study, fitness, and weekly reflections. Built with React, Firebase, and Gemini AI.

## Features

- **Project Map**: Max 3 active projects, with status management (active/paused/parked/completed)
- **Action Funnel**: AI-powered action classification and organization
- **Task Management**: Full CRUD with priority, energy, and project linking
- **Timetable**: Weekly schedule with clash detection
- **Study Tracker**: Panda companion that responds to study goals
- **Weekly Review**: Reflection questions with AI-generated insights
- **Metrics Dashboard**: Study hours, task completion, streaks, and charts
- **Settings**: Study goals, fitness preferences, exam mode, energy tagging
- **Daily Email Briefing**: Automated summary at 12:00 AM
- **Running Recommendations**: AI-powered fitness scheduling

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Firebase Cloud Functions (Node.js)
- **Database**: Firestore
- **AI**: Google Gemini API
- **Auth**: Firebase Authentication (email/password)

## Setup

### 1. Clone & Install

```bash
cd Second-Brain
npm install
cd functions && npm install && cd ..
```

### 2. Firebase Configuration

Create `.env` file in root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Cloud Functions Config

```bash
firebase functions:config:set gemini.key="YOUR_GEMINI_API_KEY"
firebase functions:config:set email.user="your_email@gmail.com"
firebase functions:config:set email.pass="your_app_password"
```

### 4. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 5. Run Locally

```bash
npm run dev
```

### 6. Deploy

```bash
npm run build
firebase deploy
```

## Data Models

### Projects
```js
{
  title, one_line_objective, why_it_matters,
  status, energy_required, deadline, created_at, userId
}
```

### Tasks
```js
{
  title, description, linked_project, due_date,
  priority, energy_required, status, created_at, userId
}
```

### Study Sessions
```js
{ subject, duration, date, linked_timetable_slot, userId }
```

### Timetable Slots
```js
{ day_of_week, start_time, end_time, subject_or_activity, type, userId }
```

## AI Prompts

### Action Classification
```
Classify action: {urgency, suggestedProject, shouldArchive}
```

### Weekly Reflection
```
Generate reflection summary with suggestions based on answers
```

### Daily Email
```
Generate briefing with tasks, study goals, panda status
```

### Running Recommendations
```
Analyze schedule load and suggest best/avoid days for running
```

## Panda Mood Logic

- **Happy** 🐼✨: Daily goal met (≥100%)
- **Neutral** 🐼: Partial progress (50-99%)
- **Hungry** 🐼😢: Goal missed (<50%)

## Email Automation

Daily briefing sent at 12:00 AM IST containing:
- Today's scheduled tasks
- Overdue tasks
- High-priority items
- Study goal reminder
- Previous day's panda status

## License

MIT
