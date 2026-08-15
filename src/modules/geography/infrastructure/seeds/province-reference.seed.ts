import { DataSource, Repository } from "typeorm";
import { Region } from "../../../../common/enums";
import {
  SeedClassification,
  SeedExecutionContext,
  SeedGroup,
  SeedGroupMetadata,
} from "../../../../database/seeds/framework/seed-contract";
import { Province } from "../../entities/province.entity";

/**
 * 34 tỉnh/thành phố Việt Nam sau sáp nhập (Nghị quyết 202/2025/QH15).
 * Mã số theo Danh sách mã số 34 tỉnh, thành phố mới.
 * Tọa độ lat/lng là tọa độ trung tâm hành chính của tỉnh/thành mới.
 */
export interface ProvinceSeedData {
  code: string;
  name: string;
  nameEn: string;
  slug: string;
  region: Region;
  lat: number;
  lng: number;
}

export const provinceReferenceSeedData: readonly ProvinceSeedData[] = [
  // ── BẮC BỘ ──────────────────────────────────────────────
  {
    code: "01",
    name: "Thành phố Hà Nội",
    nameEn: "Ha Noi",
    slug: "ha-noi",
    region: Region.NORTH,
    lat: 21.0285,
    lng: 105.8542,
  },
  {
    code: "04",
    name: "Tỉnh Cao Bằng",
    nameEn: "Cao Bang",
    slug: "cao-bang",
    region: Region.NORTH,
    lat: 22.6657,
    lng: 106.257,
  },
  {
    code: "08",
    name: "Tỉnh Tuyên Quang",
    nameEn: "Tuyen Quang",
    slug: "tuyen-quang",
    region: Region.NORTH,
    lat: 21.7767,
    lng: 105.228,
  },
  {
    code: "11",
    name: "Tỉnh Điện Biên",
    nameEn: "Dien Bien",
    slug: "dien-bien",
    region: Region.NORTH,
    lat: 21.386,
    lng: 103.0166,
  },
  {
    code: "12",
    name: "Tỉnh Lai Châu",
    nameEn: "Lai Chau",
    slug: "lai-chau",
    region: Region.NORTH,
    lat: 22.3862,
    lng: 103.4703,
  },
  {
    code: "14",
    name: "Tỉnh Sơn La",
    nameEn: "Son La",
    slug: "son-la",
    region: Region.NORTH,
    lat: 21.327,
    lng: 103.9141,
  },
  {
    code: "15",
    name: "Tỉnh Lào Cai",
    nameEn: "Lao Cai",
    slug: "lao-cai",
    region: Region.NORTH,
    lat: 22.4856,
    lng: 103.9707,
  },
  {
    code: "19",
    name: "Tỉnh Thái Nguyên",
    nameEn: "Thai Nguyen",
    slug: "thai-nguyen",
    region: Region.NORTH,
    lat: 21.5672,
    lng: 105.8252,
  },
  {
    code: "20",
    name: "Tỉnh Lạng Sơn",
    nameEn: "Lang Son",
    slug: "lang-son",
    region: Region.NORTH,
    lat: 21.8537,
    lng: 106.7615,
  },
  {
    code: "22",
    name: "Tỉnh Quảng Ninh",
    nameEn: "Quang Ninh",
    slug: "quang-ninh",
    region: Region.NORTH,
    lat: 21.0064,
    lng: 107.2925,
  },
  {
    code: "24",
    name: "Tỉnh Bắc Ninh",
    nameEn: "Bac Ninh",
    slug: "bac-ninh",
    region: Region.NORTH,
    lat: 21.1861,
    lng: 106.0763,
  },
  {
    code: "25",
    name: "Tỉnh Phú Thọ",
    nameEn: "Phu Tho",
    slug: "phu-tho",
    region: Region.NORTH,
    lat: 21.2684,
    lng: 105.2046,
  },
  {
    code: "31",
    name: "Thành phố Hải Phòng",
    nameEn: "Hai Phong",
    slug: "hai-phong",
    region: Region.NORTH,
    lat: 20.8449,
    lng: 106.6881,
  },
  {
    code: "33",
    name: "Tỉnh Hưng Yên",
    nameEn: "Hung Yen",
    slug: "hung-yen",
    region: Region.NORTH,
    lat: 20.8526,
    lng: 106.016,
  },
  {
    code: "37",
    name: "Tỉnh Ninh Bình",
    nameEn: "Ninh Binh",
    slug: "ninh-binh",
    region: Region.NORTH,
    lat: 20.2506,
    lng: 105.9745,
  },

  // ── BẮC TRUNG BỘ & DUYÊN HẢI MIỀN TRUNG ───────────────
  {
    code: "38",
    name: "Tỉnh Thanh Hóa",
    nameEn: "Thanh Hoa",
    slug: "thanh-hoa",
    region: Region.CENTRAL,
    lat: 19.8067,
    lng: 105.7852,
  },
  {
    code: "40",
    name: "Tỉnh Nghệ An",
    nameEn: "Nghe An",
    slug: "nghe-an",
    region: Region.CENTRAL,
    lat: 19.2342,
    lng: 104.92,
  },
  {
    code: "42",
    name: "Tỉnh Hà Tĩnh",
    nameEn: "Ha Tinh",
    slug: "ha-tinh",
    region: Region.CENTRAL,
    lat: 18.3559,
    lng: 105.8877,
  },
  {
    code: "44",
    name: "Tỉnh Quảng Trị",
    nameEn: "Quang Tri",
    slug: "quang-tri",
    region: Region.CENTRAL,
    lat: 16.7403,
    lng: 107.1855,
  },
  {
    code: "46",
    name: "Thành phố Huế",
    nameEn: "Hue",
    slug: "hue",
    region: Region.CENTRAL,
    lat: 16.4637,
    lng: 107.5909,
  },
  {
    code: "48",
    name: "Thành phố Đà Nẵng",
    nameEn: "Da Nang",
    slug: "da-nang",
    region: Region.CENTRAL,
    lat: 16.0471,
    lng: 108.2068,
  },
  {
    code: "51",
    name: "Tỉnh Quảng Ngãi",
    nameEn: "Quang Ngai",
    slug: "quang-ngai",
    region: Region.CENTRAL,
    lat: 15.1214,
    lng: 108.8044,
  },
  {
    code: "52",
    name: "Tỉnh Gia Lai",
    nameEn: "Gia Lai",
    slug: "gia-lai",
    region: Region.HIGHLANDS,
    lat: 13.8079,
    lng: 108.1094,
  },
  {
    code: "56",
    name: "Tỉnh Khánh Hòa",
    nameEn: "Khanh Hoa",
    slug: "khanh-hoa",
    region: Region.CENTRAL,
    lat: 12.2585,
    lng: 109.0526,
  },
  {
    code: "66",
    name: "Tỉnh Đắk Lắk",
    nameEn: "Dak Lak",
    slug: "dak-lak",
    region: Region.HIGHLANDS,
    lat: 12.71,
    lng: 108.2378,
  },

  // ── TÂY NGUYÊN & NAM BỘ ────────────────────────────────
  {
    code: "68",
    name: "Tỉnh Lâm Đồng",
    nameEn: "Lam Dong",
    slug: "lam-dong",
    region: Region.HIGHLANDS,
    lat: 11.5753,
    lng: 108.1429,
  },
  {
    code: "75",
    name: "Tỉnh Đồng Nai",
    nameEn: "Dong Nai",
    slug: "dong-nai",
    region: Region.SOUTH,
    lat: 11.0686,
    lng: 107.1676,
  },
  {
    code: "79",
    name: "Thành phố Hồ Chí Minh",
    nameEn: "Ho Chi Minh City",
    slug: "ho-chi-minh",
    region: Region.SOUTH,
    lat: 10.8231,
    lng: 106.6297,
  },
  {
    code: "80",
    name: "Tỉnh Tây Ninh",
    nameEn: "Tay Ninh",
    slug: "tay-ninh",
    region: Region.SOUTH,
    lat: 11.3352,
    lng: 106.1099,
  },
  {
    code: "82",
    name: "Tỉnh Đồng Tháp",
    nameEn: "Dong Thap",
    slug: "dong-thap",
    region: Region.SOUTH,
    lat: 10.4938,
    lng: 105.6882,
  },
  {
    code: "86",
    name: "Tỉnh Vĩnh Long",
    nameEn: "Vinh Long",
    slug: "vinh-long",
    region: Region.SOUTH,
    lat: 10.2396,
    lng: 105.9572,
  },
  {
    code: "91",
    name: "Tỉnh An Giang",
    nameEn: "An Giang",
    slug: "an-giang",
    region: Region.SOUTH,
    lat: 10.5216,
    lng: 105.1259,
  },
  {
    code: "92",
    name: "Thành phố Cần Thơ",
    nameEn: "Can Tho",
    slug: "can-tho",
    region: Region.SOUTH,
    lat: 10.0452,
    lng: 105.7469,
  },
  {
    code: "96",
    name: "Tỉnh Cà Mau",
    nameEn: "Ca Mau",
    slug: "ca-mau",
    region: Region.SOUTH,
    lat: 9.1768,
    lng: 105.1524,
  },
];

export const GEOGRAPHY_PROVINCE_REFERENCE_SEED_METADATA: SeedGroupMetadata = {
  id: "geography.reference.provinces",
  owner: "geography",
  classification: SeedClassification.REFERENCE,
  dependencies: [],
  description: "Canonical Vietnamese province reference catalog",
};

export interface ProvinceReferenceRecord {
  readonly id: string;
}

export interface ProvinceReferenceSeedWriter {
  findByCode(code: string): Promise<ProvinceReferenceRecord | null>;
  create(data: ProvinceSeedData): Promise<ProvinceReferenceRecord>;
  update(id: string, data: ProvinceSeedData): Promise<void>;
}

export async function reconcileProvinceReferences(
  writer: ProvinceReferenceSeedWriter,
  records: readonly ProvinceSeedData[] = provinceReferenceSeedData,
): Promise<void> {
  for (const record of records) {
    const existing = await writer.findByCode(record.code);
    if (existing) {
      await writer.update(existing.id, record);
    } else {
      await writer.create(record);
    }
  }
}

export class GeographyProvinceReferenceSeedGroup implements SeedGroup {
  readonly metadata = GEOGRAPHY_PROVINCE_REFERENCE_SEED_METADATA;

  constructor(private readonly writer: ProvinceReferenceSeedWriter) {}

  async execute(context: SeedExecutionContext): Promise<void> {
    if (!context.classifications.includes(SeedClassification.REFERENCE)) {
      throw new Error(
        `${this.metadata.id} requires explicit REFERENCE selection`,
      );
    }

    await reconcileProvinceReferences(this.writer);
  }
}

class TypeOrmProvinceReferenceSeedWriter implements ProvinceReferenceSeedWriter {
  constructor(private readonly repository: Repository<Province>) {}

  async findByCode(code: string): Promise<ProvinceReferenceRecord | null> {
    return this.repository.findOne({
      select: { id: true },
      where: { code },
    });
  }

  async create(data: ProvinceSeedData): Promise<ProvinceReferenceRecord> {
    return this.repository.save(this.repository.create(data));
  }

  async update(id: string, data: ProvinceSeedData): Promise<void> {
    await this.repository.update(id, data);
  }
}

export function createGeographyProvinceReferenceSeedGroup(
  dataSource: DataSource,
): SeedGroup {
  return new GeographyProvinceReferenceSeedGroup(
    new TypeOrmProvinceReferenceSeedWriter(dataSource.getRepository(Province)),
  );
}
