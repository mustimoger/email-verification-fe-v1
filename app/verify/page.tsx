"use client";

import { useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { AlertCircle, UploadCloud } from "lucide-react";
import {
  Cell,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
} from "recharts";

import { DashboardShell } from "../components/dashboard-shell";

type VerificationResult = {
  email: string;
  status: "pending";
  message: string;
};

type FileVerificationStatus = "download" | "pending";

type FileVerification = {
  fileName: string;
  totalEmails: number;
  valid: number;
  catchAll: number;
  invalid: number;
  status: FileVerificationStatus;
};

type UploadSummary = {
  totalEmails: number;
  uploadDate: string;
  files: FileVerification[];
  aggregates: {
    valid: number;
    catchAll: number;
    invalid: number;
  };
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

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function deriveUploadSummary(selectedFiles: File[]): UploadSummary {
  const files: FileVerification[] = selectedFiles.map((file, index) => {
    const base = Math.max(50, Math.round((file.size || file.name.length * 10) / 256));
    const valid = Math.max(10, Math.round(base * 0.78));
    const catchAll = Math.max(0, Math.round(base * 0.05));
    const invalid = Math.max(1, base - valid - catchAll);
    const totalEmails = valid + catchAll + invalid;
    const status: FileVerificationStatus =
      index === selectedFiles.length - 1 ? "pending" : "download";

    return {
      fileName: file.name,
      totalEmails,
      valid,
      catchAll,
      invalid,
      status,
    };
  });

  const aggregates = files.reduce(
    (acc, file) => ({
      valid: acc.valid + file.valid,
      catchAll: acc.catchAll + file.catchAll,
      invalid: acc.invalid + file.invalid,
    }),
    { valid: 0, catchAll: 0, invalid: 0 },
  );

  const totalEmails = files.reduce((sum, file) => sum + file.totalEmails, 0);
  const uploadDate = new Date().toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return { files, aggregates, totalEmails, uploadDate };
}

export default function VerifyPage() {
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [errors, setErrors] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);
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
    const summary = deriveUploadSummary(incoming);
    setUploadSummary(summary);

    console.info("[verify/upload] files selected", {
      count: incoming.length,
      names: incoming.map((f) => f.name),
      totalEmails: summary.totalEmails,
    });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleFilesSelected(event.dataTransfer.files);
  };

  const resetUpload = () => {
    setFiles([]);
    setUploadSummary(null);
    setFileError(null);
  };

  const validationSlices = useMemo(() => {
    if (!uploadSummary || uploadSummary.totalEmails === 0) {
      return [];
    }
    return [
      { name: "Valid", value: uploadSummary.aggregates.valid, color: "#00b69b" },
      { name: "Catch-all", value: uploadSummary.aggregates.catchAll, color: "#ff990a" },
      { name: "Invalid", value: uploadSummary.aggregates.invalid, color: "#597cff" },
    ];
  }, [uploadSummary]);

  const validPercent = useMemo(() => {
    if (!uploadSummary || uploadSummary.totalEmails === 0) return 0;
    return Math.round(
      (uploadSummary.aggregates.valid / uploadSummary.totalEmails) * 100,
    );
  }, [uploadSummary]);

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

        {uploadSummary ? (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Verification Results
                  </h3>
                  <span className="text-xs font-bold uppercase text-slate-600">
                    Total Emails : {formatNumber(uploadSummary.totalEmails)}
                  </span>
                </div>
                <span className="text-xs font-bold uppercase text-slate-600">
                  Upload Date : {uploadSummary.uploadDate}
                </span>
              </div>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-6 bg-slate-50 px-4 py-3 text-xs font-bold uppercase text-slate-700">
                  <span>File Name</span>
                  <span>Total Emails</span>
                  <span>Valid Emails</span>
                  <span>Catch-all</span>
                  <span>Invalid</span>
                  <span className="text-right">Status</span>
                </div>
                <div className="divide-y divide-slate-200">
                  {uploadSummary.files.map((file, index) => (
                    <div
                      key={`${file.fileName}-${index}`}
                      className="grid grid-cols-6 items-center px-4 py-3 text-sm font-semibold text-slate-800"
                    >
                      <span className="truncate" title={file.fileName}>
                        {file.fileName}
                      </span>
                      <span>{formatNumber(file.totalEmails)}</span>
                      <span>{formatNumber(file.valid)}</span>
                      <span>{formatNumber(file.catchAll)}</span>
                      <span>{formatNumber(file.invalid)}</span>
                      <span className="flex justify-end">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold text-white",
                            file.status === "download"
                              ? "bg-[#00b69b]"
                              : "bg-[#ff990a]",
                          ].join(" ")}
                        >
                          {file.status === "download" ? "Download" : "Pending"}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-[#4c61cc] hover:text-[#4c61cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
                >
                  Upload more files
                </button>
                <button
                  type="button"
                  onClick={resetUpload}
                  className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
                >
                  Reset view
                </button>
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

            <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-slate-900">Validation</h3>
              </div>
              <div className="mt-6 h-[260px] w-full">
                {validationSlices.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-xl bg-slate-50 text-sm font-semibold text-slate-600">
                    No validation data yet.
                  </div>
                ) : (
                  <ResponsiveContainer>
                    <RePieChart>
                      <Pie
                        data={validationSlices}
                        dataKey="value"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={2}
                        startAngle={90}
                        endAngle={450}
                      >
                        {validationSlices.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                    </RePieChart>
                  </ResponsiveContainer>
                )}
              </div>
              {validationSlices.length > 0 ? (
                <div className="mt-2 text-center text-sm font-bold text-slate-800">
                  {validPercent}% VALID
                </div>
              ) : null}
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-semibold text-slate-600">
                {validationSlices.map((slice) => (
                  <div key={slice.name} className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="truncate">{slice.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
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
                    Files queued (not uploaded):
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
          </>
        )}
      </section>
    </DashboardShell>
  );
}
