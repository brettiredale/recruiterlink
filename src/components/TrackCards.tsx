"use client";

import { useEffect, useRef } from "react";
import { CARD_EVENTS_PATH, MAX_CARD_EVENTS, type CardEvent, type CardSource } from "@/lib/card-events";

/*
 * Counts agency card views and clicks for the admin's listing stats.
 *
 * A view: a card ([data-agency-id]) at least half on screen.
 * A click: a press on the card (left, middle or keyboard).
 * Each is counted once per card per page address, so scrolling up and down
 * or re-rendering does not inflate the numbers. Events are batched and sent
 * with sendBeacon, which survives the visitor leaving the page.
 */

const queue: CardEvent[] = [];
const seen = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

function send(events: CardEvent[]) {
  const body = JSON.stringify({ events });
  try {
    // text/plain keeps it a "simple" request; the route parses the JSON itself.
    const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
    if (navigator.sendBeacon?.(CARD_EVENTS_PATH, blob)) return;
  } catch {
    // fall through to fetch
  }
  void fetch(CARD_EVENTS_PATH, { method: "POST", body, keepalive: true }).catch(() => {});
}

function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  while (queue.length > 0) send(queue.splice(0, MAX_CARD_EVENTS));
}

function enqueue(event: CardEvent, now = false) {
  const key = `${location.pathname}${location.search}|${event.source}|${event.agency}|${event.kind}`;
  if (seen.has(key)) return;
  seen.add(key);
  queue.push(event);
  if (now) flush();
  else if (!timer) timer = setTimeout(flush, 3000);
}

function listenForLeaving() {
  if (listening) return;
  listening = true;
  const onHide = () => {
    if (document.visibilityState === "hidden") flush();
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", flush);
}

/** Wrap a group of agency cards to count their views and clicks. Adds no box of its own. */
export function TrackCards({ source, children }: { source: CardSource; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    listenForLeaving();

    const idOf = (el: Element | null) => el?.closest<HTMLElement>("[data-agency-id]")?.dataset.agencyId;

    const visible = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const agency = idOf(entry.target);
          if (agency) enqueue({ agency, source, kind: "view" });
          visible.unobserve(entry.target);
        }
      },
      { threshold: 0.5 },
    );

    const watched = new WeakSet<Element>();
    const watchAll = () => {
      root.querySelectorAll("[data-agency-id]").forEach((card) => {
        if (watched.has(card)) return;
        watched.add(card);
        visible.observe(card);
      });
    };
    watchAll();

    // Next.js swaps cards in place on soft navigation (e.g. the next results page).
    const changes = new MutationObserver(watchAll);
    changes.observe(root, { childList: true, subtree: true });

    const onPress = (event: MouseEvent) => {
      if (event.type === "auxclick" && event.button !== 1) return;
      const agency = idOf(event.target as Element);
      if (agency) enqueue({ agency, source, kind: "click" }, true);
    };
    root.addEventListener("click", onPress);
    root.addEventListener("auxclick", onPress);

    return () => {
      visible.disconnect();
      changes.disconnect();
      root.removeEventListener("click", onPress);
      root.removeEventListener("auxclick", onPress);
    };
  }, [source]);

  return (
    <div ref={ref} className="contents" data-card-source={source}>
      {children}
    </div>
  );
}
