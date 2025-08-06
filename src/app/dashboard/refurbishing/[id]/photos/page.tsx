'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/supabase-provider';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

// Icons
import { 
  ArrowLeftIcon,
  DownloadIcon,
  CameraIcon,
  UploadIcon,
  XIcon,
  Maximize2Icon,
  Minimize2Icon
} from '@/components/icons';

type RefurbishingTicket = {
  id: string;
  ticket_number: string;
  device_type: string;
  device_model: string;
};

type Media = {
  id: string;
  file_url: string;
  file_type: string;
  description: string | null;
  is_before: boolean;
  created_at: string;
};

export default function RefurbishingPhotos({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [ticket, setTicket] = useState<RefurbishingTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<Media[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const [isBeforeUpload, setIsBeforeUpload] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'fullscreen'>('grid');
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'before' | 'after'>('all');

  useEffect(() => {
    fetchTicketDetails();
  }, [params.id]);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch ticket basic details
      const { data: ticketData, error: ticketError } = await supabase
        .from('refurbishing_tickets')
        .select('id, ticket_number, device_type, device_model')
        .eq('id', params.id)
        .single();
      
      if (ticketError) throw ticketError;
      
      setTicket(ticketData);
      
      // Fetch media
      const { data: mediaData, error: mediaError } = await supabase
        .from('refurbishing_media')
        .select('*')
        .eq('refurbishing_ticket_id', params.id)
        .order('created_at', { ascending: false });
      
      if (mediaError) throw mediaError;
      setMedia(mediaData || []);
      
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      toast.error('Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...filesArray]);
      
      // Create preview URLs for the files
      const newPreviewUrls = filesArray.map(file => URL.createObjectURL(file));
      setFilePreviewUrls(prev => [...prev, ...newPreviewUrls]);
    }
  };

  const removeFile = (index: number) => {
    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(filePreviewUrls[index]);
    
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadFiles = async () => {
    if (!ticket || uploadedFiles.length === 0) return;
    
    try {
      setUploading(true);
      
      for (const file of uploadedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `refurbishing/${ticket.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('refurbishing_media')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        // Get the public URL
        const { data: publicUrlData } = supabase.storage
          .from('refurbishing_media')
          .getPublicUrl(filePath);
        
        // Save the media reference
        const { error: mediaError } = await supabase
          .from('refurbishing_media')
          .insert({
            refurbishing_ticket_id: ticket.id,
            file_url: publicUrlData.publicUrl,
            file_type: file.type.startsWith('image/') ? 'image' : 'video',
            description: isBeforeUpload ? 'Before refurbishing' : 'After refurbishing',
            is_before: isBeforeUpload,
          });
        
        if (mediaError) throw mediaError;
      }
      
      // Clear the uploads
      setUploadedFiles([]);
      setFilePreviewUrls([]);
      
      toast.success('Files uploaded successfully');
      fetchTicketDetails(); // Refresh media
      
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleMediaClick = (index: number) => {
    setSelectedMediaIndex(index);
    setViewMode('fullscreen');
  };

  const handleCloseFullscreen = () => {
    setViewMode('grid');
    setSelectedMediaIndex(null);
  };

  const handleNextMedia = () => {
    if (selectedMediaIndex === null) return;
    
    const filteredMedia = filterMedia();
    const nextIndex = (selectedMediaIndex + 1) % filteredMedia.length;
    setSelectedMediaIndex(nextIndex);
  };

  const handlePrevMedia = () => {
    if (selectedMediaIndex === null) return;
    
    const filteredMedia = filterMedia();
    const prevIndex = (selectedMediaIndex - 1 + filteredMedia.length) % filteredMedia.length;
    setSelectedMediaIndex(prevIndex);
  };

  const filterMedia = (): Media[] => {
    if (filterMode === 'all') return media;
    if (filterMode === 'before') return media.filter(m => m.is_before);
    if (filterMode === 'after') return media.filter(m => !m.is_before);
    return media;
  };

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
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-w-1 aspect-h-1 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
          <p>Ticket not found or you don't have permission to view it.</p>
        </div>
        <Link href="/dashboard/refurbishing" className="btn-outline">
          <ArrowLeftIcon className="mr-2" /> Back to Refurbishing
        </Link>
      </div>
    );
  }

  const filteredMedia = filterMedia();

  return (
    <div className="p-6">
      {viewMode === 'grid' ? (
        <>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex items-center">
              <Link href={`/dashboard/refurbishing/${ticket.id}`} className="mr-4">
                <ArrowLeftIcon className="w-5 h-5 text-gray-500 hover:text-gray-700" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Photos & Videos for {ticket.ticket_number}
                </h1>
                <p className="text-gray-600 mt-1">
                  {ticket.device_type} - {ticket.device_model}
                </p>
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button 
                type="button"
                className="btn-outline flex items-center"
                onClick={() => document.getElementById('media-upload')?.click()}
              >
                <UploadIcon className="mr-2" /> Upload Media
              </button>
              <input 
                id="media-upload"
                type="file"
                className="hidden"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Filter Controls */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              className={`px-4 py-2 rounded-md ${filterMode === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
              onClick={() => setFilterMode('all')}
            >
              All Media ({media.length})
            </button>
            <button
              className={`px-4 py-2 rounded-md ${filterMode === 'before' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
              onClick={() => setFilterMode('before')}
            >
              Before ({media.filter(m => m.is_before).length})
            </button>
            <button
              className={`px-4 py-2 rounded-md ${filterMode === 'after' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
              onClick={() => setFilterMode('after')}
            >
              After ({media.filter(m => !m.is_before).length})
            </button>
          </div>

          {/* Upload Preview */}
          {uploadedFiles.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Files to Upload</h2>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="before-upload"
                        name="upload-type"
                        className="form-radio"
                        checked={isBeforeUpload}
                        onChange={() => setIsBeforeUpload(true)}
                      />
                      <label htmlFor="before-upload" className="ml-2 text-sm text-gray-700">
                        Before Refurbishing
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="after-upload"
                        name="upload-type"
                        className="form-radio"
                        checked={!isBeforeUpload}
                        onChange={() => setIsBeforeUpload(false)}
                      />
                      <label htmlFor="after-upload" className="ml-2 text-sm text-gray-700">
                        After Refurbishing
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
                  {filePreviewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-md bg-gray-200">
                        {uploadedFiles[index]?.type.startsWith('image/') ? (
                          <img 
                            src={url} 
                            alt={`Preview ${index}`} 
                            className="object-cover"
                          />
                        ) : (
                          <video 
                            src={url} 
                            className="object-cover w-full h-full"
                            controls
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeFile(index)}
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleUploadFiles}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <UploadIcon className="mr-2" />
                        Upload Files
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Media Gallery */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                {filterMode === 'all' ? 'All Media' : 
                 filterMode === 'before' ? 'Before Refurbishing' : 'After Refurbishing'}
              </h2>
            </div>
            
            <div className="p-6">
              {filteredMedia.length === 0 ? (
                <div className="text-center py-6">
                  <CameraIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    No media found for this filter
                  </p>
                  <button 
                    type="button"
                    className="mt-3 btn-outline"
                    onClick={() => document.getElementById('media-upload')?.click()}
                  >
                    <UploadIcon className="mr-2" /> Upload Media
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {filteredMedia.map((item, index) => (
                    <div key={item.id} className="relative group cursor-pointer" onClick={() => handleMediaClick(index)}>
                      <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-md bg-gray-200">
                        {item.file_type === 'image' ? (
                          <img 
                            src={item.file_url} 
                            alt={item.description || 'Media'} 
                            className="object-cover"
                          />
                        ) : (
                          <video 
                            src={item.file_url} 
                            className="object-cover w-full h-full"
                          />
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                        <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                          <Maximize2Icon className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                        <span className={`text-xs font-medium text-white px-2 py-0.5 rounded ${item.is_before ? 'bg-blue-600' : 'bg-green-600'}`}>
                          {item.is_before ? 'Before' : 'After'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        // Fullscreen View
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
          <div className="p-4 flex justify-between items-center">
            <h2 className="text-white text-xl font-medium">
              {selectedMediaIndex !== null && filteredMedia[selectedMediaIndex]?.is_before ? 'Before Refurbishing' : 'After Refurbishing'}
            </h2>
            <div className="flex space-x-4">
              <a 
                href={selectedMediaIndex !== null ? filteredMedia[selectedMediaIndex]?.file_url : '#'} 
                download
                className="text-white hover:text-blue-300"
              >
                <DownloadIcon className="w-6 h-6" />
              </a>
              <button 
                onClick={handleCloseFullscreen}
                className="text-white hover:text-blue-300"
              >
                <Minimize2Icon className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex items-center justify-center relative">
            {/* Left Arrow */}
            <button 
              className="absolute left-4 bg-black bg-opacity-50 rounded-full p-2 text-white hover:bg-opacity-70"
              onClick={handlePrevMedia}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {/* Media */}
            <div className="max-h-full max-w-full p-4">
              {selectedMediaIndex !== null && (
                filteredMedia[selectedMediaIndex]?.file_type === 'image' ? (
                  <img 
                    src={filteredMedia[selectedMediaIndex]?.file_url} 
                    alt={filteredMedia[selectedMediaIndex]?.description || 'Media'} 
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <video 
                    src={filteredMedia[selectedMediaIndex]?.file_url} 
                    className="max-h-full max-w-full"
                    controls
                    autoPlay
                  />
                )
              )}
            </div>
            
            {/* Right Arrow */}
            <button 
              className="absolute right-4 bg-black bg-opacity-50 rounded-full p-2 text-white hover:bg-opacity-70"
              onClick={handleNextMedia}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          <div className="p-4">
            <p className="text-white text-sm">
              {selectedMediaIndex !== null && formatDate(filteredMedia[selectedMediaIndex]?.created_at)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}