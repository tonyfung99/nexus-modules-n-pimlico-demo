import {
  erc7579Actions,
  MAINNET_ADDRESS_K1_VALIDATOR_ADDRESS,
  MAINNET_ADDRESS_K1_VALIDATOR_FACTORY_ADDRESS,
  smartSessionCreateActions,
  toNexusAccount,
  toSmartSessionsValidator,
  type CreateSessionDataParams,
  type ModuleMeta,
  type NexusClient,
} from "@biconomy/sdk";
import { ethers } from "ethers";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { http } from "viem";
import {
  createBundlerClient,
  entryPoint07Address,
  UserOperationExecutionError,
} from "viem/account-abstraction";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { bundlerUrl, chain, CounterAbi, privateKey } from "./src/constants";

const COUNTER_CONTRACT_ADDRESS = "0x9CB7345d91e2120B5080ca7b786d9F40436D7895";

// Return hash if successful, null if already installed
const installSessionModuleOrThrow = async ({
  nexusClient,
  moduleInitData,
}: {
  nexusClient: NexusClient;
  moduleInitData: ModuleMeta;
}) => {
  try {
    const hash = await nexusClient.installModule({
      module: moduleInitData,
    });

    const { success } = await nexusClient.waitForUserOperationReceipt({
      hash,
    });

    if (!success) {
      throw new Error("Failed to install module");
    }

    return hash;
  } catch (error) {
    const ALREADY_INSTALLED_ERROR =
      "0x40d3d1a400000000000000000000000000000000002b0ecfbd0496ee71e01257da0e37de";
    if (
      error instanceof UserOperationExecutionError &&
      error.shortMessage.includes(ALREADY_INSTALLED_ERROR)
    ) {
      console.log("Module already installed");
      // Do nothing

      return null;
    } else {
      throw error;
    }
  }
};

export const createAccountAndSendTransaction = async () => {
  const userAccount = privateKeyToAccount(`0x${privateKey}`);
  const sessionOwner = privateKeyToAccount(generatePrivateKey());
  const sessionPublicKey = sessionOwner.address;

  const paymaster = createPimlicoClient({
    transport: http(bundlerUrl),
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });

  const nexusAccount = await toNexusAccount({
    signer: userAccount,
    chain,
    transport: http(),
    // You can omit this outside of a testing context
    k1ValidatorAddress: MAINNET_ADDRESS_K1_VALIDATOR_ADDRESS,
    factoryAddress: MAINNET_ADDRESS_K1_VALIDATOR_FACTORY_ADDRESS,
  });

  // 2. Set up Nexus client
  const nexusClient = createBundlerClient({
    chain: chain,
    transport: http(bundlerUrl),
    account: nexusAccount,
    paymaster,
    paymasterContext: {
      sponsorshipPolicyId: "sp_high_lyja",
    },
    userOperation: {
      estimateFeesPerGas: async () =>
        (await paymaster.getUserOperationGasPrice()).fast,
    },
  }).extend(erc7579Actions());

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
          rules: [],
          functionSelector:
            new ethers.Interface(CounterAbi as any).getFunction(
              "incrementNumber"
            )?.selector || "",

          sudo: true,
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

  // console.log(
  //   `createSessionsResponse: ${createSessionsResponse}, success: ${success}, hash: ${createSessionsResponse.userOpHash}`
  // );

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
