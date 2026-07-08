import { prisma } from './index';

async function main() {
  console.log('Fetching workspace entries...');
  const entries = await prisma.workspaceEntry.findMany({
    where: {
      content: {
        contains: 'data-id="el-',
      },
    },
  });

  console.log(`Found ${entries.length} entries with potential data-id tags. Checking for corrupted generics...`);

  const genericRegex = /\b(useState|useRef|React\.useState|React\.useRef)\s*<\s*([a-zA-Z0-9_]+)\s+data-id="el-\d+"\s*([^>]*)>/g;
  let updatedCount = 0;

  for (const entry of entries) {
    if (genericRegex.test(entry.content)) {
      // Reset regex index
      genericRegex.lastIndex = 0;
      
      const newContent = entry.content.replace(genericRegex, (match, hook, type, suffix) => {
        const cleaned = `${hook}<${type}${suffix}>`;
        console.log(`Cleaning in project ${entry.projectId}, path ${entry.path}:`);
        console.log(`  Before: ${match}`);
        console.log(`  After:  ${cleaned}`);
        return cleaned;
      });

      await prisma.workspaceEntry.update({
        where: {
          projectId_path: {
            projectId: entry.projectId,
            path: entry.path,
          },
        },
        data: {
          content: newContent,
        },
      });
      updatedCount++;
    }
  }

  console.log(`Done. Cleaned ${updatedCount} corrupted entries.`);
}

main()
  .catch((e) => {
    console.error('Error running cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
