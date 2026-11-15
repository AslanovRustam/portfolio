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

export const SCENARIOS = {
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
