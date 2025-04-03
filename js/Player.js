// Player.js - Player character class
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export class Player {
    constructor(scene) {
        console.log('Initializing player...');
        this.scene = scene;
        
        // Player stats
        this.bureaucraticStamina = 100;
        this.careerRank = 'Intern';
        this.pendingPaperwork = [];
        this.influence = 0;
        this.bureaucracyLevel = 0;

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
        
        // New movement properties
        this.stepHeight = 0.25; // Maximum height player can step up automatically
        this.slopeLimit = 0.8; // Maximum slope player can climb (0-1, where 1 is vertical)
        this.slideVelocity = new THREE.Vector3(); // For slope sliding
        this.lastGroundY = 0; // Track last ground position for stairs
        this.frictionFactor = 0.85; // Increased from 0.9 for better stopping
        
        // Ghost mode properties
        this.ghostMode = false;
        this.ghostMoveSpeed = 0.15; // Faster movement in ghost mode
        this.floatSpeed = 0.1; // Vertical movement speed in ghost mode
        this.floatUp = false;
        this.floatDown = false;
        
        // Collision tracking
        this.activeCollisions = [];
        this.lastLoggedCollisions = [];
        this.collisionLogTimer = 0;
        
        // Movement state
        this.moveDirection = new THREE.Vector3();
        this.isMoving = false;
        this.isRunning = false;
        this.isJumping = false;
        
        // Create player model
        try {
            // Try to use CapsuleGeometry (requires Three.js r137+)
            this.geometry = new THREE.CapsuleGeometry(0.35, 1.0, 4, 8);
        } catch (e) {
            // Fallback to CylinderGeometry for older Three.js versions
            console.log('CapsuleGeometry not available, using CylinderGeometry instead');
            this.geometry = new THREE.CylinderGeometry(0.35, 0.35, 1.8, 8);
        }
        
        this.material = new THREE.MeshStandardMaterial({ 
            color: 0x7D9181,
            metalness: 0.5,
            roughness: 0.5
        });
        
        // Create ghost material
        this.ghostMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaaaff, // Light blue color for ghost
            metalness: 0.9,
            roughness: 0.2,
            transparent: true,
            opacity: 0.6
        });
        
        // Create mesh and position it
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.y = this.height / 2; // Set initial height
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);
        console.log('Player mesh created and added to scene');

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        console.log('Player camera initialized');
        
        // Initialize pointer lock controls
        this.controls = new PointerLockControls(this.camera, document.body);
        this.controls.getObject().position.y = this.eyeHeight;
        this.scene.add(this.controls.getObject());
        
        // Input keys state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            run: false,
            jump: false
        };
        
        // Set up key event listeners
        this.bindControls();
        console.log('Player controls bound');
        
        // Debug mode
        this.debugMode = false;
    }

    bindControls() {
        document.addEventListener('click', () => {
            if (!this.controls.isLocked) {
                this.controls.lock();
            }
        });
        
        // Improved keydown handler that ensures we capture keys correctly
        document.addEventListener('keydown', (event) => {
            // Prevent default to avoid browser handling keys like space
            if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyE'].includes(event.code)) {
                event.preventDefault();
            }
            
            // Log the key being pressed for debugging
            console.log("Key pressed:", event.code);
            
            switch(event.code) {
                case 'KeyW': this.keys.forward = true; break;
                case 'KeyS': this.keys.backward = true; break;
                case 'KeyA': this.keys.left = true; break;
                case 'KeyD': this.keys.right = true; break;
                case 'ShiftLeft': 
                case 'ShiftRight': 
                    this.keys.run = true; 
                    break;
                case 'Space': 
                    if (this.isOnGround || this.ghostMode) {
                        this.keys.jump = true;
                    }
                    break;
                case 'KeyF3':
                    this.debugMode = !this.debugMode;
                    break;
                // Add ghost mode vertical movement controls
                case 'KeyE':
                    this.floatUp = true;
                    break;
                case 'KeyQ':
                    this.floatDown = true;
                    break;
            }
        });
        
        // Improved keyup handler
        document.addEventListener('keyup', (event) => {
            switch(event.code) {
                case 'KeyW': this.keys.forward = false; break;
                case 'KeyS': this.keys.backward = false; break;
                case 'KeyA': this.keys.left = false; break;
                case 'KeyD': this.keys.right = false; break;
                case 'ShiftLeft': 
                case 'ShiftRight': 
                    this.keys.run = false; 
                    break;
                case 'Space': 
                    this.keys.jump = false; 
                    break;
                // Add ghost mode vertical movement controls
                case 'KeyE':
                    this.floatUp = false;
                    break;
                case 'KeyQ':
                    this.floatDown = false;
                    break;
            }
        });
    }
    
    registerCollidableObject(object) {
        this.collidableObjects.push(object);
    }
    
    update() {
        if (this.debugMode) {
            // Log key states for debugging
            console.log("Keys:", 
                "W:", this.keys.forward, 
                "A:", this.keys.left, 
                "S:", this.keys.backward, 
                "D:", this.keys.right,
                "Shift:", this.keys.run,
                "Space:", this.keys.jump,
                "E:", this.floatUp,
                "Q:", this.floatDown,
                "Ghost Mode:", this.ghostMode
            );
        }
        
        this.updateMovement();
        this.updatePhysics();
        this.updateMesh();
        
        // Only update stamina in normal mode
        if (!this.ghostMode) {
            this.updateStamina();
        }
    }
    
    updateMovement() {
        // Reset movement direction
        this.moveDirection.set(0, 0, 0);
        
        // In ghost mode, use a faster speed and don't apply running multiplier
        const speed = this.ghostMode 
            ? this.ghostMoveSpeed 
            : (this.keys.run ? this.moveSpeed * this.runSpeedMultiplier : this.moveSpeed);
        
        // Calculate forward vector based on camera direction
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        
        // In normal mode, keep movement on xz plane. In ghost mode, use actual camera direction for true flying
        if (!this.ghostMode) {
            forward.y = 0;
        }
        forward.normalize();
        
        // Calculate right vector from forward vector
        const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
        
        // Debug movement directions
        if (this.debugMode) {
            console.log("Forward vector:", forward);
            console.log("Right vector:", right);
        }
        
        // Calculate movement direction based on input keys
        if (this.keys.forward) this.moveDirection.add(forward);
        if (this.keys.backward) this.moveDirection.add(forward.clone().multiplyScalar(-1));
        
        // Ensure left/right movement is correct
        if (this.keys.left) this.moveDirection.add(right.clone().multiplyScalar(-1)); // Left is negative of right
        if (this.keys.right) this.moveDirection.add(right); // Right is positive
        
        // In ghost mode, handle vertical movement
        if (this.ghostMode) {
            if (this.floatUp) {
                this.velocity.y = this.floatSpeed;
            } else if (this.floatDown) {
                this.velocity.y = -this.floatSpeed;
            } else {
                this.velocity.y = 0; // Stop vertical movement when no keys are pressed
            }
        }
        
        // Normalize if moving diagonally
        if (this.moveDirection.length() > 0) {
            this.moveDirection.normalize();
            this.isMoving = true;
            this.isRunning = this.keys.run && !this.ghostMode;
            
            if (this.debugMode) {
                console.log("moveDirection:", this.moveDirection);
            }
            
            // Set velocity based on movement direction
            this.velocity.x = this.moveDirection.x * speed;
            this.velocity.z = this.moveDirection.z * speed;
        } else {
            this.isMoving = false;
            this.isRunning = false;
            
            // Always reset horizontal velocity when not moving, even in ghost mode
            this.velocity.x = 0;
            this.velocity.z = 0;
        }
        
        // Apply jump if the key is pressed and player is on the ground (or in ghost mode)
        if (this.keys.jump) {
            if (this.isOnGround && !this.ghostMode) {
                this.velocity.y = this.jumpStrength;
                this.isOnGround = false;
                this.isJumping = true;
            }
            this.keys.jump = false; // Reset to prevent continuous jumping
        }
    }
    
    updatePhysics() {
        // In ghost mode, we skip collision detection
        if (this.ghostMode) {
            // Simply update position based on velocity
            this.controls.getObject().position.add(this.velocity);
            return;
        }
        
        // Normal physics updates below
        // Clear active collisions at the start of the update
        this.activeCollisions = [];
        
        // Apply gravity
        if (!this.isOnGround) {
            this.velocity.y -= this.gravity;
        }
        
        // Calculate new position
        const newPosition = new THREE.Vector3(
            this.controls.getObject().position.x + this.velocity.x,
            this.controls.getObject().position.y + this.velocity.y,
            this.controls.getObject().position.z + this.velocity.z
        );
        
        if (this.debugMode) {
            console.log("Current position:", this.controls.getObject().position);
            console.log("Proposed new position:", newPosition);
            console.log("Velocity:", this.velocity);
        }
        
        // FIRST: Check for ground/floor collisions with improved stair detection
        this.checkGroundCollision();
        
        // Check horizontal collision (X-Z plane) with improved stair/slope handling
        this.handleHorizontalMovement(newPosition);
        
        // Check vertical collision and apply gravity
        const floorPosition = this.controls.getObject().position.clone();
        floorPosition.y = Math.max(0, newPosition.y);
        
        if (floorPosition.y <= this.eyeHeight && this.velocity.y <= 0) {
            // We've hit the ground
            this.velocity.y = 0;
            floorPosition.y = this.eyeHeight;
            this.isOnGround = true;
            this.isJumping = false;
        } else if (this.checkCollision(floorPosition)) {
            // We've hit a ceiling
            if (this.velocity.y > 0) {
                this.velocity.y = 0;
            }
        }
        
        // Update position
        this.controls.getObject().position.y = floorPosition.y;
        
        // Apply improved friction to slow down movement
        // Use higher friction for better stopping
        this.velocity.x *= this.frictionFactor;
        this.velocity.z *= this.frictionFactor;
        
        // More sensitive clamping to zero for tiny movements
        if (Math.abs(this.velocity.x) < 0.0005) this.velocity.x = 0;
        if (Math.abs(this.velocity.z) < 0.0005) this.velocity.z = 0;
        
        // Log active collisions, but not too frequently
        this.collisionLogTimer++;
        if (this.collisionLogTimer >= 10) { // Log every 10 frames
            this.logActiveCollisions();
            this.collisionLogTimer = 0;
        }
    }
    
    // New method for improved horizontal movement with stair handling
    handleHorizontalMovement(newPosition) {
        const currentPosition = this.controls.getObject().position.clone();
        
        // First try moving in both X and Z
        const horizontalPosition = currentPosition.clone();
        horizontalPosition.x = newPosition.x;
        horizontalPosition.z = newPosition.z;
        
        // Check if our intended path is blocked
        if (!this.checkCollision(horizontalPosition)) {
            // Clear path, move directly
            this.controls.getObject().position.x = newPosition.x;
            this.controls.getObject().position.z = newPosition.z;
            
            if (this.debugMode) {
                console.log("No collision, moving to:", this.controls.getObject().position);
            }
            return;
        }
        
        // Path is blocked, try stepping up (for stairs)
        const stepUpPosition = horizontalPosition.clone();
        stepUpPosition.y += this.stepHeight;
        
        if (!this.checkCollision(stepUpPosition)) {
            // We can step up to this position
            this.controls.getObject().position.x = newPosition.x;
            this.controls.getObject().position.z = newPosition.z;
            this.controls.getObject().position.y += this.stepHeight; // Step up
            
            if (this.debugMode) {
                console.log("Stepping up to:", this.controls.getObject().position);
            }
            return;
        }
        
        // Can't step up, try sliding along walls
        this.handleWallSliding(currentPosition, newPosition);
    }
    
    // New method to handle sliding along walls when colliding
    handleWallSliding(currentPosition, newPosition) {
        // Try X movement only
        const xOnlyPosition = currentPosition.clone();
        xOnlyPosition.x = newPosition.x;
        
        if (!this.checkCollision(xOnlyPosition)) {
            this.controls.getObject().position.x = newPosition.x;
            this.velocity.z *= 0.5; // Reduce Z movement rather than stopping completely
            
            if (this.debugMode) {
                console.log("X-only movement allowed");
            }
            return;
        }
        
        // Try Z movement only
        const zOnlyPosition = currentPosition.clone();
        zOnlyPosition.z = newPosition.z;
        
        if (!this.checkCollision(zOnlyPosition)) {
            this.controls.getObject().position.z = newPosition.z;
            this.velocity.x *= 0.5; // Reduce X movement rather than stopping completely
            
            if (this.debugMode) {
                console.log("Z-only movement allowed");
            }
            return;
        }
        
        // Both X and Z blocked, we're stuck against a wall
        if (this.debugMode) {
            console.log("Collision detected, no movement allowed");
        }
        
        // If player is stuck, try to nudge them free by adding a tiny vertical boost
        if (Math.abs(this.velocity.x) < 0.001 && Math.abs(this.velocity.z) < 0.001) {
            this.velocity.y = Math.max(this.velocity.y, 0.05);
            if (this.debugMode) {
                console.log("Player appears stuck - applying small vertical boost");
            }
        }
    }
    
    // Enhanced ground collision detection with stair and slope handling
    checkGroundCollision() {
        // Current player position
        const position = this.controls.getObject().position.clone();
        
        // Raycast straight down to find the ground
        const feetPosition = position.clone();
        feetPosition.y -= (this.eyeHeight - 0.1); // A bit above the feet to detect ground
        
        const groundRaycaster = new THREE.Raycaster(
            feetPosition,
            new THREE.Vector3(0, -1, 0), // Cast downward
            0,                        // Near distance
            1.0                       // Far distance - look up to 1 unit below
        );
        
        const intersects = groundRaycaster.intersectObjects(this.collidableObjects, true);
        
        if (intersects.length > 0) {
            const groundDistance = intersects[0].distance;
            const groundPoint = intersects[0].point;
            
            if (this.debugMode) {
                console.log('Ground detected at distance:', groundDistance);
                console.log('Ground object:', intersects[0].object.name || 'unnamed ground');
            }
            
            // If we're very close to the ground or falling onto it
            if (groundDistance < 0.2 || this.velocity.y <= 0) {
                // Get the ground normal to check slope
                const groundNormal = intersects[0].face.normal.clone();
                // Transform the normal from object space to world space
                const objMatrix = new THREE.Matrix4();
                objMatrix.extractRotation(intersects[0].object.matrixWorld);
                groundNormal.applyMatrix4(objMatrix);
                
                // Calculate the slope (dot product with up vector)
                const slope = groundNormal.dot(new THREE.Vector3(0, 1, 0));
                
                if (this.debugMode) {
                    console.log('Ground normal:', groundNormal);
                    console.log('Slope factor:', slope, '(1.0 is flat, 0.0 is vertical)');
                }
                
                // Position the player exactly on the ground
                this.controls.getObject().position.y = 
                    intersects[0].point.y + this.eyeHeight;
                
                // Calculate the height difference for stair detection
                const heightDiff = Math.abs(groundPoint.y - this.lastGroundY);
                
                // If it's a slope the player can climb
                if (slope >= this.slopeLimit) {
                    // Player can walk normally
                    this.velocity.y = 0;
                    this.isOnGround = true;
                    this.isJumping = false;
                } 
                // If it's a stair step (abrupt height change within step range)
                else if (heightDiff <= this.stepHeight && this.isMoving) {
                    // Help the player up the stair
                    this.velocity.y = heightDiff * 0.1; // Small boost upward
                    this.isOnGround = true;
                    this.isJumping = false;
                    if (this.debugMode) {
                        console.log('Stair step detected, height diff:', heightDiff);
                    }
                }
                // Too steep slope - slide down
                else if (this.isOnGround) {
                    // Calculate slide direction based on ground normal
                    const slideDir = new THREE.Vector3(0, -1, 0)
                        .projectOnPlane(groundNormal)
                        .normalize()
                        .multiplyScalar(0.03 * (1.0 - slope));
                        
                    // Add to velocity
                    this.velocity.add(slideDir);
                    
                    if (this.debugMode) {
                        console.log('Sliding down slope, direction:', slideDir);
                    }
                }
                
                // Store information about this ground collision
                const hitObject = intersects[0].object;
                const alreadyTracked = this.activeCollisions.some(obj => obj.id === hitObject.id);
                
                if (!alreadyTracked) {
                    this.activeCollisions.push({
                        id: hitObject.id,
                        name: hitObject.name || 'ground surface',
                        distance: groundDistance,
                        direction: new THREE.Vector3(0, -1, 0),
                        object: hitObject,
                        normal: groundNormal
                    });
                }
                
                // Remember this ground position for stair detection
                this.lastGroundY = groundPoint.y;
                
                return true;
            }
        } else {
            // No ground detected below
            if (this.isOnGround && this.velocity.y <= 0) {
                // Start falling
                this.isOnGround = false;
            }
        }
        
        return false;
    }
    
    updateMesh() {
        // Move the visual mesh to follow the camera
        this.mesh.position.x = this.controls.getObject().position.x;
        this.mesh.position.z = this.controls.getObject().position.z;
        this.mesh.position.y = this.controls.getObject().position.y - this.eyeHeight + this.height / 2;
        
        // Rotate the mesh to face the movement direction
        if (this.isMoving) {
            const angle = Math.atan2(this.moveDirection.x, this.moveDirection.z);
            this.mesh.rotation.y = angle;
        }
        
        // Update material based on ghost mode
        if (this.ghostMode && this.mesh.material !== this.ghostMaterial) {
            this.mesh.material = this.ghostMaterial;
        } else if (!this.ghostMode && this.mesh.material !== this.material) {
            this.mesh.material = this.material;
        }
    }
    
    updateStamina() {
        // Drain stamina while running
        if (this.isRunning) {
            const drainRate = 0.5;
            this.bureaucraticStamina = Math.max(0, this.bureaucraticStamina - drainRate);
            
            // Stop running if stamina is depleted
            if (this.bureaucraticStamina <= 0) {
                this.keys.run = false;
            }
        }
        
        // Regenerate stamina while not running
        if (!this.isRunning && this.bureaucraticStamina < 100) {
            this.bureaucraticStamina = Math.min(100, this.bureaucraticStamina + 0.1);
        }
    }
    
    // Log active collisions to console if they changed
    logActiveCollisions() {
        // Only log if there are active collisions or the list has changed
        if (this.activeCollisions.length > 0 || 
            JSON.stringify(this.lastLoggedCollisions) !== JSON.stringify(this.activeCollisions)) {
            
            console.log("%c ACTIVE COLLISIONS:", "background: #ff0000; color: white; padding: 2px;");
            
            if (this.activeCollisions.length === 0) {
                console.log("   None");
            } else {
                this.activeCollisions.forEach((collision, index) => {
                    console.log(`   ${index + 1}. ${collision.name || 'Unnamed object'} (distance: ${collision.distance.toFixed(2)})`);
                });
            }
            
            // Update last logged collisions
            this.lastLoggedCollisions = [...this.activeCollisions];
        }
    }
    
    // Improved collision check with better multi-directional detection
    checkCollision(position) {
        // Cast rays in multiple directions for more precise collision detection
        // More directions help detect angled surfaces better
        const rayDirections = [
            new THREE.Vector3(1, 0, 0),    // Right
            new THREE.Vector3(-1, 0, 0),   // Left
            new THREE.Vector3(0, 0, 1),    // Forward
            new THREE.Vector3(0, 0, -1),   // Backward
            new THREE.Vector3(0.7, 0, 0.7),  // Forward-Right
            new THREE.Vector3(-0.7, 0, 0.7), // Forward-Left
            new THREE.Vector3(0.7, 0, -0.7), // Backward-Right
            new THREE.Vector3(-0.7, 0, -0.7) // Backward-Left
        ];
        
        // Reduce collision radius slightly to prevent getting stuck
        const effectiveRadius = this.collisionRadius * 0.85;
        
        // Adjust position for raycasting (feet position)
        const feetPosition = position.clone();
        feetPosition.y -= this.eyeHeight;
        
        // Also check at knee height for higher obstacles
        const kneePosition = feetPosition.clone();
        kneePosition.y += 0.5;
        
        let collision = false;
        
        // Check at feet level
        for (const direction of rayDirections) {
            const raycaster = new THREE.Raycaster(
                feetPosition, 
                direction,
                0, 
                effectiveRadius
            );
            
            const intersects = raycaster.intersectObjects(this.collidableObjects, true);
            
            if (intersects.length > 0) {
                // Get the collision normal
                const normal = intersects[0].face.normal.clone();
                // Transform the normal from object space to world space
                const objMatrix = new THREE.Matrix4();
                objMatrix.extractRotation(intersects[0].object.matrixWorld);
                normal.applyMatrix4(objMatrix);
                
                // Only count as collision if close enough
                if (intersects[0].distance < effectiveRadius) {
                    collision = true;
                    
                    // Store information about this collision
                    const hitObject = intersects[0].object;
                    const alreadyTracked = this.activeCollisions.some(obj => obj.id === hitObject.id);
                    
                    if (!alreadyTracked) {
                        this.activeCollisions.push({
                            id: hitObject.id,
                            name: hitObject.name || 'unnamed object',
                            distance: intersects[0].distance,
                            direction: direction.clone(),
                            object: hitObject,
                            normal: normal
                        });
                    }
                    
                    if (this.debugMode) {
                        console.log('Collision detected:', 
                            hitObject.name || 'unnamed object', 
                            'at distance', intersects[0].distance,
                            'direction', direction
                        );
                    }
                }
            }
        }
        
        // Check at knee level if no collision at feet level
        if (!collision) {
            for (const direction of rayDirections) {
                const raycaster = new THREE.Raycaster(
                    kneePosition, 
                    direction,
                    0, 
                    effectiveRadius
                );
                
                const intersects = raycaster.intersectObjects(this.collidableObjects, true);
                
                if (intersects.length > 0 && intersects[0].distance < effectiveRadius) {
                    collision = true;
                    break;
                }
            }
        }
        
        // Additional check for ceiling height only if no collision yet
        if (!collision) {
            const ceilingRaycaster = new THREE.Raycaster(
                feetPosition,
                new THREE.Vector3(0, 1, 0),
                0,
                this.height + 0.1 // Check slightly above player height
            );
            
            const ceilingIntersects = ceilingRaycaster.intersectObjects(this.collidableObjects, true);
            if (ceilingIntersects.length > 0 && ceilingIntersects[0].distance < this.height) {
                collision = true;
                
                // Store ceiling collision
                const hitObject = ceilingIntersects[0].object;
                const alreadyTracked = this.activeCollisions.some(obj => obj.id === hitObject.id);
                
                if (!alreadyTracked) {
                    this.activeCollisions.push({
                        id: hitObject.id,
                        name: hitObject.name || 'unnamed object',
                        distance: ceilingIntersects[0].distance,
                        direction: new THREE.Vector3(0, 1, 0),
                        object: hitObject
                    });
                }
                
                if (this.debugMode) {
                    console.log('Ceiling collision detected at height', ceilingIntersects[0].distance);
                }
            }
        }
        
        return collision;
    }
    
    // Get the current active collisions
    getActiveCollisions() {
        return this.activeCollisions;
    }
    
    // Career progression methods
    promote() {
        const ranks = ['Intern', 'Clerk', 'Department Head'];
        const currentIndex = ranks.indexOf(this.careerRank);
        if (currentIndex < ranks.length - 1) {
            this.careerRank = ranks[currentIndex + 1];
            this.bureaucraticStamina = 100;
            this.influence += 20;
        }
    }

    // Combat methods
    throwDocument(documentType) {
        if (this.bureaucraticStamina >= 20) {
            this.bureaucraticStamina -= 20;
            // Implement document throwing logic
            console.log(`Throwing ${documentType} document!`);
        }
    }

    useStamp(stampType) {
        if (this.bureaucraticStamina >= 15) {
            this.bureaucraticStamina -= 15;
            // Implement stamp usage logic
            console.log(`Using ${stampType} stamp!`);
        }
    }
} 