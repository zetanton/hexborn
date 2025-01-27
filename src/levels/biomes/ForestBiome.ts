import * as THREE from 'three';
import { Biome } from './Biome';

export class ForestBiome extends Biome {
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
    const treeCount = Math.floor((this.size.x * this.size.y) / 500); // Reduced tree density
    
    for (let i = 0; i < treeCount; i++) {
      const x = this.position.x - this.size.x/2 + Math.random() * this.size.x;
      const z = this.position.y - this.size.y/2 + Math.random() * this.size.y;
      const position = new THREE.Vector3(x, 0, z);
      this.createTree(position);
    }
  }

  private createTree(position: THREE.Vector3) {
    const tree = new THREE.Group();

    // Create trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4A3C2A });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1;
    trunk.castShadow = true;
    tree.add(trunk);

    // Create foliage
    const foliageColor = 0x355E3B;
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: foliageColor });

    const foliageLayers = [
      { y: 2.5, radius: 1.2, height: 1.5 },
      { y: 3.2, radius: 0.9, height: 1.2 },
      { y: 3.8, radius: 0.6, height: 1.0 }
    ];

    foliageLayers.forEach(layer => {
      const foliageGeometry = new THREE.ConeGeometry(layer.radius, layer.height, 8);
      const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
      foliage.position.y = layer.y;
      foliage.castShadow = true;
      tree.add(foliage);
    });

    // Place tree with trunk base at ground level
    this.addGroundedObject(tree, position, 0);
  }
} 