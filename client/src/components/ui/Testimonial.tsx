import React from 'react';
import { Card } from './Card';

export interface TestimonialProps {
  name: string;
  role: string;
  quote: string;
  image?: string;
  className?: string;
}

/**
 * Testimonial - A card component styled for testimonials on dark backgrounds
 *
 * Matches the styling from neighborhoodnationalgc.com testimonial cards
 *
 * Usage:
 * ```tsx
 * // Use on a dark background (e.g., brand-dark-green)
 * <div className="bg-brand-dark-green p-6">
 *   <Testimonial
 *     name="Erin Thorne"
 *     role="Club Pro at No 6"
 *     quote="Golf's hard. Excited to make it easier for everyone..."
 *     image="https://example.com/avatar.jpg"
 *   />
 * </div>
 * ```
 */
export const Testimonial: React.FC<TestimonialProps> = ({
  name,
  role,
  quote,
  image,
  className = '',
}) => {
  return (
    <Card variant="testimonial" padding="md" className={className}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {image ? (
          <img
            src={image}
            alt={`${name} headshot`}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-brand-neon-green bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <span className="text-brand-neon-green font-bold text-lg">
              {name.charAt(0)}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="mb-2">
            <h4 className="font-bold text-white text-base">{name}</h4>
            <p className="text-gray-300 text-sm">{role}</p>
          </div>
          <blockquote className="text-white text-sm leading-relaxed">
            "{quote}"
          </blockquote>
        </div>
      </div>
    </Card>
  );
};

/**
 * TestimonialSection - A container for displaying multiple testimonials
 *
 * Usage:
 * ```tsx
 * <TestimonialSection>
 *   <Testimonial name="..." role="..." quote="..." />
 *   <Testimonial name="..." role="..." quote="..." />
 * </TestimonialSection>
 * ```
 */
export interface TestimonialSectionProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const TestimonialSection: React.FC<TestimonialSectionProps> = ({
  children,
  title,
  subtitle,
  className = '',
}) => {
  return (
    <div className={`bg-brand-dark-green rounded-xl p-6 sm:p-8 space-y-6 ${className}`}>
      {(title || subtitle) && (
        <div className="text-center mb-8">
          {title && (
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-gray-300 text-base sm:text-lg">
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

export default Testimonial;
