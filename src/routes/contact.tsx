import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, MessageCircle } from "lucide-react";
import { Btn, Panel } from "@/components/kit";
import { PageShell } from "@/components/site/PageShell";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact AuditX — Sales, Support & Compliance" },
      {
        name: "description",
        content:
          "Get in touch with the AuditX team about reconciliation, enterprise plans, jurisdictions or compliance questions.",
      },
      { property: "og:title", content: "Contact AuditX" },
      { property: "og:description", content: "Talk to sales, support or the compliance team." },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <PageShell
      eyebrow="Contact"
      title="Get in touch"
      sub="Reach out directly via email, phone, or WhatsApp. Messages only on WhatsApp."
    >
      <div className="max-w-2xl">
        <Panel>
          <div className="space-y-6">
            {/* Email */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex size-10 items-center justify-center rounded-xl"
                  style={{ background: "rgba(115,66,226,0.08)" }}
                >
                  <Mail size={18} strokeWidth={1.75} style={{ color: "var(--color-accent)" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Email</p>
                  <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                    ahmadjamildhami@gmail.com
                  </p>
                </div>
              </div>
              <Btn
                onClick={() => window.location.href = "mailto:ahmadjamildhami@gmail.com"}
                variant="outline"
              >
                Send email
              </Btn>
            </div>

            {/* Phone */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex size-10 items-center justify-center rounded-xl"
                  style={{ background: "rgba(115,66,226,0.08)" }}
                >
                  <Phone size={18} strokeWidth={1.75} style={{ color: "var(--color-accent)" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Phone</p>
                  <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                    +92 333 818 8722
                  </p>
                </div>
              </div>
              <Btn
                onClick={() => window.location.href = "tel:+923338188722"}
                variant="outline"
              >
                Call
              </Btn>
            </div>

            {/* WhatsApp */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex size-10 items-center justify-center rounded-xl"
                  style={{ background: "rgba(37,211,102,0.08)" }}
                >
                  <MessageCircle size={18} strokeWidth={1.75} style={{ color: "#25D366" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold">WhatsApp</p>
                  <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                    +92 333 818 8722
                  </p>
                  <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                    Messages only
                  </p>
                </div>
              </div>
              <Btn
                onClick={() => window.open("https://wa.me/923338188722", "_blank")}
                variant="outline"
              >
                Message
              </Btn>
            </div>
          </div>
        </Panel>

        <div className="mt-6 text-center text-sm" style={{ color: "var(--ink-3)" }}>
          We typically respond within 24 hours
        </div>
      </div>
    </PageShell>
  );
}
