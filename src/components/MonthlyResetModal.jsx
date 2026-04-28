import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { resetService } from '../services/firestore';
import { AlertCircle, Archive, X } from 'lucide-react';

export default function MonthlyResetModal() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [resetting, setResetting] = useState(false);

    useEffect(() => {
        if (user) {
            const needsReset = resetService.checkResetNeeded(user.uid);
            if (needsReset) {
                setIsOpen(true);
            }
        }
    }, [user]);

    const handleReset = async () => {
        if (!user) return;

        setResetting(true);
        try {
            await resetService.performMonthlyReset(user.uid);
            setIsOpen(false);
            window.location.reload(); // Refresh to show empty state
        } catch (error) {
            console.error('Reset failed:', error);
            alert('Failed to reset data. Please try again.');
            setResetting(false);
        }
    };

    const handleSkip = () => {
        if (user) {
            // Mark as done so we don't ask again this month
            resetService.markResetComplete(user.uid);
            setIsOpen(false);
        }
    };

    if (!isOpen) return null;

    const currentMonth = new Date().toLocaleString('default', { month: 'long' });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="card max-w-md w-full p-6 animate-in zoom-in-95 duration-200 border-l-4 border-l-rose-500">
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-rose-500/10 text-rose-500">
                        <Archive size={24} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-white mb-2">
                            Fresh Start for {currentMonth}?
                        </h2>
                        <p className="text-slate-400 mb-4 text-sm leading-relaxed">
                            It's the 1st of the month! Do you want to archive logs and clear tasks to start fresh?
                        </p>

                        <div className="bg-slate-900/50 rounded-lg p-3 mb-6 text-xs text-slate-400 border border-slate-800">
                            <p className="font-semibold text-rose-400 mb-1 flex items-center gap-2">
                                <AlertCircle size={12} />
                                What will be deleted:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 opacity-80">
                                <li>All Tasks, Projects & Actions</li>
                                <li>Study Sessions & Logs</li>
                                <li>Daily Summaries</li>
                            </ul>
                            <p className="mt-2 pt-2 border-t border-slate-800 text-emerald-400">
                                ✓ Timetable & Settings will be kept
                            </p>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={handleSkip}
                                disabled={resetting}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                            >
                                No, Keep Everything
                            </button>
                            <button
                                onClick={handleReset}
                                disabled={resetting}
                                className="btn bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                            >
                                {resetting ? 'Resetting...' : 'Yes, Start Fresh'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
