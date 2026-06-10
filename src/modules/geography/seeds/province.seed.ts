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
    { name: 'Lâm Đồng',    code: 'LD', region: Region.HIGHLANDS },
    { name: 'Đắk Lắk',     code: 'DL', region: Region.HIGHLANDS },
    { name: 'Tiền Giang',  code: 'TG', region: Region.SOUTH },
    { name: 'Bến Tre',     code: 'BT', region: Region.SOUTH },
    { name: 'Sóc Trăng',   code: 'ST', region: Region.SOUTH },
    { name: 'Bình Thuận',  code: 'BTN', region: Region.SOUTH },
    { name: 'Long An',     code: 'LA', region: Region.SOUTH },
    { name: 'Cần Thơ',     code: 'CT', region: Region.SOUTH },
    { name: 'Hà Nội',      code: 'HN', region: Region.NORTH },
    { name: 'Đà Nẵng',     code: 'DN', region: Region.CENTRAL },
  ]);

  console.log('✅ Seed 10 tỉnh thành thành công');
}
