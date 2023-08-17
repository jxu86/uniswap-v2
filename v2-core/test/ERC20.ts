import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { config, ethers } from "hardhat";
import { Contract, utils, constants, BigNumber } from 'ethers'
import { ecsign } from 'ethereumjs-util'
// import keccak256 from "keccak256";
// import { expandTo18Decimals, getApprovalDigest } from './shared/utilities'

describe("UniswapV2ERC20", () => {

    let wallet: any
    let walletPrivateKey: string
    let otherWallet: any
    const TOTAL_SUPPLY = ethers.utils.parseUnits("10000","ether")
    const TEST_AMOUNT =ethers.utils.parseUnits("10","ether")
    let token: Contract
    const PERMIT_TYPEHASH = utils.keccak256(
        utils.toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
      )
    beforeEach(async () => {
        [wallet, otherWallet] = await ethers.getSigners();
        console.log('wallet address: ', wallet.address)
        
        token = await ethers.deployContract("ERC20", [TOTAL_SUPPLY])
        console.log('token address: ', token.address)


        const accounts = config.networks.hardhat.accounts;
        console.log('accounts: ', accounts)
        
        // const index = 0; // first wallet, increment for next wallets
        // console.log('accounts: ', accounts.path + `/${index}`)
        
        // const wallet1 = ethers.Wallet.fromMnemonic(accounts.mnemonic, accounts.path + `/${index}`);
        // console.log('wallet1 privateKey: ', wallet1.privateKey)
        walletPrivateKey = ethers.Wallet.fromMnemonic(accounts.mnemonic, accounts.path + '/0').privateKey
    })

    function getDomainSeparator(name: string, tokenAddress: string) {
        return utils.keccak256(
            utils.defaultAbiCoder.encode(
            ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
            [
              utils.keccak256(utils.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
              utils.keccak256(utils.toUtf8Bytes(name)),
              utils.keccak256(utils.toUtf8Bytes('1')),
              1,
              tokenAddress
            ]
          )
        )
      }

    async function getApprovalDigest(
        token: Contract,
        approve: {
          owner: string
          spender: string
          value: BigNumber
        },
        nonce: BigNumber,
        deadline: BigNumber
      ): Promise<string> {
        const name = await token.name()
        const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address)
        return utils.keccak256(
            utils.solidityPack(
            ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
            [
              '0x19',
              '0x01',
              DOMAIN_SEPARATOR,
              utils.keccak256(
                utils.defaultAbiCoder.encode(
                  ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
                  [PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline]
                )
              )
            ]
          )
        )
      }



    it('name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR, PERMIT_TYPEHASH', async () => {
        const name = await token.name()
        expect(name).to.eq('Uniswap V2')
        expect(await token.symbol()).to.eq('UNI-V2')
        expect(await token.decimals()).to.eq(18)
        expect(await token.totalSupply()).to.eq(TOTAL_SUPPLY)
        expect(await token.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY)
        expect(await token.DOMAIN_SEPARATOR()).to.eq(
            utils.keccak256(
            utils.defaultAbiCoder.encode(
              ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
              [
                utils.keccak256(
                    utils.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
                ),
                utils.keccak256(utils.toUtf8Bytes(name)),
                utils.keccak256(utils.toUtf8Bytes('1')),
                1,
                token.address
              ]
            )
          )
        )
        expect(await token.PERMIT_TYPEHASH()).to.eq(
            utils.keccak256(utils.toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'))
        )
      })

      it('transfer', async () => {
        await expect(token.transfer(otherWallet.address, TEST_AMOUNT))
          .to.emit(token, 'Transfer')
          .withArgs(wallet.address, otherWallet.address, TEST_AMOUNT)
        expect(await token.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
        expect(await token.balanceOf(otherWallet.address)).to.eq(TEST_AMOUNT)
      })

      it('transfer:fail', async () => {
        await expect(token.transfer(otherWallet.address, TOTAL_SUPPLY.add(1))).to.be.reverted // ds-math-sub-underflow
        await expect(token.connect(otherWallet).transfer(wallet.address, 1)).to.be.reverted // ds-math-sub-underflow
      })
    
      it('transferFrom', async () => {
        await token.approve(otherWallet.address, TEST_AMOUNT)
        await expect(token.connect(otherWallet).transferFrom(wallet.address, otherWallet.address, TEST_AMOUNT))
          .to.emit(token, 'Transfer')
          .withArgs(wallet.address, otherWallet.address, TEST_AMOUNT)
        expect(await token.allowance(wallet.address, otherWallet.address)).to.eq(0)
        expect(await token.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
        expect(await token.balanceOf(otherWallet.address)).to.eq(TEST_AMOUNT)
      })

      it('transferFrom:max', async () => {
        await token.approve(otherWallet.address, constants.MaxUint256)
        await expect(token.connect(otherWallet).transferFrom(wallet.address, otherWallet.address, TEST_AMOUNT))
          .to.emit(token, 'Transfer')
          .withArgs(wallet.address, otherWallet.address, TEST_AMOUNT)
        expect(await token.allowance(wallet.address, otherWallet.address)).to.eq(constants.MaxUint256)
        expect(await token.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
        expect(await token.balanceOf(otherWallet.address)).to.eq(TEST_AMOUNT)
      })

      it('permit', async () => {
        const nonce = await token.nonces(wallet.address)
        const deadline = constants.MaxUint256
        const digest = await getApprovalDigest(
          token,
          { owner: wallet.address, spender: otherWallet.address, value: TEST_AMOUNT },
          nonce,
          deadline
        )
        
        const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(walletPrivateKey.slice(2), 'hex'))
    
        await expect(token.permit(wallet.address, otherWallet.address, TEST_AMOUNT, deadline, v, utils.hexlify(r), utils.hexlify(s)))
          .to.emit(token, 'Approval').withArgs(wallet.address, otherWallet.address, TEST_AMOUNT)
        expect(await token.allowance(wallet.address, otherWallet.address)).to.eq(TEST_AMOUNT)
        expect(await token.nonces(wallet.address)).to.eq(BigNumber.from(1))
      })

    })