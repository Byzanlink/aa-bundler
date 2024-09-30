import { describe, expect, it } from "vitest";
import { Wallet } from "ethers";
import { getClient, getConfigs, getModules } from "../../fixtures";
import { TestAccountMnemonic } from "../../constants";

describe("ByzanlinkBundler module", async () => {
  const client = await getClient(); // runs anvil
  const wallet = Wallet.fromMnemonic(TestAccountMnemonic).connect(client);

  const { config, networkConfig } = await getConfigs();
  const { byzanlinkbundler } = await getModules(config, networkConfig);

  it("getGasPrice should return actual onchain gas price", async () => {
    const gasFee = await client.getFeeData();
    const responseFromByzanlinkBundler = await byzanlinkbundler.getGasPrice();
    expect(gasFee.maxFeePerGas).toEqual(responseFromByzanlinkBundler.maxFeePerGas);
    expect(gasFee.maxPriorityFeePerGas).toEqual(
      responseFromByzanlinkBundler.maxPriorityFeePerGas
    );
  });

  it("getConfig should return all config values and hide sensitive data", async () => {
    const configByzanlinkBundler = await byzanlinkbundler.getConfig();
    expect(configByzanlinkBundler.flags.redirectRpc).toEqual(config.redirectRpc);
    expect(configByzanlinkBundler.flags.testingMode).toEqual(config.testingMode);
    expect(configByzanlinkBundler.relayers).toEqual([wallet.address]);

    const sensitiveFields = [
      "relayers",
      "relayer",
      "rpcEndpoint",
      "name",
      "merkleApiURL",
      "kolibriAuthKey",
      "echoAuthKey",
    ];
    for (const [key, value] of Object.entries(networkConfig)) {
      if (sensitiveFields.indexOf(key) > -1) continue;
      if (!configByzanlinkBundler.hasOwnProperty(key)) {
        throw new Error(`${key} is not defined in byzanlink-bundler_config`);
      }
    }
  });
});
