import * as THREE from 'three';
import { Biome } from './Biome';

export class CityBiome extends Biome {
  private heightMap: number[][] = [];
  private readonly GRID_SIZE = 100;

  generate(): void {
    this.generateHeightMap();
    this.createCityTerrain();
    this.createRoads();
    this.createBuildings();
  }

  private generateHeightMap() {
    for (let i = 0; i < this.GRID_SIZE; i++) {
      this.heightMap[i] = [];
      for (let j = 0; j < this.GRID_SIZE; j++) {
        const x = (i / this.GRID_SIZE) * 4;
        const y = (j / this.GRID_SIZE) * 4;
        
        // City terrain is mostly flat with slight variations
        const rawHeight = this.noise(x, y) * 0.5;
        
        // Normalize height at edges
        const worldX = this.position.x - this.size.x/2 + (i / this.GRID_SIZE) * this.size.x;
        const worldZ = this.position.y - this.size.y/2 + (j / this.GRID_SIZE) * this.size.y;
        this.heightMap[i][j] = this.normalizeEdgeHeight(rawHeight, worldX, worldZ);
      }
    }
  }

  private createCityTerrain() {
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
      color: 0x808080,
      roughness: 0.9,
      metalness: 0.1
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

  private createRoads() {
    const roadWidth = 5;
    const blockSize = 20;
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.8,
      metalness: 0.2
    });

    // Create grid of roads
    for (let x = -this.size.x/2; x <= this.size.x/2; x += blockSize) {
      const roadGeometry = new THREE.PlaneGeometry(roadWidth, this.size.y);
      const road = new THREE.Mesh(roadGeometry, roadMaterial);
      road.rotation.x = -Math.PI / 2;
      road.position.set(this.position.x + x, 0.01, this.position.y);
      this.scene.add(road);
    }

    for (let y = -this.size.y/2; y <= this.size.y/2; y += blockSize) {
      const roadGeometry = new THREE.PlaneGeometry(this.size.x, roadWidth);
      const road = new THREE.Mesh(roadGeometry, roadMaterial);
      road.rotation.x = -Math.PI / 2;
      road.position.set(this.position.x, 0.01, this.position.y + y);
      this.scene.add(road);
    }
  }

  private createBuildings() {
    const blockSize = 20;
    const buildingMargin = 7;
    const buildingColors = [0x808080, 0x606060, 0x404040, 0xA0A0A0];

    for (let x = -this.size.x/2 + blockSize/2; x < this.size.x/2; x += blockSize) {
      for (let y = -this.size.y/2 + blockSize/2; y < this.size.y/2; y += blockSize) {
        // Random chance to skip a building (empty lot)
        if (Math.random() < 0.2) continue;

        const buildingWidth = 5 + Math.random() * (blockSize - buildingMargin * 2);
        const buildingDepth = 5 + Math.random() * (blockSize - buildingMargin * 2);
        const buildingHeight = 5 + Math.random() * 30;

        this.createBuilding(
          new THREE.Vector3(
            this.position.x + x + (-buildingWidth/2 + Math.random() * buildingWidth),
            buildingHeight/2,
            this.position.y + y + (-buildingDepth/2 + Math.random() * buildingDepth)
          ),
          buildingWidth,
          buildingDepth,
          buildingHeight,
          buildingColors[Math.floor(Math.random() * buildingColors.length)]
        );
      }
    }
  }

  private createBuilding(position: THREE.Vector3, width: number, depth: number, height: number, color: number) {
    const building = new THREE.Group();

    // Main structure
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
      metalness: 0.3
    });
    const mainStructure = new THREE.Mesh(geometry, material);
    mainStructure.castShadow = true;
    building.add(mainStructure);

    // Windows
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x87CEEB,
      roughness: 0.2,
      metalness: 0.8
    });

    const windowSize = 0.5;
    const windowSpacing = 1.5;
    const windowRows = Math.floor(height / windowSpacing) - 1;
    const windowCols = Math.floor(width / windowSpacing) - 1;

    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        const windowGeometry = new THREE.BoxGeometry(windowSize, windowSize, 0.1);
        const windowPane = new THREE.Mesh(windowGeometry, windowMaterial);
        windowPane.position.set(
          -width/2 + windowSpacing + col * windowSpacing,
          -height/2 + windowSpacing + row * windowSpacing,
          depth/2 + 0.1
        );
        building.add(windowPane);

        // Add windows to other sides
        if (col === 0) {
          const sideWindow = windowPane.clone();
          sideWindow.rotation.y = Math.PI / 2;
          sideWindow.position.set(
            -width/2 - 0.1,
            -height/2 + windowSpacing + row * windowSpacing,
            depth/2 - windowSpacing - col * windowSpacing
          );
          building.add(sideWindow);
        }
      }
    }

    building.position.copy(position);
    this.scene.add(building);
  }
} 