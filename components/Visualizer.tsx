import React from 'react';

interface VisualizerProps {
  volume: number; // 0 to 255
  isActive: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ volume, isActive }) => {
  // Create a few bars or circles that scale with volume
  const scale = isActive ? 1 + (volume / 255) * 1.5 : 1;
  const opacity = isActive ? 0.6 + (volume / 255) * 0.4 : 0.3;
  
  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Outer Pulse */}
      <div 
        className="absolute w-full h-full rounded-full bg-teal-500 blur-xl transition-all duration-75 ease-out"
        style={{ 
            transform: `scale(${isActive ? 1 + (volume / 500) : 0.8})`,
            opacity: isActive ? (volume / 600) : 0
        }}
      />
      
      {/* Middle Ring */}
      <div 
        className="absolute w-48 h-48 rounded-full border-4 border-teal-200 transition-all duration-100 ease-out"
        style={{
            transform: `scale(${scale * 0.9})`,
            opacity: opacity
        }}
      />
      
      {/* Inner Core */}
      <div 
        className={`relative z-10 w-32 h-32 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
            isActive ? 'bg-gradient-to-br from-teal-400 to-emerald-600' : 'bg-gray-300'
        }`}
        style={{
            transform: `scale(${isActive ? 1 + (volume / 800) : 1})`
        }}
      >
         {isActive ? (
             <svg className="w-12 h-12 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
             </svg>
         ) : (
            <svg className="w-12 h-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
         )}
      </div>
    </div>
  );
};

export default Visualizer;
