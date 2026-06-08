import { DataSource } from 'typeorm';
import { Province } from '../entities/province.entity';
import { Region } from '../../../common/enums';

export async function seedProvinces(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(Province);

  const count = await repo.count();
  if (count > 0) {
    console.log('✅ Provinces đã được seed trước đó — bỏ qua');
    return;
  }

  await repo.save([
    { name: 'Lâm Đồng',    code: 'LD', region: Region.highlands },
    { name: 'Đắk Lắk',     code: 'DL', region: Region.highlands },
    { name: 'Tiền Giang',  code: 'TG', region: Region.south },
    { name: 'Bến Tre',     code: 'BT', region: Region.south },
    { name: 'Sóc Trăng',   code: 'ST', region: Region.south },
    { name: 'Bình Thuận',  code: 'BTN', region: Region.south },
    { name: 'Long An',     code: 'LA', region: Region.south },
    { name: 'Cần Thơ',     code: 'CT', region: Region.south },
    { name: 'Hà Nội',      code: 'HN', region: Region.north },
    { name: 'Đà Nẵng',     code: 'DN', region: Region.central },
  ]);

  console.log('✅ Seed 10 tỉnh thành thành công');
}
