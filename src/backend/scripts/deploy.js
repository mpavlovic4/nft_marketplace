/* eslint-disable no-undef */

const NFT_CONTRACT_NAME = "NFT";
const MARKETPLACE_CONTRACT_NAME = "Marketplace";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // deploy contracts
  const NFT = await ethers.getContractFactory(NFT_CONTRACT_NAME);
  const nft = await NFT.deploy();
  const Marketplace = await ethers.getContractFactory(MARKETPLACE_CONTRACT_NAME);
  const marketplace = await Marketplace.deploy(1);

  console.log("NFT contract address", nft.address);
  console.log("Marketplace contract address", marketplace.address);

  // For each contract, pass the deployed contract and name to this function to save a copy of the contract ABI and address to the front end.
  saveFrontendFiles(nft, NFT_CONTRACT_NAME);
  saveFrontendFiles(marketplace, MARKETPLACE_CONTRACT_NAME);
}

function saveFrontendFiles(contract, name) {
  const fs = require("fs");
  const contractsDir = __dirname + "/../../frontend/contractsData";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    contractsDir + `/${name}-address.json`,
    JSON.stringify({ address: contract.address }, undefined, 2)
  );

  const contractArtifact = artifacts.readArtifactSync(name);

  fs.writeFileSync(
    contractsDir + `/${name}.json`,
    JSON.stringify(contractArtifact, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
