"use client";

import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/components/ui/error-toast";
import { transcribeAudio } from "@/lib/api";
import { getVoiceBoolPref } from "@/lib/voice-prefs";

/** Agent-supported languages (see backend STT_FORCEABLE_LANGUAGES / root
 * CLAUDE.md — don't conflate with the UI's 11 locales). Anything else lets
 * Whisper auto-detect. */
const STT_FORCEABLE_LANGUAGES = new Set(["es", "en", "fr", "de", "pt", "it"]);

/**
 * Shared STT wiring for both chat pages: resolves whether the mic should be
 * shown (server entitlement AND the user's local pref) and provides the
 * onTranscribe callback ChatInput needs.
 */
export function useVoiceInput() {
  const { meData } = useSession();
  const t = useTranslations("ChatInput");
  const { showError } = useToast();
  const locale = useLocale();

  const sttEntitled = meData?.voice_features?.stt ?? false;
  const sttPrefOn = getVoiceBoolPref("stt", true);
  const sttAvailable = sttEntitled && sttPrefOn;
  const autoSendVoice = getVoiceBoolPref("autoSend", true);

  const onTranscribe = useCallback(
    async (blob: Blob): Promise<string | null> => {
      const language = STT_FORCEABLE_LANGUAGES.has(locale) ? locale : undefined;
      const result = await transcribeAudio(blob, language);
      if (!result.success || !result.text) {
        showError(t("transcribeError"));
        return null;
      }
      return result.text;
    },
    [locale, showError, t]
  );

  return { sttAvailable, autoSendVoice, onTranscribe };
}
