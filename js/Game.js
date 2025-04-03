// Game.js - Main game class
import * as THREE from 'three';
import { Player } from './Player.js';
import { Office } from './Office.js';
import { Combat } from './Combat.js';
import { AudioManager } from './Audio.js';

export class Game {
    constructor() {
        console.log('Initializing game...');
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        console.log('Scene created');
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
        console.log('Renderer created and added to DOM');
        
        // Set up lighting
        this.setupLighting();
        console.log('Lighting setup complete');
        
        // Create office
        this.office = new Office(this.scene);
        console.log('Office initialized');
        
        // Create player
        this.player = new Player(this.scene);
        this.player.collidableObjects = this.office.getCollidableObjects();
        console.log('Player initialized');
        
        // Create combat system
        this.combat = new Combat(this.player, this.scene);
        console.log('Combat system initialized');
        
        // Create audio system
        this.audio = new AudioManager();
        console.log('Audio system initialized');
        
        // Game state
        this.isPaused = false;
        this.lastTime = Date.now();
        this.deltaTime = 0;
        
        // Debug mode
        this.debugMode = false;
        this.debugElement = document.getElementById('debug');
        if (!this.debugElement) {
            this.debugElement = document.createElement('div');
            this.debugElement.id = 'debug';
            this.debugElement.style.position = 'absolute';
            this.debugElement.style.top = '10px';
            this.debugElement.style.right = '10px';
            this.debugElement.style.color = 'white';
            this.debugElement.style.backgroundColor = 'rgba(0,0,0,0.5)';
            this.debugElement.style.padding = '10px';
            this.debugElement.style.fontFamily = 'monospace';
            this.debugElement.style.fontSize = '14px';
            this.debugElement.style.display = 'none';
            document.body.appendChild(this.debugElement);
        }
        
        // Also add debug flag to scene for debug visualization
        this.scene.debug = this.debugMode;
        
        // Create level selector UI
        this.createLevelSelector();
        
        // Bind event listeners
        this.bindEventListeners();
        console.log('Event listeners bound');
        
        // Start game loop
        this.animate();
        console.log('Game loop started');
    }

    setupLighting() {
        // Store office dimensions
        this.width = 20;
        this.length = 30;
        
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.7);
        this.scene.add(ambientLight);

        // Directional light for shadows (main light source)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        // Move the light outside the office building
        directionalLight.position.set(-15, 20, -15); 
        directionalLight.target.position.set(0, 0, 0);
        this.scene.add(directionalLight.target);
        
        directionalLight.castShadow = true;
        
        // Set up shadow properties to cover the entire scene
        directionalLight.shadow.camera.left = -30;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.top = 30;
        directionalLight.shadow.camera.bottom = -30;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Add more fluorescent lights throughout the office
        this.fluorescentLights = [];
        const lightPositions = [
            { x: -10, y: 2.4, z: -10 }, // Executive office 1
            { x: 10, y: 2.4, z: -10 },  // Executive office 2
            { x: -10, y: 2.4, z: 0 },   // Regular office 1
            { x: 0, y: 2.4, z: 0 },     // Regular office 2
            { x: 10, y: 2.4, z: 0 },    // Regular office 3
            { x: 0, y: 2.4, z: -10 },   // Conference room
            { x: -7, y: 2.4, z: 10 },   // Cubicle area 1
            { x: 0, y: 2.4, z: 10 },    // Cubicle area 2
            { x: 7, y: 2.4, z: 10 }     // Cubicle area 3
        ];
        
        for (let i = 0; i < lightPositions.length; i++) {
            const light = new THREE.PointLight(0xE0E0E0, 0.7, 10);
            const pos = lightPositions[i];
            light.position.set(pos.x, pos.y, pos.z);
            
            // Only let a few key lights cast shadows to save on GPU resources
            if (i < 3) { // Only the first 3 lights cast shadows
                light.castShadow = true;
                
                // Lower resolution shadow maps to save memory
                light.shadow.mapSize.width = 512;
                light.shadow.mapSize.height = 512;
                
                // Optimize shadow camera settings
                light.shadow.camera.near = 0.5;
                light.shadow.camera.far = 15;
            } else {
                light.castShadow = false;
            }
            
            this.scene.add(light);
            this.fluorescentLights.push(light);
        }
    }

    createLevelSelector() {
        // Create level selector container
        this.levelSelector = document.createElement('div');
        this.levelSelector.id = 'level-selector';
        this.levelSelector.style.position = 'absolute';
        this.levelSelector.style.top = '10px';
        this.levelSelector.style.right = '10px';
        this.levelSelector.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.levelSelector.style.padding = '10px';
        this.levelSelector.style.borderRadius = '5px';
        this.levelSelector.style.color = 'white';
        this.levelSelector.style.fontFamily = 'Arial, sans-serif';
        this.levelSelector.style.zIndex = '1000';
        this.levelSelector.style.display = 'flex';
        this.levelSelector.style.flexDirection = 'column';
        this.levelSelector.style.gap = '8px';
        
        // Add title
        const title = document.createElement('div');
        title.textContent = 'Select Level';
        title.style.fontWeight = 'bold';
        title.style.fontSize = '14px';
        title.style.textAlign = 'center';
        title.style.marginBottom = '5px';
        this.levelSelector.appendChild(title);
        
        // Get available maps
        const availableMaps = this.office.getAvailableMaps();
        
        // Create buttons for each map
        availableMaps.forEach(map => {
            const button = document.createElement('button');
            button.textContent = map.name;
            button.dataset.mapId = map.id;
            button.style.backgroundColor = '#4a6670';
            button.style.color = 'white';
            button.style.border = 'none';
            button.style.padding = '8px 12px';
            button.style.margin = '2px 0';
            button.style.borderRadius = '3px';
            button.style.cursor = 'pointer';
            button.style.transition = 'background-color 0.2s';
            
            // Hover effect
            button.addEventListener('mouseover', () => {
                button.style.backgroundColor = '#5d7d89';
            });
            
            button.addEventListener('mouseout', () => {
                button.style.backgroundColor = '#4a6670';
            });
            
            // Click event
            button.addEventListener('click', () => {
                this.switchLevel(map.id);
            });
            
            this.levelSelector.appendChild(button);
        });
        
        // Add separator
        const separator = document.createElement('div');
        separator.style.borderTop = '1px solid #7D9181';
        separator.style.margin = '5px 0';
        this.levelSelector.appendChild(separator);
        
        // Add ghost mode toggle button
        const ghostButton = document.createElement('button');
        ghostButton.id = 'ghost-mode-button';
        ghostButton.textContent = 'Enable Ghost Mode';
        ghostButton.style.backgroundColor = '#4a6670';
        ghostButton.style.color = 'white';
        ghostButton.style.border = 'none';
        ghostButton.style.padding = '8px 12px';
        ghostButton.style.margin = '2px 0';
        ghostButton.style.borderRadius = '3px';
        ghostButton.style.cursor = 'pointer';
        ghostButton.style.transition = 'all 0.2s';
        
        // Ghost mode status text
        const ghostStatus = document.createElement('div');
        ghostStatus.id = 'ghost-status';
        ghostStatus.textContent = 'Ghost Mode: OFF';
        ghostStatus.style.fontSize = '12px';
        ghostStatus.style.textAlign = 'center';
        ghostStatus.style.marginTop = '3px';
        ghostStatus.style.color = '#ff6b6b';
        
        // Hover effect
        ghostButton.addEventListener('mouseover', () => {
            ghostButton.style.backgroundColor = '#5d7d89';
        });
        
        ghostButton.addEventListener('mouseout', () => {
            if (!this.player.ghostMode) {
                ghostButton.style.backgroundColor = '#4a6670';
            }
        });
        
        // Click event for ghost mode
        ghostButton.addEventListener('click', () => {
            this.toggleGhostMode();
        });
        
        this.levelSelector.appendChild(ghostButton);
        this.levelSelector.appendChild(ghostStatus);
        
        // Add to DOM
        document.body.appendChild(this.levelSelector);
    }
    
    // Method to handle level switching
    switchLevel(mapId) {
        console.log(`Switching to level: ${mapId}`);
        
        // Show loading message
        this.showLoadingMessage();
        
        // Reset player position
        this.resetPlayerPosition();
        
        // Before clearing the current map, create a temporary safety floor
        // to prevent the player from falling through during the transition
        this.createSafetyFloor();
        
        // Switch map
        this.office.switchMap(mapId);
        
        // Listen for map loaded event
        document.addEventListener('mapLoaded', (e) => {
            if (e.detail.mapId === mapId) {
                // Update player's collidable objects
                this.player.collidableObjects = this.office.getCollidableObjects();
                
                // Remove the safety floor now that the new map is loaded
                this.removeSafetyFloor();
                
                // Hide loading message
                this.hideLoadingMessage();
                
                // Resume the game if it was paused
                if (this.isPaused) {
                    this.resume();
                }
                
                // Update level name in HUD
                this.updateLevelNameInHUD();
            }
        }, { once: true }); // Only listen once
    }
    
    // Create a temporary invisible floor during level transitions
    createSafetyFloor() {
        // Remove any existing safety floor
        this.removeSafetyFloor();
        
        // Create a large invisible floor
        const floorSize = 100;
        const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
        const floorMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });
        
        this.safetyFloor = new THREE.Mesh(floorGeometry, floorMaterial);
        this.safetyFloor.rotation.x = Math.PI / 2;
        this.safetyFloor.position.set(0, 0, 0); // Position at ground level
        this.safetyFloor.name = "Safety_Floor";
        
        // Add to scene
        this.scene.add(this.safetyFloor);
        
        // Add to player's collidable objects
        this.player.collidableObjects.push(this.safetyFloor);
        
        console.log("Safety floor created for level transition");
    }
    
    // Remove the temporary safety floor
    removeSafetyFloor() {
        if (this.safetyFloor) {
            // Remove from scene
            this.scene.remove(this.safetyFloor);
            
            // Remove from player's collidable objects
            const index = this.player.collidableObjects.indexOf(this.safetyFloor);
            if (index > -1) {
                this.player.collidableObjects.splice(index, 1);
            }
            
            // Clean up
            if (this.safetyFloor.geometry) this.safetyFloor.geometry.dispose();
            if (this.safetyFloor.material) this.safetyFloor.material.dispose();
            
            this.safetyFloor = null;
            console.log("Safety floor removed");
        }
    }
    
    // Helper methods for level switching
    showLoadingMessage() {
        // Create or show loading message
        if (!this.loadingMessage) {
            this.loadingMessage = document.createElement('div');
            this.loadingMessage.id = 'loading-message';
            this.loadingMessage.style.position = 'fixed';
            this.loadingMessage.style.top = '50%';
            this.loadingMessage.style.left = '50%';
            this.loadingMessage.style.transform = 'translate(-50%, -50%)';
            this.loadingMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            this.loadingMessage.style.color = 'white';
            this.loadingMessage.style.padding = '20px 40px';
            this.loadingMessage.style.borderRadius = '10px';
            this.loadingMessage.style.fontFamily = 'Arial, sans-serif';
            this.loadingMessage.style.fontSize = '24px';
            this.loadingMessage.style.zIndex = '2000';
            this.loadingMessage.textContent = 'Loading level...';
            document.body.appendChild(this.loadingMessage);
        } else {
            this.loadingMessage.style.display = 'block';
        }
        
        // Pause the game while loading
        this.pause();
    }
    
    hideLoadingMessage() {
        if (this.loadingMessage) {
            this.loadingMessage.style.display = 'none';
        }
    }
    
    updateLevelNameInHUD() {
        // Find or create level name display in HUD
        let levelNameElement = document.getElementById('level-name');
        if (!levelNameElement) {
            levelNameElement = document.createElement('div');
            levelNameElement.id = 'level-name';
            document.getElementById('hud').appendChild(levelNameElement);
        }
        
        // Get current map info
        const currentMap = this.office.getCurrentMapInfo();
        levelNameElement.textContent = `Level: ${currentMap.name}`;
    }

    bindEventListeners() {
        // Window resize
        window.addEventListener('resize', () => {
            this.onWindowResize();
        });

        // Debug mode toggle
        window.addEventListener('keydown', (event) => {
            if (event.code === 'F3') {
                this.toggleDebugMode();
            }
            
            // Reset player position on 'R' key
            if (event.code === 'KeyR') {
                this.resetPlayerPosition();
                console.log('Player position reset');
            }
        });
        
        // Escape to exit pointer lock
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Escape') {
                // Do nothing here - the PointerLockControls handle this automatically
            }
        });
        
        // Map loaded event
        document.addEventListener('mapLoaded', (e) => {
            console.log(`Map loaded event received: ${e.detail.mapId}`);
            // Update player's collidable objects
            this.player.collidableObjects = this.office.getCollidableObjects();
            
            // Update level name in HUD on initial load
            this.updateLevelNameInHUD();
        });
    }

    onWindowResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.player.camera.aspect = window.innerWidth / window.innerHeight;
        this.player.camera.updateProjectionMatrix();
    }

    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        this.scene.debug = this.debugMode; // Update debug flag on scene
        this.debugElement.style.display = this.debugMode ? 'block' : 'none';
        
        // Toggle collider visualization
        if (this.debugMode) {
            this.showColliders();
        } else {
            this.hideColliders();
        }
    }

    showColliders() {
        // Remove any existing visualizations first
        this.hideColliders();
        
        // Create a group to hold all collider visualizations
        this.colliderVisuals = new THREE.Group();
        this.scene.add(this.colliderVisuals);
        
        // Get all collidable objects from player
        const collidables = this.player.collidableObjects;
        
        // Get current active collisions from player
        const activeCollisions = this.player.getActiveCollisions();
        const activeCollisionIds = activeCollisions.map(col => col.id);
        
        // Add console message about active collisions
        if (activeCollisions.length > 0) {
            console.log("%c COLLIDER VISUALIZATION:", "background: #ff00ff; color: white; padding: 2px;");
            console.log(`Highlighting ${activeCollisions.length} active collisions in bright red`);
        }
        
        collidables.forEach((object, index) => {
            if (!object.geometry) return; // Skip objects without geometry
            
            // Create a wireframe representation of the object
            let wireGeometry;
            if (object.geometry instanceof THREE.BoxGeometry) {
                // Use the object's dimensions for the wireframe
                const width = object.geometry.parameters.width;
                const height = object.geometry.parameters.height;
                const depth = object.geometry.parameters.depth || 0.1;
                wireGeometry = new THREE.BoxGeometry(width, height, depth);
            } else if (object.geometry instanceof THREE.PlaneGeometry) {
                // Create a thin box for planes
                const width = object.geometry.parameters.width;
                const height = object.geometry.parameters.height;
                wireGeometry = new THREE.BoxGeometry(width, height, 0.01);
            } else if (object.geometry instanceof THREE.CylinderGeometry) {
                // Match cylinder dimensions
                const radiusTop = object.geometry.parameters.radiusTop;
                const radiusBottom = object.geometry.parameters.radiusBottom;
                const height = object.geometry.parameters.height;
                wireGeometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 16);
            } else {
                // Fall back to a bounding box
                const bbox = new THREE.Box3().setFromObject(object);
                const size = bbox.getSize(new THREE.Vector3());
                wireGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
            }
            
            // Check if this object is actively colliding
            const isColliding = activeCollisionIds.includes(object.id);
            
            // Create a wireframe material with appropriate color
            let color;
            if (isColliding) {
                // Bright red for objects the player is touching
                color = new THREE.Color(1, 0, 0);
            } else {
                // Rainbow colors for other objects
                color = new THREE.Color().setHSL(index * 0.1 % 1, 1, 0.5);
            }
            
            // Thicker lines and higher opacity for colliding objects
            const wireMaterial = new THREE.MeshBasicMaterial({
                color: color,
                wireframe: true,
                transparent: true,
                opacity: isColliding ? 0.8 : 0.5,
                linewidth: isColliding ? 2 : 1 // Note: linewidth only works in some browsers
            });
            
            // Create the wireframe mesh
            const wireframe = new THREE.Mesh(wireGeometry, wireMaterial);
            
            // Get world position, rotation, and scale of the object
            wireframe.position.copy(object.getWorldPosition(new THREE.Vector3()));
            wireframe.quaternion.copy(object.getWorldQuaternion(new THREE.Quaternion()));
            wireframe.scale.copy(object.getWorldScale(new THREE.Vector3()));
            
            // For colliding objects, also create a solid mesh with semi-transparent fill
            if (isColliding) {
                const solidMaterial = new THREE.MeshBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.3
                });
                const solidMesh = new THREE.Mesh(wireGeometry, solidMaterial);
                solidMesh.position.copy(wireframe.position);
                solidMesh.quaternion.copy(wireframe.quaternion);
                solidMesh.scale.copy(wireframe.scale);
                this.colliderVisuals.add(solidMesh);
                
                // Make it slightly larger to stand out
                solidMesh.scale.multiplyScalar(1.05);
            }
            
            // Add the wireframe to the visualization group
            this.colliderVisuals.add(wireframe);
            
            // Add a label with the object name
            if (object.name) {
                const label = this.createTextLabel(object.name, color);
                label.position.copy(wireframe.position);
                label.position.y += 0.2; // Position above the object
                
                // Make colliding object labels bigger
                if (isColliding) {
                    label.scale.multiplyScalar(1.5);
                }
                
                this.colliderVisuals.add(label);
            }
        });
        
        // Add player collision radius visualization
        const playerPos = this.player.controls.getObject().position.clone();
        playerPos.y -= this.player.eyeHeight; // Position at feet
        
        const radiusGeometry = new THREE.SphereGeometry(this.player.collisionRadius, 16, 16);
        const radiusMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true,
            transparent: true,
            opacity: 0.7
        });
        const radiusVisual = new THREE.Mesh(radiusGeometry, radiusMaterial);
        radiusVisual.position.copy(playerPos);
        this.colliderVisuals.add(radiusVisual);
        
        // Add a solid fill to the player's collision radius
        const radiusSolidMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.2
        });
        const radiusSolidVisual = new THREE.Mesh(radiusGeometry, radiusSolidMaterial);
        radiusSolidVisual.position.copy(playerPos);
        this.colliderVisuals.add(radiusSolidVisual);
        
        // Add raycaster direction visualizations
        const rayDirections = [
            { dir: new THREE.Vector3(1, 0, 0), color: 0xff0000 },
            { dir: new THREE.Vector3(-1, 0, 0), color: 0xff7700 },
            { dir: new THREE.Vector3(0, 0, 1), color: 0x00ff00 },
            { dir: new THREE.Vector3(0, 0, -1), color: 0x0000ff }
        ];
        
        rayDirections.forEach(ray => {
            const rayLength = this.player.collisionRadius + 0.1;
            const rayGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                ray.dir.clone().multiplyScalar(rayLength)
            ]);
            const rayMaterial = new THREE.LineBasicMaterial({ color: ray.color });
            const rayLine = new THREE.Line(rayGeometry, rayMaterial);
            rayLine.position.copy(playerPos);
            this.colliderVisuals.add(rayLine);
        });
    }
    
    hideColliders() {
        if (this.colliderVisuals) {
            this.scene.remove(this.colliderVisuals);
            this.colliderVisuals = null;
        }
    }
    
    createTextLabel(text, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        context.font = '24px Arial';
        context.fillStyle = color.getStyle();
        context.textAlign = 'center';
        context.fillText(text, 128, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1, 0.25, 1);
        
        return sprite;
    }

    update() {
        if (this.isPaused) return;

        // Update player
        this.player.update();

        // Update office environment
        this.office.update();

        // Update combat system
        this.combat.update();

        // Update fluorescent lights flickering
        this.updateLights();

        // Update HUD
        this.updateHUD();
        
        // Update collider visualizations if debug mode is active
        if (this.debugMode && this.colliderVisuals) {
            // Check if we need to update the collider colors based on active collisions
            const activeCollisions = this.player.getActiveCollisions();
            if (activeCollisions.length > 0) {
                // For simplicity, just redraw all colliders when collisions change
                this.showColliders();
            }
            
            // Update player collision radius visualization
            const playerPos = this.player.controls.getObject().position.clone();
            playerPos.y -= this.player.eyeHeight; // Position at feet
            
            if (this.colliderVisuals.children.length > 0) {
                // Update the player radius and ray visualizations
                const playerVisuals = this.colliderVisuals.children.slice(-6);
                
                playerVisuals.forEach(visual => {
                    visual.position.copy(playerPos);
                });
            }
        }
    }

    // Add pause and resume methods
    pause() {
        this.isPaused = true;
        this.audio.pauseMusic();
        console.log('Game paused');
    }

    resume() {
        this.isPaused = false;
        this.audio.playMusic();
        // Reset last time to avoid large delta time after resuming
        this.lastTime = Date.now();
        console.log('Game resumed');
    }

    updateLights() {
        this.fluorescentLights.forEach(light => {
            if (Math.random() < 0.01) { // 1% chance to flicker each frame
                light.intensity = Math.random() * 0.5 + 0.2;
            }
        });
    }

    updateHUD() {
        document.getElementById('stamina').textContent = 
            Math.floor(this.player.bureaucraticStamina);
        document.getElementById('rank').textContent = 
            this.player.careerRank;
        document.getElementById('paperwork').textContent = 
            this.player.pendingPaperwork.length;

        if (this.debugMode) {
            this.updateDebugInfo();
        }
    }

    updateDebugInfo() {
        const playerPos = this.player.controls.getObject().position;
        
        // Cast rays to find closest objects in each cardinal direction
        const origin = playerPos.clone();
        origin.y -= this.player.eyeHeight; // Cast rays from feet
        
        const directions = [
            { dir: new THREE.Vector3(1, 0, 0), name: "Right" },
            { dir: new THREE.Vector3(-1, 0, 0), name: "Left" },
            { dir: new THREE.Vector3(0, 0, 1), name: "Front" },
            { dir: new THREE.Vector3(0, 0, -1), name: "Back" }
        ];
        
        let closestInfo = "";
        
        for (const direction of directions) {
            const raycaster = new THREE.Raycaster(origin, direction.dir, 0, 3);
            const intersects = raycaster.intersectObjects(this.player.collidableObjects, true);
            
            if (intersects.length > 0) {
                closestInfo += `${direction.name}: ${intersects[0].distance.toFixed(2)}m`;
                if (intersects[0].object.name) {
                    closestInfo += ` (${intersects[0].object.name})`;
                }
                closestInfo += "<br>";
            }
        }
        
        // Get current active collisions from player
        const activeCollisions = this.player.getActiveCollisions();
        let collisionInfo = "";
        
        if (activeCollisions.length > 0) {
            collisionInfo = "<div style='background-color:#ff0000; color:white; padding:5px; margin:5px 0;'>";
            collisionInfo += `<b>⚠️ TOUCHING ${activeCollisions.length} OBJECT(S) ⚠️</b><br>`;
            
            activeCollisions.forEach((collision, index) => {
                collisionInfo += `${index + 1}. ${collision.name} (${collision.distance.toFixed(2)}m)<br>`;
            });
            
            collisionInfo += "</div>";
        }
        
        // Detect current room
        const currentRoom = this.detectCurrentRoom(playerPos);
        let roomInfo = "";
        
        if (currentRoom) {
            roomInfo = `<div style='background-color:#0066cc; color:white; padding:5px; margin:5px 0;'>`;
            roomInfo += `<b>🏢 CURRENT LOCATION: ${currentRoom.type.toUpperCase()}</b>`;
            
            if (currentRoom.roomId) {
                roomInfo += ` #${currentRoom.roomId}`;
            }
            
            roomInfo += `</div>`;
        }
        
        this.debugElement.innerHTML = `
            Position: ${playerPos.x.toFixed(2)}, 
                     ${playerPos.y.toFixed(2)}, 
                     ${playerPos.z.toFixed(2)}<br>
            Velocity: ${this.player.velocity.x.toFixed(3)}, 
                     ${this.player.velocity.y.toFixed(3)}, 
                     ${this.player.velocity.z.toFixed(3)}<br>
            Looking: ${(this.player.camera.rotation.y * (180/Math.PI)).toFixed(1)}°<br>
            On Ground: ${this.player.isOnGround}<br>
            Jumping: ${this.player.isJumping}<br>
            Collision Radius: ${this.player.collisionRadius}<br>
            Keys: W:${this.player.keys.forward} A:${this.player.keys.left} S:${this.player.keys.backward} D:${this.player.keys.right}<br>
            <hr>
            ${roomInfo}
            ${collisionInfo}
            Nearby Objects:<br>${closestInfo}
            <hr>
            FPS: ${Math.round(1 / this.deltaTime)}
        `;
    }
    
    detectCurrentRoom(playerPos) {
        // Function to detect which room the player is currently in
        
        // Get all room objects in the scene
        const rooms = [];
        this.scene.traverse(object => {
            // Check if this is a room group with userData.type
            if (object.isGroup && object.userData && object.userData.type) {
                rooms.push(object);
            }
        });
        
        if (rooms.length === 0) {
            return { type: "hallway", roomId: null }; // Default to hallway if no rooms found
        }
        
        // Calculate which room the player is in based on position
        for (const room of rooms) {
            // Get room's world position
            const roomPos = new THREE.Vector3();
            room.getWorldPosition(roomPos);
            
            // Get room dimensions (estimate from the room objects or use fixed values)
            let roomWidth = 0;
            let roomLength = 0;
            
            // Try to find floor mesh to get dimensions
            room.traverse(child => {
                if (child.isMesh && child.geometry.type === "PlaneGeometry") {
                    // Assuming the floor is the largest plane in the room
                    if (child.geometry.parameters.width > roomWidth) {
                        roomWidth = child.geometry.parameters.width;
                    }
                    if (child.geometry.parameters.height > roomLength) {
                        roomLength = child.geometry.parameters.height;
                    }
                }
            });
            
            // Fallback dimensions if not found
            if (roomWidth === 0) roomWidth = 10;
            if (roomLength === 0) roomLength = 10;
            
            // Check if player is within this room's boundaries
            const halfWidth = roomWidth / 2;
            const halfLength = roomLength / 2;
            
            if (
                playerPos.x >= (roomPos.x - halfWidth) && 
                playerPos.x <= (roomPos.x + halfWidth) &&
                playerPos.z >= (roomPos.z - halfLength) && 
                playerPos.z <= (roomPos.z + halfLength)
            ) {
                // Player is in this room
                return {
                    type: room.userData.type,
                    roomId: room.userData.roomId || null
                };
            }
        }
        
        // If not in any room, player is in a hallway or common area
        return { type: "hallway", roomId: null };
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Calculate delta time
        const now = Date.now();
        this.deltaTime = Math.min((now - this.lastTime) / 1000, 0.1); // Cap delta time to avoid large jumps
        this.lastTime = now;

        // Update game state
        this.update();

        // Render scene
        this.renderer.render(this.scene, this.player.camera);
    }

    resetPlayerPosition() {
        // Teleport player to a safe position (center of the office)
        const controls = this.player.controls.getObject();
        controls.position.set(0, this.player.eyeHeight, 0);
        
        // Reset player velocity
        this.player.velocity.set(0, 0, 0);
        
        // Update player mesh position
        this.player.updateMesh();
        
        // Log reset
        console.log('Player position reset to:', controls.position);
    }

    // Add a method to toggle ghost mode
    toggleGhostMode() {
        // Toggle ghost mode on the player
        this.player.ghostMode = !this.player.ghostMode;
        
        // Update UI elements
        const ghostButton = document.getElementById('ghost-mode-button');
        const ghostStatus = document.getElementById('ghost-status');
        
        if (this.player.ghostMode) {
            ghostButton.textContent = 'Disable Ghost Mode';
            ghostButton.style.backgroundColor = '#7d42b9'; // Purple color for ghost mode
            ghostStatus.textContent = 'Ghost Mode: ON';
            ghostStatus.style.color = '#a2ff86'; // Green color for on status
            
            // Show ghost mode instructions
            this.showGhostModeInstructions();
        } else {
            ghostButton.textContent = 'Enable Ghost Mode';
            ghostButton.style.backgroundColor = '#4a6670';
            ghostStatus.textContent = 'Ghost Mode: OFF';
            ghostStatus.style.color = '#ff6b6b'; // Red color for off status
            
            // Hide ghost mode instructions if they exist
            if (this.ghostInstructions) {
                this.ghostInstructions.style.display = 'none';
            }
        }
        
        // Reset player's vertical velocity when toggling ghost mode
        this.player.velocity.y = 0;
        
        console.log(`Ghost Mode ${this.player.ghostMode ? 'enabled' : 'disabled'}`);
    }
    
    // Show instructions for ghost mode
    showGhostModeInstructions() {
        if (!this.ghostInstructions) {
            this.ghostInstructions = document.createElement('div');
            this.ghostInstructions.id = 'ghost-instructions';
            this.ghostInstructions.style.position = 'fixed';
            this.ghostInstructions.style.bottom = '20px';
            this.ghostInstructions.style.left = '50%';
            this.ghostInstructions.style.transform = 'translateX(-50%)';
            this.ghostInstructions.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            this.ghostInstructions.style.color = 'white';
            this.ghostInstructions.style.padding = '10px 20px';
            this.ghostInstructions.style.borderRadius = '5px';
            this.ghostInstructions.style.fontFamily = 'Arial, sans-serif';
            this.ghostInstructions.style.zIndex = '1500';
            this.ghostInstructions.style.textAlign = 'center';
            this.ghostInstructions.innerHTML = `
                <b>Ghost Mode Controls</b><br>
                WASD: Move horizontally<br>
                E: Float up<br>
                Q: Float down<br>
                Speed is increased in ghost mode
            `;
            document.body.appendChild(this.ghostInstructions);
        } else {
            this.ghostInstructions.style.display = 'block';
        }
    }
} 