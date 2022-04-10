const { expect } = require("chai");
const { ethers } = require("hardhat");
const { toWei } = require("./utils");

describe("NFTMarketplace", function() {
    let deployer, addr1, addr2, nft, marketplace;
    const feePercent = 1;
    const URI = "Sample URI";

    beforeEach(async function() {
        // Get contract factories
        const NFT = await ethers.getContractFactory("NFT");
        const Marketplace = await ethers.getContractFactory("Marketplace");
        // Get signers
        [deployer, addr1, addr2] = await ethers.getSigners();
        // Deploy contracts
        nft = await NFT.deploy();
        marketplace = await Marketplace.deploy(feePercent);
    });

    describe("Deployment", function() {
        it("should track name and symbol of the nft collection", async function() {
            expect(await nft.name()).to.equal("DApp NFT");
            expect(await nft.symbol()).to.equal("DAPP");
        });

        it("should track feeAccount and feePercent of the marketplace", async function() {
            expect(await marketplace.feeAccount()).to.equal(deployer.address);
            expect(await marketplace.feePercent()).to.equal(feePercent);
        });
    });

    describe("Minting NFTs", function() {
        it("should track each minted NFT", async function() {
            // addr1 mints an nft
            await nft.connect(addr1).mint(URI);
            expect(await nft.tokenCount()).to.equal(1);
            expect(await nft.balanceOf(addr1.address)).to.equal(1);
            expect(await nft.tokenURI(1)).to.equal(URI);
            // addr2 mints an nft
            await nft.connect(addr2).mint(URI);
            expect(await nft.tokenCount()).to.equal(2);
            expect(await nft.balanceOf(addr2.address)).to.equal(1);
            expect(await nft.tokenURI(2)).to.equal(URI);
        });
    });

    describe("Making marketplace items", function() {
        beforeEach(async function() {
            // addr1 mints nft
            await nft.connect(addr1).mint(URI);
            // addr1 approves marketplace to spend nft
            await nft.connect(addr1).setApprovalForAll(marketplace.address, true);
        });

        it("should track newly created item, transfer NFT from seller to marketplace and emit Offered event", async function() {
            // addr1 offers nft at a price of 1 ETH
            await expect(marketplace.connect(addr1).listItem(nft.address, 1, toWei(1)))
                .to.emit(marketplace, "Offered")
                .withArgs(
                    1,
                    nft.address,
                    1,
                    toWei(1),
                    addr1.address
                )
            // owner of NFT should be the marketplace
            expect(await nft.ownerOf(1)).to.equal(marketplace.address);
            // Item count should be equal to 1
            expect(await marketplace.itemCount()).to.equal(1);
            // Item field check
            const item = await marketplace.items(1);
            expect(item.itemId).to.equal(1);
            expect(item.nft).to.equal(nft.address);
            expect(item.tokenId).to.equal(1);
            expect(item.price).to.equal(toWei(1));
            expect(item.sold).to.equal(false);
        });

        it("should fail if price is set to zero", async function() {
            await expect(
                marketplace.connect(addr1).listItem(nft.address, 1, 0)
            ).to.be.revertedWith("Price must be greatee than zero");
        });
    });
});