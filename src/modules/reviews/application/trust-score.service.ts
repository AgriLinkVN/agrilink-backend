import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserRole } from '@common/enums';

export const TRUST_SCORE_SERVICE = Symbol('TRUST_SCORE_SERVICE');

/**
 * Computes and persists trust_score for sellers (all 4 profile types).
 * Formula: AVG(rating) of visible reviews (is_hidden = false).
 * Returns value in range 0.00 – 5.00, rounded to 2 decimal places.
 */
@Injectable()
export class TrustScoreService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async recalculateForSeller(sellerId: string): Promise<number> {
    const score = await this.computeScore(sellerId);
    await this.persistScore(sellerId, score);
    return score;
  }

  async getTrustScore(sellerId: string): Promise<number> {
    const table = await this.getProfileTable(sellerId);
    if (!table) return 0;
    const rows = await this.ds.query(
      `SELECT trust_score FROM ${table} WHERE user_id = $1`,
      [sellerId],
    );
    return Number(rows[0]?.trust_score ?? 0);
  }

  // ─── private ───────────────────────────────────────────────────

  private async computeScore(sellerId: string): Promise<number> {
    const rows = await this.ds.query(
      `SELECT COALESCE(AVG(rating), 0) AS avg_rating
       FROM reviews
       WHERE reviewee_id = $1 AND is_hidden = false`,
      [sellerId],
    );
    const avg = Number(rows[0]?.avg_rating ?? 0);
    return Math.round(avg * 100) / 100; // round to 2 decimals
  }

  private async persistScore(sellerId: string, score: number): Promise<void> {
    const table = await this.getProfileTable(sellerId);
    if (!table) return;

    await this.ds.query(
      `UPDATE ${table} SET trust_score = $1, updated_at = NOW() WHERE user_id = $2`,
      [score, sellerId],
    );
  }

  private async getProfileTable(sellerId: string): Promise<string | null> {
    const rows = await this.ds.query(
      `SELECT role FROM users WHERE id = $1`,
      [sellerId],
    );
    const role: UserRole | undefined = rows[0]?.role;
    const mapping: Record<string, string> = {
      [UserRole.FARMER]: 'farmer_profiles',
      [UserRole.COOPERATIVE]: 'cooperative_profiles',
      [UserRole.SUPPLIER]: 'supplier_profiles',
      [UserRole.ENTERPRISE]: 'enterprise_profiles',
    };
    return mapping[role!] ?? null;
  }
}
