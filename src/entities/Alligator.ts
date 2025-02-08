import * as THREE from 'three';
import { Monster } from './Monster';
import { Character } from './Character';
import { SwampBiome } from '../levels/biomes/SwampBiome';

enum AlligatorState {
    SWIMMING,
    ATTACKING
}

export class Alligator extends Monster {
    private readonly ATTACK_RANGE = 15;
    private readonly ATTACK_COOLDOWN = 3;
    private readonly DAMAGE = 25;
    private readonly SWIM_SPEED = 4;
    private readonly AGGRO_RANGE = 25;
    private readonly WATER_LEVEL = 0.5;
    private readonly SNOUT_OFFSET = 6; // Distance from center to snout tip
    private readonly SNOUT_RADIUS = 1; // Radius for snout collision check

    // Properties for attack animation timing.
    private attackAnimationTimer: number = 0;
    private readonly ATTACK_ANIMATION_DURATION: number = 0.7; // in seconds

    private swampBounds: { min: THREE.Vector2, max: THREE.Vector2 } | null = null;
    private bodyGroup: THREE.Group;
    private head: THREE.Group;
    private jaw: THREE.Group;
    private tail: THREE.Group;
    private currentState: AlligatorState = AlligatorState.SWIMMING;
    private attackCooldown: number = 0;
    private targetPoint: THREE.Vector3 | null = null;
    private swampBiome: SwampBiome | null = null;

    constructor(position: THREE.Vector3, swampBiome: SwampBiome) {
        super(position);
        this.collisionRadius = 4;
        this.bodyGroup = new THREE.Group();
        this.head = new THREE.Group();
        this.jaw = new THREE.Group();
        this.tail = new THREE.Group();
        this.mesh.add(this.bodyGroup);
        this.createMonsterMesh();
        this.setMoveSpeed(this.SWIM_SPEED);
        this.swampBiome = swampBiome;
        this.pickNewSwimTarget();
    }

    protected createMonsterMesh(): void {
        // Create main body.
        const bodyGeometry = new THREE.BoxGeometry(8, 2, 3);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d4a1d,
            roughness: 0.9,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.bodyGroup.add(body);

        // Add legs.
        const legGeometry = new THREE.BoxGeometry(0.8, 1.5, 0.8);
        const legMaterial = bodyMaterial;
        [-1, 1].forEach(xDir => {
            [-1.5, 1.5].forEach(zPos => {
                const leg = new THREE.Mesh(legGeometry, legMaterial);
                leg.position.set(zPos, -1, xDir);
                this.bodyGroup.add(leg);
            });
        });

        // Create head.
        const headGroup = new THREE.Group();
        const baseHeadGeometry = new THREE.BoxGeometry(2, 1, 2.5);
        const baseHead = new THREE.Mesh(baseHeadGeometry, bodyMaterial);
        headGroup.add(baseHead);

        // Snout.
        const snoutGeometry = new THREE.BoxGeometry(3, 0.8, 1.8);
        const snout = new THREE.Mesh(snoutGeometry, bodyMaterial);
        snout.position.set(1.5, 0, 0);
        headGroup.add(snout);

        // Create jaw.
        const jawGeometry = new THREE.BoxGeometry(3.2, 0.6, 1.6);
        const jawMesh = new THREE.Mesh(jawGeometry, bodyMaterial);
        jawMesh.position.set(1.6, 0, 0);
        this.jaw.add(jawMesh);
        this.jaw.position.set(0, -0.3, 0);
        headGroup.add(this.jaw);

        // Add teeth.
        const teethMaterial = new THREE.MeshStandardMaterial({
            color: 0xf0f0f0,
            roughness: 0.5,
            metalness: 0.2
        });
        const toothPositions = [
            { x: 2.8, z: 0.5 }, { x: 2.3, z: 0.6 }, { x: 1.8, z: 0.6 },
            { x: 1.3, z: 0.5 }, { x: 0.8, z: 0.4 }
        ];
        toothPositions.forEach(pos => {
            const upperTooth = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 4), teethMaterial);
            upperTooth.position.set(pos.x, -0.1, pos.z);
            upperTooth.rotation.x = Math.PI;
            headGroup.add(upperTooth);

            const lowerTooth = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 4), teethMaterial);
            lowerTooth.position.set(pos.x, 0.1, pos.z);
            this.jaw.add(lowerTooth);

            const upperMirror = upperTooth.clone();
            upperMirror.position.z = -pos.z;
            headGroup.add(upperMirror);

            const lowerMirror = lowerTooth.clone();
            lowerMirror.position.z = -pos.z;
            this.jaw.add(lowerMirror);
        });

        // Add eyes.
        const eyeGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xff6600,
            emissive: 0xff3300,
            emissiveIntensity: 0.5
        });
        [-1, 1].forEach(side => {
            const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            eye.position.set(0.5, 0.6, side * 0.9);
            headGroup.add(eye);
        });

        headGroup.position.set(4, 0.25, 0);
        this.head.add(headGroup);

        // Create tail.
        const tailSegments = 6;
        const tailJoints: THREE.Group[] = [];
        for (let i = 0; i < tailSegments; i++) {
            const jointGroup = new THREE.Group();
            const segmentSize = 1.5 - (i * 0.2);
            const segmentGeometry = new THREE.BoxGeometry(segmentSize, 1.5 - (i * 0.15), 2 - (i * 0.25));
            const segment = new THREE.Mesh(segmentGeometry, bodyMaterial);
            segment.position.x = -segmentSize / 2;
            jointGroup.position.set(-(i === 0 ? 4 : 1.2), 0, 0);
            jointGroup.add(segment);
            if (i === 0) {
                this.tail.add(jointGroup);
            } else {
                tailJoints[i - 1].add(jointGroup);
            }
            tailJoints.push(jointGroup);
        }
        this.tail.userData.joints = tailJoints;

        // Assemble the alligator.
        this.bodyGroup.add(this.head);
        this.bodyGroup.add(this.tail);

        // Initial positioning.
        this.mesh.position.y = this.WATER_LEVEL;
        // Assume model faces +X.
        this.mesh.rotation.y = 0;
    }

    public setSwampBounds(min: THREE.Vector2, max: THREE.Vector2) {
        this.swampBounds = { min, max };
    }

    update(delta: number, groundHeight: number): void {
        super.update(delta, groundHeight);

        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta;
        }

        // State handling.
        if (this.currentState === AlligatorState.ATTACKING) {
            this.attackAnimationTimer -= delta;
            if (this.attackAnimationTimer <= 0) {
                this.currentState = AlligatorState.SWIMMING;
                this.pickNewSwimTarget();
            }
        } else if (this.target instanceof Character) {
            const distanceToTarget = this.mesh.position.distanceTo(this.target.mesh.position);
            if (distanceToTarget <= this.ATTACK_RANGE && this.attackCooldown <= 0) {
                this.currentState = AlligatorState.ATTACKING;
                this.attackAnimationTimer = this.ATTACK_ANIMATION_DURATION;
            } else if (distanceToTarget > this.AGGRO_RANGE) {
                this.currentState = AlligatorState.SWIMMING;
                this.target = null;
                this.pickNewSwimTarget();
            } else {
                this.currentState = AlligatorState.SWIMMING;
                this.targetPoint = this.target.mesh.position.clone();
            }
        }

        // Movement update.
        switch (this.currentState) {
            case AlligatorState.SWIMMING:
                this.updateSwimming();
                break;
            case AlligatorState.ATTACKING:
                this.updateAttacking();
                break;
        }

        this.enforceSwampBoundaries();
        this.animateBody(delta);

        if (this.currentState === AlligatorState.ATTACKING && this.target instanceof Character) {
            const attackProgress = 1 - (this.attackAnimationTimer / this.ATTACK_ANIMATION_DURATION);
            if (attackProgress >= 0.3 && attackProgress < 0.6) {
                this.checkBiteHit();
            }
        }
    }

    /**
     * checkBiteHit: Check the snout and jaw for contact with the target.
     */
    private checkBiteHit(): void {
        if (!this.target || !(this.target instanceof Character)) return;
        const hitPositions: THREE.Vector3[] = [];
        hitPositions.push(this.getSnoutPosition());
        const jawWorldPos = new THREE.Vector3();
        this.jaw.getWorldPosition(jawWorldPos);
        hitPositions.push(jawWorldPos);
        for (const pos of hitPositions) {
            const distanceToTarget = pos.distanceTo(this.target.mesh.position);
            if (distanceToTarget <= this.SNOUT_RADIUS + this.target.collisionRadius) {
                this.target.takeDamage(this.DAMAGE, this);
                this.attackCooldown = this.ATTACK_COOLDOWN;
                break;
            }
        }
    }

    private updateSwimming(): void {
        if (!this.targetPoint) {
            this.pickNewSwimTarget();
            return;
        }
        const direction = this.targetPoint.clone().sub(this.mesh.position).normalize();
        // For a model facing +X, 0 rad means +X.
        this.mesh.rotation.y = Math.atan2(direction.z, direction.x);
        const forward = new THREE.Vector3(1, 0, 0);
        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        this.velocity.copy(forward.multiplyScalar(this.SWIM_SPEED));
        if (this.mesh.position.distanceTo(this.targetPoint) < 1) {
            this.pickNewSwimTarget();
        }
    }

    /**
     * updateAttacking: Pursues with its snout; lunges if very close.
     */
    private updateAttacking(): void {
        if (!(this.target instanceof Character)) {
            this.currentState = AlligatorState.SWIMMING;
            this.pickNewSwimTarget();
            return;
        }
        const targetPos = this.target.mesh.position.clone();
        const snoutPos = this.getSnoutPosition();
        const distanceToTarget = snoutPos.distanceTo(targetPos);
        const direction = targetPos.clone().sub(snoutPos).normalize();
        this.mesh.rotation.y = Math.atan2(direction.z, direction.x);
        const forward = new THREE.Vector3(1, 0, 0);
        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        const desiredBodyPos = targetPos.clone().sub(forward.clone().multiplyScalar(this.SNOUT_OFFSET));
        const lungingDistance = 5;
        if (distanceToTarget <= lungingDistance) {
            const lungeSpeed = this.SWIM_SPEED * 3;
            const moveDir = desiredBodyPos.clone().sub(this.mesh.position);
            if (moveDir.length() > 0.01) moveDir.normalize();
            this.velocity.copy(moveDir.multiplyScalar(lungeSpeed));
        } else {
            const attackSpeed = this.SWIM_SPEED * 2;
            const moveDir = desiredBodyPos.clone().sub(this.mesh.position);
            if (moveDir.length() > 0.01) moveDir.normalize();
            this.velocity.copy(moveDir.multiplyScalar(attackSpeed));
        }
    }

    private animateBody(_delta: number): void {
        const joints = this.tail.userData.joints as THREE.Group[];
        if (joints) {
            const time = Date.now() * 0.001;
            const isAttacking = this.currentState === AlligatorState.ATTACKING;
            const swaySpeed = isAttacking ? 12 : 6;
            const swayAmount = isAttacking ? 0.4 : 0.2;
            joints.forEach((joint, index) => {
                const phaseOffset = index * 0.5;
                const swayAngle = Math.sin(time * swaySpeed + phaseOffset) * swayAmount;
                joint.rotation.y = swayAngle * (1 + index * 0.2);
            });
        }
        if (this.currentState === AlligatorState.ATTACKING) {
            const attackProgress = 1 - (this.attackAnimationTimer / this.ATTACK_ANIMATION_DURATION);
            const maxJawAngle = Math.PI / 4;
            if (attackProgress < 0.3) {
                this.jaw.rotation.z = -maxJawAngle * (attackProgress / 0.3);
            } else if (attackProgress < 0.6) {
                this.jaw.rotation.z = -maxJawAngle;
            } else {
                this.jaw.rotation.z = -maxJawAngle * (1 - ((attackProgress - 0.6) / 0.4));
            }
        } else {
            this.jaw.rotation.z = -Math.sin(Date.now() * 0.001) * 0.05;
        }
    }

    /**
     * enforceSwampBoundaries:
     * - Clamp the alligator’s position inside the biome.
     * - If it’s too close to an edge, force the target toward the biome center.
     */
    private enforceSwampBoundaries() {
        if (!this.swampBounds) return;
        const BOUNDARY_MARGIN = 5;
        const SAFE_MARGIN = 30; // If closer than this to any edge, force inward movement.

        // Clamp the position.
        this.mesh.position.x = Math.max(
            this.swampBounds.min.x + BOUNDARY_MARGIN,
            Math.min(this.swampBounds.max.x - BOUNDARY_MARGIN, this.mesh.position.x)
        );
        this.mesh.position.z = Math.max(
            this.swampBounds.min.y + BOUNDARY_MARGIN,
            Math.min(this.swampBounds.max.y - BOUNDARY_MARGIN, this.mesh.position.z)
        );

        // Calculate distances from each edge.
        const distToMinX = this.mesh.position.x - this.swampBounds.min.x;
        const distToMaxX = this.swampBounds.max.x - this.mesh.position.x;
        const distToMinZ = this.mesh.position.z - this.swampBounds.min.y;
        const distToMaxZ = this.swampBounds.max.y - this.mesh.position.z;
        const distanceToEdgeX = Math.min(distToMinX, distToMaxX);
        const distanceToEdgeZ = Math.min(distToMinZ, distToMaxZ);

        // If too close to an edge, force the target to be the biome's center.
        if (distanceToEdgeX < SAFE_MARGIN || distanceToEdgeZ < SAFE_MARGIN) {
            const centerX = (this.swampBounds.min.x + this.swampBounds.max.x) / 2;
            const centerZ = (this.swampBounds.min.y + this.swampBounds.max.y) / 2;
            this.targetPoint = new THREE.Vector3(centerX, this.WATER_LEVEL, centerZ);
            const directionToCenter = new THREE.Vector3(centerX, this.WATER_LEVEL, centerZ).sub(this.mesh.position).normalize();
            this.velocity.copy(directionToCenter.multiplyScalar(this.SWIM_SPEED));
        }
    }

    private pickNewSwimTarget() {
        if (!this.swampBounds || !this.swampBiome) return;
        const TARGET_MARGIN = 30; // Ensure targets are well inside the biome.
        let attempts = 0;
        let validPosition = false;
        let targetX: number = 0, targetZ: number = 0;
        while (!validPosition && attempts < 50) {
            const minX = this.swampBounds.min.x + TARGET_MARGIN;
            const maxX = this.swampBounds.max.x - TARGET_MARGIN;
            const minZ = this.swampBounds.min.y + TARGET_MARGIN;
            const maxZ = this.swampBounds.max.y - TARGET_MARGIN;
            targetX = minX + Math.random() * (maxX - minX);
            targetZ = minZ + Math.random() * (maxZ - minZ);
            const groundHeight = this.swampBiome.getGroundHeight(new THREE.Vector3(targetX, 0, targetZ));
            if (groundHeight <= -0.5 || (groundHeight <= this.WATER_LEVEL - 0.3 && attempts > 30)) {
                validPosition = true;
                break;
            }
            attempts++;
        }
        if (validPosition) {
            this.targetPoint = new THREE.Vector3(targetX, this.WATER_LEVEL, targetZ);
        } else {
            const centerX = (this.swampBounds.min.x + this.swampBounds.max.x) / 2;
            const centerZ = (this.swampBounds.min.y + this.swampBounds.max.y) / 2;
            this.targetPoint = new THREE.Vector3(centerX, this.WATER_LEVEL, centerZ);
        }
    }

    /**
     * Returns the world position of the snout based on the alligator's position and rotation.
     */
    private getSnoutPosition(): THREE.Vector3 {
        const forward = new THREE.Vector3(1, 0, 0);
        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        return this.mesh.position.clone().add(forward.multiplyScalar(this.SNOUT_OFFSET));
    }

    public getDamage(): number {
        return this.DAMAGE;
    }

    public isPerformingAction(): boolean {
        return this.currentState === AlligatorState.ATTACKING;
    }

    public hasPlayerTarget(): boolean {
        return this.target instanceof Character;
    }

    public clearTarget(): void {
        this.target = null;
        this.currentState = AlligatorState.SWIMMING;
        this.pickNewSwimTarget();
    }
}