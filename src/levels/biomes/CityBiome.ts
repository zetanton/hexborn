import * as THREE from 'three';
import { Biome } from './Biome';
import { Building } from '../../entities/Building';
import { StreetLamp } from '../../entities/StreetLamp';

export class CityBiome extends Biome {
  private buildings: Building[] = [];
  private streetLamps: StreetLamp[] = [];

  protected generateTerrain(): void {
    this.createGround();
    this.createRoads();
    this.createBuildings();
    this.createStreetLamps();
    this.setupLighting();
  }

  private createGround() {
    const groundGeometry = new THREE.PlaneGeometry(this.size.x, this.size.y);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x808080,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(this.position.x, 0, this.position.y);
    ground.receiveShadow = true;
    this.addObject(ground);
  }

  private createRoads() {
    const roadWidth = 15;
    const blockSize = 80;
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.8,
      metalness: 0.2
    });

    // Create grid of roads
    for (let x = -this.size.x/2; x <= this.size.x/2; x += blockSize) {
      const roadGeometry = new THREE.PlaneGeometry(roadWidth, this.size.y);
      const road = new THREE.Mesh(roadGeometry, roadMaterial);
      road.rotation.x = -Math.PI / 2;
      road.position.set(this.position.x + x, 0.01, this.position.y);
      this.addObject(road);
    }

    for (let y = -this.size.y/2; y <= this.size.y/2; y += blockSize) {
      const roadGeometry = new THREE.PlaneGeometry(this.size.x, roadWidth);
      const road = new THREE.Mesh(roadGeometry, roadMaterial);
      road.rotation.x = -Math.PI / 2;
      road.position.set(this.position.x, 0.01, this.position.y + y);
      this.addObject(road);
    }
  }

  private createBuildings() {
    const blockSize = 80;
    const buildingMargin = 15;
    const buildingColors = [0x808080, 0x606060, 0x404040, 0xA0A0A0];

    for (let x = -this.size.x/2 + blockSize/2; x < this.size.x/2; x += blockSize) {
        for (let y = -this.size.y/2 + blockSize/2; y < this.size.y/2; y += blockSize) {
            const buildingWidth = Math.min(40, blockSize - buildingMargin * 2);
            const buildingDepth = Math.min(40, blockSize - buildingMargin * 2);
            const buildingHeight = 20 + Math.random() * 100;

            this.createBuilding(
                new THREE.Vector3(
                    this.position.x + x,
                    buildingHeight/2,
                    this.position.y + y
                ),
                buildingWidth,
                buildingDepth,
                buildingHeight,
                buildingColors[Math.floor(Math.random() * buildingColors.length)]
            );
        }
    }
  }

  private createBuilding(position: THREE.Vector3, width: number, depth: number, height: number, color: number) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7,
        metalness: 0.3
    });

    const buildingEntity = new Building(geometry, material);
    buildingEntity.mesh.position.copy(position);
    
    // Add door
    const doorHeight = 3.5;
    const doorWidth = 2.5;
    const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, 0.3);
    const doorMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a3c2b,
        roughness: 0.9,
        metalness: 0.1
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, -height/2 + doorHeight/2, depth/2 + 0.1);
    buildingEntity.mesh.add(door);
    
    // Create shared materials for windows
    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x87CEEB,
        roughness: 0.2,
        metalness: 0.8
    });

    // Create illuminated window material
    const illuminatedWindowMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffcc,
        emissive: 0xffffcc,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.8
    });

    const windowSize = 3.5;
    const windowSpacing = 7.0;
    const windowRows = Math.floor(height / windowSpacing) - 1;
    const windowCols = Math.floor(width / windowSpacing) - 1;

    // Function to create windows for a side
    const createWindowsForSide = (rotation: number, xOffset: number, zOffset: number) => {
        for (let row = 0; row < windowRows; row++) {
            if (row % 2 !== 0) continue;
            
            for (let col = 0; col < windowCols; col++) {
                if (col % 2 !== 0) continue;

                // Skip window position if it would intersect with the door
                if (rotation === 0 && row === 0 && Math.abs(col * windowSpacing - width/2) < doorWidth) {
                    continue;
                }

                const windowGeometry = new THREE.BoxGeometry(windowSize, windowSize, 0.2);
                // Randomly choose between regular and illuminated window material
                const material = Math.random() < 0.3 ? illuminatedWindowMaterial : windowMaterial;
                const windowPane = new THREE.Mesh(windowGeometry, material);
                windowPane.rotation.y = rotation;
                
                if (rotation === 0 || rotation === Math.PI) { // Front and back
                    windowPane.position.set(
                        -width/2 + windowSpacing + col * windowSpacing,
                        -height/2 + windowSpacing + row * windowSpacing,
                        zOffset
                    );
                } else { // Sides
                    windowPane.position.set(
                        xOffset,
                        -height/2 + windowSpacing + row * windowSpacing,
                        depth/2 - windowSpacing - col * windowSpacing
                    );
                }
                
                buildingEntity.mesh.add(windowPane);
            }
        }
    };

    // Create windows on all four sides
    createWindowsForSide(0, 0, depth/2 + 0.1); // Front
    createWindowsForSide(Math.PI, 0, -depth/2 - 0.1); // Back
    createWindowsForSide(Math.PI/2, -width/2 - 0.1, 0); // Left
    createWindowsForSide(-Math.PI/2, width/2 + 0.1, 0); // Right

    this.buildings.push(buildingEntity);
    this.addObject(buildingEntity.mesh);
  }

  private setupLighting() {
    // Add ambient light to simulate general city glow
    const ambientLight = new THREE.AmbientLight(0xffffcc, 0.3);
    this.addObject(ambientLight);

    // Add a few strategic point lights for key areas
    const createAreaLight = (x: number, z: number) => {
      const light = new THREE.PointLight(0xffffcc, 1, 150);
      light.position.set(
        this.position.x + x,
        30, // Higher placement for better coverage
        this.position.y + z
      );
      this.addObject(light);
    };

    // Add lights at major intersections, excluding the outer edge
    const blockSize = 80;
    for (let x = -this.size.x/2; x <= this.size.x/2; x += blockSize) {
      for (let z = -this.size.y/2; z <= this.size.y/2; z += blockSize) {
        // Skip if we're at the outer edge
        if (x === -this.size.x/2 || x === this.size.x/2 ||
            z === -this.size.y/2 || z === this.size.y/2) {
          continue;
        }
        createAreaLight(x, z);
      }
    }
  }

  private createStreetLamps() {
    const blockSize = 80;

    // Place lamps at all intersections except the outer edge
    for (let x = -this.size.x/2; x <= this.size.x/2; x += blockSize) {
      for (let z = -this.size.y/2; z <= this.size.y/2; z += blockSize) {
        // Skip if we're at the outer edge
        if (x === -this.size.x/2 || x === this.size.x/2 ||
            z === -this.size.y/2 || z === this.size.y/2) {
          continue;
        }
        
        // Place lamps at intersections
        this.placeIntersectionLamps(x, z);
        
        // Place lamps at midpoints between intersections
        if (z + blockSize/2 <= this.size.y/2 && z !== -this.size.y/2) {
          this.placeMidpointLamps(x, z + blockSize/2, true);
        }
        if (x + blockSize/2 <= this.size.x/2 && x !== -this.size.x/2) {
          this.placeMidpointLamps(x + blockSize/2, z, false);
        }
      }
    }
  }

  private placeIntersectionLamps(x: number, z: number) {
    // Place lamps at each corner of the intersection
    const cornerOffsets = [
      { x: -7.5, z: -7.5 },
      { x: -7.5, z: 7.5 },
      { x: 7.5, z: -7.5 },
      { x: 7.5, z: 7.5 }
    ];

    cornerOffsets.forEach(offset => {
      const lamp = new StreetLamp();
      lamp.mesh.position.set(
        this.position.x + x + offset.x,
        0,
        this.position.y + z + offset.z
      );
      // Rotate lamp to face the intersection
      lamp.mesh.rotation.y = Math.atan2(offset.x, offset.z);
      this.streetLamps.push(lamp);
      this.addObject(lamp.mesh);
    });
  }

  private placeMidpointLamps(x: number, z: number, isHorizontal: boolean) {
    // Place two lamps at the midpoint
    [-7.5, 7.5].forEach(offset => {
      const lamp = new StreetLamp();
      lamp.mesh.position.set(
        this.position.x + x + (isHorizontal ? offset : 0),
        0,
        this.position.y + z + (isHorizontal ? 0 : offset)
      );
      lamp.mesh.rotation.y = isHorizontal ? 0 : Math.PI / 2;
      this.streetLamps.push(lamp);
      this.addObject(lamp.mesh);
    });
  }

  public getBuildings(): Building[] {
    return this.buildings;
  }

  public getStreetLamps(): StreetLamp[] {
    return this.streetLamps;
  }
} 