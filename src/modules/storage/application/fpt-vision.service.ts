import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class FptVisionService {
  private readonly logger = new Logger(FptVisionService.name);
  private readonly apiKey: string;
  private readonly idrUrl = 'https://api.fpt.ai/vision/idr/vnm';
  private readonly brcUrl = 'https://api.fpt.ai/vision/brc/vnm';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('FPT_AI_VISION_KEY');
  }

  /**
   * Verify CCCD (Vietnamese ID card) using FPT AI Vision
   * @param imageUrl The publicly accessible URL of the uploaded image
   */
  async verifyCccd(imageUrl: string): Promise<any> {
    if (!this.apiKey) {
      this.logger.error('FPT_AI_VISION_KEY is not configured');
      // If FPT AI is not configured, we just return empty data or throw error.
      // We throw error here to force configuration in production
      throw new HttpException('Hệ thống chưa cấu hình FPT AI', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const formData = new FormData();
      formData.append('image_url', imageUrl); // FPT AI IDR supports image_url or image file

      this.logger.debug('Sending CCCD image to FPT AI');

      const response = await axios.post(this.idrUrl, formData, {
        headers: {
          'api-key': this.apiKey,
          ...formData.getHeaders(),
        },
      });

      const data = response.data;
      if (data && data.errorCode === 0 && data.data && data.data.length > 0) {
        // Successful OCR
        const result = data.data[0];
        return {
          id: result.id,
          name: result.name,
          dob: result.dob,
          sex: result.sex,
          nationality: result.nationality,
          home: result.home,
          address: result.address,
          type: result.type,
          type_new: result.type_new,
        };
      } else {
        this.logger.warn('FPT AI returned an unsuccessful response');
        throw new HttpException(
          `Không thể đọc thông tin CCCD: ${data.errorMessage || 'Vui lòng cung cấp ảnh rõ nét hơn'}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error: any) {
      this.logger.error('Error calling FPT AI Vision');
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Lỗi hệ thống khi phân tích CCCD',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Verify BOTH sides of CCCD using FPT AI Vision
   */
  async verifyCccdFull(frontUrl: string, backUrl: string): Promise<any> {
    if (!this.apiKey) {
      this.logger.error('FPT_AI_VISION_KEY is not configured');
      throw new HttpException('Hệ thống chưa cấu hình FPT AI', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      this.logger.debug('[CCCD FULL] Starting front-side verification');
      // Lấy dữ liệu mặt trước
      const frontData = new FormData();
      frontData.append('image_url', frontUrl);
      const frontResponse = await axios.post(this.idrUrl, frontData, {
        headers: { 'api-key': this.apiKey, ...frontData.getHeaders() },
      });

      if (frontResponse.data?.errorCode !== 0 || !frontResponse.data?.data?.[0]) {
        this.logger.warn('FPT AI returned an unsuccessful front-side OCR response');
        throw new HttpException(
          `Lỗi đọc Mặt trước CCCD: ${frontResponse.data?.errorMessage || 'Ảnh mờ hoặc không hợp lệ'}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      const frontResult = frontResponse.data.data[0];

      this.logger.debug('[CCCD FULL] Starting back-side verification');
      // Lấy dữ liệu mặt sau
      const backData = new FormData();
      backData.append('image_url', backUrl);
      const backResponse = await axios.post(this.idrUrl, backData, {
        headers: { 'api-key': this.apiKey, ...backData.getHeaders() },
      });

      if (backResponse.data?.errorCode !== 0 || !backResponse.data?.data?.[0]) {
        this.logger.warn('FPT AI returned an unsuccessful back-side OCR response');
        throw new HttpException(
          `Lỗi đọc Mặt sau CCCD: ${backResponse.data?.errorMessage || 'Ảnh mờ hoặc không hợp lệ'}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      const backResult = backResponse.data.data[0];

      // Hợp nhất dữ liệu
      // Mặt trước thường có: id, name, dob, sex, nationality, home, address, type, type_new
      // Mặt sau thường có: issue_date, issue_loc
      return {
        id: frontResult.id || backResult.id,
        name: frontResult.name || backResult.name,
        dob: frontResult.dob || backResult.dob,
        sex: frontResult.sex || backResult.sex,
        nationality: frontResult.nationality || backResult.nationality,
        home: frontResult.home || backResult.home,
        address: frontResult.address || backResult.address,
        issue_date: backResult.issue_date || frontResult.issue_date,
        issue_loc: backResult.issue_loc || frontResult.issue_loc,
      };
    } catch (error: any) {
      this.logger.error('Error in verifyCccdFull');
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Lỗi hệ thống khi phân tích 2 mặt CCCD',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Verify Business Registration Certificate (Giấy phép ĐKKD) using FPT AI Vision
   * @param imageUrl The publicly accessible URL of the uploaded image
   */
  async verifyBrc(imageUrl: string): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException('Hệ thống chưa cấu hình FPT AI', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const formData = new FormData();
      formData.append('image_url', imageUrl); 

      this.logger.debug('Sending BRC image to FPT AI');

      const response = await axios.post(this.brcUrl, formData, {
        headers: {
          'api-key': this.apiKey,
          ...formData.getHeaders(),
        },
      });

      const data = response.data;
      if (data && data.errorCode === 0 && data.data && data.data.length > 0) {
        // Successful OCR
        const result = data.data[0];
        return {
          id: result.id, // Mã số doanh nghiệp
          name: result.name, // Tên doanh nghiệp
          address: result.address, // Địa chỉ trụ sở chính
          representative: result.representative, // Người đại diện
          capital: result.capital, // Vốn điều lệ
        };
      } else {
        this.logger.warn('FPT AI returned an unsuccessful response');
        throw new HttpException(
          `Không thể đọc thông tin Giấy phép: ${data.errorMessage || 'Vui lòng cung cấp ảnh rõ nét hơn'}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error: any) {
      this.logger.error('Error calling FPT AI Vision BRC');
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Lỗi hệ thống khi phân tích Giấy phép kinh doanh',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
