'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/supabase-provider';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  ImageIcon, 
  UploadIcon, 
  XIcon, 
  Maximize2Icon,
  DownloadIcon,
  TrashIcon,
  FilterIcon
} from '@/components/icons';

type BuybackTicket = {
  id: string;
  ticket_number: string;
  device_type: string;
  device_model: string;
};

type Media = {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  public_url: string;
  media_type: string;
  created_at: string;
};

type UploadedFile = {
  file: File;
  preview: string;
  uploading: boolean;
  error: string | null;
  path?: string;
};

export default function BuybackPhotosPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { supabase, session } = useSupabase();
  const [ticket, setTicket] = useState<BuybackTicket | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [fullscreenMedia, setFullscreenMedia] = useState<Media | null>(null);
  const [mediaFilter, setMediaFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch buyback ticket basic info
      const { data: ticketData, error: ticketError } = await supabase
        .from('buyback_tickets')
        .select('id, ticket_number, device_type, device_model')
        .eq('id', params.id)
        .single();
      
      if (ticketError) throw ticketError;
      setTicket(ticketData as BuybackTicket);
      
      // Fetch all media
      const { data: mediaData, error: mediaError } = await supabase
        .from('buyback_media')
        .select('*')
        .eq('buyback_ticket_id', params.id)
        .order('created_at', { ascending: false });
      
      if (mediaError) throw mediaError;
      setMedia(mediaData as Media[] || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load media files');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Only accept images and videos
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error(`File ${file.name} is not an image or video`);
        continue;
      }
      
      newFiles.push({
        file,
        preview: URL.createObjectURL(file),
        uploading: false,
        error: null
      });
    }

    setUploadedFiles([...uploadedFiles, ...newFiles]);
    e.target.value = ''; // Reset input
  };

  const removeFile = (index: number) => {
    const newFiles = [...uploadedFiles];
    URL.revokeObjectURL(newFiles[index].preview);
    newFiles.splice(index, 1);
    setUploadedFiles(newFiles);
  };

  const uploadFiles = async () => {
    if (!ticket) return;
    
    const uploadPromises = uploadedFiles.map(async (uploadedFile, index) => {
      const newFiles = [...uploadedFiles];
      newFiles[index].uploading = true;
      setUploadedFiles(newFiles);

      try {
        const file = uploadedFile.file;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${index}.${fileExt}`;
        const filePath = `buyback/${ticket.id}/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('buyback_media')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('buyback_media')
          .getPublicUrl(filePath);

        // Insert into buyback_media table
        const { error: mediaError } = await supabase
          .from('buyback_media')
          .insert({
            buyback_ticket_id: ticket.id,
            file_type: file.type.startsWith('image/') ? 'image' : 'video',
            description: file.name,
            file_url: publicUrlData.publicUrl,
          });

        if (mediaError) throw mediaError;

        newFiles[index].uploading = false;
        newFiles[index].path = filePath;
        setUploadedFiles(newFiles);
        return { success: true, path: filePath };
      } catch (error) {
        console.error('Error uploading file:', error);
        newFiles[index].uploading = false;
        newFiles[index].error = 'Upload failed';
        setUploadedFiles(newFiles);
        return { success: false, error };
      }
    });

    await Promise.all(uploadPromises);
    setShowUploadForm(false);
    setUploadedFiles([]);
    fetchData(); // Refresh media list
  };

  const deleteMedia = async (mediaId: string, filePath: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      setLoading(true);
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('buyback_media')
        .remove([filePath]);
      
      if (storageError) throw storageError;
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('buyback_media')
        .delete()
        .eq('id', mediaId);
      
      if (dbError) throw dbError;
      
      toast.success('File deleted successfully');
      fetchData(); // Refresh media list
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    } finally {
      setLoading(false);
    }
  };

  const downloadMedia = (media: Media) => {
    const link = document.createElement('a');
    link.href = media.public_url;
    link.download = media.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  const filteredMedia = mediaFilter === 'all' 
    ? media 
    : media.filter(item => item.media_type === mediaFilter);

  if (loading && !ticket) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
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
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          <h3 className="text-lg font-medium">Buyback ticket not found</h3>
          <p className="mt-2">The buyback ticket you are looking for does not exist or has been deleted.</p>
          <Link href="/dashboard/buyback" className="btn-outline mt-4">
            Back to Buyback List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href={`/dashboard/buyback/${ticket.id}`} className="mr-4">
            <ArrowLeftIcon className="h-6 w-6 text-gray-500 hover:text-gray-700" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Photos & Videos - {ticket.device_type} {ticket.device_model}
          </h1>
        </div>
        <div className="flex space-x-2">
          <div className="relative">
            <button
              type="button"
              className="btn-outline flex items-center"
              onClick={() => setMediaFilter(mediaFilter === 'all' ? 'image' : mediaFilter === 'image' ? 'video' : 'all')}
            >
              <FilterIcon className="mr-2" />
              {mediaFilter === 'all' ? 'All Files' : mediaFilter === 'image' ? 'Images Only' : 'Videos Only'}
            </button>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowUploadForm(!showUploadForm)}
          >
            <UploadIcon className="mr-2" /> Upload Files
          </button>
        </div>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Upload Files</h2>
          </div>
          <div className="p-6">
            <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Drag and drop files here, or click to select files
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Upload photos and videos of the device from multiple angles
                </p>
                <button type="button" className="btn-outline mt-4">
                  Select Files
                </button>
              </label>
            </div>
            
            {uploadedFiles.length > 0 && (
              <div>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-md bg-gray-200">
                        {file.file.type.startsWith('image/') ? (
                          <img
                            src={file.preview}
                            alt="Preview"
                            className="object-cover"
                          />
                        ) : (
                          <video
                            src={file.preview}
                            className="object-cover"
                            controls
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeFile(index)}
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                      <p className="mt-1 text-xs truncate">{file.file.name}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => {
                      setUploadedFiles([]);
                      setShowUploadForm(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={uploadFiles}
                    disabled={uploadedFiles.length === 0}
                  >
                    Upload Files
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Media Gallery */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Media Files ({filteredMedia.length})
          </h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-w-1 aspect-h-1 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {mediaFilter === 'all' ? 'No media files found' : 
                 mediaFilter === 'image' ? 'No images found' : 'No videos found'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {mediaFilter !== 'all' ? 
                  `Try selecting "All Files" to see all media` : 
                  `Upload photos or videos of the device`}
              </p>
              {mediaFilter !== 'all' ? (
                <button 
                  type="button" 
                  className="btn-outline mt-4"
                  onClick={() => setMediaFilter('all')}
                >
                  Show All Files
                </button>
              ) : (
                <button 
                  type="button" 
                  className="btn-primary mt-4"
                  onClick={() => setShowUploadForm(true)}
                >
                  <UploadIcon className="mr-2" /> Upload Files
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {filteredMedia.map((item) => (
                <div key={item.id} className="relative group">
                  <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-md bg-gray-200">
                    {item.media_type === 'image' ? (
                      <img
                        src={item.public_url}
                        alt={item.file_name}
                        className="object-cover w-full h-full cursor-pointer"
                        onClick={() => setFullscreenMedia(item)}
                      />
                    ) : (
                      <video
                        src={item.public_url}
                        className="object-cover w-full h-full"
                        controls
                      />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex space-x-2">
                      {item.media_type === 'image' && (
                        <button
                          type="button"
                          className="p-2 bg-white rounded-full text-gray-800 hover:text-blue-600"
                          onClick={() => setFullscreenMedia(item)}
                        >
                          <Maximize2Icon className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="p-2 bg-white rounded-full text-gray-800 hover:text-green-600"
                        onClick={() => downloadMedia(item)}
                      >
                        <DownloadIcon className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        className="p-2 bg-white rounded-full text-gray-800 hover:text-red-600"
                        onClick={() => deleteMedia(item.id, item.file_path)}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-sm truncate">{item.file_name}</p>
                    <p className="text-xs text-gray-500">{formatDate(item.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Image Viewer */}
      {fullscreenMedia && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative w-full h-full flex items-center justify-center">
            <button
              type="button"
              className="absolute top-4 right-4 p-2 bg-white rounded-full text-gray-800 hover:text-red-600 z-10"
              onClick={() => setFullscreenMedia(null)}
            >
              <XIcon className="h-6 w-6" />
            </button>
            <div className="relative max-w-full max-h-full">
              <img
                src={fullscreenMedia.public_url}
                alt={fullscreenMedia.file_name}
                className="max-w-full max-h-[90vh] object-contain"
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                <button
                  type="button"
                  className="p-3 bg-white rounded-full text-gray-800 hover:text-green-600"
                  onClick={() => downloadMedia(fullscreenMedia)}
                >
                  <DownloadIcon className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  className="p-3 bg-white rounded-full text-gray-800 hover:text-red-600"
                  onClick={() => {
                    deleteMedia(fullscreenMedia.id, fullscreenMedia.file_path);
                    setFullscreenMedia(null);
                  }}
                >
                  <TrashIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}