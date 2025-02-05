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
  private readonly VERTICAL_LIMIT = Math.PI / 3; // 60 degrees limit
  private isPointerLocked: boolean = false;
  private collisionManager: CollisionManager;
  private debugMode: boolean = true;
  private debugUIVisible: boolean = false;
  private debugUIPanel: HTMLDivElement | null = null;

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

    // Initialize monsters (after character)
    this.monsters = [];
    this.spawnMonsters(5);

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
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    // Directional light (sun)
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(50, 50, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    this.scene.add(sunLight);
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

  private spawnMonsters(count: number) {
    const safeRadius = 15; // Minimum distance from player
    const maxRadius = 20; // Maximum spawn distance

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2; // Evenly distribute around circle
      const distance = safeRadius + Math.random() * (maxRadius - safeRadius);
      const position = new THREE.Vector3(
        Math.cos(angle) * distance,
        0.75, // Set to same height as character
        Math.sin(angle) * distance
      );
      const monster = new RedLurker(position);
      this.monsters.push(monster);
      this.scene.add(monster.mesh);
    }
  }

  private updateCamera() {
    // Calculate camera position based on character position and rotation
    const targetPosition = this.character.mesh.position.clone();
    
    // Calculate camera offset with vertical angle
    const horizontalDistance = Math.cos(this.cameraVerticalAngle) * this.CAMERA_DISTANCE;
    const verticalOffset = Math.sin(this.cameraVerticalAngle) * this.CAMERA_DISTANCE;
    
    const cameraOffset = new THREE.Vector3(
      Math.sin(this.cameraRotation) * horizontalDistance,
      this.CAMERA_HEIGHT + verticalOffset,
      Math.cos(this.cameraRotation) * horizontalDistance
    );
    
    // Smoothly interpolate camera position
    this.camera.position.lerp(targetPosition.add(cameraOffset), 0.1);
    
    // Look at character's head level
    const lookTarget = this.character.mesh.position.clone();
    lookTarget.y += 0.75;
    this.camera.lookAt(lookTarget);
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
    this.debugUIPanel.innerHTML = '<strong>Debug Teleport Panel</strong><br>Press number keys (1-9) to teleport to a biome.';
    document.body.appendChild(this.debugUIPanel);

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

  private animate = () => {
    requestAnimationFrame(this.animate);

    const delta = 1/60;

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
    
    // Update monsters
    this.monsters.forEach(monster => {
        monster.setTarget(this.character);
        monster.update(delta, this.currentLevel.getGroundHeight(monster.mesh.position));
    });

    // Update biome-specific entities (like trolls)
    const currentBiome = this.currentLevel.getBiomeAt(this.character.mesh.position);
    if (currentBiome) {
        if (currentBiome instanceof MountainBiome || currentBiome instanceof SwampBiome) {
            currentBiome.update(delta, this.character.mesh.position, this.character);
        }
    }

    // Update environment effects (fog, etc.)
    this.currentLevel.updateEnvironment(this.character.mesh.position);

    this.updateCamera();
    
    // Handle entity collisions using collision manager
    this.collisionManager.handleCollisions(currentBiome);

    // Render scene
    this.renderer.render(this.scene, this.camera);
  };
}