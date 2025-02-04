import * as THREE from 'three';
import { Entity } from './Entity';

export class LilyPad extends Entity {
    private originalY: number = 0;
    private animationTime: number = 0;
    private readonly FLOAT_AMPLITUDE = 0.1;
    private readonly FLOAT_SPEED = 1;

    constructor(size: number = 3) {
        super();
        this.collisionRadius = size * 0.4; // Slightly smaller than visual size for better gameplay

        // Create the lily pad mesh
        const padGeometry = new THREE.CircleGeometry(size, 8);
        const padMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d5a27,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const pad = new THREE.Mesh(padGeometry, padMaterial);
        pad.rotation.x = -Math.PI / 2;

        // Add some surface detail with slightly raised sections
        const detailGeometry = new THREE.CircleGeometry(size * 0.8, 8);
        const detailMaterial = new THREE.MeshStandardMaterial({
            color: 0x1d4a17,
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const detail = new THREE.Mesh(detailGeometry, detailMaterial);
        detail.rotation.x = -Math.PI / 2;
        detail.position.y = 0.05;

        // Add a center bump
        const bumpGeometry = new THREE.CircleGeometry(size * 0.2, 8);
        const bumpMaterial = new THREE.MeshStandardMaterial({
            color: 0x0d3a07,
            roughness: 1.0,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const bump = new THREE.Mesh(bumpGeometry, bumpMaterial);
        bump.rotation.x = -Math.PI / 2;
        bump.position.y = 0.1;

        this.mesh.add(pad);
        this.mesh.add(detail);
        this.mesh.add(bump);

        // Add some randomization to the rotation
        this.mesh.rotation.y = Math.random() * Math.PI * 2;
    }

    update(delta: number): void {
        // Store original Y position on first update if not already set
        if (this.originalY === 0) {
            this.originalY = this.mesh.position.y;
        }

        // Update animation time
        this.animationTime += delta;

        // Apply floating motion
        const floatOffset = Math.sin(this.animationTime * this.FLOAT_SPEED) * this.FLOAT_AMPLITUDE;
        this.mesh.position.y = this.originalY + floatOffset;

        // Add slight rotation sway
        this.mesh.rotation.z = Math.sin(this.animationTime * this.FLOAT_SPEED * 0.5) * 0.02;
    }
} 