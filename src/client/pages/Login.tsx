import React from 'react';
import { useAuthStore } from '../store/auth.ts';
import { Navigate } from 'react-router-dom';

export function Login() {
  const { login } = useAuthStore();

  const handleMockLogin = () => {
    login(
      { id: '1', name: 'Mock User', email: 'mock@example.com', role: 'admin' },
      'mock-token'
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-neutral-100 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-2">TeamTrack</h1>
        <p className="text-neutral-500 mb-8">Sign in to your account</p>
        <button
          onClick={handleMockLogin}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
        >
          Dev Login (Mock)
        </button>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
