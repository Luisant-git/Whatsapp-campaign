const { PrismaClient } = require('@prisma/client-tenant');
const prisma = new PrismaClient();
async function test() {
  try {
    await prisma.grievance.create({
      data: {
        phoneNumber: '123',
        type: 'Test',
        location: 'Test',
        description: 'Test',
        photos: [],
        status: 'Pending'
      }
    });
    console.log("Success");
  } catch (e) {
    console.error(e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();
