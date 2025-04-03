// main.js - Game entry point
import * as THREE from 'three';
import { Game } from './Game.js';

// Make THREE globally available for legacy components
window.THREE = THREE;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');

    // Check if THREE is defined
    if (typeof THREE === 'undefined') {
        console.error('THREE is not defined! Make sure Three.js is properly loaded.');
        document.body.innerHTML = '<div style="color: red; font-size: 24px; text-align: center; margin-top: 100px;">Error: THREE is not defined. Please check the console for more information.</div>';
        return;
    }

    // Get the instruction overlay
    const overlay = document.getElementById('instruction-overlay');
    
    // Initialize game
    const game = new Game();
    
    // Handle pointer lock changes
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement) {
            overlay.style.display = 'none';
            game.resume();
        } else {
            overlay.style.display = 'flex';
            game.pause();
        }
    });
    
    // Pointer lock on click
    overlay.addEventListener('click', () => {
        if (!document.pointerLockElement) {
            game.player.controls.lock();
        }
    });
    
    // Start game loop
    function gameLoop() {
        game.update();
        requestAnimationFrame(gameLoop);
    }
    
    gameLoop();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        game.onWindowResize();
    });
}); 