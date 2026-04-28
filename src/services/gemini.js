import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API - Direct frontend call (no Cloud Functions needed)
const API_KEY = 'AIzaSyDF0lCUiPW0n-ZfI4eQDR1gIn_MXb5iG_8';
const genAI = new GoogleGenerativeAI(API_KEY);

// Get the Gemini 1.5 Flash model for fast responses
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Rate Limiting Constants
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15;
const STORAGE_KEY = 'gemini_request_log';

/**
 * Check if we are within the rate limit.
 * Uses localStorage to persist request timestamps across reloads.
 * Returns true if allowed, false if limited.
 */
function checkRateLimit() {
  try {
    const now = Date.now();
    const rawLog = localStorage.getItem(STORAGE_KEY);
    let requestLog = rawLog ? JSON.parse(rawLog) : [];

    // Filter out requests older than the window
    requestLog = requestLog.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);

    if (requestLog.length >= MAX_REQUESTS_PER_WINDOW) {
      console.warn(`[Gemini] Rate limit exceeded: ${requestLog.length} requests in last minute.`);
      return false;
    }

    // Add current request and save
    requestLog.push(now);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requestLog));
    return true;
  } catch (error) {
    console.error('[Gemini] Rate limiter error:', error);
    // Fail open if storage fails
    return true;
  }
}

/**
 * Classify an action for urgency and project suggestion
 */
export async function classifyAction(actionText) {
  if (!checkRateLimit()) {
    return { urgency: 'medium', suggestedProject: null, shouldArchive: false, isRateLimited: true };
  }

  const prompt = `Classify this action and return ONLY valid JSON (no markdown): {"urgency": "low|medium|high", "suggestedProject": null, "shouldArchive": false}. Action: ${actionText}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { urgency: 'medium', suggestedProject: null, shouldArchive: false };
  } catch (error) {
    console.error('Gemini API error:', error);
    return { urgency: 'medium', suggestedProject: null, shouldArchive: false };
  }
}

/**
 * Generate the next critical action for a project
 */
export async function suggestNextAction(project, tasks = []) {
  if (!checkRateLimit()) {
    return 'Rate limit reached - try again later';
  }

  const prompt = `You are a productivity assistant. Based on the following project and its tasks, suggest ONE specific, actionable next step that would move this project forward.

Project: ${project.title}
Objective: ${project.one_line_objective || 'Not specified'}
Status: ${project.status || 'active'}
Energy Required: ${project.energy_required || 'medium'}

Related Tasks:
${tasks.map(t => `- ${t.title} (${t.status}, priority: ${t.priority})`).join('\n') || 'No tasks yet'}

Respond with just the action in 10-15 words. Be specific and actionable. Don't use bullet points or numbering.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Gemini API error:', error);
    return 'Review project status and create a specific next task';
  }
}

/**
 * Suggest best days for running based on schedule
 */
export async function generateRunningRecommendations(scheduleData) {
  if (!checkRateLimit()) {
    return { bestDays: [], avoidDays: [], reasoning: 'AI limit reached, please try later' };
  }

  const { timetable = [], tasks = [], energyData = {} } = scheduleData;

  const prompt = `You are a fitness advisor. Suggest the best 2-3 days for running/exercise and 1-2 days to avoid.

Weekly Schedule:
${timetable.map(d => `${d.day}: ${d.events?.length || 0} events`).join('\n') || 'No schedule data'}

Pending Tasks: ${tasks.length} tasks
Energy Patterns: ${JSON.stringify(energyData)}

Respond ONLY with valid JSON (no markdown):
{"bestDays": ["Monday", "Thursday"], "avoidDays": ["Wednesday"], "reasoning": "brief reason"}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { bestDays: ['Saturday', 'Sunday'], avoidDays: [], reasoning: 'Weekend is typically best' };
  } catch (error) {
    console.error('Gemini API error:', error);
    return { bestDays: ['Saturday', 'Sunday'], avoidDays: [], reasoning: 'Unable to analyze schedule' };
  }
}

/**
 * Detect procrastination patterns
 */
export async function detectProcrastination(tasks, studySessions) {
  if (!checkRateLimit()) {
    return { avoidedSubjects: [], postponedPatterns: 'AI rate limit reached.', advice: 'Check back later.', severity: 'low' };
  }

  const postponedTasks = tasks.filter(t => (t.postpone_count || 0) > 0);
  const subjects = [...new Set(studySessions.map(s => s.subject).filter(Boolean))];

  const prompt = `You are a supportive productivity coach. Analyze these patterns and provide honest but encouraging feedback.

Tasks postponed multiple times:
${postponedTasks.slice(0, 5).map(t => `- ${t.title} (postponed ${t.postpone_count}x)`).join('\n') || 'None detected'}

Study subjects this week: ${subjects.join(', ') || 'No study sessions'}

Respond ONLY with valid JSON (no markdown):
{"avoidedSubjects": [], "postponedPatterns": "observation", "advice": "1-2 sentences of supportive advice", "severity": "low"}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { avoidedSubjects: [], postponedPatterns: 'No patterns detected', advice: 'Keep up the good work!', severity: 'low' };
  } catch (error) {
    console.error('Gemini API error:', error);
    return { avoidedSubjects: [], postponedPatterns: 'Unable to analyze', advice: 'Keep tracking your progress!', severity: 'low' };
  }
}

/**
 * Generate weekly study report
 */
export async function generateWeeklyStudyReport(studyData) {
  if (!checkRateLimit()) {
    return { totalMinutes: 0, subjectBreakdown: {}, goalConsistency: 'partial', feedback: 'AI limit reached, report unavailable.' };
  }

  const prompt = `Generate a weekly study report. Be supportive but honest.

Study Data: ${JSON.stringify(studyData)}

Respond ONLY with valid JSON (no markdown):
{"totalMinutes": 0, "subjectBreakdown": {}, "goalConsistency": "met", "feedback": "Great job this week!"}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { totalMinutes: 0, subjectBreakdown: {}, goalConsistency: 'partial', feedback: 'Keep tracking!' };
  } catch (error) {
    console.error('Gemini API error:', error);
    return { totalMinutes: 0, subjectBreakdown: {}, goalConsistency: 'partial', feedback: 'Unable to generate report' };
  }
}

/**
 * Generate weekly reflection summary
 */
export async function generateWeeklyReflection(reflectionData) {
  if (!checkRateLimit()) {
    return { summary: 'AI rate limit reached.', suggestions: ['Try again later'] };
  }

  const prompt = `Generate weekly reflection summary. Be direct and actionable.

Data: ${JSON.stringify(reflectionData)}

Respond ONLY with valid JSON (no markdown):
{"summary": "Brief week summary", "suggestions": ["suggestion 1", "suggestion 2"]}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { summary: 'Week completed', suggestions: ['Keep tracking progress'] };
  } catch (error) {
    console.error('Gemini API error:', error);
    return { summary: 'Unable to generate reflection', suggestions: [] };
  }
}

/**
 * Generate monthly life review
 */
export async function generateMonthlyReview(monthData) {
  if (!checkRateLimit()) {
    return {
      whatWorked: [],
      whatDidnt: [],
      nextMonthFocus: [],
      overallGrade: 'N/A',
      oneLineSummary: 'AI limit reached. Please try later.'
    };
  }

  const prompt = `You are a strategic life coach. Generate a one-page monthly review. Be direct and actionable.

Month: ${monthData.month}
Projects completed: ${monthData.projectsCompleted || 0}
Tasks completed: ${monthData.tasksCompleted || 0}
Study hours: ${monthData.studyHours || 0}
Goals met: ${monthData.goalsMet || 0}%

Respond ONLY with valid JSON (no markdown):
{
  "whatWorked": ["point 1", "point 2"],
  "whatDidnt": ["point 1"],
  "nextMonthFocus": ["priority 1", "priority 2"],
  "overallGrade": "B",
  "oneLineSummary": "Brief month summary"
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return {
      whatWorked: ['Data not available'],
      whatDidnt: [],
      nextMonthFocus: ['Track more data'],
      overallGrade: 'N/A',
      oneLineSummary: 'Keep building habits!'
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      whatWorked: ['Unable to generate review'],
      whatDidnt: [],
      nextMonthFocus: ['Try again next month'],
      overallGrade: 'N/A',
      oneLineSummary: 'Review generation failed'
    };
  }
}
