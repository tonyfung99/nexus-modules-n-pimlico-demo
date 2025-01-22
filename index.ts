import {
  createBicoPaymasterClient,
  createSmartAccountClient,
  Erc7579Actions,
  erc7579Actions,
  NexusAccount,
  SmartAccountActions,
  smartAccountActions,
  smartSessionCreateActions,
  SmartSessionMode,
  SmartSessionUseActions,
  smartSessionUseActions,
  toNexusAccount,
  toSmartSessionsValidator,
  type CreateSessionDataParams,
  type SessionData,
} from "@biconomy/sdk";
import { Chain, Client, createWalletClient, encodeFunctionData, http, HttpTransport, WalletClient, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bundlerUrl, chain, CounterAbi, privateKey, sessionOwnerPrivateKey } from "./src/constants.js";
import { testAddresses } from "./utils.js";
import { BundlerActions, BundlerClient, createBundlerClient, entryPoint07Address, SmartAccount } from "viem/account-abstraction";
import { baseSepolia } from "viem/chains";
import { createPimlicoClient } from "permissionless/clients/pimlico";

const init = async () => {
  const eoaAccount = privateKeyToAccount(`0x${privateKey}`);
  const sessionOwner = privateKeyToAccount(`0x${sessionOwnerPrivateKey}`);
  const currentChain = baseSepolia;

  const paymaster = createPimlicoClient({
    transport: http(bundlerUrl),
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });

  const eoaWalletClient = createWalletClient({
    account: eoaAccount,
    chain: currentChain,
    transport: http(),
  });

  console.log(`>> eoaWalletClient: ${eoaWalletClient.account.address}`);

  const nexusAccount = await toNexusAccount({
    signer: eoaWalletClient.account,
    chain: currentChain,
    transport: http(),
  });

  const nexusClient = createBundlerClient({
    transport: http(bundlerUrl),
    account: nexusAccount,
    paymaster: paymaster,
    // paymasterContext: {
    //   sponsorshipPolicyId,
    // },
    userOperation: {
      estimateFeesPerGas: async () => (await paymaster.getUserOperationGasPrice()).fast,
    },
  }) as unknown as BundlerClient<HttpTransport, Chain, SmartAccount>;

  const withErc7579Actions = nexusClient.extend((client) => erc7579Actions()(client as Client<HttpTransport, Chain, SmartAccount>));
  const withSmartAccountActions = withErc7579Actions.extend((client) => smartAccountActions()(client as Client<HttpTransport, Chain, SmartAccount>));

  const accountClient = withSmartAccountActions as unknown as BundlerClient<HttpTransport, Chain, SmartAccount> &
    BundlerActions<SmartAccount> &
    Erc7579Actions<SmartAccount> &
    SmartAccountActions<Chain, SmartAccount>;

  const sessionsModule = toSmartSessionsValidator({
    account: nexusAccount,
    signer: eoaAccount,
  });

  const isInstalledBefore = await accountClient.isModuleInstalled({
    module: sessionsModule,
    account: nexusAccount,
  });

  console.log(`>> ${nexusClient.account.address} sessionModule ${sessionsModule.address} isInstalledBefore: ${isInstalledBefore}`);

  if (!isInstalledBefore) {
    const hash = await accountClient.installModule({
      module: sessionsModule.moduleInitData,
    });

    const { success: installSuccess } = await nexusClient.waitForUserOperationReceipt({ hash });

    if (!installSuccess) {
      throw new Error("Failed to install module");
    }
  }

  const isInstalledAfter = await accountClient.isModuleInstalled({
    module: sessionsModule,
  });

  if (!isInstalledAfter) {
    throw new Error("Failed to install module");
  }

  const sessionRequestedInfo: CreateSessionDataParams[] = [
    {
      sessionPublicKey: sessionOwner.address,
      actionPoliciesInfo: [
        {
          contractAddress: testAddresses.Counter,
          functionSelector: "0x273ea3e3" as Hex,
        },
      ],
    },
  ];

  const nexusSessionClient = accountClient.extend(smartSessionCreateActions(sessionsModule) as any);

  console.log(">> granting permission", sessionRequestedInfo);
  const createSessionsResponse = await (nexusSessionClient as any).grantPermission({
    sessionRequestedInfo,
  });

  console.log(">> createSessionsResponse", createSessionsResponse);

  if (!createSessionsResponse.userOpHash) {
    throw new Error("Failed to create sessions");
  }

  if (!createSessionsResponse.permissionIds) {
    throw new Error("Failed to create sessions");
  }

  const receiptTwo = await nexusClient.waitForUserOperationReceipt({
    hash: createSessionsResponse.userOpHash,
  });

  if (!receiptTwo.success) {
    throw new Error("Failed to create sessions");
  }
  console.log(`>> receipt - createSessionsResponse`);

  const sessionData: SessionData = {
    granter: nexusClient.account.address,
    sessionPublicKey: sessionOwner.address,
    moduleData: {
      permissionIds: createSessionsResponse.permissionIds,
      action: createSessionsResponse.action,
      mode: SmartSessionMode.USE,
      sessions: createSessionsResponse.sessions,
    },
  };

  console.log(`>> finish session creation`);
  console.log(`>> start executing session`);

  const newNexusAccount = await toNexusAccount({
    signer: sessionOwner,
    accountAddress: sessionData.granter,
    chain: currentChain,
    transport: http(),
  });

  const smartSessionNexusClient = createBundlerClient({
    chain: currentChain,
    transport: http(bundlerUrl),
    account: nexusAccount,
    paymaster: paymaster,
    userOperation: {
      estimateFeesPerGas: async () => (await paymaster.getUserOperationGasPrice()).fast,
    },
  });

  console.log(`>> smartSessionNexusClient`);

  const usePermissionsModule = toSmartSessionsValidator({
    account: smartSessionNexusClient.account,
    signer: sessionOwner,
    moduleData: sessionData.moduleData,
  });

  console.log(`>> usePermissionsModule`);

  const useSmartSessionNexusClient = smartSessionNexusClient
    .extend((client) => erc7579Actions()(client as any))
    .extend(smartSessionUseActions(usePermissionsModule) as any) as SmartSessionUseActions<any> & Erc7579Actions<SmartAccount>;

  console.log(`>> useSmartSessionNexusClient`);

  const userOpHash = await useSmartSessionNexusClient.usePermission({
    calls: [
      {
        to: testAddresses.Counter,
        data: encodeFunctionData({
          abi: CounterAbi,
          functionName: "incrementNumber",
          args: [],
        }),
      },
    ],
  });

  console.log(`>> userOpHash - useSmartSessionNexusClient.usePermission`);

  if (!userOpHash) {
    throw new Error("Failed to create sessions");
  }
  const receiptThree = await accountClient.waitForUserOperationReceipt({
    hash: userOpHash,
  });

  console.log(`receiptThree: ${JSON.stringify(receiptThree, null, 2)}`);
};

init();

// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};
