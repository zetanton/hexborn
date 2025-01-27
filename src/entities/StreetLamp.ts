import * as THREE from 'three';
import { Entity } from './Entity';

export class StreetLamp extends Entity {
    private static bulbMaterial: THREE.MeshStandardMaterial;
    private bounds: THREE.Box3;
    private worldBounds: THREE.Box3;

    private static createBulbMaterial() {
        if (!StreetLamp.bulbMaterial) {
            StreetLamp.bulbMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffcc,
                emissive: 0xffffcc,
                emissiveIntensity: 1
            });
        }
        return StreetLamp.bulbMaterial;
    }

    constructor() {
        super();
        
        // Create the pole
        const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 8, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            metalness: 0.8,
            roughness: 0.2
        });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 4; // Half height
        this.mesh.add(pole);

        // Create the lamp head
        const headGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.4, 8);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            metalness: 0.8,
            roughness: 0.2
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 8.2; // Top of pole + half height of head
        this.mesh.add(head);

        // Create the light bulb (emissive material)
        const bulbGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const bulb = new THREE.Mesh(bulbGeometry, StreetLamp.createBulbMaterial());
        bulb.position.y = 8;
        this.mesh.add(bulb);

        // Calculate collision bounds
        this.bounds = new THREE.Box3().setFromObject(this.mesh);
        this.worldBounds = new THREE.Box3();
        
        // Set collision radius for basic collision detection
        this.collisionRadius = 0.4;

        // Cast shadows
        pole.castShadow = true;
        head.castShadow = true;
    }

    public checkCollision(other: Entity): boolean {
        // Transform local bounds to world space
        this.worldBounds.copy(this.bounds).translate(this.mesh.position);
        
        const characterPos = other.mesh.position;
        const characterRadius = other.collisionRadius;

        // Quick radius check first
        const dx = characterPos.x - this.mesh.position.x;
        const dz = characterPos.z - this.mesh.position.z;
        if (dx * dx + dz * dz > (characterRadius + this.collisionRadius) * (characterRadius + this.collisionRadius)) {
            return false;
        }

        // More precise box check
        const closestPoint = new THREE.Vector3();
        closestPoint.copy(characterPos);
        closestPoint.clamp(this.worldBounds.min, this.worldBounds.max);

        const distance = closestPoint.distanceTo(characterPos);
        return distance < characterRadius;
    }

    update(_delta: number, _groundHeight: number): void {
        // Street lamps don't need regular updates
        // But we could add light flickering or day/night cycle here
    }

    protected hasCustomCollision(): boolean {
        return true;
    }
} 