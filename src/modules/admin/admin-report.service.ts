import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { AdminService } from './admin.service';

@Injectable()
export class AdminReportService {
  constructor(private readonly adminService: AdminService) {}

  async generateSystemReportPdf(): Promise<Buffer> {
    const { stats, cooperativesEnterprises, violatingProducts, generatedAt } =
      await this.adminService.getSystemReportData();

    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    doc.fontSize(18).text('AgriLink Vietnam — Báo cáo tổng quan hệ thống', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('gray').text(`Xuất lúc: ${generatedAt.toLocaleString('vi-VN')}`, { align: 'center' });
    doc.fillColor('black').moveDown(1.5);

    doc.fontSize(14).text('1. Thống kê hệ thống');
    doc.moveDown(0.5);
    doc.fontSize(11).list([
      `Tổng người dùng: ${stats.totalUsers}`,
      `Người dùng đang hoạt động: ${stats.activeUsers}`,
      `Hồ sơ chờ duyệt: ${stats.pendingProfiles.total} (Nông dân: ${stats.pendingProfiles.farmer}, HTX: ${stats.pendingProfiles.cooperative}, DN: ${stats.pendingProfiles.enterprise}, NCC: ${stats.pendingProfiles.supplier})`,
      `Tổng sản phẩm: ${stats.totalProducts}`,
      `Sản phẩm chờ duyệt: ${stats.pendingProducts}`,
      `Tranh chấp đang mở: ${stats.openDisputes}`,
      `Chứng nhận cấp trong tháng: ${stats.certificationsThisMonth}`,
    ]);
    doc.moveDown(1);

    doc.fontSize(14).text('2. Hợp tác xã & Doanh nghiệp');
    doc.moveDown(0.5);
    doc.fontSize(11).text(
      `Tổng: ${cooperativesEnterprises.cooperatives.length} HTX, ${cooperativesEnterprises.enterprises.length} Doanh nghiệp`,
    );
    doc.moveDown(0.3);
    for (const c of cooperativesEnterprises.cooperatives.slice(0, 15)) {
      doc.fontSize(9).text(`• [HTX] ${c.cooperativeName} — MST: ${c.taxCode} — ${c.isVerified ? 'Đã xác minh' : 'Chờ xác minh'}`);
    }
    for (const e of cooperativesEnterprises.enterprises.slice(0, 15)) {
      doc.fontSize(9).text(`• [DN] ${e.companyName} — MST: ${e.taxCode} — ${e.isVerified ? 'Đã xác minh' : 'Chờ xác minh'}`);
    }
    doc.moveDown(1);

    doc.fontSize(14).text('3. Sản phẩm vi phạm');
    doc.moveDown(0.5);
    if (violatingProducts.data.length === 0) {
      doc.fontSize(11).text('Không có sản phẩm vi phạm.');
    } else {
      for (const p of violatingProducts.data) {
        doc.fontSize(9).text(`• ${p.name} — trạng thái: ${p.status}${p.rejectionReason ? ` — lý do: ${p.rejectionReason}` : ''}`);
      }
    }

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
  }
}
