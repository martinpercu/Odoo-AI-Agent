"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Search, X, Loader2 } from "lucide-react";
import { searchEntities } from "@/lib/api";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import type { EntitySearchResult } from "@/lib/types";

interface EntityAutocompleteProps {
  chatId: string;
  model: string;
  value: EntitySearchResult | null;
  onChange: (value: EntitySearchResult | null) => void;
  placeholder?: string;
}

export function EntityAutocomplete({
  chatId,
  model,
  value,
  onChange,
  placeholder,
}: EntityAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EntitySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { config: odooConfig } = useOdooConfig();
  const t = useTranslations("ChatMessages");
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const doSearch = useCallback(
    async (searchQuery: string) => {
      if (!odooConfig || searchQuery.length < 2) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await searchEntities(chatId, model, searchQuery, odooConfig);
        if (res.success && res.results) {
          setResults(res.results);
        } else {
          setResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    },
    [chatId, model, odooConfig]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(entity: EntitySearchResult) {
    onChange(entity);
    setQuery("");
    setIsOpen(false);
    setResults([]);
  }

  function handleClear() {
    onChange(null);
    setQuery("");
    setResults([]);
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
        <span className="flex-1 truncate">{value.name}</span>
        <button
          type="button"
          onClick={handleClear}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
        <Search size={14} className="shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder || t("actionProposal.searching")}
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
        {isSearching && <Loader2 size={14} className="shrink-0 animate-spin text-muted-foreground" />}
      </div>

      {isOpen && (results.length > 0 || (query.length >= 2 && !isSearching)) && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
          {results.length > 0 ? (
            <ul className="max-h-48 overflow-y-auto py-1">
              {results.map((entity) => (
                <li key={entity.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(entity)}
                    className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  >
                    <span className="font-medium">{entity.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">#{entity.id}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {t("actionProposal.noResults")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
