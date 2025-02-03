import { useEffect, useRef, useState } from 'react';
import { Game } from './game/Game';
import { StartScreen } from './components/StartScreen';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    if (containerRef.current && gameStarted && !gameRef.current) {
      gameRef.current = new Game(containerRef.current);
    }
  }, [gameStarted]);

  const handleStartGame = () => {
    setGameStarted(true);
  };

  if (!gameStarted) {
    return <StartScreen onStart={handleStartGame} />;
  }

  return (
    <div className="relative w-full h-screen">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

export default App;