import React from 'react';

const ForgeStateBanner = ({ state, repairAttempts = 0 }) => {
  if (!state) return null;

  const stateConfigs = {
    detecting: {
      icon: 'psychology',
      label: 'Analyzing Capability Gap',
      desc: 'Checking local tools registry before forging new code...',
      bg: 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300',
      iconColor: 'text-indigo-400',
      animate: 'animate-pulse',
    },
    forging: {
      icon: 'code_blocks',
      label: 'Autonomous Tool Forging',
      desc: 'Synthesizing Python module and JSON input schemas...',
      bg: 'bg-purple-950/40 border-purple-500/30 text-purple-300',
      iconColor: 'text-purple-400',
      animate: 'animate-spin',
    },
    testing: {
      icon: 'science',
      label: 'Adversarial Sandbox Testing',
      desc: 'Executing isolated pytest suite in pre-cached Docker container...',
      bg: 'bg-amber-950/40 border-amber-500/30 text-amber-300',
      iconColor: 'text-amber-400',
      animate: 'animate-bounce',
    },
    repairing: {
      icon: 'build_circle',
      label: `Self-Repair Loop (Attempt ${repairAttempts}/3)`,
      desc: 'Analyzing error stacktrace and rewriting failing Python code...',
      bg: 'bg-orange-950/40 border-orange-500/30 text-orange-300',
      iconColor: 'text-orange-400',
      animate: 'animate-spin',
    },
    verified: {
      icon: 'verified',
      label: 'Dual-Gate Verification Passed',
      desc: 'Tool passed all edge-case tests and is admitted to your MCP registry.',
      bg: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300',
      iconColor: 'text-emerald-400',
      animate: '',
    },
    failed: {
      icon: 'gpp_bad',
      label: 'Verification Gate Failed',
      desc: 'Tool did not pass adversarial constraints after maximum retries.',
      bg: 'bg-rose-950/40 border-rose-500/30 text-rose-300',
      iconColor: 'text-rose-400',
      animate: '',
    },
  };

  const config = stateConfigs[state] || stateConfigs.detecting;

  return (
    <div className={`flex items-start space-x-3 p-3.5 rounded-2xl border ${config.bg} backdrop-blur-md mb-4 animate-fadeIn shadow-lg`}>
      <span className={`material-symbols-outlined text-[22px] flex-shrink-0 ${config.iconColor} ${config.animate}`}>
        {config.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold tracking-tight">{config.label}</div>
        <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{config.desc}</div>
      </div>
    </div>
  );
};

export default ForgeStateBanner;
