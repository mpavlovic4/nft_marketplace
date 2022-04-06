// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract NFT is ERC721URIStorage {
    // Solidity will automatically initialize this state variable to default value for uint, which is 0
    uint public tokenCount;

    constructor() ERC721("DApp NFT", "DAAP") {}

    function mint(string memory _tokenURI) external returns(uint) {
        _safeMint(msg.sender, ++tokenCount);
        _setTokenURI(tokenCount, _tokenURI);
        return tokenCount;
    }
}