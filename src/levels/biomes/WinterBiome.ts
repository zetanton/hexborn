import * as THREE from '../../../node_modules/@types/three';
import { Biome } from './Biome';

export class WinterBiome extends Biome {
  private heightMap: number[][] = [];
  private readonly GRID_SIZE = 100;
  private snowParticles!: THREE.Points;
  private readonly SNOW_COUNT = 1000;

  generate(): void {
    this.generateHeightMap();
    this.createSnowGround();
    this.createPineTrees();
    this.createIgloos();
    this.createSnowfall();
  }

  private generateHeightMap() {
    for (let i = 0; i < this.GRID_SIZE; i++) {
      this.heightMap[i] = [];
      for (let j = 0; j < this.GRID_SIZE; j++) {
        const x = (i / this.GRID_SIZE) * 4;
        const y = (j / this.GRID_SIZE) * 4;
        this.heightMap[i][j] = this.noise(x, y) * 2; // Gentle snow hills
      }
    }
  }

  private createSnowGround() {
    const geometry = new THREE.PlaneGeometry(this.size.x, this.size.y, this.GRID_SIZE - 1, this.GRID_SIZE - 1);
    const vertices = geometry.attributes.position.array;

    for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
        const index = (i * this.GRID_SIZE + j) * 3;
        vertices[index + 2] = this.heightMap[i][j];
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({ 
      color: 0xFFFFFF,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(this.position.x, 0, this.position.y);
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private createSnowfall() {
    const snowGeometry = new THREE.BufferGeometry();
    const snowPositions = new Float32Array(this.SNOW_COUNT * 3);
    
    for (let i = 0; i < this.SNOW_COUNT * 3; i += 3) {
      snowPositions[i] = this.position.x - this.size.x/2 + Math.random() * this.size.x;
      snowPositions[i + 1] = Math.random() * 50; // Height range
      snowPositions[i + 2] = this.position.y - this.size.y/2 + Math.random() * this.size.y;
    }
    
    snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    
    const snowMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 0.1,
      transparent: true,
      opacity: 0.8
    });
    
    this.snowParticles = new THREE.Points(snowGeometry, snowMaterial);
    this.scene.add(this.snowParticles);

    // Animation function
    const animate = () => {
      const positions = this.snowParticles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= 0.1; // Fall speed
        if (positions[i + 1] < this.getGroundHeight(new THREE.Vector3(positions[i], 0, positions[i + 2]))) {
          positions[i + 1] = 50; // Reset to top when hitting ground
        }
      }
      this.snowParticles.geometry.attributes.position.needsUpdate = true;
      requestAnimationFrame(animate);
    };
    animate();
  }

  private createIgloos() {
    const iglooCount = Math.floor((this.size.x * this.size.y) / 10000); // Sparse igloos
    
    for (let i = 0; i < iglooCount; i++) {
      const x = this.position.x - this.size.x/2 + Math.random() * this.size.x;
      const z = this.position.y - this.size.y/2 + Math.random() * this.size.y;
      const height = this.getGroundHeight(new THREE.Vector3(x, 0, z));
      this.createIgloo(new THREE.Vector3(x, height, z));
    }
  }

  private createIgloo(position: THREE.Vector3) {
    const igloo = new THREE.Group();

    // Main dome
    const radius = 2;
    const domeGeometry = new THREE.SphereGeometry(radius, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const snowMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 1.0,
      metalness: 0.0
    });
    const dome = new THREE.Mesh(domeGeometry, snowMaterial);
    dome.position.y = radius;
    dome.castShadow = true;
    igloo.add(dome);

    // Entrance tunnel
    const tunnelRadius = radius * 0.6;
    const tunnelGeometry = new THREE.CylinderGeometry(tunnelRadius, tunnelRadius, radius * 1.5, 16, 1, true, -Math.PI/4, Math.PI/2);
    const tunnel = new THREE.Mesh(tunnelGeometry, snowMaterial);
    tunnel.rotation.z = Math.PI / 2;
    tunnel.position.set(radius * 0.8, tunnelRadius, 0);
    igloo.add(tunnel);

    igloo.position.copy(position);
    igloo.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(igloo);
  }

  private createPineTrees() {
    const treeCount = Math.floor((this.size.x * this.size.y) / 150);
    
    for (let i = 0; i < treeCount; i++) {
      const x = this.position.x - this.size.x/2 + Math.random() * this.size.x;
      const z = this.position.y - this.size.y/2 + Math.random() * this.size.y;
      const height = this.getGroundHeight(new THREE.Vector3(x, 0, z));
      this.createPineTree(new THREE.Vector3(x, height, z));
    }
  }

  private createPineTree(position: THREE.Vector3) {
    const tree = new THREE.Group();

    // Create trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.2, 3, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x3B2F2F });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    tree.add(trunk);

    // Create snow-covered pine layers
    const pineColor = 0x2F4F4F;
    const pineMaterial = new THREE.MeshStandardMaterial({ color: pineColor });
    const snowMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });

    for (let i = 0; i < 4; i++) {
      const y = 1.5 + i * 0.8;
      const radius = 1.2 - i * 0.2;
      const height = 0.8;

      const pineGeometry = new THREE.ConeGeometry(radius, height, 8);
      const pine = new THREE.Mesh(pineGeometry, pineMaterial);
      pine.position.y = y;
      pine.castShadow = true;
      tree.add(pine);

      // Add snow on top
      const snowGeometry = new THREE.ConeGeometry(radius * 0.8, height * 0.2, 8);
      const snow = new THREE.Mesh(snowGeometry, snowMaterial);
      snow.position.y = y + height/2;
      snow.castShadow = true;
      tree.add(snow);
    }

    tree.position.copy(position);
    this.scene.add(tree);
  }

  private noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    return (Math.sin(X + Y * 57) * 43758.5453123) % 1;
  }

  override getGroundHeight(position: THREE.Vector3): number {
    const x = Math.floor(((position.x - (this.position.x - this.size.x/2)) / this.size.x) * (this.GRID_SIZE - 1));
    const z = Math.floor(((position.z - (this.position.y - this.size.y/2)) / this.size.y) * (this.GRID_SIZE - 1));
    
    if (x >= 0 && x < this.GRID_SIZE && z >= 0 && z < this.GRID_SIZE) {
      return this.heightMap[x][z];
    }
    return 0;
  }
} 