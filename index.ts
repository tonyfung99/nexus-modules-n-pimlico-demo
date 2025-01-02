import {
  type CreateSessionDataParams,
  type SessionData,
  createNexusClient,
  smartSessionCreateActions,
  smartSessionUseActions,
  toSmartSessionsValidator,
} from "@biconomy/sdk";
import { SmartSessionMode } from "@rhinestone/module-sdk/module";
import { createSmartAccountClient } from "permissionless";
import {
  type PimlicoClient,
  createPimlicoClient,
} from "permissionless/clients/pimlico";
import { type Account, type Hex, encodeFunctionData, http } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const CounterAbi = [
  {
    inputs: [],
    name: "incrementNumber",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];
const privateKey =
  "67ab66f3df8b39445f8b34ed85c4ca68f8f48861b359582b8c9c0d84611db5ca";

const bundlerUrl =
  "https://api.pimlico.io/v2/84532/rpc?apikey=pim_7v4gDjrni9vE38P9GDNC1W";

const sessionOwnerPrivateKey =
  "b3e825c37425a8b8b8122c64e46c19f3475debbce6747698ca3d11a0cb097811";

const getAccountAddress = async ({
  userAccount,
  bundlerUrl,
  paymaster,
}: {
  userAccount: Account;
  bundlerUrl: string;
  paymaster: PimlicoClient;
}) => {
  const tmpNexusClient = createSmartAccountClient({
    account: userAccount,
    chain: baseSepolia,
    bundlerTransport: http(bundlerUrl),
    paymaster,
    userOperation: {
      estimateFeesPerGas: async () =>
        (await paymaster.getUserOperationGasPrice()).fast,
    },
  });

  const address = tmpNexusClient.account?.address;
  if (!address) throw new Error("Failed to get account address");
  return address;
};

export const createAccountAndSendTransaction = async () => {
  const userAccount = privateKeyToAccount(`0x${privateKey}`);
  const sessionOwner = privateKeyToAccount(`0x${sessionOwnerPrivateKey}`);
  const sessionPublicKey = sessionOwner.address;

  const paymaster = createPimlicoClient({
    chain: baseSepolia,
    transport: http(bundlerUrl),
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });

  // 2. Set up Nexus client
  const nexusClient = await createNexusClient({
    chain: baseSepolia,
    accountAddress: await getAccountAddress({
      userAccount,
      bundlerUrl,
      paymaster,
    }),
    signer: userAccount,
    transport: http(),
    bundlerTransport: http(bundlerUrl),
    paymaster,
  });

  console.log("smart account address", nexusClient.account.address);

  // 3. Create a smart sessions module for the user's account
  const sessionsModule = toSmartSessionsValidator({
    account: nexusClient.account,
    signer: userAccount,
  });

  // 4. Install the smart session module
  const hash = await nexusClient.installModule({
    module: sessionsModule.moduleInitData,
  });
  const { success: installSuccess } =
    await nexusClient.waitForUserOperationReceipt({ hash });

  const nexusSessionClient = nexusClient.extend(
    smartSessionCreateActions(sessionsModule)
  );

  const sessionRequestedInfo: CreateSessionDataParams[] = [
    {
      sessionPublicKey, // Public key of the session
      actionPoliciesInfo: [
        {
          contractAddress: "0x9CB7345d91e2120B5080ca7b786d9F40436D7895",
          rules: [],
          functionSelector: "0x273ea3e3" as Hex, // Selector for 'incrementNumber'
        },
      ],
    },
  ];

  // 5. Create the smart session
  const createSessionsResponse = await nexusSessionClient.grantPermission({
    sessionRequestedInfo,
  });

  const { success } = await nexusClient.waitForUserOperationReceipt({
    hash: createSessionsResponse.userOpHash,
  });

  // Use the Smart Session

  // 1. Create active session data
  const sessionData: SessionData = {
    granter: nexusClient.account.address,
    sessionPublicKey,
    moduleData: {
      permissionIds: createSessionsResponse.permissionIds,
      mode: SmartSessionMode.USE,
      // TODO: Fix this later
    } as any,
  };

  // 2. Create a Nexus Client for Using the Session
  const smartSessionNexusClient = await createNexusClient({
    chain: baseSepolia,
    accountAddress: sessionData.granter,
    signer: sessionOwner,
    transport: http(),
    bundlerTransport: http(bundlerUrl),
  });

  // 3. Create a Smart Sessions Module for the Session Key
  const usePermissionsModule = toSmartSessionsValidator({
    account: smartSessionNexusClient.account,
    signer: sessionOwner,
    moduleData: sessionData.moduleData,
  });

  const useSmartSessionNexusClient = smartSessionNexusClient.extend(
    smartSessionUseActions(usePermissionsModule)
  );

  // 4. Send transactions with sessions
  const userOpHash = await useSmartSessionNexusClient.usePermission({
    calls: [
      {
        to: "0xabc",
        data: encodeFunctionData({
          abi: CounterAbi,
          functionName: "incrementNumber",
        }),
      },
    ],
  });
};

createAccountAndSendTransaction();
