import { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import TemplateCard from '../components/game/TemplateCard';
import TemplateForm from '../components/game/TemplateForm';
import { api } from '../services/api';

const GamePage = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [notification, setNotification] = useState(null);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load templates from API
  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getMyTemplates();
      setTemplates(response.data);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Failed to load templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  // Handle create new template
  const handleCreateNew = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  // Handle edit template
  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  // Handle form submit (create or update)
  const handleFormSubmit = async (formData) => {
    try {
      if (editingTemplate) {
        // Update existing template
        await api.updateTemplate(editingTemplate.id, formData);
        showNotification('Template updated successfully!');
      } else {
        // Create new template
        await api.createTemplate(formData);
        showNotification('Template created successfully!');
      }

      // Reload templates and close form
      await loadTemplates();
      setShowForm(false);
      setEditingTemplate(null);
    } catch (err) {
      console.error('Error saving template:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to save template. Please try again.';
      showNotification(errorMessage, 'error');
      throw err; // Re-throw to keep form in submitting state if needed
    }
  };

  // Handle cancel form
  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTemplate(null);
  };

  // Handle delete template
  const handleDelete = async (templateId) => {
    try {
      await api.deleteTemplate(templateId);
      showNotification('Template deleted successfully!');
      await loadTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to delete template. Please try again.';
      showNotification(errorMessage, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">My Game Templates</h1>
          <p className="text-neutral-600">
            Create and manage your custom game templates with roles and settings.
          </p>
        </div>

        {/* Notification */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-md ${
              notification.type === 'error'
                ? 'bg-red-50 border border-red-200'
                : 'bg-green-50 border border-green-200'
            }`}
          >
            <p
              className={`text-sm font-medium ${
                notification.type === 'error' ? 'text-red-800' : 'text-green-800'
              }`}
            >
              {notification.message}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={loadTemplates}
              className="mt-2 text-sm text-danger hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Form View */}
        {showForm ? (
          <div className="mb-8">
            <TemplateForm
              template={editingTemplate}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          </div>
        ) : (
          <>
            {/* Create New Button */}
            <div className="mb-6">
              <button
                onClick={handleCreateNew}
                className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors duration-200 font-medium shadow-sm"
              >
                + Create New Template
              </button>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : templates.length === 0 ? (
              /* Empty State */
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <svg
                  className="mx-auto h-12 w-12 text-neutral-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-neutral-900">No templates</h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Get started by creating your first game template.
                </p>
                <div className="mt-6">
                  <button
                    onClick={handleCreateNew}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors duration-200 font-medium"
                  >
                    Create Template
                  </button>
                </div>
              </div>
            ) : (
              /* Templates Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GamePage;
