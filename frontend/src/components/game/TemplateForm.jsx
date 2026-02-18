import { useState, useEffect } from 'react';

const TemplateForm = ({ template, onSubmit, onCancel }) => {
  // Default roles for new templates
  const defaultRoles = ['CAPTAIN', 'VICE CAPTAIN', 'TANK', 'HEALER', 'SUPPORT', 'SUPPORT'];

  // Form state
  const [formData, setFormData] = useState({
    name: template?.name || '',
    specialty_match_multiplier: template?.specialty_match_multiplier || 1.20,
    is_published: template?.is_published || false,
    roles: template?.roles || template?.roles_json || defaultRoles,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form when template changes (for edit mode)
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        specialty_match_multiplier: template.specialty_match_multiplier,
        is_published: template.is_published,
        roles: template.roles || template.roles_json || defaultRoles,
      });
    }
  }, [template]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Handle role changes
  const handleRoleChange = (index, value) => {
    const newRoles = [...formData.roles];
    newRoles[index] = value;
    setFormData((prev) => ({
      ...prev,
      roles: newRoles,
    }));
  };

  // Add new role
  const addRole = () => {
    setFormData((prev) => ({
      ...prev,
      roles: [...prev.roles, ''],
    }));
  };

  // Remove role
  const removeRole = (index) => {
    if (formData.roles.length <= 1) {
      setErrors((prev) => ({ ...prev, roles: 'At least one role is required' }));
      return;
    }
    const newRoles = formData.roles.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      roles: newRoles,
    }));
    // Clear roles error
    if (errors.roles) {
      setErrors((prev) => ({ ...prev, roles: null }));
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (formData.specialty_match_multiplier < 1.0 || formData.specialty_match_multiplier > 5.0) {
      newErrors.specialty_match_multiplier = 'Multiplier must be between 1.0 and 5.0';
    }

    if (formData.roles.length === 0) {
      newErrors.roles = 'At least one role is required';
    }

    // Check for empty role names
    const hasEmptyRoles = formData.roles.some((role) => !role.trim());
    if (hasEmptyRoles) {
      newErrors.roles = 'All role names must be filled';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
    } catch (error) {
      // Error handling is done in parent component
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">
        {template ? 'Edit Template' : 'Create New Template'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
            Template Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.name ? 'border-red-500' : 'border-neutral-300'
            }`}
            placeholder="e.g., Standard 6v6"
          />
          {errors.name && <p className="mt-1 text-sm text-danger">{errors.name}</p>}
        </div>

        {/* Specialty Match Multiplier */}
        <div>
          <label htmlFor="specialty_match_multiplier" className="block text-sm font-medium text-neutral-700 mb-1">
            Specialty Match Multiplier *
          </label>
          <input
            type="number"
            id="specialty_match_multiplier"
            name="specialty_match_multiplier"
            value={formData.specialty_match_multiplier}
            onChange={handleChange}
            step="0.01"
            min="1.00"
            max="5.00"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.specialty_match_multiplier ? 'border-red-500' : 'border-neutral-300'
            }`}
          />
          <p className="mt-1 text-xs text-neutral-500">
            Multiplier applied when character specialty matches role (1.0 - 5.0, default: 1.20)
          </p>
          {errors.specialty_match_multiplier && (
            <p className="mt-1 text-sm text-danger">{errors.specialty_match_multiplier}</p>
          )}
        </div>

        {/* Published Toggle */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_published"
            name="is_published"
            checked={formData.is_published}
            onChange={handleChange}
            className="h-4 w-4 text-primary focus:ring-primary border-neutral-300 rounded"
          />
          <label htmlFor="is_published" className="ml-2 block text-sm text-neutral-700">
            Published (show in public play screen)
          </label>
        </div>

        {/* Roles Section */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Roles * ({formData.roles.length})
          </label>
          <div className="space-y-2 mb-3">
            {formData.roles.map((role, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={role}
                  onChange={(e) => handleRoleChange(index, e.target.value)}
                  placeholder={`Role ${index + 1} (e.g., CAPTAIN, TANK, SUPPORT)`}
                  className="flex-1 px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => removeRole(index)}
                  className="px-3 py-2 bg-red-100 text-danger-dark rounded-md hover:bg-red-200 transition-colors duration-200 text-sm font-medium"
                  disabled={formData.roles.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRole}
            className="w-full px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors duration-200 text-sm font-medium"
          >
            + Add Role
          </button>

          {errors.roles && <p className="mt-2 text-sm text-danger">{errors.roles}</p>}
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-4 border-t border-neutral-200">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors duration-200 font-medium ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-neutral-200 text-neutral-700 rounded-md hover:bg-neutral-300 transition-colors duration-200 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default TemplateForm;
