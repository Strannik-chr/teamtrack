import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.ts';
import { FolderKanban, Plus, Clock, MoreVertical, Calendar } from 'lucide-react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/projects')
      .then((res: any) => {
        setProjects(res.data);
      })
      .catch((err) => {
        console.error("Failed to load projects:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Projects</h2>
          <p className="text-neutral-500 mt-1">Manage active projects and hackathon submissions.</p>
        </div>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center transition-colors shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-neutral-500">Loading projects...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {projects.map((proj) => (
            <div key={proj.id} className="bg-white border border-neutral-200 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 leading-tight">{proj.name}</h3>
                  <div className="flex items-center mt-2 space-x-3">
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200 uppercase tracking-wider">
                      {proj.status.replace('_', ' ')}
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-100 uppercase tracking-wider">
                      {proj.priority} Priority
                    </span>
                  </div>
                </div>
                <button className="p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 rounded-md transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-neutral-600 mb-6 line-clamp-2">
                {proj.description || "No description provided."}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                <div className="flex -space-x-2">
                  {/* Mock avatars */}
                  {[...Array(Math.min(3, proj.members?.length || 1))].map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700 z-10">
                      U
                    </div>
                  ))}
                  {(proj.members?.length || 1) > 3 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-600 z-0">
                      +{(proj.members?.length || 1) - 3}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center text-xs font-medium text-neutral-500">
                  <Calendar className="w-4 h-4 mr-1.5" />
                  {proj.deadline_at ? new Date(proj.deadline_at).toLocaleDateString() : "No deadline"}
                </div>
              </div>
            </div>
          ))}
          
          {projects.length === 0 && (
            <div className="col-span-full p-16 text-center border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
              <FolderKanban className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-1">No active projects</h3>
              <p className="text-neutral-500 mb-6 max-w-sm mx-auto">Get started by creating a new project or joining an existing one.</p>
              <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
                Create Project
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
