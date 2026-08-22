# P8-05D3A Admin DEV Product Identity And Mapping Decisions

## Scope And Safety

This record is a static source and Git-history audit of the final ten Product
and ten Product Image fixtures in
[`admin-dev.seed.ts`](../../../../../src/database/seeds/admin-dev.seed.ts).
It does not authorize or implement Product or Product Image migration. No
runtime source, schema, migration, seed, DataSource, or database was changed or
executed.

The authoritative owner implementation is
[`product-development-seed.service.ts`](../../../../../src/modules/products/infrastructure/database/seeds/product-development-seed.service.ts).
It owns `products.dev.products`, depends on Products categories and Users
scalar outputs, reconciles Products by persisted SKU, reconciles an image by
Product plus primary slot, and publishes `product.id.by-sku` outputs.

```text
P8_05D3A_AUDIT_CLASSIFICATION=DOCUMENTATION_STATIC_SOURCE_AUDIT_ONLY
PRODUCT_RUNTIME_CHANGES=0
PRODUCT_IMAGE_RUNTIME_CHANGES=0
ADMIN_DEV_RUNTIME_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
```

## Current Standalone Inventory

Current source declares ten Product object literals and ten name-keyed image
URLs. None of the Products declares `sku`. Product existence is checked by the
mutable, non-unique pair `name + sellerId`; the source contains one Product
repository write call site inside the ten-record loop. Each parent is looked up
again by `name + sellerId`, then any image for its generated Product ID blocks
the one Image repository write call site. The image lookup does not distinguish
primary from non-primary slots.

```text
ADMIN_DEV_WRITE_SECTION_COUNT=2
ADMIN_DEV_TABLE_COUNT=2
ADMIN_DEV_OWNER_COUNT=1
ADMIN_DEV_REMAINING_OWNER=products

ADMIN_DEV_PRODUCT_FIXTURE_COUNT=10
ADMIN_DEV_PRODUCT_IMAGE_FIXTURE_COUNT=10
ADMIN_DEV_PRODUCT_SKU_DECLARATION_COUNT=0
ADMIN_DEV_PRODUCT_CURRENT_LOOKUP_KEY=name + sellerId
ADMIN_DEV_PRODUCT_IMAGE_CURRENT_LOOKUP_KEY=productId + any image slot
ADMIN_DEV_PRODUCT_REPOSITORY_WRITE_COUNT=1
ADMIN_DEV_PRODUCT_IMAGE_REPOSITORY_WRITE_COUNT=1
ADMIN_DEV_PRODUCT_POTENTIAL_FIXTURE_WRITES=10
ADMIN_DEV_PRODUCT_IMAGE_POTENTIAL_FIXTURE_WRITES=10
```

## Canonical Identity, Schema, And History Evidence

The Product entity declares nullable, schema-unique `sku`; name and seller are
not jointly unique. Product Image has generated UUID identity and no unique
Product/slot constraint. No current Product migration establishes another
identity. The owner group therefore uses SKU as the Product stable key and
Product SKU plus the primary slot as its conceptual managed-image identity.

The 63 owner fixtures declare 63 unique SKUs. Sixty-one declare a managed
primary image: 54 use the fallback image, seven declare a fixture-specific
image, and two violation fixtures explicitly declare no managed image.

Git history provides no Admin-to-owner identity link. Commit `55421fb` added
all ten standalone Product and Image declarations without SKUs. Commit
`27b5ebe` later established the SKU-owned Product DEV group. Commit `b80a56c`
added reviewed C2B fixtures but did not assign an Admin fixture to a SKU.
Consequently every candidate below is semantic evidence only.

```text
PRODUCTS_DEV_CURRENT_RECORD_COUNT=63
PRODUCTS_DEV_CURRENT_SKU_COUNT=63
PRODUCTS_DEV_DUPLICATE_SKU_COUNT=0
PRODUCTS_DEV_MANAGED_PRIMARY_IMAGE_COUNT=61
PRODUCTS_DEV_CANONICAL_STABLE_KEY=sku
PRODUCTS_DEV_IMAGE_CONCEPTUAL_STABLE_KEY=Product SKU + primary slot
PRODUCT_ENTITY_SKU_SCHEMA_UNIQUE=YES_NULLABLE
PRODUCT_IMAGE_SCHEMA_UNIQUE_SLOT=NONE
ADMIN_DEV_PRODUCT_EXACT_PERSISTED_IDENTITY_MATCH_COUNT=0
ADMIN_DEV_PRODUCT_SEMANTIC_OVERLAP_COUNT=6
ADMIN_DEV_PRODUCT_DISTINCT_BUSINESS_FIXTURE_SUPPORTED_COUNT=4
ADMIN_DEV_SOURCE_PROVEN_SKU_COUNT=0
ADMIN_DEV_HISTORY_PROVEN_SKU_COUNT=0
ADMIN_DEV_HUMAN_ASSIGNED_PROPOSED_SKU_COUNT=0
ADMIN_DEV_NO_SKU_PROVEN_COUNT=10
```

## Fixture-By-Fixture Product Decision Matrix

`ADP-01` through `ADP-10` are documentation labels only. They are not Product
identities. `none proven` means neither current source nor Git history supplies
a persisted SKU for the Admin declaration.

| Label | Display name | Seller / type | Current SKU | Status | Variety | Farming | Price / unit | Quantity / minimum | Canonical semantic candidates | Candidate seller | Material payload conflicts | Relationship | Source/history evidence | Proposed disposition | Proposed SKU | Human decision required | Blocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ADP-01` | Xoài cát Hòa Lộc loại 1 | `hung.nv@farm.vn` / FARMER | none | PENDING_APPROVAL | Hòa Lộc | VIETGAP | 45,000 / KG | 500 / 10 | `DEV-XOAI-HOA-LOC-001` | `farmer@agrilink.vn` / FARMER | seller differs; ACTIVE versus pending; description differs; Admin variety is outside the current owner write contract | `SEMANTIC_OVERLAP_ONLY` | same name and commercial quantities, but `55421fb` supplies no SKU and no later history links the sellers | `UNRESOLVED_REQUIRES_HUMAN_DECISION` | none until human decision | YES | choose map, distinct addition with human-assigned SKU, retire, or defer |
| `ADP-02` | Rau xà lách thủy canh | `mai.lt@farm.vn` / FARMER | none | PENDING_APPROVAL | Xà lách Mỹ | ORGANIC | 25,000 / KG | 200 / 5 | `DEV-XA-LACH-THUY-CANH-001` | `farmer@agrilink.vn` / FARMER | seller, name/location, description, price, quantity, minimum, and status differ; Admin variety is outside the owner write contract | `SEMANTIC_OVERLAP_ONLY` | same hydroponic lettuce concept only; no SKU/history link | `UNRESOLVED_REQUIRES_HUMAN_DECISION` | none until human decision | YES | choose map, distinct addition with human-assigned SKU, retire, or defer |
| `ADP-03` | Dưa lưới giống Nhật | `tuan.pq@farm.vn` / FARMER | none | PENDING_APPROVAL | Nhật Bản | GLOBALGAP | 85,000 / KG | 150 / 2 | none | none | no canonical equivalent; Admin variety is outside the owner write contract | `DISTINCT_BUSINESS_FIXTURE_SUPPORTED` | complete standalone payload introduced in `55421fb`; no semantic owner equivalent or later SKU evidence | `ADD_DISTINCT_PRODUCTS_DEV_FIXTURE` | none; human assignment required | YES | addition requires human approval and a human-assigned persisted SKU |
| `ADP-04` | Gạo ST25 Sóc Trăng | `htx.dalat@coop.vn` / COOPERATIVE | none | PENDING_APPROVAL | ST25 | VIETGAP | 35,000 / KG | 2,000 / 20 | `DEV-GAO-ST25-001` | `farmer@agrilink.vn` / FARMER | seller and seller type differ; name, description, price, status, and Admin variety differ | `SEMANTIC_OVERLAP_ONLY` | same ST25 concept and quantity/minimum, but no SKU/history link and seller ownership conflicts | `UNRESOLVED_REQUIRES_HUMAN_DECISION` | none until human decision | YES | choose map, distinct addition with human-assigned SKU, retire, or defer |
| `ADP-05` | Rau cải bó xôi hữu cơ | `htx.dalat@coop.vn` / COOPERATIVE | none | PENDING_APPROVAL | Bó xôi | ORGANIC | 32,000 / KG | 300 / 5 | none | none | no canonical equivalent; Admin variety is outside the owner write contract | `DISTINCT_BUSINESS_FIXTURE_SUPPORTED` | complete standalone payload introduced in `55421fb`; no semantic owner equivalent or later SKU evidence | `ADD_DISTINCT_PRODUCTS_DEV_FIXTURE` | none; human assignment required | YES | addition requires human approval and a human-assigned persisted SKU |
| `ADP-06` | Bưởi da xanh Bến Tre | `htx.tiengiang@coop.vn` / COOPERATIVE | none | PENDING_APPROVAL | Da xanh | VIETGAP | 65,000 / KG | 800 / 10 | `DEV-BUOI-DA-XANH-001`; `DEV-BUOI-DA-XANH-FARMER-001` | `cooperative@agrilink.vn` / COOPERATIVE; `farmer@sandbox.com` / FARMER | both sellers differ; second candidate also changes seller type; price, description, status, and Admin variety differ | `SEMANTIC_OVERLAP_ONLY` | exact display-name overlap is ambiguous across two SKUs; no history selects either | `UNRESOLVED_REQUIRES_HUMAN_DECISION` | none until human decision | YES | choose one candidate SKU, distinct addition with human-assigned SKU, retire, or defer |
| `ADP-07` | Gạo lứt hữu cơ xuất khẩu | `xnk.mekong@ent.vn` / SUPPLIER | none | PENDING_APPROVAL | Lứt đỏ | ORGANIC | 55,000 / KG | 3,000 / 50 | `DEV-GAO-LUT-DO-HUU-CO-001` | `farmer@agrilink.vn` / FARMER | seller and type, name/export intent, description, price, quantity, minimum, status, and Admin variety differ | `SEMANTIC_OVERLAP_ONLY` | same red organic brown-rice concept only; no SKU/history link | `UNRESOLVED_REQUIRES_HUMAN_DECISION` | none until human decision | YES | choose map, distinct addition with human-assigned SKU, retire, or defer |
| `ADP-08` | Cà phê robusta Buôn Ma Thuột | `agri.tech@ent.vn` / SUPPLIER | none | PENDING_APPROVAL | Robusta | GLOBALGAP | 120,000 / KG | 5,000 / 100 | `DEV-CA-PHE-ROBUSTA-001`; `DEV-CA-PHE-ROBUSTA-SUPPLIER-001` | `cooperative@agrilink.vn` / COOPERATIVE; `supplier@agrilink.vn` / SUPPLIER | both sellers differ; first type differs; description/export intent, price, quantity, minimum, farming, status, and Admin variety differ | `SEMANTIC_OVERLAP_ONLY` | two Robusta candidates exist; no history selects either and neither preserves the Admin seller | `UNRESOLVED_REQUIRES_HUMAN_DECISION` | none until human decision | YES | choose one candidate SKU, distinct addition with human-assigned SKU, retire, or defer |
| `ADP-09` | Phân bón hữu cơ vi sinh Trichoderma | `phanbon.xanh@sup.vn` / SUPPLIER | none | PENDING_APPROVAL | absent | absent | 85,000 / KG | 2,000 / 25 | none; `DEV-VIOLATION-PHAN-BON-KEM-CHAT-LUONG-001` is a different NPK violation product | none | no equivalent; absent farming type cannot be invented for the currently required owner field | `DISTINCT_BUSINESS_FIXTURE_SUPPORTED` | full Trichoderma commercial payload in `55421fb`; canonical violation fixture differs in seller, intent, status, price, and payload | `ADD_DISTINCT_PRODUCTS_DEV_FIXTURE` | none; human assignment required | YES | addition requires human approval, human-assigned SKU, and preservation of absent farming type |
| `ADP-10` | Chế phẩm sinh học EM gốc | `phanbon.xanh@sup.vn` / SUPPLIER | none | REJECTED | absent | absent | 150,000 / KG | 500 / 5 | none | none | no equivalent; rejection reason must be preserved; absent farming type cannot be invented for the current owner field | `DISTINCT_BUSINESS_FIXTURE_SUPPORTED` | full rejected EM payload in `55421fb`; no semantic owner equivalent or later SKU evidence | `ADD_DISTINCT_PRODUCTS_DEV_FIXTURE` | none; human assignment required | YES | addition requires human approval, human-assigned SKU, and preservation of absent farming type |

The recommendation counts describe evidence-based proposed dispositions, not
authorization. The four addition recommendations still lack approved SKUs;
the other six do not yet have an approved map/add/retire disposition.

```text
PROPOSED_PRODUCTS_DEV_MAP_COUNT=0
PROPOSED_PRODUCTS_DEV_ADDITION_COUNT=4
PROPOSED_PRODUCTS_DEV_RETIRE_COUNT=0
PRODUCT_DECISION_UNRESOLVED_COUNT=6
PRODUCT_HUMAN_DECISION_REQUIRED_COUNT=10
PRODUCT_REQUIRES_NEW_PERSISTED_SKU_COUNT=4
NEW_SKU_APPROVED_COUNT=0
ADMIN_DEV_PRODUCT_IDENTITIES_RESOLVED=NO
```

## Product Image Decision Matrix

Every standalone Image declares `isPrimary=true` and `sortOrder=0`. Because no
parent Product has an approved SKU/disposition, every current Image identity is
`UNRESOLVED_PARENT_PRODUCT`. For semantic candidates, the owner already
reconciles a primary image; mapping a Product must not overwrite it. The
conditional default is to retire the redundant standalone Image after a map,
or add the standalone URL as the primary Image only after approval of a
distinct Product and SKU.

| Label | Parent decision | Current image URL | Primary intent | Current canonical image for candidate | Image relationship | Proposed image disposition | Image blocker |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ADP-01-IMG` | unresolved `ADP-01` | `https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/xoai-cat-hoa-loc.jpg` | primary / slot 0 | `DEV-XOAI-HOA-LOC-001` uses owner fallback `https://images.unsplash.com/photo-1506617420156-8e4536971650?w=600&q=80` | `UNRESOLVED_PARENT_PRODUCT` | `UNRESOLVED_PARENT_PRODUCT`; if mapped, default `RETIRE_REDUNDANT_STANDALONE_IMAGE`; if added, `ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT` | `ADP-01` Product decision required |
| `ADP-02-IMG` | unresolved `ADP-02` | `https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/xa-lach-thuy-canh.jpg` | primary / slot 0 | `DEV-XA-LACH-THUY-CANH-001` uses owner fallback image | `UNRESOLVED_PARENT_PRODUCT` | same conditional map/add policy | `ADP-02` Product decision required |
| `ADP-03-IMG` | proposed distinct `ADP-03`, unapproved | `https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/dua-luoi-nhat.jpg` | primary / slot 0 | none | `UNRESOLVED_PARENT_PRODUCT` | `UNRESOLVED_PARENT_PRODUCT`; after approved addition, `ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT` | approved Product disposition and SKU required |
| `ADP-04-IMG` | unresolved `ADP-04` | `https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/gao-st25.jpg` | primary / slot 0 | `DEV-GAO-ST25-001` uses owner fallback image | `UNRESOLVED_PARENT_PRODUCT` | conditional map/add policy; no replacement authorized | `ADP-04` Product decision required |
| `ADP-05-IMG` | proposed distinct `ADP-05`, unapproved | `https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/cai-bo-xoi.jpg` | primary / slot 0 | none | `UNRESOLVED_PARENT_PRODUCT` | `UNRESOLVED_PARENT_PRODUCT`; after approved addition, `ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT` | approved Product disposition and SKU required |
| `ADP-06-IMG` | unresolved `ADP-06` | `https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/buoi-da-xanh.jpg` | primary / slot 0 | `DEV-BUOI-DA-XANH-001` uses fallback; `DEV-BUOI-DA-XANH-FARMER-001` uses `https://images.unsplash.com/photo-1576181256399-834e3b3a49bf?w=600` | `UNRESOLVED_PARENT_PRODUCT` | conditional map/add policy; no replacement authorized | choose parent SKU/disposition first |
| `ADP-07-IMG` | unresolved `ADP-07` | `https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/gao-lut.jpg` | primary / slot 0 | `DEV-GAO-LUT-DO-HUU-CO-001` uses owner fallback image | `UNRESOLVED_PARENT_PRODUCT` | conditional map/add policy; no replacement authorized | `ADP-07` Product decision required |
| `ADP-08-IMG` | unresolved `ADP-08` | `https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/ca-phe-robusta.jpg` | primary / slot 0 | `DEV-CA-PHE-ROBUSTA-001` uses fallback; `DEV-CA-PHE-ROBUSTA-SUPPLIER-001` uses `https://images.unsplash.com/photo-1559525839-d9acfd564ca0?w=600` | `UNRESOLVED_PARENT_PRODUCT` | conditional map/add policy; no replacement authorized | choose parent SKU/disposition first |
| `ADP-09-IMG` | proposed distinct `ADP-09`, unapproved | `https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/phan-bon.jpg` | primary / slot 0 | none | `UNRESOLVED_PARENT_PRODUCT` | `UNRESOLVED_PARENT_PRODUCT`; after approved addition, `ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT` | approved Product disposition and SKU required |
| `ADP-10-IMG` | proposed distinct `ADP-10`, unapproved | `https://res.cloudinary.com/personal-media/image/upload/c_fill,w_800,h_800/agrilink/products/che-pham-em.jpg` | primary / slot 0 | none | `UNRESOLVED_PARENT_PRODUCT` | `UNRESOLVED_PARENT_PRODUCT`; after approved addition, `ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT` | approved Product disposition and SKU required |

```text
PRODUCT_IMAGE_MAP_EXISTING_COUNT=0
PRODUCT_IMAGE_ADD_PRIMARY_COUNT=0
PRODUCT_IMAGE_RETIRE_COUNT=0
PRODUCT_IMAGE_REPLACE_REQUIRES_HUMAN_COUNT=0
PRODUCT_IMAGE_UNRESOLVED_PARENT_COUNT=10
ADMIN_DEV_PRODUCT_IMAGE_IDENTITIES_RESOLVED=NO
EXISTING_CANONICAL_PRIMARY_IMAGES_PROTECTED=YES
```

## P8-05D3A Human Decisions Required

No option is selected autonomously. `ADD_DISTINCT_WITH_NEW_SKU` always requires
a human-assigned persisted SKU because source and history prove none.

```text
ADP_01_DECISION=MAP_DEV-XOAI-HOA-LOC-001_OR_ADD_DISTINCT_WITH_NEW_SKU_OR_RETIRE_OR_DEFER
ADP_02_DECISION=MAP_DEV-XA-LACH-THUY-CANH-001_OR_ADD_DISTINCT_WITH_NEW_SKU_OR_RETIRE_OR_DEFER
ADP_03_DECISION=ADD_DISTINCT_WITH_NEW_SKU_OR_RETIRE_OR_DEFER
ADP_04_DECISION=MAP_DEV-GAO-ST25-001_OR_ADD_DISTINCT_WITH_NEW_SKU_OR_RETIRE_OR_DEFER
ADP_05_DECISION=ADD_DISTINCT_WITH_NEW_SKU_OR_RETIRE_OR_DEFER
ADP_06_DECISION=MAP_DEV-BUOI-DA-XANH-001_OR_MAP_DEV-BUOI-DA-XANH-FARMER-001_OR_ADD_DISTINCT_WITH_NEW_SKU_OR_RETIRE_OR_DEFER
ADP_07_DECISION=MAP_DEV-GAO-LUT-DO-HUU-CO-001_OR_ADD_DISTINCT_WITH_NEW_SKU_OR_RETIRE_OR_DEFER
ADP_08_DECISION=MAP_DEV-CA-PHE-ROBUSTA-001_OR_MAP_DEV-CA-PHE-ROBUSTA-SUPPLIER-001_OR_ADD_DISTINCT_WITH_NEW_SKU_OR_RETIRE_OR_DEFER
ADP_09_DECISION=ADD_DISTINCT_WITH_NEW_SKU_OR_RETIRE_OR_DEFER
ADP_10_DECISION=ADD_DISTINCT_WITH_NEW_SKU_OR_RETIRE_OR_DEFER

ADP_01_SKU_HUMAN_ASSIGNMENT_REQUIRED=YES_IF_ADD_DISTINCT
ADP_02_SKU_HUMAN_ASSIGNMENT_REQUIRED=YES_IF_ADD_DISTINCT
ADP_03_SKU_HUMAN_ASSIGNMENT_REQUIRED=YES
ADP_04_SKU_HUMAN_ASSIGNMENT_REQUIRED=YES_IF_ADD_DISTINCT
ADP_05_SKU_HUMAN_ASSIGNMENT_REQUIRED=YES
ADP_06_SKU_HUMAN_ASSIGNMENT_REQUIRED=YES_IF_ADD_DISTINCT
ADP_07_SKU_HUMAN_ASSIGNMENT_REQUIRED=YES_IF_ADD_DISTINCT
ADP_08_SKU_HUMAN_ASSIGNMENT_REQUIRED=YES_IF_ADD_DISTINCT
ADP_09_SKU_HUMAN_ASSIGNMENT_REQUIRED=YES
ADP_10_SKU_HUMAN_ASSIGNMENT_REQUIRED=YES

ADP_01_IMAGE_DECISION=FOLLOW_APPROVED_ADP_01_PRODUCT_AND_PROTECT_EXISTING_PRIMARY
ADP_02_IMAGE_DECISION=FOLLOW_APPROVED_ADP_02_PRODUCT_AND_PROTECT_EXISTING_PRIMARY
ADP_03_IMAGE_DECISION=FOLLOW_APPROVED_ADP_03_PRODUCT
ADP_04_IMAGE_DECISION=FOLLOW_APPROVED_ADP_04_PRODUCT_AND_PROTECT_EXISTING_PRIMARY
ADP_05_IMAGE_DECISION=FOLLOW_APPROVED_ADP_05_PRODUCT
ADP_06_IMAGE_DECISION=FOLLOW_APPROVED_ADP_06_PRODUCT_AND_PROTECT_EXISTING_PRIMARY
ADP_07_IMAGE_DECISION=FOLLOW_APPROVED_ADP_07_PRODUCT_AND_PROTECT_EXISTING_PRIMARY
ADP_08_IMAGE_DECISION=FOLLOW_APPROVED_ADP_08_PRODUCT_AND_PROTECT_EXISTING_PRIMARY
ADP_09_IMAGE_DECISION=FOLLOW_APPROVED_ADP_09_PRODUCT
ADP_10_IMAGE_DECISION=FOLLOW_APPROVED_ADP_10_PRODUCT
```

## Authorization And Phase Status

D3 implementation remains unauthorized. All retained Products must first have
an approved persisted SKU, seller mapping, and disposition; every retained
Image must then have a resolved parent and approved image disposition.

```text
P8_05D1_USERS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_123
P8_05D2_PROFILES_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_124
P8_05D3A_PRODUCT_IDENTITY_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05D3_PRODUCTS_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05D3_PRODUCTS_IMPLEMENTATION_AUTHORIZED=NO
P8_05D3_PRODUCTS_BLOCKERS=ADP_01_PRODUCT_DECISION_REQUIRED;ADP_02_PRODUCT_DECISION_REQUIRED;ADP_03_PRODUCT_DECISION_REQUIRED;ADP_04_PRODUCT_DECISION_REQUIRED;ADP_05_PRODUCT_DECISION_REQUIRED;ADP_06_PRODUCT_DECISION_REQUIRED;ADP_07_PRODUCT_DECISION_REQUIRED;ADP_08_PRODUCT_DECISION_REQUIRED;ADP_09_PRODUCT_DECISION_REQUIRED;ADP_10_PRODUCT_DECISION_REQUIRED;ADP_01_IMAGE_PARENT_UNRESOLVED;ADP_02_IMAGE_PARENT_UNRESOLVED;ADP_03_IMAGE_PARENT_UNRESOLVED;ADP_04_IMAGE_PARENT_UNRESOLVED;ADP_05_IMAGE_PARENT_UNRESOLVED;ADP_06_IMAGE_PARENT_UNRESOLVED;ADP_07_IMAGE_PARENT_UNRESOLVED;ADP_08_IMAGE_PARENT_UNRESOLVED;ADP_09_IMAGE_PARENT_UNRESOLVED;ADP_10_IMAGE_PARENT_UNRESOLVED
P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_AUTHORIZED=NO
P8_05D4_BLOCKERS=P8_05D3_PRODUCTS_NOT_IMPLEMENTED
P8_05D_IMPLEMENTATION_STATUS=IN_PROGRESS
```

## P8-05D3A Human Review Decision Overlay

Human review rejects mapping the six semantic overlaps because seller identity
and ownership are material, payload/status intent differs, and history proves
no persisted identity relationship. It approves eight distinct Products with
human-assigned persisted DEV SKUs. Static validation confirms that all eight
start with `DEV-`, are at most 50 characters, are mutually unique, and do not
collide with the current 63 owner SKUs.

Human review retires `ADP-09` and `ADP-10`: their source payloads omit the
non-null `farmingType` required by current Product persistence, and neither an
invented value nor a schema change is approved. Their Images retire with their
parents. The eight retained source image URLs become primary Images for the
eight new Products under Product SKU plus primary-slot identity; no existing
canonical primary Image is replaced.

### Approved Product Identities And Dispositions

| Label | Human decision | Approved SKU | Approved seller | Approved seller type | Image decision | Final reason |
| --- | --- | --- | --- | --- | --- | --- |
| `ADP-01` | `ADD_DISTINCT_WITH_NEW_SKU` | `DEV-XOAI-HOA-LOC-HUNG-001` | `hung.nv@farm.vn` | FARMER | `ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT` | preserve distinct seller-owned dashboard fixture |
| `ADP-02` | `ADD_DISTINCT_WITH_NEW_SKU` | `DEV-XA-LACH-THUY-CANH-MAI-001` | `mai.lt@farm.vn` | FARMER | `ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT` | preserve distinct seller-owned dashboard fixture |
| `ADP-03` | `ADD_DISTINCT_WITH_NEW_SKU` | `DEV-DUA-LUOI-NHAT-TUAN-001` | `tuan.pq@farm.vn` | FARMER | `ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT` | distinct business fixture approved |
| `ADP-04` | `ADD_DISTINCT_WITH_NEW_SKU` | `DEV-GAO-ST25-HTX-DALAT-001` | `htx.dalat@coop.vn` | COOPERATIVE | `ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT` | preserve distinct seller-owned dashboard fixture |
| `ADP-05` | `ADD_DISTINCT_WITH_NEW_SKU` | `DEV-CAI-BO-XOI-HUU-CO-HTX-DALAT-001` | `htx.dalat@coop.vn` | COOPERATIVE | `ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT` | distinct business fixture approved |
| `ADP-06` | `ADD_DISTINCT_WITH_NEW_SKU` | `DEV-BUOI-DA-XANH-HTX-TIEN-GIANG-001` | `htx.tiengiang@coop.vn` | COOPERATIVE | `ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT` | neither semantic candidate preserves seller ownership |
| `ADP-07` | `ADD_DISTINCT_WITH_NEW_SKU` | `DEV-GAO-LUT-HUU-CO-XNK-MEKONG-001` | `xnk.mekong@ent.vn` | ENTERPRISE | `ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT` | retain seller and align inconsistent source seller type to canonical User role |
| `ADP-08` | `ADD_DISTINCT_WITH_NEW_SKU` | `DEV-CA-PHE-ROBUSTA-AGRI-TECH-001` | `agri.tech@ent.vn` | ENTERPRISE | `ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT` | retain seller and align inconsistent source seller type to canonical User role |
| `ADP-09` | `RETIRE` | none | `phanbon.xanh@sup.vn` | SUPPLIER | `RETIRE_WITH_PARENT_PRODUCT` | source omits required non-null farming type and invented payload is rejected |
| `ADP-10` | `RETIRE` | none | `phanbon.xanh@sup.vn` | SUPPLIER | `RETIRE_WITH_PARENT_PRODUCT` | source omits required non-null farming type and invented payload is rejected |

```text
ADP_01_DECISION=ADD_DISTINCT_WITH_NEW_SKU
ADP_01_APPROVED_SKU=DEV-XOAI-HOA-LOC-HUNG-001
ADP_02_DECISION=ADD_DISTINCT_WITH_NEW_SKU
ADP_02_APPROVED_SKU=DEV-XA-LACH-THUY-CANH-MAI-001
ADP_03_DECISION=ADD_DISTINCT_WITH_NEW_SKU
ADP_03_APPROVED_SKU=DEV-DUA-LUOI-NHAT-TUAN-001
ADP_04_DECISION=ADD_DISTINCT_WITH_NEW_SKU
ADP_04_APPROVED_SKU=DEV-GAO-ST25-HTX-DALAT-001
ADP_05_DECISION=ADD_DISTINCT_WITH_NEW_SKU
ADP_05_APPROVED_SKU=DEV-CAI-BO-XOI-HUU-CO-HTX-DALAT-001
ADP_06_DECISION=ADD_DISTINCT_WITH_NEW_SKU
ADP_06_APPROVED_SKU=DEV-BUOI-DA-XANH-HTX-TIEN-GIANG-001
ADP_07_DECISION=ADD_DISTINCT_WITH_NEW_SKU
ADP_07_APPROVED_SKU=DEV-GAO-LUT-HUU-CO-XNK-MEKONG-001
ADP_07_APPROVED_SELLER_EMAIL=xnk.mekong@ent.vn
ADP_07_SELLER_TYPE_DECISION=ALIGN_WITH_CANONICAL_USER_ROLE_ENTERPRISE
ADP_07_APPROVED_SELLER_TYPE=ENTERPRISE
ADP_08_DECISION=ADD_DISTINCT_WITH_NEW_SKU
ADP_08_APPROVED_SKU=DEV-CA-PHE-ROBUSTA-AGRI-TECH-001
ADP_08_APPROVED_SELLER_EMAIL=agri.tech@ent.vn
ADP_08_SELLER_TYPE_DECISION=ALIGN_WITH_CANONICAL_USER_ROLE_ENTERPRISE
ADP_08_APPROVED_SELLER_TYPE=ENTERPRISE
ADP_09_DECISION=RETIRE
ADP_09_RETIRE_REASON=SOURCE_OMITS_REQUIRED_NON_NULL_FARMING_TYPE_AND_HUMAN_REVIEW_REJECTS_INVENTED_PAYLOAD
ADP_09_PRODUCTS_DEV_RUNTIME_ADDITION=NO
ADP_10_DECISION=RETIRE
ADP_10_RETIRE_REASON=SOURCE_OMITS_REQUIRED_NON_NULL_FARMING_TYPE_AND_HUMAN_REVIEW_REJECTS_INVENTED_PAYLOAD
ADP_10_PRODUCTS_DEV_RUNTIME_ADDITION=NO
INVENTED_FARMING_TYPE_ALLOWED=NO
```

### Approved Category, Variety, And Image Policies

The Admin source contains no Product category identity. The eight future
definitions preserve that absence as `categoryId=null`; they do not resolve a
category slug. The existing `products.dev.products` Categories REFERENCE
dependency remains because other canonical definitions use it.

The eight retained Products preserve source-backed `variety` values through a
future narrow owner write-contract extension to `variety: string | null`. This
requires no schema change and authorizes no invented variety values.

```text
ADMIN_DEV_PRODUCT_CATEGORY_POLICY=PRESERVE_SOURCE_ABSENCE_AS_NULL_CATEGORY
ADMIN_DEV_PRODUCT_CATEGORY_INVENTED_MAPPING=NO
ADMIN_DEV_PRODUCT_CATEGORY_DEPENDENCY_REQUIRED_FOR_D3_ADDITIONS=NO
PRODUCTS_DEV_EXISTING_CATEGORY_REFERENCE_DEPENDENCY_RETAINED=YES

PRODUCT_DEV_VARIETY_POLICY=EXTEND_OWNER_SEED_WRITE_CONTRACT_TO_PRESERVE_SOURCE_BACKED_VARIETY
PRODUCT_DEV_VARIETY_SCHEMA_CHANGE=NO
PRODUCT_DEV_VARIETY_INVENTED_VALUES=0

ADP_01_IMAGE_DECISION=ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT
ADP_02_IMAGE_DECISION=ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT
ADP_03_IMAGE_DECISION=ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT
ADP_04_IMAGE_DECISION=ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT
ADP_05_IMAGE_DECISION=ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT
ADP_06_IMAGE_DECISION=ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT
ADP_07_IMAGE_DECISION=ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT
ADP_08_IMAGE_DECISION=ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT
ADP_09_IMAGE_DECISION=RETIRE_WITH_PARENT_PRODUCT
ADP_10_IMAGE_DECISION=RETIRE_WITH_PARENT_PRODUCT
ADMIN_DEV_PRODUCT_IMAGE_STABLE_KEY=Product SKU + primary slot
ADMIN_DEV_PRODUCT_IMAGE_SOURCE_URLS_PRESERVED=8
EXISTING_CANONICAL_PRIMARY_IMAGES_REPLACED=0
ORPHAN_IMAGE_FIXTURES_CREATED=0
```

### Final Decision Counts And Future D3 Expectations

Current source remains 63 Products, 63 SKUs, and 61 managed primary Images in
this documentation-only PR. The 71/71/69 values are expected only after a
future authorized D3 implementation adds the eight retained Products and
Images.

```text
APPROVED_PRODUCTS_DEV_MAP_COUNT=0
APPROVED_PRODUCTS_DEV_ADDITION_COUNT=8
APPROVED_PRODUCTS_DEV_RETIRE_COUNT=2
PRODUCT_DECISION_UNRESOLVED_COUNT=0
PRODUCT_HUMAN_DECISION_REQUIRED_COUNT=0
ADMIN_DEV_PRODUCT_IDENTITIES_RESOLVED=YES

PRODUCT_IMAGE_MAP_EXISTING_COUNT=0
PRODUCT_IMAGE_ADD_PRIMARY_COUNT=8
PRODUCT_IMAGE_RETIRE_COUNT=2
PRODUCT_IMAGE_REPLACE_REQUIRES_HUMAN_COUNT=0
PRODUCT_IMAGE_UNRESOLVED_PARENT_COUNT=0
ADMIN_DEV_PRODUCT_IMAGE_IDENTITIES_RESOLVED=YES

PRODUCTS_DEV_CURRENT_RECORD_COUNT=63
PRODUCTS_DEV_CURRENT_SKU_COUNT=63
PRODUCTS_DEV_CURRENT_MANAGED_PRIMARY_IMAGE_COUNT=61
PRODUCTS_DEV_EXPECTED_POST_D3_RECORD_COUNT=71
PRODUCTS_DEV_EXPECTED_POST_D3_SKU_COUNT=71
PRODUCTS_DEV_EXPECTED_POST_D3_MANAGED_PRIMARY_IMAGE_COUNT=69
```

### Authorization After PR #125 Merge

The human decisions and collision-free SKUs remove the D3 decision blockers.
Authorization activates only after this D3A PR is merged; D3 runtime work is
still not started here. D4 remains blocked until that future implementation is
complete.

```text
SKU_COLLISION_CHECK=PASS_8_UNIQUE_AGAINST_63
P8_05D3A_PRODUCT_IDENTITY_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05D3_PRODUCTS_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05D3A_PR_125_MERGE
P8_05D3_PRODUCTS_BLOCKERS=NONE
P8_05D3_PRODUCTS_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_AUTHORIZED=NO
P8_05D4_BLOCKERS=P8_05D3_PRODUCTS_NOT_IMPLEMENTED
P8_05D_IMPLEMENTATION_STATUS=IN_PROGRESS

P8_05C2D2_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D3_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO

PRODUCT_RUNTIME_CHANGES=0
PRODUCT_IMAGE_RUNTIME_CHANGES=0
ADMIN_DEV_RUNTIME_CHANGES=0
C2D_BUSINESS_IMPLEMENTATION_CHANGES=0
C3_BUSINESS_IMPLEMENTATION_CHANGES=0
C4D_BUSINESS_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
```
