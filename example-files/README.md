# Example File Structure

This directory can be used as an example for testing the Personal Cloud Storage system.

## Setup

1. Copy this directory structure to a location accessible by the backend
2. Update `ROOT_DIRECTORY` in `backend/.env` to point to this location
3. Start the backend and frontend
4. Login and browse these example files

## Sample Files

You can add your own files to test:
- Audio files: MP3, WAV, FLAC, OGG
- Video files: MP4, MKV, AVI, MOV
- Documents: PDF, DOCX, TXT
- Images: JPG, PNG, GIF, SVG

The system will automatically detect file types and provide appropriate actions:
- Media files: Open in player
- Other files: Download
- Folders: Navigate inside

## Creating Test Content

```bash
# Create some test directories
mkdir -p example-files/Music
mkdir -p example-files/Videos
mkdir -p example-files/Documents
mkdir -p example-files/Photos

# Add some sample text files for testing
echo "This is a test document" > example-files/Documents/test.txt
echo "Sample readme file" > example-files/README.md

# Copy your own media files
cp ~/Music/*.mp3 example-files/Music/
cp ~/Videos/*.mp4 example-files/Videos/
cp ~/Documents/*.pdf example-files/Documents/
cp ~/Pictures/*.jpg example-files/Photos/
```

## File Organization Tips

- Use folders to organize by category (Music, Videos, Documents, etc.)
- Use subfolders for more granular organization
- Name files clearly for easy searching
- Keep reasonable file sizes for smooth streaming

## Testing Features

Once you have files in place, test:

1. **Navigation**: Click through folders
2. **Search**: Search for file names
3. **Sorting**: Try different sort options
4. **Audio Playback**: Click on audio files
5. **Video Playback**: Click on video files
6. **Downloads**: Download documents
7. **Breadcrumb**: Navigate using breadcrumb trail
8. **Mobile**: Test on mobile device
