"use client";

import Link from "next/link";
import useAudienceMode from "./useAudienceMode";

type ConsultantQuickLinkProps = {
  className: string;
};

export default function ConsultantQuickLink({ className }: ConsultantQuickLinkProps) {
  const { isObserver } = useAudienceMode();

  if (isObserver) {
    return null;
  }

  return (
    <li>
      <Link href="/consultant" className={className}>
        Open consultant POC
      </Link>
    </li>
  );
}
