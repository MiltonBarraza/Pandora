import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.context().addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await use(page);
  },
});

export { expect };
