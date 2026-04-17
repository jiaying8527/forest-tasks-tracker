import { customAlphabet } from 'nanoid';

// 12-char alphanumeric — stable and URL-safe, plenty for personal scale.
const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nano = customAlphabet(alphabet, 12);

export function newId(): string {
  return nano();
}
