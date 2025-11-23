// Text chunking utilities for optimized translation of long texts

const CHUNK_SIZE = 500; // Characters per chunk
const MIN_CHUNK_TEXT_LENGTH = 300; // Minimum text length to enable chunking

/**
 * Split text into chunks by sentences while preserving context
 */
export const splitIntoChunks = (text: string): string[] => {
  if (text.length < MIN_CHUNK_TEXT_LENGTH) {
    return [text];
  }

  // Split by sentence boundaries (., !, ?, 。, ！, ？)
  const sentenceRegex = /[.!?。！？]+[\s\n]*/g;
  const sentences: string[] = [];
  let lastIndex = 0;
  let match;

  while ((match = sentenceRegex.exec(text)) !== null) {
    sentences.push(text.slice(lastIndex, match.index + match[0].length));
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    sentences.push(text.slice(lastIndex));
  }

  // Combine sentences into chunks
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
};

/**
 * Combine translated chunks back into a single text
 */
export const combineChunks = (chunks: string[]): string => {
  return chunks.join(' ').replace(/\s+/g, ' ').trim();
};

/**
 * Check if text should be chunked
 */
export const shouldChunkText = (text: string): boolean => {
  return text.length >= MIN_CHUNK_TEXT_LENGTH;
};
