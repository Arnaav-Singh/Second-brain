import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { studySessionsService, studySettingsService } from '../services/firestore';
import { startOfWeek, endOfWeek, differenceInDays } from 'date-fns';
import { AlertTriangle, CheckCircle, AlertCircle, Target } from 'lucide-react';

/**
 * Study Risk Radar Component
 * Tracks study consistency and shows risk level for exam preparation
 * 🟢 Green - On track | 🟡 Yellow - Warning | 🔴 Red - At risk
 */
export default function StudyRiskRadar({ className = '' }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [riskData, setRiskData] = useState(null);

    useEffect(() => {
        if (user) calculateRisk();
    }, [user]);

    const calculateRisk = async () => {
        try {
            const today = new Date();
            const weekStart = startOfWeek(today, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

            const [sessions, settings] = await Promise.all([
                studySessionsService.getByDateRange(user.uid, weekStart, weekEnd),
                studySettingsService.get(user.uid),
            ]);

            const weeklyGoal = settings?.weekly_goal || 600; // 10 hours default
            const dailyGoal = settings?.daily_goal || 120;
            const examMode = settings?.exam_mode || false;

            // Calculate metrics
            const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            const daysWithStudy = new Set(sessions.map(s => s.date?.toDate()?.toDateString())).size;
            const daysSoFar = Math.min(differenceInDays(today, weekStart) + 1, 7);

            // Goal progress
            const weeklyProgress = (totalMinutes / weeklyGoal) * 100;
            const consistencyScore = (daysWithStudy / daysSoFar) * 100;

            // Expected progress for this point in the week
            const expectedProgress = (daysSoFar / 7) * 100;
            const progressDelta = weeklyProgress - expectedProgress;

            // Determine risk level
            let riskLevel = 'green';
            let message = 'On track! Keep it up.';

            if (examMode) {
                // Stricter thresholds in exam mode
                if (progressDelta < -30 || consistencyScore < 50) {
                    riskLevel = 'red';
                    message = 'Exam mode: You need to study more!';
                } else if (progressDelta < -15 || consistencyScore < 70) {
                    riskLevel = 'yellow';
                    message = 'Exam mode: Consider adding a study session.';
                } else {
                    message = 'Exam mode: You\'re doing great!';
                }
            } else {
                if (progressDelta < -40 || consistencyScore < 30) {
                    riskLevel = 'red';
                    message = 'Study consistency is low this week.';
                } else if (progressDelta < -20 || consistencyScore < 50) {
                    riskLevel = 'yellow';
                    message = 'A bit behind schedule.';
                }
            }

            setRiskData({
                riskLevel,
                message,
                weeklyProgress: Math.round(weeklyProgress),
                consistencyScore: Math.round(consistencyScore),
                totalMinutes,
                weeklyGoal,
                daysWithStudy,
                daysSoFar,
                examMode,
            });
        } catch (error) {
            console.error('Error calculating study risk:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !riskData) {
        return null;
    }

    const getRiskConfig = () => {
        switch (riskData.riskLevel) {
            case 'red':
                return {
                    icon: AlertTriangle,
                    bgColor: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    textColor: 'text-red-400',
                    label: '🔴 At Risk',
                };
            case 'yellow':
                return {
                    icon: AlertCircle,
                    bgColor: 'rgba(234, 179, 8, 0.1)',
                    borderColor: 'rgba(234, 179, 8, 0.3)',
                    textColor: 'text-yellow-400',
                    label: '🟡 Warning',
                };
            default:
                return {
                    icon: CheckCircle,
                    bgColor: 'rgba(34, 197, 94, 0.1)',
                    borderColor: 'rgba(34, 197, 94, 0.3)',
                    textColor: 'text-emerald-400',
                    label: '🟢 On Track',
                };
        }
    };

    const config = getRiskConfig();
    const Icon = config.icon;

    return (
        <div
            className={`p-4 rounded-xl ${className}`}
            style={{
                background: config.bgColor,
                border: `1px solid ${config.borderColor}`,
            }}
        >
            <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.textColor}`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h3 className={`font-semibold ${config.textColor}`}>
                            Study Radar: {config.label}
                        </h3>
                        {riskData.examMode && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/20 text-red-400">
                                Exam Mode
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{riskData.message}</p>

                    <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                            <p className="text-xs text-slate-500">Weekly Progress</p>
                            <p className="text-lg font-bold text-white">
                                {riskData.weeklyProgress}%
                                <span className="text-xs font-normal text-slate-400 ml-1">
                                    of goal
                                </span>
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Consistency</p>
                            <p className="text-lg font-bold text-white">
                                {riskData.daysWithStudy}/{riskData.daysSoFar}
                                <span className="text-xs font-normal text-slate-400 ml-1">
                                    days
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
