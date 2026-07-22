import type { Locator, Page } from '@playwright/test';

export async function selectDropdownOption(page: Page, scope: Locator, name: string | RegExp, option: string) {
  await scope.getByRole('button', { name, exact: typeof name === 'string' }).evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error('El selector no es un HTMLElement');
    }
    element.click();
  });

  await page.waitForFunction((optionName) => {
    const optionElement = Array.from(document.querySelectorAll('[role="option"]'))
      .find((element) => element.textContent?.trim() === optionName);

    if (!(optionElement instanceof HTMLElement)) {
      return false;
    }

    optionElement.click();
    return true;
  }, option);
}
