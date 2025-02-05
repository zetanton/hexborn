import * as THREE from 'three';
import { Entity } from './Entity';
import { Character } from './Character';

export abstract class Monster extends Entity {
  protected target: Character | THREE.Vector3 | null = null;
  protected moveSpeed: number = 3;

  constructor(position: THREE.Vector3) {
    super();
    this.mesh.position.copy(position);
  }

  update(delta: number, groundHeight: number) {
    this.applyGravity(delta);
    this.mesh.position.addScaledVector(this.velocity, delta);
    this.checkGroundCollision(groundHeight, 0);
    this.applyFriction();

    if (this.target) {
      this.moveTowardsTarget(delta);
    }
  }

  setTarget(target: Character | THREE.Vector3) {
    this.target = target;
  }

  protected getTarget(): Character | THREE.Vector3 | null {
    return this.target;
  }

  protected setMoveSpeed(speed: number) {
    this.moveSpeed = speed;
  }

  protected moveTowardsTarget(delta: number) {
    if (!this.target || !this.isGrounded) return;

    const targetPosition = this.target instanceof Character ? this.target.mesh.position : this.target;
    const direction = targetPosition.clone().sub(this.mesh.position);
    direction.y = 0;
    
    if (direction.length() > 0.5) {
      direction.normalize();
      // Scale moveSpeed by 60 to compensate for delta being 1/60
      this.velocity.x = direction.x * this.moveSpeed * 60 * delta;
      this.velocity.z = direction.z * this.moveSpeed * 60 * delta;

      // Update monster rotation to face movement direction
      const angle = Math.atan2(direction.x, direction.z);
      this.mesh.rotation.y = angle;
    }
  }

  public onCollideWithCharacter(_character: Character) {
    // Stop the monster's movement towards the character
    const dx = this.mesh.position.x - _character.mesh.position.x;
    const dz = this.mesh.position.z - _character.mesh.position.z;
    const norm = Math.sqrt(dx * dx + dz * dz);
    const dirX = dx / norm;
    const dirZ = dz / norm;
    
    // Stop velocity in the collision direction
    const dotProduct = (this.velocity.x * dirX + this.velocity.z * dirZ);
    if (dotProduct < 0) {
        this.velocity.x -= dotProduct * dirX;
        this.velocity.z -= dotProduct * dirZ;
    }
  }

  // Abstract methods that derived classes must implement
  protected abstract createMonsterMesh(): void;
  public abstract getDamage(): number;
} 