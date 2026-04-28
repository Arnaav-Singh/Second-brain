import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { tasksService, studySessionsService } from '../services/firestore';
import { detectProcrastination } from '../services/gemini';
import { startOfWeek, endOfWeek } from 'date-fns';
import { AlertTriangle, TrendingUp, RefreshCw, Brain } from 'lucide-react';

/**
 * Weekly Insights Component
 * Detects avoidance and procrastination patterns using AI
 */
export default function WeeklyInsights({ className = '' }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [insights, setInsights] = useState(null);

    useEffect(() => {
        if (user) analyzePatterns();
    }, [user]);

    const analyzePatterns = async () => {
        setGenerating(true);
        try {
            const today = new Date();
            const weekStart = startOfWeek(today, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

            const [tasks, sessions] = await Promise.all([
                tasksService.getAll(user.uid),
                studySessionsService.getByDateRange(user.uid, weekStart, weekEnd),
            ]);

            const result = await detectProcrastination(tasks, sessions);
            setInsights(result);
        } catch (error) {
            console.error('Error analyzing patterns:', error);
            setInsights({
                avoidedSubjects: [],
                postponedPatterns: 'Unable to analyze patterns',
                advice: 'Keep tracking your tasks consistently!',
                severity: 'low',
            });
        } finally {
            setLoading(false);
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className={`card ${className}`}>
                <div className="flex items-center gap-2 text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing patterns...</span>
                </div>
            </div>
        );
    }

    if (!insights) return null;

    const getSeverityConfig = () => {
        switch (insights.severity) {
            case 'high':
                return {
                    bgColor: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    textColor: 'text-red-400',
                    icon: AlertTriangle,
                };
            case 'medium':
                return {
                    bgColor: 'rgba(234, 179, 8, 0.1)',
                    borderColor: 'rgba(234, 179, 8, 0.3)',
                    textColor: 'text-yellow-400',
                    icon: AlertTriangle,
                };
            default:
                return {
                    bgColor: 'rgba(34, 197, 94, 0.1)',
                    borderColor: 'rgba(34, 197, 94, 0.3)',
                    textColor: 'text-emerald-400',
                    icon: TrendingUp,
                };
        }
    };

    const config = getSeverityConfig();
    const Icon = config.icon;

    return (
        <div
            className={`card ${className}`}
            style={{
                background: config.bgColor,
                border: `1px solid ${config.borderColor}`,
            }}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold flex items-center gap-2 ${config.textColor}`}>
                    <Brain className="w-5 h-5" />
                    Weekly Insights
                </h3>
                <button
                    onClick={analyzePatterns}
                    disabled={generating}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    title="Refresh analysis"
                >
                    <RefreshCw className={`w-4 h-4 text-slate-400 ${generating ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Patterns */}
            <div className="mb-4">
                <p className="text-sm text-slate-400 mb-1">Observation</p>
                <p className="text-white">{insights.postponedPatterns}</p>
            </div>

            {/* Avoided Subjects */}
            {insights.avoidedSubjects?.length > 0 && (
                <div className="mb-4">
                    <p className="text-sm text-slate-400 mb-2">Avoided Subjects</p>
                    <div className="flex flex-wrap gap-2">
                        {insights.avoidedSubjects.map((subject, i) => (
                            <span
                                key={i}
                                className="px-2 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400"
                            >
                                {subject}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Advice */}
            <div className="p-3 rounded-lg" style={{ background: 'var(--theme-bg-main)' }}>
                <p className="text-sm font-medium text-white mb-1">💡 Advice</p>
                <p className="text-sm text-slate-400">{insights.advice}</p>
            </div>
        </div>
    );
}
