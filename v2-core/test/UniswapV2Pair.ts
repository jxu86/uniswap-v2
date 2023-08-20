import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, artifacts } from "hardhat";
import { Contract, utils, constants, BigNumber, providers } from 'ethers'


describe.only("UniswapV2Pair", () => {

    let wallet: any
    let otherWallet: any
    let factory: Contract
    let token0: Contract
    let token1: Contract
    const provider = ethers.provider
    let UniswapV2Pair: any
    let UniswapV2PairBytecode: string
    let UniswapV2PairABI: any[]
    let pair: any
    const TEST_ADDRESSES: [string, string] = [
      '0x1000000000000000000000000000000000000000',
      '0x2000000000000000000000000000000000000000'
    ]

    const MINIMUM_LIQUIDITY = BigNumber.from(10).pow(3)

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
      pair = new Contract(pairAddress, JSON.stringify(UniswapV2Pair.abi), provider).connect(wallet)

      const token0Address = (await pair.token0()).address
      token0 = tokenA.address === token0Address ? tokenA : tokenB
      token1 = tokenA.address === token0Address ? tokenB : tokenA
    }


    function expandTo18Decimals(num: number) {
      return ethers.utils.parseUnits(num.toString(),"ether")
    }


    beforeEach(async () => {
      await loadFixture(deployContract)
    })


    it('mint', async () => {
      const token0Amount = expandTo18Decimals(1)
      const token1Amount = expandTo18Decimals(4)
      await token0.transfer(pair.address, token0Amount)
      await token1.transfer(pair.address, token1Amount)
  
      const expectedLiquidity = expandTo18Decimals(2)
      await expect(pair.mint(wallet.address, {}))
        .to.emit(pair, 'Transfer')
        .withArgs(constants.AddressZero, constants.AddressZero, MINIMUM_LIQUIDITY)
        .to.emit(pair, 'Transfer')
        .withArgs(constants.AddressZero, wallet.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
        .to.emit(pair, 'Sync')
        .withArgs(token0Amount, token1Amount)
        .to.emit(pair, 'Mint')
        .withArgs(wallet.address, token0Amount, token1Amount)
  
      expect(await pair.totalSupply()).to.eq(expectedLiquidity)
      expect(await pair.balanceOf(wallet.address)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      expect(await token0.balanceOf(pair.address)).to.eq(token0Amount)
      expect(await token1.balanceOf(pair.address)).to.eq(token1Amount)
      const reserves = await pair.getReserves()
      expect(reserves[0]).to.eq(token0Amount)
      expect(reserves[1]).to.eq(token1Amount)
    })

    async function addLiquidity(token0Amount: BigNumber, token1Amount: BigNumber) {
      await token0.transfer(pair.address, token0Amount)
      await token1.transfer(pair.address, token1Amount)
      await pair.mint(wallet.address, {})
    }

    const swapTestCases: BigNumber[][] = [
      [1, 5, 10, '1662497915624478906'],
      [1, 10, 5, '453305446940074565'],
  
      [2, 5, 10, '2851015155847869602'],
      [2, 10, 5, '831248957812239453'],
  
      [1, 10, 10, '906610893880149131'],
      [1, 100, 100, '987158034397061298'],
      [1, 1000, 1000, '996006981039903216']
    ].map(a => a.map(n => (typeof n === 'string' ? BigNumber.from(n) : expandTo18Decimals(n))))
    swapTestCases.forEach((swapTestCase, i) => {
      it(`getInputPrice:${i}`, async () => {
        const [swapAmount, token0Amount, token1Amount, expectedOutputAmount] = swapTestCase
        await addLiquidity(token0Amount, token1Amount)
        await token0.transfer(pair.address, swapAmount)
        await expect(pair.swap(0, expectedOutputAmount.add(1), wallet.address, '0x', {})).to.be.revertedWith(
          'UniswapV2: K'
        )
        await pair.swap(0, expectedOutputAmount, wallet.address, '0x', {})
      })
    })

    const optimisticTestCases: BigNumber[][] = [
      ['997000000000000000', 5, 10, 1], // given amountIn, amountOut = floor(amountIn * .997)
      ['997000000000000000', 10, 5, 1],
      ['997000000000000000', 5, 5, 1],
      [1, 5, 5, '1003009027081243732'] // given amountOut, amountIn = ceiling(amountOut / .997)
    ].map(a => a.map(n => (typeof n === 'string' ? BigNumber.from(n) : expandTo18Decimals(n))))
    optimisticTestCases.forEach((optimisticTestCase, i) => {
      it(`optimistic:${i}`, async () => {
        const [outputAmount, token0Amount, token1Amount, inputAmount] = optimisticTestCase
        await addLiquidity(token0Amount, token1Amount)
        await token0.transfer(pair.address, inputAmount)
        await expect(pair.swap(outputAmount.add(1), 0, wallet.address, '0x', {})).to.be.revertedWith(
          'UniswapV2: K'
        )
        await pair.swap(outputAmount, 0, wallet.address, '0x', {})
      })
    })

    it('swap:token0', async () => {
      const token0Amount = expandTo18Decimals(5)
      const token1Amount = expandTo18Decimals(10)
      await addLiquidity(token0Amount, token1Amount)
  
      const swapAmount = expandTo18Decimals(1)
      const expectedOutputAmount = BigNumber.from('1662497915624478906')
      await token0.transfer(pair.address, swapAmount)
      await expect(pair.swap(0, expectedOutputAmount, wallet.address, '0x', {}))
        .to.emit(token1, 'Transfer')
        .withArgs(pair.address, wallet.address, expectedOutputAmount)
        .to.emit(pair, 'Sync')
        .withArgs(token0Amount.add(swapAmount), token1Amount.sub(expectedOutputAmount))
        .to.emit(pair, 'Swap')
        .withArgs(wallet.address, swapAmount, 0, 0, expectedOutputAmount, wallet.address)
  
      const reserves = await pair.getReserves()
      expect(reserves[0]).to.eq(token0Amount.add(swapAmount))
      expect(reserves[1]).to.eq(token1Amount.sub(expectedOutputAmount))
      expect(await token0.balanceOf(pair.address)).to.eq(token0Amount.add(swapAmount))
      expect(await token1.balanceOf(pair.address)).to.eq(token1Amount.sub(expectedOutputAmount))
      const totalSupplyToken0 = await token0.totalSupply()
      const totalSupplyToken1 = await token1.totalSupply()
      expect(await token0.balanceOf(wallet.address)).to.eq(totalSupplyToken0.sub(token0Amount).sub(swapAmount))
      expect(await token1.balanceOf(wallet.address)).to.eq(totalSupplyToken1.sub(token1Amount).add(expectedOutputAmount))
    })


    it('swap:token1', async () => {
      const token0Amount = expandTo18Decimals(5)
      const token1Amount = expandTo18Decimals(10)
      await addLiquidity(token0Amount, token1Amount)
  
      const swapAmount = expandTo18Decimals(1)
      const expectedOutputAmount = BigNumber.from('453305446940074565')
      await token1.transfer(pair.address, swapAmount)
      await expect(pair.swap(expectedOutputAmount, 0, wallet.address, '0x', {}))
        .to.emit(token0, 'Transfer')
        .withArgs(pair.address, wallet.address, expectedOutputAmount)
        .to.emit(pair, 'Sync')
        .withArgs(token0Amount.sub(expectedOutputAmount), token1Amount.add(swapAmount))
        .to.emit(pair, 'Swap')
        .withArgs(wallet.address, 0, swapAmount, expectedOutputAmount, 0, wallet.address)
  
      const reserves = await pair.getReserves()
      expect(reserves[0]).to.eq(token0Amount.sub(expectedOutputAmount))
      expect(reserves[1]).to.eq(token1Amount.add(swapAmount))
      expect(await token0.balanceOf(pair.address)).to.eq(token0Amount.sub(expectedOutputAmount))
      expect(await token1.balanceOf(pair.address)).to.eq(token1Amount.add(swapAmount))
      const totalSupplyToken0 = await token0.totalSupply()
      const totalSupplyToken1 = await token1.totalSupply()
      expect(await token0.balanceOf(wallet.address)).to.eq(totalSupplyToken0.sub(token0Amount).add(expectedOutputAmount))
      expect(await token1.balanceOf(wallet.address)).to.eq(totalSupplyToken1.sub(token1Amount).sub(swapAmount))
    })

    async function mineBlock(timestamp: number) {
      console.log('timestamp: ', timestamp)
      
      const tx = await ethers.provider.send("evm_mine", [timestamp]);
      console.log('###tx=> ', tx)
      
    }

    function encodePrice(reserve0: BigNumber, reserve1: BigNumber) {
      return [reserve1.mul(BigNumber.from(2).pow(112)).div(reserve0), reserve0.mul(BigNumber.from(2).pow(112)).div(reserve1)]
    }

    // it.skip('swap:gas', async () => {
    //   const token0Amount = expandTo18Decimals(5)
    //   const token1Amount = expandTo18Decimals(10)
    //   await addLiquidity(token0Amount, token1Amount)
  
    //   // ensure that setting price{0,1}CumulativeLast for the first time doesn't affect our gas math
    //   await mineBlock(provider, (await provider.getBlock('latest')).timestamp + 1)
    //   await pair.sync(overrides)
  
    //   const swapAmount = expandTo18Decimals(1)
    //   const expectedOutputAmount = BigNumber.from('453305446940074565')
    //   await token1.transfer(pair.address, swapAmount)
    //   await mineBlock(provider, (await provider.getBlock('latest')).timestamp + 1)
    //   const tx = await pair.swap(expectedOutputAmount, 0, wallet.address, '0x', overrides)
    //   const receipt = await tx.wait()
    //   expect(receipt.gasUsed).to.eq(73462)
    // })

    it('burn', async () => {
      const token0Amount = expandTo18Decimals(3)
      const token1Amount = expandTo18Decimals(3)
      await addLiquidity(token0Amount, token1Amount)
  
      const expectedLiquidity = expandTo18Decimals(3)
      await pair.transfer(pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      await expect(pair.burn(wallet.address, {}))
        .to.emit(pair, 'Transfer')
        .withArgs(pair.address, constants.AddressZero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
        .to.emit(token0, 'Transfer')
        .withArgs(pair.address, wallet.address, token0Amount.sub(1000))
        .to.emit(token1, 'Transfer')
        .withArgs(pair.address, wallet.address, token1Amount.sub(1000))
        .to.emit(pair, 'Sync')
        .withArgs(1000, 1000)
        .to.emit(pair, 'Burn')
        .withArgs(wallet.address, token0Amount.sub(1000), token1Amount.sub(1000), wallet.address)
  
      expect(await pair.balanceOf(wallet.address)).to.eq(0)
      expect(await pair.totalSupply()).to.eq(MINIMUM_LIQUIDITY)
      expect(await token0.balanceOf(pair.address)).to.eq(1000)
      expect(await token1.balanceOf(pair.address)).to.eq(1000)
      const totalSupplyToken0 = await token0.totalSupply()
      const totalSupplyToken1 = await token1.totalSupply()
      expect(await token0.balanceOf(wallet.address)).to.eq(totalSupplyToken0.sub(1000))
      expect(await token1.balanceOf(wallet.address)).to.eq(totalSupplyToken1.sub(1000))
    })

    it('price{0,1}CumulativeLast', async () => {
      const token0Amount = expandTo18Decimals(3)
      const token1Amount = expandTo18Decimals(3)
      await addLiquidity(token0Amount, token1Amount)
      const blockTimestamp = (await pair.getReserves())[2]
      console.log('###blockTimestamp: ', blockTimestamp)
      // await mineBlock(blockTimestamp + 1)
      await pair.sync({})
      console.log('###blockTimestamp: ', (await pair.getReserves())[2])
  
      const initialPrice = encodePrice(token0Amount, token1Amount)
      expect(await pair.price0CumulativeLast()).to.eq(initialPrice[0])
      expect(await pair.price1CumulativeLast()).to.eq(initialPrice[1])
      expect((await pair.getReserves())[2]).to.eq(blockTimestamp + 1)
  
      const swapAmount = expandTo18Decimals(3)
      await token0.transfer(pair.address, swapAmount)
      await mineBlock(blockTimestamp + 9)
      // swap to a new price eagerly instead of syncing
      await pair.swap(0, expandTo18Decimals(1), wallet.address, '0x', {}) // make the price nice
  
      expect(await pair.price0CumulativeLast()).to.eq(initialPrice[0].mul(10))
      expect(await pair.price1CumulativeLast()).to.eq(initialPrice[1].mul(10))
      expect((await pair.getReserves())[2]).to.eq(blockTimestamp + 10)
  
      await mineBlock(blockTimestamp + 19)
      await pair.sync({})
  
      const newPrice = encodePrice(expandTo18Decimals(6), expandTo18Decimals(2))
      expect(await pair.price0CumulativeLast()).to.eq(initialPrice[0].mul(10).add(newPrice[0].mul(10)))
      expect(await pair.price1CumulativeLast()).to.eq(initialPrice[1].mul(10).add(newPrice[1].mul(10)))
      expect((await pair.getReserves())[2]).to.eq(blockTimestamp + 20)
    })
  
    it('feeTo:off', async () => {
      const token0Amount = expandTo18Decimals(1000)
      const token1Amount = expandTo18Decimals(1000)
      await addLiquidity(token0Amount, token1Amount)
  
      const swapAmount = expandTo18Decimals(1)
      const expectedOutputAmount = BigNumber.from('996006981039903216')
      await token1.transfer(pair.address, swapAmount)
      await pair.swap(expectedOutputAmount, 0, wallet.address, '0x', {})
  
      const expectedLiquidity = expandTo18Decimals(1000)
      await pair.transfer(pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      await pair.burn(wallet.address, {})
      expect(await pair.totalSupply()).to.eq(MINIMUM_LIQUIDITY)
    })

    it('feeTo:on', async () => {
      await factory.setFeeTo(otherWallet.address)
  
      const token0Amount = expandTo18Decimals(1000)
      const token1Amount = expandTo18Decimals(1000)
      await addLiquidity(token0Amount, token1Amount)
  
      const swapAmount = expandTo18Decimals(1)
      const expectedOutputAmount = BigNumber.from('996006981039903216')
      await token1.transfer(pair.address, swapAmount)
      await pair.swap(expectedOutputAmount, 0, wallet.address, '0x', {})
  
      const expectedLiquidity = expandTo18Decimals(1000)
      await pair.transfer(pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      await pair.burn(wallet.address, {})
      expect(await pair.totalSupply()).to.eq(MINIMUM_LIQUIDITY.add('249750499251388'))
      expect(await pair.balanceOf(otherWallet.address)).to.eq('249750499251388')
  
      // using 1000 here instead of the symbolic MINIMUM_LIQUIDITY because the amounts only happen to be equal...
      // ...because the initial liquidity amounts were equal
      expect(await token0.balanceOf(pair.address)).to.eq(BigNumber.from(1000).add('249501683697445'))
      expect(await token1.balanceOf(pair.address)).to.eq(BigNumber.from(1000).add('250000187312969'))
    })

})