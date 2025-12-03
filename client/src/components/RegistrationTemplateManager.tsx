import React, { useState, useEffect } from 'react';
import {
  getRegistrationTemplates,
  createRegistrationTemplate,
  updateRegistrationTemplate,
  deleteRegistrationTemplate,
  type RegistrationFormTemplate,
  type RegistrationFormQuestion
} from '../services/api';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Table } from './ui/Table';
import { Modal, ModalHeader, ModalContent, ModalFooter } from './ui/Modal';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { PageHeader } from './ui/PageHeader';
import { Plus, Edit2, Trash2, Eye, FileText, Copy } from 'lucide-react';
import { toast } from 'react-toastify';

const RegistrationTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<RegistrationFormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RegistrationFormTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<RegistrationFormTemplate | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    category: string;
    template_key: string;
    questions: RegistrationFormQuestion[];
    is_active: boolean;
  }>({
    name: '',
    description: '',
    category: 'general',
    template_key: '',
    questions: [],
    is_active: true,
  });

  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [questionForm, setQuestionForm] = useState<RegistrationFormQuestion>({
    id: '',
    question: '',
    type: 'text',
    required: false,
    options: [],
    placeholder: '',
  });
  const [optionsText, setOptionsText] = useState<string>(''); // Store raw text for options

  useEffect(() => {
    fetchTemplates();
  }, [categoryFilter]);

  // Clear options text when switching to text type
  useEffect(() => {
    if (questionForm.type === 'text') {
      setOptionsText('');
    }
  }, [questionForm.type]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await getRegistrationTemplates({
        category: categoryFilter || undefined,
      });
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      if (!formData.name || !formData.template_key || formData.questions.length === 0) {
        toast.error('Please fill in all required fields and add at least one question');
        return;
      }

      const response = await createRegistrationTemplate(formData);
      setTemplates([response.data, ...templates]);
      setShowCreateModal(false);
      resetForm();
      toast.success('Template created successfully');
    } catch (error: any) {
      console.error('Error creating template:', error);
      toast.error(error.response?.data?.error || 'Failed to create template');
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      if (!formData.name || !formData.template_key || formData.questions.length === 0) {
        toast.error('Please fill in all required fields and add at least one question');
        return;
      }

      const response = await updateRegistrationTemplate(editingTemplate.id, formData);
      setTemplates(templates.map(t => t.id === editingTemplate.id ? response.data : t));
      setEditingTemplate(null);
      resetForm();
      toast.success('Template updated successfully');
    } catch (error: any) {
      console.error('Error updating template:', error);
      toast.error(error.response?.data?.error || 'Failed to update template');
    }
  };

  const handleDeleteTemplate = async (template: RegistrationFormTemplate) => {
    const message = template.is_system
      ? 'System templates cannot be deleted, but will be deactivated. Continue?'
      : 'Are you sure you want to delete this template? This action cannot be undone.';

    if (!window.confirm(message)) return;

    try {
      await deleteRegistrationTemplate(template.id);

      if (template.is_system) {
        // Update the template in the list to show it's deactivated
        setTemplates(templates.map(t =>
          t.id === template.id ? { ...t, is_active: false } : t
        ));
        toast.success('System template deactivated');
      } else {
        // Remove from list
        setTemplates(templates.filter(t => t.id !== template.id));
        toast.success('Template deleted successfully');
      }
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error(error.response?.data?.error || 'Failed to delete template');
    }
  };

  const openEditModal = (template: RegistrationFormTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      template_key: template.template_key,
      questions: [...template.questions],
      is_active: template.is_active,
    });
  };

  const openPreviewModal = (template: RegistrationFormTemplate) => {
    setPreviewTemplate(template);
    setShowPreviewModal(true);
  };

  const duplicateTemplate = (template: RegistrationFormTemplate) => {
    setFormData({
      name: `${template.name} (Copy)`,
      description: template.description || '',
      category: template.category,
      template_key: `${template.template_key}_copy_${Date.now()}`,
      questions: [...template.questions],
      is_active: true,
    });
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'general',
      template_key: '',
      questions: [],
      is_active: true,
    });
    setQuestionForm({
      id: '',
      question: '',
      type: 'text',
      required: false,
      options: [],
      placeholder: '',
    });
    setOptionsText('');
    setEditingQuestionIndex(null);
  };

  const addQuestion = () => {
    if (!questionForm.question || !questionForm.id) {
      toast.error('Question text and ID are required');
      return;
    }

    // Convert optionsText to array for radio/checkbox types
    const finalQuestion = { ...questionForm };
    if (questionForm.type === 'radio' || questionForm.type === 'checkbox') {
      finalQuestion.options = optionsText
        .split('\n')
        .map(o => o.trim())
        .filter(o => o.length > 0);

      if (finalQuestion.options.length === 0) {
        toast.error('Please add at least one option for radio/checkbox questions');
        return;
      }
    }

    if (editingQuestionIndex !== null) {
      // Update existing question
      const updatedQuestions = [...formData.questions];
      updatedQuestions[editingQuestionIndex] = finalQuestion;
      setFormData({ ...formData, questions: updatedQuestions });
      setEditingQuestionIndex(null);
    } else {
      // Add new question
      setFormData({
        ...formData,
        questions: [...formData.questions, finalQuestion],
      });
    }

    // Reset question form
    setQuestionForm({
      id: '',
      question: '',
      type: 'text',
      required: false,
      options: [],
      placeholder: '',
    });
    setOptionsText('');
  };

  const editQuestion = (index: number) => {
    const question = formData.questions[index];
    setQuestionForm({ ...question });
    // Convert options array to text for editing
    if (question.options && question.options.length > 0) {
      setOptionsText(question.options.join('\n'));
    } else {
      setOptionsText('');
    }
    setEditingQuestionIndex(index);
  };

  const removeQuestion = (index: number) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index),
    });
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...formData.questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;

    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
    setFormData({ ...formData, questions: newQuestions });
  };

  const getCategoryBadge = (category: string) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
      general: 'default',
      event: 'info',
      tournament: 'warning',
      league: 'success',
    };
    return <Badge variant={variants[category] || 'default'}>{category}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Registration Templates"
        subtitle="Create and manage reusable registration form templates"
        icon={FileText}
        action={
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </Button>
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 items-end">
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green"
            >
              <option value="">All Categories</option>
              <option value="general">General</option>
              <option value="event">Event</option>
              <option value="tournament">Tournament</option>
              <option value="league">League</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Templates Table */}
      <Card>
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Questions</th>
              <th>Status</th>
              <th>Type</th>
              <th>Created By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon-green"></div>
                  </div>
                </td>
              </tr>
            ) : templates.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  No templates found. Create your first template to get started!
                </td>
              </tr>
            ) : (
              templates.map((template) => (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td>
                    <div>
                      <div className="font-medium text-gray-900">{template.name}</div>
                      {template.description && (
                        <div className="text-sm text-gray-500 truncate max-w-md">
                          {template.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{getCategoryBadge(template.category)}</td>
                  <td className="text-gray-600">{template.questions.length} questions</td>
                  <td>
                    <Badge variant={template.is_active ? 'success' : 'default'}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={template.is_system ? 'info' : 'default'}>
                      {template.is_system ? 'System' : 'Custom'}
                    </Badge>
                  </td>
                  <td className="text-sm text-gray-600">
                    {template.created_by_name || 'System'}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openPreviewModal(template)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => duplicateTemplate(template)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(template)}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title={template.is_system ? 'Deactivate' : 'Delete'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={showCreateModal || editingTemplate !== null}
        onClose={() => {
          setShowCreateModal(false);
          setEditingTemplate(null);
          resetForm();
        }}
        size="xl"
      >
        <ModalHeader>
          {editingTemplate ? 'Edit Template' : 'Create New Template'}
        </ModalHeader>

        <ModalContent>
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Basic Information"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Key *
                </label>
                <Input
                  type="text"
                  value={formData.template_key}
                  onChange={(e) => setFormData({ ...formData, template_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="e.g., basic_info"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Unique identifier (lowercase, underscores only)</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this template..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green"
                >
                  <option value="general">General</option>
                  <option value="event">Event</option>
                  <option value="tournament">Tournament</option>
                  <option value="league">League</option>
                </select>
              </div>

              <div className="flex items-center mt-6">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-brand-dark-green focus:ring-brand-dark-green"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Active
                </label>
              </div>
            </div>

            {/* Questions Section */}
            <div className="border-t pt-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Questions</h4>

              {/* Question Form */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question ID *
                    </label>
                    <Input
                      type="text"
                      value={questionForm.id}
                      onChange={(e) => setQuestionForm({ ...questionForm, id: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                      placeholder="e.g., phone_number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={questionForm.type}
                      onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green"
                    >
                      <option value="text">Text</option>
                      <option value="radio">Radio (Single Choice)</option>
                      <option value="checkbox">Checkbox (Multiple Choice)</option>
                      <option value="member_multiselect">Member Multi-Select</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Text *
                  </label>
                  <Input
                    type="text"
                    value={questionForm.question}
                    onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                    placeholder="Enter your question"
                  />
                </div>

                {questionForm.type === 'text' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Placeholder
                    </label>
                    <Input
                      type="text"
                      value={questionForm.placeholder || ''}
                      onChange={(e) => setQuestionForm({ ...questionForm, placeholder: e.target.value })}
                      placeholder="e.g., (555) 123-4567"
                    />
                  </div>
                )}

                {(questionForm.type === 'radio' || questionForm.type === 'checkbox') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Options (one per line)
                    </label>
                    <textarea
                      value={optionsText}
                      onChange={(e) => setOptionsText(e.target.value)}
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter each option on a new line</p>
                  </div>
                )}

                {questionForm.type === 'member_multiselect' && (
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="restrict_to_club"
                        checked={questionForm.restrictToClub ?? true}
                        onChange={(e) => setQuestionForm({ ...questionForm, restrictToClub: e.target.checked })}
                        className="rounded border-gray-300 text-brand-dark-green focus:ring-brand-dark-green"
                      />
                      <label htmlFor="restrict_to_club" className="ml-2 text-sm text-gray-700">
                        Restrict to user's club only
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Maximum Selections (optional)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={questionForm.maxSelections || ''}
                        onChange={(e) => setQuestionForm({
                          ...questionForm,
                          maxSelections: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                        placeholder="No limit"
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave blank for no limit</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="question_required"
                    checked={questionForm.required}
                    onChange={(e) => setQuestionForm({ ...questionForm, required: e.target.checked })}
                    className="rounded border-gray-300 text-brand-dark-green focus:ring-brand-dark-green"
                  />
                  <label htmlFor="question_required" className="ml-2 text-sm text-gray-700">
                    Required
                  </label>
                </div>

                <Button onClick={addQuestion} className="w-full">
                  {editingQuestionIndex !== null ? 'Update Question' : 'Add Question'}
                </Button>
              </div>

              {/* Questions List */}
              {formData.questions.length > 0 && (
                <div className="space-y-2">
                  {formData.questions.map((q, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{q.question}</span>
                            {q.required && <span className="text-red-500">*</span>}
                            <Badge variant="default">{q.type}</Badge>
                          </div>
                          {q.type === 'text' && q.placeholder && (
                            <p className="text-sm text-gray-500 mt-1">Placeholder: {q.placeholder}</p>
                          )}
                          {(q.type === 'radio' || q.type === 'checkbox') && q.options && (
                            <p className="text-sm text-gray-500 mt-1">Options: {q.options.join(', ')}</p>
                          )}
                          {q.type === 'member_multiselect' && (
                            <p className="text-sm text-gray-500 mt-1">
                              {q.restrictToClub ? 'Club members only' : 'All members'}
                              {q.maxSelections && ` • Max ${q.maxSelections} selections`}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => moveQuestion(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                            title="Move Up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveQuestion(index, 'down')}
                            disabled={index === formData.questions.length - 1}
                            className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                            title="Move Down"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => editQuestion(index)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeQuestion(index)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ModalContent>

        <ModalFooter>
          <Button
            onClick={() => {
              setShowCreateModal(false);
              setEditingTemplate(null);
              resetForm();
            }}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
            disabled={!formData.name || !formData.template_key || formData.questions.length === 0}
          >
            {editingTemplate ? 'Update Template' : 'Create Template'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Preview Modal */}
      <Modal
        open={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setPreviewTemplate(null);
        }}
        size="lg"
      >
        <ModalHeader>
          Preview: {previewTemplate?.name}
        </ModalHeader>

        <ModalContent>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold">Category:</span>
                  {getCategoryBadge(previewTemplate.category)}
                </div>
                {previewTemplate.description && (
                  <p className="text-gray-700">{previewTemplate.description}</p>
                )}
              </div>

              <div className="space-y-4">
                {previewTemplate.questions.map((question, index) => (
                  <div key={index} className="border-b pb-4">
                    <p className="font-medium text-gray-900 mb-2">
                      {question.question}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </p>

                    {question.type === 'text' && (
                      <Input
                        type="text"
                        placeholder={question.placeholder || ''}
                        disabled
                        className="bg-gray-50"
                      />
                    )}

                    {question.type === 'radio' && question.options && (
                      <div className="space-y-2">
                        {question.options.map((option, i) => (
                          <div key={i} className="flex items-center">
                            <input type="radio" disabled className="mr-2" />
                            <label className="text-gray-700">{option}</label>
                          </div>
                        ))}
                      </div>
                    )}

                    {question.type === 'checkbox' && question.options && (
                      <div className="space-y-2">
                        {question.options.map((option, i) => (
                          <div key={i} className="flex items-center">
                            <input type="checkbox" disabled className="mr-2" />
                            <label className="text-gray-700">{option}</label>
                          </div>
                        ))}
                      </div>
                    )}

                    {question.type === 'member_multiselect' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800 mb-2">
                          <strong>Member Selection:</strong> {question.restrictToClub ? 'Club members only' : 'All members'}
                        </p>
                        {question.maxSelections && (
                          <p className="text-sm text-blue-700">
                            Maximum {question.maxSelections} {question.maxSelections === 1 ? 'selection' : 'selections'}
                          </p>
                        )}
                        <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                          <p className="text-xs text-gray-600 italic">
                            Users will be able to search and select members from their club
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </ModalContent>

        <ModalFooter>
          <Button onClick={() => {
            setShowPreviewModal(false);
            setPreviewTemplate(null);
          }}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default RegistrationTemplateManager;
