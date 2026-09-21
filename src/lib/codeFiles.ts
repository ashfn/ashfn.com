import { createHash } from 'node:crypto';
export const codeFiles = new Map<string, string>();
export function registerCode(code: string) {
  const file = `code/${createHash('sha256').update(code).digest('hex').slice(0, 16)}.txt`;
  codeFiles.set(file, code);
  return '/' + file;
}
