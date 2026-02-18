import { useState } from 'react';

const TemplateCard = ({ template, onEdit, onDelete }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    onDelete(template.id);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
      {/* Template Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-neutral-900 mb-1">{template.name}</h3>
          <p className="text-sm text-neutral-500">
            {(template.roles || template.roles_json)?.length || 0} roles
          </p>
        </div>
        {template.is_published && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Published
          </span>
        )}
      </div>

      {/* Template Details */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-600">Specialty Multiplier:</span>
          <span className="font-medium text-neutral-900">{template.specialty_match_multiplier}x</span>
        </div>
        <div className="text-xs text-neutral-500">
          Created {new Date(template.created_at).toLocaleDateString()}
        </div>
      </div>

      {/* Roles Preview */}
      <div className="mb-4">
        <p className="text-xs font-medium text-neutral-700 mb-2">Roles:</p>
        <div className="flex flex-wrap gap-1">
          {(template.roles || template.roles_json)?.slice(0, 3).map((role, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-light bg-opacity-20 text-primary-dark"
            >
              {role}
            </span>
          ))}
          {(template.roles || template.roles_json)?.length > 3 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600">
              +{(template.roles || template.roles_json).length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {!showDeleteConfirm ? (
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(template)}
            className="flex-1 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors duration-200 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex-1 bg-danger text-white px-4 py-2 rounded-md hover:bg-danger-dark transition-colors duration-200 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-danger font-medium">Delete this template?</p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              className="flex-1 bg-danger text-white px-4 py-2 rounded-md hover:bg-danger-dark transition-colors duration-200 text-sm font-medium"
            >
              Confirm
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 bg-neutral-200 text-neutral-700 px-4 py-2 rounded-md hover:bg-neutral-300 transition-colors duration-200 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateCard;
