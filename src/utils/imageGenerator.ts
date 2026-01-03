import html2canvas from 'html2canvas';

/**
 * Generate and download an image from a DOM element
 * @param element - The DOM element to capture
 * @param fileName - The name of the file to download
 */
export async function generateAndDownloadImage(
  element: HTMLElement,
  fileName: string = 'year-in-review.png'
): Promise<void> {
  try {
    // Generate canvas from element
    const canvas = await html2canvas(element, {
      backgroundColor: null,
      scale: 2, // Higher quality
      logging: false,
      useCORS: true,
    });

    // Convert canvas to blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png', 1.0);
    });

    if (!blob) {
      throw new Error('Failed to generate image');
    }

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to generate image:', error);
    throw error;
  }
}

/**
 * Share image via Web Share API if available, otherwise download
 * @param element - The DOM element to capture
 * @param fileName - The name of the file
 * @param shareData - Optional share data (title, text)
 */
export async function shareOrDownloadImage(
  element: HTMLElement,
  fileName: string = 'year-in-review.png',
  shareData?: { title?: string; text?: string }
): Promise<void> {
  try {
    // Generate canvas from element
    const canvas = await html2canvas(element, {
      backgroundColor: null,
      scale: 2,
      logging: false,
      useCORS: true,
    });

    // Convert canvas to blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png', 1.0);
    });

    if (!blob) {
      throw new Error('Failed to generate image');
    }

    // Try to use Web Share API if available
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: 'image/png' });
      const sharePayload = {
        files: [file],
        title: shareData?.title || 'My Year in Review',
        text: shareData?.text || 'Check out my year in review!',
      };

      if (navigator.canShare(sharePayload)) {
        await navigator.share(sharePayload);
        return;
      }
    }

    // Fallback to download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to share/download image:', error);
    throw error;
  }
}
