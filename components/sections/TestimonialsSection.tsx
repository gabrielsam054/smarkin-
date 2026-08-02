"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TESTIMONIALS } from "@/lib/constants";

export function TestimonialsSection() {
  return (
    <section className="section-padding bg-surface/30">
      <div className="container-app">
        <div className="text-center mb-16">
          <SectionLabel>Testimonials</SectionLabel>
          <h2 className="text-4xl lg:text-5xl font-heading font-bold text-text-primary">
            Trusted by Meta advertisers
          </h2>
          <p className="mt-4 text-text-secondary text-lg max-w-xl mx-auto">
            See what marketers are saying about Smarkin AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <Card className="h-full">
                <CardContent>
                  <Quote size={20} className="text-primary/40 mb-4" />
                  <p className="text-sm text-text-secondary leading-relaxed mb-6 italic">
                    &ldquo;{t.content}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    {/* Avatar placeholder */}
                    <div className="w-10 h-10 rounded-full bg-green-blue flex items-center justify-center font-heading font-bold text-white text-sm flex-none">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold font-heading text-text-primary">
                        {t.name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {t.role} · {t.company}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
