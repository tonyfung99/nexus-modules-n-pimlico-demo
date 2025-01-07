import {
  createBicoPaymasterClient,
  createSmartAccountClient,
  smartSessionCreateActions,
  toNexusAccount,
  toSmartSessionsValidator,
  type CreateSessionDataParams,
  type ModuleMeta,
  type NexusClient,
} from "@biconomy/sdk";
import { http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { bundlerUrl, chain, privateKey } from "./src/constants";

const COUNTER_CONTRACT_ADDRESS = "0x14e4829E655F0b3a1793838dDd47273D5341d416";

// Return hash if successful, null if already installed
const installSessionModuleOrThrow = async ({
  nexusClient,
  moduleInitData,
}: {
  nexusClient: NexusClient;
  moduleInitData: ModuleMeta;
}) => {
  const isInstalled = await nexusClient.isModuleInstalled({
    module: moduleInitData,
  });

  if (isInstalled) {
    return null;
  }

  const hash = await nexusClient.installModule({
    module: moduleInitData,
  });

  const { success } = await nexusClient.waitForUserOperationReceipt({
    hash,
  });

  const isInstalledAfter = await nexusClient.isModuleInstalled({
    module: moduleInitData,
  });

  if (!success || !isInstalledAfter) {
    throw new Error("Failed to install module");
  }

  return hash;
};

export const createAccountAndSendTransaction = async () => {
  const userAccount = privateKeyToAccount(`0x${privateKey}`);
  const sessionOwner = privateKeyToAccount(generatePrivateKey());
  const sessionPublicKey = sessionOwner.address;

  const paymaster = createBicoPaymasterClient({
    paymasterUrl:
      "https://paymaster.biconomy.io/api/v2/84532/dGSXkf5Xb.aa9555c3-fbfa-4fae-8a8a-e7e40e57aa0f",
  });

  const nexusAccount = await toNexusAccount({
    signer: userAccount,
    chain,
    transport: http(),
  });

  // 2. Set up Nexus client
  const nexusClient = await createSmartAccountClient({
    signer: userAccount,
    chain,
    transport: http(),
    paymaster,
    bundlerTransport: http(bundlerUrl),
  });

  if (!nexusClient.account) throw new Error("Nexus client not found");

  // 3. Create a smart sessions module for the user's account
  const sessionsModule = toSmartSessionsValidator({
    account: nexusClient.account,
    signer: userAccount,
  });

  console.log(
    "smart account address",
    await nexusAccount.getCounterFactualAddress()
  );

  const hash = await installSessionModuleOrThrow({
    nexusClient: nexusClient as unknown as NexusClient,
    moduleInitData: sessionsModule.moduleInitData,
  });

  console.log("----- hash", hash);

  const nexusSessionClient = nexusClient.extend(
    smartSessionCreateActions(sessionsModule)
  );

  const sessionRequestedInfo: CreateSessionDataParams[] = [
    {
      sessionPublicKey, // Public key of the session
      actionPoliciesInfo: [
        {
          contractAddress: COUNTER_CONTRACT_ADDRESS,
          functionSelector: `0x273ea3e3`,
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

  // // Use the Smart Session

  // // 1. Create active session data
  // const sessionData: SessionData = {
  //   granter: nexusClient.account.address,
  //   sessionPublicKey,
  //   // description: `Permission to increment number at ${COUNTER_CONTRACT_ADDRESS} on behalf of ${nexusClient.account.address.slice(
  //   //   0,
  //   //   6
  //   // )} `, // Optional
  //   moduleData: {
  //     ...createSessionsResponse,
  //     mode: SmartSessionMode.USE,
  //   },
  // };

  // const compressedSessionData = stringify(sessionData);
  // console.log("compressedSessionData", compressedSessionData);

  // // 2. Create a Nexus Client for Using the Session
  // const smartSessionNexusClient = await createNexusClient({
  //   chain: chain,
  //   accountAddress: sessionData.granter,
  //   signer: sessionOwner,
  //   transport: http(),
  //   bundlerTransport: http(bundlerUrl),
  //   paymaster,
  // });

  // // 3. Create a Smart Sessions Module for the Session Key
  // const usePermissionsModule = toSmartSessionsValidator({
  //   account: smartSessionNexusClient.account,
  //   signer: sessionOwner,
  //   moduleData: sessionData.moduleData,
  // });

  // const useSmartSessionNexusClient = smartSessionNexusClient.extend(
  //   smartSessionUseActions(usePermissionsModule)
  // );

  // // 4. Send transactions with sessions
  // const userOpHash = await useSmartSessionNexusClient.usePermission({
  //   calls: [
  //     {
  //       to: COUNTER_CONTRACT_ADDRESS,
  //       data: encodeFunctionData({
  //         abi: CounterAbi,
  //         functionName: "incrementNumber",
  //       }),
  //     },
  //   ],
  // });

  // console.log("userOpHash", userOpHash);
};

createAccountAndSendTransaction();
