import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { tasksService, projectsService } from '../services/firestore';
import { Plus, Check, Edit, Trash2, X, CheckSquare, Circle, Filter, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    linked_project: '',
    due_date: '',
    priority: 'medium',
    energy_required: 'medium',
  });

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [tasksData, projectsData] = await Promise.all([
        tasksService.getAll(user.uid),
        projectsService.getAll(user.uid),
      ]);
      setTasks(tasksData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const taskData = {
        ...formData,
        due_date: formData.due_date ? new Date(formData.due_date) : null,
        linked_project: formData.linked_project || null,
      };
      if (editingTask) {
        await tasksService.update(editingTask.id, taskData);
      } else {
        await tasksService.create(user.uid, taskData);
      }
      closeModal();
      loadData();
    } catch (error) {
      alert(error.message || 'Error saving task');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      linked_project: '',
      due_date: '',
      priority: 'medium',
      energy_required: 'medium',
    });
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      linked_project: task.linked_project || '',
      due_date: task.due_date ? format(task.due_date.toDate(), 'yyyy-MM-dd') : '',
      priority: task.priority,
      energy_required: task.energy_required || 'medium',
    });
    setShowModal(true);
  };

  const handleComplete = async (task) => {
    try {
      await tasksService.update(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' });
      loadData();
    } catch (error) {
      alert('Error updating task');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this task?')) {
      try {
        await tasksService.delete(id);
        loadData();
      } catch (error) {
        alert('Error deleting task');
      }
    }
  };

  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'high': return { color: 'bg-red-100 text-red-700', dot: 'bg-red-500' };
      case 'medium': return { color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' };
      default: return { color: 'bg-gray-100 text-slate-400', dot: 'bg-gray-400' };
    }
  };

  const getProjectName = (projectId) => projects.find(p => p.id === projectId)?.title;
  const unlinkedCount = tasks.filter(t => !t.linked_project && t.status !== 'completed').length;
  const filteredTasks = tasks.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'unlinked') return !t.linked_project && t.status !== 'completed';
    return t.status === filter;
  });
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Tasks</h1>
          <p className="mt-1 text-slate-400">
            {completedCount} of {tasks.length} tasks completed
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </button>
      </div>

      {/* Progress Bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-300">Completion Progress</span>
          <span className="text-sm font-semibold text-primary-600">
            {tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill bg-gradient-to-r from-primary-500 to-primary-600"
            style={{ width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
        {[
          { value: 'pending', label: 'To Do', icon: Circle },
          { value: 'completed', label: 'Done', icon: Check },
          { value: 'all', label: 'All', icon: Filter },
        ].map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === value
              ? 'bg-white text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-300'
              }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
        {unlinkedCount > 0 && (
          <button
            onClick={() => setFilter('unlinked')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'unlinked'
              ? 'bg-yellow-100 text-yellow-800 shadow-sm'
              : 'text-yellow-600 hover:text-yellow-700'
              }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Unlinked ({unlinkedCount})
          </button>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.map((task) => {
          const priorityConfig = getPriorityConfig(task.priority);
          const projectName = getProjectName(task.linked_project);

          return (
            <div
              key={task.id}
              className={`card p-4 flex items-start gap-4 group transition-all ${task.status === 'completed' ? 'opacity-60' : ''
                }`}
            >
              <button
                onClick={() => handleComplete(task)}
                className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.status === 'completed'
                  ? 'bg-primary-500 border-primary-500 text-white'
                  : 'border-gray-300 hover:border-primary-500'
                  }`}
              >
                {task.status === 'completed' && <Check className="w-3.5 h-3.5" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className={`font-medium text-white ${task.status === 'completed' ? 'line-through' : ''}`}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">{task.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(task)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                      <Edit className="w-4 h-4 text-slate-400" />
                    </button>
                    <button onClick={() => handleDelete(task.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${priorityConfig.color}`}>
                    {task.priority}
                  </span>
                  {task.due_date && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                      📅 {format(task.due_date.toDate(), 'MMM d')}
                    </span>
                  )}
                  {projectName && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary-50 text-primary-700">
                      📁 {projectName}
                    </span>
                  )}
                  {!task.linked_project && task.status !== 'completed' && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-1">
                      ⚠️ Unlinked
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <CheckSquare className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {filter === 'pending' ? 'All done!' : filter === 'completed' ? 'No completed tasks' : 'No tasks yet'}
          </h3>
          <p className="text-slate-400 mb-6">
            {filter === 'pending' ? 'Create a new task to get started' : 'Complete some tasks to see them here'}
          </p>
          {filter !== 'completed' && (
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingTask ? 'Edit Task' : 'New Task'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="What needs to be done?"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  className="input"
                  rows="2"
                  placeholder="Add details (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
                  <select
                    className="input"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Due Date</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Project</label>
                <select
                  className="input"
                  value={formData.linked_project}
                  onChange={(e) => setFormData({ ...formData, linked_project: e.target.value })}
                >
                  <option value="">None</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editingTask ? 'Update' : 'Add Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
