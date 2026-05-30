"use client";

import { Button } from "@space-scavenger-hunt/ui/components/button";
import { cn } from "@space-scavenger-hunt/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ScrollTarget = Element | Window;

function isWindowTarget(target: ScrollTarget): target is Window {
  return target === window;
}

function getScrollTop(target: ScrollTarget) {
  return isWindowTarget(target)
    ? window.scrollY || document.documentElement.scrollTop
    : target.scrollTop;
}

function findScrollTarget(element: HTMLElement | null): ScrollTarget {
  let parent = element?.parentElement ?? null;

  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    const canScroll =
      /(auto|scroll)/.test(overflowY) && parent.scrollHeight > parent.clientHeight;

    if (canScroll) return parent;
    parent = parent.parentElement;
  }

  return window;
}

function scrollToTop(target: ScrollTarget) {
  const start = getScrollTop(target);
  const duration = 320;
  const startedAt = performance.now();

  function tick(now: number) {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const nextTop = Math.round(start * (1 - eased));

    if (isWindowTarget(target)) {
      window.scrollTo(0, nextTop);
    } else {
      target.scrollTop = nextTop;
    }

    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

export function ScrollToTopButton({
  threshold = 360,
  className,
}: {
  threshold?: number;
  className?: string;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const targetRef = useRef<ScrollTarget | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const target = findScrollTarget(anchorRef.current);
    targetRef.current = target;

    const updateVisibility = () => {
      setIsVisible(getScrollTop(target) > threshold);
    };

    updateVisibility();
    target.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      target.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, [threshold]);

  return (
    <>
      <span ref={anchorRef} aria-hidden="true" className="sr-only" />
      <AnimatePresence>
        {isVisible ? (
          <motion.div
            className={cn("fixed bottom-4 right-4 z-30 sm:bottom-6 sm:right-6", className)}
            initial={{ opacity: 0, y: 10, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.92 }}
            transition={{ duration: 0.18 }}
          >
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Scroll to top"
              title="Scroll to top"
              className="border-cyan-300/30 bg-slate-950/45 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.14)] backdrop-blur-md hover:border-cyan-200/60 hover:bg-cyan-300/15 hover:text-white"
              onClick={() => {
                scrollToTop(targetRef.current ?? window);
              }}
            >
              <ArrowUp className="size-4" />
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
