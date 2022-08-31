const { network, ethers, deployments } = require("hardhat");
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, BigNumber, Signer, constants } from "ethers";
import { parseEther } from "ethers/lib/utils";
import hre from "hardhat";

describe.only("Pancake NFT Market ", function async() {
  let signers: Signer[];

  let nft: Contract;
  let nft2: Contract;
  let nft3: Contract;
  let nft4: Contract;
  let token: Contract;
  let pancakeBunnies: Contract;
  let pancakeBunniesChecker: Contract;
  let wbnb: Contract;
  let nftmarket: Contract;

  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let seller1: SignerWithAddress;
  let seller2: SignerWithAddress;
  let seller3: SignerWithAddress;

  let WBNB: any;
  let MockERC20: any;
  let MockNFT;
  let ERC721NFTMarketV1: any;
  let PancakeBunniesWhitelistChecker: any;
  let PancakeBunnies: any;

  before(async () => {
    [owner, user, user2, user3, seller1, seller2, seller3] = await ethers.getSigners();

    hre.tracer.nameTags[owner.address] = "ADMIN";
    hre.tracer.nameTags[user.address] = "USER1";
    hre.tracer.nameTags[user2.address] = "USER2";

    MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("Asad", "ASD", parseEther("100000"));

    WBNB = await ethers.getContractFactory("WBNB");
    wbnb = await WBNB.deploy();

    MockNFT = await ethers.getContractFactory("MockNFT");
    nft = await MockNFT.deploy("NFT ONE", "ANFT");
    nft2 = await MockNFT.deploy("NFT TWO", "ANFT");
    nft3 = await MockNFT.deploy("NFT THREE", "ANFT");
    nft4 = await MockNFT.deploy("NFT FOUR", "ANFT");

    PancakeBunnies = await ethers.getContractFactory("PancakeBunnies");
    pancakeBunnies = await PancakeBunnies.deploy();

    PancakeBunniesWhitelistChecker = await ethers.getContractFactory("PancakeBunniesWhitelistChecker");
    pancakeBunniesChecker = await PancakeBunniesWhitelistChecker.deploy(pancakeBunnies.address);

    ERC721NFTMarketV1 = await ethers.getContractFactory("ERC721NFTMarketV1");
    nftmarket = await ERC721NFTMarketV1.deploy(owner.address, owner.address, wbnb.address, parseEther("1"), parseEther("10"));
  });

  it("Functions", async () => {
    // console.log(token.functions);
    // console.log(wbnb.functions);
    // console.log(nft.functions);
    // console.log(pancakeBunnies.functions);
    // console.log(pancakeBunniesChecker.functions);
    // console.log(nftmarket.functions)
  });

  it("Add Collection", async () => {
    await nftmarket.connect(owner).addCollection(nft.address, constants.AddressZero, constants.AddressZero, "100", "0");
  });

  it("Seller 1 List a NFT invalid token ID", async () => {
    await expect(nftmarket.connect(seller1).createAskOrder(nft.address, "0", parseEther("1"))).to.be.revertedWith("ERC721: invalid token ID");
  });

  it("Mint NFT", async () => {
    await nft.connect(seller1).mint("ipfs://token" + 0 + " .json");
  });

  it("Seller 1 List a NFT (caller is not token owner nor approved)", async () => {
    await expect(nftmarket.connect(seller1).createAskOrder(nft.address, "0", parseEther("1"))).to.be.revertedWith("caller is not token owner nor approved");
  });

  it("Mint NFT and Approve", async () => {
    let i = 1;
    for (let user of [seller1, seller2, seller3]) {
      i++;
      await nft.connect(user).setApprovalForAll(nftmarket.address, true);
      await nft2.connect(user).setApprovalForAll(nftmarket.address, true);
      await nft3.connect(user).setApprovalForAll(nftmarket.address, true);

      await nft.connect(user).mint("ipfs://token" + i + " .json");
      await nft.connect(user).mint("ipfs://token" + i + " .json");

      await nft2.connect(user).mint("ipfs://token" + i + " .json");
      await nft2.connect(user).mint("ipfs://token" + i + " .json");

      await nft3.connect(user).mint("ipfs://token" + i + " .json");
      await nft3.connect(user).mint("ipfs://token" + i + " .json");
    }

    for (let owner of [user, user2, user3, seller1, seller2, seller3]) {
      await wbnb.connect(owner).deposit({ value: parseEther("10") });
      await wbnb.connect(owner).approve(nftmarket.address, parseEther("1000000"));
    }
  });

  it("Seller 2 List a NFT (ERC721: transfer from incorrect owner)", async () => {
    await expect(nftmarket.connect(seller2).createAskOrder(nft.address, "1", parseEther("1"))).to.be.revertedWith("ERC721: transfer from incorrect owner");
  });

  it("Minimum Price (Order: Price not within range)", async () => {
    await expect(nftmarket.connect(seller1).createAskOrder(nft.address, "1", parseEther("0.5"))).to.be.revertedWith("Order: Price not within range");
  });

  it("Maximum Price (Order: Price not within range)", async () => {
    await expect(nftmarket.connect(seller1).createAskOrder(nft.address, "1", parseEther("11"))).to.be.revertedWith("Order: Price not within range");
  });

  it("NFT  Collection Address Change (Collection: Not for listing)", async () => {
    await expect(nftmarket.connect(seller1).createAskOrder(nft2.address, "1", parseEther("1"))).to.revertedWith("Collection: Not for listing");
  });

  it("Seller 1 List a NFT", async () => {
    await nftmarket.connect(seller1).createAskOrder(nft.address, "0", parseEther("1"));
  });

  it("Seller2 lists a NFT and modifies the order price", async () => {
    await nftmarket.connect(seller2).createAskOrder(nft.address, "3", parseEther("1.2"));
    await nftmarket.connect(seller2).createAskOrder(nft.address, "4", parseEther("1.2"));
    // await nftmarket.connect(seller2).createAskOrder(nft.address,"2",parseEther("1.2"))

    await nftmarket.connect(seller2).modifyAskOrder(nft.address, "3", parseEther("1.1"));
  });

  it("Seller2 lists a NFT and modifies the order price That doesn't Exist(Order: Token not listed)", async () => {
    await expect(nftmarket.connect(seller2).modifyAskOrder(nft.address, "2", parseEther("1.1"))).to.revertedWith("Order: Token not listed");
  });

  it("Seller2 cancels her order", async () => {
    await nftmarket.connect(seller2).cancelAskOrder(nft.address, "3");
  });

  it("Seller2 cancels her order Or (Order: Token not listed)", async () => {
    await expect(nftmarket.connect(seller2).cancelAskOrder(nft.address, "3")).to.revertedWith("Order: Token not listed");
  });
  it("Seller1 cancels order", async () => {
    await expect(nftmarket.connect(seller1).cancelAskOrder(nft.address, "4")).to.be.revertedWith("Order: Token not listed");
  });

  it("Owner cancels order", async () => {
    await expect(nftmarket.cancelAskOrder(nft.address, "4")).to.be.revertedWith("Order: Token not listed");
  });

  it("Buyer1 matches order from seller1 with BNB (Collection: Not for trading)", async () => {
    await expect(nftmarket.connect(user).buyTokenUsingBNB(nft2.address, "0", { value: parseEther("1") })).to.be.revertedWith("Collection: Not for trading");
  });

  it("Buyer1 matches order from seller1 with BNB (Buy: Not for sale)", async () => {
    await expect(nftmarket.connect(user).buyTokenUsingBNB(nft.address, "3", { value: parseEther("1") })).to.be.revertedWith("Buy: Not for sale");
  });

  it("Buyer1 matches order from seller1 with BNB (Buy: Incorrect price)", async () => {
    await expect(nftmarket.connect(user).buyTokenUsingBNB(nft.address, "0", { value: parseEther("0.5") })).to.be.revertedWith("Buy: Incorrect price");
  });

  it("Buyer1 matches order from seller1 with BNB", async () => {
    await nftmarket.connect(user).buyTokenUsingBNB(nft.address, "0", { value: parseEther("1") });
  });

  it("Buyer2 matches order from seller1 with BNB", async () => {
    await expect(nftmarket.connect(user2).buyTokenUsingBNB(nft.address, "0", { value: parseEther("1") })).to.be.revertedWith("Buy: Not for sale");
  });

  it("Buyer1 Sell NFT (ERC721: caller is not token owner nor approved)", async () => {
    await expect(nftmarket.connect(user).createAskOrder(nft.address, "0", parseEther("1.5"))).to.revertedWith("ERC721: caller is not token owner nor approved");
  });

  it("Buyer1 Resell NFT", async () => {
    await nft.connect(user).setApprovalForAll(nftmarket.address, true);
    await nftmarket.connect(user).createAskOrder(nft.address, "0", parseEther("1.5"));
  });

  it("Seller1 lists a second NFT that is bought by buyer1 with WBNB", async () => {
    await nftmarket.connect(seller1).createAskOrder(nft.address, "1", parseEther("1.1"));
    await nftmarket.connect(user).buyTokenUsingWBNB(nft.address, "1", parseEther("1.1"));
  });

  it("Not Owner (Claim: Nothing to claim)", async () => {
    await expect(nftmarket.connect(user).claimPendingRevenue()).to.revertedWith("Claim: Nothing to claim");
  });

  it("Treasure Claim it's pending revenue", async () => {
    await expect(nftmarket.connect(owner).claimPendingRevenue()).to.emit(nftmarket, "RevenueClaim").withArgs(owner.address, parseEther("0.021"));
  });

  it("User changes minimum/max prices (Management: Not admin) ", async () => {
    await expect(nftmarket.connect(user).updateMinimumAndMaximumPrices(parseEther("2"), parseEther("20"))).to.revertedWith("Management: Not admin");
  });

  it("Admin changes minimum/max prices", async () => {
    await nftmarket.connect(owner).updateMinimumAndMaximumPrices(parseEther("2"), parseEther("20"));
  });

  it("Add Second Collection", async () => {
    await nftmarket.addCollection(nft2.address, owner.address, constants.AddressZero, "45", "5");
    await nftmarket.connect(seller1).createAskOrder(nft2.address, "1", parseEther("2"));
  });

  it("Cannot list, trade, nor modify price once collection is discontinued", async () => {
    await nftmarket.closeCollectionForTradingAndListing(nft2.address);
    
    await expect(nftmarket.connect(seller1).createAskOrder(nft2.address, "2", parseEther("2"))).to.revertedWith("Collection: Not for listing");
    
    await expect(nftmarket.connect(user).modifyAskOrder(nft2.address, "2", parseEther("2.2"))).to.revertedWith("Collection: Not for listing");
    
    await expect(nftmarket.connect(user).buyTokenUsingBNB(nft2.address, "2", { value: parseEther("2.2") })).to.revertedWith("Collection: Not for trading");
  });
  

  it("Tokens can/cannot be listed for NFT1/NFT2", async () => {
    let result = await nftmarket.canTokensBeListed(nft.address, ["0", "1", "2", "3", "4", "5"]);
    let boolArray = Array.from({ length: 6 }, (i) => (i = true));

    console.log(boolArray)
    console.log(result)

    // let result2 = await nftmarket.canTokensBeListed(nft2.address, ["0", "1", "2", "3", "4", "5"]);
    // let boolArray2 = Array.from({ length: 6 }, (i) => (i = true));

    // console.log(boolArray2)
    // console.log(result2)
  });

it("Add collection with restrictions",async ()=>{

  await nftmarket.addCollection(pancakeBunnies.address,constants.AddressZero,pancakeBunniesChecker.address,"100","0")

  let i = 0;

  while (i < 5) {
    await pancakeBunnies.mint(seller1.address, "ipfs://" + i.toString(), i);
    i++;
  }


  await pancakeBunniesChecker.addRestrictionForBunnies([3,4])

  await pancakeBunnies.connect(seller1).setApprovalForAll(nftmarket.address,true)


  await expect(nftmarket.createAskOrder(pancakeBunnies.address,"3",parseEther("3"))).to.be.revertedWith("Order: tokenId not eligible")
  await expect(nftmarket.createAskOrder(pancakeBunnies.address,"4",parseEther("3"))).to.be.revertedWith("Order: tokenId not eligible")

  await pancakeBunniesChecker.removeRestrictionForBunnies([3,4])

  await nftmarket.connect(seller1).createAskOrder(pancakeBunnies.address,"4",parseEther("3"))



})



  // it("Seller 1 List a NFT",async () =>{
  //   await nftmarket.connect(seller1).createAskOrder(nft.address,"0",parseEther("1"))
  // })

  // it("Seller2 cancels her order",async ()=>{
  //   // await nftmarket.connect(seller2).cancelAskOrder(nft.address,"2")
  // })

  // it("Price Calculation",async () =>{
  //   // console.log(await nftmarket.calculatePriceAndFeesForCollection(nft.address,parseEther("1")))
  //   console.log(await nftmarket.viewAsksByCollection(nft.address,"0","500"))
  // })

  // it("Buyer1 matches order from seller1 with BNB",async ()=>{
  //   await nftmarket.connect(user).buyTokenUsingBNB(nft.address,"0",({value:parseEther("1")}))
  // })

  // it("Seller1 lists a second NFT that is bought by buyer1 with WBNB",async () => {

  //   await nftmarket.connect(seller1).createAskOrder(nft.address,"1",parseEther("1.1"))

  //   await nftmarket.connect(user).buyTokenUsingWBNB(nft.address,"1",parseEther("1.1"))

  // })

  // it("Buyer1 CreateOrder",async () =>{

  //   await nft.connect(user).setApprovalForAll(nftmarket.address,true)
  //   await nftmarket.connect(user).createAskOrder(nft.address,"1",parseEther("1.5"))

  // })

  // it("Treasure Claim it's pending revenue",async () => {

  //   console.log(await nftmarket.pendingRevenue(owner.address))
  //   await nftmarket.connect(owner).claimPendingRevenue()
  // })
});
