import * as THREE from 'three';
import { Entity } from './Entity';

export class Cactus extends Entity {
    constructor(position: THREE.Vector3) {
        super();
        this.createCactus();
        this.mesh.position.copy(position);
        this.collisionRadius = 0.6;
    }

    private createCactus() {
        const cactus = new THREE.Group();

        const cactusMaterial = new THREE.MeshStandardMaterial({
            color: 0x2F784F,
            roughness: 0.8,
            metalness: 0.1
        });

        const bodyHeight = 2.5 + Math.random() * 2;
        const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.3, bodyHeight, 12);
        const body = new THREE.Mesh(bodyGeometry, cactusMaterial);
        body.position.y = bodyHeight/2;
        body.castShadow = true;
        cactus.add(body);

        const armCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < armCount; i++) {
            const armHeight = 1.2 + Math.random();
            const segments = 8;
            const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0, armHeight * 0.3, 0),
                new THREE.Vector3(0, armHeight, 0)
            ]);

            const armGeometry = new THREE.TubeGeometry(curve, segments, 0.15, 8, false);
            const arm = new THREE.Mesh(armGeometry, cactusMaterial);
            
            const angle = (i / armCount) * Math.PI * 2;
            const heightOnBody = bodyHeight * (0.4 + Math.random() * 0.3);
            arm.position.set(
                Math.cos(angle) * 0.35,
                heightOnBody,
                Math.sin(angle) * 0.35
            );
            arm.rotation.z = Math.PI/2 - angle;
            arm.castShadow = true;
            cactus.add(arm);
        }

        this.mesh.add(cactus);
    }

    update(_delta: number, groundHeight: number): void {
        this.mesh.position.y = groundHeight;
    }

    protected hasCustomCollision(): boolean {
        return true;
    }
} 