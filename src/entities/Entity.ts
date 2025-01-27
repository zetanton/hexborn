import * as THREE from '../../node_modules/@types/three';

export abstract class Entity {
  mesh: THREE.Group;
  protected velocity: THREE.Vector3;
  protected isGrounded: boolean;

  constructor() {
    this.mesh = new THREE.Group();
    this.velocity = new THREE.Vector3();
    this.isGrounded = false;
  }

  abstract update(delta: number, groundHeight: number): void;

  protected applyGravity(delta: number) {
    if (!this.isGrounded) {
      this.velocity.y -= 9.8 * delta;
    }
  }

  protected checkGroundCollision(groundHeight: number, characterHeight: number) {
    if (this.mesh.position.y < groundHeight + characterHeight) {
      this.mesh.position.y = groundHeight + characterHeight;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }
  }

  protected applyFriction() {
    if (this.isGrounded) {
      this.velocity.x *= 0.9;
      this.velocity.z *= 0.9;
    }

    // Only zero out very small movements
    if (Math.abs(this.velocity.x) < 0.001) this.velocity.x = 0;
    if (Math.abs(this.velocity.z) < 0.001) this.velocity.z = 0;
  }
} 