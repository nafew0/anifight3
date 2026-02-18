import { useState, useEffect } from 'react';
import { api } from '../services/api';

const TemplateSelector = ({ selectedTemplate, onSelect }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getTemplates();
      setTemplates(response.data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setError('Failed to load templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-700">
          Select Game Template
        </label>
        <div className="w-full px-4 py-3 border border-neutral-300 rounded-lg bg-neutral-50">
          <div className="animate-pulse flex items-center space-x-2">
            <div className="h-4 bg-neutral-300 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-700">
          Select Game Template
        </label>
        <div className="w-full px-4 py-3 border border-red-300 rounded-lg bg-red-50 text-danger-dark">
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchTemplates}
            className="mt-2 text-sm font-medium text-red-800 hover:text-red-900 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-700">
          Select Game Template
        </label>
        <div className="w-full px-4 py-3 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-800">
          <p className="text-sm">No templates available. Please contact the admin to create a template.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor="template-select" className="block text-sm font-medium text-neutral-700">
        Select Game Template
      </label>
      <select
        id="template-select"
        value={selectedTemplate?.id || ''}
        onChange={(e) => {
          const template = templates.find(t => t.id === parseInt(e.target.value));
          onSelect(template);
        }}
        className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-neutral-900 transition-colors"
      >
        <option value="">-- Choose a template --</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name} ({template.roles.length} roles)
          </option>
        ))}
      </select>

      {selectedTemplate && (
        <div className="mt-3 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
          <h3 className="text-sm font-semibold text-indigo-900 mb-2">
            Template Details
          </h3>
          <div className="space-y-2 text-sm text-indigo-800">
            <div>
              <span className="font-medium">Roles:</span>{' '}
              <span className="text-indigo-600">
                {selectedTemplate.roles.join(', ')}
              </span>
            </div>
            <div>
              <span className="font-medium">Specialty Bonus:</span>{' '}
              <span className="text-indigo-600">
                {selectedTemplate.specialty_match_multiplier}x
              </span>
            </div>
            <div>
              <span className="font-medium">Characters Needed:</span>{' '}
              <span className="text-indigo-600">
                {selectedTemplate.roles.length * 2} (
                {selectedTemplate.roles.length} per player)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateSelector;
