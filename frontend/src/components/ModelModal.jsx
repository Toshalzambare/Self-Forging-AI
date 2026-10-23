import React, { useState, useEffect } from 'react';

const PRESET_MODELS = [
  {
    id: 'auto',
    name: 'OmniRoute Auto',
    badge: 'Default',
    description: 'Intelligent routing based on task complexity and budget.',
  },
  {
    id: 'auto/claude-haiku',
    name: 'Claude 3.5 Haiku',
    badge: 'Fast & Light',
    description: 'Ultra-low latency for rapid iteration, testing, and extraction.',
  },
  {
    id: 'auto/claude-sonnet',
    name: 'Claude 3.7 Sonnet',
    badge: 'Recommended',
    description: 'Top-tier coding, structured autonomous reasoning, and tool forge.',
  },
  {
    id: 'auto/best-coding',
    name: 'Best Coding Engine',
    badge: 'High Accuracy',
    description: 'Multi-model ensemble optimized for Python code generation & pytest.',
  },
  {
    id: 'auto/best-reasoning',
    name: 'Deep Reasoning',
    badge: 'Complex Logic',
    description: 'Specialized for multi-step algorithmic derivation and self-repair.',
  },
];

const ModelModal = ({ isOpen, onClose, selectedModel, onSelectModel }) => {
  const [modelInput, setModelInput] = useState(selectedModel || 'auto');

  useEffect(() => {
    if (isOpen) {
      setModelInput(selectedModel || 'auto');
    }
  }, [isOpen, selectedModel]);

  if (!isOpen) return null;

  const handleApply = () => {
    const finalModel = modelInput.trim() || 'auto';
    onSelectModel(finalModel);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container-low border border-outline-variant/40 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in duration-150">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-container/20 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">neurology</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Intelligence Model</h3>
              <p className="text-xs text-on-surface-variant">Select a preset or type any custom LLM identifier</p>
            </div>
          </div>
          <button className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors" onClick={onClose}>
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Custom Model Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant flex items-center justify-between">
            <span>Custom Model Identifier</span>
            <span className="text-[11px] text-primary lowercase font-mono">active: {modelInput || 'auto'}</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              placeholder="e.g. claude-3-5-haiku-20241022 or gpt-4o or auto"
              className="w-full bg-surface-container-lowest border border-outline-variant/50 focus:border-primary rounded-xl px-3.5 py-2.5 text-sm font-mono text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors"
            />
            {modelInput && (
              <button
                type="button"
                onClick={() => setModelInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs px-1.5 py-0.5 rounded"
              >
                Clear
              </button>
            )}
          </div>
          <p className="text-[11px] text-on-surface-variant">
            You can type any model supported by your OmniRoute or LLM proxy configuration.
          </p>
        </div>

        {/* Preset Cards */}
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Quick Presets</span>
          <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
            {PRESET_MODELS.map((preset) => {
              const isSelected = modelInput.toLowerCase() === preset.id.toLowerCase();
              return (
                <div
                  key={preset.id}
                  onClick={() => setModelInput(preset.id)}
                  className={`flex items-start p-3 rounded-xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-surface-container border-primary/60 shadow-sm'
                      : 'bg-surface-container-lowest/60 border-outline-variant/30 hover:border-outline-variant/60 hover:bg-surface-container/50'
                  }`}
                >
                  <div className="mt-0.5 mr-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-on-primary" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-on-surface truncate">{preset.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                        {preset.badge}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5 truncate">{preset.description}</p>
                    <code className="text-[10px] text-secondary font-mono mt-1 block">{preset.id}</code>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row justify-end pt-3 gap-2 sm:space-x-2 border-t border-outline-variant/20">
          <button
            className="px-4 py-2 rounded-xl text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors order-2 sm:order-1"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-5 py-2 rounded-xl bg-primary text-on-primary font-medium text-sm hover:bg-primary-container transition-all order-1 sm:order-2 shadow-sm flex items-center justify-center space-x-1.5"
            onClick={handleApply}
          >
            <span>Apply Model</span>
            <span className="material-symbols-outlined text-[16px]">check</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModelModal;
