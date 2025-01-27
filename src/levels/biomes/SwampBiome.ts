import * as THREE from 'three';
import { Biome } from './Biome';

export class SwampBiome extends Biome {
  private heightMap: number[][] = [];
  private readonly GRID_SIZE = 100;
  private readonly WATER_LEVEL = 0.5;
  private fog: THREE.Fog | null = null;

  protected generateTerrain(): void {
    this.generateHeightMap();
    this.createSwampGround();
    this.createSwampWater();
    this.createVegetation();
    this.createFog();
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
    this.fog = new THREE.Fog(0x2f4f2f, 10, 50);
  }

  public updateFog(position: THREE.Vector3) {
    if (this.isInBiome(position)) {
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
} 