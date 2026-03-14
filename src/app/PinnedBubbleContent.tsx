"use client";

import useAudienceMode from "./useAudienceMode";

type PinnedBubbleContentProps = {
  htmlContent: string;
};

export default function PinnedBubbleContent({ htmlContent }: PinnedBubbleContentProps) {
  const { isObserver } = useAudienceMode();

  if (isObserver) {
    return (
      <div className="prose prose-zinc editorial-prose max-w-none prose-p:my-3 prose-headings:mb-3 prose-headings:mt-0 dark:prose-invert">
        <h2>Welcome to Chrissy&apos;s Verse</h2>
        <p>This is Chrissy&apos;s cozy cloud corner for web presence updates.</p>
        <p>
          Expect launch notes, project snapshots, collaborations, and quick updates on what Chrissy is building across
          platforms.
        </p>
      </div>
    );
  }

  return (
    <div
      className="prose prose-zinc editorial-prose max-w-none prose-p:my-3 prose-headings:mb-3 prose-headings:mt-0 dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
