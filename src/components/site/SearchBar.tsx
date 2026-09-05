"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

export interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  /**
   * "header" is the masthead pill, "hero" the large centered band field,
   * "compact" a minimal inline field and "band" the squared field with the
   * gold action used on the light search band.
   */
  variant?: "header" | "hero" | "compact" | "band";
  autoFocus?: boolean;
  label?: string;
}

export function SearchBar({
  placeholder = "What are you looking for?",
  defaultValue = "",
  variant = "header",
  autoFocus = false,
  label = "Search LongIsland.io",
}: SearchBarProps) {
  const router = useRouter();
  const inputId = useId();
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  if (variant === "compact") {
    return (
      <form onSubmit={handleSubmit} role="search" className="w-full">
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        <div className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500">
          <Search aria-hidden="true" className="size-4 shrink-0 text-ink-400" />
          <input
            id={inputId}
            type="search"
            name="q"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
          />
          <button type="submit" className="sr-only">
            Search
          </button>
        </div>
      </form>
    );
  }

  const isHero = variant === "hero";
  const isBand = variant === "band";

  return (
    <form onSubmit={handleSubmit} role="search" className="w-full">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <div
        className={`flex items-center overflow-hidden border bg-white focus-within:ring-2 focus-within:ring-brand-500 ${
          isBand
            ? "rounded-md border-line"
            : isHero
              ? "rounded-full border-navy-200 shadow-lift"
              : "rounded-full border-navy-200"
        }`}
      >
        {isBand ? null : (
          <Search
            aria-hidden="true"
            className={`ml-4 shrink-0 text-ink-400 ${isHero ? "size-5" : "size-4"}`}
          />
        )}
        <input
          id={inputId}
          type="search"
          name="q"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`min-w-0 flex-1 bg-transparent text-ink-900 outline-none placeholder:text-ink-400 ${
            isBand
              ? "px-4 py-3 text-base"
              : isHero
                ? "px-3 py-3.5 text-base"
                : "px-3 py-2 text-sm"
          }`}
        />
        <button
          type="submit"
          className={`shrink-0 self-stretch font-semibold uppercase tracking-wide transition-colors ${
            isBand
              ? "bg-gold-400 px-8 text-sm text-navy-950 hover:bg-gold-300"
              : isHero
                ? "bg-brand-600 px-7 text-sm text-white hover:bg-brand-700"
                : "bg-brand-600 px-5 text-xs text-white hover:bg-brand-700"
          }`}
        >
          Search
        </button>
      </div>
    </form>
  );
}
