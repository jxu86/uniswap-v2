import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import "hardhat-contract-sizer";

dotenv.config();

// const {ProxyAgent, setGlobalDispatcher} = require("undici")
// const proxyAgent = new ProxyAgent("http://127.0.0.1:7890")
// setGlobalDispatcher(proxyAgent)

const config: HardhatUserConfig = {
  solidity: {
    version: "0.5.16",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    ganache: {
        url: "http://127.0.0.1:7545"
    },
    goerli: {
      // gas: 1000000000000,
      // gasPrice: 8000000000,
      // blockGasLimit: 96507592,
      // throwOnTransactionFailures: true,
      // throwOnCallFailures: true,
      allowUnlimitedContractSize: true,
      timeout: 1800000,
      url: process.env.ALCHEMY_API_KEY_URL_GOERLI || "",
      accounts: process.env.PRIVATE_KEY_GOERLI !== undefined ? [process.env.PRIVATE_KEY_GOERLI] : [],
    },
    mumbai: {
      url: process.env.ALCHEMY_API_KEY_URL_MUMBAI || "",
      accounts: process.env.PRIVATE_KEY_MUMBAI !== undefined ? [process.env.PRIVATE_KEY_MUMBAI] : [],
    },
    hardhat: {
      gas: 1,
      chainId: 1,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        passphrase: "",
        accountsBalance: '10000000000000000000000000000'
      }
    },
    ethereum: {
      url: process.env.ALCHEMY_API_KEY_URL_MAINNET || "",
      accounts: process.env.PRIVATE_KEY_MAINNET !== undefined ? [process.env.PRIVATE_KEY_MAINNET] : [],
    },
    polygon: {
      url: process.env.ALCHEMY_API_KEY_URL_POLYGON || "",
      accounts: process.env.PRIVATE_KEY_POLYGON !== undefined ? [process.env.PRIVATE_KEY_POLYGON] : [],
    },
    cmpTestnet: {
      url: process.env.ALCHEMY_API_KEY_URL_CMPTESTNET || "",
      accounts: process.env.PRIVATE_KEY_CMPTESTNET !== undefined ? [process.env.PRIVATE_KEY_CMPTESTNET] : [],
    },
    cmpMainnet: {
      url: process.env.ALCHEMY_API_KEY_URL_CMPMAINNET || "",
      accounts: process.env.PRIVATE_KEY_CMPMAINNET !== undefined ? [process.env.PRIVATE_KEY_CMPMAINNET] : [],
    },
    bnbTestnet: {
      url: process.env.ALCHEMY_API_KEY_URL_BNBTESTNET || "",
      accounts: process.env.PRIVATE_KEY_BNBTESTNET !== undefined ? [process.env.PRIVATE_KEY_BNBTESTNET] : [],
    },
    bnbMainnet: {
      url: process.env.ALCHEMY_API_KEY_URL_BNBMAINNET || "",
      accounts: process.env.PRIVATE_KEY_BNBMAINNET !== undefined ? [process.env.PRIVATE_KEY_BNBMAINNET] : [],
    },
    ArbitrumGoerli: {
      url: process.env.ALCHEMY_API_KEY_URL_ARBITRUM_GOERLI || "",
      accounts: process.env.PRIVATE_KEY_ARBITRUM_GOERLI !== undefined ? [process.env.PRIVATE_KEY_ARBITRUM_GOERLI] : [],
    },
    ArbitrumMainnet: {
      url: process.env.ALCHEMY_API_KEY_URL_ARBITRUM_MAINNET || "",
      accounts: process.env.PRIVATE_KEY_ARBITRUM_MAINNET !== undefined ? [process.env.PRIVATE_KEY_ARBITRUM_MAINNET] : [],
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "ETH",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  mocha: {
    timeout: 100000000
  },
  // contractSizer: {
  //   alphaSort: true,
  //   runOnCompile: true,
  //   disambiguatePaths: false,
  // },
};

export default config;
