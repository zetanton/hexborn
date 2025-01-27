import * as THREE from 'three';
import { Biome } from './Biome';

export class DesertBiome extends Biome {
  private heightMap: number[][] = [];
  private readonly GRID_SIZE = 100;

  protected generateTerrain(): void {
    this.generateHeightMap();
    this.createDesertTerrain();
    this.addCacti();
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

        // Calculate raw dune height
        const rawHeight = this.noise(x * 6, z * 6) * 3; // Gentle sand dunes

        // Blend with base height at edges
        this.heightMap[i][j] = this.blendHeightWithEdge(worldX, worldZ, rawHeight);
      }
    }
  }

  private createDesertTerrain() {
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
      color: 0xD2B48C, // Sandy color
      roughness: 1.0,
      metalness: 0.0
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(this.position.x, 0, this.position.y);
    terrain.receiveShadow = true;
    this.addObject(terrain);
  }

  private addCacti() {
    // Significantly reduced cactus count
    const cactiCount = Math.floor((this.size.x * this.size.y) / 2000); // Was 400
    
    for (let i = 0; i < cactiCount; i++) {
      const x = this.position.x - this.size.x/2 + Math.random() * this.size.x;
      const z = this.position.y - this.size.y/2 + Math.random() * this.size.y;
      const position = new THREE.Vector3(x, 0, z);
      this.createCactus(position);
    }
  }

  private createCactus(position: THREE.Vector3) {
    const cactus = new THREE.Group();

    // Main body
    const bodyHeight = 2 + Math.random() * 2;
    const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.25, bodyHeight, 8);
    const cactusMaterial = new THREE.MeshStandardMaterial({
      color: 0x2F4F4F,
      roughness: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, cactusMaterial);
    body.position.y = bodyHeight/2;
    body.castShadow = true;
    cactus.add(body);

    // Add arms
    const armCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < armCount; i++) {
      const armHeight = 1 + Math.random();
      const armGeometry = new THREE.CylinderGeometry(0.15, 0.15, armHeight, 8);
      const arm = new THREE.Mesh(armGeometry, cactusMaterial);
      
      // Position arm
      const angle = (i / armCount) * Math.PI * 2;
      const heightOnBody = bodyHeight * (0.3 + Math.random() * 0.4);
      arm.position.set(
        Math.cos(angle) * 0.3,
        heightOnBody,
        Math.sin(angle) * 0.3
      );
      arm.rotation.z = Math.PI/2 - angle;
      arm.castShadow = true;
      cactus.add(arm);
    }

    // Place cactus with base at ground level
    this.addGroundedObject(cactus, position, 0);
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
} 