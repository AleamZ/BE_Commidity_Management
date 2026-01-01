import { Injectable } from '@nestjs/common';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import { File } from 'multer';

@Injectable()
export class UploadService {
  async uploadImage(file: File): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'commidity_uploads' },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          if (!result) {
            return reject(new Error('Upload failed: No result returned.'));
          }
          resolve(result);
        },
      );
      uploadStream.end(file.buffer);
    });
  }
  async uploadMultipleImages(files: File[]): Promise<UploadApiResponse[]> {
    const uploads = files.map((file) => this.uploadImage(file));
    return Promise.all(uploads);
  }
}
