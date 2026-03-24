export async function retryPrismaQuery<T>(
  queryFn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      // Check if it's a connection error
      if (error.code === 'P1017' || error.code === 'P1001') {
        console.log(`[Prisma] Connection error on attempt ${attempt}/${maxRetries}`);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      } else {
        // Not a connection error, throw immediately
        throw error;
      }
    }
  }
  
  throw new Error('Max retries exceeded');
}
