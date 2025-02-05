import * as THREE from 'three';
import { Monster } from './Monster';

export class RedLurker extends Monster {
    private readonly DAMAGE = 10;

    constructor(position: THREE.Vector3) {
        super(position);
        this.createMonsterMesh();
    }

    protected createMonsterMesh(): void {
        // Create monster body
        const bodyGeometry = new THREE.BoxGeometry(0.8, 1.5, 0.8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 }); // Dark red
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.75;
        body.castShadow = true;
        body.receiveShadow = true;
        this.mesh.add(body);

        // Create monster head
        const headGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0x800000 }); // Darker red
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.8;
        head.castShadow = true;
        head.receiveShadow = true;
        this.mesh.add(head);

        // Add glowing eyes
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFF0000, 
            emissive: 0xFF0000 
        });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.15, 1.8, 0.3);
        leftEye.castShadow = true;
        this.mesh.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.15, 1.8, 0.3);
        rightEye.castShadow = true;
        this.mesh.add(rightEye);
    }

    public getDamage(): number {
        return this.DAMAGE;
    }
} 