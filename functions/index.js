const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || functions.config().gemini?.key);

// Email transporter (configure with your Gmail credentials)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || functions.config().email?.user,
        pass: process.env.EMAIL_PASS || functions.config().email?.pass, // Use App Password for Gmail
    },
});

/**
 * Callable function to generate content with Gemini API
 */
exports.generateWithGemini = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { prompt, context: promptContext } = data;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        const fullPrompt = promptContext
            ? `Context: ${JSON.stringify(promptContext)}\n\nTask: ${prompt}\n\nRespond with valid JSON only.`
            : `${prompt}\n\nRespond with valid JSON only.`;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        // Try to parse as JSON
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return { text };
        } catch {
            return { text };
        }
    } catch (error) {
        console.error('Gemini API error:', error);
        throw new functions.https.HttpsError('internal', 'Error calling Gemini API');
    }
});

/**
 * Daily briefing email - runs at 12:00 AM IST (6:30 PM UTC previous day)
 */
exports.sendDailyBriefing = functions.pubsub
    .schedule('30 18 * * *') // 6:30 PM UTC = 12:00 AM IST
    .timeZone('Asia/Kolkata')
    .onRun(async () => {
        console.log('Starting daily briefing...');

        try {
            // Get all users (single user system, but can handle multiple)
            const usersSnapshot = await db.collection('users').get();

            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                const userId = userDoc.id;
                const userEmail = userData.email;

                if (!userEmail) continue;

                // Get today's data
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);

                // Fetch tasks
                const tasksSnapshot = await db
                    .collection('tasks')
                    .where('userId', '==', userId)
                    .where('status', '==', 'pending')
                    .get();

                const tasks = tasksSnapshot.docs.map(doc => doc.data());
                const todayTasks = tasks.filter(t => {
                    if (!t.due_date) return false;
                    const dueDate = t.due_date.toDate();
                    return dueDate >= today && dueDate < tomorrow;
                });
                const overdueTasks = tasks.filter(t => {
                    if (!t.due_date) return false;
                    return t.due_date.toDate() < today;
                });
                const highPriorityTasks = tasks.filter(t => t.priority === 'high');

                // Get study settings
                const studySettingsDoc = await db.collection('study_settings').doc(userId).get();
                const studySettings = studySettingsDoc.data() || { daily_goal: 120 };

                // Get yesterday's study stats
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                const studySnapshot = await db
                    .collection('study_sessions')
                    .where('userId', '==', userId)
                    .where('date', '>=', admin.firestore.Timestamp.fromDate(yesterday))
                    .where('date', '<', admin.firestore.Timestamp.fromDate(today))
                    .get();

                const yesterdayStudy = studySnapshot.docs.reduce((sum, doc) => sum + (doc.data().duration || 0), 0);
                const goalMet = yesterdayStudy >= studySettings.daily_goal;
                const pandaStatus = goalMet ? '🐼 Happy' : yesterdayStudy >= studySettings.daily_goal / 2 ? '🐼 Neutral' : '🐼 Hungry';

                // Generate email content with Gemini
                let emailBody;
                try {
                    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
                    const prompt = `Generate a daily briefing email. Be encouraging but direct. Keep it concise.
          
Data:
- Today's tasks: ${todayTasks.map(t => t.title).join(', ') || 'None'}
- Overdue tasks: ${overdueTasks.length}
- High priority: ${highPriorityTasks.map(t => t.title).join(', ') || 'None'}
- Yesterday's study: ${yesterdayStudy} minutes (goal: ${studySettings.daily_goal})
- Panda status: ${pandaStatus}

Return JSON: {"subject": "string", "body": "string (HTML allowed)"}`;

                    const result = await model.generateContent(prompt);
                    const text = result.response.text();
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        emailBody = parsed;
                    }
                } catch (aiError) {
                    console.error('AI email generation failed:', aiError);
                }

                // Fallback email content
                if (!emailBody) {
                    emailBody = {
                        subject: `Your Plan for Today – Stay Sharp 🐼`,
                        body: `
              <h2>Good morning! Here's your daily briefing:</h2>
              
              <h3>📋 Today's Tasks (${todayTasks.length})</h3>
              <ul>${todayTasks.map(t => `<li>${t.title}</li>`).join('') || '<li>No tasks scheduled</li>'}</ul>
              
              ${overdueTasks.length > 0 ? `<h3>⚠️ Overdue Tasks (${overdueTasks.length})</h3>` : ''}
              
              <h3>🎯 High Priority</h3>
              <ul>${highPriorityTasks.map(t => `<li>${t.title}</li>`).join('') || '<li>None</li>'}</ul>
              
              <h3>📚 Study Goal</h3>
              <p>Today's goal: ${studySettings.daily_goal} minutes</p>
              <p>Yesterday: ${yesterdayStudy} minutes | ${pandaStatus}</p>
              
              <p><strong>Let's make today count! 💪</strong></p>
            `,
                    };
                }

                // Send email
                await transporter.sendMail({
                    from: process.env.EMAIL_USER || functions.config().email?.user,
                    to: userEmail,
                    subject: emailBody.subject,
                    html: emailBody.body,
                });

                // Log the email
                await db.collection('email_logs').add({
                    userId,
                    type: 'daily_briefing',
                    subject: emailBody.subject,
                    sent_at: admin.firestore.FieldValue.serverTimestamp(),
                });

                console.log(`Sent daily briefing to ${userEmail}`);
            }
        } catch (error) {
            console.error('Daily briefing error:', error);
        }
    });

/**
 * Weekly study report generation - runs every Sunday at 9 PM IST
 */
exports.generateWeeklyStudyReport = functions.pubsub
    .schedule('30 15 * * 0') // 3:30 PM UTC = 9 PM IST, Sunday
    .timeZone('Asia/Kolkata')
    .onRun(async () => {
        console.log('Generating weekly study reports...');

        try {
            const usersSnapshot = await db.collection('users').get();

            for (const userDoc of usersSnapshot.docs) {
                const userId = userDoc.id;

                // Get this week's study sessions
                const today = new Date();
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - 7);

                const studySnapshot = await db
                    .collection('study_sessions')
                    .where('userId', '==', userId)
                    .where('date', '>=', admin.firestore.Timestamp.fromDate(weekStart))
                    .get();

                const sessions = studySnapshot.docs.map(doc => doc.data());
                const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);

                // Subject breakdown
                const subjectBreakdown = {};
                sessions.forEach(s => {
                    const subject = s.subject || 'Other';
                    subjectBreakdown[subject] = (subjectBreakdown[subject] || 0) + s.duration;
                });

                // Get settings
                const settingsDoc = await db.collection('study_settings').doc(userId).get();
                const settings = settingsDoc.data() || { weekly_goal: 600 };
                const goalConsistency = totalMinutes >= settings.weekly_goal
                    ? 'met'
                    : totalMinutes >= settings.weekly_goal / 2
                        ? 'partial'
                        : 'missed';

                // Generate AI feedback
                let feedback = 'Keep up the good work!';
                try {
                    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
                    const prompt = `Generate supportive but honest study feedback.
Total: ${totalMinutes} min, Goal: ${settings.weekly_goal} min
Subjects: ${JSON.stringify(subjectBreakdown)}
Return 2-3 sentences only.`;

                    const result = await model.generateContent(prompt);
                    feedback = result.response.text();
                } catch (aiError) {
                    console.error('AI feedback failed:', aiError);
                }

                // Save report
                await db.collection('weekly_study_reports').add({
                    userId,
                    week_start: weekStart.toISOString().split('T')[0],
                    total_minutes: totalMinutes,
                    subject_breakdown: subjectBreakdown,
                    goal_consistency: goalConsistency,
                    feedback,
                    created_at: admin.firestore.FieldValue.serverTimestamp(),
                });

                console.log(`Generated weekly report for ${userId}`);
            }
        } catch (error) {
            console.error('Weekly report error:', error);
        }
    });

/**
 * Calculate Panda mood - helper function
 */
exports.calculatePandaMood = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
        // Get today's study
        const studySnapshot = await db
            .collection('study_sessions')
            .where('userId', '==', userId)
            .where('date', '>=', admin.firestore.Timestamp.fromDate(today))
            .where('date', '<', admin.firestore.Timestamp.fromDate(tomorrow))
            .get();

        const todayMinutes = studySnapshot.docs.reduce((sum, doc) => sum + (doc.data().duration || 0), 0);

        // Get goal
        const settingsDoc = await db.collection('study_settings').doc(userId).get();
        const settings = settingsDoc.data() || { daily_goal: 120 };
        const percentage = Math.round((todayMinutes / settings.daily_goal) * 100);

        let mood;
        if (percentage >= 100) {
            mood = 'happy';
        } else if (percentage >= 50) {
            mood = 'neutral';
        } else {
            mood = 'hungry';
        }

        return { mood, percentage, todayMinutes, dailyGoal: settings.daily_goal };
    } catch (error) {
        console.error('Panda mood error:', error);
        throw new functions.https.HttpsError('internal', 'Error calculating mood');
    }
});

/**
 * Running recommendation - callable function
 */
exports.getRunningRecommendations = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;

    try {
        // Get timetable
        const timetableSnapshot = await db
            .collection('timetable_slots')
            .where('userId', '==', userId)
            .get();

        const slots = timetableSnapshot.docs.map(doc => doc.data());

        // Get energy days for this week
        const today = new Date();
        const weekDays = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - today.getDay() + i + 1);
            weekDays.push(date.toISOString().split('T')[0]);
        }

        const energyDocs = await Promise.all(
            weekDays.map(date =>
                db.collection('energy_days')
                    .where('userId', '==', userId)
                    .where('date', '==', date)
                    .get()
            )
        );

        const energyDays = {};
        energyDocs.forEach((snap, i) => {
            if (!snap.empty) {
                energyDays[weekDays[i]] = snap.docs[0].data().type;
            }
        });

        // Get fitness settings
        const fitnessDoc = await db.collection('fitness_settings').doc(userId).get();
        const fitnessSettings = fitnessDoc.data() || { preferred_days: [], min_free_time: 30 };

        // Calculate load per day
        const dayLoad = Array(7).fill(0);
        slots.forEach(slot => {
            const duration = calculateDuration(slot.start_time, slot.end_time);
            if (slot.type === 'study' || slot.type === 'class') {
                dayLoad[slot.day_of_week] += duration;
            }
        });

        // Generate recommendations with Gemini
        let recommendations;
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
            const prompt = `Analyze this schedule and recommend running days.
Day loads (minutes): ${JSON.stringify(dayLoad)}
Energy tags: ${JSON.stringify(energyDays)}
Preferred days: ${JSON.stringify(fitnessSettings.preferred_days)}
Min free time needed: ${fitnessSettings.min_free_time} minutes

Return JSON: {"bestDays": ["Monday"], "avoidDays": ["Wednesday"], "reasoning": "string"}`;

            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                recommendations = JSON.parse(jsonMatch[0]);
            }
        } catch (aiError) {
            console.error('AI recommendations failed:', aiError);
        }

        // Fallback recommendations
        if (!recommendations) {
            const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const sortedDays = dayLoad.map((load, i) => ({ day: daysOfWeek[i], load, index: i }))
                .sort((a, b) => a.load - b.load);

            recommendations = {
                bestDays: sortedDays.slice(0, 3).map(d => d.day),
                avoidDays: sortedDays.slice(-2).map(d => d.day),
                reasoning: 'Based on your schedule load analysis.',
            };
        }

        return recommendations;
    } catch (error) {
        console.error('Running recommendations error:', error);
        throw new functions.https.HttpsError('internal', 'Error generating recommendations');
    }
});

function calculateDuration(startTime, endTime) {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
}
