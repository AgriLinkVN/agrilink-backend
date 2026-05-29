import { DataSource } from 'typeorm';
import { ProductCategory } from '../../../domain/entities/product-category.entity';

export async function seedProductCategories(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(ProductCategory);

    // Kiểm tra đã seed chưa
    const count = await repo.count();
    if (count > 0) {
        console.log('✅ Danh mục đã được seed trước đó — bỏ qua');
        return;
    }

    // ─── Cấp 1 — Danh mục gốc ────────────────────────────────────
    const roots = await repo.save([
        { name: 'Rau củ quả', slug: 'rau-cu-qua', sortOrder: 1 },
        { name: 'Trái cây', slug: 'trai-cay', sortOrder: 2 },
        { name: 'Lúa gạo & Ngũ cốc', slug: 'lua-gao-ngu-coc', sortOrder: 3 },
        { name: 'Thủy sản', slug: 'thuy-san', sortOrder: 4 },
        { name: 'Gia súc & Gia cầm', slug: 'gia-suc-gia-cam', sortOrder: 5 },
        { name: 'Cà phê & Chè', slug: 'ca-phe-che', sortOrder: 6 },
        { name: 'Gia vị & Thảo mộc', slug: 'gia-vi-thao-moc', sortOrder: 7 },
        { name: 'Hạt & Đậu', slug: 'hat-dau', sortOrder: 8 },
    ]);

    const [rauCu, traiCay, luaGao, thuySan, giaSuc, caPhe, giaVi, hat] = roots;

    // ─── Cấp 2 — Danh mục con ────────────────────────────────────
    await repo.save([
        // Rau củ quả
        { name: 'Rau ăn lá', slug: 'rau-an-la', parentId: rauCu.id, sortOrder: 1 },
        { name: 'Củ & Rễ', slug: 'cu-re', parentId: rauCu.id, sortOrder: 2 },
        { name: 'Bầu bí & Dưa leo', slug: 'bau-bi-dua-leo', parentId: rauCu.id, sortOrder: 3 },
        { name: 'Nấm các loại', slug: 'nam-cac-loai', parentId: rauCu.id, sortOrder: 4 },

        // Trái cây
        { name: 'Trái cây nhiệt đới', slug: 'trai-cay-nhiet-doi', parentId: traiCay.id, sortOrder: 1 },
        { name: 'Trái cây có múi', slug: 'trai-cay-co-mui', parentId: traiCay.id, sortOrder: 2 },
        { name: 'Nho & Dâu', slug: 'nho-dau', parentId: traiCay.id, sortOrder: 3 },
        { name: 'Bơ & Sầu riêng', slug: 'bo-sau-rieng', parentId: traiCay.id, sortOrder: 4 },

        // Lúa gạo & Ngũ cốc
        { name: 'Gạo các loại', slug: 'gao-cac-loai', parentId: luaGao.id, sortOrder: 1 },
        { name: 'Ngô & Khoai', slug: 'ngo-khoai', parentId: luaGao.id, sortOrder: 2 },
        { name: 'Đậu các loại', slug: 'dau-cac-loai', parentId: luaGao.id, sortOrder: 3 },

        // Thủy sản
        { name: 'Cá các loại', slug: 'ca-cac-loai', parentId: thuySan.id, sortOrder: 1 },
        { name: 'Tôm & Cua', slug: 'tom-cua', parentId: thuySan.id, sortOrder: 2 },
        { name: 'Hải sản khác', slug: 'hai-san-khac', parentId: thuySan.id, sortOrder: 3 },

        // Gia súc & Gia cầm
        { name: 'Thịt heo & Bò', slug: 'thit-heo-bo', parentId: giaSuc.id, sortOrder: 1 },
        { name: 'Thịt gà & Vịt', slug: 'thit-ga-vit', parentId: giaSuc.id, sortOrder: 2 },
        { name: 'Trứng & Sữa', slug: 'trung-sua', parentId: giaSuc.id, sortOrder: 3 },

        // Cà phê & Chè
        { name: 'Cà phê nhân & rang', slug: 'ca-phe-nhan-rang', parentId: caPhe.id, sortOrder: 1 },
        { name: 'Chè & Trà', slug: 'che-tra', parentId: caPhe.id, sortOrder: 2 },

        // Gia vị & Thảo mộc
        { name: 'Tiêu & Ớt', slug: 'tieu-ot', parentId: giaVi.id, sortOrder: 1 },
        { name: 'Gừng & Nghệ & Tỏi', slug: 'gung-nghe-toi', parentId: giaVi.id, sortOrder: 2 },

        // Hạt & Đậu
        { name: 'Hạt điều & Mắc ca', slug: 'hat-dieu-mac-ca', parentId: hat.id, sortOrder: 1 },
        { name: 'Đậu phộng & Mè', slug: 'dau-phong-me', parentId: hat.id, sortOrder: 2 },
    ]);

    console.log('✅ Seed 8 danh mục gốc + 23 danh mục con thành công');
}