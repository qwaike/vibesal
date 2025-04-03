// Player.js - Player character class
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export class Player {
    constructor(scene) {
        this.scene = scene;
        
        // Physics properties
        this.moveSpeed = 0.05;
        this.runSpeedMultiplier = 1.5;
        this.jumpStrength = 0.35;
        this.gravity = 0.01;
        this.velocity = new THREE.Vector3();
        this.isOnGround = true;
        this.collisionRadius = 0.2;
        this.height = 1.8;
        this.eyeHeight = 0.8;
        this.collidableObjects = [];
        
        // Movement state
        this.moveDirection = new THREE.Vector3();
        this.isMoving = false;
        this.isRunning = false;
        this.isJumping = false;
        
        // Create player model
        this.geometry = new THREE.CapsuleGeometry(0.35, 1.0, 4, 8);
        this.material = new THREE.MeshStandardMaterial({ 
            color: 0x7D9181,
            metalness: 0.5,
            roughness: 0.5
        });
        
        // Create mesh and position it
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.y = this.height / 2;
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        
        // Initialize pointer lock controls
        this.controls = new PointerLockControls(this.camera, document.body);
        this.controls.getObject().position.set(0, this.eyeHeight, 0);
        this.scene.add(this.controls.getObject());
        
        // Bind keyboard controls
        this.bindControls();
        
        console.log('Player initialized');
    }

    bindControls() {
        document.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.moveDirection.z = -1;
                    this.isMoving = true;
                    break;
                case 'KeyS':
                    this.moveDirection.z = 1;
                    this.isMoving = true;
                    break;
                case 'KeyA':
                    this.moveDirection.x = -1;
                    this.isMoving = true;
                    break;
                case 'KeyD':
                    this.moveDirection.x = 1;
                    this.isMoving = true;
                    break;
                case 'Space':
                    if (this.isOnGround) {
                        this.velocity.y = this.jumpStrength;
                        this.isOnGround = false;
                        this.isJumping = true;
                    }
                    break;
                case 'ShiftLeft':
                    this.isRunning = true;
                    break;
            }
        });

        document.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'KeyW':
                    if (this.moveDirection.z < 0) this.moveDirection.z = 0;
                    break;
                case 'KeyS':
                    if (this.moveDirection.z > 0) this.moveDirection.z = 0;
                    break;
                case 'KeyA':
                    if (this.moveDirection.x < 0) this.moveDirection.x = 0;
                    break;
                case 'KeyD':
                    if (this.moveDirection.x > 0) this.moveDirection.x = 0;
                    break;
                case 'ShiftLeft':
                    this.isRunning = false;
                    break;
            }
            
            // Check if player is still moving
            this.isMoving = this.moveDirection.x !== 0 || this.moveDirection.z !== 0;
        });
    }

    update(deltaTime) {
        if (!this.controls.isLocked) return;

        // Update movement
        this.updateMovement(deltaTime);
        
        // Update physics
        this.updatePhysics(deltaTime);
        
        // Update player mesh position
        this.updateMesh();
    }

    updateMovement(deltaTime) {
        const speed = this.isRunning ? this.moveSpeed * this.runSpeedMultiplier : this.moveSpeed;
        
        // Calculate movement direction
        const moveDirection = new THREE.Vector3();
        moveDirection.copy(this.moveDirection);
        
        // Apply camera rotation to movement direction
        moveDirection.applyQuaternion(this.camera.quaternion);
        moveDirection.y = 0; // Keep movement horizontal
        
        // Normalize movement direction
        if (moveDirection.length() > 0) {
            moveDirection.normalize();
        }
        
        // Calculate new position
        const newPosition = this.controls.getObject().position.clone();
        newPosition.add(moveDirection.multiplyScalar(speed));
        
        // Handle collisions
        this.handleHorizontalMovement(newPosition);
    }

    updatePhysics(deltaTime) {
        // Apply gravity
        if (!this.isOnGround) {
            this.velocity.y -= this.gravity;
        }
        
        // Update vertical position
        const newPosition = this.controls.getObject().position.clone();
        newPosition.y += this.velocity.y;
        
        // Check ground collision
        this.checkGroundCollision(newPosition);
    }

    handleHorizontalMovement(newPosition) {
        // Check for collisions
        if (!this.checkCollision(newPosition)) {
            this.controls.getObject().position.copy(newPosition);
        }
    }

    checkGroundCollision(newPosition) {
        // Cast ray downward to check for ground
        const raycaster = new THREE.Raycaster(
            newPosition.clone().add(new THREE.Vector3(0, 0.1, 0)),
            new THREE.Vector3(0, -1, 0),
            0.1,
            2
        );
        
        const intersects = raycaster.intersectObjects(this.collidableObjects);
        
        if (intersects.length > 0) {
            // Ground found
            this.isOnGround = true;
            this.isJumping = false;
            this.velocity.y = 0;
            this.controls.getObject().position.y = intersects[0].point.y + this.eyeHeight;
        } else {
            // No ground found
            this.isOnGround = false;
            this.controls.getObject().position.copy(newPosition);
        }
    }

    checkCollision(position) {
        // Check for collisions with all collidable objects
        for (const object of this.collidableObjects) {
            if (!object.geometry) continue;
            
            const bbox = new THREE.Box3().setFromObject(object);
            const playerPos = position.clone();
            
            // Expand bbox by player radius
            bbox.expandByScalar(this.collisionRadius);
            
            if (bbox.containsPoint(playerPos)) {
                return true;
            }
        }
        
        return false;
    }

    updateMesh() {
        // Update player mesh position to match camera
        this.mesh.position.copy(this.controls.getObject().position);
        this.mesh.position.y -= this.eyeHeight;
    }
} 