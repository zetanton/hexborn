import * as THREE from 'three';
import { Character } from '../entities/Character';
import { Monster } from '../entities/Monster';
import { Overworld } from '../levels/Overworld';
import { CharacterController } from '../controls/CharacterController';
import { CollisionManager } from '../physics/CollisionManager';
import { SoundManager } from '../audio/SoundManager';

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

  constructor(container: HTMLElement) {
    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue

    // Initialize sound
    SoundManager.getInstance().initialize()
      .then(() => SoundManager.getInstance().playTheme('overworld'))
      .catch(console.error);

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
      const monster = new Monster(position);
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
    
    this.monsters.forEach(monster => {
        monster.setTarget(this.character.mesh.position);
        monster.update(delta, this.currentLevel.getGroundHeight(monster.mesh.position));
    });

    this.updateCamera();
    
    // Handle entity collisions using collision manager
    const currentBiome = this.currentLevel.getBiomeAt(this.character.mesh.position);
    this.collisionManager.handleCollisions(currentBiome);

    // Render scene
    this.renderer.render(this.scene, this.camera);
  };
}