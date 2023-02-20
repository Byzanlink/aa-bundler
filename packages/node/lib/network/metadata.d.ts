import { BitArray } from "@chainsafe/ssz";
import { ts } from "types/lib";
import { ILogger } from "utils/lib";
export declare enum ENRKey {
    tcp = "tcp",
    mempoolnets = "mempoolnets"
}
export interface IMetadataOpts {
    metadata: ts.Metadata;
    logger: ILogger;
}
/**
 * Implementation of ERC 4337 p2p MetaData.
 * For the spec that this code is based on, see:
 * https://github.com/eth-infinitism/bundler-spec/blob/main/p2p-specs/p2p-interface.md#metadata
 */
export declare class MetadataController {
    private setEnrValue?;
    private _metadata;
    private logger;
    constructor(opts: IMetadataOpts);
    start(setEnrValue: (key: string, value: BitArray) => Promise<void>): void;
    get seqNumber(): bigint;
    get mempoolnets(): BitArray;
    set mempoolnets(mempoolnets: BitArray);
    get json(): ts.Metadata;
}
//# sourceMappingURL=metadata.d.ts.map