import assert from "node:assert/strict";
import test from "node:test";
import { vendorDraftPatchSchema, profileDraftPatchForBusinessKind } from "./draft-patch";
import { restoreServiceProfileContentDraft } from "./profile-draft-restoration";
import { defaultDraft, mergeDraft, parseDraft } from "@/lib/vendor-onboarding/types";

test("vendor draft autosave accepts services, FAQs, requirements, and package data", () => {
  const parsed = vendorDraftPatchSchema.parse({
    businessKind: "SERVICE",
    servicesOffered: ["Wedding photography"],
    faqs: [{ id: "faq-1", question: "How long?", answer: "Two weeks", sortOrder: 0 }],
    serviceRequirements: [{ id: "req-1", text: "Provide power", sortOrder: 0 }],
    packages: [],
  });

  const { businessKind, ...patch } = parsed;
  assert.deepEqual(profileDraftPatchForBusinessKind(businessKind, patch), {
    servicesOffered: ["Wedding photography"],
    faqs: [{ id: "faq-1", question: "How long?", answer: "Two weeks", sortOrder: 0 }],
    serviceRequirements: [{ id: "req-1", text: "Provide power", sortOrder: 0 }],
    packages: [],
  });

  const savedDraft = mergeDraft(
    defaultDraft("SERVICE"),
    profileDraftPatchForBusinessKind(businessKind, patch)
  );
  const resumedDraft = parseDraft(JSON.parse(JSON.stringify(savedDraft)), "SERVICE");
  assert.deepEqual(resumedDraft.servicesOffered, ["Wedding photography"]);
  assert.deepEqual(resumedDraft.faqs, parsed.faqs);
  assert.deepEqual(resumedDraft.serviceRequirements, parsed.serviceRequirements);
  assert.deepEqual(resumedDraft.packages, []);
});

test("venue draft persistence keeps its previous top-level profile-field behavior", () => {
  const patch = {
    servicesOffered: ["Venue coordination"],
    faqs: [{ question: "Capacity?", answer: "300" }],
    serviceRequirements: [{ text: "No confetti" }],
    step5: { businessEmail: "venue@example.com" },
  };

  assert.deepEqual(profileDraftPatchForBusinessKind("VENUE", patch), {
    step5: { businessEmail: "venue@example.com" },
  });
});

test("service draft restoration preserves edits and fills fields from saved profile content", () => {
  const savedProfile = {
    servicesOffered: ["Wedding photography"],
    faqs: [{ id: "faq-1", question: "How long?", answer: "Two weeks", sortOrder: 0 }],
    serviceRequirements: [{ id: "req-1", text: "Provide power", sortOrder: 0 }],
  };

  assert.deepEqual(restoreServiceProfileContentDraft({}, savedProfile, "SERVICE"), savedProfile);
  assert.deepEqual(
    restoreServiceProfileContentDraft({ servicesOffered: [], faqs: [], serviceRequirements: [] }, savedProfile, "SERVICE"),
    { servicesOffered: [], faqs: [], serviceRequirements: [] }
  );
  assert.deepEqual(restoreServiceProfileContentDraft({}, savedProfile, "VENUE"), {});
});
