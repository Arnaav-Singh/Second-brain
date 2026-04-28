import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { projectsService, tasksService, studySessionsService, energyDaysService } from '../services/firestore';
import { format, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { FolderKanban, CheckSquare, BookOpen, TrendingUp, ArrowRight, Clock, Zap, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import StudyRiskRadar from '../components/StudyRiskRadar';

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [studyStats, setStudyStats] = useState({ today: 0, week: 0 });
  const [energyDebt, setEnergyDebt] = useState(null);
  const [todayEnergy, setTodayEnergy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [projectsData, tasksData, studyData, energyDays, todayEnergyData] = await Promise.all([
        projectsService.getActive(user.uid),
        tasksService.getPending(user.uid),
        getStudyStats(),
        energyDaysService.getRecentDays(user.uid, 7),
        energyDaysService.getByDate(user.uid, new Date()),
      ]);
      setProjects(projectsData);
      setTasks(tasksData.slice(0, 5));
      setStudyStats(studyData);
      setEnergyDebt(energyDaysService.calculateEnergyDebt(energyDays));
      setTodayEnergy(todayEnergyData?.type || null);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStudyStats = async () => {
    const today = new Date();
    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);

    const sessions = await studySessionsService.getByDateRange(user.uid, weekStart, weekEnd);

    const todayMinutes = sessions
      .filter(s => isSameDay(s.date?.toDate(), today))
      .reduce((sum, s) => sum + (s.duration || 0), 0);

    const weekMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);

    return { today: todayMinutes, week: weekMinutes };
  };

  const getPandaStatus = () => {
    if (studyStats.today >= 120) return { mood: 'Happy', message: "Great job! I'm well-fed!" };
    if (studyStats.today >= 60) return { mood: 'Content', message: 'Good progress, keep going!' };
    return { mood: 'Hungry', message: "Let's study together!" };
  };

  const panda = getPandaStatus();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 border-3 rounded-full animate-spin"
            style={{
              borderColor: 'color-mix(in srgb, var(--theme-primary) 30%, transparent)',
              borderTopColor: 'var(--theme-primary)'
            }}
          />
          <p className="text-slate-400 text-sm">Loading your brain...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}! 👋
          </h1>
          <p className="mt-1 text-slate-400">
            Here's what's happening with your Second Brain today.
          </p>
        </div>

        {/* Panda Status Card */}
        <div className="flex items-center gap-4">
          <Link
            to="/focus"
            className="px-4 py-2 font-semibold rounded-xl transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, var(--theme-primary-light), var(--theme-primary))',
              color: 'var(--theme-bg-main)'
            }}
          >
            🎯 Focus Mode
          </Link>
          <div
            className="flex items-center gap-4 px-5 py-3 rounded-2xl"
            style={{
              background: 'color-mix(in srgb, var(--theme-primary) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--theme-primary) 20%, transparent)'
            }}
          >
            <img src="/images/panda.png" alt="Panda" className="w-12 h-12 rounded-xl object-cover" />
            <div>
              <p className="font-semibold text-white">{panda.mood} Panda</p>
              <p className="text-sm text-slate-400">{panda.message}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Energy Debt Warning */}
      {energyDebt?.isAtRisk && (
        <div
          className="p-4 rounded-xl flex items-center gap-3"
          style={{
            background: energyDebt.severity === 'high' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)',
            border: `1px solid ${energyDebt.severity === 'high' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
          }}
        >
          <AlertTriangle className={`w-6 h-6 flex-shrink-0 ${energyDebt.severity === 'high' ? 'text-red-400' : 'text-yellow-400'}`} />
          <div>
            <h3 className={`font-semibold ${energyDebt.severity === 'high' ? 'text-red-400' : 'text-yellow-400'}`}>
              ⚡ Energy Debt Detected ({energyDebt.consecutiveHighDays} days)
            </h3>
            <p className="text-sm text-slate-400">{energyDebt.message}</p>
          </div>
        </div>
      )}

      {/* Quick Actions Row: Study Risk + Energy Logger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Study Risk Radar */}
        <StudyRiskRadar />

        {/* Today's Energy Logger */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: 'var(--theme-primary-light)' }} />
              Today's Energy
            </h3>
            {todayEnergy && (
              <span className="text-xs text-slate-400">Tagged</span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: 'deep_work', emoji: '🧠', label: 'Deep' },
              { value: 'low_energy', emoji: '😴', label: 'Low' },
              { value: 'admin', emoji: '📋', label: 'Admin' },
              { value: 'social', emoji: '👥', label: 'Social' },
            ].map(({ value, emoji, label }) => (
              <button
                key={value}
                onClick={async () => {
                  await energyDaysService.createOrUpdate(user.uid, new Date(), { type: value });
                  setTodayEnergy(value);
                }}
                className="p-3 rounded-xl text-center transition-all"
                style={todayEnergy === value ? {
                  background: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)',
                  border: '2px solid var(--theme-primary)',
                } : {
                  background: 'var(--theme-bg-main)',
                  border: '2px solid transparent',
                }}
              >
                <div className="text-xl mb-1">{emoji}</div>
                <div className={`text-xs ${todayEnergy === value ? 'text-white' : 'text-slate-400'}`}>{label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Active Projects */}
        <div className="card group cursor-pointer transition-all" style={{ '--hover-border': 'var(--theme-primary)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Active Projects</p>
              <p className="mt-2 text-3xl font-bold text-white">{projects.length}</p>
              <p className="mt-1 text-xs text-slate-500">of 3 max</p>
            </div>
            <div
              className="p-3 rounded-xl"
              style={{ background: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)' }}
            >
              <FolderKanban className="w-6 h-6" style={{ color: 'var(--theme-primary-light)' }} />
            </div>
          </div>
          <div
            className="mt-4 pt-4"
            style={{ borderTop: '1px solid var(--theme-bg-card-hover)' }}
          >
            <Link
              to="/projects"
              className="flex items-center text-sm font-medium hover:opacity-80"
              style={{ color: 'var(--theme-primary-light)' }}
            >
              View all projects
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="card group cursor-pointer transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Pending Tasks</p>
              <p className="mt-2 text-3xl font-bold text-white">{tasks.length}</p>
              <p className="mt-1 text-xs text-slate-500">to complete</p>
            </div>
            <div className="p-3 bg-emerald-500/20 rounded-xl">
              <CheckSquare className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <div
            className="mt-4 pt-4"
            style={{ borderTop: '1px solid var(--theme-bg-card-hover)' }}
          >
            <Link
              to="/tasks"
              className="flex items-center text-sm font-medium hover:opacity-80"
              style={{ color: 'var(--theme-primary-light)' }}
            >
              Manage tasks
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Study Today */}
        <div className="card group cursor-pointer transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Study Today</p>
              <p className="mt-2 text-3xl font-bold text-white">{studyStats.today}<span className="text-lg font-normal text-slate-500">m</span></p>
              <p className="mt-1 text-xs text-slate-500">keep it up!</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <div
            className="mt-4 pt-4"
            style={{ borderTop: '1px solid var(--theme-bg-card-hover)' }}
          >
            <Link
              to="/study"
              className="flex items-center text-sm font-medium hover:opacity-80"
              style={{ color: 'var(--theme-primary-light)' }}
            >
              Log session
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="card group cursor-pointer transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">This Week</p>
              <p className="mt-2 text-3xl font-bold text-white">{Math.round(studyStats.week / 60)}<span className="text-lg font-normal text-slate-500">h</span></p>
              <p className="mt-1 text-xs text-slate-500">total study time</p>
            </div>
            <div className="p-3 bg-orange-500/20 rounded-xl">
              <Zap className="w-6 h-6 text-orange-400" />
            </div>
          </div>
          <div
            className="mt-4 pt-4"
            style={{ borderTop: '1px solid var(--theme-bg-card-hover)' }}
          >
            <Link
              to="/metrics"
              className="flex items-center text-sm font-medium hover:opacity-80"
              style={{ color: 'var(--theme-primary-light)' }}
            >
              View metrics
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Projects */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Active Projects</h2>
            <Link
              to="/projects"
              className="text-sm font-medium hover:opacity-80"
              style={{ color: 'var(--theme-primary-light)' }}
            >
              View all
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ background: 'var(--theme-bg-main)' }}
              >
                <FolderKanban className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-slate-400 mb-3">No active projects yet</p>
              <Link
                to="/projects"
                className="text-sm font-medium hover:opacity-80"
                style={{ color: 'var(--theme-primary-light)' }}
              >
                Create your first project →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project, index) => (
                <div
                  key={project.id}
                  className="flex items-start gap-4 p-4 rounded-xl transition-colors"
                  style={{
                    background: 'var(--theme-bg-main)',
                    border: '1px solid transparent'
                  }}
                >
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-lg text-xl"
                    style={{ background: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)' }}
                  >
                    {index === 0 ? '🎯' : index === 1 ? '🚀' : '💡'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">{project.title}</h3>
                    <p className="text-sm text-slate-400 truncate">{project.one_line_objective}</p>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${project.energy_required === 'high'
                    ? 'bg-red-500/20 text-red-400'
                    : project.energy_required === 'medium'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-green-500/20 text-green-400'
                    }`}>
                    {project.energy_required}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Tasks */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Upcoming Tasks</h2>
            <Link
              to="/tasks"
              className="text-sm font-medium hover:opacity-80"
              style={{ color: 'var(--theme-primary-light)' }}
            >
              View all
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ background: 'var(--theme-bg-main)' }}
              >
                <CheckSquare className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-slate-400 mb-3">No pending tasks</p>
              <Link
                to="/tasks"
                className="text-sm font-medium hover:opacity-80"
                style={{ color: 'var(--theme-primary-light)' }}
              >
                Add your first task →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-4 rounded-xl transition-colors"
                  style={{
                    background: 'var(--theme-bg-main)',
                    border: '1px solid transparent'
                  }}
                >
                  <div className={`w-3 h-3 rounded-full ${task.priority === 'high'
                    ? 'bg-red-500'
                    : task.priority === 'medium'
                      ? 'bg-yellow-500'
                      : 'bg-slate-500'
                    }`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">{task.title}</h3>
                    {task.due_date && (
                      <p className="text-sm text-slate-400">
                        Due {format(task.due_date.toDate(), 'MMM d')}
                      </p>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${task.priority === 'high'
                    ? 'bg-red-500/20 text-red-400'
                    : task.priority === 'medium'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-slate-500/20 text-slate-400'
                    }`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
