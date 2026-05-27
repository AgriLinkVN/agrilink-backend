import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductWishlist } from './entities/product-wishlist.entity';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(ProductWishlist)
    private readonly wishlistRepo: Repository<ProductWishlist>,
  ) {}

  async getWishlist(userId: string): Promise<ProductWishlist[]> {
    throw new Error('TODO: implement WishlistService.getWishlist()');
  }

  async addToWishlist(userId: string, productId: string): Promise<ProductWishlist> {
    throw new Error('TODO: implement WishlistService.addToWishlist()');
  }

  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    throw new Error('TODO: implement WishlistService.removeFromWishlist()');
  }
}
