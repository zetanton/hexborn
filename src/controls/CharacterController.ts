import * as THREE from '../../node_modules/@types/three';
import { Character } from '../entities/Character';

export class CharacterController {
  private character: Character;
  private moveDirection: THREE.Vector3 = new THREE.Vector3();
  private cameraRotation: number = 0;
  private readonly MOVEMENT_SPEED = 5;

  constructor(character: Character) {
    this.character = character;
    this.setupControls();
  }

  private setupControls() {
    document.addEventListener('keydown', (event) => this.handleKeyDown(event));
    document.addEventListener('keyup', (event) => this.handleKeyUp(event));
  }

  private handleKeyDown(event: KeyboardEvent) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveDirection.z = -1;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveDirection.z = 1;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveDirection.x = -1;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveDirection.x = 1;
        break;
      case 'Space':
        this.character.jump();
        break;
    }
  }

  private handleKeyUp(event: KeyboardEvent) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        if (this.moveDirection.z < 0) this.moveDirection.z = 0;
        break;
      case 'KeyS':
      case 'ArrowDown':
        if (this.moveDirection.z > 0) this.moveDirection.z = 0;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        if (this.moveDirection.x < 0) this.moveDirection.x = 0;
        break;
      case 'KeyD':
      case 'ArrowRight':
        if (this.moveDirection.x > 0) this.moveDirection.x = 0;
        break;
    }
  }

  updateCameraRotation(rotation: number) {
    this.cameraRotation = rotation;
  }

  update() {
    if (this.moveDirection.length() > 0) {
      // Create a camera-relative movement direction
      const cameraRelativeMovement = new THREE.Vector3();
      
      // Forward/backward movement
      if (this.moveDirection.z !== 0) {
        cameraRelativeMovement.x += Math.sin(this.cameraRotation) * this.moveDirection.z;
        cameraRelativeMovement.z += Math.cos(this.cameraRotation) * this.moveDirection.z;
      }
      
      // Left/right movement
      if (this.moveDirection.x !== 0) {
        cameraRelativeMovement.x += Math.cos(this.cameraRotation) * this.moveDirection.x;
        cameraRelativeMovement.z += -Math.sin(this.cameraRotation) * this.moveDirection.x;
      }

      // Normalize and apply movement
      cameraRelativeMovement.normalize();
      this.character.moveInDirection(cameraRelativeMovement, this.MOVEMENT_SPEED);
    } else {
      this.character.moveInDirection(new THREE.Vector3(), 0);
    }
  }
}