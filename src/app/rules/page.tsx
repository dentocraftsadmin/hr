import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock, CalendarDays, PartyPopper, ShieldCheck, Info } from "lucide-react";
import { getCurrentUser } from "@/lib/data/current-user";
import { getRulesData } from "@/lib/data/rules";

export const dynamic = "force-dynamic";

function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="rounded-lg bg-primary-soft p-2">
          <Icon className="h-4 w-4 text-primary-strong" />
        </div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-3 text-sm text-muted leading-relaxed">{children}</div>
    </section>
  );
}

export default async function RulesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rules = await getRulesData();
  const backHref = user.role === "admin" ? "/admin" : "/dashboard";

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-foreground tracking-tight">Rules &amp; Policies</h1>
          <p className="mt-1 text-sm text-muted">
            How CraftsHR works, in plain language — how attendance and leave are scored, and why.
          </p>
        </div>

        <Section id="attendance" icon={Clock} title="Attendance">
          <p>
            A full day requires at least <strong className="text-foreground">{rules.fullDayHours} hours</strong> worked;
            a half day requires at least <strong className="text-foreground">{rules.halfDayMinHours} hours</strong>. Each
            shift has its own working days and a grace period before a punch-in counts as late.
          </p>
          <p>
            Arriving late costs <strong className="text-foreground">{rules.lateArrivalPoints} points</strong>.
            An unapproved absence — no punch, no approved leave, no holiday — costs{" "}
            <strong className="text-foreground">{rules.unapprovedAbsencePoints} points</strong>.
          </p>
        </Section>

        <Section id="leave" icon={CalendarDays} title="Leave">
          <p>There are three kinds of leave outcome, based only on how much advance notice was given:</p>
          <ul className="space-y-2 list-none">
            <li className="rounded-lg bg-success-soft px-3 py-2">
              <strong className="text-success">Informed leave</strong> — you told the company with enough advance notice.
              No score impact.
            </li>
            <li className="rounded-lg bg-warning-soft px-3 py-2">
              <strong className="text-warning">Late / insufficiently informed leave</strong> — you told the company, but
              not with enough advance notice. Costs <strong>{rules.insufficientNoticePoints} points</strong>.
            </li>
            <li className="rounded-lg bg-danger-soft px-3 py-2">
              <strong className="text-danger">Uninformed leave</strong> — no leave request at all, just an absence.
              Costs <strong>{rules.unapprovedAbsencePoints} points</strong>, the same as any unapproved absence.
            </li>
          </ul>

          {rules.leaveNoticeDays !== null ? (
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="font-medium text-foreground">
                Right now, the company requires {rules.leaveNoticeDays} qualifying{" "}
                {rules.leaveNoticeDays === 1 ? "day" : "days"} of advance notice.
              </p>
              <p className="mt-1">
                A <strong className="text-foreground">qualifying day</strong> is any normal working day, or any official
                holiday logged by HR — holidays count toward your notice period even though they don&rsquo;t affect your
                working schedule. A plain weekly off that isn&rsquo;t also a logged holiday does not count.
              </p>
              <p className="mt-1">
                Counting starts the day you submit the request (that&rsquo;s day 1) and stops the day before your leave
                begins.
              </p>
              <p className="mt-2 text-xs text-muted-soft">
                Example: with a {rules.leaveNoticeDays}-day requirement and leave starting Friday, informing the company
                by the qualifying day that makes your count reach {rules.leaveNoticeDays} is on time — a working day and
                a holiday count exactly the same toward that total.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-background p-3">
              <p>No minimum notice period is configured right now — leave timing doesn&rsquo;t affect your score until HR sets one.</p>
            </div>
          )}

          <p>
            When a deduction applies, the reason is recorded exactly — for example: &ldquo;Leave informed 1 qualifying
            day before the leave date; minimum required notice is {rules.leaveNoticeDays ?? "N"} days.&rdquo; You can
            always see this on your compliance history.
          </p>
        </Section>

        <Section id="holidays" icon={PartyPopper} title="Official holidays">
          <p>
            Holidays logged by HR are <strong className="text-foreground">paid</strong> and are{" "}
            <strong className="text-foreground">not</strong> a form of employee leave — they&rsquo;re a separate thing
            entirely and never affect your score. They also count toward the leave notice period above.
          </p>
        </Section>

        <Section id="no-balance" icon={Info} title="No leave balance or entitlement">
          <p>
            CraftsHR does not track paid leave, earned leave, PTO, leave balances, accrual, or carry-forward. Leave
            categories (like Casual or Sick) are just labels for what kind of leave it is — there&rsquo;s no quota
            attached to them, and requesting leave is always about whether it was informed in time, not whether you
            have &ldquo;days left.&rdquo;
          </p>
        </Section>

        <Section id="score" icon={ShieldCheck} title="Compliance score">
          <p>
            Every employee starts at 100. Each automatic deduction above is recorded permanently in your points
            history with its reason. Your score is always{" "}
            <code className="rounded bg-surface-sunken px-1 py-0.5 text-xs">100 + (sum of all points)</code>, clamped
            between 0 and 100 — it&rsquo;s never a number anyone edits directly.
          </p>
          <p>
            HR can also make manual adjustments, but only with a required reason, and you can always see that reason in
            your own history — nothing is hidden from you.
          </p>
        </Section>

        <p className="text-xs text-muted-soft text-center pt-2">
          Only HR/admins can change the notice-period requirement or other policy values, and every change is recorded
          in the system&rsquo;s audit log.
        </p>
      </div>
    </main>
  );
}
