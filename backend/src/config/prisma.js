const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// COUNT(*) en PostgreSQL retorna bigint; Prisma lo mapea a BigInt de JS.
// Este patch permite que res.json() serialice BigInt sin lanzar TypeError.
BigInt.prototype.toJSON = function () { return Number(this); };

module.exports = prisma;
