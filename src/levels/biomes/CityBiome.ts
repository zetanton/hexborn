import * as THREE from 'three';
import { Biome } from './Biome';
import { Building } from '../../entities/Building';

export class CityBiome extends Biome {
  private buildings: Building[] = [];

  protected generateTerrain(): void {
    this.createGround();
    this.createRoads();
    this.createBuildings();
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
    const roadWidth = 5;
    const blockSize = 20;
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
    const blockSize = 20;
    const buildingMargin = 7;
    const buildingColors = [0x808080, 0x606060, 0x404040, 0xA0A0A0];

    for (let x = -this.size.x/2 + blockSize/2; x < this.size.x/2; x += blockSize) {
        for (let y = -this.size.y/2 + blockSize/2; y < this.size.y/2; y += blockSize) {
            // Random chance to skip a building (empty lot)
            if (Math.random() < 0.2) continue;

            const buildingWidth = Math.min(10, blockSize - buildingMargin * 2);
            const buildingDepth = Math.min(10, blockSize - buildingMargin * 2);
            const buildingHeight = 5 + Math.random() * 30;

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
    
    // Add windows
    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x87CEEB,
        roughness: 0.2,
        metalness: 0.8
    });

    const windowSize = 0.5;
    const windowSpacing = 1.5;
    const windowRows = Math.floor(height / windowSpacing) - 1;
    const windowCols = Math.floor(width / windowSpacing) - 1;

    for (let row = 0; row < windowRows; row++) {
        for (let col = 0; col < windowCols; col++) {
            const windowGeometry = new THREE.BoxGeometry(windowSize, windowSize, 0.1);
            const windowPane = new THREE.Mesh(windowGeometry, windowMaterial);
            windowPane.position.set(
                -width/2 + windowSpacing + col * windowSpacing,
                -height/2 + windowSpacing + row * windowSpacing,
                depth/2 + 0.1
            );
            buildingEntity.mesh.add(windowPane);

            // Add windows to other sides
            if (col === 0) {
                const sideWindow = windowPane.clone();
                sideWindow.rotation.y = Math.PI / 2;
                sideWindow.position.set(
                    -width/2 - 0.1,
                    -height/2 + windowSpacing + row * windowSpacing,
                    depth/2 - windowSpacing - col * windowSpacing
                );
                buildingEntity.mesh.add(sideWindow);
            }
        }
    }

    this.buildings.push(buildingEntity);
    this.addObject(buildingEntity.mesh);
  }

  public getBuildings(): Building[] {
    return this.buildings;
  }
} 