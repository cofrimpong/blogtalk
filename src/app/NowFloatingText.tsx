"use client";

import useAudienceMode from "./useAudienceMode";

export default function NowFloatingText() {
  const { isObserver } = useAudienceMode();

  return (
    <p className="mt-2 text-sm leading-6 opacity-85">
      {isObserver
        ? "Chrissy is building her AI consultant workflow and publishing design updates in real time."
        : "Building my AI consultant workflow and pushing design updates in real time."}
    </p>
  );
}
