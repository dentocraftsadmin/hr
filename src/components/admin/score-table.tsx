"use client";

import { useState, useTransition } from "react";
import { adjustScore } from "@/server/actions/points";
import type { EmployeeScore } from "@/lib/data/points";
import { Badge } from "@/components/ui/badge";

function scoreTone(score: number): "success" | "warning" | "danger" {
  if (score >= 90) return "success";
  if (score >= 70) return "warning";
  return "danger";
}

export function ScoreTable({ employees }: { employees: EmployeeScore[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-2.5 font-medium">Employee</th>
            <th className="px-4 py-2.5 font-medium">Score</th>
            <th className="px-4 py-2.5 font-medium">Adjust</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => (
            <ScoreRow key={e.id} employee={e} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScoreRow({ employee }: { employee: EmployeeScore }) {
  const [open, setOpen] = useState(false);
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const formData = new FormData();
    formData.set("employeeId", employee.id);
    formData.set("points", points);
    formData.set("reason", reason);
    startTransition(async () => {
      const result = await adjustScore(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setPoints("");
      setReason("");
    });
  }

  return (
    <tr className="border-b border-border last:border-0 align-top">
      <td className="px-4 py-2.5 text-foreground font-medium whitespace-nowrap">{employee.full_name}</td>
      <td className="px-4 py-2.5">
        <Badge tone={scoreTone(employee.score)}>{employee.score}</Badge>
      </td>
      <td className="px-4 py-2.5">
        {!open ? (
          <button onClick={() => setOpen(true)} className="text-xs font-medium text-muted underline">
            Adjust
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="±points"
              className="w-20 rounded-md border border-border bg-background px-2 py-1 text-xs"
            />
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (required)"
              className="w-48 rounded-md border border-border bg-background px-2 py-1 text-xs"
            />
            <button
              onClick={submit}
              disabled={isPending || !points || !reason.trim()}
              className="text-xs font-medium text-primary-strong disabled:opacity-50"
            >
              Save
            </button>
            <button onClick={() => setOpen(false)} className="text-xs text-muted">
              Cancel
            </button>
            {error && <p className="w-full text-xs text-danger">{error}</p>}
          </div>
        )}
      </td>
    </tr>
  );
}
