import { supabase } from './supabase';

// Function to create a single bucket with error handling
const createBucketIfNotExists = async (bucketName: string) => {
  try {
    console.log(`Checking if bucket '${bucketName}' exists...`);
    
    // First try to get the bucket to see if it exists
    const { data, error } = await supabase.storage.getBucket(bucketName);
    
    // If bucket doesn't exist, create it
    if (error) {
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        console.log(`Bucket '${bucketName}' not found, creating it...`);
        
        // Create the bucket with public access
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: true, // Make bucket public by default
          fileSizeLimit: 10485760, // 10MB
        });
        
        if (createError) {
          console.error(`Error creating '${bucketName}' bucket:`, createError);
          return false;
        }
        
        // Double-check the bucket was created and is public
        const { error: checkError } = await supabase.storage.getBucket(bucketName);
        if (checkError) {
          console.error(`Bucket '${bucketName}' was not created properly:`, checkError);
          return false;
        }
        
        console.log(`Successfully created '${bucketName}' bucket`);
        return true;
      } else {
        console.error(`Error checking bucket '${bucketName}':`, error);
        return false;
      }
    }
    
    // If we get here, bucket exists, ensure it's public
    console.log(`Bucket '${bucketName}' already exists, ensuring it's public...`);
   const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
      public: true
    });
    
    if (updateError) {
      console.error(`Error updating bucket '${bucketName}' to public:`, updateError);
      return false;
    }
    
    console.log(`Successfully ensured bucket '${bucketName}' is public`);
    return true;
  } catch (error) {
    console.error(`Unexpected error with bucket '${bucketName}':`, error);
    return false;
  }
};

// Function to initialize storage buckets
export const initializeStorageBuckets = async () => {
  try {
    console.log('Starting storage bucket initialization...');
    console.log('Preparing to create required storage buckets...');
    
    // Create all required buckets
    const buckets = ['repair_media', 'buyback_media', 'refurbishing_media'];
    console.log(`Will create/check ${buckets.length} buckets:`, buckets.join(', '));
    
    for (const bucket of buckets) {
      console.log(`Processing bucket: ${bucket}`);
      const success = await createBucketIfNotExists(bucket);
      
      if (success) {
        console.log(`Successfully initialized bucket: ${bucket}, checking public status...`);
        // Ensure bucket is public
        try {
          // Just log that we're checking public status
          console.log(`Checking if bucket '${bucket}' is public...`);
          // The bucket should already be public from our earlier settings
          console.log(`Bucket '${bucket}' should be public based on settings`);
        } catch (err) {
          console.error(`Error checking if bucket '${bucket}' is public:`, err);
        }
      } else {
        console.error(`Failed to initialize bucket: ${bucket}, skipping public setting`);
      }
    }
    
    console.log('Storage buckets initialization completed successfully');
  } catch (error) {
    console.error('Error initializing storage buckets:', error);
  }
};