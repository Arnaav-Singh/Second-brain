import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { studySessionsService, studySettingsService } from '../services/firestore';
import { format, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { Play, Pause, RotateCcw, Clock, BarChart3, Settings, Save, BookOpen } from 'lucide-react';

export default function StudyTracker() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [settings, setSettings] = useState({ daily_goal: 120, weekly_goal: 600, preferred_subjects: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('timer');

    // Timer state
    const [isRunning, setIsRunning] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [subject, setSubject] = useState('');
    const [notes, setNotes] = useState('');
    const intervalRef = useRef(null);

    useEffect(() => {
        if (user) loadData();
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [user]);

    useEffect(() => {
        if (isRunning) {
            intervalRef.current = setInterval(() => {
                setElapsedSeconds((s) => s + 1);
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning]);

    const loadData = async () => {
        try {
            const today = new Date();
            const weekStart = startOfWeek(today, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

            const [sessionsData, settingsData] = await Promise.all([
                studySessionsService.getByDateRange(user.uid, weekStart, weekEnd),
                studySettingsService.get(user.uid),
            ]);

            setSessions(sessionsData);
            if (settingsData) setSettings(settingsData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStart = () => setIsRunning(true);
    const handlePause = () => setIsRunning(false);
    const handleReset = () => {
        setIsRunning(false);
        setElapsedSeconds(0);
    };

    const handleSaveSession = async () => {
        if (elapsedSeconds < 60) {
            alert('Session must be at least 1 minute');
            return;
        }
        if (!subject.trim()) {
            alert('Please enter a subject');
            return;
        }

        try {
            await studySessionsService.create(user.uid, {
                subject: subject.trim(),
                duration: Math.round(elapsedSeconds / 60),
                notes: notes.trim(),
                date: new Date(),
            });

            setIsRunning(false);
            setElapsedSeconds(0);
            setSubject('');
            setNotes('');
            loadData();
        } catch (error) {
            alert('Error saving session');
        }
    };

    const today = new Date();
    const todayMinutes = sessions
        .filter((s) => s.date && isSameDay(s.date.toDate(), today))
        .reduce((sum, s) => sum + (s.duration || 0), 0);
    const weekMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const dailyProgress = Math.min((todayMinutes / settings.daily_goal) * 100, 100);

    const getPandaState = () => {
        if (dailyProgress >= 100) return { mood: 'Ecstatic!', message: "Amazing work! You've hit your goal!" };
        if (dailyProgress >= 75) return { mood: 'Happy', message: 'Almost there, keep pushing!' };
        if (dailyProgress >= 50) return { mood: 'Content', message: 'Good progress! Keep it up!' };
        if (dailyProgress >= 25) return { mood: 'Hopeful', message: "Let's study together!" };
        return { mood: 'Waiting', message: 'Start studying to make me happy!' };
    };

    const panda = getPandaState();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div
                    className="w-10 h-10 border-3 rounded-full animate-spin"
                    style={{
                        borderColor: 'color-mix(in srgb, var(--theme-primary) 30%, transparent)',
                        borderTopColor: 'var(--theme-primary)'
                    }}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white">Study Tracker</h1>
                    <p className="mt-1 text-slate-400">Track your study sessions and stay focused</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="tab-container w-fit">
                <button
                    onClick={() => setActiveTab('timer')}
                    className={`tab-button ${activeTab === 'timer' ? 'active' : ''}`}
                >
                    <Play className="w-4 h-4" />
                    Study Timer
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
                >
                    <BarChart3 className="w-4 h-4" />
                    Study History
                </button>
            </div>

            {activeTab === 'timer' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Timer Card */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-white">Current Session</h2>
                                <p className="text-sm text-slate-400">Track your study time</p>
                            </div>
                            {isRunning && (
                                <div
                                    className="px-3 py-1 rounded-full text-sm font-medium animate-pulse"
                                    style={{
                                        background: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)',
                                        color: 'var(--theme-primary-light)'
                                    }}
                                >
                                    Recording...
                                </div>
                            )}
                        </div>

                        {/* Timer Display */}
                        <div
                            className={`p-8 rounded-xl text-center mb-6 ${isRunning ? 'animate-pulse-glow' : ''}`}
                            style={{
                                background: 'var(--theme-bg-main)',
                                border: '1px solid var(--theme-bg-card-hover)'
                            }}
                        >
                            <div className="timer-display">{formatTime(elapsedSeconds)}</div>
                            <p className="text-slate-400 mt-2 text-sm">Time elapsed</p>
                        </div>

                        {/* Timer Controls */}
                        <div className="flex justify-center gap-4">
                            {!isRunning ? (
                                <button
                                    onClick={handleStart}
                                    className="btn-primary flex items-center gap-2 px-6 py-3"
                                >
                                    <Play className="w-5 h-5" />
                                    Start
                                </button>
                            ) : (
                                <button
                                    onClick={handlePause}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 font-semibold rounded-xl shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-all"
                                    style={{ color: 'var(--theme-bg-main)' }}
                                >
                                    <Pause className="w-5 h-5" />
                                    Pause
                                </button>
                            )}
                            <button
                                onClick={handleReset}
                                className="btn-secondary flex items-center gap-2 px-6 py-3"
                            >
                                <RotateCcw className="w-5 h-5" />
                                Reset
                            </button>
                        </div>
                    </div>

                    {/* Session Details Card */}
                    <div className="card">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-white">Session Details</h2>
                            <p className="text-sm text-slate-400">Add notes and track progress</p>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Subject</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="What are you studying?"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
                                <textarea
                                    className="input"
                                    rows="4"
                                    placeholder="Add any notes about your study session..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={handleSaveSession}
                                disabled={elapsedSeconds < 60}
                                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                            >
                                <Save className="w-5 h-5" />
                                Save Session
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Panda Card */}
                    <div className="lg:col-span-1">
                        <div className="card text-center">
                            <img
                                src="/images/panda.png"
                                alt="Study Panda"
                                className="w-32 h-32 mx-auto mb-4 rounded-2xl object-cover"
                            />
                            <h3 className="text-xl font-bold text-white">{panda.mood}</h3>
                            <p className="text-slate-400 mt-1">{panda.message}</p>

                            <div
                                className="mt-6 p-4 rounded-xl"
                                style={{ background: 'var(--theme-bg-main)' }}
                            >
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-400">Daily Progress</span>
                                    <span
                                        className="font-medium"
                                        style={{ color: 'var(--theme-primary-light)' }}
                                    >
                                        {Math.round(dailyProgress)}%
                                    </span>
                                </div>
                                <div className="progress-bar h-2">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${dailyProgress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    {todayMinutes} / {settings.daily_goal} min today
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats & Sessions */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="card p-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="p-2 rounded-lg"
                                        style={{ background: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)' }}
                                    >
                                        <Clock className="w-5 h-5" style={{ color: 'var(--theme-primary-light)' }} />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-white">{todayMinutes}<span className="text-sm font-normal text-slate-400">m</span></p>
                                        <p className="text-sm text-slate-400">Today</p>
                                    </div>
                                </div>
                            </div>
                            <div className="card p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                                        <BarChart3 className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-white">{Math.round(weekMinutes / 60)}<span className="text-sm font-normal text-slate-400">h</span></p>
                                        <p className="text-sm text-slate-400">This week</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Sessions */}
                        <div className="card">
                            <h3 className="text-lg font-semibold text-white mb-4">Recent Sessions</h3>
                            {sessions.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No sessions logged yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {sessions.slice(0, 5).map((session) => (
                                        <div
                                            key={session.id}
                                            className="flex items-center gap-4 p-3 rounded-xl"
                                            style={{ background: 'var(--theme-bg-main)' }}
                                        >
                                            <div
                                                className="p-2 rounded-lg"
                                                style={{ background: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)' }}
                                            >
                                                <BookOpen className="w-4 h-4" style={{ color: 'var(--theme-primary-light)' }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-white">{session.subject || 'Study Session'}</p>
                                                <p className="text-sm text-slate-400">
                                                    {session.date && format(session.date.toDate(), 'MMM d, h:mm a')}
                                                </p>
                                            </div>
                                            <span
                                                className="px-3 py-1 text-sm font-medium rounded-full"
                                                style={{
                                                    background: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)',
                                                    color: 'var(--theme-primary-light)'
                                                }}
                                            >
                                                {session.duration} min
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Links */}
            <div className="flex justify-center gap-4">
                <a
                    href="https://open.spotify.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-[#1DB954]/20 text-[#1DB954] rounded-xl hover:bg-[#1DB954]/30 transition-colors"
                >
                    <span>🎵</span> Spotify
                </a>
                <a
                    href="https://www.youtube.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
                >
                    <span>▶️</span> YouTube
                </a>
            </div>
        </div>
    );
}
