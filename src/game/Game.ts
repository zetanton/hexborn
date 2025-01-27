import * as THREE from 'three';
import { Character } from '../entities/Character';
import { Monster } from '../entities/Monster';
import { Overworld } from '../levels/Overworld';
import { CharacterController } from '../controls/CharacterController';
import { CityBiome } from '../levels/biomes/CityBiome';
import { ForestBiome } from '../levels/biomes/ForestBiome';

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

  constructor(container: HTMLElement) {
    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue

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

  private handleCollisions() {
    // Get current biome
    const currentBiome = this.currentLevel.getBiomeAt(this.character.mesh.position);
    
    // Quick check if character moved significantly since last frame
    const characterPos = this.character.mesh.position;
    
    // Handle monster collisions
    for (const monster of this.monsters) {
        // Quick distance check before detailed collision
        const dx = characterPos.x - monster.mesh.position.x;
        const dz = characterPos.z - monster.mesh.position.z;
        const quickDist = dx * dx + dz * dz;
        const minDist = (this.character.collisionRadius + monster.collisionRadius) * 2;
        
        if (quickDist < minDist * minDist && this.character.checkCollision(monster)) {
            const distance = Math.sqrt(quickDist);
            const overlap = (this.character.collisionRadius + monster.collisionRadius) - distance;
            
            if (distance > 0) {
                const pushX = (dx / distance) * overlap;
                const pushZ = (dz / distance) * overlap;
                
                characterPos.x += pushX;
                characterPos.z += pushZ;
            }

            this.character.onCollideWithMonster(monster);
            monster.onCollideWithCharacter(this.character);
        }
    }

    // Handle building collisions if in city biome
    if (currentBiome instanceof CityBiome) {
        for (const building of currentBiome.getBuildings()) {
            if (this.character.checkCollision(building)) {
                const dx = characterPos.x - building.mesh.position.x;
                const dz = characterPos.z - building.mesh.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance < (this.character.collisionRadius + building.collisionRadius)) {
                    const overlap = (this.character.collisionRadius + building.collisionRadius) - distance;
                    if (distance > 0) {
                        const pushX = (dx / distance) * overlap;
                        const pushZ = (dz / distance) * overlap;
                        
                        characterPos.x += pushX;
                        characterPos.z += pushZ;
                    }
                }
            }
        }
    }

    // Handle tree collisions if in forest biome
    if (currentBiome instanceof ForestBiome) {
        for (const tree of currentBiome.getTrees()) {
            if (this.character.checkCollision(tree)) {
                const dx = this.character.mesh.position.x - tree.mesh.position.x;
                const dz = this.character.mesh.position.z - tree.mesh.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance < (this.character.collisionRadius + tree.collisionRadius)) {
                    const overlap = (this.character.collisionRadius + tree.collisionRadius) - distance;
                    if (distance > 0) {
                        const pushX = (dx / distance) * overlap;
                        const pushZ = (dz / distance) * overlap;
                        
                        this.character.mesh.position.x += pushX;
                        this.character.mesh.position.z += pushZ;
                    }
                }
            }
        }
    }
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

    // Check collision with boundaries by testing points around the character
    const collisionPoints = [
        nextPosition.clone().add(new THREE.Vector3(radius, 0, 0)),  // Right
        nextPosition.clone().add(new THREE.Vector3(-radius, 0, 0)), // Left
        nextPosition.clone().add(new THREE.Vector3(0, 0, radius)),  // Front
        nextPosition.clone().add(new THREE.Vector3(0, 0, -radius))  // Back
    ];

    // Only block movement if collision points would be outside valid area
    const wouldCollide = collisionPoints.some(point => !this.currentLevel.isPositionValid(point));

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
    this.handleCollisions();

    // Render scene
    this.renderer.render(this.scene, this.camera);
  };
}