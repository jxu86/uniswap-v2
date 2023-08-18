import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, artifacts } from "hardhat";
import { Contract, utils, constants, BigNumber } from 'ethers'



describe("UniswapV2Factory", () => {

    let wallet: any
    // let walletPrivateKey: string
    let otherWallet: any
    let factory: Contract
    const provider = ethers.provider;
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
      const UniswapV2Pair = await artifacts.readArtifact("contracts/UniswapV2Pair.sol:UniswapV2Pair")
      UniswapV2PairBytecode = UniswapV2Pair.bytecode
      UniswapV2PairABI = UniswapV2Pair.abi
    }

    beforeEach(async () => {
      await loadFixture(deployContract)
    })

    function getCreate2Address(
      factoryAddress: string,
      [tokenA, tokenB]: [string, string],
      bytecode: string
    ): string {
      const [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA]
      const create2Inputs = [
        '0xff',
        factoryAddress,
        utils.keccak256(utils.solidityPack(['address', 'address'], [token0, token1])),
        utils.keccak256(bytecode)
      ]
      const sanitizedInputs = `0x${create2Inputs.map(i => i.slice(2)).join('')}`
      return utils.getAddress(`0x${utils.keccak256(sanitizedInputs).slice(-40)}`)
    }

    it('feeTo, feeToSetter, allPairsLength', async () => {
      expect(await factory.feeTo()).to.eq(constants.AddressZero)
      const feeToSetter = await factory.feeToSetter()
      expect(await factory.feeToSetter()).to.eq(wallet.address)
      expect(await factory.allPairsLength()).to.eq(0)
    })

    async function createPair(tokens: [string, string]) {

      const create2Address = getCreate2Address(factory.address, tokens, UniswapV2PairBytecode)
      console.log('create2Address:', create2Address)

      await expect(factory.createPair(...tokens))
        .to.emit(factory, 'PairCreated')
        .withArgs(TEST_ADDRESSES[0], TEST_ADDRESSES[1], create2Address, BigNumber.from(1))

      await expect(factory.createPair(...tokens)).to.be.reverted // UniswapV2: PAIR_EXISTS
      await expect(factory.createPair(...tokens.slice().reverse())).to.be.reverted // UniswapV2: PAIR_EXISTS
      expect(await factory.getPair(...tokens)).to.eq(create2Address)
      expect(await factory.getPair(...tokens.slice().reverse())).to.eq(create2Address)
      expect(await factory.allPairs(0)).to.eq(create2Address)
      expect(await factory.allPairsLength()).to.eq(1)

      const pair = new Contract(create2Address, JSON.stringify(UniswapV2PairABI), provider)
      expect(await pair.factory()).to.eq(factory.address)
      expect(await pair.token0()).to.eq(TEST_ADDRESSES[0])
      expect(await pair.token1()).to.eq(TEST_ADDRESSES[1])
    }

    it('createPair', async () => {
      await createPair(TEST_ADDRESSES)
    })

    it('createPair:reverse', async () => {
      await createPair(TEST_ADDRESSES.slice().reverse() as [string, string])
    })
  
    it.skip('createPair:gas', async () => {
      const tx = await factory.createPair(...TEST_ADDRESSES)
      const receipt = await tx.wait()
      expect(receipt.gasUsed).to.eq(2512920)
    })
  
    it('setFeeTo', async () => {
      await expect(factory.connect(otherWallet).setFeeTo(otherWallet.address)).to.be.revertedWith('UniswapV2: FORBIDDEN')
      await factory.setFeeTo(wallet.address)
      expect(await factory.feeTo()).to.eq(wallet.address)
    })
  
    it('setFeeToSetter', async () => {
      await expect(factory.connect(otherWallet).setFeeToSetter(otherWallet.address)).to.be.revertedWith('UniswapV2: FORBIDDEN')
      await factory.setFeeToSetter(otherWallet.address)
      expect(await factory.feeToSetter()).to.eq(otherWallet.address)
      await expect(factory.setFeeToSetter(wallet.address)).to.be.revertedWith('UniswapV2: FORBIDDEN')
    })

})