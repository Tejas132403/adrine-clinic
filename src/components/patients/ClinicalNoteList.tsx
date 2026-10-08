"use client";

import { FileHeart, Stethoscope } from "lucide-react";
import type { NoteItem } from "@/types";
import { Skeleton } from "@/components/ui/States";
import { formatDateShort, formatRelative, formatTime } from "@/utils/format";

/** Chronological clinical notes for one patient. */
export function ClinicalNoteList({ notes, loading }: { notes: NoteItem[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3 px-4 py-4 sm:px-5">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center px-4 py-8 text-center sm:px-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <FileHeart className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <p className="mt-2.5 text-sm font-medium text-ink">No clinical notes yet</p>
        <p className="mt-1 max-w-xs text-xs text-ink-soft">
          Notes recorded by doctors against a visit will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {notes.map((note) => (
        <li key={note.id} className="px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
              <Stethoscope className="h-3.5 w-3.5 text-brand-600" aria-hidden />
              {note.doctor.name}
            </span>
            <span className="text-xs text-ink-soft" title={new Date(note.createdAt).toLocaleString("en-IN")}>
              {formatRelative(note.createdAt)}
            </span>
          </div>

          <p className="mt-0.5 text-xs text-ink-soft">
            Visit {formatDateShort(note.appointment.appointmentDate)} ·{" "}
            {formatTime(note.appointment.startTime)} · {note.appointment.reason}
          </p>

          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-muted">{note.note}</p>
        </li>
      ))}
    </ul>
  );
}
