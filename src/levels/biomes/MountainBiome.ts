import * as THREE from '../../../node_modules/@types/three';
import { Biome } from './Biome';

export class MountainBiome extends Biome {
  private heightMap: number[][] = [];
  private readonly GRID_SIZE = 100;

  generate(): void {
    this.generateHeightMap();
    this.createMountainTerrain();
    this.addRocks();
  }

  private generateHeightMap() {
    // Initialize height map
    for (let i = 0; i < this.GRID_SIZE; i++) {
      this.heightMap[i] = [];
      for (let j = 0; j < this.GRID_SIZE; j++) {
        // Use multiple frequencies of noise for more natural looking mountains
        const x = (i / this.GRID_SIZE) * 4;
        const y = (j / this.GRID_SIZE) * 4;
        this.heightMap[i][j] = this.noise(x, y) * 20; // Max height of 20 units
      }
    }
  }

  private createMountainTerrain() {
    const geometry = new THREE.PlaneGeometry(this.size.x, this.size.y, this.GRID_SIZE - 1, this.GRID_SIZE - 1);
    const vertices = geometry.attributes.position.array;

    // Apply height map to vertices
    for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
        const index = (i * this.GRID_SIZE + j) * 3;
        vertices[index + 2] = this.heightMap[i][j]; // Z coordinate is up when rotated
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.8,
      metalness: 0.2,
      flatShading: true
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(this.position.x, 0, this.position.y);
    terrain.receiveShadow = true;
    terrain.castShadow = true;
    this.scene.add(terrain);
  }

  private addRocks() {
    const rockCount = Math.floor((this.size.x * this.size.y) / 200);
    
    for (let i = 0; i < rockCount; i++) {
      const x = this.position.x - this.size.x/2 + Math.random() * this.size.x;
      const z = this.position.y - this.size.y/2 + Math.random() * this.size.y;
      const height = this.getGroundHeight(new THREE.Vector3(x, 0, z));
      this.createRock(new THREE.Vector3(x, height, z));
    }
  }

  private createRock(position: THREE.Vector3) {
    const geometry = new THREE.DodecahedronGeometry(Math.random() * 0.5 + 0.5);
    const material = new THREE.MeshStandardMaterial({
      color: 0x707070,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true
    });
    const rock = new THREE.Mesh(geometry, material);
    rock.position.copy(position);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rock.castShadow = true;
    this.scene.add(rock);
  }

  // Simple noise function for demo (you might want to use a proper noise library)
  private noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    return (Math.sin(X + Y * 57) * 43758.5453123) % 1;
  }

  override getGroundHeight(position: THREE.Vector3): number {
    // Convert world position to height map coordinates
    const x = Math.floor(((position.x - (this.position.x - this.size.x/2)) / this.size.x) * (this.GRID_SIZE - 1));
    const z = Math.floor(((position.z - (this.position.y - this.size.y/2)) / this.size.y) * (this.GRID_SIZE - 1));
    
    if (x >= 0 && x < this.GRID_SIZE && z >= 0 && z < this.GRID_SIZE) {
      return this.heightMap[x][z];
    }
    return 0;
  }
} 