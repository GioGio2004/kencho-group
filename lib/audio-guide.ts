/*
 * Audio guide configuration.
 *
 * TODO: drop real recordings at public/audio/guide-{ka,ru,en}.mp3
 * (currently 2s silent placeholders) — see content/voiceover-scripts.md
 * for the scripts formatted for recording. Update DURATION_SECONDS to
 * the real length afterwards (used for display before metadata loads).
 */

export const AUDIO_SRC: Record<"ka" | "ru" | "en", string> = {
  ka: "/audio/guide-ka.mp3",
  ru: "/audio/guide-ru.mp3",
  en: "/audio/guide-en.mp3",
};

/** Display fallback until the file's metadata reports the true length. */
export const DURATION_SECONDS = 55;

/*
 * Which section each part of the narration relates to. Used only to
 * update a small label inside the player — it must NEVER scroll the
 * page (that would fight the user). Times are seconds into the audio;
 * tune after the real recordings arrive.
 */
export const GUIDE_TIMESTAMPS: ReadonlyArray<{
  time: number;
  sectionId: "hero" | "manifesto" | "process" | "contact";
}> = [
  { time: 0, sectionId: "hero" },
  { time: 9, sectionId: "manifesto" },
  { time: 20, sectionId: "process" },
  { time: 46, sectionId: "contact" },
];

export const SESSION_KEY_DISMISSED = "kg:audio-dismissed";
