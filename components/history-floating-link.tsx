"use client";

import type { MouseEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";

type HistoryFloatingLinkProps = {
  href: string;
  children: ReactNode;
};

export function HistoryFloatingLink({ href, children }: HistoryFloatingLinkProps) {
  const router = useRouter();

  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(href);
  }

  return (
    <a className="history-back-floating" href={href} onClick={navigate}>
      {children}
    </a>
  );
}
