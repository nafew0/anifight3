// AniFight Theme Color Configuration
// Centralized color palette for consistent theming across the application
//
// IMPORTANT: This project uses Tailwind CSS v4
// Theme colors are defined in src/index.css using the @theme directive
//
// To change colors, edit: frontend/src/index.css (lines 3-36)
// This file is kept for reference and potential use in JavaScript

const colors = {
  // Primary brand colors
  primary: {
    DEFAULT: '#3B82F6', // blue-600
    light: '#60A5FA',   // blue-400
    dark: '#1D4ED8',    // blue-700
    darker: '#1E3A8A',  // blue-900
  },

  // Secondary/accent colors
  secondary: {
    DEFAULT: '#8B5CF6', // purple-600
    light: '#A78BFA',   // purple-400
    dark: '#6D28D9',    // purple-700
  },

  // Success/positive actions
  success: {
    DEFAULT: '#10B981', // green-600
    light: '#34D399',   // green-400
    dark: '#059669',    // green-700
  },

  // Danger/destructive actions
  danger: {
    DEFAULT: '#EF4444', // red-600
    light: '#F87171',   // red-400
    dark: '#DC2626',    // red-700
  },

  // Neutral colors (backgrounds, text, borders)
  neutral: {
    50: '#F9FAFB',      // gray-50
    100: '#F3F4F6',     // gray-100
    200: '#E5E7EB',     // gray-200
    300: '#D1D5DB',     // gray-300
    400: '#9CA3AF',     // gray-400
    500: '#6B7280',     // gray-500
    600: '#4B5563',     // gray-600
    700: '#374151',     // gray-700
    800: '#1F2937',     // gray-800
    900: '#111827',     // gray-900
  },
};

export default colors;