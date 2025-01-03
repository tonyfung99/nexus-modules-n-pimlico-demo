import {
  MAINNET_ADDRESS_K1_VALIDATOR_ADDRESS,
  MAINNET_ADDRESS_K1_VALIDATOR_FACTORY_ADDRESS,
  erc7579Actions,
  safeMultiplier,
  toNexusAccount,
  toSmartSessionsValidator,
} from "@biconomy/sdk";
import { http } from "viem";
import { createBundlerClient } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import {
  bundlerUrl,
  chain,
  privateKey,
  publicClient,
  sessionOwnerPrivateKey,
} from "./src/constants";

export const createAccountAndSendTransaction = async () => {
  const userAccount = privateKeyToAccount(`0x${privateKey}`);
  const sessionOwner = privateKeyToAccount(`0x${sessionOwnerPrivateKey}`);
  const sessionPublicKey = sessionOwner.address;

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
    // paymaster,
    userOperation: {
      estimateFeesPerGas: async (_) => {
        const feeData = await publicClient.estimateFeesPerGas();
        return {
          maxFeePerGas: safeMultiplier(feeData.maxFeePerGas, 1.4),
          maxPriorityFeePerGas: safeMultiplier(
            feeData.maxPriorityFeePerGas,
            1.4
          ),
        };
      },
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

  // 4. Install the smart session module
  const hash = await nexusClient.installModule({
    module: sessionsModule.moduleInitData,
  });
  const { success: installSuccess } =
    await nexusClient.waitForUserOperationReceipt({ hash });

  console.log(`installSuccess: ${installSuccess}, hash: ${hash}`);

  // const nexusSessionClient = nexusClient.extend(
  //   smartSessionCreateActions(sessionsModule)
  // );

  // const sessionRequestedInfo: CreateSessionDataParams[] = [
  //   {
  //     sessionPublicKey, // Public key of the session
  //     actionPoliciesInfo: [
  //       {
  //         contractAddress: "0x9CB7345d91e2120B5080ca7b786d9F40436D7895",
  //         rules: [],
  //         functionSelector: "0x273ea3e3" as Hex, // Selector for 'incrementNumber'
  //       },
  //     ],
  //   },
  // ];

  // // 5. Create the smart session
  // const createSessionsResponse = await nexusSessionClient.grantPermission({
  //   sessionRequestedInfo,
  // });

  // const { success } = await nexusClient.waitForUserOperationReceipt({
  //   hash: createSessionsResponse.userOpHash,
  // });

  // console.log(
  //   `success: ${success}, hash: ${createSessionsResponse.userOpHash}`
  // );

  // // Use the Smart Session

  // // 1. Create active session data
  // const sessionData: SessionData = {
  //   granter: nexusClient.account.address,
  //   sessionPublicKey,
  //   description: `Permission to increment number at ${"0xabc"} on behalf of ${nexusClient.account.address.slice(
  //     0,
  //     6
  //   )} `, // Optional
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
  //   // paymaster,
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
  //       to: "0x9CB7345d91e2120B5080ca7b786d9F40436D7895",
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
