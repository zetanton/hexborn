import * as THREE from 'three';
import { Biome } from './Biome';

export class MountainBiome extends Biome {
  private heightMap: number[][] = [];
  private readonly GRID_SIZE = 100;
  private readonly MAX_HEIGHT = 30;
  private readonly PEAK_COUNT = 5;

  protected generateTerrain(): void {
    this.generateHeightMap();
    this.createTerrain();
    this.addRocks();
  }

  private generateHeightMap() {
    // Generate mountain peaks
    const peaks: Array<{x: number, z: number, height: number}> = [];
    for (let i = 0; i < this.PEAK_COUNT; i++) {
      peaks.push({
        x: Math.random() * 0.4 + 0.3, // Keep peaks more centered
        z: Math.random() * 0.4 + 0.3,
        height: this.MAX_HEIGHT * (0.8 + Math.random() * 0.2)
      });
    }

    // Initialize height map
    for (let i = 0; i < this.GRID_SIZE; i++) {
      this.heightMap[i] = [];
      for (let j = 0; j < this.GRID_SIZE; j++) {
        const x = i / (this.GRID_SIZE - 1);
        const z = j / (this.GRID_SIZE - 1);
        
        // Calculate world space coordinates
        const worldX = this.position.x - this.size.x/2 + x * this.size.x;
        const worldZ = this.position.y - this.size.y/2 + z * this.size.y;
        
        // Calculate raw height
        let height = Biome.BASE_HEIGHT;
        let mountainHeight = 0;
        peaks.forEach(peak => {
          const distance = Math.sqrt(
            Math.pow(x - peak.x, 2) + 
            Math.pow(z - peak.z, 2)
          );
          mountainHeight += peak.height * Math.max(0, 1 - distance * 2);
        });

        const detail = (this.noise(x * 8, z * 8) + 1) * 1.5;
        height += mountainHeight + detail;

        // Blend with base height at edges
        this.heightMap[i][j] = this.blendHeightWithEdge(worldX, worldZ, height);
      }
    }
  }

  private createTerrain() {
    const geometry = new THREE.PlaneGeometry(
      this.size.x, 
      this.size.y, 
      this.GRID_SIZE - 1, 
      this.GRID_SIZE - 1
    );
    
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
        const index = (i * this.GRID_SIZE + j) * 3;
        vertices[index + 2] = this.heightMap[i][j];
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    // Create gradient material based on height
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
    });

    // Add vertex colors based on height
    const colors = [];
    for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
        const height = this.heightMap[i][j];
        if (height > this.MAX_HEIGHT * 0.7) {
          colors.push(1, 1, 1); // Snow
        } else if (height > this.MAX_HEIGHT * 0.4) {
          colors.push(0.5, 0.5, 0.5); // Rock
        } else {
          colors.push(0.2, 0.3, 0.1); // Grass
        }
      }
    }
    
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(this.position.x, 0, this.position.y);
    terrain.receiveShadow = true;
    terrain.castShadow = true;
    this.scene.add(terrain);
  }

  private addRocks() {
    // Reduced rock count
    const rockCount = Math.floor((this.size.x * this.size.y) / 2000); // Was ~100
    
    for (let i = 0; i < rockCount; i++) {
      const x = this.position.x - this.size.x/2 + Math.random() * this.size.x;
      const z = this.position.y - this.size.y/2 + Math.random() * this.size.y;
      const position = new THREE.Vector3(x, 0, z);
      
      // Only place rocks on steeper terrain
      const height = this.getGroundHeight(position);
      if (height > this.MAX_HEIGHT * 0.4) {
        this.createRock(position);
      }
    }
  }

  private createRock(position: THREE.Vector3) {
    const geometry = new THREE.DodecahedronGeometry(1 + Math.random() * 2, 0);
    const material = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.9,
    });
    const rock = new THREE.Mesh(geometry, material);
    rock.castShadow = true;
    this.addGroundedObject(rock, position, 0);
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
      const height = 
        h00 * (1 - fracX) * (1 - fracZ) +
        h10 * fracX * (1 - fracZ) +
        h01 * (1 - fracX) * fracZ +
        h11 * fracX * fracZ;
        
      return height;
    }
    return Biome.BASE_HEIGHT;
  }

  private noise(x: number, y: number): number {
    return (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123) % 1;
  }
} 