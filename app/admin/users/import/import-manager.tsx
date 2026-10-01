"use client";

import * as React from "react";
import * as XLSX from "xlsx";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  apiFetch,
  type AdminSite,
  type ApiError,
} from "@/lib/admin-api";

const ASSIGNABLE_ROLES = ["verificator", "auditor", "auditee"];
const STATUSES = ["active", "inactive", "suspended"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ParsedRow = {
  index: number;
  name: string;
  email: string;
  role: string;
  status: string;
  siteCodes: string[];
  department: string;
};

export type RowIssue = {
  index: number;
  message: string;
};

export function parseImportFile(sites: AdminSite[], fileName: string, buffer: ArrayBuffer): ParsedRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0] as string];
  if (!sheet) throw new Error(`No readable sheet in ${fileName}.`);
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const header = (grid[0] ?? []).map((cell) => String(cell).trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const nameCol = col("name");
  const emailCol = col("email");
  const roleCol = col("role");
  if (nameCol === -1 || emailCol === -1 || roleCol === -1) {
    throw new Error("Missing required columns. Use the template: name, email, role.");
  }
  const statusCol = col("status");
  const sitesCol = col("sites");
  const deptCol = col("department");
  const cell = (row: unknown[], i: number) => (i === -1 ? "" : String(row[i] ?? "").trim());

  return grid.slice(1).map((row, i) => ({
    index: i + 2,
    name: cell(row, nameCol),
    email: cell(row, emailCol).toLowerCase(),
    role: cell(row, roleCol).toLowerCase(),
    status: statusCol === -1 || !cell(row, statusCol) ? "active" : cell(row, statusCol).toLowerCase(),
    siteCodes: cell(row, sitesCol)
      .split(",")
      .map((code) => code.trim().toLowerCase())
      .filter(Boolean),
    department: cell(row, deptCol),
  }));
}

export function validateImportRows(sites: AdminSite[], rows: ParsedRow[]): RowIssue[] {
  const byCode = new Map(sites.map((site) => [site.code.toLowerCase(), site.id]));
  const seen = new Set<string>();
  const issues: RowIssue[] = [];
  for (const row of rows) {
    if (!row.name) issues.push({ index: row.index, message: "Name is required." });
    if (!EMAIL_RE.test(row.email)) {
      issues.push({ index: row.index, message: "Invalid email address." });
    } else if (seen.has(row.email)) {
      issues.push({ index: row.index, message: "Duplicate email inside the file." });
    } else {
      seen.add(row.email);
    }
    if (!ASSIGNABLE_ROLES.includes(row.role)) {
      issues.push({ index: row.index, message: `Role must be one of: ${ASSIGNABLE_ROLES.join(", ")}.` });
    }
    if (!STATUSES.includes(row.status)) {
      issues.push({ index: row.index, message: `Status must be one of: ${STATUSES.join(", ")}.` });
    }
    const unknown = row.siteCodes.filter((code) => !byCode.has(code));
    for (const code of unknown) {
      issues.push({ index: row.index, message: `Unknown site code: ${code}.` });
    }
    const known = row.siteCodes.length - unknown.length;
    if (row.role === "auditee" && known !== 1) {
      issues.push({ index: row.index, message: "Auditee needs exactly one site." });
    } else if (row.role !== "auditee" && ASSIGNABLE_ROLES.includes(row.role) && known < 1) {
      issues.push({ index: row.index, message: "At least one site is required." });
    }
  }
  return issues;
}

const TEMPLATE_CSV =
  "name,email,role,status,sites,department\n" +
  "Sari Wulandari,sari.wulandari@inspexo.id,auditee,active,plant-1,\n" +
  "Budi Santoso,budi.santoso@inspexo.id,auditor,active,\"plant-1,plant-2\",HSE\n";

type ImportResult = {
  created: Array<{ id: string; email: string }>;
  failed: Array<{ index: number; email: string | null; code: string }>;
};

type CredentialsResult = {
  credentials: Array<{ userId: string; email: string; tempPassword: string }>;
  failed: Array<{ userId: string; code: string }>;
};

export function ImportManager({ sites }: { sites: AdminSite[] }) {
  const [rows, setRows] = React.useState<ParsedRow[]>([]);
  const [issues, setIssues] = React.useState<RowIssue[]>([]);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [credentials, setCredentials] = React.useState<CredentialsResult | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const byCode = React.useMemo(
    () => new Map(sites.map((site) => [site.code.toLowerCase(), site.id])),
    [sites],
  );
  const issueByRow = React.useMemo(() => {
    const map = new Map<number, string[]>();
    for (const issue of issues) {
      map.set(issue.index, [...(map.get(issue.index) ?? []), issue.message]);
    }
    return map;
  }, [issues]);
  const validRows = rows.filter((row) => !issueByRow.has(row.index));

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inspexo-user-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setCredentials(null);
    setSelected([]);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseImportFile(sites, file.name, buffer);
      if (parsed.length === 0) throw new Error("The file contains no data rows.");
      if (parsed.length > 200) throw new Error("Maximum 200 rows per import.");
      setRows(parsed);
      setIssues(validateImportRows(sites, parsed));
      setFileName(file.name);
    } catch (err) {
      setRows([]);
      setIssues([]);
      setFileName(null);
      setError(err instanceof Error ? err.message : "Unable to read the file.");
    }
  }

  async function handleImport() {
    if (isLoading || validRows.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const payload = validRows.map((row) => ({
        name: row.name,
        email: row.email,
        role: row.role,
        status: row.status,
        siteIds: row.siteCodes.map((code) => byCode.get(code)).filter((id) => id !== undefined),
        ...(row.department ? { department: row.department } : {}),
      }));
      const outcome = await apiFetch<ImportResult>("/api/admin/users/import", {
        method: "POST",
        body: JSON.stringify({ users: payload }),
      });
      setResult(outcome);
      setSelected(outcome.created.map((u) => u.id));
      setCredentials(null);
    } catch (err) {
      setError((err as ApiError).error ?? "Import failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerate() {
    if (isGenerating || selected.length === 0) return;
    setIsGenerating(true);
    setError(null);
    try {
      const outcome = await apiFetch<CredentialsResult>("/api/admin/users/credentials", {
        method: "POST",
        body: JSON.stringify({ userIds: selected }),
      });
      setCredentials(outcome);
      setCopied(false);
    } catch (err) {
      setError((err as ApiError).error ?? "Unable to generate credentials.");
    } finally {
      setIsGenerating(false);
    }
  }

  function downloadCredentials() {
    if (!credentials) return;
    const lines = credentials.credentials.map((c) => `${c.email},${c.tempPassword}`);
    const blob = new Blob([`email,temp_password\n${lines.join("\n")}\n`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inspexo-temporary-credentials.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bulk import</h1>
          <p className="text-sm text-muted-foreground">
            Upload CSV or Excel, preview validation, confirm — the backend re-validates everything.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={downloadTemplate}>
          Download template
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="import-file">File (.csv, .xlsx, .xls — max 200 rows)</Label>
        <Input
          id="import-file"
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Sites</TableHead>
                <TableHead>Issues</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const rowIssues = issueByRow.get(row.index) ?? [];
                return (
                  <TableRow key={row.index}>
                    <TableCell>{row.index}</TableCell>
                    <TableCell>{row.name || "—"}</TableCell>
                    <TableCell>{row.email || "—"}</TableCell>
                    <TableCell>{row.role || "—"}</TableCell>
                    <TableCell>{row.siteCodes.join(", ") || "—"}</TableCell>
                    <TableCell>
                      {rowIssues.length === 0 ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                          Valid
                        </Badge>
                      ) : (
                        <ul className="list-disc pl-4 text-sm text-destructive">
                          {rowIssues.map((message) => (
                            <li key={message}>{message}</li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="flex items-center gap-3">
          <Button type="button" onClick={handleImport} disabled={isLoading || validRows.length === 0}>
            {isLoading ? "Importing…" : `Import ${validRows.length} valid row${validRows.length === 1 ? "" : "s"}`}
          </Button>
          <span className="text-sm text-muted-foreground">
            {issues.length} issue{issues.length === 1 ? "" : "s"} in preview (backend decides finally)
          </span>
        </div>
      ) : null}

      {result ? (
        <div className="rounded-2xl border border-border p-4">
          <h2 className="font-semibold">
            Import result: {result.created.length} created, {result.failed.length} failed
          </h2>
          {result.failed.length > 0 ? (
            <ul className="mt-2 list-disc pl-5 text-sm text-destructive">
              {result.failed.map((f) => (
                <li key={`${f.index}-${f.email ?? "none"}`}>
                  Row {f.index} ({f.email ?? "no email"}): {f.code}
                </li>
              ))}
            </ul>
          ) : null}
          {result.created.length > 0 ? (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Select accounts to generate temporary credentials for (shown once, never stored).
              </p>
              {result.created.map((u) => (
                <label key={u.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={selected.includes(u.id)}
                    onCheckedChange={() =>
                      setSelected((prev) =>
                        prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id],
                      )
                    }
                  />
                  {u.email}
                </label>
              ))}
              <div>
                <Button type="button" onClick={handleGenerate} disabled={isGenerating || selected.length === 0}>
                  {isGenerating ? "Generating…" : `Generate credentials (${selected.length})`}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {credentials ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4" role="status">
          <p className="text-sm font-semibold text-emerald-900">
            Temporary credentials — shown once. Save or relay them now, then leave this page.
          </p>
          <div className="mt-2 overflow-x-auto rounded-xl bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Password</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.credentials.map((c) => (
                  <TableRow key={c.userId}>
                    <TableCell>{c.email}</TableCell>
                    <TableCell className="font-mono">{c.tempPassword}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {credentials.failed.length > 0 ? (
            <p className="mt-2 text-sm text-destructive">
              Skipped: {credentials.failed.map((f) => `${f.userId.slice(0, 8)} (${f.code})`).join(", ")}
            </p>
          ) : null}
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    credentials.credentials.map((c) => `${c.email},${c.tempPassword}`).join("\n"),
                  );
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "Copied" : "Copy all"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={downloadCredentials}>
              Download CSV
            </Button>
          </div>
        </div>
      ) : null}

      {fileName ? (
        <p className="text-xs text-muted-foreground">
          Previewing {fileName} · validation here is a preview only — the backend re-validates every row.
        </p>
      ) : null}
    </div>
  );
}
