import { DataSource } from 'typeorm';
import { Product } from '../../../domain/entities/product.entity';
import { ProductImage } from '../../../domain/entities/product-image.entity';
import { ProductCategory } from '../../../domain/entities/product-category.entity';
import { Province } from '../../../../geography/entities/province.entity';
import {
  FarmingType,
  ProductStatus,
  ProductUnit,
  SellerType,
} from '../../../../../common/enums';
import type { SeededSellers } from '../../../../users/seeds/seller.seed';

interface SeedSpec {
  name: string;
  description: string;
  categorySlug: string;
  provinceName: string;
  pricePerUnit: number;
  unit: ProductUnit;
  farmingType: FarmingType;
  seller: keyof SeededSellers;
  imageUrl: string;
}

const SPECS: SeedSpec[] = [
  // Trái cây
  { name: 'Xoài cát Hòa Lộc', description: 'Xoài cát Hòa Lộc đặc sản, ngọt thanh.', categorySlug: 'trai-cay-nhiet-doi', provinceName: 'Tiền Giang', pricePerUnit: 45000, unit: ProductUnit.kg, farmingType: FarmingType.vietgap, seller: 'cooperative', imageUrl: 'https://images.unsplash.com/photo-1605027990121-3b2c6940a0bf?w=600' },
  { name: 'Sầu riêng Ri6', description: 'Sầu riêng Ri6 cơm vàng hạt lép.', categorySlug: 'bo-sau-rieng', provinceName: 'Tiền Giang', pricePerUnit: 85000, unit: ProductUnit.kg, farmingType: FarmingType.vietgap, seller: 'cooperative', imageUrl: 'https://images.unsplash.com/photo-1623691879411-c4a4d0bc3a6e?w=600' },
  { name: 'Bưởi da xanh', description: 'Bưởi da xanh ruột hồng, không hạt.', categorySlug: 'trai-cay-co-mui', provinceName: 'Bến Tre', pricePerUnit: 32000, unit: ProductUnit.kg, farmingType: FarmingType.vietgap, seller: 'farmer', imageUrl: 'https://images.unsplash.com/photo-1576181256399-834e3b3a49bf?w=600' },
  { name: 'Thanh long ruột đỏ', description: 'Thanh long ruột đỏ xuất khẩu.', categorySlug: 'trai-cay-nhiet-doi', provinceName: 'Bình Thuận', pricePerUnit: 35000, unit: ProductUnit.kg, farmingType: FarmingType.globalgap, seller: 'cooperative', imageUrl: 'https://images.unsplash.com/photo-1527325678286-6dade1d6c4ce?w=600' },
  { name: 'Dưa hấu không hạt', description: 'Dưa hấu ngọt, vỏ mỏng.', categorySlug: 'bau-bi-dua-leo', provinceName: 'Long An', pricePerUnit: 18000, unit: ProductUnit.kg, farmingType: FarmingType.traditional, seller: 'farmer', imageUrl: 'https://images.unsplash.com/photo-1571575173700-afb9492e6a50?w=600' },

  // Rau củ
  { name: 'Rau muống hữu cơ', description: 'Rau muống canh tác hữu cơ, không thuốc.', categorySlug: 'rau-an-la', provinceName: 'Lâm Đồng', pricePerUnit: 25000, unit: ProductUnit.kg, farmingType: FarmingType.organic, seller: 'farmer', imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600' },
  { name: 'Cà rốt Đà Lạt', description: 'Cà rốt Đà Lạt ngọt, giòn.', categorySlug: 'cu-re', provinceName: 'Lâm Đồng', pricePerUnit: 22000, unit: ProductUnit.kg, farmingType: FarmingType.vietgap, seller: 'farmer', imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600' },
  { name: 'Nấm bào ngư xám', description: 'Nấm bào ngư tươi trồng phòng lạnh.', categorySlug: 'nam-cac-loai', provinceName: 'Đà Nẵng', pricePerUnit: 60000, unit: ProductUnit.kg, farmingType: FarmingType.organic, seller: 'cooperative', imageUrl: 'https://images.unsplash.com/photo-1607165249-15a8a9f70efa?w=600' },

  // Lúa gạo
  { name: 'Gạo ST25 đặc sản', description: 'Gạo ST25 — gạo ngon nhất thế giới.', categorySlug: 'gao-cac-loai', provinceName: 'Sóc Trăng', pricePerUnit: 28000, unit: ProductUnit.kg, farmingType: FarmingType.vietgap, seller: 'cooperative', imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600' },
  { name: 'Gạo Jasmine thơm', description: 'Gạo Jasmine thơm dẻo.', categorySlug: 'gao-cac-loai', provinceName: 'Cần Thơ', pricePerUnit: 24000, unit: ProductUnit.kg, farmingType: FarmingType.traditional, seller: 'farmer', imageUrl: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=600' },

  // Cà phê & chè
  { name: 'Cà phê Arabica Cầu Đất', description: 'Arabica trồng tại Cầu Đất 1500m.', categorySlug: 'ca-phe-nhan-rang', provinceName: 'Lâm Đồng', pricePerUnit: 120000, unit: ProductUnit.kg, farmingType: FarmingType.organic, seller: 'farmer', imageUrl: 'https://images.unsplash.com/photo-1442550528053-c431ecb55509?w=600' },
  { name: 'Cà phê Robusta Buôn Ma Thuột', description: 'Robusta đậm vị, hậu đắng dịu.', categorySlug: 'ca-phe-nhan-rang', provinceName: 'Đắk Lắk', pricePerUnit: 95000, unit: ProductUnit.kg, farmingType: FarmingType.vietgap, seller: 'supplier', imageUrl: 'https://images.unsplash.com/photo-1559525839-d9acfd564ca0?w=600' },

  // Gia vị
  { name: 'Tiêu đen Phú Quốc', description: 'Tiêu đen Phú Quốc đặc sản.', categorySlug: 'tieu-ot', provinceName: 'Đắk Lắk', pricePerUnit: 180000, unit: ProductUnit.kg, farmingType: FarmingType.globalgap, seller: 'supplier', imageUrl: 'https://images.unsplash.com/photo-1599582907898-5cdb44389b66?w=600' },
  { name: 'Nghệ tươi vàng', description: 'Nghệ tươi vàng nguyên củ.', categorySlug: 'gung-nghe-toi', provinceName: 'Hà Nội', pricePerUnit: 30000, unit: ProductUnit.kg, farmingType: FarmingType.organic, seller: 'farmer', imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=600' },

  // Hạt
  { name: 'Hạt điều rang muối', description: 'Hạt điều rang muối Bình Phước.', categorySlug: 'hat-dieu-mac-ca', provinceName: 'Đắk Lắk', pricePerUnit: 220000, unit: ProductUnit.kg, farmingType: FarmingType.vietgap, seller: 'supplier', imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600' },
  { name: 'Đậu phộng rang', description: 'Đậu phộng rang giòn truyền thống.', categorySlug: 'dau-phong-me', provinceName: 'Long An', pricePerUnit: 55000, unit: ProductUnit.kg, farmingType: FarmingType.traditional, seller: 'farmer', imageUrl: 'https://images.unsplash.com/photo-1567132875421-e84e6c8c0d56?w=600' },
];

export async function seedProducts(
  dataSource: DataSource,
  sellers: SeededSellers,
): Promise<void> {
  const productRepo = dataSource.getRepository(Product);
  const imageRepo = dataSource.getRepository(ProductImage);
  const categoryRepo = dataSource.getRepository(ProductCategory);
  const provinceRepo = dataSource.getRepository(Province);

  const count = await productRepo.count();
  if (count > 0) {
    console.log('✅ Products đã được seed trước đó — bỏ qua');
    return;
  }

  const categories = await categoryRepo.find();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const provinces = await provinceRepo.find();
  const provinceByName = new Map(provinces.map((p) => [p.name, p]));

  const SELLER_TYPE: Record<keyof SeededSellers, SellerType> = {
    farmer: SellerType.farmer,
    cooperative: SellerType.cooperative,
    supplier: SellerType.supplier,
  };

  for (const spec of SPECS) {
    const category = categoryBySlug.get(spec.categorySlug);
    const province = provinceByName.get(spec.provinceName);
    if (!category || !province) {
      console.warn(`⚠️  Bỏ qua "${spec.name}" — thiếu category/province`);
      continue;
    }
    const seller = sellers[spec.seller];

    const product = await productRepo.save({
      sellerId: seller.id,
      sellerType: SELLER_TYPE[spec.seller],
      name: spec.name,
      description: spec.description,
      categoryId: category.id,
      pricePerUnit: spec.pricePerUnit,
      unit: spec.unit,
      availableQuantity: 500,
      status: ProductStatus.active,
      farmingType: spec.farmingType,
      provinceId: province.id,
    });

    await imageRepo.save({
      productId: product.id,
      imageUrl: spec.imageUrl,
      isPrimary: true,
      sortOrder: 0,
    });
  }

  console.log(`✅ Seed ${SPECS.length} sản phẩm thành công`);
}
