"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { FEATURES } from "@/lib/constants";

export function FeaturesSection() {
  return (
    <section className="section-padding">
      <div className="container-app">
        <div className="text-center mb-16">
          <SectionLabel>Features</SectionLabel>
          <h2 className="text-4xl lg:text-5xl font-heading font-bold text-text-primary max-w-2xl mx-auto">
            Everything you need to win on Meta
          </h2>
          <p className="mt-4 text-text-secondary text-lg max-w-xl mx-auto">
            Powered by your proprietary knowledge database. No guessing, no invented data.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
            >
              <Card hover className="h-full">
                <CardContent>
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-3xl">{feature.icon}</span>
                    {feature.badge && (
                      <Badge
                        variant={feature.badge === "Pro" ? "blue" : "green"}
                      >
                        {feature.badge}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-heading font-semibold text-base text-text-primary mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
