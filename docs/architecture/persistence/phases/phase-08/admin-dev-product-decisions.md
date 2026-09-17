# P8-05D3A Admin DEV Product Identity And Mapping Decisions

## Scope And Safety

This record is a static source and Git-history audit of the final ten Product
and ten Product Image fixtures then declared in
`src/database/seeds/admin-dev.seed.ts` (retired by the later D4 overlay).
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

## P8-05D3A1 Current Seller Contract Decision Overlay

This corrective human decision is the current implementation authority. It
supersedes only the PR #125 ADP-07 and ADP-08 add/ENTERPRISE decisions. The
earlier P8-05D3A audit and human-review blocks remain above as historical
evidence and are explicitly non-authoritative where they conflict with this
section.

Static source establishes that xnk.mekong@ent.vn and agri.tech@ent.vn are
canonical UserRole.ENTERPRISE fixtures. Product seller classification is a
separate contract: SellerType contains only FARMER, COOPERATIVE, and SUPPLIER,
the Product entity persists that enum, and the runtime seller policy maps only
those three supported seller roles. The Product domain therefore cannot
represent either Enterprise User as a Product seller without contract and
schema expansion.

Human review rejects that expansion, unsupported casts, policy bypasses,
seller substitution, mapping either fixture to supplier@agrilink.vn, or
pretending that the Enterprise User role is Product SellerType SUPPLIER.
ADP-07 and ADP-08 and their Images retire. Their previously approved SKUs were
never implemented and must not be reused for another fixture.

### Contract Evidence And Rejected Workarounds

~~~text
ADP_07_USER_ROLE=ENTERPRISE
ADP_08_USER_ROLE=ENTERPRISE
SELLER_TYPE_ENUM_VALUES=FARMER(farmer);COOPERATIVE(cooperative);SUPPLIER(supplier)
PRODUCT_SELLER_TYPE_ENTERPRISE_SUPPORTED=NO
PRODUCT_RUNTIME_ENTERPRISE_SELLER_SUPPORTED=NO

D3_ENTERPRISE_SELLER_CONTRACT_EXPANSION_AUTHORIZED=NO
D3_UNSUPPORTED_SELLER_CAST_AUTHORIZED=NO
D3_SELLER_IDENTITY_SUBSTITUTION_AUTHORIZED=NO
~~~

### Current Authoritative Product And Image Decisions

| Label | Current Product decision | Current SKU | Seller | Product SellerType | Current Image decision | Authority |
| --- | --- | --- | --- | --- | --- | --- |
| ADP-01 | ADD_DISTINCT_WITH_NEW_SKU | DEV-XOAI-HOA-LOC-HUNG-001 | hung.nv@farm.vn | FARMER | ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT | preserved from PR #125 |
| ADP-02 | ADD_DISTINCT_WITH_NEW_SKU | DEV-XA-LACH-THUY-CANH-MAI-001 | mai.lt@farm.vn | FARMER | ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT | preserved from PR #125 |
| ADP-03 | ADD_DISTINCT_WITH_NEW_SKU | DEV-DUA-LUOI-NHAT-TUAN-001 | tuan.pq@farm.vn | FARMER | ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT | preserved from PR #125 |
| ADP-04 | ADD_DISTINCT_WITH_NEW_SKU | DEV-GAO-ST25-HTX-DALAT-001 | htx.dalat@coop.vn | COOPERATIVE | ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT | preserved from PR #125 |
| ADP-05 | ADD_DISTINCT_WITH_NEW_SKU | DEV-CAI-BO-XOI-HUU-CO-HTX-DALAT-001 | htx.dalat@coop.vn | COOPERATIVE | ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT | preserved from PR #125 |
| ADP-06 | ADD_DISTINCT_WITH_NEW_SKU | DEV-BUOI-DA-XANH-HTX-TIEN-GIANG-001 | htx.tiengiang@coop.vn | COOPERATIVE | ADD_PRIMARY_IMAGE_FOR_NEW_PRODUCT | preserved from PR #125 |
| ADP-07 | RETIRE | none | xnk.mekong@ent.vn | unsupported Enterprise User role | RETIRE_WITH_PARENT_PRODUCT | supersedes PR #125 |
| ADP-08 | RETIRE | none | agri.tech@ent.vn | unsupported Enterprise User role | RETIRE_WITH_PARENT_PRODUCT | supersedes PR #125 |
| ADP-09 | RETIRE | none | phanbon.xanh@sup.vn | SUPPLIER | RETIRE_WITH_PARENT_PRODUCT | preserved from PR #125 |
| ADP-10 | RETIRE | none | phanbon.xanh@sup.vn | SUPPLIER | RETIRE_WITH_PARENT_PRODUCT | preserved from PR #125 |

~~~text
P8_05D3A_PR_125_ADP_07_DECISION_STATUS=SUPERSEDED
P8_05D3A_PR_125_ADP_08_DECISION_STATUS=SUPERSEDED
CURRENT_ADP_07_DECISION=RETIRE
CURRENT_ADP_08_DECISION=RETIRE

ADP_07_DECISION=RETIRE
ADP_07_RETIRE_REASON=CANONICAL_SELLER_USER_ROLE_ENTERPRISE_IS_UNSUPPORTED_BY_CURRENT_PRODUCT_SELLER_CONTRACT_AND_HUMAN_REVIEW_REJECTS_CONTRACT_EXPANSION_OR_SELLER_SUBSTITUTION
ADP_07_PREVIOUS_APPROVED_SKU=DEV-GAO-LUT-HUU-CO-XNK-MEKONG-001
ADP_07_PREVIOUS_APPROVED_SKU_STATUS=SUPERSEDED_NOT_IMPLEMENTED
ADP_07_OWNER_PRODUCT_CREATED=NO
ADP_07_IMAGE_DECISION=RETIRE_WITH_PARENT_PRODUCT
ADP_07_OWNER_IMAGE_CREATED=NO

ADP_08_DECISION=RETIRE
ADP_08_RETIRE_REASON=CANONICAL_SELLER_USER_ROLE_ENTERPRISE_IS_UNSUPPORTED_BY_CURRENT_PRODUCT_SELLER_CONTRACT_AND_HUMAN_REVIEW_REJECTS_CONTRACT_EXPANSION_OR_SELLER_SUBSTITUTION
ADP_08_PREVIOUS_APPROVED_SKU=DEV-CA-PHE-ROBUSTA-AGRI-TECH-001
ADP_08_PREVIOUS_APPROVED_SKU_STATUS=SUPERSEDED_NOT_IMPLEMENTED
ADP_08_OWNER_PRODUCT_CREATED=NO
ADP_08_IMAGE_DECISION=RETIRE_WITH_PARENT_PRODUCT
ADP_08_OWNER_IMAGE_CREATED=NO

ADP_09_DECISION=RETIRE
ADP_09_RETIRE_REASON=SOURCE_OMITS_REQUIRED_NON_NULL_FARMING_TYPE_AND_HUMAN_REVIEW_REJECTS_INVENTED_PAYLOAD
ADP_10_DECISION=RETIRE
ADP_10_RETIRE_REASON=SOURCE_OMITS_REQUIRED_NON_NULL_FARMING_TYPE_AND_HUMAN_REVIEW_REJECTS_INVENTED_PAYLOAD
~~~

### Final D3 Set, Counts, And Policies

The six active SKUs begin with DEV-, are at most 50 characters, are mutually
unique, and do not collide with the current 63 Product DEV SKUs. Current
runtime source remains unchanged at 63 Products, 63 SKUs, and 61 managed
primary Images. The 69/69/67 values are future D3 implementation expectations
only.

~~~text
APPROVED_D3_PRODUCT_SKUS=DEV-XOAI-HOA-LOC-HUNG-001;DEV-XA-LACH-THUY-CANH-MAI-001;DEV-DUA-LUOI-NHAT-TUAN-001;DEV-GAO-ST25-HTX-DALAT-001;DEV-CAI-BO-XOI-HUU-CO-HTX-DALAT-001;DEV-BUOI-DA-XANH-HTX-TIEN-GIANG-001
SUPERSEDED_D3_PRODUCT_SKUS=DEV-GAO-LUT-HUU-CO-XNK-MEKONG-001;DEV-CA-PHE-ROBUSTA-AGRI-TECH-001
ACTIVE_D3_SKU_COLLISION_CHECK=PASS_6_UNIQUE_AGAINST_63

APPROVED_PRODUCTS_DEV_MAP_COUNT=0
APPROVED_PRODUCTS_DEV_ADDITION_COUNT=6
APPROVED_PRODUCTS_DEV_RETIRE_COUNT=4
PRODUCT_DECISION_UNRESOLVED_COUNT=0
PRODUCT_HUMAN_DECISION_REQUIRED_COUNT=0
ADMIN_DEV_PRODUCT_IDENTITIES_RESOLVED=YES

PRODUCT_IMAGE_MAP_EXISTING_COUNT=0
PRODUCT_IMAGE_ADD_PRIMARY_COUNT=6
PRODUCT_IMAGE_RETIRE_COUNT=4
PRODUCT_IMAGE_REPLACE_REQUIRES_HUMAN_COUNT=0
PRODUCT_IMAGE_UNRESOLVED_PARENT_COUNT=0
ADMIN_DEV_PRODUCT_IMAGE_IDENTITIES_RESOLVED=YES

PRODUCTS_DEV_CURRENT_RECORD_COUNT=63
PRODUCTS_DEV_CURRENT_SKU_COUNT=63
PRODUCTS_DEV_CURRENT_MANAGED_PRIMARY_IMAGE_COUNT=61
PRODUCTS_DEV_EXPECTED_POST_D3_RECORD_COUNT=69
PRODUCTS_DEV_EXPECTED_POST_D3_SKU_COUNT=69
PRODUCTS_DEV_EXPECTED_POST_D3_MANAGED_PRIMARY_IMAGE_COUNT=67

ADMIN_DEV_PRODUCT_CATEGORY_POLICY=PRESERVE_SOURCE_ABSENCE_AS_NULL_CATEGORY
ADMIN_DEV_PRODUCT_CATEGORY_INVENTED_MAPPING=NO
PRODUCT_DEV_VARIETY_POLICY=EXTEND_OWNER_SEED_WRITE_CONTRACT_TO_PRESERVE_SOURCE_BACKED_VARIETY
PRODUCT_DEV_VARIETY_SCHEMA_CHANGE=NO
PRODUCT_DEV_VARIETY_INVENTED_VALUES=0
~~~

### Current Authorization And Boundaries

D3 authorization activates only after this corrective decision PR is
human-reviewed and merged. It authorizes six Products and six Images, not
Enterprise Product seller support. D4 remains a separate blocked slice.

~~~text
P8_05D3A_PRODUCT_IDENTITY_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_125
P8_05D3A1_PRODUCT_SELLER_CONTRACT_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05D3_PRODUCTS_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05D3_PRODUCTS_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05D3A1_MERGE
P8_05D3_PRODUCTS_BLOCKERS=NONE
P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_AUTHORIZED=NO
P8_05D4_BLOCKERS=P8_05D3_PRODUCTS_NOT_IMPLEMENTED
P8_05D_IMPLEMENTATION_STATUS=IN_PROGRESS

P8_05C2D2_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D3_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO

RUNTIME_FILES_CHANGED=0
PRODUCT_RUNTIME_CHANGES=0
PRODUCT_IMAGE_RUNTIME_CHANGES=0
ADMIN_DEV_RUNTIME_CHANGES=0
C2D_BUSINESS_IMPLEMENTATION_CHANGES=0
C3_BUSINESS_IMPLEMENTATION_CHANGES=0
C4D_BUSINESS_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~


## P8-05D3 Corrected Product Owner Migration Overlay

Merged PR #126 is the current seller-contract authority. This implementation
adds only ADP-01 through ADP-06 and their six source primary Images to the
existing products.dev.products owner. ADP-07 through ADP-10 and all four of
their Images are absent. The superseded PR #125 Enterprise SKUs remain
unimplemented.

The owner resolves five unique seller IDs from users.dev.users scalar outputs,
preserves null category and source-backed variety, preflights every declared
SKU before Product writes, and continues to publish product.id.by-sku. The
standalone Admin DEV source now performs owner-group orchestration only; its
guarded CLI, temporary DataSource, and nine entity registrations remain as D4
cleanup debt.

~~~text
P8_05D3A_PRODUCT_IDENTITY_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_125
P8_05D3A1_PRODUCT_SELLER_CONTRACT_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_126
P8_05D3_PRODUCTS_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05D3A1_MERGE
P8_05D3_PRODUCTS_BLOCKERS=NONE
P8_05D3_PRODUCTS_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW

APPROVED_D3_PRODUCT_SKUS=DEV-XOAI-HOA-LOC-HUNG-001;DEV-XA-LACH-THUY-CANH-MAI-001;DEV-DUA-LUOI-NHAT-TUAN-001;DEV-GAO-ST25-HTX-DALAT-001;DEV-CAI-BO-XOI-HUU-CO-HTX-DALAT-001;DEV-BUOI-DA-XANH-HTX-TIEN-GIANG-001
SUPERSEDED_D3_PRODUCT_SKUS_ABSENT=YES
ACTIVE_D3_SKU_COLLISION_CHECK=PASS_6_UNIQUE_AGAINST_63

ADP_07_OWNER_PRODUCT_CREATED=NO
ADP_08_OWNER_PRODUCT_CREATED=NO
ADP_09_OWNER_PRODUCT_CREATED=NO
ADP_10_OWNER_PRODUCT_CREATED=NO
ADP_07_OWNER_IMAGE_CREATED=NO
ADP_08_OWNER_IMAGE_CREATED=NO
ADP_09_OWNER_IMAGE_CREATED=NO
ADP_10_OWNER_IMAGE_CREATED=NO

PRODUCTS_DEV_PRE_D3_RECORD_COUNT=63
PRODUCTS_DEV_D3_ADDITION_COUNT=6
PRODUCTS_DEV_POST_D3_RECORD_COUNT=69
PRODUCTS_DEV_POST_D3_SKU_COUNT=69
PRODUCTS_DEV_DUPLICATE_SKU_COUNT=0

D3_PRODUCT_SELLER_REFERENCE_COUNT=6
D3_REQUIRED_UNIQUE_SELLER_EMAIL_COUNT=5
D3_REQUIRED_SELLER_OUTPUTS_AVAILABLE=YES
PRODUCT_SELLER_CONTRACT_CHANGES=0
SELLER_TYPE_ENUM_EXPANSION=0
SELLER_TYPE_CAST_WORKAROUNDS=0
SELLER_POLICY_BYPASSES=0

ADMIN_DEV_PRODUCT_CATEGORY_POLICY=PRESERVE_SOURCE_ABSENCE_AS_NULL_CATEGORY
D3_PRODUCT_CATEGORY_LOOKUPS=0
D3_PRODUCT_CATEGORY_IDS_NULL=6
PRODUCTS_DEV_EXISTING_CATEGORY_REFERENCE_DEPENDENCY_RETAINED=YES
PRODUCT_DEV_VARIETY_POLICY=EXTEND_OWNER_SEED_WRITE_CONTRACT_TO_PRESERVE_SOURCE_BACKED_VARIETY
PRODUCT_DEV_VARIETY_SCHEMA_CHANGE=NO
PRODUCT_DEV_VARIETY_INVENTED_VALUES=0

PRODUCTS_DEV_PRE_D3_MANAGED_PRIMARY_IMAGE_COUNT=61
PRODUCTS_DEV_D3_PRIMARY_IMAGE_ADDITION_COUNT=6
PRODUCTS_DEV_POST_D3_MANAGED_PRIMARY_IMAGE_COUNT=67
EXISTING_CANONICAL_PRIMARY_IMAGES_REPLACED=0
ORPHAN_IMAGE_FIXTURES_CREATED=0

PRODUCTS_DEV_OUTPUT_COUNT=69
PRODUCTS_DEV_OUTPUT_DUPLICATE_KEYS=0
NEW_SEED_OUTPUT_KINDS=0

ADMIN_DEV_STANDALONE_PRODUCT_BUSINESS_WRITES=0
ADMIN_DEV_STANDALONE_PRODUCT_REPOSITORY_WRITES=0
ADMIN_DEV_PRODUCT_CURRENT_LOOKUP_KEY=RETIRED
ADMIN_DEV_STANDALONE_PRODUCT_IMAGE_BUSINESS_WRITES=0
ADMIN_DEV_STANDALONE_PRODUCT_IMAGE_REPOSITORY_WRITES=0
ADMIN_DEV_PRODUCT_IMAGE_CURRENT_LOOKUP_KEY=RETIRED
ADMIN_DEV_PRODUCT_IMAGE_EXPLICIT_ANY_POST_D3=0
ADMIN_DEV_DIRECT_BUSINESS_WRITE_COUNT=0
ADMIN_DEV_DIRECT_BUSINESS_WRITE_TABLE_COUNT=0
ADMIN_DEV_DIRECT_BUSINESS_WRITE_OWNER_COUNT=0

ADMIN_DEV_TRANSITION_ENTITY_REGISTRATION_COUNT=9
ADMIN_DEV_USER_ENTITY_REGISTRATION_REFS=1
ADMIN_DEV_PROFILE_ENTITY_REGISTRATION_REFS=4
ADMIN_DEV_PRODUCT_ENTITY_REGISTRATION_REFS=1
ADMIN_DEV_PRODUCT_IMAGE_ENTITY_REGISTRATION_REFS=1
ADMIN_DEV_CATEGORY_ENTITY_REGISTRATION_REFS=1

ONE_SEED_OWNER_PER_PRODUCTS_TABLE=YES
NEW_PRODUCT_SEEDGROUPS=0
NEW_SEEDGROUPS=0
NEW_CROSS_OWNER_REPOSITORY_ACCESS=0
PRODUCT_DEV_CROSS_OWNER_USER_REPOSITORY_ACCESS=0
FRAMEWORK_CONTRACT_TYPEORM_IMPORTS=0

P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_AUTHORIZED=YES_AFTER_P8_05D3_MERGE
P8_05D4_BLOCKERS=NONE
P8_05D_IMPLEMENTATION_STATUS=IN_PROGRESS

P8_05C2D2_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D3_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO

PRODUCT_RUNTIME_CHANGES=6_OWNER_FIXTURES
PRODUCT_IMAGE_RUNTIME_CHANGES=6_OWNER_PRIMARY_IMAGES
ADMIN_DEV_RUNTIME_CHANGES=DIRECT_PRODUCT_AND_IMAGE_PERSISTENCE_RETIRED
C2D_BUSINESS_IMPLEMENTATION_CHANGES=0
C3_BUSINESS_IMPLEMENTATION_CHANGES=0
C4D_BUSINESS_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05D4 Standalone Admin DEV Retirement Overlay

Merged PR #127 is the current D3 authority. At base
`a42453d9ffba2678a11632d08043791784658685`, the standalone source had zero
direct business writes and no runtime consumer other than its guarded
`require.main` CLI. It was not imported by repository source, package scripts,
or application startup. Its two test references were static source tests.

D4 deletes that standalone source and its transition-only static spec. This
retires its CLI, private DataSource lifecycle, SeedOutputRegistry, actor
resolution, duplicate owner-group orchestration, and all nine transition entity
registrations. The existing database-free `seed-entrypoints.spec.ts` now proves
the file is absent, no non-test TypeScript source references the retired
entrypoint or its orchestration functions, package/startup remain free of it,
the canonical owner groups and `legacy.dev.remaining` remain present, and the
central blocked methods remain intact.

All earlier mentions of `admin-dev.seed.ts`, its standalone CLI command, and
its transition registrations in this document are `HISTORICAL_EVIDENCE`.
This overlay is the current instruction: the file and CLI no longer exist and
must not be run. The audit found no separate `STALE_RUNTIME_GUIDANCE` outside
the preserved historical Phase 8 record.

The Products factory added by PR #127 had no consumer after the standalone file
was removed, was introduced solely for that CLI, and was deleted. The Users,
Profiles, and Categories factories remain canonical composition APIs with two,
one, and two current consumers respectively. No owner fixture, output contract,
SeedGroup metadata, schema, migration, central DevSeedService runtime, or
`legacy.dev.remaining` behavior changed.

The current executable inventory is derived from the P8-01 inclusion rule,
not from its historical total: two REFERENCE sources, eleven DEV sources, two
bootstrap/startup composition sources, one TEST fixture source, and two
migration/rollout backfills. The eleven DEV sources comprise the Users group;
Profiles group and adapter; Products group and adapter; Reviews group and
adapter; Cooperative Members group and adapter; `DevSeedService`; and its
`legacy.dev.remaining` SeedGroup adapter. Framework contracts and static
specs are excluded.

~~~text
P8_05D1_USERS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_123
P8_05D2_PROFILES_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_124
P8_05D3A_PRODUCT_IDENTITY_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_125
P8_05D3A1_PRODUCT_SELLER_CONTRACT_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_126
P8_05D3_PRODUCTS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_127

ADMIN_DEV_SOURCE_IMPORT_COUNT_PRE_D4=0
ADMIN_DEV_SOURCE_NPM_SCRIPT_COUNT_PRE_D4=0
ADMIN_DEV_SOURCE_STARTUP_REFERENCE_COUNT_PRE_D4=0
ADMIN_DEV_SOURCE_TEST_REFERENCE_COUNT_PRE_D4=2
ADMIN_DEV_DIRECT_CLI_REACHABILITY_PRE_D4=YES

ADMIN_DEV_SOURCE_FILE_EXISTS=NO
ADMIN_DEV_DIRECT_CLI_EXISTS=NO
ADMIN_DEV_PRIVATE_DATASOURCE_EXISTS=NO
ADMIN_DEV_PRIVATE_DATASOURCE_INITIALIZE_PATH_EXISTS=NO
ADMIN_DEV_STANDALONE_ORCHESTRATION_EXISTS=NO

ADMIN_DEV_TRANSITION_ENTITY_REGISTRATION_COUNT=0
ADMIN_DEV_USER_ENTITY_REGISTRATION_REFS=0
ADMIN_DEV_PROFILE_ENTITY_REGISTRATION_REFS=0
ADMIN_DEV_PRODUCT_ENTITY_REGISTRATION_REFS=0
ADMIN_DEV_PRODUCT_IMAGE_ENTITY_REGISTRATION_REFS=0
ADMIN_DEV_CATEGORY_ENTITY_REGISTRATION_REFS=0
ADMIN_DEV_PRODUCT_CERTIFICATION_ENTITY_REGISTRATION_REFS=0

ADMIN_DEV_DIRECT_BUSINESS_WRITE_COUNT=0
ADMIN_DEV_DIRECT_BUSINESS_WRITE_TABLE_COUNT=0
ADMIN_DEV_DIRECT_BUSINESS_WRITE_OWNER_COUNT=0
ADMIN_DEV_STANDALONE_USER_WRITES=0
ADMIN_DEV_STANDALONE_PROFILE_WRITES=0
ADMIN_DEV_STANDALONE_PRODUCT_WRITES=0
ADMIN_DEV_STANDALONE_PRODUCT_IMAGE_WRITES=0

USERS_DEV_RECORD_COUNT=18
PROFILES_DEV_RECORD_COUNT=12
PRODUCTS_DEV_RECORD_COUNT=69
PRODUCTS_DEV_SKU_COUNT=69
PRODUCTS_DEV_MANAGED_PRIMARY_IMAGE_COUNT=67
USER_ID_BY_EMAIL_OUTPUT_RETAINED=YES
PRODUCT_ID_BY_SKU_OUTPUT_RETAINED=YES

USERS_DEV_GROUP_FACTORY_CONSUMER_COUNT=2
PROFILES_DEV_GROUP_FACTORY_CONSUMER_COUNT=1
CATEGORIES_REFERENCE_GROUP_FACTORY_CONSUMER_COUNT=2
PRODUCTS_DEV_GROUP_FACTORY_CONSUMER_COUNT=0
OWNER_FACTORIES_REMOVED=createProductDevelopmentSeedGroup

PRE_D4_ADMIN_DEV_EXECUTABLE_SOURCE_COUNT=1
POST_D4_ADMIN_DEV_EXECUTABLE_SOURCE_COUNT=0
POST_D4_REFERENCE_SEED_SOURCE_COUNT=2
POST_D4_DEV_SEED_SOURCE_COUNT=11
POST_D4_BOOTSTRAP_OR_STARTUP_SEED_SOURCE_COUNT=2
POST_D4_TEST_SEED_SOURCE_COUNT=1
POST_D4_MIGRATION_DATA_BACKFILL_SOURCE_COUNT=2
POST_D4_EXECUTABLE_SEED_SOURCE_COUNT=18

P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_AUTHORIZED=YES
P8_05D4_BLOCKERS=NONE
P8_05D_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW

P8_05C2D2_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D3_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO

CENTRAL_DEVSEEDSERVICE_RUNTIME_CHANGES=0
LEGACY_DEV_REMAINING_CHANGES=0
CENTRAL_BLOCKED_BUSINESS_WRITER_CHANGES=0
C2D_BUSINESS_IMPLEMENTATION_CHANGES=0
C3_BUSINESS_IMPLEMENTATION_CHANGES=0
PACKAGE_JSON_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05D Merged Handoff Overlay

PR #128 was human-reviewed, passed its Backend Quality Gate, and merged into
`develop` at `d39052254124b59250dfaa06d0b9d5d90cea8af6`. The preceding D4
pending-review overlay remains historical evidence. This P8-05D handoff records
the state entering C2D2A; it changes documentation status only. Its C2D2
authorization value is `HISTORICAL_AS_OF_P8_05D_HANDOFF` and is superseded by
the trailing P8-05C2D2A human-review overlay, which is the current authority.

~~~text
P8_05D1_USERS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_123
P8_05D2_PROFILES_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_124
P8_05D3_PRODUCTS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_127
P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_STATUS=IMPLEMENTED_BY_MERGED_PR_128
P8_05D_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_128

ADMIN_DEV_SOURCE_FILE_EXISTS=NO
ADMIN_DEV_DIRECT_BUSINESS_WRITE_COUNT=0
ADMIN_DEV_DIRECT_BUSINESS_WRITE_TABLE_COUNT=0
ADMIN_DEV_DIRECT_BUSINESS_WRITE_OWNER_COUNT=0

P8_05D_HANDOFF_C2D2_AUTHORIZATION_VALUE_STATUS=HISTORICAL_AS_OF_P8_05D_HANDOFF
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO

BUSINESS_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C2D2A Current Human Review Handoff

The earlier C2D2 authorization value in the P8-05D merged handoff records the
state at that handoff and is historical. The P8-05C2D2A human-review decision
in PR #129 is approved and is not reopened here. This trailing overlay is the
current authority and aligns this Admin DEV record with the
[current C2D2 decision record](dev-seed-c2d-decisions.md#21-p8-05c2d2a-human-review-decision-overlay).

~~~text
P8_05C2D2A_BULK_LISTING_IDENTITY_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW

BULK_LISTING_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
BULK_LISTING_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
CONTRIBUTION_DEV_FIXTURE_DISPOSITION=RETIRE_WITH_PARENT_BULK_LISTING

P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C2D2A_PR_129_MERGE
P8_05C2D2_BLOCKERS=NONE
P8_05C2D2_IMPLEMENTATION_STRATEGY=RETIRE_LEGACY_BULK_LISTING_AND_CONTRIBUTION_DEV_FIXTURES
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_STATUS=NOT_STARTED

P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=NO

P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO

P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
~~~

## P8-05C2D2 Current Implementation Handoff

The preceding P8-05C2D2A human-review handoff records the authorization state
before implementation and is now historical after merged PR #129. The current
authority is the retirement implementation overlay in the
[C2D decision record](dev-seed-c2d-decisions.md#22-p8-05c2d2-bulk-operations-retirement-implementation-overlay).
No Admin DEV Product decision or runtime behavior changes here.

~~~text
P8_05C2D2A_BULK_LISTING_IDENTITY_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_129
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_AUTHORIZED=YES
P8_05C2D2_BLOCKERS=NONE
P8_05C2D2_IMPLEMENTATION_STRATEGY=RETIRE_LEGACY_BULK_LISTING_AND_CONTRIBUTION_DEV_FIXTURES
P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
~~~

## P8-05C2D3A Final Current Authority

Merged PR #130 supersedes the historical C2D2 pending-review block immediately
above. Current evidence is in the
[C2D3A Harvest decision overlay](dev-seed-c2d-decisions.md#23-p8-05c2d3a-harvest-schedule-identity-decision-overlay).
No Admin DEV Product decision or runtime behavior changes here.

~~~text
P8_05C2D2_BULK_OPERATIONS_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_130
P8_05C2D3A_HARVEST_IDENTITY_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C2D3_HARVEST_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D3_BLOCKERS=HARVEST_PERSISTED_BUSINESS_ID_NONE_PROVEN;HARVEST_IMMUTABLE_COMPOSITE_NONE_PROVEN;HARVEST_DOMAIN_CARDINALITY_RULE_NONE_PROVEN;HARVEST_IDENTITY_POLICY_DECISION_REQUIRED;HS_01_DECISION_REQUIRED;HS_02_DECISION_REQUIRED;HS_03_DECISION_REQUIRED
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
~~~

## P8-05C2D3A1 Current Corrective Handoff

The preceding Harvest `NO` authorization is historical as of merged PR #131.
The current human decision approves fixture retirement after this corrective
PR merges; no Admin DEV Product decision, output, or runtime changes here. See
the [C2D3A1 decision overlay](dev-seed-c2d-decisions.md#25-p8-05c2d3a1-human-decision-corrective-overlay).

~~~text
P8_05C2D3A_PR_131_AUDIT_STATUS=MERGED_AUDIT_HISTORICAL_AUTHORITY
P8_05C2D3A_HARVEST_IDENTITY_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_131
HISTORICAL_P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=NO
P8_05C2D3A1_HUMAN_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
CURRENT_HARVEST_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
HARVEST_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
HARVEST_DEV_FIXTURE_DISPOSITION=RETIRE_FROM_ORDINARY_DEV_SEED
HARVEST_APPROVED_RETAIN_COUNT=0
HARVEST_APPROVED_RETIRE_COUNT=3
HARVEST_IDENTITIES_RESOLVED=NOT_REQUIRED_FIXTURES_RETIRED
HS_01_DECISION=RETIRE
HS_02_DECISION=RETIRE
HS_03_DECISION=RETIRE
HARVEST_NEW_DOMAIN_CODE_AUTHORIZED=NO
HARVEST_NEW_SEEDGROUP_REQUIRED=NO
HARVEST_OUTPUT_REQUIRED=NO
CURRENT_P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C2D3A1_MERGE
P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C2D3A1_MERGE
P8_05C2D3_BLOCKERS=NONE
P8_05C2D3_IMPLEMENTATION_STRATEGY=RETIRE_LEGACY_HARVEST_SCHEDULE_DEV_FIXTURES
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
RUNTIME_FILES_CHANGED=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C2D3 Current Implementation Handoff

Merged PR #132 supersedes the preceding pending-review corrective handoff.
Harvest retirement is implemented without changing Admin DEV Products or their
outputs. See the [C2D3 implementation overlay](dev-seed-c2d-decisions.md#26-p8-05c2d3-harvest-retirement-implementation-overlay).

~~~text
P8_05C2D3A_HARVEST_IDENTITY_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_131
P8_05C2D3A1_HUMAN_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_132
HARVEST_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
P8_05C2D3_HARVEST_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C2D3_HARVEST_IMPLEMENTATION_AUTHORIZED=YES
P8_05C2D3_BLOCKERS=NONE
CENTRAL_SEED_HARVEST_SCHEDULES_METHOD_EXISTS=NO
HARVEST_RESET_TARGET_EXISTS=NO
LEGACY_XOAI_PRODUCT_SCALAR_POST_C2D3_CONSUMER_COUNT=0
HARVEST_ONLY_LEGACY_PLUMBING_REMOVED=YES_PRODUCT_ARGUMENT_ALIAS_RESOLVER_LOOKUP_AND_DEPENDENCY
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
HARVEST_DOMAIN_RUNTIME_CHANGES=0
FORUM_BUSINESS_IMPLEMENTATION_CHANGES=0
ADS_BUSINESS_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C3B1 Human Review Current-Authority Overlay

This consistency overlay changes no Admin DEV Product decision. Forum human
review authorizes only future retirement after PR #134 merges. See the
[complete human decision](dev-seed-c3-decisions.md#18-p8-05c3b1-human-review-decision-overlay).

~~~text
P8_05C3B1_FORUM_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
FORUM_POST_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
FORUM_COMMENT_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
FORUM_LIKE_FIXTURE_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
FORUM_POST_IDENTITIES_RESOLVED=NOT_REQUIRED_FIXTURES_RETIRED
FORUM_COMMENT_IDENTITIES_RESOLVED=NOT_REQUIRED_FIXTURES_RETIRED
FORUM_COMMENT_PARENT_IDENTITY_RESOLVED=NOT_REQUIRED_PARENT_FIXTURES_RETIRED
FORUM_LIKE_ROW_IDENTITY_RESOLVED=YES
FORUM_LIKE_POLICY_RESOLVED=YES
P8_05C3B_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C3B1_PR_134_MERGE
P8_05C3B_BLOCKERS=NONE
P8_05C3B_IMPLEMENTATION_STRATEGY=RETIRE_LEGACY_FORUM_DEV_FIXTURES
P8_05C3B_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
ADMIN_DEV_IMPLEMENTATION_CHANGES=0
FORUM_BUSINESS_IMPLEMENTATION_CHANGES=0
ADS_BUSINESS_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C3B1 Current-Authority Consistency Overlay

This overlay changes no Admin DEV Product decision. It records only the merged
PR #133 handoff and current Forum audit boundary; the detailed authority is the
[C3B1 Forum audit](dev-seed-c3-decisions.md#17-p8-05c3b1-forum-identity-and-fixture-policy-audit).

~~~text
P8_05C2D3_HARVEST_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_133
P8_05C3B1_FORUM_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3B_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C3B_IMPLEMENTATION_AUTHORIZED=NO
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
ADMIN_DEV_IMPLEMENTATION_CHANGES=0
FORUM_BUSINESS_IMPLEMENTATION_CHANGES=0
ADS_BUSINESS_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C3B1 Human Review Trailing Authority

This trailing consistency record supersedes the pre-decision C3B1 audit state
without changing any Admin DEV Product decision. See the
[human decision overlay](dev-seed-c3-decisions.md#18-p8-05c3b1-human-review-decision-overlay).

~~~text
P8_05C3B1_FORUM_DECISION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
FORUM_POST_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
FORUM_COMMENT_IDENTITY_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
FORUM_LIKE_FIXTURE_POLICY_DECISION=RETIRE_CURRENT_DEV_FIXTURES
FORUM_POST_IDENTITIES_RESOLVED=NOT_REQUIRED_FIXTURES_RETIRED
FORUM_COMMENT_IDENTITIES_RESOLVED=NOT_REQUIRED_FIXTURES_RETIRED
FORUM_COMMENT_PARENT_IDENTITY_RESOLVED=NOT_REQUIRED_PARENT_FIXTURES_RETIRED
FORUM_LIKE_ROW_IDENTITY_RESOLVED=YES
FORUM_LIKE_POLICY_RESOLVED=YES
P8_05C3B_IMPLEMENTATION_AUTHORIZED=YES_AFTER_P8_05C3B1_PR_134_MERGE
P8_05C3B_BLOCKERS=NONE
P8_05C3B_IMPLEMENTATION_STRATEGY=RETIRE_LEGACY_FORUM_DEV_FIXTURES
P8_05C3B_IMPLEMENTATION_STATUS=NOT_STARTED
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
ADMIN_DEV_IMPLEMENTATION_CHANGES=0
RUNTIME_FILES_CHANGED=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~

## P8-05C3B Forum Retirement Current-Authority Overlay

This consistency overlay changes no Admin DEV Product decision. Detailed Forum
evidence is in the
[C3B implementation overlay](dev-seed-c3-decisions.md#19-p8-05c3b-forum-retirement-implementation-overlay).

~~~text
P8_05C3B1_FORUM_DECISION_STATUS=IMPLEMENTED_BY_MERGED_PR_134
P8_05C3B_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW
P8_05C3B_IMPLEMENTATION_AUTHORIZED=YES
P8_05C3B_BLOCKERS=NONE
P8_05C3B_IMPLEMENTATION_STRATEGY=RETIRE_LEGACY_FORUM_DEV_FIXTURES
P8_05C3C_IMPLEMENTATION_AUTHORIZED=NO
P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO
ADMIN_DEV_IMPLEMENTATION_CHANGES=0
FORUM_DOMAIN_RUNTIME_CHANGES=0
ADS_BUSINESS_IMPLEMENTATION_CHANGES=0
SCHEMA_CHANGES=0
MIGRATIONS_CREATED=0
~~~
