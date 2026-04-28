import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import {
    projectsService,
    tasksService,
    studySessionsService,
    studySettingsService,
    energyDaysService,
    timetableService,
} from '../services/firestore';
import { suggestNextAction, generateRunningRecommendations } from '../services/gemini';
import { format, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import {
    Target,
    CheckCircle2,
    Circle,
    BookOpen,
    Zap,
    ArrowLeft,
    Sparkles,
    RefreshCw,
    Calendar,
    Activity,
} from 'lucide-react';

export default function DailyFocus() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [todayTasks, setTodayTasks] = useState([]);
    const [studyProgress, setStudyProgress] = useState({ today: 0, goal: 120 });
    const [energyLevel, setEnergyLevel] = useState(null);
    const [nextActions, setNextActions] = useState({});
    const [runningAdvice, setRunningAdvice] = useState(null);
    const [loadingAI, setLoadingAI] = useState(false);

    useEffect(() => {
        if (user) loadData();
    }, [user]);

    const loadData = async () => {
        try {
            const today = new Date();
            const weekStart = startOfWeek(today, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

            const [projectsData, allTasks, studySessions, settings, energy, timetable] = await Promise.all([
                projectsService.getActive(user.uid),
                tasksService.getPending(user.uid),
                studySessionsService.getByDateRange(user.uid, weekStart, weekEnd),
                studySettingsService.get(user.uid),
                energyDaysService.getByDate(user.uid, today),
                timetableService.getAll(user.uid),
            ]);

            setProjects(projectsData);

            // Filter tasks for today (due today or overdue)
            const todayFiltered = allTasks.filter(task => {
                if (!task.due_date) return false;
                const dueDate = task.due_date.toDate();
                return isSameDay(dueDate, today) || dueDate < today;
            });
            setTodayTasks(todayFiltered.slice(0, 10));

            // Calculate study progress
            const todayMinutes = studySessions
                .filter(s => s.date && isSameDay(s.date.toDate(), today))
                .reduce((sum, s) => sum + (s.duration || 0), 0);
            setStudyProgress({
                today: todayMinutes,
                goal: settings?.daily_goal || 120,
            });

            setEnergyLevel(energy?.type || null);

            // Generate AI suggestions in background
            generateAISuggestions(projectsData, allTasks, timetable, energy);
        } catch (error) {
            console.error('Error loading daily focus:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateAISuggestions = async (projectsData, tasks, timetable, energy) => {
        setLoadingAI(true);
        try {
            // Generate next actions for each project
            const actions = {};
            for (const project of projectsData.slice(0, 3)) {
                const projectTasks = tasks.filter(t => t.project_id === project.id);
                actions[project.id] = await suggestNextAction(project, projectTasks);
            }
            setNextActions(actions);

            // Generate running recommendations
            const runningData = await generateRunningRecommendations({
                timetable,
                tasks,
                energyData: energy || {},
            });
            setRunningAdvice(runningData);
        } catch (error) {
            console.error('Error generating AI suggestions:', error);
        } finally {
            setLoadingAI(false);
        }
    };

    const toggleTaskComplete = async (taskId, currentStatus) => {
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
        await tasksService.update(taskId, { status: newStatus });
        setTodayTasks(prev =>
            prev.map(t => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
    };

    const getPandaStatus = () => {
        const progress = (studyProgress.today / studyProgress.goal) * 100;
        if (progress >= 100) return { mood: '🐼', message: 'Amazing! Goal achieved!' };
        if (progress >= 75) return { mood: '😊', message: 'Almost there, keep going!' };
        if (progress >= 50) return { mood: '🙂', message: 'Good progress today!' };
        if (progress >= 25) return { mood: '😐', message: 'Getting started...' };
        return { mood: '😴', message: "Let's study together!" };
    };

    const panda = getPandaStatus();
    const studyProgressPercent = Math.min((studyProgress.today / studyProgress.goal) * 100, 100);
    const dayName = format(new Date(), 'EEEE');

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--theme-bg-main)' }}>
                <div
                    className="w-12 h-12 border-4 rounded-full animate-spin"
                    style={{
                        borderColor: 'color-mix(in srgb, var(--theme-primary) 30%, transparent)',
                        borderTopColor: 'var(--theme-primary)',
                    }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 lg:p-8" style={{ background: 'var(--theme-bg-main)' }}>
            {/* Back link */}
            <Link
                to="/"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
            </Link>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-white">Daily Focus</h1>
                    <p className="text-slate-400 mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
                </div>

                {/* Panda + Study Progress */}
                <div
                    className="flex items-center gap-4 px-6 py-4 rounded-2xl"
                    style={{
                        background: 'var(--theme-bg-card)',
                        border: '1px solid var(--theme-bg-card-hover)',
                    }}
                >
                    <div className="text-4xl">{panda.mood}</div>
                    <div>
                        <p className="font-semibold text-white">{panda.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="progress-bar w-24 h-2">
                                <div className="progress-fill" style={{ width: `${studyProgressPercent}%` }} />
                            </div>
                            <span className="text-sm text-slate-400">
                                {studyProgress.today}/{studyProgress.goal}m
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Tasks */}
                <div className="lg:col-span-2">
                    <div className="card">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--theme-primary-light)' }} />
                                Today's Tasks
                            </h2>
                            <span className="text-sm text-slate-400">{todayTasks.length} tasks</span>
                        </div>

                        {todayTasks.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No tasks due today. Great job!</p>
                                <Link
                                    to="/tasks"
                                    className="mt-3 inline-block text-sm font-medium hover:opacity-80"
                                    style={{ color: 'var(--theme-primary-light)' }}
                                >
                                    Add a task →
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {todayTasks.map(task => (
                                    <div
                                        key={task.id}
                                        className="flex items-center gap-4 p-4 rounded-xl transition-all cursor-pointer"
                                        style={{
                                            background: 'var(--theme-bg-main)',
                                            opacity: task.status === 'completed' ? 0.6 : 1,
                                        }}
                                        onClick={() => toggleTaskComplete(task.id, task.status)}
                                    >
                                        {task.status === 'completed' ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                        ) : (
                                            <Circle className="w-5 h-5 text-slate-500 flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p
                                                className={`font-medium ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-white'}`}
                                            >
                                                {task.title}
                                            </p>
                                            {task.project_id && (
                                                <p className="text-xs text-slate-500">
                                                    Linked to project
                                                </p>
                                            )}
                                        </div>
                                        <span
                                            className={`px-2 py-1 text-xs font-medium rounded-full ${task.priority === 'high'
                                                    ? 'bg-red-500/20 text-red-400'
                                                    : task.priority === 'medium'
                                                        ? 'bg-yellow-500/20 text-yellow-400'
                                                        : 'bg-slate-500/20 text-slate-400'
                                                }`}
                                        >
                                            {task.priority}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Energy Level */}
                    {energyLevel && (
                        <div className="card">
                            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                                <Zap className="w-4 h-4" style={{ color: 'var(--theme-primary-light)' }} />
                                Today's Energy
                            </h3>
                            <div
                                className="px-3 py-2 rounded-lg text-sm font-medium"
                                style={{
                                    background: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)',
                                    color: 'var(--theme-primary-light)',
                                }}
                            >
                                {energyLevel === 'deep_work' && '🧠 Deep Work Mode'}
                                {energyLevel === 'low_energy' && '😴 Low Energy Day'}
                                {energyLevel === 'admin' && '📋 Admin Day'}
                                {energyLevel === 'social' && '👥 Social Day'}
                            </div>
                        </div>
                    )}

                    {/* Running Suggestion */}
                    {runningAdvice && (
                        <div className="card">
                            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-emerald-400" />
                                Fitness Today
                            </h3>
                            {runningAdvice.bestDays?.includes(dayName) ? (
                                <div className="text-emerald-400 text-sm">
                                    🏃 Great day to run!
                                </div>
                            ) : runningAdvice.avoidDays?.includes(dayName) ? (
                                <div className="text-yellow-400 text-sm">
                                    ⚠️ Consider resting today
                                </div>
                            ) : (
                                <div className="text-slate-400 text-sm">
                                    Moderate day for exercise
                                </div>
                            )}
                            <p className="text-xs text-slate-500 mt-2">{runningAdvice.reasoning}</p>
                        </div>
                    )}

                    {/* Study Quick Action */}
                    <Link
                        to="/study"
                        className="card block text-center hover:opacity-90 transition-opacity"
                        style={{
                            background: 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-bg-card))',
                            borderColor: 'var(--theme-primary)',
                        }}
                    >
                        <BookOpen className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-primary-light)' }} />
                        <p className="font-semibold text-white">Start Studying</p>
                        <p className="text-xs text-slate-400 mt-1">
                            {studyProgress.goal - studyProgress.today}m left today
                        </p>
                    </Link>
                </div>
            </div>

            {/* Next Critical Actions */}
            {projects.length > 0 && (
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5" style={{ color: 'var(--theme-primary-light)' }} />
                            Next Critical Actions
                        </h2>
                        {loadingAI && (
                            <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.map(project => (
                            <div
                                key={project.id}
                                className="card"
                                style={{
                                    borderLeft: '3px solid var(--theme-primary)',
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    <Target className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--theme-primary-light)' }} />
                                    <div>
                                        <h3 className="font-medium text-white">{project.title}</h3>
                                        <p className="text-sm text-slate-400 mt-2">
                                            {nextActions[project.id] || 'Generating suggestion...'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
