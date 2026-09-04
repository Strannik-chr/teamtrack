import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/Layout.tsx';
import DashboardPage from './pages/Dashboard.tsx';
import CompetitionsPage from './pages/Competitions.tsx';
import ProjectsPage from './pages/Projects.tsx';
import { Login, ProtectedRoute } from './pages/Login.tsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/*" element={
        <ProtectedRoute>
          <AppLayout>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/tasks" element={<div className="p-4 text-neutral-500">Tasks (WIP)</div>} />
              <Route path="/competitions" element={<CompetitionsPage />} />
              <Route path="/team" element={<div className="p-4 text-neutral-500">Team (WIP)</div>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}
