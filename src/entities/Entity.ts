import * as THREE from 'three';

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
      this.velocity.y -= 20 * delta; // Increased gravity
      // Terminal velocity
      if (this.velocity.y < -20) {
        this.velocity.y = -20;
      }
    }
  }

  protected checkGroundCollision(groundHeight: number, characterHeight: number) {
    const feet = this.mesh.position.y - characterHeight;
    const buffer = 0.1; // Small buffer for better ground detection

    if (feet <= groundHeight + buffer) {
      this.mesh.position.y = groundHeight + characterHeight;
      this.velocity.y = Math.max(0, this.velocity.y); // Only zero out downward velocity
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }
  }

  protected applyFriction() {
    if (this.isGrounded) {
      this.velocity.x *= 0.8; // Increased friction
      this.velocity.z *= 0.8;
    } else {
      this.velocity.x *= 0.98; // Air resistance
      this.velocity.z *= 0.98;
    }

    // Only zero out very small movements
    if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
    if (Math.abs(this.velocity.z) < 0.01) this.velocity.z = 0;
  }

  public getVelocity(): THREE.Vector3 {
    return this.velocity;
  }

  public isOnGround(): boolean {
    return this.isGrounded;
  }
} 