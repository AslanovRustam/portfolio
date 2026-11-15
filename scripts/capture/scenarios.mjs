// What each project's loop shows (spec §5). A scenario opens and settles its page in `prepare`, then plays a
// path in `run` through the controller `ctl`, which works the same in real time and frame by frame:
//   ctl.wait(ms)              let the page run
//   ctl.wheel(dy, ms)         wheel input spread over ms (sites with their own smooth scroll, e.g. Lenis)
//   ctl.scroll(dy, ms)        programmatic, eased scroll over ms (sites with native scrolling)
//   ctl.until(seconds)        hold until the take is that long
// `seconds` is the finished loop's length; unless `returnsToStart`, the take runs half a second longer and
// that tail cross-fades into the head (scripts/capture/loop.ts → seamFilter).

/** Waits until a Lenis page has finished its intro and started scrolling. */
async function lenisStarted(page, timeout = 30_000) {
  await page.waitForFunction(() => !document.documentElement.classList.contains('lenis-stopped'), undefined, { timeout });
}

/** Clicks the first match if it shows up (cookie banners and the like); never fails the take. */
async function dismiss(page, selector, timeout = 4000) {
  await page.locator(selector).first().click({ timeout }).catch(() => {});
}

/** Jumps to y before recording and lets the page settle there. */
async function startAt(page, y, settle = 2500) {
  await page.evaluate((y) => scrollTo(0, y), y);
  await page.mouse.wheel(0, 1); // wakes scroll-driven pages (Lenis, ScrollTrigger)
  await page.waitForTimeout(settle);
}

export const SCENARIOS = {
  // the night cabin: the plane comes to the door, the camera walks the aisle, a seat is picked
  aslanair: {
    url: 'https://aslanair.vercel.app',
    seconds: 11,
    async prepare(page) {
      await page.waitForFunction(() => !document.getElementById('loader') || getComputedStyle(document.getElementById('loader')).opacity === '0', undefined, { timeout: 40_000 }).catch(() => {});
      await page.waitForTimeout(3000);
      await page.mouse.move(720, 450);
      await page.mouse.wheel(0, 3700);
      await page.waitForTimeout(4000);
    },
    async run(page, ctl) {
      await ctl.wait(500);
      await ctl.wheel(2500, 4500);
      await ctl.wait(700);
      // "Pick for me" seats the visitor; clicked by its box, since actionability waits hang on a held clock
      const pick = await page.getByRole('button', { name: 'Pick for me' }).boundingBox();
      if (pick) {
        await page.mouse.move(pick.x + pick.width / 2, pick.y + pick.height / 2, { steps: 6 });
        await ctl.wait(300);
        await page.mouse.click(pick.x + pick.width / 2, pick.y + pick.height / 2);
      }
      await ctl.wait(4500);
    },
  },
  // the soda cans turn and fly between the scenes as the page scrolls
  'aslan-can': {
    url: 'https://aslan-can.vercel.app',
    seconds: 10,
    async prepare(page) {
      await page.mouse.move(720, 450);
      await page.waitForTimeout(3000);
    },
    async run(page, ctl) {
      await ctl.wait(600);
      await ctl.scroll(4200, 9000);
    },
  },
  // the public studio page, in English; down through the creatives and back up (returns to its start)
  gengo: {
    url: 'https://gen-go.ai/',
    seconds: 10,
    returnsToStart: true,
    async prepare(page) {
      await dismiss(page, 'button:has-text("Хорошо")');
      await page.getByText('RU', { exact: true }).first().click();
      await page.getByText('English', { exact: true }).first().click();
      await page.waitForTimeout(3000);
      await page.mouse.move(720, 450);
    },
    async run(page, ctl) {
      await ctl.wait(800);
      await ctl.scroll(950, 3800);
      await ctl.wait(800);
      await ctl.scroll(-950, 3800);
      await ctl.wait(800);
    },
  },
  // the agency's English site: the hero, then down through the work
  kolir: {
    url: 'https://www.kolir.agency/en',
    seconds: 10,
    async prepare(page) {
      await page.mouse.move(720, 450);
      await page.waitForTimeout(4000);
    },
    async run(page, ctl) {
      await ctl.wait(700);
      await ctl.scroll(3200, 9300);
    },
  },
  // Ukrainian only: the games, little text
  tuti: {
    url: 'https://tuti-tau.vercel.app/',
    seconds: 10,
    async prepare(page) {
      await page.mouse.move(720, 450);
      await startAt(page, 1880);
    },
    async run(page, ctl) {
      await ctl.wait(600);
      await ctl.scroll(2500, 9400);
    },
  },
  // Ukrainian and Russian only: helmets from several shops, photos and prices
  moto: {
    url: 'https://motoagregtor-motoaggregator-tlvw65-032779-2-24-123-177.sslip.io/helmets',
    seconds: 10,
    async prepare(page) {
      await dismiss(page, 'button:has-text("Прийняти")');
      await page.mouse.move(720, 450);
      await startAt(page, 230, 2000);
    },
    async run(page, ctl) {
      await ctl.wait(600);
      await page.mouse.move(820, 420, { steps: 6 });
      await ctl.wait(700);
      await ctl.scroll(1500, 7600);
      await page.mouse.move(1080, 520, { steps: 6 });
      await ctl.wait(1000);
    },
  },
  altus: {
    url: 'https://altus-liard.vercel.app',
    seconds: 10,
    async prepare(page) {
      await lenisStarted(page);
      await page.mouse.move(720, 450);
      // the headline and the cards finish revealing, so the loop (and the still) open on the whole hero
      await page.waitForTimeout(4000);
    },
    // the hero's scroll-driven video and headline, then the approach, into the pinned tours
    async run(page, ctl) {
      await ctl.wait(700);
      await ctl.wheel(5600, 9300);
    },
  },
};
