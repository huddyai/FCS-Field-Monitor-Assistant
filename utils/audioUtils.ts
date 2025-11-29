
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Data URLs format: data:[<mediatype>][;base64],<data>
      // We want to return just the <data> part.
      const commaIndex = base64String.indexOf(',');
      if (commaIndex !== -1) {
        resolve(base64String.substring(commaIndex + 1));
      } else {
        // Fallback if strictly base64 without prefix (unlikely from FileReader)
        resolve(base64String);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
