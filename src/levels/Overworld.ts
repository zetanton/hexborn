import * as THREE from 'three';
import { Biome } from './biomes/Biome';
import { ForestBiome } from './biomes/ForestBiome';
import { WinterBiome } from './biomes/WinterBiome';
import { MountainBiome } from './biomes/MountainBiome';
import { DesertBiome } from './biomes/DesertBiome';
import { CityBiome } from './biomes/CityBiome';

export class Overworld {
  private scene: THREE.Scene;
  private biomes: Biome[] = [];
  private readonly BIOME_SIZE = 200;
  private readonly WORLD_SIZE = 1000;
  private birds: THREE.Group[] = [];
  private clouds: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createWorldBoundary();
    this.createOcean();
    this.createClouds();
    this.createBirds();
    this.createBiomes();
  }

  private createWorldBoundary() {
    // Invisible barrier
    const barrierGeometry = new THREE.BoxGeometry(this.WORLD_SIZE, 100, this.WORLD_SIZE);
    const barrierMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.BackSide
    });
    const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
    barrier.position.y = 50;
    this.scene.add(barrier);
  }

  private createOcean() {
    const oceanGeometry = new THREE.PlaneGeometry(this.WORLD_SIZE * 2, this.WORLD_SIZE * 2);
    const oceanMaterial = new THREE.MeshStandardMaterial({
      color: 0x0077be,
      roughness: 0.0,
      metalness: 0.1,
      transparent: true,
      opacity: 0.8
    });
    const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -5;
    this.scene.add(ocean);

    // Animate ocean waves
    const animate = () => {
      const time = Date.now() * 0.001;
      ocean.position.y = -5 + Math.sin(time) * 0.2;
      requestAnimationFrame(animate);
    };
    animate();
  }

  private createClouds() {
    const cloudCount = 50;
    for (let i = 0; i < cloudCount; i++) {
      const cloud = this.createCloud();
      const angle = (i / cloudCount) * Math.PI * 2;
      const radius = Math.random() * (this.WORLD_SIZE/2 - 50) + 50;
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
      const radius = Math.random() * (this.WORLD_SIZE/3 - 30) + 30;
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

  private createBiomes() {
    // Create a 2x3 grid of biomes
    const biomePositions = [
      // Top row
      { x: -this.BIOME_SIZE, y: this.BIOME_SIZE },   // Winter
      { x: this.BIOME_SIZE, y: this.BIOME_SIZE },    // Mountains
      // Middle row
      { x: -this.BIOME_SIZE, y: 0 },                 // Forest
      { x: this.BIOME_SIZE, y: 0 },                  // Desert
      // Bottom row
      { x: 0, y: -this.BIOME_SIZE },                 // City
    ];

    this.biomes = [
      new WinterBiome(
        this.scene,
        new THREE.Vector2(biomePositions[0].x, biomePositions[0].y),
        new THREE.Vector2(this.BIOME_SIZE, this.BIOME_SIZE)
      ),
      new MountainBiome(
        this.scene,
        new THREE.Vector2(biomePositions[1].x, biomePositions[1].y),
        new THREE.Vector2(this.BIOME_SIZE, this.BIOME_SIZE)
      ),
      new ForestBiome(
        this.scene,
        new THREE.Vector2(biomePositions[2].x, biomePositions[2].y),
        new THREE.Vector2(this.BIOME_SIZE, this.BIOME_SIZE)
      ),
      new DesertBiome(
        this.scene,
        new THREE.Vector2(biomePositions[3].x, biomePositions[3].y),
        new THREE.Vector2(this.BIOME_SIZE, this.BIOME_SIZE)
      ),
      new CityBiome(
        this.scene,
        new THREE.Vector2(biomePositions[4].x, biomePositions[4].y),
        new THREE.Vector2(this.BIOME_SIZE, this.BIOME_SIZE)
      )
    ];

    // Generate each biome
    this.biomes.forEach(biome => biome.generate());
  }

  getGroundHeight(position: THREE.Vector3): number {
    // Find which biome the position is in
    for (const biome of this.biomes) {
      if (biome.isInBiome(position)) {
        return biome.getGroundHeight(position);
      }
    }
    return 0; // Default height for positions outside all biomes
  }
} 