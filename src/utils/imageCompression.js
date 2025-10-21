import imageCompression from 'browser-image-compression';

export const compressImage = async (file, maxSizeKB = 300) => {
  try {
    const options = {
      maxSizeMB: maxSizeKB / 1024, // Convert KB to MB
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/jpeg',
      quality: 0.8
    };

    console.log('Original file size:', (file.size / 1024).toFixed(2), 'KB');
    
    const compressedFile = await imageCompression(file, options);
    
    console.log('Compressed file size:', (compressedFile.size / 1024).toFixed(2), 'KB');
    
    // If still too large, compress more aggressively
    if (compressedFile.size > maxSizeKB * 1024) {
      const aggressiveOptions = {
        ...options,
        quality: 0.6,
        maxSizeMB: maxSizeKB / 1024
      };
      
      const finalCompressedFile = await imageCompression(file, aggressiveOptions);
      console.log('Final compressed file size:', (finalCompressedFile.size / 1024).toFixed(2), 'KB');
      
      return finalCompressedFile;
    }
    
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    // Return original file if compression fails
    return file;
  }
};

export const compressMultipleImages = async (files, maxSizeKB = 300) => {
  try {
    const compressedFiles = await Promise.all(
      files.map(file => compressImage(file, maxSizeKB))
    );
    return compressedFiles;
  } catch (error) {
    console.error('Multiple image compression failed:', error);
    return files;
  }
};

export const validateImageFile = (file) => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload JPEG, PNG, or WebP images only.');
  }

  if (file.size > maxSize) {
    throw new Error('File too large. Please upload images smaller than 10MB.');
  }

  return true;
};






