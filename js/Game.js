// Game.js - Main game class
import * as THREE from 'three';
import { Player } from './Player.js';
import { Office } from './Office.js';
import { AudioManager } from './Audio.js';

export class Game {
    constructor() {
        console.log('Initializing game...');
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
        
        // Set up lighting
        this.setupLighting();
        
        // Create office
        this.office = new Office(this.scene);
        
        // Create player
        this.player = new Player(this.scene);
        
        // Listen for map loaded event to set collidable objects
        document.addEventListener('mapLoaded', (event) => {
            console.log('Map loaded, setting collidable objects for player');
            this.player.collidableObjects = this.office.getCollidableObjects();
        });
        
        // Create audio system
        this.audio = new AudioManager();
        
        // Game state
        this.isPaused = false;
        this.lastTime = Date.now();
        this.deltaTime = 0;
        
        // Debug mode
        this.debugMode = false;
        
        // Bind event listeners
        this.bindEventListeners();
        
        // Start game loop
        this.animate();
        
        console.log('Game initialization complete');
    }

    setupLighting() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.7);
        this.scene.add(ambientLight);

        // Directional light for shadows (main light source)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(-15, 20, -15);
        directionalLight.target.position.set(0, 0, 0);
        this.scene.add(directionalLight.target);
        
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        
        this.scene.add(directionalLight);
    }

    bindEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.onWindowResize();
        });
        
        // Toggle debug mode with F3
        window.addEventListener('keydown', (event) => {
            if (event.code === 'F3') {
                this.toggleDebugMode();
            }
        });
    }

    onWindowResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.player.camera.aspect = window.innerWidth / window.innerHeight;
        this.player.camera.updateProjectionMatrix();
    }

    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        console.log('Debug mode:', this.debugMode ? 'ON' : 'OFF');
    }

    update() {
        const currentTime = Date.now();
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        if (!this.isPaused) {
            this.player.update(this.deltaTime);
        }
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.player.camera);
    }
} 