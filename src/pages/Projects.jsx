import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { projectsService, tasksService } from '../services/firestore';
import { suggestNextAction } from '../services/gemini';
import { Plus, Edit, Trash2, Play, Pause, CheckCircle, MoreVertical, X, FolderKanban, Sparkles, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [allTasks, setAllTasks] = useState([]);
  const [nextActions, setNextActions] = useState({});
  const [formData, setFormData] = useState({
    title: '',
    one_line_objective: '',
    why_it_matters: 'career',
    status: 'active',
    energy_required: 'medium',
    deadline: '',
  });

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  const loadProjects = async () => {
    try {
      const [projectsData, tasksData] = await Promise.all([
        projectsService.getAll(user.uid),
        tasksService.getAll(user.uid),
      ]);
      setProjects(projectsData);
      setAllTasks(tasksData);

      // Generate AI suggestions for active projects
      generateAISuggestions(projectsData.filter(p => p.status === 'active'), tasksData);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAISuggestions = async (activeProjects, tasks) => {
    const actions = {};
    for (const project of activeProjects.slice(0, 3)) {
      try {
        const projectTasks = tasks.filter(t => t.linked_project === project.id);
        actions[project.id] = await suggestNextAction(project, projectTasks);
      } catch (error) {
        actions[project.id] = 'Unable to generate suggestion';
      }
    }
    setNextActions(actions);
  };

  const refreshSuggestion = async (project) => {
    setNextActions(prev => ({ ...prev, [project.id]: null }));
    const projectTasks = allTasks.filter(t => t.linked_project === project.id);
    const suggestion = await suggestNextAction(project, projectTasks);
    setNextActions(prev => ({ ...prev, [project.id]: suggestion }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProject) {
        await projectsService.update(editingProject.id, formData);
      } else {
        const activeProjects = projects.filter(p => p.status === 'active');
        if (formData.status === 'active' && activeProjects.length >= 3) {
          alert('Maximum 3 active projects allowed. Please pause or complete an existing project first.');
          return;
        }
        await projectsService.create(user.uid, formData);
      }
      closeModal();
      loadProjects();
    } catch (error) {
      alert(error.message || 'Error saving project');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProject(null);
    setFormData({
      title: '',
      one_line_objective: '',
      why_it_matters: 'career',
      status: 'active',
      energy_required: 'medium',
      deadline: '',
    });
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      one_line_objective: project.one_line_objective,
      why_it_matters: project.why_it_matters,
      status: project.status,
      energy_required: project.energy_required,
      deadline: project.deadline ? (() => {
        const d = project.deadline.toDate ? project.deadline.toDate() : new Date(project.deadline);
        return !isNaN(d) ? format(d, 'yyyy-MM-dd') : '';
      })() : '',
    });
    setShowModal(true);
  };

  const handleStatusChange = async (project, newStatus) => {
    try {
      if (newStatus === 'active') {
        const activeProjects = projects.filter(p => p.status === 'active');
        if (activeProjects.length >= 3) {
          alert('Maximum 3 active projects allowed.');
          return;
        }
      }
      await projectsService.update(project.id, { status: newStatus });
      loadProjects();
    } catch (error) {
      alert('Error updating project');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this project?')) {
      try {
        await projectsService.delete(id);
        loadProjects();
      } catch (error) {
        alert('Error deleting project');
      }
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'active': return { color: 'bg-emerald-100 text-emerald-700', icon: '🟢' };
      case 'paused': return { color: 'bg-yellow-100 text-yellow-700', icon: '⏸️' };
      case 'parked': return { color: 'bg-gray-100 text-slate-400', icon: '🅿️' };
      case 'completed': return { color: 'bg-blue-100 text-blue-700', icon: '✅' };
      default: return { color: 'bg-gray-100 text-slate-400', icon: '📁' };
    }
  };

  const getEnergyConfig = (energy) => {
    switch (energy) {
      case 'high': return { color: 'bg-red-100 text-red-700', label: '⚡ High' };
      case 'medium': return { color: 'bg-yellow-100 text-yellow-700', label: '💪 Medium' };
      case 'low': return { color: 'bg-green-100 text-green-700', label: '🌱 Low' };
      default: return { color: 'bg-gray-100 text-slate-400', label: energy };
    }
  };

  const activeProjects = projects.filter(p => p.status === 'active');
  const otherProjects = projects.filter(p => p.status !== 'active');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Projects</h1>
          <p className="mt-1 text-slate-400">
            Focus on {3 - activeProjects.length} more active project{3 - activeProjects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingProject(null);
            setFormData({
              title: '',
              one_line_objective: '',
              why_it_matters: 'career',
              status: 'active',
              energy_required: 'medium',
              deadline: '',
            });
            setShowModal(true);
          }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </button>
      </div>

      {/* Active Projects Limit Indicator */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400">Active slots:</span>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${i < activeProjects.length
                ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30'
                : 'bg-gray-100 text-slate-500 border-2 border-dashed border-gray-200'
                }`}
            >
              {i < activeProjects.length ? '✓' : i + 1}
            </div>
          ))}
        </div>
        <span className="text-sm text-slate-500">({activeProjects.length}/3 used)</span>
      </div>

      {/* Active Projects */}
      {activeProjects.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">🎯 Active Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                getStatusConfig={getStatusConfig}
                getEnergyConfig={getEnergyConfig}
                nextAction={nextActions[project.id]}
                onRefreshSuggestion={refreshSuggestion}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Projects */}
      {otherProjects.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">📦 Other Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                getStatusConfig={getStatusConfig}
                getEnergyConfig={getEnergyConfig}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <FolderKanban className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No projects yet</h3>
          <p className="text-slate-400 mb-6 max-w-sm">
            Create your first project to start organizing your goals and tracking progress.
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Create First Project
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingProject ? 'Edit Project' : 'New Project'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
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
                  placeholder="Project name"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">One-line Objective</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="What's the goal?"
                  value={formData.one_line_objective}
                  onChange={(e) => setFormData({ ...formData, one_line_objective: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Why it Matters</label>
                  <select
                    className="input"
                    value={formData.why_it_matters}
                    onChange={(e) => setFormData({ ...formData, why_it_matters: e.target.value })}
                  >
                    <option value="career">💼 Career</option>
                    <option value="academics">📚 Academics</option>
                    <option value="money">💰 Money</option>
                    <option value="health">❤️ Health</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Energy Required</label>
                  <select
                    className="input"
                    value={formData.energy_required}
                    onChange={(e) => setFormData({ ...formData, energy_required: e.target.value })}
                  >
                    <option value="low">🌱 Low</option>
                    <option value="medium">💪 Medium</option>
                    <option value="high">⚡ High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                  <select
                    className="input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">🟢 Active</option>
                    <option value="paused">⏸️ Paused</option>
                    <option value="parked">🅿️ Parked</option>
                    <option value="completed">✅ Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Deadline</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingProject ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onEdit, onDelete, onStatusChange, getStatusConfig, getEnergyConfig, nextAction, onRefreshSuggestion }) {
  const statusConfig = getStatusConfig(project.status);
  const energyConfig = getEnergyConfig(project.energy_required);

  return (
    <div className="card group">
      <div className="flex items-start justify-between mb-4">
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
          {statusConfig.icon} {project.status}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(project)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => onDelete(project.id)}
            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-white mb-2">{project.title}</h3>
      <p className="text-sm text-slate-400 mb-4 line-clamp-2">{project.one_line_objective}</p>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${energyConfig.color}`}>
          {energyConfig.label}
        </span>
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-50 text-primary-700">
          {project.why_it_matters}
        </span>
      </div>

      {project.deadline && (
        <p className="text-xs text-slate-500 mb-4">
          📅 Due {(() => {
            const d = project.deadline.toDate ? project.deadline.toDate() : new Date(project.deadline);
            return !isNaN(d) ? format(d, 'MMM d, yyyy') : 'Invalid Date';
          })()}
        </p>
      )}

      {/* AI Next Action */}
      {project.status === 'active' && (
        <div className="p-3 rounded-lg bg-primary-50 mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-primary-700 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Next Action
            </span>
            <button
              onClick={() => onRefreshSuggestion(project)}
              className="p-1 hover:bg-primary-100 rounded transition-colors"
              title="Refresh suggestion"
            >
              <RefreshCw className={`w-3 h-3 text-primary-600 ${nextAction === null ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-sm text-primary-900">
            {nextAction === null ? 'Generating...' : nextAction || 'Loading suggestion...'}
          </p>
        </div>
      )}

      <div className="flex gap-2 pt-4 border-t border-gray-100">
        {project.status !== 'active' && (
          <button
            onClick={() => onStatusChange(project, 'active')}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <Play className="w-4 h-4" /> Activate
          </button>
        )}
        {project.status === 'active' && (
          <button
            onClick={() => onStatusChange(project, 'paused')}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
          >
            <Pause className="w-4 h-4" /> Pause
          </button>
        )}
        {project.status !== 'completed' && (
          <button
            onClick={() => onStatusChange(project, 'completed')}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <CheckCircle className="w-4 h-4" /> Complete
          </button>
        )}
      </div>
    </div>
  );
}
