"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cx } from "./cx";
import { MicIcon } from "./icons";

// The browser speech recognition API is not in TypeScript's built-in types.
type RecognitionResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};
type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionConstructor = new () => Recognition;

function getRecognition(): RecognitionConstructor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const subscribe = () => () => {};
const isSupported = () => getRecognition() !== undefined;
const notOnServer = () => false;

export type VoiceSearchButtonProps = {
  /** Name of the text input in the same form that receives the spoken words. */
  inputName: string;
  size?: "hero" | "compact";
};

/**
 * Microphone button for the search form. Fills the search box with what the
 * visitor says, then submits the form. Renders nothing in browsers that
 * cannot do speech recognition, so the form works the same without it.
 */
export function VoiceSearchButton({ inputName, size = "hero" }: VoiceSearchButtonProps) {
  const supported = useSyncExternalStore(subscribe, isSupported, notOnServer);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const recognitionRef = useRef<Recognition | null>(null);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  if (!supported) return null;

  function toggle() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getRecognition();
    const form = buttonRef.current?.form;
    const field = form?.elements.namedItem(inputName);
    if (!Ctor || !form || !(field instanceof HTMLInputElement)) return;

    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.lang = document.documentElement.lang || navigator.language || "en";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let heardFinal = false;
    recognition.onresult = (event) => {
      let text = "";
      let final = true;
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
        if (!event.results[i].isFinal) final = false;
      }
      field.value = text.trim();
      heardFinal = final && field.value !== "";
    };
    recognition.onerror = (event) => {
      setMessage(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Microphone access is blocked. Allow it in your browser, or type your search."
          : event.error === "no-speech"
            ? "We did not hear anything. Try again, or type your search."
            : "Voice search is not working right now. Please type your search.",
      );
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (heardFinal) form.requestSubmit();
      else field.focus();
    };

    try {
      recognition.start();
      setMessage("Listening. Say what you are looking for.");
      setListening(true);
    } catch {
      setMessage("Voice search is not working right now. Please type your search.");
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-pressed={listening}
        aria-label={listening ? "Stop listening" : "Search by voice"}
        title={listening ? "Stop listening" : "Search by voice"}
        className={cx(
          "relative flex shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] transition-colors",
          size === "hero" ? "size-[52px]" : "size-12",
          listening
            ? "border-pink bg-pink text-navy"
            : "border-line-control bg-pale text-navy hover:border-navy hover:bg-lavender",
        )}
      >
        {listening ? (
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-ping rounded-full border-2 border-pink"
          />
        ) : null}
        <MicIcon size={size === "hero" ? 22 : 20} />
      </button>
      <span role="status" className="sr-only">
        {message}
      </span>
    </>
  );
}
