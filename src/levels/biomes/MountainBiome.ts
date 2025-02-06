import * as THREE from 'three';
import { Biome } from './Biome';
import { Boulder } from '../../entities';
import { Troll } from '../../entities/Troll';

export class MountainBiome extends Biome {
  private heightMap: number[][] = [];
  private readonly GRID_SIZE = 100;
  private readonly MAX_HEIGHT = 120;
  private trolls: Troll[] = [];

  protected generateTerrain(): void {
    this.generateHeightMap();
    this.createTerrain();
    this.addRocks();
    this.spawnTrolls();
  }

  private generateHeightMap() {
    // Generate a single centralized peak for Mt. Tamaranch style
    const peaks = [{ x: 0.5, z: 0.5, height: this.MAX_HEIGHT }];

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

        // Volcano crater at the top (center at normalized (0.5, 0.5))
        const dCenter = Math.sqrt(Math.pow(x - 0.5, 2) + Math.pow(z - 0.5, 2));
        const craterRadius = 0.1;
        const craterDepth = this.MAX_HEIGHT * 0.3; // 30% of MAX_HEIGHT
        if (dCenter < craterRadius) {
          height -= (1 - dCenter / craterRadius) * craterDepth;
        }

        // Cave entrance at the base (assume cave centered at normalized (0.5, 0.95))
        const dCave = Math.sqrt(Math.pow(x - 0.5, 2) + Math.pow(z - 0.95, 2));
        const caveRadius = 0.05; // Further reduced cave entrance size
        const caveDepth = this.MAX_HEIGHT * 0.2; // 20% of MAX_HEIGHT
        if (dCave < caveRadius) {
          height -= (1 - dCave / caveRadius) * caveDepth;
        }

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

    // Add vertex colors based on height and special features (volcano crater with lava, cave entry)
    const colors = [];
    for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
        const nx = i / (this.GRID_SIZE - 1);
        const nz = j / (this.GRID_SIZE - 1);
        const height = this.heightMap[i][j];
        const craterRadius = 0.1;
        const dCrater = Math.sqrt(Math.pow(nx - 0.5, 2) + Math.pow(nz - 0.5, 2));
        const dCaveVert = Math.sqrt(Math.pow(nx - 0.5, 2) + Math.pow(nz - 0.95, 2));
        const caveRadiusVert = 0.05;
        if (dCaveVert < caveRadiusVert) {
          // Cave entry as black
          colors.push(0, 0, 0);
        } else if (dCrater < craterRadius) {
          // Bubbling lava: add slight flicker effect
          const flicker = Math.random() * 0.1;
          colors.push(1.0, 0.3 + flicker, 0.0);
        } else if (height > this.MAX_HEIGHT * 0.8) {
          colors.push(0.4, 0.2, 0.2); // Volcanic peak (reddish)
        } else if (height > this.MAX_HEIGHT * 0.5) {
          colors.push(0.3, 0.3, 0.3); // Rocky section (dark gray)
        } else {
          colors.push(0.2, 0.15, 0.1); // Barren ground (dark brown)
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
    const boulder = new Boulder(position);
    this.addGroundedObject(boulder.mesh, position, 0);
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

  private spawnTrolls() {
    // Define strategic protection points on the mountain
    const protectionPoints = [
      { x: 0.3, z: 0.3, height: this.MAX_HEIGHT * 0.3 },  // Lower slopes
      { x: 0.5, z: 0.5, height: this.MAX_HEIGHT * 0.7 },  // Near peak
      { x: 0.7, z: 0.7, height: this.MAX_HEIGHT * 0.5 }   // Mid-level
    ];

    // Get mountain bounds
    const bounds = {
      min: new THREE.Vector2(
        this.position.x - this.size.x/2,
        this.position.y - this.size.y/2
      ),
      max: new THREE.Vector2(
        this.position.x + this.size.x/2,
        this.position.y + this.size.y/2
      )
    };

    protectionPoints.forEach(pos => {
      const worldX = this.position.x - this.size.x/2 + pos.x * this.size.x;
      const worldZ = this.position.y - this.size.y/2 + pos.z * this.size.y;
      const spawnPosition = new THREE.Vector3(worldX, pos.height + 1, worldZ);
      
      const troll = new Troll(spawnPosition);
      troll.setMountainBounds(bounds.min, bounds.max);
      troll.setProtectionPoint(spawnPosition);
      this.trolls.push(troll);
      this.scene.add(troll.mesh);
    });
  }

  public update(delta: number, playerPosition: THREE.Vector3) {
    // Update all trolls
    this.trolls.forEach(troll => {
      // Only target player if they're climbing the mountain
      const groundHeight = this.getGroundHeight(playerPosition);
      if (groundHeight > this.MAX_HEIGHT * 0.3) { // If player is climbing
        troll.setTarget(playerPosition);
      } else {
        // Let the troll handle its own patrolling behavior
        troll.setTarget(troll.getProtectionPoint()?.clone() || playerPosition);
      }
      
      // Update troll with current ground height
      const trollGroundHeight = this.getGroundHeight(troll.mesh.position);
      troll.update(delta, trollGroundHeight);
    });
  }

  public getTrolls(): Troll[] {
    return this.trolls;
  }
} 