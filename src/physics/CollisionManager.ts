import * as THREE from 'three';
import { Entity } from '../entities/Entity';
import { Character } from '../entities/Character';
import { Monster } from '../entities/Monster';
import { CityBiome } from '../levels/biomes/CityBiome';
import { ForestBiome } from '../levels/biomes/ForestBiome';
import { Biome } from '../levels/biomes/Biome';
import { DesertBiome } from '../levels/biomes/DesertBiome';
import { MountainBiome } from '../levels/biomes/MountainBiome';
import { SwampBiome } from '../levels/biomes/SwampBiome';
import { Troll } from '../entities/Troll';
import { Frog } from '../entities/Frog';

export class CollisionManager {

    constructor(
        private character: Character,
        private monsters: Monster[]
    ) {}

    private isTroll(entity: Entity): entity is Troll {
        return entity instanceof Troll;
    }

    private isFrog(entity: Entity): entity is Frog {
        return entity instanceof Frog;
    }

    public handleCollisions(currentBiome: Biome | null) {
        if (!currentBiome) return;

        this.handleMonsterCollisions(this.monsters);
        
        // Handle biome-specific collisions
        if (currentBiome instanceof CityBiome) {
            this.handleBuildingCollisions(currentBiome);
        }
        if (currentBiome instanceof ForestBiome) {
            this.handleTreeCollisions(currentBiome);
        }
        if (currentBiome instanceof DesertBiome) {
            this.handleCactusCollisions(currentBiome);
        }
        if (currentBiome instanceof MountainBiome) {
            this.handleTrollCollisions(currentBiome);
        }
        if (currentBiome instanceof SwampBiome) {
            this.handleSwampCollisions(currentBiome);
        }
    }

    private handleMonsterCollisions(monsters: Monster[]) {
        const characterPos = this.character.mesh.position;

        for (const monster of monsters) {
            // Quick distance check before detailed collision
            const dx = characterPos.x - monster.mesh.position.x;
            const dz = characterPos.z - monster.mesh.position.z;
            const quickDist = dx * dx + dz * dz;
            const minDist = (this.character.collisionRadius + monster.collisionRadius) * 2;
            
            if (quickDist < minDist * minDist && this.character.checkCollision(monster)) {
                this.resolveCollision(this.character, monster);
                this.character.onCollideWithMonster(monster);
                monster.onCollideWithCharacter(this.character);
            }
        }
    }

    private handleBuildingCollisions(cityBiome: CityBiome) {
        for (const building of cityBiome.getBuildings()) {
            if (this.character.checkCollision(building)) {
                this.resolveCollision(this.character, building);
            }
        }
    }

    private handleTreeCollisions(forestBiome: ForestBiome) {
        for (const tree of forestBiome.getTrees()) {
            if (this.character.checkCollision(tree)) {
                this.resolveCollision(this.character, tree);
            }
        }
    }

    private handleCactusCollisions(desertBiome: DesertBiome) {
        for (const cactus of desertBiome.getCacti()) {
            if (this.character.checkCollision(cactus)) {
                this.resolveCollision(this.character, cactus);
            }
        }
    }

    private handleTrollCollisions(mountainBiome: MountainBiome) {
        const trolls = mountainBiome.getTrolls();
        const characterPos = this.character.mesh.position;

        for (const troll of trolls) {
            // Quick distance check before detailed collision
            const dx = characterPos.x - troll.mesh.position.x;
            const dz = characterPos.z - troll.mesh.position.z;
            const quickDist = dx * dx + dz * dz;
            const minDist = (this.character.collisionRadius + troll.collisionRadius) * 2;
            
            if (quickDist < minDist * minDist && this.character.checkCollision(troll)) {
                this.resolveCollision(this.character, troll);
                // Use type guard to ensure troll-specific handling
                if (this.isTroll(troll)) {
                    this.character.onCollideWithMonster(troll);
                    troll.onCollideWithCharacter(this.character);
                }
            }
        }
    }

    private handleSwampCollisions(swampBiome: SwampBiome) {
        // Handle frog collisions
        for (const frog of swampBiome.getFrogs()) {
            const characterPos = this.character.mesh.position;
            const dx = characterPos.x - frog.mesh.position.x;
            const dz = characterPos.z - frog.mesh.position.z;
            const quickDist = dx * dx + dz * dz;
            const minDist = (this.character.collisionRadius + frog.collisionRadius) * 2;
            
            if (quickDist < minDist * minDist && this.character.checkCollision(frog)) {
                this.resolveCollision(this.character, frog);
                if (this.isFrog(frog)) {
                    this.character.onCollideWithMonster(frog);
                    frog.onCollideWithCharacter(this.character);
                }
            }
        }

        // Handle lily pad collisions
        let foundPad = false;
        for (const lilyPad of swampBiome.getLilyPads()) {
            const characterPos = this.character.mesh.position;
            const lilyPadPos = lilyPad.mesh.position;
            const characterVelocity = this.character.getVelocity();

            // Check if character is within horizontal bounds of the lily pad
            const dx = characterPos.x - lilyPadPos.x;
            const dz = characterPos.z - lilyPadPos.z;
            const horizontalDist = Math.sqrt(dx * dx + dz * dz);

            if (horizontalDist <= lilyPad.collisionRadius) {
                const targetY = lilyPadPos.y + 0.5 + lilyPad.getFloatOffset();
                // Only adjust if character's vertical velocity is low (falling or nearly stationary)
                if (characterVelocity.y <= 0.1) {
                    this.character.mesh.position.y = targetY;
                    if (characterVelocity.y < 0) {
                        characterVelocity.y = 0;
                    }
                    if (this.character instanceof Entity) {
                        (this.character as any).isGrounded = true;
                    }
                    foundPad = true;
                }
            }
        }

        // Clear current lily pad if none found
        if (!foundPad) {
        }
    }

    private resolveCollision(entity1: Entity, entity2: Entity) {
        const dx = entity1.mesh.position.x - entity2.mesh.position.x;
        const dz = entity1.mesh.position.z - entity2.mesh.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < (entity1.collisionRadius + entity2.collisionRadius)) {
            const overlap = (entity1.collisionRadius + entity2.collisionRadius) - distance;
            if (distance > 0) {
                const pushX = (dx / distance) * overlap;
                const pushZ = (dz / distance) * overlap;
                
                entity1.mesh.position.x += pushX;
                entity1.mesh.position.z += pushZ;
            }
        }
    }

    public checkBoundaryCollision(
        nextPosition: THREE.Vector3, 
        radius: number, 
        isValidPosition: (pos: THREE.Vector3) => boolean
    ): boolean {
        // Check collision with boundaries by testing points around the character
        const collisionPoints = [
            nextPosition.clone().add(new THREE.Vector3(radius, 0, 0)),  // Right
            nextPosition.clone().add(new THREE.Vector3(-radius, 0, 0)), // Left
            nextPosition.clone().add(new THREE.Vector3(0, 0, radius)),  // Front
            nextPosition.clone().add(new THREE.Vector3(0, 0, -radius))  // Back
        ];

        return collisionPoints.some(point => !isValidPosition(point));
    }
} 