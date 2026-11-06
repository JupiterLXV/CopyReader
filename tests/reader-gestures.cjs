const assert = require('node:assert/strict');

module.exports = async ({page, context, act, note}) => {
  const scroll = page.locator('#reader-scroll');
  const hidden = () => page.locator('.reader').evaluate(el => el.classList.contains('hidden-chrome'));
  await page.waitForFunction(() => document.querySelectorAll('.pagewrap.has-image').length === 4);
  assert.equal(await scroll.locator('.page-caption').count(), 0);
  const gaps = await scroll.evaluate(el => {
    const images = [...el.querySelectorAll('[data-reader-image]')];
    images[1].style.height = '48px';
    const gaps = images.slice(1).map((img, i) => img.getBoundingClientRect().top - images[i].getBoundingClientRect().bottom);
    images[1].style.removeProperty('height');
    return gaps;
  });
  assert.ok(gaps.every(gap => Math.abs(gap) < 0.5), JSON.stringify(gaps));
  assert.equal(await page.locator('#page-count').innerText(), '1 / 4');
  note('vertical image slices touch even when a loaded slice is short, and progress stays in the menu');

  await page.waitForFunction(() => !document.querySelector('[data-motion-scene]'));
  const {width, height} = await page.evaluate(() => ({width: innerWidth, height: innerHeight}));
  const x = width * 0.5, y = height * 0.5;
  const left = width * 0.12, right = width * 0.88, upper = height * 0.18;
  await page.touchscreen.tap(left, y);
  assert.equal(await hidden(), false, 'side tap');
  await page.touchscreen.tap(x, upper);
  assert.equal(await hidden(), false, 'upper tap');
  await page.touchscreen.tap(x, y);
  assert.equal(await hidden(), true);
  note('only a touch in both the horizontal and vertical center changes the reader menu');

  const rejected = await scroll.evaluate(async (el, {x, y}) => {
    const view = el.closest('.reader');
    const hidden = () => view.classList.contains('hidden-chrome');
    const fire = (type, dy = 0) => el.dispatchEvent(new PointerEvent(type, {
      pointerId: 48, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y + dy,
    }));
    fire('pointerdown');
    fire('pointermove', 36);
    fire('pointermove');
    fire('pointerup');
    const drag = hidden();
    fire('pointerdown');
    await new Promise(resolve => setTimeout(resolve, 350));
    fire('pointerup');
    const hold = hidden();
    fire('pointerdown');
    view.querySelector('.reader-top').dispatchEvent(new PointerEvent('pointerdown', {
      pointerId: 50, pointerType: 'touch', isPrimary: false, clientX: x, clientY: 10,
    }));
    fire('pointerup');
    return [drag, hold, hidden()];
  }, {x, y});
  assert.deepEqual(rejected, [true, true, true]);
  note('out-and-back drags, long presses and multiple touches do not turn into menu taps');

  const touchClient = await context.newCDPSession(page);
  const touch = (type, x, y) => touchClient.send('Input.dispatchTouchEvent', {
    type, touchPoints: type === 'touchEnd' ? [] : [{x, y, id: 1}],
  });
  await touch('touchStart', x, y);
  for (let dy = 36; dy <= 180; dy += 36) await touch('touchMove', x, y - dy);
  await touch('touchEnd');
  await page.waitForFunction(() => document.querySelector('#reader-scroll').scrollTop > 80);
  assert.equal(await hidden(), true);

  await scroll.evaluate(async (el, {x, y}) => {
    el.scrollTop += 40;
    await new Promise(requestAnimationFrame);
    for (const type of ['pointerdown', 'pointerup']) {
      el.dispatchEvent(new PointerEvent(type, {pointerId: 49, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y}));
    }
  }, {x, y});
  assert.equal(await hidden(), true);
  await scroll.evaluate(async el => {
    for (let i = 0; i < 20; i++) {
      const before = el.scrollTop;
      await new Promise(resolve => setTimeout(resolve, 150));
      if (el.scrollTop === before) return;
    }
    throw new Error('Reader did not settle after the touch scroll');
  });
  const firstImage = scroll.locator('[data-reader-image]').first();
  const before = await firstImage.evaluate(el => el.getBoundingClientRect().top);
  await page.touchscreen.tap(x, y);
  assert.equal(await hidden(), false);
  assert.ok(Math.abs(await firstImage.evaluate(el => el.getBoundingClientRect().top) - before) < 1);
  note('touch scrolling and a tap during recent scrolling leave the menu hidden, and a later center tap keeps the picture in place');

  await page.locator('#page-range').fill('0');
  await page.locator('#page-range').dispatchEvent('change');
  await act('toggleMode').click();
  await page.waitForSelector('.reader-scroll.paged');
  await page.touchscreen.tap(x, upper);
  assert.equal(await hidden(), false);
  await page.touchscreen.tap(right, y);
  assert.equal(await page.locator('#page-count').innerText(), '2 / 4');
  await page.touchscreen.tap(left, y);
  assert.equal(await page.locator('#page-count').innerText(), '1 / 4');
  await act('toggleMode').click();
  await page.waitForSelector('.reader-scroll:not(.paged)');
  await touchClient.detach();
  note('paged mode keeps side taps for navigation while rejecting off-center menu taps');
};
