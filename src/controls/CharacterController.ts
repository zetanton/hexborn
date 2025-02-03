import * as THREE from 'three';
import { Character } from '../entities/Character';
import { SoundManager } from '../audio/SoundManager';

export class CharacterController {
  private character: Character;
  private moveDirection: THREE.Vector3 = new THREE.Vector3();
  private cameraRotation: number = 0;
  private readonly NORMAL_SPEED = 8;
  private readonly SPRINT_SPEED = 24; // 3x normal speed
  private isSprinting: boolean = false;
  private isMoving: boolean = false;

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
      case 'ShiftRight':
        this.isSprinting = true;
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
      case 'ShiftRight':
        this.isSprinting = false;
        break;
    }
  }

  updateCameraRotation(rotation: number) {
    this.cameraRotation = rotation;
  }

  update() {
    this.isMoving = this.moveDirection.length() > 0;

    // Handle walking sound state changes
    if (this.isMoving && this.character.isOnGround()) {
      SoundManager.getInstance().startWalking(this.isSprinting);
    } else if (!this.isMoving || !this.character.isOnGround()) {
      SoundManager.getInstance().stopWalking();
    }

    if (this.moveDirection.length() > 0) {
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

      // Normalize and apply movement with better ground check
      cameraRelativeMovement.normalize();
      const currentSpeed = this.isSprinting ? this.SPRINT_SPEED : this.NORMAL_SPEED;
      
      if (this.character.isOnGround()) {
        this.character.moveInDirection(cameraRelativeMovement, currentSpeed);
      } else {
        // Reduced air control
        this.character.moveInDirection(cameraRelativeMovement, currentSpeed * 0.3);
      }

      // Clamp velocity
      const velocity = this.character.getVelocity();
      const maxVelocity = this.isSprinting ? this.SPRINT_SPEED : this.NORMAL_SPEED;
      velocity.x = THREE.MathUtils.clamp(velocity.x, -maxVelocity, maxVelocity);
      velocity.z = THREE.MathUtils.clamp(velocity.z, -maxVelocity, maxVelocity);
    } else {
      this.character.moveInDirection(new THREE.Vector3(), 0);
    }
  }
}