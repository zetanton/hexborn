import * as THREE from 'three';
import { Entity } from './Entity';

export class Tree extends Entity {
    constructor(position: THREE.Vector3) {
        super();
        this.createTree();
        this.mesh.position.copy(position);
        this.collisionRadius = 2.1; // Increased for larger trunk (0.7 * 3)
    }

    private createTree() {
        // Create trunk (much taller)
        const trunkGeometry = new THREE.CylinderGeometry(0.7, 1.4, 12, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4A3C2A,
            roughness: 0.9
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 6;
        trunk.castShadow = true;
        this.mesh.add(trunk);

        // Create more lush foliage with more layers
        const foliageColor = 0x2D4F1E; // Darker, richer green
        const foliageMaterial = new THREE.MeshStandardMaterial({ 
            color: foliageColor,
            roughness: 0.8
        });

        // More layers of foliage, getting progressively smaller
        const foliageLayers = [
            { y: 10.0, radius: 6.0, height: 7.0 },  // Bottom layer (widest)
            { y: 13.0, radius: 5.2, height: 6.0 },
            { y: 15.5, radius: 4.5, height: 5.0 },
            { y: 17.5, radius: 3.8, height: 4.0 },
            { y: 19.0, radius: 3.0, height: 3.5 },  // Top layer (smallest)
        ];

        foliageLayers.forEach(layer => {
            const foliageGeometry = new THREE.ConeGeometry(layer.radius, layer.height, 8);
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.y = layer.y;
            foliage.castShadow = true;
            
            // Add some random rotation to each layer for more natural look
            foliage.rotation.y = Math.random() * Math.PI * 2;
            this.mesh.add(foliage);
        });
    }

    update(delta: number, groundHeight: number): void {
        // Trees don't need to update, they're static
        this.mesh.position.y = groundHeight;
    }

    protected hasCustomCollision(): boolean {
        return true;
    }

    public checkCollision(other: Entity): boolean {
        const dx = this.mesh.position.x - other.mesh.position.x;
        const dz = this.mesh.position.z - other.mesh.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        return distance < (this.collisionRadius + other.collisionRadius);
    }
} 