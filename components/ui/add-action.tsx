"use client";

import { Button, ButtonLink } from "@/components/ui/button";
import { useAdminBase } from "@/lib/use-admin-base";

/**
 * The "add one" control that sits in a page header.
 *
 * Services, staff and customers each had their own: one built from
 * buttonClasses, one hand-rolled with its own padding and no minimum height,
 * one a Button with a padding override. Three buttons doing one job, at three
 * different heights, on three pages a click apart.
 *
 * The label collapses to the bare plus below `sm`, where a header has room for
 * a title or a sentence, not both.
 */
export function AddAction({
  label,
  href,
  onClick,
}: {
  /** Shown from `sm` up; the plus is always there. */
  label: string;
  /** An `/admin/...` path for pages that add on their own screen. */
  href?: string;
  /** A handler for pages that add in a dialog. */
  onClick?: () => void;
}) {
  // ButtonLink is a plain next/link, which would walk straight out of the
  // /demo/{slug} prefix and load the wrong tenant. Same rewrite AdminLink does
  // on the server, done here because this component is a client one.
  const adminBase = useAdminBase();
  const inner = (
    <>
      <span aria-hidden>+</span>
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </>
  );

  if (href) {
    const to = href.startsWith("/admin")
      ? `${adminBase}${href.slice("/admin".length)}` || adminBase
      : href;
    return (
      <ButtonLink href={to} variant="primary" radius="full">
        {inner}
      </ButtonLink>
    );
  }
  return (
    <Button type="button" variant="primary" radius="full" onClick={onClick}>
      {inner}
    </Button>
  );
}
