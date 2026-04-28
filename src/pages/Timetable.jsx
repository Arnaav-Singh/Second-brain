import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { timetableService } from '../services/firestore';
import { Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

const SLOT_TYPES = [
    { value: 'study', label: 'Study', color: 'bg-blue-500' },
    { value: 'class', label: 'Class', color: 'bg-purple-500' },
    { value: 'admin', label: 'Admin', color: 'bg-gray-500' },
    { value: 'break', label: 'Break', color: 'bg-green-500' },
    { value: 'fitness', label: 'Fitness', color: 'bg-orange-500' },
];

export default function Timetable() {
    const { user } = useAuth();
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSlot, setEditingSlot] = useState(null);
    const [clashError, setClashError] = useState('');
    const [formData, setFormData] = useState({
        day_of_week: 0,
        start_time: '09:00',
        end_time: '10:00',
        subject_or_activity: '',
        type: 'study',
    });

    useEffect(() => {
        if (user) {
            loadSlots();
        }
    }, [user]);

    const loadSlots = async () => {
        try {
            const data = await timetableService.getAll(user.uid);
            setSlots(data);
        } catch (error) {
            console.error('Error loading timetable:', error);
        } finally {
            setLoading(false);
        }
    };

    const timeToMinutes = (time) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const checkForClash = (newSlot, excludeId = null) => {
        const newStart = timeToMinutes(newSlot.start_time);
        const newEnd = timeToMinutes(newSlot.end_time);

        for (const slot of slots) {
            if (excludeId && slot.id === excludeId) continue;
            if (slot.day_of_week !== newSlot.day_of_week) continue;

            const existingStart = timeToMinutes(slot.start_time);
            const existingEnd = timeToMinutes(slot.end_time);

            // Check for overlap
            if (newStart < existingEnd && newEnd > existingStart) {
                return `Clash with "${slot.subject_or_activity}" (${slot.start_time} - ${slot.end_time})`;
            }
        }
        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setClashError('');

        // Validate times
        if (timeToMinutes(formData.start_time) >= timeToMinutes(formData.end_time)) {
            setClashError('End time must be after start time');
            return;
        }

        // Check for clashes
        const clash = checkForClash(formData, editingSlot?.id);
        if (clash) {
            setClashError(clash);
            return;
        }

        try {
            if (editingSlot) {
                await timetableService.update(editingSlot.id, formData);
            } else {
                await timetableService.create(user.uid, formData);
            }
            closeModal();
            loadSlots();
        } catch (error) {
            alert(error.message || 'Error saving slot');
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingSlot(null);
        setClashError('');
        setFormData({
            day_of_week: 0,
            start_time: '09:00',
            end_time: '10:00',
            subject_or_activity: '',
            type: 'study',
        });
    };

    const handleEdit = (slot) => {
        setEditingSlot(slot);
        setFormData({
            day_of_week: slot.day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time,
            subject_or_activity: slot.subject_or_activity,
            type: slot.type,
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this slot?')) {
            try {
                await timetableService.delete(id);
                loadSlots();
            } catch (error) {
                alert('Error deleting slot');
            }
        }
    };

    const getSlotColor = (type) => {
        const slotType = SLOT_TYPES.find(t => t.value === type);
        return slotType ? slotType.color : 'bg-gray-500';
    };

    const getSlotsForDay = (dayIndex) => {
        return slots
            .filter(slot => slot.day_of_week === dayIndex)
            .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    };

    if (loading) {
        return <div className="text-center py-8">Loading...</div>;
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">
                        Timetable
                    </h1>
                    <p className="mt-2 text-slate-400">
                        Plan your weekly schedule with clash detection.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingSlot(null);
                        setFormData({
                            day_of_week: 0,
                            start_time: '09:00',
                            end_time: '10:00',
                            subject_or_activity: '',
                            type: 'study',
                        });
                        setShowModal(true);
                    }}
                    className="btn-primary flex items-center"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Slot
                </button>
            </div>

            {/* Legend */}
            <div className="mb-6 flex flex-wrap gap-4">
                {SLOT_TYPES.map((type) => (
                    <div key={type.value} className="flex items-center">
                        <div className={`w-4 h-4 rounded ${type.color} mr-2`}></div>
                        <span className="text-sm text-slate-400">{type.label}</span>
                    </div>
                ))}
            </div>

            {/* Weekly Grid */}
            <div className="overflow-x-auto">
                <div className="grid grid-cols-7 gap-2 min-w-[800px]">
                    {DAYS.map((day, dayIndex) => (
                        <div key={day} className="card p-3">
                            <h3 className="font-semibold text-white mb-3 text-center">
                                {day}
                            </h3>
                            <div className="space-y-2">
                                {getSlotsForDay(dayIndex).map((slot) => (
                                    <div
                                        key={slot.id}
                                        className={`${getSlotColor(slot.type)} text-white p-2 rounded text-xs`}
                                    >
                                        <div className="font-medium truncate">{slot.subject_or_activity}</div>
                                        <div className="opacity-80">
                                            {slot.start_time} - {slot.end_time}
                                        </div>
                                        <div className="flex justify-end space-x-1 mt-1">
                                            <button
                                                onClick={() => handleEdit(slot)}
                                                className="p-1 hover:bg-white/20 rounded"
                                            >
                                                <Edit className="h-3 w-3" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(slot.id)}
                                                className="p-1 hover:bg-white/20 rounded"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {getSlotsForDay(dayIndex).length === 0 && (
                                    <p className="text-xs text-gray-400 text-center py-4">
                                        No slots
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold mb-4 text-white">
                            {editingSlot ? 'Edit Slot' : 'Add Slot'}
                        </h2>

                        {clashError && (
                            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 rounded-lg flex items-center">
                                <AlertTriangle className="h-5 w-5 mr-2" />
                                {clashError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Day
                                </label>
                                <select
                                    className="input"
                                    value={formData.day_of_week}
                                    onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                                >
                                    {DAYS.map((day, index) => (
                                        <option key={day} value={index}>{day}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Start Time
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        className="input"
                                        value={formData.start_time}
                                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        End Time
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        className="input"
                                        value={formData.end_time}
                                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Subject / Activity
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="input"
                                    value={formData.subject_or_activity}
                                    onChange={(e) => setFormData({ ...formData, subject_or_activity: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Type
                                </label>
                                <select
                                    className="input"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    {SLOT_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingSlot ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
