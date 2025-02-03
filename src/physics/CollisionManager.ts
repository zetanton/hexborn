import * as THREE from 'three';
import { Entity } from '../entities/Entity';
import { Character } from '../entities/Character';
import { Monster } from '../entities/Monster';
import { CityBiome } from '../levels/biomes/CityBiome';
import { ForestBiome } from '../levels/biomes/ForestBiome';
import { Biome } from '../levels/biomes/Biome';
import { DesertBiome } from '../levels/biomes/DesertBiome';
import { MountainBiome } from '../levels/biomes/MountainBiome';
import { Troll } from '../entities/Troll';

export class CollisionManager {
    constructor(
        private character: Character,
        private monsters: Monster[]
    ) {}

    private isTroll(entity: Entity): entity is Troll {
        return entity instanceof Troll;
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