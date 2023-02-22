import { BigNumber, ethers, providers } from "ethers";
import { NetworkName } from "types/lib";
import logger from "../logger";
import { EntryPoint__factory } from "../contracts/factories";
import { getAddr } from "../utils";
import { MempoolEntry } from "../entities/MempoolEntry";
import { ReputationStatus } from "../entities/interfaces";
import { Config } from "../config";
import { ReputationService } from "./ReputationService";
import {
  UserOpValidationResult,
  UserOpValidationService,
} from "./UserOpValidation";
import { MempoolService } from "./MempoolService";

export class BundlingService {
  constructor(
    private network: NetworkName,
    private provider: providers.JsonRpcProvider,
    private mempoolService: MempoolService,
    private userOpValidationService: UserOpValidationService,
    private reputationService: ReputationService,
    private config: Config
  ) {}

  async sendBundle(bundle: MempoolEntry[]): Promise<void> {
    if (!bundle.length) {
      return;
    }
    const entryPoint = bundle[0]!.entryPoint;
    const entryPointContract = EntryPoint__factory.connect(
      entryPoint,
      this.provider
    );
    const wallet = this.config.getEntryPointRelayer(this.network, entryPoint)!;
    const beneficiary = this.config.getEntryBeneficiary(
      this.network,
      entryPoint
    )!;
    try {
      const txRequest = entryPointContract.interface.encodeFunctionData(
        "handleOps",
        [bundle.map((entry) => entry.userOp), beneficiary]
      );
      const tx = await wallet.sendTransaction({
        to: entryPoint,
        data: txRequest,
      });

      logger.debug(`Sent new bundle ${tx.hash}`);

      // TODO: change to batched delete
      for (const entry of bundle) {
        await this.mempoolService.remove(entry);
      }
    } catch (err: any) {
      if (err.errorName !== "FailedOp") {
        logger.warn(`Failed handleOps, but non-FailedOp error ${err}`);
        return;
      }
      const { index, paymaster, reason } = err.errorArgs;
      const entry = bundle[index];
      if (paymaster !== ethers.constants.AddressZero) {
        await this.reputationService.crashedHandleOps(paymaster);
      } else if (typeof reason === "string" && reason.startsWith("AA1")) {
        const factory = getAddr(entry?.userOp.initCode);
        if (factory) {
          await this.reputationService.crashedHandleOps(factory);
        }
      } else {
        if (entry) {
          await this.mempoolService.remove(entry);
          logger.warn(`Failed handleOps sender=${entry.userOp.sender}`);
        }
      }
    }
  }

  async createBundle(): Promise<MempoolEntry[]> {
    // TODO: support multiple entry points
    //       filter bundles by entry points
    const entries = await this.mempoolService.getSortedOps();
    const bundle: MempoolEntry[] = [];

    const paymasterDeposit: { [key: string]: BigNumber } = {};
    const stakedEntityCount: { [key: string]: number } = {};
    const senders = new Set<string>();
    for (const entry of entries) {
      const paymaster = getAddr(entry.userOp.paymasterAndData);
      const factory = getAddr(entry.userOp.initCode);

      if (paymaster) {
        const paymasterStatus = await this.reputationService.getStatus(
          paymaster
        );
        if (paymasterStatus === ReputationStatus.BANNED) {
          await this.mempoolService.remove(entry);
          continue;
        } else if (
          paymasterStatus === ReputationStatus.THROTTLED ||
          (stakedEntityCount[paymaster] ?? 0) > 1
        ) {
          logger.debug("skipping throttled paymaster", {
            metadata: {
              sender: entry.userOp.sender,
              nonce: entry.userOp.nonce,
              paymaster,
            },
          });
          continue;
        }
      }

      if (factory) {
        const deployerStatus = await this.reputationService.getStatus(factory);
        if (deployerStatus === ReputationStatus.BANNED) {
          await this.mempoolService.remove(entry);
          continue;
        } else if (
          deployerStatus === ReputationStatus.THROTTLED ||
          (stakedEntityCount[factory] ?? 0) > 1
        ) {
          logger.debug("skipping throttled factory", {
            metadata: {
              sender: entry.userOp.sender,
              nonce: entry.userOp.nonce,
              factory,
            },
          });
          continue;
        }
      }

      if (senders.has(entry.userOp.sender)) {
        logger.debug("skipping already included sender", {
          metadata: {
            sender: entry.userOp.sender,
            nonce: entry.userOp.nonce,
          },
        });
        continue;
      }

      let validationResult: UserOpValidationResult;
      try {
        validationResult =
          await this.userOpValidationService.simulateCompleteValidation(
            entry.userOp,
            entry.entryPoint,
            entry.hash
          );
      } catch (e: any) {
        logger.debug(`failed 2nd validation: ${e.message}`);
        await this.mempoolService.remove(entry);
        continue;
      }

      // TODO: add total gas cap
      const entryPointContract = EntryPoint__factory.connect(
        entry.entryPoint,
        this.provider
      );
      if (paymaster) {
        if (!paymasterDeposit[paymaster]) {
          paymasterDeposit[paymaster] = await entryPointContract.balanceOf(
            paymaster
          );
        }
        if (
          paymasterDeposit[paymaster]?.lt(validationResult.returnInfo.prefund)
        ) {
          // not enough balance in paymaster to pay for all UserOps
          // (but it passed validation, so it can sponsor them separately
          continue;
        }
        stakedEntityCount[paymaster] = (stakedEntityCount[paymaster] ?? 0) + 1;
        paymasterDeposit[paymaster] = BigNumber.from(
          paymasterDeposit[paymaster]?.sub(validationResult.returnInfo.prefund)
        );
      }

      if (factory) {
        stakedEntityCount[factory] = (stakedEntityCount[factory] ?? 0) + 1;
      }

      senders.add(entry.userOp.sender);
      bundle.push(entry);
    }
    return bundle;
  }
}
