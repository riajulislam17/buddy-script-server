import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import { ConfigService } from '@nestjs/config';

interface ImgBBUploadResponse {
  data?: {
    url?: string;
  };
}

@Injectable()
export class UploadsService {
  constructor(private readonly configService: ConfigService) {}

  async uploadImageToImgBB(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const apiKey = this.configService.get<string>('IMGBB_API_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException('ImgBB API key is missing');
    }

    try {
      const formData = new FormData();
      formData.append('image', file.buffer.toString('base64'));

      const response = await axios.post<ImgBBUploadResponse>(
        `https://api.imgbb.com/1/upload?key=${apiKey}`,
        formData,
        {
          headers: formData.getHeaders(),
        },
      );

      const imageUrl = response.data?.data?.url;

      if (!imageUrl) {
        throw new InternalServerErrorException(
          'Failed to upload image to ImgBB',
        );
      }

      return imageUrl;
    } catch {
      throw new InternalServerErrorException('Image upload failed');
    }
  }
}
