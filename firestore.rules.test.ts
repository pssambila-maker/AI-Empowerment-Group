// Automated version of the security checks that were previously only ever
// run by hand (or by a one-off agent) against the live project. Requires
// the Firestore emulator — see TESTING.md for how to run this.
//
// This file lives at the repo root (not under src/) because it tests
// firestore.rules directly, which is also at the repo root.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { setDoc, doc, addDoc, collection, getDoc, updateDoc } from "firebase/firestore";

const PROJECT_ID = "ai-empowerment-group-rules-test";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("leads/{leadId}", () => {
  it("denies an unauthenticated create", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(addDoc(collection(db, "leads"), { uid: "x", email: "a@b.com", score: 50 }));
  });

  it("denies create when uid doesn't match the caller", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(addDoc(collection(db, "leads"), { uid: "someone-else", email: "a@b.com", score: 50 }));
  });

  it("denies create when email/score have the wrong type", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(addDoc(collection(db, "leads"), { uid: "alice", email: 12345, score: "fifty" }));
  });

  it("allows a matching, well-typed create", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(addDoc(collection(db, "leads"), { uid: "alice", email: "a@b.com", score: 72 }));
  });

  it("denies read even by the document's own owner", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "leads", "lead1"), { uid: "alice", email: "a@b.com", score: 72 });
    });
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(getDoc(doc(db, "leads", "lead1")));
  });
});

describe("classRegistrations/{registrationId}", () => {
  const validRegistration = {
    uid: "alice",
    email: "alice@example.com",
    fullName: "Alice Example",
    score: 72,
    role: "individual",
    classDate: "2026-08-16T13:00:00.000Z",
  };

  it("denies an unauthenticated create", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(addDoc(collection(db, "classRegistrations"), validRegistration));
  });

  it("denies create when uid doesn't match the caller", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      addDoc(collection(db, "classRegistrations"), { ...validRegistration, uid: "someone-else" }),
    );
  });

  it("denies create when email/fullName/score have the wrong type", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      addDoc(collection(db, "classRegistrations"), { ...validRegistration, email: 12345, score: "high" }),
    );
  });

  it("allows a matching, well-typed create", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(addDoc(collection(db, "classRegistrations"), validRegistration));
  });

  it("denies read/update/delete from any client", async () => {
    let registrationId = "";
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const ref = await addDoc(collection(ctx.firestore(), "classRegistrations"), validRegistration);
      registrationId = ref.id;
    });
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(getDoc(doc(db, "classRegistrations", registrationId)));
    await assertFails(updateDoc(doc(db, "classRegistrations", registrationId), { score: 100 }));
  });
});

describe("mail/{mailId}", () => {
  it("denies an unauthenticated create", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(addDoc(collection(db, "mail"), { to: ["a@b.com"], message: { subject: "x", text: "x" } }));
  });

  it("denies create when 'to' doesn't match the caller's own verified email", async () => {
    const db = testEnv.authenticatedContext("alice", { email: "alice@example.com" }).firestore();
    await assertFails(
      addDoc(collection(db, "mail"), { to: ["someone-else@example.com"], message: { subject: "x", text: "x" } }),
    );
  });

  it("allows create when 'to' matches the caller's own verified email", async () => {
    const db = testEnv.authenticatedContext("alice", { email: "alice@example.com" }).firestore();
    await assertSucceeds(
      addDoc(collection(db, "mail"), { to: ["alice@example.com"], message: { subject: "x", text: "x" } }),
    );
  });
});

describe("users/{userId}", () => {
  it("denies an unauthenticated read/write", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "users", "alice")));
    await assertFails(setDoc(doc(db, "users", "alice"), { displayName: "Alice" }));
  });

  it("denies reading someone else's profile (IDOR check)", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", "alice"), { displayName: "Alice" });
    });
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(bobDb, "users", "alice")));
  });

  it("allows an ordinary profile create/update by its own owner", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(setDoc(doc(db, "users", "alice"), { displayName: "Alice" }));
    await assertSucceeds(updateDoc(doc(db, "users", "alice"), { displayName: "Alice Smith" }));
  });

  it("denies self-granting membershipStatus on create", async () => {
    const db = testEnv.authenticatedContext("bob").firestore();
    await assertFails(setDoc(doc(db, "users", "bob"), { membershipStatus: "paid" }));
  });

  it("denies self-granting membershipStatus on update, even alongside a legitimate field", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", "carol"), { displayName: "Carol" });
    });
    const db = testEnv.authenticatedContext("carol").firestore();
    await assertFails(updateDoc(doc(db, "users", "carol"), { displayName: "Carol X", membershipStatus: "paid" }));
  });

  it("denies forging stripeCustomerId/stripeSubscriptionId", async () => {
    const db = testEnv.authenticatedContext("dave").firestore();
    await assertFails(setDoc(doc(db, "users", "dave"), { stripeCustomerId: "cus_fake123" }));
  });

  it("allows an update that leaves an existing membershipStatus untouched", async () => {
    // Regression guard for the exact bug the protected-fields check must avoid:
    // a merge-style update to an unrelated field should not be blocked just
    // because the document already has a protected field set (by the Admin SDK).
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", "erin"), { displayName: "Erin", membershipStatus: "paid" });
    });
    const db = testEnv.authenticatedContext("erin").firestore();
    await assertSucceeds(updateDoc(doc(db, "users", "erin"), { displayName: "Erin Q" }));
  });
});

describe("conversations/{uid}/messages/{messageId}", () => {
  it("denies an unauthenticated write", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      addDoc(collection(db, "conversations", "alice", "messages"), { text: "hi", sender: "client" }),
    );
  });

  it("denies writing into someone else's conversation", async () => {
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertFails(
      addDoc(collection(bobDb, "conversations", "alice", "messages"), { text: "hi", sender: "client" }),
    );
  });

  it("denies reading someone else's conversation", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await addDoc(collection(ctx.firestore(), "conversations", "alice", "messages"), {
        text: "hi",
        sender: "client",
      });
    });
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const { getDocs } = await import("firebase/firestore");
    await assertFails(getDocs(collection(bobDb, "conversations", "alice", "messages")));
  });

  it("denies sender values other than 'client'", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      addDoc(collection(db, "conversations", "alice", "messages"), { text: "hi", sender: "consultant" }),
    );
  });

  it("denies an empty or oversized message", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(addDoc(collection(db, "conversations", "alice", "messages"), { text: "", sender: "client" }));
    await assertFails(
      addDoc(collection(db, "conversations", "alice", "messages"), {
        text: "x".repeat(2001),
        sender: "client",
      }),
    );
  });

  it("allows the owner to send a well-formed message", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      addDoc(collection(db, "conversations", "alice", "messages"), { text: "Hello!", sender: "client" }),
    );
  });
});

describe("contactSubmissions/{submissionId}", () => {
  const validSubmission = {
    name: "Jane Visitor",
    email: "jane@example.com",
    country: "United Kingdom",
    inquiry: "general",
    message: "This is a perfectly ordinary enquiry message.",
  };

  it("allows an unauthenticated create with a valid, well-typed payload", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(addDoc(collection(db, "contactSubmissions"), validSubmission));
  });

  it("denies a create missing a required field", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const { message, ...withoutMessage } = validSubmission;
    await assertFails(addDoc(collection(db, "contactSubmissions"), withoutMessage));
  });

  it("denies a message under the 10-character minimum", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(addDoc(collection(db, "contactSubmissions"), { ...validSubmission, message: "short" }));
  });

  it("denies a message over the 5000-character maximum", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      addDoc(collection(db, "contactSubmissions"), { ...validSubmission, message: "x".repeat(5001) }),
    );
  });

  it("denies an email that doesn't look like an email", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(addDoc(collection(db, "contactSubmissions"), { ...validSubmission, email: "not-an-email" }));
  });

  it("denies read/update/delete from any client", async () => {
    let submissionId = "";
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const ref = await addDoc(collection(ctx.firestore(), "contactSubmissions"), validSubmission);
      submissionId = ref.id;
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "contactSubmissions", submissionId)));
    await assertFails(updateDoc(doc(db, "contactSubmissions", submissionId), { status: "read" }));
  });
});

describe("everything else (default deny)", () => {
  it("denies read/write to any collection with no explicit rule", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "somethingUnexpected", "doc1"), { x: 1 }));
    await assertFails(getDoc(doc(db, "somethingUnexpected", "doc1")));
  });
});
