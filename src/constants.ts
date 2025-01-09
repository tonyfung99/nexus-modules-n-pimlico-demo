import { createPublicClient, http, type Abi } from "viem";
import { baseSepolia } from "viem/chains";

export const CounterAbi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newValue",
        type: "uint256",
      },
    ],
    name: "NumberIncremented",
    type: "event",
  },
  {
    inputs: [],
    name: "getNumber",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "incrementNumber",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const satisfies Abi;

export const privateKey =
  "67ab66f3df8b39445f8b34ed85c4ca68f8f48861b359582b8c9c0d84611db5ca";

export const pimlicoApiKey = "pim_7v4gDjrni9vE38P9GDNC1W";

// export const bundlerUrl = `https://api.pimlico.io/v2/84532/rpc?apikey=${pimlicoApiKey}`;
export const bundlerUrl =
  "https://bundler.biconomy.io/api/v3/84532/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44";

export const sessionOwnerPrivateKey =
  "b3e825c37425a8b8b8122c64e46c19f3475debbce6747698ca3d11a0cb097812";

export const chain = baseSepolia;

export const publicClient = createPublicClient({
  chain,
  transport: http(
    "https://base-sepolia.g.alchemy.com/v2/wr6NQaAYQGyQf1xcZCAiY5rtce_57E1H"
  ),
});
