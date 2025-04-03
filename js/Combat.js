// Combat.js - Combat and challenge system
import * as THREE from 'three';

export class Combat {
    constructor(player, scene) {
        this.player = player;
        this.scene = scene;
        this.activeProjectiles = [];
        this.activeStamps = [];
        this.combatActive = false;
        this.activeChallenge = null;
        this.challengeLevel = 1;
        
        // Combat settings
        this.projectileSpeed = 0.5;
        this.projectileLifetime = 2000; // milliseconds
        this.stampDuration = 1000; // milliseconds
        this.maxProjectiles = 5;
        this.maxStamps = 3;
        
        // Paperwork difficulty tiers
        this.difficulties = [
            'Basic Form',
            'Complex Application',
            'Regulatory Compliance',
            'Budget Approval',
            'Policy Amendment'
        ];
    }

    startCombat() {
        this.combatActive = true;
        console.log('Combat initiated!');
    }

    endCombat() {
        this.combatActive = false;
        this.clearProjectiles();
        this.clearStamps();
        console.log('Combat ended!');
    }

    throwDocument(player, documentType, target) {
        if (!this.combatActive || this.activeProjectiles.length >= this.maxProjectiles) {
            return false;
        }

        const projectile = this.createProjectile(documentType);
        projectile.position.copy(player.mesh.position);
        projectile.position.y += 1.5; // Start at chest height

        // Calculate direction to target
        const direction = new THREE.Vector3()
            .subVectors(target.position, projectile.position)
            .normalize();
        
        projectile.userData.direction = direction;
        projectile.userData.creationTime = Date.now();
        projectile.userData.documentType = documentType;

        this.scene.add(projectile);
        this.activeProjectiles.push(projectile);
        return true;
    }

    createProjectile(documentType) {
        const geometry = new THREE.BoxGeometry(0.3, 0.4, 0.05);
        const material = new THREE.MeshStandardMaterial({ 
            color: this.getDocumentColor(documentType),
            metalness: 0.1,
            roughness: 0.8
        });
        return new THREE.Mesh(geometry, material);
    }

    getDocumentColor(documentType) {
        const colors = {
            'form': 0xFFFFFF,
            'report': 0xFFFF00,
            'memo': 0x00FF00,
            'contract': 0xFF0000,
            'permit': 0x0000FF
        };
        return colors[documentType] || 0xFFFFFF;
    }

    useStamp(player, stampType, position) {
        if (!this.combatActive || this.activeStamps.length >= this.maxStamps) {
            return false;
        }

        const stamp = this.createStamp(stampType);
        stamp.position.copy(position);
        stamp.userData.creationTime = Date.now();
        stamp.userData.stampType = stampType;

        this.scene.add(stamp);
        this.activeStamps.push(stamp);
        return true;
    }

    createStamp(stampType) {
        const geometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 8);
        const material = new THREE.MeshStandardMaterial({ 
            color: this.getStampColor(stampType),
            metalness: 0.8,
            roughness: 0.2
        });
        return new THREE.Mesh(geometry, material);
    }

    getStampColor(stampType) {
        const colors = {
            'approved': 0x00FF00,
            'rejected': 0xFF0000,
            'pending': 0xFFFF00,
            'urgent': 0xFF00FF,
            'confidential': 0x0000FF
        };
        return colors[stampType] || 0xFFFFFF;
    }

    update(deltaTime) {
        if (!this.combatActive) return;

        this.updateProjectiles();
        this.updateStamps();

        // Update active challenge if there is one
        if (this.activeChallenge) {
            this.activeChallenge.timeRemaining -= deltaTime;
            
            if (this.activeChallenge.timeRemaining <= 0) {
                this.resolveChallenge(false);
            }
        }
    }

    updateProjectiles() {
        for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.activeProjectiles[i];
            
            // Move projectile
            projectile.position.add(projectile.userData.direction.multiplyScalar(this.projectileSpeed));
            
            // Rotate projectile to face direction of travel
            projectile.lookAt(projectile.position.clone().add(projectile.userData.direction));
            
            // Check lifetime
            if (Date.now() - projectile.userData.creationTime > this.projectileLifetime) {
                this.removeProjectile(projectile);
            }
        }
    }

    updateStamps() {
        for (let i = this.activeStamps.length - 1; i >= 0; i--) {
            const stamp = this.activeStamps[i];
            
            // Check duration
            if (Date.now() - stamp.userData.creationTime > this.stampDuration) {
                this.removeStamp(stamp);
            }
        }
    }

    removeProjectile(projectile) {
        const index = this.activeProjectiles.indexOf(projectile);
        if (index > -1) {
            this.activeProjectiles.splice(index, 1);
            this.scene.remove(projectile);
        }
    }

    removeStamp(stamp) {
        const index = this.activeStamps.indexOf(stamp);
        if (index > -1) {
            this.activeStamps.splice(index, 1);
            this.scene.remove(stamp);
        }
    }

    clearProjectiles() {
        this.activeProjectiles.forEach(projectile => {
            this.scene.remove(projectile);
        });
        this.activeProjectiles = [];
    }

    clearStamps() {
        this.activeStamps.forEach(stamp => {
            this.scene.remove(stamp);
        });
        this.activeStamps = [];
    }

    // Combat effects
    createDocumentHitEffect(position, documentType) {
        const particles = new THREE.Points(
            new THREE.BufferGeometry(),
            new THREE.PointsMaterial({
                color: this.getDocumentColor(documentType),
                size: 0.1,
                transparent: true,
                opacity: 0.8
            })
        );

        const particleCount = 20;
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;

            velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.2,
                (Math.random() - 0.5) * 0.2
            ));
        }

        particles.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.userData.velocities = velocities;
        particles.userData.creationTime = Date.now();

        this.scene.add(particles);
        return particles;
    }

    createStampEffect(position, stampType) {
        const ringGeometry = new THREE.RingGeometry(0.2, 0.4, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: this.getStampColor(stampType),
            transparent: true,
            opacity: 1
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.rotation.x = -Math.PI / 2;
        ring.userData.creationTime = Date.now();

        this.scene.add(ring);
        return ring;
    }

    createChallenge() {
        const difficulty = Math.min(
            Math.floor(this.player.bureaucracyLevel / 5), 
            this.difficulties.length - 1
        );
        
        this.activeChallenge = {
            type: this.difficulties[difficulty],
            complexity: Math.floor(Math.random() * 5) + 1 + difficulty,
            timeRemaining: 30 + (difficulty * 10),
            reward: (difficulty + 1) * 10
        };
        
        return this.activeChallenge;
    }
    
    resolveChallenge(success) {
        if (!this.activeChallenge) return;
        
        if (success) {
            this.player.influence += this.activeChallenge.reward;
            this.player.bureaucracyLevel += 1;
            
            // Maybe promotion
            if (this.player.bureaucracyLevel % 10 === 0) {
                this.promotePlayer();
            }
        } else {
            // Penalty for failure
            this.player.bureaucraticStamina -= 10;
        }
        
        this.activeChallenge = null;
    }
    
    promotePlayer() {
        const ranks = [
            'Intern',
            'Junior Clerk',
            'Clerk',
            'Senior Clerk',
            'Assistant Manager',
            'Deputy Manager',
            'Manager',
            'Senior Manager',
            'Director',
            'Executive Director'
        ];
        
        const currentRankIndex = ranks.indexOf(this.player.careerRank);
        if (currentRankIndex < ranks.length - 1) {
            this.player.careerRank = ranks[currentRankIndex + 1];
            // TODO: Add promotion celebration effect
        }
    }
} 