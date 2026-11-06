const assert = require('node:assert/strict');

module.exports = async ({page, context, act, note}) => {
  const cards = page.locator('.page-discover .bookcard');
  const cover = index => cards.nth(index).locator('img[data-browse-cover]');
  await page.waitForFunction(() => document.querySelectorAll('.page-discover .bookcard').length === 24);
  await page.waitForFunction(() => document.querySelector('.page-discover .bookcard img')?.naturalWidth > 0);
  assert.match(await cover(0).getAttribute('src'), /&thumb=1$/);
  assert.equal(await cover(23).getAttribute('src'), null);
  note('discover requests thumbnails and defers covers below the initial viewport');

  await cards.first().evaluate(card => { window.firstDiscoverCard = card; });
  for (let expected = 48; expected <= 240; expected += 24) {
    await act('moreList').click();
    await page.waitForFunction(count => document.querySelectorAll('.page-discover .bookcard').length === count, expected);
  }
  assert.equal(await cards.first().evaluate(card => card === window.firstDiscoverCard), true);

  for (const index of [12, 95, 194, 236, 82, 5, 0]) {
    await cards.nth(index).evaluate(card => card.scrollIntoView({block:'center'}));
    await page.waitForFunction(index => document.querySelectorAll('.page-discover .bookcard img')[index]?.hasAttribute('src'), index);
    const sources = await page.locator('.page-discover img[data-browse-cover][src]').evaluateAll(images => images.map(img => img.src));
    assert.ok(sources.length <= 22, `${sources.length} active covers for ${index}`);
    assert.ok(sources.every(src => new URL(src).searchParams.get('thumb') === '1'));
    assert.equal(await cover(index > 120 ? 0 : 239).getAttribute('src'), null);
  }
  note('240 paginated covers keep a bounded viewport window during rapid scroll jumps');

  const client = await context.newCDPSession(page);
  const touch = (type, y) => client.send('Input.dispatchTouchEvent', {
    type, touchPoints: type === 'touchEnd' ? [] : [{x:190, y, id:1}],
  });
  const before = await page.evaluate(() => scrollY);
  for (let i = 0; i < 6; i++) {
    await touch('touchStart', 620);
    for (let y = 550; y >= 270; y -= 70) await touch('touchMove', y);
    await touch('touchEnd');
  }
  await page.waitForFunction(previous => scrollY > previous + 250, before);
  assert.equal(await cards.count(), 240);
  await client.detach();
  await cards.first().click();
  await page.waitForSelector('.detail-cover img');
  const detail = new URL(await page.locator('.detail-cover img').getAttribute('src'));
  assert.equal(detail.searchParams.has('thumb'), false);
  note('rapid touch swipes keep the discovery list usable and detail opens the original cover');
};
