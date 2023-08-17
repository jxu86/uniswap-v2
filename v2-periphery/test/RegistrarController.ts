import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
// import { ethers as ethersjs } from "ethers";
import keccak256 from "keccak256";


describe("RegistrarController", function () {

    const ETH_NODE = '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae'
    const ADDR_REVERSE_NODE = '0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2'
    async function deployContracts() {
        const [owner] = await ethers.getSigners();
        const ownerAddr = owner.address

        console.log('ownerAddr: ', ownerAddr)
        const superBaseNode = '0x0000000000000000000000000000000000000000000000000000000000000000'
        // const blankAddr = '0x0000000000000000000000000000000000000000'
        const PriceOracleAddr = '0x0000000000000000000000000000000000000000'
        const NameWrapperAddr = '0x0000000000000000000000000000000000000000'
        const OwnedResolverAddr = '0x0000000000000000000000000000000000000000'

        // ENSRegistryWithFallback
        // const ensFactory = await ethers.getContractFactory("ENSRegistryWithFallback");
        // const ensContract = await ensFactory.deploy();
        const ensContract = await ethers.deployContract("ENSRegistryWithFallback")
        console.log('ensContract address:', ensContract.address);

        // const superBaseNodeOwner = await ensContract.owner(superBaseNode)
        // console.log('superBaseNodeOwner: ', superBaseNodeOwner)

        // namehash('reverse')
        // node: ethers.utils.namehash('reverse') 0xa097f6721ce401e757d1223a763fef49b8b5f90bb18567ddb86fd205dff71d34
        let tx = await ensContract.setSubnodeOwner(
                superBaseNode,
                '0xdec08c9dbbdd0890e300eb5062089b2d4b1c40e3673bbccb5423f7b37dcf9a9c',      // keccak256("reverse")
                ownerAddr
            )
        await tx.wait();

        // BaseRegistrarImplementation
        // const baseRegistrarFactory = await ethers.getContractFactory("BaseRegistrarImplementation");
        // const baseRegistrarContract = await baseRegistrarFactory.deploy(ensContract.address);

        const baseRegistrarContract = await ethers.deployContract("BaseRegistrarImplementation", [ensContract.address])


        console.log('baseRegistrarContract address:', baseRegistrarContract.address);
        // ReverseRegistrar
        // const reverseRegistrarFactory = await ethers.getContractFactory("ReverseRegistrar");
        // const reverseRegistrarContract = await reverseRegistrarFactory.deploy(ensContract.address);

        const reverseRegistrarContract = await ethers.deployContract("ReverseRegistrar", [ensContract.address])


        console.log('reverseRegistrarContract address:', reverseRegistrarContract.address);

        // RegistrarController
        // const registrarControllerFactory = await ethers.getContractFactory("RegistrarController");
        // const registrarControllerContract = await registrarControllerFactory.deploy(baseRegistrarContract.address, PriceOracleAddr, 60, 86400);

        const registrarControllerContract = await ethers.deployContract("RegistrarController", [baseRegistrarContract.address, PriceOracleAddr, 60, 86400])

        console.log('registrarControllerContract address:', registrarControllerContract.address);


        // 'eth'
        tx = await ensContract.setSubnodeRecord(
            '0x0000000000000000000000000000000000000000000000000000000000000000',
            '0x4f5b812789fc606be1b3b16908db13fc7a9adf7ca72641f84d75b47069d3d7f0',   // keccak256('eth')
            baseRegistrarContract.address,
            OwnedResolverAddr,
            0
        )
        await tx.wait();


        // 'blackpink'  0xc675ade580b588e1688ed5e4ff748167b1809a5a1d4ff31828c0ec28726d1f68
        tx = await ensContract.setSubnodeRecord(
            '0x0000000000000000000000000000000000000000000000000000000000000000',
            keccak256('blackpink'),
            baseRegistrarContract.address,
            OwnedResolverAddr,
            0
        )
        await tx.wait();

        console.log('blackpink owner: ', await ensContract.owner('0xc675ade580b588e1688ed5e4ff748167b1809a5a1d4ff31828c0ec28726d1f68'))
        // namehash('addr.reverse')
        tx = await ensContract.setSubnodeOwner(
            '0xa097f6721ce401e757d1223a763fef49b8b5f90bb18567ddb86fd205dff71d34',   // namehash('reverse')
            '0xe5e14487b78f85faa6e1808e89246cf57dd34831548ff2e6097380d98db2504a',   // keccak256('addr')
            reverseRegistrarContract.address
        )

        let addr = await ensContract.owner(ADDR_REVERSE_NODE)
        console.log('ADDR_REVERSE_NODE addr==================>', addr)

        // PublicResolver
        const publicResolverFactory = await ethers.getContractFactory("PublicResolver");
        const publicResolverContract = await publicResolverFactory.deploy(ensContract.address, NameWrapperAddr, registrarControllerContract.address, reverseRegistrarContract.address);
        console.log('publicResolverContract address:', publicResolverContract.address);

        addr = await ensContract.owner(ETH_NODE)
        console.log('addr==================>', addr)

        tx = await baseRegistrarContract.addController(registrarControllerContract.address)
        await tx.wait();
        // console.log('@@publicResolverContract: ', publicResolverContract["addr(bytes32)"]())

        tx = await reverseRegistrarContract.setDefaultResolver(publicResolverContract.address)
        await tx.wait();

        return { owner, ensContract, baseRegistrarContract, registrarControllerContract, reverseRegistrarContract,  publicResolverContract }
    }

    it("registerWithConfig success", async function () {
        const { owner, ensContract, baseRegistrarContract, registrarControllerContract, reverseRegistrarContract,  publicResolverContract } = await loadFixture(deployContracts)

        const name = 'jc86'
        const nameHash = ethers.utils.namehash('jc86.eth')
        console.log('nameHash: ', nameHash)
        const baseNode = ETH_NODE
        const duration = 94608000
        const secret = '0x0000000000000000000000000000000000000000000000000000000000000000'
        let tx = await registrarControllerContract.registerWithConfig(
                    name,
                    baseNode,
                    owner.address,
                    duration,
                    secret,
                    publicResolverContract.address,
                    owner.address
                )
        await tx.wait();


        // check tokenId is exist
        let tokenId = ethers.BigNumber.from(nameHash).toString()
        console.log('@tokenId: ', tokenId)
        let tokenOwner = await baseRegistrarContract.ownerOf(tokenId)
        console.log('@tokenOwner: ', tokenOwner)
        expect(tokenOwner).to.equal(owner.address)

        let nameOwner = await ensContract.owner(nameHash)
        console.log('nameOwner: ', nameOwner)
        expect(nameOwner).to.equal(owner.address)

        nameOwner = await publicResolverContract["addr(bytes32)"](nameHash)
        console.log('nameOwner: ', nameOwner)

        tx = await reverseRegistrarContract.setName('jc86.eth')
        const ret = await tx.wait();

        const walletAddress = nameOwner.toLowerCase().substring(2)
        const labelhash=keccak256(walletAddress)
        const nameNode = keccak256(ethers.utils.defaultAbiCoder.encode(['bytes32','bytes32'],[ADDR_REVERSE_NODE,labelhash]))
        console.log('nameNode: ', nameNode)

        const subName = await publicResolverContract.name(nameNode)
        console.log('subName: ', subName)

        tx = await registrarControllerContract.registerWithConfig(
            name,
            ethers.utils.namehash('blackpink'),
            owner.address,
            duration,
            secret,
            publicResolverContract.address,
            owner.address
        )
        await tx.wait();

        // check tokenId is exist
        tokenId = ethers.BigNumber.from(ethers.utils.namehash('jc86.blackpink'),).toString()
        console.log('@tokenId: ', tokenId)
        tokenOwner = await baseRegistrarContract.ownerOf(tokenId)
        console.log('@tokenOwner: ', tokenOwner)
        expect(tokenOwner).to.equal(owner.address)

        nameOwner = await ensContract.owner(ethers.utils.namehash(name + '.blackpink'))
        console.log('nameOwner: ', nameOwner)
        expect(nameOwner).to.equal(owner.address)

        nameOwner = await publicResolverContract["addr(bytes32)"](ethers.utils.namehash(name + '.blackpink'))
        console.log('nameOwner: ', nameOwner)

        tx = await reverseRegistrarContract.setName('jc86.blackpink')
        await tx.wait();
        console.log('subName: ', await publicResolverContract.name(nameNode))
    })



    // it("registerWithConfig success", async function () {
    // })

})