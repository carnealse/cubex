// Validates slice-object rotation engine (control face + 3D Rodrigues perms)
const FACE_NAMES = ['front', 'back', 'right', 'left', 'top', 'bottom'];
const FACE_BASIS = {
    front:  { n: [0, 0, 1],  r: [1, 0, 0],  u: [0, 1, 0] },
    back:   { n: [0, 0, -1], r: [-1, 0, 0], u: [0, 1, 0] },
    right:  { n: [1, 0, 0],  r: [0, 0, -1], u: [0, 1, 0] },
    left:   { n: [-1, 0, 0], r: [0, 0, 1],  u: [0, 1, 0] },
    top:    { n: [0, -1, 0], r: [1, 0, 0],  u: [0, 0, -1] },
    bottom: { n: [0, 1, 0],  r: [1, 0, 0],  u: [0, 0, 1] }
};
const FACE_BAND_AXIS = {
    front:  { col: 'x', row: 'y' },
    back:   { col: 'x', row: 'y' },
    left:   { col: 'z', row: 'y' },
    right:  { col: 'z', row: 'y' },
    top:    { col: 'x', row: 'z' },
    bottom: { col: 'x', row: 'z' }
};
const CUBE_AXES = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };

function vecDot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function vecSub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function vecScale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function slotKey(f, i) { return `${f}:${i}`; }
function slotPos(face, idx) {
    const row = Math.floor(idx / 3), col = idx % 3, u = col - 1, v = 1 - row;
    const b = FACE_BASIS[face];
    return [b.n[0] * 1.5 + b.r[0] * u + b.u[0] * v, b.n[1] * 1.5 + b.r[1] * u + b.u[1] * v, b.n[2] * 1.5 + b.r[2] * u + b.u[2] * v];
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
function buildLayerPerm(axisName, layerVal, sign) {
    const axis = CUBE_AXES[axisName];
    const perm = {};
    FACE_NAMES.forEach(f => { for (let i = 0; i < 9; i++) perm[slotKey(f, i)] = slotKey(f, i); });
    FACE_NAMES.forEach(face => {
        for (let idx = 0; idx < 9; idx++) {
            const pos = slotPos(face, idx);
            if (Math.abs(vecDot(pos, axis) - layerVal) > 0.55) continue;
            const dest = locateSticker(rotateAroundAxis(pos, axis, sign * Math.PI / 2));
            if (dest) perm[slotKey(dest.face, dest.idx)] = slotKey(face, idx);
        }
    });
    return perm;
}
function viewTransform(vec, rx, ry) {
    const rxd = rx * Math.PI / 180, ryd = ry * Math.PI / 180;
    let [x, y, z] = vec;
    let y1 = y * Math.cos(rxd) - z * Math.sin(rxd);
    z = y * Math.sin(rxd) + z * Math.cos(rxd);
    y = y1;
    let x1 = x * Math.cos(ryd) + z * Math.sin(ryd);
    z = -x * Math.sin(ryd) + z * Math.cos(ryd);
    return { x: x1, y, z };
}
function bandIndices(kind, line) {
    return kind === 'col' ? [line, line + 3, line + 6] : [line * 3, line * 3 + 1, line * 3 + 2];
}
function snap(v) { return [-1, 0, 1].reduce((b, val) => Math.abs(v - val) < Math.abs(v - b) ? val : b, 0); }
function bandLayerFromFace(face, kind, line) {
    const mid = kind === 'col' ? line + 3 : line * 3 + 1;
    const axis = FACE_BAND_AXIS[face][kind];
    return { axisName: axis, layerVal: snap(vecDot(slotPos(face, mid), CUBE_AXES[axis])) };
}
function isBandScreenAligned(face, kind, rx, ry) {
    const projected = bandIndices(kind, 0).map(idx => viewTransform(slotPos(face, idx), rx, ry));
    const xs = projected.map(p => p.x), ys = projected.map(p => p.y);
    const spreadX = Math.max(...xs) - Math.min(...xs);
    const spreadY = Math.max(...ys) - Math.min(...ys);
    return kind === 'col' ? spreadX < spreadY * 0.55 : spreadY < spreadX * 0.55;
}
function getControlFace(kind, rx, ry) {
    let controlFace = 'front', bestZ = -Infinity;
    FACE_NAMES.forEach(face => {
        const viewZ = viewTransform(FACE_BASIS[face].n, rx, ry).z;
        if (viewZ < 0.2 || !isBandScreenAligned(face, kind, rx, ry)) return;
        if (viewZ > bestZ) { bestZ = viewZ; controlFace = face; }
    });
    return controlFace;
}
function pickSlice(kind, line, rx, ry) {
    const face = getControlFace(kind, rx, ry);
    return { face, line, ...bandLayerFromFace(face, kind, line) };
}
function edgeStickerIndex(kind, bandLine, screenDir) {
    if (kind === 'col') return screenDir === 'up' ? bandLine : bandLine + 6;
    return screenDir === 'right' ? bandLine * 3 + 2 : bandLine * 3;
}
function stickerOnSliceFrontmost(axisName, layerVal, rx, ry) {
    const axis = CUBE_AXES[axisName];
    let bestPos = null, bestZ = -Infinity;
    FACE_NAMES.forEach(f => {
        for (let i = 0; i < 9; i++) {
            const pos = slotPos(f, i);
            if (Math.abs(vecDot(pos, axis) - layerVal) > 0.55) return;
            const view = viewTransform(pos, rx, ry);
            if (view.z > bestZ) { bestZ = view.z; bestPos = pos; }
        }
    });
    return bestPos;
}
function turnSignForSticker(kind, screenDir, testPos, rotAxis, rx, ry) {
    const start = viewTransform(testPos, rx, ry);
    const screenScore = (sign) => {
        const end = viewTransform(rotateAroundAxis(testPos, rotAxis, sign * Math.PI / 2), rx, ry);
        if (kind === 'col') {
            const dy = end.y - start.y;
            return screenDir === 'up' ? -dy : dy;
        }
        const dx = end.x - start.x;
        return screenDir === 'right' ? dx : -dx;
    };
    const p = screenScore(1), n = screenScore(-1);
    if (Math.abs(p - n) < 1e-6) return null;
    return p > n ? 1 : -1;
}
function oppositeScreenDir(d) {
    return d === 'up' ? 'down' : d === 'down' ? 'up' : d === 'right' ? 'left' : 'right';
}
function resolveTurnSign(kind, screenDir, band, rx, ry) {
    const rotAxis = CUBE_AXES[band.axisName];
    const edgePos = slotPos(band.face, edgeStickerIndex(kind, band.line, screenDir));
    const edgeSign = turnSignForSticker(kind, screenDir, edgePos, rotAxis, rx, ry);
    if (edgeSign !== null) return edgeSign;
    const frontPos = stickerOnSliceFrontmost(band.axisName, band.layerVal, rx, ry);
    if (frontPos) {
        const frontSign = turnSignForSticker(kind, screenDir, frontPos, rotAxis, rx, ry);
        if (frontSign !== null) return frontSign;
    }
    return screenDir === 'up' || screenDir === 'right' ? 1 : -1;
}
function pickTurnSign(kind, screenDir, band, rx, ry) {
    const sign = resolveTurnSign(kind, screenDir, band, rx, ry);
    const opp = resolveTurnSign(kind, oppositeScreenDir(screenDir), band, rx, ry);
    if (sign === opp) return screenDir === 'up' || screenDir === 'right' ? 1 : -1;
    return sign;
}
function applyPerm(state, perm) {
    const snap = JSON.parse(JSON.stringify(state));
    FACE_NAMES.forEach(f => {
        for (let i = 0; i < 9; i++) {
            const src = perm[slotKey(f, i)].split(':');
            state[f][i] = snap[src[0]][+src[1]];
        }
    });
}
function makeState() {
    const s = {};
    FACE_NAMES.forEach(f => { s[f] = Array.from({ length: 9 }, (_, i) => ({ letter: `${f[0]}${i}`, color: f })); });
    return s;
}

let fails = 0;
[[-25, 45], [0, 0], [-40, 80], [10, 60]].forEach(([rx, ry]) => {
    for (const kind of ['col', 'row']) {
        for (let line = 0; line < 3; line++) {
            const band = pickSlice(kind, line, rx, ry);
            const up = kind === 'col' ? 'up' : 'right';
            const down = kind === 'col' ? 'down' : 'left';
            const s1 = pickTurnSign(kind, up, band, rx, ry);
            const s2 = pickTurnSign(kind, down, band, rx, ry);
            const p1 = buildLayerPerm(band.axisName, band.layerVal, s1);
            const p2 = buildLayerPerm(band.axisName, band.layerVal, s2);
            if (s1 === s2 || JSON.stringify(p1) === JSON.stringify(p2)) {
                console.log('FAIL opposite', { rx, ry, kind, line, band, s1, s2 });
                fails++;
            }
        }
    }
});
console.log('opposite tests:', fails === 0 ? 'PASS' : fails + ' FAIL');

const rx = 0, ry = 0;
const band = pickSlice('col', 1, rx, ry);
const sign = pickTurnSign('col', 'up', band, rx, ry);
const perm = buildLayerPerm(band.axisName, band.layerVal, sign);
console.log('front view middle col up:', band, 'sign', sign);
const dest = Object.entries(perm).find(([d, s]) => s === 'front:1')?.[0];
console.log('front:1 up ->', dest, dest === 'top:7' ? 'OK' : 'MISS');

const state = makeState();
const before = JSON.stringify(state);
applyPerm(state, perm);
applyPerm(state, buildLayerPerm(band.axisName, band.layerVal, -sign));
console.log('round-trip:', JSON.stringify(state) === before ? 'PASS' : 'FAIL');
