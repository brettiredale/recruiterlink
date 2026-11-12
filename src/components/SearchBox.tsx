import Form from "next/form";
import { useId } from "react";
import { cx } from "./cx";
import { SparkleIcon } from "./icons";
import { VoiceSearchButton } from "./VoiceSearchButton";

export type SearchBoxProps = {
  /** "hero" is the large home page bar; "compact" is the city page bar. */
  variant?: "hero" | "compact";
  /** Where the form goes. The search text is sent as `?q=...`. */
  action?: string;
  /** Name of the search text in the address. */
  paramName?: string;
  placeholder?: string;
  /** Label read out by screen readers for the text box. */
  label?: string;
  /** Name of the whole search form for screen readers. */
  formLabel?: string;
  /** Text already in the box, e.g. on the results page. */
  defaultValue?: string;
  /** Extra values sent with the search, e.g. `{ city: "madrid" }`. */
  hiddenFields?: Record<string, string>;
  className?: string;
};

/**
 * The AI search bar: text box, voice button and Search button. A real GET
 * form, so it works before (and without) any script loading.
 */
export function SearchBox({
  variant = "hero",
  action = "/search",
  paramName = "q",
  placeholder = "Web design recruitment agencies in Madrid",
  label = "Describe the agency you are looking for",
  formLabel = "Search recruitment agencies",
  defaultValue,
  hiddenFields,
  className,
}: SearchBoxProps) {
  const inputId = useId();
  const hero = variant === "hero";

  return (
    <Form
      action={action}
      role="search"
      aria-label={formLabel}
      className={cx(
        "flex w-full flex-wrap items-center gap-2 border-2 border-navy bg-white text-left transition-shadow",
        "focus-within:ring-4 focus-within:ring-indigo/35",
        // A pill on wider screens; a rounded two-row box on phones.
        "rounded-[28px] p-2 sm:flex-nowrap sm:rounded-full",
        hero
          ? "max-w-[860px] shadow-search sm:py-2 sm:pr-2 sm:pl-[22px]"
          : "max-w-[760px] sm:py-1.5 sm:pr-1.5 sm:pl-5",
        className,
      )}
    >
      {hiddenFields
        ? Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}

      <div className="flex min-w-0 flex-[1_1_100%] items-center gap-2 pl-3 sm:flex-1 sm:pl-0">
        <SparkleIcon size={hero ? 24 : 22} className="shrink-0 text-pink-text" />
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        <input
          id={inputId}
          type="search"
          name={paramName}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required
          autoComplete="off"
          enterKeyHint="search"
          className={cx(
            "min-w-0 flex-1 appearance-none border-0 bg-transparent px-1.5 text-navy outline-none placeholder:text-[#6B6490] [&::-webkit-search-cancel-button]:appearance-none",
            hero ? "py-3.5 text-[17px] sm:text-[19px]" : "py-3 text-[17px] sm:text-lg",
          )}
        />
      </div>

      <div className="flex flex-[1_1_100%] items-center gap-2 sm:flex-none">
        <VoiceSearchButton inputName={paramName} size={variant} />
        <button
          type="submit"
          className={cx(
            "flex-1 cursor-pointer rounded-full bg-pink text-[19px] font-bold text-white transition-colors hover:bg-pink-hover sm:flex-none",
            hero ? "h-[52px] px-[30px]" : "h-12 px-[26px]",
          )}
        >
          Search
        </button>
      </div>
    </Form>
  );
}
