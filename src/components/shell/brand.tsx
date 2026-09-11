import Image from "next/image";

/** DentoCrafts wordmark (the real company asset — public/dentocrafts-logo.png,
 * 704x170) paired with the CraftsHR product name. Used on light surfaces only. */
export function Brand({ size = "md" }: { size?: "sm" | "md" }) {
  const logoWidth = size === "sm" ? 108 : 140;
  const logoHeight = Math.round(logoWidth * (170 / 704));

  return (
    <div className="flex items-center gap-2.5">
      <Image
        src="/dentocrafts-logo.png"
        alt="DentoCrafts"
        width={logoWidth}
        height={logoHeight}
        priority
        className="shrink-0"
      />
      <div className="h-7 w-px bg-border" aria-hidden="true" />
      <div className="leading-tight">
        <p className="font-semibold text-foreground text-sm tracking-tight">CraftsHR</p>
        <p className="text-[11px] text-muted">Workforce Management</p>
      </div>
    </div>
  );
}
