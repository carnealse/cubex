// Validates screen-sorted band rotation engine
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
const PERSPECTIVE = 600;
const SCENE_OFFSET = 125;

function vecDot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
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
function projectStickerToScreen(pos, rx, ry) {
    const view = viewTransform(pos, rx, ry);
    const scale = 210 / 3;
    const depth = PERSPECTIVE - view.z * scale;
    const factor = depth > 1 ? PERSPECTIVE / depth : 1;
    const center = SCENE_OFFSET + 105;
    return { sx: center + view.x * scale * factor, sy: center - view.y * scale * factor, z: view.z };
}
function snap(v) { return [-1, 0, 1].reduce((b, val) => Math.abs(v - val) < Math.abs(v - b) ? val : b, 0); }
function bandIndices(kind, line) {
    return kind === 'col' ? [line, line + 3, line + 6] : [line * 3, line * 3 + 1, line * 3 + 2];
}
function bandLayerFromFace(face, kind, line) {
    const mid = kind === 'col' ? line + 3 : line * 3 + 1;
    const axis = FACE_BAND_AXIS[face][kind];
    return { axisName: axis, layerVal: snap(vecDot(slotPos(face, mid), CUBE_AXES[axis])) };
}
function collectVisibleBands(kind, rx, ry) {
    const bands = [];
    FACE_NAMES.forEach(face => {
        for (let bandLine = 0; bandLine < 3; bandLine++) {
            const projected = bandIndices(kind, bandLine)
                .map(idx => projectStickerToScreen(slotPos(face, idx), rx, ry))
                .filter(p => p.z > 0.05);
            if (projected.length < 2) return;
            const xs = projected.map(p => p.sx), ys = projected.map(p => p.sy);
            const spreadX = Math.max(...xs) - Math.min(...xs);
            const spreadY = Math.max(...ys) - Math.min(...ys);
            if (kind === 'col' && spreadX > spreadY * 0.55) return;
            if (kind === 'row' && spreadY > spreadX * 0.55) return;
            bands.push({
                face, line: bandLine,
                avgX: xs.reduce((a, b) => a + b, 0) / xs.length,
                avgY: ys.reduce((a, b) => a + b, 0) / ys.length,
                ...bandLayerFromFace(face, kind, bandLine)
            });
        }
    });
    return bands;
}
function uniqueBandsSorted(bands, kind) {
    const sorted = bands.slice().sort((a, b) => (kind === 'col' ? a.avgX - b.avgX : a.avgY - b.avgY));
    const seen = new Set();
    return sorted.filter(b => {
        const k = `${b.axisName}:${b.layerVal}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}
function columnRotationAxes(rx, ry) {
    return ['x', 'y', 'z'].filter(a => {
        const v = viewTransform(CUBE_AXES[a], rx, ry);
        return Math.abs(v.x) >= Math.abs(v.y);
    });
}
function rowRotationAxes(rx, ry) {
    return ['x', 'y', 'z'].filter(a => {
        const v = viewTransform(CUBE_AXES[a], rx, ry);
        return Math.abs(v.y) > Math.abs(v.x);
    });
}
function pickSliceByScreenLine(kind, line, rx, ry) {
    const arrowCoord = SCENE_OFFSET + line * 70 + 35;
    const axes = kind === 'col' ? columnRotationAxes(rx, ry) : rowRotationAxes(rx, ry);
    let best = null, bestScore = Infinity;
    axes.forEach(axisName => {
        [-1, 0, 1].forEach(layerVal => {
            let total = 0, count = 0;
            FACE_NAMES.forEach(f => {
                for (let i = 0; i < 9; i++) {
                    if (Math.abs(vecDot(slotPos(f, i), CUBE_AXES[axisName]) - layerVal) > 0.55) continue;
                    const p = projectStickerToScreen(slotPos(f, i), rx, ry);
                    if (p.z < 0.05) continue;
                    total += kind === 'col' ? Math.abs(p.sx - arrowCoord) : Math.abs(p.sy - arrowCoord);
                    count++;
                }
            });
            if (count < 3) return;
            const score = total / count;
            if (score < bestScore) { bestScore = score; best = { axisName, layerVal, face: 'front', line }; }
        });
    });
    return best || { axisName: 'x', layerVal: 0, face: 'front', line };
}
function pickSlice(kind, line, rx, ry) {
    const unique = uniqueBandsSorted(collectVisibleBands(kind, rx, ry), kind);
    return unique[line] || pickSliceByScreenLine(kind, line, rx, ry);
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
            if (Math.abs(vecDot(pos, axis) - layerVal) > 0.55) continue;
            const view = viewTransform(pos, rx, ry);
            if (view.z > bestZ) { bestZ = view.z; bestPos = pos; }
        }
    });
    return bestPos;
}
function pickTurnSign(kind, screenDir, slice, rx, ry) {
    const rotAxis = CUBE_AXES[slice.axisName];
    const testPos = stickerOnSliceFrontmost(slice.axisName, slice.layerVal, rx, ry)
        || slotPos(slice.face, edgeStickerIndex(kind, slice.line, screenDir));
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
    if (Math.abs(p - n) < 1e-6) return screenDir === 'up' || screenDir === 'right' ? 1 : -1;
    return p > n ? 1 : -1;
}
function buildXLayerPerm(layerVal, sign) {
    const col = layerVal + 1;
    const flow = {
        [`front:${col}`]: `top:${col}`, [`top:${col}`]: `back:${col}`, [`back:${col}`]: `bottom:${col}`,
        [`bottom:${col}`]: `front:${col + 6}`, [`front:${col + 6}`]: `bottom:${col + 6}`,
        [`bottom:${col + 6}`]: `back:${col + 6}`, [`back:${col + 6}`]: `top:${col + 6}`,
        [`top:${col + 6}`]: `front:${col}`,
        [`front:${col + 3}`]: `top:${col + 3}`, [`top:${col + 3}`]: `back:${col + 3}`,
        [`back:${col + 3}`]: `bottom:${col + 3}`, [`bottom:${col + 3}`]: `front:${col + 3}`
    };
    const mapping = sign > 0 ? flow : Object.fromEntries(Object.entries(flow).map(([s, d]) => [d, s]));
    const perm = {};
    FACE_NAMES.forEach(f => { for (let i = 0; i < 9; i++) perm[slotKey(f, i)] = slotKey(f, i); });
    Object.entries(mapping).forEach(([src, dest]) => { perm[dest] = src; });
    return perm;
}
function locateSticker(pos) {
    let best = null, bestDist = Infinity;
    for (const face of FACE_NAMES) {
        const basis = FACE_BASIS[face];
        if (vecDot(pos, basis.n) <= 0.5) continue;
        const rel = [pos[0] - basis.n[0] * 1.5, pos[1] - basis.n[1] * 1.5, pos[2] - basis.n[2] * 1.5];
        const u = vecDot(rel, basis.r), v = vecDot(rel, basis.u);
        const col = Math.max(0, Math.min(2, Math.round(u + 1)));
        const row = Math.max(0, Math.min(2, Math.round(1 - v)));
        const dist = Math.abs(u - (col - 1)) + Math.abs(v - (1 - row));
        if (dist < bestDist) { bestDist = dist; best = { face, idx: row * 3 + col }; }
    }
    return best;
}
function buildRodriguesPerm(axisName, layerVal, sign) {
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
function buildLayerPerm(axisName, layerVal, sign) {
    return axisName === 'x' ? buildXLayerPerm(layerVal, sign) : buildRodriguesPerm(axisName, layerVal, sign);
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
            const slice = pickSlice(kind, line, rx, ry);
            const up = kind === 'col' ? 'up' : 'right';
            const down = kind === 'col' ? 'down' : 'left';
            const s1 = pickTurnSign(kind, up, slice, rx, ry);
            const s2 = pickTurnSign(kind, down, slice, rx, ry);
            const p1 = buildLayerPerm(slice.axisName, slice.layerVal, s1);
            const p2 = buildLayerPerm(slice.axisName, slice.layerVal, s2);
            if (s1 === s2 || JSON.stringify(p1) === JSON.stringify(p2)) {
                console.log('FAIL opposite', { rx, ry, kind, line, slice, s1, s2 });
                fails++;
            }
        }
    }
});
console.log('opposite tests:', fails === 0 ? 'PASS' : fails + ' FAIL');

const rx = -25, ry = 45;
const slice = pickSlice('col', 2, rx, ry);
const sign = pickTurnSign('col', 'up', slice, rx, ry);
const perm = buildLayerPerm(slice.axisName, slice.layerVal, sign);
console.log('default col2 (orange right col):', slice.face, slice.axisName + ':' + slice.layerVal, 'sign', sign);
const dest = Object.entries(perm).find(([d, s]) => s === 'left:2')?.[0];
console.log('left:2 up ->', dest);

const state = makeState();
const before = JSON.stringify(state);
applyPerm(state, perm);
applyPerm(state, buildLayerPerm(slice.axisName, slice.layerVal, -sign));
console.log('round-trip:', JSON.stringify(state) === before ? 'PASS' : 'FAIL');
