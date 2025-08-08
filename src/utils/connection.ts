/**
 * Utility functions for handling network connection issues
 */

/**
 * Tests if the internet connection is available
 * @returns Promise that resolves to true if connection is available, false otherwise
 */
export const testConnection = async (): Promise<boolean> => {
  // Skip connection test in server-side rendering
  if (typeof window === 'undefined') {
    console.log('Skipping connection test in SSR environment');
    return true; // Assume connection is available in SSR
  }
  
  try {
    // Try to fetch a reliable external resource with a HEAD request
    // Using multiple fallback URLs in case one is blocked
    const urls = [
      'https://www.google.com',
      'https://www.cloudflare.com',
      'https://www.microsoft.com',
      'https://www.apple.com',
      'https://www.amazon.com'
    ];
    
    // Create a promise that resolves after a timeout
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Connection test timed out')), 7000);
    });
    
    // Try each URL until one succeeds, with a race against the timeout
    for (const url of urls) {
      try {
        // Race between fetch and timeout
        await Promise.race([
          fetch(url, { 
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' },
            // Set a timeout to avoid hanging
            signal: AbortSignal.timeout(5000)
          }),
          timeoutPromise
        ]);
        
        console.log(`Connection test successful using ${url}`);
        return true;
      } catch (err) {
        console.warn(`Connection test failed for ${url}:`, err);
        // Continue to the next URL
      }
    }
    
    // If all URLs failed, return false
    console.error('All connection tests failed');
    return false;
  } catch (err) {
    console.error('Connection test error:', err);
    return false;
  }
};

/**
 * Executes a function with retry logic and exponential backoff
 * @param fn The async function to execute
 * @param maxRetries Maximum number of retry attempts
 * @param baseDelay Base delay in milliseconds before retrying
 * @param shouldRetry Optional function to determine if a specific error should trigger a retry
 * @returns Promise with the result of the function or throws an error after all retries fail
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  shouldRetry?: (error: any) => boolean
): Promise<T> => {
  // Skip retry logic in server-side rendering if window is undefined
  // This prevents unnecessary retries during SSR
  if (typeof window === 'undefined') {
    try {
      return await fn();
    } catch (err) {
      console.error('Error in SSR, not retrying:', err);
      throw err;
    }
  }
  
  let lastError: any = null;
  let retryCount = 0;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check connection before attempting, but only after the first attempt
      if (attempt > 0) {
        const isConnected = await testConnection();
        if (!isConnected) {
          console.warn('No internet connection available, waiting before retry');
          // Wait a bit longer when there's no connection
          await new Promise(resolve => setTimeout(resolve, baseDelay * 2));
          // Don't count this as a retry if we couldn't even check connection
          attempt--;
          continue;
        }
      }
      
      // Execute the function
      return await fn();
    } catch (err: any) {
      lastError = err;
      console.error(`Attempt ${attempt + 1}/${maxRetries + 1} failed:`, err.message || err);
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        // Enhance the error message with retry information
        if (err instanceof Error) {
          err.message = `${err.message} (after ${maxRetries + 1} attempts)`;
        }
        throw err;
      }
      
      // Check if we should retry this specific error
      if (shouldRetry && !shouldRetry(err)) {
        console.log('Error not eligible for retry based on shouldRetry function');
        throw err;
      }
      
      // Don't retry for certain error types
      if (err.message && (
        err.message.includes('Invalid login credentials') ||
        err.message.includes('Email not confirmed') ||
        err.message.includes('not verified')
      )) {
        console.log('Not retrying due to authentication error:', err.message);
        throw err;
      }
      
      // Calculate backoff time with exponential increase and some randomness
      const backoffTime = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random());
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} in ${Math.round(backoffTime)}ms`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }
  
  // This should never be reached due to the throw in the loop, but TypeScript needs it
  throw lastError;
};