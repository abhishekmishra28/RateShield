const prisma =
require("../config/prisma");

async function createClient(data) {
  return prisma.client.create({
    data
  });
}

async function findByClientKey(clientKey) {
  return prisma.client.findUnique({
    where: {
      clientKey
    }
  });
}

module.exports = {
  createClient,
  findByClientKey
};