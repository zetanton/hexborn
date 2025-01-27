import * as THREE from 'three';
import { Biome } from './Biome';

export class ForestBiome extends Biome {
  private heightMap: number[][] = [];
  private readonly GRID_SIZE = 100;

  generate(): void {
    this.generateHeightMap();
    this.createForestTerrain();
    this.createTrees();
  }

  private generateHeightMap() {
    for (let i = 0; i < this.GRID_SIZE; i++) {
      this.heightMap[i] = [];
      for (let j = 0; j < this.GRID_SIZE; j++) {
        const x = (i / this.GRID_SIZE) * 4;
        const y = (j / this.GRID_SIZE) * 4;
        
        // Calculate raw forest floor height with gentle undulation
        const rawHeight = this.noise(x, y) * 1.5;
        
        // Normalize height at edges
        const worldX = this.position.x - this.size.x/2 + (i / this.GRID_SIZE) * this.size.x;
        const worldZ = this.position.y - this.size.y/2 + (j / this.GRID_SIZE) * this.size.y;
        this.heightMap[i][j] = this.normalizeEdgeHeight(rawHeight, worldX, worldZ);
      }
    }
  }

  private createForestTerrain() {
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
      color: 0x355E3B,
      roughness: 0.8,
      metalness: 0.2
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(this.position.x, 0, this.position.y);
    terrain.receiveShadow = true;
    this.scene.add(terrain);
  }

  private noise(x: number, y: number): number {
    return (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123) % 1;
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

  private createTrees() {
    const treeCount = Math.floor((this.size.x * this.size.y) / 100); // Tree density
    
    for (let i = 0; i < treeCount; i++) {
      const x = this.position.x - this.size.x/2 + Math.random() * this.size.x;
      const z = this.position.y - this.size.y/2 + Math.random() * this.size.y;
      this.createTree(new THREE.Vector3(x, 0, z));
    }
  }

  private createTree(position: THREE.Vector3) {
    const tree = new THREE.Group();

    // Create trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4A3C2A });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1;
    trunk.castShadow = true;
    tree.add(trunk);

    // Create foliage
    const foliageColor = 0x355E3B;
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: foliageColor });

    const foliageLayers = [
      { y: 2.5, radius: 1.2, height: 1.5 },
      { y: 3.2, radius: 0.9, height: 1.2 },
      { y: 3.8, radius: 0.6, height: 1.0 }
    ];

    foliageLayers.forEach(layer => {
      const foliageGeometry = new THREE.ConeGeometry(layer.radius, layer.height, 8);
      const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
      foliage.position.y = layer.y;
      foliage.castShadow = true;
      tree.add(foliage);
    });

    tree.position.copy(position);
    this.scene.add(tree);
  }
} 