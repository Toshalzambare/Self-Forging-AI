import { Terminal, Download, Trash2, Maximize2 } from 'lucide-react';

export default function Logs() {
  return (
    <div className="h-full flex flex-col bg-[#0B0F17]">
      <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 pl-14 md:pl-6 bg-[#0B0F17]">
        <div className="flex items-center gap-2">
          <Terminal size={18} className="text-[#06B6D4]" />
          <span className="font-medium">Activity & Logs</span>
        </div>
        <div className="flex gap-2">
          <button className="p-1.5 text-gray-400 hover:text-white rounded bg-[#1A2234] border border-white/5"><Download size={16}/></button>
          <button className="p-1.5 text-gray-400 hover:text-red-400 rounded bg-[#1A2234] border border-white/5"><Trash2 size={16}/></button>
        </div>
      </div>

      <div className="p-4 border-b border-white/5 flex gap-2 overflow-x-auto">
        {['ALL', 'INFO', 'DOCKER', 'TEST', 'ERRORS'].map(f => (
          <button key={f} className={`px-3 py-1 text-xs font-mono rounded-md border ${
            f === 'ALL' ? 'bg-[#06B6D4]/10 text-[#06B6D4] border-[#06B6D4]/20' : 'bg-[#1A2234] text-gray-400 border-white/5 hover:text-gray-200'
          }`}>
            {f}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-[#070A10] p-6 font-mono text-sm leading-relaxed overflow-y-auto custom-scrollbar text-gray-300">
        <div className="text-gray-500 mb-4">-- LOGS STREAM STARTED --</div>
        <div className="hover:bg-white/[0.02] px-2 py-1 -mx-2 rounded"><span className="text-gray-500">[14:21:00.000]</span> <span className="text-[#10B981]">[SYSTEM]</span> Agent core initialized.</div>
        <div className="hover:bg-white/[0.02] px-2 py-1 -mx-2 rounded"><span className="text-gray-500">[14:21:05.123]</span> <span className="text-[#8B5CF6]">[FORGE]</span> Dispatching new tool generation task.</div>
        <div className="hover:bg-white/[0.02] px-2 py-1 -mx-2 rounded"><span className="text-gray-500">[14:21:10.444]</span> <span className="text-[#06B6D4]">[DOCKER]</span> Sandbox isolated network created: bridge_sandbox_net</div>
        <div className="hover:bg-white/[0.02] px-2 py-1 -mx-2 rounded text-[#EF4444]"><span className="text-gray-500">[14:21:12.891]</span> [TEST] PyTest failed: AssertionError: Expected 200, got 403</div>
        <div className="hover:bg-white/[0.02] px-2 py-1 -mx-2 rounded"><span className="text-gray-500">[14:21:13.002]</span> <span className="text-[#8B5CF6]">[REPAIR]</span> Analyzing error stack trace and patching...</div>
        <div className="hover:bg-white/[0.02] px-2 py-1 -mx-2 rounded"><span className="text-gray-500">[14:21:18.991]</span> <span className="text-[#10B981]">[TEST]</span> 4/4 Integration suites passed.</div>
      </div>
    </div>
  );
}
