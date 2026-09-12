import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

const controlClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
  "placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent " +
  "disabled:opacity-50";

export function Field({
  label,
  htmlFor,
  description,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  description?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input className={`${controlClass} ${className}`} {...rest} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return <select className={`${controlClass} ${className}`} {...rest} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return <textarea className={`${controlClass} resize-none ${className}`} {...rest} />;
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-xs font-semibold uppercase tracking-wide text-muted-soft mb-3">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
