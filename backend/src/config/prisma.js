const { PrismaClient } = require("@prisma/client");

const _prisma = new PrismaClient();

// COUNT(*) retorna bigint en PostgreSQL; Prisma lo mapea a BigInt de JS.
// Este patch permite que res.json() lo serialice sin lanzar TypeError.
BigInt.prototype.toJSON = function () { return Number(this); };

// Prisma envía parámetros string con tipo OID text; PostgreSQL no acepta
// comparaciones uuid = text sin cast explícito. Este wrapper detecta UUIDs
// y añade ::uuid automáticamente para que no haya que escribirlo en cada query.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function injectCasts(sql, params) {
  let s = sql;
  params.forEach((param, i) => {
    if (typeof param === "string" && UUID_RE.test(param)) {
      // (?![0-9]) evita que $1 matchee $10, $11, etc.
      // (?!::)   evita doble-cast si ya está escrito ::uuid
      s = s.replace(new RegExp(`\\$${i + 1}(?!::)(?![0-9])`, "g"), `$${i + 1}::uuid`);
    }
  });
  return s;
}

function wrapClient(client) {
  return {
    $queryRawUnsafe:   (sql, ...params) => client.$queryRawUnsafe(injectCasts(sql, params), ...params),
    $executeRawUnsafe: (sql, ...params) => client.$executeRawUnsafe(injectCasts(sql, params), ...params),
    $transaction:      (fn) => client.$transaction((tx) => fn(wrapClient(tx))),
  };
}

module.exports = wrapClient(_prisma);
