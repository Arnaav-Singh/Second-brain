import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { onboardingService } from './services/firestore';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Actions from './pages/Actions';
import Tasks from './pages/Tasks';
import Timetable from './pages/Timetable';
import StudyTracker from './pages/StudyTracker';
import WeeklyReview from './pages/WeeklyReview';
import Metrics from './pages/Metrics';
import Settings from './pages/Settings';
import DailyFocus from './pages/DailyFocus';
import ShutdownRitual from './pages/ShutdownRitual';
import Layout from './components/Layout';
import OnboardingWalkthrough from './components/OnboardingWalkthrough';
import MonthlyResetModal from './components/MonthlyResetModal';

function App() {
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Check onboarding status when user logs in
  useEffect(() => {
    const checkOnboarding = async () => {
      if (user) {
        try {
          const status = await onboardingService.getStatus(user.uid);
          setShowOnboarding(!status.hasCompleted);
        } catch (error) {
          console.error('Error checking onboarding:', error);
          setShowOnboarding(false);
        }
      }
      setCheckingOnboarding(false);
    };

    if (!loading) {
      checkOnboarding();
    }
  }, [user, loading]);

  if (loading || (user && checkingOnboarding)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--theme-bg-main)' }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 border-3 rounded-full animate-spin"
            style={{
              borderColor: 'color-mix(in srgb, var(--theme-primary) 30%, transparent)',
              borderTopColor: 'var(--theme-primary)'
            }}
          />
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <MonthlyResetModal />

      {/* Onboarding Walkthrough for first-time users */}
      {user && showOnboarding && (
        <OnboardingWalkthrough onComplete={() => setShowOnboarding(false)} />
      )}

      <Router>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
          <Route path="/focus" element={user ? <DailyFocus /> : <Navigate to="/login" />} />
          <Route path="/shutdown" element={user ? <ShutdownRitual /> : <Navigate to="/login" />} />
          <Route
            path="/"
            element={user ? <Layout /> : <Navigate to="/login" />}
          >
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="actions" element={<Actions />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="timetable" element={<Timetable />} />
            <Route path="study" element={<StudyTracker />} />
            <Route path="review" element={<WeeklyReview />} />
            <Route path="metrics" element={<Metrics />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;
