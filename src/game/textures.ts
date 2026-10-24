import * as THREE from 'three';

/**
 * Procedural High-Fidelity Canvas Texture Generator.
 * Generates rich, realistic PBR textures entirely in memory.
 * Zero external files, zero HTTP requests, 100% offline and instant.
 */

// Texture cache to prevent duplicate canvas allocations
const textureCache = new Map<string, THREE.CanvasTexture>();

function cacheTexture(key: string, fn: () => THREE.CanvasTexture): THREE.CanvasTexture {
  if (textureCache.has(key)) {
    return textureCache.get(key)!;
  }
  const tex = fn();
  textureCache.set(key, tex);
  return tex;
}

// Helper to configure realistic texture parameters
function setupTexture(texture: THREE.CanvasTexture, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

// --- 1. ZOMBIE ANATOMICAL TEXTURES ---

/** Decayed, rotting flesh with necrotic veins, open lacerations, and blood crusts */
export function createDecayedFleshTexture(
  type: 'walker' | 'runner' | 'spitter' | 'brute' = 'walker'
): THREE.CanvasTexture {
  return cacheTexture(`flesh_${type}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base flesh tone depending on archetype
    let baseColor = '#5c6358'; // Walker: sickly grayish green-brown
    let veinColor = 'rgba(74, 22, 40, 0.65)';
    let rotColor = '#2b3127';

    if (type === 'runner') {
      baseColor = '#6a2a2e'; // Runner: flayed sinewy crimson/brown
      veinColor = 'rgba(25, 4, 8, 0.8)';
      rotColor = '#3b1216';
    } else if (type === 'spitter') {
      baseColor = '#46592d'; // Spitter: toxic mossy bile green
      veinColor = 'rgba(132, 204, 22, 0.7)';
      rotColor = '#273812';
    } else if (type === 'brute') {
      baseColor = '#3a3e47'; // Brute: hardened leathery ashen gray
      veinColor = 'rgba(40, 20, 15, 0.7)';
      rotColor = '#1c1e24';
    }

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    // Micro skin noise / pores
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 45;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.8));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.7));
    }
    ctx.putImageData(imgData, 0, 0);

    // Necrotic dark patches (tissue decay)
    for (let p = 0; p < 24; p++) {
      const px = Math.random() * 512;
      const py = Math.random() * 512;
      const rad = 25 + Math.random() * 65;
      const grad = ctx.createRadialGradient(px, py, 2, px, py, rad);
      grad.addColorStop(0, rotColor);
      grad.addColorStop(0.7, 'rgba(40, 48, 36, 0.5)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Branching necrotic veins
    ctx.strokeStyle = veinColor;
    for (let v = 0; v < 18; v++) {
      let vx = Math.random() * 512;
      let vy = Math.random() * 512;
      ctx.lineWidth = 1 + Math.random() * 2.5;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      for (let s = 0; s < 5; s++) {
        vx += (Math.random() - 0.5) * 70;
        vy += (Math.random() - 0.5) * 70;
        ctx.lineTo(vx, vy);
      }
      ctx.stroke();
    }

    // Gory lacerations & coagulated blood crusts
    ctx.strokeStyle = '#5a0c0c';
    ctx.fillStyle = '#3a0606';
    for (let w = 0; w < 6; w++) {
      const wx = 60 + Math.random() * 392;
      const wy = 60 + Math.random() * 392;
      const len = 30 + Math.random() * 60;
      const angle = Math.random() * Math.PI * 2;

      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(angle);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, len / 2, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Blood splatter droplets around wound
      ctx.fillStyle = '#7f1d1d';
      for (let d = 0; d < 8; d++) {
        const dx = (Math.random() - 0.5) * (len * 1.4);
        const dy = (Math.random() - 0.5) * 30;
        const dr = 1.5 + Math.random() * 3.5;
        ctx.beginPath();
        ctx.arc(dx, dy, dr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    return setupTexture(new THREE.CanvasTexture(canvas));
  });
}

/** Weathered skeletal bone with marrow pores and fissures */
export function createBoneTexture(): THREE.CanvasTexture {
  return cacheTexture('bone_texture', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Aged ivory base
    ctx.fillStyle = '#dfdbcf';
    ctx.fillRect(0, 0, 256, 256);

    // Bone striations & dried blood yellowing
    for (let y = 0; y < 256; y += 4) {
      ctx.fillStyle = `rgba(180, 165, 140, ${0.15 + Math.random() * 0.2})`;
      ctx.fillRect(0, y, 256, 2);
    }

    // Micro cracks
    ctx.strokeStyle = '#6b5e4a';
    ctx.lineWidth = 1;
    for (let c = 0; c < 8; c++) {
      let cx = Math.random() * 256;
      let cy = Math.random() * 256;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let i = 0; i < 4; i++) {
        cx += (Math.random() - 0.5) * 30;
        cy += (Math.random() - 0.5) * 30;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // Dried blood stains on bone
    ctx.fillStyle = 'rgba(120, 25, 25, 0.45)';
    for (let s = 0; s < 5; s++) {
      const sx = Math.random() * 256;
      const sy = Math.random() * 256;
      ctx.beginPath();
      ctx.arc(sx, sy, 8 + Math.random() * 16, 0, Math.PI * 2);
      ctx.fill();
    }

    return setupTexture(new THREE.CanvasTexture(canvas));
  });
}

/** Tattered military/civilian cloth with weave, dirt grime, and blood soaking */
export function createZombieClothTexture(
  style: 'tactical' | 'hazmat' | 'civilian' | 'paramedic'
): THREE.CanvasTexture {
  return cacheTexture(`cloth_${style}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const colors: Record<string, string> = {
      tactical: '#272f2b', // Camo dark olive drab
      hazmat: '#c27803',   // Chemical hazard yellow-orange
      civilian: '#1e293b', // Desaturated torn denim / dark blue
      paramedic: '#0e4e48',// Biohazard teal
    };

    ctx.fillStyle = colors[style] || '#272f2b';
    ctx.fillRect(0, 0, 256, 256);

    // Fabric weave grid
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    for (let x = 0; x < 256; x += 4) {
      ctx.fillRect(x, 0, 2, 256);
    }
    for (let y = 0; y < 256; y += 4) {
      ctx.fillRect(0, y, 256, 2);
    }

    // Grime & soot marks
    for (let g = 0; g < 12; g++) {
      const gx = Math.random() * 256;
      const gy = Math.random() * 256;
      const grad = ctx.createRadialGradient(gx, gy, 1, gx, gy, 35);
      grad.addColorStop(0, 'rgba(15, 15, 18, 0.6)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gx, gy, 35, 0, Math.PI * 2);
      ctx.fill();
    }

    // Heavy blood saturation soaked into cloth
    ctx.fillStyle = 'rgba(90, 10, 10, 0.65)';
    for (let b = 0; b < 6; b++) {
      const bx = Math.random() * 256;
      const by = Math.random() * 256;
      ctx.beginPath();
      ctx.ellipse(bx, by, 20 + Math.random() * 30, 10 + Math.random() * 20, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    return setupTexture(new THREE.CanvasTexture(canvas));
  });
}

// --- 2. ENVIRONMENT PBR TEXTURES ---

/** Bunker: Polished wet reinforced concrete with damp sheen and seams */
export function createWetConcreteTexture(): THREE.CanvasTexture {
  return cacheTexture('bunker_wet_concrete', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Concrete base
    ctx.fillStyle = '#2f353d';
    ctx.fillRect(0, 0, 512, 512);

    // Aggregate specks & micro-grain
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const grain = (Math.random() - 0.5) * 32;
      data[i] = Math.min(255, Math.max(0, data[i] + grain));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain + 1));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain + 3));
    }
    ctx.putImageData(imgData, 0, 0);

    // Concrete slab panel joints (grid lines)
    ctx.strokeStyle = '#12151a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(256, 0);
    ctx.lineTo(256, 512);
    ctx.moveTo(0, 256);
    ctx.lineTo(512, 256);
    ctx.stroke();

    // Dark damp water puddles on concrete
    for (let p = 0; p < 6; p++) {
      const px = Math.random() * 512;
      const py = Math.random() * 512;
      const grad = ctx.createRadialGradient(px, py, 5, px, py, 60);
      grad.addColorStop(0, 'rgba(15, 18, 22, 0.75)');
      grad.addColorStop(0.8, 'rgba(25, 30, 36, 0.4)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, 60, 0, Math.PI * 2);
      ctx.fill();
    }

    // Subtle safety demarcation stripe along edge
    ctx.fillStyle = 'rgba(234, 179, 8, 0.4)';
    ctx.fillRect(0, 0, 16, 512);

    return setupTexture(new THREE.CanvasTexture(canvas));
  });
}

/** Bunker / Subway: Heavy rusted industrial iron plate with rivets */
export function createRustedSteelTexture(): THREE.CanvasTexture {
  return cacheTexture('rusted_steel', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dark oxidized iron plate
    ctx.fillStyle = '#26292e';
    ctx.fillRect(0, 0, 512, 512);

    // Corrosion / rust blooms
    for (let r = 0; r < 20; r++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      const rRad = 20 + Math.random() * 60;
      const grad = ctx.createRadialGradient(rx, ry, 2, rx, ry, rRad);
      grad.addColorStop(0, '#7c2d12'); // Deep rust
      grad.addColorStop(0.5, '#9a3412'); // Amber oxidation
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(rx, ry, rRad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Steel plate panel borders & rivets
    ctx.strokeStyle = '#111215';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 492, 492);

    // Rivet studs
    ctx.fillStyle = '#52525b';
    const rivetPositions = [30, 128, 256, 384, 482];
    for (const rx of rivetPositions) {
      for (const ry of [30, 482]) {
        ctx.beginPath();
        ctx.arc(rx, ry, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    return setupTexture(new THREE.CanvasTexture(canvas));
  });
}

/** Cemetery: Weathered gothic stone with lichen and moss patches */
export function createGothicStoneTexture(): THREE.CanvasTexture {
  return cacheTexture('gothic_stone', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Granite / slate stone base
    ctx.fillStyle = '#3f4247';
    ctx.fillRect(0, 0, 512, 512);

    // Noise / rough stone grain
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const grain = (Math.random() - 0.5) * 40;
      data[i] = Math.min(255, Math.max(0, data[i] + grain));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain + 2));
    }
    ctx.putImageData(imgData, 0, 0);

    // Deep fissures and cracks
    ctx.strokeStyle = '#1a1b1e';
    ctx.lineWidth = 2;
    for (let c = 0; c < 8; c++) {
      let cx = Math.random() * 512;
      let cy = Math.random() * 512;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let j = 0; j < 5; j++) {
        cx += (Math.random() - 0.5) * 60;
        cy += (Math.random() - 0.5) * 60;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // Organic green moss and lichen growth
    for (let m = 0; m < 14; m++) {
      const mx = Math.random() * 512;
      const my = Math.random() * 512;
      const mRad = 15 + Math.random() * 45;
      const grad = ctx.createRadialGradient(mx, my, 2, mx, my, mRad);
      grad.addColorStop(0, 'rgba(46, 80, 32, 0.7)');
      grad.addColorStop(0.6, 'rgba(65, 105, 45, 0.4)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(mx, my, mRad, 0, Math.PI * 2);
      ctx.fill();
    }

    return setupTexture(new THREE.CanvasTexture(canvas));
  });
}

/** Cemetery: Dark churned muddy graveyard earth with gravel */
export function createMudGroundTexture(): THREE.CanvasTexture {
  return cacheTexture('mud_ground', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dark damp soil
    ctx.fillStyle = '#221e1a';
    ctx.fillRect(0, 0, 512, 512);

    // Mud grain
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 30;
      data[i] = Math.min(255, Math.max(0, data[i] + noise + 2));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise - 2));
    }
    ctx.putImageData(imgData, 0, 0);

    // Waterlogged mud puddles
    for (let p = 0; p < 8; p++) {
      const px = Math.random() * 512;
      const py = Math.random() * 512;
      const pRad = 30 + Math.random() * 50;
      const grad = ctx.createRadialGradient(px, py, 2, px, py, pRad);
      grad.addColorStop(0, 'rgba(10, 8, 7, 0.85)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, pRad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Embedded small gravel stones
    ctx.fillStyle = '#5a554c';
    for (let s = 0; s < 70; s++) {
      const sx = Math.random() * 512;
      const sy = Math.random() * 512;
      const sr = 1.5 + Math.random() * 3.5;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    return setupTexture(new THREE.CanvasTexture(canvas));
  });
}

/** Subway: Glossy white/cream beveled subway tiles with stained dirty grout */
export function createSubwayTileTexture(): THREE.CanvasTexture {
  return cacheTexture('subway_tiles', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dark dirty grout base
    ctx.fillStyle = '#1c1f24';
    ctx.fillRect(0, 0, 512, 512);

    const tileW = 64;
    const tileH = 32;
    const gap = 3;

    for (let y = 0; y < 512; y += tileH) {
      const row = Math.floor(y / tileH);
      const offsetX = (row % 2) * (tileW / 2);

      for (let x = -tileW; x < 512 + tileW; x += tileW) {
        const tx = x + offsetX + gap;
        const ty = y + gap;
        const tw = tileW - gap * 2;
        const th = tileH - gap * 2;

        // Tile bevel gradient (gives realistic 3D raised tile look)
        const grad = ctx.createLinearGradient(tx, ty, tx + tw, ty + th);
        const variation = (Math.random() - 0.5) * 15;
        grad.addColorStop(0, `rgb(${210 + variation}, ${212 + variation}, ${205 + variation})`);
        grad.addColorStop(1, `rgb(${165 + variation}, ${168 + variation}, ${162 + variation})`);

        ctx.fillStyle = grad;
        ctx.fillRect(tx, ty, tw, th);
      }
    }

    // Grimy water stains running down tiles
    for (let d = 0; d < 12; d++) {
      const dx = Math.random() * 512;
      const dw = 15 + Math.random() * 30;
      const dh = 150 + Math.random() * 350;
      const dGrad = ctx.createLinearGradient(dx, 0, dx, dh);
      dGrad.addColorStop(0, 'rgba(40, 25, 10, 0.6)');
      dGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = dGrad;
      ctx.fillRect(dx, 0, dw, dh);
    }

    // Weathered spray graffiti tag
    ctx.save();
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.7)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(80, 240);
    ctx.lineTo(130, 210);
    ctx.lineTo(180, 270);
    ctx.lineTo(240, 220);
    ctx.stroke();
    ctx.restore();

    return setupTexture(new THREE.CanvasTexture(canvas));
  });
}

/** City: Dark rain-slicked asphalt with highway paint and oil slicks */
export function createAsphaltTexture(): THREE.CanvasTexture {
  return cacheTexture('asphalt', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base dark asphalt
    ctx.fillStyle = '#23252b';
    ctx.fillRect(0, 0, 512, 512);

    // Noise / grain
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const grain = (Math.random() - 0.5) * 35;
      data[i] = Math.min(255, Math.max(0, data[i] + grain));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain + 2));
    }
    ctx.putImageData(imgData, 0, 0);

    // Cracks
    ctx.strokeStyle = '#111216';
    ctx.lineWidth = 2.5;
    for (let c = 0; c < 6; c++) {
      ctx.beginPath();
      let x = Math.random() * 512;
      let y = Math.random() * 512;
      ctx.moveTo(x, y);
      for (let step = 0; step < 6; step++) {
        x += (Math.random() - 0.5) * 80;
        y += (Math.random() - 0.5) * 80;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Weathered yellow dashed lane markings
    ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
    ctx.fillRect(244, 20, 24, 100);
    ctx.fillRect(244, 180, 24, 100);
    ctx.fillRect(244, 340, 24, 100);

    // White boundary lines
    ctx.fillStyle = 'rgba(243, 244, 246, 0.75)';
    ctx.fillRect(16, 0, 14, 512);
    ctx.fillRect(482, 0, 14, 512);

    return setupTexture(new THREE.CanvasTexture(canvas));
  });
}

/** City: Concrete skyscraper facade with lit/broken windows and architectural details */
export function createBuildingFacadeTexture(style: number = 0): THREE.CanvasTexture {
  return cacheTexture(`building_facade_${style}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Concrete base
    const bases = ['#334155', '#242a35', '#3b4252'];
    ctx.fillStyle = bases[style % bases.length];
    ctx.fillRect(0, 0, 512, 512);

    // Horizontal joints
    ctx.strokeStyle = '#12141a';
    ctx.lineWidth = 3;
    for (let y = 0; y < 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Windows grid
    const cols = 8;
    const rows = 8;
    const w = 32;
    const h = 42;
    const padX = (512 - cols * w) / (cols + 1);
    const padY = (512 - rows * h) / (rows + 1);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = padX + c * (w + padX);
        const wy = padY + r * (h + padY);

        ctx.fillStyle = '#0f1115';
        ctx.fillRect(wx - 2, wy - 2, w + 4, h + 4);

        const rand = Math.random();
        if (rand < 0.15) {
          ctx.fillStyle = 'rgba(245, 170, 50, 0.9)'; // Emergency yellow-orange
        } else if (rand < 0.25) {
          ctx.fillStyle = 'rgba(70, 110, 160, 0.75)'; // Cool moonlight reflection
        } else if (rand < 0.35) {
          ctx.fillStyle = '#050608'; // Shattered
        } else {
          ctx.fillStyle = '#141720'; // Dark
        }
        ctx.fillRect(wx, wy, w, h);

        ctx.fillStyle = '#0f1115';
        ctx.fillRect(wx + w / 2 - 1, wy, 2, h);
        ctx.fillRect(wx, wy + h / 2 - 1, w, 2);
      }
    }

    // Grime streaks
    ctx.fillStyle = 'rgba(10, 10, 12, 0.45)';
    for (let i = 0; i < 16; i++) {
      const gx = Math.random() * 512;
      const gw = 10 + Math.random() * 30;
      const gh = 100 + Math.random() * 300;
      ctx.fillRect(gx, 0, gw, gh);
    }

    return setupTexture(new THREE.CanvasTexture(canvas));
  });
}

/** Hazard barricade texture with diagonal stripes and weathering */
export function createBarricadeTexture(): THREE.CanvasTexture {
  return cacheTexture('barricade_stripes', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(0, 0, 256, 256);

    const stripeWidth = 24;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 60, 256, 136);
    ctx.clip();

    for (let x = -256; x < 512; x += stripeWidth * 2) {
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(x, 60);
      ctx.lineTo(x + stripeWidth, 60);
      ctx.lineTo(x + stripeWidth - 40, 196);
      ctx.lineTo(x - 40, 196);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.moveTo(x + stripeWidth, 60);
      ctx.lineTo(x + stripeWidth * 2, 60);
      ctx.lineTo(x + stripeWidth * 2 - 40, 196);
      ctx.lineTo(x + stripeWidth - 40, 196);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = 'rgba(20, 20, 25, 0.5)';
    ctx.fillRect(0, 196, 256, 60);

    return setupTexture(new THREE.CanvasTexture(canvas));
  });
}

/** Stenciled military/supply crate texture */
export function createCrateTexture(label: string, color: string): THREE.CanvasTexture {
  return cacheTexture(`crate_${label}_${color}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#23262d';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = color;
    ctx.lineWidth = 12;
    ctx.strokeRect(10, 10, 236, 236);

    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.lineTo(236, 236);
    ctx.moveTo(236, 20);
    ctx.lineTo(20, 236);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 128, 128);

    return setupTexture(new THREE.CanvasTexture(canvas));
  });
}
