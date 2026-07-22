import { useLayoutEffect } from 'react';

type ScrollLockDocument = Pick<Document, 'body' | 'documentElement'>;

type ScrollLockState = {
  count: number;
  previousBodyOverflow: string;
  previousBodyPaddingRight: string;
  previousBodyPosition: string;
  previousBodyTop: string;
  previousBodyLeft: string;
  previousBodyWidth: string;
  previousDocumentOverflow: string;
  scrollX: number;
  scrollY: number;
  restoreScroll: (x: number, y: number) => void;
};

const activeLocks = new WeakMap<HTMLElement, ScrollLockState>();

export function useDocumentScrollLock(locked: boolean) {
  useLayoutEffect(() => {
    if (!locked) {
      return;
    }

    return lockDocumentScroll();
  }, [locked]);
}

export function lockDocumentScroll(
  targetDocument: ScrollLockDocument = document,
  viewportWidth = window.innerWidth,
  getBodyPaddingRight: (body: HTMLElement) => string = (body) => window.getComputedStyle(body).paddingRight,
  scrollPosition = { x: window.scrollX, y: window.scrollY },
  restoreScroll: (x: number, y: number) => void = (x, y) => window.scrollTo(x, y),
) {
  const { body, documentElement } = targetDocument;
  const existingLock = activeLocks.get(documentElement);

  if (existingLock) {
    existingLock.count += 1;
    return createUnlock(documentElement, body);
  }

  const state: ScrollLockState = {
    count: 1,
    previousBodyOverflow: body.style.overflow,
    previousBodyPaddingRight: body.style.paddingRight,
    previousBodyPosition: body.style.position,
    previousBodyTop: body.style.top,
    previousBodyLeft: body.style.left,
    previousBodyWidth: body.style.width,
    previousDocumentOverflow: documentElement.style.overflow,
    scrollX: scrollPosition.x,
    scrollY: scrollPosition.y,
    restoreScroll,
  };
  activeLocks.set(documentElement, state);

  const isAlreadyLocked = state.previousBodyOverflow === 'hidden' || state.previousDocumentOverflow === 'hidden';
  const scrollbarWidth = isAlreadyLocked ? 0 : Math.max(0, viewportWidth - documentElement.clientWidth);

  if (scrollbarWidth > 0) {
    const currentPaddingRight = Number.parseFloat(getBodyPaddingRight(body)) || 0;
    body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;
  }
  body.style.overflow = 'hidden';
  body.style.position = 'fixed';
  body.style.top = `-${state.scrollY}px`;
  body.style.left = `-${state.scrollX}px`;
  body.style.width = '100%';
  documentElement.style.overflow = 'hidden';

  return createUnlock(documentElement, body);
}

function createUnlock(documentElement: HTMLElement, body: HTMLElement) {
  let unlocked = false;

  return () => {
    if (unlocked) {
      return;
    }
    unlocked = true;

    const state = activeLocks.get(documentElement);
    if (!state) {
      return;
    }

    state.count -= 1;
    if (state.count > 0) {
      return;
    }

    body.style.overflow = state.previousBodyOverflow;
    body.style.paddingRight = state.previousBodyPaddingRight;
    body.style.position = state.previousBodyPosition;
    body.style.top = state.previousBodyTop;
    body.style.left = state.previousBodyLeft;
    body.style.width = state.previousBodyWidth;
    documentElement.style.overflow = state.previousDocumentOverflow;
    activeLocks.delete(documentElement);
    state.restoreScroll(state.scrollX, state.scrollY);
  };
}
