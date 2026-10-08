"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeftRight } from "lucide-react";
import { MarkB } from "@/components/AgentMark";
import dynamic from "next/dynamic";
import { ChatInput } from "@/components/chat/chat-input";
import { useChatContext } from "@/components/app-shell";
import { useOdooConfig } from "@/hooks/use-odoo-config";
import { useSession } from "@/hooks/use-session";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { useRouter, Link } from "@/i18n/navigation";
import { DemoBanner } from "@/components/chat/demo-banner";
import { PartnerNudge } from "@/components/intro/partner-nudge";

const InstanceSnapshot = dynamic(
  () => import("@/components/chat/instance-snapshot").then((m) => m.InstanceSnapshot),
  { ssr: false }
);

const SuggestionCarousel = dynamic(
  () => import("@/components/chat/suggestion-carousel").then((m) => m.SuggestionCarousel),
  { ssr: false }
);

export default function NewChatPage() {
  const router = useRouter();
  const t = useTranslations("NewChat");
  const { sendMessage, isStreaming, stopStreaming, createChat, isPlayingAudio, stopAudio } = useChatContext();
  const { isConfigured, isDemoMode, activeConfig } = useOdooConfig();
  const { meData } = useSession();
  const { sttAvailable, autoSendVoice, onTranscribe } = useVoiceInput();

  const sessionReady = meData !== null;
  const isClient = meData?.user?.role === "CLIENT_USER";
  const brandLogoUrl = sessionReady && isClient ? (meData?.org?.brand_logo_url ?? null) : null;
  const brandName = sessionReady && isClient ? (meData?.org?.brand_name ?? null) : null;

  // CLIENT_USER with an assigned instance that isn't active yet (unset / invalid) → block chat.
  const isClientBlocked =
    isClient &&
    !isDemoMode &&
    !!activeConfig &&
    activeConfig.connection_status !== "active";

  async function handleSend(content: string, image?: File) {
    if (isClientBlocked) {
      router.push("/settings/odoo");
      return;
    }
    const id = createChat(content || "Image upload");
    router.push(`/chat/${id}`);
    sendMessage(content, id, image);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isDemoMode && <DemoBanner />}
      {isDemoMode && <PartnerNudge />}
      {isClientBlocked && (
        <div className="flex items-center justify-center gap-3 border-b border-border bg-warning-subtle px-4 py-2 text-small text-warning-solid shrink-0">
          <Link
            href="/settings/odoo"
            className="font-medium underline underline-offset-2 hover:no-underline"
          >
            {t("noCredsBanner")}
          </Link>
        </div>
      )}
      {/* El centro SCROLLEA y el input queda fijo abajo: en una pantalla baja
          (iPhone SE) el contenido no entra, y sin `overflow-y-auto` + `min-h-0`
          empujaba el input fuera de la pantalla sin forma de llegar a él.
          ⚠️ Se centra con `m-auto` en el hijo, no con `items-center`: éste, con
          overflow, recorta por arriba Y por abajo; `m-auto` centra si entra y
          arranca desde arriba si no. */}
      <div className="flex min-h-0 flex-1 overflow-y-auto px-4">
        <div className="m-auto w-full max-w-2xl py-6 short:py-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="mb-10 text-center short:mb-6 short:flex short:items-center short:gap-4 short:text-left"
          >
            {brandLogoUrl ? (
              <div className="mx-auto mb-6 flex items-center justify-center gap-4 short:mx-0 short:mb-0 short:shrink-0 short:gap-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-card bg-accent-subtle short:h-12 short:w-12">
                  <MarkB size={36} fg="currentColor" className="text-accent short:size-7" />
                </div>
                <ArrowLeftRight size={20} strokeWidth={1.5} className="text-text-muted short:size-4" />
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-card border border-border bg-surface short:h-12 short:w-12">
                  <img src={brandLogoUrl} alt={brandName ?? ""} className="h-full w-full object-contain" />
                </div>
              </div>
            ) : (
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-card bg-accent-subtle short:mx-0 short:mb-0 short:h-12 short:w-12 short:shrink-0">
                <MarkB size={36} fg="currentColor" className="text-accent short:size-7" />
              </div>
            )}
            <div>
              <h2 className="mb-3 text-display text-display-short-fit short:mb-1">{t("heading")}</h2>
              <p className="text-body text-text-secondary">{t("subheading")}</p>
            </div>
          </motion.div>

          {/* Primer valor en 60 segundos (quick-wins §9): la hoja en blanco se
              convierte en números reales de la propia instancia. Se renderiza sola
              a nada si no hay datos que mostrar. */}
          <InstanceSnapshot />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, delay: 0.1, ease: "easeOut" }}
          >
            <SuggestionCarousel
              onSelect={(text) => handleSend(text)}
              getLabel={(key) => t(`suggestions.${key}`)}
            />
          </motion.div>

          {!isConfigured && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.15, ease: "easeOut" }}
              className="mt-6 flex items-center justify-center gap-2 text-small"
            >
              <AlertTriangle size={16} strokeWidth={1.5} className="text-error" />
              <span className="text-error">{t("notConnected")}</span>
            </motion.div>
          )}
        </div>
      </div>

      <ChatInput
        onSend={handleSend}
        onStop={stopStreaming}
        isStreaming={isStreaming}
        disabled={isClientBlocked}
        sttAvailable={sttAvailable}
        onTranscribe={onTranscribe}
        autoSendVoice={autoSendVoice}
        isPlayingAudio={isPlayingAudio}
        onStopAudio={stopAudio}
      />
    </div>
  );
}
