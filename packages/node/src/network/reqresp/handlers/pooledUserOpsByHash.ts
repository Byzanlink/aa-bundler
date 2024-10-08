import { ts } from "@byzanlink-bundler/types/lib";
import { Config } from "@byzanlink-bundler/executor/lib/config";
import { Executor } from "@byzanlink-bundler/executor/lib/executor";
import { serializeUserOp, userOpHashToString } from "@byzanlink-bundler/params/lib/utils/userOp";
import logger from "@byzanlink-bundler/api/lib/logger";
import { AllChainsMetrics } from "@byzanlink-bundler/monitoring/lib";
import { EncodedPayload, EncodedPayloadType } from "../../../reqresp/types";

export async function* onPooledUserOpsByHash(
  executor: Executor,
  relayersConfig: Config,
  req: ts.PooledUserOpsByHashRequest,
  metrics: AllChainsMetrics | null
): AsyncIterable<EncodedPayload<ts.PooledUserOpsByHash>> {
  const userOpHashes = req.hashes.map((hash) => userOpHashToString(hash));
  logger.debug(`UserOpsByHash, received hashes: ${userOpHashes.join(", ")}`);
  const userOps = await executor.p2pService.getPooledUserOpsByHash(
    userOpHashes
  );

  logger.debug(`UserOpsByHash, found userops: ${userOps.length}`);

  const sszUserOps = userOps.map((userOp) => serializeUserOp(userOp));

  if (metrics) metrics[relayersConfig.chainId].useropsSent?.inc(userOps.length);

  yield {
    type: EncodedPayloadType.ssz,
    data: sszUserOps,
  };
}
