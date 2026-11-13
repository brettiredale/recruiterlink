"use client";

import { useActionState, useId, useRef, useState } from "react";
import { buttonClasses } from "@/components/ButtonLink";
import { Notice, SubmitButton, inputClass } from "@/features/account/ui";
import { createApiKey, type CreateKeyState } from "./admin-actions";

/** A box with a value and a Copy button. */
function CopyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const id = useId();
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-base font-bold">
        {label}
      </label>
      {hint ? <p className="text-[15px] text-muted">{hint}</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={box}
          id={id}
          readOnly
          value={value}
          onFocus={(event) => event.target.select()}
          className={`${inputClass} min-w-0 flex-1 font-mono text-[15px]`}
        />
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
            } catch {
              box.current?.select();
              document.execCommand("copy");
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          }}
          className={buttonClasses("navy", "shrink-0 cursor-pointer !px-6 !py-3 !text-base")}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

/** Makes a key and shows it, with the connector address, exactly once. */
export function ConnectKeyForm({ siteUrl }: { siteUrl: string }) {
  const [state, action] = useActionState<CreateKeyState, FormData>(createApiKey, { step: "form" });
  const id = useId();

  if (state.step === "created") {
    return (
      <div key="created" className="flex flex-col gap-6">
        <Notice tone="success">
          Key “{state.name}” made. Copy what you need now: the key is shown only this once. If it is lost, make a
          new one and revoke this one.
        </Notice>
        <CopyField
          label="Connector address for Grok"
          hint="Paste this into Grok as the address of a custom (MCP) connector. It contains the key, so keep it private like a password."
          value={`${siteUrl}/api/mcp/${state.key}`}
        />
        <CopyField
          label="The key on its own"
          hint={`For tools that send a header: address ${siteUrl}/api/mcp (connector) or ${siteUrl}/api/v1 (API), with "Authorization: Bearer" followed by this key.`}
          value={state.key}
        />
        <p>
          <a href="" className="font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep">
            Done, I have copied it
          </a>
        </p>
      </div>
    );
  }

  return (
    <form key="form" action={action} className="flex flex-col gap-4">
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <div className="flex max-w-[520px] flex-col gap-1.5">
        <label htmlFor={`${id}-name`} className="text-base font-bold">
          Name of the key
        </label>
        <p id={`${id}-hint`} className="text-[15px] text-muted">
          So you can tell keys apart, for example “Grokbot”. Posts it writes are marked with this name.
        </p>
        <input
          id={`${id}-name`}
          name="name"
          defaultValue={state.name ?? "Grokbot"}
          maxLength={60}
          required
          aria-describedby={`${id}-hint`}
          className={inputClass}
        />
      </div>
      <div>
        <SubmitButton pendingLabel="Making the key…">Make a key</SubmitButton>
      </div>
    </form>
  );
}
