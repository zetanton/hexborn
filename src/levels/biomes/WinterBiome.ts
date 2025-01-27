import * as THREE from 'three';
import { Biome } from './Biome';

export class WinterBiome extends Biome {
  private heightMap: number[][] = [];
  private readonly GRID_SIZE = 100;
  private snowParticles!: THREE.Points;
  private readonly SNOW_COUNT = 3000;

  protected generateTerrain(): void {
    this.generateHeightMap();
    this.createSnowGround();
    this.createPineTrees();
    this.createIgloos();
    this.createSnowfall();
  }

  private generateHeightMap() {
    for (let i = 0; i < this.GRID_SIZE; i++) {
      this.heightMap[i] = [];
      for (let j = 0; j < this.GRID_SIZE; j++) {
        const x = i / (this.GRID_SIZE - 1);
        const z = j / (this.GRID_SIZE - 1);

        // Calculate world space coordinates
        const worldX = this.position.x - this.size.x/2 + x * this.size.x;
        const worldZ = this.position.y - this.size.y/2 + z * this.size.y;

        // Calculate raw snow height
        const rawHeight = (this.noise(x * 4, z * 4) * 4) + 1; // Snow hills

        // Blend with base height at edges
        this.heightMap[i][j] = this.blendHeightWithEdge(worldX, worldZ, rawHeight);
      }
    }
  }

  private createSnowGround() {
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
      color: 0xFFFFFF,
      roughness: 0.7,
      metalness: 0.0,
      envMapIntensity: 0.8
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(this.position.x, 0, this.position.y);
    ground.receiveShadow = true;
    this.addObject(ground);
  }

  private createSnowfall() {
    const snowGeometry = new THREE.BufferGeometry();
    const snowPositions = new Float32Array(this.SNOW_COUNT * 3);
    const snowSizes = new Float32Array(this.SNOW_COUNT);
    
    for (let i = 0; i < this.SNOW_COUNT * 3; i += 3) {
      snowPositions[i] = this.position.x - this.size.x/2 + Math.random() * this.size.x;
      snowPositions[i + 1] = Math.random() * 100; // Increased height range
      snowPositions[i + 2] = this.position.y - this.size.y/2 + Math.random() * this.size.y;
      snowSizes[i/3] = 0.1 + Math.random() * 0.2; // Varied snow sizes
    }
    
    snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    snowGeometry.setAttribute('size', new THREE.BufferAttribute(snowSizes, 1));
    
    const snowTexture = new THREE.TextureLoader().load('/textures/snowflake.png');
    const snowMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      map: snowTexture,
      transparent: true,
      opacity: 0.6,
      size: 1,
      sizeAttenuation: true,
      depthWrite: false,
    });
    
    this.snowParticles = new THREE.Points(snowGeometry, snowMaterial);
    this.addObject(this.snowParticles);

    // Improved animation
    const animate = () => {
      const positions = this.snowParticles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        // Add some horizontal drift to the snow
        positions[i] += Math.sin(Date.now() * 0.001 + i) * 0.02;
        positions[i + 1] -= 0.15 + Math.random() * 0.1; // Varied fall speed
        
        // Reset snow when it hits the ground
        if (positions[i + 1] < this.getGroundHeight(new THREE.Vector3(positions[i], 0, positions[i + 2]))) {
          positions[i] = this.position.x - this.size.x/2 + Math.random() * this.size.x;
          positions[i + 1] = 100;
          positions[i + 2] = this.position.y - this.size.y/2 + Math.random() * this.size.y;
        }
      }
      this.snowParticles.geometry.attributes.position.needsUpdate = true;
      requestAnimationFrame(animate);
    };
    animate();
  }

  private createIgloos() {
    const iglooCount = Math.floor((this.size.x * this.size.y) / 20000);
    
    for (let i = 0; i < iglooCount; i++) {
      const x = this.position.x - this.size.x/2 + Math.random() * this.size.x;
      const z = this.position.y - this.size.y/2 + Math.random() * this.size.y;
      const position = new THREE.Vector3(x, 0, z);
      this.createIgloo(position);
    }
  }

  private createIgloo(position: THREE.Vector3) {
    const igloo = new THREE.Group();

    // Main dome
    const radius = 2;
    const domeGeometry = new THREE.SphereGeometry(radius, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const snowMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 1.0,
      metalness: 0.0
    });
    const dome = new THREE.Mesh(domeGeometry, snowMaterial);
    dome.position.y = 0;
    dome.castShadow = true;
    igloo.add(dome);

    // Entrance tunnel
    const tunnelRadius = radius * 0.6;
    const tunnelGeometry = new THREE.CylinderGeometry(tunnelRadius, tunnelRadius, radius * 1.5, 16, 1, true, -Math.PI/4, Math.PI/2);
    const tunnel = new THREE.Mesh(tunnelGeometry, snowMaterial);
    tunnel.rotation.z = Math.PI / 2;
    tunnel.position.set(radius * 0.8, tunnelRadius, 0);
    igloo.add(tunnel);

    // Place igloo with proper grounding
    this.addGroundedObject(igloo, position, 0);
  }

  private createPineTrees() {
    const treeCount = Math.floor((this.size.x * this.size.y) / 1000);
    
    for (let i = 0; i < treeCount; i++) {
      const x = this.position.x - this.size.x/2 + Math.random() * this.size.x;
      const z = this.position.y - this.size.y/2 + Math.random() * this.size.y;
      const position = new THREE.Vector3(x, 0, z);
      this.createPineTree(position);
    }
  }

  private createPineTree(position: THREE.Vector3) {
    const tree = new THREE.Group();

    // Create trunk - moved down to be half-buried in ground
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 4, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3B2F2F,
      roughness: 0.9
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 0;
    trunk.castShadow = true;
    tree.add(trunk);

    // Create snow-covered pine layers
    const pineColor = 0x1B4F2F;
    const pineMaterial = new THREE.MeshStandardMaterial({ 
      color: pineColor,
      roughness: 0.8
    });
    const snowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFFFFF,
      roughness: 0.7,
      metalness: 0.0
    });

    // Adjust layer positions relative to trunk base
    for (let i = 0; i < 5; i++) {
      const y = i * 0.7;
      const radius = 1.5 - i * 0.2;
      const height = 0.9;

      const pineGeometry = new THREE.ConeGeometry(radius, height, 10);
      const pine = new THREE.Mesh(pineGeometry, pineMaterial);
      pine.position.y = y;
      pine.castShadow = true;
      tree.add(pine);

      const snowGeometry = new THREE.ConeGeometry(radius * 0.9, height * 0.3, 10);
      const snow = new THREE.Mesh(snowGeometry, snowMaterial);
      snow.position.y = y + height/2 - 0.1;
      snow.castShadow = true;
      tree.add(snow);

      // Add random snow patches
      for (let j = 0; j < 3; j++) {
        const patchGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const patch = new THREE.Mesh(patchGeometry, snowMaterial);
        const angle = Math.random() * Math.PI * 2;
        const r = radius * 0.7;
        patch.position.set(
          Math.cos(angle) * r,
          y,
          Math.sin(angle) * r
        );
        tree.add(patch);
      }
    }

    // Place tree with proper grounding
    this.addGroundedObject(tree, position, 0);
  }

  private noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    return (Math.sin(X + Y * 57) * 43758.5453123) % 1;
  }

  override getGroundHeight(position: THREE.Vector3): number {
    const x = Math.floor(((position.x - (this.position.x - this.size.x/2)) / this.size.x) * (this.GRID_SIZE - 1));
    const z = Math.floor(((position.z - (this.position.y - this.size.y/2)) / this.size.y) * (this.GRID_SIZE - 1));
    
    if (x >= 0 && x < this.GRID_SIZE && z >= 0 && z < this.GRID_SIZE) {
      return this.heightMap[x][z];
    }
    return Biome.BASE_HEIGHT;
  }

  public cleanup(): void {
    super.cleanup();
    if (this.snowParticles) {
      this.scene.remove(this.snowParticles);
      (this.snowParticles.material as THREE.Material).dispose();
      (this.snowParticles.geometry as THREE.BufferGeometry).dispose();
      this.snowParticles = null!;
    }
  }
} 