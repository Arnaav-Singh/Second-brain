import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { weeklyReviewsService } from '../services/firestore';
import { generateWeeklyReflection } from '../services/gemini';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { MessageSquare, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

export default function WeeklyReview() {
    const { user } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [expandedReview, setExpandedReview] = useState(null);
    const [formData, setFormData] = useState({
        what_moved_needle: '',
        what_was_avoided: '',
        what_to_kill_pause: '',
    });

    useEffect(() => {
        if (user) {
            loadReviews();
        }
    }, [user]);

    const loadReviews = async () => {
        try {
            const data = await weeklyReviewsService.getAll(user.uid);
            setReviews(data);
        } catch (error) {
            console.error('Error loading reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setProcessing(true);

        try {
            const today = new Date();
            const weekStart = startOfWeek(today, { weekStartsOn: 1 });

            // Check if review for this week exists
            const existingReview = await weeklyReviewsService.getByWeek(user.uid, weekStart);
            if (existingReview) {
                alert('You already have a review for this week.');
                setProcessing(false);
                return;
            }

            // Try to get AI-generated summary
            let aiSummary = null;
            let suggestions = [];
            try {
                const result = await generateWeeklyReflection({
                    what_moved_needle: formData.what_moved_needle,
                    what_was_avoided: formData.what_was_avoided,
                    what_to_kill_pause: formData.what_to_kill_pause,
                });
                const parsed = typeof result === 'string' ? JSON.parse(result) : result;
                aiSummary = parsed.summary;
                suggestions = parsed.suggestions || [];
            } catch (aiError) {
                console.error('AI summary failed:', aiError);
                // Continue without AI summary
            }

            await weeklyReviewsService.create(user.uid, {
                week_start: format(weekStart, 'yyyy-MM-dd'),
                week_end: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                what_moved_needle: formData.what_moved_needle,
                what_was_avoided: formData.what_was_avoided,
                what_to_kill_pause: formData.what_to_kill_pause,
                ai_summary: aiSummary,
                ai_suggestions: suggestions,
            });

            setShowModal(false);
            setFormData({
                what_moved_needle: '',
                what_was_avoided: '',
                what_to_kill_pause: '',
            });
            loadReviews();
        } catch (error) {
            alert(error.message || 'Error saving review');
        } finally {
            setProcessing(false);
        }
    };

    const toggleExpand = (id) => {
        setExpandedReview(expandedReview === id ? null : id);
    };

    if (loading) {
        return <div className="text-center py-8">Loading...</div>;
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">
                        Weekly Review
                    </h1>
                    <p className="mt-2 text-slate-400">
                        Reflect on your week and get AI-powered insights.
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-primary flex items-center"
                >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    New Review
                </button>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
                {reviews.map((review) => (
                    <div key={review.id} className="card">
                        <div
                            className="flex justify-between items-center cursor-pointer"
                            onClick={() => toggleExpand(review.id)}
                        >
                            <div>
                                <h3 className="font-semibold text-white">
                                    Week of {review.week_start}
                                </h3>
                                <p className="text-sm text-slate-400">
                                    {review.week_start} → {review.week_end}
                                </p>
                            </div>
                            {expandedReview === review.id ? (
                                <ChevronUp className="h-5 w-5 text-gray-500" />
                            ) : (
                                <ChevronDown className="h-5 w-5 text-gray-500" />
                            )}
                        </div>

                        {expandedReview === review.id && (
                            <div className="mt-4 space-y-4">
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <h4 className="font-medium text-green-800 dark:text-green-400 mb-2">
                                        What moved the needle?
                                    </h4>
                                    <p className="text-slate-300">
                                        {review.what_moved_needle || 'Not answered'}
                                    </p>
                                </div>

                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                    <h4 className="font-medium text-yellow-800 dark:text-yellow-400 mb-2">
                                        What was avoided?
                                    </h4>
                                    <p className="text-slate-300">
                                        {review.what_was_avoided || 'Not answered'}
                                    </p>
                                </div>

                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <h4 className="font-medium text-red-800 dark:text-red-400 mb-2">
                                        What should be killed or paused?
                                    </h4>
                                    <p className="text-slate-300">
                                        {review.what_to_kill_pause || 'Not answered'}
                                    </p>
                                </div>

                                {review.ai_summary && (
                                    <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                                        <div className="flex items-center mb-2">
                                            <Sparkles className="h-5 w-5 text-primary-600 mr-2" />
                                            <h4 className="font-medium text-primary-800 dark:text-primary-400">
                                                AI Summary
                                            </h4>
                                        </div>
                                        <p className="text-slate-300">
                                            {review.ai_summary}
                                        </p>
                                        {review.ai_suggestions && review.ai_suggestions.length > 0 && (
                                            <div className="mt-3">
                                                <h5 className="text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                                                    Suggestions:
                                                </h5>
                                                <ul className="list-disc list-inside text-sm text-slate-400">
                                                    {review.ai_suggestions.map((suggestion, idx) => (
                                                        <li key={idx}>{suggestion}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {reviews.length === 0 && (
                <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-slate-400">
                        No reviews yet. Start your first weekly review!
                    </p>
                </div>
            )}

            {/* New Review Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 text-white">
                            Weekly Reality Check
                        </h2>
                        <p className="text-sm text-slate-400 mb-6">
                            Take a moment to reflect honestly on your week. AI will generate insights based on your answers.
                        </p>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    🎯 What moved the needle this week?
                                </label>
                                <textarea
                                    required
                                    className="input"
                                    rows="3"
                                    value={formData.what_moved_needle}
                                    onChange={(e) => setFormData({ ...formData, what_moved_needle: e.target.value })}
                                    placeholder="What actually made progress? What worked well?"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    😰 What was avoided?
                                </label>
                                <textarea
                                    required
                                    className="input"
                                    rows="3"
                                    value={formData.what_was_avoided}
                                    onChange={(e) => setFormData({ ...formData, what_was_avoided: e.target.value })}
                                    placeholder="What did you procrastinate on? What felt uncomfortable?"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    🛑 What should be killed or paused?
                                </label>
                                <textarea
                                    required
                                    className="input"
                                    rows="3"
                                    value={formData.what_to_kill_pause}
                                    onChange={(e) => setFormData({ ...formData, what_to_kill_pause: e.target.value })}
                                    placeholder="What's not worth your energy anymore?"
                                />
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn-secondary"
                                    disabled={processing}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="btn-primary flex items-center"
                                >
                                    {processing ? (
                                        <>
                                            <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Submit & Get Insights
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
