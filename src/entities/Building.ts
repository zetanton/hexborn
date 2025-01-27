import * as THREE from 'three';
import { Entity } from './Entity';

export class Building extends Entity {
    private bounds: THREE.Box3;
    private worldBounds: THREE.Box3;

    constructor(geometry: THREE.BufferGeometry, material: THREE.Material) {
        super();
        const building = new THREE.Mesh(geometry, material);
        this.mesh.add(building);
        
        // Calculate local bounds once
        this.bounds = new THREE.Box3().setFromObject(this.mesh);
        // Create reusable world bounds
        this.worldBounds = new THREE.Box3();
        
        this.collisionRadius = Math.max(
            Math.abs(this.bounds.max.x - this.bounds.min.x),
            Math.abs(this.bounds.max.z - this.bounds.min.z)
        ) / 2;
    }

    public checkCollision(other: Entity): boolean {
        // Transform local bounds to world space only when needed
        this.worldBounds.copy(this.bounds).translate(this.mesh.position);
        
        const characterPos = other.mesh.position;
        const characterRadius = other.collisionRadius;

        // Quick radius check first
        const dx = characterPos.x - this.mesh.position.x;
        const dz = characterPos.z - this.mesh.position.z;
        if (dx * dx + dz * dz > (characterRadius + this.collisionRadius) * (characterRadius + this.collisionRadius)) {
            return false;
        }

        // More precise box check only if radius check passes
        const closestPoint = new THREE.Vector3();
        closestPoint.copy(characterPos);
        closestPoint.clamp(this.worldBounds.min, this.worldBounds.max);

        const distance = closestPoint.distanceTo(characterPos);
        return distance < characterRadius;
    }

    update(_delta: number, _groundHeight: number): void {
        // Buildings don't need regular updates
    }

    protected hasCustomCollision(): boolean {
        return true;
    }
} 