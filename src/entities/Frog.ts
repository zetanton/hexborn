import * as THREE from 'three';
import { Monster } from './Monster';
import { Character } from './Character';
import { LilyPad } from './LilyPad';
import { SwampBiome } from '../levels/biomes/SwampBiome';

enum FrogState {
    RESTING,
    WALKING,
    HOPPING,
    ATTACKING
}

export class Frog extends Monster {
    private readonly ATTACK_RANGE = 10;
    private readonly ATTACK_COOLDOWN = 4;
    private readonly TONGUE_LENGTH = 8;
    private readonly TONGUE_SPEED = 8;
    private readonly DAMAGE = 15;
    private readonly HOP_HEIGHT = 15;
    private readonly HOP_COOLDOWN = 1.5;
    private readonly MAX_HOP_DISTANCE = 50;
    private readonly MIN_HOP_DISTANCE = 10;
    private readonly AGGRO_RANGE = 12; // Reduced aggro range
    private readonly REST_TIME_MIN = 4; // Minimum rest time
    private readonly REST_TIME_MAX = 8; // Maximum rest time
    private readonly WALK_TIME_MIN = 5; // Minimum walk time
    private readonly WALK_TIME_MAX = 15; // Maximum walk time
    private readonly LILY_PAD_REST_TIME = 20; // Time to rest on lily pad in seconds
    private readonly LILY_PAD_CHECK_RADIUS = 3; // Reduced from 25 to 3 for more precise detection
    
    private swampBounds: { min: THREE.Vector2, max: THREE.Vector2 } | null = null;
    private tongue: THREE.Group;
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
    private currentState: FrogState = FrogState.RESTING;
    private stateTimer: number = 0;
    private walkDirection: THREE.Vector3 = new THREE.Vector3();
    private currentLilyPad: LilyPad | null = null;
    private lilyPadRestTimer: number = 0;
    private swampBiome: SwampBiome | null = null;

    constructor(position: THREE.Vector3, swampBiome: SwampBiome) {
        super(position);
        this.collisionRadius = 2;
        this.bodyGroup = new THREE.Group();
        this.mesh.add(this.bodyGroup);
        this.createMonsterMesh();
        this.tongue = this.createTongue();
        this.setMoveSpeed(2); // Slower base movement speed
        this.initializeState();
        this.swampBiome = swampBiome;
    }

    private initializeState() {
        // Start with random state and timer
        this.currentState = Math.random() < 0.5 ? FrogState.RESTING : FrogState.WALKING;
        this.stateTimer = this.getRandomTimeForState(this.currentState);
        if (this.currentState === FrogState.WALKING) {
            this.pickNewWalkDirection();
        }
    }

    private getRandomTimeForState(state: FrogState): number {
        switch (state) {
            case FrogState.RESTING:
                return this.REST_TIME_MIN + Math.random() * (this.REST_TIME_MAX - this.REST_TIME_MIN);
            case FrogState.WALKING:
                return this.WALK_TIME_MIN + Math.random() * (this.WALK_TIME_MAX - this.WALK_TIME_MIN);
            default:
                return 0;
        }
    }

    private pickNewWalkDirection() {
        if (!this.swampBounds) return;
        
        const angle = Math.random() * Math.PI * 2;
        this.walkDirection.set(
            Math.cos(angle),
            0,
            Math.sin(angle)
        ).normalize();
        
        // Adjust direction if too close to bounds
        const futurePos = this.mesh.position.clone().add(this.walkDirection.clone().multiplyScalar(5));
        if (futurePos.x < this.swampBounds.min.x + 5 || futurePos.x > this.swampBounds.max.x - 5 ||
            futurePos.z < this.swampBounds.min.y + 5 || futurePos.z > this.swampBounds.max.y - 5) {
            // Walk towards center
            const center = new THREE.Vector3(
                (this.swampBounds.min.x + this.swampBounds.max.x) / 2,
                0,
                (this.swampBounds.min.y + this.swampBounds.max.y) / 2
            );
            this.walkDirection.copy(center.sub(this.mesh.position).normalize());
        }
    }

    public setSwampBounds(min: THREE.Vector2, max: THREE.Vector2) {
        this.swampBounds = { min, max };
    }

    public setLilyPad(lilyPad: LilyPad): void {
        if (this.currentLilyPad !== lilyPad) {
            this.currentLilyPad = lilyPad;
            this.lilyPadRestTimer = this.LILY_PAD_REST_TIME;
            
            // Position the frog on the lily pad
            const lilyPadPos = lilyPad.mesh.position;
            this.mesh.position.copy(lilyPadPos);
            this.mesh.position.y = lilyPadPos.y + lilyPad.getFloatOffset() + 0.5;
            
            // Random position within the inner part of lily pad
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * (lilyPad.collisionRadius * 0.4); // Stay within inner 40% of lily pad
            this.mesh.position.x += Math.cos(angle) * radius;
            this.mesh.position.z += Math.sin(angle) * radius;

            // Force resting state when on lily pad
            this.currentState = FrogState.RESTING;
            this.stateTimer = this.LILY_PAD_REST_TIME;
            
            // Clear any velocity
            const velocity = this.getVelocity();
            velocity.set(0, 0, 0);
        }
    }

    protected createMonsterMesh(): void {
        this.createFrogMesh();
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
        
        // Left eye
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.8, 0.8, 1);
        leftEye.userData.isEye = true;
        leftEye.userData.defaultPosition = leftEye.position.clone();
        this.bodyGroup.add(leftEye);
        
        // Right eye
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.8, 0.8, 1);
        rightEye.userData.isEye = true;
        rightEye.userData.defaultPosition = rightEye.position.clone();
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

        // Create straight line for mouth
        const mouthGeometry = new THREE.BoxGeometry(0.8, 0.08, 0.08);
        const mouthMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000
        });
        const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
        mouth.position.set(0, 0.5, 1.8); // Higher position (y=0.5)
        this.bodyGroup.add(mouth);

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
        const tongueGroup = new THREE.Group();
        
        // Main tongue body (thinner cylinder) with base at origin
        const tongueGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
        tongueGeometry.translate(0, 0.5, 0); // Shift so base is at y=0
        const tongueMaterial = new THREE.MeshStandardMaterial({
            color: 0xff69b4,
            roughness: 0.6,
            metalness: 0.1
        });
        const tongueBody = new THREE.Mesh(tongueGeometry, tongueMaterial);
        tongueGroup.add(tongueBody);
        
        // Sticky tongue tip (larger sphere) positioned at the end of the tongue
        const tipGeometry = new THREE.SphereGeometry(0.5, 12, 12);
        const tipMaterial = new THREE.MeshStandardMaterial({
            color: 0xff1493,
            roughness: 0.3,
            metalness: 0.2,
            emissive: 0xff1493,
            emissiveIntensity: 0.2
        });
        const tip = new THREE.Mesh(tipGeometry, tipMaterial);
        tip.position.y = 1; // Position tip at the end of the base tongue length
        tongueGroup.add(tip);
        
        tongueGroup.rotation.x = Math.PI / 2; // Straight forward
        tongueGroup.position.set(0, 0.5, 1.8); // Match the mouth position
        tongueGroup.scale.set(0.01, 0.01, 0.01); // Start tiny when not in use
        tongueGroup.visible = true; // Can stay visible since it's tiny
        this.bodyGroup.add(tongueGroup);
        
        return tongueGroup;
    }

    update(delta: number, groundHeight: number): void {
        super.update(delta, groundHeight);

        // Update lily pad rest timer and position
        if (this.currentLilyPad) {
            this.lilyPadRestTimer -= delta;
            
            // Update position based on lily pad if we're on one
            const lilyPadPos = this.currentLilyPad.mesh.position;
            const floatOffset = this.currentLilyPad.getFloatOffset();
            this.mesh.position.y = lilyPadPos.y + floatOffset + 0.5;

            // Leave lily pad when timer expires
            if (this.lilyPadRestTimer <= 0) {
                this.currentLilyPad = null;
                this.currentState = FrogState.HOPPING;
                this.startRandomHop();
            }
            return; // Skip other updates while on lily pad
        }

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
            return;
        }

        // Update state timer
        this.stateTimer -= delta;

        // Check for nearby lily pads when not attacking or hopping
        if (!this.isAttacking && !this.isHopping && !this.currentLilyPad) {
            // Get all lily pads in the scene (you'll need to implement this)
            const nearbyLilyPads = this.getNearbyLilyPads();
            for (const lilyPad of nearbyLilyPads) {
                const distance = this.mesh.position.distanceTo(lilyPad.mesh.position);
                if (distance < this.LILY_PAD_CHECK_RADIUS) {
                    this.setLilyPad(lilyPad);
                    break;
                }
            }
        }

        // Handle player targeting separately and with lower priority
        if (this.target instanceof Character) {
            const distanceToPlayer = this.mesh.position.distanceTo(this.target.mesh.position);
            if (distanceToPlayer > this.AGGRO_RANGE) {
                this.target = null;
            } else if (distanceToPlayer <= this.ATTACK_RANGE && this.attackCooldown <= 0) {
                this.startTongueAttack();
                return;
            }
        }

        // Natural behavior state machine
        switch (this.currentState) {
            case FrogState.RESTING:
                if (this.stateTimer <= 0) {
                    // 70% chance to walk, 30% chance to hop
                    this.currentState = Math.random() < 0.7 ? FrogState.WALKING : FrogState.HOPPING;
                    this.stateTimer = this.getRandomTimeForState(this.currentState);
                    if (this.currentState === FrogState.WALKING) {
                        this.pickNewWalkDirection();
                    } else {
                        this.startRandomHop();
                    }
                }
                this.updateIdleAnimation();
                break;

            case FrogState.WALKING:
                if (this.stateTimer <= 0) {
                    this.currentState = FrogState.RESTING;
                    this.stateTimer = this.getRandomTimeForState(FrogState.RESTING);
                } else {
                    // Slow walking movement
                    const walkSpeed = 1.5 * delta;
                    const newPosition = this.mesh.position.clone().add(
                        this.walkDirection.clone().multiplyScalar(walkSpeed)
                    );
                    
                    // Check bounds
                    if (this.swampBounds) {
                        newPosition.x = Math.max(this.swampBounds.min.x + 2, Math.min(this.swampBounds.max.x - 2, newPosition.x));
                        newPosition.z = Math.max(this.swampBounds.min.y + 2, Math.min(this.swampBounds.max.y - 2, newPosition.z));
                    }
                    
                    this.mesh.position.copy(newPosition);
                    this.mesh.rotation.y = Math.atan2(this.walkDirection.x, this.walkDirection.z);
                }
                break;

            case FrogState.HOPPING:
                if (this.isHopping) {
                    this.updateHopAnimation(delta);
                } else {
                    this.currentState = FrogState.RESTING;
                    this.stateTimer = this.getRandomTimeForState(FrogState.RESTING);
                }
                break;
        }
    }

    private updateIdleAnimation() {
        // Gentle breathing animation
        const breatheSpeed = 2;
        const breatheAmount = 0.05;
        this.bodyGroup.scale.y = 1 + Math.sin(Date.now() * 0.001 * breatheSpeed) * breatheAmount;
        
        // Subtle eye movement using default positions
        const eyeSpeed = 1;
        const eyeAmount = 0.1;
        this.bodyGroup.children.forEach(child => {
            if (child.userData && child.userData.isEye) {
                const defaultY = child.userData.defaultPosition ? child.userData.defaultPosition.y : child.position.y;
                child.position.y = defaultY + Math.sin(Date.now() * 0.001 * eyeSpeed) * eyeAmount;
            }
        });
    }

    private startRandomHop() {
        if (!this.swampBounds) return;

        // Keep generating new hop targets until we get one that's significantly different from current position
        let attempts = 0;
        let targetX, targetZ;
        do {
            const randomAngle = Math.random() * Math.PI * 2;
            const randomDistance = this.MIN_HOP_DISTANCE + Math.random() * (this.MAX_HOP_DISTANCE - this.MIN_HOP_DISTANCE);
            
            targetX = this.mesh.position.x + Math.cos(randomAngle) * randomDistance;
            targetZ = this.mesh.position.z + Math.sin(randomAngle) * randomDistance;

            // Clamp to swamp bounds with padding
            targetX = Math.max(this.swampBounds.min.x + 2, Math.min(this.swampBounds.max.x - 2, targetX));
            targetZ = Math.max(this.swampBounds.min.y + 2, Math.min(this.swampBounds.max.y - 2, targetZ));

            // Check if the new position is significantly different (at least MIN_HOP_DISTANCE away)
            const diffX = targetX - this.mesh.position.x;
            const diffZ = targetZ - this.mesh.position.z;
            const distance = Math.sqrt(diffX * diffX + diffZ * diffZ);

            if (distance >= this.MIN_HOP_DISTANCE || attempts > 5) {
                break;
            }
            attempts++;
        } while (true);

        const hopTarget = new THREE.Vector3(targetX, this.mesh.position.y, targetZ);
        this.setTarget(hopTarget);
        this.startHop();
    }

    private startHop() {
        if (!this.target || !this.swampBounds) return;

        const targetPosition = this.target instanceof Character ? this.target.mesh.position : this.target;

        // Calculate hop target position
        const direction = new THREE.Vector3()
            .subVectors(targetPosition, this.mesh.position)
            .normalize();
        
        const distanceToTarget = this.mesh.position.distanceTo(targetPosition);
        const hopDistance = Math.min(distanceToTarget * 0.5, this.MAX_HOP_DISTANCE);
        
        // Calculate potential landing position
        const landingX = this.mesh.position.x + direction.x * hopDistance;
        const landingZ = this.mesh.position.z + direction.z * hopDistance;

        // Clamp landing position to swamp bounds
        const clampedX = Math.max(this.swampBounds.min.x, Math.min(this.swampBounds.max.x, landingX));
        const clampedZ = Math.max(this.swampBounds.min.y, Math.min(this.swampBounds.max.y, landingZ));

        this.isHopping = true;
        this.hopCooldown = this.HOP_COOLDOWN;
        this.hopProgress = 0;
        this.hopStartPosition.copy(this.mesh.position);
        this.hopTargetPosition.set(clampedX, this.mesh.position.y, clampedZ);

        // Squash preparation animation
        this.bodyGroup.scale.y = 0.7;
        this.bodyGroup.scale.x = 1.3;
        this.bodyGroup.scale.z = 1.3;
    }

    private updateHopAnimation(delta: number) {
        // Much slower hop speed for significantly more hang time
        this.hopProgress += delta * 0.8; // Drastically reduced for much slower movement

        if (this.hopProgress >= 1) {
            this.isHopping = false;
            this.bodyGroup.scale.set(1, 1, 1);
            return;
        }

        // Custom animation curve for proper hop arc with long hang time
        const t = this.hopProgress;
        
        // Horizontal movement: Ease out at start, ease in at end
        const horizontalT = this.easeInOutQuad(t);
        const newPosition = new THREE.Vector3().lerpVectors(
            this.hopStartPosition, 
            this.hopTargetPosition, 
            horizontalT
        );

        // Vertical movement: Modified curve for longer hang time at apex
        let heightT = t * Math.PI;
        // Slow down the middle portion for longer hang time
        if (t > 0.3 && t < 0.7) {
            heightT = Math.PI * (0.3 + (t - 0.3) * 0.5);
        }
        const height = Math.sin(heightT) * this.HOP_HEIGHT;
        newPosition.y = this.hopStartPosition.y + height;

        // Keep the body level throughout the hop - no rotations
        this.bodyGroup.rotation.x = 0;

        // Update position
        this.mesh.position.copy(newPosition);
    }

    // Helper function for smooth acceleration/deceleration
    private easeInOutQuad(t: number): number {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    private updateTongueAttack(delta: number) {
        if (!this.targetPoint) return;

        const extensionSpeed = this.TONGUE_SPEED * delta;

        if (this.tongueExtension < this.TONGUE_LENGTH && !this.tongue.userData.retracting) {
            // Extend tongue
            this.tongueExtension += extensionSpeed;
            this.tongue.scale.y = this.tongueExtension;
            
            // Check if reached max length
            if (this.tongueExtension >= this.TONGUE_LENGTH) {
                this.tongue.userData.retracting = true;
            }
            
            // Check for hit during extension
            this.checkTongueHit();
        } else {
            // Retract tongue
            this.tongueExtension -= extensionSpeed * 1.5;
            this.tongue.scale.y = Math.max(0, this.tongueExtension);
            
            if (this.tongueExtension <= 0) {
                this.isAttacking = false;
                this.tongue.scale.set(0.01, 0.01, 0.01); // Return to tiny size when done
                this.targetPoint = null;
                this.bodyGroup.scale.set(1, 1, 1);
                this.tongue.userData.retracting = false;
            }
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
            this.target.takeDamage(this.DAMAGE, this);
        }
    }

    private startTongueAttack() {
        if (!this.target || !(this.target instanceof Character)) return;

        this.isAttacking = true;
        this.attackCooldown = this.ATTACK_COOLDOWN;
        this.tongueExtension = 0;
        this.tongue.scale.set(1, 1, 1); // Reset to full size for attack
        this.targetPoint = this.target.mesh.position.clone();
        this.tongue.userData.retracting = false;

        // Orient tongue directly towards target
        if (this.targetPoint) {
            let targetDirection = new THREE.Vector3().subVectors(this.targetPoint, this.mesh.position).normalize();
            const frogForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
            
            if (frogForward.dot(targetDirection) < 0) {
                // If target is behind, force tongue to extend forward
                targetDirection = frogForward;
            }
            
            this.tongue.rotation.x = Math.PI / 2; // Straight forward
            this.tongue.rotation.y = Math.atan2(targetDirection.x, targetDirection.z);
        }

        // Prepare attack animation
        this.bodyGroup.scale.z = 1.2;
        this.bodyGroup.scale.x = 0.9;
    }

    public getDamage(): number {
        return this.DAMAGE;
    }

    public isPerformingAction(): boolean {
        return this.isHopping || this.isAttacking;
    }

    public hasPlayerTarget(): boolean {
        return this.target instanceof Character;
    }

    public clearTarget(): void {
        this.target = null;
        this.stateTimer = this.getRandomTimeForState(FrogState.RESTING);
    }

    private getNearbyLilyPads(): LilyPad[] {
        if (!this.swampBiome) return [];
        
        // Get all lily pads from the swamp
        const allLilyPads = this.swampBiome.getLilyPads();
        
        // Filter to only include lily pads within check radius
        return allLilyPads.filter((lilyPad: LilyPad) => {
            const distance = this.mesh.position.distanceTo(lilyPad.mesh.position);
            return distance < this.LILY_PAD_CHECK_RADIUS;
        });
    }
} 