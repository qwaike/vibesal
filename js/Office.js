// Office.js - Office environment class
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Office {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.collidables = [];
        
        // Load the map
        this.loadMap();
    } 
    
    loadMap() {
        console.log('Loading DemoMap...');
        
        const loader = new GLTFLoader();
        
        // Load the model - case sensitivity matters!
        loader.load(
            'map/DemoMap.glb',  // Match exact case of file name
            (gltf) => {
                // Success callback
                console.log('Map loaded successfully');
                
                // Add the model to the scene
                this.currentMap = gltf.scene;
                this.scene.add(this.currentMap);
                
                // Process the model to extract collidable objects
                this.processMapColliders(this.currentMap);
                
                // Dispatch event that map is loaded
                const event = new CustomEvent('mapLoaded', { detail: { mapId: 'office' } });
                document.dispatchEvent(event);
            },
            (xhr) => {
                // Progress callback
                console.log(`Map loading: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
            },
            (error) => {
                console.error('Error loading map:', error);
            }
        );
    }

    processMapColliders(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                // Add all meshes as collidable objects
                this.collidables.push(child);
            }
        });
    }

    getCollidableObjects() {
        return this.collidables;
    }
} 