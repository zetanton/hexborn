import * as THREE from 'three';
import { Biome } from './Biome';

export class WinterBiome extends Biome {
  private heightMap: number[][] = [];
  private readonly GRID_SIZE = 100;
  private snowParticles!: THREE.Points;
  private readonly SNOW_COUNT = 3000;

  generate(): void {
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
        const x = (i / this.GRID_SIZE) * 4;
        const y = (j / this.GRID_SIZE) * 4;
        
        // Calculate raw height
        const rawHeight = this.noise(x, y) * 2;
        
        // Normalize height at edges
        const worldX = this.position.x - this.size.x/2 + (i / this.GRID_SIZE) * this.size.x;
        const worldZ = this.position.y - this.size.y/2 + (j / this.GRID_SIZE) * this.size.y;
        this.heightMap[i][j] = this.normalizeEdgeHeight(rawHeight, worldX, worldZ);
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
    this.scene.add(ground);
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
    this.scene.add(this.snowParticles);

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
    const iglooCount = Math.floor((this.size.x * this.size.y) / 10000); // Sparse igloos
    
    for (let i = 0; i < iglooCount; i++) {
      const x = this.position.x - this.size.x/2 + Math.random() * this.size.x;
      const z = this.position.y - this.size.y/2 + Math.random() * this.size.y;
      const height = this.getGroundHeight(new THREE.Vector3(x, 0, z));
      this.createIgloo(new THREE.Vector3(x, height, z));
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
    dome.position.y = radius;
    dome.castShadow = true;
    igloo.add(dome);

    // Entrance tunnel
    const tunnelRadius = radius * 0.6;
    const tunnelGeometry = new THREE.CylinderGeometry(tunnelRadius, tunnelRadius, radius * 1.5, 16, 1, true, -Math.PI/4, Math.PI/2);
    const tunnel = new THREE.Mesh(tunnelGeometry, snowMaterial);
    tunnel.rotation.z = Math.PI / 2;
    tunnel.position.set(radius * 0.8, tunnelRadius, 0);
    igloo.add(tunnel);

    igloo.position.copy(position);
    igloo.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(igloo);
  }

  private createPineTrees() {
    const treeCount = Math.floor((this.size.x * this.size.y) / 150);
    
    for (let i = 0; i < treeCount; i++) {
      const x = this.position.x - this.size.x/2 + Math.random() * this.size.x;
      const z = this.position.y - this.size.y/2 + Math.random() * this.size.y;
      const height = this.getGroundHeight(new THREE.Vector3(x, 0, z));
      this.createPineTree(new THREE.Vector3(x, height, z));
    }
  }

  private createPineTree(position: THREE.Vector3) {
    const tree = new THREE.Group();

    // Create trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 4, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3B2F2F,
      roughness: 0.9
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 2;
    trunk.castShadow = true;
    tree.add(trunk);

    // Create snow-covered pine layers
    const pineColor = 0x1B4F2F; // Darker green for contrast with snow
    const pineMaterial = new THREE.MeshStandardMaterial({ 
      color: pineColor,
      roughness: 0.8
    });
    const snowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFFFFF,
      roughness: 0.7,
      metalness: 0.0
    });

    for (let i = 0; i < 5; i++) { // Added an extra layer
      const y = 2 + i * 0.7;
      const radius = 1.5 - i * 0.2;
      const height = 0.9;

      // Main pine layer
      const pineGeometry = new THREE.ConeGeometry(radius, height, 10);
      const pine = new THREE.Mesh(pineGeometry, pineMaterial);
      pine.position.y = y;
      pine.castShadow = true;
      tree.add(pine);

      // Thicker snow layer
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

    tree.position.copy(position);
    tree.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(tree);
  }

  private noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    return (Math.sin(X + Y * 57) * 43758.5453123) % 1;
  }

  override getGroundHeight(position: THREE.Vector3): number {
    const localX = position.x - (this.position.x - this.size.x/2);
    const localZ = position.z - (this.position.y - this.size.y/2);
    
    const gridX = Math.floor((localX / this.size.x) * (this.GRID_SIZE - 1));
    const gridZ = Math.floor((localZ / this.size.y) * (this.GRID_SIZE - 1));
    
    if (gridX >= 0 && gridX < this.GRID_SIZE && gridZ >= 0 && gridZ < this.GRID_SIZE) {
      // Interpolate between grid points for smoother height transitions
      const fracX = (localX / this.size.x) * (this.GRID_SIZE - 1) - gridX;
      const fracZ = (localZ / this.size.y) * (this.GRID_SIZE - 1) - gridZ;
      
      const h00 = this.heightMap[gridX][gridZ];
      const h10 = gridX < this.GRID_SIZE - 1 ? this.heightMap[gridX + 1][gridZ] : h00;
      const h01 = gridZ < this.GRID_SIZE - 1 ? this.heightMap[gridX][gridZ + 1] : h00;
      const h11 = (gridX < this.GRID_SIZE - 1 && gridZ < this.GRID_SIZE - 1) ? 
        this.heightMap[gridX + 1][gridZ + 1] : h00;
      
      // Bilinear interpolation
      return h00 * (1 - fracX) * (1 - fracZ) +
             h10 * fracX * (1 - fracZ) +
             h01 * (1 - fracX) * fracZ +
             h11 * fracX * fracZ;
    }
    return Biome.BASE_HEIGHT;
  }
} 