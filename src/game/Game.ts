import * as THREE from 'three';
import { Character } from '../entities/Character';
import { Monster } from '../entities/Monster';
import { RedLurker } from '../entities/RedLurker';
import { Overworld } from '../levels/Overworld';
import { CharacterController } from '../controls/CharacterController';
import { CollisionManager } from '../physics/CollisionManager';
import { SoundManager } from '../audio/SoundManager';
import { MountainBiome } from '../levels/biomes/MountainBiome';
import { SwampBiome } from '../levels/biomes/SwampBiome';
import { CityBiome } from '../levels/biomes/CityBiome';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private character: Character;
  private characterController: CharacterController;
  private monsters: Monster[];
  private currentLevel: Overworld;
  private cameraRotation: number = 0;
  private cameraVerticalAngle: number = 0;
  private readonly CAMERA_DISTANCE = 8;
  private readonly CAMERA_HEIGHT = 3;
  private readonly MOUSE_SENSITIVITY = 0.002;
  private readonly VERTICAL_LIMIT = Math.PI / 4; // Reduced to 45 degrees to prevent looking too far down
  private isPointerLocked: boolean = false;
  private collisionManager: CollisionManager;
  private debugMode: boolean = true;
  private debugUIVisible: boolean = false;
  private debugUIPanel: HTMLDivElement | null = null;

  // Day/Night cycle properties
  private readonly DAY_LENGTH = 600; // 10 minutes in seconds
  private readonly DAY_HALF = 300; // 5 minutes in seconds
  private dayTime: number = 0;
  private ambientLight: THREE.AmbientLight = new THREE.AmbientLight(0x404040, 0.5);
  private sunLight: THREE.DirectionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  private readonly DAY_SKY_COLOR = new THREE.Color(0x87ceeb); // Sky blue
  private readonly NIGHT_SKY_COLOR = new THREE.Color(0x1a1a2a); // Dark blue
  private readonly DAY_AMBIENT_INTENSITY = 0.5;
  private readonly NIGHT_AMBIENT_INTENSITY = 0.05; // Much darker at night
  private readonly DAY_SUN_INTENSITY = 1.0;
  private readonly NIGHT_SUN_INTENSITY = 0.05; // Much less moonlight

  // Time control functions
  private updateTimeDisplay: () => void = () => {};
  private isTimePaused: () => boolean = () => false;
  private readonly VISIBILITY_RANGE = 1500; // Match the value from Overworld.ts

  constructor(container: HTMLElement) {
    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue

    // Initialize sound
    SoundManager.getInstance().initialize()
      .then(() => SoundManager.getInstance().playTheme('overworld'))
      .catch(() => {/* Handle sound initialization error silently */});

    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, this.CAMERA_HEIGHT, this.CAMERA_DISTANCE);

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Initialize lighting
    this.setupLighting();

    // Create level
    this.currentLevel = new Overworld(this.scene);

    // Initialize character at the center of the clearing
    this.character = new Character();
    this.character.mesh.position.set(0, 0.75, 0);
    this.character.mesh.castShadow = true;
    this.scene.add(this.character.mesh);

    // Initialize character controller
    this.characterController = new CharacterController(this.character);

    // Initialize monsters array (will be populated by biomes)
    this.monsters = [];

    // Initialize collision manager with both character and monsters
    this.collisionManager = new CollisionManager(this.character, this.monsters);

    // Handle window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Setup mouse controls
    this.setupMouseControls(container);

    // Setup debug controls for teleporting to biomes
    this.setupDebugControls();

    // Start game loop
    this.animate();
  }

  private setupLighting() {
    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0x404040, this.DAY_AMBIENT_INTENSITY);
    this.scene.add(this.ambientLight);

    // Directional light (sun)
    this.sunLight = new THREE.DirectionalLight(0xffffff, this.DAY_SUN_INTENSITY);
    this.sunLight.position.set(50, 50, 50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.camera.left = -50;
    this.sunLight.shadow.camera.right = 50;
    this.sunLight.shadow.camera.top = 50;
    this.sunLight.shadow.camera.bottom = -50;
    this.scene.add(this.sunLight);
  }

  private setupMouseControls(container: HTMLElement) {
    // Handle pointer lock
    container.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        container.requestPointerLock();
      }
    });

    // Handle pointer lock change
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === container;
    });

    // Handle mouse movement
    document.addEventListener('mousemove', (event) => {
      if (this.isPointerLocked) {
        // Horizontal rotation
        this.cameraRotation -= event.movementX * this.MOUSE_SENSITIVITY;
        
        // Vertical rotation (clamped)
        this.cameraVerticalAngle = Math.max(
          -this.VERTICAL_LIMIT,
          Math.min(
            this.VERTICAL_LIMIT,
            this.cameraVerticalAngle + event.movementY * this.MOUSE_SENSITIVITY
          )
        );
        
        // Update character rotation to match camera
        this.character.mesh.rotation.y = this.cameraRotation;
        
        // Update character controller's movement direction based on camera rotation
        this.characterController.updateCameraRotation(this.cameraRotation);
      }
    });
  }

  private setupDebugControls(): void {
    if (!this.debugMode) return;

    // Create a simple debug UI panel
    this.debugUIPanel = document.createElement('div');
    this.debugUIPanel.style.position = 'absolute';
    this.debugUIPanel.style.top = '10px';
    this.debugUIPanel.style.left = '10px';
    this.debugUIPanel.style.padding = '10px';
    this.debugUIPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.debugUIPanel.style.color = 'white';
    this.debugUIPanel.style.fontFamily = 'monospace';
    this.debugUIPanel.style.display = 'none';
    document.body.appendChild(this.debugUIPanel);

    // Create health display element
    const healthDisplay = document.createElement('div');
    healthDisplay.id = 'debug-health-display';
    healthDisplay.style.marginBottom = '10px';
    this.debugUIPanel.appendChild(healthDisplay);

    // Add time control section
    const timeSection = document.createElement('div');
    timeSection.style.marginBottom = '10px';
    timeSection.innerHTML = `
      <strong>Time Controls</strong><br>
      <div id="time-display">Time: 00:00</div>
      <button id="toggle-time">Pause Time</button>
      <button id="set-noon">Set to Noon</button>
      <button id="set-midnight">Set to Midnight</button>
      <input type="range" id="time-slider" min="0" max="${this.DAY_LENGTH}" value="0" style="width: 200px">
    `;
    this.debugUIPanel.appendChild(timeSection);

    // Add teleport instructions
    const teleportInstructions = document.createElement('div');
    teleportInstructions.innerHTML = '<strong>Debug Teleport Panel</strong><br>Press number keys (1-9) to teleport to a biome.';
    this.debugUIPanel.appendChild(teleportInstructions);

    // Time control variables
    let isTimePaused = false;

    // Time control event listeners
    const timeDisplay = timeSection.querySelector('#time-display') as HTMLDivElement;
    const timeSlider = timeSection.querySelector('#time-slider') as HTMLInputElement;
    const toggleButton = timeSection.querySelector('#toggle-time') as HTMLButtonElement;
    const noonButton = timeSection.querySelector('#set-noon') as HTMLButtonElement;
    const midnightButton = timeSection.querySelector('#set-midnight') as HTMLButtonElement;

    toggleButton.addEventListener('click', () => {
      isTimePaused = !isTimePaused;
      toggleButton.textContent = isTimePaused ? 'Resume Time' : 'Pause Time';
    });

    noonButton.addEventListener('click', () => {
      this.dayTime = this.DAY_LENGTH * 0.25; // 25% through the cycle
      timeSlider.value = this.dayTime.toString();
    });

    midnightButton.addEventListener('click', () => {
      this.dayTime = this.DAY_LENGTH * 0.75; // 75% through the cycle
      timeSlider.value = this.dayTime.toString();
    });

    timeSlider.addEventListener('input', () => {
      this.dayTime = parseFloat(timeSlider.value);
    });

    // Update time display in animate loop
    this.updateTimeDisplay = () => {
      if (!this.debugUIVisible) return;
      
      // Update slider
      timeSlider.value = this.dayTime.toString();
      
      // Update time display
      const minutes = Math.floor(this.dayTime / 60);
      const seconds = Math.floor(this.dayTime % 60);
      const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      timeDisplay.textContent = `Time: ${timeString}`;
    };

    // Store pause state for use in updateDayNightCycle
    this.isTimePaused = () => isTimePaused;

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      const key = e.key;
      // Toggle debug UI panel with backtick (`) key
      if(key === '`') {
         this.debugUIVisible = !this.debugUIVisible;
         if (this.debugUIPanel) {
            this.debugUIPanel.style.display = this.debugUIVisible ? 'block' : 'none';
         }
         return;
      }
      
      // Only process teleportation if the debug UI panel is open
      if (!this.debugUIVisible) return;
      
      // If key is between '1' and '9'
      if (key >= '1' && key <= '9') {
        const biomeIndex = parseInt(key) - 1;
        const biomes = this.currentLevel.getBiomes();
        if (biomes && biomeIndex < biomes.length) {
          const biome = biomes[biomeIndex];
          const pos2D = biome.getPosition();
          const groundY = this.currentLevel.getGroundHeight(new THREE.Vector3(pos2D.x, 0, pos2D.y));
          let warpX = pos2D.x;
          let warpY = groundY + 0.75;
          let warpZ = pos2D.y;
          // If the biome is a MountainBiome, adjust warp based on biome index
          if (biome instanceof MountainBiome) {
            if (biomeIndex === 4) {
              warpX = pos2D.x + 150; // Warp to the very edge for Mountain Biome 5
            } else {
              warpY = groundY + 50;
            }
          }
          this.character.mesh.position.set(warpX, warpY, warpZ);
          this.character.getVelocity().set(0, 0, 0);
        }
      }
    });
  }

  private updateDayNightCycle(delta: number) {
    // Only update time if not paused
    if (!this.isTimePaused()) {
      this.dayTime = (this.dayTime + delta) % this.DAY_LENGTH;
    }
    
    // Update debug display
    this.updateTimeDisplay();
    
    // Calculate the time of day progress (0 to 1)
    const timeProgress = this.dayTime / this.DAY_LENGTH;
    
    // Calculate day/night transition factor (0 = full night, 1 = full day)
    let dayFactor: number;
    if (this.dayTime < this.DAY_HALF) {
      // Day time
      dayFactor = Math.min(1, this.dayTime / (this.DAY_HALF * 0.2)); // Transition in first 20% of day
    } else {
      // Night time
      const nightProgress = (this.dayTime - this.DAY_HALF) / this.DAY_HALF;
      dayFactor = Math.max(0, 1 - (nightProgress / 0.2)); // Transition in first 20% of night
    }

    // Update sky color
    const skyColor = new THREE.Color();
    skyColor.copy(this.NIGHT_SKY_COLOR).lerp(this.DAY_SKY_COLOR, dayFactor);
    this.scene.background = skyColor;
    
    // Update fog with increased distance for better visibility of distant biomes
    if (this.scene.fog) {
      const fog = this.scene.fog as THREE.Fog;
      fog.color.copy(skyColor);
      // Adjust fog distances based on time of day
      const dayFogNear = this.VISIBILITY_RANGE * 0.6;
      const dayFogFar = this.VISIBILITY_RANGE * 1.4;
      const nightFogNear = this.VISIBILITY_RANGE * 0.4;
      const nightFogFar = this.VISIBILITY_RANGE * 1.0;
      
      fog.near = THREE.MathUtils.lerp(nightFogNear, dayFogNear, dayFactor);
      fog.far = THREE.MathUtils.lerp(nightFogFar, dayFogFar, dayFactor);
    }

    // Update ambient light
    const ambientIntensity = THREE.MathUtils.lerp(
      this.NIGHT_AMBIENT_INTENSITY,
      this.DAY_AMBIENT_INTENSITY,
      dayFactor
    );
    this.ambientLight.intensity = ambientIntensity;

    // Update sun light
    const sunIntensity = THREE.MathUtils.lerp(
      this.NIGHT_SUN_INTENSITY,
      this.DAY_SUN_INTENSITY,
      dayFactor
    );
    this.sunLight.intensity = sunIntensity;

    // Update sun position for day/night cycle
    const sunAngle = (timeProgress * Math.PI * 2) - Math.PI / 2;
    const sunRadius = 50;
    this.sunLight.position.set(
      Math.cos(sunAngle) * sunRadius,
      Math.sin(sunAngle) * sunRadius,
      50
    );
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const delta = 1/60;

    // Update day/night cycle
    this.updateDayNightCycle(delta);

    // Update debug panel if visible
    if (this.debugUIVisible && this.debugUIPanel) {
      const healthDisplay = this.debugUIPanel.querySelector('#debug-health-display') as HTMLDivElement;
      if (healthDisplay) {
        const health = this.character.getHealth();
        const maxHealth = this.character.getMaxHealth();
        healthDisplay.innerHTML = `Health: ${health}/${maxHealth}`;
        // Color the text based on health percentage
        const healthPercentage = health / maxHealth;
        if (healthPercentage > 0.6) {
          healthDisplay.style.color = '#00ff00'; // Green
        } else if (healthPercentage > 0.3) {
          healthDisplay.style.color = '#ffff00'; // Yellow
        } else {
          healthDisplay.style.color = '#ff0000'; // Red
        }
      }
    }

    // Store current position before updates
    const previousPosition = this.character.mesh.position.clone();

    // Update character controller (this updates velocity)
    this.characterController.update();
    
    // Get the character's collision radius
    const radius = this.character.collisionRadius;
    
    // Calculate next position for collision check
    const velocity = this.character.getVelocity();
    const nextPosition = previousPosition.clone().add(velocity.clone().multiplyScalar(delta));

    // Check boundary collisions using collision manager
    const wouldCollide = this.collisionManager.checkBoundaryCollision(
        nextPosition,
        radius,
        (pos) => this.currentLevel.isPositionValid(pos)
    );

    if (wouldCollide) {
        // If would collide, keep current position
        this.character.mesh.position.copy(previousPosition);
        // Zero out velocity in x and z
        this.character.getVelocity().setX(0).setZ(0);
    } else {
        // If no collision, allow the update
        this.character.update(delta, this.currentLevel.getGroundHeight(nextPosition));
    }

    // Update biome-specific entities and collect monsters
    this.monsters = [];
    const currentBiome = this.currentLevel.getBiomeAt(this.character.mesh.position);
    if (currentBiome) {
        if (currentBiome instanceof MountainBiome) {
            const trolls = currentBiome.getTrolls();
            this.monsters.push(...trolls);
            currentBiome.update(delta, this.character.mesh.position);
        } else if (currentBiome instanceof SwampBiome) {
            const frogs = currentBiome.getFrogs();
            const alligators = currentBiome.getAlligators();
            this.monsters.push(...frogs, ...alligators);
            currentBiome.update(delta, this.character.mesh.position, this.character);
        } else if (currentBiome instanceof CityBiome) {
            const lurkers: RedLurker[] = currentBiome.getRedLurkers();
            this.monsters.push(...lurkers);
            // Update RedLurkers
            lurkers.forEach(lurker => {
                if (!lurker.isTargetingCharacter(this.character)) {
                    const distanceToPlayer = lurker.mesh.position.distanceTo(this.character.mesh.position);
                    if (distanceToPlayer <= lurker.AGGRO_RANGE) {
                        lurker.setTarget(this.character);
                    }
                }
                lurker.update(delta, this.currentLevel.getGroundHeight(lurker.mesh.position));
            });
        }
    }

    // Update collision manager with current monsters
    this.collisionManager = new CollisionManager(this.character, this.monsters);
    
    // Handle entity collisions using collision manager
    this.collisionManager.handleCollisions(currentBiome);

    // Update environment effects (fog, etc.)
    this.currentLevel.updateEnvironment(this.character.mesh.position, this.character);

    this.updateCamera();
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
  };

  private updateCamera() {
    // Calculate camera position based on character position and rotation
    const targetPosition = this.character.mesh.position.clone();
    
    // Calculate camera offset with vertical angle
    const horizontalDistance = Math.cos(this.cameraVerticalAngle) * this.CAMERA_DISTANCE;
    const verticalOffset = Math.sin(this.cameraVerticalAngle) * this.CAMERA_DISTANCE;
    
    const cameraOffset = new THREE.Vector3(
      Math.sin(this.cameraRotation) * horizontalDistance,
      Math.max(1, this.CAMERA_HEIGHT + verticalOffset), // Ensure camera never goes below height of 1
      Math.cos(this.cameraRotation) * horizontalDistance
    );
    
    // Smoothly interpolate camera position
    this.camera.position.lerp(targetPosition.add(cameraOffset), 0.1);
    
    // Look at character's head level
    const lookTarget = this.character.mesh.position.clone();
    lookTarget.y += 0.75;
    this.camera.lookAt(lookTarget);
  }
}