// ─────────────────────────────────────────────────────────────────
// Assessment page orchestrator.
//
// Wires together the markup rendered by the components in
// src/components/assessment/* with the logic modules in this folder.
// Each concern (scoring, calendar, email, auth, persistence) lives in
// its own file — this module only handles state + DOM wiring.
// ─────────────────────────────────────────────────────────────────

import { getFirebaseAuth, getFirebaseDb } from "../firebase/client";
import { completeEmailLinkSignIn, isEmailLinkUrl, requestEmailLink } from "./auth";
import {
  CHOICE_QUESTIONS,
  FOUNDATION_CHECKPOINTS,
  type AssessmentRole,
  type ScoreCategory,
} from "../../config/assessment";
import { calculateScore, scoreToNeedleAngle } from "./scoring";
import { saveLead } from "./leads";
import { sendClassInviteEmail } from "./mail";
import {
  buildGoogleCalendarUrl,
  buildIcsContent,
  formatClassDateLabel,
  formatClassTimeLabel,
  getNextClassOccurrence,
} from "./calendar";

type SectionId =
  | "assessment-gateway"
  | "assessment-email-gate"
  | "assessment-profile-form"
  | "assessment-questions"
  | "assessment-results";

const SECTION_IDS: SectionId[] = [
  "assessment-gateway",
  "assessment-email-gate",
  "assessment-profile-form",
  "assessment-questions",
  "assessment-results",
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AssessmentState {
  role: AssessmentRole;
  email: string;
  /** True if the page loaded as an email-link return that needs a manual email confirmation. */
  awaitingEmailConfirmation: boolean;
  fullName: string;
  phone: string;
  checkedIndexes: number[];
  choiceAnswers: Record<number, number>;
  currentChoiceIndex: number;
  lastScore: number;
}

const state: AssessmentState = {
  role: "individual",
  email: "",
  awaitingEmailConfirmation: false,
  fullName: "",
  phone: "",
  checkedIndexes: [],
  choiceAnswers: {},
  currentChoiceIndex: 0,
  lastScore: 0,
};

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Assessment: missing element #${id}`);
  return el;
}

function showSection(id: SectionId) {
  for (const sectionId of SECTION_IDS) {
    $(sectionId).hidden = sectionId !== id;
  }
  $(id).scrollIntoView({ behavior: "smooth", block: "start" });
}

export function initAssessment(): void {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();

  wireGateway();
  wireEmailGate(auth, db);
  wireProfileForm();
  wireQuestionFlow();
  wireResults(db);

  void handleEmailLinkReturn(auth);
}

// ── Step 0: Gateway ──────────────────────────────────────────────

function wireGateway() {
  $("gateway-individual").addEventListener("click", () => selectRole("individual"));
  $("gateway-enterprise").addEventListener("click", () => selectRole("enterprise"));
}

function selectRole(role: AssessmentRole) {
  state.role = role;
  applyRoleBranding();
  showSection("assessment-email-gate");
}

function applyRoleBranding() {
  const isEnterprise = state.role === "enterprise";

  const badge = $("email-gate-badge");
  badge.textContent = isEnterprise ? "Enterprise Assessment" : "Personal Assessment";
  badge.classList.toggle("badge--teal", isEnterprise);

  $("email-gate-title").textContent = isEnterprise
    ? "Verify your work email to begin"
    : "Verify your email to begin";

  $("email-gate-subtitle").textContent = isEnterprise
    ? "Enter your company email address — we'll send you a secure sign-in link to continue your assessment."
    : "Enter your email address — we'll send you a secure sign-in link to continue your assessment.";

  (document.getElementById("assessment-email") as HTMLInputElement).placeholder = isEnterprise
    ? "you@yourcompany.com"
    : "you@email.com";
}

// ── Step 1: Email gate (Firebase email-link sign-in) ─────────────

function wireEmailGate(auth: ReturnType<typeof getFirebaseAuth>, _db: ReturnType<typeof getFirebaseDb>) {
  $("email-gate-back").addEventListener("click", () => {
    showSection("assessment-gateway");
  });

  $("send-link-btn").addEventListener("click", () => void handleSendLink(auth));
  $("resend-link-btn").addEventListener("click", () => void handleSendLink(auth, true));
}

async function handleSendLink(auth: ReturnType<typeof getFirebaseAuth>, isResend = false) {
  const input = document.getElementById("assessment-email") as HTMLInputElement;
  const errorEl = $("assessment-email-error");
  const formBanner = $("email-gate-error");
  const sendBtn = document.getElementById("send-link-btn") as HTMLButtonElement;
  const resendBtn = document.getElementById("resend-link-btn") as HTMLButtonElement;

  const email = input.value.trim();
  formBanner.hidden = true;

  if (!EMAIL_REGEX.test(email)) {
    input.classList.add("invalid");
    errorEl.hidden = false;
    return;
  }
  input.classList.remove("invalid");
  errorEl.hidden = true;

  const activeBtn = isResend ? resendBtn : sendBtn;
  const originalLabel = activeBtn.textContent;
  activeBtn.disabled = true;
  activeBtn.textContent = isResend ? "Resending…" : "Sending…";

  try {
    if (state.awaitingEmailConfirmation) {
      // Returning from an email link on a device/browser without the stored email —
      // the entered email is used to complete sign-in directly (no new link sent).
      const result = await completeEmailLinkSignIn(auth, email);
      if (!result) throw new Error("confirmation-failed");
      onSignedIn(result.email, result.role);
      return;
    }

    await requestEmailLink(auth, email, state.role);
    state.email = email;

    $("sent-email-display").textContent = email;
    $("email-gate-form").hidden = true;
    $("email-gate-sent").hidden = false;

    if (isResend) {
      $("resend-status").textContent = "A new link has been sent.";
    }
  } catch {
    formBanner.textContent =
      "Something went wrong sending your sign-in link. Please check the address and try again.";
    formBanner.hidden = false;
  } finally {
    activeBtn.disabled = false;
    activeBtn.textContent = originalLabel;
  }
}

async function handleEmailLinkReturn(auth: ReturnType<typeof getFirebaseAuth>) {
  if (!isEmailLinkUrl(auth)) return;

  try {
    const result = await completeEmailLinkSignIn(auth);
    if (result) {
      onSignedIn(result.email, result.role);
      return;
    }
  } catch {
    // fall through to manual confirmation
  }

  // No stored email (different device/browser) — ask the user to confirm it.
  state.awaitingEmailConfirmation = true;
  state.role =
    (new URLSearchParams(window.location.search).get("role") as AssessmentRole | null) ?? "individual";

  applyRoleBranding();
  $("email-gate-title").textContent = "Confirm your email to continue";
  $("email-gate-subtitle").textContent =
    "Re-enter the email address you used to start this assessment to finish signing in.";
  $("send-link-btn").textContent = "Confirm & Continue →";

  showSection("assessment-email-gate");
}

function onSignedIn(email: string, role: AssessmentRole) {
  state.email = email;
  state.role = role;

  (document.getElementById("profile-email") as HTMLInputElement).value = email;
  showSection("assessment-profile-form");
}

// ── Step 2: Profile form ─────────────────────────────────────────

function wireProfileForm() {
  $("profile-submit-btn").addEventListener("click", () => {
    const nameInput = document.getElementById("profile-fullname") as HTMLInputElement;
    const phoneInput = document.getElementById("profile-phone") as HTMLInputElement;
    const nameError = $("profile-name-error");

    const fullName = nameInput.value.trim();
    if (!fullName) {
      nameInput.classList.add("invalid");
      nameError.hidden = false;
      return;
    }
    nameInput.classList.remove("invalid");
    nameError.hidden = true;

    state.fullName = fullName;
    state.phone = phoneInput.value.trim();

    renderChecklist();
    showSection("assessment-questions");
  });
}

// ── Step 3a: Foundation checklist ────────────────────────────────

function renderChecklist() {
  $("q-progress-label").textContent = `Questions 1-10 of 15`;
  $("q-progress-percent").textContent = "0%";
  (document.getElementById("q-progress-bar") as HTMLElement).style.width = "0%";

  const wrapper = $("checklist-wrapper");
  wrapper.innerHTML = "";

  FOUNDATION_CHECKPOINTS.forEach((text, i) => {
    const label = document.createElement("label");
    label.className = "checklist-item";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = String(i);
    input.checked = state.checkedIndexes.includes(i);

    const span = document.createElement("span");
    span.textContent = text;

    label.append(input, span);
    wrapper.appendChild(label);
  });

  $("q-checklist-step").hidden = false;
  $("q-choice-step").hidden = true;
}

function wireQuestionFlow() {
  $("checklist-next-btn").addEventListener("click", () => {
    const checkboxes = document.querySelectorAll<HTMLInputElement>("#checklist-wrapper input[type='checkbox']");
    state.checkedIndexes = [];
    checkboxes.forEach((chk) => {
      if (chk.checked) state.checkedIndexes.push(Number(chk.value));
    });

    state.currentChoiceIndex = 0;
    renderChoiceQuestion();
  });

  $("choice-back-btn").addEventListener("click", () => {
    if (state.currentChoiceIndex > 0) {
      state.currentChoiceIndex -= 1;
      renderChoiceQuestion();
    } else {
      renderChecklist();
    }
  });

  $("choice-next-btn").addEventListener("click", () => {
    const currentQ = CHOICE_QUESTIONS[state.currentChoiceIndex];
    if (state.choiceAnswers[currentQ.index] === undefined) {
      return; // button is disabled in this state, but guard anyway
    }

    if (state.currentChoiceIndex < CHOICE_QUESTIONS.length - 1) {
      state.currentChoiceIndex += 1;
      renderChoiceQuestion();
    } else {
      renderResults();
      showSection("assessment-results");
    }
  });
}

const PROGRESS_BY_QUESTION_INDEX: Record<number, number> = { 11: 73, 12: 80, 13: 87, 14: 93, 15: 100 };

function renderChoiceQuestion() {
  $("q-checklist-step").hidden = true;
  $("q-choice-step").hidden = false;

  const q = CHOICE_QUESTIONS[state.currentChoiceIndex];

  $("q-progress-label").textContent = `Question ${q.index} of 15`;
  const pct = PROGRESS_BY_QUESTION_INDEX[q.index] ?? 0;
  $("q-progress-percent").textContent = `${pct}%`;
  (document.getElementById("q-progress-bar") as HTMLElement).style.width = `${pct}%`;

  $("choice-badge").textContent = q.badge;
  $("choice-title").textContent = q.title;

  const wrapper = $("choice-options-wrapper");
  wrapper.innerHTML = "";

  const currentAnswer = state.choiceAnswers[q.index];

  q.options.forEach((opt, idx) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-option" + (currentAnswer === idx ? " selected" : "");

    const label = document.createElement("span");
    label.textContent = opt.label;

    const pts = document.createElement("span");
    pts.className = "pts";
    pts.textContent = `+${opt.pts} pts`;

    button.append(label, pts);
    button.addEventListener("click", () => {
      state.choiceAnswers[q.index] = idx;
      renderChoiceQuestion();
    });

    wrapper.appendChild(button);
  });

  // Dots
  const dots = $("choice-dots").children;
  for (let i = 0; i < dots.length; i++) {
    const dot = dots[i] as HTMLElement;
    dot.className = i === state.currentChoiceIndex ? "active" : i < state.currentChoiceIndex ? "done" : "";
  }

  // Next button label/state
  const nextBtn = document.getElementById("choice-next-btn") as HTMLButtonElement;
  nextBtn.textContent = state.currentChoiceIndex === CHOICE_QUESTIONS.length - 1 ? "See My Results →" : "Next Step →";
  nextBtn.disabled = currentAnswer === undefined;
}

// ── Step 4: Results ───────────────────────────────────────────────

function renderResults() {
  const { score, band } = calculateScore({
    checkedIndexes: state.checkedIndexes,
    choiceAnswers: state.choiceAnswers,
  });
  state.lastScore = score;

  $("results-score-display").innerHTML = `${score}<small>/100</small>`;

  const needle = document.getElementById("results-needle") as unknown as SVGLineElement;
  needle.style.transform = `rotate(${scoreToNeedleAngle(score)}deg)`;

  const pill = $("score-status-pill");
  pill.textContent = band.label;
  pill.className = `status-pill ${band.category}`;

  $("insight-1").textContent = band.insights[0];
  $("insight-2").textContent = band.insights[1];
  $("insight-3").textContent = band.insights[2];

  // Reset class signup block back to "unregistered"
  $("class-unregistered").hidden = false;
  $("class-registered").hidden = true;
  $("register-status").textContent = "";

  const occurrence = getNextClassOccurrence();
  const scheduleText = `${formatClassDateLabel(occurrence.start)} • ${formatClassTimeLabel()}`;
  $("class-schedule-display").textContent = scheduleText;
  $("registered-schedule-display").textContent = scheduleText;

  const icsLink = document.getElementById("download-ics-btn") as HTMLButtonElement;
  icsLink.onclick = () => downloadIcs();

  (document.getElementById("add-google-calendar-link") as HTMLAnchorElement).href = buildGoogleCalendarUrl(occurrence);

  // Persist the lead now that we have a score (fire-and-forget).
  void persistLead(score, band.category);
}

let leadDb: ReturnType<typeof getFirebaseDb> | null = null;

async function persistLead(score: number, category: ScoreCategory) {
  if (!leadDb) return;
  const auth = getFirebaseAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  try {
    await saveLead(leadDb, {
      uid,
      email: state.email,
      fullName: state.fullName,
      phone: state.phone,
      role: state.role,
      score,
      category: category as never,
      checkedIndexes: state.checkedIndexes,
      choiceAnswers: state.choiceAnswers,
    });
  } catch {
    // Non-blocking — lead persistence failure shouldn't disrupt the user's results.
  }
}

function downloadIcs() {
  const occurrence = getNextClassOccurrence();
  const ics = buildIcsContent(occurrence);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "ai-empowerment-group-class.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function wireResults(db: ReturnType<typeof getFirebaseDb>) {
  leadDb = db;

  $("register-class-btn").addEventListener("click", () => void handleRegisterForClass(db));
  $("restart-btn").addEventListener("click", restartAssessment);
}

async function handleRegisterForClass(db: ReturnType<typeof getFirebaseDb>) {
  const btn = document.getElementById("register-class-btn") as HTMLButtonElement;
  const status = $("register-status");

  btn.disabled = true;
  btn.textContent = "Registering…";

  try {
    await sendClassInviteEmail(db, { to: state.email, name: state.fullName, score: state.lastScore });
    $("class-unregistered").hidden = true;
    $("class-registered").hidden = false;
  } catch {
    status.textContent = "Something went wrong sending your invite. Please try again.";
    btn.disabled = false;
    btn.textContent = "Register Free →";
  }
}

function restartAssessment() {
  state.checkedIndexes = [];
  state.choiceAnswers = {};
  state.currentChoiceIndex = 0;
  showSection("assessment-gateway");
}
