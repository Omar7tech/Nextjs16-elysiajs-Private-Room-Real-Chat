import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-cbc'; // Use CBC mode which is more widely supported
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits

// Generate a random key
export function generateKey(): string {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

// Generate a random IV (Initialization Vector)
function generateIV(): Buffer {
    return crypto.randomBytes(IV_LENGTH);
}

// Encrypt a message
export function encryptMessage(message: string, key: string): string {
    const iv = generateIV();
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
    
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine IV and encrypted data
    const combined = Buffer.concat([
        iv,
        Buffer.from(encrypted, 'hex')
    ]);
    
    return combined.toString('base64');
}

// Decrypt a message
export function decryptMessage(encryptedData: string, key: string): string {
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

// Generate a room-specific encryption key
export function generateRoomKey(roomId: string): string {
    // Use a deterministic but secure way to generate room keys
    const hmac = crypto.createHmac('sha256', process.env.ENCRYPTION_SECRET || 'default-secret-key');
    hmac.update(roomId);
    return hmac.digest('hex').slice(0, KEY_LENGTH * 2); // Take first 64 chars (32 bytes)
}
