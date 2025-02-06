import * as THREE from 'three';
import { Entity } from './Entity';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { Wireframe } from 'three/addons/lines/Wireframe.js';
import { WireframeGeometry2 } from 'three/addons/lines/WireframeGeometry2.js';
import { Monster } from './Monster';

interface Point {
  position: THREE.Vector3;
  oldPosition: THREE.Vector3;
  locked: boolean;
}

interface Constraint {
  p1: Point;
  p2: Point;
  length: number;
}

export class Character extends Entity {
  private head: THREE.Group = new THREE.Group();
  private body: THREE.Group = new THREE.Group();
  private leftArm: THREE.Group = new THREE.Group();
  private rightArm: THREE.Group = new THREE.Group();
  private leftLeg: THREE.Group = new THREE.Group();
  private rightLeg: THREE.Group = new THREE.Group();
  private animationTime: number = 0;
  private isWalking: boolean = false;
  private isJumping: boolean = false;
  private isCasting: boolean = false;
  private _castingType: 'fire' | 'ice' | null = null;
  private jumpVelocity: number = 0;
  private readonly JUMP_FORCE: number = 15;
  private readonly GRAVITY: number = 30;

  // Cloth simulation properties
  private points: Point[] = [];
  private constraints: Constraint[] = [];
  private capeMesh: THREE.Mesh | null = null;
  private capeWireframe: Wireframe | null = null;
  private readonly CLOTH_WIDTH = 8;
  private readonly CLOTH_HEIGHT = 10;
  private readonly CLOTH_SEGMENT_SIZE = 0.1;

  private isInvulnerable: boolean = false;
  private invulnerabilityTimer: number = 0;
  private readonly INVULNERABILITY_DURATION: number = 1.0; // Changed to 1.0 seconds

  // Add health property
  private readonly MAX_HEALTH = 100;
  private health: number = 100;

  constructor() {
    super();
    this.createWizard();
    this.initializeClothSimulation();
    // Start at origin to see initial biomes
    this.mesh.position.set(0, 0.75, 0);
    this.collisionRadius = 0.5;
  }

  private createWizard() {
    // Initialize groups
    this.head = new THREE.Group();
    this.body = new THREE.Group();
    this.leftArm = new THREE.Group();
    this.rightArm = new THREE.Group();
    this.leftLeg = new THREE.Group();
    this.rightLeg = new THREE.Group();

    // Create the wizard parts in correct order
    this.createLegs();  // Create legs first
    this.createBody();  // Then create body and add edges to legs
    this.createHead();
    this.createArms();

    // Set initial position
    this.mesh.position.y = 0.75;
  }

  private createBody() {
    // Create chibi body (short and round)
    const bodyGeometry = new THREE.BoxGeometry(0.7, 0.5, 0.35);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000, // Black robe
      roughness: 0.7,
      metalness: 0.1
    });

    // Create yellow material for all edges
    const yellowMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFF00,
      roughness: 0.5,
      metalness: 0.3,
      side: THREE.DoubleSide
    });

    // Create slimmer robe with multiple segments
    const createRobeSegment = (y: number, topRadius: number, bottomRadius: number, height: number) => {
      // Create custom geometry for full circle robe segments
      const segments = 16;
      const geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, height, segments);
      
      // Create the main robe segment
      const segment = new THREE.Mesh(geometry, bodyMaterial);

      // Create yellow edge trim for full circle

      // Create thin strips for the edges
      const topEdge = new THREE.Mesh(
        new THREE.TorusGeometry(topRadius, 0.005, 8, segments, Math.PI * 2),
        yellowMaterial
      );
      topEdge.position.y = height/2;
      topEdge.rotation.x = Math.PI/2;

      const bottomEdge = new THREE.Mesh(
        new THREE.TorusGeometry(bottomRadius, 0.005, 8, segments, Math.PI * 2),
        yellowMaterial
      );
      bottomEdge.position.y = -height/2;
      bottomEdge.rotation.x = Math.PI/2;

      // Create a group to hold all pieces
      const segmentGroup = new THREE.Group();
      segmentGroup.add(segment);
      segmentGroup.add(topEdge);
      segmentGroup.add(bottomEdge);
      segmentGroup.position.y = y;
      
      return segmentGroup;
    };

    // Create robe segments (slimmer)
    const robeSegments: THREE.Group[] = [];
    // Top segment is skinnier, gradually getting wider towards bottom
    robeSegments.push(createRobeSegment(0.1, 0.28, 0.32, 0.15));  // Skinnier top segment
    robeSegments.push(createRobeSegment(-0.05, 0.32, 0.37, 0.15)); // Middle segment
    robeSegments.push(createRobeSegment(-0.2, 0.37, 0.42, 0.15));  // Bottom segment
    robeSegments.forEach(segment => this.body.add(segment));

    // Store for animation
    this.body.userData = { robeSegments };

    // Create shirt with yellow outline
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = 0.25;

    // Add yellow edges to shirt
    const shirtEdges = new THREE.Group();
    const edgeSize = 0.005;

    // Vertical edges
    for (let x of [-0.35, 0.35]) {
      for (let z of [-0.175, 0.175]) {
        const edge = new THREE.Mesh(
          new THREE.BoxGeometry(edgeSize, 0.5, edgeSize),
          yellowMaterial
        );
        edge.position.set(x, 0.25, z);
        shirtEdges.add(edge);
      }
    }

    // Horizontal edges
    for (let y of [0, 0.5]) {
      for (let z of [-0.175, 0.175]) {
        const edge = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, edgeSize, edgeSize),
          yellowMaterial
        );
        edge.position.set(0, y + 0.25, z);
        shirtEdges.add(edge);
      }
    }

    this.body.add(bodyMesh);
    this.body.add(shirtEdges);

    // Add yellow edges to pants (legs) - now the legs exist because createLegs was called first
    const addEdgesToLeg = (leg: THREE.Group) => {
      const thigh = leg.children[0] as THREE.Mesh;
      if (!thigh) return; // Safety check
      
      const thighEdges = new THREE.Group();
      
      // Vertical edges for thigh
      for (let x of [-0.125, 0.125]) {
        for (let z of [-0.125, 0.125]) {
          const edge = new THREE.Mesh(
            new THREE.BoxGeometry(edgeSize, 0.3, edgeSize),
            yellowMaterial
          );
          edge.position.set(x, -0.15, z);
          thighEdges.add(edge);
        }
      }

      // Horizontal edges for thigh
      for (let y of [0, -0.3]) {
        for (let z of [-0.125, 0.125]) {
          const edge = new THREE.Mesh(
            new THREE.BoxGeometry(0.25, edgeSize, edgeSize),
            yellowMaterial
          );
          edge.position.set(0, y, z);
          thighEdges.add(edge);
        }
      }

      thigh.add(thighEdges);
    };

    // Add edges to legs only if they exist
    if (this.leftLeg.children.length > 0) addEdgesToLeg(this.leftLeg);
    if (this.rightLeg.children.length > 0) addEdgesToLeg(this.rightLeg);

    // Add robe last to ensure it's rendered on top
    this.mesh.add(this.body);
  }

  private createHead() {
    // Create large chibi head
    const headGeometry = new THREE.BoxGeometry(0.6, 0.55, 0.5);
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513, // Dark skin tone
      roughness: 0.8,
      metalness: 0.1
    });

    const headMesh = new THREE.Mesh(headGeometry, skinMaterial);
    this.head.add(headMesh);

    // Add wizard hat
    const hatMaterial = new THREE.MeshStandardMaterial({
      color: 0x32CD32, // Lime green
      roughness: 0.7,
      metalness: 0.2
    });

    // Create hat as one piece
    const hatGroup = new THREE.Group();

    // Wide brim
    const hatBrimGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 16);
    const hatBrim = new THREE.Mesh(hatBrimGeometry, hatMaterial);
    hatGroup.add(hatBrim);

    // Main cone (smaller and upright)
    const hatConeGeometry = new THREE.ConeGeometry(0.35, 0.45, 16); // Keep cone same size
    const hatCone = new THREE.Mesh(hatConeGeometry, hatMaterial);
    hatCone.position.y = 0.275; // Half of cone height (0.45/2) plus half of brim height (0.05/2)
    hatGroup.add(hatCone);

    // Position the entire hat
    hatGroup.position.y = 0.3;
    this.head.add(hatGroup);

    // Add face features
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x00FF00,
      emissive: 0x00FF00,
      emissiveIntensity: 0.5
    });

    // Eyes
    const eyeGeometry = new THREE.BoxGeometry(0.15, 0.1, 0.1);
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 0, 0.25);
    this.head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 0, 0.25);
    this.head.add(rightEye);

    // Mouth
    const mouthGeometry = new THREE.BoxGeometry(0.1, 0.03, 0.1);
    const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, -0.15, 0.25);
    this.head.add(mouth);

    this.head.position.y = 0.8;
    this.mesh.add(this.head);
  }

  private createArms() {
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.7,
      metalness: 0.1
    });

    // Create arm segments
    const createArmSegment = (isLeft: boolean) => {
      const arm = isLeft ? this.leftArm : this.rightArm;
      const sign = isLeft ? -1 : 1;

      // Shoulder joint (small sphere)
      const shoulderJointGeometry = new THREE.SphereGeometry(0.12, 8, 8);
      const shoulderJoint = new THREE.Mesh(shoulderJointGeometry, armMaterial);
      
      // Upper arm
      const upperArmGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.2);
      const upperArm = new THREE.Mesh(upperArmGeometry, armMaterial);
      upperArm.position.y = -0.15;
      shoulderJoint.add(upperArm);
      
      // Elbow joint (smaller sphere) - positioned at the end of upper arm
      const elbowJointGeometry = new THREE.SphereGeometry(0.1, 8, 8);
      const elbowJoint = new THREE.Mesh(elbowJointGeometry, armMaterial);
      elbowJoint.position.y = -0.15; // Half the height of upper arm
      upperArm.add(elbowJoint);
      
      // Forearm - positioned at center of elbow joint
      const forearmGeometry = new THREE.BoxGeometry(0.18, 0.25, 0.18);
      const forearm = new THREE.Mesh(forearmGeometry, armMaterial);
      forearm.position.y = -0.125; // Half the height of forearm
      elbowJoint.add(forearm);

      // Hand
      const handGeometry = new THREE.BoxGeometry(0.2, 0.15, 0.2);
      const handMaterial = new THREE.MeshStandardMaterial({
        color: 0x32CD32, // Lime green gloves
        roughness: 0.7,
        metalness: 0.2
      });
      const hand = new THREE.Mesh(handGeometry, handMaterial);
      hand.position.y = -0.2;
      forearm.add(hand);

      // Add yellow outlines
      const edgeSize = 0.005;
      const yellowMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFF00,
        roughness: 0.5,
        metalness: 0.3,
        side: THREE.DoubleSide
      });

      // Upper arm edges
      const upperArmEdges = new THREE.Group();
      // Vertical edges
      for (let x of [-0.1, 0.1]) {
        for (let z of [-0.1, 0.1]) {
          const edge = new THREE.Mesh(
            new THREE.BoxGeometry(edgeSize, 0.3, edgeSize),
            yellowMaterial
          );
          edge.position.set(x, 0, z);
          upperArmEdges.add(edge);
        }
      }
      // Horizontal edges
      for (let y of [-0.15, 0.15]) {
        for (let z of [-0.1, 0.1]) {
          const edge = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, edgeSize, edgeSize),
            yellowMaterial
          );
          edge.position.set(0, y, z);
          upperArmEdges.add(edge);
        }
      }
      upperArm.add(upperArmEdges);

      // Forearm edges
      const forearmEdges = new THREE.Group();
      // Vertical edges
      for (let x of [-0.09, 0.09]) {
        for (let z of [-0.09, 0.09]) {
          const edge = new THREE.Mesh(
            new THREE.BoxGeometry(edgeSize, 0.25, edgeSize),
            yellowMaterial
          );
          edge.position.set(x, 0, z);
          forearmEdges.add(edge);
        }
      }
      // Horizontal edges
      for (let y of [-0.125, 0.125]) {
        for (let z of [-0.09, 0.09]) {
          const edge = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, edgeSize, edgeSize),
            yellowMaterial
          );
          edge.position.set(0, y, z);
          forearmEdges.add(edge);
        }
      }
      forearm.add(forearmEdges);

      // Position the arm at shoulder height on the torso
      arm.add(shoulderJoint);
      arm.position.set(sign * 0.35, 0.5, 0); // x: distance from center, y: at shoulder height
      arm.rotation.z = sign * Math.PI * 0.1; // Slight outward angle
      this.body.add(arm);
    };

    createArmSegment(true);  // Left arm
    createArmSegment(false); // Right arm
  }

  private createLegs() {
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.7,
      metalness: 0.1
    });

    const createLegSegment = (isLeft: boolean) => {
      const leg = isLeft ? this.leftLeg : this.rightLeg;
      const sign = isLeft ? -1 : 1;

      // Thigh
      const thighGeometry = new THREE.BoxGeometry(0.25, 0.3, 0.25);
      const thigh = new THREE.Mesh(thighGeometry, legMaterial);
      thigh.position.y = -0.15;

      // Calf
      const calfGeometry = new THREE.BoxGeometry(0.2, 0.25, 0.2);
      const calf = new THREE.Mesh(calfGeometry, legMaterial);
      calf.position.y = -0.25;
      thigh.add(calf);

      // Boot
      const bootGeometry = new THREE.BoxGeometry(0.25, 0.15, 0.3);
      const bootMaterial = new THREE.MeshStandardMaterial({
        color: 0x32CD32, // Lime green boots
        roughness: 0.7,
        metalness: 0.2
      });
      const boot = new THREE.Mesh(bootGeometry, bootMaterial);
      boot.position.set(0, -0.15, 0.05);
      calf.add(boot);

      leg.add(thigh);
      leg.position.set(sign * 0.25, 0, 0);
      this.mesh.add(leg);
    };

    createLegSegment(true);  // Left leg
    createLegSegment(false); // Right leg
  }

  private initializeClothSimulation() {
    // Create points grid with varying width
    for (let y = 0; y < this.CLOTH_HEIGHT; y++) {
      const widthAtCurrentRow = 0.4 + (y / this.CLOTH_HEIGHT) * 0.6; // Width increases from 0.4 to 1.0
      for (let x = 0; x < this.CLOTH_WIDTH; x++) {
        const xPos = ((x - this.CLOTH_WIDTH / 2) * this.CLOTH_SEGMENT_SIZE) * (widthAtCurrentRow / 0.4);
        
        // Calculate z-offset for top edge to follow body contour
        let zOffset = -0.175; // Base position closer to back
        if (y === 0) {
          // For top edge, curve around the body
          const xRatio = Math.abs(x - (this.CLOTH_WIDTH - 1) / 2) / (this.CLOTH_WIDTH / 2);
          zOffset -= 0.025 * xRatio; // Gradually curve around shoulders
        } else {
          zOffset -= y * 0.03; // Normal draping for rest of cape
        }

        const point: Point = {
          position: new THREE.Vector3(
            xPos,
            -y * this.CLOTH_SEGMENT_SIZE,
            zOffset
          ),
          oldPosition: new THREE.Vector3(
            xPos,
            -y * this.CLOTH_SEGMENT_SIZE,
            zOffset
          ),
          // Lock more points along top edge for better attachment
          locked: y === 0 && (x <= 2 || x >= this.CLOTH_WIDTH - 3 || x === Math.floor(this.CLOTH_WIDTH / 2))
        };
        this.points.push(point);
      }
    }

    // Create constraints with varying lengths
    // Horizontal constraints
    for (let y = 0; y < this.CLOTH_HEIGHT; y++) {
      for (let x = 0; x < this.CLOTH_WIDTH - 1; x++) {
        const p1 = this.points[y * this.CLOTH_WIDTH + x];
        const p2 = this.points[y * this.CLOTH_WIDTH + x + 1];
        const length = p1.position.distanceTo(p2.position);
        this.constraints.push({ p1, p2, length });
      }
    }

    // Vertical constraints with increasing lengths
    for (let y = 0; y < this.CLOTH_HEIGHT - 1; y++) {
      for (let x = 0; x < this.CLOTH_WIDTH; x++) {
        const p1 = this.points[y * this.CLOTH_WIDTH + x];
        const p2 = this.points[(y + 1) * this.CLOTH_WIDTH + x];
        const length = p1.position.distanceTo(p2.position) * 1.1; // Slightly longer to allow natural draping
        this.constraints.push({ p1, p2, length });
      }
    }

    // Add diagonal constraints for better stability
    for (let y = 0; y < this.CLOTH_HEIGHT - 1; y++) {
      for (let x = 0; x < this.CLOTH_WIDTH - 1; x++) {
        const p1 = this.points[y * this.CLOTH_WIDTH + x];
        const p2 = this.points[(y + 1) * this.CLOTH_WIDTH + x + 1];
        const length = p1.position.distanceTo(p2.position) * 1.1;
        this.constraints.push({ p1, p2, length });
      }
    }

    // Create cape mesh with wireframe
    const geometry = new THREE.PlaneGeometry(0.8, 1.0, this.CLOTH_WIDTH - 1, this.CLOTH_HEIGHT - 1);
    
    // Create solid mesh for the cape
    const material = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });

    this.capeMesh = new THREE.Mesh(geometry, material);
    this.capeMesh.position.set(0, 0.5, -0.15); // Moved even closer to back
    this.capeMesh.renderOrder = 1;

    // Create decorative shoulder clips (flat coins)
    const clipGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16);
    const clipMaterial = new THREE.MeshStandardMaterial({
      color: 0x32CD32,
      roughness: 0.3,
      metalness: 0.8
    });

    // Left shoulder clip
    const leftClip = new THREE.Mesh(clipGeometry, clipMaterial);
    leftClip.rotation.x = Math.PI / 2;
    leftClip.position.set(-0.35, 0.5, -0.15); // Aligned with cape
    this.body.add(leftClip);

    // Right shoulder clip
    const rightClip = new THREE.Mesh(clipGeometry, clipMaterial);
    rightClip.rotation.x = Math.PI / 2;
    rightClip.position.set(0.35, 0.5, -0.15); // Aligned with cape
    this.body.add(rightClip);

    // Add extra geometry near clips to ensure coverage
    const positions = geometry.getAttribute('position').array as Float32Array;
    
    // Adjust top row vertices to align with clips
    for (let x = 0; x <= 2; x++) {
      // Left side vertices
      positions[x * 3] -= 0.02; // Move slightly inward
      positions[x * 3 + 1] += 0.02; // Slight lift to meet clips
      positions[x * 3 + 2] += 0.15; // Increased forward movement to touch back
      
      // Right side vertices
      const rightX = (this.CLOTH_WIDTH - 1 - x);
      positions[rightX * 3] += 0.02; // Move slightly inward
      positions[rightX * 3 + 1] += 0.02; // Slight lift to meet clips
      positions[rightX * 3 + 2] += 0.15; // Increased forward movement to touch back
    }
    
    // Adjust middle vertices to curve naturally between clips
    for (let x = 3; x < this.CLOTH_WIDTH - 3; x++) {
      const ratio = Math.abs(x - (this.CLOTH_WIDTH - 1) / 2) / (this.CLOTH_WIDTH / 2);
      positions[x * 3 + 2] += 0.15 - (ratio * 0.01); // More forward movement, less curve
      positions[x * 3 + 1] += 0.01; // Slight lift for natural curve
    }
    
    // Update second row vertices for smoother transition
    for (let x = 0; x <= 2; x++) {
      const secondRowLeft = this.CLOTH_WIDTH + x;
      const secondRowRight = this.CLOTH_WIDTH * 2 - 1 - x;
      
      positions[secondRowLeft * 3 + 2] += 0.12;
      positions[secondRowRight * 3 + 2] += 0.12;
    }

    // Initialize cloth simulation points with adjusted positions
    for (let y = 0; y < this.CLOTH_HEIGHT; y++) {
      for (let x = 0; x < this.CLOTH_WIDTH; x++) {
        const i = (y * this.CLOTH_WIDTH + x) * 3;
        if (y === 0) {
          // Top row points should be exactly at the back
          this.points[y * this.CLOTH_WIDTH + x].position.z = -0.15 + positions[i + 2];
          this.points[y * this.CLOTH_WIDTH + x].oldPosition.z = -0.15 + positions[i + 2];
        }
      }
    }

    // Update the geometry
    geometry.getAttribute('position').needsUpdate = true;
    geometry.computeVertexNormals();

    // Create wireframe overlay
    const wireframeGeometry = new WireframeGeometry2(geometry);
    const wireframeMaterial = new LineMaterial({
      color: 0x32CD32,
      linewidth: 2,
      dashed: false,
      transparent: true,
      opacity: 1
    });

    this.capeWireframe = new Wireframe(wireframeGeometry, wireframeMaterial);
    this.capeWireframe.computeLineDistances();
    this.capeWireframe.position.copy(this.capeMesh.position);
    this.capeWireframe.position.z -= 0.01;
    this.capeWireframe.renderOrder = 2;

    // Add both to the body
    this.body.add(this.capeMesh);
    this.body.add(this.capeWireframe);
  }

  private updateClothPhysics(delta: number) {
    // Base wind and movement-based force
    const baseWind = new THREE.Vector3(
      Math.sin(this.animationTime) * 0.5, // Gentle ambient wind
      0,
      Math.cos(this.animationTime) * 0.3
    );

    // Add movement-based force
    const movementForce = new THREE.Vector3();
    if (this.isWalking) {
      // Get movement direction from character rotation
      const angle = this.mesh.rotation.y;
      // Apply force in opposite direction of movement
      movementForce.set(
        -Math.sin(angle) * 4.0, // Stronger horizontal force
        0.5,                    // Slight upward lift
        -Math.cos(angle) * 4.0  // Stronger forward/back force
      );
    }

    const GRAVITY = new THREE.Vector3(0, -9.8, 0);
    const WIND = baseWind.clone().add(movementForce);
    const DAMPING = this.isWalking ? 0.02 : 0.03; // Less damping when walking
    const MIN_Z = -0.25;
    const GROUND_Y = -1.0;

    // Update points with improved physics
    this.points.forEach((point) => {
      if (!point.locked) {
        const temp = point.position.clone();
        const velocity = point.position.clone().sub(point.oldPosition).multiplyScalar(1 - DAMPING);
        
        // Apply forces
        point.position.add(velocity);
        point.position.add(GRAVITY.clone().multiplyScalar(delta * delta * 0.5));
        
        // Apply wind force based on point height (more effect on higher points)
        const heightFactor = 1.0 - (Math.abs(point.position.y) / this.CLOTH_HEIGHT);
        const windForce = WIND.clone().multiplyScalar(delta * delta * heightFactor);
        point.position.add(windForce);
        
        // Prevent cloth from going through the body with smoother transition
        if (point.position.z > MIN_Z) {
          const penetration = point.position.z - MIN_Z;
          point.position.z = MIN_Z;
          // Add slight outward force when hitting the back
          point.position.x += Math.sign(point.position.x) * penetration * 0.1;
        }

        // Ground collision with bounce
        if (point.position.y < GROUND_Y) {
          point.position.y = GROUND_Y;
          velocity.y *= -0.3; // Bounce factor
          velocity.multiplyScalar(0.8); // Ground friction
        }
        
        point.oldPosition.copy(temp);
      }
    });

    // Solve constraints with increased iterations when walking
    const iterations = this.isWalking ? 6 : 4;
    for (let i = 0; i < iterations; i++) {
      this.constraints.forEach(constraint => {
        const diff = constraint.p1.position.clone().sub(constraint.p2.position);
        const currentLength = diff.length();
        const correction = diff.multiplyScalar((currentLength - constraint.length) / currentLength * 0.5);

        if (!constraint.p1.locked) {
          constraint.p1.position.sub(correction);
        }
        if (!constraint.p2.locked) {
          constraint.p2.position.add(correction);
        }
      });
    }

    // Update both solid mesh and wireframe
    if (this.capeMesh && this.capeWireframe) {
      const positions = this.capeMesh.geometry.attributes.position.array as Float32Array;
      this.points.forEach((point, i) => {
        positions[i * 3] = point.position.x;
        positions[i * 3 + 1] = point.position.y;
        positions[i * 3 + 2] = point.position.z;
      });

      // Update geometries
      this.capeMesh.geometry.attributes.position.needsUpdate = true;
      this.capeMesh.geometry.computeVertexNormals();

      // Update wireframe to match
      this.capeWireframe.geometry = new WireframeGeometry2(this.capeMesh.geometry);
      this.capeWireframe.computeLineDistances();
    }
  }

  update(delta: number, groundHeight: number) {
    // Update animation time
    this.animationTime += delta;

    // Update invulnerability
    if (this.isInvulnerable) {
      this.invulnerabilityTimer -= delta;
      if (this.invulnerabilityTimer <= 0) {
        this.isInvulnerable = false;
      }
    }

    // Update cloth physics
    this.updateClothPhysics(delta);

    // Update wireframe material resolution for both cape and robe
    if (this.capeWireframe) {
      (this.capeWireframe.material as LineMaterial).resolution.set(window.innerWidth, window.innerHeight);
    }
    
    // Update robe wireframe resolutions
    const { robeSegments } = this.body.userData;
    (robeSegments as THREE.Group[]).forEach(segment => {
      const wireframe = segment.userData.wireframe as Wireframe;
      if (wireframe) {
        (wireframe.material as LineMaterial).resolution.set(window.innerWidth, window.innerHeight);
      }
    });

    // Apply physics
    this.applyGravity(delta);
    this.mesh.position.addScaledVector(this.velocity, delta);
    this.checkGroundCollision(groundHeight, 0.65);
    this.applyFriction();

    // Apply gravity and update position for jumping
    if (this.isJumping) {
      this.jumpVelocity -= this.GRAVITY * delta;
      this.mesh.position.y += this.jumpVelocity * delta;

      // Check for landing
      if (this.mesh.position.y <= groundHeight + 0.65) {
        this.mesh.position.y = groundHeight + 0.65;
        this.isJumping = false;
        this.jumpVelocity = 0;
      }
    }

    // Apply animations
    if (this.isWalking) {
      this.applyWalkingAnimation();
    } else if (this.isCasting) {
      this.applyCastingAnimation();
    } else {
      this.applyIdleAnimation();
    }
  }

  private applyIdleAnimation() {
    const t = this.animationTime;
    
    // Gentle floating motion
    this.mesh.position.y += Math.sin(t * 2) * 0.001;
    
    // Very subtle arm swaying
    this.leftArm.rotation.z = Math.sin(t * 2) * 0.05;
    this.rightArm.rotation.z = -Math.sin(t * 2) * 0.05;
    
    // Hat bobbing
    this.head.rotation.z = Math.sin(t * 2) * 0.02;

    // Robe animation
    const { robeSegments } = this.body.userData;
    
    // Animate robe
    (robeSegments as THREE.Mesh[]).forEach((segment: THREE.Mesh, index: number) => {
      segment.position.y = index === 0 ? 0.1 : index === 1 ? -0.05 : -0.2;
      segment.position.x = 0;
      segment.rotation.y = 0;
      
      const delay = index * 0.5;
      segment.rotation.y = Math.sin(t * 1.5 + delay) * 0.05;
      segment.position.x = Math.sin(t * 1.5 + delay) * 0.02;
    });
  }

  private applyWalkingAnimation() {
    const t = this.animationTime;
    const legAmplitude = 0.4;
    const armAmplitude = 0.3;

    // Leg movement
    this.leftLeg.rotation.x = Math.sin(t * 8) * legAmplitude;
    this.rightLeg.rotation.x = -Math.sin(t * 8) * legAmplitude;

    // Natural arm swinging
    this.leftArm.rotation.x = -Math.sin(t * 8) * armAmplitude;
    this.rightArm.rotation.x = Math.sin(t * 8) * armAmplitude;
    this.leftArm.rotation.z = 0;
    this.rightArm.rotation.z = 0;

    // Body bobbing
    this.body.position.y = Math.abs(Math.sin(t * 16)) * 0.1;

    // Robe animation during walking
    const { robeSegments } = this.body.userData;
    
    // Animate robe
    (robeSegments as THREE.Mesh[]).forEach((segment: THREE.Mesh, index: number) => {
      segment.position.y = index === 0 ? 0.1 : index === 1 ? -0.05 : -0.2;
      segment.position.x = 0;
      segment.rotation.y = 0;

      const delay = index * 0.5;
      segment.rotation.y = Math.sin(t * 8 + delay) * 0.15;
      segment.position.x = Math.sin(t * 8 + delay) * 0.05;
      segment.position.y += Math.abs(Math.sin(t * 16 + delay)) * 0.02;
    });
  }

  private applyCastingAnimation() {
    const t = this.animationTime;
    
    // Raise arms for casting
    this.leftArm.rotation.x = -Math.PI / 3;
    this.rightArm.rotation.x = -Math.PI / 3;
    this.leftArm.rotation.z = Math.sin(t * 10) * 0.1;
    this.rightArm.rotation.z = -Math.sin(t * 10) * 0.1;
  }

  jump() {
    if (!this.isJumping) {
      this.isJumping = true;
      this.jumpVelocity = this.JUMP_FORCE;
    }
  }

  startCasting(type: 'fire' | 'ice') {
    this.isCasting = true;
    this._castingType = type;
  }

  stopCasting() {
    this.isCasting = false;
    this._castingType = null;
  }

  get castingType(): 'fire' | 'ice' | null {
    return this._castingType;
  }

  moveInDirection(direction: THREE.Vector3, speed: number) {
    if (direction.length() > 0) {
      direction.normalize();
      this.velocity.x = direction.x * speed;
      this.velocity.z = direction.z * speed;
      
      // Update character rotation to face movement direction
      const angle = Math.atan2(direction.x, direction.z);
      this.mesh.rotation.y = angle;

      this.isWalking = true;
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
      this.isWalking = false;
    }
  }

  public onCollideWithMonster(monster: Monster) {
    if (!this.isInvulnerable) {
        this.health -= monster.getDamage();
        this.isInvulnerable = true;
        this.invulnerabilityTimer = this.INVULNERABILITY_DURATION;
        
        // Push the character back to just outside the monster's collision radius
        const dx = this.mesh.position.x - monster.mesh.position.x;
        const dz = this.mesh.position.z - monster.mesh.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const overlap = (this.collisionRadius + monster.collisionRadius) - distance;
        
        if (overlap > 0) {
            // Normalize the direction
            const norm = Math.sqrt(dx * dx + dz * dz);
            const dirX = dx / norm;
            const dirZ = dz / norm;
            
            // Move character out of collision
            this.mesh.position.x += dirX * overlap;
            this.mesh.position.z += dirZ * overlap;
            
            // Stop velocity in the collision direction
            const dotProduct = (this.velocity.x * dirX + this.velocity.z * dirZ);
            if (dotProduct < 0) {
                this.velocity.x -= dotProduct * dirX;
                this.velocity.z -= dotProduct * dirZ;
            }
        }
    }
  }

  public takeDamage(amount: number, attacker: Monster) {
    if (!this.isInvulnerable) {
      this.health = Math.max(0, this.health - amount);
      this.isInvulnerable = true;
      this.invulnerabilityTimer = this.INVULNERABILITY_DURATION;
      
      // Calculate knockback direction
      const dx = this.mesh.position.x - attacker.mesh.position.x;
      const dz = this.mesh.position.z - attacker.mesh.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance > 0) {
        // Normalize direction and apply knockback
        const knockbackForce = 10;
        const upwardForce = 2;
        this.velocity.x = (dx / distance) * knockbackForce;
        this.velocity.y = upwardForce;
        this.velocity.z = (dz / distance) * knockbackForce;
      }
    }
    // TODO: Add damage feedback (visual/audio)
    console.log(`Character took ${amount} damage from ${attacker.constructor.name}. Health: ${this.health}/${this.MAX_HEALTH}`);
  }

  public getHealth(): number {
    return this.health;
  }

  public getMaxHealth(): number {
    return this.MAX_HEALTH;
  }
} 