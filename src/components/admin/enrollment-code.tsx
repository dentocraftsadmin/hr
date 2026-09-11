"use client";

import { useState, useTransition } from "react";
import { KeyRound, RefreshCw, Ban, Copy, Check } from "lucide-react";
import { rotateEnrollmentCode, disableRegistration } from "@/server/actions/enrollment";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function EnrollmentCodeCard({ initialCode }: { initialCode: string | null }) {
  const [code, setCode] = useState(initialCode);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onRotate() {
    setError(null);
    const isFirstTime = !code;
    if (!isFirstTime && !window.confirm("Generate a new code? The current code will stop working immediately.")) return;
    startTransition(async () => {
      const result = await rotateEnrollmentCode();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCode(result.code ?? null);
    });
  }

  function onDisable() {
    setError(null);
    if (!window.confirm("Turn off employee self-registration? Employees won't be able to create their own accounts until you generate a new code.")) return;
    startTransition(async () => {
      const result = await disableRegistration();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCode(null);
    });
  }

  function onCopy() {
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-primary-soft p-2">
            <KeyRound className="h-4 w-4 text-primary-strong" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Employee self-registration</p>
            <p className="text-xs text-muted">Share this code so employees can create their own account</p>
          </div>
        </div>
        <Badge tone={code ? "success" : "neutral"}>{code ? "Open" : "Closed"}</Badge>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {code ? (
          <>
            <code className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono tracking-widest text-foreground">
              {code}
            </code>
            <button
              onClick={onCopy}
              aria-label="Copy registration code"
              className="rounded-lg border border-border p-2 text-muted hover:bg-surface-sunken hover:text-foreground"
            >
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </button>
          </>
        ) : (
          <p className="flex-1 text-sm text-muted">No code set — registration is closed.</p>
        )}
      </div>

      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm" onClick={onRotate} disabled={isPending}>
          <RefreshCw className="h-3.5 w-3.5" /> {code ? "Generate new code" : "Enable registration"}
        </Button>
        {code && (
          <Button variant="ghost" size="sm" onClick={onDisable} disabled={isPending}>
            <Ban className="h-3.5 w-3.5" /> Turn off
          </Button>
        )}
      </div>
    </Card>
  );
}
