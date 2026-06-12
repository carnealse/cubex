const puppeteer = require('puppeteer');
const path = require('path');

async function run() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 800 });
    await page.goto(`file://${path.resolve('index.html')}`, { waitUntil: 'networkidle0' });

    let fails = 0;
    function fail(msg) {
        console.log('FAIL:', msg);
        fails++;
    }
    function pass(msg) {
        console.log('PASS:', msg);
    }

    const call = async (fn, ...callArgs) => page.evaluate((f, a) => {
        const handlers = {
            raycastAt: (x, y) => window.cubeApi.raycastFacelet(x, y),
            sliceAt: (x, y) => {
                const hit = window.cubeApi.raycastFacelet(x, y);
                return hit ? window.cubeApi.sliceFromFacelet(hit.face, hit.row, hit.col) : null;
            },
            highlightCount: () => document.querySelectorAll('.sticker.slice-highlight').length,
            highlighted: () => [...document.querySelectorAll('.sticker.slice-highlight')].map((el) => ({
                face: el.dataset.face,
                row: Number(el.dataset.row),
                col: Number(el.dataset.col)
            })),
            setRotation: (x, y) => window.cubeApi.setRotation(x, y),
            lockAt: async (x, y) => {
                const viewport = document.getElementById('viewport');
                viewport.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 1, bubbles: true, isPrimary: true }));
                viewport.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, pointerId: 1, bubbles: true, isPrimary: true }));
                await new Promise((r) => setTimeout(r, 550));
                viewport.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, pointerId: 1, bubbles: true, isPrimary: true }));
                return window.cubeApi.getLockedSlice();
            },
            turn: (dir) => window.cubeApi.turnLockedSlice(dir),
            getLocked: () => window.cubeApi.getLockedSlice(),
            unlock: () => window.cubeApi.unlockHighlight()
        };
        return handlers[f](...a);
    }, fn, callArgs);

    await call('setRotation', 0, 0);

    const center = await page.evaluate(() => {
        const r = document.getElementById('viewport').getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });

    const frontTopMid = await call('sliceAt', center.x, center.y + 70);
    if (!frontTopMid || frontTopMid.type !== 'column' || frontTopMid.index !== 1) {
        fail(`default view front top edge should be column 1, got ${JSON.stringify(frontTopMid)}`);
    } else {
        pass('front top edge -> column index 1');
    }

    const frontLeftMid = await call('sliceAt', center.x - 70, center.y);
    if (!frontLeftMid || frontLeftMid.type !== 'row' || frontLeftMid.index !== 1) {
        fail(`default view front left edge should be row 1, got ${JSON.stringify(frontLeftMid)}`);
    } else {
        pass('front left edge -> row index 1');
    }

    await call('setRotation', -25, 45);
    const hit = await call('raycastAt', center.x - 90, center.y - 40);
    const slice = hit ? await page.evaluate((h) => {
        return window.cubeApi.sliceFromFacelet(h.face, h.row, h.col);
    }, hit) : null;

    if (!hit) {
        fail('raycast missed at steep angle left-top region');
    } else {
        pass(`steep angle raycast hit ${hit.face} [${hit.row},${hit.col}] slice=${JSON.stringify(slice)}`);
    }

    await call('unlock');
    await call('setRotation', -25, 45);

    const leftEdgeSlice = await call('sliceAt', center.x - 95, center.y - 15);
    if (!leftEdgeSlice || leftEdgeSlice.type !== 'row') {
        fail(`steep left edge should select row slice, got ${JSON.stringify(leftEdgeSlice)}`);
    } else {
        pass(`steep view left edge -> row index ${leftEdgeSlice.index}`);
    }

    await call('unlock');
    await call('setRotation', 0, 0);
    const locked = await call('lockAt', center.x, center.y + 70);
    if (!locked || locked.type !== 'column') {
        fail(`lock failed: ${JSON.stringify(locked)}`);
    } else {
        const count = await call('highlightCount');
        if (count !== 12) {
            fail(`column highlight should be 12 stickers, got ${count}`);
        } else {
            pass(`locked column ${locked.index} highlights exactly 12 stickers`);
        }

        const faces = await call('highlighted');
        const leftCount = faces.filter((s) => s.face === 'left').length;
        if (leftCount === 9) {
            fail('whole left face highlighted (9 stickers)');
        } else if (leftCount > 0) {
            pass(`left face has ${leftCount} ring stickers only`);
        }

        const before = await page.evaluate(() => {
            const s = document.querySelector('.face[data-face="front"] .sticker[data-row="0"][data-col="1"]');
            return s.style.backgroundColor;
        });
        const turned = await page.evaluate(() => window.cubeApi.turnLockedSlice('up'));
        const after = await page.evaluate(() => {
            const s = document.querySelector('.face[data-face="front"] .sticker[data-row="0"][data-col="1"]');
            return s.style.backgroundColor;
        });
        if (!turned) {
            fail('arrow turn rejected on valid locked column');
        } else if (before === after) {
            fail('arrow turn did not change sticker colors');
        } else {
            pass('arrow turn changed cube state on locked slice');
        }
    }

    await browser.close();
    console.log(fails === 0 ? '\nALL TESTS PASS' : `\n${fails} TEST(S) FAILED`);
    process.exit(fails === 0 ? 0 : 1);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
