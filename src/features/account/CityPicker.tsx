"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cx } from "@/components/cx";
import { getCityChoices } from "./actions";
import { cityQueryCore, exactCity, rankCities, type CityChoice } from "./city-match";
import { describedBy, inputClass } from "./ui";
import { LISTING_LIMITS } from "./validate";

const SHOWN = 8;

/** What the form sent last time, so a refused form comes back as it was. */
export type CityPickerInitial = {
  mode: "list" | "new";
  cityId: string;
  label: string;
  newCity: string;
};

type Option = { kind: "city"; city: CityChoice } | { kind: "add"; name: string };

/** Each country's cities, kept for the visit so switching back is instant. */
const cityCache = new Map<number, CityChoice[]>();

/**
 * The city on the "Add your agency" form. Agencies choose one of the cities
 * already in the directory for their country, so their listing joins that
 * city's page. Only if theirs is not listed can they add a new one, which
 * the site admin checks before publishing.
 *
 * Sends `city_mode` ("list" or "new"), `city_id` (a listed city) and
 * `city_new` (a new city's name). The server checks all of it again.
 *
 * Give it `key={countryId}`: a different country starts the city afresh.
 */
export function CityPicker({
  countryId,
  initial,
  error,
}: {
  countryId: number | null;
  initial: CityPickerInitial;
  error?: string;
}) {
  const id = useId();
  const inputId = `${id}-city`;
  const listId = `${id}-cities`;
  const newId = `${id}-new-city`;

  const [cities, setCities] = useState<CityChoice[] | null>(() =>
    countryId === null ? null : (cityCache.get(countryId) ?? null),
  );
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [mode, setMode] = useState<"list" | "new">(initial.mode);
  const [query, setQuery] = useState(initial.label);
  const [selectedId, setSelectedId] = useState<number | null>(
    /^\d+$/.test(initial.cityId) ? Number(initial.cityId) : null,
  );
  const [newCity, setNewCity] = useState(initial.newCity);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const focusNew = useRef(false);

  // Load the country's cities, unless this visit already has them.
  useEffect(() => {
    if (countryId === null || cities !== null) return;
    let current = true;
    getCityChoices(countryId)
      .then((list) => {
        cityCache.set(countryId, list);
        if (current) setCities(list);
      })
      .catch(() => {
        if (current) setLoadFailed(true);
      });
    return () => {
      current = false;
    };
  }, [countryId, cities, attempt]);

  useEffect(() => {
    if (focusNew.current && mode === "new") {
      focusNew.current = false;
      newRef.current?.focus();
    }
  }, [mode]);

  const selected = useMemo(
    () => (selectedId === null ? undefined : cities?.find((city) => city.id === selectedId)),
    [cities, selectedId],
  );

  const options: Option[] = useMemo(() => {
    if (!cities) return [];
    const matches = rankCities(cities, query, SHOWN).map((city): Option => ({ kind: "city", city }));
    const typed = cityQueryCore(query);
    // Offer a new city only once something is typed that we do not have.
    if (typed.length >= 2 && !exactCity(cities, query)) matches.push({ kind: "add", name: typed });
    return matches;
  }, [cities, query]);

  const ready = countryId !== null && cities !== null;
  const showList = open && ready && options.length > 0;
  const activeIndex = Math.min(active, Math.max(options.length - 1, 0));

  function choose(option: Option) {
    if (option.kind === "city") {
      setSelectedId(option.city.id);
      setQuery(option.city.name);
      setOpen(false);
      return;
    }
    setSelectedId(null);
    setNewCity(option.name);
    focusNew.current = true;
    setMode("new");
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      else setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      // Choosing from the list must not send the whole form.
      if (showList) {
        event.preventDefault();
        choose(options[activeIndex]);
      }
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
    }
  }

  // Leaving the box with an exact name typed counts as choosing that city.
  function onBlur() {
    setOpen(false);
    if (!cities || selected) return;
    const exact = exactCity(cities, query);
    if (exact) {
      setSelectedId(exact.id);
      setQuery(exact.name);
    }
  }

  function backToList() {
    setMode("list");
    setQuery(newCity);
    setSelectedId(null);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      setOpen(true);
    });
  }

  const hidden = (
    <>
      <input type="hidden" name="city_mode" value={mode} />
      <input type="hidden" name="city_id" value={mode === "list" && selected ? String(selected.id) : ""} />
      <input type="hidden" name="city_label" value={query} />
    </>
  );

  if (mode === "new") {
    const country = countryId !== null;
    return (
      <div className="flex flex-col gap-1.5">
        {hidden}
        <label htmlFor={newId} className="text-base font-bold">
          New city
        </label>
        <p id={`${newId}-hint`} className="text-[15px] text-muted">
          Just the city&apos;s name, without the state or region. We check it before publishing.
        </p>
        <input
          ref={newRef}
          id={newId}
          name="city_new"
          type="text"
          autoComplete="address-level2"
          maxLength={LISTING_LIMITS.city.max}
          required
          value={newCity}
          onChange={(event) => setNewCity(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(newId, true, Boolean(error))}
          className={inputClass}
        />
        {error ? (
          <p id={`${newId}-error`} className="text-[15px] font-semibold text-[#B3261E]">
            {error}
          </p>
        ) : null}
        {country ? (
          <p>
            <button
              type="button"
              onClick={backToList}
              className="min-h-11 cursor-pointer text-[15px] font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
            >
              Choose from the list instead
            </button>
          </p>
        ) : null}
      </div>
    );
  }

  let hint: React.ReactNode = "Start typing, then choose your city from the list.";
  if (countryId === null) hint = "Choose your country first.";
  else if (loadFailed) hint = null;
  else if (!cities) hint = "Loading the cities for this country…";

  return (
    <div className="flex flex-col gap-1.5">
      {hidden}
      <label htmlFor={inputId} className="text-base font-bold">
        City
      </label>
      {hint ? (
        <p id={`${inputId}-hint`} className="text-[15px] text-muted">
          {hint}
        </p>
      ) : null}
      {loadFailed ? (
        <p id={`${inputId}-hint`} className="text-[15px] font-semibold text-[#B3261E]">
          We could not load the cities for this country.{" "}
          <button
            type="button"
            onClick={() => {
              setLoadFailed(false);
              setAttempt((n) => n + 1);
            }}
            className="cursor-pointer font-bold text-indigo underline underline-offset-4"
          >
            Try again
          </button>
        </p>
      ) : null}
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList ? `${listId}-${activeIndex}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, true, Boolean(error))}
          autoComplete="off"
          spellCheck={false}
          disabled={!ready}
          placeholder={ready ? "For example: " + (cities?.[0]?.name ?? "your city") : undefined}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedId(null);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => {
            setOpen(true);
            // On a phone the keyboard covers the lower half: lift the box so the list shows.
            if (window.matchMedia("(max-width: 639px)").matches) {
              inputRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
            }
          }}
          onClick={() => setOpen(true)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className={cx(inputClass, "scroll-mt-6 disabled:cursor-not-allowed disabled:bg-pale")}
        />
        {showList ? (
          <ul
            id={listId}
            role="listbox"
            aria-label="Cities"
            className="absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-[min(420px,60vh)] overflow-y-auto rounded-btn border-[1.5px] border-line-control bg-white py-1.5 shadow-[0_12px_32px_rgba(33,23,75,0.16)]"
          >
            {options.map((option, index) => (
              <li
                key={option.kind === "city" ? option.city.id : "add"}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                // Keep focus in the box so the choice is not lost to the blur.
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => setActive(index)}
                onClick={() => choose(option)}
                className={cx(
                  "flex min-h-11 cursor-pointer items-center justify-between gap-4 px-4 py-2 text-[17px]",
                  index === activeIndex && "bg-lavender",
                  option.kind === "add" && "mt-1 border-t border-line",
                )}
              >
                {option.kind === "city" ? (
                  <>
                    <span className="min-w-0 font-semibold break-words text-navy">{option.city.name}</span>
                    <span className="shrink-0 text-[15px] text-muted">
                      {option.city.agencies.toLocaleString("en")}{" "}
                      {option.city.agencies === 1 ? "agency" : "agencies"}
                    </span>
                  </>
                ) : (
                  <span className="min-w-0 break-words text-navy">
                    My city is not listed: <strong>add &ldquo;{option.name}&rdquo;</strong>
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {selected ? (
        <p aria-live="polite" className="text-[15px] font-semibold text-[#12552E]">
          ✓ {selected.name}: your listing joins the {selected.agencies.toLocaleString("en")}{" "}
          {selected.agencies === 1 ? "agency" : "agencies"} already on this city&apos;s page.
        </p>
      ) : !open && ready && query.trim() && !error ? (
        <p aria-live="polite" className="text-[15px] font-semibold text-[#8A5A00]">
          Choose your city from the list, or add it as a new city if it is not there.
        </p>
      ) : (
        <p aria-live="polite" className="sr-only">
          {open && ready && query.trim()
            ? `${options.filter((o) => o.kind === "city").length} matching cities`
            : ""}
        </p>
      )}
      {error ? (
        <p id={`${inputId}-error`} className="text-[15px] font-semibold text-[#B3261E]">
          {error}
        </p>
      ) : null}
      {ready && !open && !selected && !query.trim() ? (
        <p>
          <button
            type="button"
            onClick={() => {
              setNewCity("");
              focusNew.current = true;
              setMode("new");
            }}
            className="min-h-11 cursor-pointer text-[15px] font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
          >
            My city is not listed
          </button>
        </p>
      ) : null}
    </div>
  );
}
