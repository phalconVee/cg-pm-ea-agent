/**
 * Text Streaming Utility
 * 
 * Simulates token-by-token or chunked streaming responses.
 */

export interface StreamOptions {
  onChunk: (chunk: string, isComplete: boolean) => void;
  chunkDelay?: number; // Delay between chunks in ms
  onComplete?: () => void;
}

/**
 * Stream text incrementally, splitting by sentences or words
 */
export function streamText(
  fullText: string,
  options: StreamOptions
): { cancel: () => void } {
  const { onChunk, chunkDelay = 50, onComplete } = options;
  
  // Split text into chunks (prefer sentences, fallback to words)
  const chunks = splitIntoChunks(fullText);
  
  let currentIndex = 0;
  let isCancelled = false;
  
  const stream = () => {
    if (isCancelled || currentIndex >= chunks.length) {
      if (onComplete && !isCancelled) {
        onComplete();
      }
      return;
    }
    
    // Emit current chunk
    const textSoFar = chunks.slice(0, currentIndex + 1).join('');
    const isComplete = currentIndex === chunks.length - 1;
    onChunk(textSoFar, isComplete);
    
    currentIndex++;
    
    // Schedule next chunk
    if (currentIndex < chunks.length) {
      setTimeout(stream, chunkDelay);
    } else if (onComplete) {
      onComplete();
    }
  };
  
  // Start streaming
  stream();
  
  return {
    cancel: () => {
      isCancelled = true;
    },
  };
}

/**
 * Split text into chunks for streaming
 * Prefers sentence boundaries, falls back to word boundaries
 */
function splitIntoChunks(text: string): string[] {
  // First, try splitting by sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  
  if (sentences && sentences.length > 1) {
    // Group sentences into chunks of 1-2 sentences
    const chunks: string[] = [];
    for (let i = 0; i < sentences.length; i += 2) {
      chunks.push(sentences.slice(i, i + 2).join(' '));
    }
    return chunks;
  }
  
  // Fallback to word boundaries
  const words = text.split(/(\s+)/);
  const chunks: string[] = [];
  const wordsPerChunk = 3; // Stream 3 words at a time
  
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(''));
  }
  
  return chunks;
}
