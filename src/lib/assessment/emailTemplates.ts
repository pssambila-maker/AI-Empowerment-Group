// ─────────────────────────────────────────────────────────────────
// Email content for the post-assessment "free class" invite.
// Sent via the Firebase "Trigger Email" extension, which watches the
// `mail` collection (see ./mail.ts).
//
// Edit the copy here without touching any sending/UI logic.
// ─────────────────────────────────────────────────────────────────

import { formatClassDateLabel, formatClassTimeLabel, type ClassOccurrence, type ClassSchedule } from "./calendar";

export interface ClassInviteEmailInput {
  name: string;
  score: number;
  occurrence: ClassOccurrence;
  schedule: ClassSchedule;
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export function buildClassInviteEmail({ name, score, occurrence, schedule }: ClassInviteEmailInput): EmailContent {
  const dateLabel = formatClassDateLabel(occurrence.start, schedule);
  const timeLabel = formatClassTimeLabel(schedule);
  const firstName = name.trim().split(/\s+/)[0] || "there";

  const subject = "Your AI Readiness Score + Your Free Class Invite";

  const text =
    `Hi ${firstName},\n\n` +
    `Thanks for taking the AI Readiness Assessment - your results are in, and you scored ${score}/100.\n\n` +
    `As a next step, we'd love to have you join our free AI class, where we cover practical, beginner-friendly skills you can start using right away.\n\n` +
    `Date: ${dateLabel}\n` +
    `Time: ${timeLabel}\n` +
    `Join link: ${schedule.joinLink}\n\n` +
    `Add it to your calendar now so you don't miss it - we'll also send a reminder before the session starts.\n\n` +
    `Looking forward to seeing you there!\n\n` +
    `Warm regards,\n` +
    `The AI Empowerment Group Team`;

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; color: #2D2D2D; line-height: 1.6; max-width: 560px; margin: 0 auto;">
      <p>Hi ${escapeHtml(firstName)},</p>
      <p>
        Thanks for taking the AI Readiness Assessment &mdash; your results are in, and you scored
        <strong>${score}/100</strong>.
      </p>
      <p>
        As a next step, we&rsquo;d love to have you join our <strong>free AI class</strong>, where we cover
        practical, beginner-friendly skills you can start using right away.
      </p>
      <table role="presentation" style="margin: 1.25rem 0; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 12px 4px 0; font-weight: 700;">Date:</td>
          <td style="padding: 4px 0;">${escapeHtml(dateLabel)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; font-weight: 700;">Time:</td>
          <td style="padding: 4px 0;">${escapeHtml(timeLabel)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; font-weight: 700;">Join link:</td>
          <td style="padding: 4px 0;">
            <a href="${schedule.joinLink}" style="color: #C9A84C;">${escapeHtml(schedule.joinLink)}</a>
          </td>
        </tr>
      </table>
      <p>Add it to your calendar now so you don&rsquo;t miss it &mdash; we&rsquo;ll also send a reminder before the session starts.</p>
      <p>Looking forward to seeing you there!</p>
      <p>
        Warm regards,<br />
        The AI Empowerment Group Team
      </p>
    </div>
  `.trim();

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
