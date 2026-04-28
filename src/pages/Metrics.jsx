import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
    projectsService,
    tasksService,
    studySessionsService,
    studySettingsService,
    fitnessSettingsService,
    timetableService,
} from '../services/firestore';
import { format, startOfWeek, endOfWeek, subWeeks, eachDayOfInterval, isSameDay } from 'date-fns';
import { TrendingUp, Target, CheckSquare, FolderKanban, Flame, Activity } from 'lucide-react';

export default function Metrics() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        studyHours: { today: 0, week: 0, month: 0 },
        taskCompletion: { completed: 0, total: 0, ratio: 0 },
        projects: { active: 0, paused: 0, completed: 0 },
        studyStreak: 0,
        runningConsistency: { actual: 0, suggested: 0 },
    });
    const [weeklyData, setWeeklyData] = useState([]);

    useEffect(() => {
        if (user) {
            loadMetrics();
        }
    }, [user]);

    const loadMetrics = async () => {
        try {
            const today = new Date();
            const weekStart = startOfWeek(today, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
            const monthStart = subWeeks(today, 4);

            const [projects, tasks, studySessions, fitnessSettings, timetableSlots] = await Promise.all([
                projectsService.getAll(user.uid),
                tasksService.getAll(user.uid),
                studySessionsService.getByDateRange(user.uid, monthStart, weekEnd),
                fitnessSettingsService.get(user.uid),
                timetableService.getAll(user.uid),
            ]);

            // Calculate study hours
            const todayStudy = studySessions
                .filter(s => s.date && isSameDay(s.date.toDate(), today))
                .reduce((sum, s) => sum + (s.duration || 0), 0);

            const weekStudy = studySessions
                .filter(s => {
                    if (!s.date) return false;
                    const date = s.date.toDate();
                    return date >= weekStart && date <= weekEnd;
                })
                .reduce((sum, s) => sum + (s.duration || 0), 0);

            const monthStudy = studySessions.reduce((sum, s) => sum + (s.duration || 0), 0);

            // Calculate task completion
            const completedTasks = tasks.filter(t => t.status === 'completed').length;
            const totalTasks = tasks.length;

            // Calculate project stats
            const activeProjects = projects.filter(p => p.status === 'active').length;
            const pausedProjects = projects.filter(p => p.status === 'paused' || p.status === 'parked').length;
            const completedProjects = projects.filter(p => p.status === 'completed').length;

            // Calculate study streak (consecutive days with study sessions)
            const daysOfWeek = eachDayOfInterval({ start: weekStart, end: today });
            let streak = 0;
            for (let i = daysOfWeek.length - 1; i >= 0; i--) {
                const dayHasStudy = studySessions.some(s =>
                    s.date && isSameDay(s.date.toDate(), daysOfWeek[i])
                );
                if (dayHasStudy) {
                    streak++;
                } else if (i < daysOfWeek.length - 1) {
                    break; // Only break streak if it's not today
                }
            }

            // Calculate running consistency
            const fitnessSlots = timetableSlots.filter(s => s.type === 'fitness');
            const preferredDays = fitnessSettings?.preferred_days || [];

            // Build weekly chart data
            const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
            const chartData = weekDays.map(day => {
                const dayStudy = studySessions
                    .filter(s => s.date && isSameDay(s.date.toDate(), day))
                    .reduce((sum, s) => sum + (s.duration || 0), 0);
                return {
                    day: format(day, 'EEE'),
                    minutes: dayStudy,
                };
            });

            setWeeklyData(chartData);
            setMetrics({
                studyHours: {
                    today: Math.round(todayStudy / 60 * 10) / 10,
                    week: Math.round(weekStudy / 60 * 10) / 10,
                    month: Math.round(monthStudy / 60 * 10) / 10,
                },
                taskCompletion: {
                    completed: completedTasks,
                    total: totalTasks,
                    ratio: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
                },
                projects: {
                    active: activeProjects,
                    paused: pausedProjects,
                    completed: completedProjects,
                },
                studyStreak: streak,
                runningConsistency: {
                    actual: fitnessSlots.length,
                    suggested: preferredDays.length || 3,
                },
            });
        } catch (error) {
            console.error('Error loading metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    const maxMinutes = Math.max(...weeklyData.map(d => d.minutes), 60);

    if (loading) {
        return <div className="text-center py-8">Loading...</div>;
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white dark:text-white">
                    Metrics
                </h1>
                <p className="mt-2 text-slate-400 dark:text-slate-500">
                    Track your progress and stay accountable.
                </p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Study Hours */}
                <div className="card">
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-slate-400 dark:text-slate-500">Study Hours</p>
                            <p className="text-2xl font-bold text-white dark:text-white">
                                {metrics.studyHours.week}h
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                            <p className="text-slate-400 dark:text-slate-500">Today</p>
                            <p className="font-semibold text-white dark:text-white">{metrics.studyHours.today}h</p>
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                            <p className="text-slate-400 dark:text-slate-500">Week</p>
                            <p className="font-semibold text-white dark:text-white">{metrics.studyHours.week}h</p>
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                            <p className="text-slate-400 dark:text-slate-500">Month</p>
                            <p className="font-semibold text-white dark:text-white">{metrics.studyHours.month}h</p>
                        </div>
                    </div>
                </div>

                {/* Task Completion */}
                <div className="card">
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                            <CheckSquare className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-slate-400 dark:text-slate-500">Task Completion</p>
                            <p className="text-2xl font-bold text-white dark:text-white">
                                {metrics.taskCompletion.ratio}%
                            </p>
                        </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
                        <div
                            className="bg-green-500 h-3 rounded-full transition-all"
                            style={{ width: `${metrics.taskCompletion.ratio}%` }}
                        ></div>
                    </div>
                    <p className="text-sm text-slate-400 dark:text-slate-500 text-center">
                        {metrics.taskCompletion.completed} of {metrics.taskCompletion.total} tasks completed
                    </p>
                </div>

                {/* Projects Overview */}
                <div className="card">
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                            <FolderKanban className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-slate-400 dark:text-slate-500">Projects</p>
                            <p className="text-2xl font-bold text-white dark:text-white">
                                {metrics.projects.active} Active
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                            <p className="text-green-600 font-semibold">{metrics.projects.active}</p>
                            <p className="text-slate-400 dark:text-slate-500 text-xs">Active</p>
                        </div>
                        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                            <p className="text-yellow-600 font-semibold">{metrics.projects.paused}</p>
                            <p className="text-slate-400 dark:text-slate-500 text-xs">Paused</p>
                        </div>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <p className="text-blue-600 font-semibold">{metrics.projects.completed}</p>
                            <p className="text-slate-400 dark:text-slate-500 text-xs">Done</p>
                        </div>
                    </div>
                </div>

                {/* Study Streak */}
                <div className="card">
                    <div className="flex items-center">
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                            <Flame className="h-6 w-6 text-orange-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-slate-400 dark:text-slate-500">Study Streak</p>
                            <p className="text-2xl font-bold text-white dark:text-white">
                                {metrics.studyStreak} days
                            </p>
                        </div>
                    </div>
                    <p className="mt-4 text-sm text-slate-400 dark:text-slate-500">
                        {metrics.studyStreak > 0
                            ? '🔥 Keep the streak going!'
                            : 'Start studying to build your streak!'}
                    </p>
                </div>

                {/* Running Consistency */}
                <div className="card">
                    <div className="flex items-center">
                        <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                            <Activity className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-slate-400 dark:text-slate-500">Fitness Slots</p>
                            <p className="text-2xl font-bold text-white dark:text-white">
                                {metrics.runningConsistency.actual} / {metrics.runningConsistency.suggested}
                            </p>
                        </div>
                    </div>
                    <p className="mt-4 text-sm text-slate-400 dark:text-slate-500">
                        Scheduled fitness sessions this week
                    </p>
                </div>

                {/* Weekly Goal */}
                <div className="card">
                    <div className="flex items-center">
                        <div className="p-3 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
                            <Target className="h-6 w-6 text-primary-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-slate-400 dark:text-slate-500">Weekly Study</p>
                            <p className="text-2xl font-bold text-white dark:text-white">
                                {Math.round(metrics.studyHours.week * 60)} min
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Weekly Study Chart */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white dark:text-white mb-6">
                    This Week's Study
                </h3>
                <div className="flex items-end justify-between h-48 gap-2">
                    {weeklyData.map((day, index) => (
                        <div key={index} className="flex-1 flex flex-col items-center">
                            <div className="relative w-full flex justify-center mb-2">
                                <div
                                    className="w-8 bg-primary-500 rounded-t transition-all"
                                    style={{
                                        height: `${Math.max(4, (day.minutes / maxMinutes) * 160)}px`
                                    }}
                                ></div>
                            </div>
                            <span className="text-xs text-slate-400 dark:text-slate-500">{day.day}</span>
                            <span className="text-xs font-medium text-slate-300 dark:text-gray-300">
                                {day.minutes}m
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
