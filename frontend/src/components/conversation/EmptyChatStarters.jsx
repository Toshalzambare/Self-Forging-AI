import React from 'react';
import { APP_NAME } from '../../config.js';

const EmptyChatStarters = ({ onSelectPrompt }) => {
  const starters = [
    {
      title: 'Text Analysis & Metrics',
      prompt: 'Analyze a block of text to calculate word frequency, reading difficulty score, and extract the top keywords.',
      icon: 'analytics',
      color: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30',
    },
    {
      title: 'Generate Custom Math Tool',
      prompt: 'Calculate the monthly mortgage payments and total interest for a $450,000 loan at 6.5% interest over 30 years.',
      icon: 'calculate',
      color: 'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30',
    },
    {
      title: 'Data Parsing & Extraction',
      prompt: 'Parse this raw log text, extract all error occurrences, and group them by HTTP status code.',
      icon: 'data_object',
      color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
    },
    {
      title: 'Statistical Analysis Tool',
      prompt: 'Calculate the mean, median, standard deviation, and 95th percentile for a series of system latency values.',
      icon: 'query_stats',
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 text-center max-w-2xl mx-auto my-auto animate-fadeIn">
      {/* Brand Icon */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-blue-500/10 border border-indigo-500/30 flex items-center justify-center shadow-2xl shadow-indigo-500/10 mb-4">
        <span className="material-symbols-outlined text-[32px] text-indigo-400 material-symbols-fill">
          auto_awesome
        </span>
      </div>

      <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
        Welcome to {APP_NAME}
      </h2>
      <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md">
        Ask any task. If the capability does not exist, the agent will autonomously forge, test in Docker, and register the tool for you.
      </p>

      {/* Starter Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full text-left">
        {starters.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectPrompt(item.prompt)}
            className="p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition group flex flex-col justify-between text-left active:scale-[0.98]"
          >
            <div className="flex items-center space-x-2.5 mb-2">
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${item.color} border flex items-center justify-center`}>
                <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
              </div>
              <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition">
                {item.title}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
              {item.prompt}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmptyChatStarters;
