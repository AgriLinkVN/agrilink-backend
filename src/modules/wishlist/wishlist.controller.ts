import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Wishlist')
@ApiBearerAuth('access-token')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get the authenticated user\'s wishlist' })
  @ApiResponse({ status: 200, description: 'Array of wishlisted products' })
  getWishlist(@CurrentUser('sub') userId: string) {
    return this.wishlistService.getWishlist(userId);
  }

  @Post(':productId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a product to the wishlist' })
  @ApiResponse({ status: 201, description: 'Product added to wishlist' })
  addToWishlist(
    @CurrentUser('sub') userId: string,
    @Param('productId', ParseUuidPipe) productId: string,
  ) {
    return this.wishlistService.addToWishlist(userId, productId);
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a product from the wishlist' })
  @ApiResponse({ status: 204, description: 'Product removed from wishlist' })
  removeFromWishlist(
    @CurrentUser('sub') userId: string,
    @Param('productId', ParseUuidPipe) productId: string,
  ) {
    return this.wishlistService.removeFromWishlist(userId, productId);
  }
}
