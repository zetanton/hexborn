import * as THREE from 'three';
import { Entity } from './Entity';

export class LilyPad extends Entity {
    private originalY: number = 0;
    private animationTime: number = 0;
    private readonly FLOAT_AMPLITUDE = 0.025;
    private readonly FLOAT_SPEED = 0.25;
    private floatOffset: number = 0;

    constructor(size: number = 6) {
        super();
        this.collisionRadius = size * 0.9; // Keep full size collision

        // Create the lily pad mesh
        const padGeometry = new THREE.CircleGeometry(size, 8);
        const padMaterial = new THREE.MeshStandardMaterial({
            color: 0x4daa43, // Keep lighter green
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const pad = new THREE.Mesh(padGeometry, padMaterial);
        pad.rotation.x = -Math.PI / 2;

        // Add some surface detail with slightly raised sections
        const detailGeometry = new THREE.CircleGeometry(size * 0.8, 8);
        const detailMaterial = new THREE.MeshStandardMaterial({
            color: 0x3d9a33, // Keep lighter medium green
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
            color: 0x2d8a23, // Keep lighter dark green
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

        // Calculate and store float offset with smoother motion
        this.floatOffset = Math.sin(this.animationTime * this.FLOAT_SPEED) * this.FLOAT_AMPLITUDE;
        this.mesh.position.y = this.originalY + this.floatOffset;

        // Add very slight rotation sway
        this.mesh.rotation.z = Math.sin(this.animationTime * this.FLOAT_SPEED * 0.5) * 0.01;
    }

    public getFloatOffset(): number {
        return this.floatOffset;
    }
} 