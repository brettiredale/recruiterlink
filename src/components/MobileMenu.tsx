"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buttonClasses } from "./ButtonLink";
import { CloseIcon, MenuIcon } from "./icons";

export type NavItem = { label: string; href: string };

export type MobileMenuProps = {
  items: NavItem[];
  listAgency: NavItem;
  signIn: NavItem;
};

/**
 * Phone and tablet menu. Built on <details>, so it opens even before the
 * page's script has loaded. Closes on Escape, on choosing a link, on a tap
 * outside, and when the window grows to desktop width.
 */
export function MobileMenu({ items, listAgency, signIn }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        summaryRef.current?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (!detailsRef.current?.contains(event.target as Node)) setOpen(false);
    }
    const desktop = window.matchMedia("(min-width: 1120px)");
    const onDesktop = () => {
      if (desktop.matches) setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    desktop.addEventListener("change", onDesktop);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      desktop.removeEventListener("change", onDesktop);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <details
      ref={detailsRef}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group min-[1120px]:hidden"
    >
      <summary
        ref={summaryRef}
        className="flex size-11 cursor-pointer list-none items-center justify-center rounded-btn-sm border-[1.5px] border-navy text-navy hover:bg-lavender [&::-webkit-details-marker]:hidden"
      >
        <span className="sr-only">Menu</span>
        <MenuIcon size={22} className="group-open:hidden" />
        <CloseIcon size={22} className="hidden group-open:block" />
      </summary>

      <div className="absolute inset-x-0 top-full z-40 border-t border-line bg-white shadow-menu">
        <nav aria-label="Main" className="mx-auto max-w-[1258px] px-4 pt-2 pb-6 sm:px-6">
          <ul>
            {items.map((item) => (
              <li key={item.href} className="border-b border-line">
                <Link
                  href={item.href}
                  onClick={close}
                  className="flex min-h-[52px] items-center text-lg font-semibold text-navy hover:text-indigo"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href={listAgency.href}
              onClick={close}
              className={buttonClasses("primary-small", "sm:flex-1")}
            >
              {listAgency.label}
            </Link>
            <Link
              href={signIn.href}
              prefetch={false}
              onClick={close}
              className={buttonClasses("outline", "sm:flex-1")}
            >
              {signIn.label}
            </Link>
          </div>
        </nav>
      </div>
    </details>
  );
}
