import React, { useState } from 'react';
import { RegistrationFormQuestion } from '../services/api';
import { MemberMultiSelect } from './MemberMultiSelect';
import { Input } from './ui/Input';

/**
 * RegistrationFormRenderer - Component for rendering registration form questions
 *
 * This component handles all question types including the new member_multiselect type
 * for selecting team members from a club.
 */

interface RegistrationFormRendererProps {
  questions: RegistrationFormQuestion[];
  formData: Record<string, any>;
  onChange: (questionId: string, value: any) => void;
  userClub?: string; // Current user's club for filtering members
}

export const RegistrationFormRenderer: React.FC<RegistrationFormRendererProps> = ({
  questions,
  formData,
  onChange,
  userClub,
}) => {
  // Check if a question should be shown based on conditional logic
  const shouldShowQuestion = (question: RegistrationFormQuestion): boolean => {
    if (!question.conditional) return true;

    const dependentValue = formData[question.conditional.dependsOn];
    return dependentValue === question.conditional.showWhen;
  };

  const renderQuestion = (question: RegistrationFormQuestion) => {
    if (!shouldShowQuestion(question)) {
      return null;
    }

    const value = formData[question.id];

    switch (question.type) {
      case 'text':
        return (
          <div key={question.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <Input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(question.id, e.target.value)}
              placeholder={question.placeholder}
              required={question.required}
            />
          </div>
        );

      case 'radio':
        return (
          <div key={question.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {question.options?.map((option) => (
                <div key={option} className="flex items-center">
                  <input
                    type="radio"
                    id={`${question.id}-${option}`}
                    name={question.id}
                    value={option}
                    checked={value === option}
                    onChange={(e) => onChange(question.id, e.target.value)}
                    required={question.required}
                    className="w-4 h-4 text-brand-dark-green focus:ring-brand-dark-green"
                  />
                  <label
                    htmlFor={`${question.id}-${option}`}
                    className="ml-2 text-sm text-gray-700"
                  >
                    {option}
                  </label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <div key={question.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {question.options?.map((option) => (
                <div key={option} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`${question.id}-${option}`}
                    checked={(value || []).includes(option)}
                    onChange={(e) => {
                      const currentValues = value || [];
                      const newValues = e.target.checked
                        ? [...currentValues, option]
                        : currentValues.filter((v: string) => v !== option);
                      onChange(question.id, newValues);
                    }}
                    className="rounded border-gray-300 text-brand-dark-green focus:ring-brand-dark-green"
                  />
                  <label
                    htmlFor={`${question.id}-${option}`}
                    className="ml-2 text-sm text-gray-700"
                  >
                    {option}
                  </label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'member_multiselect':
        return (
          <div key={question.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <MemberMultiSelect
              selectedMembers={value || []}
              onChange={(memberIds) => onChange(question.id, memberIds)}
              userClub={userClub}
              restrictToClub={question.restrictToClub ?? true}
              maxSelections={question.maxSelections}
              required={question.required}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {questions.map((question) => renderQuestion(question))}
    </div>
  );
};

export default RegistrationFormRenderer;
