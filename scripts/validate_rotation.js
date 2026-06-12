// Validates the new rotation engine logic before embedding in index.html
const FACE_NAMES = ['front', 'back', 'right', 'left', 'top', 'bottom'];
const FACE_BASIS = {
    front:  { n: [0, 0, 1],  r: [1, 0, 0],  u: [0, 1, 0] },
    back:   { n: [0, 0, -1], r: [-1, 0, 0], u: [0, 1, 0] },
    right:  { n: [1, 0, 0],  r: [0, 0, -1], u: [0, 1, 0] },
    left:   { n: [-1, 0, 0], r: [0, 0, 1],  u: [0, 1, 0] },
    top:    { n: [0, -1, 0], r: [1, 0, 0],  u: [0, 0, -1] },
    bottom: { n: [0, 1, 0],  r: [1, 0, 0],  u: [0, 0, 1] }
};
const CUBE_AXES = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };

function vecDot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function vecAdd(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function vecScale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function vecSub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function slotKey(f, i) { return `${f}:${i}`; }

function slotPos(face, idx) {
    const row = Math.floor(idx / 3), col = idx % 3;
    const u = col - 1, v = 1 - row;
    const b = FACE_BASIS[face];
    return vecAdd(vecScale(b.n, 1.5), vecAdd(vecScale(b.r, u), vecScale(b.u, v)));
}

function rotateAroundAxis(vec, axis, angle) {
    const [x, y, z] = vec, [ax, ay, az] = axis;
    const c = Math.cos(angle), s = Math.sin(angle), oc = 1 - c;
    return [
        x * (c + oc * ax * ax) + y * (oc * ax * ay - s * az) + z * (oc * ax * az + s * ay),
        x * (oc * ax * ay + s * az) + y * (c + oc * ay * ay) + z * (oc * ay * az - s * ax),
        x * (oc * ax * az - s * ay) + y * (oc * ay * az + s * ax) + z * (c + oc * az * az)
    ];
}

function locateSticker(pos) {
    let best = null, bestDist = Infinity;
    for (const face of FACE_NAMES) {
        const basis = FACE_BASIS[face];
        if (vecDot(pos, basis.n) <= 0.5) continue;
        const rel = vecSub(pos, vecScale(basis.n, 1.5));
        const u = vecDot(rel, basis.r), v = vecDot(rel, basis.u);
        const col = Math.max(0, Math.min(2, Math.round(u + 1)));
        const row = Math.max(0, Math.min(2, Math.round(1 - v)));
        const dist = Math.abs(u - (col - 1)) + Math.abs(v - (1 - row));
        if (dist < bestDist) { bestDist = dist; best = { face, idx: row * 3 + col }; }
    }
    return best;
}

function buildXLayerPerm(layerVal, sign) {
    const col = layerVal + 1;
    const flow = {
        [`front:${col}`]: `top:${col}`,
        [`top:${col}`]: `back:${col}`,
        [`back:${col}`]: `bottom:${col}`,
        [`bottom:${col}`]: `front:${col + 6}`,
        [`front:${col + 6}`]: `bottom:${col + 6}`,
        [`bottom:${col + 6}`]: `back:${col + 6}`,
        [`back:${col + 6}`]: `top:${col + 6}`,
        [`top:${col + 6}`]: `front:${col}`,
        [`front:${col + 3}`]: `top:${col + 3}`,
        [`top:${col + 3}`]: `back:${col + 3}`,
        [`back:${col + 3}`]: `bottom:${col + 3}`,
        [`bottom:${col + 3}`]: `front:${col + 3}`
    };
    const mapping = sign > 0 ? flow : Object.fromEntries(Object.entries(flow).map(([s, d]) => [d, s]));
    const perm = {};
    FACE_NAMES.forEach(f => { for (let i = 0; i < 9; i++) perm[slotKey(f, i)] = slotKey(f, i); });
    Object.entries(mapping).forEach(([src, dest]) => { perm[dest] = src; });
    return perm;
}

function buildRodriguesPerm(axisName, layerVal, sign) {
    const axis = CUBE_AXES[axisName];
    const angle = sign * Math.PI / 2;
    const perm = {};
    FACE_NAMES.forEach(f => { for (let i = 0; i < 9; i++) perm[slotKey(f, i)] = slotKey(f, i); });
    FACE_NAMES.forEach(face => {
        for (let idx = 0; idx < 9; idx++) {
            const pos = slotPos(face, idx);
            if (Math.abs(vecDot(pos, axis) - layerVal) > 0.55) continue;
            const dest = locateSticker(rotateAroundAxis(pos, axis, angle));
            if (dest) perm[slotKey(dest.face, dest.idx)] = slotKey(face, idx);
        }
    });
    return perm;
}

function buildLayerPerm(axisName, layerVal, sign) {
    return axisName === 'x' ? buildXLayerPerm(layerVal, sign) : buildRodriguesPerm(axisName, layerVal, sign);
}

function transformVector(vec, rx, ry) {
    const rxd = rx * Math.PI / 180, ryd = ry * Math.PI / 180;
    let x = vec[0], y = vec[1], z = vec[2];
    const x1 = x * Math.cos(ryd) + z * Math.sin(ryd);
    z = -x * Math.sin(ryd) + z * Math.cos(ryd);
    x = x1;
    const y1 = y * Math.cos(rxd) - z * Math.sin(rxd);
    z = y * Math.sin(rxd) + z * Math.cos(rxd);
    return { x, y: y1, z };
}

function inverseTransformVector(vec, rx, ry) {
    const rxd = -rx * Math.PI / 180, ryd = -ry * Math.PI / 180;
    let x = vec.x, y = vec.y, z = vec.z;
    const y1 = y * Math.cos(rxd) - z * Math.sin(rxd);
    z = y * Math.sin(rxd) + z * Math.cos(rxd);
    y = y1;
    const x1 = x * Math.cos(ryd) + z * Math.sin(ryd);
    z = -x * Math.sin(ryd) + z * Math.cos(ryd);
    return [x1, y, z];
}

function nearestAxis(vec) {
    let name = 'x', best = -1, sign = 1;
    for (const [n, a] of Object.entries(CUBE_AXES)) {
        const d = vecDot(vec, a);
        if (Math.abs(d) > best) { best = Math.abs(d); name = n; sign = d >= 0 ? 1 : -1; }
    }
    return { name, axis: vecScale(CUBE_AXES[name], sign), layerAxis: CUBE_AXES[name] };
}

function getAllStickers() {
    const out = [];
    FACE_NAMES.forEach(face => {
        for (let idx = 0; idx < 9; idx++) {
            const pos = slotPos(face, idx);
            out.push({ face, idx, key: slotKey(face, idx), pos });
        }
    });
    return out;
}

function getLayerStickers(layerAxis, layerVal) {
    return getAllStickers().filter(s => Math.abs(vecDot(s.pos, layerAxis) - layerVal) < 0.55);
}

function pickLayer(kind, line, rx, ry) {
    const screenRight = inverseTransformVector({ x: 1, y: 0, z: 0 }, rx, ry);
    const screenUp = inverseTransformVector({ x: 0, y: -1, z: 0 }, rx, ry);
    const orient = nearestAxis(kind === 'col' ? screenRight : screenUp);
    const target = line - 1;
    let bestVal = 0, bestScore = Infinity;
    for (const val of [-1, 0, 1]) {
        const layer = getLayerStickers(orient.layerAxis, val);
        let sum = 0;
        layer.forEach(s => {
            const v = transformVector(s.pos, rx, ry);
            sum += kind === 'col' ? v.x : v.y;
        });
        const score = Math.abs(sum / layer.length - target);
        if (score < bestScore) { bestScore = score; bestVal = val; }
    }
    return { axisName: orient.name, layerAxis: orient.layerAxis, layerVal: bestVal, rotAxis: orient.axis };
}

function pickSign(kind, screenDir, layer, line, rx, ry) {
    const { layerAxis, layerVal, rotAxis } = layer;
    const layerStickers = getLayerStickers(layerAxis, layerVal);
    const target = line - 1;
    const candidates = layerStickers
        .map(s => {
            const v = transformVector(s.pos, rx, ry);
            const bandDist = Math.abs((kind === 'col' ? v.x : v.y) - target);
            return { s, v, bandDist };
        })
        .filter(c => c.v.z > -0.5)
        .sort((a, b) => a.bandDist - b.bandDist || b.v.z - a.v.z);

    const test = candidates[0]?.s || layerStickers[0];
    const start = transformVector(test.pos, rx, ry);
    const score = (sign) => {
        const end = transformVector(rotateAroundAxis(test.pos, rotAxis, sign * Math.PI / 2), rx, ry);
        if (kind === 'col') {
            const dy = end.y - start.y;
            return screenDir === 'up' ? -dy : dy;
        }
        const dx = end.x - start.x;
        return screenDir === 'right' ? dx : -dx;
    };
    return score(1) > score(-1) ? 1 : -1;
}

// Test: up vs down must pick opposite signs
const rx = -25, ry = 45;
let fails = 0;
for (const kind of ['col', 'row']) {
    for (let line = 0; line < 3; line++) {
        const layer = pickLayer(kind, line, rx, ry);
        const pairs = kind === 'col' ? [['up', 'down']] : [['left', 'right']];
        for (const [a, b] of pairs) {
            const sa = pickSign(kind, a, layer, line, rx, ry);
            const sb = pickSign(kind, b, layer, line, rx, ry);
            const permA = buildLayerPerm(layer.axisName, layer.layerVal, sa);
            const permB = buildLayerPerm(layer.axisName, layer.layerVal, sb);
            const same = JSON.stringify(permA) === JSON.stringify(permB);
            if (same || sa === sb) {
                console.log('FAIL opposite', kind, line, a, b, 'signs', sa, sb);
                fails++;
            }
        }
    }
}
console.log('opposite direction tests:', fails === 0 ? 'PASS' : fails + ' FAIL');

// Test front:1 col up -> top:1
const layer = pickLayer('col', 1, rx, ry);
const sign = pickSign('col', 'up', layer, 1, rx, ry);
const perm = buildLayerPerm(layer.axisName, layer.layerVal, sign);
const dest = Object.entries(perm).find(([d, s]) => s === 'front:1')?.[0];
console.log('front:1 col up ->', dest, dest === 'top:1' ? 'OK' : 'MISS');

// Verify atlas keys resolve and +1 !== -1 for every layer
let atlasFails = 0;
['x', 'y', 'z'].forEach(axis => {
    [-1, 0, 1].forEach(val => {
        const a = buildLayerPerm(axis, val, 1);
        const b = buildLayerPerm(axis, val, -1);
        if (JSON.stringify(a) === JSON.stringify(b)) {
            console.log('FAIL atlas identical', axis, val);
            atlasFails++;
        }
    });
});
console.log('atlas bidirectional:', atlasFails === 0 ? 'PASS' : atlasFails + ' FAIL');
