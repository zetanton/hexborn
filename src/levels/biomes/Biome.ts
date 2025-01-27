import * as THREE from 'three';

export abstract class Biome {
  protected scene: THREE.Scene;
  protected position: THREE.Vector2;
  protected size: THREE.Vector2;
  protected static readonly BASE_HEIGHT = 0;
  protected readonly EDGE_BLEND = 15;

  constructor(scene: THREE.Scene, position: THREE.Vector2, size: THREE.Vector2) {
    this.scene = scene;
    this.position = position;
    this.size = size;
  }

  protected normalizeEdgeHeight(height: number, x: number, z: number): number {
    const edgeFactor = this.getEdgeBlendFactor(x, z);
    // Blend between the terrain height and base height
    return Biome.BASE_HEIGHT + (height - Biome.BASE_HEIGHT) * edgeFactor;
  }

  protected getEdgeBlendFactor(x: number, z: number): number {
    // Calculate distance from edges as a percentage
    const xDist = Math.min(
      (x - (this.position.x - this.size.x/2)) / this.EDGE_BLEND,
      (this.position.x + this.size.x/2 - x) / this.EDGE_BLEND
    );
    const zDist = Math.min(
      (z - (this.position.y - this.size.y/2)) / this.EDGE_BLEND,
      (this.position.y + this.size.y/2 - z) / this.EDGE_BLEND
    );
    
    // Smoother transition using square function
    const factor = Math.min(xDist, zDist);
    return Math.min(factor * factor, 1);
  }

  abstract generate(): void;
  
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