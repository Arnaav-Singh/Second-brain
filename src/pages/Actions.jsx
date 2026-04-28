import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { actionsService, projectsService } from '../services/firestore';
import { classifyAction } from '../services/gemini';
import { Plus, Inbox, Clock, Archive, Sparkles, X, Trash2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export default function Actions() {
  const { user } = useAuth();
  const [actions, setActions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [newAction, setNewAction] = useState('');
  const [activeTab, setActiveTab] = useState('inbox');

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [actionsData, projectsData] = await Promise.all([
        actionsService.getAll(user.uid),
        projectsService.getAll(user.uid),
      ]);
      setActions(actionsData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newAction.trim()) return;

    setProcessing(true);
    try {
      let classification = { urgency: 'medium', suggestedProject: null, shouldArchive: false };

      try {
        const result = await classifyAction(newAction);
        if (result) classification = result;
      } catch (aiError) {
        console.error('AI classification failed:', aiError);
      }

      await actionsService.create(user.uid, {
        text: newAction,
        status: classification.shouldArchive ? 'archived' : 'inbox',
        urgency: classification.urgency,
        suggested_project: classification.suggestedProject,
        created_at: new Date(),
      });

      setNewAction('');
      setShowModal(false);
      loadData();
    } catch (error) {
      alert('Error adding action');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await actionsService.update(id, { status });
      loadData();
    } catch (error) {
      alert('Error updating action');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this action?')) {
      try {
        await actionsService.delete(id);
        loadData();
      } catch (error) {
        alert('Error deleting action');
      }
    }
  };

  const getProjectName = (id) => projects.find((p) => p.id === id)?.title;

  const getUrgencyConfig = (urgency) => {
    switch (urgency) {
      case 'high': return { color: 'bg-red-100 text-red-700', label: '🔴 High' };
      case 'medium': return { color: 'bg-yellow-100 text-yellow-700', label: '🟡 Medium' };
      default: return { color: 'bg-green-100 text-green-700', label: '🟢 Low' };
    }
  };

  const inboxActions = actions.filter((a) => a.status === 'inbox');
  const scheduledActions = actions.filter((a) => a.status === 'scheduled');
  const archivedActions = actions.filter((a) => a.status === 'archived');

  const getCurrentActions = () => {
    switch (activeTab) {
      case 'inbox': return inboxActions;
      case 'scheduled': return scheduledActions;
      case 'archived': return archivedActions;
      default: return inboxActions;
    }
  };

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
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Action Funnel</h1>
          <p className="mt-1 text-slate-400">Capture → Classify → Execute</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Capture Action
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-primary-600">{inboxActions.length}</div>
          <p className="text-sm text-slate-400 mt-1">Inbox</p>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-yellow-600">{scheduledActions.length}</div>
          <p className="text-sm text-slate-400 mt-1">Scheduled</p>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-slate-500">{archivedActions.length}</div>
          <p className="text-sm text-slate-400 mt-1">Archived</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
        {[
          { value: 'inbox', label: 'Inbox', icon: Inbox, count: inboxActions.length },
          { value: 'scheduled', label: 'Scheduled', icon: Clock, count: scheduledActions.length },
          { value: 'archived', label: 'Archived', icon: Archive, count: archivedActions.length },
        ].map(({ value, label, icon: Icon, count }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === value
                ? 'bg-white text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-300'
              }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {count > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${activeTab === value ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-slate-400'
                }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Action List */}
      <div className="space-y-3">
        {getCurrentActions().map((action) => {
          const urgencyConfig = getUrgencyConfig(action.urgency);
          const projectName = getProjectName(action.suggested_project);

          return (
            <div key={action.id} className="card p-4 flex items-start gap-4 group">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white">{action.text}</p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${urgencyConfig.color}`}>
                    {urgencyConfig.label}
                  </span>
                  {projectName && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary-50 text-primary-700">
                      📁 {projectName}
                    </span>
                  )}
                  {action.created_at && (
                    <span className="text-xs text-slate-500">
                      {format(action.created_at.toDate(), 'MMM d, h:mm a')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {activeTab === 'inbox' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(action.id, 'scheduled')}
                      className="p-2 hover:bg-yellow-50 rounded-lg transition-colors"
                      title="Schedule"
                    >
                      <Clock className="w-4 h-4 text-yellow-600" />
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(action.id, 'archived')}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Archive"
                    >
                      <Archive className="w-4 h-4 text-slate-400" />
                    </button>
                  </>
                )}
                {activeTab === 'scheduled' && (
                  <button
                    onClick={() => handleUpdateStatus(action.id, 'inbox')}
                    className="p-2 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Move to Inbox"
                  >
                    <Inbox className="w-4 h-4 text-primary-600" />
                  </button>
                )}
                {activeTab === 'archived' && (
                  <button
                    onClick={() => handleUpdateStatus(action.id, 'inbox')}
                    className="p-2 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Restore"
                  >
                    <ArrowRight className="w-4 h-4 text-primary-600" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(action.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {getCurrentActions().length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            {activeTab === 'inbox' ? <Inbox className="w-8 h-8 text-slate-500" /> :
              activeTab === 'scheduled' ? <Clock className="w-8 h-8 text-slate-500" /> :
                <Archive className="w-8 h-8 text-slate-500" />}
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {activeTab === 'inbox' ? 'Inbox is empty' :
              activeTab === 'scheduled' ? 'No scheduled actions' : 'Nothing archived'}
          </h3>
          <p className="text-slate-400 mb-6">
            {activeTab === 'inbox' ? 'Capture new actions to process them here' :
              activeTab === 'scheduled' ? 'Schedule actions from your inbox' : 'Archive completed or irrelevant actions'}
          </p>
          {activeTab === 'inbox' && (
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Capture Action
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => !processing && setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Capture Action</h2>
              <button
                onClick={() => setShowModal(false)}
                disabled={processing}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  What's on your mind?
                </label>
                <textarea
                  required
                  rows="3"
                  className="input"
                  placeholder="Describe the action, task, or idea..."
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  disabled={processing}
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl text-sm text-primary-700">
                <Sparkles className="w-4 h-4 flex-shrink-0" />
                <p>AI will classify urgency and suggest a project automatically</p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={processing}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={processing} className="btn-primary">
                  {processing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Capture
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
