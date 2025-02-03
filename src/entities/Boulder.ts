import * as THREE from 'three';
import { Entity } from './Entity';

export class Boulder extends Entity {
  private scaleFactor: number;

  constructor(position: THREE.Vector3) {
    super();
    // Vary size: random scale between 0.5 and 3.0, with a chance for larger boulders
    this.scaleFactor = Math.random() * 2.5 + 0.5;
    if (Math.random() < 0.2) { // 20% chance to be larger
      this.scaleFactor *= 1.5;
    }

    // Create geometry for the boulder using a dodecahedron shape
    const geometry = new THREE.DodecahedronGeometry(1, 0);
    const material = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.9,
    });
    const boulderMesh = new THREE.Mesh(geometry, material);
    boulderMesh.castShadow = true;
    boulderMesh.receiveShadow = true;
    boulderMesh.scale.set(this.scaleFactor, this.scaleFactor, this.scaleFactor);

    // Use a group to hold the boulder mesh
    this.mesh = new THREE.Group();
    this.mesh.add(boulderMesh);
    this.mesh.position.copy(position);

    // Set collision radius proportional to the boulder size
    this.collisionRadius = this.scaleFactor;
  }

  update(delta: number, groundHeight: number): void {
    // Apply gravity
    this.applyGravity(delta);
    // Update position based on velocity
    this.mesh.position.addScaledVector(this.velocity, delta);

    // Check ground collision using bounding box; ensure the boulder sits on the ground
    const bbox = new THREE.Box3().setFromObject(this.mesh);
    const bottom = bbox.min.y;
    const buffer = 0.1; // small buffer
    if (bottom < groundHeight + buffer) {
      const offset = groundHeight + buffer - bottom;
      this.mesh.position.y += offset;
      if (this.velocity.y < 0) {
        this.velocity.y = 0;
      }
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // Apply friction
    this.applyFriction();
  }
} 