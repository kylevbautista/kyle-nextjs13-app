"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import toast from "react-hot-toast";
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

const fieldClass =
  "min-h-11 min-w-0 w-full max-w-full rounded-md border border-[rgb(53,53,53)] bg-[rgb(18,18,18)] px-3 py-2 text-base text-white [color-scheme:dark] placeholder:text-[rgb(110,110,110)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 aria-[invalid=true]:border-rose-400 md:min-h-0";

const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(30,30,30)] aria-disabled:cursor-not-allowed aria-disabled:opacity-60 md:min-h-10";

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
  const statusRef = useRef<HTMLSelectElement>(null);
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
      className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto overscroll-contain rounded-lg border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] p-0 text-white shadow-2xl backdrop:bg-black/70"
    >
      <div className="flex flex-col gap-5 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          {cover && (
            <div className="relative h-[72px] w-[48px] shrink-0 overflow-hidden rounded bg-[rgb(38,38,38)]">
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
            <h2 id={titleId} className="break-words text-lg font-semibold leading-snug">
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
            className="-mr-1 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-xl leading-none text-[rgb(164,164,164)] hover:bg-[rgb(53,53,53)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] aria-disabled:opacity-60 md:h-9 md:w-9"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <form noValidate onSubmit={handleSave} className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={fieldId("status")} className="text-sm font-medium">
              Status
            </label>
            <select
              ref={statusRef}
              id={fieldId("status")}
              value={values.status}
              onChange={(event) => {
                if (isListStatus(event.target.value)) update({ status: event.target.value });
              }}
              className={fieldClass}
            >
              {LIST_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {LIST_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={fieldId("progress")} className="text-sm font-medium">
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
            <label htmlFor={fieldId("score")} className="text-sm font-medium">
              Score <span className="font-normal text-[rgb(164,164,164)]">(0–10)</span>
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

          <div className="hidden sm:block" aria-hidden="true" />

          <div className="flex flex-col gap-1.5">
            <label htmlFor={fieldId("startDate")} className="text-sm font-medium">
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
            <label htmlFor={fieldId("finishDate")} className="text-sm font-medium">
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
              className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-200 sm:col-span-2"
            >
              {formError}
            </p>
          )}

          {confirmingRemove ? (
            <div
              role="group"
              aria-labelledby={`${id}-confirm`}
              className="flex flex-col gap-3 rounded-md border border-rose-500/40 bg-rose-500/10 p-3 sm:col-span-2"
            >
              <p id={`${id}-confirm`} className="break-words text-sm">
                Remove <strong>{title}</strong> from your list? Its progress, score and dates will
                be lost.
              </p>
              <div className="grid grid-cols-1 gap-2 min-[375px]:grid-cols-2 sm:flex sm:flex-wrap sm:justify-end">
                <button
                  ref={keepButtonRef}
                  type="button"
                  onClick={cancelConfirm}
                  aria-disabled={busy !== null || undefined}
                  className={`${buttonClass} border border-[rgb(53,53,53)] bg-[rgb(38,38,38)] hover:bg-[rgb(53,53,53)]`}
                >
                  Keep it
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  aria-disabled={busy !== null || undefined}
                  className={`${buttonClass} bg-rose-600 hover:bg-rose-500`}
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
                className={`${buttonClass} px-2 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 sm:-ml-2`}
              >
                Remove from list
              </button>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={requestClose}
                  aria-disabled={busy !== null || undefined}
                  className={`${buttonClass} border border-[rgb(53,53,53)] bg-[rgb(38,38,38)] hover:bg-[rgb(53,53,53)]`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  aria-disabled={busy !== null || undefined}
                  className={`${buttonClass} bg-blue-600 hover:bg-blue-500`}
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
