import * as THREE from 'three';
import { Biome } from './Biome';
import { Tree } from '../../entities/Tree';

export class ForestBiome extends Biome {
  private trees: Tree[] = [];

  protected generateTerrain(): void {
    this.createGround();
    this.createTrees();
  }

  private createGround() {
    const groundGeometry = new THREE.PlaneGeometry(this.size.x, this.size.y);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x355E3B,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(this.position.x, 0, this.position.y);
    ground.receiveShadow = true;
    this.addObject(ground);
  }

  private createTrees() {
    const treeCount = Math.floor((this.size.x * this.size.y) / 4000); // Even fewer trees due to larger size
    
    for (let i = 0; i < treeCount; i++) {
      const x = this.position.x - this.size.x/2 + Math.random() * this.size.x;
      const z = this.position.y - this.size.y/2 + Math.random() * this.size.y;
      const position = new THREE.Vector3(x, 0, z);
      
      // Create new tree entity
      const tree = new Tree(position);
      this.trees.push(tree);
      this.addObject(tree.mesh);
    }
  }

  // Add method to get trees for collision detection
  public getTrees(): Tree[] {
    return this.trees;
  }
} 