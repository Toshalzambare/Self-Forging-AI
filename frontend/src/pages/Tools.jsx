import { Wrench, CheckCircle2, XCircle, Search } from 'lucide-react';

export default function Tools() {
  const tools = [
    { name: 'web_search', desc: 'Search the internet via DuckDuckGo', status: 'active', calls: 142 },
    { name: 'read_url', desc: 'Extract clean markdown from any URL', status: 'active', calls: 89 },
    { name: 'webhook_validator', desc: 'HMAC SHA-256 webhook validator', status: 'testing', calls: 0 },
    { name: 'csv_analyzer', desc: 'Pandas data analysis agent', status: 'error', calls: 12 },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0B0F17]">
      <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 pl-14 md:pl-6 bg-[#0B0F17]">
        <div className="flex items-center gap-2">
          <Wrench size={18} className="text-[#06B6D4]" />
          <span className="font-medium">Ecosystem & Tools</span>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search registry..." 
              className="w-full bg-[#1A2234] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:border-[#06B6D4] outline-none text-gray-200"
            />
          </div>
          <button className="px-4 py-2 bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/20 rounded-lg text-sm font-medium hover:bg-[#06B6D4]/20 transition-all">
            Refresh Registry
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <div key={tool.name} className="bg-[#111827] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all">
              <div className="flex justify-between items-start mb-3">
                <div className="font-mono text-sm text-gray-200">{tool.name}</div>
                {tool.status === 'active' && <CheckCircle2 size={16} className="text-[#10B981]" />}
                {tool.status === 'testing' && <div className="w-4 h-4 rounded-full border-2 border-[#F59E0B] border-t-transparent animate-spin" />}
                {tool.status === 'error' && <XCircle size={16} className="text-[#EF4444]" />}
              </div>
              <p className="text-sm text-gray-400 mb-4 h-10">{tool.desc}</p>
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-xs font-mono text-gray-500">{tool.calls} INVOCATIONS</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                  tool.status === 'active' ? 'bg-[#10B981]/10 text-[#10B981]' :
                  tool.status === 'testing' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                  'bg-[#EF4444]/10 text-[#EF4444]'
                }`}>
                  {tool.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
