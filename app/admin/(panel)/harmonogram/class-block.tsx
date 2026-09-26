"use client";

import { useState } from "react";
import { GroupEnrollForm } from "../zajecia/group-enroll-form";
import type { EnrollWords } from "../zajecia/group-enroll-form";

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

function Fill({ data }: { data: ClassBlockData }) {
  const goal = data.min ?? data.max ?? null;
  const ready = goal === null || data.taken >= goal;
  const pct = goal ? Math.min(100, Math.round((data.taken / goal) * 100)) : 100;
  if (goal === null) {
    return <p className="mt-1 truncate text-[10px] text-zinc-400">zapisanych {data.taken}</p>;
  }
  return (
    <div className="mt-1.5">
      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: ready ? "var(--color-accent)" : "#71717a" }}
        />
      </div>
      <p className="mt-1 truncate text-[10px] text-zinc-400">
        {data.taken} z {goal} {ready ? "— komplet" : "— zbieramy"}
      </p>
    </div>
  );
}

function surface(data: ClassBlockData) {
  const goal = data.min ?? data.max ?? null;
  const ready = goal === null || data.taken >= goal;
  return {
    borderColor: ready ? "var(--color-accent)" : "#3f3f46",
    backgroundColor: ready
      ? "color-mix(in srgb, var(--color-accent) 18%, transparent)"
      : "color-mix(in srgb, var(--color-accent) 7%, transparent)",
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
        <p className="truncate font-mono text-[11px] text-zinc-400">{data.time}</p>
        <p className="truncate text-xs font-medium text-zinc-100">{data.name}</p>
        <Fill data={data} />
        {height > 120 && data.names.length > 0 && (
          <p className="mt-1.5 line-clamp-3 text-[10px] leading-snug text-zinc-500">
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
        className="block w-full rounded px-1.5 py-1 text-left transition-[filter] hover:brightness-110"
        style={{ borderLeft: "2px solid var(--color-accent)", ...surface(data) }}
      >
        <p className="font-mono text-xs text-zinc-300">{data.time}</p>
        <p className="text-xs font-medium text-zinc-200">{data.name}</p>
        <Fill data={data} />
      </button>
      {open && (
        <EnrollModal data={data} round={round} onAgain={again} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
