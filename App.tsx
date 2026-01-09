import React from 'react';
import { useLiveSession } from './hooks/use-live-api';
import Visualizer from './components/Visualizer';

const App: React.FC = () => {
  const { status, connect, disconnect, volume } = useLiveSession();

  const handleToggle = () => {
    if (status === 'connected' || status === 'connecting') {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Navigation / Header */}
      <header className="px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">A</span>
            </div>
            <span className="font-semibold text-xl tracking-tight text-slate-800">ASPEN</span>
        </div>
        <div className="text-xs font-medium px-3 py-1 bg-slate-100 rounded-full text-slate-500 uppercase tracking-wide">
          Boulder, CO
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center p-6 relative overflow-hidden">
        
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-30">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-80 h-80 bg-cyan-100 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="z-10 text-center max-w-2xl w-full flex flex-col items-center space-y-8">
            
            {/* Persona Introduction */}
            <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
                    Elevate Your Performance
                </h1>
                <p className="text-lg text-slate-600 max-w-lg mx-auto">
                    Speak with Aspen, your dedicated performance coordinator. From recovery protocols to training schedules, we're here to optimize your potential.
                </p>
            </div>

            {/* Visualizer & Interaction Area */}
            <div className="py-8">
                <Visualizer volume={volume} isActive={status === 'connected'} />
            </div>

            {/* Status Indicator */}
            <div className="flex items-center space-x-2 text-sm font-medium">
                <span className={`w-2.5 h-2.5 rounded-full ${
                    status === 'connected' ? 'bg-emerald-500' :
                    status === 'connecting' ? 'bg-amber-500 animate-pulse' :
                    status === 'error' ? 'bg-red-500' : 'bg-slate-300'
                }`}></span>
                <span className="text-slate-500 uppercase tracking-wider text-xs">
                    {status === 'disconnected' && 'Ready to Connect'}
                    {status === 'connecting' && 'Connecting to Aspen...'}
                    {status === 'connected' && 'Live Session Active'}
                    {status === 'error' && 'Connection Failed'}
                </span>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center space-y-4 w-full">
                <button
                    onClick={handleToggle}
                    disabled={status === 'connecting'}
                    className={`
                        relative px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 shadow-lg transform active:scale-95
                        ${status === 'connected' 
                            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 ring-2 ring-red-100' 
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-500/30 ring-4 ring-emerald-50'
                        }
                    `}
                >
                    {status === 'connected' ? 'End Session' : 'Start Conversation'}
                </button>
                
                {status === 'disconnected' && (
                    <p className="text-xs text-slate-400 italic">
                        Microphone access required.
                    </p>
                )}
            </div>

            {/* Feature Highlights (Knowledge Base Hints) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-12 pt-12 border-t border-slate-200">
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-slate-100 text-left shadow-sm">
                    <h3 className="font-semibold text-emerald-800 mb-1">Recovery Suite</h3>
                    <p className="text-xs text-slate-600">Contrast therapy, infrared saunas, and cold plunge protocols.</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-slate-100 text-left shadow-sm">
                    <h3 className="font-semibold text-emerald-800 mb-1">Elite Training</h3>
                    <p className="text-xs text-slate-600">Expert coaches like Sarah (Mobility) and Mike (Strength).</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-slate-100 text-left shadow-sm">
                    <h3 className="font-semibold text-emerald-800 mb-1">$100 Trial</h3>
                    <p className="text-xs text-slate-600">First-month unlimited access to all amenities.</p>
                </div>
            </div>

        </div>
      </main>
    </div>
  );
};

export default App;
