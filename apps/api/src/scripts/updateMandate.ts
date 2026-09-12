import { prisma } from '../db';

async function main() {
  const updated = await prisma.mandate.update({
    where: { id: 'mnd_amazon_01' },
    data: {
      category: 'Office Supplies & Electronics',
      allowedCategories: JSON.stringify(['Electronics', 'Office Supplies', 'Peripherals', 'Computers']),
      productPattern: 'Keyboard|Mouse|Headphones|Monitor|Cables|Office Supplies|Supplies|Stationery|Desk|Bundle',
      allowedMerchants: JSON.stringify(['Amazon', 'Flipkart', 'Croma', 'KeychronIndia.com']),
      approvalThreshold: 500000,
    },
  });
  console.log('Successfully updated mandate in DB:', updated.id, updated.allowedCategories, updated.productPattern);
}

main().catch(console.error).finally(() => prisma.$disconnect());
