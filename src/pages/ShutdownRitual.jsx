import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import {
    tasksService,
    studySessionsService,
    projectsService,
} from '../services/firestore';
import { format, isSameDay, addDays } from 'date-fns';
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Circle,
    Moon,
    Sun,
    Sparkles,
    Calendar,
} from 'lucide-react';
import { db } from '../config/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export default function ShutdownRitual() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Data
    const [todayTasks, setTodayTasks] = useState([]);
    const [studyMinutes, setStudyMinutes] = useState(0);
    const [projects, setProjects] = useState([]);

    // User inputs
    const [completedTaskIds, setCompletedTaskIds] = useState([]);
    const [rolloverTaskIds, setRolloverTaskIds] = useState([]);
    const [tomorrowPriority, setTomorrowPriority] = useState('');
    const [gratitude, setGratitude] = useState('');

    useEffect(() => {
        if (user) loadData();
    }, [user]);

    const loadData = async () => {
        try {
            const today = new Date();
            const [tasks, sessions, projectsData] = await Promise.all([
                tasksService.getPending(user.uid),
                studySessionsService.getByDateRange(user.uid, today, today),
                projectsService.getActive(user.uid),
            ]);

            // Get today's tasks (due today or overdue)
            const todayFiltered = tasks.filter(task => {
                if (!task.due_date) return true; // No due date = include
                const dueDate = task.due_date.toDate();
                return isSameDay(dueDate, today) || dueDate < today;
            });
            setTodayTasks(todayFiltered.slice(0, 10));

            // Calculate study minutes
            const minutes = sessions
                .filter(s => s.date && isSameDay(s.date.toDate(), today))
                .reduce((sum, s) => sum + (s.duration || 0), 0);
            setStudyMinutes(minutes);

            setProjects(projectsData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCompleted = (taskId) => {
        setCompletedTaskIds(prev =>
            prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
        );
    };

    const toggleRollover = (taskId) => {
        setRolloverTaskIds(prev =>
            prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
        );
    };

    const getPandaMood = () => {
        const completionRate = todayTasks.length > 0
            ? (completedTaskIds.length / todayTasks.length) * 100
            : 0;
        const studyGoalMet = studyMinutes >= 60;

        if (completionRate >= 80 && studyGoalMet) return { emoji: '🐼', mood: 'Ecstatic', message: 'Amazing day! Rest well.' };
        if (completionRate >= 60 || studyGoalMet) return { emoji: '😊', mood: 'Happy', message: 'Good progress today!' };
        if (completionRate >= 30) return { emoji: '🙂', mood: 'Content', message: 'Some progress is progress.' };
        return { emoji: '😴', mood: 'Tired', message: 'Tomorrow is a new day.' };
    };

    const handleComplete = async () => {
        setSaving(true);
        try {
            // Mark completed tasks
            for (const taskId of completedTaskIds) {
                await tasksService.update(taskId, { status: 'completed', completed_at: new Date() });
            }

            // Rollover tasks to tomorrow
            const tomorrow = addDays(new Date(), 1);
            for (const taskId of rolloverTaskIds) {
                await tasksService.update(taskId, { due_date: Timestamp.fromDate(tomorrow) });
            }

            // Save daily summary
            await addDoc(collection(db, 'daily_summaries'), {
                userId: user.uid,
                date: new Date().toISOString().split('T')[0],
                tasksCompleted: completedTaskIds.length,
                tasksTotal: todayTasks.length,
                studyMinutes,
                tomorrowPriority,
                gratitude,
                pandaMood: getPandaMood().mood,
                created_at: Timestamp.now(),
            });

            navigate('/');
        } catch (error) {
            console.error('Error completing ritual:', error);
            alert('Error saving. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const panda = getPandaMood();
    const tomorrow = format(addDays(new Date(), 1), 'EEEE, MMMM d');

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
            <Link
                to="/"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
            </Link>

            {/* Header */}
            <div className="text-center mb-8">
                <Moon className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--theme-primary-light)' }} />
                <h1 className="text-3xl font-bold text-white">End of Day Shutdown</h1>
                <p className="text-slate-400 mt-2">Take 5 minutes to close your day mindfully</p>
            </div>

            {/* Progress Steps */}
            <div className="max-w-2xl mx-auto mb-8">
                <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4].map(s => (
                        <div
                            key={s}
                            className={`w-3 h-3 rounded-full transition-all ${step >= s ? '' : 'opacity-30'}`}
                            style={{ background: step >= s ? 'var(--theme-primary)' : 'var(--theme-bg-card-hover)' }}
                        />
                    ))}
                </div>
                <p className="text-center text-sm text-slate-500 mt-2">Step {step} of 4</p>
            </div>

            {/* Step Content */}
            <div className="max-w-2xl mx-auto">
                {/* Step 1: What was completed */}
                {step === 1 && (
                    <div className="card">
                        <h2 className="text-xl font-semibold text-white mb-2">What did you complete today?</h2>
                        <p className="text-slate-400 mb-6">Mark the tasks you finished</p>

                        {todayTasks.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No tasks were scheduled for today</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {todayTasks.map(task => (
                                    <div
                                        key={task.id}
                                        className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all"
                                        style={{
                                            background: completedTaskIds.includes(task.id)
                                                ? 'color-mix(in srgb, var(--theme-primary) 15%, transparent)'
                                                : 'var(--theme-bg-main)',
                                        }}
                                        onClick={() => toggleCompleted(task.id)}
                                    >
                                        {completedTaskIds.includes(task.id) ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                        ) : (
                                            <Circle className="w-5 h-5 text-slate-500 flex-shrink-0" />
                                        )}
                                        <span className={completedTaskIds.includes(task.id) ? 'text-white' : 'text-slate-300'}>
                                            {task.title}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end mt-6">
                            <button
                                onClick={() => setStep(2)}
                                className="btn-primary flex items-center gap-2"
                            >
                                Next
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: What rolls over */}
                {step === 2 && (
                    <div className="card">
                        <h2 className="text-xl font-semibold text-white mb-2">What moves to tomorrow?</h2>
                        <p className="text-slate-400 mb-6">Select incomplete tasks to reschedule</p>

                        {todayTasks.filter(t => !completedTaskIds.includes(t.id)).length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>All tasks completed! Nothing to roll over.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {todayTasks
                                    .filter(t => !completedTaskIds.includes(t.id))
                                    .map(task => (
                                        <div
                                            key={task.id}
                                            className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all"
                                            style={{
                                                background: rolloverTaskIds.includes(task.id)
                                                    ? 'color-mix(in srgb, var(--theme-primary) 15%, transparent)'
                                                    : 'var(--theme-bg-main)',
                                            }}
                                            onClick={() => toggleRollover(task.id)}
                                        >
                                            {rolloverTaskIds.includes(task.id) ? (
                                                <Calendar className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--theme-primary-light)' }} />
                                            ) : (
                                                <Circle className="w-5 h-5 text-slate-500 flex-shrink-0" />
                                            )}
                                            <span className={rolloverTaskIds.includes(task.id) ? 'text-white' : 'text-slate-300'}>
                                                {task.title}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        )}

                        <div className="flex justify-between mt-6">
                            <button onClick={() => setStep(1)} className="btn-secondary">
                                Back
                            </button>
                            <button onClick={() => setStep(3)} className="btn-primary flex items-center gap-2">
                                Next
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Tomorrow preview */}
                {step === 3 && (
                    <div className="card">
                        <h2 className="text-xl font-semibold text-white mb-2">Set Tomorrow's Priority</h2>
                        <p className="text-slate-400 mb-6">{tomorrow}</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Number 1 priority for tomorrow
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="What's the ONE thing you must do?"
                                    value={tomorrowPriority}
                                    onChange={(e) => setTomorrowPriority(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    One thing you're grateful for today
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Something good that happened..."
                                    value={gratitude}
                                    onChange={(e) => setGratitude(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex justify-between mt-6">
                            <button onClick={() => setStep(2)} className="btn-secondary">
                                Back
                            </button>
                            <button onClick={() => setStep(4)} className="btn-primary flex items-center gap-2">
                                Next
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Panda Summary */}
                {step === 4 && (
                    <div className="card text-center">
                        <div className="text-6xl mb-4">{panda.emoji}</div>
                        <h2 className="text-2xl font-bold text-white">{panda.mood}</h2>
                        <p className="text-slate-400 mt-2 mb-6">{panda.message}</p>

                        <div
                            className="p-4 rounded-xl mb-6"
                            style={{ background: 'var(--theme-bg-main)' }}
                        >
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <p className="text-2xl font-bold text-white">{completedTaskIds.length}</p>
                                    <p className="text-sm text-slate-400">Tasks done</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{studyMinutes}m</p>
                                    <p className="text-sm text-slate-400">Study time</p>
                                </div>
                            </div>
                        </div>

                        {tomorrowPriority && (
                            <div
                                className="p-4 rounded-xl mb-6 text-left"
                                style={{
                                    background: 'color-mix(in srgb, var(--theme-primary) 10%, transparent)',
                                    borderLeft: '3px solid var(--theme-primary)'
                                }}
                            >
                                <p className="text-sm text-slate-400 mb-1">Tomorrow's Priority</p>
                                <p className="text-white font-medium">{tomorrowPriority}</p>
                            </div>
                        )}

                        <div className="flex justify-between mt-6">
                            <button onClick={() => setStep(3)} className="btn-secondary">
                                Back
                            </button>
                            <button
                                onClick={handleComplete}
                                disabled={saving}
                                className="btn-primary flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Sun className="w-4 h-4" />
                                        Complete Shutdown
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
