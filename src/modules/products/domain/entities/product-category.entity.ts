import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('product_categories')
export class ProductCategory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 100 })
    name: string;

    @Column({ length: 100, unique: true })
    slug: string;

    @Column({ nullable: true, type: 'text' })
    description: string;

    @Column({ name: 'parent_id', nullable: true })
    parentId: string;

    @Column({ name: 'sort_order', default: 0 })
    sortOrder: number;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    // ─── Relations ────────────────────────────────────────────────
    @ManyToOne(() => ProductCategory, (cat) => cat.children, { nullable: true })
    @JoinColumn({ name: 'parent_id' })
    parent: ProductCategory;

    @OneToMany(() => ProductCategory, (cat) => cat.parent)
    children: ProductCategory[];
}