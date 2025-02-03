import * as THREE from 'three';
import { Biome } from './biomes/Biome';
import { WinterBiome } from './biomes/WinterBiome';
import { DesertBiome } from './biomes/DesertBiome';
import { SwampBiome } from './biomes/SwampBiome';
import { ForestBiome } from './biomes/ForestBiome';
import { MountainBiome } from './biomes/MountainBiome';
import { CityBiome } from './biomes/CityBiome';
import { SoundManager } from '../audio/SoundManager';

// Vertex shader for the magical barrier
const barrierVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader for the magical barrier
const barrierFragmentShader = `
  uniform float time;
  varying vec2 vUv;
  
  // Gentle sparkle function
  float sparkle(vec2 uv, float t) {
    float s1 = sin(uv.x * 8.0 + t * 1.0);
    float s2 = sin(uv.y * 8.0 - t * 1.5);
    return pow(abs(s1 * s2), 8.0) * 0.3;
  }
  
  void main() {
    // Soft pastel color palette
    vec3 color1 = vec3(0.4, 0.6, 0.9);   // Soft blue
    vec3 color2 = vec3(0.6, 0.4, 0.8);   // Soft purple
    vec3 color3 = vec3(0.4, 0.7, 0.7);   // Soft cyan
    
    // Slower color transitions
    float t1 = sin(time * 0.2) * 0.5 + 0.5;
    float t2 = sin(time * 0.2 + 2.094) * 0.5 + 0.5;
    float t3 = sin(time * 0.2 + 4.189) * 0.5 + 0.5;
    
    // Mix base colors
    vec3 baseColor = color1 * t1 + color2 * t2 + color3 * t3;
    
    // Subtle vertical gradient
    float gradientY = smoothstep(0.0, 1.0, vUv.y);
    baseColor *= (0.9 + gradientY * 0.2);
    
    // Add gentle sparkles
    float sparkle1 = sparkle(vUv, time);
    float sparkle2 = sparkle(vUv * 1.5 + 0.5, time * 0.8);
    vec3 sparkleColor = vec3(0.8, 0.8, 1.0) * (sparkle1 + sparkle2);
    
    // Very subtle pulse
    float pulse = sin(time * 0.5) * 0.05 + 0.95;
    
    // Combine everything with reduced intensity
    vec3 finalColor = (baseColor * pulse + sparkleColor) * 0.9;
    
    // Softer edges
    float edgeAlpha = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
    float alpha = 0.5 * edgeAlpha;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export class Overworld {
  private scene: THREE.Scene;
  private biomes: Biome[] = [];
  private readonly BIOME_SIZE = new THREE.Vector2(300, 300);
  private readonly WORLD_BARRIER_SIZE = 2000;
  private birds: THREE.Group[] = [];
  private clouds: THREE.Mesh[] = [];
  private readonly SPACING = 300;
  private readonly VISIBILITY_RANGE = 1500; // 5 biomes worth of distance
  private activeChunks: Set<Biome> = new Set();
  private barriers: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.setupWorld();
    this.createWorldBoundary();
    this.createOcean();
    this.createClouds();
    this.createBirds();
    // Start the animations
    this.animateClouds();
    this.animateBirds();

    // Start playing overworld theme
    SoundManager.getInstance().playTheme('overworld');
  }

  private setupWorld() {
    // Create larger sky for better fog effect
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(this.WORLD_BARRIER_SIZE, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x87CEEB,
        side: THREE.BackSide,
        fog: true
      })
    );
    this.scene.add(sky);

    // Create biomes in a linear arrangement
    const biomeTypes = [
      CityBiome,
      DesertBiome,
      SwampBiome,
      ForestBiome,
      MountainBiome,
      WinterBiome
    ];

    // Place biomes in a line along X axis
    biomeTypes.forEach((BiomeClass, index) => {
      const position = new THREE.Vector2(
        index * this.SPACING,
        0
      );
      
      const biome = new BiomeClass(this.scene, position, this.BIOME_SIZE);
      this.biomes.push(biome);
    });

    // Generate ALL biomes immediately and make them visible
    this.biomes.forEach(biome => {
      biome.generate();
      biome.setVisible(true); // Make all biomes visible initially
      this.activeChunks.add(biome);
    });

    // Adjust fog for better visibility
    this.scene.fog = new THREE.Fog(
      0x87CEEB,
      this.VISIBILITY_RANGE * 0.4, // Start fog further out
      this.VISIBILITY_RANGE * 1.2  // End fog further out
    );
  }

  private createWorldBoundary() {
    // Calculate total world length based on biomes
    const worldLength = this.biomes.length * this.SPACING;
    
    // Create shader material with proper settings
    const createBarrierWithMaterial = () => {
      return new THREE.ShaderMaterial({
        vertexShader: barrierVertexShader,
        fragmentShader: barrierFragmentShader,
        uniforms: {
          time: { value: 0.0 }
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.NormalBlending // Changed from AdditiveBlending
      });
    };

    // Create visible barriers at the edges with larger dimensions
    const barrierGeometry = new THREE.BoxGeometry(
        4, // Slightly thicker barrier
        30, // Taller for better visibility
        this.BIOME_SIZE.y // Match biome depth
    );

    // Left barrier - align with first biome's left edge
    const leftBarrier = new THREE.Mesh(barrierGeometry, createBarrierWithMaterial());
    leftBarrier.position.set(
        -this.BIOME_SIZE.x/2,
        15.1, // Slightly raised to prevent z-fighting
        0
    );
    this.scene.add(leftBarrier);

    // Right barrier - align with last biome's right edge
    const rightBarrier = new THREE.Mesh(barrierGeometry, createBarrierWithMaterial());
    rightBarrier.position.set(
        worldLength - this.SPACING + this.BIOME_SIZE.x/2,
        15.1, // Slightly raised to prevent z-fighting
        0
    );
    this.scene.add(rightBarrier);

    // Front and back barriers
    const sideBarrierGeometry = new THREE.BoxGeometry(
        worldLength,
        30,
        4
    );

    // Front barrier - align with biomes' front edge
    const frontBarrier = new THREE.Mesh(sideBarrierGeometry, createBarrierWithMaterial());
    frontBarrier.position.set(
        (worldLength - this.SPACING)/2,
        15.1, // Slightly raised to prevent z-fighting
        this.BIOME_SIZE.y/2
    );
    this.scene.add(frontBarrier);

    // Back barrier - align with biomes' back edge
    const backBarrier = new THREE.Mesh(sideBarrierGeometry, createBarrierWithMaterial());
    backBarrier.position.set(
        (worldLength - this.SPACING)/2,
        15.1, // Slightly raised to prevent z-fighting
        -this.BIOME_SIZE.y/2
    );
    this.scene.add(backBarrier);

    // Store barriers for animation
    this.barriers = [leftBarrier, rightBarrier, frontBarrier, backBarrier];

    // Start barrier animation immediately
    this.animateBarriers();

    // Add debug markers at corners of all biomes
    const markerGeometry = new THREE.BoxGeometry(5, 30, 5);
    const markerMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

    this.biomes.forEach((_biome, index) => {
        const worldX = index * this.SPACING;
        
        // Create corner markers for this biome
        const corners = [
            // Front corners
            { x: worldX - this.BIOME_SIZE.x/2, z: -this.BIOME_SIZE.y/2 }, // Front left
            { x: worldX + this.BIOME_SIZE.x/2, z: -this.BIOME_SIZE.y/2 }, // Front right
            // Back corners
            { x: worldX - this.BIOME_SIZE.x/2, z: this.BIOME_SIZE.y/2 },  // Back left
            { x: worldX + this.BIOME_SIZE.x/2, z: this.BIOME_SIZE.y/2 }   // Back right
        ];

        corners.forEach(corner => {
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.set(corner.x, 15, corner.z);
            this.scene.add(marker);
        });
    });
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
    const cloudCount = 100; // More clouds
    for (let i = 0; i < cloudCount; i++) {
      const cloud = this.createCloud();
      const angle = (i / cloudCount) * Math.PI * 2;
      const radius = Math.random() * (this.WORLD_BARRIER_SIZE/2 - 100) + 100;
      cloud.position.set(
        Math.cos(angle) * radius,
        100 + Math.random() * 50, // Higher clouds
        Math.sin(angle) * radius
      );
      cloud.scale.multiplyScalar(20); // Larger clouds
      this.clouds.push(cloud);
      this.scene.add(cloud);
    }
  }

  private animateClouds() {
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
    const birdCount = 30;
    for (let i = 0; i < birdCount; i++) {
      const bird = this.createBird();
      const angle = (i / birdCount) * Math.PI * 2;
      const radius = Math.random() * (this.WORLD_BARRIER_SIZE/3 - 50) + 50;
      // Add random speed multiplier for each bird
      bird.userData.speedMultiplier = 0.8 + Math.random() * 0.4; // Speed varies from 0.8x to 1.2x
      bird.position.set(
        Math.cos(angle) * radius,
        70 + Math.random() * 40,
        Math.sin(angle) * radius
      );
      bird.scale.multiplyScalar(1.5);
      this.birds.push(bird);
      this.scene.add(bird);
    }
  }

  private animateBirds() {
    const animate = () => {
      this.birds.forEach((bird, i) => {
        // Use bird's individual speed multiplier
        const baseSpeed = 0.0001;
        const speed = baseSpeed * (bird.userData.speedMultiplier || 1);
        const time = Date.now() * speed;
        const angle = time + (i * Math.PI * 2 / this.birds.length);
        const radius = Math.sqrt(bird.position.x ** 2 + bird.position.z ** 2);
        bird.position.x = Math.cos(angle) * radius;
        bird.position.z = Math.sin(angle) * radius;
        bird.rotation.y = -angle - Math.PI/2;
        
        // Wing flapping speed also varies with flight speed
        const wingSpeed = 0.008 * (bird.userData.speedMultiplier || 1);
        const wingTime = Date.now() * wingSpeed;
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
    // Simply return the biome at this position - no need to generate since all are generated
    return this.biomes.find(biome => biome.isInBiome(position)) || null;
  }

  getGroundHeight(position: THREE.Vector3): number {
    const biome = this.getBiomeAt(position);
    if (biome) {
      return biome.getGroundHeight(position);
    }
    // If not in a biome, return a very high value to prevent movement
    return 1000; // Effectively blocks movement
  }

  public updateVisibleChunks(playerPosition: THREE.Vector3): void {
    // Keep all biomes visible, just update fog and effects
    this.biomes.forEach(biome => {
      // Update fog density based on distance
      if ('updateFog' in biome) {
        (biome as SwampBiome).updateFog(playerPosition);
      }
    });
  }

  public updateEnvironment(position: THREE.Vector3): void {
    this.updateVisibleChunks(position);
    
    // Update fog and other environmental effects
    this.biomes.forEach(biome => {
      if ('updateFog' in biome) {
        (biome as SwampBiome).updateFog(position);
      }
    });
  }

  // Add this new method to check if a position is within valid bounds
  public isPositionValid(position: THREE.Vector3): boolean {
    // Check if position is within any biome's full boundaries
    const inBiome = this.biomes.some((_biome, index) => {
        const halfWidth = this.BIOME_SIZE.x / 2;
        const halfHeight = this.BIOME_SIZE.y / 2;
        
        // Calculate actual world position of biome based on spacing
        const worldX = index * this.SPACING;
        
        // Use exact biome boundaries relative to world position
        return position.x >= (worldX - halfWidth) &&
               position.x <= (worldX + halfWidth) &&
               position.z >= -halfHeight &&
               position.z <= halfHeight;
    });

    return inBiome;
  }

  private animateBarriers() {
    let startTime = Date.now();
    const animate = () => {
      const elapsedTime = (Date.now() - startTime) * 0.001; // Convert to seconds
      this.barriers.forEach((barrier) => {
        const material = barrier.material as THREE.ShaderMaterial;
        material.uniforms.time.value = elapsedTime;
        
        // Debug: Log time value every second
        if (Math.floor(elapsedTime) % 5 === 0) {
          console.log('Barrier time:', elapsedTime);
        }
      });
      requestAnimationFrame(animate);
    };
    animate();
  }

  public getBiomes(): Biome[] {
    return this.biomes;
  }
} 