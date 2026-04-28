import { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

// Guide content sections
const GUIDE_SECTIONS = [
    {
        id: 'projects',
        title: 'Understanding Projects',
        content: `Projects are meaningful goals that require multiple work sessions to complete.

A project should have a clear end point. Examples include launching a website, completing a course, or writing a paper. 

If something can be done in one sitting, it belongs in Tasks, not Projects. Reserve Projects for work that truly matters to you.`,
    },
    {
        id: 'active-rule',
        title: 'The Active Projects Rule',
        content: `You can have at most 3 Active Projects at any time.

This constraint forces prioritization. When all slots are full, you must pause or complete something before starting something new.

Other project states:
- Paused: Temporarily on hold, will resume soon
- Parked: Waiting on external factors
- Completed: Finished and documented`,
    },
    {
        id: 'actions-tasks',
        title: 'Actions vs Tasks',
        content: `Actions are raw, unprocessed thoughts. They have no due date or priority.

Tasks are processed work items. They have a due date, priority level, and usually link to a Project.

The workflow: Capture ideas in Actions quickly, then process them into Tasks during a review session.`,
    },
    {
        id: 'inbox',
        title: 'Using the Action Inbox',
        content: `The Action Inbox is for quick capture without decisions.

When a thought interrupts you, dump it into Actions and return to your current work. Processing happens later.

Review your inbox daily. Convert relevant items to Tasks, delete what is no longer relevant, and keep the inbox near empty.`,
    },
    {
        id: 'focus',
        title: 'Daily Focus View',
        content: `The Focus View shows only what matters today.

It displays tasks due today, your study progress, and AI-suggested next actions for each active project.

Use this view during work sessions to reduce decision fatigue. Access it from the Focus Mode button on the Dashboard.`,
    },
    {
        id: 'study-panda',
        title: 'Study Tracking and Panda',
        content: `The Study Tracker records your focused learning time by subject.

Set a daily goal in Settings. The panda companion reflects your progress:
- Hungry: No study time logged
- Content: Progress toward goal
- Happy: Goal reached

The panda is a gentle reminder, not a judgment. Missed days happen.`,
    },
    {
        id: 'timetable',
        title: 'Timetable and Planning',
        content: `The Timetable shows your weekly schedule at a glance.

Use it to plan when you will work on different subjects or projects. The system uses your schedule to suggest optimal times for running and other activities.

Keep your timetable updated to get accurate recommendations.`,
    },
    {
        id: 'reviews',
        title: 'Weekly Reviews',
        content: `Weekly Reviews help you reflect on progress without judgment.

They show study time compared to goals, tasks completed, and project movement. Use this data to adjust your approach.

If you consistently miss goals, lower them. Sustainable progress beats heroic sprints. Schedule 15 minutes each Sunday.`,
    },
    {
        id: 'email',
        title: 'Email Briefings',
        content: `Daily email briefings summarize your agenda each morning.

They include tasks due, study goals, and project priorities. Use them to start your day with clarity.

Configure email preferences in Settings to enable or customize briefings.`,
    },
    {
        id: 'mistakes',
        title: 'Common Mistakes and Tips',
        content: `Avoid these common pitfalls:

1. Too many Active Projects: Stick to 3 maximum
2. Using Projects for small tasks: If it takes one session, it is a Task
3. Letting Actions accumulate: Process inbox daily
4. Ignoring Weekly Reviews: Reflection prevents drift
5. Setting unrealistic goals: Start small, increase gradually

When in doubt, do less but finish what you start.`,
    },
];

export default function HowToUseGuide({ onRestartWalkthrough }) {
    const [expandedSection, setExpandedSection] = useState(null);

    const toggleSection = (id) => {
        setExpandedSection(expandedSection === id ? null : id);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <BookOpen className="w-6 h-6" style={{ color: 'var(--theme-primary-light)' }} />
                    <h2 className="text-xl font-semibold text-white">How to Use Second Brain OS</h2>
                </div>
                {onRestartWalkthrough && (
                    <button
                        onClick={onRestartWalkthrough}
                        className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                        style={{
                            background: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)',
                            color: 'var(--theme-primary-light)',
                        }}
                    >
                        Restart Walkthrough
                    </button>
                )}
            </div>

            {/* Accordion Sections */}
            <div className="space-y-2">
                {GUIDE_SECTIONS.map((section) => (
                    <div
                        key={section.id}
                        className="rounded-xl overflow-hidden transition-all"
                        style={{ background: 'var(--theme-bg-main)' }}
                    >
                        <button
                            onClick={() => toggleSection(section.id)}
                            className="w-full flex items-center justify-between p-4 text-left hover:opacity-80 transition-opacity"
                        >
                            <span className="font-medium text-white">{section.title}</span>
                            {expandedSection === section.id ? (
                                <ChevronUp className="w-5 h-5 text-slate-400" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-slate-400" />
                            )}
                        </button>

                        {expandedSection === section.id && (
                            <div className="px-4 pb-4">
                                <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                                    {section.content}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
