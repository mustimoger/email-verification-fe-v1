"use client";

import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { AlertCircle, UploadCloud } from "lucide-react";

import { DashboardShell } from "../components/dashboard-shell";

type VerificationResult = {
  email: string;
  status: "pending";
  message: string;
};

const MAX_FILES = 5;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function normalizeEmails(raw: string) {
  const tokens: string[] = [];
  raw
    .split("\n")
    .map((line) => line.split(","))
    .flat()
    .forEach((piece) => {
      const value = piece.trim();
      if (value) tokens.push(value);
    });
  return Array.from(new Set(tokens));
}

export default function VerifyPage() {
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [errors, setErrors] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleVerify = () => {
    const parsed = normalizeEmails(inputValue);
    if (parsed.length === 0) {
      setErrors("Add at least one email to verify.");
      setResults([]);
      return;
    }
    setErrors(null);
    const pendingResults = parsed.map<VerificationResult>((email) => ({
      email,
      status: "pending",
      message: "Awaiting verification (connect FastAPI backend).",
    }));
    console.info("[verify/manual] queued emails for verification", {
      count: pendingResults.length,
    });
    setResults(pendingResults);
  };

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      setFileError("No files selected.");
      return;
    }
    const incoming = Array.from(fileList);
    if (incoming.length > MAX_FILES) {
      setFileError(`Select up to ${MAX_FILES} files at once.`);
      return;
    }
    const tooLarge = incoming.find((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (tooLarge) {
      setFileError(`${tooLarge.name} exceeds the 5 MB limit.`);
      return;
    }
    setFileError(null);
    setFiles(incoming);
    console.info("[verify/upload] files selected", {
      count: incoming.length,
      names: incoming.map((f) => f.name),
    });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleFilesSelected(event.dataTransfer.files);
  };

  return (
    <DashboardShell>
      <section className="flex flex-col gap-8">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100">
            <h2 className="text-lg font-extrabold text-slate-900">
              Add Emails To Verify
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Enter emails comma separated or on their own line
            </p>
            <div className="mt-4">
              <textarea
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                rows={8}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 shadow-inner outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
                placeholder={"email1@domain1.com\nemail2@domain2.com"}
              />
            </div>
            {errors ? (
              <div
                className="mt-2 flex items-center gap-2 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
                role="alert"
                aria-live="polite"
              >
                <AlertCircle className="h-4 w-4" />
                {errors}
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleVerify}
              className="mt-4 w-full rounded-lg bg-[#ffe369] px-4 py-3 text-center text-sm font-bold uppercase text-slate-900 shadow-sm transition hover:bg-[#ffd84d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
            >
              Verify
            </button>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100 lg:col-span-2">
            <h2 className="text-lg font-extrabold text-slate-900">Results</h2>
            <div className="mt-4 min-h-[220px] rounded-xl border border-slate-200 bg-slate-50 p-4">
              {results.length === 0 ? (
                <p className="text-sm font-semibold text-slate-500">
                  Results will appear here after verification.
                </p>
              ) : (
                <ul className="space-y-3">
                  {results.map((item) => (
                    <li
                      key={item.email}
                      className="flex items-start justify-between rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-100"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {item.email}
                        </p>
                        <p className="text-xs font-medium text-slate-500">
                          {item.message}
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase text-amber-700">
                        Pending
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200" />

        <div className="flex flex-col items-center gap-2 text-center">
          <h3 className="text-lg font-extrabold text-slate-900">File Upload</h3>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            CSV, XLS, XSLX FILE TYPES SUPPORTED
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div
            className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ffe369]">
              <UploadCloud className="h-8 w-8 text-slate-900" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-700">
                Drag and drop files here
              </p>
              <p className="text-sm font-semibold text-slate-700">or</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-[#4c61cc] hover:text-[#4c61cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
              >
                Browse Files
              </button>
              <p className="text-xs font-semibold text-slate-500">
                Upload up to 5 files (max 5 MB each)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              multiple
              className="hidden"
              onChange={(event) => handleFilesSelected(event.target.files)}
            />
          </div>
          {fileError ? (
            <div
              className="mt-3 flex items-center gap-2 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
              role="alert"
              aria-live="polite"
            >
              <AlertCircle className="h-4 w-4" />
              {fileError}
            </div>
          ) : null}
          {files.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-bold text-slate-700">
                Files queued (no upload yet):
              </p>
              <ul className="space-y-1">
                {files.map((file) => (
                  <li
                    key={file.name}
                    className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    <span className="truncate">{file.name}</span>
                    <span className="text-xs font-medium text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </DashboardShell>
  );
}
