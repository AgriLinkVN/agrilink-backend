import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductsService } from '../../application/products.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ParseUuidPipe } from '@common/pipes/parse-uuid.pipe';
import { WishlistQueryDto } from '../schemas/wishlist-query.dto';
import { WishlistQueryInput } from '../../application/models/product-input.model';
import { mapProductApplicationError } from '../mappers/product-error.mapper';

@ApiTags('wishlist')
@ApiBearerAuth('access-token')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly productsService: ProductsService) {}

  private async execute<T>(operation: () => Promise<T> | T): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      return mapProductApplicationError(error);
    }
  }

  @Post(':productId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Thêm sản phẩm vào danh sách yêu thích' })
  @ApiParam({ name: 'productId', description: 'ID của sản phẩm', type: 'string' })
  @ApiResponse({ status: 201, description: 'Đã thêm thành công' })
  @ApiResponse({ status: 404, description: 'Sản phẩm không tồn tại hoặc không hoạt động' })
  addToWishlist(
    @CurrentUser('sub') userId: string,
    @Param('productId', ParseUuidPipe) productId: string,
  ) {
    return this.execute(() => this.productsService.addToWishlist(userId, productId));
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa sản phẩm khỏi danh sách yêu thích' })
  @ApiParam({ name: 'productId', description: 'ID của sản phẩm', type: 'string' })
  @ApiResponse({ status: 204, description: 'Đã xóa thành công (idempotent)' })
  removeFromWishlist(
    @CurrentUser('sub') userId: string,
    @Param('productId', ParseUuidPipe) productId: string,
  ) {
    return this.execute(() =>
      this.productsService.removeFromWishlist(userId, productId),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách yêu thích đã phân trang của người dùng hiện tại' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách sản phẩm yêu thích kèm thông tin phân trang' })
  getWishlist(
    @CurrentUser('sub') userId: string,
    @Query() query: WishlistQueryDto,
  ) {
    const input: WishlistQueryInput = query;
    return this.productsService.getWishlist(userId, input);
  }

  @Get('ids')
  @ApiOperation({ summary: 'Lấy danh sách IDs của các sản phẩm đã yêu thích' })
  @ApiResponse({ status: 200, description: 'Mảng string chứa IDs của các sản phẩm' })
  getWishlistedIds(@CurrentUser('sub') userId: string) {
    return this.productsService.getWishlistedIds(userId);
  }
}
