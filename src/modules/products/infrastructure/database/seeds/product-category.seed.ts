import { DataSource } from 'typeorm';
import { ProductCategory } from '../../persistence/entities/product-category.entity';

export async function seedProductCategories(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(ProductCategory);

    const upsertCategory = async (data: {
        name: string;
        slug: string;
        sortOrder: number;
        parentId?: string | null;
    }): Promise<ProductCategory> => {
        const existing = await repo.findOne({ where: { slug: data.slug } });
        if (existing) {
            repo.merge(existing, {
                name: data.name,
                sortOrder: data.sortOrder,
                parentId: data.parentId ?? null,
                isActive: true,
            });
            return repo.save(existing);
        }

        return repo.save(repo.create({ ...data, parentId: data.parentId ?? null, isActive: true }));
    };

    // ─── Cấp 1 — Danh mục gốc ────────────────────────────────────
    const roots = {
        rauCu: await upsertCategory({ name: 'Rau củ quả', slug: 'rau-cu-qua', sortOrder: 1 }),
        traiCay: await upsertCategory({ name: 'Trái cây', slug: 'trai-cay', sortOrder: 2 }),
        luaGao: await upsertCategory({ name: 'Lúa gạo & Ngũ cốc', slug: 'lua-gao-ngu-coc', sortOrder: 3 }),
        thuySan: await upsertCategory({ name: 'Thủy sản', slug: 'thuy-san', sortOrder: 4 }),
        giaSuc: await upsertCategory({ name: 'Gia súc & Gia cầm', slug: 'gia-suc-gia-cam', sortOrder: 5 }),
        caPhe: await upsertCategory({ name: 'Cà phê & Chè', slug: 'ca-phe-che', sortOrder: 6 }),
        giaVi: await upsertCategory({ name: 'Gia vị & Thảo mộc', slug: 'gia-vi-thao-moc', sortOrder: 7 }),
        hat: await upsertCategory({ name: 'Hạt & Đậu', slug: 'hat-dau', sortOrder: 8 }),
        matOng: await upsertCategory({ name: 'Mật ong & Đặc sản', slug: 'mat-ong-dac-san', sortOrder: 9 }),
        hoa: await upsertCategory({ name: 'Hoa & Cây cảnh', slug: 'hoa-cay-canh', sortOrder: 10 }),
    };

    // ─── Cấp 2 — Danh mục con ────────────────────────────────────
    await Promise.all([
        // Rau củ quả
        upsertCategory({ name: 'Rau ăn lá', slug: 'rau-an-la', parentId: roots.rauCu.id, sortOrder: 1 }),
        upsertCategory({ name: 'Củ & Rễ', slug: 'cu-re', parentId: roots.rauCu.id, sortOrder: 2 }),
        upsertCategory({ name: 'Bầu bí & Dưa leo', slug: 'bau-bi-dua-leo', parentId: roots.rauCu.id, sortOrder: 3 }),
        upsertCategory({ name: 'Nấm các loại', slug: 'nam-cac-loai', parentId: roots.rauCu.id, sortOrder: 4 }),

        // Trái cây
        upsertCategory({ name: 'Trái cây nhiệt đới', slug: 'trai-cay-nhiet-doi', parentId: roots.traiCay.id, sortOrder: 1 }),
        upsertCategory({ name: 'Trái cây có múi', slug: 'trai-cay-co-mui', parentId: roots.traiCay.id, sortOrder: 2 }),
        upsertCategory({ name: 'Nho & Dâu', slug: 'nho-dau', parentId: roots.traiCay.id, sortOrder: 3 }),
        upsertCategory({ name: 'Bơ & Sầu riêng', slug: 'bo-sau-rieng', parentId: roots.traiCay.id, sortOrder: 4 }),

        // Lúa gạo & Ngũ cốc
        upsertCategory({ name: 'Gạo các loại', slug: 'gao-cac-loai', parentId: roots.luaGao.id, sortOrder: 1 }),
        upsertCategory({ name: 'Ngô & Khoai', slug: 'ngo-khoai', parentId: roots.luaGao.id, sortOrder: 2 }),
        upsertCategory({ name: 'Đậu các loại', slug: 'dau-cac-loai', parentId: roots.luaGao.id, sortOrder: 3 }),

        // Thủy sản
        upsertCategory({ name: 'Cá các loại', slug: 'ca-cac-loai', parentId: roots.thuySan.id, sortOrder: 1 }),
        upsertCategory({ name: 'Tôm & Cua', slug: 'tom-cua', parentId: roots.thuySan.id, sortOrder: 2 }),
        upsertCategory({ name: 'Hải sản khác', slug: 'hai-san-khac', parentId: roots.thuySan.id, sortOrder: 3 }),

        // Gia súc & Gia cầm
        upsertCategory({ name: 'Thịt heo & Bò', slug: 'thit-heo-bo', parentId: roots.giaSuc.id, sortOrder: 1 }),
        upsertCategory({ name: 'Thịt gà & Vịt', slug: 'thit-ga-vit', parentId: roots.giaSuc.id, sortOrder: 2 }),
        upsertCategory({ name: 'Trứng & Sữa', slug: 'trung-sua', parentId: roots.giaSuc.id, sortOrder: 3 }),

        // Cà phê & Chè
        upsertCategory({ name: 'Cà phê nhân & rang', slug: 'ca-phe-nhan-rang', parentId: roots.caPhe.id, sortOrder: 1 }),
        upsertCategory({ name: 'Chè & Trà', slug: 'che-tra', parentId: roots.caPhe.id, sortOrder: 2 }),

        // Gia vị & Thảo mộc
        upsertCategory({ name: 'Tiêu & Ớt', slug: 'tieu-ot', parentId: roots.giaVi.id, sortOrder: 1 }),
        upsertCategory({ name: 'Gừng & Nghệ & Tỏi', slug: 'gung-nghe-toi', parentId: roots.giaVi.id, sortOrder: 2 }),

        // Hạt & Đậu
        upsertCategory({ name: 'Hạt điều & Mắc ca', slug: 'hat-dieu-mac-ca', parentId: roots.hat.id, sortOrder: 1 }),
        upsertCategory({ name: 'Đậu phộng & Mè', slug: 'dau-phong-me', parentId: roots.hat.id, sortOrder: 2 }),

        // Mật ong & Đặc sản
        upsertCategory({ name: 'Mật ong', slug: 'mat-ong', parentId: roots.matOng.id, sortOrder: 1 }),
        upsertCategory({ name: 'Đặc sản vùng miền', slug: 'dac-san-vung-mien', parentId: roots.matOng.id, sortOrder: 2 }),

        // Hoa & Cây cảnh
        upsertCategory({ name: 'Hoa cắt cành', slug: 'hoa-cat-canh', parentId: roots.hoa.id, sortOrder: 1 }),
        upsertCategory({ name: 'Cây cảnh', slug: 'cay-canh', parentId: roots.hoa.id, sortOrder: 2 }),
    ]);

    console.log('✅ Seed/upsert 10 danh mục gốc + 27 danh mục con thành công');
}
