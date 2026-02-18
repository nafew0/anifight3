#!/bin/bash

# Script to update hardcoded Tailwind colors to use custom color config

# Define the directory
DIR="/Users/nafew/Documents/Web Projects/AniFight/frontend/src"

# Color mappings
declare -A color_map=(
  # Blue colors to primary
  ["bg-blue-600"]="bg-primary"
  ["bg-blue-700"]="bg-primary-dark"
  ["bg-blue-400"]="bg-primary-light"
  ["bg-blue-100"]="bg-primary-light bg-opacity-20"
  ["bg-blue-800"]="bg-primary-darker"
  ["text-blue-600"]="text-primary"
  ["text-blue-700"]="text-primary-dark"
  ["text-blue-800"]="text-primary-dark"
  ["text-blue-400"]="text-primary-light"
  ["hover:bg-blue-600"]="hover:bg-primary"
  ["hover:bg-blue-700"]="hover:bg-primary-dark"
  ["border-blue-500"]="border-primary"
  ["focus:border-blue-500"]="focus:border-primary"
  ["focus:ring-blue-500"]="focus:ring-primary"

  # Red colors to danger
  ["bg-red-600"]="bg-danger"
  ["bg-red-700"]="bg-danger-dark"
  ["bg-red-400"]="bg-danger-light"
  ["text-red-600"]="text-danger"
  ["text-red-700"]="text-danger-dark"
  ["hover:bg-red-700"]="hover:bg-danger-dark"

  # Green colors to success
  ["bg-green-600"]="bg-success"
  ["bg-green-700"]="bg-success-dark"
  ["bg-green-500"]="bg-success"
  ["bg-green-400"]="bg-success-light"
  ["text-green-600"]="text-success"
  ["hover:bg-green-700"]="hover:bg-success-dark"

  # Gray colors to neutral
  ["bg-gray-50"]="bg-neutral-50"
  ["bg-gray-100"]="bg-neutral-100"
  ["bg-gray-200"]="bg-neutral-200"
  ["bg-gray-300"]="bg-neutral-300"
  ["bg-gray-400"]="bg-neutral-400"
  ["bg-gray-500"]="bg-neutral-500"
  ["bg-gray-600"]="bg-neutral-600"
  ["bg-gray-700"]="bg-neutral-700"
  ["bg-gray-800"]="bg-neutral-800"
  ["bg-gray-900"]="bg-neutral-900"
  ["text-gray-50"]="text-neutral-50"
  ["text-gray-100"]="text-neutral-100"
  ["text-gray-200"]="text-neutral-200"
  ["text-gray-300"]="text-neutral-300"
  ["text-gray-400"]="text-neutral-400"
  ["text-gray-500"]="text-neutral-500"
  ["text-gray-600"]="text-neutral-600"
  ["text-gray-700"]="text-neutral-700"
  ["text-gray-800"]="text-neutral-800"
  ["text-gray-900"]="text-neutral-900"
  ["hover:bg-gray-100"]="hover:bg-neutral-100"
  ["hover:bg-gray-200"]="hover:bg-neutral-200"
  ["hover:bg-gray-300"]="hover:bg-neutral-300"
  ["hover:bg-gray-600"]="hover:bg-neutral-600"
  ["hover:bg-gray-700"]="hover:bg-neutral-700"
  ["hover:bg-gray-800"]="hover:bg-neutral-800"
  ["border-gray-300"]="border-neutral-300"
  ["border-gray-200"]="border-neutral-200"
  ["focus:border-gray-400"]="focus:border-neutral-400"

  # Purple colors to secondary
  ["bg-purple-600"]="bg-secondary"
  ["bg-purple-100"]="bg-secondary-light bg-opacity-20"
  ["text-purple-800"]="text-secondary-dark"
)

echo "Starting color replacement..."

# Find all .jsx files and apply replacements
find "$DIR" -name "*.jsx" -type f | while read -r file; do
  echo "Processing: $file"

  # Create a temporary file
  temp_file="${file}.tmp"
  cp "$file" "$temp_file"

  # Apply each color replacement
  for old_color in "${!color_map[@]}"; do
    new_color="${color_map[$old_color]}"
    sed -i '' "s/${old_color}/${new_color}/g" "$temp_file"
  done

  # Only replace the file if changes were made
  if ! cmp -s "$file" "$temp_file"; then
    mv "$temp_file" "$file"
    echo "  ✓ Updated colors in $file"
  else
    rm "$temp_file"
  fi
done

echo "Color replacement complete!"
