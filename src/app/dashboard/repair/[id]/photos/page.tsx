'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/supabase-provider';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  UploadIcon, 
  ImageIcon, 
  XIcon,
  DownloadIcon,
  TrashIcon,
  Maximize2Icon,
  Minimize2Icon,
  VideoIcon
} from '@/components/icons';
import { v4 as uuidv4 } from 'uuid';

type RepairTicket = {
  id: string;
  ticket_number: string;
  status: string;
  device_type: string;
  device_model: string;
  customer: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
};

type MediaFile = {
  id: string;
  repair_ticket_id: string;
  file_url: string;
  file_type: string;
  description: string | null;
  is_before: boolean;
  created_at: string;
};

export default function RepairPhotosPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { supabase, session } = useSupabase();
  const [ticket, setTicket] = useState<RepairTicket | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'images' | 'videos'>('all');
  const [fullscreenMedia, setFullscreenMedia] = useState<MediaFile | null>(null);
  const [fullscreenIndex, setFullscreenIndex] = useState<number>(0);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  useEffect(() => {
    // Clean up preview URLs when component unmounts
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch repair ticket with customer
      // Try to determine if the ID is a UUID or a ticket number
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
      
      let query = supabase
        .from('repair_tickets')
        .select(`
          id,
          ticket_number,
          status,
          device_type,
          device_model,
          customer:customer_id(id, first_name, last_name)
        `);
        
      // Query by UUID or ticket number based on the format
      if (isUuid) {
        query = query.eq('id', params.id);
      } else {
        query = query.eq('ticket_number', params.id);
      }
      
      const { data: ticketData, error: ticketError } = await query.single();
      
      if (ticketError) {
        console.error('Error fetching ticket:', ticketError);
        toast.error('Failed to load ticket data');
        return; // Exit early if ticket data can't be loaded
      }
      
      // Use unknown as intermediate type to avoid type error
      setTicket(ticketData as unknown as RepairTicket);
      
      // Fetch media files if we have the ticket data
      if (ticketData && ticketData.id) {
        try {
          const { data: mediaData, error: mediaError } = await supabase
            .from('repair_media')
            .select('*')
            .eq('repair_ticket_id', ticketData.id)
            .order('created_at', { ascending: false });
          
          if (mediaError) {
            console.error('Error fetching media:', mediaError);
            toast.error('Failed to load media files, but ticket data is available');
          } else {
            setMediaFiles(mediaData as MediaFile[] || []);
          }
        } catch (mediaError) {
          console.error('Exception fetching media:', mediaError);
          toast.error('Error loading media files');
          // Continue execution - we still have ticket data
        }
      } else {
        console.error('Ticket data missing ID');
        toast.error('Ticket data is incomplete');
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load media data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newFiles = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...newFiles]);
    
    // Generate preview URLs
    const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const removeSelectedFile = (index: number) => {
    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(previewUrls[index]);
    
    // Remove the file and its preview
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;
    
    // Check if ticket data is available
    if (!ticket || !ticket.id) {
      toast.error('Ticket information not available. Please refresh the page.');
      return;
    }
    
    try {
      setUploading(true);
      toast.loading(`Uploading ${selectedFiles.length} files...`);
      
      // Ensure the bucket exists before uploading
      try {
        const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('repair_media');
        
        if (bucketError) {
          console.log('Bucket not found, attempting to create it...');
          const { error: createError } = await supabase.storage.createBucket('repair_media', {
            public: true,
            fileSizeLimit: 10485760, // 10MB
          });
          
          if (createError) {
            throw createError;
          }
        }
      } catch (bucketError) {
        console.error('Error checking/creating bucket:', bucketError);
        throw new Error('Failed to initialize storage bucket');
      }
      
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `repair/${ticket.id}/${fileName}`;
        
        // Upload file to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('repair_media')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('repair_media')
          .getPublicUrl(filePath);
        
        // Determine file type (image or video)
        const fileType = file.type.startsWith('image/') ? 'image' : 
                        file.type.startsWith('video/') ? 'video' : 'other';
        
        // Add record to repair_media table
        const { error: dbError } = await supabase
          .from('repair_media')
          .insert({
            repair_ticket_id: ticket.id,
            file_url: publicUrlData.publicUrl,
            file_type: fileType,
            description: file.name,
            is_before: true, // Default to before repair
          });
        
        if (dbError) throw dbError;
      }
      
      // Clear selected files and preview URLs
      setSelectedFiles([]);
      setPreviewUrls(prev => {
        prev.forEach(url => URL.revokeObjectURL(url));
        return [];
      });
      
      // Refresh media files
      fetchData();
      
      toast.dismiss();
      toast.success('Files uploaded successfully');
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.dismiss();
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const deleteMedia = async (mediaFile: MediaFile) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      toast.loading('Deleting file...');
      
      // Extract file path from URL
      const fileUrl = mediaFile.file_url;
      const filePath = fileUrl.split('/').slice(-2).join('/');
      
      // Remove file from Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('repair_media')
        .remove([filePath]);
      
      if (storageError) throw storageError;
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('repair_media')
        .delete()
        .eq('id', mediaFile.id);
      
      if (dbError) throw dbError;
      
      // Update local state
      setMediaFiles(prev => prev.filter(file => file.id !== mediaFile.id));
      
      // Close fullscreen view if the deleted file was being viewed
      if (fullscreenMedia && fullscreenMedia.id === mediaFile.id) {
        setFullscreenMedia(null);
      }
      
      toast.dismiss();
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.dismiss();
      toast.error('Failed to delete file');
    }
  };

  const openFullscreen = (media: MediaFile, index: number) => {
    setFullscreenMedia(media);
    setFullscreenIndex(index);
  };

  const closeFullscreen = () => {
    setFullscreenMedia(null);
  };

  const navigateFullscreen = (direction: 'prev' | 'next') => {
    const filteredMedia = getFilteredMedia();
    let newIndex = fullscreenIndex;
    
    if (direction === 'prev') {
      newIndex = (newIndex - 1 + filteredMedia.length) % filteredMedia.length;
    } else {
      newIndex = (newIndex + 1) % filteredMedia.length;
    }
    
    setFullscreenMedia(filteredMedia[newIndex]);
    setFullscreenIndex(newIndex);
  };

  const downloadMedia = (media: MediaFile) => {
    const link = document.createElement('a');
    link.href = media.file_url;
    link.download = media.description || 'file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFilteredMedia = () => {
    if (filter === 'all') return mediaFiles;
    if (filter === 'images') return mediaFiles.filter(m => m.file_type === 'image');
    if (filter === 'videos') return mediaFiles.filter(m => m.file_type === 'video');
    return mediaFiles;
  };

  // No longer needed as we don't store file size
  // const formatFileSize = (bytes: number) => {
  //   if (bytes < 1024) return bytes + ' B';
  //   if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  //   return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  // };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          <h3 className="text-lg font-medium">Ticket not found</h3>
          <p className="mt-2">Unable to load the repair ticket information.</p>
          <Link href="/dashboard/repair" className="btn-outline mt-4">
            Back to Repair List
          </Link>
        </div>
      </div>
    );
  }

  const filteredMedia = getFilteredMedia();

  return (
    <div className="p-6">
      {/* Fullscreen Media Viewer */}
      {fullscreenMedia && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
          <div className="flex justify-between items-center p-4 text-white">
            <h3 className="text-lg font-medium">{fullscreenMedia.description || 'File'}</h3>
            <div className="flex space-x-4">
              <button 
                onClick={() => downloadMedia(fullscreenMedia)}
                className="p-2 hover:bg-gray-800 rounded-full"
              >
                <DownloadIcon className="h-6 w-6" />
              </button>
              <button 
                onClick={() => deleteMedia(fullscreenMedia)}
                className="p-2 hover:bg-gray-800 rounded-full text-red-400 hover:text-red-500"
              >
                <TrashIcon className="h-6 w-6" />
              </button>
              <button 
                onClick={closeFullscreen}
                className="p-2 hover:bg-gray-800 rounded-full"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center relative">
            <button 
              onClick={() => navigateFullscreen('prev')}
              className="absolute left-4 bg-black bg-opacity-50 p-2 rounded-full text-white hover:bg-opacity-70"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            
            {fullscreenMedia.file_type === 'image' ? (
              <img 
                src={fullscreenMedia.file_url} 
                alt={fullscreenMedia.description || 'Image'}
                className="max-h-full max-w-full object-contain"
              />
            ) : fullscreenMedia.file_type === 'video' ? (
              <video 
                src={fullscreenMedia.file_url} 
                controls 
                className="max-h-full max-w-full"
              />
            ) : (
              <div className="text-white">Unsupported file type</div>
            )}
            
            <button 
              onClick={() => navigateFullscreen('next')}
              className="absolute right-4 bg-black bg-opacity-50 p-2 rounded-full text-white hover:bg-opacity-70"
            >
              <ArrowLeftIcon className="h-6 w-6 transform rotate-180" />
            </button>
          </div>
          <div className="p-4 text-white text-sm">
            <p>Uploaded: {formatDate(fullscreenMedia.created_at)}</p>
            <p>Type: {fullscreenMedia.is_before ? 'Before Repair' : 'After Repair'}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href={`/dashboard/repair/${ticket.id}`} className="mr-4">
            <ArrowLeftIcon className="h-6 w-6 text-gray-500 hover:text-gray-700" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Photos & Videos
            </h1>
            <p className="text-gray-500">
              {ticket.ticket_number} - {ticket.customer?.first_name} {ticket.customer?.last_name}'s {ticket.device_type}
            </p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <h2 className="text-lg font-medium mb-4">Upload Media Files</h2>
        
        <div className="mb-4">
          <label className="btn-outline inline-flex items-center cursor-pointer">
            <UploadIcon className="mr-2" />
            Select Files
            <input 
              type="file" 
              className="hidden" 
              multiple 
              accept="image/*,video/*" 
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        </div>
        
        {selectedFiles.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Selected Files ({selectedFiles.length})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  {selectedFiles[index].type.startsWith('image/') ? (
                    <img 
                      src={url} 
                      alt={`Preview ${index}`}
                      className="h-24 w-full object-cover rounded border border-gray-200"
                    />
                  ) : (
                    <div className="h-24 w-full flex items-center justify-center bg-gray-100 rounded border border-gray-200">
                      <VideoIcon className="h-8 w-8 text-gray-400" />
                      <span className="text-xs text-gray-500 mt-1">Video</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeSelectedFile(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                  <div className="text-xs truncate mt-1">{selectedFiles[index].name}</div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="btn-primary"
                onClick={uploadFiles}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload All Files'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Media Gallery */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium">
            Media Gallery ({filteredMedia.length} files)
          </h2>
          <div className="flex space-x-2">
            <button
              type="button"
              className={`px-3 py-1 rounded-full text-sm ${filter === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded-full text-sm ${filter === 'images' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              onClick={() => setFilter('images')}
            >
              Images
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded-full text-sm ${filter === 'videos' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              onClick={() => setFilter('videos')}
            >
              Videos
            </button>
          </div>
        </div>

        {filteredMedia.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No media files found</p>
            <p className="text-sm mt-1">Upload some files to see them here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredMedia.map((media, index) => (
              <div key={media.id} className="group relative">
                <div 
                  className="aspect-w-16 aspect-h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 cursor-pointer"
                  onClick={() => openFullscreen(media, index)}
                >
                  {media.file_type === 'image' ? (
                    <img 
                      src={media.file_url} 
                      alt={media.description || 'Image'}
                      className="object-cover w-full h-full"
                    />
                  ) : media.file_type === 'video' ? (
                    <div className="relative w-full h-full">
                      <video 
                        src={media.file_url} 
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black bg-opacity-50 rounded-full p-3">
                          <VideoIcon className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-gray-400">Unsupported file</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-2">
                  <div className="text-sm font-medium truncate">{media.description || 'File'}</div>
                  <div className="text-xs text-gray-500 flex justify-between">
                    <span>{formatDate(media.created_at)}</span>
                    <span>{media.is_before ? 'Before Repair' : 'After Repair'}</span>
                  </div>
                </div>
                
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openFullscreen(media, index);
                    }}
                    className="bg-black bg-opacity-50 text-white p-1.5 rounded-full hover:bg-opacity-70"
                  >
                    <Maximize2Icon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadMedia(media);
                    }}
                    className="bg-black bg-opacity-50 text-white p-1.5 rounded-full hover:bg-opacity-70"
                  >
                    <DownloadIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMedia(media);
                    }}
                    className="bg-black bg-opacity-50 text-red-400 p-1.5 rounded-full hover:bg-opacity-70 hover:text-red-500"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}