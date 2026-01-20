/**
 * Convert a File to a base64 data URL string.
 * @param file - The file to convert
 * @returns Promise resolving to a base64 data URL string
 * @throws Error if the file cannot be read
 */
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('FileReader did not return a string'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}
