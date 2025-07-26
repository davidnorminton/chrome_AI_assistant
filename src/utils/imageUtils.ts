// src/utils/imageUtils.ts

/**
 * Fetches an image from a URL and converts it to base64
 * @param imageUrl - The URL of the image to fetch
 * @returns Promise<string> - Base64 encoded image data
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to convert image to base64'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching image as base64:', error);
    throw error;
  }
}

/**
 * Processes an array of images by fetching their base64 data
 * @param images - Array of image objects with imageUrl
 * @returns Promise<Array> - Array of images with base64 data
 */
export async function processImagesWithBase64(images: Array<{
  title: string;
  url: string;
  description: string;
  imageUrl: string;
}>): Promise<Array<{
  title: string;
  url: string;
  description: string;
  imageUrl: string;
  base64Data?: string;
}>> {
  const processedImages = await Promise.allSettled(
    images.map(async (image) => {
      try {
        const base64Data = await fetchImageAsBase64(image.imageUrl);
        return {
          ...image,
          base64Data
        };
      } catch (error) {
        console.warn(`Failed to fetch image for ${image.title}:`, error);
        return {
          ...image,
          base64Data: undefined
        };
      }
    })
  );

  return processedImages.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.warn(`Failed to process image ${index}:`, result.reason);
      return {
        ...images[index],
        base64Data: undefined
      };
    }
  });
} 