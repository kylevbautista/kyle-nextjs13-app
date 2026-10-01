"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import toast from "react-hot-toast";
import { SageTag } from "@/components/home/SageLine";
import {
  FIELD,
  FOCUS_RING_PANEL,
  GHOST_BUTTON_PANEL,
  LABEL_CLASS,
  PRIMARY_BUTTON_PANEL,
} from "@/components/theme/tokens";
import { useMyList } from "@/components/utils/useMyList";
import { LIST_STATUSES, LIST_STATUS_LABELS, displayTitle, isListStatus } from "@/lib/anime/types";
import type { UserAnimeData } from "@/lib/anime/types";
import { errorMessage, saveUserData } from "./api";
import { formValuesFrom, parseEditForm } from "./editForm";
import type { EditFormErrors, EditFormField, EditFormValues } from "./editForm";
import { RELEASE_STATUS_LABELS, isReleaseStatus } from "./listFilters";
import type { MyListEntry } from "./listFilters";

interface EditEntryDialogProps {
  entry: MyListEntry;
  onClose: () => void;
  onSaved: (animeId: number, userData: UserAnimeData) => void;
  onRemoved: (animeId: number) => void;
  /** Element to focus when the dialog closes (the card's Edit button)… */
  returnFocusId: string;
  /** …or this one when that element is gone (the entry was removed). */
  fallbackFocusId: string;
}

const fieldClass = `${FIELD} max-w-full`;

const ROSE_BUTTON = `inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-500 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 ${FOCUS_RING_PANEL}`;

const FIELD_ORDER: EditFormField[] = ["progress", "score", "startDate", "finishDate"];

/**
 * ::backdrop clicks target the <dialog> itself, but so do clicks on its own
 * scrollbar, so also require the pointer to be outside the dialog's box.
 */
const isBackdropEvent = (event: MouseEvent<HTMLDialogElement>) => {
  if (event.target !== event.currentTarget) return false;
  const rect = event.currentTarget.getBoundingClientRect();
  return (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  );
};

export function EditEntryDialog({
  entry,
  onClose,
  onSaved,
  onRemoved,
  returnFocusId,
  fallbackFocusId,
}: EditEntryDialogProps) {
  const { remove, signedIn, sessionStatus } = useMyList();
  const dialogRef = useRef<HTMLDialogElement>(null);
  /** The checked status radio (focused when the dialog opens). */
  const statusRef = useRef<HTMLInputElement>(null);
  const removeButtonRef = useRef<HTMLButtonElement>(null);
  const keepButtonRef = useRef<HTMLButtonElement>(null);
  const pressedOnBackdrop = useRef(false);

  const id = useId();
  const titleId = `${id}-title`;
  const fieldId = (field: EditFormField | "status") => `${id}-${field}`;
  const errorId = (field: EditFormField) => `${id}-${field}-error`;

  // Compare against the data the form was opened with, even if a "+1" lands meanwhile.
  const [initial] = useState(entry.userData);
  const [values, setValues] = useState<EditFormValues>(() => formValuesFrom(entry.userData));
  const [errors, setErrors] = useState<EditFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const title = displayTitle(entry);
  const total = entry.episodes && entry.episodes > 0 ? entry.episodes : null;
  const cover = entry.coverImage?.medium ?? entry.coverImage?.large ?? null;
  const releaseLabel = isReleaseStatus(entry.status) ? RELEASE_STATUS_LABELS[entry.status] : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    statusRef.current?.focus();
    return () => {
      body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      const target =
        document.getElementById(returnFocusId) ?? document.getElementById(fallbackFocusId);
      target?.focus();
    };
  }, [returnFocusId, fallbackFocusId]);

  const requestClose = () => {
    if (!busy) onClose();
  };

  const update = (patch: Partial<EditFormValues>) => {
    setValues((current) => ({ ...current, ...patch }));
  };

  const fieldProps = (field: EditFormField) => ({
    id: fieldId(field),
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? errorId(field) : undefined,
  });

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const result = parseEditForm(values, { episodes: entry.episodes, initial });
    if (!result.ok) {
      setErrors(result.errors);
      setFormError(null);
      const firstInvalid = FIELD_ORDER.find((field) => result.errors[field]);
      if (firstInvalid) document.getElementById(fieldId(firstInvalid))?.focus();
      return;
    }
    setErrors({});
    setFormError(null);
    setBusy("save");
    try {
      const saved = await saveUserData(entry.id, result.userData);
      toast.success(`Saved ${title}`);
      setBusy(null);
      onSaved(entry.id, saved);
    } catch (err) {
      const message = errorMessage(err);
      setFormError(message);
      toast.error(message);
      setBusy(null);
    }
  }

  async function handleRemove() {
    if (busy) return;
    // useMyList can't send anything until the client session is authenticated.
    if (!signedIn) {
      setFormError(
        sessionStatus === "loading"
          ? "Still checking your sign-in. Try again in a moment."
          : "Your session has expired. Sign in again to edit your list."
      );
      return;
    }
    setFormError(null);
    setBusy("remove");
    // useMyList keeps the global "on my list" state in sync and shows its own toasts.
    const removed = await remove(entry);
    setBusy(null);
    if (removed) {
      onRemoved(entry.id);
    } else {
      setFormError(`Couldn't remove ${title}. Please try again.`);
    }
  }

  const startConfirm = () => {
    if (busy) return;
    flushSync(() => setConfirmingRemove(true));
    keepButtonRef.current?.focus();
  };

  const cancelConfirm = () => {
    flushSync(() => setConfirmingRemove(false));
    removeButtonRef.current?.focus();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Esc: let React state drive closing.
        event.preventDefault();
        requestClose();
      }}
      onClose={() => {
        // Closed natively (e.g. a repeated Esc). Ignore stale events once reopened.
        if (!dialogRef.current?.open) onClose();
      }}
      onMouseDown={(event) => {
        pressedOnBackdrop.current = isBackdropEvent(event);
      }}
      onClick={(event) => {
        if (pressedOnBackdrop.current && isBackdropEvent(event)) requestClose();
        pressedOnBackdrop.current = false;
      }}
      className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-[#95ccff]/25 bg-[rgb(30,30,30)] p-0 text-white shadow-2xl shadow-black/60 backdrop:bg-black/60 open:animate-[grow_150ms_ease-out,fadeOut_150ms_ease-out]"
    >
      <div className="flex flex-col gap-5 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          {cover && (
            <div
              className="relative h-[68px] w-12 shrink-0 overflow-hidden rounded-md bg-[rgb(53,53,53)]"
              style={entry.coverImage?.color ? { backgroundColor: entry.coverImage.color } : undefined}
            >
              <Image
                src={cover}
                alt={`Cover art for ${title}`}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs text-[#cfe8ff]">
              <SageTag kind="Analyze" />
              Edit entry
            </p>
            <h2 id={titleId} className="mt-1 break-words text-xl font-bold leading-snug">
              {title}
            </h2>
            <p className="mt-1 text-sm text-[rgb(164,164,164)]">
              {total ? `${total} episode${total === 1 ? "" : "s"}` : "Episode count unknown"}
              {releaseLabel && ` · ${releaseLabel}`}
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            aria-disabled={busy !== null || undefined}
            className="-mr-1 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl leading-none text-[rgb(164,164,164)] hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] aria-disabled:opacity-60 md:h-9 md:w-9"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <form noValidate onSubmit={handleSave} className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <fieldset className="min-w-0 sm:col-span-2">
            <legend className={`mb-2 ${LABEL_CLASS}`}>Status</legend>
            <div className="flex flex-wrap gap-1.5">
              {LIST_STATUSES.map((status) => (
                <label key={status} className="relative cursor-pointer">
                  <input
                    ref={values.status === status ? statusRef : undefined}
                    type="radio"
                    name={fieldId("status")}
                    value={status}
                    checked={values.status === status}
                    onChange={(event) => {
                      if (isListStatus(event.target.value)) update({ status: event.target.value });
                    }}
                    className="peer sr-only"
                  />
                  <span className="inline-flex h-11 items-center rounded-full border border-[rgb(53,53,53)] px-3 text-xs font-medium text-[rgb(200,206,218)] transition-colors hover:bg-white/5 peer-checked:border-blue-500 peer-checked:bg-blue-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#95ccff] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[rgb(30,30,30)] md:h-9">
                    {LIST_STATUS_LABELS[status]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={fieldId("progress")} className={LABEL_CLASS}>
              Episode progress
            </label>
            <div className="flex items-center gap-2">
              <input
                {...fieldProps("progress")}
                type="number"
                inputMode="numeric"
                min={0}
                max={total ?? undefined}
                step={1}
                value={values.progress}
                onChange={(event) => update({ progress: event.target.value })}
                className={fieldClass}
              />
              <span className="shrink-0 text-sm text-[rgb(164,164,164)]">/ {total ?? "?"}</span>
            </div>
            {errors.progress && (
              <p id={errorId("progress")} className="text-xs text-rose-300">
                {errors.progress}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={fieldId("score")} className={LABEL_CLASS}>
              Score <span className="font-normal normal-case tracking-normal">(0–10)</span>
            </label>
            <input
              {...fieldProps("score")}
              type="number"
              inputMode="decimal"
              min={0}
              max={10}
              step={0.5}
              placeholder="No score"
              value={values.score}
              onChange={(event) => update({ score: event.target.value })}
              className={fieldClass}
            />
            {errors.score && (
              <p id={errorId("score")} className="text-xs text-rose-300">
                {errors.score}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={fieldId("startDate")} className={LABEL_CLASS}>
              Start date
            </label>
            <input
              {...fieldProps("startDate")}
              type="date"
              value={values.startDate}
              onChange={(event) => update({ startDate: event.target.value })}
              className={fieldClass}
            />
            {errors.startDate && (
              <p id={errorId("startDate")} className="text-xs text-rose-300">
                {errors.startDate}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={fieldId("finishDate")} className={LABEL_CLASS}>
              Finish date
            </label>
            <input
              {...fieldProps("finishDate")}
              type="date"
              value={values.finishDate}
              onChange={(event) => update({ finishDate: event.target.value })}
              className={fieldClass}
            />
            {errors.finishDate && (
              <p id={errorId("finishDate")} className="text-xs text-rose-300">
                {errors.finishDate}
              </p>
            )}
          </div>

          {formError && (
            <p
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 sm:col-span-2"
            >
              <SageTag kind="Report" />
              {formError}
            </p>
          )}

          {confirmingRemove ? (
            <div
              role="group"
              aria-labelledby={`${id}-confirm`}
              className="flex flex-col gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 sm:col-span-2"
            >
              <p id={`${id}-confirm`} className="break-words text-sm">
                <span aria-hidden="true" className="font-mono text-rose-300">
                  《Warning》{" "}
                </span>
                Remove <strong>{title}</strong> from your list? Its progress, score and dates will
                be lost.
              </p>
              <div className="grid grid-cols-1 gap-2 min-[375px]:grid-cols-2 sm:flex sm:flex-wrap sm:justify-end">
                <button
                  ref={keepButtonRef}
                  type="button"
                  onClick={cancelConfirm}
                  aria-disabled={busy !== null || undefined}
                  className={GHOST_BUTTON_PANEL}
                >
                  Keep it
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  aria-disabled={busy !== null || undefined}
                  className={ROSE_BUTTON}
                >
                  {busy === "remove" ? "Removing…" : "Yes, remove"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:flex-wrap-reverse sm:items-center sm:justify-between">
              <button
                ref={removeButtonRef}
                type="button"
                onClick={startConfirm}
                aria-disabled={busy !== null || undefined}
                className={`inline-flex h-11 items-center justify-center rounded-xl px-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/10 hover:text-rose-200 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 sm:-ml-2 ${FOCUS_RING_PANEL}`}
              >
                Remove from list
              </button>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={requestClose}
                  aria-disabled={busy !== null || undefined}
                  className={GHOST_BUTTON_PANEL}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  aria-disabled={busy !== null || undefined}
                  className={PRIMARY_BUTTON_PANEL}
                >
                  {busy === "save" ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </dialog>
  );
}
