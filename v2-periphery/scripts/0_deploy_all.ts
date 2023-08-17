
import { ethers } from "hardhat";


async function main() {

  const PriceOracleAddr = '0x0000000000000000000000000000000000000000'
  const NameWrapperAddr = '0x0000000000000000000000000000000000000000'
  const OwnedResolverAddr = '0x0000000000000000000000000000000000000000'
  
  const [owner] = await ethers.getSigners();
  console.log("owner",owner.address);
  // ENSRegistryWithFallback
  const ensFactory = await ethers.getContractFactory('ENSRegistryWithFallback');
  const ensContract = await ensFactory.deploy();
  console.log("wait deployed to:", ensContract.address);
  await ensContract.deployed();
  console.log("ensContract address:", ensContract.address);


  const baseRegistrarFactory = await ethers.getContractFactory("BaseRegistrarImplementation");
  const baseRegistrarContract = await baseRegistrarFactory.deploy(ensContract.address);
  await baseRegistrarContract.deployed();
  console.log('baseRegistrarContract address:', baseRegistrarContract.address);


  const reverseRegistrarFactory = await ethers.getContractFactory("ReverseRegistrar");
  const reverseRegistrarContract = await reverseRegistrarFactory.deploy(ensContract.address);
  await reverseRegistrarContract.deployed();
  console.log('reverseRegistrarContract address:', reverseRegistrarContract.address);


  const registrarControllerFactory = await ethers.getContractFactory("RegistrarController");
  const registrarControllerContract = await registrarControllerFactory.deploy(baseRegistrarContract.address, PriceOracleAddr, 60, 86400);
  await registrarControllerContract.deployed();
  console.log('registrarControllerContract address:', registrarControllerContract.address);

  const publicResolverFactory = await ethers.getContractFactory("PublicResolver");
  const publicResolverContract = await publicResolverFactory.deploy(ensContract.address, NameWrapperAddr, registrarControllerContract.address, reverseRegistrarContract.address, {gasLimit: 90000000});
  await publicResolverContract.deployed();
  console.log('publicResolverContract address:', publicResolverContract.address);




}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


// owner 0xC4c64c70A214C7d4fAFF53d257948d8a0365D750
// ensContract address: 0xB6e81E0033dfe571382F78124F9761Ecb6CE63D1
// baseRegistrarContract address: 0xCdE21238D1629aCdBb39e893Dc8c522aC4056D5D
// reverseRegistrarContract address: 0x240FA7FCfb39893e29573108df1cB325089570c2
// registrarControllerContract address: 0x11a9aF2086c5f0546352B48EAB40712b8B7CDe29
// publicResolverContract address: 0x9A8aBB29b84371E83d9073C5B4adfac3Aa5A730A