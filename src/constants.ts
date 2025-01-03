import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

export const CounterAbi = [
  {
    inputs: [],
    name: "incrementNumber",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];
export const privateKey =
  "67ab66f3df8b39445f8b34ed85c4ca68f8f48861b359582b8c9c0d84611db5ca";

export const pimlicoApiKey = "pim_7v4gDjrni9vE38P9GDNC1W";

export const bundlerUrl =
  "https://api.pimlico.io/v2/84532/rpc?apikey=pim_7v4gDjrni9vE38P9GDNC1W";

export const sessionOwnerPrivateKey =
  "b3e825c37425a8b8b8122c64e46c19f3475debbce6747698ca3d11a0cb097811";

export const chain = baseSepolia;

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});
