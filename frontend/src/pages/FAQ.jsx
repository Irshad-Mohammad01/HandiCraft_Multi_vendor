import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ChevronDown, Search, MessageSquare, Sparkles } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../api/client';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function FAQ() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadFaqs() {
      try {
        const res = await axios.get(`${API_BASE_URL}/support/faqs`);
        const list = Array.isArray(res.data) ? res.data : [];
        if (isMounted) {
          if (list.length > 0) {
            setFaqs(list);
          } else {
          // Indian handicraft domain default FAQs
          setFaqs([
            {
              id: 1,
              question: 'Are all handicrafts on CraftNest 100% authentic and handmade?',
              answer: 'Yes, each creation is handcrafted by registered Indian master artisans and verified generational heritage clusters across Rajasthan, Kashmir, Uttar Pradesh, West Bengal, and Karnataka. Every piece is unique.',
            },
            {
              id: 2,
              question: 'How do you ensure safe transit for fragile items like Blue Pottery and Brassware?',
              answer: 'Fragile artifacts are cushioned in multi-layer shock-absorbent eco-packaging with custom-fitted molds, corner protectors, and moisture barriers to guarantee pristine arrival at your doorstep.',
            },
            {
              id: 3,
              question: 'What are the delivery timelines across India and internationally?',
              answer: 'Standard domestic shipments arrive in 3–6 business days depending on your postal code. Handcrafted custom commissions may take 7–10 days as they are crafted to order.',
            },
            {
              id: 4,
              question: 'What is your return and artisan compensation policy?',
              answer: 'We provide a 7-day transit damage replacement guarantee. If a piece arrives damaged, report it via My Orders with unboxing photographs for an immediate replacement or full refund.',
            },
            {
              id: 5,
              question: 'Can I request bespoke or bulk handcrafted wedding gifts?',
              answer: 'Yes! You can connect with our artisan liaison team via the Contact page to discuss bulk gifting, brass mementos, or custom textile weaves.',
            },
          ]);
          }
        }
      } catch (err) {
        console.error('Error fetching FAQs:', err);
        // Fallback domain FAQs
        setFaqs([
          {
            id: 1,
            question: 'Are all handicrafts on CraftNest 100% authentic and handmade?',
            answer: 'Yes, each creation is handcrafted by registered Indian master artisans and verified generational heritage clusters across Rajasthan, Kashmir, Uttar Pradesh, West Bengal, and Karnataka.',
          },
          {
            id: 2,
            question: 'How do you ensure safe transit for fragile items like Blue Pottery and Brassware?',
            answer: 'Fragile artifacts are cushioned in multi-layer shock-absorbent eco-packaging with custom-fitted molds to guarantee pristine arrival.',
          },
          {
            id: 3,
            question: 'How can I track my shipment?',
            answer: 'Once your order is dispatched, you will receive a tracking link via SMS/Email, and you can track real-time delivery milestones in your Account Orders portal.',
          },
        ]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadFaqs();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredFaqs = faqs.filter((faq) => {
    const q = (faq.question || '').toLowerCase();
    const a = (faq.answer || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    return q.includes(term) || a.includes(term);
  });

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4E8DC] text-[#A63D40] text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#C69A5B]" />
          <span>Support & Clarifications</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B2523] mb-3">
          Frequently Asked Questions
        </h1>
        <p className="text-sm text-[#6F625D] max-w-xl mx-auto">
          Everything you need to know about our authentic Indian handicrafts, master artisans, packaging, and shipping policies.
        </p>

        {/* Search */}
        <div className="mt-6 max-w-md mx-auto relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search questions (e.g. pottery, shipping, returns)..."
            className="w-full bg-white border border-[#E6D8CC] rounded-2xl py-3 pl-11 pr-4 text-xs sm:text-sm text-[#2B2523] placeholder-[#6F625D]/60 focus:border-[#A63D40] focus:ring-1 focus:ring-[#A63D40] craft-card-shadow"
          />
          <Search className="w-4 h-4 text-[#6F625D] absolute left-4 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Accordion List */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner label="Loading FAQs..." />
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-[#E6D8CC] p-8">
          <HelpCircle className="w-12 h-12 text-[#6F625D]/40 mx-auto mb-3" />
          <h3 className="font-serif text-lg font-semibold text-[#2B2523] mb-1">
            No matching questions found
          </h3>
          <p className="text-xs text-[#6F625D] mb-4">
            Try different keywords or get in touch with our artisan support team.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-[#A63D40] text-white text-xs font-semibold"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Contact Support</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFaqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.id || index}
                className="bg-white rounded-2xl border border-[#E6D8CC] overflow-hidden craft-card-shadow transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(index)}
                  className="w-full py-4 px-6 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[#FFF9F3]/50 transition-colors"
                >
                  <span className="font-semibold text-xs sm:text-sm text-[#2B2523] leading-snug">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#A63D40] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-[#6F625D] leading-relaxed border-t border-[#E6D8CC]/40 bg-[#FFF9F3]/20 animate-fadeIn">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Still need help banner */}
      <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#F4E8DC] to-[#FFF9F3] border border-[#E6D8CC] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-serif text-lg font-bold text-[#2B2523] mb-1">
            Have a question about an artisan or a custom order?
          </h3>
          <p className="text-xs text-[#6F625D]">
            Our patron assistance team is here to assist with any craft inquiries.
          </p>
        </div>
        <Link
          to="/contact"
          className="shrink-0 inline-flex items-center gap-2 py-3 px-5 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-sm transition-all"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Ask Customer Care</span>
        </Link>
      </div>
    </div>
  );
}
