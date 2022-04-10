const { expect } = require("chai");
const { ethers } = require("hardhat");
const { toWei, fromWei } = require("./utils");

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

    describe("Listing marketplace items for sale", function() {
        let seller;

        beforeEach(async function() {
            seller = addr1;
            // seller mints nft
            await nft.connect(seller).mint(URI);
            // seller approves marketplace to spend nft
            await nft.connect(seller).setApprovalForAll(marketplace.address, true);
        });

        it("should track newly created item, transfer NFT from seller to marketplace and emit Offered event", async function() {
            // seller offers nft at a price of 1 ETH
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
                marketplace.connect(seller).listItem(nft.address, 1, 0)
            ).to.be.revertedWith("Price must be greatee than zero");
        });
    });

    describe("Purchasing marketplace items", function() {
        let seller, buyer, feeAccount, totalPriceInWei;
        const price = 2;

        beforeEach(async function() {
            seller = addr1;
            buyer = addr2;
            feeAccount = deployer;
            // seller mints nft
            await nft.connect(seller).mint(URI);
            // seller approves marketplace to spend nft
            await nft.connect(seller).setApprovalForAll(marketplace.address, true);
            // seller list nft as marketplace item
            await marketplace.connect(seller).listItem(nft.address, 1, toWei(price));
            // fetch items total price (market fee + item price)
            totalPriceInWei = await marketplace.getTotalPrice(1);
        });

        it("should update item as sold, pay seller, transfer NFT to buyer, charge fees and emit Bought event", async function() {
            const sellerInitialBalance = await seller.getBalance();
            const feeAccountInitialBalance = await feeAccount.getBalance();
            // addr2 purchases item
            await expect(marketplace.connect(buyer).purchaseItem(1, { value: totalPriceInWei }))
                .to.emit(marketplace, "Bought")
                .withArgs(
                    1,
                    nft.address,
                    1,
                    toWei(price),
                    seller.address,
                    buyer.address
                )
            const sellerFinalBalance = await seller.getBalance();
            const feeAccountFinalBalance = await feeAccount.getBalance();
            // seller should receive payment for the price of the NFT sold
            expect(+fromWei(sellerFinalBalance)).to.equal(+price + +fromWei(sellerInitialBalance));
            // calculate fee
            const fee = (feePercent / 100) * price;
            // feeAccount should receive fee
            expect(+fromWei(feeAccountFinalBalance)).to.equal(+fee + +fromWei(feeAccountInitialBalance));
            // buyer should now own the nft
            expect(await nft.ownerOf(1)).to.equal(buyer.address);
            // item should be marked as sold
            expect((await marketplace.items(1)).sold).to.equal(true);
        });

        it("should fail for invalid item ids, sold items and when not enough ETH is paid", async function() {
            // reverts transaction for invalid item ids
            await expect(
                marketplace.connect(buyer).purchaseItem(4, { value: totalPriceInWei })
            ).to.be.revertedWith("Item doesn't exist");
            await expect(
                marketplace.connect(buyer).purchaseItem(0, { value: totalPriceInWei })
            ).to.be.revertedWith("Item doesn't exist");
            // reverts transaction when not enough ETH is paid
            await expect(
                marketplace.connect(buyer).purchaseItem(1, { value: toWei(price) })
            ).to.be.revertedWith("Not enough ETH to cover item price and market fee");
            // reverts transaction when trying to purchase already sold item
            await marketplace.connect(buyer).purchaseItem(1, { value: totalPriceInWei });
            // deployer tries to purchase item 1 after its been sold to buyer
            await expect(
                marketplace.connect(deployer).purchaseItem(1, { value: totalPriceInWei })
            ).to.be.revertedWith("Item already sold");
        });
    });
});