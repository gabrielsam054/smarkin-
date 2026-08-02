"use client";

import { useState } from "react";
import { Send, Mail, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import type { ContactFormData } from "@/types";

const CONTACT_ITEMS = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@smarkin.ai",
  },
  {
    icon: MessageSquare,
    label: "Support",
    value: "support@smarkin.ai",
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: wire up to Supabase or email service in Module 2
    await new Promise((r) => setTimeout(r, 1000));
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <>
      <PageHeader
        label="Contact"
        title="Get in touch"
        subtitle="Have a question about Smarkin AI? We'd love to hear from you."
      />

      <section className="pb-24">
        <div className="container-app max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Contact info */}
            <div className="space-y-4">
              {CONTACT_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.label}>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center flex-none">
                          <Icon size={16} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-mono uppercase tracking-widest text-text-muted mb-0.5">
                            {item.label}
                          </p>
                          <p className="text-sm text-text-primary font-medium">
                            {item.value}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              <Card>
                <CardContent>
                  <p className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2">
                    Response Time
                  </p>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    We typically respond within 24 hours on business days.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              {submitted ? (
                <Card className="text-center py-16">
                  <CardContent>
                    <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6">
                      <Send size={24} className="text-primary" />
                    </div>
                    <h3 className="text-xl font-heading font-bold text-text-primary mb-2">
                      Message sent!
                    </h3>
                    <p className="text-text-secondary text-sm">
                      Thanks for reaching out. We&apos;ll get back to you within 24 hours.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <Input
                        label="Name"
                        name="name"
                        type="text"
                        placeholder="Your full name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                      <Input
                        label="Email"
                        name="email"
                        type="email"
                        placeholder="you@company.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                      <Textarea
                        label="Message"
                        name="message"
                        placeholder="Tell us how we can help…"
                        value={formData.message}
                        onChange={handleChange}
                        required
                      />
                      <Button
                        type="submit"
                        size="lg"
                        loading={loading}
                        className="w-full gap-2"
                      >
                        <Send size={16} />
                        Send Message
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
