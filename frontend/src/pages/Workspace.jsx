import { useState } from 'react';
import { Send, Zap, Activity, Code2, Play } from 'lucide-react';

export default function Workspace() {
  const [input, setInput] = useState('');

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Left Chat Pane */}
      <div className="flex-1 flex flex-col h-full border-r border-white/5 relative z-10 bg-[#0B0F17]">
        {/* Header */}
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 pl-14 lg:pl-6 bg-[#0B0F17]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Agent Chat</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20">
              Nexus-07
            </span>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
              <span className="text-sm">U</span>
            </div>
            <div className="bg-[#1A2234] p-4 rounded-xl rounded-tl-sm text-sm border border-white/5 text-gray-200">
              Synthesize a high-throughput webhook validator tool with HMAC SHA-256 verification and spin it up in an isolated Docker container with automated healthcheck tests.
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-[#06B6D4]/10 border border-[#06B6D4]/30 flex items-center justify-center shrink-0 text-[#06B6D4]">
              <Zap size={16} />
            </div>
            <div className="flex-1">
              <div className="bg-[#111827] border border-white/5 p-3 rounded-lg mb-2 text-xs font-mono text-gray-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
                Thinking Process (842ms) - Resolving Dependencies...
              </div>
              <div className="text-sm text-gray-300 leading-relaxed">
                <p className="mb-4">I will forge the <code className="text-[#06B6D4] bg-[#06B6D4]/10 px-1 py-0.5 rounded">webhook_validator.py</code> tool. Here is the execution plan:</p>
                <ol className="list-decimal list-inside space-y-1 mb-4 text-gray-400">
                  <li>Compile Tool Code</li>
                  <li>Docker Containerization</li>
                  <li>PyTest Suite Execution</li>
                  <li>Self-Healing Patching (if needed)</li>
                  <li>Tool Registry Activation</li>
                </ol>
                <div className="p-4 bg-[#070A10] rounded-lg border border-white/5 font-mono text-xs overflow-x-auto">
                  <span className="text-[#F59E0B]">import</span> hmac<br/>
                  <span className="text-[#F59E0B]">import</span> hashlib<br/>
                  <br/>
                  <span className="text-[#F59E0B]">def</span> <span className="text-[#22D3EE]">verify_signature</span>(payload, secret, signature):<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;expected = hmac.new(secret, payload, hashlib.sha256).hexdigest()<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#F59E0B]">return</span> hmac.compare_digest(expected, signature)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-white/5 bg-[#0B0F17]">
          <div className="relative">
            <textarea 
              className="w-full bg-[#1A2234] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4] transition-all resize-none text-gray-200"
              rows={2}
              placeholder="Dispatch an autonomous task..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button className="absolute right-3 bottom-3 p-2 bg-[#06B6D4] text-[#0B0F17] rounded-lg hover:bg-[#22D3EE] transition-all shadow-[0_0_12px_rgba(6,182,212,0.25)]">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Right Forge Dashboard */}
      <div className="w-full lg:w-96 border-l border-white/5 bg-[#111827] flex flex-col h-[50vh] lg:h-full">
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#111827]">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-[#10B981]" />
            <span className="text-sm font-medium">Forge Dashboard</span>
          </div>
          <div className="text-[10px] font-mono text-gray-500">WS://127.0.0.1:9092</div>
        </div>

        {/* Pipeline Stepper */}
        <div className="p-4 border-b border-white/5 space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-5 h-5 rounded-full bg-[#10B981]/20 flex items-center justify-center text-[#10B981] text-xs">✓</div>
            <span className="text-gray-300">1. Build Tools (1.2s)</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-5 h-5 rounded-full bg-[#06B6D4]/20 flex items-center justify-center border border-[#06B6D4]">
              <div className="w-2 h-2 bg-[#06B6D4] rounded-full animate-ping" />
            </div>
            <span className="text-[#06B6D4] font-medium">2. Docker Sandbox (Running)</span>
          </div>
          <div className="flex items-center gap-3 text-sm opacity-50">
            <div className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center text-xs text-gray-400">3</div>
            <span className="text-gray-400">3. Test Runner (Queued)</span>
          </div>
        </div>

        {/* Mini Terminal */}
        <div className="flex-1 bg-[#070A10] p-4 font-mono text-[11px] leading-relaxed overflow-y-auto custom-scrollbar">
          <div className="text-gray-500 mb-2">Aegis Telemetry Console v1.0.4</div>
          <div className="text-gray-400">[14:22:01.104] <span className="text-[#8B5CF6]">[FORGE]</span> Compiling schema... OK</div>
          <div className="text-gray-400">[14:22:01.420] <span className="text-[#06B6D4]">[DOCKER]</span> Building image aegis/webhook-val:v1.0</div>
          <div className="text-gray-400">[14:22:02.012] <span className="text-[#06B6D4]">[DOCKER]</span> RUN pip install cryptography</div>
          <div className="text-gray-300 animate-pulse mt-1">_</div>
        </div>
      </div>
    </div>
  );
}
