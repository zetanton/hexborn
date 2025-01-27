import * as THREE from 'three';

export abstract class Biome {
  protected scene: THREE.Scene;
  protected position: THREE.Vector2;
  protected size: THREE.Vector2;

  constructor(scene: THREE.Scene, position: THREE.Vector2, size: THREE.Vector2) {
    this.scene = scene;
    this.position = position;
    this.size = size;
  }

  abstract generate(): void;
  
  getGroundHeight(_position: THREE.Vector3): number {
    // Default implementation for flat ground
    return 0;
  }

  isInBiome(position: THREE.Vector3): boolean {
    return position.x >= this.position.x - this.size.x / 2 &&
           position.x <= this.position.x + this.size.x / 2 &&
           position.z >= this.position.y - this.size.y / 2 &&
           position.z <= this.position.y + this.size.y / 2;
  }
} 