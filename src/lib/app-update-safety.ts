/** Pausing a lesson must not discard the viewer's playback position. */
export function mediaBlocksUpdate(media: Pick<HTMLMediaElement, "ended" | "paused" | "currentTime">) {
  return !media.ended && (!media.paused || media.currentTime > 0);
}
