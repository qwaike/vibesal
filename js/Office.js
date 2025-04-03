// Office.js - Office environment class
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Office {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.interactables = [];
        this.collidables = [];
        
        // Office dimensions (for reference)
        this.width = 30;
        this.length = 30;
        this.height = 2.5;
        this.corridorWidth = 2;

        // Room dimensions
        this.roomWidth = 5;
        this.roomLength = 5;
        this.wallThickness = 0.2;
        
        // Door dimensions
        this.doorWidth = 1.8;
        this.doorHeight = 2.2;
        
        // Colors
        this.floorColor = 0x999999;
        this.ceilingColor = 0xEEEEEE;
        this.wallColor = 0xCCCCCC;
        this.cubicleColor = 0xA9A9A9;
        
        // Map management
        this.mapModels = {};
        this.currentMap = null;
        this.currentMapName = '';
        this.availableMaps = [
            { id: 'office', name: 'Corporate Office', file: 'map/DemoMap.glb' }
            //{ id: 'cigar_room', name: 'Cigar Lounge', file: 'map/cigar_room.glb' }
        ];
        
        // Load the default map
        this.loadMap('office');
    } 
    
    // New method to load a specific map by ID
    loadMap(mapId) {
        // Clear existing map and colliders
        this.clearCurrentMap();
        
        // Find the map info
        const mapInfo = this.availableMaps.find(map => map.id === mapId);
        if (!mapInfo) {
            console.error(`Map with ID ${mapId} not found`);
            return this.createFallbackEnvironment();
        }
        
        console.log(`Loading map: ${mapInfo.name} (${mapInfo.file})`);
        this.currentMapName = mapInfo.name;
        
        const loader = new GLTFLoader();
        
        // Load the model
        loader.load(
            mapInfo.file,  // Path to the model
            (gltf) => {
                // Success callback
                console.log('Map loaded successfully:', gltf);
                
                // Add the model to the scene
                this.currentMap = gltf.scene;
                
                // Adjust position if needed
                if (mapId === 'cigar_room') {
                    // You may need to adjust the position of the cigar room model
                    // this.currentMap.position.set(0, 0, 0);
                    // this.currentMap.scale.set(1, 1, 1);
                    console.log('Loaded cigar room map');
                }
                
                // Add to scene
                this.scene.add(this.currentMap);
                
                // Store reference
                this.mapModels[mapId] = this.currentMap;
                
                // Process the model to extract collidable objects
                this.processMapColliders(this.currentMap);
                
                // Dispatch event that map is loaded
                const event = new CustomEvent('mapLoaded', { detail: { mapId: mapId } });
                document.dispatchEvent(event);
                
                console.log('Map added to scene');
            },
            (xhr) => {
                // Progress callback
                console.log(`Map loading: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
            },
            (error) => {
                // Error callback
                console.error('Error loading map:', error);
                
                // If the map fails to load, create a fallback office environment
                console.log('Creating fallback office environment');
                this.createFallbackEnvironment();
            }
        );
    }
    
    // New method to clear the current map
    clearCurrentMap() {
        // Remove current map from scene if it exists
        if (this.currentMap) {
            this.scene.remove(this.currentMap);
            
            // Clean up memory
            this.currentMap.traverse((node) => {
                if (node.geometry) node.geometry.dispose();
                if (node.material) {
                    if (Array.isArray(node.material)) {
                        node.material.forEach(material => material.dispose());
                    } else {
                        node.material.dispose();
                    }
                }
            });
        }
        
        // Clear the collidables array
        this.collidables = [];
        
        console.log('Cleared current map');
    }
    
    // Method to switch between maps
    switchMap(mapId) {
        console.log(`Switching to map: ${mapId}`);
        this.loadMap(mapId);
    }
    
    // Get available maps for UI
    getAvailableMaps() {
        return this.availableMaps;
    }
    
    // Get current map info
    getCurrentMapInfo() {
        const currentMapInfo = this.availableMaps.find(map => 
            this.currentMap === this.mapModels[map.id]);
        
        return currentMapInfo || this.availableMaps[0];
    }
    
    // Modified to support multiple maps
    loadCustomMap() {
        // This is now handled by loadMap
        console.log('Using new map loading system');
    }
    
    processMapColliders(model) {
        // Process the model to find all meshes that should be collidable
        let floorCount = 0;
        let wallCount = 0;
        let stairCount = 0;
        
        model.traverse((node) => {
            if (node.isMesh) {
                // Add a name if it doesn't have one
                if (!node.name || node.name === '') {
                    // Try to identify what type of object this is
                    if (this.isLikelyFloor(node)) {
                        node.name = `Floor_${node.id}`;
                        floorCount++;
                    } else if (this.isLikelyWall(node)) {
                        node.name = `Wall_${node.id}`;
                        wallCount++;
                    } else if (this.isLikelyStair(node)) {
                        node.name = `Stair_${node.id}`;
                        stairCount++;
                    } else {
                        node.name = `Map_Mesh_${node.id}`;
                    }
                }
                
                // Add mesh to collidables
                this.collidables.push(node);
                
                // Make sure it casts and receives shadows
                node.castShadow = true;
                node.receiveShadow = true;
                
                // For better mesh collider handling
                if (node.geometry) {
                    // Make sure geometry has proper face normals for collision detection
                    node.geometry.computeVertexNormals();
                    node.geometry.computeBoundingBox();
                    
                    // For better stair navigation, adjust the collision size of very small steps
                    if (node.name.includes('Stair') || this.isLikelyStair(node)) {
                        // Mark this as a stair for special handling
                        node.userData.isStair = true;
                    }
                }
            }
        });
        
        console.log(`Added ${this.collidables.length} collidable objects from the map`);
        console.log(`Detected: ${floorCount} floors, ${wallCount} walls, ${stairCount} stairs`);
        
        // Check if we found any floor objects
        if (floorCount === 0) {
            console.log("No floor detected in the model, creating a fallback floor collider");
            this.createFallbackFloor();
        }
        
        // Create nav mesh for the floor for better navigation
        this.createFloorNavMesh();
    }
    
    // Create a navigation mesh for the floor to help with movement
    createFloorNavMesh() {
        // Find all floor objects
        const floorObjects = this.collidables.filter(obj => 
            obj.name.includes('Floor') || this.isLikelyFloor(obj));
        
        if (floorObjects.length === 0) return;
        
        // Create a merged nav mesh from all floor objects (not actually rendered)
        // This helps with ground detection and navigation
        const navMeshGroup = new THREE.Group();
        navMeshGroup.name = "Floor_NavMesh";
        
        // For debugging, uncomment this to see the nav mesh
        /*
        for (const floor of floorObjects) {
            const navGeometry = floor.geometry.clone();
            const navMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: true,
                transparent: true,
                opacity: 0.3
            });
            const navMesh = new THREE.Mesh(navGeometry, navMaterial);
            
            // Copy transform
            navMesh.position.copy(floor.position);
            navMesh.rotation.copy(floor.rotation);
            navMesh.scale.copy(floor.scale);
            
            navMeshGroup.add(navMesh);
        }
        this.scene.add(navMeshGroup);
        */
        
        // Create special collision helpers for stairs
        this.processStairs();
    }
    
    // Special handling for stairs to make them easier to navigate
    processStairs() {
        const stairObjects = this.collidables.filter(obj => 
            obj.name.includes('Stair') || obj.userData.isStair || this.isLikelyStair(obj));
        
        if (stairObjects.length === 0) return;
        
        console.log(`Processing ${stairObjects.length} stair objects for better navigation`);
        
        for (const stair of stairObjects) {
            // Get stair dimensions
            const bbox = new THREE.Box3().setFromObject(stair);
            const size = bbox.getSize(new THREE.Vector3());
            
            // For each stair, create a slope collider that makes it easier to navigate
            // This is an invisible ramp that helps the player walk up the stairs
            const rampGeometry = new THREE.BoxGeometry(size.x, size.y * 0.05, size.z);
            const rampMaterial = new THREE.MeshBasicMaterial({
                transparent: true,
                opacity: 0.0, // Make it invisible
                depthWrite: false
            });
            
            const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
            ramp.position.copy(stair.position);
            ramp.rotation.copy(stair.rotation);
            
            // Adjust the ramp to be slightly above the stair to prioritize the collision
            ramp.position.y += size.y * 0.02;
            
            ramp.name = `Stair_Helper_${stair.id}`;
            ramp.userData.isStairHelper = true;
            
            // Add to scene and collidables
            this.scene.add(ramp);
            this.collidables.push(ramp);
            
            console.log(`Created stair helper for ${stair.name}`);
        }
    }
    
    // Helper method to identify floor-like objects
    isLikelyFloor(mesh) {
        // Floors are typically horizontal, flat surfaces
        if (!mesh.geometry) return false;
        
        // Check if it's a PlaneGeometry with a normal pointing up
        if (mesh.geometry.type === 'PlaneGeometry' || mesh.geometry.type === 'PlaneBufferGeometry') {
            const normal = new THREE.Vector3(0, 1, 0);
            normal.applyQuaternion(mesh.quaternion);
            // If the normal is pointing mostly upward, it's likely a floor
            return normal.y > 0.7; 
        }
        
        // For BoxGeometry, check if it's wider than it is tall
        if (mesh.geometry.type === 'BoxGeometry' || mesh.geometry.type === 'BoxBufferGeometry') {
            // If available, check if it's wide and flat
            if (mesh.geometry.parameters) {
                const { width, height, depth } = mesh.geometry.parameters;
                return (width > height * 3 && depth > height * 3) || 
                       (Math.abs(mesh.rotation.x) > 2.5); // Rotated around X axis (horizontal)
            }
        }
        
        // Check mesh position - if it's near the bottom of the scene
        if (mesh.position.y < 0.5) return true;
        
        // Check if the name contains floor-related terms
        if (mesh.name.toLowerCase().includes('floor') || 
            mesh.name.toLowerCase().includes('ground')) {
            return true;
        }
        
        // For unknown geometry, use bounding box to check if it's mostly horizontal
        try {
            const bbox = new THREE.Box3().setFromObject(mesh);
            const size = bbox.getSize(new THREE.Vector3());
            return (size.x > size.y * 2 && size.z > size.y * 2) && bbox.min.y < 0.5;
        } catch (e) {
            return false;
        }
    }
    
    // Helper method to identify wall-like objects
    isLikelyWall(mesh) {
        if (!mesh.geometry) return false;
        
        // Check if it's a PlaneGeometry with a normal pointing horizontally
        if (mesh.geometry.type === 'PlaneGeometry' || mesh.geometry.type === 'PlaneBufferGeometry') {
            const normal = new THREE.Vector3(0, 0, 1);
            normal.applyQuaternion(mesh.quaternion);
            // If the normal is pointing mostly horizontally, it's likely a wall
            return Math.abs(normal.y) < 0.3;
        }
        
        // For BoxGeometry, check if it's taller than it is wide
        if (mesh.geometry.type === 'BoxGeometry' || mesh.geometry.type === 'BoxBufferGeometry') {
            if (mesh.geometry.parameters) {
                const { width, height, depth } = mesh.geometry.parameters;
                return height > width * 1.5 && height > depth * 1.5;
            }
        }
        
        // Check if the name contains wall-related terms
        if (mesh.name.toLowerCase().includes('wall')) {
            return true;
        }
        
        // For unknown geometry, use bounding box
        try {
            const bbox = new THREE.Box3().setFromObject(mesh);
            const size = bbox.getSize(new THREE.Vector3());
            return size.y > size.x * 1.5 && size.y > size.z * 1.5;
        } catch (e) {
            return false;
        }
    }
    
    // New helper method to identify stair-like objects
    isLikelyStair(mesh) {
        if (!mesh.geometry) return false;
        
        // Check if the name contains stair-related terms
        if (mesh.name.toLowerCase().includes('stair') || 
            mesh.name.toLowerCase().includes('step')) {
            return true;
        }
        
        // For unknown geometry, use bounding box to look for diagonal-ish objects
        try {
            const bbox = new THREE.Box3().setFromObject(mesh);
            const size = bbox.getSize(new THREE.Vector3());
            
            // Stairs are typically moderately-sized with moderate height
            // and are positioned above ground level but not too high
            const isReasonableSize = (size.x > 0.5 || size.z > 0.5) && size.y > 0.05 && size.y < 0.5;
            const isAtModerateHeight = bbox.min.y > 0.05 && bbox.min.y < 1.5;
            
            return isReasonableSize && isAtModerateHeight;
        } catch (e) {
            return false;
        }
    }
    
    // Create a fallback floor in case the model doesn't have one
    createFallbackFloor() {
        // Create a large invisible floor that covers the whole map area
        const floorSize = 100; // Make it large enough for any reasonable map
        const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: this.floorColor,
            roughness: 0.8,
            metalness: 0.2,
            transparent: true,
            opacity: 0.0 // Make it invisible
        });
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2; // Make it horizontal
        floor.position.y = 0; // At ground level
        floor.receiveShadow = true;
        floor.name = "Fallback_Floor";
        
        // Add it to the scene and collidables
        this.scene.add(floor);
        this.collidables.push(floor);
        this.objects.push(floor);
        
        console.log("Created fallback floor collider");
        
        // Also add small invisible ramps at major entrances to help with navigation
        this.addEntranceRamps();
    }
    
    // Add helper ramps at key entrances to aid navigation
    addEntranceRamps() {
        // Common entrance positions (adjust based on your map)
        const entrancePositions = [
            { x: 0, z: 10, angle: 0 },  // North entrance
            { x: 0, z: -10, angle: Math.PI }, // South entrance
            { x: 10, z: 0, angle: -Math.PI/2 }, // East entrance
            { x: -10, z: 0, angle: Math.PI/2 }  // West entrance
        ];
        
        for (const entrance of entrancePositions) {
            const rampGeometry = new THREE.BoxGeometry(3, 0.1, 2);
            // Create a slope by moving vertices
            const positions = rampGeometry.attributes.position.array;
            
            // Adjust height of vertices to create slope
            for (let i = 0; i < positions.length; i += 3) {
                // z coordinate is at positions[i+2]
                const z = positions[i+2];
                if (z > 0) {
                    // Raise the front edge to create a ramp
                    positions[i+1] += 0.2; // y coordinate
                }
            }
            
            rampGeometry.attributes.position.needsUpdate = true;
            rampGeometry.computeVertexNormals();
            
            const rampMaterial = new THREE.MeshStandardMaterial({
                color: 0x888888,
                transparent: true,
                opacity: 0.0 // Invisible in normal play
            });
            
            const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
            ramp.position.set(entrance.x, 0.05, entrance.z);
            ramp.rotation.y = entrance.angle;
            ramp.name = `Entrance_Ramp_${entrance.x}_${entrance.z}`;
            
            this.scene.add(ramp);
            this.collidables.push(ramp);
            this.objects.push(ramp);
            
            console.log(`Added entrance ramp at (${entrance.x}, ${entrance.z})`);
        }
    }
    
    createFallbackEnvironment() {
        // This will only be called if the map fails to load
        this.createFloor();
        this.createCeiling();
        this.createOuterWalls();
    }
    
    registerCollidables(player) {
        this.collidables.forEach(object => {
            player.registerCollidableObject(object);
        });
    }

    // Keep the rest of the methods for fallback and compatibility
    
    createFloor() {
        const floorGeometry = new THREE.PlaneGeometry(this.width, this.length);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: this.floorColor,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        floor.name = "Floor";
        this.scene.add(floor);
        this.objects.push(floor);
    }
    
    createCeiling() {
        const ceilingGeometry = new THREE.PlaneGeometry(this.width, this.length);
        const ceilingMaterial = new THREE.MeshStandardMaterial({ 
            color: this.ceilingColor,
            roughness: 0.9,
            metalness: 0.1
        });
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = this.height;
        ceiling.receiveShadow = true;
        ceiling.name = "Ceiling";
        this.scene.add(ceiling);
        this.objects.push(ceiling);
    }
    
    createOuterWalls() {
        // North wall
        const northWall = this.createWall(this.width, this.height, 0, this.height/2, -this.length/2);
        northWall.name = "North_Wall";
        this.scene.add(northWall);
        this.objects.push(northWall);
        this.collidables.push(northWall);
        
        // South wall
        const southWall = this.createWall(this.width, this.height, 0, this.height/2, this.length/2);
        southWall.name = "South_Wall";
        this.scene.add(southWall);
        this.objects.push(southWall);
        this.collidables.push(southWall);
        
        // East wall
        const eastWall = this.createWall(this.length, this.height, this.width/2, this.height/2, 0);
        eastWall.rotation.y = Math.PI / 2;
        eastWall.name = "East_Wall";
        this.scene.add(eastWall);
        this.objects.push(eastWall);
        this.collidables.push(eastWall);
        
        // West wall
        const westWall = this.createWall(this.length, this.height, -this.width/2, this.height/2, 0);
        westWall.rotation.y = Math.PI / 2;
        westWall.name = "West_Wall";
        this.scene.add(westWall);
        this.objects.push(westWall);
        this.collidables.push(westWall);
    }
    
    createWall(width, height, x, y, z) {
        const wallGeometry = new THREE.BoxGeometry(width, height, 0.1);
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: this.wallColor,
            roughness: 0.7,
            metalness: 0.1
        });
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(x, y, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        
        // Give the wall a descriptive name
        wall.name = `Wall_${x.toFixed(1)}_${y.toFixed(1)}_${z.toFixed(1)}`;
        
        return wall;
    }

    update() {
        // Update any animated elements if needed
    }

    // Get all collidable objects for the player
    getCollidableObjects() {
        return this.collidables;
    }
} 