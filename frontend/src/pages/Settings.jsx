import { Settings, Shield, Server, Box } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="h-full flex flex-col bg-[#0B0F17] overflow-y-auto">
      <div className="h-14 border-b border-white/5 flex items-center px-6 pl-14 md:pl-6 bg-[#0B0F17] sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-[#06B6D4]" />
          <span className="font-medium">API & Settings</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full p-6 space-y-8 py-8">
        
        {/* LLM Config */}
        <div className="space-y-4">
          <h2 className="text-sm font-mono text-[#06B6D4] uppercase tracking-widest flex items-center gap-2">
            <Server size={14}/> LLM Routing
          </h2>
          <div className="bg-[#111827] border border-white/5 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2">OMNIROUTE_BASE_URL</label>
              <input type="text" defaultValue="http://192.168.1.3:20128/v1" className="w-full bg-[#1A2234] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:border-[#06B6D4] outline-none font-mono" />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2">API KEY</label>
              <input type="password" defaultValue="••••••••••••••••" className="w-full bg-[#1A2234] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:border-[#06B6D4] outline-none font-mono" />
            </div>
          </div>
        </div>

        {/* Sandbox Config */}
        <div className="space-y-4">
          <h2 className="text-sm font-mono text-[#10B981] uppercase tracking-widest flex items-center gap-2">
            <Box size={14}/> Sandbox Security
          </h2>
          <div className="bg-[#111827] border border-white/5 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#1A2234] rounded-lg border border-white/5">
              <div>
                <div className="text-sm text-gray-200 font-medium">VPC Isolation</div>
                <div className="text-xs text-gray-400 mt-1">Block external network access for generated tools during testing</div>
              </div>
              <div className="w-12 h-6 bg-[#10B981]/20 rounded-full relative cursor-pointer border border-[#10B981]/30">
                <div className="w-5 h-5 bg-[#10B981] rounded-full absolute right-0.5 top-0.5 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2">TIMEOUT (SECONDS)</label>
                <input type="number" defaultValue="60" className="w-full bg-[#1A2234] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:border-[#06B6D4] outline-none font-mono" />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2">MEMORY LIMIT</label>
                <input type="text" defaultValue="512m" className="w-full bg-[#1A2234] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:border-[#06B6D4] outline-none font-mono" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button className="px-6 py-2.5 bg-[#06B6D4] text-[#0B0F17] rounded-lg text-sm font-bold hover:bg-[#22D3EE] transition-all shadow-[0_0_12px_rgba(6,182,212,0.25)]">
            Save Configuration
          </button>
        </div>

      </div>
    </div>
  );
}
