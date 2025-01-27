import * as THREE from 'three';
import { Biome } from './biomes/Biome';
import { WinterBiome } from './biomes/WinterBiome';
import { DesertBiome } from './biomes/DesertBiome';
import { SwampBiome } from './biomes/SwampBiome';
import { ForestBiome } from './biomes/ForestBiome';
import { MountainBiome } from './biomes/MountainBiome';
import { CityBiome } from './biomes/CityBiome';

export class Overworld {
  private scene: THREE.Scene;
  private biomes: Biome[] = [];
  private readonly BIOME_SIZE = new THREE.Vector2(100, 100);
  private readonly WORLD_BARRIER_SIZE = 1000;
  private birds: THREE.Group[] = [];
  private clouds: THREE.Mesh[] = [];
  private readonly SPACING = 100; // Match BIOME_SIZE to avoid gaps
  private readonly barrierBounds = {
    min: new THREE.Vector3(-150, -100, -100), // Adjusted to match biome grid
    max: new THREE.Vector3(150, 100, 100)
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.setupWorld();
    this.createWorldBoundary();
    this.createOcean();
    this.createClouds();
    this.createBirds();
  }

  private setupWorld() {
    // Create sky
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(this.WORLD_BARRIER_SIZE, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x87CEEB,
        side: THREE.BackSide
      })
    );
    this.scene.add(sky);

    // Create biomes in a 3x2 grid
    const biomeTypes = [
      [WinterBiome, DesertBiome, SwampBiome],
      [ForestBiome, MountainBiome, CityBiome]
    ];

    // Adjust grid positioning to create continuous landmass
    const startX = -this.SPACING * 1.5; // Center of leftmost biomes
    const startZ = -this.SPACING * 0.5; // Center of top row

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const BiomeClass = biomeTypes[row][col];
        const position = new THREE.Vector2(
          startX + col * this.SPACING,
          startZ + row * this.SPACING
        );
        
        const biome = new BiomeClass(this.scene, position, this.BIOME_SIZE);
        biome.generate();
        this.biomes.push(biome);
      }
    }

    // Move ocean lower to avoid clipping
    this.createOcean(-10); // Pass lower Y position
  }

  private createWorldBoundary() {
    // Invisible barrier
    const barrierGeometry = new THREE.BoxGeometry(
      this.barrierBounds.max.x - this.barrierBounds.min.x,
      this.barrierBounds.max.y - this.barrierBounds.min.y,
      this.barrierBounds.max.z - this.barrierBounds.min.z
    );
    const barrierMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.BackSide
    });
    const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
    barrier.position.y = (this.barrierBounds.max.y + this.barrierBounds.min.y) / 2;
    this.scene.add(barrier);
  }

  private createOcean(height: number = -10) {
    const oceanGeometry = new THREE.PlaneGeometry(this.WORLD_BARRIER_SIZE * 2, this.WORLD_BARRIER_SIZE * 2);
    const oceanMaterial = new THREE.MeshStandardMaterial({
      color: 0x0077be,
      roughness: 0.0,
      metalness: 0.1,
      transparent: true,
      opacity: 0.8
    });
    const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = height;
    this.scene.add(ocean);

    // Animate ocean waves
    const animate = () => {
      const time = Date.now() * 0.001;
      ocean.position.y = height + Math.sin(time) * 0.2;
      requestAnimationFrame(animate);
    };
    animate();
  }

  private createClouds() {
    const cloudCount = 50;
    for (let i = 0; i < cloudCount; i++) {
      const cloud = this.createCloud();
      const angle = (i / cloudCount) * Math.PI * 2;
      const radius = Math.random() * (this.WORLD_BARRIER_SIZE/2 - 50) + 50;
      cloud.position.set(
        Math.cos(angle) * radius,
        30 + Math.random() * 20,
        Math.sin(angle) * radius
      );
      this.clouds.push(cloud);
      this.scene.add(cloud);
    }

    // Animate clouds
    const animate = () => {
      this.clouds.forEach((cloud, i) => {
        const time = Date.now() * 0.0001;
        const angle = time + (i * Math.PI * 2 / this.clouds.length);
        const radius = Math.sqrt(cloud.position.x ** 2 + cloud.position.z ** 2);
        cloud.position.x = Math.cos(angle) * radius;
        cloud.position.z = Math.sin(angle) * radius;
        cloud.rotation.y = -angle;
      });
      requestAnimationFrame(animate);
    };
    animate();
  }

  private createCloud(): THREE.Mesh {
    const cloudGroup = new THREE.Group();
    const geometry = new THREE.SphereGeometry(1, 8, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.8
    });

    // Create multiple spheres for puffy cloud appearance
    const sphereCount = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i < sphereCount; i++) {
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(
        Math.random() * 2 - 1,
        Math.random() * 0.5,
        Math.random() * 2 - 1
      );
      sphere.scale.set(
        1 + Math.random(),
        0.8 + Math.random() * 0.4,
        1 + Math.random()
      );
      cloudGroup.add(sphere);
    }

    // Convert group to a single mesh for better performance
    const cloudGeometry = new THREE.BufferGeometry();
    const cloudMaterial = material.clone();
    const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    cloudMesh.scale.set(3, 2, 3);
    return cloudMesh;
  }

  private createBirds() {
    const birdCount = 20;
    for (let i = 0; i < birdCount; i++) {
      const bird = this.createBird();
      const angle = (i / birdCount) * Math.PI * 2;
      const radius = Math.random() * (this.WORLD_BARRIER_SIZE/3 - 30) + 30;
      bird.position.set(
        Math.cos(angle) * radius,
        40 + Math.random() * 20,
        Math.sin(angle) * radius
      );
      this.birds.push(bird);
      this.scene.add(bird);
    }

    // Animate birds
    const animate = () => {
      this.birds.forEach((bird, i) => {
        const time = Date.now() * 0.0002;
        const angle = time + (i * Math.PI * 2 / this.birds.length);
        const radius = Math.sqrt(bird.position.x ** 2 + bird.position.z ** 2);
        bird.position.x = Math.cos(angle) * radius;
        bird.position.z = Math.sin(angle) * radius;
        bird.rotation.y = -angle - Math.PI/2;
        
        // Wing flapping animation
        const wingTime = Date.now() * 0.01;
        const wings = bird.children;
        if (wings.length >= 2) {
          wings[0].rotation.z = Math.sin(wingTime) * 0.3;
          wings[1].rotation.z = -Math.sin(wingTime) * 0.3;
        }
      });
      requestAnimationFrame(animate);
    };
    animate();
  }

  private createBird(): THREE.Group {
    const bird = new THREE.Group();

    // Bird body
    const bodyGeometry = new THREE.ConeGeometry(0.2, 1, 4);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2;
    bird.add(body);

    // Wings
    const wingGeometry = new THREE.PlaneGeometry(1, 0.5);
    const wingMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x666666,
      side: THREE.DoubleSide
    });

    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(0, 0.2, -0.3);
    bird.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(0, 0.2, 0.3);
    bird.add(rightWing);

    return bird;
  }

  getBiomeAt(position: THREE.Vector3): Biome | null {
    return this.biomes.find(biome => biome.isInBiome(position)) || null;
  }

  getGroundHeight(position: THREE.Vector3): number {
    const biome = this.getBiomeAt(position);
    if (biome) {
      return biome.getGroundHeight(position);
    }
    return -5; // Ocean level if outside biomes
  }

  public updateEnvironment(position: THREE.Vector3) {
    // Update fog for each biome
    this.biomes.forEach(biome => {
      if ('updateFog' in biome) {
        (biome as SwampBiome).updateFog(position);
      }
    });
  }
} 