import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { subscribeBodyRect } from '@/app/bands';
import {
  publishRegion,
  type AnchorRect,
  type BoardRegion,
} from '@/pixi/battle/anchors';

export const rectOf = (element: Element): AnchorRect => {
  const rect = element.getBoundingClientRect();
  return { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
};

export const useMeasured = (
  observed: RefObject<Element | null>,
  measure: () => void,
  release: () => void,
): void => {
  useEffect(() => {
    measure();
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    const element = observed.current;
    if (element !== null) observer.observe(element);
    const body = document.querySelector('[data-screen-body]');
    if (body !== null) observer.observe(body);
    const unsubscribe = subscribeBodyRect(measure);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      unsubscribe();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      release();
    };
  }, [observed, measure, release]);
};

export const useRegion = (
  name: BoardRegion,
): RefObject<HTMLDivElement | null> => {
  const ref = useRef<HTMLDivElement | null>(null);
  const measure = useCallback(() => {
    const element = ref.current;
    publishRegion(name, element === null ? null : rectOf(element));
  }, [name]);
  const release = useCallback(() => {
    publishRegion(name, null);
  }, [name]);
  useMeasured(ref, measure, release);
  return ref;
};
