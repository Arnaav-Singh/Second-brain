import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Brain,
  LayoutDashboard,
  FolderKanban,
  Inbox,
  CheckSquare,
  Calendar,
  BookOpen,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/projects', label: 'Projects', icon: FolderKanban },
    { path: '/actions', label: 'Actions', icon: Inbox },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare },
    { path: '/timetable', label: 'Timetable', icon: Calendar },
    { path: '/study', label: 'Study', icon: BookOpen },
    { path: '/review', label: 'Review', icon: FileText },
    { path: '/metrics', label: 'Metrics', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--theme-bg-main)' }}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        style={{
          background: 'var(--theme-bg-card)',
          borderRight: '1px solid var(--theme-bg-card-hover)'
        }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div
            className="flex items-center gap-3 px-6 h-16"
            style={{ borderBottom: '1px solid var(--theme-bg-card-hover)' }}
          >
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl shadow-lg"
              style={{
                background: 'linear-gradient(135deg, var(--theme-primary-light), var(--theme-primary))',
                boxShadow: '0 4px 14px color-mix(in srgb, var(--theme-primary) 30%, transparent)'
              }}
            >
              <Brain className="w-5 h-5" style={{ color: 'var(--theme-bg-main)' }} />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Second Brain</h1>
              <p className="text-xs text-slate-400">Personal OS</p>
            </div>
            {/* Mobile close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden ml-auto p-1 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                  style={isActive ? {
                    background: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)',
                    color: 'var(--theme-primary-light)'
                  } : {
                    color: '#94a3b8'
                  }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={isActive ? { color: 'var(--theme-primary-light)' } : {}}
                  />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Panda companion */}
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--theme-bg-card-hover)' }}>
            <div
              className="flex items-center gap-3 p-2 rounded-xl"
              style={{ background: 'var(--theme-bg-main)' }}
            >
              <img
                src="/images/panda.png"
                alt="Study Panda"
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div>
                <p className="text-sm font-medium text-white">Study Panda</p>
                <p className="text-xs text-slate-400">Your study buddy</p>
              </div>
            </div>
          </div>

          {/* User section */}
          <div className="p-4" style={{ borderTop: '1px solid var(--theme-bg-card-hover)' }}>
            <div
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'var(--theme-bg-main)' }}
            >
              <div
                className="flex items-center justify-center w-9 h-9 rounded-lg font-semibold text-sm"
                style={{
                  background: 'linear-gradient(135deg, var(--theme-primary-light), var(--theme-primary))',
                  color: 'var(--theme-bg-main)'
                }}
              >
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user?.email || 'user@email.com'}
                </p>
              </div>
              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 h-16 backdrop-blur-lg px-4 lg:px-8 flex items-center justify-between"
          style={{
            background: 'color-mix(in srgb, var(--theme-bg-main) 80%, transparent)',
            borderBottom: '1px solid var(--theme-bg-card)'
          }}
        >
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg"
            style={{ '--hover-bg': 'var(--theme-bg-card)' }}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page indicator */}
          <div className="hidden lg:flex items-center gap-2 text-sm">
            <span className="text-slate-400">Welcome back,</span>
            <span className="font-medium text-white">{user?.email?.split('@')[0] || 'User'}</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{
                background: 'color-mix(in srgb, var(--theme-primary) 10%, transparent)',
                color: 'var(--theme-primary-light)',
                border: '1px solid color-mix(in srgb, var(--theme-primary) 20%, transparent)'
              }}
            >
              <img src="/images/panda.png" alt="Panda" className="w-5 h-5 rounded-full" />
              <span>Panda</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
