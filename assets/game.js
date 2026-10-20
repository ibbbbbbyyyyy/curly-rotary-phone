(() => {
  const world = document.getElementById("world");
  const overlay = document.getElementById("overlay");
  const startButton = document.getElementById("startButton");
  const errorMessage = document.getElementById("errorMessage");
  if (!world || !overlay || !startButton) return;

  if (!window.THREE) {
    errorMessage.hidden = false;
    errorMessage.textContent = "The 3D engine did not load. Check your internet connection, then refresh this page.";
    startButton.addEventListener("click", () => {
      errorMessage.textContent = "DEPLOY needs the 3D engine. Connect to the internet and refresh the page, then try again.";
      errorMessage.hidden = false;
    });
    return;
  }

  const T = window.THREE;
  const scene = new T.Scene();
  scene.background = new T.Color(0x090f18);
  scene.fog = new T.Fog(0x090f18, 27, 75);

  const camera = new T.PerspectiveCamera(76, window.innerWidth / window.innerHeight, 0.1, 110);
  camera.position.set(0, 1.65, 25);
  camera.rotation.order = "YXZ";
  scene.add(camera);

  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputEncoding = T.sRGBEncoding;
  world.appendChild(renderer.domElement);

  scene.add(new T.HemisphereLight(0xa8d7ec, 0x1a202b, 1.35));
  const keyLight = new T.DirectionalLight(0xffe8d0, 2.0);
  keyLight.position.set(-12, 25, 8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);
  const cyanLight = new T.PointLight(0x44d9ef, 2.4, 28);
  cyanLight.position.set(-24, 5, -20);
  scene.add(cyanLight);
  const redLight = new T.PointLight(0xff435e, 2.1, 28);
  redLight.position.set(24, 5, 18);
  scene.add(redLight);

  // A small procedural concrete texture keeps the arena detailed without extra downloads.
  const concreteCanvas = document.createElement("canvas");
  concreteCanvas.width = concreteCanvas.height = 512;
  const concreteCtx = concreteCanvas.getContext("2d");
  concreteCtx.fillStyle = "#39434b";
  concreteCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 18000; i += 1) {
    const shade = Math.random() > 0.5 ? 255 : 0;
    concreteCtx.fillStyle = `rgba(${shade},${shade},${shade},${Math.random() * 0.055})`;
    const size = Math.random() * 2 + 0.4;
    concreteCtx.fillRect(Math.random() * 512, Math.random() * 512, size, size);
  }
  for (let i = 0; i < 34; i += 1) {
    const x = Math.random() * 512;
    concreteCtx.strokeStyle = "rgba(10,16,20,.12)";
    concreteCtx.lineWidth = 1 + Math.random() * 2;
    concreteCtx.beginPath();
    concreteCtx.moveTo(x, Math.random() * 512);
    concreteCtx.lineTo(x + (Math.random() - 0.5) * 12, Math.random() * 512);
    concreteCtx.stroke();
  }
  const concreteTexture = new T.CanvasTexture(concreteCanvas);
  concreteTexture.wrapS = concreteTexture.wrapT = T.RepeatWrapping;
  concreteTexture.repeat.set(6, 6);
  concreteTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const floor = new T.Mesh(
    new T.PlaneGeometry(70, 70),
    new T.MeshStandardMaterial({ map: concreteTexture, bumpMap: concreteTexture, bumpScale: 0.075, color: 0xc2c8cc, roughness: 0.96, metalness: 0.02 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.08;
  floor.receiveShadow = true;
  scene.add(floor);
  const floorMarkMaterial = new T.MeshStandardMaterial({ color: 0xc58f43, roughness: 0.85, metalness: 0.05 });
  for (const [x, z, width, depth] of [[0, -30, 24, 0.12], [0, 30, 24, 0.12], [-30, 0, 0.12, 24], [30, 0, 0.12, 24]]) {
    const stripe = new T.Mesh(new T.BoxGeometry(width, 0.012, depth), floorMarkMaterial);
    stripe.position.set(x, -0.064, z);
    scene.add(stripe);
  }

  const colliders = [];
  const shootables = [];
  const boxData = [];
  function makeBox(name, x, y, z, sx, sy, sz, color, collidable = true, emissive = 0x000000) {
    const material = new T.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.28, emissive, emissiveIntensity: 0.35 });
    const mesh = new T.Mesh(new T.BoxGeometry(sx, sy, sz), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = sy > 1;
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (collidable) {
      colliders.push(mesh);
      shootables.push(mesh);
      boxData.push({ minX: x - sx / 2, maxX: x + sx / 2, minZ: z - sz / 2, maxZ: z + sz / 2 });
    }
    return mesh;
  }

  // Enclosed arena and chunky cover.
  makeBox("Back wall", 0, 3, -35, 70, 6, 1, 0x263647);
  makeBox("Front wall", 0, 3, 35, 70, 6, 1, 0x263647);
  makeBox("Left wall", -35, 3, 0, 1, 6, 70, 0x263647);
  makeBox("Right wall", 35, 3, 0, 1, 6, 70, 0x263647);
  makeBox("Cover A", -18, 1.4, -12, 7, 2.8, 4, 0x455a70);
  makeBox("Cover B", 14, 1.4, -17, 8, 2.8, 4, 0x455a70);
  makeBox("Cover C", -5, 1.2, -1, 4, 2.4, 8, 0x394e63);
  makeBox("Cover D", 20, 1.2, 8, 4, 2.4, 8, 0x394e63);
  makeBox("Cover E", -22, 1.2, 17, 8, 2.4, 4, 0x394e63);
  makeBox("Center block", 5, 0.8, -22, 5, 1.6, 5, 0x526276, true, 0x102633);

  // Recessed wall ribs and practical arena floodlights add scale and depth.
  const ribMaterial = new T.MeshStandardMaterial({ color: 0x17232c, roughness: 0.82, metalness: 0.38 });
  const trimMaterial = new T.MeshStandardMaterial({ color: 0x89949b, roughness: 0.48, metalness: 0.62 });
  for (const z of [-34.35, 34.35]) {
    for (let x = -30; x <= 30; x += 10) {
      const rib = new T.Mesh(new T.BoxGeometry(0.22, 5.7, 0.32), ribMaterial);
      rib.position.set(x, 2.9, z); rib.castShadow = true; scene.add(rib);
    }
    const rail = new T.Mesh(new T.BoxGeometry(70, 0.18, 0.22), trimMaterial);
    rail.position.set(0, 5.8, z); scene.add(rail);
  }
  for (const x of [-34.35, 34.35]) {
    for (let z = -30; z <= 30; z += 10) {
      const rib = new T.Mesh(new T.BoxGeometry(0.32, 5.7, 0.22), ribMaterial);
      rib.position.set(x, 2.9, z); rib.castShadow = true; scene.add(rib);
    }
  }
  for (const [x, z] of [[-25, -25], [25, -25], [-25, 25], [25, 25]]) {
    const fixture = new T.Mesh(new T.BoxGeometry(1.15, 0.22, 0.65), new T.MeshStandardMaterial({ color: 0xdce4e4, emissive: 0x7c9ba0, emissiveIntensity: 0.55, roughness: 0.35 }));
    fixture.position.set(x, 5.1, z); scene.add(fixture);
    const flood = new T.SpotLight(0xd4e9f2, 38, 34, Math.PI / 4, 0.55, 1.5);
    flood.position.set(x, 4.95, z); flood.target.position.set(x * 0.35, 0, z * 0.35);
    scene.add(flood, flood.target);
  }

  // Neon arena markers.
  for (const [x, z, color] of [[-30, -30, 0x40d8e9], [30, 30, 0xff4965], [-30, 30, 0xff4965], [30, -30, 0x40d8e9]]) {
    const lamp = new T.Mesh(new T.BoxGeometry(0.18, 3.5, 0.18), new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5 }));
    lamp.position.set(x, 1.75, z);
    scene.add(lamp);
  }

  const weapons = [
    { name: "AR-9 RIFLE", label: "RIFLE", damage: 24, interval: 0.12, mag: 30, reserve: 120, range: 58, spread: 0.014, pellets: 1, reload: 1.45, length: 0.62, width: 0.28, color: 0x5bdfe8 },
    { name: "BREACH SHOTGUN", label: "SHOTGUN", damage: 9, interval: 0.72, mag: 6, reserve: 36, range: 22, spread: 0.11, pellets: 8, reload: 1.65, length: 0.48, width: 0.36, color: 0xffa15f },
    { name: "LONGSHOT SNIPER", label: "SNIPER", damage: 92, interval: 1.05, mag: 5, reserve: 25, range: 82, spread: 0.002, pellets: 1, reload: 1.9, length: 0.82, width: 0.24, color: 0xb28bff },
    { name: "SIDEARM PISTOL", label: "PISTOL", damage: 27, interval: 0.3, mag: 12, reserve: 72, range: 42, spread: 0.022, pellets: 1, reload: 1.1, length: 0.34, width: 0.23, color: 0xf1d77a }
  ];
  let ammo = [];
  let selectedWeapon = 0;
  let weaponGroup = null;
  let recoil = 0;
  let bots = [];
  let state = "menu";
  let health = 100;
  let kos = 0;
  let wave = 1;
  let seconds = 0;
  let roundDelay = 0;
  let fireCooldown = 0;
  let mouseDown = false;
  let yaw = 0;
  let pitch = 0;
  let lastTime = 0;
  let damageFlashTimer = 0;
  let messageTimer = 0;
  let message = "";
  let best = 0;
  try { best = Number(localStorage.getItem("rivals3dBest") || 0); } catch (_) {}

  const ui = {
    wave: document.getElementById("wave"), kos: document.getElementById("kos"), timer: document.getElementById("timer"),
    health: document.getElementById("health"), healthBar: document.getElementById("healthBar"), ammo: document.getElementById("ammo"),
    reserve: document.getElementById("reserve"), weaponName: document.getElementById("weaponName"), match: document.getElementById("matchMessage"),
    overlayTitle: document.getElementById("menuTitle"), overlayText: document.getElementById("menuText"), damageFlash: document.getElementById("damageFlash"),
    center: document.getElementById("centerMessage")
  };

  function setMessage(text, duration = 1.1) {
    message = text;
    messageTimer = duration;
    ui.center.textContent = text;
    ui.center.hidden = false;
  }

  function updateHud() {
    ui.wave.textContent = String(wave).padStart(2, "0");
    ui.kos.textContent = String(kos).padStart(2, "0");
    ui.health.textContent = String(Math.ceil(health));
    ui.healthBar.style.width = Math.max(0, health) + "%";
    ui.healthBar.style.background = health < 35 ? "#ff526b" : "linear-gradient(90deg,#ff526b,#ff9862)";
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    ui.timer.textContent = m + ":" + s;
    const current = weapons[selectedWeapon];
    ui.weaponName.textContent = current.name;
    ui.ammo.textContent = String(ammo[selectedWeapon]?.clip ?? current.mag).padStart(2, "0");
    ui.reserve.textContent = String(ammo[selectedWeapon]?.reserve ?? current.reserve).padStart(2, "0");
  }

  function makeWeaponModel(index) {
    if (weaponGroup) camera.remove(weaponGroup);
    const definition = weapons[index];
    const group = new T.Group();
    const bodyMat = new T.MeshStandardMaterial({ color: 0x354452, metalness: 0.7, roughness: 0.32 });
    const accentMat = new T.MeshStandardMaterial({ color: definition.color, emissive: definition.color, emissiveIntensity: 0.75, metalness: 0.25, roughness: 0.35 });
    const gripMat = new T.MeshStandardMaterial({ color: 0x161d25, roughness: 0.85 });
    const body = new T.Mesh(new T.BoxGeometry(definition.width, 0.18, definition.length), bodyMat);
    body.position.set(0.35, -0.31, -0.68);
    group.add(body);
    const barrel = new T.Mesh(new T.CylinderGeometry(0.035, 0.05, definition.length * 0.72, 8), bodyMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.35, -0.27, -0.68 - definition.length * 0.45);
    group.add(barrel);
    const rail = new T.Mesh(new T.BoxGeometry(definition.width * 0.48, 0.055, definition.length * 0.42), accentMat);
    rail.position.set(0.35, -0.19, -0.69);
    group.add(rail);
    const grip = new T.Mesh(new T.BoxGeometry(0.11, 0.25, 0.14), gripMat);
    grip.position.set(0.36, -0.48, -0.48);
    grip.rotation.x = -0.2;
    group.add(grip);
    const muzzle = new T.PointLight(definition.color, 0, 3);
    muzzle.position.set(0.35, -0.27, -0.68 - definition.length * 0.85);
    group.add(muzzle);
    group.userData.muzzle = muzzle;
    camera.add(group);
    weaponGroup = group;
  }

  function selectWeapon(index) {
    if (index < 0 || index >= weapons.length) return;
    selectedWeapon = index;
    document.querySelectorAll(".weapon-card").forEach(button => {
      button.classList.toggle("selected", Number(button.dataset.weapon) === index);
    });
    makeWeaponModel(index);
    updateHud();
  }

  function addBot(x, z, index) {
    const group = new T.Group();
    const bodyMaterial = new T.MeshStandardMaterial({ color: index % 2 ? 0x80505a : 0x98615d, roughness: 0.82, metalness: 0.08 });
    const darkMaterial = new T.MeshStandardMaterial({ color: 0x303a40, roughness: 0.88, metalness: 0.12 });
    const armorMaterial = new T.MeshStandardMaterial({ color: index % 2 ? 0x59626a : 0x6a665b, roughness: 0.7, metalness: 0.28 });
    const eyeMaterial = new T.MeshStandardMaterial({ color: 0xffdfe2, emissive: 0xff425f, emissiveIntensity: 0.65 });
    const bot = { group, hp: 100, maxHp: 100, cooldown: 1.2 + Math.random() * 1.5, phase: Math.random() * 6.28, alive: true };
    const parts = [];
    function part(geometry, material, px, py, pz, isHead = false) {
      const mesh = new T.Mesh(geometry, material);
      mesh.position.set(px, py, pz);
      mesh.castShadow = true;
      mesh.userData.bot = bot;
      mesh.userData.isHead = isHead;
      group.add(mesh);
      parts.push(mesh);
      shootables.push(mesh);
      return mesh;
    }
    part(new T.CylinderGeometry(0.34, 0.28, 1.02, 14), bodyMaterial, 0, 1.32, 0);
    part(new T.SphereGeometry(0.3, 16, 12), bodyMaterial, 0, 2.06, 0, true);
    const helmet = part(new T.SphereGeometry(0.34, 16, 10), armorMaterial, 0, 2.2, 0.02);
    helmet.scale.set(1.08, 0.63, 1.06);
    part(new T.BoxGeometry(0.47, 0.07, 0.08), armorMaterial, 0, 2.08, -0.3);
    part(new T.BoxGeometry(0.11, 0.075, 0.035), eyeMaterial, -0.12, 2.06, -0.342);
    part(new T.BoxGeometry(0.11, 0.075, 0.035), eyeMaterial, 0.12, 2.06, -0.342);
    part(new T.BoxGeometry(0.5, 0.57, 0.16), armorMaterial, 0, 1.39, -0.19);
    part(new T.BoxGeometry(0.12, 0.42, 0.07), darkMaterial, -0.12, 1.39, -0.28);
    part(new T.BoxGeometry(0.12, 0.42, 0.07), darkMaterial, 0.12, 1.39, -0.28);
    const armL = part(new T.CylinderGeometry(0.13, 0.17, 0.75, 10), darkMaterial, -0.55, 1.3, -0.03);
    armL.rotation.z = -0.14;
    const armR = part(new T.CylinderGeometry(0.13, 0.17, 0.75, 10), darkMaterial, 0.55, 1.3, -0.03);
    armR.rotation.z = 0.14;
    part(new T.CylinderGeometry(0.16, 0.14, 0.7, 10), darkMaterial, -0.21, 0.42, 0);
    part(new T.CylinderGeometry(0.16, 0.14, 0.7, 10), darkMaterial, 0.21, 0.42, 0);
    group.position.set(x, 0, z);
    scene.add(group);
    bot.parts = parts;
    bots.push(bot);
    return bot;
  }

  function spawnWave() {
    const points = [[-23, -23], [22, -26], [0, -29], [-27, -7], [27, -3], [-14, 1], [12, -15], [0, -6], [22, 17], [-23, 23]];
    const count = Math.min(2 + wave, 8);
    for (let i = 0; i < count; i += 1) addBot(points[i][0], points[i][1], i);
    ui.wave.textContent = String(wave).padStart(2, "0");
  }

  function removeBot(bot) {
    bot.alive = false;
    scene.remove(bot.group);
    for (const part of bot.parts) {
      const index = shootables.indexOf(part);
      if (index >= 0) shootables.splice(index, 1);
    }
    const index = bots.indexOf(bot);
    if (index >= 0) bots.splice(index, 1);
  }

  function clearBots() {
    for (const bot of [...bots]) removeBot(bot);
  }

  function startGame() {
    const wasPaused = state === "paused";
    if (!wasPaused) {
      clearBots();
      bulletsCleanup();
      health = 100;
      kos = 0;
      wave = 1;
      seconds = 0;
      yaw = 0;
      pitch = 0;
      camera.position.set(0, 1.65, 25);
      camera.rotation.set(0, 0, 0, "YXZ");
      ammo = weapons.map(weapon => ({ clip: weapon.mag, reserve: weapon.reserve, reloadLeft: 0 }));
      spawnWave();
    }
    state = "playing";
    ui.match.textContent = "FIGHT LIVE";
    overlay.hidden = true;
    try { renderer.domElement.requestPointerLock(); } catch (_) {}
    updateHud();
  }

  const activeBullets = [];
  function bulletsCleanup() {
    for (const bullet of activeBullets) scene.remove(bullet.line);
    activeBullets.length = 0;
  }

  function showOverlay(title, text, buttonText) {
    ui.overlayTitle.innerHTML = title;
    ui.overlayText.textContent = text;
    startButton.innerHTML = buttonText + " <span>→</span>";
    overlay.hidden = false;
  }

  function gameOver() {
    state = "over";
    mouseDown = false;
    document.exitPointerLock?.();
    if (kos > best) {
      best = kos;
      try { localStorage.setItem("rivals3dBest", String(best)); } catch (_) {}
    }
    ui.match.textContent = "MATCH COMPLETE";
    showOverlay("MATCH <span>OVER</span>", "You earned " + kos + " KO" + (kos === 1 ? "" : "s") + " and reached wave " + wave + ". Ready to jump back in?", "PLAY AGAIN");
  }

  function collisionAt(x, z, radius) {
    if (x < -33.7 + radius || x > 33.7 - radius || z < -33.7 + radius || z > 33.7 - radius) return true;
    return boxData.some(box => x + radius > box.minX && x - radius < box.maxX && z + radius > box.minZ && z - radius < box.maxZ);
  }

  function tryMove(pos, dx, dz, radius) {
    const nextX = pos.x + dx;
    if (!collisionAt(nextX, pos.z, radius)) pos.x = nextX;
    const nextZ = pos.z + dz;
    if (!collisionAt(pos.x, nextZ, radius)) pos.z = nextZ;
  }

  function createTracer(start, end, color) {
    const geometry = new T.BufferGeometry().setFromPoints([start.clone(), end.clone()]);
    const line = new T.Line(geometry, new T.LineBasicMaterial({ color, transparent: true, opacity: 0.95 }));
    scene.add(line);
    activeBullets.push({ line, life: 0.065 });
  }

  const raycaster = new T.Raycaster();
  function fireWeapon() {
    if (state !== "playing" || fireCooldown > 0) return;
    const definition = weapons[selectedWeapon];
    const magazine = ammo[selectedWeapon];
    if (!magazine || magazine.reloadLeft > 0) return;
    if (magazine.clip <= 0) { reloadWeapon(); return; }
    magazine.clip -= 1;
    fireCooldown = definition.interval;
    recoil = 0.09;
    if (weaponGroup?.userData.muzzle) weaponGroup.userData.muzzle.intensity = 4;

    const forward = camera.getWorldDirection(new T.Vector3()).normalize();
    const right = new T.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
    const up = new T.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
    let tracerEnd = camera.position.clone().addScaledVector(forward, definition.range);
    let anyHit = false;
    for (let i = 0; i < definition.pellets; i += 1) {
      const direction = forward.clone()
        .addScaledVector(right, (Math.random() - 0.5) * definition.spread)
        .addScaledVector(up, (Math.random() - 0.5) * definition.spread)
        .normalize();
      raycaster.set(camera.position, direction);
      raycaster.near = 0.1;
      raycaster.far = definition.range;
      const hit = raycaster.intersectObjects(shootables, false)[0];
      if (!hit) continue;
      if (i === 0) tracerEnd = hit.point.clone();
      const bot = hit.object.userData.bot;
      if (bot && bot.alive) {
        bot.hp -= definition.damage * (hit.object.userData.isHead ? 1.35 : 1);
        anyHit = true;
        if (bot.hp <= 0) {
          removeBot(bot);
          kos += 1;
          setMessage("KO +1", 0.7);
          ui.kos.textContent = String(kos).padStart(2, "0");
        } else {
          setMessage("HIT", 0.35);
        }
      }
    }
    createTracer(camera.position.clone(), tracerEnd, anyHit ? 0x78f5ff : definition.color);
    updateHud();
  }

  function reloadWeapon() {
    const definition = weapons[selectedWeapon];
    const magazine = ammo[selectedWeapon];
    if (!magazine || magazine.reloadLeft > 0 || magazine.clip >= definition.mag || magazine.reserve <= 0) return;
    magazine.reloadLeft = definition.reload;
    setMessage("RELOADING", definition.reload);
  }

  function hasLineOfSight(bot, distance) {
    const origin = bot.group.position.clone().add(new T.Vector3(0, 1.45, 0));
    const target = camera.position.clone();
    const direction = target.sub(origin);
    raycaster.set(origin, direction.clone().normalize());
    raycaster.near = 0.1;
    raycaster.far = Math.max(0.1, distance - 0.7);
    return raycaster.intersectObjects(colliders, false).length === 0;
  }

  function damagePlayer(amount) {
    health = Math.max(0, health - amount);
    damageFlashTimer = 0.22;
    ui.damageFlash.classList.add("visible");
    updateHud();
    if (health <= 0) gameOver();
  }

  function updateBots(dt) {
    for (const bot of bots) {
      bot.cooldown -= dt;
      const pos = bot.group.position;
      const dx = camera.position.x - pos.x;
      const dz = camera.position.z - pos.z;
      const distance = Math.hypot(dx, dz) || 1;
      const ux = dx / distance;
      const uz = dz / distance;
      const approach = distance > 9 ? 1 : distance < 5.5 ? -0.55 : 0;
      const strafe = Math.sin(seconds * 1.2 + bot.phase) * 0.42;
      let vx = ux * approach - uz * strafe;
      let vz = uz * approach + ux * strafe;
      const length = Math.hypot(vx, vz) || 1;
      const speed = 2.3 + Math.min(wave, 6) * 0.12;
      tryMove(pos, vx / length * speed * dt, vz / length * speed * dt, 0.62);
      bot.group.lookAt(camera.position.x, 1.2, camera.position.z);
      if (bot.cooldown <= 0 && distance < 31 && hasLineOfSight(bot, distance)) {
        bot.cooldown = 2.65 + Math.random() * 0.75;
        damagePlayer(5);
        const origin = pos.clone().add(new T.Vector3(0, 1.55, 0));
        createTracer(origin, camera.position.clone(), 0xff526b);
        if (state !== "playing") return;
      }
    }
  }

  function updateMovement(dt) {
    const forwardInput = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
    const sideInput = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
    if (forwardInput === 0 && sideInput === 0) return;
    const length = Math.hypot(forwardInput, sideInput);
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    const speed = keys.has("shift") ? 8.0 : 5.6;
    const dx = (forwardX * forwardInput + rightX * sideInput) / length * speed * dt;
    const dz = (forwardZ * forwardInput + rightZ * sideInput) / length * speed * dt;
    tryMove(camera.position, dx, dz, 0.48);
  }

  function update(dt) {
    if (state !== "playing") return;
    seconds += dt;
    fireCooldown = Math.max(0, fireCooldown - dt);
    recoil = Math.max(0, recoil - dt * 0.65);
    if (weaponGroup) {
      weaponGroup.position.z = recoil;
      if (weaponGroup.userData.muzzle) weaponGroup.userData.muzzle.intensity = Math.max(0, weaponGroup.userData.muzzle.intensity - dt * 35);
    }
    for (const magazine of ammo) {
      if (magazine.reloadLeft > 0) {
        magazine.reloadLeft = Math.max(0, magazine.reloadLeft - dt);
        if (magazine.reloadLeft === 0) {
          const definition = weapons[ammo.indexOf(magazine)];
          const needed = definition.mag - magazine.clip;
          const loaded = Math.min(needed, magazine.reserve);
          magazine.clip += loaded;
          magazine.reserve -= loaded;
        }
      }
    }
    if (mouseDown) fireWeapon();
    updateMovement(dt);
    updateBots(dt);

    for (let i = activeBullets.length - 1; i >= 0; i -= 1) {
      activeBullets[i].life -= dt;
      if (activeBullets[i].life <= 0) {
        scene.remove(activeBullets[i].line);
        activeBullets.splice(i, 1);
      }
    }
    if (damageFlashTimer > 0) {
      damageFlashTimer -= dt;
      if (damageFlashTimer <= 0) ui.damageFlash.classList.remove("visible");
    }
    if (messageTimer > 0) {
      messageTimer -= dt;
      if (messageTimer <= 0) ui.center.hidden = true;
    }
    if (bots.length === 0) {
      roundDelay += dt;
      if (roundDelay > 1.8) {
        wave += 1;
        roundDelay = 0;
        health = Math.min(100, health + 18);
        spawnWave();
        setMessage("WAVE " + wave, 1.2);
        updateHud();
      }
    } else roundDelay = 0;
    updateHud();
  }

  const keys = new Set();
  document.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    keys.add(key);
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key) && state === "playing") event.preventDefault();
    if (key === "r") reloadWeapon();
    if (key >= "1" && key <= "4") selectWeapon(Number(key) - 1);
  });
  document.addEventListener("keyup", event => keys.delete(event.key.toLowerCase()));
  window.addEventListener("blur", () => { keys.clear(); mouseDown = false; });
  document.addEventListener("mousemove", event => {
    if (state !== "playing") return;
    // Use relative mouse movement both with pointer lock and as a browser-safe fallback.
    yaw -= event.movementX * 0.0022;
    pitch -= event.movementY * 0.0022;
    pitch = Math.max(-1.32, Math.min(1.32, pitch));
    camera.rotation.set(pitch, yaw, 0, "YXZ");
  });
  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === renderer.domElement) {
      if (state === "paused") {
        state = "playing";
        overlay.hidden = true;
        ui.match.textContent = "FIGHT LIVE";
      }
    } else if (state === "playing") {
      state = "paused";
      mouseDown = false;
      ui.match.textContent = "PAUSED";
      showOverlay("GAME <span>PAUSED</span>", "Click resume to return to the arena.", "RESUME");
    }
  });
  renderer.domElement.addEventListener("mousedown", event => {
    if (event.button === 0 && state === "playing") {
      mouseDown = true;
      fireWeapon();
    }
  });
  document.addEventListener("mouseup", event => { if (event.button === 0) mouseDown = false; });
  renderer.domElement.addEventListener("click", () => {
    if (state === "playing" && document.pointerLockElement !== renderer.domElement) {
      try {
        const request = renderer.domElement.requestPointerLock();
        if (request && typeof request.catch === "function") request.catch(() => {});
      } catch (_) {}
    }
  });
  renderer.domElement.addEventListener("contextmenu", event => event.preventDefault());
  startButton.addEventListener("click", startGame);
  document.getElementById("reloadButton").addEventListener("click", reloadWeapon);
  document.querySelectorAll(".weapon-card").forEach(button => {
    button.addEventListener("click", () => selectWeapon(Number(button.dataset.weapon)));
  });
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  });

  function frame(now) {
    const dt = Math.min(0.05, lastTime ? (now - lastTime) / 1000 : 0);
    lastTime = now;
    update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  makeWeaponModel(0);
  updateHud();
  requestAnimationFrame(frame);
})();
