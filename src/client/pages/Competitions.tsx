import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.ts';
import { Search, Trophy, Calendar as CalendarIcon, ExternalLink, Plus } from 'lucide-react';

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/competitions')
      .then((res: any) => {
        setCompetitions(res.data);
      })
      .catch((err) => {
        console.error("Failed to load competitions:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Competitions</h2>
          <p className="text-neutral-500 mt-1">Discover and manage hackathons and challenges.</p>
        </div>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center transition-colors">
          <Plus className="w-4 h-4 mr-2" />
          Add Manual
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-neutral-500">Loading competitions...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {competitions.map((comp) => (
            <div key={comp.id} className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-primary-300 transition-all shadow-sm group flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200 uppercase tracking-wide">
                  {comp.type}
                </span>
                <span className="text-sm font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                  {comp.prize_fund || "TBA"}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-neutral-900 leading-tight mb-2 group-hover:text-primary-700 transition-colors">
                {comp.title}
              </h3>
              
              <p className="text-sm text-neutral-500 mb-4 line-clamp-2">
                Organized by <span className="font-medium text-neutral-700">{comp.organizer}</span>
              </p>

              <div className="mt-auto pt-4 border-t border-neutral-100 flex items-center justify-between">
                <div className="flex items-center text-xs font-medium text-neutral-500">
                  <CalendarIcon className="w-4 h-4 mr-1.5" />
                  {comp.deadline ? new Date(comp.deadline).toLocaleDateString() : "No deadline"}
                </div>
                
                {comp.official_url && (
                  <a href={comp.official_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:text-primary-800 p-1.5 hover:bg-primary-50 rounded-md transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
          {competitions.length === 0 && (
            <div className="col-span-full p-12 text-center border border-dashed border-neutral-300 rounded-xl text-neutral-500 bg-neutral-50/50">
              No competitions found. Try triggering the scraper.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
