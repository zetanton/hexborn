import * as THREE from 'three';
import { Biome } from './Biome';
import { LilyPad } from '../../entities/LilyPad';
import { Frog } from '../../entities/Frog';
import { Character } from '../../entities/Character';
import { Alligator } from '../../entities/Alligator';

export class SwampBiome extends Biome {
  private heightMap: number[][] = [];
  private readonly GRID_SIZE = 100;
  private readonly WATER_LEVEL = 0.5;
  private readonly FOG_TRANSITION_SPEED = 0.05; // Controls how fast fog changes
  private readonly FOG_COLOR = 0x2f4f2f; // Darker swamp green
  private readonly FOG_NEAR = 10; // Closer fog start
  private readonly FOG_FAR = 50; // Shorter view distance
  private fog: THREE.Fog | null = null;
  private currentFogDensity: number = 0;
  private targetFogDensity: number = 0;
  private lilyPads: LilyPad[] = [];
  private frogs: Frog[] = [];
  private alligators: Alligator[] = [];

  protected generateTerrain(): void {
    this.generateHeightMap();
    this.createSwampGround();
    this.createSwampWater();
    this.createVegetation();
    this.createFog();
    this.createLilyPads();
    this.createFrogs();
    this.createAlligators();
  }

  private generateHeightMap() {
    // Initialize the heightMap array first
    this.heightMap = Array(this.GRID_SIZE).fill(null).map(() => Array(this.GRID_SIZE).fill(0));
    
    for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
        const x = i / (this.GRID_SIZE - 1);
        const z = j / (this.GRID_SIZE - 1);

        // Calculate world space coordinates
        const worldX = this.position.x - this.size.x/2 + x * this.size.x;
        const worldZ = this.position.y - this.size.y/2 + z * this.size.y;

        // Calculate raw swamp height
        const rawHeight = (this.noise(x * 6, z * 6) * 1.5) - 0.5; // Uneven, muddy terrain

        // Blend with base height at edges
        this.heightMap[i][j] = this.blendHeightWithEdge(worldX, worldZ, rawHeight);
      }
    }
  }

  private createSwampGround() {
    const geometry = new THREE.PlaneGeometry(this.size.x, this.size.y, this.GRID_SIZE - 1, this.GRID_SIZE - 1);
    const vertices = geometry.attributes.position.array;

    for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
        const index = (i * this.GRID_SIZE + j) * 3;
        vertices[index + 2] = this.heightMap[i][j];
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({ 
      color: 0x2c3e1f, // Dark muddy green
      roughness: 1.0,
      metalness: 0.0,
    });

    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(this.position.x, 0, this.position.y);
    ground.receiveShadow = true;
    this.addObject(ground);
  }

  private createSwampWater() {
    const waterGeometry = new THREE.PlaneGeometry(this.size.x, this.size.y);
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x2f4f2f,
      transparent: true,
      opacity: 0.6,
      roughness: 0.3,
      metalness: 0.1,
    });

    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.set(this.position.x, this.WATER_LEVEL, this.position.y);
    this.addObject(water);
  }

  private createVegetation() {
    // Add cattails, dead trees, and other swamp vegetation
    const vegetationCount = Math.floor((this.size.x * this.size.y) / 200);
    
    for (let i = 0; i < vegetationCount; i++) {
      const x = this.position.x - this.size.x/2 + Math.random() * this.size.x;
      const z = this.position.y - this.size.y/2 + Math.random() * this.size.y;
      const height = this.getGroundHeight(new THREE.Vector3(x, 0, z));
      
      if (height > this.WATER_LEVEL - 0.2) { // Only place vegetation above or near water level
        if (Math.random() > 0.7) {
          this.createDeadTree(new THREE.Vector3(x, height, z));
        } else {
          this.createCattail(new THREE.Vector3(x, height, z));
        }
      }
    }
  }

  private createDeadTree(position: THREE.Vector3) {
    const tree = new THREE.Group();
    
    // Create twisted trunk
    const points = [];
    const segments = 5;
    for (let i = 0; i <= segments; i++) {
      points.push(new THREE.Vector3(
        Math.sin(i / segments * Math.PI) * 0.3,
        i * 1.5,
        Math.cos(i / segments * Math.PI) * 0.2
      ));
    }
    
    const trunkGeometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      segments * 4,
      0.2 - (Math.random() * 0.1),
      8,
      false
    );
    
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x4b3621,
      roughness: 1.0,
    });
    
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.castShadow = true;
    tree.add(trunk);
    
    // Place tree with base at ground level
    this.placeObjectOnGround(tree, position, 0);
    tree.rotation.y = Math.random() * Math.PI * 2;
    this.addObject(tree);
  }

  private createCattail(position: THREE.Vector3) {
    const cattail = new THREE.Group();
    
    // Stem
    const stemGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8);
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x355e3b,
      roughness: 1.0,
    });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = 0.75;
    cattail.add(stem);
    
    // Top
    const topGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8);
    const topMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 1.0,
    });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 1.4;
    cattail.add(top);
    
    // Place cattail with base at ground level
    this.placeObjectOnGround(cattail, position, 0);
    cattail.rotation.y = Math.random() * Math.PI * 2;
    cattail.rotation.x = (Math.random() - 0.5) * 0.2;
    this.addObject(cattail);
  }

  private createFog() {
    // Store fog settings but don't apply to scene directly
    this.fog = new THREE.Fog(this.FOG_COLOR, this.FOG_NEAR, this.FOG_FAR);
  }

  public updateFog(position: THREE.Vector3) {
    if (!this.fog) return;
    
    // Set target fog density based on position
    this.targetFogDensity = this.isInBiome(position) ? 1 : 0;
    
    // Smoothly interpolate current fog density
    this.currentFogDensity += (this.targetFogDensity - this.currentFogDensity) * this.FOG_TRANSITION_SPEED;
    
    // Apply fog with current density
    if (this.currentFogDensity > 0.01) { // Only apply fog if it's visible
      this.fog.color.setHex(this.FOG_COLOR);
      // Interpolate fog distances based on density
      this.fog.near = this.FOG_NEAR + (100 - this.FOG_NEAR) * (1 - this.currentFogDensity);
      this.fog.far = this.FOG_FAR + (200 - this.FOG_FAR) * (1 - this.currentFogDensity);
      this.scene.fog = this.fog;
    } else if (this.scene.fog === this.fog) {
      this.scene.fog = null;
    }
  }

  private noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    return (Math.sin(X + Y * 57) * 43758.5453123) % 1;
  }

  override getGroundHeight(position: THREE.Vector3): number {
    // Calculate grid coordinates
    let x = Math.floor(((position.x - (this.position.x - this.size.x/2)) / this.size.x) * (this.GRID_SIZE - 1));
    let z = Math.floor(((position.z - (this.position.y - this.size.y/2)) / this.size.y) * (this.GRID_SIZE - 1));
    
    // Clamp coordinates to valid range
    x = Math.max(0, Math.min(x, this.GRID_SIZE - 1));
    z = Math.max(0, Math.min(z, this.GRID_SIZE - 1));
    
    // Check if heightMap has been initialized
    if (this.heightMap && this.heightMap[x] && this.heightMap[x][z] !== undefined) {
      return this.heightMap[x][z];
    }
    
    return Biome.BASE_HEIGHT;
  }

  private createLilyPads() {
    const lilyPadCount = 15; // Number of lily pads to create
    const minDistance = 8; // Minimum distance between lily pads

    for (let i = 0; i < lilyPadCount; i++) {
      let attempts = 0;
      let position = new THREE.Vector3();
      let validPosition = false;

      // Try to find a valid position
      while (!validPosition && attempts < 50) {
        const x = this.position.x - this.size.x/2 + Math.random() * this.size.x;
        const z = this.position.y - this.size.y/2 + Math.random() * this.size.y;
        position.set(x, this.WATER_LEVEL, z);

        // Check distance from other lily pads
        validPosition = true;
        for (const existingPad of this.lilyPads) {
          const distance = position.distanceTo(existingPad.mesh.position);
          if (distance < minDistance) {
            validPosition = false;
            break;
          }
        }

        // Check if position is above deep enough water
        const groundHeight = this.getGroundHeight(position);
        if (groundHeight > this.WATER_LEVEL - 0.3) {
          validPosition = false;
        }

        attempts++;
      }

      if (validPosition) {
        const size = 2 + Math.random() * 2; // Random size between 2 and 4
        const lilyPad = new LilyPad(size);
        lilyPad.mesh.position.copy(position);
        this.lilyPads.push(lilyPad);
        this.addObject(lilyPad.mesh);
      }
    }
  }

  private createFrogs() {
    const frogCount = 5; // Number of frogs to create
    const minDistance = 20; // Minimum distance between frogs

    // Calculate swamp bounds
    const swampMin = new THREE.Vector2(
      this.position.x - this.size.x/2,
      this.position.y - this.size.y/2
    );
    const swampMax = new THREE.Vector2(
      this.position.x + this.size.x/2,
      this.position.y + this.size.y/2
    );

    for (let i = 0; i < frogCount; i++) {
      let attempts = 0;
      let position = new THREE.Vector3();
      let validPosition = false;

      // Try to find a valid position
      while (!validPosition && attempts < 50) {
        const x = this.position.x - this.size.x/2 + Math.random() * this.size.x;
        const z = this.position.y - this.size.y/2 + Math.random() * this.size.y;
        const groundHeight = this.getGroundHeight(new THREE.Vector3(x, 0, z));
        position.set(x, groundHeight + 0.75, z);

        // Check distance from other frogs
        validPosition = true;
        for (const existingFrog of this.frogs) {
          const distance = position.distanceTo(existingFrog.mesh.position);
          if (distance < minDistance) {
            validPosition = false;
            break;
          }
        }

        // Check if position is on relatively solid ground
        if (groundHeight < this.WATER_LEVEL - 0.2) {
          validPosition = false;
        }

        attempts++;
      }

      if (validPosition) {
        const frog = new Frog(position, this);
        frog.setSwampBounds(swampMin, swampMax);
        this.frogs.push(frog);
        this.addObject(frog.mesh);
      }
    }
  }

  private createAlligators() {
    const alligatorCount = 2; // Number of alligators to create
    const minDistance = 50; // Minimum distance between alligators

    // Calculate swamp bounds
    const swampMin = new THREE.Vector2(
      this.position.x - this.size.x/2,
      this.position.y - this.size.y/2
    );
    const swampMax = new THREE.Vector2(
      this.position.x + this.size.x/2,
      this.position.y + this.size.y/2
    );

    for (let i = 0; i < alligatorCount; i++) {
      let attempts = 0;
      let position = new THREE.Vector3();
      let validPosition = false;

      // Try to find a valid position
      while (!validPosition && attempts < 50) {
        const x = this.position.x - this.size.x/2 + Math.random() * this.size.x;
        const z = this.position.y - this.size.y/2 + Math.random() * this.size.y;
        const groundHeight = this.getGroundHeight(new THREE.Vector3(x, 0, z));
        position.set(x, groundHeight + 1, z);

        // Check distance from other alligators
        validPosition = true;
        for (const existingAlligator of this.alligators) {
          const distance = position.distanceTo(existingAlligator.mesh.position);
          if (distance < minDistance) {
            validPosition = false;
            break;
          }
        }

        // Check if position is near deep water
        if (groundHeight > this.WATER_LEVEL - 0.2) {
          validPosition = false;
        }

        attempts++;
      }

      if (validPosition) {
        const alligator = new Alligator(position, this);
        alligator.setSwampBounds(swampMin, swampMax);
        this.alligators.push(alligator);
        this.addObject(alligator.mesh);
      }
    }
  }

  update(delta: number, playerPosition: THREE.Vector3, player: Character): void {
    // Update fog
    this.updateFog(playerPosition);

    // Update lily pads
    for (const lilyPad of this.lilyPads) {
      lilyPad.update(delta);
    }

    // Update frogs
    for (const frog of this.frogs) {
      // Only update target if frog is not in the middle of an action
      if (!frog.isPerformingAction()) {
        // Only set player as target if they're within aggro range
        const distanceToPlayer = frog.mesh.position.distanceTo(playerPosition);
        if (distanceToPlayer <= 15) { // Use frog's AGGRO_RANGE
          frog.setTarget(player);
        } else if (frog.hasPlayerTarget()) {
          frog.clearTarget(); // Clear player target if they're too far
        }
      }
      frog.update(delta, this.getGroundHeight(frog.mesh.position));
    }

    // Update alligators
    for (const alligator of this.alligators) {
      // Only update target if alligator is not in the middle of an action
      if (!alligator.isPerformingAction()) {
        // Only set player as target if they're within aggro range
        const distanceToPlayer = alligator.mesh.position.distanceTo(playerPosition);
        if (distanceToPlayer <= 20) { // Use alligator's AGGRO_RANGE
          alligator.setTarget(player);
        } else if (alligator.hasPlayerTarget()) {
          alligator.clearTarget(); // Clear player target if they're too far
        }
      }
      alligator.update(delta, this.getGroundHeight(alligator.mesh.position));
    }
  }

  // Add getter for frogs (for collision handling)
  public getFrogs(): Frog[] {
    return this.frogs;
  }

  // Add getter for lily pads (for collision handling)
  public getLilyPads(): LilyPad[] {
    return this.lilyPads;
  }

  // Add getter for alligators (for collision handling)
  public getAlligators(): Alligator[] {
    return this.alligators;
  }
} 