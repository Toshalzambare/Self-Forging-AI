import React, { useState, useEffect, useRef } from 'react';

const ModelModal = ({ isOpen, onClose, selectedModel, onSelectModel }) => {
      const [current, setCurrent] = useState(selectedModel);
      if (!isOpen) return null;

      return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-low border border-outline-variant/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary-container/20 border border-primary/30 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">neurology</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Select Intelligence Model</h3>
              </div>
              <button className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface" onClick={onClose}>
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-2.5">
              <label 
                onClick={() => setCurrent('Claude 3.7 Sonnet')}
                className={`flex items-start p-3 rounded-xl cursor-pointer transition-colors ${
                  current === 'Claude 3.7 Sonnet' 
                    ? 'bg-surface-container border border-primary/40' 
                    : 'bg-surface-container-low border border-outline-variant/30 hover:bg-surface-container'
                }`}
              >
                <input
                  type="radio"
                  name="modelChoice"
                  checked={current === 'Claude 3.7 Sonnet'}
                  onChange={() => setCurrent('Claude 3.7 Sonnet')}
                  className="mt-1 text-primary focus:ring-0"
                />
                <div className="ml-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-body-md text-body-md font-semibold text-on-surface">Claude 3.7 Sonnet (Hybrid)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-medium">Recommended</span>
                  </div>
                  <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">Top-tier coding, structured autonomous reasoning, and tool orchestration.</p>
                </div>
              </label>

              <label 
                onClick={() => setCurrent('Claude 3.5 Haiku')}
                className={`flex items-start p-3 rounded-xl cursor-pointer transition-colors ${
                  current === 'Claude 3.5 Haiku' 
                    ? 'bg-surface-container border border-primary/40' 
                    : 'bg-surface-container-low border border-outline-variant/30 hover:bg-surface-container'
                }`}
              >
                <input
                  type="radio"
                  name="modelChoice"
                  checked={current === 'Claude 3.5 Haiku'}
                  onChange={() => setCurrent('Claude 3.5 Haiku')}
                  className="mt-1 text-primary focus:ring-0"
                />
                <div className="ml-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-body-md text-body-md font-semibold text-on-surface">Claude 3.5 Haiku</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-container-highest text-secondary font-medium">Fast &amp; Light</span>
                  </div>
                  <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">Ultra-low latency for quick queries, lightweight summarization, and small tasks.</p>
                </div>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row justify-end pt-3 sm:pt-2 gap-2 sm:space-x-2 border-t border-outline-variant/20">
              <button
                className="px-4 py-2 sm:py-1.5 rounded-xl font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors order-2 sm:order-1"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 sm:py-1.5 rounded-xl bg-primary text-on-primary font-medium font-body-sm text-body-sm hover:bg-primary-container transition-all order-1 sm:order-2 shadow-sm"
                onClick={() => {
                  onSelectModel(current);
                  onClose();
                }}
              >
                Apply Model
              </button>
            </div>
          </div>
        </div>
      );
    };

export default ModelModal;
