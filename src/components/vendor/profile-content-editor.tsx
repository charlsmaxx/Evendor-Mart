"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  emptyFaq,
  emptyRequirement,
  reorderById,
  type ProfileFaq,
  type ServiceRequirement,
} from "@/lib/vendor-profile-content";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";

type ProfileContentEditorProps = {
  faqs: ProfileFaq[];
  onFaqsChange: (faqs: ProfileFaq[]) => void;
  requirements: ServiceRequirement[];
  onRequirementsChange: (requirements: ServiceRequirement[]) => void;
  servicesOffered: string[];
  onServicesOfferedChange: (services: string[]) => void;
};

export function ProfileContentEditor({
  faqs,
  onFaqsChange,
  requirements,
  onRequirementsChange,
  servicesOffered,
  onServicesOfferedChange,
}: ProfileContentEditorProps) {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <p className="font-semibold">Services offered</p>
          <p className="text-sm text-muted-foreground">
            Listed on your public profile and selectable when customers book.
          </p>
        </div>
        <ServicesTagEditor value={servicesOffered} onChange={onServicesOfferedChange} />
      </section>

      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">FAQ</p>
            <p className="text-sm text-muted-foreground">
              Answer common customer questions on your profile.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onFaqsChange([
                ...faqs,
                emptyFaq({ sortOrder: faqs.length, question: "", answer: "" }),
              ])
            }
          >
            <Plus className="h-4 w-4" /> Add FAQ
          </Button>
        </div>
        {faqs.length === 0 && (
          <p className="text-sm text-muted-foreground">No FAQs yet.</p>
        )}
        {faqs.map((faq) => (
          <div key={faq.id} className="space-y-2 rounded-xl border border-border p-4">
            <div className="flex justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onFaqsChange(reorderById(faqs, faq.id, "up"))}
                aria-label="Move up"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onFaqsChange(reorderById(faqs, faq.id, "down"))}
                aria-label="Move down"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onFaqsChange(faqs.filter((f) => f.id !== faq.id))}
                aria-label="Delete FAQ"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              <Label>Question</Label>
              <Input
                value={faq.question}
                onChange={(e) =>
                  onFaqsChange(
                    faqs.map((f) => (f.id === faq.id ? { ...f, question: e.target.value } : f))
                  )
                }
                placeholder="How long does delivery take?"
              />
            </div>
            <div className="space-y-1">
              <Label>Answer</Label>
              <Textarea
                rows={3}
                value={faq.answer}
                onChange={(e) =>
                  onFaqsChange(
                    faqs.map((f) => (f.id === faq.id ? { ...f, answer: e.target.value } : f))
                  )
                }
                placeholder="Final edited photos are delivered within 14 working days."
              />
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">Service Requirements</p>
            <p className="text-sm text-muted-foreground">
              Important conditions customers should know before booking.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onRequirementsChange([
                ...requirements,
                emptyRequirement({ sortOrder: requirements.length }),
              ])
            }
          >
            <Plus className="h-4 w-4" /> Add requirement
          </Button>
        </div>
        {requirements.length === 0 && (
          <p className="text-sm text-muted-foreground">No requirements yet.</p>
        )}
        {requirements.map((req) => (
          <div key={req.id} className="flex items-start gap-2 rounded-xl border border-border p-3">
            <div className="flex-1 space-y-1">
              <Label className="sr-only">Requirement</Label>
              <Input
                value={req.text}
                onChange={(e) =>
                  onRequirementsChange(
                    requirements.map((r) =>
                      r.id === req.id ? { ...r, text: e.target.value } : r
                    )
                  )
                }
                placeholder="Customer must provide uninterrupted electricity."
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                onRequirementsChange(reorderById(requirements, req.id, "up"))
              }
              aria-label="Move up"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                onRequirementsChange(reorderById(requirements, req.id, "down"))
              }
              aria-label="Move down"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                onRequirementsChange(requirements.filter((r) => r.id !== req.id))
              }
              aria-label="Delete requirement"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </section>
    </div>
  );
}

function ServicesTagEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {value.map((service) => (
          <span
            key={service}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-3 py-1 text-sm"
          >
            {service}
            <button
              type="button"
              onClick={() => onChange(value.filter((s) => s !== service))}
              aria-label={`Remove ${service}`}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const next = String(fd.get("service") ?? "").trim();
          if (!next || value.includes(next)) return;
          onChange([...value, next]);
          e.currentTarget.reset();
        }}
      >
        <Input name="service" placeholder="e.g. Wedding Photography" className="flex-1" />
        <Button type="submit" variant="outline">
          Add
        </Button>
      </form>
    </div>
  );
}
