import * as THREE from 'three';
import { Monster } from './Monster';
import { Character } from './Character';

export class RedLurker extends Monster {
    private readonly DAMAGE = 10;
    public readonly AGGRO_RANGE = 20; // Distance at which monster starts chasing player
    private readonly CHASE_SPEED = 4; // Faster speed when chasing
    private readonly PATROL_SPEED = 1.5; // Slower speed when patrolling
    private readonly BLOCK_SIZE = 80;
    private readonly MIN_DISTANCE_TO_OTHER_LURKERS = 5; // Minimum distance to maintain from other lurkers
    private cityBounds: { min: THREE.Vector2, max: THREE.Vector2 } | null = null;
    private currentState: 'patrolling' | 'chasing' = 'patrolling';
    private patrolTarget: THREE.Vector3 | null = null;
    private patrolTimer: number = 0;
    private readonly PATROL_TIME_MIN = 5;
    private readonly PATROL_TIME_MAX = 10;
    private otherLurkers: RedLurker[] = [];

    constructor(position: THREE.Vector3) {
        super(position);
        this.createMonsterMesh();
        this.setMoveSpeed(this.PATROL_SPEED);
        this.pickNewPatrolTarget();
    }

    public setCityBounds(min: THREE.Vector2, max: THREE.Vector2) {
        this.cityBounds = { min, max };
    }

    public setOtherLurkers(lurkers: RedLurker[]) {
        this.otherLurkers = lurkers.filter(l => l !== this);
    }

    private isPositionNearOtherLurkers(position: THREE.Vector3): boolean {
        return this.otherLurkers.some(lurker => 
            position.distanceTo(lurker.mesh.position) < this.MIN_DISTANCE_TO_OTHER_LURKERS
        );
    }

    private pickNewPatrolTarget() {
        if (!this.cityBounds) return;

        // Calculate nearest road intersection
        const currentX = this.mesh.position.x;
        const currentZ = this.mesh.position.z;
        
        // Find nearest road intersection points
        const nearestX = Math.round(currentX / this.BLOCK_SIZE) * this.BLOCK_SIZE;
        const nearestZ = Math.round(currentZ / this.BLOCK_SIZE) * this.BLOCK_SIZE;

        // Pick a random direction (north, south, east, west)
        const directions = [
            new THREE.Vector3(this.BLOCK_SIZE, 0, 0),  // East
            new THREE.Vector3(-this.BLOCK_SIZE, 0, 0), // West
            new THREE.Vector3(0, 0, this.BLOCK_SIZE),  // North
            new THREE.Vector3(0, 0, -this.BLOCK_SIZE)  // South
        ];

        // Filter valid directions that stay within city bounds and avoid other lurkers
        const validDirections = directions.filter(dir => {
            const targetX = nearestX + dir.x;
            const targetZ = nearestZ + dir.z;
            const targetPos = new THREE.Vector3(targetX, this.mesh.position.y, targetZ);
            
            return targetX >= this.cityBounds!.min.x && 
                   targetX <= this.cityBounds!.max.x && 
                   targetZ >= this.cityBounds!.min.y && 
                   targetZ <= this.cityBounds!.max.y &&
                   !this.isPositionNearOtherLurkers(targetPos);
        });

        if (validDirections.length > 0) {
            // Pick a random valid direction
            const randomDir = validDirections[Math.floor(Math.random() * validDirections.length)];
            this.patrolTarget = new THREE.Vector3(
                nearestX + randomDir.x,
                this.mesh.position.y,
                nearestZ + randomDir.z
            );
            
            // Set a random patrol time
            this.patrolTimer = this.PATROL_TIME_MIN + 
                Math.random() * (this.PATROL_TIME_MAX - this.PATROL_TIME_MIN);
        } else {
            // If no valid directions, try to move away from other lurkers
            const escapeDirection = new THREE.Vector3();
            this.otherLurkers.forEach(lurker => {
                const awayDir = this.mesh.position.clone().sub(lurker.mesh.position).normalize();
                escapeDirection.add(awayDir);
            });
            
            if (escapeDirection.length() > 0) {
                escapeDirection.normalize().multiplyScalar(this.BLOCK_SIZE);
                const targetX = Math.max(this.cityBounds!.min.x, Math.min(this.cityBounds!.max.x, this.mesh.position.x + escapeDirection.x));
                const targetZ = Math.max(this.cityBounds!.min.y, Math.min(this.cityBounds!.max.y, this.mesh.position.z + escapeDirection.z));
                this.patrolTarget = new THREE.Vector3(targetX, this.mesh.position.y, targetZ);
            } else {
                // If still no valid direction, move towards city center
                const centerX = (this.cityBounds!.min.x + this.cityBounds!.max.x) / 2;
                const centerZ = (this.cityBounds!.min.y + this.cityBounds!.max.y) / 2;
                this.patrolTarget = new THREE.Vector3(centerX, this.mesh.position.y, centerZ);
            }
        }

        // Set this as the movement target
        if (this.patrolTarget) {
            this.setTarget(this.patrolTarget);
        }
    }

    public update(delta: number, groundHeight: number) {
        // Update patrol timer
        if (this.patrolTimer > 0) {
            this.patrolTimer -= delta;
            if (this.patrolTimer <= 0) {
                this.pickNewPatrolTarget();
            }
        }

        // Check for nearby player
        if (this.target instanceof Character) {
            const distanceToPlayer = this.mesh.position.distanceTo(this.target.mesh.position);
            
            if (distanceToPlayer > this.AGGRO_RANGE) {
                // Lost player, go back to patrolling
                this.currentState = 'patrolling';
                this.setMoveSpeed(this.PATROL_SPEED);
                this.pickNewPatrolTarget();
            } else {
                // Keep chasing
                this.currentState = 'chasing';
                this.setMoveSpeed(this.CHASE_SPEED);
            }
        }

        // Call parent update for movement
        super.update(delta, groundHeight);

        // If we've reached our patrol target, pick a new one
        if (this.currentState === 'patrolling' && this.patrolTarget) {
            const distanceToTarget = this.mesh.position.distanceTo(this.patrolTarget);
            if (distanceToTarget < 1) {
                this.pickNewPatrolTarget();
            }
        }
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

    public isTargetingCharacter(character: Character): boolean {
        return this.target === character;
    }
} 