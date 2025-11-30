let scene, camera, renderer;
let mountains, clouds, lavaFlows = [];
let volcanoes = [];
let clock = new THREE.Clock();

function initThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1429);
    scene.fog = new THREE.Fog(0x1a365d, 20, 80);
    
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 15, 25);
    camera.lookAt(0, 5, 0);
    
    const canvas = document.getElementById('three-canvas');
    renderer = new THREE.WebGLRenderer({ 
        canvas, 
        alpha: true, 
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffddaa, 1.2);
    mainLight.position.set(10, 20, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -20;
    mainLight.shadow.camera.right = 20;
    mainLight.shadow.camera.top = 20;
    mainLight.shadow.camera.bottom = -20;
    scene.add(mainLight);
    
    const backLight = new THREE.DirectionalLight(0x4466ff, 0.8);
    backLight.position.set(-5, 10, -10);
    scene.add(backLight);
    
    const volcanoLight = new THREE.PointLight(0xff4500, 2, 30);
    volcanoLight.position.set(0, 10, 0);
    scene.add(volcanoLight);
    
    const groundGeometry = new THREE.PlaneGeometry(100, 100, 50, 50);
    const groundMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2d3748,
        shininess: 10,
        side: THREE.DoubleSide
    });
    
    const positions = groundGeometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        const distance = Math.sqrt(x * x + z * z);
        positions[i + 1] = Math.sin(distance * 0.1) * 0.5 + Math.random() * 0.3;
    }
    groundGeometry.computeVertexNormals();
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5;
    ground.receiveShadow = true;
    scene.add(ground);
    
    mountains = new THREE.Group();
    
    const volcanoConfigs = [
        { x: -12, z: -8, scale: 1.8, height: 8 },
        { x: 12, z: -8, scale: 1.5, height: 7 },
        { x: -8, z: 10, scale: 2.0, height: 9 },
        { x: 8, z: 10, scale: 1.6, height: 7.5 },
        { x: -15, z: 5, scale: 1.3, height: 6 },
        { x: 15, z: 5, scale: 1.7, height: 8.5 },
        { x: 0, z: -12, scale: 1.9, height: 9.5 },
        { x: 0, z: 15, scale: 1.4, height: 7 }
    ];
    
    volcanoConfigs.forEach((config, index) => {
        const volcanoGeometry = new THREE.ConeGeometry(3, config.height, 8);
        const volcanoMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x4a5568,
            shininess: 30,
            transparent: true,
            opacity: 0.95
        });
        
        const volcano = new THREE.Mesh(volcanoGeometry, volcanoMaterial);
        volcano.position.set(config.x, -2.5, config.z);
        volcano.scale.set(config.scale, config.scale, config.scale);
        volcano.rotation.y = Math.random() * Math.PI;
        volcano.castShadow = true;
        volcano.receiveShadow = true;
        
        mountains.add(volcano);
        
        if (index < 4) {
            volcanoes.push({
                mesh: volcano,
                config: config,
                eruptionTimer: Math.random() * 10000 + 5000,
                lastEruption: -Math.random() * 5000,
                isErupting: false,
                lavaParticles: null,
                smokeParticles: null
            });
        }
    });
    
    scene.add(mountains);
    
    clouds = new THREE.Group();
    const cloudGeometry = new THREE.SphereGeometry(1, 7, 7);
    const cloudMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x888888,
        transparent: true,
        opacity: 0.8
    });
    
    for (let i = 0; i < 20; i++) {
        const cloudGroup = new THREE.Group();
        
        for (let j = 0; j < 5; j++) {
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
            cloud.position.set(
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 1.5,
                (Math.random() - 0.5) * 3
            );
            cloud.scale.set(
                Math.random() * 1.5 + 1,
                Math.random() * 0.8 + 0.5,
                Math.random() * 1.5 + 1
            );
            cloudGroup.add(cloud);
        }
        
        cloudGroup.position.set(
            (Math.random() - 0.5) * 60,
            Math.random() * 15 + 5,
            (Math.random() - 0.5) * 60
        );
        cloudGroup.userData = {
            speed: Math.random() * 0.01 + 0.005,
            rotationSpeed: (Math.random() - 0.5) * 0.002
        };
        
        clouds.add(cloudGroup);
    }
    scene.add(clouds);
    
    createAtmosphereParticles();
    
    window.addEventListener('resize', onWindowResize, false);
    
    animate();
}

function createAtmosphereParticles() {
    const particleCount = 2000;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
        const radius = Math.random() * 40 + 10;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.cos(phi) + 5;
        positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
        
        const color = new THREE.Color();
        color.setHSL(0, 0, Math.random() * 0.3 + 0.1);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        
        sizes[i] = Math.random() * 0.5 + 0.1;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    
    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);
}

function createEruption(volcano) {
    volcano.isErupting = true;
    
    const lavaGeometry = new THREE.BufferGeometry();
    const lavaCount = 300;
    const lavaPositions = new Float32Array(lavaCount * 3);
    const lavaColors = new Float32Array(lavaCount * 3);
    const lavaSizes = new Float32Array(lavaCount);
    const lavaVelocities = [];
    
    const volcanoPos = new THREE.Vector3();
    volcano.mesh.getWorldPosition(volcanoPos);
    
    for (let i = 0; i < lavaCount; i++) {
        lavaPositions[i * 3] = (Math.random() - 0.5) * 2;
        lavaPositions[i * 3 + 1] = 0;
        lavaPositions[i * 3 + 2] = (Math.random() - 0.5) * 2;
        
        const hue = Math.random() * 0.1 + 0.05;
        const color = new THREE.Color().setHSL(hue, 0.9, 0.5 + Math.random() * 0.3);
        lavaColors[i * 3] = color.r;
        lavaColors[i * 3 + 1] = color.g;
        lavaColors[i * 3 + 2] = color.b;
        
        lavaSizes[i] = Math.random() * 0.3 + 0.1;
        
        lavaVelocities.push({
            x: (Math.random() - 0.5) * 0.1,
            y: Math.random() * 0.2 + 0.1,
            z: (Math.random() - 0.5) * 0.1,
            life: Math.random() * 100 + 50
        });
    }
    
    lavaGeometry.setAttribute('position', new THREE.BufferAttribute(lavaPositions, 3));
    lavaGeometry.setAttribute('color', new THREE.BufferAttribute(lavaColors, 3));
    lavaGeometry.setAttribute('size', new THREE.BufferAttribute(lavaSizes, 1));
    
    const lavaMaterial = new THREE.PointsMaterial({
        size: 0.3,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });
    
    const lavaParticles = new THREE.Points(lavaGeometry, lavaMaterial);
    lavaParticles.position.copy(volcanoPos);
    lavaParticles.position.y += volcano.config.height * 0.8;
    scene.add(lavaParticles);
    
    const smokeGeometry = new THREE.BufferGeometry();
    const smokeCount = 200;
    const smokePositions = new Float32Array(smokeCount * 3);
    const smokeSizes = new Float32Array(smokeCount);
    const smokeVelocities = [];
    
    for (let i = 0; i < smokeCount; i++) {
        smokePositions[i * 3] = (Math.random() - 0.5) * 3;
        smokePositions[i * 3 + 1] = Math.random() * 2;
        smokePositions[i * 3 + 2] = (Math.random() - 0.5) * 3;
        
        smokeSizes[i] = Math.random() * 0.8 + 0.2;
        
        smokeVelocities.push({
            x: (Math.random() - 0.5) * 0.02,
            y: Math.random() * 0.05 + 0.02,
            z: (Math.random() - 0.5) * 0.02,
            life: Math.random() * 150 + 100
        });
    }
    
    smokeGeometry.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
    smokeGeometry.setAttribute('size', new THREE.BufferAttribute(smokeSizes, 1));
    
    const smokeMaterial = new THREE.PointsMaterial({
        color: 0x333333,
        size: 0.5,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });
    
    const smokeParticles = new THREE.Points(smokeGeometry, smokeMaterial);
    smokeParticles.position.copy(volcanoPos);
    smokeParticles.position.y += volcano.config.height * 0.9;
    scene.add(smokeParticles);
    
    volcano.lavaParticles = {
        mesh: lavaParticles,
        positions: lavaPositions,
        velocities: lavaVelocities
    };
    
    volcano.smokeParticles = {
        mesh: smokeParticles,
        positions: smokePositions,
        velocities: smokeVelocities
    };
    
    const eruptionLight = new THREE.PointLight(0xff5500, 3, 25);
    eruptionLight.position.copy(volcanoPos);
    eruptionLight.position.y += volcano.config.height * 0.8;
    scene.add(eruptionLight);
    volcano.eruptionLight = eruptionLight;
    
    
    setTimeout(() => {
        endEruption(volcano);
    }, 6000);
}

function updateEruptions(deltaTime) {
    volcanoes.forEach(volcano => {
        if (!volcano.isErupting) {
            volcano.lastEruption += deltaTime * 1000;
            if (volcano.lastEruption > volcano.eruptionTimer) {
                createEruption(volcano);
                volcano.lastEruption = 0;
                volcano.eruptionTimer = Math.random() * 8000 + 4000;
            }
        } else {
            if (volcano.lavaParticles) {
                const positions = volcano.lavaParticles.positions;
                const velocities = volcano.lavaParticles.velocities;
                
                for (let i = 0; i < velocities.length; i++) {
                    if (velocities[i].life > 0) {
                        positions[i * 3] += velocities[i].x;
                        positions[i * 3 + 1] += velocities[i].y;
                        positions[i * 3 + 2] += velocities[i].z;
                        
                        velocities[i].y -= 0.01;
                        velocities[i].x *= 0.99;
                        velocities[i].z *= 0.99;
                        
                        velocities[i].life--;
                        
                        if (positions[i * 3 + 1] < -2) {
                            positions[i * 3 + 1] = -2;
                            velocities[i].y = 0;
                        }
                    }
                }
                
                volcano.lavaParticles.mesh.geometry.attributes.position.needsUpdate = true;
            }
            
            if (volcano.smokeParticles) {
                const positions = volcano.smokeParticles.positions;
                const velocities = volcano.smokeParticles.velocities;
                
                for (let i = 0; i < velocities.length; i++) {
                    if (velocities[i].life > 0) {
                        positions[i * 3] += velocities[i].x;
                        positions[i * 3 + 1] += velocities[i].y;
                        positions[i * 3 + 2] += velocities[i].z;
                        
                        velocities[i].x += (Math.random() - 0.5) * 0.001;
                        velocities[i].y += 0.001;
                        velocities[i].z += (Math.random() - 0.5) * 0.001;
                        
                        velocities[i].life--;
                    }
                }
                
                volcano.smokeParticles.mesh.geometry.attributes.position.needsUpdate = true;
            }
        }
    });
}

function endEruption(volcano) {
    volcano.isErupting = false;
    
    if (volcano.lavaParticles) {
        scene.remove(volcano.lavaParticles.mesh);
        volcano.lavaParticles = null;
    }
    
    if (volcano.smokeParticles) {
        scene.remove(volcano.smokeParticles.mesh);
        volcano.smokeParticles = null;
    }
    
    if (volcano.eruptionLight) {
        scene.remove(volcano.eruptionLight);
        volcano.eruptionLight = null;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    const time = clock.getElapsedTime();
    
    camera.position.x = Math.sin(time * 0.1) * 5;
    camera.position.z = 25 + Math.cos(time * 0.05) * 3;
    camera.lookAt(Math.sin(time * 0.1) * 2, 5, 0);
    
    clouds.children.forEach(cloudGroup => {
        cloudGroup.position.x += cloudGroup.userData.speed;
        cloudGroup.rotation.y += cloudGroup.userData.rotationSpeed;
        
        if (cloudGroup.position.x > 40) {
            cloudGroup.position.x = -40;
            cloudGroup.position.z = (Math.random() - 0.5) * 60;
        }
    });
    
    mountains.rotation.y += 0.001;
    
    const lightIntensity = 0.8 + Math.sin(time * 2) * 0.2;
    scene.children.forEach(child => {
        if (child instanceof THREE.PointLight) {
            child.intensity = lightIntensity;
        }
    });
    
    updateEruptions(deltaTime);
    
    renderer.render(scene, camera);
}

window.addEventListener('load', initThreeJS);


        // Остальной JavaScript код для сайта
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const nav = document.querySelector('nav');
        
        mobileMenuBtn.addEventListener('click', () => {
            nav.classList.toggle('active');
        });
        
        const navLinks = document.querySelectorAll('nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
            });
        });
        
        const faqItems = document.querySelectorAll('.faq-item');
        
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            
            question.addEventListener('click', () => {
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                    }
                });
                
                item.classList.toggle('active');
            });
        });
        
        window.addEventListener('scroll', () => {
            const header = document.querySelector('header');
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
        
        const tourForm = document.getElementById('tour-form');
        const contactForm = document.getElementById('contact-form');
        
        tourForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Благодарим за заполнение анкеты! Наш менеджер свяжется с вами в ближайшее время для обсуждения деталей эксклюзивного тура.');
            tourForm.reset();
        });
        
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Спасибо за ваше сообщение! Мы свяжемся с вами в течение 24 часов.');
            contactForm.reset();
        });
        
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            });
        });