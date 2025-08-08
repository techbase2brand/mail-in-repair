/**
 * Utility functions for handling network connection issues
 */

/**
 * Tests if the internet connection is available
 * @returns Promise that resolves to true if connection is available, false otherwise
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    // Try to fetch a reliable external resource with a HEAD request
    // Using multiple fallback URLs in case one is blocked
    const urls = [
      'https://www.google.com',
      'https://www.cloudflare.com',
      'https://www.microsoft.com'
    ];
    
    // Try each URL until one succeeds
    for (const url of urls) {
      try {
        const response = await fetch(url, { 
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
          // Set a timeout to avoid hanging
          signal: AbortSignal.timeout(5000)
        });
        
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
 * @returns Promise with the result of the function or throws an error after all retries fail
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check connection before attempting
      if (attempt > 0) {
        const isConnected = await testConnection();
        if (!isConnected) {
          throw new Error('No internet connection available');
        }
      }
      
      // Execute the function
      return await fn();
    } catch (err) {
      lastError = err;
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
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