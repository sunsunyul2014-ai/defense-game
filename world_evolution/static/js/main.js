let scene, camera, renderer, controls;
let socket;
let tiles = [];
const TILE_SIZE = 2;
let currentMapSize = 50;

let buildMode = null; // Stores building type when a button is clicked
let dayNightLight; // Directional Light for day/night
let unitMeshes = {};

function initSocket() {
    socket = io();

    socket.on('state_update', (data) => {
        document.getElementById('game-year').innerText = data.year;
        
        if (data.weather) {
            const we = document.getElementById('game-weather');
            we.innerText = data.weather;
            let eff = "효과 없음";
            if(data.weather === "폭풍") eff = "인구 사망 1%, 식량 50% 감소";
            if(data.weather === "가뭄") eff = "인구 사망 2%, 식량 80% 감소";
            if(data.weather === "비") eff = "식량 생산 20% 증가";
            if(data.weather === "방사능 낙진") eff = "인구 대규모 사망 10%";
            we.title = eff;
        }
        
        let oldEra = document.getElementById('game-era').innerText;
        document.getElementById('game-era').innerText = data.era;
        
        if(oldEra !== data.era && data.era && oldEra !== '고대') {
            showSplash(`새로운 시대: ${data.era}`, "문명이 또 한 걸음 나아갑니다!");
        }
        
        // Update Era visibility
        document.querySelectorAll('.era-group').forEach(el => el.classList.add('hidden'));
        document.getElementById('era-고대-buildings').classList.remove('hidden');
        if (data.era === '중세' || data.era === '근대' || data.era === '현대' || data.era === '미래') {
            document.getElementById('era-중세-buildings').classList.remove('hidden');
        }
        if (data.era === '근대' || data.era === '현대' || data.era === '미래') {
            document.getElementById('era-근대-buildings').classList.remove('hidden');
        }
        if (data.era === '현대' || data.era === '미래') {
            document.getElementById('era-현대-buildings').classList.remove('hidden');
        }
        if (data.era === '미래') {
            document.getElementById('era-미래-buildings').classList.remove('hidden');
        }
        
        if (data.map_size && data.map_size > currentMapSize) {
            currentMapSize = data.map_size;
            generateTerrain();
            showSplash("세계 확장", "지도 밖의 새로운 영토가 발견되었습니다!");
        }
        
        // Handle moving units dynamically
        if(data.units) {
            let currentIds = new Set(data.units.map(u => u.id));
            
            // Remove dead units
            for(let id in unitMeshes) {
                if(!currentIds.has(parseInt(id))) {
                    scene.remove(unitMeshes[id]);
                    delete unitMeshes[id];
                }
            }
            
            // Update or add units
            data.units.forEach(u => {
                if(!unitMeshes[u.id]) {
                    const geo = new THREE.SphereGeometry(TILE_SIZE * 0.3, 16, 16);
                    const mat = new THREE.MeshLambertMaterial({ color: u.color });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.set(u.x * TILE_SIZE, 1.5, u.z * TILE_SIZE);
                    mesh.castShadow = true;
                    scene.add(mesh);
                    unitMeshes[u.id] = mesh;
                } else {
                    // Smoothly animate to new position
                    new TWEEN.Tween(unitMeshes[u.id].position)
                        .to({ x: u.x * TILE_SIZE, z: u.z * TILE_SIZE }, 1800)
                        .start();
                }
            });
        }
        
        // Update day/night light
        if(dayNightLight) {
            let angle = (data.year % 360) * (Math.PI / 180);
            dayNightLight.position.set(Math.cos(angle)*100, Math.sin(angle)*100, Math.sin(angle)*100);
            if(Math.sin(angle) < 0) {
                dayNightLight.intensity = 0.2;
                scene.background.setHex(0x0a0a1a);
            } else {
                dayNightLight.intensity = 1.0;
                scene.background.setHex(0x87CEEB);
            }
        }
    });
}

let isFirstLoad = true;

function fetchPlayerData() {
    console.log('Fetching player data...');
    fetch('/api/player_data')
    .then(r => r.json())
    .then(data => {
        if(data.population !== undefined) {
            document.getElementById('res-pop').innerText = Math.floor(data.population);
            document.getElementById('res-working').innerText = Math.floor(data.working_population || 0);
            document.getElementById('res-soldiers').innerText = Math.floor(data.soldiers || 0);
            
            // 병력 상세 표시 업데이트
            const armyDiv = document.getElementById('my-army-list');
            if (armyDiv && data.unit_counts) {
                const types = Object.keys(data.unit_counts);
                if (types.length === 0) {
                    armyDiv.innerHTML = '보유한 병력이 없습니다.';
                } else {
                    armyDiv.innerHTML = types.map(t => `<div style="margin-bottom: 3px;">🗡️ ${t}: <strong style="color:white;">${data.unit_counts[t]}</strong>명</div>`).join('');
                }
            }
            
            document.getElementById('res-food_wheat').innerText = Math.floor(data.food_wheat || 0);
            document.getElementById('res-food_rice').innerText = Math.floor(data.food_rice || 0);
            document.getElementById('res-food_corn').innerText = Math.floor(data.food_corn || 0);
            document.getElementById('res-food_potato').innerText = Math.floor(data.food_potato || 0);
            document.getElementById('res-food_fruit').innerText = Math.floor(data.food_fruit || 0);
            document.getElementById('res-food_beef').innerText = Math.floor(data.food_beef || 0);
            document.getElementById('res-food_pork').innerText = Math.floor(data.food_pork || 0);
            document.getElementById('res-food_chicken').innerText = Math.floor(data.food_chicken || 0);
            document.getElementById('res-food_fish').innerText = Math.floor(data.food_fish || 0);
            document.getElementById('res-food_milk').innerText = Math.floor(data.food_milk || 0);
            
            document.getElementById('res-food_cheese').innerText = Math.floor(data.food_cheese || 0);
            document.getElementById('res-food_bread').innerText = Math.floor(data.food_bread || 0);
            document.getElementById('res-food_sausage').innerText = Math.floor(data.food_sausage || 0);
            document.getElementById('res-food_wine').innerText = Math.floor(data.food_wine || 0);
            document.getElementById('res-food_steak').innerText = Math.floor(data.food_steak || 0);
            document.getElementById('res-food_canned_fish').innerText = Math.floor(data.food_canned_fish || 0);
            document.getElementById('res-food_stew').innerText = Math.floor(data.food_stew || 0);
            document.getElementById('res-wood').innerText = Math.floor(data.wood);
            document.getElementById('res-iron').innerText = Math.floor(data.iron);
            document.getElementById('res-stone').innerText = Math.floor(data.stone);
            document.getElementById('res-gold').innerText = Math.floor(data.gold);
            
            document.getElementById('res-mineral').innerText = Math.floor(data.mineral || 0);
            document.getElementById('res-silver').innerText = Math.floor(data.silver || 0);
            document.getElementById('res-copper').innerText = Math.floor(data.copper || 0);
            document.getElementById('res-water').innerText = Math.floor(data.water || 0);
            
            document.getElementById('res-paper').innerText = Math.floor(data.paper || 0);
            document.getElementById('res-cut_stone').innerText = Math.floor(data.cut_stone || 0);
            
            document.getElementById('res-coal').innerText = Math.floor(data.coal || 0);
            document.getElementById('res-oil').innerText = Math.floor(data.oil || 0);
            document.getElementById('res-uranium').innerText = Math.floor(data.uranium || 0);
            document.getElementById('res-brick').innerText = Math.floor(data.brick || 0);
            document.getElementById('res-glass').innerText = Math.floor(data.glass || 0);
            document.getElementById('res-gunpowder').innerText = Math.floor(data.gunpowder || 0);
            document.getElementById('res-gasoline').innerText = Math.floor(data.gasoline || 0);
            document.getElementById('res-enriched_uranium').innerText = Math.floor(data.enriched_uranium || 0);
            
            document.getElementById('res-bronze').innerText = Math.floor(data.bronze || 0);
            document.getElementById('res-steel').innerText = Math.floor(data.steel || 0);
            document.getElementById('res-alloy').innerText = Math.floor(data.alloy || 0);
            document.getElementById('res-advanced_part').innerText = Math.floor(data.advanced_part || 0);
            
            document.getElementById('res-plastic').innerText = Math.floor(data.plastic || 0);
            document.getElementById('res-semiconductor').innerText = Math.floor(data.semiconductor || 0);
            document.getElementById('res-ai_chip').innerText = Math.floor(data.ai_chip || 0);
            document.getElementById('res-energy_core').innerText = Math.floor(data.energy_core || 0);
            
            document.getElementById('res-titanium').innerText = Math.floor(data.titanium || 0);
            document.getElementById('res-dark_matter').innerText = Math.floor(data.dark_matter || 0);
            document.getElementById('res-composite').innerText = Math.floor(data.composite || 0);
            document.getElementById('res-warp_drive').innerText = Math.floor(data.warp_drive || 0);
            
            if(data.name && data.color) {
                const badge = document.getElementById('nation-badge');
                badge.innerText = data.name;
                badge.style.backgroundColor = data.color;
                
                // Keep track of capital coords globally
                window.playerCapitalX = data.capital_x;
                window.playerCapitalZ = data.capital_z;
                
                if(isFirstLoad && data.capital_x !== undefined) {
                    camera.position.set(data.capital_x * TILE_SIZE, 40, (data.capital_z + 10) * TILE_SIZE);
                    controls.target.set(data.capital_x * TILE_SIZE, 0, data.capital_z * TILE_SIZE);
                    controls.update();
                    isFirstLoad = false;
                }
            }
        }
    });
}
setInterval(fetchPlayerData, 2000); // Fetch player resources every 2s

document.getElementById('btn-find-nation').addEventListener('click', () => {
    console.log('Find nation button clicked');
    if(window.playerCapitalX !== undefined) {
        controls.enabled = false;
        new TWEEN.Tween(camera.position)
            .to({ x: window.playerCapitalX * TILE_SIZE, y: 40, z: (window.playerCapitalZ + 10) * TILE_SIZE }, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
        new TWEEN.Tween(controls.target)
            .to({ x: window.playerCapitalX * TILE_SIZE, y: 0, z: window.playerCapitalZ * TILE_SIZE }, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onComplete(() => { controls.enabled = true; controls.update(); })
            .start();
    } else {
        console.warn('Capital coordinates not set yet');
    }
});

// Nation badge click: also go to capital
document.getElementById('nation-badge').addEventListener('click', () => {
    document.getElementById('btn-find-nation').click();
});


function showSplash(title, desc) {
    const splash = document.getElementById('event-splash');
    document.getElementById('event-splash-title').innerText = title;
    document.getElementById('event-splash-desc').innerText = desc;
    splash.classList.remove('hidden');
    setTimeout(() => { splash.classList.add('hidden'); }, 4000);
}

function init3D() {
    const container = document.getElementById('game-container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // SkyBlue
    // Remove fog to prevent the whole scene from being washed out
    scene.fog = null;

    // Debug: confirm fog is disabled
    console.log('Fog disabled, scene.fog =', scene.fog);


    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(25 * TILE_SIZE, 40, 35 * TILE_SIZE);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableRotate = false; // Disable camera rotation
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: null
    };
    controls.target.set(25 * TILE_SIZE, 0, 25 * TILE_SIZE);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    dayNightLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dayNightLight.position.set(100, 150, 50);
    dayNightLight.castShadow = true;
    dayNightLight.shadow.mapSize.width = 1024; // Lower resolution for better performance
    dayNightLight.shadow.mapSize.height = 1024;
    dayNightLight.shadow.camera.near = 0.5;
    dayNightLight.shadow.camera.far = 500;
    dayNightLight.shadow.camera.left = -100;
    dayNightLight.shadow.camera.right = 100;
    dayNightLight.shadow.camera.top = 100;
    dayNightLight.shadow.camera.bottom = -100;
    dayNightLight.shadow.bias = -0.0005;
    scene.add(dayNightLight);

    generateTerrain();

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('click', (event) => {
        if(event.target.tagName === 'BUTTON') return;
        
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(tiles);
        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (object.userData && object.userData.type) {
                
                // If in build mode
                if(buildMode) {
                    if (buildMode === '점령') {
                        conquerTile(object);
                    } else {
                        placeBuilding(object, buildMode);
                    }
                    buildMode = null; // Reset
                    document.querySelectorAll('.build-btn').forEach(b => b.style.background = b.dataset.type === '점령' ? '#ef4444' : '#2563eb');
                    const statusEl = document.getElementById('build-mode-status');
                    if(statusEl) statusEl.innerText = '건설 모드: 없음';
                    return;
                }
                
                let resInfo = "";
                if (object.userData.res_type) {
                    resInfo = `<p>자원: <strong>${object.userData.res_type}</strong> (매장량: ${Math.floor(object.userData.res_amt)})</p>`;
                }

                // Show base info immediately
                let title = "지형 정보";
                let typeStr = object.userData.type;
                let buildingInfo = "";
                
                if (object.userData.building_type) {
                    title = "건축물 정보";
                    typeStr = "건축물 (" + object.userData.building_type + ")";
                    buildingInfo = `<p style="color: #4ade80; font-weight: bold;">건물 종류: ${object.userData.building_type}</p>`;
                } else if (object.userData.type === '수도') {
                    title = "도시 정보";
                    buildingInfo = `<p style="color: #facc15; font-weight: bold;">국가의 수도입니다.</p>`;
                }
                
                let ownerText = "";
                if (object.userData.owner) {
                    ownerText = '<p id="owner-loading">국가 정보 로딩중...</p>';
                } else if (!object.userData.building_type) {
                    ownerText = '<p>미개척 영토</p>';
                }
                
                document.getElementById('info-title').innerText = title;
                document.getElementById('info-content').innerHTML = `
                    <p>분류: <strong>${typeStr}</strong></p>
                    <p>좌표: (X: ${Math.floor(object.userData.x)}, Z: ${Math.floor(object.userData.z)})</p>
                    ${buildingInfo}
                    ${resInfo}
                    ${ownerText}
                `;

                if(object.userData.owner) {
                    fetch(`/api/nation_data?color=${encodeURIComponent(object.userData.owner)}`)
                    .then(r=>r.json())
                    .then(nd => {
                        if(nd.name) {
                            const aiText = nd.is_player ? '(플레이어)' : '(AI)';
                            const ownerEl = document.getElementById('owner-loading');
                            if(ownerEl) ownerEl.outerHTML = `
                                <hr>
                                <h4>국가 정보</h4>
                                <p>국가명: <strong style="color:${object.userData.owner}">${nd.name} ${aiText}</strong></p>
                                <p>인구: ${Math.floor(nd.population)}</p>
                                <p>병력: ${Math.floor(nd.soldiers)}</p>
                                <p>금: ${Math.floor(nd.gold)}</p>
                            `;
                        }
                    });
                }
            }
        }
    });

    window.addEventListener('resize', onWindowResize, false);
    animate();
}

function conquerTile(tileMesh) {
    fetch('/api/conquer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: tileMesh.userData.x, z: tileMesh.userData.z })
    })
    .then(r => r.json())
    .then(res => {
        if(res.status === 'success') {
            showSplash("점령 성공!", res.msg);
            generateTerrain(); // Refresh to show new borders
        } else {
            showSplash("점령 실패", res.status);
        }
    });
}

function createBuildingMesh(type) {
    const s = TILE_SIZE;
    const group = new THREE.Group();
    
    // Improved designs
    if (type === '수도' || type.includes('수도')) {
        // Grand multi-tiered design
        const base = new THREE.Mesh(new THREE.BoxGeometry(s*0.9, s*0.4, s*0.9), new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7, metalness: 0.1 }));
        base.position.y = s*0.2;
        base.castShadow = true;
        
        const mid = new THREE.Mesh(new THREE.BoxGeometry(s*0.6, s*0.5, s*0.6), new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.6, metalness: 0.1 }));
        mid.position.y = s*0.65;
        mid.castShadow = true;
        
        const roof = new THREE.Mesh(new THREE.ConeGeometry(s*0.5, s*0.6, 4), new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.5, metalness: 0.3 }));
        roof.rotation.y = Math.PI / 4;
        roof.position.y = s*1.2;
        roof.castShadow = true;
        
        group.add(base);
        group.add(mid);
        group.add(roof);
    }
    else if (type.includes('주택') || type.includes('아파트')) {
        const h = type.includes('태크3') ? s*1.5 : (type.includes('태크2') ? s*0.8 : s*0.4);
        const col = type.includes('태크3') ? 0x94a3b8 : (type.includes('태크2') ? 0xfcd34d : 0xe5e7eb);
        const body = new THREE.Mesh(new THREE.BoxGeometry(s*0.5, h, s*0.5), new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 }));
        body.position.y = h/2;
        body.castShadow = true;
        group.add(body);
        
        if(!type.includes('태크3')) {
            const roof = new THREE.Mesh(new THREE.ConeGeometry(s*0.4, s*0.3, 4), new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.9 }));
            roof.rotation.y = Math.PI / 4;
            roof.position.y = h + s*0.15;
            roof.castShadow = true;
            group.add(roof);
        }
    }
    else if (type.includes('농') || type.includes('농장') || type.includes('농사지대')) {
        const field = new THREE.Mesh(new THREE.PlaneGeometry(s*0.8, s*0.8), new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 1.0 }));
        field.rotation.x = -Math.PI / 2;
        field.position.y = 0.05;
        field.receiveShadow = true;
        group.add(field);
        
        const siloCol = type.includes('태크3') ? 0x3b82f6 : (type.includes('태크2') ? 0xf59e0b : 0x9ca3af);
        const siloH = type.includes('태크3') ? s*1.0 : (type.includes('태크2') ? s*0.8 : s*0.6);
        const silo = new THREE.Mesh(new THREE.CylinderGeometry(s*0.15, s*0.15, siloH), new THREE.MeshStandardMaterial({ color: siloCol, metalness: 0.4, roughness: 0.5 }));
        silo.position.set(s*0.2, siloH/2, s*0.2);
        silo.castShadow = true;
        group.add(silo);
    }
    else if (type.includes('성')) {
        const bGeo = new THREE.BoxGeometry(s*0.8, s*0.8, s*0.8);
        const bMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.9, metalness: 0.1 });
        const mesh = new THREE.Mesh(bGeo, bMat);
        mesh.position.y = s*0.4;
        mesh.castShadow = true;
        group.add(mesh);
    } 
    else if (type.includes('투석기')) {
        const baseGeo = new THREE.BoxGeometry(s*0.6, s*0.2, s*0.6);
        const baseMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const mesh = new THREE.Mesh(baseGeo, baseMat);
        mesh.position.y = s*0.1;
        mesh.castShadow = true;
        group.add(mesh);
    }
    else if (type.includes('터렛')) {
        const base = new THREE.Mesh(new THREE.BoxGeometry(s*0.5, s*0.5, s*0.5), new THREE.MeshLambertMaterial({ color: 0x333333 }));
        base.position.y = s*0.25;
        base.castShadow = true;
        group.add(base);
        
        const topColor = type.includes('레이저') ? 0xff0000 : 0x888888;
        const em = type.includes('레이저') ? 0xff0000 : 0x000000;
        const top = new THREE.Mesh(new THREE.CylinderGeometry(s*0.2, s*0.2, s*0.4), new THREE.MeshLambertMaterial({ color: topColor, emissive: em }));
        top.position.y = s*0.6;
        top.castShadow = true;
        group.add(top);
    }
    else if (type.includes('벌목장') || type.includes('광산')) {
        const bGeo = new THREE.BoxGeometry(s*0.6, s*0.4, s*0.6);
        const bMat = new THREE.MeshStandardMaterial({ color: type.includes('광산') ? 0x52525b : 0x78350f, roughness: 0.9 });
        const mesh = new THREE.Mesh(bGeo, bMat);
        mesh.position.y = s*0.2;
        mesh.castShadow = true;
        group.add(mesh);
    }
    else {
        // Default box for others
        const bGeo = new THREE.BoxGeometry(s*0.6, s*0.75, s*0.6);
        const bMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.7, metalness: 0.2 });
        const mesh = new THREE.Mesh(bGeo, bMat);
        mesh.position.y = s*0.375;
        mesh.castShadow = true;
        group.add(mesh);
    }
    return group;
}

function placeBuilding(tileMesh, buildingType) {
    // Send to backend first to check resources
    fetch('/api/build', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: buildingType, x: Math.floor(tileMesh.userData.x), z: Math.floor(tileMesh.userData.z) }) 
    })
    .then(r => r.json())
    .then(res => {
        if(res.status === 'success') {
            const bMesh = createBuildingMesh(buildingType);
            
            // Pop animation
            bMesh.position.set(tileMesh.position.x, tileMesh.position.y + 10, tileMesh.position.z);
            bMesh.scale.set(0.1, 0.1, 0.1);
            scene.add(bMesh);
            
            new TWEEN.Tween(bMesh.position)
                .to({ y: tileMesh.position.y }, 1000)
                .easing(TWEEN.Easing.Bounce.Out)
                .start();
                
            new TWEEN.Tween(bMesh.scale)
                .to({ x: 1, y: 1, z: 1 }, 1000)
                .easing(TWEEN.Easing.Elastic.Out)
                .start();
                
            showSplash("건설 시작!", res.msg || `${buildingType} 건설 중...`);
            fetchPlayerData();
        } else {
            // Show the actual failure reason from server
            const reason = res.status.replace('fail: ', '');
            showSplash("건설 실패", reason);
        }
    });
}

function generateTerrain() {
    fetch('/api/world_data')
        .then(response => response.json())
        .then(data => {
            // Properly dispose old meshes to prevent memory leak / lag
            tiles.forEach(t => {
                scene.remove(t);
                if(t.geometry) t.geometry.dispose();
                if(t.material) {
                    if(Array.isArray(t.material)) t.material.forEach(m => m.dispose());
                    else t.material.dispose();
                }
            });
            tiles.length = 0;
            
            const geoBox = new THREE.BoxGeometry(TILE_SIZE, 1, TILE_SIZE);
            const geoBoxSmooth = new THREE.BoxGeometry(TILE_SIZE*0.98, 1, TILE_SIZE*0.98);
            const geoCone = new THREE.ConeGeometry(TILE_SIZE*0.2, TILE_SIZE*0.8, 5); // Smaller Trees for clustering
            const geoOct = new THREE.OctahedronGeometry(TILE_SIZE*0.5, 1); // Mountains smoother
            
            const mats = {
                '바다': new THREE.MeshPhysicalMaterial({ color: 0x1E90FF, transparent: true, opacity: 0.85, roughness: 0.1, metalness: 0.1, transmission: 0.5 }),
                '사막': new THREE.MeshStandardMaterial({ color: 0xEEDC82, roughness: 0.9, metalness: 0.0 }),
                '평원': new THREE.MeshStandardMaterial({ color: 0x556B2F, roughness: 0.8, metalness: 0.0 }),
                '숲': new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.9, metalness: 0.0 }),
                '산': new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.7, metalness: 0.2 }),
                '눈': new THREE.MeshStandardMaterial({ color: 0xFFFAFA, roughness: 0.5, metalness: 0.1 })
            };
            
            const treeMat = new THREE.MeshStandardMaterial({ color: 0x006400, roughness: 0.9 });
            const mtnMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 });
            const peakMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.5 });
            const planeGeo = new THREE.PlaneGeometry(TILE_SIZE*0.9, TILE_SIZE*0.9);
            const edgesGeo = new THREE.EdgesGeometry(planeGeo);
            
            // For border checking, build a map
            let tileMap = {};
            data.tiles.forEach(t => {
                tileMap[`${t.x},${t.z}`] = t;
            });

            data.tiles.forEach(t => {
                let height = 1;
                let material = mats[t.type];
                let mesh = new THREE.Mesh(geoBoxSmooth, material);
                
                if(t.type === '바다') height = 0.5;
                else if(t.type === '사막') height = 1.0;
                else if(t.type === '평원') height = 1.1;
                else if(t.type === '숲') {
                    height = 1.1;
                    // Create a cluster of 3 trees
                    for(let i=0; i<3; i++) {
                        let tree = new THREE.Mesh(geoCone, treeMat);
                        let ox = (Math.random() - 0.5) * TILE_SIZE * 0.6;
                        let oz = (Math.random() - 0.5) * TILE_SIZE * 0.6;
                        tree.position.set(t.x * TILE_SIZE + ox, height + TILE_SIZE*0.4, t.z * TILE_SIZE + oz);
                        tree.rotation.y = Math.random() * Math.PI;
                        tree.rotation.x = (Math.random() - 0.5) * 0.2;
                        tree.rotation.z = (Math.random() - 0.5) * 0.2;
                        tree.castShadow = true;
                        tree.receiveShadow = true;
                        tree.matrixAutoUpdate = false;
                        tree.updateMatrix();
                        // Same userData as parent tile so trees can be clicked/built on
                        tree.userData = { type: t.type, x: t.x, z: t.z, res_type: t.res_type, res_amt: t.res_amt, owner: t.owner_color };
                        scene.add(tree);
                        tiles.push(tree); // to be able to remove it later
                    }
                }
                else if(t.type === '산') {
                    height = 1.2;
                    let mtn = new THREE.Mesh(geoOct, mtnMat);
                    mtn.position.set(t.x * TILE_SIZE, height + TILE_SIZE*0.2, t.z * TILE_SIZE);
                    mtn.scale.set(1, 1.5, 1);
                    mtn.castShadow = true;
                    mtn.receiveShadow = true;
                    mtn.matrixAutoUpdate = false;
                    mtn.updateMatrix();
                    scene.add(mtn);
                    tiles.push(mtn);
                    // Add small peak
                    let peak = new THREE.Mesh(geoOct, peakMat);
                    peak.position.set(t.x * TILE_SIZE, height + TILE_SIZE*0.7, t.z * TILE_SIZE);
                    peak.scale.set(0.5, 0.5, 0.5);
                    peak.castShadow = true;
                    peak.matrixAutoUpdate = false;
                    peak.updateMatrix();
                    scene.add(peak);
                    tiles.push(peak);
                }
                else if(t.type === '눈') height = 1.1;

                mesh.position.set(t.x * TILE_SIZE, height / 2, t.z * TILE_SIZE);
                mesh.scale.y = height;
                mesh.receiveShadow = true;
                mesh.matrixAutoUpdate = false;
                mesh.updateMatrix();
                
                // Outline border (겉을 따줘)
                if (t.owner_color) {
                    const line = new THREE.LineSegments(edgesGeo, new THREE.LineBasicMaterial( { color: t.owner_color, linewidth: 2 } ));
                    line.rotation.x = -Math.PI / 2;
                    line.position.set(t.x * TILE_SIZE, height + 0.05, t.z * TILE_SIZE);
                    line.matrixAutoUpdate = false;
                    line.updateMatrix();
                    line.userData = { type: t.type, x: t.x, z: t.z, res_type: t.res_type, res_amt: t.res_amt, owner: t.owner_color };
                    scene.add(line);
                    tiles.push(line);
                }
                
                mesh.userData = { type: t.type, x: t.x, z: t.z, res_type: t.res_type, res_amt: t.res_amt, owner: t.owner_color };
                scene.add(mesh);
                tiles.push(mesh);
            });
            
            data.cities.forEach(c => {
                const cMesh = createBuildingMesh(c.name);
                
                // Color the roof or base with nation color to distinguish
                cMesh.children.forEach(child => {
                    if(child.geometry.type === 'ConeGeometry') {
                        child.material.color.setHex(parseInt(c.color.replace('#', '0x')));
                    }
                });
                
                cMesh.position.set(c.x * TILE_SIZE, 1.0, c.z * TILE_SIZE);
                scene.add(cMesh);
                tiles.push(cMesh); // Allow clicking on capital
                cMesh.userData = { type: '수도', x: c.x, z: c.z, owner: c.color };
            });
            
            // Add existing buildings from DB
            if(data.buildings) {
                data.buildings.forEach(b => {
                    const bMesh = createBuildingMesh(b.type);
                    bMesh.position.set(b.x * TILE_SIZE, 1.2, b.z * TILE_SIZE);
                    // Add userData so we can click on it
                    bMesh.userData = { type: '건축물', building_type: b.type, x: b.x, z: b.z, owner: b.color };
                    // If bMesh is a group, add children to tiles or just add the group.
                    // Actually Raycaster intersects children, so let's attach userData to all children too.
                    bMesh.children.forEach(c => c.userData = bMesh.userData);
                    
                    scene.add(bMesh);
                    tiles.push(bMesh);
                    bMesh.children.forEach(c => tiles.push(c));
                });
            }
        });
}

const moveKeys = { w: false, a: false, s: false, d: false };
window.addEventListener('keydown', (e) => {
    if (moveKeys.hasOwnProperty(e.key.toLowerCase())) {
        moveKeys[e.key.toLowerCase()] = true;
    }
});
window.addEventListener('keyup', (e) => {
    if (moveKeys.hasOwnProperty(e.key.toLowerCase())) {
        moveKeys[e.key.toLowerCase()] = false;
    }
});

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(time) {
    requestAnimationFrame(animate);
    TWEEN.update(time);
    
    // WASD Movement Logic (Pan relative to camera angle)
    const speed = 1.0;
    if (moveKeys.w) { camera.position.z -= speed; controls.target.z -= speed; }
    if (moveKeys.s) { camera.position.z += speed; controls.target.z += speed; }
    if (moveKeys.a) { camera.position.x -= speed; controls.target.x -= speed; }
    if (moveKeys.d) { camera.position.x += speed; controls.target.x += speed; }
    
    if(controls.enabled) controls.update();
    renderer.render(scene, camera);
}

function setupTabs() {
    const btns = document.querySelectorAll('.menu-btn');
    const panes = document.querySelectorAll('.tab-pane');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            panes.forEach(p => p.classList.add('hidden'));
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.remove('hidden');
        });
    });
    
    // Build buttons logic
    const buildBtns = document.querySelectorAll('.build-btn');
    const buildStatusEl = document.getElementById('build-mode-status');

    function resetBuildMode() {
        buildMode = null;
        buildBtns.forEach(b => b.style.background = b.dataset.type === '점령' ? '#ef4444' : '#2563eb');
        if(buildStatusEl) buildStatusEl.innerText = '건설 모드: 없음';
    }

    buildBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bType = e.target.getAttribute('data-type');
            const unitList = ['원시전사', '투창병', '기사', '장궁병', '투석기', '머스킷병', '대포', '소총수', '탱크', '헬기', '비행기', '항공모함', '함포', '강화외골격병', '플라즈마전차', '전투로봇', '우주전함'];
            
            if (unitList.includes(bType)) {
                // 유닛은 클릭 없이 즉시 생산
                fetch('/api/build', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: bType, x: 0, z: 0 })
                })
                .then(r => r.json())
                .then(res => {
                    if(res.status.startsWith('fail')) {
                        showSplash("징집 실패", res.status.replace('fail: ', ''), true);
                    } else {
                        showSplash("징집 지시", res.msg);
                    }
                });
                resetBuildMode();
                return;
            }

            buildMode = bType;
            buildBtns.forEach(b => b.style.background = b.dataset.type === '점령' ? '#ef4444' : '#2563eb'); 
            e.target.style.background = '#fbbf24'; 
            if(buildStatusEl) buildStatusEl.innerText = `건설 모드: ${buildMode}`;
            
            if(buildMode === '점령') {
                showSplash("점령 모드", "빈 타일이나 적 타일을 클릭해 영토를 넓히세요.");
            } else {
                showSplash("건설 모드", `${buildMode} 건설 준비! 내 영토를 클릭하세요.`);
            }
        });
    });

    // Cancel build mode button
    const cancelBuildBtn = document.getElementById('btn-cancel-build');
    if(cancelBuildBtn) {
        cancelBuildBtn.addEventListener('click', () => {
            resetBuildMode();
            showSplash("건설 취소", "건설 모드가 해제되었습니다.");
        });
    }
    
    // Tech buttons logic
    const techBtns = document.querySelectorAll('.tech-btn');
    techBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const techName = e.target.getAttribute('data-tech');
            fetch('/api/research', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ tech_name: techName })
            })
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    showSplash("연구 완료!", data.msg);
                    e.target.innerText = "연구됨";
                    e.target.disabled = true;
                    e.target.style.background = "#10b981";
                    fetchPlayerData();
                } else {
                    showSplash("연구 실패", data.status);
                }
            });
        });
    });
}

// ==========================================
// Diplomacy System
// ==========================================

function loadDiplomacy() {
    fetch('/api/diplomacy/status')
    .then(r => r.json())
    .then(data => {
        const list = document.getElementById('diplomacy-list');
        if (!list) return;
        
        const relations = data.relations || [];
        if (relations.length === 0) {
            list.innerHTML = '<div style="color:#94a3b8; font-size:0.85rem;">다른 국가가 없습니다.</div>';
            return;
        }
        
        list.innerHTML = relations.map(n => {
            const warStatus = n.at_war ? '⚔️ 전쟁 중' : '🕊️ 평화';
            const warColor  = n.at_war ? '#ef4444' : '#4ade80';
            const typeLabel = n.is_player ? '👤 플레이어' : '🤖 AI';
            return `
            <div style="background:rgba(255,255,255,0.05); border-radius:8px; padding:10px; border-left:4px solid ${n.color};">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <span style="font-weight:bold; color:${n.color};">${n.name}</span>
                    <span style="font-size:0.75rem; color:#94a3b8;">${typeLabel}</span>
                </div>
                <div style="font-size:0.85rem; color:${warColor}; margin-bottom:8px;">${warStatus}</div>
                <div style="display:flex; gap:5px; flex-wrap:wrap;">
                    ${n.at_war
                        ? `<button onclick="diplomacyMakePeace(${n.id}, '${n.name}')" style="flex:1; background:#22c55e; border:none; color:white; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.8rem;">🤝 평화 제안</button>`
                        : `<button onclick="diplomacyDeclareWar(${n.id}, '${n.name}')" style="flex:1; background:#ef4444; border:none; color:white; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.8rem;">⚔️ 선전포고</button>`
                    }
                    <button onclick="diplomacyOpenTrade(${n.id}, '${n.name}')" style="flex:1; background:#f59e0b; border:none; color:white; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.8rem;">🪙 교역</button>
                </div>
            </div>`;
        }).join('');
    })
    .catch(() => {
        const list = document.getElementById('diplomacy-list');
        if (list) list.innerHTML = '<div style="color:#ef4444;">로드 실패. 로그인 상태를 확인하세요.</div>';
    });
}

function diplomacyDeclareWar(nationId, nationName) {
    if (!confirm(`정말로 ${nationName}에게 선전포고 하시겠습니까?`)) return;
    fetch('/api/diplomacy/declare_war', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ nation_id: nationId })
    })
    .then(r => r.json())
    .then(data => {
        showSplash(data.status === 'success' ? '선전포고!' : '실패', data.msg || data.status);
        loadDiplomacy();
    });
}

function diplomacyMakePeace(nationId, nationName) {
    if (!confirm(`${nationName}과(와) 평화 협정을 맺으시겠습니까?`)) return;
    fetch('/api/diplomacy/make_peace', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ nation_id: nationId })
    })
    .then(r => r.json())
    .then(data => {
        showSplash(data.status === 'success' ? '평화 협정' : '실패', data.msg || data.status);
        loadDiplomacy();
    });
}

function diplomacyOpenTrade(nationId, nationName) {
    const goldOffer = prompt(`${nationName}에게 금(Gold)을 얼마나 제공할까요? (자원을 얻습니다)`);
    if (!goldOffer || isNaN(goldOffer) || parseInt(goldOffer) <= 0) return;
    fetch('/api/diplomacy/trade', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ nation_id: nationId, gold_offer: parseInt(goldOffer) })
    })
    .then(r => r.json())
    .then(data => {
        showSplash(data.status === 'success' ? '교역 완료!' : '교역 실패', data.msg || data.status);
        if (data.status === 'success') fetchPlayerData();
    });
}

window.onload = () => {
    initSocket();
    init3D();
    setupTabs();
    fetchPlayerData(); // Initial fetch

    // Diplomacy tab: auto-load when tab is opened
    const dipBtn = document.querySelector('[data-target="tab-diplomacy"]');
    if (dipBtn) {
        dipBtn.addEventListener('click', () => setTimeout(loadDiplomacy, 100));
    }
};
