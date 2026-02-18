import { useState, useEffect, useRef } from 'react';

const AnimeForm = ({ anime, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: anime?.name || '',
    anime_power_scale: anime?.anime_power_scale || '',
    is_public: anime?.is_public || false,
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(anime?.image || null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (anime) {
      setFormData({
        name: anime.name,
        anime_power_scale: anime.anime_power_scale || '',
        is_public: anime.is_public,
      });
      setImagePreview(anime.image || null);
    }
  }, [anime]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors((prev) => ({ ...prev, image: 'Please select a valid image file' }));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, image: 'Image must be less than 5MB' }));
        return;
      }

      setImageFile(file);
      setErrors((prev) => ({ ...prev, image: null }));

      // Create preview
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

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Anime name is required';
    }

    if (formData.anime_power_scale !== '' && formData.anime_power_scale !== null) {
      const powerScale = parseFloat(formData.anime_power_scale);
      if (isNaN(powerScale) || powerScale < 0.01 || powerScale > 10.0) {
        newErrors.anime_power_scale = 'Power scale must be between 0.01 and 10.00';
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
      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('name', formData.name);

      if (formData.anime_power_scale !== '' && formData.anime_power_scale !== null) {
        submitData.append('anime_power_scale', formData.anime_power_scale);
      }

      // Convert boolean to string that DRF accepts
      submitData.append('is_public', formData.is_public ? 'true' : 'false');

      // Add image if a new one was selected
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
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">
        {anime ? 'Edit Anime' : 'Create New Anime'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Anime Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
            Anime Name *
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
            placeholder="e.g., Naruto"
          />
          {errors.name && <p className="mt-1 text-sm text-danger">{errors.name}</p>}
        </div>

        {/* Power Scale */}
        <div>
          <label htmlFor="anime_power_scale" className="block text-sm font-medium text-neutral-700 mb-1">
            Anime Power Scale (APS)
          </label>
          <input
            type="number"
            id="anime_power_scale"
            name="anime_power_scale"
            value={formData.anime_power_scale}
            onChange={handleChange}
            step="0.01"
            min="0.01"
            max="10.00"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.anime_power_scale ? 'border-red-500' : 'border-neutral-300'
            }`}
            placeholder="e.g., 1.50"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Multiplier based on anime strength (0.01 - 10.00, optional)
          </p>
          {errors.anime_power_scale && (
            <p className="mt-1 text-sm text-danger">{errors.anime_power_scale}</p>
          )}
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Anime Image</label>

          {imagePreview ? (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-48 h-48 object-cover rounded-lg border-2 border-neutral-300"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-danger transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
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
                    className="w-12 h-12 text-neutral-400 mb-2"
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
                  <span className="text-sm text-neutral-600">Click to upload image</span>
                  <span className="text-xs text-neutral-500 mt-1">PNG, JPG up to 5MB</span>
                </div>
              </label>
            </div>
          )}
          {errors.image && <p className="mt-2 text-sm text-danger">{errors.image}</p>}
        </div>

        {/* Public Toggle */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_public"
            name="is_public"
            checked={formData.is_public}
            onChange={handleChange}
            className="h-4 w-4 text-primary focus:ring-primary border-neutral-300 rounded"
          />
          <label htmlFor="is_public" className="ml-2 block text-sm text-neutral-700">
            Make public (visible in library for all users)
          </label>
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
            {isSubmitting ? 'Saving...' : anime ? 'Update Anime' : 'Create Anime'}
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

export default AnimeForm;
