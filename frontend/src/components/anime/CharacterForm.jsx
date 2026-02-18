import { useState, useEffect, useRef } from 'react';

const CharacterForm = ({ character, onSubmit, onCancel }) => {
  // Common specialty options
  const commonSpecialties = [
    'CAPTAIN',
    'VICE CAPTAIN',
    'TANK',
    'HEALER',
    'SUPPORT',
    'DPS',
    'ASSASSIN',
    'MAGE',
    'RANGER',
    'WARRIOR',
    'ROGUE',
    'STRATEGIST',
  ];

  const [formData, setFormData] = useState({
    name: character?.name || '',
    character_power: character?.character_power || '',
    specialties: character?.specialties || [],
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(character?.image || null);
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (character) {
      setFormData({
        name: character.name,
        character_power: character.character_power || '',
        specialties: character.specialties || [],
      });
      setImagePreview(character.image || null);
    }
  }, [character]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors((prev) => ({ ...prev, image: 'Please select a valid image file' }));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, image: 'Image must be less than 5MB' }));
        return;
      }

      setImageFile(file);
      setErrors((prev) => ({ ...prev, image: null }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Toggle specialty selection
  const toggleSpecialty = (specialty) => {
    setFormData((prev) => {
      const specialties = prev.specialties.includes(specialty)
        ? prev.specialties.filter((s) => s !== specialty)
        : [...prev.specialties, specialty];

      return { ...prev, specialties };
    });
  };

  // Add custom specialty
  const handleAddCustomSpecialty = () => {
    const trimmed = customSpecialty.trim().toUpperCase();
    if (trimmed && !formData.specialties.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        specialties: [...prev.specialties, trimmed],
      }));
      setCustomSpecialty('');
    }
  };

  // Remove specialty
  const removeSpecialty = (specialty) => {
    setFormData((prev) => ({
      ...prev,
      specialties: prev.specialties.filter((s) => s !== specialty),
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Character name is required';
    }

    if (formData.character_power !== '' && formData.character_power !== null) {
      const power = parseFloat(formData.character_power);
      if (isNaN(power) || power < 1 || power > 100) {
        newErrors.character_power = 'Character power must be between 1 and 100';
      }
      // Check if it has more than 2 decimal places
      const decimalPart = formData.character_power.toString().split('.')[1];
      if (decimalPart && decimalPart.length > 2) {
        newErrors.character_power = 'Character power can have at most 2 decimal places';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      submitData.append('name', formData.name);

      if (formData.character_power !== '' && formData.character_power !== null) {
        submitData.append('character_power', formData.character_power);
      }

      // Add specialties as JSON string
      submitData.append('specialties', JSON.stringify(formData.specialties));

      if (imageFile) {
        submitData.append('image', imageFile);
      }

      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">
        {character ? 'Edit Character' : 'Add New Character'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Character Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
            Character Name *
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
            placeholder="e.g., Naruto Uzumaki"
          />
          {errors.name && <p className="mt-1 text-sm text-danger">{errors.name}</p>}
        </div>

        {/* Character Power */}
        <div>
          <label htmlFor="character_power" className="block text-sm font-medium text-neutral-700 mb-1">
            Character Power
          </label>
          <input
            type="number"
            id="character_power"
            name="character_power"
            value={formData.character_power}
            onChange={handleChange}
            min="1"
            max="100"
            step="0.01"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.character_power ? 'border-red-500' : 'border-neutral-300'
            }`}
            placeholder="e.g., 85.50"
          />
          <p className="mt-1 text-xs text-neutral-500">Power level from 1 to 100 (up to 2 decimal places, optional)</p>
          {errors.character_power && (
            <p className="mt-1 text-sm text-danger">{errors.character_power}</p>
          )}
        </div>

        {/* Specialties Multi-Select */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Specialties</label>

          {/* Common Specialties */}
          <div className="mb-3">
            <p className="text-xs text-neutral-600 mb-2">Select from common specialties:</p>
            <div className="flex flex-wrap gap-2">
              {commonSpecialties.map((specialty) => (
                <button
                  key={specialty}
                  type="button"
                  onClick={() => toggleSpecialty(specialty)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
                    formData.specialties.includes(specialty)
                      ? 'bg-secondary text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {specialty}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Specialty Input */}
          <div>
            <p className="text-xs text-neutral-600 mb-2">Or add a custom specialty:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customSpecialty}
                onChange={(e) => setCustomSpecialty(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomSpecialty();
                  }
                }}
                placeholder="e.g., SWORDSMAN"
                className="flex-1 px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
              <button
                type="button"
                onClick={handleAddCustomSpecialty}
                className="px-4 py-2 bg-success text-white rounded-md hover:bg-success-dark transition-colors duration-200 text-sm font-medium"
              >
                Add
              </button>
            </div>
          </div>

          {/* Selected Specialties */}
          {formData.specialties.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-neutral-600 mb-2">Selected ({formData.specialties.length}):</p>
              <div className="flex flex-wrap gap-2">
                {formData.specialties.map((specialty, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium bg-secondary-light bg-opacity-20 text-secondary-dark"
                  >
                    {specialty}
                    <button
                      type="button"
                      onClick={() => removeSpecialty(specialty)}
                      className="ml-1 text-purple-600 hover:text-secondary-dark"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Character Image</label>

          {imagePreview ? (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-lg border-2 border-neutral-300"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-danger transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-neutral-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                id="image"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <label htmlFor="image" className="cursor-pointer">
                <div className="flex flex-col items-center">
                  <svg
                    className="w-10 h-10 text-neutral-400 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm text-neutral-600">Click to upload</span>
                  <span className="text-xs text-neutral-500">PNG, JPG up to 5MB</span>
                </div>
              </label>
            </div>
          )}
          {errors.image && <p className="mt-2 text-sm text-danger">{errors.image}</p>}
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
            {isSubmitting ? 'Saving...' : character ? 'Update Character' : 'Add Character'}
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

export default CharacterForm;
