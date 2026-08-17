"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

type Faq = { q: string; a: string };

export function LandingFaq({ items }: { items: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((faq, index) => {
        const isOpen = open === index;
        return (
          <div
            key={faq.q}
            style={{
              borderRadius: 10,
              border: "1px solid var(--border, #2d3139)",
              background: "var(--surface, #14161d)",
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : index)}
              style={{
                width: "100%",
                padding: "14px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "none",
                border: "none",
                color: "var(--ink, #fff)",
                fontSize: 14,
                fontWeight: 600,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span>{faq.q}</span>
              <ChevronDown size={16} style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
            </button>
            {isOpen && (
              <div style={{ padding: "0 18px 14px", color: "var(--subtle, #9ca3af)", fontSize: 13, lineHeight: 1.6 }}>
                {faq.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
