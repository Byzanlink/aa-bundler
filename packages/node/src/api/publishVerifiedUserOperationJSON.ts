import { toVerifiedUserOperation } from "@byzanlink-bundler/params/lib/utils/userOp";
import { UserOperationStruct } from "@byzanlink-bundler/types/lib/executor/contracts/EntryPoint";
import { NodeAPIModules } from "./types";

export default function api(modules: NodeAPIModules) {
  return async function publishVerifiedUserOperationJSON(
    entryPoint: string,
    userOp: UserOperationStruct,
    blockHash: string,
    mempool: string
  ): Promise<void> {
    const VerifiedUserOperation = toVerifiedUserOperation(
      entryPoint,
      userOp,
      blockHash
    );
    await modules.network.publishVerifiedUserOperation(
      VerifiedUserOperation,
      mempool
    );
  };
}
