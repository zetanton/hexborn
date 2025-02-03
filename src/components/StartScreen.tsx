import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CityBiome } from '../levels/biomes/CityBiome';
import { Character } from '../entities/Character';
import { Sparkles, Compass } from 'lucide-react';
import { SoundManager } from '../audio/SoundManager';

class StartScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private character: Character;
  private cityBiome: CityBiome;
  private particles: THREE.Points;
  private time: number = 0;
  private lastFrameTime: number = 0;
  private readonly FRAME_TIME = 1000 / 30; // ms per frame

  constructor(container: HTMLElement) {
    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(50, 30, 80);
    this.camera.lookAt(0, 0, 0);

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMappingExposure = 0.7;
    container.appendChild(this.renderer.domElement);

    // Setup lighting
    this.setupLighting();

    // Create city biome
    this.cityBiome = new CityBiome(this.scene, new THREE.Vector2(0, 0), new THREE.Vector2(300, 300));
    this.cityBiome.generate();

    // Initialize character close to camera
    this.character = new Character();
    const initialCameraPos = new THREE.Vector3(50, 30, 80); // Match camera's initial position
    const directionFromCamera = new THREE.Vector3(0, 0, -1); // Point slightly in front
    this.character.mesh.position.copy(initialCameraPos).add(directionFromCamera.multiplyScalar(15));
    this.character.mesh.scale.setScalar(2.5);
    this.character.mesh.castShadow = true;
    this.scene.add(this.character.mesh);

    // Add fog
    this.scene.fog = new THREE.FogExp2(0x000000, 0.0045);

    // Setup particles
    this.particles = this.setupParticles();
    this.scene.add(this.particles);

    // Start animation
    this.animate(performance.now());
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x111111, 0.3);
    this.scene.add(ambientLight);

    const moonLight = new THREE.DirectionalLight(0x3366ff, 0.2);
    moonLight.position.set(100, 100, 100);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    this.scene.add(moonLight);
  }

  private setupParticles(): THREE.Points {
    const particleCount = 3000;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    // Initialize particles in a larger volume around the camera
    const cameraPos = this.camera.position;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radiusFromCamera = 30 + Math.random() * 80; // Wider radius
      const height = Math.random() * 50; // Higher spread

      positions[i * 3] = cameraPos.x + Math.cos(angle) * radiusFromCamera;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = cameraPos.z + Math.sin(angle) * radiusFromCamera;

      // Ethereal blue-white colors
      colors[i * 3] = 0.5 + Math.random() * 0.2;     // More blue
      colors[i * 3 + 1] = 0.7 + Math.random() * 0.3; // More brightness
      colors[i * 3 + 2] = 0.9 + Math.random() * 0.1; // Lots of blue
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.4, // Slightly larger particles
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });

    return new THREE.Points(particles, particleMaterial);
  }

  private animate = (currentTime: number) => {
    requestAnimationFrame(this.animate);

    // Control frame rate
    const deltaTime = currentTime - this.lastFrameTime;
    if (deltaTime < this.FRAME_TIME) {
      return;
    }
    this.lastFrameTime = currentTime;

    this.time += 0.002;

    // Camera movement
    const radius = 60;
    const height = 15 + Math.sin(this.time * 0.2) * 1;
    this.camera.position.x = Math.cos(this.time * 0.1) * radius;
    this.camera.position.z = Math.sin(this.time * 0.1) * radius;
    this.camera.position.y = height;
    this.camera.lookAt(0, 5, 0);

    // Position character
    if (this.character) {
      // Calculate the animation progress (from 0 to 1 over 8 seconds)
      
      // Calculate target position in front of camera, but lower
      const cameraDirection = new THREE.Vector3(0, -2, 0).sub(this.camera.position).normalize();
      const targetPosition = new THREE.Vector3()
        .copy(this.camera.position)
        .add(cameraDirection.multiplyScalar(15)); // Keep character 15 units in front
      targetPosition.y -= 5; // Move character 5 units lower than the camera's target point
      
      // Smoothly move character
      this.character.mesh.position.lerp(targetPosition, 0.1);
      
      // Make character face the camera
      this.character.mesh.lookAt(this.camera.position);
      
      // Update character physics
      this.character.update(0.016, this.character.mesh.position.y);
    }

    // Particle animation with camera-relative positioning
    const positions = this.particles.geometry.attributes.position.array as Float32Array;
    const cameraPos = this.camera.position;
    
    for (let i = 0; i < positions.length / 3; i++) {
      const idx = i * 3;
      
      // Move particles up and add wobble
      positions[idx + 1] += Math.sin(this.time + i) * 0.02;
      
      // Check if particle is too far from camera
      const particlePos = new THREE.Vector3(
        positions[idx],
        positions[idx + 1],
        positions[idx + 2]
      );
      
      const distanceToCamera = particlePos.distanceTo(cameraPos);
      
      // If particle is too far or too high, reset it to a random position near the camera
      if (distanceToCamera > 150 || positions[idx + 1] > height + 40) { // Increased range
        const angle = Math.random() * Math.PI * 2;
        const radiusFromCamera = 30 + Math.random() * 80; // Wider spread
        
        positions[idx] = cameraPos.x + Math.cos(angle) * radiusFromCamera;
        positions[idx + 1] = Math.random() * height * 1.5; // Higher spread
        positions[idx + 2] = cameraPos.z + Math.sin(angle) * radiusFromCamera;
      }
      
      // Add more pronounced swirling motion
      positions[idx] += Math.sin(this.time + i) * 0.015;
      positions[idx + 2] += Math.cos(this.time + i) * 0.015;
    }
    
    this.particles.geometry.attributes.position.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  };

  public handleResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  public cleanup() {
    // Cleanup resources
    this.renderer.dispose();
  }
}

export function StartScreen({ onStart }: { onStart: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<StartScene | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSoundInitialized, setIsSoundInitialized] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    sceneRef.current = new StartScene(containerRef.current);
    setIsLoading(false);

    // Initialize sound manager but don't play yet
    SoundManager.getInstance().initialize()
      .then(() => setIsSoundInitialized(true))
      .catch(console.error);

    const scene = sceneRef.current;
    window.addEventListener('resize', scene.handleResize);

    return () => {
      if (scene) {
        window.removeEventListener('resize', scene.handleResize);
        scene.cleanup();
      }
      SoundManager.getInstance().stopAll();
    };
  }, []);

  // Handle first interaction
  const handleFirstInteraction = async () => {
    if (isSoundInitialized) {
      try {
        await SoundManager.getInstance().playTheme('theme');
      } catch (error) {
        console.error('Failed to play theme:', error);
      }
    }
  };

  const handleStartClick = async () => {
    SoundManager.getInstance().stopAll();
    onStart();
  };

  return (
    <div 
      className="relative w-full h-screen overflow-hidden"
      onClick={handleFirstInteraction}
    >
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* Magical overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-emerald-900/30" />
      
      {/* Content */}
      <div className="absolute inset-0 flex">
        {/* Left side - Menu */}
        <div className="w-1/2 p-12 flex flex-col justify-center items-start space-y-8">
          <div className="space-y-4">
            <h1 className="text-7xl font-bold text-white tracking-tight">
              <span className="bg-gradient-to-r from-emerald-400 to-purple-500 text-transparent bg-clip-text">
                Hexborn
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-md">
              Master the arcane arts in a world where magic and mystery collide.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleStartClick}
              disabled={isLoading}
              className="group relative px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-emerald-500 to-purple-600 rounded-lg overflow-hidden transition-all hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-white/20 transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform" />
              <span className="relative flex items-center gap-2">
                {isLoading ? (
                  "Loading..."
                ) : (
                  <>
                    Begin Journey <Compass className="w-5 h-5" />
                  </>
                )}
              </span>
            </button>

            <button className="px-8 py-4 text-lg font-semibold text-emerald-400 bg-black/50 rounded-lg border border-emerald-500/50 transition-all hover:bg-black/70 hover:border-emerald-400 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Tutorial
            </button>
          </div>
        </div>

        {/* Right side - Empty space for 3D scene */}
        <div className="w-1/2" />
      </div>

      {/* Magical runes */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-emerald-500/30" />
        <div className="absolute top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-purple-500/30" />
        <div className="absolute bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-purple-500/30" />
        <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-emerald-500/30" />
      </div>
    </div>
  );
} 