import * as THREE from 'three';
import { Monster } from './Monster';
import { Character } from './Character';

export class Troll extends Monster {
    private club: THREE.Group = new THREE.Group();
    private attackCooldown: number = 0;
    private readonly ATTACK_COOLDOWN_TIME = 2; // Seconds between attacks
    private isAttacking: boolean = false;
    private attackPhase: number = 0;
    private readonly ATTACK_DAMAGE = 20;
    private readonly ATTACK_RANGE = 3;

    constructor(position: THREE.Vector3) {
        super(position);
        this.createTrollMesh();
        this.setMoveSpeed(2); // Slower but more menacing
        this.collisionRadius = 1.5; // Larger collision radius
    }

    private createTrollMesh() {
        // Clear existing monster mesh
        while(this.mesh.children.length > 0) {
            this.mesh.remove(this.mesh.children[0]);
        }

        // Create main body group for better organization
        const bodyGroup = new THREE.Group();

        // Create troll body - more muscular and detailed
        const torsoGeometry = new THREE.BoxGeometry(2.2, 2, 1.8);
        const skinMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4a6741, // Base mossy green-gray
            roughness: 0.9,
            metalness: 0.1
        });
        const darkSkinMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3d563a, // Darker green-gray for shadows
            roughness: 0.9,
            metalness: 0.1
        });

        // Main torso with muscle definition
        const torso = new THREE.Mesh(torsoGeometry, skinMaterial);
        torso.position.y = 1.8;
        torso.castShadow = true;
        torso.receiveShadow = true;
        bodyGroup.add(torso);

        // Add muscle definition plates
        const pectoralGeometry = new THREE.BoxGeometry(1.8, 0.8, 0.3);
        const leftPectoral = new THREE.Mesh(pectoralGeometry, darkSkinMaterial);
        leftPectoral.position.set(-0.5, 2.3, 0.8);
        leftPectoral.rotation.x = Math.PI * 0.1;
        bodyGroup.add(leftPectoral);

        const rightPectoral = new THREE.Mesh(pectoralGeometry, darkSkinMaterial);
        rightPectoral.position.set(0.5, 2.3, 0.8);
        rightPectoral.rotation.x = Math.PI * 0.1;
        bodyGroup.add(rightPectoral);

        // Create hunched shoulders - more pronounced
        const shoulderGeometry = new THREE.BoxGeometry(3, 1, 2);
        const shoulders = new THREE.Mesh(shoulderGeometry, darkSkinMaterial);
        shoulders.position.y = 3;
        shoulders.rotation.z = Math.PI * 0.05;
        bodyGroup.add(shoulders);

        // Add shoulder spikes
        const spikeGeometry = new THREE.ConeGeometry(0.15, 0.4, 4);
        const spikeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2d3d2a,
            roughness: 1
        });
        
        for (let i = 0; i < 4; i++) {
            const leftSpike = new THREE.Mesh(spikeGeometry, spikeMaterial);
            leftSpike.position.set(-1.4, 3.2, -0.6 + i * 0.4);
            leftSpike.rotation.z = Math.PI * 0.15;
            bodyGroup.add(leftSpike);

            const rightSpike = new THREE.Mesh(spikeGeometry, spikeMaterial);
            rightSpike.position.set(1.4, 3.2, -0.6 + i * 0.4);
            rightSpike.rotation.z = -Math.PI * 0.15;
            bodyGroup.add(rightSpike);
        }

        // Create more detailed head
        const headGroup = new THREE.Group();
        const headGeometry = new THREE.BoxGeometry(1.4, 1.4, 1.2);
        const head = new THREE.Mesh(headGeometry, skinMaterial);
        head.position.y = 3.8;
        headGroup.add(head);

        // Add protruding jaw
        const jawGeometry = new THREE.BoxGeometry(1.2, 0.4, 0.8);
        const jaw = new THREE.Mesh(jawGeometry, darkSkinMaterial);
        jaw.position.set(0, 3.4, 0.6);
        headGroup.add(jaw);

        // Add brow ridge
        const browGeometry = new THREE.BoxGeometry(1.4, 0.3, 0.4);
        const brow = new THREE.Mesh(browGeometry, darkSkinMaterial);
        brow.position.set(0, 4.1, 0.6);
        brow.rotation.x = Math.PI * 0.1;
        headGroup.add(brow);

        // Add more menacing eyes
        const eyeGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const eyeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff2200,
            emissive: 0xff2200,
            emissiveIntensity: 2
        });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.35, 3.9, 0.6);
        const leftPupil = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x000000 })
        );
        leftPupil.position.z = 0.15;
        leftEye.add(leftPupil);
        headGroup.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.35, 3.9, 0.6);
        const rightPupil = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x000000 })
        );
        rightPupil.position.z = 0.15;
        rightEye.add(rightPupil);
        headGroup.add(rightEye);

        // Add more jagged teeth
        const teethGeometry = new THREE.ConeGeometry(0.1, 0.3, 4);
        const teethMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xd6d6d6,
            roughness: 0.5
        });
        
        for(let i = 0; i < 8; i++) {
            const tooth = new THREE.Mesh(teethGeometry, teethMaterial);
            tooth.position.set(-0.4 + (i * 0.12), 3.3, 0.8);
            tooth.rotation.x = -Math.PI * 0.4;
            headGroup.add(tooth);
        }

        // Add tusks
        const tuskGeometry = new THREE.CylinderGeometry(0.08, 0.15, 0.6, 8);
        const tuskMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xf0f0f0,
            roughness: 0.3
        });
        
        const leftTusk = new THREE.Mesh(tuskGeometry, tuskMaterial);
        leftTusk.position.set(-0.4, 3.4, 0.4);
        leftTusk.rotation.x = Math.PI * 0.3;
        leftTusk.rotation.z = -Math.PI * 0.1;
        headGroup.add(leftTusk);

        const rightTusk = new THREE.Mesh(tuskGeometry, tuskMaterial);
        rightTusk.position.set(0.4, 3.4, 0.4);
        rightTusk.rotation.x = Math.PI * 0.3;
        rightTusk.rotation.z = Math.PI * 0.1;
        headGroup.add(rightTusk);

        // Slightly tilt head forward for more menacing look
        headGroup.rotation.x = -Math.PI * 0.1;
        bodyGroup.add(headGroup);

        // Create more detailed arms
        const armGroup = new THREE.Group();
        const upperArmGeometry = new THREE.BoxGeometry(0.8, 1.8, 0.8);
        const forearmGeometry = new THREE.BoxGeometry(0.7, 1.6, 0.7);

        // Right arm (club arm)
        const rightArmGroup = new THREE.Group();
        const rightUpperArm = new THREE.Mesh(upperArmGeometry, skinMaterial);
        rightUpperArm.position.set(0, -0.9, 0);
        rightArmGroup.add(rightUpperArm);

        const rightForearm = new THREE.Mesh(forearmGeometry, darkSkinMaterial);
        rightForearm.position.set(0, -2, 0);
        rightArmGroup.add(rightForearm);

        // Add hand
        const handGeometry = new THREE.BoxGeometry(0.9, 0.5, 0.9);
        const rightHand = new THREE.Mesh(handGeometry, skinMaterial);
        rightHand.position.set(0, -2.8, 0);
        rightArmGroup.add(rightHand);

        rightArmGroup.position.set(1.8, 3, 0);
        armGroup.add(rightArmGroup);

        // Left arm (mirror of right)
        const leftArmGroup = new THREE.Group();
        const leftUpperArm = new THREE.Mesh(upperArmGeometry, skinMaterial);
        leftUpperArm.position.set(0, -0.9, 0);
        leftArmGroup.add(leftUpperArm);

        const leftForearm = new THREE.Mesh(forearmGeometry, darkSkinMaterial);
        leftForearm.position.set(0, -2, 0);
        leftArmGroup.add(leftForearm);

        const leftHand = new THREE.Mesh(handGeometry, skinMaterial);
        leftHand.position.set(0, -2.8, 0);
        leftArmGroup.add(leftHand);

        leftArmGroup.position.set(-1.8, 3, 0);
        armGroup.add(leftArmGroup);

        bodyGroup.add(armGroup);

        // Create legs
        const legGroup = new THREE.Group();
        const thighGeometry = new THREE.BoxGeometry(0.9, 1.8, 0.9);
        const calfGeometry = new THREE.BoxGeometry(0.8, 1.6, 0.8);

        // Right leg
        const rightLegGroup = new THREE.Group();
        const rightThigh = new THREE.Mesh(thighGeometry, skinMaterial);
        rightThigh.position.set(0, -0.9, 0);
        rightLegGroup.add(rightThigh);

        const rightCalf = new THREE.Mesh(calfGeometry, darkSkinMaterial);
        rightCalf.position.set(0, -2, 0);
        rightLegGroup.add(rightCalf);

        // Add foot
        const footGeometry = new THREE.BoxGeometry(1, 0.4, 1.2);
        const rightFoot = new THREE.Mesh(footGeometry, skinMaterial);
        rightFoot.position.set(0, -2.8, 0.2);
        rightLegGroup.add(rightFoot);

        rightLegGroup.position.set(0.6, 1, 0);
        legGroup.add(rightLegGroup);

        // Left leg (mirror of right)
        const leftLegGroup = new THREE.Group();
        const leftThigh = new THREE.Mesh(thighGeometry, skinMaterial);
        leftThigh.position.set(0, -0.9, 0);
        leftLegGroup.add(leftThigh);

        const leftCalf = new THREE.Mesh(calfGeometry, darkSkinMaterial);
        leftCalf.position.set(0, -2, 0);
        leftLegGroup.add(leftCalf);

        const leftFoot = new THREE.Mesh(footGeometry, skinMaterial);
        leftFoot.position.set(0, -2.8, 0.2);
        leftLegGroup.add(leftFoot);

        leftLegGroup.position.set(-0.6, 1, 0);
        legGroup.add(leftLegGroup);

        bodyGroup.add(legGroup);

        // Create a more menacing club
        this.club = new THREE.Group();
        
        // Club handle with grip wrapping
        const handleGeometry = new THREE.CylinderGeometry(0.12, 0.15, 2.5, 8);
        const handleMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4d2926,
            roughness: 1
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        
        // Add grip wrapping
        const wrapMaterial = new THREE.MeshStandardMaterial({ color: 0x2a1814 });
        for (let i = 0; i < 8; i++) {
            const wrap = new THREE.Mesh(
                new THREE.TorusGeometry(0.14, 0.02, 8, 16),
                wrapMaterial
            );
            wrap.position.y = -0.8 + (i * 0.2);
            wrap.rotation.x = Math.PI * 0.5;
            handle.add(wrap);
        }
        
        this.club.add(handle);

        // Larger, more detailed club head
        const clubHeadGroup = new THREE.Group();
        
        // Main head
        const clubHeadGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const clubHeadMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.9,
            metalness: 0.2
        });
        const clubHead = new THREE.Mesh(clubHeadGeometry, clubHeadMaterial);
        clubHead.scale.set(1.3, 1.8, 1.3);
        clubHeadGroup.add(clubHead);
        
        // Add more menacing spikes
        const clubSpikeGeometry = new THREE.ConeGeometry(0.12, 0.4, 4);
        const clubSpikeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a1a1a,
            metalness: 0.3
        });
        
        for(let i = 0; i < 12; i++) {
            const spike = new THREE.Mesh(clubSpikeGeometry, clubSpikeMaterial);
            const angle = (i / 12) * Math.PI * 2;
            const radius = 0.5;
            spike.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
            spike.rotation.x = Math.PI * 0.5;
            spike.rotation.z = angle;
            clubHeadGroup.add(spike);
        }

        // Add top and bottom spikes
        for(let i = 0; i < 4; i++) {
            const topSpike = new THREE.Mesh(clubSpikeGeometry, clubSpikeMaterial);
            const angle = (i / 4) * Math.PI * 2;
            topSpike.position.set(
                Math.cos(angle) * 0.3,
                0.6,
                Math.sin(angle) * 0.3
            );
            topSpike.rotation.x = 0;
            clubHeadGroup.add(topSpike);

            const bottomSpike = new THREE.Mesh(clubSpikeGeometry, clubSpikeMaterial);
            bottomSpike.position.set(
                Math.cos(angle) * 0.3,
                -0.6,
                Math.sin(angle) * 0.3
            );
            bottomSpike.rotation.x = Math.PI;
            clubHeadGroup.add(bottomSpike);
        }

        clubHeadGroup.position.y = 1.2;
        this.club.add(clubHeadGroup);

        // Position club in right hand - adjusted for end grip
        this.club.rotation.set(0, 0, Math.PI * 0.7); // Initial raised position
        this.club.position.copy(rightHand.position);
        this.club.position.x += 0.1; // Slight offset for grip
        this.club.position.y -= 1.0; // Move grip point to end of handle
        this.club.position.z += 0.2; // Bring slightly forward
        rightArmGroup.add(this.club);

        // Adjust right arm for holding club
        rightArmGroup.rotation.set(
            -Math.PI * 0.2, // Tilt arm back
            0,
            -Math.PI * 0.1  // Slight outward angle
        );

        // Add the complete body to the mesh
        this.mesh.add(bodyGroup);

        // Store references for animation
        this.mesh.userData.rightArm = rightArmGroup;
        this.mesh.userData.leftArm = leftArmGroup;
        this.mesh.userData.head = headGroup;
    }

    update(delta: number, groundHeight: number) {
        super.update(delta, groundHeight);
        
        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta;
        }

        // Update attack animation
        if (this.isAttacking) {
            this.updateAttackAnimation(delta);
        }

        // Check if we should attack
        if (this.getTarget() && !this.isAttacking && this.attackCooldown <= 0) {
            const distanceToTarget = this.mesh.position.distanceTo(this.getTarget()!);
            if (distanceToTarget < this.ATTACK_RANGE) {
                this.startAttack();
            }
        }
    }

    private startAttack() {
        this.isAttacking = true;
        this.attackPhase = 0;
        this.attackCooldown = this.ATTACK_COOLDOWN_TIME;
        
        // Store original position for recovery
        this.mesh.userData.attackStartPosition = this.mesh.position.clone();
    }

    private updateAttackAnimation(delta: number) {
        const rightArm = this.mesh.userData.rightArm;
        
        // Full attack animation takes 1.5 seconds
        this.attackPhase += delta * 1.33; // Adjusted for new timing
        
        if (this.attackPhase < 0.3) {
            // Wind up phase - raise club and pull back
            const progress = this.attackPhase / 0.3;
            this.club.rotation.z = Math.PI * 0.7 + (Math.PI * 0.3 * progress);
            rightArm.rotation.x = -Math.PI * 0.2 - (Math.PI * 0.3 * progress);
            rightArm.rotation.y = Math.PI * 0.2 * progress;
            
            // Slight body rotation for windup
            this.mesh.rotation.y += delta * 0.5;
            
        } else if (this.attackPhase < 0.6) {
            // Lunge forward phase
            const progress = (this.attackPhase - 0.3) / 0.3;
            this.mesh.position.z += delta * 5; // Lunge forward
            this.mesh.position.y += Math.sin(progress * Math.PI) * delta * 3; // Slight jump
            
        } else if (this.attackPhase < 1.2) {
            // Overhead swing phase
            const progress = (this.attackPhase - 0.6) / 0.6;
            
            // Dramatic overhead swing
            this.club.rotation.z = Math.PI - (Math.PI * 1.5 * progress);
            rightArm.rotation.x = -Math.PI * 0.5 + (Math.PI * 0.8 * progress);
            rightArm.rotation.y = Math.PI * 0.2 * (1 - progress);
            
            // Body follows through with the swing
            this.mesh.rotation.y -= delta * 2;
            
            // Check for hit at the most powerful point of the swing
            if (progress >= 0.5 && progress <= 0.7 && this.getTarget()) {
                const distanceToTarget = this.mesh.position.distanceTo(this.getTarget()!);
                if (distanceToTarget < this.ATTACK_RANGE) {
                    this.onAttackHit();
                }
            }
            
        } else if (this.attackPhase < 1.5) {
            // Recovery phase
            const progress = (this.attackPhase - 1.2) / 0.3;
            
            // Return to ready position
            this.club.rotation.z = -Math.PI * 0.5 + (Math.PI * 1.2 * progress);
            rightArm.rotation.x = Math.PI * 0.3 - (Math.PI * 0.5 * progress);
            rightArm.rotation.y = 0;
            
            // Step back from lunge
            this.mesh.position.z -= delta * 3;
            
        } else {
            // Reset to initial position
            this.club.rotation.z = Math.PI * 0.7;
            rightArm.rotation.set(-Math.PI * 0.2, 0, -Math.PI * 0.1);
            this.isAttacking = false;
        }
    }

    private onAttackHit() {
        // Get the target (which should be the character)
        const target = this.getTarget();
        if (target) {
            // Find the character in the scene
            const scene = this.mesh.parent;
            if (scene) {
                // Look for the character in the scene
                const characterMesh = scene.children.find(
                    child => child.userData.entity instanceof Character
                );
                
                if (characterMesh && characterMesh.userData.entity instanceof Character) {
                    const character = characterMesh.userData.entity;
                    // Apply damage using our ATTACK_DAMAGE constant
                    character.takeDamage(this.ATTACK_DAMAGE, this);
                }
            }
        }
    }

    public onCollideWithCharacter(character: Character) {
        super.onCollideWithCharacter(character);
        // Add additional collision effects if needed
    }
} 