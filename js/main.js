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

    // Create instruction overlay
    const overlay = document.createElement('div');
    overlay.id = 'instruction-overlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.color = 'white';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '1000';
    overlay.style.fontFamily = 'Arial, sans-serif';
    overlay.style.textAlign = 'center';
    
    overlay.innerHTML = `
        <h1 style="font-size: 32px; margin-bottom: 20px;">Bureaucratic Office RPG</h1>
        <h2 style="font-size: 24px; margin-bottom: 30px;">Click anywhere to play</h2>
        <div style="font-size: 18px; max-width: 600px; line-height: 1.5;">
            <p style="margin-bottom: 10px;"><strong>Controls:</strong></p>
            <p>WASD - Move</p>
            <p>Mouse - Look around</p>
            <p>Space - Jump</p>
            <p>Shift - Run</p>
            <p>Escape - Pause</p>
            <p>F3 - Toggle Debug Mode</p>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
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
    
    // Toggle debug mode with F3
    window.addEventListener('keydown', (event) => {
        if (event.code === 'F3') {
            game.toggleDebugMode();
        }
    });
}); 