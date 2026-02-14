'use client';

export default function AIConfigPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-xl font-bold text-white">AI Configuration</h2>
      <div className="glass-dark rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Global System Prompt</label>
          <textarea rows={5} defaultValue="You are Aimin AI Assistant, a helpful customer support bot for WhatsApp businesses. Be concise, friendly, and helpful." className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-brand-500 resize-none font-mono" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Model</label>
          <select className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-brand-500">
            <option>default (vLLM)</option>
            <option>gpt-4</option>
            <option>claude-3</option>
          </select>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Temperature</label>
            <input type="number" defaultValue="0.7" step="0.1" min="0" max="2" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-brand-500 font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Max Tokens</label>
            <input type="number" defaultValue="512" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-brand-500 font-mono" />
          </div>
        </div>
        <button className="bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors">Save Configuration</button>
      </div>
    </div>
  );
}
