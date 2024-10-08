import { PeerId } from "@libp2p/interface-peer-id";
import { ts } from "@byzanlink-bundler/types/lib";
import { RateLimiterQuota } from "./rate_limiter/rateLimiterGRCA";

/**
 * The encoding of the request/response payload
 */
export enum EncodedPayloadType {
  ssz,
  bytes,
}

/**
 * Wrapper for the request/response payload for SSZ type data
 */
export interface EncodedPayloadSsz<T> {
  type: EncodedPayloadType.ssz;
  data: T;
}

/**
 * Wrapper for the request/response payload for binary type data
 */
export interface EncodedPayloadBytes {
  type: EncodedPayloadType.bytes;
  bytes: Uint8Array;
  contextBytes: ContextBytes;
}

/**
 * Wrapper for the request/response payload
 */
export type EncodedPayload<T> = EncodedPayloadSsz<T> | EncodedPayloadBytes;

/**
 * Request handler
 */
export type ReqRespHandler<Req, Resp> = (
  req: Req,
  peerId: PeerId
) => AsyncIterable<EncodedPayload<Resp>>;

/**
 * ReqResp Protocol Deceleration
 */
export interface Protocol {
  readonly protocolPrefix: string;
  readonly method: string;
  readonly version: number;
  readonly encoding: Encoding;
}

/**
 * Inbound rate limiter quota for the protocol
 */
export interface InboundRateLimitQuota<Req = unknown> {
  /**
   * Will be tracked for the protocol per peer
   */
  byPeer?: RateLimiterQuota;
  /**
   * Will be tracked regardless of the peer
   */
  total?: RateLimiterQuota;
  /**
   * Some requests may be counted multiple e.g. getBlocksByRange
   * for such implement this method else `1` will be used default
   */
  getRequestCount?: (req: Req) => number;
}

// `protocolPrefix` is added runtime so not part of definition
/**
 * ReqResp Protocol definition for full duplex protocols
 */
export interface ProtocolDefinition<Req = unknown, Resp = unknown>
  extends Omit<Protocol, "protocolPrefix"> {
  handler: ReqRespHandler<Req, Resp>;
  requestType: () => TypeSerializer<Req> | null;
  responseType: () => TypeSerializer<Resp>;
  ignoreResponse?: boolean;
  renderRequestBody?: (request: Req) => string;
  renderResponseBody?: (response: Resp) => string;
  contextBytes: ContextBytesFactory;
  inboundRateLimits?: InboundRateLimitQuota<Req>;
}

/**
 * ReqResp Protocol definition for dial only protocols
 */
export interface DialOnlyProtocolDefinition<Req = unknown, Resp = unknown>
  extends Omit<
    ProtocolDefinition<Req, Resp>,
    "handler" | "inboundRateLimits" | "renderRequestBody"
  > {
  handler?: never;
  inboundRateLimits?: never;
  renderRequestBody?: never;
}

/**
 * ReqResp Protocol definition for full duplex and dial only protocols
 */
export type MixedProtocolDefinition<Req = unknown, Resp = unknown> =
  | DialOnlyProtocolDefinition<Req, Resp>
  | ProtocolDefinition<Req, Resp>;

/**
 * ReqResp protocol definition descriptor for full duplex and dial only protocols
 * If handler is not provided, the protocol will be dial only
 * If handler is provided, the protocol will be full duplex
 */
export type MixedProtocolDefinitionGenerator<Req, Res> = <
  H extends ReqRespHandler<Req, Res> | undefined = undefined
>(
  // "inboundRateLimiter" is available only on handler context not on generator
  // eslint-disable-next-line @typescript-eslint/ban-types
  modules: {},
  handler?: H
) => H extends undefined
  ? DialOnlyProtocolDefinition<Req, Res>
  : ProtocolDefinition<Req, Res>;

/**
 * ReqResp protocol definition descriptor for full duplex protocols
 */
export type DuplexProtocolDefinitionGenerator<Req, Res> = (
  // eslint-disable-next-line @typescript-eslint/ban-types
  modules: {},
  handler: ReqRespHandler<Req, Res>
) => ProtocolDefinition<Req, Res>;

export type HandlerTypeFromMessage<T> =
  T extends DuplexProtocolDefinitionGenerator<infer Req, infer Res>
    ? ReqRespHandler<Req, Res>
    : never;

export const protocolPrefix = "/account_abstraction/req";

/**
 * Available request/response encoding strategies:
 * https://github.com/ethereum/consensus-specs/blob/v1.1.10/specs/phase0/p2p-interface.md#encoding-strategies
 */
export enum Encoding {
  SSZ_SNAPPY = "ssz_snappy",
}

export const CONTEXT_BYTES_FORK_DIGEST_LENGTH = 4;

export type ContextBytesFactory = { type: ContextBytesType.Empty };

export type ContextBytes =
  | { type: ContextBytesType.Empty }
  | { type: ContextBytesType.ForkDigest; forkSlot: ts.Slot };

export enum ContextBytesType {
  /** 0 bytes chunk, can be ignored */
  Empty,
  /** A fixed-width 4 byte <context-bytes>, set to the ForkDigest matching the chunk: compute_fork_digest(fork_version, genesis_validators_root) */
  ForkDigest,
}

export enum LightClientServerErrorCode {
  RESOURCE_UNAVAILABLE = "RESOURCE_UNAVAILABLE",
}

export type LightClientServerErrorType = {
  code: LightClientServerErrorCode.RESOURCE_UNAVAILABLE;
};

/**
 * Lightweight interface of ssz Type<T>
 */
export interface TypeSerializer<T> {
  serialize(data: T): Uint8Array;
  deserialize(bytes: Uint8Array): T;
  maxSize: number;
  minSize: number;
  equals(a: T, b: T): boolean;
}

/**
 * Rate limiter options for the requests
 */
export interface ReqRespRateLimiterOpts {
  rateLimitMultiplier?: number;
  onRateLimit?: (peer: PeerId, method: string) => void;
}
