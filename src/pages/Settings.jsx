import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme, THEMES } from '../hooks/useTheme';
import {
    studySettingsService,
    fitnessSettingsService,
    energyDaysService,
    onboardingService,
} from '../services/firestore';
import { format } from 'date-fns';
import { Save, BookOpen, Activity, AlertTriangle, Battery, Check, Palette, HelpCircle } from 'lucide-react';
import HowToUseGuide from '../components/HowToUseGuide';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const ENERGY_TYPES = [
    { value: 'deep_work', label: 'Deep Work', icon: '🧠', color: 'bg-cyan-500/20 border-cyan-500 text-cyan-400' },
    { value: 'low_energy', label: 'Low Energy', icon: '😴', color: 'bg-slate-500/20 border-slate-500 text-slate-400' },
    { value: 'admin', label: 'Admin Day', icon: '📋', color: 'bg-blue-500/20 border-blue-500 text-blue-400' },
    { value: 'social', label: 'Social', icon: '👥', color: 'bg-emerald-500/20 border-emerald-500 text-emerald-400' },
];

export default function Settings() {
    const { user } = useAuth();
    const { theme: currentTheme, changeTheme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('study');
    const [todayEnergy, setTodayEnergy] = useState(null);
    const [examMode, setExamMode] = useState(false);

    const [studySettings, setStudySettings] = useState({
        daily_goal: 120,
        weekly_goal: 600,
        preferred_subjects: '',
    });

    const [fitnessSettings, setFitnessSettings] = useState({
        preferred_workout: 'running',
        preferred_days: [],
        min_free_time: 30,
    });

    useEffect(() => {
        if (user) loadSettings();
    }, [user]);

    const loadSettings = async () => {
        try {
            const [study, fitness, energy] = await Promise.all([
                studySettingsService.get(user.uid),
                fitnessSettingsService.get(user.uid),
                energyDaysService.getByDate(user.uid, new Date()),
            ]);

            if (study) {
                setStudySettings({
                    daily_goal: study.daily_goal || 120,
                    weekly_goal: study.weekly_goal || 600,
                    preferred_subjects: (study.preferred_subjects || []).join(', '),
                });
                setExamMode(study.exam_mode || false);
            }

            if (fitness) {
                setFitnessSettings({
                    preferred_workout: fitness.preferred_workout || 'running',
                    preferred_days: fitness.preferred_days || [],
                    min_free_time: fitness.min_free_time || 30,
                });
            }

            if (energy) {
                setTodayEnergy(energy.type);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveStudy = async () => {
        setSaving(true);
        try {
            await studySettingsService.createOrUpdate(user.uid, {
                daily_goal: parseInt(studySettings.daily_goal),
                weekly_goal: parseInt(studySettings.weekly_goal),
                preferred_subjects: studySettings.preferred_subjects
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean),
                exam_mode: examMode,
            });
            alert('Study settings saved!');
        } catch (error) {
            alert('Error saving settings');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveFitness = async () => {
        setSaving(true);
        try {
            await fitnessSettingsService.createOrUpdate(user.uid, fitnessSettings);
            alert('Fitness settings saved!');
        } catch (error) {
            alert('Error saving settings');
        } finally {
            setSaving(false);
        }
    };

    const toggleExamMode = () => {
        setExamMode(!examMode);
    };

    const handleThemeChange = async (themeId) => {
        await changeTheme(themeId);
    };

    const setEnergyForToday = async (type) => {
        try {
            await energyDaysService.createOrUpdate(user.uid, new Date(), { type });
            setTodayEnergy(type);
        } catch (error) {
            alert('Error setting energy type');
        }
    };

    const togglePreferredDay = (day) => {
        const days = [...fitnessSettings.preferred_days];
        const index = days.indexOf(day);
        if (index > -1) {
            days.splice(index, 1);
        } else {
            days.push(day);
        }
        setFitnessSettings({ ...fitnessSettings, preferred_days: days });
    };

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
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white">Settings</h1>
                <p className="mt-1 text-slate-400">Configure your preferences and goals</p>
            </div>

            {/* Exam Mode Banner */}
            {examMode && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
                    <div>
                        <h3 className="font-semibold text-red-400">Exam Mode Active</h3>
                        <p className="text-sm text-red-300/70">
                            Academic content is prioritized. Non-critical projects are suppressed.
                        </p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="tab-container w-fit">
                {[
                    { id: 'study', label: 'Study', icon: BookOpen },
                    { id: 'fitness', label: 'Fitness', icon: Activity },
                    { id: 'energy', label: 'Energy', icon: Battery },
                    { id: 'theme', label: 'Theme', icon: Palette },
                    { id: 'guide', label: 'How to Use', icon: HelpCircle },
                ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Study Settings */}
            {activeTab === 'study' && (
                <div className="card max-w-2xl">
                    <h2 className="text-xl font-semibold text-white mb-6">Study Settings</h2>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Daily Study Goal (minutes)
                            </label>
                            <input
                                type="number"
                                min="15"
                                className="input max-w-xs"
                                value={studySettings.daily_goal}
                                onChange={(e) => setStudySettings({ ...studySettings, daily_goal: e.target.value })}
                            />
                            <p className="text-sm text-slate-500 mt-1">
                                {Math.round(studySettings.daily_goal / 60 * 10) / 10} hours per day
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Weekly Study Goal (minutes)
                            </label>
                            <input
                                type="number"
                                min="60"
                                className="input max-w-xs"
                                value={studySettings.weekly_goal}
                                onChange={(e) => setStudySettings({ ...studySettings, weekly_goal: e.target.value })}
                            />
                            <p className="text-sm text-slate-500 mt-1">
                                {Math.round(studySettings.weekly_goal / 60)} hours per week
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Preferred Subjects
                            </label>
                            <input
                                type="text"
                                className="input"
                                value={studySettings.preferred_subjects}
                                onChange={(e) => setStudySettings({ ...studySettings, preferred_subjects: e.target.value })}
                                placeholder="Math, Physics, Chemistry (comma-separated)"
                            />
                        </div>
                        <button onClick={handleSaveStudy} disabled={saving} className="btn-primary">
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? 'Saving...' : 'Save Study Settings'}
                        </button>

                        {/* Exam Mode Toggle */}
                        <div
                            className="pt-6"
                            style={{ borderTop: '1px solid var(--theme-bg-card-hover)' }}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-white">Exam / Semester Mode</h3>
                                    <p className="text-sm text-slate-400">
                                        Prioritize academic content and suppress non-critical projects
                                    </p>
                                </div>
                                <button
                                    onClick={toggleExamMode}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${examMode ? 'bg-red-500' : 'bg-slate-600'
                                        }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${examMode ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Fitness Settings */}
            {activeTab === 'fitness' && (
                <div className="card max-w-2xl">
                    <h2 className="text-xl font-semibold text-white mb-6">Fitness Settings</h2>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Preferred Workout</label>
                            <select
                                className="input max-w-xs"
                                value={fitnessSettings.preferred_workout}
                                onChange={(e) => setFitnessSettings({ ...fitnessSettings, preferred_workout: e.target.value })}
                            >
                                <option value="running">🏃 Running</option>
                                <option value="gym">🏋️ Gym</option>
                                <option value="yoga">🧘 Yoga</option>
                                <option value="cycling">🚴 Cycling</option>
                                <option value="swimming">🏊 Swimming</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-3">Preferred Days</label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS_OF_WEEK.map((day, index) => (
                                    <button
                                        key={day}
                                        onClick={() => togglePreferredDay(index)}
                                        className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                                        style={fitnessSettings.preferred_days.includes(index) ? {
                                            backgroundColor: 'var(--theme-primary)',
                                            color: 'var(--theme-bg-main)'
                                        } : {
                                            backgroundColor: 'var(--theme-bg-main)',
                                            color: '#94a3b8',
                                            border: '1px solid var(--theme-bg-card-hover)'
                                        }}
                                    >
                                        {day.slice(0, 3)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Minimum Free Time Required (minutes)
                            </label>
                            <input
                                type="number"
                                min="15"
                                className="input max-w-xs"
                                value={fitnessSettings.min_free_time}
                                onChange={(e) => setFitnessSettings({ ...fitnessSettings, min_free_time: parseInt(e.target.value) })}
                            />
                        </div>
                        <button onClick={handleSaveFitness} disabled={saving} className="btn-primary">
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? 'Saving...' : 'Save Fitness Settings'}
                        </button>
                    </div>
                </div>
            )}

            {/* Energy Day Tagging */}
            {activeTab === 'energy' && (
                <div className="card max-w-2xl">
                    <h2 className="text-xl font-semibold text-white mb-2">Today's Energy Level</h2>
                    <p className="text-slate-400 mb-6">
                        Tag today ({format(new Date(), 'EEEE, MMM d')}) to get better task and study recommendations.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        {ENERGY_TYPES.map((type) => (
                            <button
                                key={type.value}
                                onClick={() => setEnergyForToday(type.value)}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${todayEnergy === type.value
                                    ? type.color
                                    : 'hover:opacity-80'
                                    }`}
                                style={todayEnergy !== type.value ? {
                                    backgroundColor: 'var(--theme-bg-main)',
                                    borderColor: 'var(--theme-bg-card-hover)'
                                } : {}}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <span className="text-2xl mr-3">{type.icon}</span>
                                        <span className={`font-medium ${todayEnergy === type.value ? '' : 'text-white'}`}>{type.label}</span>
                                    </div>
                                    {todayEnergy === type.value && (
                                        <Check className="w-5 h-5 text-emerald-400" />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                    {todayEnergy && (
                        <p className="mt-4 text-sm text-slate-400">
                            Today is marked as <strong className="text-white">{ENERGY_TYPES.find(t => t.value === todayEnergy)?.label}</strong>.
                            This will influence task and study recommendations.
                        </p>
                    )}
                </div>
            )}

            {/* Theme Settings */}
            {activeTab === 'theme' && (
                <div className="card max-w-2xl">
                    <h2 className="text-xl font-semibold text-white mb-2">Theme</h2>
                    <p className="text-slate-400 mb-6">Choose your preferred color scheme</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(THEMES).map(([id, themeConfig]) => (
                            <button
                                key={id}
                                onClick={() => handleThemeChange(id)}
                                className="p-4 rounded-xl border-2 text-left transition-all"
                                style={currentTheme === id ? {
                                    borderColor: 'var(--theme-primary)',
                                    backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, transparent)'
                                } : {
                                    borderColor: 'var(--theme-bg-card-hover)',
                                    backgroundColor: 'var(--theme-bg-main)'
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-8 h-8 rounded-lg"
                                            style={{ background: `linear-gradient(135deg, ${themeConfig.primaryLight}, ${themeConfig.primary})` }}
                                        />
                                        <span className="font-medium text-white">{themeConfig.name}</span>
                                    </div>
                                    {currentTheme === id && (
                                        <Check className="w-5 h-5" style={{ color: 'var(--theme-primary-light)' }} />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                    <p className="mt-4 text-sm text-slate-500">
                        Theme is applied instantly across the entire app.
                    </p>
                </div>
            )}

            {/* How to Use Guide */}
            {activeTab === 'guide' && (
                <div className="card max-w-2xl">
                    <HowToUseGuide
                        onRestartWalkthrough={async () => {
                            await onboardingService.reset(user.uid);
                            window.location.reload();
                        }}
                    />
                </div>
            )}
        </div>
    );
}
