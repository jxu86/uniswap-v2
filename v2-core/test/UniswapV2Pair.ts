import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, artifacts } from "hardhat";
import { Contract, utils, constants, BigNumber } from 'ethers'



describe.only("UniswapV2Pair", () => {

    let wallet: any
    // let walletPrivateKey: string
    let otherWallet: any
    let factory: Contract
    let token0: Contract
    let token1: Contract
    const provider = ethers.provider
    let UniswapV2Pair: any
    let UniswapV2PairBytecode: string
    let UniswapV2PairABI: any[]
    const TEST_ADDRESSES: [string, string] = [
      '0x1000000000000000000000000000000000000000',
      '0x2000000000000000000000000000000000000000'
    ]

    async function deployContract() {
      [wallet, otherWallet] = await ethers.getSigners();
      console.log('wallet.address:', wallet.address)
      factory = await ethers.deployContract("UniswapV2Factory", [wallet.address])
      UniswapV2Pair = await artifacts.readArtifact("contracts/UniswapV2Pair.sol:UniswapV2Pair")
      // UniswapV2PairBytecode = UniswapV2Pair.bytecode
      // UniswapV2PairABI = UniswapV2Pair.abi

      const tokenA = await ethers.deployContract("ERC20", [ethers.utils.parseUnits("10000","ether")])
      const tokenB = await ethers.deployContract("ERC20", [ethers.utils.parseUnits("10000","ether")])
      await factory.createPair(tokenA.address, tokenB.address)
      const pairAddress = await factory.getPair(tokenA.address, tokenB.address)
      const pair = new Contract(pairAddress, JSON.stringify(UniswapV2Pair.abi), provider).connect(wallet)

      const token0Address = (await pair.token0()).address
      token0 = tokenA.address === token0Address ? tokenA : tokenB
      token1 = tokenA.address === token0Address ? tokenB : tokenA
    }




    beforeEach(async () => {
      await loadFixture(deployContract)
    })


    it('mint', async () => {

    })


})