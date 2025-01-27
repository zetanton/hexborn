import React, { useEffect, useRef } from 'react';
import { Game } from './game/Game';
import { Sword } from 'lucide-react';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);

  useEffect(() => {
    if (containerRef.current && !gameRef.current) {
      gameRef.current = new Game(containerRef.current);
    }
  }, []);

  return (
    <div className="relative w-full h-screen">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* HUD */}
      <div className="absolute top-4 left-4 bg-black/50 text-white p-4 rounded">
        <div className="flex items-center gap-2">
          <Sword className="w-6 h-6" />
          <span className="text-xl font-bold">Zedd's Adventure</span>
        </div>
        <div className="mt-2">
          <p>WASD - Move</p>
          <p>Space - Attack</p>
        </div>
      </div>
    </div>
  );
}

export default App;