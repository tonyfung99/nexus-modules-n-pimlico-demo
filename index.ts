import {
  createBicoPaymasterClient,
  createSmartAccountClient,
  smartSessionCreateActions,
  SmartSessionMode,
  smartSessionUseActions,
  toSmartSessionsValidator,
  type CreateSessionDataParams,
  type SessionData,
} from "@biconomy/sdk";
import { encodeFunctionData, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  bundlerUrl,
  chain,
  CounterAbi,
  privateKey,
  sessionOwnerPrivateKey,
} from "./src/constants.js";
import { testAddresses } from "./utils.js";

const init = async () => {
  const eoaAccount = privateKeyToAccount(`0x${privateKey}`);
  const sessionOwner = privateKeyToAccount(`0x${sessionOwnerPrivateKey}`);

  const nexusClient = await createSmartAccountClient({
    signer: eoaAccount,
    chain,
    transport: http(),
    bundlerTransport: http(bundlerUrl),
    paymaster: createBicoPaymasterClient({
      transport: http(
        "https://paymaster.biconomy.io/api/v2/84532/dGSXkf5Xb.aa9555c3-fbfa-4fae-8a8a-e7e40e57aa0f"
      ),
    }),
  });

  const sessionsModule = toSmartSessionsValidator({
    account: nexusClient.account,
    signer: eoaAccount,
  });

  const isInstalledBefore = await nexusClient.isModuleInstalled({
    module: sessionsModule,
  });

  if (!isInstalledBefore) {
    const hash = await nexusClient.installModule({
      module: sessionsModule.moduleInitData,
    });

    const { success: installSuccess } =
      await nexusClient.waitForUserOperationReceipt({ hash });

    if (!installSuccess) {
      throw new Error("Failed to install module");
    }
  }

  const isInstalledAfter = await nexusClient.isModuleInstalled({
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

  const nexusSessionClient = nexusClient.extend(
    smartSessionCreateActions(sessionsModule)
  );

  const createSessionsResponse = await nexusSessionClient.grantPermission({
    sessionRequestedInfo,
  });

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
  console.log(`receiptTwo: ${JSON.stringify(receiptTwo, null, 2)}`);

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

  const smartSessionNexusClient = await createSmartAccountClient({
    chain,
    accountAddress: sessionData.granter,
    signer: sessionOwner,
    transport: http(),
    bundlerTransport: http(bundlerUrl),
  });

  const usePermissionsModule = toSmartSessionsValidator({
    account: smartSessionNexusClient.account,
    signer: sessionOwner,
    moduleData: sessionData.moduleData,
  });

  const useSmartSessionNexusClient = smartSessionNexusClient.extend(
    smartSessionUseActions(usePermissionsModule)
  );

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

  if (!userOpHash) {
    throw new Error("Failed to create sessions");
  }
  const receiptThree =
    await useSmartSessionNexusClient.waitForUserOperationReceipt({
      hash: userOpHash,
    });

  console.log(`receiptThree: ${JSON.stringify(receiptThree, null, 2)}`);
};

init();

// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};
