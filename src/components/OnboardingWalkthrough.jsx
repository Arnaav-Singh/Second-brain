import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { onboardingService } from '../services/firestore';
import { ArrowLeft, ArrowRight, X, CheckCircle } from 'lucide-react';

// Walkthrough step content
const STEPS = [
    {
        id: 1,
        title: 'Welcome to Second Brain OS',
        content: `This is not a typical to-do app.

Second Brain OS is designed around one principle: finish what you start before starting something new.

Most productivity tools encourage you to capture everything. This system encourages you to complete things. The difference matters.

Take your time with this walkthrough. Each step explains a core concept that will help you use the system correctly.`,
    },
    {
        id: 2,
        title: 'What is a Project?',
        content: `A Project is a meaningful goal that takes multiple sessions to complete.

Examples of Projects:
- Launch personal website
- Complete certification course
- Write research paper

Not Projects:
- Buy groceries
- Reply to email
- Call mom

Projects require focus over days or weeks. They have a clear end point. If something can be done in one sitting, it belongs in Tasks, not Projects.`,
    },
    {
        id: 3,
        title: 'The Active Projects Rule',
        content: `You can only have 3 Active Projects at a time.

This is the most important constraint in the system. It forces you to prioritize ruthlessly.

Other projects can be:
- Paused: temporarily on hold
- Parked: waiting for something external
- Completed: finished and documented

When you want to start something new, you must first pause or complete an existing Active project. This prevents the scattered feeling of having too many things in progress.`,
    },
    {
        id: 4,
        title: 'The Actions Inbox',
        content: `Actions is your capture inbox for unprocessed thoughts.

When something comes to mind, dump it into Actions without deciding what to do with it. You can capture thoughts quickly without breaking your current focus.

Later, during a review session, you process Actions by:
- Converting them to Tasks
- Linking them to Projects
- Deleting them if irrelevant

The inbox should be emptied regularly, not accumulated forever.`,
    },
    {
        id: 5,
        title: 'Actions vs Tasks',
        content: `Actions and Tasks serve different purposes.

Actions: Raw thoughts, ideas, reminders. Unprocessed. No due date. Just captured quickly.

Tasks: Processed work items. Have a due date, priority, and usually link to a Project. Ready to be executed.

The workflow:
1. Capture quickly into Actions
2. Process Actions into Tasks
3. Execute Tasks to move Projects forward

Never let Actions pile up. Review and process them daily.`,
    },
    {
        id: 6,
        title: 'Study Tracking',
        content: `The Study Tracker measures your focused learning time.

Each study session records:
- Duration in minutes
- Subject studied
- Optional notes

Set a daily study goal in Settings. The system tracks your progress toward that goal each day and across the week.

Consistency matters more than intensity. Regular short sessions beat occasional long ones.`,
    },
    {
        id: 7,
        title: 'Your Panda Companion',
        content: `The panda represents your daily study progress.

Panda moods:
- Hungry: No study time logged today
- Content: Some progress toward daily goal
- Happy: Daily goal reached or exceeded

The panda appears across the app as a gentle reminder of your study commitment. It is not meant to shame you. If you miss a day, tomorrow is a fresh start.

Think of feeding the panda as feeding your future self.`,
    },
    {
        id: 8,
        title: 'Daily Focus View',
        content: `The Daily Focus View shows only what matters today.

It displays:
- Tasks due today
- Your current study progress
- Suggested next action for each active project

Use this view during your work sessions to stay on track. It deliberately hides the full project list to reduce decision fatigue.

Access it from the Focus Mode button on the Dashboard.`,
    },
    {
        id: 9,
        title: 'End-of-Day Shutdown',
        content: `The Shutdown Ritual helps you close your day intentionally.

The 5-minute ritual:
1. Mark which tasks you completed
2. Decide what rolls over to tomorrow
3. Set your number one priority for tomorrow
4. Note something you are grateful for

This creates a clean mental break between work time and rest time. Unfinished work stays in the system, not in your head.`,
    },
    {
        id: 10,
        title: 'Weekly Reviews',
        content: `Weekly Reviews are for reflection, not judgment.

The review shows:
- Study time compared to goal
- Projects progressed
- Tasks completed vs created

Use this data to adjust your approach, not to beat yourself up. If you consistently miss goals, lower them. The goal is sustainable progress, not heroic sprints.

Schedule 15 minutes each Sunday to review your week.`,
    },
    {
        id: 11,
        title: 'You Are Ready',
        content: `You do not need to use every feature immediately.

Start with:
1. Create one Project
2. Add a few Tasks
3. Log one study session

The rest can wait. The system works best when you build habits gradually rather than trying to adopt everything at once.

If you ever need a refresher, the How to Use guide is available in Settings.

Good luck. Focus on one thing at a time.`,
    },
];

export default function OnboardingWalkthrough({ onComplete }) {
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [showSkipConfirm, setShowSkipConfirm] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    // Load saved step on mount
    useEffect(() => {
        const loadStep = async () => {
            if (user) {
                const status = await onboardingService.getStatus(user.uid);
                if (status.currentStep > 0 && status.currentStep < 11) {
                    setCurrentStep(status.currentStep);
                }
            }
        };
        loadStep();
    }, [user]);

    // Save progress when step changes
    useEffect(() => {
        if (user && currentStep > 0) {
            onboardingService.updateStep(user.uid, currentStep);
        }
    }, [currentStep, user]);

    const handleNext = useCallback(() => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    }, [currentStep]);

    const handleBack = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);

    const handleComplete = async () => {
        setIsExiting(true);
        try {
            if (user) {
                await onboardingService.complete(user.uid);
            }
        } catch (error) {
            console.error('[Onboarding] Error completing onboarding:', error);
        } finally {
            setTimeout(() => {
                onComplete?.();
            }, 300);
        }
    };

    const handleSkip = () => {
        setShowSkipConfirm(true);
    };

    const confirmSkip = async () => {
        setIsExiting(true);
        try {
            if (user) {
                await onboardingService.complete(user.uid);
            }
        } catch (error) {
            console.error('[Onboarding] Error skipping onboarding:', error);
        } finally {
            setTimeout(() => {
                onComplete?.();
            }, 300);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (showSkipConfirm) return;
            if (e.key === 'ArrowRight' || e.key === 'Enter') {
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                handleBack();
            } else if (e.key === 'Escape') {
                handleSkip();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handleBack, showSkipConfirm]);

    const step = STEPS[currentStep];
    const progress = ((currentStep + 1) / STEPS.length) * 100;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isExiting ? 'opacity-0' : 'opacity-100'}`}
            style={{ background: 'rgba(0, 0, 0, 0.85)' }}
        >
            {/* Skip Confirmation Modal */}
            {showSkipConfirm && (
                <div className="absolute inset-0 z-60 flex items-center justify-center">
                    <div
                        className="p-6 rounded-2xl max-w-sm text-center"
                        style={{ background: 'var(--theme-bg-card)' }}
                    >
                        <h3 className="text-lg font-semibold text-white mb-3">Skip Walkthrough?</h3>
                        <p className="text-slate-400 text-sm mb-6">
                            You can always restart it from Settings if you change your mind.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSkipConfirm(false)}
                                className="flex-1 px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
                            >
                                Go Back
                            </button>
                            <button
                                onClick={confirmSkip}
                                className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                            >
                                Skip
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Modal */}
            <div
                className="w-full max-w-2xl rounded-2xl overflow-hidden"
                style={{ background: 'var(--theme-bg-card)' }}
            >
                {/* Progress Bar */}
                <div
                    className="h-1 transition-all duration-300"
                    style={{
                        width: `${progress}%`,
                        background: 'var(--theme-primary)'
                    }}
                />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
                    <span className="text-sm text-slate-400">
                        Step {currentStep + 1} of {STEPS.length}
                    </span>
                    <button
                        onClick={handleSkip}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Skip walkthrough"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-8">
                    <h2 className="text-2xl font-bold text-white mb-6">{step.title}</h2>
                    <div className="text-slate-300 leading-relaxed whitespace-pre-line">
                        {step.content}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/50">
                    <button
                        onClick={handleBack}
                        disabled={currentStep === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentStep === 0
                            ? 'text-slate-600 cursor-not-allowed'
                            : 'text-slate-300 hover:text-white hover:bg-slate-700'
                            }`}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>

                    <button
                        onClick={handleNext}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors"
                        style={{
                            background: 'var(--theme-primary)',
                            color: 'white'
                        }}
                    >
                        {currentStep === STEPS.length - 1 ? (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Get Started
                            </>
                        ) : (
                            <>
                                Next
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
