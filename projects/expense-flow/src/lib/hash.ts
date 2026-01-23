/**
 * Calculates SHA-256 hash of a file for duplicate detection.
 * @param file The file to hash
 * @returns Hex string of the SHA-256 hash
 * @throws Error if crypto.subtle is not available (e.g., non-HTTPS context)
 */
export async function calculateFileHash(file: File): Promise<string> {
    try {
        // Check if crypto.subtle is available (requires HTTPS or localhost)
        if (!crypto?.subtle) {
            console.warn('crypto.subtle not available - using fallback hash');
            return fallbackHash(file);
        }

        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    } catch (error) {
        console.error('Hash calculation error:', error);
        // Return a fallback hash based on file metadata
        return fallbackHash(file);
    }
}

/**
 * Fallback hash when crypto.subtle is unavailable.
 * Uses file metadata - less reliable but functional.
 */
function fallbackHash(file: File): string {
    const metadata = `${file.name}-${file.size}-${file.lastModified}-${file.type}`;
    // Simple string hash
    let hash = 0;
    for (let i = 0; i < metadata.length; i++) {
        const char = metadata.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return `fallback-${Math.abs(hash).toString(16)}`;
}
