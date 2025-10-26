// Video compression utility for portfolio uploads
export const compressVideo = async (file, maxSizeMB = 50) => {
  try {
    // For now, we'll just validate the file size and return the original
    // In a production environment, you might want to use FFmpeg.js or similar
    // to actually compress videos on the client side
    
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      throw new Error(`Video file too large. Maximum size allowed is ${maxSizeMB}MB. Current file size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
    }
    
    console.log('Video file size:', (file.size / (1024 * 1024)).toFixed(2), 'MB');
    
    // Return the original file for now
    // TODO: Implement actual video compression using FFmpeg.js
    return file;
  } catch (error) {
    console.error('Video validation failed:', error);
    throw error;
  }
};

export const validateVideoFile = (file) => {
  const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'];
  const maxSize = 50 * 1024 * 1024; // 50MB

  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid video type. Please upload MP4, AVI, MOV, WMV, or WebM videos only.');
  }

  if (file.size > maxSize) {
    throw new Error(`Video file too large. Please upload videos smaller than 50MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
  }

  return true;
};

export const getFileSizeString = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

