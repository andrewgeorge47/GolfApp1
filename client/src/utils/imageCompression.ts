import imageCompression from 'browser-image-compression';

/**
 * Compression options for different use cases
 */
export const compressionPresets = {
  // For profile photos and small images
  profile: {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 800,
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
    initialQuality: 0.85,
  },
  // For challenge screenshots (full group shots)
  screenshot: {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
    initialQuality: 0.85,
  },
  // For detailed shot images
  detail: {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
    initialQuality: 0.85,
  },
};

export type CompressionPreset = keyof typeof compressionPresets;

/**
 * Compresses an image file with optional custom settings
 * @param file - The image file to compress
 * @param preset - Preset configuration ('profile', 'screenshot', 'detail')
 * @param customOptions - Optional custom compression options
 * @returns Compressed file
 */
export async function compressImage(
  file: File,
  preset: CompressionPreset = 'screenshot',
  customOptions?: Partial<typeof compressionPresets.screenshot>
): Promise<File> {
  try {
    // Get the preset options
    const presetOptions = compressionPresets[preset];

    // Merge with custom options if provided
    const options = {
      ...presetOptions,
      ...customOptions,
    };

    // Compress the image
    const compressedFile = await imageCompression(file, options);

    // Create a new File object with the original name
    const compressedWithName = new File([compressedFile], file.name, {
      type: compressedFile.type,
      lastModified: Date.now(),
    });

    console.log(
      `Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(
        compressedWithName.size /
        1024 /
        1024
      ).toFixed(2)}MB`
    );

    return compressedWithName;
  } catch (error) {
    console.error('Error compressing image:', error);
    // If compression fails, return original file
    return file;
  }
}

/**
 * Validates if a file is an image
 * @param file - The file to validate
 * @returns true if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Validates if file size is within limit
 * @param file - The file to validate
 * @param maxSizeMB - Maximum size in megabytes
 * @returns true if file is within limit
 */
export function isFileSizeValid(file: File, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Gets a human-readable file size string
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
