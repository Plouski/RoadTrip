"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import Title from "../ui/title";
import Paragraph from "../ui/paragraph";

interface FAQ {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  faqs: FAQ[];
}

export default function FaqSection({ faqs }: FaqSectionProps) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gray-50 relative overflow-hidden">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <Title level={2} className="mb-4 sm:mb-6">
            Questions fréquentes
          </Title>
          <Paragraph
            size="base"
            align="center"
            className="max-w-xl sm:max-w-2xl mx-auto px-4 sm:px-0"
          >
            Tout ce que vous devez savoir sur notre abonnement premium
          </Paragraph>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md"
            >
              <button
                onClick={() => toggleFaq(index)}
                className={`w-full text-left p-4 sm:p-6 flex justify-between items-center transition-all duration-200 ${
                  openFaqIndex === index
                    ? "bg-red-50 text-red-900"
                    : "bg-white hover:bg-gray-50"
                }`}
                aria-expanded={openFaqIndex === index}
                aria-controls={`faq-answer-${index}`}
              >
                <span className="font-semibold text-base sm:text-lg pr-4 leading-tight">
                  {faq.question}
                </span>
                <ChevronRight
                  className={`h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-200 flex-shrink-0 ${
                    openFaqIndex === index
                      ? "rotate-90 text-red-600"
                      : "text-gray-400"
                  }`}
                />
              </button>

              <div
                id={`faq-answer-${index}`}
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  openFaqIndex === index
                    ? "max-h-96 opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
                  <div className="border-t border-gray-100 pt-4">
                    <Paragraph size="base">{faq.answer}</Paragraph>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
