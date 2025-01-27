import * as THREE from 'three';

export abstract class Biome {
  protected scene: THREE.Scene;
  protected position: THREE.Vector2;
  protected size: THREE.Vector2;
  protected readonly EDGE_BLEND = 15; // Edge blend zone
  protected readonly FLAT_EDGE_WIDTH = 10; // Width of flat border
  protected static readonly BASE_HEIGHT = 0; // Base height for all biomes
  protected objects: THREE.Object3D[] = [];
  private isGenerated: boolean = false;

  constructor(scene: THREE.Scene, position: THREE.Vector2, size: THREE.Vector2) {
    this.scene = scene;
    this.position = position;
    this.size = size;
  }

  protected getEdgeWeight(x: number, z: number): number {
    // Calculate distance from edges
    const distanceFromEdgeX = Math.min(
      x - (this.position.x - this.size.x/2),
      (this.position.x + this.size.x/2) - x
    );
    const distanceFromEdgeZ = Math.min(
      z - (this.position.y - this.size.y/2),
      (this.position.y + this.size.y/2) - z
    );

    // If within FLAT_EDGE_WIDTH of any edge, return 0 for completely flat
    if (distanceFromEdgeX < this.FLAT_EDGE_WIDTH || distanceFromEdgeZ < this.FLAT_EDGE_WIDTH) {
      return 0;
    }

    // If within blend zone after flat edge, smoothly interpolate
    const blendStart = this.FLAT_EDGE_WIDTH;
    const blendEnd = this.FLAT_EDGE_WIDTH + this.EDGE_BLEND;
    
    const blendFactorX = Math.min(
      this.smoothStep(blendStart, blendEnd, distanceFromEdgeX),
      this.smoothStep(blendStart, blendEnd, distanceFromEdgeZ)
    );

    return blendFactorX;
  }

  // Smooth interpolation function
  private smoothStep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  // Helper method for biomes to blend their height with base height
  protected blendHeightWithEdge(x: number, z: number, originalHeight: number): number {
    const edgeWeight = this.getEdgeWeight(x, z);
    return Biome.BASE_HEIGHT + (originalHeight - Biome.BASE_HEIGHT) * edgeWeight;
  }

  public getPosition(): THREE.Vector2 {
    return this.position;
  }

  public setVisible(visible: boolean): void {
    this.objects.forEach(obj => {
      obj.visible = visible;
      // Also update any children
      obj.traverse((child) => {
        child.visible = visible;
      });
    });
  }

  public cleanup(): void {
    // Only remove from scene, don't dispose geometries/materials
    this.objects.forEach(obj => {
      this.scene.remove(obj);
    });
    this.objects = [];
    this.isGenerated = false;
  }

  protected addGroundedObject(object: THREE.Object3D, position: THREE.Vector3, offset: number = 0): void {
    // Place object on ground first
    this.placeObjectOnGround(object, position, offset);
    // Then add to scene and tracking
    this.addObject(object);
  }

  protected placeObjectOnGround(object: THREE.Object3D, position: THREE.Vector3, offset: number = 0): void {
    // Get ground height at position
    const groundHeight = this.getGroundHeight(position);
    
    // Calculate object's height and bounds
    const bbox = new THREE.Box3().setFromObject(object);
    
    // Reset object position to origin before calculating final position
    object.position.set(0, 0, 0);
    bbox.setFromObject(object);
    
    // Calculate how much to move up from ground to place bottom at ground level
    const bottomOffset = -bbox.min.y;
    
    // Place object with its bottom at ground level plus any offset
    object.position.set(
      position.x,
      groundHeight + bottomOffset + offset,
      position.z
    );

    // Add natural variation to rotation
    object.rotation.y = Math.random() * Math.PI * 2;
    
    // Calculate slope for object tilting
    const slopeCheckDistance = 0.5;
    const heightNorth = this.getGroundHeight(new THREE.Vector3(position.x, 0, position.z + slopeCheckDistance));
    const heightSouth = this.getGroundHeight(new THREE.Vector3(position.x, 0, position.z - slopeCheckDistance));
    const heightEast = this.getGroundHeight(new THREE.Vector3(position.x + slopeCheckDistance, 0, position.z));
    const heightWest = this.getGroundHeight(new THREE.Vector3(position.x - slopeCheckDistance, 0, position.z));
    
    // Apply slope-based rotation (reduced effect for stability)
    object.rotation.x = Math.atan2(heightNorth - heightSouth, slopeCheckDistance * 2) * 0.3;
    object.rotation.z = Math.atan2(heightEast - heightWest, slopeCheckDistance * 2) * 0.3;
  }

  protected addObject(object: THREE.Object3D): void {
    this.objects.push(object);
    this.scene.add(object);
  }

  public generate(): void {
    if (!this.isGenerated) {
      this.generateTerrain();
      this.isGenerated = true;
    }
  }

  protected abstract generateTerrain(): void;

  getGroundHeight(_position: THREE.Vector3): number {
    // Default implementation for flat ground
    return 0;
  }

  isInBiome(position: THREE.Vector3): boolean {
    return position.x >= this.position.x - this.size.x/2 &&
           position.x <= this.position.x + this.size.x/2 &&
           position.z >= this.position.y - this.size.y/2 &&
           position.z <= this.position.y + this.size.y/2;
  }
} 