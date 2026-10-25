import { PrismaClient, Role, ChannelType, ChannelStatus, MoveReason } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/inventory?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting idempotent database seed...");

  // 1. Clear all tables in dependency order
  console.log("🧹 Clearing existing data in dependency order...");
  await prisma.stockMovement.deleteMany();
  await prisma.bundleComponent.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.user.deleteMany();
  await prisma.account.deleteMany();

  // 2. Create Account & User
  console.log("🏢 Creating account and user...");
  const account = await prisma.account.create({
    data: {
      name: "Acme Goods Co.",
    },
  });

  const user = await prisma.user.create({
    data: {
      accountId: account.id,
      name: "Anmol K.",
      email: "anmol@acmegoods.co",
      role: Role.OWNER,
    },
  });

  // 3. Create Warehouses
  console.log("🏭 Creating warehouses...");
  const mainWh = await prisma.warehouse.create({
    data: {
      accountId: account.id,
      name: "Main warehouse",
      kind: "Own",
      sortOrder: 1,
    },
  });

  const east3plWh = await prisma.warehouse.create({
    data: {
      accountId: account.id,
      name: "3PL East",
      kind: "3PL",
      sortOrder: 2,
    },
  });

  const retailShopWh = await prisma.warehouse.create({
    data: {
      accountId: account.id,
      name: "Retail shop",
      kind: "Store",
      sortOrder: 3,
    },
  });

  // 4. Create Sales Channels
  console.log("🌐 Creating sales channels...");
  const shopifyUS = await prisma.channel.create({
    data: {
      accountId: account.id,
      name: "Shopify US",
      type: ChannelType.SHOPIFY,
      storeRef: "acme-goods-us.myshopify.com",
      status: ChannelStatus.LIVE,
      lastSyncedAt: new Date(Date.now() - 12 * 60 * 1000), // 12 mins ago
    },
  });

  const shopifyEU = await prisma.channel.create({
    data: {
      accountId: account.id,
      name: "Shopify EU",
      type: ChannelType.SHOPIFY,
      storeRef: "acme-goods-eu.myshopify.com",
      status: ChannelStatus.LIVE,
      lastSyncedAt: new Date(Date.now() - 25 * 60 * 1000), // 25 mins ago
    },
  });

  const amazonFBM = await prisma.channel.create({
    data: {
      accountId: account.id,
      name: "Amazon FBM",
      type: ChannelType.AMAZON,
      storeRef: "amazon-seller-central-us",
      status: ChannelStatus.LIVE,
      lastSyncedAt: new Date(Date.now() - 8 * 60 * 1000), // 8 mins ago
    },
  });

  const etsyReview = await prisma.channel.create({
    data: {
      accountId: account.id,
      name: "Etsy",
      type: ChannelType.ETSY,
      storeRef: "etsy.com/shop/AcmeGoodsStudio",
      status: ChannelStatus.REVIEW,
      lastSyncedAt: new Date(Date.now() - 140 * 60 * 1000), // 2.3 hours ago
    },
  });

  const wooCommerce = await prisma.channel.create({
    data: {
      accountId: account.id,
      name: "WooCommerce",
      type: ChannelType.WOOCOMMERCE,
      storeRef: "acmegoods.co/shop",
      status: ChannelStatus.LIVE,
      lastSyncedAt: new Date(Date.now() - 4 * 60 * 1000), // 4 mins ago
    },
  });

  // 5. Create 8 Products + 1 internal component (PKG-SLEEVE)
  console.log("📦 Creating products and stock levels...");
  const ceramicMug = await prisma.product.create({
    data: {
      accountId: account.id,
      sku: "CER-MUG-COB",
      name: "Ceramic Mug — Cobalt",
      barcode: "85001234501",
      category: "Drinkware",
      swatch: "#2A44C9",
      isBundle: false,
      costCents: 650,
      stockLevels: {
        create: [
          {
            warehouseId: mainWh.id,
            onHand: 12,
            booked: 3,
            incoming: 25,
            closeAt: 2,
            minLevel: 15, // available = 9 <= minLevel -> Low stock!
            stocked: true,
          },
          {
            warehouseId: east3plWh.id,
            onHand: 4,
            booked: 1,
            incoming: 0,
            closeAt: 0,
            minLevel: 5,
            stocked: true,
          },
          {
            warehouseId: retailShopWh.id,
            onHand: 0,
            booked: 0,
            incoming: 0,
            closeAt: 0,
            minLevel: 0,
            stocked: false,
          },
        ],
      },
    },
  });

  const linenTote = await prisma.product.create({
    data: {
      accountId: account.id,
      sku: "TOT-LIN-NAT",
      name: "Linen Tote Bag — Natural",
      barcode: "85001234502",
      category: "Bags",
      swatch: "#D4C5B9",
      isBundle: false,
      costCents: 850,
      stockLevels: {
        create: [
          {
            warehouseId: mainWh.id,
            onHand: 8,
            booked: 1,
            incoming: 50,
            closeAt: 0,
            minLevel: 10, // available = 7 <= minLevel -> Low stock!
            stocked: true,
          },
          {
            warehouseId: east3plWh.id,
            onHand: 0,
            booked: 0,
            incoming: 0,
            closeAt: 0,
            minLevel: 0,
            stocked: true,
          },
          {
            warehouseId: retailShopWh.id,
            onHand: 0,
            booked: 0,
            incoming: 0,
            closeAt: 0,
            minLevel: 0,
            stocked: true,
          },
        ],
      },
    },
  });

  const brassPen = await prisma.product.create({
    data: {
      accountId: account.id,
      sku: "PEN-BRS-001",
      name: "Brass Ballpoint Pen",
      barcode: "85001234503",
      category: "Stationery",
      swatch: "#C5A059",
      isBundle: false,
      costCents: 1200,
      stockLevels: {
        create: [
          {
            warehouseId: mainWh.id,
            onHand: 145,
            booked: 12,
            incoming: 0,
            closeAt: 5,
            minLevel: 20,
            stocked: true,
          },
          {
            warehouseId: east3plWh.id,
            onHand: 20,
            booked: 0,
            incoming: 0,
            closeAt: 0,
            minLevel: 5,
            stocked: true,
          },
          {
            warehouseId: retailShopWh.id,
            onHand: 15,
            booked: 0,
            incoming: 0,
            closeAt: 0,
            minLevel: 5,
            stocked: true,
          },
        ],
      },
    },
  });

  const slateNotebook = await prisma.product.create({
    data: {
      accountId: account.id,
      sku: "NBK-SLT-A5",
      name: "Hardcover Grid Notebook — Slate",
      barcode: "85001234504",
      category: "Stationery",
      swatch: "#4A5568",
      isBundle: false,
      costCents: 950,
      stockLevels: {
        create: [
          {
            warehouseId: mainWh.id,
            onHand: 88,
            booked: 4,
            incoming: 100,
            closeAt: 0,
            minLevel: 15,
            stocked: true,
          },
          {
            warehouseId: east3plWh.id,
            onHand: 10,
            booked: 0,
            incoming: 0,
            closeAt: 0,
            minLevel: 5,
            stocked: true,
          },
          {
            warehouseId: retailShopWh.id,
            onHand: 6,
            booked: 0,
            incoming: 0,
            closeAt: 0,
            minLevel: 5,
            stocked: true,
          },
        ],
      },
    },
  });

  const senchaTea = await prisma.product.create({
    data: {
      accountId: account.id,
      sku: "TEA-SNC-100",
      name: "Organic Sencha Green Tea Tin",
      barcode: "85001234505",
      category: "Pantry",
      swatch: "#48BB78",
      isBundle: false,
      costCents: 550,
      stockLevels: {
        create: [
          {
            warehouseId: mainWh.id,
            onHand: 62,
            booked: 6,
            incoming: 0,
            closeAt: 0,
            minLevel: 15,
            stocked: true,
          },
          {
            warehouseId: east3plWh.id,
            onHand: 15,
            booked: 0,
            incoming: 0,
            closeAt: 0,
            minLevel: 5,
            stocked: true,
          },
          {
            warehouseId: retailShopWh.id,
            onHand: 8,
            booked: 0,
            incoming: 0,
            closeAt: 0,
            minLevel: 5,
            stocked: true,
          },
        ],
      },
    },
  });

  const cedarCoaster = await prisma.product.create({
    data: {
      accountId: account.id,
      sku: "CST-CDR-04",
      name: "Cedar Coaster Set (4-pack)",
      barcode: "85001234506",
      category: "Home goods",
      swatch: "#A0522D",
      isBundle: false,
      costCents: 720,
      stockLevels: {
        create: [
          {
            warehouseId: mainWh.id,
            onHand: 34,
            booked: 2,
            incoming: 0,
            closeAt: 0,
            minLevel: 10,
            stocked: true,
          },
          {
            warehouseId: east3plWh.id,
            onHand: 8,
            booked: 0,
            incoming: 0,
            closeAt: 0,
            minLevel: 5,
            stocked: true,
          },
          {
            warehouseId: retailShopWh.id,
            onHand: 0,
            booked: 0,
            incoming: 0,
            closeAt: 0,
            minLevel: 0,
            stocked: false,
          },
        ],
      },
    },
  });

  const coldBrewBottle = await prisma.product.create({
    data: {
      accountId: account.id,
      sku: "BTL-GLS-500",
      name: "Cold Brew Glass Bottle 500ml",
      barcode: "85001234507",
      category: "Drinkware",
      swatch: "#805AD5",
      isBundle: false,
      costCents: 480,
      stockLevels: {
        create: [
          {
            warehouseId: mainWh.id,
            onHand: 28,
            booked: 0,
            incoming: 40,
            closeAt: 0,
            minLevel: 10,
            stocked: true,
          },
          {
            warehouseId: east3plWh.id,
            onHand: 6,
            booked: 0,
            incoming: 0,
            closeAt: 0,
            minLevel: 5,
            stocked: true,
          },
          {
            warehouseId: retailShopWh.id,
            onHand: 4,
            booked: 0,
            incoming: 0,
            closeAt: 0,
            minLevel: 0,
            stocked: true,
          },
        ],
      },
    },
  });

  const deskMat = await prisma.product.create({
    data: {
      accountId: account.id,
      sku: "MAT-DSK-MID",
      name: "Minimalist Desk Mat — Midnight",
      barcode: "85001234508",
      category: "Office",
      swatch: "#1A202C",
      isBundle: false,
      costCents: 1400,
      stockLevels: {
        create: [
          {
            warehouseId: mainWh.id,
            onHand: 0,
            booked: 0,
            incoming: 30,
            closeAt: 0,
            minLevel: 5, // available = 0 -> Sold out!
            stocked: true,
          },
          {
            warehouseId: east3plWh.id,
            onHand: 0,
            booked: 0,
            incoming: 0,
            closeAt: 0,
            minLevel: 0,
            stocked: true,
          },
          {
            warehouseId: retailShopWh.id,
            onHand: 0,
            booked: 0,
            incoming: 0,
            closeAt: 0,
            minLevel: 0,
            stocked: false,
          },
        ],
      },
    },
  });

  // Internal Component (User note 5): Gift Box Sleeve PKG-SLEEVE (540 in Main)
  const giftSleeve = await prisma.product.create({
    data: {
      accountId: account.id,
      sku: "PKG-SLEEVE",
      name: "Gift Box Sleeve",
      barcode: "85001234509",
      category: "Packaging",
      swatch: "#718096",
      isBundle: false,
      costCents: 120,
      stockLevels: {
        create: [
          {
            warehouseId: mainWh.id,
            onHand: 540,
            booked: 0,
            incoming: 0,
            closeAt: 0,
            minLevel: 50,
            stocked: true,
          },
        ],
      },
    },
  });

  // 6. Create 5 Bundles (isBundle=true, NO StockLevel rows of their own)
  console.log("🎁 Creating bundles and bundle components...");
  const bundleMorning = await prisma.product.create({
    data: {
      accountId: account.id,
      sku: "BND-MORNING",
      name: "Morning Ritual Set",
      category: "Bundles",
      swatch: "#EBF8FF",
      isBundle: true,
      costCents: 1920,
    },
  });

  const bundlePicnic = await prisma.product.create({
    data: {
      accountId: account.id,
      sku: "BND-PICNIC",
      name: "Weekend Picnic Pack",
      category: "Bundles",
      swatch: "#FEFCBF",
      isBundle: true,
      costCents: 1810,
    },
  });

  const bundleExecDesk = await prisma.product.create({
    data: {
      accountId: account.id,
      sku: "BND-EXEC-DESK",
      name: "Executive Desk Suite",
      category: "Bundles",
      swatch: "#EDF2F7",
      isBundle: true,
      costCents: 3550,
    },
  });

  const bundleTeaDuo = await prisma.product.create({
    data: {
      accountId: account.id,
      sku: "BND-TEA-DUO",
      name: "Artisan Tea Duo Box",
      category: "Bundles",
      swatch: "#C6F6D5",
      isBundle: true,
      costCents: 1770,
    },
  });

  const bundleStudyKit = await prisma.product.create({
    data: {
      accountId: account.id,
      sku: "BND-STUDY-KIT",
      name: "Study Essentials Kit",
      category: "Bundles",
      swatch: "#FED7D7",
      isBundle: true,
      costCents: 2800,
    },
  });

  // Bundle components mapping
  await prisma.bundleComponent.createMany({
    data: [
      // Morning Ritual: 1 mug + 1 tea tin + 1 coaster set
      { bundleId: bundleMorning.id, componentId: ceramicMug.id, qty: 1 },
      { bundleId: bundleMorning.id, componentId: senchaTea.id, qty: 1 },
      { bundleId: bundleMorning.id, componentId: cedarCoaster.id, qty: 1 },

      // Weekend Picnic: 2 cold brew bottles + 1 tote
      { bundleId: bundlePicnic.id, componentId: coldBrewBottle.id, qty: 2 },
      { bundleId: bundlePicnic.id, componentId: linenTote.id, qty: 1 },

      // Executive Desk Suite: 1 pen + 1 notebook + 1 desk mat
      { bundleId: bundleExecDesk.id, componentId: brassPen.id, qty: 1 },
      { bundleId: bundleExecDesk.id, componentId: slateNotebook.id, qty: 1 },
      { bundleId: bundleExecDesk.id, componentId: deskMat.id, qty: 1 },

      // Artisan Tea Duo Box: 2 tea tins + 1 sleeve + 1 coaster set
      { bundleId: bundleTeaDuo.id, componentId: senchaTea.id, qty: 2 },
      { bundleId: bundleTeaDuo.id, componentId: giftSleeve.id, qty: 1 },
      { bundleId: bundleTeaDuo.id, componentId: cedarCoaster.id, qty: 1 },

      // Study Essentials Kit: 1 mug + 1 notebook + 1 pen
      { bundleId: bundleStudyKit.id, componentId: ceramicMug.id, qty: 1 },
      { bundleId: bundleStudyKit.id, componentId: slateNotebook.id, qty: 1 },
      { bundleId: bundleStudyKit.id, componentId: brassPen.id, qty: 1 },
    ],
  });

  // 7. Create Listings
  console.log("🔗 Creating listings linking products to channels...");
  await prisma.listing.createMany({
    data: [
      // Ceramic Mug listings (including Etsy review discrepancy: lastPushedQty=12, channelQty=15)
      {
        channelId: shopifyUS.id,
        productId: ceramicMug.id,
        externalId: "SP-MUG-001",
        title: "Ceramic Coffee Mug - Cobalt Blue (12oz)",
        isPrimary: true,
        lastPushedQty: 12,
        channelQty: 12,
        lastPushedAt: new Date(Date.now() - 45 * 60 * 1000),
      },
      {
        channelId: shopifyEU.id,
        productId: ceramicMug.id,
        externalId: "SPEU-MUG-001",
        title: "Ceramic Coffee Mug - Cobalt Blue",
        isPrimary: false,
        lastPushedQty: 12,
        channelQty: 12,
        lastPushedAt: new Date(Date.now() - 60 * 60 * 1000),
      },
      {
        channelId: amazonFBM.id,
        productId: ceramicMug.id,
        externalId: "AMZ-B08XYZMUG",
        title: "Artisan Ceramic Mug 12oz Heavyweight Cobalt",
        isPrimary: false,
        lastPushedQty: 12,
        channelQty: 12,
        lastPushedAt: new Date(Date.now() - 90 * 60 * 1000),
      },
      {
        // THIS IS THE ETSY DISCREPANCY FROM USER INSTRUCTIONS
        channelId: etsyReview.id,
        productId: ceramicMug.id,
        externalId: "ETSY-9923812",
        title: "Handcrafted Minimal Ceramic Mug, Cobalt Glaze",
        isPrimary: false,
        lastPushedQty: 12,
        channelQty: 15, // Differs from lastPushedQty -> "Changed outside app · review"
        lastPushedAt: new Date(Date.now() - 180 * 60 * 1000),
      },
      {
        channelId: wooCommerce.id,
        productId: ceramicMug.id,
        externalId: "WC-5521",
        title: "Cobalt Ceramic Mug",
        isPrimary: false,
        lastPushedQty: 12,
        channelQty: 12,
        lastPushedAt: new Date(Date.now() - 30 * 60 * 1000),
      },

      // Linen Tote
      {
        channelId: shopifyUS.id,
        productId: linenTote.id,
        externalId: "SP-TOTE-001",
        title: "Heavyweight Linen Everyday Tote - Natural",
        isPrimary: true,
        lastPushedQty: 7,
        channelQty: 7,
        lastPushedAt: new Date(Date.now() - 60 * 60 * 1000),
      },
      {
        channelId: amazonFBM.id,
        productId: linenTote.id,
        externalId: "AMZ-B08XYZTOTE",
        title: "Eco Friendly Linen Tote Bag 100% Organic",
        isPrimary: false,
        lastPushedQty: 7,
        channelQty: 7,
        lastPushedAt: new Date(Date.now() - 90 * 60 * 1000),
      },
      {
        channelId: wooCommerce.id,
        productId: linenTote.id,
        externalId: "WC-5522",
        title: "Linen Tote Bag — Natural",
        isPrimary: false,
        lastPushedQty: 7,
        channelQty: 7,
        lastPushedAt: new Date(Date.now() - 15 * 60 * 1000),
      },

      // Brass Pen
      {
        channelId: shopifyUS.id,
        productId: brassPen.id,
        externalId: "SP-PEN-001",
        title: "Solid Brass Heavyweight Pen - 0.5mm Gel",
        isPrimary: true,
        lastPushedQty: 153,
        channelQty: 153,
        lastPushedAt: new Date(Date.now() - 30 * 60 * 1000),
      },
      {
        channelId: amazonFBM.id,
        productId: brassPen.id,
        externalId: "AMZ-B08XYZPEN",
        title: "Solid Brass EDC Rollerball Pen Refillable",
        isPrimary: false,
        lastPushedQty: 153,
        channelQty: 153,
        lastPushedAt: new Date(Date.now() - 120 * 60 * 1000),
      },

      // Notebook
      {
        channelId: shopifyUS.id,
        productId: slateNotebook.id,
        externalId: "SP-NBK-001",
        title: "Hardcover Dot Grid Journal A5 - Slate Grey",
        isPrimary: true,
        lastPushedQty: 100,
        channelQty: 100,
        lastPushedAt: new Date(Date.now() - 20 * 60 * 1000),
      },
      {
        channelId: shopifyEU.id,
        productId: slateNotebook.id,
        externalId: "SPEU-NBK-001",
        title: "Hardcover Dot Grid Journal A5",
        isPrimary: false,
        lastPushedQty: 100,
        channelQty: 100,
        lastPushedAt: new Date(Date.now() - 25 * 60 * 1000),
      },

      // Tea
      {
        channelId: shopifyUS.id,
        productId: senchaTea.id,
        externalId: "SP-TEA-001",
        title: "Single Origin Sencha Green Tea 100g Loose Leaf",
        isPrimary: true,
        lastPushedQty: 71,
        channelQty: 71,
        lastPushedAt: new Date(Date.now() - 10 * 60 * 1000),
      },
      {
        channelId: wooCommerce.id,
        productId: senchaTea.id,
        externalId: "WC-5523",
        title: "Organic Sencha Green Tea Tin",
        isPrimary: false,
        lastPushedQty: 71,
        channelQty: 71,
        lastPushedAt: new Date(Date.now() - 12 * 60 * 1000),
      },

      // Coasters
      {
        channelId: shopifyUS.id,
        productId: cedarCoaster.id,
        externalId: "SP-CST-001",
        title: "Japanese Cedar Drink Coasters (Set of 4)",
        isPrimary: true,
        lastPushedQty: 40,
        channelQty: 40,
        lastPushedAt: new Date(Date.now() - 40 * 60 * 1000),
      },

      // Cold brew bottle
      {
        channelId: shopifyUS.id,
        productId: coldBrewBottle.id,
        externalId: "SP-BTL-001",
        title: "Borosilicate Cold Brew Glass Bottle with Silicone Cap",
        isPrimary: true,
        lastPushedQty: 38,
        channelQty: 38,
        lastPushedAt: new Date(Date.now() - 15 * 60 * 1000),
      },

      // Desk mat (Sold out)
      {
        channelId: shopifyUS.id,
        productId: deskMat.id,
        externalId: "SP-MAT-001",
        title: "Dual-Sided Vegan Leather Desk Pad - Midnight",
        isPrimary: true,
        lastPushedQty: 0,
        channelQty: 0,
        lastPushedAt: new Date(Date.now() - 50 * 60 * 1000),
      },

      // Bundles on channels
      {
        channelId: shopifyUS.id,
        productId: bundleMorning.id,
        externalId: "SP-BND-MORN",
        title: "The Morning Ritual Gift Box",
        isPrimary: true,
        lastPushedQty: 12,
        channelQty: 12,
        lastPushedAt: new Date(Date.now() - 35 * 60 * 1000),
      },
      {
        channelId: shopifyUS.id,
        productId: bundlePicnic.id,
        externalId: "SP-BND-PICNIC",
        title: "Weekend Picnic Set",
        isPrimary: true,
        lastPushedQty: 7,
        channelQty: 7,
        lastPushedAt: new Date(Date.now() - 35 * 60 * 1000),
      },
      {
        channelId: shopifyUS.id,
        productId: bundleTeaDuo.id,
        externalId: "SP-BND-TEADUO",
        title: "Artisan Tea Duo Gift Box",
        isPrimary: true,
        lastPushedQty: 35,
        channelQty: 35,
        lastPushedAt: new Date(Date.now() - 35 * 60 * 1000),
      },
    ],
  });

  // 8. Generate 40 StockMovements spread over the last 30 days
  // Ensure that walking backwards from today's onHand never dips below 0!
  console.log("📜 Generating 40 StockMovements with backwards walkback integrity...");

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // We explicitly schedule 40 movements across the last 30 days with verified non-negative cumulative values.
  const movementsData: Array<{
    productId: string;
    warehouseId: string;
    delta: number;
    reason: MoveReason;
    refLabel: string;
    note?: string;
    userId: string;
    daysAgo: number;
    hoursOffset: number;
  }> = [
    // --- Ceramic Mug CER-MUG-COB (Main warehouse onHand today = 12) ---
    // Past trajectory: 0 -> (+30) -> 30 -> (-4) -> 26 -> (-3) -> 23 -> (+1) -> 24 -> (-5) -> 19 -> (-2) -> 17 -> (-3) -> 14 -> (-2) -> 12.
    { productId: ceramicMug.id, warehouseId: mainWh.id, delta: 30, reason: MoveReason.PO_RECEIVE, refLabel: "PO-0185 received · Main", note: "Supplier delivery 30 units", userId: user.id, daysAgo: 28, hoursOffset: 4 },
    { productId: ceramicMug.id, warehouseId: mainWh.id, delta: -4, reason: MoveReason.ORDER, refLabel: "Order #4790 · Shopify US", userId: user.id, daysAgo: 24, hoursOffset: 6 },
    { productId: ceramicMug.id, warehouseId: mainWh.id, delta: -3, reason: MoveReason.ORDER, refLabel: "Order #4802 · Amazon FBM", userId: user.id, daysAgo: 20, hoursOffset: 2 },
    { productId: ceramicMug.id, warehouseId: mainWh.id, delta: 1, reason: MoveReason.RETURN, refLabel: "Return #RET-041 · Shopify US", note: "Customer unopened return", userId: user.id, daysAgo: 17, hoursOffset: 5 },
    { productId: ceramicMug.id, warehouseId: mainWh.id, delta: -5, reason: MoveReason.ORDER, refLabel: "Order #4821 · Shopify US", userId: user.id, daysAgo: 14, hoursOffset: 3 },
    { productId: ceramicMug.id, warehouseId: mainWh.id, delta: -2, reason: MoveReason.STOCKTAKE, refLabel: "Stocktake by Priya", note: "Damaged item written off", userId: user.id, daysAgo: 10, hoursOffset: 1 },
    { productId: ceramicMug.id, warehouseId: mainWh.id, delta: -3, reason: MoveReason.ORDER, refLabel: "Order #4855 · WooCommerce", userId: user.id, daysAgo: 6, hoursOffset: 7 },
    { productId: ceramicMug.id, warehouseId: mainWh.id, delta: -2, reason: MoveReason.ORDER, refLabel: "Order #4889 · Shopify US", userId: user.id, daysAgo: 2, hoursOffset: 4 },

    // --- Ceramic Mug CER-MUG-COB (3PL East onHand today = 4) ---
    // Past trajectory: 0 -> (+10) -> 10 -> (-4) -> 6 -> (-2) -> 4.
    { productId: ceramicMug.id, warehouseId: east3plWh.id, delta: 10, reason: MoveReason.TRANSFER, refLabel: "Transfer TR-009 from Main", note: "Replenish 3PL East", userId: user.id, daysAgo: 22, hoursOffset: 8 },
    { productId: ceramicMug.id, warehouseId: east3plWh.id, delta: -4, reason: MoveReason.ORDER, refLabel: "Order #4811 · Amazon FBM", userId: user.id, daysAgo: 16, hoursOffset: 9 },
    { productId: ceramicMug.id, warehouseId: east3plWh.id, delta: -2, reason: MoveReason.ORDER, refLabel: "Order #4840 · Shopify US", userId: user.id, daysAgo: 8, hoursOffset: 5 },

    // --- Linen Tote Bag TOT-LIN-NAT (Main warehouse onHand today = 8) ---
    // Past trajectory: 0 -> (+20) -> 20 -> (-4) -> 16 -> (-5) -> 11 -> (-3) -> 8.
    { productId: linenTote.id, warehouseId: mainWh.id, delta: 20, reason: MoveReason.PO_RECEIVE, refLabel: "PO-0188 received · Main", note: "Batch of organic canvas totes", userId: user.id, daysAgo: 26, hoursOffset: 3 },
    { productId: linenTote.id, warehouseId: mainWh.id, delta: -4, reason: MoveReason.ORDER, refLabel: "Order #4798 · Shopify US", userId: user.id, daysAgo: 21, hoursOffset: 4 },
    { productId: linenTote.id, warehouseId: mainWh.id, delta: -5, reason: MoveReason.ORDER, refLabel: "Order #4833 · WooCommerce", userId: user.id, daysAgo: 13, hoursOffset: 6 },
    { productId: linenTote.id, warehouseId: mainWh.id, delta: -3, reason: MoveReason.ORDER, refLabel: "Order #4872 · Shopify US", userId: user.id, daysAgo: 5, hoursOffset: 2 },

    // --- Brass Ballpoint Pen PEN-BRS-001 (Main warehouse onHand today = 145) ---
    // Past trajectory: 0 -> (+200) -> 200 -> (-25) -> 175 -> (-15) -> 160 -> (-15) -> 145.
    { productId: brassPen.id, warehouseId: mainWh.id, delta: 200, reason: MoveReason.PO_RECEIVE, refLabel: "PO-0180 received · Main", note: "Full production lot", userId: user.id, daysAgo: 29, hoursOffset: 2 },
    { productId: brassPen.id, warehouseId: mainWh.id, delta: -25, reason: MoveReason.ORDER, refLabel: "Order #4788 · Shopify US", userId: user.id, daysAgo: 23, hoursOffset: 5 },
    { productId: brassPen.id, warehouseId: mainWh.id, delta: -15, reason: MoveReason.ORDER, refLabel: "Order #4819 · Amazon FBM", userId: user.id, daysAgo: 15, hoursOffset: 7 },
    { productId: brassPen.id, warehouseId: mainWh.id, delta: -15, reason: MoveReason.ORDER, refLabel: "Order #4864 · Shopify US", userId: user.id, daysAgo: 4, hoursOffset: 3 },

    // --- Hardcover Grid Notebook NBK-SLT-A5 (Main warehouse onHand today = 88) ---
    // Past trajectory: 0 -> (+120) -> 120 -> (-12) -> 108 -> (-10) -> 98 -> (-10) -> 88.
    { productId: slateNotebook.id, warehouseId: mainWh.id, delta: 120, reason: MoveReason.PO_RECEIVE, refLabel: "PO-0182 received · Main", userId: user.id, daysAgo: 27, hoursOffset: 1 },
    { productId: slateNotebook.id, warehouseId: mainWh.id, delta: -12, reason: MoveReason.ORDER, refLabel: "Order #4795 · Shopify EU", userId: user.id, daysAgo: 19, hoursOffset: 4 },
    { productId: slateNotebook.id, warehouseId: mainWh.id, delta: -10, reason: MoveReason.ORDER, refLabel: "Order #4835 · Shopify US", userId: user.id, daysAgo: 12, hoursOffset: 6 },
    { productId: slateNotebook.id, warehouseId: mainWh.id, delta: -10, reason: MoveReason.ORDER, refLabel: "Order #4878 · WooCommerce", userId: user.id, daysAgo: 3, hoursOffset: 8 },

    // --- Organic Sencha Green Tea Tin TEA-SNC-100 (Main warehouse onHand today = 62) ---
    // Past trajectory: 0 -> (+80) -> 80 -> (-8) -> 72 -> (-6) -> 66 -> (+2) -> 68 -> (-6) -> 62.
    { productId: senchaTea.id, warehouseId: mainWh.id, delta: 80, reason: MoveReason.PO_RECEIVE, refLabel: "PO-0184 received · Main", note: "Spring harvest batch", userId: user.id, daysAgo: 25, hoursOffset: 5 },
    { productId: senchaTea.id, warehouseId: mainWh.id, delta: -8, reason: MoveReason.ORDER, refLabel: "Order #4805 · Shopify US", userId: user.id, daysAgo: 18, hoursOffset: 2 },
    { productId: senchaTea.id, warehouseId: mainWh.id, delta: -6, reason: MoveReason.ORDER, refLabel: "Order #4829 · WooCommerce", userId: user.id, daysAgo: 14, hoursOffset: 4 },
    { productId: senchaTea.id, warehouseId: mainWh.id, delta: 2, reason: MoveReason.CANCEL, refLabel: "Cancel #4830 · Shopify US", note: "Cancelled before dispatch", userId: user.id, daysAgo: 11, hoursOffset: 1 },
    { productId: senchaTea.id, warehouseId: mainWh.id, delta: -6, reason: MoveReason.ORDER, refLabel: "Order #4880 · Shopify US", userId: user.id, daysAgo: 3, hoursOffset: 5 },

    // --- Cedar Coaster Set CST-CDR-04 (Main warehouse onHand today = 34) ---
    // Past trajectory: 0 -> (+50) -> 50 -> (-6) -> 44 -> (-6) -> 38 -> (-4) -> 34.
    { productId: cedarCoaster.id, warehouseId: mainWh.id, delta: 50, reason: MoveReason.PO_RECEIVE, refLabel: "PO-0186 received · Main", userId: user.id, daysAgo: 24, hoursOffset: 1 },
    { productId: cedarCoaster.id, warehouseId: mainWh.id, delta: -6, reason: MoveReason.ORDER, refLabel: "Order #4812 · Shopify US", userId: user.id, daysAgo: 16, hoursOffset: 3 },
    { productId: cedarCoaster.id, warehouseId: mainWh.id, delta: -6, reason: MoveReason.ORDER, refLabel: "Order #4845 · Amazon FBM", userId: user.id, daysAgo: 9, hoursOffset: 7 },
    { productId: cedarCoaster.id, warehouseId: mainWh.id, delta: -4, reason: MoveReason.ORDER, refLabel: "Order #4882 · Shopify US", userId: user.id, daysAgo: 2, hoursOffset: 6 },

    // --- Cold Brew Glass Bottle BTL-GLS-500 (Main warehouse onHand today = 28) ---
    // Past trajectory: 0 -> (+40) -> 40 -> (-6) -> 34 -> (-4) -> 30 -> (-2) -> 28.
    { productId: coldBrewBottle.id, warehouseId: mainWh.id, delta: 40, reason: MoveReason.PO_RECEIVE, refLabel: "PO-0187 received · Main", userId: user.id, daysAgo: 22, hoursOffset: 4 },
    { productId: coldBrewBottle.id, warehouseId: mainWh.id, delta: -6, reason: MoveReason.ORDER, refLabel: "Order #4818 · Shopify US", userId: user.id, daysAgo: 15, hoursOffset: 5 },
    { productId: coldBrewBottle.id, warehouseId: mainWh.id, delta: -4, reason: MoveReason.ORDER, refLabel: "Order #4850 · WooCommerce", userId: user.id, daysAgo: 7, hoursOffset: 3 },
    { productId: coldBrewBottle.id, warehouseId: mainWh.id, delta: -2, reason: MoveReason.ORDER, refLabel: "Order #4886 · Shopify US", userId: user.id, daysAgo: 1, hoursOffset: 2 },

    // --- Minimalist Desk Mat MAT-DSK-MID (Main warehouse onHand today = 0, sold out) ---
    // Past trajectory: 0 -> (+15) -> 15 -> (-8) -> 7 -> (-7) -> 0.
    { productId: deskMat.id, warehouseId: mainWh.id, delta: 15, reason: MoveReason.PO_RECEIVE, refLabel: "PO-0179 received · Main", userId: user.id, daysAgo: 25, hoursOffset: 2 },
    { productId: deskMat.id, warehouseId: mainWh.id, delta: -8, reason: MoveReason.ORDER, refLabel: "Order #4809 · Shopify US", userId: user.id, daysAgo: 17, hoursOffset: 8 },
    { productId: deskMat.id, warehouseId: mainWh.id, delta: -7, reason: MoveReason.ORDER, refLabel: "Order #4848 · Amazon FBM", note: "Depleted inventory", userId: user.id, daysAgo: 8, hoursOffset: 4 },

    // --- Gift Box Sleeve PKG-SLEEVE (Main warehouse onHand today = 540) ---
    // Past trajectory: 0 -> (+600) -> 600 -> (-30) -> 570 -> (-30) -> 540.
    { productId: giftSleeve.id, warehouseId: mainWh.id, delta: 600, reason: MoveReason.PO_RECEIVE, refLabel: "PO-0175 received · Main", note: "Pallet packaging delivery", userId: user.id, daysAgo: 30, hoursOffset: 1 },
    { productId: giftSleeve.id, warehouseId: mainWh.id, delta: -30, reason: MoveReason.MANUAL, refLabel: "Assembly batch #BND-08", note: "Kitted into Tea Duo gift boxes", userId: user.id, daysAgo: 18, hoursOffset: 6 },
    { productId: giftSleeve.id, warehouseId: mainWh.id, delta: -30, reason: MoveReason.MANUAL, refLabel: "Assembly batch #BND-12", note: "Kitted into Tea Duo gift boxes", userId: user.id, daysAgo: 4, hoursOffset: 5 },
  ];

  console.log(`Total stock movements planned: ${movementsData.length}`);

  for (const item of movementsData) {
    const timestamp = new Date(now - item.daysAgo * dayMs + item.hoursOffset * 60 * 60 * 1000);
    await prisma.stockMovement.create({
      data: {
        productId: item.productId,
        warehouseId: item.warehouseId,
        delta: item.delta,
        reason: item.reason,
        refLabel: item.refLabel,
        note: item.note,
        userId: item.userId,
        createdAt: timestamp,
      },
    });
  }

  // 9. Verification & Table Row Counts
  console.log("\n========================================================");
  console.log("📊 SEED COMPLETE — DATABASE ROW COUNTS PER TABLE");
  console.log("========================================================");

  const [
    accountsCount,
    usersCount,
    warehousesCount,
    channelsCount,
    productsCount,
    bundleComponentsCount,
    stockLevelsCount,
    listingsCount,
    stockMovementsCount,
  ] = await Promise.all([
    prisma.account.count(),
    prisma.user.count(),
    prisma.warehouse.count(),
    prisma.channel.count(),
    prisma.product.count(),
    prisma.bundleComponent.count(),
    prisma.stockLevel.count(),
    prisma.listing.count(),
    prisma.stockMovement.count(),
  ]);

  const summary = [
    { Table: "Account", "Row Count": accountsCount },
    { Table: "User", "Row Count": usersCount },
    { Table: "Warehouse", "Row Count": warehousesCount },
    { Table: "Channel", "Row Count": channelsCount },
    { Table: "Product", "Row Count": productsCount },
    { Table: "BundleComponent", "Row Count": bundleComponentsCount },
    { Table: "StockLevel", "Row Count": stockLevelsCount },
    { Table: "Listing", "Row Count": listingsCount },
    { Table: "StockMovement", "Row Count": stockMovementsCount },
  ];

  console.table(summary);
  console.log("========================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
