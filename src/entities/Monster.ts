import * as THREE from 'three';
import { Entity } from './Entity';
import { Character } from './Character';

export class Monster extends Entity {
  private target: THREE.Vector3 | null = null;
  private moveSpeed: number = 3;

  constructor(position: THREE.Vector3) {
    super();
    this.createMonsterMesh();
    this.mesh.position.copy(position);
  }

  private createMonsterMesh() {
    // Create monster body
    const bodyGeometry = new THREE.BoxGeometry(0.8, 1.5, 0.8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 }); // Dark red
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.75;
    this.mesh.add(body);

    // Create monster head
    const headGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0x800000 }); // Darker red
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.8;
    this.mesh.add(head);

    // Add glowing eyes
    const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000, emissive: 0xFF0000 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 1.8, 0.3);
    this.mesh.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 1.8, 0.3);
    this.mesh.add(rightEye);
  }

  update(delta: number, groundHeight: number) {
    this.applyGravity(delta);
    this.mesh.position.addScaledVector(this.velocity, delta);
    this.checkGroundCollision(groundHeight, 0.75);
    this.applyFriction();

    if (this.target) {
      this.moveTowardsTarget(delta);
    }
  }

  setTarget(target: THREE.Vector3) {
    this.target = target.clone();
  }

  private moveTowardsTarget(delta: number) {
    if (!this.target || !this.isGrounded) return;

    const direction = this.target.clone().sub(this.mesh.position);
    direction.y = 0;
    
    if (direction.length() > 0.5) {
      direction.normalize();
      this.velocity.x = direction.x * this.moveSpeed * delta;
      this.velocity.z = direction.z * this.moveSpeed * delta;

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
} 