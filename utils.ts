import {
  TIME_FRAME_POLICY_ADDRESS,
  UNIVERSAL_ACTION_POLICY_ADDRESS,
  USAGE_LIMIT_POLICY_ADDRESS,
  VALUE_LIMIT_POLICY_ADDRESS,
} from "@biconomy/sdk";
import {
  MOCK_ATTESTER_ADDRESS,
  OWNABLE_EXECUTOR_ADDRESS,
  OWNABLE_VALIDATOR_ADDRESS,
  REGISTRY_ADDRESS,
  RHINESTONE_ATTESTER_ADDRESS,
  SMART_SESSIONS_ADDRESS,
} from "@rhinestone/module-sdk";
import type { Address, Hex } from "viem";
import { baseSepolia } from "viem/chains";

export const TEST_CONTRACTS: Record<
  string,
  { chainId: number; name: string; address: Hex }
> = {
  // Rhinestone
  OwnableValidator: {
    chainId: baseSepolia.id,
    name: "OwnableValidator",
    address: OWNABLE_VALIDATOR_ADDRESS,
  },
  OwnableExecutor: {
    chainId: baseSepolia.id,
    name: "OwnableExecutor",
    address: OWNABLE_EXECUTOR_ADDRESS,
  },
  SmartSession: {
    chainId: baseSepolia.id,
    name: "SmartSession",
    address: SMART_SESSIONS_ADDRESS,
  },
  UniActionPolicy: {
    chainId: baseSepolia.id,
    name: "UniActionPolicy",
    address: UNIVERSAL_ACTION_POLICY_ADDRESS,
  },
  Counter: {
    chainId: baseSepolia.id,
    name: "Counter",
    address: "0x14e4829E655F0b3a1793838dDd47273D5341d416",
  },
  MockCallee: {
    chainId: baseSepolia.id,
    name: "MockCallee",
    address: "0x29FdD9D9A9f8CD8dCa0F4764bf0F959183DF4139",
  },
  MockToken: {
    chainId: baseSepolia.id,
    name: "MockToken",
    address: "0x0006be192b4E06770eaa624AE7648DBF9051221c",
  },
  TokenWithPermit: {
    chainId: baseSepolia.id,
    name: "TokenWithPermit",
    address: "0x51fdb803fD49f0f5bd03de0400a8F17dA2Aa6999",
  },
  MockAttester: {
    chainId: baseSepolia.id,
    name: "MockAttester",
    address: MOCK_ATTESTER_ADDRESS,
  },
  RhinestoneAttester: {
    chainId: baseSepolia.id,
    name: "RhinestoneAttester",
    address: RHINESTONE_ATTESTER_ADDRESS,
  },
  MockRegistry: {
    chainId: baseSepolia.id,
    name: "MockRegistry",
    address: REGISTRY_ADDRESS,
  },
  TimeFramePolicy: {
    chainId: baseSepolia.id,
    name: "TimeFramePolicy",
    address: TIME_FRAME_POLICY_ADDRESS,
  },
  UsageLimitPolicy: {
    chainId: baseSepolia.id,
    name: "UsageLimitPolicy",
    address: USAGE_LIMIT_POLICY_ADDRESS,
  },
  ValueLimitPolicy: {
    chainId: baseSepolia.id,
    name: "ValueLimitPolicy",
    address: VALUE_LIMIT_POLICY_ADDRESS,
  },
  WalletConnectCoSigner: {
    chainId: baseSepolia.id,
    name: "WalletConnect CoSigner",
    address: "0x24084171C36Fa6dfdf41D9C89A51F600ed35A731",
  },
  MockK1Validator: {
    chainId: baseSepolia.id,
    name: "MockK1Validator",
    address: "0x2db5c5A93c71A2562b751Ad3eaB18BFB5fb96374",
  },
  UserOperationBuilder: {
    chainId: baseSepolia.id,
    name: "UserOperationBuilder",
    address: "0xb07D7605a1AAeE4e56915363418229c127fF7C3D",
  },
  MockSignatureValidator: {
    chainId: baseSepolia.id,
    name: "MockSignatureValidator",
    address: "0x0d0C730F50a6da2725d4CD4eb91Bc678Bd377F7D",
  },
};

type ContractNames = keyof typeof TEST_CONTRACTS;
export const testAddresses: Record<ContractNames, Address> = Object.keys(
  TEST_CONTRACTS
).reduce((mem, key) => {
  mem[key] = TEST_CONTRACTS[key].address;
  return mem;
}, {} as Record<ContractNames, Address>);
