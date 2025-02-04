import * as THREE from 'three';
import { Monster } from './Monster';
import { Character } from './Character';

export class Frog extends Monster {
    private readonly ATTACK_RANGE = 15;
    private readonly ATTACK_COOLDOWN = 3;
    private readonly TONGUE_SPEED = 20;
    private readonly DAMAGE = 15;
    private readonly HOP_HEIGHT = 2;
    private readonly HOP_COOLDOWN = 1;
    private readonly MAX_HOP_DISTANCE = 8;
    
    private tongue: THREE.Mesh = new THREE.Mesh();
    private isAttacking: boolean = false;
    private attackCooldown: number = 0;
    private tongueExtension: number = 0;
    private targetPoint: THREE.Vector3 | null = null;
    private isHopping: boolean = false;
    private hopCooldown: number = 0;
    private hopStartPosition: THREE.Vector3 = new THREE.Vector3();
    private hopTargetPosition: THREE.Vector3 = new THREE.Vector3();
    private hopProgress: number = 0;
    private bodyGroup: THREE.Group;

    constructor(position: THREE.Vector3) {
        super(position, false);
        this.collisionRadius = 2;
        this.bodyGroup = new THREE.Group();
        this.mesh.add(this.bodyGroup);
        this.createFrogMesh();
        this.createTongue();
        this.setMoveSpeed(5); // Faster base movement speed
    }

    private createFrogMesh() {
        // Create the frog's body
        const bodyGeometry = new THREE.SphereGeometry(2, 16, 12);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d8a2d,
            roughness: 0.8,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.scale.y = 0.6;
        this.bodyGroup.add(body);

        // Create eyes (bulging out)
        const eyeGeometry = new THREE.SphereGeometry(0.4, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            roughness: 0.3,
            metalness: 0.7
        });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.8, 0.8, 1);
        this.bodyGroup.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.8, 0.8, 1);
        this.bodyGroup.add(rightEye);

        // Create pupils
        const pupilGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const pupilMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            roughness: 1.0
        });

        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(0, 0, 0.3);
        leftEye.add(leftPupil);

        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0, 0, 0.3);
        rightEye.add(rightPupil);

        // Add legs
        const legGeometry = new THREE.CylinderGeometry(0.3, 0.2, 1.5, 8);
        const legMaterial = new THREE.MeshStandardMaterial({
            color: 0x1d7a1d,
            roughness: 0.9
        });

        // Front legs
        const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
        frontLeftLeg.position.set(-1.5, -0.5, 1);
        frontLeftLeg.rotation.z = Math.PI / 6;
        this.bodyGroup.add(frontLeftLeg);

        const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial);
        frontRightLeg.position.set(1.5, -0.5, 1);
        frontRightLeg.rotation.z = -Math.PI / 6;
        this.bodyGroup.add(frontRightLeg);

        // Back legs (larger)
        const backLegGeometry = new THREE.CylinderGeometry(0.4, 0.3, 2, 8);
        const backLeftLeg = new THREE.Mesh(backLegGeometry, legMaterial);
        backLeftLeg.position.set(-1.8, -0.5, -1);
        backLeftLeg.rotation.z = Math.PI / 4;
        this.bodyGroup.add(backLeftLeg);

        const backRightLeg = new THREE.Mesh(backLegGeometry, legMaterial);
        backRightLeg.position.set(1.8, -0.5, -1);
        backRightLeg.rotation.z = -Math.PI / 4;
        this.bodyGroup.add(backRightLeg);
    }

    private createTongue() {
        // Create retractable tongue with more detail
        
        // Main tongue body
        const tongueGeometry = new THREE.CylinderGeometry(0.2, 0.15, 1, 8);
        const tongueMaterial = new THREE.MeshStandardMaterial({
            color: 0xff69b4,
            roughness: 0.6,
            metalness: 0.1
        });
        this.tongue = new THREE.Mesh(tongueGeometry, tongueMaterial);
        
        // Add tongue tip (slightly larger and more rounded)
        const tipGeometry = new THREE.SphereGeometry(0.25, 8, 8);
        const tip = new THREE.Mesh(tipGeometry, tongueMaterial);
        tip.position.y = 0.5;
        this.tongue.add(tip);
        
        this.tongue.rotation.x = Math.PI / 2;
        this.tongue.visible = false;
        this.bodyGroup.add(this.tongue);
    }

    update(delta: number, groundHeight: number): void {
        super.update(delta, groundHeight);

        // Debug logging for state
        console.log('Frog state:', {
            hasTarget: !!this.target,
            isAttacking: this.isAttacking,
            isHopping: this.isHopping,
            attackCooldown: this.attackCooldown,
            hopCooldown: this.hopCooldown,
            position: this.mesh.position.toArray()
        });

        // Update cooldowns
        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta;
        }
        if (this.hopCooldown > 0) {
            this.hopCooldown -= delta;
        }

        // Handle tongue attack
        if (this.isAttacking && this.targetPoint) {
            this.updateTongueAttack(delta);
        } else if (this.target) {
            this.handleTargetTracking();
        }

        // Update hopping animation
        if (this.isHopping) {
            this.updateHopAnimation(delta);
        }

        // Animate body while idle
        if (!this.isHopping && !this.isAttacking) {
            this.updateIdleAnimation(delta);
        }
    }

    private updateIdleAnimation(delta: number) {
        // Gentle breathing animation
        const breatheSpeed = 2;
        const breatheAmount = 0.05;
        this.bodyGroup.scale.y = 1 + Math.sin(Date.now() * 0.001 * breatheSpeed) * breatheAmount;
        
        // Subtle eye movement
        const eyeSpeed = 1;
        const eyeAmount = 0.1;
        this.bodyGroup.children.forEach(child => {
            if (child.position.y > 0) { // Only affect eyes
                child.position.y = child.position.y + Math.sin(Date.now() * 0.001 * eyeSpeed) * eyeAmount * delta;
            }
        });
    }

    private handleTargetTracking() {
        if (!this.target || this.isAttacking || this.isHopping) return;

        console.log('Tracking target:', {
            targetExists: !!this.target,
            targetPosition: this.target instanceof Character ? this.target.mesh.position.toArray() : null,
            frogPosition: this.mesh.position.toArray()
        });

        const distanceToTarget = this.mesh.position.distanceTo(
            this.target instanceof Character ? this.target.mesh.position : this.target
        );

        console.log('Distance to target:', distanceToTarget, 'Attack range:', this.ATTACK_RANGE);

        // If within attack range and cooldown is ready, prepare to attack
        if (distanceToTarget <= this.ATTACK_RANGE && this.attackCooldown <= 0) {
            console.log('Starting tongue attack');
            this.startTongueAttack();
        } else if (distanceToTarget > this.ATTACK_RANGE && this.hopCooldown <= 0) {
            console.log('Starting hop');
            // Hop towards target if outside attack range
            this.startHop();
        }

        // Always face the target
        if (this.target instanceof Character) {
            const angle = Math.atan2(
                this.target.mesh.position.x - this.mesh.position.x,
                this.target.mesh.position.z - this.mesh.position.z
            );
            this.mesh.rotation.y = angle;
        }
    }

    private startHop() {
        if (!this.target || !(this.target instanceof Character)) return;

        console.log('Attempting to hop:', {
            currentPosition: this.mesh.position.toArray(),
            targetPosition: this.target.mesh.position.toArray(),
            hopCooldown: this.hopCooldown
        });

        this.isHopping = true;
        this.hopCooldown = this.HOP_COOLDOWN;
        this.hopProgress = 0;
        this.hopStartPosition.copy(this.mesh.position);

        // Calculate hop target position
        const direction = new THREE.Vector3()
            .subVectors(this.target.mesh.position, this.mesh.position)
            .normalize();
        
        // Limit hop distance
        const distanceToTarget = this.mesh.position.distanceTo(this.target.mesh.position);
        const hopDistance = Math.min(distanceToTarget * 0.5, this.MAX_HOP_DISTANCE);
        
        this.hopTargetPosition.copy(this.mesh.position)
            .add(direction.multiplyScalar(hopDistance));

        console.log('Hop calculated:', {
            startPosition: this.hopStartPosition.toArray(),
            targetPosition: this.hopTargetPosition.toArray(),
            hopDistance: hopDistance
        });

        // Squash preparation animation
        this.bodyGroup.scale.y = 0.7;
        this.bodyGroup.scale.x = 1.3;
        this.bodyGroup.scale.z = 1.3;
    }

    private updateHopAnimation(delta: number) {
        console.log('Updating hop animation:', {
            hopProgress: this.hopProgress,
            delta: delta,
            currentPosition: this.mesh.position.toArray()
        });

        this.hopProgress += delta * 3; // Faster hop speed

        if (this.hopProgress >= 1) {
            console.log('Hop completed');
            // End hop
            this.isHopping = false;
            this.bodyGroup.scale.set(1, 1, 1);
            return;
        }

        // Parabolic hop motion
        const t = this.hopProgress;
        const height = Math.sin(t * Math.PI) * this.HOP_HEIGHT;
        
        // Update position
        const newPosition = new THREE.Vector3().lerpVectors(this.hopStartPosition, this.hopTargetPosition, t);
        newPosition.y = this.hopStartPosition.y + height;
        this.mesh.position.copy(newPosition);

        console.log('Hop position updated:', {
            newPosition: newPosition.toArray(),
            height: height,
            progress: t
        });
    }

    private startTongueAttack() {
        if (!this.target) return;

        this.isAttacking = true;
        this.attackCooldown = this.ATTACK_COOLDOWN;
        this.tongueExtension = 0;
        this.tongue.visible = true;
        this.tongue.scale.y = 1;
        // Store target position for the attack
        if (this.target instanceof Character) {
            this.targetPoint = this.target.mesh.position.clone();
        }

        // Orient tongue towards target
        if (this.targetPoint) {
            const targetDirection = new THREE.Vector3().subVectors(this.targetPoint, this.mesh.position);
            this.tongue.rotation.x = Math.PI / 2;
            this.tongue.rotation.y = Math.atan2(targetDirection.x, targetDirection.z);
        }

        // Prepare attack animation
        this.bodyGroup.scale.z = 1.2; // Stretch forward
        this.bodyGroup.scale.x = 0.9; // Squeeze sides
    }

    private updateTongueAttack(delta: number) {
        if (!this.targetPoint) return;

        const maxExtension = this.mesh.position.distanceTo(this.targetPoint);
        const extensionSpeed = this.TONGUE_SPEED * delta * 2; // Faster tongue speed

        if (this.tongueExtension < maxExtension) {
            // Extend tongue
            this.tongueExtension += extensionSpeed;
            this.tongue.scale.y = this.tongueExtension;
            
            // Progressive body animation during extension
            const extendProgress = this.tongueExtension / maxExtension;
            this.bodyGroup.scale.z = 1.2 - (extendProgress * 0.2);
            this.bodyGroup.scale.x = 0.9 + (extendProgress * 0.1);
        } else {
            // Check for hit and retract
            this.checkTongueHit();
            this.tongueExtension -= extensionSpeed * 1.5; // Faster retraction
            this.tongue.scale.y = Math.max(0, this.tongueExtension);
            
            // Body returns to normal during retraction
            const retractProgress = 1 - (this.tongueExtension / maxExtension);
            this.bodyGroup.scale.z = 1 + (0.2 * (1 - retractProgress));
            this.bodyGroup.scale.x = 1 - (0.1 * (1 - retractProgress));
        }

        // Reset attack when tongue fully retracts
        if (this.tongueExtension <= 0) {
            this.isAttacking = false;
            this.tongue.visible = false;
            this.targetPoint = null;
            this.bodyGroup.scale.set(1, 1, 1);
        }
    }

    private checkTongueHit() {
        if (!this.targetPoint || !(this.target instanceof Character)) return;

        const tongueHead = new THREE.Vector3();
        const tongueEndMatrix = new THREE.Matrix4()
            .makeTranslation(0, this.tongueExtension, 0)
            .premultiply(this.tongue.matrixWorld);
        tongueHead.setFromMatrixPosition(tongueEndMatrix);

        const hitDistance = tongueHead.distanceTo(this.target.mesh.position);
        if (hitDistance < this.target.collisionRadius + 0.5) {
            (this.target as Character).takeDamage(this.DAMAGE, this);
        }
    }
} 