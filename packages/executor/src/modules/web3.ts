import { ByzanlinkBundlerVersion } from "@byzanlink-bundler/types/lib/executor";
import { Config } from "../config";

export class Web3 {
  constructor(private config: Config, private version: ByzanlinkBundlerVersion) {}

  clientVersion(): string {
    return `byzanlink-bundler/${this.version.version}-${this.version.commit}`;
  }
}
