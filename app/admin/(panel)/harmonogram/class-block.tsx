"use client";

import { useState } from "react";
import { GroupEnrollForm } from "../zajecia/group-enroll-form";
import type { EnrollWords } from "../zajecia/group-enroll-form";
import { textOn, tint } from "@/lib/class-colors";

export type ClassBlockData = {
  /** Unique per meeting: the group and the date it falls on. */
  key: string;
  groupId: string;
  time: string;
  name: string;
  taken: number;
  min: number | null;
  max: number | null;
  names: string[];
  /** Minutes from midnight, Warsaw. */
  startMin: number;
  endMin: number;
  /** What a karnet sign-up here would cost and cover. */
  karnet: { lessons: number; pricePln: number } | null;
  /** The dates that sign-up would take, already formatted. */
  dates: string[];
  words: EnrollWords;
  /** Which day this meeting is, spelled out for the modal's heading. */
  dayLabel: string;
  /** The class's colour — see lib/class-colors.ts. */
  color: string;
};

/**
 * A class in the schedule: the hour it occupies, how full it is, and the way
 * to put somebody in it.
 *
 * Clicking the block adds a person to that class — the same gesture as
 * clicking an empty slot to make a booking, which is how the schedule already
 * works. There is no drag handle and no management modal, because a class
 * does not move and is not cancelled by dropping it somewhere else.
 */
function useEnroll() {
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);
  return { open, setOpen, round, again: () => setRound((r) => r + 1) };
}

function EnrollModal({
  data,
  round,
  onAgain,
  onClose,
}: {
  data: ClassBlockData;
  round: number;
  onAgain: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[400] flex items-start justify-center bg-black/70 px-4"
      style={{ paddingTop: "10vh", paddingBottom: "4vh" }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-800 px-5 py-4">
          <p className="text-sm font-semibold text-zinc-100">{data.name}</p>
          <p className="font-mono text-xs text-zinc-500">
            {data.dayLabel} · {data.time}
          </p>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          <GroupEnrollForm
            key={round}
            groupId={data.groupId}
            label={`${data.taken} zapisanych${data.min ? ` z ${data.min}` : ""}`}
            karnet={data.karnet}
            dates={data.dates}
            words={data.words}
            onAgain={onAgain}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}

/** Whether the group has gathered enough people to run. */
function isReady(data: ClassBlockData): boolean {
  const goal = data.min ?? data.max ?? null;
  return goal === null || data.taken >= goal;
}

function Fill({ data }: { data: ClassBlockData }) {
  const goal = data.min ?? data.max ?? null;
  const ready = isReady(data);
  const pct = goal ? Math.min(100, Math.round((data.taken / goal) * 100)) : 100;
  if (goal === null) {
    return <p className="mt-1 truncate text-[10px] opacity-80">zapisanych {data.taken}</p>;
  }
  return (
    <div className="mt-1.5">
      {/* On the solid fill the bar would be the class's colour on itself, so
          it switches to the text colour; while gathering it fills in the
          class's own. */}
      <div
        className="h-1 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: ready ? tint(textOn(data.color), 25) : tint(data.color, 20) }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: ready ? textOn(data.color) : data.color }}
        />
      </div>
      <p className="mt-1 truncate text-[10px] opacity-80">
        {data.taken} z {goal} {ready ? "— komplet" : "— zbieramy"}
      </p>
    </div>
  );
}

/**
 * The block in the class's colour: a saturated edge around a pale middle while
 * the group is gathering, filled solid once it has the people it needs to run.
 * So a week reads at a glance — which course is which, and which of them are
 * going ahead — without a grey outline that belonged to no class at all.
 */
function surface(data: ClassBlockData): React.CSSProperties {
  const ready = isReady(data);
  return {
    borderColor: data.color,
    borderWidth: 1.5,
    backgroundColor: ready ? data.color : tint(data.color, 12),
    color: ready ? textOn(data.color) : undefined,
  };
}

/**
 * A class in the day grid: the hour it occupies, how full it is, and the way
 * to put somebody in it.
 *
 * Clicking the block adds a person to that class — the same gesture as
 * clicking an empty slot to make a booking, which is how the schedule already
 * works. There is no drag handle and no management modal, because a class
 * does not move and is not cancelled by dropping it somewhere else.
 */
export function ClassBlock({
  data,
  top,
  height,
  left,
  width,
}: {
  data: ClassBlockData;
  top: number;
  height: number;
  /** Percentages — set when classes overlap and have to share the column. */
  left: string;
  width: string;
}) {
  const { open, setOpen, round, again } = useEnroll();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`${data.time} · ${data.name} — ${data.words.action.toLowerCase()}`}
        className="absolute overflow-hidden rounded-lg border px-2 py-1.5 text-left transition-[filter] hover:brightness-110"
        style={{ top, height, left, width, ...surface(data) }}
      >
        {/* Colours inherit from the surface: on the solid fill they have to
            be the fill's own readable foreground, which a zinc class would
            override. */}
        <p className={`truncate font-mono text-[11px] ${isReady(data) ? "opacity-80" : "text-zinc-400"}`}>
          {data.time}
        </p>
        <p className={`truncate text-xs font-medium ${isReady(data) ? "" : "text-zinc-100"}`}>
          {data.name}
        </p>
        <Fill data={data} />
        {height > 120 && data.names.length > 0 && (
          <p
            className={`mt-1.5 line-clamp-3 text-[10px] leading-snug ${
              isReady(data) ? "opacity-80" : "text-zinc-500"
            }`}
          >
            {data.names.join(", ")}
          </p>
        )}
      </button>

      {open && (
        <EnrollModal data={data} round={round} onAgain={again} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

/** The same class in the week view, where rows are lists rather than a time axis. */
export function ClassChip({ data }: { data: ClassBlockData }) {
  const { open, setOpen, round, again } = useEnroll();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`${data.time} · ${data.name} — ${data.words.action.toLowerCase()}`}
        className="block w-full rounded border px-1.5 py-1 text-left transition-[filter] hover:brightness-110"
        style={surface(data)}
      >
        <p className={`font-mono text-xs ${isReady(data) ? "opacity-80" : "text-zinc-300"}`}>
          {data.time}
        </p>
        <p className={`text-xs font-medium ${isReady(data) ? "" : "text-zinc-200"}`}>
          {data.name}
        </p>
        <Fill data={data} />
      </button>
      {open && (
        <EnrollModal data={data} round={round} onAgain={again} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
